import type { Metadata } from "next";
import { Card, PageTitle } from "@/components/ui";

export const metadata: Metadata = { title: "Gokul Replay" };

// Phase 6 replaces this stub with the interactive slideshow engine.
export default function ReplayPage() {
  return (
    <main className="space-y-4">
      <PageTitle>Gokul Replay</PageTitle>
      <Card className="text-center text-ink-soft">
        🏗️ The replay engine arrives in Phase 6.
      </Card>
    </main>
  );
}
