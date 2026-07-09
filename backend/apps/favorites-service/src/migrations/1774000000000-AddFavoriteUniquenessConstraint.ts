import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddFavoriteUniquenessConstraint1774000000000
  implements MigrationInterface
{
  name = 'AddFavoriteUniquenessConstraint1774000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Support both table names during migration drift cleanup.
    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1
          FROM information_schema.tables
          WHERE table_schema = 'public' AND table_name = 'favorites'
        ) THEN
          CREATE UNIQUE INDEX IF NOT EXISTS "IDX_favorites_user_type_item_unique"
          ON "favorites" ("userId", "type", "itemId");
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
          CREATE UNIQUE INDEX IF NOT EXISTS "IDX_favorite_user_type_item_unique"
          ON "favorite" ("userId", "type", "itemId");
        END IF;
      END $$;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "public"."IDX_favorites_user_type_item_unique"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "public"."IDX_favorite_user_type_item_unique"`,
    );
  }
}
