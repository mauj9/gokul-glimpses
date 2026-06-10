import type { Metadata } from "next";
import Link from "next/link";
import { getGardenStatus } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { LEVEL_EMOJI, type SpaceRow } from "@/lib/tree";
import { Card, PageTitle } from "@/components/ui";

export const metadata: Metadata = { title: "Gokul Replay" };

/** Launcher: pick any visible space; replay pulls its whole listed subtree. */
export default async function ReplayLauncherPage() {
  const { user, hasGardenAccess, homeSpaceId } = await getGardenStatus();

  if (!hasGardenAccess) {
    return (
      <main className="space-y-4">
        <PageTitle>🎬 Gokul Replay</PageTitle>
        <Card className="text-center text-ink-soft">
          Join a space first — then relive its glimpses here. 🌳
        </Card>
      </main>
    );
  }

  const supabase = await createClient();
  const [{ data: spaces }, { data: memberships }] = await Promise.all([
    supabase
      .from("spaces")
      .select("id, parva_id, parent_space_id, level, name, visibility, parvas(name)")
      .order("level"),
    supabase.from("space_members").select("space_id").eq("user_id", user.id),
  ]);

  const memberIds = new Set((memberships ?? []).map((m) => m.space_id));
  const visible = ((spaces ?? []) as (SpaceRow & { parvas: { name: string } | { name: string }[] | null })[]).filter(
    (s) => s.visibility === "listed" || memberIds.has(s.id),
  );

  return (
    <main className="space-y-4">
      <PageTitle>🎬 Gokul Replay</PageTitle>
      <p className="text-ink-soft">
        Pick a space — Replay gathers every glimpse from it and all the spaces
        inside it.
      </p>
      <div className="space-y-2">
        {visible.map((s) => {
          const parva = Array.isArray(s.parvas) ? s.parvas[0] : s.parvas;
          return (
            <Link key={s.id} href={`/replay/${s.id}`} className="block">
              <Card className="flex items-center gap-3 !p-4 transition-transform hover:scale-[1.01]">
                <span className="text-2xl">{LEVEL_EMOJI[s.level]}</span>
                <span className="flex-1">
                  <span className="font-display font-bold text-peacock-deep">
                    {s.name}
                  </span>
                  <span className="block text-xs text-ink-soft">
                    {parva?.name}
                    {s.id === homeSpaceId && " · 📌 home"}
                  </span>
                </span>
                <span className="text-xl">▶️</span>
              </Card>
            </Link>
          );
        })}
      </div>
    </main>
  );
}
