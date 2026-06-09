import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddClientNameColumn1717500000000 implements MigrationInterface {
  name = 'AddClientNameColumn1717500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "contracts" ADD COLUMN IF NOT EXISTS "client_name" varchar NOT NULL DEFAULT ''`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "contracts" DROP COLUMN IF EXISTS "client_name"`,
    );
  }
}