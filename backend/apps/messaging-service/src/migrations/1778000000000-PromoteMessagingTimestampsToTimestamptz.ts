import { MigrationInterface, QueryRunner } from 'typeorm';

// Promote the two columns that get compared against tz-aware values from
// `timestamp without time zone` (TypeORM's Postgres default) to `timestamptz`.
// Existing values are interpreted as UTC, matching how Node writes them.
//
// Why these two specifically:
//   - `messages.createdAt` is compared against `thread_user_state.lastReadAt`
//     (timestamptz) in the inbox unread-count query and against a JS Date
//     cursor in the message-history pagination.
//   - `thread_user_state.updatedAt` is compared against a JS Date cutoff in
//     the trash-cleanup cron.
// On non-UTC Postgres sessions, the implicit cast between naive timestamp
// and timestamptz shifts the comparison by the session offset.

const COLUMNS: Array<{ table: string; column: string }> = [
  { table: 'messages', column: 'createdAt' },
  { table: 'thread_user_state', column: 'updatedAt' },
];

export class PromoteMessagingTimestampsToTimestamptz1778000000000
  implements MigrationInterface
{
  name = 'PromoteMessagingTimestampsToTimestamptz1778000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    for (const { table, column } of COLUMNS) {
      await queryRunner.query(
        `ALTER TABLE IF EXISTS "${table}" ALTER COLUMN "${column}" TYPE timestamptz USING "${column}" AT TIME ZONE 'UTC'`,
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    for (const { table, column } of COLUMNS) {
      await queryRunner.query(
        `ALTER TABLE IF EXISTS "${table}" ALTER COLUMN "${column}" TYPE timestamp USING ("${column}" AT TIME ZONE 'UTC')`,
      );
    }
  }
}
