"use client";

import { Button } from "@/components/ui";
import type { FeedPost } from "@/lib/feed-types";
import { deletePost } from "@/app/(app)/post/actions";

export function PostMenu({ post }: { post: FeedPost }) {
  return (
    <form
      action={deletePost}
      onSubmit={(e) => {
        if (!confirm("Remove this glimpse?")) e.preventDefault();
      }}
    >
      <input type="hidden" name="post_id" value={post.id} />
      <input type="hidden" name="space_id" value={post.space.id} />
      <Button
        variant="ghost"
        type="submit"
        aria-label="Delete post"
        className="!min-h-8 !px-2 text-sm text-danger"
      >
        🗑️
      </Button>
    </form>
  );
}
