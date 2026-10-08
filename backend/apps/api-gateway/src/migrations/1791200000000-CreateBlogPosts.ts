import { MigrationInterface, QueryRunner } from 'typeorm';

// The BlogPost entity shipped without a migration, so blog_posts was never
// created and BlogBackfillService logs "Table not ready — skipping" on every
// boot. Columns mirror blog-post.entity.ts exactly; IF NOT EXISTS keeps this
// safe on any database where the table was created by hand.
export class CreateBlogPosts1791200000000 implements MigrationInterface {
  name = 'CreateBlogPosts1791200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "blog_posts" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "payloadId" character varying NOT NULL,
        "slug" character varying NOT NULL,
        "title" character varying NOT NULL,
        "body" jsonb,
        "authorId" character varying,
        "coverImageUrl" character varying,
        "status" character varying NOT NULL DEFAULT 'draft',
        "publishedAt" TIMESTAMP,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_blog_posts" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_blog_posts_payloadId" UNIQUE ("payloadId"),
        CONSTRAINT "UQ_blog_posts_slug" UNIQUE ("slug")
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "blog_posts"`);
  }
}
