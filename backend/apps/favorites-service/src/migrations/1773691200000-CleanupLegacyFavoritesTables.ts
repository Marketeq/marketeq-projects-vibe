import { MigrationInterface, QueryRunner } from 'typeorm';

export class CleanupLegacyFavoritesTables1773691200000
  implements MigrationInterface
{
  name = 'CleanupLegacyFavoritesTables1773691200000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Move data from legacy plural group table if it exists.
    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1
          FROM information_schema.tables
          WHERE table_schema = 'public' AND table_name = 'favorite_groups'
        ) THEN
          INSERT INTO "favorite_group" ("id", "userId", "name", "createdAt", "updatedAt")
          SELECT fg."id", fg."userId"::text, fg."name", fg."createdAt", COALESCE(fg."updatedAt", fg."createdAt")
          FROM "favorite_groups" fg
          ON CONFLICT ("id") DO NOTHING;
        END IF;
      END $$;
    `);

    // Move data from legacy plural favorites table if it exists.
    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1
          FROM information_schema.tables
          WHERE table_schema = 'public' AND table_name = 'favorites'
        ) THEN
          INSERT INTO "favorite" ("id", "userId", "userSub", "groupId", "type", "itemId", "createdAt", "updatedAt")
          SELECT f."id",
                 f."userId"::text,
                 f."userId"::text,
                 f."groupId",
                 f."type"::text::"favorite_type_enum",
                 f."itemId",
                 f."createdAt",
                 f."createdAt"
          FROM "favorites" f
          ON CONFLICT ("id") DO NOTHING;
        END IF;
      END $$;
    `);

    // Drop old FK first when present, then old tables/type.
    await queryRunner.query(
      `ALTER TABLE IF EXISTS "favorites" DROP CONSTRAINT IF EXISTS "FK_522952c2afbf691468d0f233bf1"`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "favorites"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "favorite_groups"`);
    await queryRunner.query(
      `DROP TYPE IF EXISTS "public"."favorites_type_enum"`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_type t
          JOIN pg_namespace n ON n.oid = t.typnamespace
          WHERE t.typname = 'favorites_type_enum' AND n.nspname = 'public'
        ) THEN
          CREATE TYPE "public"."favorites_type_enum" AS ENUM('talent', 'project', 'service', 'job', 'team');
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "favorite_groups" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "name" character varying(100) NOT NULL,
        "userId" uuid NOT NULL,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_ff86891fccb555984e16043342f" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "favorites" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "userId" uuid NOT NULL,
        "groupId" uuid NOT NULL,
        "type" "public"."favorites_type_enum" NOT NULL,
        "itemId" character varying(100) NOT NULL,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_890818d27523748dd36a4d1bdc8" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      ALTER TABLE "favorites"
      ADD CONSTRAINT "FK_522952c2afbf691468d0f233bf1"
      FOREIGN KEY ("groupId") REFERENCES "favorite_groups"("id")
      ON DELETE CASCADE ON UPDATE NO ACTION
    `);
  }
}
