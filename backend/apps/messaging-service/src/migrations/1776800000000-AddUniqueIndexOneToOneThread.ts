import { MigrationInterface, QueryRunner } from "typeorm";

export class AddUniqueIndexOneToOneThread1776800000000 implements MigrationInterface {
  name = "AddUniqueIndexOneToOneThread1776800000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Check if the threads table exists yet (it may not on first boot when
    // synchronize creates tables AFTER migrations run).
    const [tableCheck] = await queryRunner.query(`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'messaging' AND table_name = 'threads'
      ) AS table_exists
    `);
    const tableExists =
      tableCheck?.table_exists === true ||
      tableCheck?.table_exists === 'true' ||
      tableCheck?.table_exists === 't';
    if (!tableExists) {
      // Table will be created by synchronize; index will be added on next restart.
      return;
    }

    // Avoid blocking boot on environments that already contain duplicate 1:1
    // threads. The application layer already reuses an existing thread, so we
    // only add the unique index when the data is clean enough to accept it.
    const [result] = await queryRunner.query(`
      SELECT EXISTS (
        SELECT 1
        FROM "messaging"."threads"
        WHERE "isGroup" = false
          AND array_length("participantIds", 1) = 2
        GROUP BY
          LEAST("participantIds"[1], "participantIds"[2]),
          GREATEST("participantIds"[1], "participantIds"[2])
        HAVING COUNT(*) > 1
      ) AS has_duplicates
    `);
    const hasDuplicates =
      result?.has_duplicates === true ||
      result?.has_duplicates === 'true' ||
      result?.has_duplicates === 't';
    if (hasDuplicates) {
      return;
    }

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "UQ_threads_one_to_one_participants"
      ON "messaging"."threads" (
        LEAST("participantIds"[1], "participantIds"[2]),
        GREATEST("participantIds"[1], "participantIds"[2])
      )
      WHERE "isGroup" = false AND array_length("participantIds", 1) = 2
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "messaging"."UQ_threads_one_to_one_participants"`
    );
  }
}
