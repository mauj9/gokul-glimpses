import type { Metadata } from "next";
import { Card } from "@/components/ui";
import { GoogleSignInButton } from "./google-button";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const params = await searchParams;
  const next =
    params.next?.startsWith("/") && !params.next.startsWith("//")
      ? params.next
      : "/";

  return (
    <main className="flex flex-1 items-center justify-center p-6 bg-gradient-to-b from-cream to-mango-soft">
      <Card className="w-full max-w-sm text-center">
        <p className="text-6xl mb-3">🪈</p>
        <h1 className="font-display text-3xl font-bold text-peacock-deep">
          Gokul Glimpses
        </h1>
        <p className="text-ink-soft mt-2 mb-6">
          Share your holiday adventures with your Gokulam family — photos,
          videos, and little voice notes.
        </p>
        {params.error === "auth" && (
          <p className="mb-4 rounded-chubby bg-mango-soft px-4 py-2 text-sm font-semibold text-danger">
            Sign-in didn&apos;t complete — please try again.
          </p>
        )}
        <GoogleSignInButton next={next} />
        <p className="mt-6 text-xs text-ink-soft">
          A private community for Balagokulam families. Content is only visible
          to signed-in members.
        </p>
      </Card>
    </main>
  );
}
