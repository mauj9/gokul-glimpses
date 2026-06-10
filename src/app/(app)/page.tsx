import { redirect } from "next/navigation";
import { getGardenStatus } from "@/lib/auth/session";
import { ButtonLink, Card } from "@/components/ui";

export default async function Home() {
  const { user, isAdmin, hasGardenAccess, homeSpaceId } =
    await getGardenStatus();

  // Sticky home space: land straight in the pinned feed (PRD 4.2).
  if (homeSpaceId) redirect(`/s/${homeSpaceId}`);
  if (hasGardenAccess) redirect("/spaces");

  // Walled garden: signed in but not yet invited into any space.
  const name =
    (user.user_metadata?.full_name as string | undefined)?.split(" ")[0] ??
    "friend";

  return (
    <main className="flex flex-1 items-center justify-center py-10">
      <Card className="w-full text-center">
        <p className="mb-3 text-5xl">🚪🌳</p>
        <h1 className="mb-2 font-display text-2xl font-bold text-peacock-deep">
          Namaste, {name}!
        </h1>
        <p className="mb-4 text-ink-soft">
          Gokul Glimpses is a private garden. To come in, ask your Shakha
          karyakarta or another parent for your space&apos;s{" "}
          <strong>invite link</strong> — tapping it brings you right inside.
        </p>
        <p className="text-sm text-ink-soft">
          Meanwhile, you can set up your family so you&apos;re ready to share.
        </p>
        <div className="mt-4 flex flex-col gap-2">
          <ButtonLink href="/family" variant="soft">
            👨‍👩‍👧‍👦 Set up my family
          </ButtonLink>
          {isAdmin && (
            <ButtonLink href="/admin" variant="secondary">
              🛡️ Admin console
            </ButtonLink>
          )}
        </div>
      </Card>
    </main>
  );
}
