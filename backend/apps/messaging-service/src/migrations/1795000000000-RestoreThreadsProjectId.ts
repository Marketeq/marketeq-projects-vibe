import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Repair migration.
 *
 * `threads."projectId"` was added by 1793500000000-AddProjectIdToThreads and has
 * since been dropped from the production database by an external process. Every
 * inbox request depends on it: ThreadsService.getUserThreads() references
 * t."projectId" unconditionally — the `IS NULL` branch runs even when no
 * projectId is supplied — so while the column is absent the thread list 500s.
 *
 * 1793500000000 cannot restore it. TypeORM records applied migrations in the
 * `migrations` table and skips anything already recorded, so its up() will never
 * execute again regardless of its contents. Restoring the column on deploy
 * therefore requires a new migration id, which is all this file is.
 *
 * Unlike the earlier migrations in this directory, this one deliberately has no
 * `if (!tableExists) return;` guard. That pattern is what made the failure
 * unrecoverable: TypeORM still marks an early-returning migration as applied, so
 * it silently no-ops forever. Every statement below is independently idempotent
 * (`IF EXISTS` / `IF NOT EXISTS`), which is safe whether or not the table is
 * present and needs no guard.
 *
 * This restores schema, not data — the previous column values are gone. That is
 * harmless here: `projectId` is nullable and NULL is the correct value for a
 * non-project thread, which is what the inbox lists.
 *
 * NOTE: this is a repair, not a defence. If the process that dropped the column
 * is still connected it will drop it again within seconds of this running. The
 * write access has to be revoked first; see docs/IssueDoc/messaging-inbox-repair.sql.
 */
export class RestoreThreadsProjectId1795000000000 implements MigrationInterface {
  name = "RestoreThreadsProjectId1795000000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE IF EXISTS "messaging"."threads" ADD COLUMN IF NOT EXISTS "projectId" uuid`
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_threads_projectId" ON "messaging"."threads" ("projectId")`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Intentionally not dropping the column. This migration only ever restores a
    // column that 1793500000000 already owns; dropping it here on revert would
    // re-break the inbox and duplicate that migration's own down().
  }
}
