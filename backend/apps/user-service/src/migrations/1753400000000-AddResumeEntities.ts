import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddResumeEntities1753400000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Resumes table: one per user
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "user_service"."resumes" (
        "id" uuid DEFAULT uuid_generate_v4() NOT NULL,
        "user_id" uuid NOT NULL,
        "current_version_id" uuid,
        "status" varchar(50) NOT NULL DEFAULT 'idle',
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_resumes" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_resumes_user_id" UNIQUE ("user_id")
      )
    `);

    // Resume versions: upload history
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "user_service"."resume_versions" (
        "id" uuid DEFAULT uuid_generate_v4() NOT NULL,
        "resume_id" uuid NOT NULL,
        "file_name" varchar(500) NOT NULL,
        "file_size" int NOT NULL,
        "mime_type" varchar(100) NOT NULL,
        "storage_key" varchar(1000) NOT NULL,
        "version_number" int NOT NULL DEFAULT 1,
        "uploaded_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_resume_versions" PRIMARY KEY ("id"),
        CONSTRAINT "FK_resume_versions_resume" FOREIGN KEY ("resume_id")
          REFERENCES "user_service"."resumes" ("id") ON DELETE CASCADE
      )
    `);

    // Parse results: structured LLM output
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "user_service"."parse_results" (
        "id" uuid DEFAULT uuid_generate_v4() NOT NULL,
        "version_id" uuid NOT NULL,
        "user_id" uuid NOT NULL,
        "document_type" varchar(50) NOT NULL,
        "is_resume" boolean NOT NULL,
        "confidence" decimal(4,3) NOT NULL,
        "extracted_name" varchar(500),
        "job_titles" jsonb NOT NULL DEFAULT '[]',
        "skills" jsonb NOT NULL DEFAULT '[]',
        "work_experience" jsonb NOT NULL DEFAULT '[]',
        "education" jsonb NOT NULL DEFAULT '[]',
        "certifications" jsonb NOT NULL DEFAULT '[]',
        "processing_ms" int,
        "model_attempts" int,
        "truncated" boolean NOT NULL DEFAULT false,
        "review_status" varchar(50) NOT NULL DEFAULT 'pending',
        "parsed_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_parse_results" PRIMARY KEY ("id"),
        CONSTRAINT "FK_parse_results_version" FOREIGN KEY ("version_id")
          REFERENCES "user_service"."resume_versions" ("id") ON DELETE CASCADE
      )
    `);

    // Sync audit: powers undo, tracks what was added/replaced
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "user_service"."sync_audits" (
        "id" uuid DEFAULT uuid_generate_v4() NOT NULL,
        "user_id" uuid NOT NULL,
        "parse_result_id" uuid NOT NULL,
        "entity_type" varchar(50) NOT NULL,
        "action" varchar(20) NOT NULL,
        "entity_id" uuid,
        "previous_data" jsonb,
        "new_data" jsonb,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_sync_audits" PRIMARY KEY ("id"),
        CONSTRAINT "FK_sync_audits_parse_result" FOREIGN KEY ("parse_result_id")
          REFERENCES "user_service"."parse_results" ("id") ON DELETE CASCADE
      )
    `);

    // Indexes
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_resume_versions_resume_id" ON "user_service"."resume_versions" ("resume_id")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_parse_results_version_id" ON "user_service"."parse_results" ("version_id")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_parse_results_user_id" ON "user_service"."parse_results" ("user_id")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_sync_audits_user_parse" ON "user_service"."sync_audits" ("user_id", "parse_result_id")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "user_service"."sync_audits"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "user_service"."parse_results"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "user_service"."resume_versions"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "user_service"."resumes"`);
  }
}
