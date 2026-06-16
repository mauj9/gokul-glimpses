"use client";

import { useState } from "react";
import { flagPost } from "@/app/(app)/post/engagement-actions";
import { useToast } from "@/components/toast";

export function FlagButton({ postId }: { postId: string }) {
  const [done, setDone] = useState(false);
  const toast = useToast();

  async function flag() {
    const reason = prompt(
      "Tell the space admins what's wrong with this post (optional):",
    );
    if (reason === null) return; // cancelled
    const { ok } = await flagPost(postId, reason);
    if (ok) setDone(true);
    else toast("Couldn't send your report — please try again.", "error");
  }

  if (done) {
    return (
      <span className="text-xs font-semibold text-ink-soft">
        🚩 Reported — thank you
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={flag}
      aria-label="Report this post"
      className="min-h-9 rounded-chubby px-2 text-sm text-ink-soft hover:bg-cream"
    >
      🚩
    </button>
  );
}
