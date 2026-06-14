import "server-only";
import { nanoid } from "nanoid";
import { createServiceClient } from "@/lib/supabase/service";
import { writeAudit } from "@/lib/audit";
import { slugify } from "@/lib/slug";

/** Name of the auto-created apex space. Configurable per deployment. */
export const NATIONAL_SPACE_NAME =
  process.env.NATIONAL_SPACE_NAME?.trim() || "HSS USA";

/**
 * Guarantees a single National space exists for a parva and returns its id.
 * Idempotent (and race-safe via the partial unique index in migration 0003),
 * so it can run on parva creation and as a self-heal when an admin opens a
 * parva that predates auto-creation.
 */
export async function ensureNationalSpace(
  parvaId: string,
  creator: { id: string; email?: string | null },
): Promise<string | null> {
  const service = createServiceClient();

  const { data: existing } = await service
    .from("spaces")
    .select("id")
    .eq("parva_id", parvaId)
    .eq("level", "national")
    .maybeSingle();
  if (existing) return existing.id;

  const { data: created, error } = await service
    .from("spaces")
    .insert({
      parva_id: parvaId,
      parent_space_id: null,
      level: "national",
      name: NATIONAL_SPACE_NAME,
      slug: `${slugify(NATIONAL_SPACE_NAME)}-${nanoid(4).toLowerCase()}`,
      visibility: "listed",
      moderation: "instant",
      invite_code: nanoid(12),
      created_by: creator.id,
    })
    .select("id")
    .single();

  // A concurrent caller may have won the unique index — re-fetch and return it.
  if (error) {
    const { data: race } = await service
      .from("spaces")
      .select("id")
      .eq("parva_id", parvaId)
      .eq("level", "national")
      .maybeSingle();
    return race?.id ?? null;
  }

  await service
    .from("space_admins")
    .upsert(
      { space_id: created.id, user_id: creator.id, added_by: creator.id },
      { onConflict: "space_id,user_id" },
    );
  await service
    .from("space_members")
    .upsert(
      { space_id: created.id, user_id: creator.id },
      { onConflict: "space_id,user_id" },
    );

  await writeAudit({
    actorId: creator.id,
    actorEmail: creator.email,
    action: "space.create",
    entityType: "space",
    entityId: created.id,
    meta: { name: NATIONAL_SPACE_NAME, level: "national", parvaId, auto: true },
  });
  return created.id;
}
