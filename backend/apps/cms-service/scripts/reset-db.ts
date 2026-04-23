/**
 * DANGER: Drops the Payload CMS schema (default: `cms`) and recreates it empty.
 *
 * This does NOT touch other schemas/tables (e.g. listings-service `public.projects`).
 *
 * Usage:
 *   npm run reset:db
 *
 * Optional env overrides:
 *   CMS_DB_SCHEMA=cms
 */
import "dotenv/config";
import { Client } from "pg";

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is required");
  }

  const schema = (process.env.CMS_DB_SCHEMA || "cms").trim() || "cms";

  const client = new Client({ connectionString });
  await client.connect();

  // Drop + recreate schema to fully reset Payload tables.
  await client.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE;`);
  await client.query(`CREATE SCHEMA "${schema}";`);

  await client.end();
  console.log(`✔ Reset complete: dropped + recreated schema "${schema}"`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

