import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateUserKeysAndDevices1775000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS user_service.user_keys (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "userId" UUID NOT NULL,
        "publicKey" TEXT NOT NULL,
        "encryptedPrivateKey" TEXT,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "IDX_user_keys_userId"
      ON user_service.user_keys ("userId")
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS user_service.user_devices (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "userId" UUID NOT NULL,
        "publicKey" TEXT NOT NULL,
        "deviceName" VARCHAR,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_user_devices_userId"
      ON user_service.user_devices ("userId")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE IF EXISTS user_service.user_devices');
    await queryRunner.query('DROP TABLE IF EXISTS user_service.user_keys');
  }
}
