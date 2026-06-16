# Gokul Glimpses — Architecture & Implementation Plan

## Architecture at a glance

```
Browser (PWA, mobile-first)
  │  Next.js App Router (Vercel)
  │   ├─ Server Components / Route Handlers / Server Actions
  │   ├─ @supabase/ssr cookie-based session
  │   └─ R2 presign endpoints (S3 SDK, server-only creds)
  ├─ Supabase ─ Postgres (RLS) + Google OAuth
  └─ Cloudflare R2 ─ private media bucket (signed GET/PUT)
```

- **Auth:** Supabase Google OAuth only. Session lives in HTTP-only cookies via
  `@supabase/ssr`; middleware refreshes tokens and gates all app routes.
- **Authorization layers:**
  1. RLS on every table (membership/role checks in SQL).
  2. Server actions re-check roles for admin mutations and write `audit_log`.
  3. Global admin = email ∈ `ADMIN_EMAILS` env ∪ `admin_grants` table.
- **Media:** client compresses → `POST /api/media/presign` (validates membership,
  size, kind) → browser PUTs to R2 → post row references the R2 key. Feeds get
  short-TTL signed GET URLs minted server-side.

## Data model (Postgres)

| Table | Purpose / key columns |
| --- | --- |
| `profiles` | mirrors `auth.users` (id, email, display_name). Auto-created by trigger on signup. |
| `admin_grants` | gmail addresses granted global-admin by another admin. |
| `children` | parent_id → profiles, first_name, age, city, state, avatar (illustration key). |
| `parvas` | name, slug, starts_on, ends_on, status (`active` / `closed`), timestamps. |
| `spaces` | parva_id, parent_space_id, level (`sambhag`/`vibhag`/`shakha`), name, slug, visibility (`listed`/`unlisted`), moderation (`instant`/`approval`), invite_code, **path** (materialized ancestor ids for cheap bubble-up). |
| `space_admins` | space_id × user_id. Creator of a space is auto-added. |
| `space_members` | space_id × user_id, joined_at, home boolean lives in `profiles.home_space_id`. |
| `posts` | space_id, child_id, author_user_id, body_text, status (`live`/`pending`/`rejected`), deleted_at (soft delete). |
| `post_media` | post_id, kind (`image`/`video`/`audio`), r2_key, mime, duration_s, width, height, position. |
| `tags` / `post_tags` | slug, label, emoji, is_predefined; join table caps 5/post (trigger). |
| `reactions` | post_id × user_id → emoji enum; UNIQUE(post_id, user_id). |
| `flags` | post_id, reporter_id, reason, status (`open`/`resolved`). |
| `audit_log` | actor_id, action, entity_type, entity_id, meta jsonb, created_at. Insert-only. |
| `view_events` | space_id, day, view_count — anonymous aggregate counters. |

**Bubble-up:** `spaces.path` stores the id chain (e.g. `{sambhag,vibhag,shakha}`).
Feed for a space = posts whose space's `path` contains the space id, excluding
spaces with `visibility = 'unlisted'` (other than the space being viewed itself).

## Phases

| # | Phase | Contents |
| --- | --- | --- |
| 0 | Scaffold | Next.js + Tailwind v4, palette tokens, Chubby UI primitives, docs, env plumbing |
| 1 | Schema & auth | Migrations + RLS, Google OAuth flow, admin allowlist |
| 2 | Onboarding | Walled-garden landing, child profiles CRUD, profile switcher |
| 3 | Spaces | Parva/space admin CRUD, tree nav, invite links + join, home-space pinning |
| 4 | Posting & feed | Composer (photo/video/Echo/text), compression, R2 pipeline, feed + moderation queue |
| 5 | Engagement | Reactions, tag system + filtering, flag-for-review |
| 6 | Replay | Scope-aware slideshow, tag-targeted playback, transitions + prefetch |
| 7 | Audit & analytics | Mutation ledger, admin dashboards, view counters |
| 8 | PWA & polish | Manifest/installability, recording animation, final review pass |

Each phase ends with: `lint` + `typecheck` + `build` green, self-review of the
diff, and a commit.

**Status (June 10, 2026): all 8 phases implemented.** Awaiting Supabase + R2
credentials for the end-to-end staging smoke test (see DEPLOYMENT.md §4).

## Known gaps / future work

- **R2 orphan cleanup:** hard-deleting a parva/post removes DB rows but not
  R2 objects. Add a cleanup script or R2 lifecycle rule before heavy use.
- **No post text editing** — authors can delete + repost (PRD "CRUD" is
  otherwise covered). Easy to add later.
- **Feeds paginate** via keyset "Load more" (20/page, newest-first); tag
  filtering runs in SQL and chips come from `space_tags(root)` (migration 0005),
  so filtering searches the whole space, not just the page.
- **TODO (deferred — agreed June 14, 2026): real PWA icons + offline fallback.**
  App icons in `public/icons/` are placeholder flat artwork — replace with real
  branding. And add an offline fallback (service worker + `/offline` route);
  today the app is installable via manifest but has no offline shell.
- **Unlisted spaces are hidden, not secret:** any garden member with API
  knowledge could enumerate space names via PostgREST (their *posts* stay out
  of parent feeds regardless). Matches PRD semantics ("hidden from directory,
  accessible via URL"); tighten `spaces_select` RLS if stricter is wanted.
- **Video duration enforced client-side only** (30s); server enforces size
  caps + a DB check on recorded duration metadata.
- **No notifications** (email/push) — candidate for a later phase.
- **React Native app** deferred; PWA-first per DECISIONS #16.

## Design tokens

| Token | Value | Use |
| --- | --- | --- |
| `--color-marigold` | `#F5A623` family | primary buttons, active states |
| `--color-peacock` | `#0E7490` family | headers, navigation |
| `--color-cream` | `#FFF8E7` | app background |
| `--color-mango` | `#FFD66B` | highlights, banners |
| `--color-pistachio` | `#84B067` | tags, success |

Chubby UI: 16px+ radii everywhere, 44px+ touch targets, bottom nav with center
floating "+" button, no stark white surfaces.
