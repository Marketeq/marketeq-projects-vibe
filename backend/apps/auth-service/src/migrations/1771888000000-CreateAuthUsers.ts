import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateAuthUsers1771888000000 implements MigrationInterface {
  name = 'CreateAuthUsers1771888000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "users" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "username" character varying NOT NULL,
        "email" character varying NOT NULL,
        "password" character varying NOT NULL,
        CONSTRAINT "UQ_users_username" UNIQUE ("username"),
        CONSTRAINT "UQ_users_email" UNIQUE ("email")
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "users"`);
  }
}
