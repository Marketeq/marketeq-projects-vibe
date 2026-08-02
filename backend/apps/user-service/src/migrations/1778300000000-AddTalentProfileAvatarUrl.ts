import { MigrationInterface, QueryRunner } from "typeorm";

export class AddTalentProfileAvatarUrl1778300000000 implements MigrationInterface {
  name = "AddTalentProfileAvatarUrl1778300000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "user_service"."talent_profiles" ADD COLUMN IF NOT EXISTS "avatarUrl" character varying(1024)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "user_service"."talent_profiles" DROP COLUMN IF EXISTS "avatarUrl"`,
    );
  }
}
