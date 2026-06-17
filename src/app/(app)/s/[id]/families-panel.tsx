import { createServiceClient } from "@/lib/supabase/service";
import { avatarEmoji } from "@/lib/avatars";
import { Card, Chip } from "@/components/ui";
import { timeAgo } from "@/lib/feed";

type Child = { id: string; first_name: string; age: number; avatar: string };

/**
 * Members (families) of this space, with their children. Shown to members and
 * admins; `showEmail` (admins only) reveals the parent's email for contact.
 */
export async function FamiliesPanel({
  spaceId,
  showEmail = false,
}: {
  spaceId: string;
  showEmail?: boolean;
}) {
  const service = createServiceClient();
  const { data } = await service
    .from("space_members")
    .select(
      "user_id, joined_at, profiles(display_name, email, children(id, first_name, age, avatar))",
    )
    .eq("space_id", spaceId)
    .order("joined_at");

  const families = (data ?? []).map((m) => {
    const p = Array.isArray(m.profiles) ? m.profiles[0] : m.profiles;
    const children = (p?.children ?? []) as Child[];
    return {
      userId: m.user_id,
      joinedAt: m.joined_at as string,
      name: p?.display_name ?? p?.email ?? "Member",
      email: p?.email ?? "",
      children,
    };
  });

  return (
    <Card>
      <p className="mb-3 font-display font-bold text-peacock-deep">
        👨‍👩‍👧‍👦 Families ({families.length})
      </p>
      {families.length === 0 ? (
        <p className="text-sm text-ink-soft">No families have joined yet.</p>
      ) : (
        <ul className="space-y-3">
          {families.map((f) => (
            <li key={f.userId} className="border-b border-mango-soft pb-3 last:border-0 last:pb-0">
              <div className="flex items-baseline justify-between gap-2">
                <p className="font-semibold text-ink">{f.name}</p>
                <span className="shrink-0 text-xs text-ink-soft">
                  joined {timeAgo(f.joinedAt)}
                </span>
              </div>
              {showEmail && f.email && f.email !== f.name && (
                <p className="truncate text-xs text-ink-soft">{f.email}</p>
              )}
              {f.children.length > 0 && (
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {f.children.map((c) => (
                    <Chip key={c.id} className="!py-0.5 text-xs">
                      {avatarEmoji(c.avatar)} {c.first_name}, {c.age}
                    </Chip>
                  ))}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
