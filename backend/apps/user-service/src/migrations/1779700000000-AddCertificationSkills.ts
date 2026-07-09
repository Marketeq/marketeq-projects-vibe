import { MigrationInterface, QueryRunner } from "typeorm";

export class AddCertificationSkills1779700000000 implements MigrationInterface {
    name = 'AddCertificationSkills1779700000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "user_service"."certifications" ADD COLUMN IF NOT EXISTS "skills" text[]`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "user_service"."certifications" DROP COLUMN IF EXISTS "skills"`);
    }
}
