import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateRecentlyViewed1785000000000 implements MigrationInterface {
  name = 'CreateRecentlyViewed1785000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "recently_viewed" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "userId" character varying NOT NULL,
        "projectId" uuid NOT NULL,
        "viewedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_recently_viewed" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_recently_viewed_user_project" UNIQUE ("userId", "projectId")
      )
    `);
    await queryRunner.query(`CREATE INDEX "IDX_recently_viewed_userId" ON "recently_viewed" ("userId")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "recently_viewed"`);
  }
}
