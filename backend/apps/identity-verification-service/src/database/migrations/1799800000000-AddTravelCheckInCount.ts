import { MigrationInterface, QueryRunner } from 'typeorm';

// Additive: persistent state for the periodic "Still traveling?" check-in (PMCM-641).
//
// travel_check_in_count is the number of duration answers saved by check-ins in the
// current Travel Mode cycle. 0 means the first check-in has not been answered, so the
// five-minute-after-login check-in can still be offered; 1 or more means it has, and
// later logins no longer start it. It is also what tells the frontend a check-in is a
// repeat. Every existing row starts at 0 (default), so current behaviour is unchanged.
// The check-in days themselves are fixed application configuration, not columns, and
// the answer time is the existing travel_mode_activated_at (an answer restarts the
// schedule from the response time).
export class AddTravelCheckInCount1799800000000 implements MigrationInterface {
  name = 'AddTravelCheckInCount1799800000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "identity_verification"."identity_verification_profiles"
      ADD COLUMN "travel_check_in_count" smallint NOT NULL DEFAULT 0;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "identity_verification"."identity_verification_profiles"
      DROP COLUMN "travel_check_in_count";
    `);
  }
}
