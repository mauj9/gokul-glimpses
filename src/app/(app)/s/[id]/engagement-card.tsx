import { createServiceClient } from "@/lib/supabase/service";
import { Card } from "@/components/ui";

/**
 * Anonymous engagement stats for space admins (PRD 4.7): aggregate view
 * counts only — no individual user tracking.
 */
export async function EngagementCard({ spaceId }: { spaceId: string }) {
  const service = createServiceClient();

  const since = new Date();
  since.setDate(since.getDate() - 7);
  const sinceDay = since.toISOString().slice(0, 10);

  const { data: subtree } = await service
    .from("spaces")
    .select("id")
    .contains("path", [spaceId]);
  const ids = (subtree ?? []).map((s) => s.id);

  const [{ data: allViews }, { count: postCount }, { count: memberCount }] =
    await Promise.all([
      service.from("view_events").select("day, view_count").eq("space_id", spaceId),
      service
        .from("posts")
        .select("*", { count: "exact", head: true })
        .in("space_id", ids.length > 0 ? ids : [spaceId])
        .eq("status", "live")
        .is("deleted_at", null),
      service
        .from("space_members")
        .select("*", { count: "exact", head: true })
        .eq("space_id", spaceId),
    ]);

  const total = (allViews ?? []).reduce((sum, v) => sum + v.view_count, 0);
  const week = (allViews ?? [])
    .filter((v) => v.day >= sinceDay)
    .reduce((sum, v) => sum + v.view_count, 0);

  const stat = (value: number | null, label: string, emoji: string) => (
    <div className="flex-1 rounded-chubby bg-cream p-3 text-center">
      <p className="font-display text-xl font-bold text-peacock-deep">
        {value ?? 0}
      </p>
      <p className="text-xs text-ink-soft">
        {emoji} {label}
      </p>
    </div>
  );

  return (
    <Card>
      <p className="mb-3 font-display font-bold text-peacock-deep">
        📈 Engagement
      </p>
      <div className="flex gap-2">
        {stat(week, "views this week", "👀")}
        {stat(total, "views total", "🗓️")}
        {stat(postCount, "glimpses", "📜")}
        {stat(memberCount, "families", "👨‍👩‍👧‍👦")}
      </div>
    </Card>
  );
}
