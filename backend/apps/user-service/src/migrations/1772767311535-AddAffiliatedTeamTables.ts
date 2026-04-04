import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAffiliatedTeamTables1772767311535
  implements MigrationInterface
{
  name = 'AddAffiliatedTeamTables1772767311535';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "experiences" DROP CONSTRAINT "FK_experiences_user"`,
    );
    await queryRunner.query(
      `ALTER TABLE "skills" DROP CONSTRAINT "FK_skills_userId"`,
    );
    await queryRunner.query(
      `CREATE TABLE "industries" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "industry" character varying NOT NULL, "yearsOfExperience" integer, "description" text, "userId" uuid NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_f1626dcb2d58142d7dfcca7b8d1" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "languages" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying NOT NULL, "fluency" character varying NOT NULL, "userId" uuid NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_b517f827ca496b29f4d549c631d" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "certifications" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying NOT NULL, "issuer" character varying NOT NULL, "issueDate" date NOT NULL, "expirationDate" date, "credentialId" character varying, "credentialUrl" character varying, "userId" uuid NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_fd763d412e4a1fb1b6dadd6e72b" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "portfolio" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying NOT NULL, "description" text, "url" character varying, "imageUrl" character varying, "tags" text array, "userId" uuid NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_6936bb92ca4b7cda0ff28794e48" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "affiliated_teams" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying NOT NULL, "location" character varying NOT NULL, "time" character varying NOT NULL, "userId" uuid NOT NULL, CONSTRAINT "PK_d444bd7ce56cf399f7654b3a624" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "dateFormat"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "startOfWeek"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "timeFormat"`);
    await queryRunner.query(
      `ALTER TABLE "experiences" ADD "industryType" character varying`,
    );
    await queryRunner.query(
      `ALTER TABLE "experiences" ADD "skills" text array`,
    );
    await queryRunner.query(
      `ALTER TABLE "experiences" DROP COLUMN "description"`,
    );
    await queryRunner.query(
      `ALTER TABLE "experiences" ADD "description" character varying`,
    );
    await queryRunner.query(`ALTER TABLE "experiences" DROP COLUMN "location"`);
    await queryRunner.query(`ALTER TABLE "experiences" ADD "location" text`);
    await queryRunner.query(
      `ALTER TABLE "experiences" DROP COLUMN "startDate"`,
    );
    await queryRunner.query(
      `ALTER TABLE "experiences" ADD "startDate" date NOT NULL`,
    );
    await queryRunner.query(`ALTER TABLE "experiences" DROP COLUMN "endDate"`);
    await queryRunner.query(`ALTER TABLE "experiences" ADD "endDate" date`);
    await queryRunner.query(
      `ALTER TABLE "experiences" ALTER COLUMN "isCurrentRole" SET NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "experiences" DROP COLUMN "createdAt"`,
    );
    await queryRunner.query(
      `ALTER TABLE "experiences" ADD "createdAt" TIMESTAMP NOT NULL DEFAULT now()`,
    );
    await queryRunner.query(
      `ALTER TABLE "experiences" DROP COLUMN "updatedAt"`,
    );
    await queryRunner.query(
      `ALTER TABLE "experiences" ADD "updatedAt" TIMESTAMP NOT NULL DEFAULT now()`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_97672ac88f789774dd47f7c8be"`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" DROP CONSTRAINT IF EXISTS "users_email_key"`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ALTER COLUMN "email" TYPE character varying`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ALTER COLUMN "password" DROP DEFAULT`,
    );
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "timezone"`);
    await queryRunner.query(
      `ALTER TABLE "users" ADD "timezone" character varying`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_97672ac88f789774dd47f7c8be" ON "users" ("email") `,
    );
    await queryRunner.query(
      `ALTER TABLE "industries" ADD CONSTRAINT "FK_dc2f8d935eb8e84267b05aabfd4" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "languages" ADD CONSTRAINT "FK_8f1b96a30ff66e0cd5c5c2fd797" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "certifications" ADD CONSTRAINT "FK_c5d9770c24adc7be0680f9bd963" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "portfolio" ADD CONSTRAINT "FK_9d041c43c782a9135df1388ae16" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "affiliated_teams" ADD CONSTRAINT "FK_2f83b2f81cd02f84dca26794814" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "skills" ADD CONSTRAINT "FK_ee1265e76ea0b8c5f7daa85e817" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "skills" DROP CONSTRAINT "FK_ee1265e76ea0b8c5f7daa85e817"`,
    );
    await queryRunner.query(
      `ALTER TABLE "affiliated_teams" DROP CONSTRAINT "FK_2f83b2f81cd02f84dca26794814"`,
    );
    await queryRunner.query(
      `ALTER TABLE "portfolio" DROP CONSTRAINT "FK_9d041c43c782a9135df1388ae16"`,
    );
    await queryRunner.query(
      `ALTER TABLE "certifications" DROP CONSTRAINT "FK_c5d9770c24adc7be0680f9bd963"`,
    );
    await queryRunner.query(
      `ALTER TABLE "languages" DROP CONSTRAINT "FK_8f1b96a30ff66e0cd5c5c2fd797"`,
    );
    await queryRunner.query(
      `ALTER TABLE "industries" DROP CONSTRAINT "FK_dc2f8d935eb8e84267b05aabfd4"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_97672ac88f789774dd47f7c8be"`,
    );
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "timezone"`);
    await queryRunner.query(
      `ALTER TABLE "users" ADD "timezone" character varying(64) NOT NULL DEFAULT 'UTC'`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ALTER COLUMN "password" SET DEFAULT ''`,
    );
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "email"`);
    await queryRunner.query(
      `ALTER TABLE "users" ADD "email" character varying(320) NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ADD CONSTRAINT "users_email_key" UNIQUE ("email")`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_97672ac88f789774dd47f7c8be" ON "users" ("email") `,
    );
    await queryRunner.query(
      `ALTER TABLE "experiences" DROP COLUMN "updatedAt"`,
    );
    await queryRunner.query(
      `ALTER TABLE "experiences" ADD "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT now()`,
    );
    await queryRunner.query(
      `ALTER TABLE "experiences" DROP COLUMN "createdAt"`,
    );
    await queryRunner.query(
      `ALTER TABLE "experiences" ADD "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT now()`,
    );
    await queryRunner.query(
      `ALTER TABLE "experiences" ALTER COLUMN "isCurrentRole" DROP NOT NULL`,
    );
    await queryRunner.query(`ALTER TABLE "experiences" DROP COLUMN "endDate"`);
    await queryRunner.query(
      `ALTER TABLE "experiences" ADD "endDate" TIMESTAMP WITH TIME ZONE`,
    );
    await queryRunner.query(
      `ALTER TABLE "experiences" DROP COLUMN "startDate"`,
    );
    await queryRunner.query(
      `ALTER TABLE "experiences" ADD "startDate" TIMESTAMP WITH TIME ZONE NOT NULL`,
    );
    await queryRunner.query(`ALTER TABLE "experiences" DROP COLUMN "location"`);
    await queryRunner.query(
      `ALTER TABLE "experiences" ADD "location" character varying`,
    );
    await queryRunner.query(
      `ALTER TABLE "experiences" DROP COLUMN "description"`,
    );
    await queryRunner.query(`ALTER TABLE "experiences" ADD "description" text`);
    await queryRunner.query(`ALTER TABLE "experiences" DROP COLUMN "skills"`);
    await queryRunner.query(
      `ALTER TABLE "experiences" DROP COLUMN "industryType"`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ADD "timeFormat" character varying(8) NOT NULL DEFAULT '12h'`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ADD "startOfWeek" character varying(16) NOT NULL DEFAULT 'Sunday'`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ADD "dateFormat" character varying(16) NOT NULL DEFAULT 'MM/DD/YYYY'`,
    );
    await queryRunner.query(`DROP TABLE "affiliated_teams"`);
    await queryRunner.query(`DROP TABLE "portfolio"`);
    await queryRunner.query(`DROP TABLE "certifications"`);
    await queryRunner.query(`DROP TABLE "languages"`);
    await queryRunner.query(`DROP TABLE "industries"`);
    await queryRunner.query(
      `ALTER TABLE "skills" ADD CONSTRAINT "FK_skills_userId" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "experiences" ADD CONSTRAINT "FK_experiences_user" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }
}
