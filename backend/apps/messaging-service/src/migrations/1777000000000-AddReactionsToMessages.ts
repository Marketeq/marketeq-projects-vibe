import { MigrationInterface, QueryRunner } from "typeorm";

export class AddReactionsToMessages1777000000000 implements MigrationInterface {
  name = "AddReactionsToMessages1777000000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE IF EXISTS "messages" ADD COLUMN IF NOT EXISTS "reactions" jsonb NOT NULL DEFAULT '[]'::jsonb`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE IF EXISTS "messages" DROP COLUMN IF EXISTS "reactions"`
    );
  }
}
