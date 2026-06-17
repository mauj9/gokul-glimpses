# Gokul Glimpses — Decision Log

Confirmed decisions that refine or extend [PRD.md](./PRD.md). When the PRD and this
file disagree, this file wins.

## Access & membership (June 10, 2026)

1. **Global admins** are hardcoded via an env allowlist of Gmail addresses
   (`ADMIN_EMAILS`). Any global admin can grant global-admin rights to another
   logged-in user by Gmail ID (stored in DB, union with env list).
2. **Parvas and Spaces** are created by admins only. Spaces can sit at any of the
   three tiers (Sambhag / Vibhag / Shakha).
3. **Invite links:** every space has an invite link with an embedded random code.
   Any Google-authenticated user who opens it becomes a member of that space —
   no admin approval step. This is also the family↔Shakha binding (no separate
   verification).
4. **Walled garden:** a logged-in user with **zero memberships sees no content** —
   they get a friendly "ask your Shakha for an invite link" page. Once a user has
   joined at least one space, they may browse all **listed** spaces in the org tree.
   *(Default chosen so a random Gmail user can't browse kids' photos; override if
   you want PRD-literal "any Google login can view".)*
5. **Invite codes** don't expire; a space admin can regenerate the code, which
   invalidates the old link.

## Content & spaces

5a. **Four-tier hierarchy (June 14, 2026):** the org tree is **National → Sambhag
    → Vibhag → Shakha**, adding a *National* apex above the PRD's three tiers.
    (The PRD core-concepts section lists 3 tiers but its Replay example already
    references a "National Space pulling from all Sambhags", so National was
    implied.) Top-level spaces must be National; every other tier nests directly
    under the one above it. Enforced in `set_space_path` (migration 0002) and
    mirrored in `src/lib/tree.ts` (`LEVEL_ORDER` / `childLevelOf`).

5b. **National is auto-created (June 14, 2026):** admins never make the apex by
    hand. Creating a Parva auto-provisions its National space (name from
    `NATIONAL_SPACE_NAME`, default "HSS USA"); opening an older Parva self-heals
    one. At most one National per Parva (partial unique index, migration 0003).
    The space form therefore offers no "top level" option — every new space
    nests under an existing one. Logic in `src/lib/spaces.ts::ensureNationalSpace`.

6. **Unlisted spaces:** hidden from navigation **and** their posts do *not* bubble
   up into parent feeds. Reachable only via direct URL (and joinable via invite).
7. **Membership inheritance (default chosen):** joining a Shakha space lets you
   *view* its ancestor Vibhag/Sambhag feeds (they aggregate your Shakha anyway).
   *Posting* is allowed only into spaces you explicitly joined.
8. **Parva lifecycle:** admin-created; on close, all content becomes read-only.
   No auto-deletion; admins may manually delete a Parva. Replay stays available
   on-demand indefinitely.
9. **Reactions:** one reaction per user per post, toggleable / switchable among
   the fixed four (👍 😄 ❤️ 🙏).
10. **Tags:** a post may carry up to 5 tags (predefined + custom mixed). Custom
    tags: lowercased, special characters stripped, max 20 chars.
11. **Flag-for-review:** since comments are disabled, every post has a 🚩 action
    so any member can flag it (privacy concern, wrong child, inappropriate).
    Flags land in the space-admin queue.
12. **Soft deletes:** post deletion is a soft delete (audit trail preserved;
    parent can undo for a while; global admin can purge).
12a. **Space deletion (June 17, 2026):** a space admin has full control over
    their space *and its whole subtree* (settings, invite, moderation, flags,
    posts, tags, add admins, create child spaces). They may **delete descendant
    spaces** within their subtree, but **not** the space they are directly admin
    of (their role-granting space — avoids self-lockout) nor the National apex.
    Global admins may delete any non-National space. Enforced in
    `deleteSpace` (`canAdminSpace` + a direct-`space_admins`-row check) and
    surfaced as a Danger Zone on the space's Manage tab.

## Profiles & media

13. **Child avatars:** illustration picker only — never a real photo.
14. **Media storage:** Cloudflare R2, **private bucket**, client uploads via
    presigned PUT, reads via short-TTL signed GET URLs. Cheaper than Supabase
    Storage at expected video volume and keeps the garden walled.
15. **Caps:** audio + video hard-capped at 30 seconds. Images compressed
    client-side (≈1920px max edge) before upload. Video uploads validated for
    duration/size client-side; no client transcoding.

## Platform & process

16. **Stack:** Next.js (App Router, TypeScript) + Supabase (Postgres, Google
    OAuth, RLS) + Cloudflare R2 + Tailwind. PWA web-first; native app deferred.
17. **Environments:** localhost = staging (against a dev Supabase project + dev
    R2 bucket); production on Vercel. See [DEPLOYMENT.md](./DEPLOYMENT.md).
18. **Process:** build proceeds phase-by-phase **without pausing** for
    confirmation; thorough self-review after each phase.
