import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateProjectStaticContents1781000000000 implements MigrationInterface {
  name = 'CreateProjectStaticContents1781000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "project_static_contents" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "slug" character varying NOT NULL,
        "heading" character varying NOT NULL,
        "guaranteeItems" jsonb NOT NULL,
        "highlightedNotice" jsonb NOT NULL,
        "policy" jsonb NOT NULL,
        "howItWorks" jsonb NOT NULL,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_project_static_contents" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_project_static_contents_slug" UNIQUE ("slug")
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "project_static_contents"`);
  }
}
