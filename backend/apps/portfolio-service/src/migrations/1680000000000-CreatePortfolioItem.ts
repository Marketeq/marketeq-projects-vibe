import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreatePortfolioItem1680000000000 implements MigrationInterface {
  name = 'CreatePortfolioItem1680000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "portfolio_item" (
        "id"             uuid        NOT NULL DEFAULT gen_random_uuid(),
        "ownerUserId"    uuid        NOT NULL,
        "slug"           text        NOT NULL,
        "title"          text        NOT NULL DEFAULT '',
        "schemaJson"     jsonb,
        "htmlPreview"    text,
        "htmlPublished"  text,
        "status"         text        NOT NULL DEFAULT 'draft',
        "gallery"        jsonb,
        "createdAt"      TIMESTAMP   NOT NULL DEFAULT now(),
        "updatedAt"      TIMESTAMP   NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_portfolio_slug"  UNIQUE ("slug"),
        CONSTRAINT "PK_portfolio_id"   PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_portfolio_owner" ON "portfolio_item" ("ownerUserId")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_portfolio_status" ON "portfolio_item" ("status")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "portfolio_item"`);
  }
}
