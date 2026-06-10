import "server-only";
import { redirect } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { requireUser } from "@/lib/auth/session";
import { isGlobalAdmin } from "@/lib/auth/admin";
import { createServiceClient } from "@/lib/supabase/service";

export async function requireGlobalAdmin(): Promise<User> {
  const user = await requireUser();
  if (!(await isGlobalAdmin(user.email))) redirect("/");
  return user;
}

/** Global admin, or admin of the space / any of its ancestors. */
export async function canAdminSpace(
  user: User,
  spaceId: string,
): Promise<boolean> {
  if (await isGlobalAdmin(user.email)) return true;
  const service = createServiceClient();
  const { data: space } = await service
    .from("spaces")
    .select("path")
    .eq("id", spaceId)
    .maybeSingle();
  if (!space) return false;
  const { data: rows } = await service
    .from("space_admins")
    .select("space_id")
    .eq("user_id", user.id)
    .in("space_id", space.path);
  return (rows?.length ?? 0) > 0;
}
