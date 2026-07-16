import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateProjectMembers1793000000000 implements MigrationInterface {
  name = 'CreateProjectMembers1793000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "listings"."project_members" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "projectId" uuid NOT NULL,
        "userId" uuid NOT NULL,
        "projectRole" character varying NOT NULL DEFAULT 'Contributor',
        "status" character varying NOT NULL DEFAULT 'Active',
        "isLead" boolean NOT NULL DEFAULT false,
        "leadLabel" character varying,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_project_members" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_project_members_project_user" UNIQUE ("projectId", "userId")
      )
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_project_members_projectId" ON "listings"."project_members" ("projectId")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP TABLE IF EXISTS "listings"."project_members"`,
    );
  }
}
