import { MigrateUpArgs, MigrateDownArgs } from "@payloadcms/db-postgres";

// TalentProfiles gained `location` and `avatarUrl`, and search-service's DB
// fallback selects them. cms-service does not run on every deployment, so
// Payload's schema sync cannot be relied on to create the columns. IF NOT
// EXISTS keeps this a no-op where they already exist (e.g. the shared DB).
export async function up({ payload }: MigrateUpArgs): Promise<void> {
  await payload.db.pool.query(`
    ALTER TABLE "cms"."talent_profiles"
      ADD COLUMN IF NOT EXISTS "location" varchar,
      ADD COLUMN IF NOT EXISTS "avatar_url" varchar
  `);
}

export async function down({ payload }: MigrateDownArgs): Promise<void> {
  await payload.db.pool.query(`
    ALTER TABLE "cms"."talent_profiles"
      DROP COLUMN IF EXISTS "location",
      DROP COLUMN IF EXISTS "avatar_url"
  `);
}
