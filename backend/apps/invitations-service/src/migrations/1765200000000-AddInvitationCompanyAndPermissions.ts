import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Adds company awareness and hashed-token support to `invitations`, for the
 * MyTeam epic. Additive and reversible: `token` becomes nullable (never
 * dropped) so pre-existing plaintext-token invitations keep working via the
 * legacy fallback in InvitationsService.accept; `token_hash` and
 * `permissions` are new nullable/defaulted columns.
 */
export class AddInvitationCompanyAndPermissions1765200000000
  implements MigrationInterface
{
  name = 'AddInvitationCompanyAndPermissions1765200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "invitations" ADD COLUMN IF NOT EXISTS "company_id" uuid`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_invitations_company_id" ON "invitations" ("company_id")`,
    );

    await queryRunner.query(
      `ALTER TABLE "invitations" ADD COLUMN IF NOT EXISTS "permissions" text[] NOT NULL DEFAULT '{}'`,
    );

    await queryRunner.query(
      `ALTER TABLE "invitations" ADD COLUMN IF NOT EXISTS "token_hash" character varying(255)`,
    );

    // token is no longer written for new invitations (see token_hash above)
    // but existing pending rows still rely on it for the legacy accept path.
    await queryRunner.query(
      `ALTER TABLE "invitations" ALTER COLUMN "token" DROP NOT NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Reverting NOT NULL would fail if any row was created post-migration
    // with a null token (token_hash-only invitations); leave it nullable.
    await queryRunner.query(
      `ALTER TABLE "invitations" DROP COLUMN IF EXISTS "token_hash"`,
    );
    await queryRunner.query(
      `ALTER TABLE "invitations" DROP COLUMN IF EXISTS "permissions"`,
    );
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_invitations_company_id"`);
    await queryRunner.query(
      `ALTER TABLE "invitations" DROP COLUMN IF EXISTS "company_id"`,
    );
  }
}
