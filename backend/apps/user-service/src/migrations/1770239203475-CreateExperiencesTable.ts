import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateExperiencesTable1770239203475 implements MigrationInterface {
    name = 'CreateExperiencesTable1770239203475'

    public async up(queryRunner: QueryRunner): Promise<void> {
        const hasExperiences = await queryRunner.hasTable('experiences');

        if (!hasExperiences) {
            await queryRunner.query(
                `CREATE TABLE "experiences" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "title" character varying NOT NULL, "description" character varying, "company" character varying NOT NULL, "location" text, "startDate" TIMESTAMP NOT NULL, "endDate" TIMESTAMP, "isCurrentRole" boolean NOT NULL DEFAULT false, "industryType" character varying, "skills" text, "userId" uuid NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_884f0913a63882712ea578e7c85" PRIMARY KEY ("id"))`,
            );
        }

        await queryRunner.query(
            `DO $$ BEGIN
                IF NOT EXISTS (
                    SELECT 1 FROM pg_constraint WHERE conname = 'FK_bb3ad7f8190c033791e9f1af1ea'
                ) THEN
                    ALTER TABLE "experiences" ADD CONSTRAINT "FK_bb3ad7f8190c033791e9f1af1ea" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
                END IF;
            END $$;`,
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "experiences" DROP CONSTRAINT IF EXISTS "FK_bb3ad7f8190c033791e9f1af1ea"`);
        await queryRunner.query(`DROP TABLE IF EXISTS "experiences"`);
    }
}
