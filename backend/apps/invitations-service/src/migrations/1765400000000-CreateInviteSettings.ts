import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Creates `invite_settings`, the storage behind Manage Invite Settings.
 *
 * The panel has shipped in the frontend for some time with every control held
 * in local `useState` and a Save button that only closed the panel, so nothing
 * it offered was ever persisted or enforced. R3-02 moves account-wide invite
 * settings in scope (WD-09), and this is the table they live in.
 *
 * One row per client account, keyed by the same id invitations carry as
 * `team_id`. No row is created until a setting is changed; InviteSettingsService
 * answers reads for an absent row from the column defaults below, so the
 * defaults here and the service's are the same values by construction.
 */
export class CreateInviteSettings1765400000000 implements MigrationInterface {
  name = 'CreateInviteSettings1765400000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE IF NOT EXISTS "invite_settings" (
        "account_id" uuid NOT NULL,
        "user_tracking" boolean NOT NULL DEFAULT false,
        "guest_sharing" boolean NOT NULL DEFAULT false,
        "access_restricted" boolean NOT NULL DEFAULT false,
        "access_level" text NOT NULL DEFAULT 'anyone',
        "link_expiration_enabled" boolean NOT NULL DEFAULT true,
        "link_expiration_preset" text NOT NULL DEFAULT '30d',
        "link_expires_at" TIMESTAMP WITH TIME ZONE,
        "password_enabled" boolean NOT NULL DEFAULT false,
        "password_hash" character varying(255),
        "notification_alerts" boolean NOT NULL DEFAULT true,
        "embed_code" boolean NOT NULL DEFAULT false,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_invite_settings_account_id" PRIMARY KEY ("account_id"),
        CONSTRAINT "CHK_invite_settings_access_level"
          CHECK ("access_level" IN ('anyone', 'invited_guests', 'owner_only')),
        CONSTRAINT "CHK_invite_settings_expiration_preset"
          CHECK ("link_expiration_preset" IN ('15d', '30d', '90d', 'custom')),
        CONSTRAINT "CHK_invite_settings_custom_needs_date"
          CHECK (
            "link_expiration_enabled" = false
            OR "link_expiration_preset" <> 'custom'
            OR "link_expires_at" IS NOT NULL
          )
      )`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "invite_settings"`);
  }
}
