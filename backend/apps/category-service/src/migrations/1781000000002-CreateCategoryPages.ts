import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateCategoryPages1781000000002 implements MigrationInterface {
  name = 'CreateCategoryPages1781000000002';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "category_pages" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "categoryUuid" character varying NOT NULL,
        "path" character varying NOT NULL,
        "displayTitle" character varying NOT NULL,
        "level" integer NOT NULL DEFAULT 0,
        "heroBanner" jsonb,
        "intro" text,
        "faq" jsonb NOT NULL DEFAULT '[]',
        "featured" boolean NOT NULL DEFAULT false,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_category_pages" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_category_pages_categoryUuid" UNIQUE ("categoryUuid"),
        CONSTRAINT "UQ_category_pages_path" UNIQUE ("path")
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "category_pages"`);
  }
}
