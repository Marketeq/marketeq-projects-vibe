import { MigrationInterface, QueryRunner } from 'typeorm';

export class ConvertDraftMembersToJsonb1792100000000 implements MigrationInterface {
  name = 'ConvertDraftMembersToJsonb1792100000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "checkout"."drafts"
      ADD COLUMN IF NOT EXISTS "members" jsonb NOT NULL DEFAULT '{}'::jsonb
    `);
    await queryRunner.query(`
      UPDATE "checkout"."drafts" d
      SET "members" = COALESCE((
        SELECT jsonb_object_agg(
          m.id,
          jsonb_build_object(
            'workSchedule', 'full_time',
            'customHours', NULL,
            'customFrequency', NULL
          )
        )
        FROM unnest(d."memberUserIds") AS m(id)
      ), '{}'::jsonb)
    `);
    await queryRunner.query(`
      ALTER TABLE "checkout"."drafts" DROP COLUMN IF EXISTS "memberUserIds"
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "checkout"."drafts"
      ADD COLUMN IF NOT EXISTS "memberUserIds" uuid[] NOT NULL DEFAULT '{}'
    `);
    await queryRunner.query(`
      UPDATE "checkout"."drafts" d
      SET "memberUserIds" = COALESCE((
        SELECT array_agg(k::uuid) FROM jsonb_object_keys(d."members") AS k
      ), '{}')
    `);
    await queryRunner.query(`
      ALTER TABLE "checkout"."drafts" DROP COLUMN IF EXISTS "members"
    `);
  }
}
