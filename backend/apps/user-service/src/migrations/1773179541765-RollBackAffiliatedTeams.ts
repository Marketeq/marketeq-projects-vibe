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
      `ALTER TABLE "affiliated_teams" DROP COLUMN IF EXISTS "createdAt"`,
    );
    await queryRunner.query(
      `ALTER TABLE "affiliated_teams" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP NOT NULL DEFAULT now()`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "affiliated_teams" DROP COLUMN IF EXISTS "createdAt"`,
    );
    await queryRunner.query(
      `ALTER TABLE "affiliated_teams" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()`,
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
