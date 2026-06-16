"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth/session";
import { setActiveChildCookie } from "@/lib/active-child";
import { AVATARS, DEFAULT_AVATAR } from "@/lib/avatars";

export type ChildFormState = { error?: string } | null;

function parseChild(formData: FormData) {
  const firstName = String(formData.get("first_name") ?? "").trim();
  const age = Number(formData.get("age"));
  const city = String(formData.get("city") ?? "").trim();
  const state = String(formData.get("state") ?? "").trim();
  let avatar = String(formData.get("avatar") ?? DEFAULT_AVATAR);
  if (!(avatar in AVATARS)) avatar = DEFAULT_AVATAR;

  if (firstName.length < 1 || firstName.length > 40) {
    return { error: "Please give a name (up to 40 letters)." } as const;
  }
  if (!Number.isInteger(age) || age < 1 || age > 120) {
    return { error: "Age must be between 1 and 120." } as const;
  }
  return { value: { first_name: firstName, age, city, state, avatar } } as const;
}

export async function createChild(
  _prev: ChildFormState,
  formData: FormData,
): Promise<ChildFormState> {
  const user = await requireUser();
  const parsed = parseChild(formData);
  if ("error" in parsed) return parsed;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("children")
    .insert({ ...parsed.value, parent_id: user.id })
    .select("id")
    .single();
  if (error) return { error: "Could not save — please try again." };

  // First child becomes the active poster automatically.
  const { count } = await supabase
    .from("children")
    .select("id", { count: "exact", head: true })
    .eq("parent_id", user.id);
  if (count === 1 && data) await setActiveChildCookie(data.id);

  revalidatePath("/family");
  return null;
}

export async function updateChild(
  _prev: ChildFormState,
  formData: FormData,
): Promise<ChildFormState> {
  const user = await requireUser();
  const childId = String(formData.get("child_id") ?? "");
  const parsed = parseChild(formData);
  if ("error" in parsed) return parsed;

  const supabase = await createClient();
  const { error } = await supabase
    .from("children")
    .update(parsed.value)
    .eq("id", childId)
    .eq("parent_id", user.id);
  if (error) return { error: "Could not save — please try again." };

  revalidatePath("/family");
  return null;
}

export async function deleteChild(formData: FormData): Promise<void> {
  const user = await requireUser();
  const childId = String(formData.get("child_id") ?? "");

  const supabase = await createClient();
  await supabase
    .from("children")
    .delete()
    .eq("id", childId)
    .eq("parent_id", user.id);

  revalidatePath("/family");
}

export async function setActiveChild(formData: FormData): Promise<void> {
  const user = await requireUser();
  const childId = String(formData.get("child_id") ?? "");

  // Only allow selecting your own child.
  const supabase = await createClient();
  const { data } = await supabase
    .from("children")
    .select("id")
    .eq("id", childId)
    .eq("parent_id", user.id)
    .maybeSingle();
  if (data) {
    await setActiveChildCookie(childId);
    revalidatePath("/family");
  }
}
