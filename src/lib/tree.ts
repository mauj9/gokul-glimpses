export type SpaceLevel = "national" | "sambhag" | "vibhag" | "shakha";

export type SpaceRow = {
  id: string;
  parent_space_id: string | null;
  level: SpaceLevel;
  name: string;
  visibility: "listed" | "unlisted";
  moderation?: "instant" | "approval";
  invite_code?: string;
};

/** Tiers from broadest to narrowest (HSS org tree). */
export const LEVEL_ORDER: SpaceLevel[] = [
  "national",
  "sambhag",
  "vibhag",
  "shakha",
];

/** Level a new child under `parentLevel` becomes; null if the parent is a leaf. */
export function childLevelOf(parentLevel: SpaceLevel): SpaceLevel | null {
  const i = LEVEL_ORDER.indexOf(parentLevel);
  return i >= 0 && i < LEVEL_ORDER.length - 1 ? LEVEL_ORDER[i + 1] : null;
}

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

export const LEVEL_LABEL: Record<SpaceLevel, string> = {
  national: "National",
  sambhag: "Sambhag",
  vibhag: "Vibhag",
  shakha: "Shakha",
};

export const LEVEL_EMOJI: Record<SpaceLevel, string> = {
  national: "🏛️",
  sambhag: "🌏",
  vibhag: "🏞️",
  shakha: "🏡",
};
