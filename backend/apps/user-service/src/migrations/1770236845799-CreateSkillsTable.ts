import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateSkillsTable1770236845799 implements MigrationInterface {
    name = 'CreateSkillsTable1770236845799'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE IF NOT EXISTS "skills" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying NOT NULL, "proficiency" character varying NOT NULL, "userId" uuid NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_skills_id" PRIMARY KEY ("id"))`);
        await queryRunner.query(
            `DO $$ BEGIN
                IF NOT EXISTS (
                    SELECT 1 FROM pg_constraint WHERE conname = 'FK_skills_userId'
                ) THEN
                    ALTER TABLE "skills" ADD CONSTRAINT "FK_skills_userId" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
                END IF;
            END $$;`,
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "skills" DROP CONSTRAINT IF EXISTS "FK_skills_userId"`);
        await queryRunner.query(`DROP TABLE IF EXISTS "skills"`);
    }

}
