import { createServiceClient } from "@/lib/supabase/service";
import { Button, Card } from "@/components/ui";
import { deleteCustomTag } from "@/app/(app)/post/engagement-actions";

/** Custom tags used in this subtree — admins can delete inappropriate ones. */
export async function CustomTagsPanel({ spaceId }: { spaceId: string }) {
  const service = createServiceClient();

  const { data: subtree } = await service
    .from("spaces")
    .select("id")
    .contains("path", [spaceId]);
  const ids = (subtree ?? []).map((s) => s.id);
  if (ids.length === 0) return null;

  const { data: rows } = await service
    .from("post_tags")
    .select("tags!inner(id, slug, label, is_predefined), posts!inner(space_id)")
    .in("posts.space_id", ids)
    .eq("tags.is_predefined", false);

  const tags = new Map<string, { id: string; label: string }>();
  for (const r of rows ?? []) {
    const t = Array.isArray(r.tags) ? r.tags[0] : r.tags;
    if (t) tags.set(t.id, { id: t.id, label: t.label });
  }
  if (tags.size === 0) return null;

  return (
    <Card>
      <p className="mb-2 font-display font-bold text-peacock-deep">
        🏷️ Custom tags in use
      </p>
      <p className="mb-3 text-xs text-ink-soft">
        Deleting a tag removes it from every post that uses it.
      </p>
      <div className="flex flex-wrap gap-2">
        {[...tags.values()].map((t) => (
          <form
            key={t.id}
            action={deleteCustomTag}
            className="flex items-center gap-1 rounded-chubby bg-pistachio-soft px-2 py-1"
          >
            <span className="text-sm font-semibold">{t.label}</span>
            <input type="hidden" name="tag_id" value={t.id} />
            <input type="hidden" name="space_id" value={spaceId} />
            <Button
              variant="ghost"
              type="submit"
              aria-label={`Delete tag ${t.label}`}
              className="!min-h-6 !px-1 text-xs text-danger"
            >
              ✕
            </Button>
          </form>
        ))}
      </div>
    </Card>
  );
}
