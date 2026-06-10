import type { Metadata } from "next";
import { requireGlobalAdmin } from "@/lib/auth/guards";
import { createServiceClient } from "@/lib/supabase/service";
import { timeAgo } from "@/lib/feed";
import { Card, Chip, PageTitle } from "@/components/ui";

export const metadata: Metadata = { title: "Audit log" };

const ACTION_EMOJI: Record<string, string> = {
  "post.create": "📝",
  "post.delete": "🗑️",
  "post.approve": "✅",
  "post.reject": "🚫",
  "post.flag": "🚩",
  "flag.resolve": "✓",
  "space.create": "🏡",
  "space.update": "⚙️",
  "space.join": "👋",
  "space.invite_regenerate": "♻️",
  "space_admin.add": "🛡️",
  "space_admin.remove": "🛡️",
  "parva.create": "🎉",
  "parva.close": "🔒",
  "parva.reopen": "🔓",
  "parva.delete": "❌",
  "admin.grant": "👑",
  "admin.revoke": "👑",
  "tag.delete": "🏷️",
};

export default async function AuditPage() {
  await requireGlobalAdmin();
  const service = createServiceClient();

  const { data: entries } = await service
    .from("audit_log")
    .select("id, actor_email, action, entity_type, entity_id, meta, created_at")
    .order("created_at", { ascending: false })
    .limit(200);

  return (
    <main className="space-y-4">
      <PageTitle>📋 Activity ledger</PageTitle>
      <p className="text-sm text-ink-soft">
        Every mutation — who, what, when. Latest 200 entries.
      </p>
      <div className="space-y-2">
        {(entries ?? []).map((e) => (
          <Card key={e.id} className="!p-3">
            <div className="flex items-center gap-2">
              <span className="text-xl">{ACTION_EMOJI[e.action] ?? "•"}</span>
              <div className="min-w-0 flex-1">
                <p className="text-sm">
                  <strong>{e.actor_email ?? "system"}</strong>{" "}
                  <Chip className="!py-0 text-xs">{e.action}</Chip>
                </p>
                <p className="truncate text-xs text-ink-soft">
                  {e.entity_type}
                  {e.entity_id ? ` · ${e.entity_id}` : ""}
                  {e.meta && Object.keys(e.meta).length > 0
                    ? ` · ${JSON.stringify(e.meta)}`
                    : ""}
                </p>
              </div>
              <span className="shrink-0 text-xs text-ink-soft">
                {timeAgo(e.created_at)}
              </span>
            </div>
          </Card>
        ))}
        {(entries ?? []).length === 0 && (
          <Card className="text-center text-ink-soft">No activity yet.</Card>
        )}
      </div>
    </main>
  );
}
