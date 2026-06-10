import type { Metadata } from "next";
import Link from "next/link";
import { getGardenStatus } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import {
  buildSpaceTree,
  LEVEL_EMOJI,
  type SpaceNode,
  type SpaceRow,
} from "@/lib/tree";
import { ButtonLink, Card, Chip, PageTitle } from "@/components/ui";

export const metadata: Metadata = { title: "Spaces" };

type Row = SpaceRow & { parva_id: string };

function TreeView({
  nodes,
  memberIds,
  homeSpaceId,
}: {
  nodes: SpaceNode<Row>[];
  memberIds: Set<string>;
  homeSpaceId: string | null;
}) {
  return (
    <ul className="space-y-2">
      {nodes.map((node) => (
        <li key={node.id}>
          <div className="flex items-center gap-2">
            <span>{LEVEL_EMOJI[node.level]}</span>
            <Link
              href={`/s/${node.id}`}
              className="font-semibold text-peacock-deep underline-offset-2 hover:underline"
            >
              {node.name}
            </Link>
            {node.id === homeSpaceId && <Chip>📌 Home</Chip>}
            {memberIds.has(node.id) && node.id !== homeSpaceId && (
              <Chip>✅ Joined</Chip>
            )}
            {node.visibility === "unlisted" && <Chip>🙈 Unlisted</Chip>}
          </div>
          {node.children.length > 0 && (
            <div className="ml-6 mt-2 border-l-2 border-mango-soft pl-3">
              <TreeView
                nodes={node.children}
                memberIds={memberIds}
                homeSpaceId={homeSpaceId}
              />
            </div>
          )}
        </li>
      ))}
    </ul>
  );
}

export default async function SpacesPage() {
  const { user, isAdmin, hasGardenAccess, homeSpaceId } =
    await getGardenStatus();
  const supabase = await createClient();

  if (!hasGardenAccess) {
    return (
      <main className="space-y-4">
        <PageTitle>Spaces</PageTitle>
        <Card className="text-center text-ink-soft">
          Ask your Shakha for an invite link to enter the garden. 🌳
        </Card>
      </main>
    );
  }

  const [{ data: parvas }, { data: spaces }, { data: memberships }] =
    await Promise.all([
      supabase
        .from("parvas")
        .select("id, name, status")
        .order("status") // active first
        .order("created_at", { ascending: false }),
      supabase
        .from("spaces")
        .select("id, parva_id, parent_space_id, level, name, visibility"),
      supabase.from("space_members").select("space_id").eq("user_id", user.id),
    ]);

  const memberIds = new Set((memberships ?? []).map((m) => m.space_id));
  // Directory shows listed spaces; unlisted only where the viewer is a member.
  const visible = ((spaces ?? []) as Row[]).filter(
    (s) => s.visibility === "listed" || memberIds.has(s.id),
  );

  return (
    <main className="space-y-4">
      <div className="flex items-center justify-between">
        <PageTitle>Spaces</PageTitle>
        {isAdmin && (
          <ButtonLink href="/admin" variant="soft" className="!min-h-9 text-sm">
            🛡️ Admin
          </ButtonLink>
        )}
      </div>

      {(parvas ?? []).map((parva) => {
        const tree = buildSpaceTree(visible.filter((s) => s.parva_id === parva.id));
        if (tree.length === 0) return null;
        return (
          <Card key={parva.id}>
            <div className="mb-3 flex items-center gap-2">
              <h2 className="font-display text-lg font-bold text-ink">
                {parva.name}
              </h2>
              {parva.status === "closed" && <Chip>🔒 Closed</Chip>}
            </div>
            <TreeView
              nodes={tree}
              memberIds={memberIds}
              homeSpaceId={homeSpaceId}
            />
          </Card>
        );
      })}
    </main>
  );
}
