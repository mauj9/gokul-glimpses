import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireGlobalAdmin } from "@/lib/auth/guards";
import { createServiceClient } from "@/lib/supabase/service";
import { ensureNationalSpace } from "@/lib/spaces";
import { buildSpaceTree, LEVEL_EMOJI, type SpaceNode, type SpaceRow } from "@/lib/tree";
import { Card, Chip, PageTitle } from "@/components/ui";
import { SpaceForm } from "../../forms";
import { DeleteSpaceButton } from "./delete-space-button";

export const metadata: Metadata = { title: "Manage parva" };

type Row = SpaceRow & { moderation: "instant" | "approval" };

/** Spaces (incl. self) and posts contained in a node's subtree. */
function subtreeStats(
  node: SpaceNode<Row>,
  postCountById: Map<string, number>,
): { spaces: number; posts: number } {
  let spaces = 1;
  let posts = postCountById.get(node.id) ?? 0;
  for (const child of node.children) {
    const s = subtreeStats(child, postCountById);
    spaces += s.spaces;
    posts += s.posts;
  }
  return { spaces, posts };
}

function TreeView({
  nodes,
  postCountById,
}: {
  nodes: SpaceNode<Row>[];
  postCountById: Map<string, number>;
}) {
  return (
    <ul className="space-y-2">
      {nodes.map((node) => {
        const stats = subtreeStats(node, postCountById);
        return (
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
              {node.level !== "national" && (
                <DeleteSpaceButton
                  spaceId={node.id}
                  name={node.name}
                  childSpaces={stats.spaces - 1}
                  posts={stats.posts}
                />
              )}
            </div>
            {node.children.length > 0 && (
              <div className="ml-6 mt-2 border-l-2 border-mango-soft pl-3">
                <TreeView nodes={node.children} postCountById={postCountById} />
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}

export default async function ManageParvaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireGlobalAdmin();
  const { id } = await params;
  const service = createServiceClient();

  // Self-heal parvas created before National was auto-provisioned.
  await ensureNationalSpace(id, user);

  const [{ data: parva }, { data: spaces }] = await Promise.all([
    service.from("parvas").select("id, name, status").eq("id", id).maybeSingle(),
    service
      .from("spaces")
      .select(
        "id, parent_space_id, level, name, visibility, moderation, posts(count)",
      )
      .eq("parva_id", id),
  ]);
  if (!parva) notFound();

  const raw = spaces ?? [];
  const postCountById = new Map<string, number>(
    raw.map((s) => [s.id, (s.posts as { count: number }[])?.[0]?.count ?? 0]),
  );
  const rows = raw.map((s) => ({
    id: s.id,
    parent_space_id: s.parent_space_id,
    level: s.level,
    name: s.name,
    visibility: s.visibility,
    moderation: s.moderation,
  })) as Row[];
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
            Setting up the National space… add a Sambhag under it below.
          </p>
        ) : (
          <TreeView nodes={tree} postCountById={postCountById} />
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
