import { MigrationInterface, QueryRunner } from 'typeorm';

export class SetCheckoutSessionIdDefault1791300000000
  implements MigrationInterface
{
  name = 'SetCheckoutSessionIdDefault1791300000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "checkout"."checkout_sessions"
        ALTER COLUMN "id" SET DEFAULT gen_random_uuid()
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "checkout"."checkout_sessions"
        ALTER COLUMN "id" SET DEFAULT uuid_generate_v4()
    `);
  }
}
