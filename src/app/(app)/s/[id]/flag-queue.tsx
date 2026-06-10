import { createServiceClient } from "@/lib/supabase/service";
import { timeAgo } from "@/lib/feed";
import { Button, Card } from "@/components/ui";
import { resolveFlag } from "@/app/(app)/post/engagement-actions";
import { deletePost } from "@/app/(app)/post/actions";

/** Open flags on posts in this space's subtree (admin-only server component). */
export async function FlagQueue({ spaceId }: { spaceId: string }) {
  const service = createServiceClient();

  const { data: subtree } = await service
    .from("spaces")
    .select("id")
    .contains("path", [spaceId]);
  const ids = (subtree ?? []).map((s) => s.id);
  if (ids.length === 0) return null;

  const { data: flags } = await service
    .from("flags")
    .select(
      `id, reason, created_at, post_id,
       posts!inner(id, body_text, space_id, deleted_at, children(first_name)),
       reporter:profiles!flags_reporter_id_fkey(display_name, email)`,
    )
    .eq("status", "open")
    .in("posts.space_id", ids)
    .order("created_at");

  const open = (flags ?? []).filter((f) => {
    const post = Array.isArray(f.posts) ? f.posts[0] : f.posts;
    return post && !post.deleted_at;
  });
  if (open.length === 0) return null;

  return (
    <Card className="!bg-mango-soft">
      <p className="mb-3 font-display font-bold text-danger">
        🚩 Reported posts ({open.length})
      </p>
      <div className="space-y-3">
        {open.map((f) => {
          const post = Array.isArray(f.posts) ? f.posts[0] : f.posts;
          const child = Array.isArray(post.children)
            ? post.children[0]
            : post.children;
          const reporter = Array.isArray(f.reporter)
            ? f.reporter[0]
            : f.reporter;
          return (
            <div key={f.id} className="rounded-chubby bg-surface p-3">
              <p className="text-sm">
                <strong>{child?.first_name}</strong>:{" "}
                {post.body_text ? `“${post.body_text.slice(0, 80)}”` : "(media post)"}
              </p>
              <p className="mt-1 text-xs text-ink-soft">
                {f.reason ? `“${f.reason}” — ` : ""}
                {reporter?.display_name ?? reporter?.email} ·{" "}
                {timeAgo(f.created_at)}
              </p>
              <div className="mt-2 flex gap-2">
                <form action={resolveFlag}>
                  <input type="hidden" name="flag_id" value={f.id} />
                  <input type="hidden" name="space_id" value={post.space_id} />
                  <Button variant="soft" type="submit" className="!min-h-9 !px-3 text-sm">
                    ✓ Keep post
                  </Button>
                </form>
                <form action={deletePost}>
                  <input type="hidden" name="post_id" value={post.id} />
                  <input type="hidden" name="space_id" value={post.space_id} />
                  <Button variant="danger" type="submit" className="!min-h-9 !px-3 text-sm">
                    🗑️ Remove post
                  </Button>
                </form>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
