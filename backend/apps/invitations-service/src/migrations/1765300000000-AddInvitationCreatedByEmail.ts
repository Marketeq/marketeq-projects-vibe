import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Adds the `created_by_email` column that Invitation has declared since the
 * company-scoped team invitations change (a6c801ac) but that no migration ever
 * created, so every query selecting it failed with
 * `column i.created_by_email does not exist`.
 *
 * Nullable with no backfill: the column only ever caches the inviter's email at
 * send time, and InvitationsService already falls back to the looked-up
 * inviter's email when it is null, so existing rows keep resolving correctly.
 */
export class AddInvitationCreatedByEmail1765300000000
  implements MigrationInterface
{
  name = 'AddInvitationCreatedByEmail1765300000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "invitations" ADD COLUMN IF NOT EXISTS "created_by_email" text`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "invitations" DROP COLUMN IF EXISTS "created_by_email"`,
    );
  }
}
