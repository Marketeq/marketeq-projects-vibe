import { MigrationInterface, QueryRunner } from "typeorm";

export class AddUniqueIndexOneToOneThread1776800000000 implements MigrationInterface {
  name = "AddUniqueIndexOneToOneThread1776800000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Partial unique index to prevent duplicate 1:1 threads between the same
    // two users. LEAST/GREATEST make it order-independent so [A,B] and [B,A]
    // collide on the same key. Applies only when isGroup=false and exactly
    // two participants — group threads and edge cases are unaffected.
    // Qualify with the messaging schema — TypeORM's search_path isn't
    // guaranteed to be set when migrations run.
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
