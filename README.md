# Gokul Glimpses

A private, mobile-first web app for Balagokulam (HSS) families — kids share
holiday glimpses (photos, short videos, audio "Echoes", notes) with their
Shakha, Vibhag, and Sambhag community during seasonal Parvas.

## Docs

- [PRD](docs/PRD.md) — full requirements
- [Decisions](docs/DECISIONS.md) — confirmed refinements (overrides PRD)
- [Plan](docs/PLAN.md) — architecture, data model, phases
- [Deployment](docs/DEPLOYMENT.md) — localhost staging + Vercel prod runbook

## Quick start

```bash
cp .env.example .env.local   # fill in Supabase + R2 + admin emails
npm install
npm run dev                  # http://localhost:3000
```

Stack: Next.js (App Router) · Supabase (Postgres + Google OAuth + RLS) ·
Cloudflare R2 · Tailwind v4.
