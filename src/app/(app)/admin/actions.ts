"use server";

import { revalidatePath } from "next/cache";
import { nanoid } from "nanoid";
import { createServiceClient } from "@/lib/supabase/service";
import { requireUser } from "@/lib/auth/session";
import { envAdminEmails } from "@/lib/auth/admin";
import { requireGlobalAdmin, canAdminSpace } from "@/lib/auth/guards";
import { writeAudit } from "@/lib/audit";
import { slugify } from "@/lib/slug";
import { childLevelOf, type SpaceLevel } from "@/lib/tree";
import { ensureNationalSpace } from "@/lib/spaces";

export type FormState = { error?: string } | null;

// ---------------------------------------------------------------- parvas

export async function createParva(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const user = await requireGlobalAdmin();
  const name = String(formData.get("name") ?? "").trim();
  const startsOn = String(formData.get("starts_on") ?? "") || null;
  const endsOn = String(formData.get("ends_on") ?? "") || null;
  if (name.length < 3 || name.length > 60) {
    return { error: "Name must be 3–60 characters." };
  }

  const service = createServiceClient();
  const { data, error } = await service
    .from("parvas")
    .insert({
      name,
      slug: `${slugify(name)}-${nanoid(4).toLowerCase()}`,
      starts_on: startsOn,
      ends_on: endsOn,
      created_by: user.id,
    })
    .select("id")
    .single();
  if (error) return { error: "Could not create parva." };

  // Every parva gets its apex National space automatically.
  await ensureNationalSpace(data.id, user);

  await writeAudit({
    actorId: user.id,
    actorEmail: user.email,
    action: "parva.create",
    entityType: "parva",
    entityId: data.id,
    meta: { name },
  });
  revalidatePath("/admin");
  return null;
}

export async function setParvaStatus(formData: FormData): Promise<void> {
  const user = await requireGlobalAdmin();
  const parvaId = String(formData.get("parva_id") ?? "");
  const status = String(formData.get("status") ?? "");
  if (!["active", "closed"].includes(status)) return;

  const service = createServiceClient();
  const { error } = await service
    .from("parvas")
    .update({ status })
    .eq("id", parvaId);
  if (!error) {
    await writeAudit({
      actorId: user.id,
      actorEmail: user.email,
      action: status === "closed" ? "parva.close" : "parva.reopen",
      entityType: "parva",
      entityId: parvaId,
    });
  }
  revalidatePath("/admin");
}

export async function deleteParva(formData: FormData): Promise<void> {
  const user = await requireGlobalAdmin();
  const parvaId = String(formData.get("parva_id") ?? "");

  const service = createServiceClient();
  const { data: parva } = await service
    .from("parvas")
    .select("name")
    .eq("id", parvaId)
    .maybeSingle();
  const { error } = await service.from("parvas").delete().eq("id", parvaId);
  if (!error) {
    await writeAudit({
      actorId: user.id,
      actorEmail: user.email,
      action: "parva.delete",
      entityType: "parva",
      entityId: parvaId,
      meta: { name: parva?.name },
    });
  }
  revalidatePath("/admin");
}

// ---------------------------------------------------------------- spaces

export async function createSpace(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const user = await requireUser();
  const parvaId = String(formData.get("parva_id") ?? "");
  const parentId = String(formData.get("parent_space_id") ?? "") || null;
  const name = String(formData.get("name") ?? "").trim();
  const visibility =
    String(formData.get("visibility")) === "unlisted" ? "unlisted" : "listed";
  const moderation =
    String(formData.get("moderation")) === "approval" ? "approval" : "instant";

  if (name.length < 3 || name.length > 60) {
    return { error: "Name must be 3–60 characters." };
  }

  // The apex National space is created automatically per parva, so every space
  // made here nests under an existing one. Level is derived from the parent
  // (National → Sambhag → Vibhag → Shakha); the DB trigger re-validates.
  if (!parentId) {
    return { error: "Pick a parent space — the National space is created for you." };
  }

  const service = createServiceClient();
  const { data: parent } = await service
    .from("spaces")
    .select("level, parva_id")
    .eq("id", parentId)
    .maybeSingle();
  if (!parent || parent.parva_id !== parvaId) {
    return { error: "Parent space not found in this parva." };
  }
  const childLevel = childLevelOf(parent.level as SpaceLevel);
  if (!childLevel) return { error: "A shakha cannot have child spaces." };
  const level: SpaceLevel = childLevel;

  // Global admins create anywhere; space admins only under their own spaces.
  if (!(await canAdminSpace(user, parentId))) {
    return { error: "You are not allowed to create spaces here." };
  }

  const { data, error } = await service
    .from("spaces")
    .insert({
      parva_id: parvaId,
      parent_space_id: parentId,
      level,
      name,
      slug: `${slugify(name)}-${nanoid(4).toLowerCase()}`,
      visibility,
      moderation,
      invite_code: nanoid(12),
      created_by: user.id,
    })
    .select("id")
    .single();
  if (error) return { error: "Could not create space." };

  // Creator becomes space admin + member (PRD role matrix).
  await service
    .from("space_admins")
    .insert({ space_id: data.id, user_id: user.id, added_by: user.id });
  await service
    .from("space_members")
    .insert({ space_id: data.id, user_id: user.id });

  await writeAudit({
    actorId: user.id,
    actorEmail: user.email,
    action: "space.create",
    entityType: "space",
    entityId: data.id,
    meta: { name, level, parvaId, visibility, moderation },
  });
  revalidatePath("/admin");
  revalidatePath("/spaces");
  return null;
}

// ---------------------------------------------------------------- admin grants

export async function grantGlobalAdmin(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const user = await requireGlobalAdmin();
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return { error: "Please enter a valid email address." };
  }

  const service = createServiceClient();
  const { error } = await service
    .from("admin_grants")
    .upsert({ email, granted_by: user.id, source: "grant" }, { onConflict: "email" });
  if (error) return { error: "Could not grant admin." };

  await writeAudit({
    actorId: user.id,
    actorEmail: user.email,
    action: "admin.grant",
    entityType: "admin_grant",
    entityId: email,
  });
  revalidatePath("/admin");
  return null;
}

export async function revokeGlobalAdmin(formData: FormData): Promise<void> {
  const user = await requireGlobalAdmin();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();

  // Env-allowlisted admins cannot be revoked from the UI.
  if (envAdminEmails().includes(email)) return;

  const service = createServiceClient();
  const { error } = await service.from("admin_grants").delete().eq("email", email);
  if (!error) {
    await writeAudit({
      actorId: user.id,
      actorEmail: user.email,
      action: "admin.revoke",
      entityType: "admin_grant",
      entityId: email,
    });
  }
  revalidatePath("/admin");
}
