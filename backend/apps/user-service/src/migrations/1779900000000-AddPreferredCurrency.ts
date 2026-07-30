import { MigrationInterface, QueryRunner } from "typeorm";

export class AddPreferredCurrency1779900000000 implements MigrationInterface {
    name = 'AddPreferredCurrency1779900000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "user_service"."users"
            ADD COLUMN IF NOT EXISTS "preferredCurrency" character varying(3)
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "user_service"."users"
            DROP COLUMN IF EXISTS "preferredCurrency"
        `);
    }
}
