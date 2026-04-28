import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateSessions1772100000002 implements MigrationInterface {
  name = 'CreateSessions1772100000002';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "sessions" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "userId" uuid NOT NULL,
        "refreshTokenHash" character varying NOT NULL,
        "userAgent" character varying NOT NULL DEFAULT '',
        "ipAddress" character varying NOT NULL DEFAULT '',
        "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "lastActiveAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "expiresAt" TIMESTAMP NOT NULL
      )
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_sessions_userId" ON "sessions" ("userId")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_sessions_userId"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "sessions"`);
  }
}
