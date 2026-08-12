import { MigrationInterface, QueryRunner } from "typeorm";

export class AddCertificationDoesntExpire1796500000000
  implements MigrationInterface
{
  name = 'AddCertificationDoesntExpire1796500000000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "user_service"."certifications" ADD COLUMN IF NOT EXISTS "doesntExpire" boolean NOT NULL DEFAULT false`,
    );
    // Backfill: existing certifications with no expiration date are treated as
    // "doesn't expire" so they keep the checkbox ticked. Going forward the flag
    // reflects the user's actual choice, distinct from a blank/optional date.
    await queryRunner.query(
      `UPDATE "user_service"."certifications" SET "doesntExpire" = true WHERE "expirationDate" IS NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "user_service"."certifications" DROP COLUMN IF EXISTS "doesntExpire"`,
    );
  }
}
