import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireGlobalAdmin } from "@/lib/auth/guards";
import { createServiceClient } from "@/lib/supabase/service";
import { buildSpaceTree, LEVEL_EMOJI, type SpaceNode, type SpaceRow } from "@/lib/tree";
import { Card, Chip, PageTitle } from "@/components/ui";
import { SpaceForm } from "../../forms";

export const metadata: Metadata = { title: "Manage parva" };

type Row = SpaceRow & { moderation: "instant" | "approval" };

function TreeView({ nodes }: { nodes: SpaceNode<Row>[] }) {
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
            {node.visibility === "unlisted" && <Chip>🙈 unlisted</Chip>}
            {node.moderation === "approval" && <Chip>✋ approval</Chip>}
          </div>
          {node.children.length > 0 && (
            <div className="ml-6 mt-2 border-l-2 border-mango-soft pl-3">
              <TreeView nodes={node.children} />
            </div>
          )}
        </li>
      ))}
    </ul>
  );
}

export default async function ManageParvaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireGlobalAdmin();
  const { id } = await params;
  const service = createServiceClient();

  const [{ data: parva }, { data: spaces }] = await Promise.all([
    service.from("parvas").select("id, name, status").eq("id", id).maybeSingle(),
    service
      .from("spaces")
      .select("id, parent_space_id, level, name, visibility, moderation")
      .eq("parva_id", id),
  ]);
  if (!parva) notFound();

  const rows = (spaces ?? []) as Row[];
  const tree = buildSpaceTree(rows);
  const parentOptions = rows
    .filter((s) => s.level !== "shakha")
    .map((s) => ({ id: s.id, name: s.name, level: s.level }));

  return (
    <main className="space-y-4">
      <PageTitle>{parva.name}</PageTitle>
      <Card>
        {rows.length === 0 ? (
          <p className="text-center text-ink-soft">
            No spaces yet — create the first Sambhag below.
          </p>
        ) : (
          <TreeView nodes={tree} />
        )}
      </Card>
      <Card>
        <p className="mb-3 font-display font-bold text-peacock-deep">
          New space
        </p>
        <SpaceForm parvaId={parva.id} parentOptions={parentOptions} />
      </Card>
    </main>
  );
}
