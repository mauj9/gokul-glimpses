import type { Metadata } from "next";
import Link from "next/link";
import { after } from "next/server";
import { getGardenStatus } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { canAdminSpace } from "@/lib/auth/guards";
import { createServiceClient } from "@/lib/supabase/service";
import { LEVEL_EMOJI, LEVEL_LABEL, type SpaceLevel } from "@/lib/tree";
import { fetchFeed } from "@/lib/feed";
import { Button, ButtonLink, Card, Chip, PageTitle } from "@/components/ui";
import { FeedList } from "./feed-list";
import { setHomeSpace } from "../actions";
import { InviteLinkBox, SpaceSettingsForm, SpaceAdminsPanel } from "./admin-panel";
import { ModerationQueue } from "./moderation-queue";
import { FlagQueue } from "./flag-queue";
import { FamiliesPanel } from "./families-panel";
import { TabBar } from "./tab-bar";
import { TagFilterBar } from "./tag-filter";
import { CustomTagsPanel } from "./tags-panel";
import { EngagementCard } from "./engagement-card";
import { SpaceForm } from "@/app/(app)/admin/forms";

export const metadata: Metadata = { title: "Space" };

async function Feed({
  spaceId,
  userId,
  isSpaceAdmin,
  isClosed,
  tagSlug,
}: {
  spaceId: string;
  userId: string;
  isSpaceAdmin: boolean;
  isClosed: boolean;
  tagSlug: string | null;
}) {
  const supabase = await createClient();
  const [{ posts, nextCursor }, { data: chipRows }] = await Promise.all([
    fetchFeed(spaceId, {
      userId,
      includeOwnPending: true,
      tagSlug: tagSlug ?? undefined,
    }),
    // Filter chips reflect every tag used in the space (not just this page).
    supabase.rpc("space_tags", { root: spaceId }),
  ]);

  const chips = (chipRows ?? []) as {
    slug: string;
    label: string;
    emoji: string;
  }[];

  return (
    <>
      <TagFilterBar spaceId={spaceId} tags={chips} active={tagSlug} />
      {posts.length === 0 ? (
        <Card className="text-center text-ink-soft">
          <p className="mb-1 text-3xl">🌼</p>
          {tagSlug
            ? "No glimpses with this tag yet."
            : "No glimpses here yet — be the first to share!"}
        </Card>
      ) : (
        <FeedList
          spaceId={spaceId}
          tagSlug={tagSlug}
          viewerId={userId}
          isSpaceAdmin={isSpaceAdmin}
          isClosed={isClosed}
          initialPosts={posts}
          initialCursor={nextCursor}
        />
      )}
    </>
  );
}

export default async function SpacePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tag?: string; tab?: string }>;
}) {
  const { id } = await params;
  const { tag, tab } = await searchParams;
  const aboutTab = tab === "about";
  const { user, hasGardenAccess, homeSpaceId } = await getGardenStatus();
  const supabase = await createClient();

  const { data: space } = await supabase
    .from("spaces")
    .select(
      "id, parva_id, parent_space_id, level, name, slug, description, visibility, moderation, invite_code, parvas(name, status)",
    )
    .eq("id", id)
    .maybeSingle();

  if (!space || !hasGardenAccess) {
    return (
      <main className="flex flex-1 items-center justify-center py-10">
        <Card className="text-center">
          <p className="mb-2 text-4xl">🌳🚪</p>
          <p className="font-semibold">This space isn&apos;t open to you yet.</p>
          <p className="text-sm text-ink-soft">
            Ask your Shakha for an invite link.
          </p>
        </Card>
      </main>
    );
  }

  const parva = Array.isArray(space.parvas) ? space.parvas[0] : space.parvas;
  const isClosed = parva?.status === "closed";

  const [{ data: membership }, { count: memberCount }, isSpaceAdmin] =
    await Promise.all([
      supabase
        .from("space_members")
        .select("space_id")
        .eq("space_id", id)
        .eq("user_id", user.id)
        .maybeSingle(),
      supabase
        .from("space_members")
        .select("*", { count: "exact", head: true })
        .eq("space_id", id),
      canAdminSpace(user, id),
    ]);
  const isMember = Boolean(membership);
  const isHome = homeSpaceId === id;

  // Engagement analytics: anonymous per-space daily view counter. Runs after
  // the response (off the critical path) and only when viewing the feed.
  if (!aboutTab) {
    after(async () => {
      await supabase.rpc("record_space_view", { p_space_id: id });
    });
  }

  // Admin-only: badge the Manage tab with pending posts + open flags, and (only
  // when the About tab is open) load the space-admins list.
  let manageBadge = 0;
  let adminData: {
    admins: { user_id: string; email: string; display_name: string | null }[];
  } | null = null;
  if (isSpaceAdmin) {
    const service = createServiceClient();
    const { data: sub } = await service
      .from("spaces")
      .select("id")
      .contains("path", [id]);
    const subIds = (sub ?? []).map((s) => s.id);
    if (subIds.length > 0) {
      const [{ count: pending }, { data: flagRows }] = await Promise.all([
        service
          .from("posts")
          .select("id", { count: "exact", head: true })
          .in("space_id", subIds)
          .eq("status", "pending")
          .is("deleted_at", null),
        service
          .from("flags")
          .select("id, posts!inner(space_id, deleted_at)")
          .eq("status", "open")
          .in("posts.space_id", subIds),
      ]);
      const openFlags = (flagRows ?? []).filter((f) => {
        const p = Array.isArray(f.posts) ? f.posts[0] : f.posts;
        return p && !p.deleted_at;
      }).length;
      manageBadge = (pending ?? 0) + openFlags;
    }

    if (aboutTab) {
      const { data: adminRows } = await service
        .from("space_admins")
        .select("user_id, profiles(email, display_name)")
        .eq("space_id", id);
      adminData = {
        admins: (adminRows ?? []).map((r) => {
          const p = Array.isArray(r.profiles) ? r.profiles[0] : r.profiles;
          return {
            user_id: r.user_id,
            email: p?.email ?? "?",
            display_name: p?.display_name ?? null,
          };
        }),
      };
    }
  }

  return (
    <main className="space-y-4">
      <div>
        <PageTitle>
          {LEVEL_EMOJI[space.level as "shakha"]} {space.name}
        </PageTitle>
        <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-ink-soft">
          <Chip>{LEVEL_LABEL[space.level as "shakha"]}</Chip>
          <span>{parva?.name}</span>
          {isClosed && <Chip>🔒 Read-only</Chip>}
          {space.visibility === "unlisted" && <Chip>🙈 Unlisted</Chip>}
          <span>
            · {memberCount ?? 0} {memberCount === 1 ? "family" : "families"}
          </span>
        </div>
        {space.description && (
          <p className="mt-2 text-ink-soft">{space.description}</p>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        <ButtonLink href={`/replay/${space.id}`} variant="secondary">
          🎬 Gokul Replay
        </ButtonLink>
        {isMember || isSpaceAdmin ? (
          <form action={setHomeSpace}>
            <input type="hidden" name="space_id" value={space.id} />
            {isHome && <input type="hidden" name="clear" value="1" />}
            <Button variant={isHome ? "ghost" : "soft"} type="submit">
              {isHome ? "📌 Unpin home space" : "📌 Make this my home space"}
            </Button>
          </form>
        ) : (
          <Chip className="!bg-mango-soft">
            👋 You&apos;re viewing — members can post here
          </Chip>
        )}
      </div>

      <TabBar
        spaceId={space.id}
        active={aboutTab ? "about" : "glimpses"}
        secondLabel={isSpaceAdmin ? "⚙️ Manage" : "ℹ️ About"}
        badge={manageBadge}
      />

      {aboutTab ? (
        <>
          {isMember || isSpaceAdmin ? (
            <>
              <Card>
                <p className="mb-2 font-display font-bold text-peacock-deep">
                  🔗 Invite families
                </p>
                <p className="mb-2 text-sm text-ink-soft">
                  Anyone with this link can join {space.name} after signing in
                  with Google.
                </p>
                <InviteLinkBox
                  code={space.invite_code}
                  appUrl={process.env.NEXT_PUBLIC_APP_URL ?? ""}
                  canRegenerate={isSpaceAdmin}
                  spaceId={space.id}
                  spaceName={space.name}
                />
              </Card>
              <FamiliesPanel spaceId={space.id} showEmail={isSpaceAdmin} />
            </>
          ) : (
            <Card className="text-center text-ink-soft">
              Join this space (with an invite link) to post and invite others.
            </Card>
          )}

          {isSpaceAdmin && (
            <>
              <ModerationQueue spaceId={space.id} />
              <FlagQueue spaceId={space.id} />
              <EngagementCard spaceId={space.id} />
              <Card>
                <p className="mb-3 font-display font-bold text-peacock-deep">
                  ⚙️ Space settings
                </p>
                <SpaceSettingsForm
                  space={{
                    id: space.id,
                    name: space.name,
                    description: space.description,
                    visibility: space.visibility as "listed",
                    moderation: space.moderation as "instant",
                    invite_code: space.invite_code,
                  }}
                />
              </Card>
              <Card>
                <p className="mb-3 font-display font-bold text-peacock-deep">
                  🛡️ Space admins
                </p>
                {adminData && (
                  <SpaceAdminsPanel
                    spaceId={space.id}
                    admins={adminData.admins}
                  />
                )}
              </Card>
              <CustomTagsPanel spaceId={space.id} />
              {space.level !== "shakha" && (
                <Card>
                  <p className="mb-3 font-display font-bold text-peacock-deep">
                    ➕ Add a child space
                  </p>
                  <SpaceForm
                    parvaId={space.parva_id}
                    parentOptions={[
                      {
                        id: space.id,
                        name: space.name,
                        level: space.level as SpaceLevel,
                      },
                    ]}
                  />
                </Card>
              )}
            </>
          )}
        </>
      ) : (
        <Feed
          spaceId={space.id}
          userId={user.id}
          isSpaceAdmin={isSpaceAdmin}
          isClosed={isClosed}
          tagSlug={tag ?? null}
        />
      )}

      <p className="text-center text-sm">
        <Link href="/spaces" className="text-peacock underline-offset-2 hover:underline">
          ← All spaces
        </Link>
      </p>
    </main>
  );
}
