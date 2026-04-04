import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateSkillsTable1770236845799 implements MigrationInterface {
    name = 'CreateSkillsTable1770236845799'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "skills" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying NOT NULL, "proficiency" character varying NOT NULL, "userId" uuid NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_skills_id" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "skills" ADD CONSTRAINT "FK_skills_userId" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "skills" DROP CONSTRAINT "FK_skills_userId"`);
        await queryRunner.query(`DROP TABLE "skills"`);
    }

}
