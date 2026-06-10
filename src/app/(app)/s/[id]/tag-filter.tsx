import Link from "next/link";

/** Horizontal tag chips driving the ?tag= search param. */
export function TagFilterBar({
  spaceId,
  tags,
  active,
}: {
  spaceId: string;
  tags: { slug: string; label: string; emoji: string }[];
  active: string | null;
}) {
  if (tags.length === 0) return null;

  return (
    <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
      {active && (
        <Link
          href={`/s/${spaceId}`}
          className="shrink-0 rounded-chubby bg-ink px-3 py-1.5 text-sm font-semibold text-white"
        >
          ✕ Clear
        </Link>
      )}
      {tags.map((t) => (
        <Link
          key={t.slug}
          href={
            active === t.slug ? `/s/${spaceId}` : `/s/${spaceId}?tag=${t.slug}`
          }
          className={`shrink-0 rounded-chubby px-3 py-1.5 text-sm font-semibold transition-colors ${
            active === t.slug
              ? "bg-pistachio text-white"
              : "bg-pistachio-soft text-ink"
          }`}
        >
          {t.emoji} {t.label}
        </Link>
      ))}
    </div>
  );
}
