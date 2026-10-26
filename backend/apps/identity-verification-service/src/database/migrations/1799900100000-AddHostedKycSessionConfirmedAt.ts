import { MigrationInterface, QueryRunner } from 'typeorm';

// Additive, nullable. hosted_kyc_sessions.confirmed_at records the home-country
// confirmation time an ordinary session was started under (a copy of the
// profile's verified_home_country_confirmed_at at creation). An unfinished
// session is resumed only while it still equals the profile's current
// confirmation, so a later confirmation supersedes it deterministically, with no
// clock comparison between the app and the database. Existing rows stay null and
// are judged by the 15-minute age alone (the previous rule, minus the bypass).
export class AddHostedKycSessionConfirmedAt1799900100000 implements MigrationInterface {
  name = 'AddHostedKycSessionConfirmedAt1799900100000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "identity_verification"."hosted_kyc_sessions"
      ADD COLUMN "confirmed_at" timestamptz;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "identity_verification"."hosted_kyc_sessions" DROP COLUMN "confirmed_at";
    `);
  }
}
