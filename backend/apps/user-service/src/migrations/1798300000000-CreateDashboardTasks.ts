import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Personal to-do list tasks shown on the talent dashboard.
 * Previously stored in localStorage — migrated to DB for cross-device persistence.
 */
export class CreateDashboardTasks1798300000000 implements MigrationInterface {
  name = 'CreateDashboardTasks1798300000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS user_service.dashboard_tasks (
        id          uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id     uuid          NOT NULL,
        value       text          NOT NULL DEFAULT '',
        done        boolean       NOT NULL DEFAULT false,
        sort_order  int           NOT NULL DEFAULT 0,
        created_at  timestamptz   NOT NULL DEFAULT now(),
        updated_at  timestamptz   NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_dashboard_tasks_user_id
        ON user_service.dashboard_tasks (user_id)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP TABLE IF EXISTS user_service.dashboard_tasks
    `);
  }
}
