# Gokul Glimpses — Deployment Runbook

Two environments:

- **Staging = your laptop** (`npm run dev` on localhost) pointed at a *dev*
  Supabase project and *dev* R2 bucket.
- **Production = Vercel** pointed at a *prod* Supabase project and *prod* R2
  bucket.

Keeping staging/prod as two fully separate Supabase projects + buckets means a
test post can never leak into the real community feed.

---

## 1. One-time: Google OAuth client

1. Go to <https://console.cloud.google.com/> → create project `gokul-glimpses`.
2. **APIs & Services → OAuth consent screen**: External, app name *Gokul
   Glimpses*, add your email; scopes: just the default openid/email/profile.
   Publish the app (otherwise only test users can log in).
3. **Credentials → Create credentials → OAuth client ID → Web application**:
   - Authorized JavaScript origins: `http://localhost:3000` and later
     `https://<your-prod-domain>`.
   - Authorized redirect URIs: `https://<dev-project-ref>.supabase.co/auth/v1/callback`
     and later `https://<prod-project-ref>.supabase.co/auth/v1/callback`.
4. Note the **Client ID** and **Client Secret**.

You can reuse one Google client for both Supabase projects (add both redirect
URIs) or create two for cleanliness.

## 2. Per-environment: Supabase project

Do this twice (dev, prod) at <https://supabase.com/dashboard>:

1. **New project** → name `gokul-glimpses-dev` / `gokul-glimpses-prod`, region
   close to you (US West), strong DB password (save it).
2. **Authentication → Providers → Google**: enable, paste Client ID/Secret from
   step 1.
3. **Authentication → URL Configuration**:
   - Site URL: `http://localhost:3000` (dev) / `https://<prod-domain>` (prod).
   - Redirect URLs: add `http://localhost:3000/auth/callback` (dev) /
     `https://<prod-domain>/auth/callback` (prod).
4. Apply the schema: **SQL Editor** → paste the contents of each file in
   `supabase/migrations/` in order → Run. (Or `npx supabase db push` if you link
   the CLI: `npx supabase link --project-ref <ref>`.)
5. Collect from **Settings → API**: `Project URL`, `anon` key, and
   `service_role` key (server-only — never expose to the browser).

## 3. Per-environment: Cloudflare R2 bucket

1. Cloudflare dashboard → **R2** → Create bucket: `gokul-glimpses-dev` /
   `gokul-glimpses-prod`. Leave it **private** (no public access, no custom
   domain) — the app serves media via signed URLs only.
2. **R2 → Manage API Tokens → Create API token**: Object Read & Write, scoped to
   the one bucket. Note Access Key ID + Secret Access Key.
3. Bucket → **Settings → CORS policy**:

   ```json
   [
     {
       "AllowedOrigins": ["http://localhost:3000", "https://<prod-domain>"],
       "AllowedMethods": ["GET", "PUT"],
       "AllowedHeaders": ["*"],
       "MaxAgeSeconds": 3600
     }
   ]
   ```

4. Note your **Account ID** (R2 endpoint is
   `https://<account-id>.r2.cloudflarestorage.com`).

## 4. Staging on localhost

```bash
cd ~/Workspace/gokul-glimpses
cp .env.example .env.local   # then fill in the dev values
npm install
npm run dev                  # http://localhost:3000
```

`.env.local` values (all listed in `.env.example`):

| Variable | Source |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase dev project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase dev anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase dev service_role key |
| `ADMIN_EMAILS` | comma-separated Gmail IDs of hardcoded global admins |
| `NATIONAL_SPACE_NAME` | optional; name of the auto-created apex space (default "HSS USA") |
| `R2_ACCOUNT_ID` / `R2_ACCESS_KEY_ID` / `R2_SECRET_ACCESS_KEY` / `R2_BUCKET` | from step 3 |
| `NEXT_PUBLIC_APP_URL` | `http://localhost:3000` |

Smoke test: log in with an `ADMIN_EMAILS` account → create a Parva → create a
Shakha space → copy its invite link → open in an incognito window with a
*different* Google account → join → add a child → post a photo with an Echo →
react → run Replay.

## 5. Production on Vercel

1. Push the repo to GitHub (private repo recommended):
   `git remote add origin <url> && git push -u origin main`.
2. <https://vercel.com/new> → Import the repo. Framework auto-detects Next.js;
   defaults are fine.
3. **Environment Variables** (Production): same names as the table above but
   with **prod** Supabase/R2 values and `NEXT_PUBLIC_APP_URL=https://<prod-domain>`.
4. Deploy. Then attach your domain (Vercel → Project → Domains) or use the
   `*.vercel.app` domain.
5. Close the loop on auth for the final domain:
   - Google OAuth client → add the prod origin.
   - Supabase prod → Auth → URL Configuration → Site URL + redirect URL.
   - R2 prod bucket CORS → add the prod origin.
6. Smoke test the same flow as staging with a real account.

## 6. Ongoing

- Schema changes ship as new files in `supabase/migrations/`; apply to dev
  first, verify on localhost, then apply to prod and `git push` (Vercel
  auto-deploys `main`).
- Vercel preview deployments work read-only against prod unless you point their
  env vars at the dev Supabase project (recommended if you use them).
- Supabase free tier pauses inactive projects — fine for dev; for prod consider
  the Pro tier before a Parva goes live to the community.
