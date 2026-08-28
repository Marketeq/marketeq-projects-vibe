import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * The actual create-table migration for `invitations`. `InitSchema1710000000000`
 * is a no-op left over from when this service relied on `synchronize: true`
 * in dev, and a fresh database never got the `invitations` table or the
 * `invitation_status` enum from it. This migration creates both, matching
 * the schema as it stood before `AddInvitationNote` / `AddInviteeUserId`
 * (which run after this one and add their own columns via
 * `ADD COLUMN IF NOT EXISTS`, so they stay correct whether they're adding to
 * a table this migration just created or one that already existed via
 * synchronize).
 */
export class CreateInvitationsSchema1711000000000 implements MigrationInterface {
  name = 'CreateInvitationsSchema1711000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'invitation_status') THEN
          CREATE TYPE "invitation_status" AS ENUM ('pending', 'accepted', 'canceled', 'expired');
        END IF;
      END $$;
    `);

    await queryRunner.query(
      `CREATE TABLE IF NOT EXISTS "invitations" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "team_id" uuid NOT NULL,
        "team_name" character varying,
        "invited_email" text NOT NULL,
        "role" text NOT NULL,
        "status" "invitation_status" NOT NULL DEFAULT 'pending',
        "token" text NOT NULL,
        "expires_at" TIMESTAMP WITH TIME ZONE NOT NULL,
        "created_by_user_id" uuid NOT NULL,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "accepted_at" TIMESTAMP WITH TIME ZONE,
        "canceled_at" TIMESTAMP WITH TIME ZONE,
        "resent_count" integer NOT NULL DEFAULT 0,
        CONSTRAINT "PK_invitations_id" PRIMARY KEY ("id")
      )`,
    );

    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_invitations_team_id" ON "invitations" ("team_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_invitations_invited_email" ON "invitations" ("invited_email")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_invitations_token" ON "invitations" ("token")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_invitations_team_email_status"
       ON "invitations" ("team_id", "invited_email", "status")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_invitations_team_email_status"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_invitations_token"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_invitations_invited_email"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_invitations_team_id"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "invitations"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "invitation_status"`);
  }
}
