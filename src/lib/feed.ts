import "server-only";
import { createClient } from "@/lib/supabase/server";
import { presignDownload } from "@/lib/r2";
import {
  FEED_PAGE_SIZE,
  type FeedPage,
  type FeedPost,
} from "@/lib/feed-types";

// Re-export shared bits so existing server-side imports from "@/lib/feed" keep
// working. Client components must import from "@/lib/feed-types" instead.
export { FEED_PAGE_SIZE, timeAgo } from "@/lib/feed-types";
export type { FeedMedia, FeedPost, FeedPage } from "@/lib/feed-types";

type RawPost = {
  id: string;
  body_text: string;
  status: "live" | "pending" | "rejected";
  created_at: string;
  author_user_id: string;
  deleted_at: string | null;
  spaces: { id: string; name: string; level: string } | { id: string; name: string; level: string }[] | null;
  children: { id: string; first_name: string; age: number; avatar: string; city: string; state: string } | { id: string; first_name: string; age: number; avatar: string; city: string; state: string }[] | null;
  post_media: { id: string; kind: "image" | "video" | "audio"; r2_key: string; mime: string; duration_s: number | null; width: number | null; height: number | null; position: number }[];
  post_tags: { tags: { id: string; slug: string; label: string; emoji: string } | { id: string; slug: string; label: string; emoji: string }[] | null }[];
  reactions: { user_id: string; emoji: string }[];
};

function one<T>(v: T | T[] | null): T | null {
  return Array.isArray(v) ? (v[0] ?? null) : v;
}

export type FeedOptions = {
  tagSlug?: string;
  limit?: number;
  /** Include the viewer's own pending posts (feed view). */
  includeOwnPending?: boolean;
  userId: string;
  order?: "asc" | "desc";
  /** Keyset cursor: only return posts created before (desc) / after (asc) this
   *  `created_at`. Used by "Load more". */
  before?: string;
};

const POST_SELECT = `id, body_text, status, created_at, author_user_id, deleted_at,
  spaces(id, name, level),
  children(id, first_name, age, avatar, city, state),
  post_media(id, kind, r2_key, mime, duration_s, width, height, position),
  post_tags(tags(id, slug, label, emoji)),
  reactions(user_id, emoji)`;

async function buildPost(p: RawPost, userId: string): Promise<FeedPost> {
  const media = await Promise.all(
    [...p.post_media]
      .sort((a, b) => a.position - b.position)
      .map(async (m) => ({
        id: m.id,
        kind: m.kind,
        mime: m.mime,
        duration_s: m.duration_s,
        width: m.width,
        height: m.height,
        url: await presignDownload(m.r2_key),
      })),
  );

  const counts: Record<string, number> = {};
  let myReaction: string | null = null;
  for (const r of p.reactions) {
    counts[r.emoji] = (counts[r.emoji] ?? 0) + 1;
    if (r.user_id === userId) myReaction = r.emoji;
  }

  return {
    id: p.id,
    body_text: p.body_text,
    status: p.status,
    created_at: p.created_at,
    author_user_id: p.author_user_id,
    space: one(p.spaces)!,
    child: one(p.children)!,
    media,
    tags: p.post_tags
      .map((t) => one(t.tags))
      .filter((t): t is NonNullable<typeof t> => Boolean(t)),
    reactions: counts,
    myReaction,
  };
}

/**
 * One page of posts for a space and its listed descendants (bubble-up,
 * DECISIONS #6), newest-first by default, with media as short-TTL signed URLs.
 *
 * Keyset pagination: pass `before` (the previous page's `nextCursor`) to fetch
 * older glimpses. Tag filtering runs in SQL so it searches the whole space, not
 * just the current page.
 */
export async function fetchFeed(
  spaceId: string,
  opts: FeedOptions,
): Promise<FeedPage> {
  const supabase = await createClient();
  const limit = opts.limit ?? FEED_PAGE_SIZE;
  const asc = opts.order === "asc";

  const { data: subtree } = await supabase.rpc("visible_subtree", {
    root: spaceId,
  });
  const spaceIds: string[] = (subtree ?? []).map(
    (r: { visible_subtree: string } | string) =>
      typeof r === "string" ? r : r.visible_subtree,
  );
  if (spaceIds.length === 0) return { posts: [], nextCursor: null };

  // Step 1 — the page of post ids, honoring tag filter + status + cursor.
  // An inner join on the tag keeps filtering in the database.
  let pageQ = supabase
    .from("posts")
    .select(
      opts.tagSlug
        ? "id, created_at, post_tags!inner(tags!inner(slug))"
        : "id, created_at",
    )
    .in("space_id", spaceIds)
    .is("deleted_at", null);
  if (opts.tagSlug) pageQ = pageQ.eq("post_tags.tags.slug", opts.tagSlug);
  if (opts.includeOwnPending) {
    pageQ = pageQ.or(
      `status.eq.live,and(status.eq.pending,author_user_id.eq.${opts.userId})`,
    );
  } else {
    pageQ = pageQ.eq("status", "live");
  }
  if (opts.before) {
    pageQ = asc
      ? pageQ.gt("created_at", opts.before)
      : pageQ.lt("created_at", opts.before);
  }
  pageQ = pageQ.order("created_at", { ascending: asc }).limit(limit);

  const { data: pageRows } = await pageQ;
  // The conditional select string defeats supabase-js's row-type inference, so
  // narrow through unknown.
  const rows = (pageRows ?? []) as unknown as {
    id: string;
    created_at: string;
  }[];
  const ids = [...new Set(rows.map((r) => r.id))];
  if (ids.length === 0) return { posts: [], nextCursor: null };

  // Step 2 — hydrate full post data (all tags, media, reactions) for the page.
  const { data } = await supabase
    .from("posts")
    .select(POST_SELECT)
    .in("id", ids)
    .order("created_at", { ascending: asc });
  const raw = (data ?? []) as unknown as RawPost[];

  const posts = await Promise.all(
    raw
      .filter((p) => one(p.children) && one(p.spaces))
      .map((p) => buildPost(p, opts.userId)),
  );

  // A full page means there may be more; cursor is the page's last row.
  const hasMore = rows.length === limit;
  const nextCursor = hasMore ? rows[rows.length - 1].created_at : null;
  return { posts, nextCursor };
}
