import type { Metadata } from "next";
import { requireUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { getActiveChildId } from "@/lib/active-child";
import { ButtonLink, Card, PageTitle } from "@/components/ui";
import { Composer } from "./composer";

export const metadata: Metadata = { title: "New glimpse" };

export default async function PostPage() {
  const user = await requireUser();
  const supabase = await createClient();

  const [
    { data: children },
    { data: memberships },
    { data: tags },
    { data: profile },
    activeChildId,
  ] = await Promise.all([
    supabase
      .from("children")
      .select("id, first_name, avatar")
      .eq("parent_id", user.id)
      .order("created_at"),
    supabase
      .from("space_members")
      .select("spaces(id, name, level, parvas(status))")
      .eq("user_id", user.id),
    supabase
      .from("tags")
      .select("slug, label, emoji")
      .eq("is_predefined", true)
      .order("label"),
    supabase
      .from("profiles")
      .select("home_space_id")
      .eq("id", user.id)
      .maybeSingle(),
    getActiveChildId(),
  ]);

  const kids = children ?? [];
  // Postable spaces: joined + parva still active.
  const spaces = (memberships ?? [])
    .map((m) => (Array.isArray(m.spaces) ? m.spaces[0] : m.spaces))
    .filter((s): s is NonNullable<typeof s> => Boolean(s))
    .filter((s) => {
      const parva = Array.isArray(s.parvas) ? s.parvas[0] : s.parvas;
      return parva?.status === "active";
    })
    .map((s) => ({ id: s.id, name: s.name, level: s.level }));

  if (kids.length === 0) {
    return (
      <main className="space-y-4">
        <PageTitle>New glimpse</PageTitle>
        <Card className="text-center">
          <p className="mb-2 text-4xl">🌱</p>
          <p className="mb-4 font-semibold">
            First, add your child to your family — glimpses are shared in their
            name.
          </p>
          <ButtonLink href="/family">👨‍👩‍👧‍👦 Set up my family</ButtonLink>
        </Card>
      </main>
    );
  }

  if (spaces.length === 0) {
    return (
      <main className="space-y-4">
        <PageTitle>New glimpse</PageTitle>
        <Card className="text-center">
          <p className="mb-2 text-4xl">🌳🚪</p>
          <p className="mb-2 font-semibold">You haven&apos;t joined a space yet.</p>
          <p className="text-sm text-ink-soft">
            Ask your Shakha for an invite link, then come back to share!
          </p>
        </Card>
      </main>
    );
  }

  const defaultSpaceId =
    spaces.find((s) => s.id === profile?.home_space_id)?.id ?? spaces[0].id;

  return (
    <main className="space-y-4">
      <PageTitle>New glimpse</PageTitle>
      <Composer
        childrenProfiles={kids}
        spaces={spaces}
        predefinedTags={tags ?? []}
        defaultChildId={
          kids.find((k) => k.id === activeChildId)?.id ?? kids[0].id
        }
        defaultSpaceId={defaultSpaceId}
      />
    </main>
  );
}
