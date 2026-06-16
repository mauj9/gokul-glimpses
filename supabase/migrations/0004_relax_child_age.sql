-- 0004: family members can be any age (was capped at 18). Keep a generous
-- sanity ceiling to guard against typos.

alter table public.children drop constraint children_age_check;
alter table public.children
  add constraint children_age_check check (age between 1 and 120);
