import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddFavoriteGroupTypeColumn1774500000000
  implements MigrationInterface
{
  name = 'AddFavoriteGroupTypeColumn1774500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$
      DECLARE
        enum_typename name;
      BEGIN
        SELECT t.typname INTO enum_typename
        FROM pg_attribute a
        JOIN pg_class c ON c.oid = a.attrelid
        JOIN pg_namespace n ON n.oid = c.relnamespace
        JOIN pg_type t ON t.oid = a.atttypid
        WHERE n.nspname = 'public'
          AND c.relname = 'favorites'
          AND a.attname = 'type'
          AND NOT a.attisdropped;

        IF enum_typename IS NULL THEN
          RAISE EXCEPTION 'Could not resolve enum for favorites.type';
        END IF;

        IF EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_schema = 'public'
            AND table_name = 'favorite_groups'
            AND column_name = 'type'
        ) THEN
          RETURN;
        END IF;

        EXECUTE format(
          'ALTER TABLE "favorite_groups" ADD COLUMN "type" "public".%I NOT NULL DEFAULT ''project''::"public".%I',
          enum_typename,
          enum_typename
        );
      END $$;
    `);

    await queryRunner.query(`
      UPDATE "favorite_groups" fg
      SET "type" = sub."type"
      FROM (
        SELECT DISTINCT ON ("groupId") "groupId", "type"
        FROM "favorites"
        ORDER BY "groupId", "createdAt" ASC
      ) AS sub
      WHERE fg."id" = sub."groupId"
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "favorite_groups" DROP COLUMN IF EXISTS "type"
    `);
  }
}
