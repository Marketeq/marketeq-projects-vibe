#!/usr/bin/env node
// One-off diagnostic for the messaging schema permission issue.
// Run with DATABASE_URL set to the real Render connection string:
//   node scripts/check-messaging-grants.js

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
    'SELECT inet_server_addr() AS addr, inet_server_port() AS port, current_database() AS db, current_user AS role'
  );
  console.log('Connected to:', info);

  const { rows: [priv] } = await client.query(
    `SELECT has_schema_privilege($1, 'messaging', 'USAGE') AS usage,
            has_schema_privilege($1, 'messaging', 'CREATE') AS "create"`,
    [info.role]
  );
  console.log('Privileges on messaging:', priv);

  await client.end();
}

main().catch((err) => {
  console.error('Failed:', err.message);
  process.exit(1);
});
