import { MigrationInterface, QueryRunner } from 'typeorm';

export class RollBackAffiliatedTeams1773179541765
  implements MigrationInterface
{
  name = 'RollBackAffiliatedTeams1773179541765';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "experiences" DROP CONSTRAINT "FK_experiences_user_repair"`,
    );
    await queryRunner.query(
      `ALTER TABLE "industries" DROP CONSTRAINT "FK_industries_user_repair"`,
    );
    await queryRunner.query(
      `ALTER TABLE "languages" DROP CONSTRAINT "FK_languages_user_repair"`,
    );
    await queryRunner.query(
      `ALTER TABLE "certifications" DROP CONSTRAINT "FK_certifications_user_repair"`,
    );
    await queryRunner.query(
      `ALTER TABLE "portfolio" DROP CONSTRAINT "FK_portfolio_user_repair"`,
    );
    await queryRunner.query(
      `ALTER TABLE "affiliated_teams" DROP COLUMN "createdAt"`,
    );
    await queryRunner.query(
      `ALTER TABLE "affiliated_teams" ADD "createdAt" TIMESTAMP NOT NULL DEFAULT now()`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "affiliated_teams" DROP COLUMN "createdAt"`,
    );
    await queryRunner.query(
      `ALTER TABLE "affiliated_teams" ADD "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()`,
    );
    await queryRunner.query(
      `ALTER TABLE "portfolio" ADD CONSTRAINT "FK_portfolio_user_repair" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "certifications" ADD CONSTRAINT "FK_certifications_user_repair" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "languages" ADD CONSTRAINT "FK_languages_user_repair" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "industries" ADD CONSTRAINT "FK_industries_user_repair" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "experiences" ADD CONSTRAINT "FK_experiences_user_repair" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }
}
