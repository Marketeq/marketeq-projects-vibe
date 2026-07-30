import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Adds the service-scope phase fields to the publish-stack `phase` table.
 *
 * A listing can be a Project (flat, day-based phases) or a Service (Setup →
 * Recurring → Ongoing phases). These columns describe the service phase model:
 *   - phaseType          'setup' | 'recurring' | 'ongoing' (NULL for project phases)
 *   - recurrenceSchedule 'weekly' | 'monthly' | 'quarterly' (recurring phases only)
 *   - recurrenceCount    1..99 repeats                       (recurring phases only)
 *
 * All columns are nullable, so existing project phases stay valid (phaseType
 * NULL). Idempotent (ADD COLUMN IF NOT EXISTS) and applied to both the search
 * schema and public — the remote keeps a `public.phase` copy alongside
 * `listings.phase`.
 */
export class AddServicePhaseFieldsToPhase1794000000000
  implements MigrationInterface
{
  private static readonly ADD = [
    `ADD COLUMN IF NOT EXISTS "phaseType" character varying(20)`,
    `ADD COLUMN IF NOT EXISTS "recurrenceSchedule" character varying(20)`,
    `ADD COLUMN IF NOT EXISTS "recurrenceCount" integer`,
  ];
  private static readonly DROP = [
    `DROP COLUMN IF EXISTS "phaseType"`,
    `DROP COLUMN IF EXISTS "recurrenceSchedule"`,
    `DROP COLUMN IF EXISTS "recurrenceCount"`,
  ];

  public async up(queryRunner: QueryRunner): Promise<void> {
    for (const table of [`"phase"`, `public."phase"`]) {
      for (const clause of AddServicePhaseFieldsToPhase1794000000000.ADD) {
        await queryRunner.query(
          `DO $$ BEGIN ALTER TABLE ${table} ${clause}; EXCEPTION WHEN undefined_table THEN NULL; END $$`,
        );
      }
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    for (const table of [`"phase"`, `public."phase"`]) {
      for (const clause of AddServicePhaseFieldsToPhase1794000000000.DROP) {
        await queryRunner.query(
          `DO $$ BEGIN ALTER TABLE ${table} ${clause}; EXCEPTION WHEN undefined_table THEN NULL; END $$`,
        );
      }
    }
  }
}
