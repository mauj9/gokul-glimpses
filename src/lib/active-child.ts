import "server-only";
import { cookies } from "next/headers";

const COOKIE = "gg-active-child";

/** The child profile currently selected for posting (PRD 4.1 switcher). */
export async function getActiveChildId(): Promise<string | null> {
  const store = await cookies();
  return store.get(COOKIE)?.value ?? null;
}

export async function setActiveChildCookie(childId: string): Promise<void> {
  const store = await cookies();
  store.set(COOKIE, childId, {
    httpOnly: true,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 365,
    path: "/",
  });
}
