import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateBrowsingHistory1788100000000 implements MigrationInterface {
  name = 'CreateBrowsingHistory1788100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE "browsing_history_itemtype_enum" AS ENUM ('project', 'service', 'team', 'talent')
    `);

    await queryRunner.query(`
      CREATE TABLE "browsing_history" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "userId" uuid NOT NULL,
        "itemId" character varying(100) NOT NULL,
        "itemType" "browsing_history_itemtype_enum" NOT NULL,
        "firstViewedAt" TIMESTAMP NOT NULL DEFAULT now(),
        "lastViewedAt" TIMESTAMP NOT NULL,
        "viewCount" integer DEFAULT 1,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_browsing_history" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_browsing_history_user_item" UNIQUE ("userId", "itemId")
      )
    `);

    await queryRunner.query(
      `CREATE INDEX "IDX_browsing_history_userId" ON "browsing_history" ("userId")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_browsing_history_userId_lastViewedAt" ON "browsing_history" ("userId", "lastViewedAt")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "browsing_history"`);
    await queryRunner.query(`DROP TYPE "browsing_history_itemtype_enum"`);
  }
}
