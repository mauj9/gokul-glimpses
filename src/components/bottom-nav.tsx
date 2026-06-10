"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/** Thumb-friendly bottom nav: Home · floating "+" · Replay (PRD 5.2). */
export function BottomNav() {
  const pathname = usePathname();

  const item = (href: string, label: string, emoji: string) => {
    const active =
      href === "/" ? pathname === "/" : pathname.startsWith(href);
    return (
      <Link
        href={href}
        className={`flex flex-col items-center justify-center gap-0.5 min-w-20 min-h-12 rounded-chubby text-xs font-semibold transition-colors ${
          active ? "text-peacock-deep bg-peacock-soft" : "text-ink-soft"
        }`}
      >
        <span className="text-2xl leading-none">{emoji}</span>
        {label}
      </Link>
    );
  };

  return (
    <nav className="sticky bottom-0 z-40 bg-surface border-t-2 border-mango-soft shadow-chubby-lg">
      <div className="mx-auto flex max-w-lg items-center justify-between px-6 py-2">
        {item("/", "Home", "📜")}
        <Link
          href="/post"
          aria-label="New glimpse"
          className="-mt-8 flex h-16 w-16 items-center justify-center rounded-full bg-marigold text-4xl text-white shadow-chubby-lg border-4 border-cream font-display"
        >
          +
        </Link>
        {item("/replay", "Replay", "🎬")}
      </div>
    </nav>
  );
}
