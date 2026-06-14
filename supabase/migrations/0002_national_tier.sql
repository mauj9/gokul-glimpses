-- 0002: add a National tier above Sambhag.
-- Hierarchy is now: National → Sambhag → Vibhag → Shakha.
-- Apply after 0001 (see docs/DEPLOYMENT.md).

alter table public.spaces drop constraint spaces_level_check;
alter table public.spaces
  add constraint spaces_level_check
  check (level in ('national', 'sambhag', 'vibhag', 'shakha'));

-- Re-validate the tree: top-level spaces must be National, and each tier may
-- only nest directly under the tier above it.
create or replace function public.set_space_path()
returns trigger
language plpgsql
as $$
declare
  parent_path uuid[];
  parent_level text;
  parent_parva uuid;
begin
  if new.parent_space_id is null then
    if new.level <> 'national' then
      raise exception 'Top-level spaces must be National';
    end if;
    new.path := array[new.id];
    return new;
  end if;

  select path, level, parva_id
    into parent_path, parent_level, parent_parva
    from public.spaces where id = new.parent_space_id;

  if parent_path is null then
    raise exception 'Parent space % not found', new.parent_space_id;
  end if;
  if parent_parva <> new.parva_id then
    raise exception 'Parent space belongs to a different parva';
  end if;
  if not (
    (parent_level = 'national' and new.level = 'sambhag') or
    (parent_level = 'sambhag'  and new.level = 'vibhag') or
    (parent_level = 'vibhag'   and new.level = 'shakha')
  ) then
    raise exception 'Invalid hierarchy: % cannot be a child of %', new.level, parent_level;
  end if;

  new.path := parent_path || new.id;
  return new;
end;
$$;
