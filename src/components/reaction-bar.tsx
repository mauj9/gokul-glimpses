"use client";

import { useState, useTransition } from "react";
import { setReaction } from "@/app/(app)/post/engagement-actions";

const EMOJIS = [
  ["thumbs_up", "👍"],
  ["smile", "😄"],
  ["heart", "❤️"],
  ["namaste", "🙏"],
] as const;

type Key = (typeof EMOJIS)[number][0];

export function ReactionBar({
  postId,
  counts,
  mine,
  readOnly,
}: {
  postId: string;
  counts: Record<string, number>;
  mine: string | null;
  readOnly: boolean;
}) {
  const [local, setLocal] = useState({ counts, mine });
  const [, startTransition] = useTransition();

  function tap(key: Key) {
    if (readOnly) return;
    setLocal((prev) => {
      const next = { ...prev.counts };
      const newMine = prev.mine === key ? null : key;
      if (prev.mine) next[prev.mine] = Math.max(0, (next[prev.mine] ?? 1) - 1);
      if (newMine) next[newMine] = (next[newMine] ?? 0) + 1;
      return { counts: next, mine: newMine };
    });
    startTransition(async () => {
      // Optimistic; server result wins on next page load.
      await setReaction(postId, local.mine === key ? null : key);
    });
  }

  return (
    <div className="flex gap-1.5">
      {EMOJIS.map(([key, glyph]) => {
        const count = local.counts[key] ?? 0;
        const active = local.mine === key;
        return (
          <button
            key={key}
            type="button"
            disabled={readOnly}
            aria-pressed={active}
            aria-label={`React ${glyph}`}
            onClick={() => tap(key)}
            className={`flex min-h-9 items-center gap-1 rounded-chubby px-2.5 text-base transition-transform active:scale-110 ${
              active
                ? "bg-marigold-soft ring-2 ring-marigold"
                : "bg-cream"
            } ${readOnly ? "opacity-60" : ""}`}
          >
            {glyph}
            {count > 0 && (
              <span className="text-xs font-bold text-ink-soft">{count}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}
