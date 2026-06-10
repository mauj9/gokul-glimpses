"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui";

export function GoogleSignInButton({ next }: { next: string }) {
  const [busy, setBusy] = useState(false);

  async function signIn() {
    setBusy(true);
    const supabase = createClient();
    const redirectTo = `${location.origin}/auth/callback?next=${encodeURIComponent(next)}`;
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo },
    });
    if (error) setBusy(false);
  }

  return (
    <Button onClick={signIn} disabled={busy} className="w-full">
      <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden>
        <path
          fill="currentColor"
          d="M21.35 11.1H12v2.96h5.35c-.5 2.36-2.47 3.7-5.35 3.7a5.76 5.76 0 1 1 0-11.52c1.47 0 2.79.5 3.83 1.49l2.2-2.2A8.94 8.94 0 0 0 12 3a9 9 0 1 0 0 18c5.19 0 8.63-3.64 8.63-8.77 0-.39-.1-.75-.28-1.13Z"
        />
      </svg>
      {busy ? "Opening Google…" : "Continue with Google"}
    </Button>
  );
}
