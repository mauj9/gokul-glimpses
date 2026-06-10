import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { createServiceClient } from "@/lib/supabase/service";
import { LEVEL_EMOJI, LEVEL_LABEL } from "@/lib/tree";
import { Button, ButtonLink, Card, Chip } from "@/components/ui";
import { joinSpace } from "../../s/actions";

export const metadata: Metadata = { title: "Join space" };

export default async function JoinPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const user = await requireUser();

  // Code possession is the authorization — look up via service role.
  const service = createServiceClient();
  const { data: space } = await service
    .from("spaces")
    .select("id, name, level, description, parvas(name), space_members(count)")
    .eq("invite_code", code)
    .maybeSingle();

  if (!space) {
    return (
      <main className="flex flex-1 items-center justify-center py-10">
        <Card className="w-full text-center">
          <p className="mb-2 text-4xl">🥺</p>
          <p className="font-semibold">This invite link isn&apos;t valid.</p>
          <p className="mb-4 text-sm text-ink-soft">
            It may have been regenerated — ask for a fresh link.
          </p>
          <ButtonLink href="/" variant="soft">
            Go home
          </ButtonLink>
        </Card>
      </main>
    );
  }

  const { data: existing } = await service
    .from("space_members")
    .select("space_id")
    .eq("space_id", space.id)
    .eq("user_id", user.id)
    .maybeSingle();
  if (existing) redirect(`/s/${space.id}`);

  const parva = Array.isArray(space.parvas) ? space.parvas[0] : space.parvas;
  const memberCount = space.space_members?.[0]?.count ?? 0;

  return (
    <main className="flex flex-1 items-center justify-center py-10">
      <Card className="w-full text-center">
        <p className="mb-2 text-5xl">
          {LEVEL_EMOJI[space.level as "shakha"]}
        </p>
        <h1 className="font-display text-2xl font-bold text-peacock-deep">
          {space.name}
        </h1>
        <div className="mt-1 mb-3 flex justify-center gap-2">
          <Chip>{LEVEL_LABEL[space.level as "shakha"]}</Chip>
          <Chip>{parva?.name}</Chip>
        </div>
        {space.description && (
          <p className="mb-2 text-ink-soft">{space.description}</p>
        )}
        <p className="mb-5 text-sm text-ink-soft">
          {memberCount} families are already sharing here. You&apos;ve been
          invited to join them!
        </p>
        <form action={joinSpace}>
          <input type="hidden" name="code" value={code} />
          <Button type="submit" className="w-full">
            🌳 Join {space.name}
          </Button>
        </form>
      </Card>
    </main>
  );
}
