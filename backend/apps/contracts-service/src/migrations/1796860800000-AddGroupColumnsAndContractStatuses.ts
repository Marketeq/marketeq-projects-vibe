import { MigrationInterface, QueryRunner } from "typeorm";

// Adds the name and phase columns to contract_groups, and extends the
// contract_status enum with paused/disputed/expired/closed values needed
// by the job-listing flow.
export class AddGroupColumnsAndContractStatuses1796860800000 implements MigrationInterface {
    name = 'AddGroupColumnsAndContractStatuses1796860800000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // contract_groups: optional display name and phase label
        await queryRunner.query(`ALTER TABLE "contract_groups" ADD COLUMN IF NOT EXISTS "name" varchar`);
        await queryRunner.query(`ALTER TABLE "contract_groups" ADD COLUMN IF NOT EXISTS "phase" varchar`);

        // contract_status enum: add the four new values idempotently
        await queryRunner.query(`ALTER TYPE "public"."contracts_status_enum" ADD VALUE IF NOT EXISTS 'paused'`);
        await queryRunner.query(`ALTER TYPE "public"."contracts_status_enum" ADD VALUE IF NOT EXISTS 'disputed'`);
        await queryRunner.query(`ALTER TYPE "public"."contracts_status_enum" ADD VALUE IF NOT EXISTS 'expired'`);
        await queryRunner.query(`ALTER TYPE "public"."contracts_status_enum" ADD VALUE IF NOT EXISTS 'closed'`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "contract_groups" DROP COLUMN IF EXISTS "phase"`);
        await queryRunner.query(`ALTER TABLE "contract_groups" DROP COLUMN IF EXISTS "name"`);
        // Postgres does not support DROP VALUE from an enum; the four new
        // values are left in place on rollback (they are harmless if unused).
    }

}
