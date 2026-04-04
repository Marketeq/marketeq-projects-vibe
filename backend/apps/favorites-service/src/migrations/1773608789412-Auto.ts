import { MigrationInterface, QueryRunner } from "typeorm";

export class Auto1773608789412 implements MigrationInterface {
    name = 'Auto1773608789412'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "team_member" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "skills" text array, "teamId" uuid, CONSTRAINT "PK_649680684d72a20d279641469c5" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "team" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying NOT NULL, CONSTRAINT "PK_f57d8293406df4af348402e4b74" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "service" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "title" character varying NOT NULL, "tags" text array, CONSTRAINT "PK_85a21558c006647cd76fdce044b" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "skill" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying NOT NULL, CONSTRAINT "PK_a0d33334424e64fb78dc3ce7196" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "talent" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "firstName" character varying NOT NULL, "lastName" character varying NOT NULL, CONSTRAINT "PK_bb69d9cea50aa835af369a4c2b8" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "project" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying NOT NULL, CONSTRAINT "PK_4d68b1358bb5b766d3e78f32f57" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "job" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "title" character varying NOT NULL, CONSTRAINT "PK_98ab1c14ff8d1cf80d18703b92f" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "favorite_group" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "userId" character varying NOT NULL, "name" character varying NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_a5be1110b3285d773091914e102" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TYPE "public"."favorite_type_enum" AS ENUM('project', 'talent', 'job', 'service', 'team')`);
        await queryRunner.query(`CREATE TABLE "favorite" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "userId" character varying NOT NULL, "userSub" character varying NOT NULL, "groupId" uuid, "type" "public"."favorite_type_enum" NOT NULL, "itemId" character varying NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_495675cec4fb09666704e4f610f" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "talent_skills_skill" ("talentId" uuid NOT NULL, "skillId" uuid NOT NULL, CONSTRAINT "PK_e1f7567f1e253d6f68a2c802c8e" PRIMARY KEY ("talentId", "skillId"))`);
        await queryRunner.query(`CREATE INDEX "IDX_bdc9803cb0ff651190f1ce64b8" ON "talent_skills_skill" ("talentId") `);
        await queryRunner.query(`CREATE INDEX "IDX_4add5da0a201d579785913aa1e" ON "talent_skills_skill" ("skillId") `);
        await queryRunner.query(`CREATE TABLE "project_skills_skill" ("projectId" uuid NOT NULL, "skillId" uuid NOT NULL, CONSTRAINT "PK_75331efa833de97a3674c5152e8" PRIMARY KEY ("projectId", "skillId"))`);
        await queryRunner.query(`CREATE INDEX "IDX_d3434af0018f24c564c2ab1fbf" ON "project_skills_skill" ("projectId") `);
        await queryRunner.query(`CREATE INDEX "IDX_8650b9852e80554b1f0d493ac5" ON "project_skills_skill" ("skillId") `);
        await queryRunner.query(`CREATE TABLE "job_skills_skill" ("jobId" uuid NOT NULL, "skillId" uuid NOT NULL, CONSTRAINT "PK_27773e917c7fc5b92dee508ed56" PRIMARY KEY ("jobId", "skillId"))`);
        await queryRunner.query(`CREATE INDEX "IDX_7f0160506793da667b04476540" ON "job_skills_skill" ("jobId") `);
        await queryRunner.query(`CREATE INDEX "IDX_ae25ea346c558d8cc5bcba6ff6" ON "job_skills_skill" ("skillId") `);
        await queryRunner.query(`ALTER TABLE "team_member" ADD CONSTRAINT "FK_74da8f612921485e1005dc8e225" FOREIGN KEY ("teamId") REFERENCES "team"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "favorite" ADD CONSTRAINT "FK_49c213ab50c6adc332d9a62cc10" FOREIGN KEY ("groupId") REFERENCES "favorite_group"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "talent_skills_skill" ADD CONSTRAINT "FK_bdc9803cb0ff651190f1ce64b85" FOREIGN KEY ("talentId") REFERENCES "talent"("id") ON DELETE CASCADE ON UPDATE CASCADE`);
        await queryRunner.query(`ALTER TABLE "talent_skills_skill" ADD CONSTRAINT "FK_4add5da0a201d579785913aa1e7" FOREIGN KEY ("skillId") REFERENCES "skill"("id") ON DELETE CASCADE ON UPDATE CASCADE`);
        await queryRunner.query(`ALTER TABLE "project_skills_skill" ADD CONSTRAINT "FK_d3434af0018f24c564c2ab1fbfe" FOREIGN KEY ("projectId") REFERENCES "project"("id") ON DELETE CASCADE ON UPDATE CASCADE`);
        await queryRunner.query(`ALTER TABLE "project_skills_skill" ADD CONSTRAINT "FK_8650b9852e80554b1f0d493ac59" FOREIGN KEY ("skillId") REFERENCES "skill"("id") ON DELETE CASCADE ON UPDATE CASCADE`);
        await queryRunner.query(`ALTER TABLE "job_skills_skill" ADD CONSTRAINT "FK_7f0160506793da667b044765400" FOREIGN KEY ("jobId") REFERENCES "job"("id") ON DELETE CASCADE ON UPDATE CASCADE`);
        await queryRunner.query(`ALTER TABLE "job_skills_skill" ADD CONSTRAINT "FK_ae25ea346c558d8cc5bcba6ff6f" FOREIGN KEY ("skillId") REFERENCES "skill"("id") ON DELETE CASCADE ON UPDATE CASCADE`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "job_skills_skill" DROP CONSTRAINT "FK_ae25ea346c558d8cc5bcba6ff6f"`);
        await queryRunner.query(`ALTER TABLE "job_skills_skill" DROP CONSTRAINT "FK_7f0160506793da667b044765400"`);
        await queryRunner.query(`ALTER TABLE "project_skills_skill" DROP CONSTRAINT "FK_8650b9852e80554b1f0d493ac59"`);
        await queryRunner.query(`ALTER TABLE "project_skills_skill" DROP CONSTRAINT "FK_d3434af0018f24c564c2ab1fbfe"`);
        await queryRunner.query(`ALTER TABLE "talent_skills_skill" DROP CONSTRAINT "FK_4add5da0a201d579785913aa1e7"`);
        await queryRunner.query(`ALTER TABLE "talent_skills_skill" DROP CONSTRAINT "FK_bdc9803cb0ff651190f1ce64b85"`);
        await queryRunner.query(`ALTER TABLE "favorite" DROP CONSTRAINT "FK_49c213ab50c6adc332d9a62cc10"`);
        await queryRunner.query(`ALTER TABLE "team_member" DROP CONSTRAINT "FK_74da8f612921485e1005dc8e225"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_ae25ea346c558d8cc5bcba6ff6"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_7f0160506793da667b04476540"`);
        await queryRunner.query(`DROP TABLE "job_skills_skill"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_8650b9852e80554b1f0d493ac5"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_d3434af0018f24c564c2ab1fbf"`);
        await queryRunner.query(`DROP TABLE "project_skills_skill"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_4add5da0a201d579785913aa1e"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_bdc9803cb0ff651190f1ce64b8"`);
        await queryRunner.query(`DROP TABLE "talent_skills_skill"`);
        await queryRunner.query(`DROP TABLE "favorite"`);
        await queryRunner.query(`DROP TYPE "public"."favorite_type_enum"`);
        await queryRunner.query(`DROP TABLE "favorite_group"`);
        await queryRunner.query(`DROP TABLE "job"`);
        await queryRunner.query(`DROP TABLE "project"`);
        await queryRunner.query(`DROP TABLE "talent"`);
        await queryRunner.query(`DROP TABLE "skill"`);
        await queryRunner.query(`DROP TABLE "service"`);
        await queryRunner.query(`DROP TABLE "team"`);
        await queryRunner.query(`DROP TABLE "team_member"`);
    }

}
