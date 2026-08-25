import { MigrationInterface, QueryRunner } from "typeorm";

export class AddProjectIdToThreads1793500000000 implements MigrationInterface {
  name = "AddProjectIdToThreads1793500000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    // The threads table lives in the "messaging" schema, and on first boot it
    // may not exist yet (synchronize creates tables after migrations run).
    const [tableCheck] = await queryRunner.query(`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'messaging' AND table_name = 'threads'
      ) AS table_exists
    `);
    const tableExists =
      tableCheck?.table_exists === true ||
      tableCheck?.table_exists === "true" ||
      tableCheck?.table_exists === "t";
    if (!tableExists) {
      // Table will be created by synchronize; column/index added on next restart.
      return;
    }

    await queryRunner.query(
      `ALTER TABLE IF EXISTS "messaging"."threads" ADD COLUMN IF NOT EXISTS "projectId" uuid`
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_threads_projectId" ON "messaging"."threads" ("projectId")`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "messaging"."IDX_threads_projectId"`
    );
    await queryRunner.query(
      `ALTER TABLE IF EXISTS "messaging"."threads" DROP COLUMN IF EXISTS "projectId"`
    );
  }
}
