import "server-only";
import { redirect } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { isGlobalAdmin } from "@/lib/auth/admin";

/** Proxy already gates routes; this is the in-page guarantee. */
export async function requireUser(): Promise<User> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return user;
}

export type GardenStatus = {
  user: User;
  isAdmin: boolean;
  /** True when the user belongs to ≥1 space (or is a global admin). */
  hasGardenAccess: boolean;
  homeSpaceId: string | null;
};

export async function getGardenStatus(): Promise<GardenStatus> {
  const user = await requireUser();
  const supabase = await createClient();

  const [{ data: membership }, { data: profile }, isAdmin] = await Promise.all([
    supabase
      .from("space_members")
      .select("space_id")
      .eq("user_id", user.id)
      .limit(1)
      .maybeSingle(),
    supabase
      .from("profiles")
      .select("home_space_id")
      .eq("id", user.id)
      .maybeSingle(),
    isGlobalAdmin(user.email),
  ]);

  return {
    user,
    isAdmin,
    hasGardenAccess: Boolean(membership) || isAdmin,
    homeSpaceId: profile?.home_space_id ?? null,
  };
}
