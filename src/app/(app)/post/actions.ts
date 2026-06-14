"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth/session";
import { canAdminSpace } from "@/lib/auth/guards";
import { writeAudit } from "@/lib/audit";
import { normalizeTag } from "@/lib/slug";

export type PostPayload = {
  spaceId: string;
  childId: string;
  bodyText: string;
  media: {
    kind: "image" | "video" | "audio";
    key: string;
    mime: string;
    durationS?: number;
    width?: number;
    height?: number;
  }[];
  tagSlugs: string[]; // predefined slugs + raw custom entries
};

export type CreatePostResult =
  | { error?: string; pending?: boolean; ok?: boolean }
  | null;

export async function createPost(
  payload: PostPayload,
): Promise<CreatePostResult> {
  const user = await requireUser();
  const supabase = await createClient();

  const bodyText = payload.bodyText.trim().slice(0, 2000);
  if (!bodyText && payload.media.length === 0) {
    return { error: "Add a photo, video, audio, or a few words first!" };
  }
  if (payload.media.length > 5) {
    return { error: "Too many attachments." };
  }

  // Space moderation decides initial status (RLS re-validates).
  const { data: space } = await supabase
    .from("spaces")
    .select("id, moderation, parvas(status)")
    .eq("id", payload.spaceId)
    .maybeSingle();
  if (!space) return { error: "Space not found." };
  const parva = Array.isArray(space.parvas) ? space.parvas[0] : space.parvas;
  if (parva?.status !== "active") {
    return { error: "This parva is closed — posting is over for the season." };
  }
  const isAdmin = await canAdminSpace(user, payload.spaceId);
  const status =
    space.moderation === "instant" || isAdmin ? "live" : "pending";

  const { data: post, error } = await supabase
    .from("posts")
    .insert({
      space_id: payload.spaceId,
      child_id: payload.childId,
      author_user_id: user.id,
      body_text: bodyText,
      status,
    })
    .select("id")
    .single();
  if (error || !post) {
    return { error: "Could not share — are you a member of this space?" };
  }

  if (payload.media.length > 0) {
    const { error: mediaError } = await supabase.from("post_media").insert(
      payload.media.map((m, i) => ({
        post_id: post.id,
        kind: m.kind,
        r2_key: m.key,
        mime: m.mime,
        duration_s: m.durationS ?? null,
        width: m.width ?? null,
        height: m.height ?? null,
        position: i,
      })),
    );
    if (mediaError) {
      await supabase.from("posts").delete().eq("id", post.id);
      return { error: "Could not attach media — please try again." };
    }
  }

  // Tags: ≤5, predefined or custom (normalized; find-or-create).
  const slugs = [...new Set(payload.tagSlugs.map(normalizeTag).filter(Boolean))].slice(0, 5);
  if (slugs.length > 0) {
    const { data: existing } = await supabase
      .from("tags")
      .select("id, slug")
      .in("slug", slugs);
    let known = new Map((existing ?? []).map((t) => [t.slug, t.id]));
    const missing = slugs.filter((s) => !known.has(s));
    if (missing.length > 0) {
      // ON CONFLICT DO NOTHING so a concurrent post creating the same slug
      // can't abort the whole batch.
      await supabase.from("tags").upsert(
        missing.map((slug) => ({
          slug,
          label: `#${slug}`,
          is_predefined: false,
          created_by: user.id,
        })),
        { onConflict: "slug", ignoreDuplicates: true },
      );
      const { data: refreshed } = await supabase
        .from("tags")
        .select("id, slug")
        .in("slug", slugs);
      known = new Map((refreshed ?? []).map((t) => [t.slug, t.id]));
    }
    const tagIds = slugs.map((s) => known.get(s)).filter(Boolean) as string[];
    if (tagIds.length > 0) {
      await supabase
        .from("post_tags")
        .insert(tagIds.map((tagId) => ({ post_id: post.id, tag_id: tagId })));
    }
  }

  await writeAudit({
    actorId: user.id,
    actorEmail: user.email,
    action: "post.create",
    entityType: "post",
    entityId: post.id,
    meta: { spaceId: payload.spaceId, status, mediaCount: payload.media.length },
  });

  revalidatePath(`/s/${payload.spaceId}`);
  if (status === "pending") return { pending: true };
  return { ok: true };
}

export async function deletePost(formData: FormData): Promise<void> {
  const user = await requireUser();
  const postId = String(formData.get("post_id") ?? "");
  const spaceId = String(formData.get("space_id") ?? "");

  const supabase = await createClient();
  // RLS + guard trigger scope this to the author or a space admin.
  const { error } = await supabase
    .from("posts")
    .update({ deleted_at: new Date().toISOString(), deleted_by: user.id })
    .eq("id", postId);
  if (!error) {
    await writeAudit({
      actorId: user.id,
      actorEmail: user.email,
      action: "post.delete",
      entityType: "post",
      entityId: postId,
      meta: { spaceId },
    });
  }
  revalidatePath(`/s/${spaceId}`);
}

export async function moderatePost(formData: FormData): Promise<void> {
  const user = await requireUser();
  const postId = String(formData.get("post_id") ?? "");
  const spaceId = String(formData.get("space_id") ?? "");
  const decision = String(formData.get("decision") ?? "");
  if (!["live", "rejected"].includes(decision)) return;
  if (!(await canAdminSpace(user, spaceId))) return;

  const supabase = await createClient();
  // Authed client: RLS posts_update_admin + guard trigger allow this.
  const { error } = await supabase
    .from("posts")
    .update({ status: decision })
    .eq("id", postId);
  if (!error) {
    await writeAudit({
      actorId: user.id,
      actorEmail: user.email,
      action: decision === "live" ? "post.approve" : "post.reject",
      entityType: "post",
      entityId: postId,
      meta: { spaceId },
    });
  }
  revalidatePath(`/s/${spaceId}`);
}
