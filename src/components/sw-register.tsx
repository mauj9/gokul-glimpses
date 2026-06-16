"use client";

import { useEffect } from "react";

/**
 * Registers the service worker in production only (keeps local dev free of SW
 * caching surprises). Renders nothing.
 */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch(() => {
      // Registration failures are non-fatal; the app works without the SW.
    });
  }, []);

  return null;
}
