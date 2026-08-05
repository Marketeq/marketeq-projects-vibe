import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * `teamSize` for projects is derived, never stored by hand.
 *
 * The project detail page already shows "Minimum N team members", where N is
 * the count of distinct `roleName` values across `scope[].tasks[]` — see
 * `minTeamMembers` in the frontend project-details page. That count is the
 * number users actually see, so search must filter on the same value or the
 * results contradict the page.
 *
 * Nothing in listings-service writes a team size: the CMS sync path
 * (`project-sync.service.ts` → `toRow`) never sets one. A plain column would
 * therefore stay NULL for every project created after this migration, and any
 * `team_size_range` filter would silently drop them. A STORED generated column
 * stays correct as `scope` changes and needs no backfill.
 *
 * The helper is a pure function of its argument (no table access, no
 * environment reads), so IMMUTABLE is accurate and Postgres accepts it inside
 * a generation expression — subqueries are not allowed there directly.
 */
export class AddProjectTeamSizeDerived1796000000000 implements MigrationInterface {
  name = 'AddProjectTeamSizeDerived1796000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION "listings"."project_team_size"(scope jsonb)
      RETURNS integer
      LANGUAGE sql
      IMMUTABLE
      PARALLEL SAFE
      AS $$
        SELECT NULLIF(COUNT(DISTINCT trim(t->>'roleName')), 0)::int
        FROM jsonb_array_elements(
               CASE WHEN jsonb_typeof(scope) = 'array' THEN scope ELSE '[]'::jsonb END
             ) AS p,
             jsonb_array_elements(
               CASE WHEN jsonb_typeof(p->'tasks') = 'array' THEN p->'tasks' ELSE '[]'::jsonb END
             ) AS t
        WHERE nullif(trim(t->>'roleName'), '') IS NOT NULL
      $$;
    `);

    // Drop first so this is idempotent against an earlier local run that
    // created a plain integer column.
    await queryRunner.query(`ALTER TABLE "listings"."project" DROP COLUMN IF EXISTS "teamSize"`);
    await queryRunner.query(`
      ALTER TABLE "listings"."project"
      ADD COLUMN "teamSize" integer
      GENERATED ALWAYS AS ("listings"."project_team_size"("scope")) STORED
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "listings"."project" DROP COLUMN IF EXISTS "teamSize"`);
    await queryRunner.query(`DROP FUNCTION IF EXISTS "listings"."project_team_size"(jsonb)`);
  }
}
