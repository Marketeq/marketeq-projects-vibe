import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreatePortfolioItem1680000000000 implements MigrationInterface {
  name = 'CreatePortfolioItem1680000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "portfolio_item" (
        "id"             uuid        NOT NULL DEFAULT gen_random_uuid(),
        "ownerUserId"    uuid        NOT NULL,
        "slug"           text        NOT NULL,
        "title"          text        NOT NULL,
        "schemaJson"     jsonb,
        "htmlPreview"    text,
        "htmlPublished"  text,
        "status"         text        NOT NULL DEFAULT 'draft',
        "createdAt"      TIMESTAMP   NOT NULL DEFAULT now(),
        "updatedAt"      TIMESTAMP   NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_portfolio_slug"  UNIQUE ("slug"),
        CONSTRAINT "PK_portfolio_id"   PRIMARY KEY ("id")
      );

      CREATE INDEX "IDX_portfolio_owner" ON "portfolio_item" ("ownerUserId");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "portfolio_item"`);
  }
}
