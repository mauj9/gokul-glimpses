import type { Metadata } from "next";
import Link from "next/link";
import { getGardenStatus } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { canAdminSpace } from "@/lib/auth/guards";
import { createServiceClient } from "@/lib/supabase/service";
import { LEVEL_EMOJI, LEVEL_LABEL } from "@/lib/tree";
import { fetchFeed } from "@/lib/feed";
import { Button, Card, Chip, PageTitle } from "@/components/ui";
import { PostCard } from "@/components/post-card";
import { setHomeSpace } from "../actions";
import { InviteLinkBox, SpaceSettingsForm, SpaceAdminsPanel } from "./admin-panel";
import { ModerationQueue } from "./moderation-queue";
import { FlagQueue } from "./flag-queue";
import { TagFilterBar } from "./tag-filter";
import { CustomTagsPanel } from "./tags-panel";
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
  const posts = await fetchFeed(spaceId, {
    userId,
    includeOwnPending: true,
    tagSlug: tagSlug ?? undefined,
  });

  // Tag bar shows tags actually used in this feed (unfiltered slice keeps it
  // stable while a filter is active).
  const allPosts = tagSlug
    ? await fetchFeed(spaceId, { userId, includeOwnPending: true })
    : posts;
  const tagMap = new Map<string, { slug: string; label: string; emoji: string }>();
  for (const p of allPosts) {
    for (const t of p.tags) tagMap.set(t.slug, t);
  }

  return (
    <>
      <TagFilterBar
        spaceId={spaceId}
        tags={[...tagMap.values()]}
        active={tagSlug}
      />
      {posts.length === 0 ? (
        <Card className="text-center text-ink-soft">
          <p className="mb-1 text-3xl">🌼</p>
          {tagSlug
            ? "No glimpses with this tag yet."
            : "No glimpses here yet — be the first to share!"}
        </Card>
      ) : (
        <div className="space-y-3">
          {posts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              viewerId={userId}
              readOnly={isClosed}
              viewerCanDelete={isSpaceAdmin || post.author_user_id === userId}
            />
          ))}
        </div>
      )}
    </>
  );
}

export default async function SpacePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tag?: string }>;
}) {
  const { id } = await params;
  const { tag } = await searchParams;
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

  // Engagement analytics: anonymous per-space daily view counter.
  await supabase.rpc("record_space_view", { p_space_id: id });

  let adminData: {
    admins: { user_id: string; email: string; display_name: string | null }[];
  } | null = null;
  if (isSpaceAdmin) {
    const service = createServiceClient();
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

  return (
    <main className="space-y-4">
      <div>
        <div className="flex items-center gap-2">
          <PageTitle>
            {LEVEL_EMOJI[space.level as "shakha"]} {space.name}
          </PageTitle>
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-ink-soft">
          <Chip>{LEVEL_LABEL[space.level as "shakha"]}</Chip>
          <span>{parva?.name}</span>
          {isClosed && <Chip>🔒 Read-only</Chip>}
          {space.visibility === "unlisted" && <Chip>🙈 Unlisted</Chip>}
          <span>· {memberCount ?? 0} families</span>
        </div>
        {space.description && (
          <p className="mt-2 text-ink-soft">{space.description}</p>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
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

      {(isMember || isSpaceAdmin) && (
        <Card>
          <p className="mb-2 font-display font-bold text-peacock-deep">
            🔗 Invite families
          </p>
          <p className="mb-2 text-sm text-ink-soft">
            Anyone with this link can join {space.name} after signing in with
            Google.
          </p>
          <InviteLinkBox
            code={space.invite_code}
            appUrl={process.env.NEXT_PUBLIC_APP_URL ?? ""}
            canRegenerate={isSpaceAdmin}
            spaceId={space.id}
          />
        </Card>
      )}

      {isSpaceAdmin && <ModerationQueue spaceId={space.id} />}
      {isSpaceAdmin && <FlagQueue spaceId={space.id} />}

      <Feed
        spaceId={space.id}
        userId={user.id}
        isSpaceAdmin={isSpaceAdmin}
        isClosed={isClosed}
        tagSlug={tag ?? null}
      />

      {isSpaceAdmin && adminData && (
        <>
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
            <SpaceAdminsPanel spaceId={space.id} admins={adminData.admins} />
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
                  { id: space.id, name: space.name, level: space.level },
                ]}
              />
            </Card>
          )}
        </>
      )}

      <p className="text-center text-sm">
        <Link href="/spaces" className="text-peacock underline-offset-2 hover:underline">
          ← All spaces
        </Link>
      </p>
    </main>
  );
}
