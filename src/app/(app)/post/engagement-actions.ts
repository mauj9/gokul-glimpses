"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { requireUser } from "@/lib/auth/session";
import { canAdminSpace } from "@/lib/auth/guards";
import { isGlobalAdmin } from "@/lib/auth/admin";
import { writeAudit } from "@/lib/audit";

const REACTION_EMOJI: Record<string, string> = {
  thumbs_up: "👍",
  smile: "😄",
  heart: "❤️",
  namaste: "🙏",
};

/** One reaction per user per post; tapping the same one removes it. */
export async function setReaction(
  postId: string,
  emoji: "thumbs_up" | "smile" | "heart" | "namaste" | null,
): Promise<{ ok: boolean }> {
  const user = await requireUser();
  const supabase = await createClient();

  if (emoji === null) {
    const { error } = await supabase
      .from("reactions")
      .delete()
      .eq("post_id", postId)
      .eq("user_id", user.id);
    return { ok: !error };
  }
  if (!(emoji in REACTION_EMOJI)) return { ok: false };

  const { error } = await supabase
    .from("reactions")
    .upsert(
      { post_id: postId, user_id: user.id, emoji },
      { onConflict: "post_id,user_id" },
    );
  return { ok: !error };
}

export async function flagPost(
  postId: string,
  reason: string,
): Promise<{ ok: boolean }> {
  const user = await requireUser();
  const supabase = await createClient();

  const { error } = await supabase.from("flags").insert({
    post_id: postId,
    reporter_id: user.id,
    reason: reason.trim().slice(0, 500),
  });
  if (!error) {
    await writeAudit({
      actorId: user.id,
      actorEmail: user.email,
      action: "post.flag",
      entityType: "post",
      entityId: postId,
    });
  }
  return { ok: !error };
}

export async function resolveFlag(formData: FormData): Promise<void> {
  const user = await requireUser();
  const flagId = String(formData.get("flag_id") ?? "");
  const spaceId = String(formData.get("space_id") ?? "");
  if (!(await canAdminSpace(user, spaceId))) return;

  const supabase = await createClient();
  // RLS flags_update lets subtree admins resolve.
  const { error } = await supabase
    .from("flags")
    .update({
      status: "resolved",
      resolved_by: user.id,
      resolved_at: new Date().toISOString(),
    })
    .eq("id", flagId);
  if (!error) {
    await writeAudit({
      actorId: user.id,
      actorEmail: user.email,
      action: "flag.resolve",
      entityType: "flag",
      entityId: flagId,
      meta: { spaceId },
    });
  }
  revalidatePath(`/s/${spaceId}`);
}

/** PRD 4.5: space admins may delete inappropriate custom tags. */
export async function deleteCustomTag(formData: FormData): Promise<void> {
  const user = await requireUser();
  const tagId = String(formData.get("tag_id") ?? "");
  const spaceId = String(formData.get("space_id") ?? "");

  const allowed = spaceId
    ? await canAdminSpace(user, spaceId)
    : await isGlobalAdmin(user.email);
  if (!allowed) return;

  const service = createServiceClient();
  const { data: tag } = await service
    .from("tags")
    .select("slug, is_predefined")
    .eq("id", tagId)
    .maybeSingle();
  if (!tag || tag.is_predefined) return;

  const { error } = await service.from("tags").delete().eq("id", tagId);
  if (!error) {
    await writeAudit({
      actorId: user.id,
      actorEmail: user.email,
      action: "tag.delete",
      entityType: "tag",
      entityId: tagId,
      meta: { slug: tag.slug },
    });
  }
  if (spaceId) revalidatePath(`/s/${spaceId}`);
  revalidatePath("/admin");
}
