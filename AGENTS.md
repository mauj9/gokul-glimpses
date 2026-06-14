<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

Next 16 gotchas already confirmed for this repo: `cookies()`/`headers()`/
`params`/`searchParams` are async; the request gate file is `proxy.ts` (nodejs
runtime), not `middleware.ts`; Turbopack is the default bundler.

# Gokul Glimpses

Private, mobile-first PWA for Balagokulam (HSS) families: kids share holiday
activities (photos, ≤30s video, ≤30s audio "Echoes", text) into Spaces arranged
in the HSS org tree (National → Sambhag → Vibhag → Shakha) under seasonal
"Parvas". Top-level spaces must be National; each tier nests only under the
tier directly above it (enforced by the `set_space_path` trigger).

## Source of truth

- `docs/PRD.md` — original requirements.
- `docs/DECISIONS.md` — confirmed refinements; **overrides the PRD on conflict**.
- `docs/PLAN.md` — architecture, data model, phase plan.
- `docs/DEPLOYMENT.md` — staging (localhost) + prod (Vercel) runbook.

## Stack

Next.js App Router (TS) · Supabase (Postgres + RLS + Google OAuth via
`@supabase/ssr`) · Cloudflare R2 (private bucket, presigned URLs) · Tailwind v4.

## Conventions

- **Privacy first.** Everything sits behind auth (`robots: noindex`, private R2
  bucket, signed media URLs). Never render child data to unauthenticated users.
  A user with zero space memberships must see no community content.
- **Authorization** is enforced twice: RLS in `supabase/migrations/` and
  explicit role checks in server actions. Global admin = email in
  `ADMIN_EMAILS` env ∪ `admin_grants` table (helper in `src/lib/auth/admin.ts`).
- **Audit:** every admin/content mutation writes to `audit_log`.
- **Chubby UI:** ≥16px border radius, ≥44px touch targets, palette tokens from
  `globals.css` only (marigold/peacock/cream/mango/pistachio — no stark white,
  no corporate blue).
- Soft-delete posts (`deleted_at`), never hard-delete except admin purge.
- Custom tags: lowercase, strip non-alphanumerics, ≤20 chars, ≤5 tags/post.
- Migrations are append-only; new SQL file per change in `supabase/migrations/`.

## Commands

- `npm run dev` — localhost staging (needs `.env.local`, see `.env.example`).
- `npm run lint` / `npx tsc --noEmit` / `npm run build` — must all pass before
  a phase is considered done.
