import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateBlockedUsers1777540354929 implements MigrationInterface {
  name = 'CreateBlockedUsers1777540354929';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "user_service"."blocked_users" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "blockerId" uuid NOT NULL,
        "blockedId" uuid NOT NULL,
        "reason" text,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_blocked_users_id" PRIMARY KEY ("id"),
        CONSTRAINT "uq_blocked_users_pair" UNIQUE ("blockerId", "blockedId"),
        CONSTRAINT "ck_blocked_users_no_self" CHECK ("blockerId" <> "blockedId")
      )
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'FK_blocked_users_blockerId_users_id'
        ) THEN
          ALTER TABLE "user_service"."blocked_users"
          ADD CONSTRAINT "FK_blocked_users_blockerId_users_id"
          FOREIGN KEY ("blockerId") REFERENCES "user_service"."users"("id")
          ON DELETE CASCADE
          ON UPDATE NO ACTION;
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'FK_blocked_users_blockedId_users_id'
        ) THEN
          ALTER TABLE "user_service"."blocked_users"
          ADD CONSTRAINT "FK_blocked_users_blockedId_users_id"
          FOREIGN KEY ("blockedId") REFERENCES "user_service"."users"("id")
          ON DELETE CASCADE
          ON UPDATE NO ACTION;
        END IF;
      END $$;
    `);

    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_blocked_users_blocker" ON "user_service"."blocked_users" ("blockerId")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_blocked_users_blocked" ON "user_service"."blocked_users" ("blockedId")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "user_service"."idx_blocked_users_blocked"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "user_service"."idx_blocked_users_blocker"`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_service"."blocked_users" DROP CONSTRAINT IF EXISTS "FK_blocked_users_blockedId_users_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_service"."blocked_users" DROP CONSTRAINT IF EXISTS "FK_blocked_users_blockerId_users_id"`,
    );
    await queryRunner.query(
      `DROP TABLE IF EXISTS "user_service"."blocked_users"`,
    );
  }
}
