import { MigrationInterface, QueryRunner } from "typeorm";

export class MakeProficiencyFluencyOptional1779658950919 implements MigrationInterface {
    name = 'MakeProficiencyFluencyOptional1779658950919'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "user_service"."skills" ALTER COLUMN "proficiency" DROP NOT NULL`);
        await queryRunner.query(`ALTER TABLE "user_service"."languages" ALTER COLUMN "fluency" DROP NOT NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "user_service"."languages" ALTER COLUMN "fluency" SET NOT NULL`);
        await queryRunner.query(`ALTER TABLE "user_service"."skills" ALTER COLUMN "proficiency" SET NOT NULL`);
    }
}
