import { MigrationInterface, QueryRunner } from "typeorm";

// PMCM-829: contracts carry the weekly time cap from the accepted offer so
// the desktop tracker and time-tracking-service can stop billing past it.
// Existing contracts are backfilled from their schedule; "custom" ones keep
// a null cap because the agreed hours live only on the offer.
export class AddWeeklyCapHoursToContracts1797379200000 implements MigrationInterface {
    name = 'AddWeeklyCapHoursToContracts1797379200000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "contracts" ADD COLUMN IF NOT EXISTS "weeklyCapHours" integer`);
        await queryRunner.query(`UPDATE "contracts" SET "weeklyCapHours" = 40 WHERE "weeklyCapHours" IS NULL AND "schedule" = 'full-time'`);
        await queryRunner.query(`UPDATE "contracts" SET "weeklyCapHours" = 20 WHERE "weeklyCapHours" IS NULL AND "schedule" = 'part-time'`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "contracts" DROP COLUMN IF EXISTS "weeklyCapHours"`);
    }

}
