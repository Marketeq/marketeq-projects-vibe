import { MigrationInterface, QueryRunner } from 'typeorm';

export class RollBackAffiliatedTeams1773179541765
  implements MigrationInterface
{
  name = 'RollBackAffiliatedTeams1773179541765';

  private isLegacyOwnershipIssue(error: unknown): boolean {
    const message = error instanceof Error ? error.message : String(error);
    return /must be owner of table|permission denied|insufficient privilege|object not in prerequisite state/i.test(
      message,
    );
  }

  private async runBestEffort(
    queryRunner: QueryRunner,
    sql: string,
    notice: string,
  ): Promise<void> {
    try {
      await queryRunner.query(sql);
    } catch (error) {
      if (!this.isLegacyOwnershipIssue(error)) {
        throw error;
      }

      const message = error instanceof Error ? error.message : String(error);
      console.warn(`[${this.name}] ${notice}: ${message}`);
    }
  }

  public async up(queryRunner: QueryRunner): Promise<void> {
    await this.runBestEffort(
      queryRunner,
      `ALTER TABLE "experiences" DROP CONSTRAINT IF EXISTS "FK_experiences_user_repair"`,
      'Skipping legacy experiences repair foreign-key drop',
    );
    await this.runBestEffort(
      queryRunner,
      `ALTER TABLE "industries" DROP CONSTRAINT IF EXISTS "FK_industries_user_repair"`,
      'Skipping legacy industries repair foreign-key drop',
    );
    await this.runBestEffort(
      queryRunner,
      `ALTER TABLE "languages" DROP CONSTRAINT IF EXISTS "FK_languages_user_repair"`,
      'Skipping legacy languages repair foreign-key drop',
    );
    await this.runBestEffort(
      queryRunner,
      `ALTER TABLE "certifications" DROP CONSTRAINT IF EXISTS "FK_certifications_user_repair"`,
      'Skipping legacy certifications repair foreign-key drop',
    );
    await this.runBestEffort(
      queryRunner,
      `ALTER TABLE "portfolio" DROP CONSTRAINT IF EXISTS "FK_portfolio_user_repair"`,
      'Skipping legacy portfolio repair foreign-key drop',
    );
    await this.runBestEffort(
      queryRunner,
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
      'Skipping legacy affiliated_teams.createdAt rollback normalization',
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await this.runBestEffort(
      queryRunner,
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
      'Skipping legacy affiliated_teams.createdAt restore normalization',
    );
    await this.runBestEffort(
      queryRunner,
      `DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'FK_portfolio_user_repair'
        ) THEN
          BEGIN
            ALTER TABLE "portfolio" ADD CONSTRAINT "FK_portfolio_user_repair" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
          EXCEPTION
            WHEN insufficient_privilege OR object_not_in_prerequisite_state THEN
              RAISE NOTICE 'Skipping portfolio repair foreign key due to ownership mismatch';
          END;
        END IF;
      END $$;`,
      'Skipping legacy portfolio repair foreign-key restore',
    );
    await this.runBestEffort(
      queryRunner,
      `DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'FK_certifications_user_repair'
        ) THEN
          BEGIN
            ALTER TABLE "certifications" ADD CONSTRAINT "FK_certifications_user_repair" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
          EXCEPTION
            WHEN insufficient_privilege OR object_not_in_prerequisite_state THEN
              RAISE NOTICE 'Skipping certifications repair foreign key due to ownership mismatch';
          END;
        END IF;
      END $$;`,
      'Skipping legacy certifications repair foreign-key restore',
    );
    await this.runBestEffort(
      queryRunner,
      `DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'FK_languages_user_repair'
        ) THEN
          BEGIN
            ALTER TABLE "languages" ADD CONSTRAINT "FK_languages_user_repair" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
          EXCEPTION
            WHEN insufficient_privilege OR object_not_in_prerequisite_state THEN
              RAISE NOTICE 'Skipping languages repair foreign key due to ownership mismatch';
          END;
        END IF;
      END $$;`,
      'Skipping legacy languages repair foreign-key restore',
    );
    await this.runBestEffort(
      queryRunner,
      `DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'FK_industries_user_repair'
        ) THEN
          BEGIN
            ALTER TABLE "industries" ADD CONSTRAINT "FK_industries_user_repair" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
          EXCEPTION
            WHEN insufficient_privilege OR object_not_in_prerequisite_state THEN
              RAISE NOTICE 'Skipping industries repair foreign key due to ownership mismatch';
          END;
        END IF;
      END $$;`,
      'Skipping legacy industries repair foreign-key restore',
    );
    await this.runBestEffort(
      queryRunner,
      `DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'FK_experiences_user_repair'
        ) THEN
          BEGIN
            ALTER TABLE "experiences" ADD CONSTRAINT "FK_experiences_user_repair" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
          EXCEPTION
            WHEN insufficient_privilege OR object_not_in_prerequisite_state THEN
              RAISE NOTICE 'Skipping experiences repair foreign key due to ownership mismatch';
          END;
        END IF;
      END $$;`,
      'Skipping legacy experiences repair foreign-key restore',
    );
  }
}
