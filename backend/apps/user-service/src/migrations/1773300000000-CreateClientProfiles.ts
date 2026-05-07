import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateClientProfiles1773300000000 implements MigrationInterface {
  name = 'CreateClientProfiles1773300000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "client" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "userId" uuid NOT NULL,
        "teamName" character varying,
        "role" character varying,
        "industry" character varying,
        "businessTypes" text,
        "teammateEmails" text,
        "industries" text,
        "lookingToWorkWith" text,
        "skills" text,
        "projectTypes" text,
        "budget" character varying,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_client_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_client_userId" UNIQUE ("userId")
      )
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'FK_client_userId_users_id'
        ) THEN
          ALTER TABLE "client"
          ADD CONSTRAINT "FK_client_userId_users_id"
          FOREIGN KEY ("userId") REFERENCES "users"("id")
          ON DELETE CASCADE
          ON UPDATE NO ACTION;
        END IF;
      END $$;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "client"
      DROP CONSTRAINT IF EXISTS "FK_client_userId_users_id"
    `);
    await queryRunner.query(`DROP TABLE IF EXISTS "client"`);
  }
}
