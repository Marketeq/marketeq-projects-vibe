#!/usr/bin/env node
/**
 * check:grant-drift -- US-3.4 / AC-3.4.1
 *
 * The default Postgres/Supabase roles (anon, authenticated) and PUBLIC should
 * hold no grants on application tables. They are reachable without any service
 * credential, so a grant to one of them is access nobody has to ask for.
 *
 * Reports only. Exits 0 whether or not drift is found: this runs in CI next to
 * jobs that block, and a non-zero exit here would be read as a broken check
 * rather than a finding. Drift is surfaced by the message, and by the issue the
 * caller opens from it.
 *
 * Usage:  DATABASE_URL=postgres://... npm run check:grant-drift
 */
const { Client } = require('pg');

const DEFAULT_ROLES = ['anon', 'authenticated', 'PUBLIC'];

// System schemas are Postgres' own; PUBLIC holding rights there is normal and
// not something this repository controls.
const SYSTEM_SCHEMAS = ['pg_catalog', 'information_schema', 'pg_toast'];

const QUERY = `
  SELECT grantee, table_schema, table_name,
         string_agg(DISTINCT privilege_type, ', ' ORDER BY privilege_type) AS privileges
    FROM information_schema.role_table_grants
   WHERE grantee = ANY($1)
     AND table_schema <> ALL($2)
     AND table_schema NOT LIKE 'pg\\_%'
   GROUP BY grantee, table_schema, table_name
   ORDER BY table_schema, table_name, grantee
`;

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error('check:grant-drift: DATABASE_URL is not set.');
    console.error('Set it to the database you want to inspect, e.g. supabase-dev.');
    process.exit(1);           // a missing target is a usage error, not a finding
  }

  const client = new Client({ connectionString: url });
  try {
    await client.connect();
  } catch (err) {
    console.error(`check:grant-drift: could not connect -- ${err.message}`);
    process.exit(1);
  }

  let rows;
  try {
    ({ rows } = await client.query(QUERY, [DEFAULT_ROLES, SYSTEM_SCHEMAS]));
  } catch (err) {
    console.error(`check:grant-drift: query failed -- ${err.message}`);
    await client.end();
    process.exit(1);           // could not look is not the same as nothing found
  }
  await client.end();

  if (rows.length === 0) {
    console.log('No default-role grants found on anon/authenticated/PUBLIC. Clean.');
    process.exit(0);
  }

  console.log('Default-role grant drift detected (AC-3.4.1)');
  console.log('');
  for (const r of rows) {
    console.log(`  ${r.table_schema}.${r.table_name}: ${r.grantee} has ${r.privileges}`);
  }
  console.log('');
  console.log(`${rows.length} grant(s) across ${new Set(rows.map(r => `${r.table_schema}.${r.table_name}`)).size} table(s).`);
  console.log('');
  console.log('These roles are reachable without a service credential. Revoke what is');
  console.log('not deliberate, and record what is:');
  console.log('  REVOKE ALL ON <schema>.<table> FROM anon, authenticated, PUBLIC;');
  process.exit(0);             // report only -- see the header
}

main().catch((err) => {
  console.error(`check:grant-drift: unexpected failure -- ${err && err.message}`);
  process.exit(1);
});
