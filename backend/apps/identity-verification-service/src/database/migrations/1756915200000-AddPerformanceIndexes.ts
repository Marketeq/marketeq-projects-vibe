import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPerformanceIndexes1756915200000 implements MigrationInterface {
  name = 'AddPerformanceIndexes1756915200000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Doc 11 Step 2b — startVerificationSession's ceiling-check count()
    // against pending_verification_sessions currently has no index to
    // use on (profile_id, document_id) and falls back to a sequential
    // scan on every call.
    await queryRunner.query(`
      CREATE INDEX "idx_pending_verification_sessions_profile_document"
      ON identity_verification.pending_verification_sessions ("profile_id", "document_id");
    `);

    // Doc 11 Step 2c — TravelModeReminderJob.runDailySweep()'s WHERE
    // clause filters identity_verification_profiles on
    // (travel_mode_active, next_travel_reminder_at) together; neither
    // column is indexed today.
    await queryRunner.query(`
      CREATE INDEX "idx_ivp_travel_mode_reminder"
      ON identity_verification.identity_verification_profiles ("travel_mode_active", "next_travel_reminder_at");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX identity_verification.idx_ivp_travel_mode_reminder;`);
    await queryRunner.query(
      `DROP INDEX identity_verification.idx_pending_verification_sessions_profile_document;`,
    );
  }
}
