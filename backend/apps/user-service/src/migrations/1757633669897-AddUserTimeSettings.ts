import { MigrationInterface, QueryRunner } from "typeorm";

export class AddUserTimeSettings1757633669897 implements MigrationInterface {
  name = 'AddUserTimeSettings1757633669897'

  public async up(q: QueryRunner): Promise<void> {
    // Ensure uuid extension exists
    await q.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);

    const hasUsers = await q.hasTable('users');

    if (!hasUsers) {
      // Create a basic users table (adjust fields if your real schema needs more)
      await q.query(`
        CREATE TABLE "users" (
          "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
          "email" character varying(320) NOT NULL UNIQUE,
          "timezone" character varying(64) NOT NULL DEFAULT 'UTC',
          "dateFormat" character varying(16) NOT NULL DEFAULT 'MM/DD/YYYY',
          "startOfWeek" character varying(16) NOT NULL DEFAULT 'Sunday',
          "timeFormat" character varying(8) NOT NULL DEFAULT '12h',
          "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
          "updatedAt" TIMESTAMP NOT NULL DEFAULT now()
        )
      `);
    } else {
      // Add columns safely if table already exists
      await q.query(`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "timezone"   character varying(64)  NOT NULL DEFAULT 'UTC'`);
      await q.query(`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "dateFormat" character varying(16)  NOT NULL DEFAULT 'MM/DD/YYYY'`);
      await q.query(`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "startOfWeek" character varying(16) NOT NULL DEFAULT 'Sunday'`);
      await q.query(`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "timeFormat" character varying(8)   NOT NULL DEFAULT '12h'`);
    }
  }

  public async down(q: QueryRunner): Promise<void> {
    const hasUsers = await q.hasTable('users');

    if (hasUsers) {
      // Drop columns if they exist (non-destructive to other columns)
      await q.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "timeFormat"`);
      await q.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "startOfWeek"`);
      await q.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "dateFormat"`);
      await q.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "timezone"`);
    }
  }
}
