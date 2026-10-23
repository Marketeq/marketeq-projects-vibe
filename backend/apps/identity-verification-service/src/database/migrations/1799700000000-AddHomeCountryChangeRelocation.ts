import { MigrationInterface, QueryRunner } from 'typeorm';

// Additive: supports re-verifying a home-country change (PMCM-650).
//
// 1. hosted_kyc_sessions.purpose — why a session exists. Every existing row,
//    and every ordinary session from here on, is 'identity_verification' (the
//    default), so current behaviour is unchanged. 'home_country_change' marks
//    the session an already verified account starts to move its home country.
// 2. hosted_kyc_sessions.pending_home_country — the country that session was
//    started for (null for ordinary sessions).
// 3. identity_verification_profiles — the pending relocation: the claimed
//    country, when the user confirmed it, and the single session allowed to
//    promote it. All nullable; verified_home_country is untouched until an
//    approval. Attempts and the cooldown reuse the ordinary identity fields.
export class AddHomeCountryChangeRelocation1799700000000 implements MigrationInterface {
  name = 'AddHomeCountryChangeRelocation1799700000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE "identity_verification"."hosted_kyc_session_purpose_enum" AS ENUM (
        'identity_verification', 'home_country_change'
      );
    `);
    await queryRunner.query(`
      ALTER TABLE "identity_verification"."hosted_kyc_sessions"
      ADD COLUMN "purpose" "identity_verification"."hosted_kyc_session_purpose_enum"
        NOT NULL DEFAULT 'identity_verification',
      ADD COLUMN "pending_home_country" char(2);
    `);
    await queryRunner.query(`
      ALTER TABLE "identity_verification"."identity_verification_profiles"
      ADD COLUMN "pending_home_country" char(2),
      ADD COLUMN "pending_home_country_confirmed_at" timestamptz,
      ADD COLUMN "pending_relocation_session_id" uuid;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "identity_verification"."identity_verification_profiles"
      DROP COLUMN "pending_relocation_session_id",
      DROP COLUMN "pending_home_country_confirmed_at",
      DROP COLUMN "pending_home_country";
    `);
    await queryRunner.query(`
      ALTER TABLE "identity_verification"."hosted_kyc_sessions"
      DROP COLUMN "pending_home_country",
      DROP COLUMN "purpose";
    `);
    await queryRunner.query(`DROP TYPE "identity_verification"."hosted_kyc_session_purpose_enum";`);
  }
}
