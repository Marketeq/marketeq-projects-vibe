import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Adds `job` to the browsing-history item-type enum.
 *
 * The service was always meant to carry it: CLIENT_BY_TYPE's own doc comment
 * in browsing-history.service.ts already documents the routing as
 * "PROJECT/SERVICE/JOB -> listing-service", matching favorites-service's
 * target-validation, but the enum shipped with only four values. PMCM-348
 * mandates a Recent Jobs tab, PMCM-351 is a story about Job cards, the Figma
 * draws one, and the frontend already renders the tab — so the enum was the
 * only thing missing.
 *
 * Unqualified, matching CreateBrowsingHistory1788100000000: the runtime
 * connection resolves its schema as `DATABASE_SCHEMA || 'public'`, so an
 * unqualified statement targets the connection's own schema rather than
 * wherever the CLI's data-source happens to point.
 *
 * `ADD VALUE IF NOT EXISTS` is re-runnable. It needs PostgreSQL 12+ to run
 * inside a transaction, which every environment here satisfies; the new value
 * is deliberately not used in this migration, which that version also
 * requires.
 */
export class AddJobItemType1794000727405 implements MigrationInterface {
  name = 'AddJobItemType1794000727405';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TYPE "browsing_history_itemtype_enum" ADD VALUE IF NOT EXISTS 'job'`,
    );
  }

  public async down(_queryRunner: QueryRunner): Promise<void> {
    // PostgreSQL cannot safely remove an enum value in place — same reasoning
    // as checkout-service's AddKlarnaPaymentMethod. Leaving `job` available is
    // backward-compatible if this application change is reverted.
  }
}
