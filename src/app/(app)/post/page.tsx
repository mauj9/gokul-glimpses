import type { Metadata } from "next";
import { Card, PageTitle } from "@/components/ui";

export const metadata: Metadata = { title: "New glimpse" };

// Phase 4 replaces this stub with the multi-modal composer.
export default function PostPage() {
  return (
    <main className="space-y-4">
      <PageTitle>New glimpse</PageTitle>
      <Card className="text-center text-ink-soft">
        🏗️ The glimpse composer arrives in Phase 4.
      </Card>
    </main>
  );
}
