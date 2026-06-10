"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { nanoid } from "nanoid";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { requireUser } from "@/lib/auth/session";
import { canAdminSpace } from "@/lib/auth/guards";
import { writeAudit } from "@/lib/audit";
import type { FormState } from "@/app/(app)/admin/actions";

// ---------------------------------------------------------------- join

/** Invite-code possession is the authorization (DECISIONS #3). */
export async function joinSpace(formData: FormData): Promise<void> {
  const user = await requireUser();
  const code = String(formData.get("code") ?? "");

  const service = createServiceClient();
  const { data: space } = await service
    .from("spaces")
    .select("id, name")
    .eq("invite_code", code)
    .maybeSingle();
  if (!space) redirect("/join/invalid");

  const { error } = await service
    .from("space_members")
    .upsert(
      { space_id: space.id, user_id: user.id },
      { onConflict: "space_id,user_id" },
    );
  if (!error) {
    await writeAudit({
      actorId: user.id,
      actorEmail: user.email,
      action: "space.join",
      entityType: "space",
      entityId: space.id,
    });
  }
  redirect(`/s/${space.id}`);
}

// ---------------------------------------------------------------- home pin

export async function setHomeSpace(formData: FormData): Promise<void> {
  const user = await requireUser();
  const spaceId = String(formData.get("space_id") ?? "");
  const clear = formData.get("clear") === "1";

  const supabase = await createClient();
  await supabase
    .from("profiles")
    .update({ home_space_id: clear ? null : spaceId })
    .eq("id", user.id);
  revalidatePath(`/s/${spaceId}`);
}

// ---------------------------------------------------------------- settings

export async function updateSpaceSettings(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const user = await requireUser();
  const spaceId = String(formData.get("space_id") ?? "");
  if (!(await canAdminSpace(user, spaceId))) {
    return { error: "Not allowed." };
  }

  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const visibility =
    String(formData.get("visibility")) === "unlisted" ? "unlisted" : "listed";
  const moderation =
    String(formData.get("moderation")) === "approval" ? "approval" : "instant";
  if (name.length < 3 || name.length > 60) {
    return { error: "Name must be 3–60 characters." };
  }

  const service = createServiceClient();
  const { error } = await service
    .from("spaces")
    .update({ name, description, visibility, moderation })
    .eq("id", spaceId);
  if (error) return { error: "Could not save settings." };

  await writeAudit({
    actorId: user.id,
    actorEmail: user.email,
    action: "space.update",
    entityType: "space",
    entityId: spaceId,
    meta: { name, visibility, moderation },
  });
  revalidatePath(`/s/${spaceId}`);
  return null;
}

export async function regenerateInvite(formData: FormData): Promise<void> {
  const user = await requireUser();
  const spaceId = String(formData.get("space_id") ?? "");
  if (!(await canAdminSpace(user, spaceId))) return;

  const service = createServiceClient();
  const { error } = await service
    .from("spaces")
    .update({ invite_code: nanoid(12) })
    .eq("id", spaceId);
  if (!error) {
    await writeAudit({
      actorId: user.id,
      actorEmail: user.email,
      action: "space.invite_regenerate",
      entityType: "space",
      entityId: spaceId,
    });
  }
  revalidatePath(`/s/${spaceId}`);
}

// ---------------------------------------------------------------- space admins

export async function addSpaceAdmin(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const user = await requireUser();
  const spaceId = String(formData.get("space_id") ?? "");
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!(await canAdminSpace(user, spaceId))) return { error: "Not allowed." };

  const service = createServiceClient();
  const { data: profile } = await service
    .from("profiles")
    .select("id")
    .eq("email", email)
    .maybeSingle();
  if (!profile) {
    return {
      error: "No account with that Google ID yet — ask them to sign in once first.",
    };
  }

  await service.from("space_admins").upsert(
    { space_id: spaceId, user_id: profile.id, added_by: user.id },
    { onConflict: "space_id,user_id" },
  );
  // Admins should also be members so the space shows in their directory.
  await service.from("space_members").upsert(
    { space_id: spaceId, user_id: profile.id },
    { onConflict: "space_id,user_id" },
  );

  await writeAudit({
    actorId: user.id,
    actorEmail: user.email,
    action: "space_admin.add",
    entityType: "space",
    entityId: spaceId,
    meta: { email },
  });
  revalidatePath(`/s/${spaceId}`);
  return null;
}

export async function removeSpaceAdmin(formData: FormData): Promise<void> {
  const user = await requireUser();
  const spaceId = String(formData.get("space_id") ?? "");
  const userId = String(formData.get("user_id") ?? "");
  if (!(await canAdminSpace(user, spaceId))) return;

  const service = createServiceClient();
  const { error } = await service
    .from("space_admins")
    .delete()
    .eq("space_id", spaceId)
    .eq("user_id", userId);
  if (!error) {
    await writeAudit({
      actorId: user.id,
      actorEmail: user.email,
      action: "space_admin.remove",
      entityType: "space",
      entityId: spaceId,
      meta: { userId },
    });
  }
  revalidatePath(`/s/${spaceId}`);
}
