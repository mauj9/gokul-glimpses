-- 0003: at most one National space per parva. The apex is auto-created when a
-- parva is made (and self-healed for older parvas), so this guards against
-- duplicates even under concurrent inserts.

create unique index if not exists spaces_one_national_per_parva
  on public.spaces (parva_id)
  where level = 'national';
