import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddHireList1773186324360 implements MigrationInterface {
  name = 'AddHireList1773186324360';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."hire_requests_status_enum" AS ENUM('PENDING', 'ACCEPTED', 'DECLINED')`,
    );
    await queryRunner.query(
      `CREATE TABLE "hire_requests" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "clientUserId" uuid NOT NULL, "talentUserId" uuid NOT NULL, "message" character varying, "budgetUsd" integer NOT NULL, "projectType" character varying, "status" "public"."hire_requests_status_enum" NOT NULL DEFAULT 'PENDING', "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_f3704340a7942578833f16cfc75" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `ALTER TABLE "hire_requests" ADD CONSTRAINT "FK_15981cd404858f1e63dd7e1c177" FOREIGN KEY ("clientUserId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "hire_requests" ADD CONSTRAINT "FK_3fdebe244c7de7b4b327258ec10" FOREIGN KEY ("talentUserId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "hire_requests" DROP CONSTRAINT "FK_3fdebe244c7de7b4b327258ec10"`,
    );
    await queryRunner.query(
      `ALTER TABLE "hire_requests" DROP CONSTRAINT "FK_15981cd404858f1e63dd7e1c177"`,
    );
    await queryRunner.query(`DROP TABLE "hire_requests"`);
    await queryRunner.query(`DROP TYPE "public"."hire_requests_status_enum"`);
  }
}
