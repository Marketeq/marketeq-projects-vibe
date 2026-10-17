import { MigrateUpArgs, MigrateDownArgs } from "@payloadcms/db-postgres";

// G1: search-service's PostgreSQL talent fallback pages through cms.talent_profiles in display
// order (ORDER BY created_at DESC NULLS LAST, id ASC, active profiles only) and now filters by
// gate state with a semi-join before LIMIT/OFFSET. Payload's own index on created_at is ascending
// NULLS LAST, which cannot deliver that order, so every page was a full scan + hash of the open
// gate rows + sort (measured on a local 250k-profile table: 92 ms, temp-file spill). With this
// index the page is an ordered index scan that probes the gate table and stops at the LIMIT
// (30 ms, no sort, no temp files). The fallback's page query is the only reader that needs it.
//
// Only an index: no column, no data and no query change. IF NOT EXISTS keeps it a no-op where it
// already exists. Plain CREATE INDEX (not CONCURRENTLY) so a failed build can never leave an
// INVALID index behind that IF NOT EXISTS would then skip; on a table this size it takes well
// under a second.
export async function up({ payload }: MigrateUpArgs): Promise<void> {
  await payload.db.pool.query(`
    CREATE INDEX IF NOT EXISTS "talent_profiles_active_created_at_id_idx"
      ON "cms"."talent_profiles" ("created_at" DESC NULLS LAST, "id" ASC)
      WHERE "status" = 'active'
  `);
}

export async function down({ payload }: MigrateDownArgs): Promise<void> {
  await payload.db.pool.query(`
    DROP INDEX IF EXISTS "cms"."talent_profiles_active_created_at_id_idx"
  `);
}
