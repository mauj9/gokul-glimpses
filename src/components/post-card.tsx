"use client";

import { Card, Chip } from "@/components/ui";
import { avatarEmoji } from "@/lib/avatars";
import { timeAgo, type FeedPost } from "@/lib/feed-types";
import { PostMenu } from "./post-menu";
import { ReactionBar } from "./reaction-bar";
import { FlagButton } from "./flag-button";

/**
 * One glimpse in the feed. Media URLs arrive already signed in `post`, so this
 * is a client component (it's rendered for both the initial page and posts
 * appended via "Load more").
 * `viewerCanDelete` = author or space admin. `readOnly` = parva closed.
 */
export function PostCard({
  post,
  viewerCanDelete,
  viewerId,
  readOnly = false,
}: {
  post: FeedPost;
  viewerCanDelete: boolean;
  viewerId: string;
  readOnly?: boolean;
}) {
  const images = post.media.filter((m) => m.kind === "image");
  const video = post.media.find((m) => m.kind === "video");
  const echo = post.media.find((m) => m.kind === "audio");

  return (
    <Card className="space-y-3 !p-4">
      <div className="flex items-center gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-mango-soft text-2xl">
          {avatarEmoji(post.child.avatar)}
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-display font-bold leading-tight text-peacock-deep">
            {post.child.first_name}, {post.child.age}
          </p>
          <p className="truncate text-xs text-ink-soft">
            {post.space.name} · {timeAgo(post.created_at)}
          </p>
        </div>
        {post.status === "pending" && <Chip>🕊️ Awaiting approval</Chip>}
        {viewerCanDelete && <PostMenu post={post} />}
      </div>

      {images.length > 0 && (
        <div
          className={`grid gap-1.5 ${images.length === 1 ? "grid-cols-1" : "grid-cols-2"}`}
        >
          {images.map((img) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={img.id}
              src={img.url}
              alt={`${post.child.first_name}'s glimpse`}
              width={img.width ?? undefined}
              height={img.height ?? undefined}
              loading="lazy"
              className={`w-full rounded-chubby object-cover ${
                images.length === 1 ? "max-h-96" : "h-44"
              }`}
            />
          ))}
        </div>
      )}

      {video && (
        <video
          src={video.url}
          controls
          playsInline
          preload="metadata"
          className="max-h-96 w-full rounded-chubby bg-ink"
        />
      )}

      {echo && (
        <div className="flex items-center gap-2 rounded-chubby bg-peacock-soft p-2">
          <span className="text-xl">🪶</span>
          <audio src={echo.url} controls preload="none" className="h-9 min-w-0 flex-1" />
        </div>
      )}

      {post.body_text && (
        <p className="whitespace-pre-wrap text-ink">{post.body_text}</p>
      )}

      {post.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {post.tags.map((t) => (
            <Chip key={t.id} className="!py-0.5 text-xs">
              {t.emoji} {t.label}
            </Chip>
          ))}
        </div>
      )}

      {post.status === "live" && (
        <div className="flex items-center justify-between">
          <ReactionBar
            postId={post.id}
            counts={post.reactions}
            mine={post.myReaction}
            readOnly={readOnly}
          />
          {post.author_user_id !== viewerId && <FlagButton postId={post.id} />}
        </div>
      )}
    </Card>
  );
}
