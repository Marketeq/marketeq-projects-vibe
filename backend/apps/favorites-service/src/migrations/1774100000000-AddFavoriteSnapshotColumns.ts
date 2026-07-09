import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddFavoriteSnapshotColumns1774100000000
  implements MigrationInterface
{
  name = 'AddFavoriteSnapshotColumns1774100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1
          FROM information_schema.tables
          WHERE table_schema = 'public' AND table_name = 'favorites'
        ) THEN
          ALTER TABLE "favorites"
          ADD COLUMN IF NOT EXISTS "snapshotDisplayName" character varying(255),
          ADD COLUMN IF NOT EXISTS "snapshotStatus" character varying(50),
          ADD COLUMN IF NOT EXISTS "snapshotUpdatedAt" TIMESTAMP,
          ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP NOT NULL DEFAULT now();
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1
          FROM information_schema.tables
          WHERE table_schema = 'public' AND table_name = 'favorite'
        ) THEN
          ALTER TABLE "favorite"
          ADD COLUMN IF NOT EXISTS "snapshotDisplayName" character varying(255),
          ADD COLUMN IF NOT EXISTS "snapshotStatus" character varying(50),
          ADD COLUMN IF NOT EXISTS "snapshotUpdatedAt" TIMESTAMP,
          ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP NOT NULL DEFAULT now();
        END IF;
      END $$;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1
          FROM information_schema.tables
          WHERE table_schema = 'public' AND table_name = 'favorites'
        ) THEN
          ALTER TABLE "favorites"
          DROP COLUMN IF EXISTS "snapshotUpdatedAt",
          DROP COLUMN IF EXISTS "snapshotStatus",
          DROP COLUMN IF EXISTS "snapshotDisplayName",
          DROP COLUMN IF EXISTS "updatedAt";
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1
          FROM information_schema.tables
          WHERE table_schema = 'public' AND table_name = 'favorite'
        ) THEN
          ALTER TABLE "favorite"
          DROP COLUMN IF EXISTS "snapshotUpdatedAt",
          DROP COLUMN IF EXISTS "snapshotStatus",
          DROP COLUMN IF EXISTS "snapshotDisplayName",
          DROP COLUMN IF EXISTS "updatedAt";
        END IF;
      END $$;
    `);
  }
}
