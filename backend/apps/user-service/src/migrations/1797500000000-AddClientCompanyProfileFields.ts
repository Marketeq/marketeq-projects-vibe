import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Adds the two client company profile fields the "Complete My Profile" steps
 * collect and that had nowhere to land: the company website and the workplace
 * values list.
 *
 * The company name already has a home in `teamName`, and the company logo
 * reuses `avatarUrl` (the client profile screen already renders the avatar as
 * the company logo), so neither needs a column here.
 *
 * Schema-qualified on purpose: an unqualified ALTER TABLE lands in `public`,
 * not the service schema.
 */
export class AddClientCompanyProfileFields1797500000000
  implements MigrationInterface
{
  name = 'AddClientCompanyProfileFields1797500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE user_service.users
        ADD COLUMN IF NOT EXISTS "companyWebsite" character varying,
        ADD COLUMN IF NOT EXISTS "workplaceValues" jsonb
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE user_service.users
        DROP COLUMN IF EXISTS "companyWebsite",
        DROP COLUMN IF EXISTS "workplaceValues"
    `);
  }
}
