import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Adds time_tracking.time_entries.source: where a time entry came from —
 * 'live' (tracked normally), 'manual', or 'recovered' (the slice before an
 * unclean desktop shutdown that the talent chose to Recover, DTT-US-132).
 * Lets the client audit recovered time. Existing rows default to 'live'.
 *
 * time_entries is one of the desktop-sync tables that are recorded as created
 * but absent on the shared database. time-tracking-service boots with
 * migrationsRun, and `IF NOT EXISTS` only guards the column, so the ALTER
 * would fail there and stop the service from starting. When the table is
 * missing this is a no-op, and it is still recorded as run: whoever creates
 * the desktop-sync tables on that database must add this column too.
 */
export class AddSourceToTimeEntries1791273600000 implements MigrationInterface {
  name = 'AddSourceToTimeEntries1791273600000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    if (!(await this.tableExists(queryRunner, 'time_tracking.time_entries'))) {
      return;
    }
    await queryRunner.query(
      `ALTER TABLE "time_tracking"."time_entries" ADD COLUMN IF NOT EXISTS "source" TEXT NOT NULL DEFAULT 'live'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    if (!(await this.tableExists(queryRunner, 'time_tracking.time_entries'))) {
      return;
    }
    await queryRunner.query(
      `ALTER TABLE "time_tracking"."time_entries" DROP COLUMN IF EXISTS "source"`,
    );
  }

  private async tableExists(
    queryRunner: QueryRunner,
    qualifiedName: string,
  ): Promise<boolean> {
    const [row] = await queryRunner.query(
      `SELECT to_regclass($1) IS NOT NULL AS "exists"`,
      [qualifiedName],
    );
    return row?.exists === true;
  }
}
