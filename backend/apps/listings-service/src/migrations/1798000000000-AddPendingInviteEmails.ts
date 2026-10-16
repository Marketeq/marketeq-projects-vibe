import { MigrationInterface, QueryRunner } from 'typeorm';

// QA-180/PMCM-399: emails invited (via the shared InviteWindow) but not yet
// accepted, shown as "Pending Invite" rows in the listing wizard's Team
// step. text[], not uuid[] like teamMemberIds — these are emails, not
// user ids. invitations-service has no per-listing correlation, so this
// column is the only place a specific listing's pending invites live.
export class AddPendingInviteEmails1798000000000 implements MigrationInterface {
  name = 'AddPendingInviteEmails1798000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "listings"."project" ADD COLUMN IF NOT EXISTS "pendingInviteEmails" text[] NOT NULL DEFAULT '{}'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // No-op: column addition is non-destructive
  }
}
