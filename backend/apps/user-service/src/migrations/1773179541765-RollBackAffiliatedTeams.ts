import { MigrationInterface, QueryRunner } from 'typeorm';

export class RollBackAffiliatedTeams1773179541765
  implements MigrationInterface
{
  name = 'RollBackAffiliatedTeams1773179541765';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "experiences" DROP CONSTRAINT IF EXISTS "FK_experiences_user_repair"`,
    );
    await queryRunner.query(
      `ALTER TABLE "industries" DROP CONSTRAINT IF EXISTS "FK_industries_user_repair"`,
    );
    await queryRunner.query(
      `ALTER TABLE "languages" DROP CONSTRAINT IF EXISTS "FK_languages_user_repair"`,
    );
    await queryRunner.query(
      `ALTER TABLE "certifications" DROP CONSTRAINT IF EXISTS "FK_certifications_user_repair"`,
    );
    await queryRunner.query(
      `ALTER TABLE "portfolio" DROP CONSTRAINT IF EXISTS "FK_portfolio_user_repair"`,
    );
    await queryRunner.query(
      `DO $$
      DECLARE
        created_type text;
      BEGIN
        SELECT c.udt_name
        INTO created_type
        FROM information_schema.columns c
        WHERE c.table_schema = 'public'
          AND c.table_name = 'affiliated_teams'
          AND c.column_name = 'createdAt';

        IF created_type IS NULL THEN
          ALTER TABLE "affiliated_teams" ADD COLUMN "createdAt" TIMESTAMP NOT NULL DEFAULT now();
        ELSIF created_type = 'timestamptz' THEN
          ALTER TABLE "affiliated_teams"
          ALTER COLUMN "createdAt" TYPE TIMESTAMP
          USING ("createdAt" AT TIME ZONE 'UTC');
        END IF;

        UPDATE "affiliated_teams" SET "createdAt" = now() WHERE "createdAt" IS NULL;
        ALTER TABLE "affiliated_teams" ALTER COLUMN "createdAt" SET DEFAULT now();
        ALTER TABLE "affiliated_teams" ALTER COLUMN "createdAt" SET NOT NULL;
      END $$;`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DO $$
      DECLARE
        created_type text;
      BEGIN
        SELECT c.udt_name
        INTO created_type
        FROM information_schema.columns c
        WHERE c.table_schema = 'public'
          AND c.table_name = 'affiliated_teams'
          AND c.column_name = 'createdAt';

        IF created_type IS NULL THEN
          ALTER TABLE "affiliated_teams" ADD COLUMN "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now();
        ELSIF created_type = 'timestamp' THEN
          ALTER TABLE "affiliated_teams"
          ALTER COLUMN "createdAt" TYPE TIMESTAMP WITH TIME ZONE
          USING ("createdAt" AT TIME ZONE 'UTC');
        END IF;

        UPDATE "affiliated_teams" SET "createdAt" = now() WHERE "createdAt" IS NULL;
        ALTER TABLE "affiliated_teams" ALTER COLUMN "createdAt" SET DEFAULT now();
        ALTER TABLE "affiliated_teams" ALTER COLUMN "createdAt" SET NOT NULL;
      END $$;`,
    );
    await queryRunner.query(
      `DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'FK_portfolio_user_repair'
        ) THEN
          ALTER TABLE "portfolio" ADD CONSTRAINT "FK_portfolio_user_repair" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
        END IF;
      END $$;`,
    );
    await queryRunner.query(
      `DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'FK_certifications_user_repair'
        ) THEN
          ALTER TABLE "certifications" ADD CONSTRAINT "FK_certifications_user_repair" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
        END IF;
      END $$;`,
    );
    await queryRunner.query(
      `DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'FK_languages_user_repair'
        ) THEN
          ALTER TABLE "languages" ADD CONSTRAINT "FK_languages_user_repair" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
        END IF;
      END $$;`,
    );
    await queryRunner.query(
      `DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'FK_industries_user_repair'
        ) THEN
          ALTER TABLE "industries" ADD CONSTRAINT "FK_industries_user_repair" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
        END IF;
      END $$;`,
    );
    await queryRunner.query(
      `DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'FK_experiences_user_repair'
        ) THEN
          ALTER TABLE "experiences" ADD CONSTRAINT "FK_experiences_user_repair" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
        END IF;
      END $$;`,
    );
  }
}
