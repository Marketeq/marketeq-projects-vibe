import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * ConsolidateListingsTables1790000000000 dropped listings.teams_v2 as an orphaned
 * table while the Team entity was still mapped to it, so every teams query failed
 * with `relation "listings.teams_v2" does not exist`.
 *
 * The entity is repointed at the surviving listings.teams table. This migration
 * adds the nine columns the entity declares that listings.teams did not have.
 *
 * up() is additive only. down() removes just those nine columns and never runs
 * automatically — migrationsRun only executes up(); down() requires a manual
 * `typeorm migration:revert`.
 */
export class AlignTeamsTableWithEntity1791000000000
  implements MigrationInterface
{
  name = 'AlignTeamsTableWithEntity1791000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE listings.teams ADD COLUMN IF NOT EXISTS "logo" character varying`,
    );
    await queryRunner.query(
      `ALTER TABLE listings.teams ADD COLUMN IF NOT EXISTS "specializations" text[] NOT NULL DEFAULT '{}'`,
    );
    await queryRunner.query(
      `ALTER TABLE listings.teams ADD COLUMN IF NOT EXISTS "completedProjects" integer NOT NULL DEFAULT 0`,
    );
    await queryRunner.query(
      `ALTER TABLE listings.teams ADD COLUMN IF NOT EXISTS "rating" numeric(3,1) NOT NULL DEFAULT 0`,
    );
    await queryRunner.query(
      `ALTER TABLE listings.teams ADD COLUMN IF NOT EXISTS "reviewCount" integer NOT NULL DEFAULT 0`,
    );
    await queryRunner.query(
      `ALTER TABLE listings.teams ADD COLUMN IF NOT EXISTS "completionsCount" integer NOT NULL DEFAULT 0`,
    );
    await queryRunner.query(
      `ALTER TABLE listings.teams ADD COLUMN IF NOT EXISTS "views90d" integer NOT NULL DEFAULT 0`,
    );
    await queryRunner.query(
      `ALTER TABLE listings.teams ADD COLUMN IF NOT EXISTS "adminBoost" numeric NOT NULL DEFAULT 0`,
    );
    await queryRunner.query(
      `ALTER TABLE listings.teams ADD COLUMN IF NOT EXISTS "featured" boolean NOT NULL DEFAULT false`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE listings.teams DROP COLUMN IF EXISTS "featured"`,
    );
    await queryRunner.query(
      `ALTER TABLE listings.teams DROP COLUMN IF EXISTS "adminBoost"`,
    );
    await queryRunner.query(
      `ALTER TABLE listings.teams DROP COLUMN IF EXISTS "views90d"`,
    );
    await queryRunner.query(
      `ALTER TABLE listings.teams DROP COLUMN IF EXISTS "completionsCount"`,
    );
    await queryRunner.query(
      `ALTER TABLE listings.teams DROP COLUMN IF EXISTS "reviewCount"`,
    );
    await queryRunner.query(
      `ALTER TABLE listings.teams DROP COLUMN IF EXISTS "rating"`,
    );
    await queryRunner.query(
      `ALTER TABLE listings.teams DROP COLUMN IF EXISTS "completedProjects"`,
    );
    await queryRunner.query(
      `ALTER TABLE listings.teams DROP COLUMN IF EXISTS "specializations"`,
    );
    await queryRunner.query(
      `ALTER TABLE listings.teams DROP COLUMN IF EXISTS "logo"`,
    );
  }
}
