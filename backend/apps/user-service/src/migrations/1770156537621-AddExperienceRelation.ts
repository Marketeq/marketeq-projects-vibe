import { MigrationInterface, QueryRunner } from "typeorm";

export class AddExperienceRelation1770156537621 implements MigrationInterface {
    name = 'AddExperienceRelation1770156537621'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."IDX_mte_user_startAt"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_screenshots_user_takenAt"`);
        await queryRunner.query(`ALTER TABLE "manual_time_entries" DROP CONSTRAINT "CHK_mte_time"`);
        await queryRunner.query(`ALTER TABLE "screenshots" DROP CONSTRAINT "screenshots_activityPercent_check"`);
        await queryRunner.query(`ALTER TABLE "screenshots" DROP COLUMN "createdAt"`);
        await queryRunner.query(`ALTER TABLE "screenshots" ADD "createdAt" TIMESTAMP NOT NULL DEFAULT now()`);
        await queryRunner.query(`ALTER TABLE "screenshots" DROP COLUMN "updatedAt"`);
        await queryRunner.query(`ALTER TABLE "screenshots" ADD "updatedAt" TIMESTAMP NOT NULL DEFAULT now()`);
        await queryRunner.query(`CREATE INDEX "IDX_0d6e0895920837c762ab067a23" ON "manual_time_entries" ("userId") `);
        await queryRunner.query(`CREATE INDEX "IDX_12dfc9cd09dde692224456e1b2" ON "manual_time_entries" ("startAt") `);
        await queryRunner.query(`CREATE INDEX "IDX_8fb78c3c2d0f5c8f322187e1f1" ON "manual_time_entries" ("endAt") `);
        await queryRunner.query(`CREATE INDEX "IDX_506e12c316e5c4b0197bf3f188" ON "manual_time_entries" ("approved") `);
        await queryRunner.query(`CREATE INDEX "IDX_f01e0b50926889409e89203874" ON "screenshots" ("userId") `);
        await queryRunner.query(`CREATE INDEX "IDX_ce039c18fc12a6ca744379604a" ON "screenshots" ("projectId") `);
        await queryRunner.query(`CREATE INDEX "IDX_51cc04701bb431a73aed4f7b49" ON "screenshots" ("taskId") `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."IDX_51cc04701bb431a73aed4f7b49"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_ce039c18fc12a6ca744379604a"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_f01e0b50926889409e89203874"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_506e12c316e5c4b0197bf3f188"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_8fb78c3c2d0f5c8f322187e1f1"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_12dfc9cd09dde692224456e1b2"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_0d6e0895920837c762ab067a23"`);
        await queryRunner.query(`ALTER TABLE "screenshots" DROP COLUMN "updatedAt"`);
        await queryRunner.query(`ALTER TABLE "screenshots" ADD "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()`);
        await queryRunner.query(`ALTER TABLE "screenshots" DROP COLUMN "createdAt"`);
        await queryRunner.query(`ALTER TABLE "screenshots" ADD "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()`);
        await queryRunner.query(`ALTER TABLE "screenshots" ADD CONSTRAINT "screenshots_activityPercent_check" CHECK ((("activityPercent" >= 0) AND ("activityPercent" <= 100)))`);
        await queryRunner.query(`ALTER TABLE "manual_time_entries" ADD CONSTRAINT "CHK_mte_time" CHECK (("endAt" > "startAt"))`);
        await queryRunner.query(`CREATE INDEX "IDX_screenshots_user_takenAt" ON "screenshots" ("userId", "takenAt") `);
        await queryRunner.query(`CREATE INDEX "IDX_mte_user_startAt" ON "manual_time_entries" ("userId", "startAt") `);
    }

}
