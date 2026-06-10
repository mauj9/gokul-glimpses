export type SpaceRow = {
  id: string;
  parent_space_id: string | null;
  level: "sambhag" | "vibhag" | "shakha";
  name: string;
  visibility: "listed" | "unlisted";
  moderation?: "instant" | "approval";
  invite_code?: string;
};

export type SpaceNode<T extends SpaceRow = SpaceRow> = T & {
  children: SpaceNode<T>[];
};

/** Nest flat space rows into a tree; orphans (hidden parents) become roots. */
export function buildSpaceTree<T extends SpaceRow>(rows: T[]): SpaceNode<T>[] {
  const nodes = new Map<string, SpaceNode<T>>(
    rows.map((r) => [r.id, { ...r, children: [] }]),
  );
  const roots: SpaceNode<T>[] = [];
  for (const node of nodes.values()) {
    const parent = node.parent_space_id
      ? nodes.get(node.parent_space_id)
      : undefined;
    if (parent) parent.children.push(node);
    else roots.push(node);
  }
  const byName = (a: SpaceNode<T>, b: SpaceNode<T>) =>
    a.name.localeCompare(b.name);
  const sortRec = (list: SpaceNode<T>[]) => {
    list.sort(byName);
    list.forEach((n) => sortRec(n.children));
  };
  sortRec(roots);
  return roots;
}

export const LEVEL_LABEL: Record<SpaceRow["level"], string> = {
  sambhag: "Sambhag",
  vibhag: "Vibhag",
  shakha: "Shakha",
};

export const LEVEL_EMOJI: Record<SpaceRow["level"], string> = {
  sambhag: "🌏",
  vibhag: "🏞️",
  shakha: "🏡",
};
