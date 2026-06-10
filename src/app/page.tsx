import { getGardenStatus } from "@/lib/auth/session";
import { Button, Card, Chip } from "@/components/ui";

// Phase 2 turns this into the real walled-garden router (home-space redirect,
// invite-needed landing). For now it proves out the auth loop.
export default async function Home() {
  const { user, isAdmin, hasGardenAccess } = await getGardenStatus();
  const name =
    (user.user_metadata?.full_name as string | undefined) ?? user.email;

  return (
    <main className="flex flex-1 items-center justify-center p-6">
      <Card className="w-full max-w-md text-center">
        <p className="text-5xl mb-4">🪈</p>
        <h1 className="font-display text-3xl font-bold text-peacock-deep mb-2">
          Namaste, {name}!
        </h1>
        <div className="flex justify-center gap-2 mb-4">
          {isAdmin && <Chip>🛡️ Global Admin</Chip>}
          <Chip>{hasGardenAccess ? "🌳 In the garden" : "🚪 Awaiting invite"}</Chip>
        </div>
        <p className="text-ink-soft mb-6">
          {hasGardenAccess
            ? "Spaces and feeds arrive in the next phases."
            : "Ask your Shakha karyakarta for an invite link to join a space."}
        </p>
        <form action="/auth/signout" method="post">
          <Button variant="ghost" type="submit">
            Sign out
          </Button>
        </form>
      </Card>
    </main>
  );
}
