import { createServiceClient } from "@/lib/supabase/service";
import { presignDownload } from "@/lib/r2";
import { avatarEmoji } from "@/lib/avatars";
import { timeAgo } from "@/lib/feed";
import { Button, Card } from "@/components/ui";
import { moderatePost } from "@/app/(app)/post/actions";

/** Pending posts in this space's entire subtree (admin-only server component). */
export async function ModerationQueue({ spaceId }: { spaceId: string }) {
  const service = createServiceClient();

  const { data: subtree } = await service
    .from("spaces")
    .select("id")
    .contains("path", [spaceId]);
  const ids = (subtree ?? []).map((s) => s.id);
  if (ids.length === 0) return null;

  const { data: pending } = await service
    .from("posts")
    .select(
      `id, body_text, created_at, space_id,
       spaces(name),
       children(first_name, age, avatar),
       post_media(id, kind, r2_key)`,
    )
    .in("space_id", ids)
    .eq("status", "pending")
    .is("deleted_at", null)
    .order("created_at");

  if (!pending || pending.length === 0) return null;

  const items = await Promise.all(
    pending.map(async (p) => {
      const child = Array.isArray(p.children) ? p.children[0] : p.children;
      const space = Array.isArray(p.spaces) ? p.spaces[0] : p.spaces;
      const firstImage = p.post_media.find((m) => m.kind === "image");
      return {
        ...p,
        child,
        spaceName: space?.name ?? "",
        thumbUrl: firstImage ? await presignDownload(firstImage.r2_key, 600) : null,
        mediaKinds: p.post_media.map((m) => m.kind),
      };
    }),
  );

  return (
    <Card>
      <p className="mb-3 font-display font-bold text-peacock-deep">
        🕊️ Awaiting approval ({items.length})
      </p>
      <div className="space-y-3">
        {items.map((p) => (
          <div key={p.id} className="flex items-center gap-3 rounded-chubby bg-cream p-3">
            {p.thumbUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={p.thumbUrl}
                alt=""
                className="h-14 w-14 shrink-0 rounded-chubby object-cover"
              />
            ) : (
              <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-chubby bg-mango-soft text-2xl">
                {avatarEmoji(p.child?.avatar)}
              </span>
            )}
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-peacock-deep">
                {p.child?.first_name}, {p.child?.age} · {p.spaceName}
              </p>
              <p className="truncate text-sm text-ink-soft">
                {p.body_text ||
                  p.mediaKinds.map((k) =>
                    k === "image" ? "📷" : k === "video" ? "🎥" : "🪶",
                  ).join(" ")}
              </p>
              <p className="text-xs text-ink-soft">{timeAgo(p.created_at)}</p>
            </div>
            <div className="flex flex-col gap-1">
              <form action={moderatePost}>
                <input type="hidden" name="post_id" value={p.id} />
                <input type="hidden" name="space_id" value={p.space_id} />
                <input type="hidden" name="decision" value="live" />
                <Button type="submit" className="!min-h-9 !px-3 text-sm">
                  ✅ Approve
                </Button>
              </form>
              <form action={moderatePost}>
                <input type="hidden" name="post_id" value={p.id} />
                <input type="hidden" name="space_id" value={p.space_id} />
                <input type="hidden" name="decision" value="rejected" />
                <Button variant="ghost" type="submit" className="!min-h-9 !px-3 text-sm text-danger">
                  Reject
                </Button>
              </form>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
