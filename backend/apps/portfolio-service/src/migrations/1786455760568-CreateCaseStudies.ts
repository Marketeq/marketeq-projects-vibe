import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateCaseStudies1786455760568 implements MigrationInterface {
  name = 'CreateCaseStudies1786455760568';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "case_studies" (
        "id"             uuid          NOT NULL DEFAULT gen_random_uuid(),
        "ownerUserId"    uuid          NOT NULL,
        "title"          varchar(255)  NOT NULL,
        "slug"           varchar(100)  NOT NULL,
        "status"         varchar(20)   NOT NULL DEFAULT 'draft',
        "schemaJson"     jsonb,
        "htmlPreview"    text,
        "htmlPublished"  text,
        "createdAt"      TIMESTAMP     NOT NULL DEFAULT now(),
        "updatedAt"      TIMESTAMP     NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_case_studies_slug" UNIQUE ("slug"),
        CONSTRAINT "PK_case_studies_id" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_case_studies_owner" ON "case_studies" ("ownerUserId")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_case_studies_status" ON "case_studies" ("status")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_case_studies_updated" ON "case_studies" ("updatedAt" DESC)`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "case_study_blocks" (
        "id"           uuid        NOT NULL DEFAULT gen_random_uuid(),
        "caseStudyId"  uuid        NOT NULL,
        "blockType"    varchar(50) NOT NULL,
        "position"     integer     NOT NULL,
        "contentJson"  jsonb       NOT NULL,
        "createdAt"    TIMESTAMP   NOT NULL DEFAULT now(),
        "updatedAt"    TIMESTAMP   NOT NULL DEFAULT now(),
        CONSTRAINT "PK_case_study_blocks_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_case_study_blocks_case_study" FOREIGN KEY ("caseStudyId")
          REFERENCES "case_studies" ("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_case_study_blocks_case_study" ON "case_study_blocks" ("caseStudyId")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_case_study_blocks_position" ON "case_study_blocks" ("caseStudyId", "position")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "case_study_blocks"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "case_studies"`);
  }
}
