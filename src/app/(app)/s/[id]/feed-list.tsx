"use client";

import { useState } from "react";
import { Button } from "@/components/ui";
import { PostCard } from "@/components/post-card";
import type { FeedPost } from "@/lib/feed-types";
import { loadMoreFeed } from "./feed-actions";

export function FeedList({
  spaceId,
  tagSlug,
  viewerId,
  isSpaceAdmin,
  isClosed,
  initialPosts,
  initialCursor,
}: {
  spaceId: string;
  tagSlug: string | null;
  viewerId: string;
  isSpaceAdmin: boolean;
  isClosed: boolean;
  initialPosts: FeedPost[];
  initialCursor: string | null;
}) {
  const [posts, setPosts] = useState(initialPosts);
  const [cursor, setCursor] = useState(initialCursor);
  const [loading, setLoading] = useState(false);

  async function loadMore() {
    if (!cursor || loading) return;
    setLoading(true);
    try {
      const page = await loadMoreFeed({ spaceId, before: cursor, tagSlug });
      // Guard against duplicates if posts shifted between pages.
      setPosts((prev) => {
        const seen = new Set(prev.map((p) => p.id));
        return [...prev, ...page.posts.filter((p) => !seen.has(p.id))];
      });
      setCursor(page.nextCursor);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <div className="space-y-3">
        {posts.map((post) => (
          <PostCard
            key={post.id}
            post={post}
            viewerId={viewerId}
            readOnly={isClosed}
            viewerCanDelete={isSpaceAdmin || post.author_user_id === viewerId}
          />
        ))}
      </div>
      {cursor && (
        <Button
          variant="soft"
          onClick={loadMore}
          disabled={loading}
          className="w-full"
        >
          {loading ? "Loading…" : "Load more glimpses"}
        </Button>
      )}
    </>
  );
}
