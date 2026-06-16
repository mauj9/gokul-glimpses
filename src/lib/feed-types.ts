/**
 * Feed types + pure helpers shared by server (feed.ts) and client (PostCard,
 * FeedList) code. Kept free of `server-only` so client components can import it.
 */

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
  child: {
    id: string;
    first_name: string;
    age: number;
    avatar: string;
    city: string;
    state: string;
  };
  media: FeedMedia[];
  tags: { id: string; slug: string; label: string; emoji: string }[];
  reactions: Record<string, number>;
  myReaction: string | null;
};

export type FeedPage = {
  posts: FeedPost[];
  /** Pass back as `before` to fetch the next page; null when no more. */
  nextCursor: string | null;
};

/** Default number of glimpses per feed page ("Load more" chunk). */
export const FEED_PAGE_SIZE = 20;

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
