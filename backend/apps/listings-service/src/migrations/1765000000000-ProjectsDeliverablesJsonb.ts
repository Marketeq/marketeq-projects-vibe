import { MigrationInterface, QueryRunner } from 'typeorm';

export class ProjectsDeliverablesJsonb1765000000000 implements MigrationInterface {
  name = 'ProjectsDeliverablesJsonb1765000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const schema = (queryRunner.connection.options as { schema?: string }).schema || 'public';
    await queryRunner.query(`
      ALTER TABLE "${schema}"."projects"
      ALTER COLUMN "deliverables" DROP DEFAULT
    `);
    await queryRunner.query(`
      ALTER TABLE "${schema}"."projects"
      ALTER COLUMN "deliverables" TYPE jsonb
      USING to_jsonb("deliverables")
    `);
    await queryRunner.query(`
      ALTER TABLE "${schema}"."projects"
      ALTER COLUMN "deliverables" SET DEFAULT '[]'::jsonb
    `);
    await queryRunner.query(`
      UPDATE "${schema}"."projects" SET "deliverables" = '[]'::jsonb WHERE "deliverables" IS NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "projects"
      ALTER COLUMN "deliverables" DROP DEFAULT
    `);
    await queryRunner.query(`
      ALTER TABLE "projects"
      ALTER COLUMN "deliverables" TYPE text[]
      USING ARRAY[]::text[]
    `);
    await queryRunner.query(`
      ALTER TABLE "projects"
      ALTER COLUMN "deliverables" SET DEFAULT '{}'::text[]
    `);
  }
}
