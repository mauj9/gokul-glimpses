import "server-only";
import { createServiceClient } from "@/lib/supabase/service";

type AuditEntry = {
  actorId: string | null;
  actorEmail?: string | null;
  action: string; // e.g. "post.delete", "space.create", "admin.grant"
  entityType: string; // e.g. "post" | "space" | "parva" | "admin_grant"
  entityId?: string | null;
  meta?: Record<string, unknown>;
};

/** Append to the activity ledger. Failures are logged, never thrown — an
 *  audit hiccup must not break the user action itself. */
export async function writeAudit(entry: AuditEntry): Promise<void> {
  try {
    const service = createServiceClient();
    const { error } = await service.from("audit_log").insert({
      actor_id: entry.actorId,
      actor_email: entry.actorEmail ?? null,
      action: entry.action,
      entity_type: entry.entityType,
      entity_id: entry.entityId ?? null,
      meta: entry.meta ?? {},
    });
    if (error) console.error("audit_log insert failed:", error.message);
  } catch (e) {
    console.error("audit_log insert failed:", e);
  }
}
