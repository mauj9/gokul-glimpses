-- Gokul Glimpses — core schema
-- Apply via Supabase SQL editor or `supabase db push` (see docs/DEPLOYMENT.md).

-- ============================================================ extensions
create extension if not exists pgcrypto;

-- ============================================================ profiles
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null unique,
  display_name text,
  home_space_id uuid, -- fk added after spaces exists
  created_at timestamptz not null default now()
);

-- Auto-create a profile row on signup.
create function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, display_name)
  values (
    new.id,
    lower(new.email),
    coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1))
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================ admin grants
-- Global admins = ADMIN_EMAILS env allowlist (bootstrapped into this table on
-- first login) ∪ rows granted by other admins. Keyed by email so admins can be
-- granted before their first login.
create table public.admin_grants (
  email text primary key,
  granted_by uuid references public.profiles (id) on delete set null,
  source text not null default 'grant' check (source in ('env', 'grant')),
  created_at timestamptz not null default now()
);

-- ============================================================ children
create table public.children (
  id uuid primary key default gen_random_uuid(),
  parent_id uuid not null references public.profiles (id) on delete cascade,
  first_name text not null check (char_length(first_name) between 1 and 40),
  age int not null check (age between 1 and 18),
  city text not null default '',
  state text not null default '',
  avatar text not null default 'peacock', -- illustration key, never a photo
  created_at timestamptz not null default now()
);
create index children_parent_idx on public.children (parent_id);

-- ============================================================ parvas
create table public.parvas (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  starts_on date,
  ends_on date,
  status text not null default 'active' check (status in ('active', 'closed')),
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

-- ============================================================ spaces
create table public.spaces (
  id uuid primary key default gen_random_uuid(),
  parva_id uuid not null references public.parvas (id) on delete cascade,
  parent_space_id uuid references public.spaces (id) on delete cascade,
  level text not null check (level in ('sambhag', 'vibhag', 'shakha')),
  name text not null,
  slug text not null,
  description text not null default '',
  visibility text not null default 'listed' check (visibility in ('listed', 'unlisted')),
  moderation text not null default 'instant' check (moderation in ('instant', 'approval')),
  invite_code text not null unique,
  path uuid[] not null default '{}', -- ancestor chain incl. self; trigger-maintained
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  unique (parva_id, slug)
);
create index spaces_parva_idx on public.spaces (parva_id);
create index spaces_parent_idx on public.spaces (parent_space_id);
create index spaces_path_idx on public.spaces using gin (path);

alter table public.profiles
  add constraint profiles_home_space_fk
  foreign key (home_space_id) references public.spaces (id) on delete set null;

-- Maintain spaces.path and validate the tree shape.
create function public.set_space_path()
returns trigger
language plpgsql
as $$
declare
  parent_path uuid[];
  parent_level text;
  parent_parva uuid;
begin
  if new.parent_space_id is null then
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
    (parent_level = 'sambhag' and new.level = 'vibhag') or
    (parent_level = 'vibhag' and new.level = 'shakha')
  ) then
    raise exception 'Invalid hierarchy: % cannot be a child of %', new.level, parent_level;
  end if;

  new.path := parent_path || new.id;
  return new;
end;
$$;

create trigger spaces_set_path
  before insert on public.spaces
  for each row execute function public.set_space_path();

-- ============================================================ space roles
create table public.space_admins (
  space_id uuid not null references public.spaces (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  added_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  primary key (space_id, user_id)
);
create index space_admins_user_idx on public.space_admins (user_id);

create table public.space_members (
  space_id uuid not null references public.spaces (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (space_id, user_id)
);
create index space_members_user_idx on public.space_members (user_id);

-- ============================================================ posts
create table public.posts (
  id uuid primary key default gen_random_uuid(),
  space_id uuid not null references public.spaces (id) on delete cascade,
  child_id uuid not null references public.children (id) on delete cascade,
  author_user_id uuid not null references public.profiles (id) on delete cascade,
  body_text text not null default '' check (char_length(body_text) <= 2000),
  status text not null default 'live' check (status in ('live', 'pending', 'rejected')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  deleted_by uuid references public.profiles (id) on delete set null
);
create index posts_space_created_idx on public.posts (space_id, created_at desc);
create index posts_author_idx on public.posts (author_user_id);
create index posts_status_idx on public.posts (status) where status = 'pending';

create function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger posts_touch_updated
  before update on public.posts
  for each row execute function public.touch_updated_at();

create table public.post_media (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts (id) on delete cascade,
  kind text not null check (kind in ('image', 'video', 'audio')),
  r2_key text not null,
  mime text not null default '',
  duration_s numeric check (duration_s is null or duration_s <= 31),
  width int,
  height int,
  position int not null default 0
);
create index post_media_post_idx on public.post_media (post_id);

-- ============================================================ tags
create table public.tags (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]{1,20}$'),
  label text not null,
  emoji text not null default '',
  is_predefined boolean not null default false,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.post_tags (
  post_id uuid not null references public.posts (id) on delete cascade,
  tag_id uuid not null references public.tags (id) on delete cascade,
  primary key (post_id, tag_id)
);
create index post_tags_tag_idx on public.post_tags (tag_id);

create function public.enforce_tag_cap()
returns trigger language plpgsql as $$
begin
  if (select count(*) from public.post_tags where post_id = new.post_id) >= 5 then
    raise exception 'A post can have at most 5 tags';
  end if;
  return new;
end;
$$;

create trigger post_tags_cap
  before insert on public.post_tags
  for each row execute function public.enforce_tag_cap();

insert into public.tags (slug, label, emoji, is_predefined) values
  ('mandirdarshan', '#MandirDarshan', '🛕', true),
  ('yummybhojan',   '#YummyBhojan',   '😋', true),
  ('safaryatra',    '#SafarYatra',    '🎒', true),
  ('prakriti',      '#Prakriti',      '🌳', true),
  ('gokulkala',     '#GokulKala',     '🎨', true),
  ('khelmela',      '#KhelMela',      '🤸', true);

-- ============================================================ reactions
create table public.reactions (
  post_id uuid not null references public.posts (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  emoji text not null check (emoji in ('thumbs_up', 'smile', 'heart', 'namaste')),
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

-- ============================================================ flags
create table public.flags (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts (id) on delete cascade,
  reporter_id uuid not null references public.profiles (id) on delete cascade,
  reason text not null default '' check (char_length(reason) <= 500),
  status text not null default 'open' check (status in ('open', 'resolved')),
  created_at timestamptz not null default now(),
  resolved_by uuid references public.profiles (id) on delete set null,
  resolved_at timestamptz
);
create index flags_open_idx on public.flags (post_id) where status = 'open';

-- ============================================================ audit log
create table public.audit_log (
  id bigint generated always as identity primary key,
  actor_id uuid,
  actor_email text,
  action text not null,
  entity_type text not null,
  entity_id text,
  meta jsonb not null default '{}',
  created_at timestamptz not null default now()
);
create index audit_log_created_idx on public.audit_log (created_at desc);

-- ============================================================ view events
-- Anonymous aggregate: one counter per space per day. No user ids stored.
create table public.view_events (
  space_id uuid not null references public.spaces (id) on delete cascade,
  day date not null default current_date,
  view_count bigint not null default 0,
  primary key (space_id, day)
);

create function public.record_space_view(p_space_id uuid)
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  if auth.uid() is null then
    return;
  end if;
  insert into public.view_events (space_id, day, view_count)
  values (p_space_id, current_date, 1)
  on conflict (space_id, day)
  do update set view_count = public.view_events.view_count + 1;
end;
$$;

-- ============================================================ helper predicates
-- security definer so policies can consult tables without recursive RLS.

create function public.is_global_admin(uid uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1
    from public.admin_grants ag
    join public.profiles p on p.id = uid
    where lower(ag.email) = lower(p.email)
  );
$$;

-- Member of at least one space anywhere → may browse the walled garden.
create function public.has_garden_access(uid uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (select 1 from public.space_members where user_id = uid)
      or public.is_global_admin(uid);
$$;

-- Admin of the space itself or of any ancestor space.
create function public.is_space_admin_of(p_space_id uuid, uid uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1
    from public.spaces s
    join public.space_admins sa on sa.space_id = any (s.path)
    where s.id = p_space_id and sa.user_id = uid
  ) or public.is_global_admin(uid);
$$;

create function public.is_member_of(p_space_id uuid, uid uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.space_members
    where space_id = p_space_id and user_id = uid
  );
$$;

-- Space accepts new content only while its parva is active.
create function public.space_is_writable(p_space_id uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1
    from public.spaces s
    join public.parvas p on p.id = s.parva_id
    where s.id = p_space_id and p.status = 'active'
  );
$$;

create function public.space_moderation(p_space_id uuid)
returns text
language sql stable security definer set search_path = public
as $$
  select moderation from public.spaces where id = p_space_id;
$$;

-- Subtree for feeds/replay: the root itself plus descendants reachable through
-- LISTED nodes only (an unlisted space stops the bubble-up for itself and
-- everything beneath it).
create function public.visible_subtree(root uuid)
returns setof uuid
language sql stable security definer set search_path = public
as $$
  with recursive sub as (
    select id from public.spaces where id = root
    union all
    select s.id
    from public.spaces s
    join sub on s.parent_space_id = sub.id
    where s.visibility = 'listed'
  )
  select id from sub;
$$;

-- ============================================================ RLS
alter table public.profiles enable row level security;
alter table public.admin_grants enable row level security;
alter table public.children enable row level security;
alter table public.parvas enable row level security;
alter table public.spaces enable row level security;
alter table public.space_admins enable row level security;
alter table public.space_members enable row level security;
alter table public.posts enable row level security;
alter table public.post_media enable row level security;
alter table public.tags enable row level security;
alter table public.post_tags enable row level security;
alter table public.reactions enable row level security;
alter table public.flags enable row level security;
alter table public.audit_log enable row level security;
alter table public.view_events enable row level security;

-- profiles: read own always; read others once inside the garden; update own.
create policy profiles_select on public.profiles for select
  using (id = auth.uid() or public.has_garden_access(auth.uid()));
create policy profiles_update on public.profiles for update
  using (id = auth.uid())
  with check (id = auth.uid());

-- admin_grants: visible to global admins only; mutations via service role.
create policy admin_grants_select on public.admin_grants for select
  using (public.is_global_admin(auth.uid()));

-- children: parents own their child profiles; garden members may read
-- (needed to render name/age/shakha on posts and in replay).
create policy children_select on public.children for select
  using (parent_id = auth.uid() or public.has_garden_access(auth.uid()));
create policy children_insert on public.children for insert
  with check (parent_id = auth.uid());
create policy children_update on public.children for update
  using (parent_id = auth.uid())
  with check (parent_id = auth.uid());
create policy children_delete on public.children for delete
  using (parent_id = auth.uid() or public.is_global_admin(auth.uid()));

-- parvas / spaces: readable inside the garden; mutations via service role only.
create policy parvas_select on public.parvas for select
  using (public.has_garden_access(auth.uid()));
create policy spaces_select on public.spaces for select
  using (public.has_garden_access(auth.uid()));

-- space roles: readable inside the garden (to show member counts / admin
-- badges); mutations via service role (invite-code validation is server-side).
create policy space_admins_select on public.space_admins for select
  using (public.has_garden_access(auth.uid()));
create policy space_members_select on public.space_members for select
  using (user_id = auth.uid() or public.has_garden_access(auth.uid()));

-- posts: live posts readable in the garden; authors see their own pending /
-- rejected; space admins see everything in their subtree.
create policy posts_select on public.posts for select
  using (
    (status = 'live' and deleted_at is null and public.has_garden_access(auth.uid()))
    or author_user_id = auth.uid()
    or public.is_space_admin_of(space_id, auth.uid())
  );

-- insert: must be a member of the space, own the child profile, parva active.
-- status must match the space's moderation setting (admins may always go live).
create policy posts_insert on public.posts for insert
  with check (
    author_user_id = auth.uid()
    and public.is_member_of(space_id, auth.uid())
    and exists (
      select 1 from public.children c
      where c.id = child_id and c.parent_id = auth.uid()
    )
    and public.space_is_writable(space_id)
    and (
      (status = 'live' and (public.space_moderation(space_id) = 'instant'
                            or public.is_space_admin_of(space_id, auth.uid())))
      or (status = 'pending' and public.space_moderation(space_id) = 'approval')
    )
  );

-- update: author edits own post while parva active (cannot change status);
-- space admins moderate (approve/reject/soft-delete) within their subtree.
create policy posts_update_author on public.posts for update
  using (author_user_id = auth.uid() and public.space_is_writable(space_id))
  with check (author_user_id = auth.uid());
create policy posts_update_admin on public.posts for update
  using (public.is_space_admin_of(space_id, auth.uid()));

-- hard delete: global admin only (normal flow is soft delete via update).
create policy posts_delete on public.posts for delete
  using (public.is_global_admin(auth.uid()));

-- post_media: follows its post.
create policy post_media_select on public.post_media for select
  using (
    exists (
      select 1 from public.posts p
      where p.id = post_id
        and (
          (p.status = 'live' and p.deleted_at is null and public.has_garden_access(auth.uid()))
          or p.author_user_id = auth.uid()
          or public.is_space_admin_of(p.space_id, auth.uid())
        )
    )
  );
create policy post_media_insert on public.post_media for insert
  with check (
    exists (
      select 1 from public.posts p
      where p.id = post_id and p.author_user_id = auth.uid()
    )
  );
create policy post_media_delete on public.post_media for delete
  using (
    exists (
      select 1 from public.posts p
      where p.id = post_id
        and (p.author_user_id = auth.uid()
             or public.is_space_admin_of(p.space_id, auth.uid()))
    )
  );

-- tags: readable in the garden; members may create custom (non-predefined)
-- tags; deletion of inappropriate tags via admins (service role).
create policy tags_select on public.tags for select
  using (public.has_garden_access(auth.uid()));
create policy tags_insert on public.tags for insert
  with check (
    public.has_garden_access(auth.uid())
    and is_predefined = false
    and created_by = auth.uid()
  );

-- post_tags: author manages tags on own posts; readable in the garden.
create policy post_tags_select on public.post_tags for select
  using (public.has_garden_access(auth.uid()));
create policy post_tags_insert on public.post_tags for insert
  with check (
    exists (
      select 1 from public.posts p
      where p.id = post_id and p.author_user_id = auth.uid()
    )
  );
create policy post_tags_delete on public.post_tags for delete
  using (
    exists (
      select 1 from public.posts p
      where p.id = post_id
        and (p.author_user_id = auth.uid()
             or public.is_space_admin_of(p.space_id, auth.uid()))
    )
  );

-- reactions: one per user per post (PK enforces); only on live posts in
-- writable (active-parva) spaces; readable in the garden.
create policy reactions_select on public.reactions for select
  using (public.has_garden_access(auth.uid()));
create policy reactions_insert on public.reactions for insert
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.posts p
      where p.id = post_id and p.status = 'live' and p.deleted_at is null
        and public.space_is_writable(p.space_id)
    )
    and public.has_garden_access(auth.uid())
  );
create policy reactions_update on public.reactions for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
create policy reactions_delete on public.reactions for delete
  using (user_id = auth.uid());

-- flags: any garden member may flag; reporters see their own flags; space
-- admins see and resolve flags in their subtree.
create policy flags_select on public.flags for select
  using (
    reporter_id = auth.uid()
    or exists (
      select 1 from public.posts p
      where p.id = post_id and public.is_space_admin_of(p.space_id, auth.uid())
    )
  );
create policy flags_insert on public.flags for insert
  with check (reporter_id = auth.uid() and public.has_garden_access(auth.uid()));
create policy flags_update on public.flags for update
  using (
    exists (
      select 1 from public.posts p
      where p.id = post_id and public.is_space_admin_of(p.space_id, auth.uid())
    )
  );

-- audit_log / view_events: no client policies — service role only.

-- ============================================================ guard triggers
-- RLS can't compare OLD vs NEW; these triggers close the gaps. They only
-- constrain authenticated end-users (auth.uid() is null for the service role,
-- whose callers do their own authorization checks).

-- profiles.email feeds is_global_admin(); a user must never rewrite it.
create function public.guard_profile_update()
returns trigger language plpgsql as $$
begin
  if auth.uid() is not null and new.email is distinct from old.email then
    raise exception 'email cannot be changed';
  end if;
  return new;
end;
$$;

create trigger profiles_guard_update
  before update on public.profiles
  for each row execute function public.guard_profile_update();

-- Authors must not flip moderation status or reattribute a post; only space
-- admins may change status, and an admin-deleted post stays deleted.
create function public.guard_post_update()
returns trigger language plpgsql as $$
begin
  if auth.uid() is null then
    return new; -- service role: server code already authorized + audited
  end if;

  if new.space_id is distinct from old.space_id
     or new.child_id is distinct from old.child_id
     or new.author_user_id is distinct from old.author_user_id
     or new.created_at is distinct from old.created_at then
    raise exception 'immutable post fields';
  end if;

  if new.status is distinct from old.status
     and not public.is_space_admin_of(old.space_id, auth.uid()) then
    raise exception 'only space admins can change post status';
  end if;

  -- A post soft-deleted by someone other than the author (i.e. a moderator)
  -- cannot be restored by the author.
  if old.deleted_at is not null
     and new.deleted_at is null
     and old.deleted_by is distinct from auth.uid()
     and not public.is_space_admin_of(old.space_id, auth.uid()) then
    raise exception 'only space admins can restore this post';
  end if;

  return new;
end;
$$;

create trigger posts_guard_update
  before update on public.posts
  for each row execute function public.guard_post_update();
