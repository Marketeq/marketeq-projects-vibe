import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreatePasswordHistory1772500000000 implements MigrationInterface {
  name = 'CreatePasswordHistory1772500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "password_history" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "userId" uuid NOT NULL,
        "passwordHash" character varying NOT NULL,
        "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_password_history_userId" ON "password_history" ("userId")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_password_history_userId"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "password_history"`);
  }
}
