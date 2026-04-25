import { MigrationInterface, QueryRunner } from "typeorm";

export class AddQuotedCiphertextToMessages1713000000000 implements MigrationInterface {
  name = "AddQuotedCiphertextToMessages1713000000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE IF EXISTS "messages" ADD COLUMN IF NOT EXISTS "quotedCiphertext" text`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE IF EXISTS "messages" DROP COLUMN IF EXISTS "quotedCiphertext"`
    );
  }
}
