import { MigrationInterface, QueryRunner } from "typeorm";

export class AddEducationTable1770003605830 implements MigrationInterface {
    name = 'AddEducationTable1770003605830'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "educations" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "school" character varying NOT NULL, "degree" character varying NOT NULL, "fieldOfStudy" character varying NOT NULL, "startYear" integer NOT NULL, "endYear" integer, "isCurrent" boolean NOT NULL DEFAULT false, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "userId" uuid, CONSTRAINT "PK_09d2f29e7f6f31f5c01d79d2dbf" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "educations" ADD CONSTRAINT "FK_86e26478ad7a3d8543cfb922358" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "educations" DROP CONSTRAINT "FK_86e26478ad7a3d8543cfb922358"`);
        await queryRunner.query(`DROP TABLE "educations"`);
    }

}
