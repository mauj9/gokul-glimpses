import type { Metadata } from "next";
import Link from "next/link";
import { getGardenStatus } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { fetchFeed } from "@/lib/feed";
import { LEVEL_EMOJI } from "@/lib/tree";
import { ButtonLink, Card, PageTitle } from "@/components/ui";
import { Player, type Slide } from "./player";

export const metadata: Metadata = { title: "Gokul Replay" };

const LIMITS = [20, 50, 100] as const;

export default async function ReplayConfigPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{
    tag?: string;
    order?: string;
    limit?: string;
    play?: string;
  }>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const { user, hasGardenAccess } = await getGardenStatus();
  const supabase = await createClient();

  const { data: space } = await supabase
    .from("spaces")
    .select("id, name, level, parvas(name)")
    .eq("id", id)
    .maybeSingle();

  if (!space || !hasGardenAccess) {
    return (
      <main className="space-y-4">
        <PageTitle>🎬 Gokul Replay</PageTitle>
        <Card className="text-center text-ink-soft">
          This space isn&apos;t open to you yet.
        </Card>
      </main>
    );
  }

  const order = sp.order === "random" ? "random" : "chrono";
  const limit = LIMITS.includes(Number(sp.limit) as 20) ? Number(sp.limit) : 50;
  const tag = sp.tag || null;

  // Scope-aware pull: this space + listed descendants (PRD 4.6).
  const { posts } = await fetchFeed(id, {
    userId: user.id,
    tagSlug: tag ?? undefined,
    limit: order === "chrono" ? limit : 200,
    order: "asc", // chronological: oldest first tells the season's story
  });

  if (sp.play === "1") {
    let selected = posts;
    if (order === "random") {
      selected = [...posts];
      for (let i = selected.length - 1; i > 0; i--) {
        // eslint-disable-next-line react-hooks/purity -- server component; a fresh shuffle per play is the "Surprise me" feature
        const j = Math.floor(Math.random() * (i + 1));
        [selected[i], selected[j]] = [selected[j], selected[i]];
      }
      selected = selected.slice(0, limit);
    }

    const slides: Slide[] = selected.map((p) => ({
      id: p.id,
      childName: p.child.first_name,
      childAge: p.child.age,
      avatar: p.child.avatar,
      spaceName: p.space.name,
      text: p.body_text,
      tags: p.tags.map((t) => `${t.emoji} ${t.label}`),
      images: p.media.filter((m) => m.kind === "image").map((m) => m.url),
      video: p.media.find((m) => m.kind === "video")?.url ?? null,
      echo: p.media.find((m) => m.kind === "audio")?.url ?? null,
      createdAt: p.created_at,
    }));

    return <Player slides={slides} exitHref={`/replay/${id}`} />;
  }

  // Tag options from the actual pool of posts.
  const tagMap = new Map<string, string>();
  for (const p of posts) {
    for (const t of p.tags) tagMap.set(t.slug, `${t.emoji} ${t.label}`);
  }

  const buildHref = (overrides: Record<string, string | null>) => {
    const q = new URLSearchParams();
    const merged = { tag, order, limit: String(limit), ...overrides };
    if (merged.tag) q.set("tag", merged.tag);
    if (merged.order && merged.order !== "chrono") q.set("order", merged.order);
    if (merged.limit && merged.limit !== "50") q.set("limit", merged.limit);
    if (overrides.play) q.set("play", "1");
    const qs = q.toString();
    return `/replay/${id}${qs ? `?${qs}` : ""}`;
  };

  const parva = Array.isArray(space.parvas) ? space.parvas[0] : space.parvas;

  return (
    <main className="space-y-4">
      <PageTitle>
        🎬 Replay · {LEVEL_EMOJI[space.level as "shakha"]} {space.name}
      </PageTitle>
      <p className="text-sm text-ink-soft">
        {parva?.name} · {posts.length} glimpses in scope
        {tag ? ` · filtered by tag` : ""}
      </p>

      {tagMap.size > 0 && (
        <Card>
          <p className="mb-2 font-display font-bold text-peacock-deep">
            Filter by tag
          </p>
          <div className="flex flex-wrap gap-2">
            <Link
              href={buildHref({ tag: null })}
              className={`rounded-chubby px-3 py-1.5 text-sm font-semibold ${
                !tag ? "bg-pistachio text-white" : "bg-pistachio-soft text-ink"
              }`}
            >
              Everything
            </Link>
            {[...tagMap.entries()].map(([slug, label]) => (
              <Link
                key={slug}
                href={buildHref({ tag: slug })}
                className={`rounded-chubby px-3 py-1.5 text-sm font-semibold ${
                  tag === slug
                    ? "bg-pistachio text-white"
                    : "bg-pistachio-soft text-ink"
                }`}
              >
                {label}
              </Link>
            ))}
          </div>
        </Card>
      )}

      <Card className="space-y-3">
        <div>
          <p className="mb-2 font-display font-bold text-peacock-deep">Order</p>
          <div className="flex gap-2">
            <Link
              href={buildHref({ order: "chrono" })}
              className={`rounded-chubby px-3 py-1.5 text-sm font-semibold ${
                order === "chrono"
                  ? "bg-peacock text-white"
                  : "bg-peacock-soft text-ink"
              }`}
            >
              📅 In order
            </Link>
            <Link
              href={buildHref({ order: "random" })}
              className={`rounded-chubby px-3 py-1.5 text-sm font-semibold ${
                order === "random"
                  ? "bg-peacock text-white"
                  : "bg-peacock-soft text-ink"
              }`}
            >
              🎲 Surprise me
            </Link>
          </div>
        </div>
        <div>
          <p className="mb-2 font-display font-bold text-peacock-deep">
            How many glimpses?
          </p>
          <div className="flex gap-2">
            {LIMITS.map((n) => (
              <Link
                key={n}
                href={buildHref({ limit: String(n) })}
                className={`rounded-chubby px-3 py-1.5 text-sm font-semibold ${
                  limit === n
                    ? "bg-peacock text-white"
                    : "bg-peacock-soft text-ink"
                }`}
              >
                {n}
              </Link>
            ))}
          </div>
        </div>
      </Card>

      <ButtonLink
        href={buildHref({ play: "1" })}
        className="w-full !min-h-14 text-lg"
        aria-disabled={posts.length === 0}
      >
        {posts.length === 0 ? "Nothing to play yet 🌼" : "▶️ Play"}
      </ButtonLink>
    </main>
  );
}
