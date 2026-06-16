#!/usr/bin/env node
// Diagnostic: schema owner/ACL + whether the connecting role is superuser.
//   node scripts/check-messaging-owner.js

const { Client } = require('pg');

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error('DATABASE_URL is not set.');
    process.exit(1);
  }

  const client = new Client({ connectionString: url, ssl: false });
  await client.connect();

  const { rows: [info] } = await client.query(
    'SELECT current_user AS role'
  );
  console.log('Connected as:', info.role);

  const { rows: [role] } = await client.query(
    'SELECT rolsuper, rolcreaterole, rolcreatedb FROM pg_roles WHERE rolname = $1',
    [info.role]
  );
  console.log('Role attributes:', role);

  const { rows: [ns] } = await client.query(
    `SELECT nspname, nspowner::regrole AS owner, nspacl FROM pg_namespace WHERE nspname = 'messaging'`
  );
  console.log('Schema messaging:', ns);

  await client.end();
}

main().catch((err) => {
  console.error('Failed:', err.message);
  process.exit(1);
});
