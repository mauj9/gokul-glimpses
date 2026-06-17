"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

type Tab = "glimpses" | "about";

/**
 * Client tab bar: switches the active highlight *immediately* (optimistic) and
 * navigates inside a transition, so it feels responsive even while the dynamic
 * page re-renders on the server.
 */
export function TabBar({
  spaceId,
  active,
  secondLabel,
  badge,
}: {
  spaceId: string;
  active: Tab;
  secondLabel: string;
  badge: number;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [target, setTarget] = useState<Tab | null>(null);
  const shown = pending && target ? target : active;

  function go(tab: Tab, href: string) {
    if (tab === active) return;
    setTarget(tab);
    startTransition(() => router.push(href));
  }

  const base =
    "relative flex-1 rounded-chubby px-4 py-2 text-center font-display font-semibold transition-colors";
  const on = "bg-surface text-peacock-deep shadow-chubby";
  const off = "text-ink-soft";

  return (
    <div
      className="flex gap-2 rounded-chubby bg-mango-soft p-1"
      role="tablist"
      aria-busy={pending}
    >
      <button
        type="button"
        role="tab"
        aria-selected={shown === "glimpses"}
        onClick={() => go("glimpses", `/s/${spaceId}`)}
        className={`${base} ${shown === "glimpses" ? on : off}`}
      >
        📜 Glimpses
        {pending && target === "glimpses" && <PendingDot />}
      </button>
      <button
        type="button"
        role="tab"
        aria-selected={shown === "about"}
        onClick={() => go("about", `/s/${spaceId}?tab=about`)}
        className={`${base} ${shown === "about" ? on : off}`}
      >
        {secondLabel}
        {badge > 0 && (
          <span className="ml-1 inline-flex min-w-5 justify-center rounded-full bg-danger px-1.5 text-xs text-white">
            {badge}
          </span>
        )}
        {pending && target === "about" && <PendingDot />}
      </button>
    </div>
  );
}

function PendingDot() {
  return (
    <span className="ml-1.5 inline-block h-2 w-2 animate-pulse rounded-full bg-peacock align-middle" />
  );
}
