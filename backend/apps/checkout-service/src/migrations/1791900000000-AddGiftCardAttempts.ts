import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddGiftCardAttempts1791900000000 implements MigrationInterface {
  name = 'AddGiftCardAttempts1791900000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "checkout"."gift_card_attempts" (
        "client_id" uuid NOT NULL,
        "failed_count" integer NOT NULL DEFAULT 0,
        "locked_until" TIMESTAMP WITH TIME ZONE,
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_gift_card_attempts_client" PRIMARY KEY ("client_id"),
        CONSTRAINT "CHK_gift_card_attempts_count" CHECK ("failed_count" >= 0)
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "checkout"."gift_card_attempts"`);
  }
}
