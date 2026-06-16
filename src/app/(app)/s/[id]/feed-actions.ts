"use server";

import { requireUser } from "@/lib/auth/session";
import { fetchFeed, FEED_PAGE_SIZE } from "@/lib/feed";
import type { FeedPage } from "@/lib/feed-types";

/** Next page of a space feed for the "Load more" button. RLS still applies. */
export async function loadMoreFeed(args: {
  spaceId: string;
  before: string;
  tagSlug?: string | null;
}): Promise<FeedPage> {
  const user = await requireUser();
  return fetchFeed(args.spaceId, {
    userId: user.id,
    includeOwnPending: true,
    tagSlug: args.tagSlug ?? undefined,
    before: args.before,
    limit: FEED_PAGE_SIZE,
  });
}
