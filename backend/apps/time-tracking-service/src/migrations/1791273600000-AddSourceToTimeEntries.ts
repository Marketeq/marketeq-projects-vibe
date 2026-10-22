import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Adds time_tracking.time_entries.source: where a time entry came from —
 * 'live' (tracked normally), 'manual', or 'recovered' (the slice before an
 * unclean desktop shutdown that the talent chose to Recover, DTT-US-132).
 * Lets the client audit recovered time. Existing rows default to 'live'.
 */
export class AddSourceToTimeEntries1791273600000 implements MigrationInterface {
  name = 'AddSourceToTimeEntries1791273600000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "time_tracking"."time_entries" ADD COLUMN IF NOT EXISTS "source" TEXT NOT NULL DEFAULT 'live'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "time_tracking"."time_entries" DROP COLUMN IF EXISTS "source"`,
    );
  }
}
