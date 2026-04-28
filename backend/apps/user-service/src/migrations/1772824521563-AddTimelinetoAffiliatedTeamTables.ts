import { MigrationInterface, QueryRunner } from "typeorm";

export class AddTimelinetoAffiliatedTeamTables1772824521563 implements MigrationInterface {
    name = 'AddTimelinetoAffiliatedTeamTables1772824521563'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "affiliated_teams" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()`);
        await queryRunner.query(`ALTER TABLE "affiliated_teams" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP NOT NULL DEFAULT now()`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "affiliated_teams" DROP COLUMN IF EXISTS "updatedAt"`);
        await queryRunner.query(`ALTER TABLE "affiliated_teams" DROP COLUMN IF EXISTS "createdAt"`);
    }

}
