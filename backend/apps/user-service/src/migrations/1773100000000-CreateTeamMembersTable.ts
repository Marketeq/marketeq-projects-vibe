import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateTeamMembersTable1773100000000
  implements MigrationInterface
{
  name = 'CreateTeamMembersTable1773100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE IF NOT EXISTS "team_members" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(), 
        "teamId" character varying(255) NOT NULL, 
        "userId" character varying(255) NOT NULL, 
        "role" character varying(255) NOT NULL DEFAULT 'member', 
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), 
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), 
        CONSTRAINT "PK_team_members_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_team_members_teamId_userId" UNIQUE ("teamId", "userId")
      )`,
    );

    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_team_members_teamId" ON "team_members" ("teamId")`,
    );

    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_team_members_userId" ON "team_members" ("userId")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_team_members_userId"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_team_members_teamId"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "team_members"`);
  }
}
