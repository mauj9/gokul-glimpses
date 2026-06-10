import type { Metadata } from "next";
import { Card, PageTitle } from "@/components/ui";

export const metadata: Metadata = { title: "Spaces" };

// Phase 3 replaces this stub with the Parva / org-tree browser.
export default function SpacesPage() {
  return (
    <main className="space-y-4">
      <PageTitle>Spaces</PageTitle>
      <Card className="text-center text-ink-soft">
        🏗️ The space directory arrives in Phase 3.
      </Card>
    </main>
  );
}
