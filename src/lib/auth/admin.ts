import "server-only";
import { createServiceClient } from "@/lib/supabase/service";

export function envAdminEmails(): string[] {
  return (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

/** Global admin = ADMIN_EMAILS env allowlist ∪ admin_grants table. */
export async function isGlobalAdmin(email: string | undefined): Promise<boolean> {
  if (!email) return false;
  const normalized = email.toLowerCase();
  if (envAdminEmails().includes(normalized)) return true;

  const service = createServiceClient();
  const { data } = await service
    .from("admin_grants")
    .select("email")
    .eq("email", normalized)
    .maybeSingle();
  return Boolean(data);
}

/**
 * Env-allowlisted admins are mirrored into admin_grants on login so that
 * SQL RLS policies (is_global_admin) see them too.
 */
export async function bootstrapEnvAdmin(email: string | undefined): Promise<void> {
  if (!email) return;
  const normalized = email.toLowerCase();
  if (!envAdminEmails().includes(normalized)) return;

  const service = createServiceClient();
  await service
    .from("admin_grants")
    .upsert({ email: normalized, source: "env" }, { onConflict: "email" });
}
