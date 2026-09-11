import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCaseStudyLikes1788228817949 implements MigrationInterface {
  name = 'AddCaseStudyLikes1788228817949';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "case_studies"
      ADD COLUMN IF NOT EXISTS "likesCount" int NOT NULL DEFAULT 0
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "case_study_likes" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "caseStudyId" uuid NOT NULL,
        "userId" uuid NOT NULL,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_case_study_likes" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_case_study_likes_case_study_user" UNIQUE ("caseStudyId", "userId"),
        CONSTRAINT "FK_case_study_likes_case_study" FOREIGN KEY ("caseStudyId")
          REFERENCES "case_studies"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_case_study_likes_caseStudyId"
        ON "case_study_likes" ("caseStudyId")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_case_study_likes_userId"
        ON "case_study_likes" ("userId")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "case_study_likes"`);
    await queryRunner.query(`
      ALTER TABLE "case_studies"
      DROP COLUMN IF EXISTS "likesCount"
    `);
  }
}
