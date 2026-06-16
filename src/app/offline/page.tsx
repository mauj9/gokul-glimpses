import type { Metadata } from "next";

export const metadata: Metadata = { title: "Offline" };

// Static page precached by the service worker and shown when a navigation
// fails because the device is offline. Must not depend on auth or data.
export default function OfflinePage() {
  return (
    <main className="flex flex-1 items-center justify-center p-6">
      <div className="max-w-sm rounded-chubby-lg bg-surface p-6 text-center shadow-chubby">
        <p className="mb-3 text-5xl">🪈📡</p>
        <h1 className="mb-2 font-display text-2xl font-bold text-peacock-deep">
          You&apos;re offline
        </h1>
        <p className="text-ink-soft">
          Gokul Glimpses needs an internet connection. Reconnect and try again
          to see the latest glimpses.
        </p>
      </div>
    </main>
  );
}
