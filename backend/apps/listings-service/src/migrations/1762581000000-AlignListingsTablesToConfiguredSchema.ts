import { MigrationInterface, QueryRunner } from 'typeorm';

export class AlignListingsTablesToConfiguredSchema1762581000000
  implements MigrationInterface
{
  name = 'AlignListingsTablesToConfiguredSchema1762581000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const configuredSchema =
      (queryRunner.connection.options as { schema?: string }).schema || 'public';

    if (configuredSchema === 'public') {
      return;
    }

    await queryRunner.query(`CREATE SCHEMA IF NOT EXISTS "${configuredSchema}"`);

    for (const tableName of ['project', 'phase', 'task', 'media']) {
      const targetTable = await queryRunner.query(
        `
          SELECT 1
          FROM information_schema.tables
          WHERE table_schema = $1
            AND table_name = $2
        `,
        [configuredSchema, tableName],
      );
      if (targetTable.length > 0) {
        continue;
      }

      const publicTable = await queryRunner.query(
        `
          SELECT 1
          FROM information_schema.tables
          WHERE table_schema = 'public'
            AND table_name = $1
        `,
        [tableName],
      );
      if (publicTable.length === 0) {
        continue;
      }

      await queryRunner.query(
        `ALTER TABLE "public"."${tableName}" SET SCHEMA "${configuredSchema}"`,
      );
    }

    // Rename project (singular) to projects (plural) to match current entity
    const projectExists = await queryRunner.query(
      `SELECT 1 FROM information_schema.tables WHERE table_schema = $1 AND table_name = 'project'`,
      [configuredSchema],
    );
    const projectsExists = await queryRunner.query(
      `SELECT 1 FROM information_schema.tables WHERE table_schema = $1 AND table_name = 'projects'`,
      [configuredSchema],
    );
    if (projectExists.length > 0 && projectsExists.length === 0) {
      await queryRunner.query(`ALTER TABLE "${configuredSchema}"."project" RENAME TO "projects"`);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const configuredSchema =
      (queryRunner.connection.options as { schema?: string }).schema || 'public';

    if (configuredSchema === 'public') {
      return;
    }

    for (const tableName of ['project', 'phase', 'task', 'media']) {
      const publicTable = await queryRunner.query(
        `
          SELECT 1
          FROM information_schema.tables
          WHERE table_schema = 'public'
            AND table_name = $1
        `,
        [tableName],
      );
      if (publicTable.length > 0) {
        continue;
      }

      const targetTable = await queryRunner.query(
        `
          SELECT 1
          FROM information_schema.tables
          WHERE table_schema = $1
            AND table_name = $2
        `,
        [configuredSchema, tableName],
      );
      if (targetTable.length === 0) {
        continue;
      }

      await queryRunner.query(
        `ALTER TABLE "${configuredSchema}"."${tableName}" SET SCHEMA "public"`,
      );
    }
  }
}
