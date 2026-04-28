import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddFavoritesModule1773075111015 implements MigrationInterface {
  name = 'AddFavoritesModule1773075111015';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_type WHERE typname = 'favorites_listingtype_enum'
        ) THEN
          CREATE TYPE "public"."favorites_listingtype_enum" AS ENUM('project', 'service', 'job', 'team');
        END IF;
      END $$;`,
    );
    await queryRunner.query(
      `CREATE TABLE IF NOT EXISTS "favorites" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "listingId" character varying NOT NULL, "listingType" "public"."favorites_listingtype_enum" NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "userId" uuid NOT NULL, CONSTRAINT "PK_890818d27523748dd36a4d1bdc8" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'FK_e747534006c6e3c2f09939da60f'
        ) THEN
          ALTER TABLE "favorites" ADD CONSTRAINT "FK_e747534006c6e3c2f09939da60f" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
        END IF;
      END $$;`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "favorites" DROP CONSTRAINT IF EXISTS "FK_e747534006c6e3c2f09939da60f"`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "favorites"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "public"."favorites_listingtype_enum"`);
  }
}
