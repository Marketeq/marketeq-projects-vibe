import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateExperiencesTableFix1770223469491
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
  CREATE TABLE IF NOT EXISTS "experiences" (
    "id" uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    "title" varchar NOT NULL,
    "description" text,
    "company" varchar NOT NULL,
    "location" varchar,
    "startDate" timestamptz NOT NULL,
    "endDate" timestamptz,
    "isCurrentRole" boolean DEFAULT false,
    "userId" uuid NOT NULL,
    "createdAt" timestamptz DEFAULT now(),
    "updatedAt" timestamptz DEFAULT now(),
    CONSTRAINT "FK_experiences_user" FOREIGN KEY ("userId")
      REFERENCES "users"("id") ON DELETE CASCADE
  );
`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "experiences";`);
  }
}
