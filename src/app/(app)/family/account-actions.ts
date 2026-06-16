"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { requireUser } from "@/lib/auth/session";
import { writeAudit } from "@/lib/audit";

/**
 * Permanently delete the signed-in user's own account. Deleting the auth.users
 * row cascades (ON DELETE CASCADE) to their profile → children, posts, media
 * rows, reactions, flags, memberships, and space-admin roles. Spaces/parvas
 * they created remain, with created_by set null. Only ever deletes the caller.
 */
export async function deleteAccount(): Promise<{ error: string } | void> {
  const user = await requireUser();

  await writeAudit({
    actorId: user.id,
    actorEmail: user.email,
    action: "account.delete",
    entityType: "profile",
    entityId: user.id,
  });

  const service = createServiceClient();
  const { error } = await service.auth.admin.deleteUser(user.id);
  if (error) {
    return { error: "Could not delete your account — please try again." };
  }

  // Clear the session cookies before leaving.
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login?deleted=1");
}
