import Link from "next/link";
import { requireUser } from "@/lib/auth/session";
import { BottomNav } from "@/components/bottom-nav";
import { ToastProvider } from "@/components/toast";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireUser();

  return (
    <ToastProvider>
      <div className="flex min-h-dvh flex-col">
        <header className="sticky top-0 z-40 bg-peacock text-white shadow-chubby">
          <div className="mx-auto flex max-w-lg items-center justify-between px-4 py-3">
            <Link href="/" className="font-display text-xl font-bold">
              🪈 Gokul Glimpses
            </Link>
            <Link
              href="/family"
              aria-label="My family"
              className="flex h-10 w-10 items-center justify-center rounded-full bg-peacock-deep text-xl"
            >
              👨‍👩‍👧‍👦
            </Link>
          </div>
        </header>
        <div className="mx-auto w-full max-w-lg flex-1 px-4 pb-24 pt-4">
          {children}
        </div>
        <BottomNav />
      </div>
    </ToastProvider>
  );
}
