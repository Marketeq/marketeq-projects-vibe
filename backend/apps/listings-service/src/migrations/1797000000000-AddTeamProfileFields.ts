import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * The team list row renders a location line, a years-of-experience line, a rate
 * range and a previous-clients logo strip. None of these had columns, so those
 * parts of the card could never populate.
 *
 * The table is qualified explicitly: an unqualified ALTER TABLE lands in
 * `public` regardless of the connection's search_path, and teams lives there.
 */
export class AddTeamProfileFields1797000000000 implements MigrationInterface {
  name = 'AddTeamProfileFields1797000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "public"."teams" ADD COLUMN IF NOT EXISTS "location" character varying`,
    );
    await queryRunner.query(
      `ALTER TABLE "public"."teams" ADD COLUMN IF NOT EXISTS "yearsExperience" integer`,
    );
    await queryRunner.query(
      `ALTER TABLE "public"."teams" ADD COLUMN IF NOT EXISTS "rateMin" integer`,
    );
    await queryRunner.query(
      `ALTER TABLE "public"."teams" ADD COLUMN IF NOT EXISTS "rateMax" integer`,
    );
    await queryRunner.query(
      `ALTER TABLE "public"."teams" ADD COLUMN IF NOT EXISTS "previousClientLogos" text[] NOT NULL DEFAULT '{}'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "public"."teams" DROP COLUMN IF EXISTS "previousClientLogos"`,
    );
    await queryRunner.query(
      `ALTER TABLE "public"."teams" DROP COLUMN IF EXISTS "rateMax"`,
    );
    await queryRunner.query(
      `ALTER TABLE "public"."teams" DROP COLUMN IF EXISTS "rateMin"`,
    );
    await queryRunner.query(
      `ALTER TABLE "public"."teams" DROP COLUMN IF EXISTS "yearsExperience"`,
    );
    await queryRunner.query(
      `ALTER TABLE "public"."teams" DROP COLUMN IF EXISTS "location"`,
    );
  }
}
