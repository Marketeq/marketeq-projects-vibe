import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Brings the live DB in line with DOCUMENT 02 / entities:
 * `favorite_groups` + `favorites` (plural).
 *
 * `migration:generate` against a DB that still has singular tables produced
 * CREATE TABLE statements that would duplicate schema — this migration instead
 * renames in place (preserves data + FKs).
 */
export class AlignPluralFavoritesTables1774306429552
  implements MigrationInterface
{
  name = 'AlignPluralFavoritesTables1774306429552';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1 FROM information_schema.tables
          WHERE table_schema = 'public' AND table_name = 'favorite_group'
        ) AND NOT EXISTS (
          SELECT 1 FROM information_schema.tables
          WHERE table_schema = 'public' AND table_name = 'favorite_groups'
        ) THEN
          ALTER TABLE "favorite_group" RENAME TO "favorite_groups";
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1 FROM information_schema.tables
          WHERE table_schema = 'public' AND table_name = 'favorite'
        ) AND NOT EXISTS (
          SELECT 1 FROM information_schema.tables
          WHERE table_schema = 'public' AND table_name = 'favorites'
        ) THEN
          ALTER TABLE "favorite" RENAME TO "favorites";
        END IF;
      END $$;
    `);

    // TypeORM default enum name for table "favorites" column "type"
    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1 FROM pg_type t
          JOIN pg_namespace n ON n.oid = t.typnamespace
          WHERE t.typname = 'favorite_type_enum' AND n.nspname = 'public'
        ) AND NOT EXISTS (
          SELECT 1 FROM pg_type t
          JOIN pg_namespace n ON n.oid = t.typnamespace
          WHERE t.typname = 'favorites_type_enum' AND n.nspname = 'public'
        ) THEN
          ALTER TYPE "public"."favorite_type_enum" RENAME TO "favorites_type_enum";
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_schema = 'public' AND table_name = 'favorites' AND column_name = 'userSub'
        ) THEN
          ALTER TABLE "favorites" DROP COLUMN "userSub";
        END IF;
      END $$;
    `);

    // Keep userId as varchar if seed/dev rows are not UUID-shaped (e.g. "test-user-ai").
    // TypeORM @Column('uuid') still maps cleanly for real UUID strings.
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1 FROM pg_type t
          JOIN pg_namespace n ON n.oid = t.typnamespace
          WHERE t.typname = 'favorites_type_enum' AND n.nspname = 'public'
        ) AND NOT EXISTS (
          SELECT 1 FROM pg_type t
          JOIN pg_namespace n ON n.oid = t.typnamespace
          WHERE t.typname = 'favorite_type_enum' AND n.nspname = 'public'
        ) THEN
          ALTER TYPE "public"."favorites_type_enum" RENAME TO "favorite_type_enum";
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1 FROM information_schema.tables
          WHERE table_schema = 'public' AND table_name = 'favorites'
        ) AND NOT EXISTS (
          SELECT 1 FROM information_schema.tables
          WHERE table_schema = 'public' AND table_name = 'favorite'
        ) THEN
          ALTER TABLE "favorites" RENAME TO "favorite";
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1 FROM information_schema.tables
          WHERE table_schema = 'public' AND table_name = 'favorite_groups'
        ) AND NOT EXISTS (
          SELECT 1 FROM information_schema.tables
          WHERE table_schema = 'public' AND table_name = 'favorite_group'
        ) THEN
          ALTER TABLE "favorite_groups" RENAME TO "favorite_group";
        END IF;
      END $$;
    `);
  }
}
