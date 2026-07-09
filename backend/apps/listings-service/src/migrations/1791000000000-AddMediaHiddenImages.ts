import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddMediaHiddenImages1791000000000 implements MigrationInterface {
  name = 'AddMediaHiddenImages1791000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "listings"."media" ADD COLUMN IF NOT EXISTS "hiddenImages" text[]`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // No-op: column addition is non-destructive
  }
}
