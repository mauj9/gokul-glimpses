/**
 * Applies every file in supabase/migrations/ (in order) against an in-memory
 * Postgres (PGlite) with a stubbed `auth` schema, so schema errors surface
 * before SQL ever reaches the Supabase dashboard.
 *
 *   node scripts/validate-migrations.mjs
 */
import { PGlite } from "@electric-sql/pglite";
import { pgcrypto } from "@electric-sql/pglite/contrib/pgcrypto";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

const MIGRATIONS_DIR = path.join(import.meta.dirname, "..", "supabase", "migrations");

const AUTH_STUB = `
  create schema if not exists auth;
  create table if not exists auth.users (
    id uuid primary key,
    email text,
    raw_user_meta_data jsonb default '{}'
  );
  -- Session helper used by RLS policies; settable per-connection in tests.
  create or replace function auth.uid() returns uuid
  language sql stable as $$
    select nullif(current_setting('test.uid', true), '')::uuid
  $$;
`;

const db = new PGlite({ extensions: { pgcrypto } });
await db.exec(AUTH_STUB);

const files = (await readdir(MIGRATIONS_DIR)).filter((f) => f.endsWith(".sql")).sort();
if (files.length === 0) {
  console.error("No migrations found");
  process.exit(1);
}

for (const file of files) {
  const sql = await readFile(path.join(MIGRATIONS_DIR, file), "utf8");
  try {
    await db.exec(sql);
    console.log(`✓ ${file}`);
  } catch (err) {
    console.error(`✗ ${file}\n${err.message}`);
    process.exit(1);
  }
}

// Smoke-test core behaviors: tree path maintenance + tag cap + level rules.
try {
  await db.exec(`
    insert into auth.users (id, email) values
      ('00000000-0000-0000-0000-000000000001', 'admin@example.com');
    insert into public.parvas (id, name, slug) values
      ('10000000-0000-0000-0000-000000000001', 'Summer Parva 2026', 'summer-2026');
    insert into public.spaces (id, parva_id, level, name, slug, invite_code) values
      ('20000000-0000-0000-0000-000000000000',
       '10000000-0000-0000-0000-000000000001', 'national', 'HSS USA', 'hss-usa', 'inv-national');
    insert into public.spaces (id, parva_id, parent_space_id, level, name, slug, invite_code) values
      ('20000000-0000-0000-0000-000000000001',
       '10000000-0000-0000-0000-000000000001',
       '20000000-0000-0000-0000-000000000000', 'sambhag', 'West Sambhag', 'west', 'inv-sambhag');
    insert into public.spaces (id, parva_id, parent_space_id, level, name, slug, invite_code) values
      ('20000000-0000-0000-0000-000000000002',
       '10000000-0000-0000-0000-000000000001',
       '20000000-0000-0000-0000-000000000001', 'vibhag', 'Bay Area Vibhag', 'bay-area', 'inv-vibhag');
    insert into public.spaces (id, parva_id, parent_space_id, level, name, slug, invite_code) values
      ('20000000-0000-0000-0000-000000000003',
       '10000000-0000-0000-0000-000000000001',
       '20000000-0000-0000-0000-000000000002', 'shakha', 'Fremont Shakha', 'fremont', 'inv-shakha');
  `);

  const { rows } = await db.query(
    `select array_length(path, 1) as depth from public.spaces
     where id = '20000000-0000-0000-0000-000000000003'`,
  );
  if (rows[0].depth !== 4) throw new Error(`expected shakha path depth 4, got ${rows[0].depth}`);

  // a non-National space at the top must fail
  let rejectedTop = false;
  try {
    await db.exec(`
      insert into public.spaces (parva_id, level, name, slug, invite_code) values
        ('10000000-0000-0000-0000-000000000001', 'sambhag', 'Rogue', 'rogue', 'inv-rogue');
    `);
  } catch {
    rejectedTop = true;
  }
  if (!rejectedTop) throw new Error("top-level non-National space was not rejected");

  // shakha under sambhag must fail (skips the vibhag tier)
  let rejected = false;
  try {
    await db.exec(`
      insert into public.spaces (parva_id, parent_space_id, level, name, slug, invite_code) values
        ('10000000-0000-0000-0000-000000000001',
         '20000000-0000-0000-0000-000000000001', 'shakha', 'Bad', 'bad', 'inv-bad');
    `);
  } catch {
    rejected = true;
  }
  if (!rejected) throw new Error("invalid hierarchy (shakha under sambhag) was not rejected");

  const subtree = await db.query(
    `select count(*)::int as n from public.visible_subtree('20000000-0000-0000-0000-000000000000')`,
  );
  if (subtree.rows[0].n !== 4) throw new Error(`expected subtree of 4, got ${subtree.rows[0].n}`);

  // unlisted sambhag stops bubble-up for itself and everything beneath it
  await db.exec(
    `update public.spaces set visibility = 'unlisted' where id = '20000000-0000-0000-0000-000000000001'`,
  );
  const pruned = await db.query(
    `select count(*)::int as n from public.visible_subtree('20000000-0000-0000-0000-000000000000')`,
  );
  if (pruned.rows[0].n !== 1) throw new Error(`unlisted prune failed: got ${pruned.rows[0].n}`);

  console.log("✓ smoke tests (national tier, level rules, unlisted prune)");
} catch (err) {
  console.error(`✗ smoke tests\n${err.message}`);
  process.exit(1);
}

console.log("All migrations valid.");
