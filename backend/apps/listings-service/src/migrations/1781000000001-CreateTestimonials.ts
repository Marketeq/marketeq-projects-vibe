import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateTestimonials1781000000001 implements MigrationInterface {
  name = 'CreateTestimonials1781000000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "testimonials" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "payloadId" character varying NOT NULL,
        "authorName" character varying NOT NULL,
        "authorTitle" character varying,
        "authorCompany" character varying,
        "avatarUrl" character varying,
        "quote" text NOT NULL,
        "rating" integer NOT NULL DEFAULT 5,
        "featured" boolean NOT NULL DEFAULT false,
        "status" character varying NOT NULL DEFAULT 'published',
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_testimonials" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_testimonials_payloadId" UNIQUE ("payloadId")
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "testimonials"`);
  }
}
