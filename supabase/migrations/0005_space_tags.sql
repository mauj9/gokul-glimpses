-- 0005: distinct tags actually used across a space's visible subtree, for the
-- feed's filter chips. Computed in SQL (DISTINCT) so it stays cheap no matter
-- how many glimpses a space has.

create function public.space_tags(root uuid)
returns table (id uuid, slug text, label text, emoji text)
language sql stable security definer set search_path = public
as $$
  select distinct t.id, t.slug, t.label, t.emoji
  from public.posts p
  join public.post_tags pt on pt.post_id = p.id
  join public.tags t on t.id = pt.tag_id
  where p.space_id in (select public.visible_subtree(root))
    and p.status = 'live'
    and p.deleted_at is null
  order by t.label;
$$;
