import "server-only";
import { createClient } from "@/lib/supabase/server";
import { presignDownload } from "@/lib/r2";

export type FeedMedia = {
  id: string;
  kind: "image" | "video" | "audio";
  url: string;
  mime: string;
  duration_s: number | null;
  width: number | null;
  height: number | null;
};

export type FeedPost = {
  id: string;
  body_text: string;
  status: "live" | "pending" | "rejected";
  created_at: string;
  author_user_id: string;
  space: { id: string; name: string; level: string };
  child: { id: string; first_name: string; age: number; avatar: string; city: string; state: string };
  media: FeedMedia[];
  tags: { id: string; slug: string; label: string; emoji: string }[];
  reactions: Record<string, number>;
  myReaction: string | null;
};

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
};

/**
 * Posts for a space and its listed descendants (bubble-up, DECISIONS #6),
 * with media converted to short-TTL signed URLs.
 */
export async function fetchFeed(
  spaceId: string,
  opts: FeedOptions,
): Promise<FeedPost[]> {
  const supabase = await createClient();

  const { data: subtree } = await supabase.rpc("visible_subtree", {
    root: spaceId,
  });
  const spaceIds: string[] = (subtree ?? []).map(
    (r: { visible_subtree: string } | string) =>
      typeof r === "string" ? r : r.visible_subtree,
  );
  if (spaceIds.length === 0) return [];

  let query = supabase
    .from("posts")
    .select(
      `id, body_text, status, created_at, author_user_id, deleted_at,
       spaces(id, name, level),
       children(id, first_name, age, avatar, city, state),
       post_media(id, kind, r2_key, mime, duration_s, width, height, position),
       post_tags(tags(id, slug, label, emoji)),
       reactions(user_id, emoji)`,
    )
    .in("space_id", spaceIds)
    .is("deleted_at", null)
    .order("created_at", { ascending: opts.order === "asc" })
    .limit(opts.limit ?? 50);

  if (opts.includeOwnPending) {
    query = query.or(
      `status.eq.live,and(status.eq.pending,author_user_id.eq.${opts.userId})`,
    );
  } else {
    query = query.eq("status", "live");
  }

  const { data } = await query;
  const raw = (data ?? []) as unknown as RawPost[];

  const posts = await Promise.all(
    raw
      .filter((p) => one(p.children) && one(p.spaces))
      .map(async (p): Promise<FeedPost> => {
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
          if (r.user_id === opts.userId) myReaction = r.emoji;
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
      }),
  );

  // Tag filter (applied after fetch keeps the query simple; feeds are small).
  return opts.tagSlug
    ? posts.filter((p) => p.tags.some((t) => t.slug === opts.tagSlug))
    : posts;
}

export function timeAgo(iso: string): string {
  const s = Math.max(1, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d ago`;
  return new Date(iso).toLocaleDateString();
}
