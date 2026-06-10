import { Card } from "@/components/ui";

export default function Home() {
  return (
    <main className="flex flex-1 items-center justify-center p-6">
      <Card className="max-w-md text-center">
        <p className="text-5xl mb-4">🪈</p>
        <h1 className="font-display text-3xl font-bold text-peacock-deep mb-2">
          Gokul Glimpses
        </h1>
        <p className="text-ink-soft">
          A private space for Balagokulam families to share holiday glimpses.
          Sign-in arrives in Phase 1.
        </p>
      </Card>
    </main>
  );
}
