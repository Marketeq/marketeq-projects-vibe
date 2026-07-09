import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateHomepages1781000000003 implements MigrationInterface {
  name = 'CreateHomepages1781000000003';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "homepages" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "slug" character varying NOT NULL,
        "title" character varying NOT NULL,
        "status" character varying NOT NULL DEFAULT 'active',
        "isDefault" boolean NOT NULL DEFAULT false,
        "testGroup" character varying,
        "config" jsonb NOT NULL,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_homepages" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_homepages_slug" UNIQUE ("slug")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "homepage_banners" (
        "id" character varying NOT NULL DEFAULT 'singleton',
        "enabled" boolean NOT NULL DEFAULT false,
        "message" character varying,
        "ctaLabel" character varying,
        "ctaUrl" character varying,
        "expiresAt" TIMESTAMP,
        "bannerType" character varying NOT NULL DEFAULT 'info',
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_homepage_banners" PRIMARY KEY ("id")
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "homepage_banners"`);
    await queryRunner.query(`DROP TABLE "homepages"`);
  }
}
