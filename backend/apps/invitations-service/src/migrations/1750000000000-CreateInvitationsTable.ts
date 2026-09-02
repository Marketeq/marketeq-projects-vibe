import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateInvitationsTable1750000000000 implements MigrationInterface {
  name = 'CreateInvitationsTable1750000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "invitations" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "team_id" uuid NOT NULL,
        "team_name" text,
        "invited_email" text NOT NULL,
        "role" text NOT NULL,
        "status" text NOT NULL DEFAULT 'pending' CHECK ("status" IN ('pending','accepted','canceled','expired')),
        "token" text NOT NULL,
        "expires_at" timestamptz NOT NULL,
        "created_by_user_id" uuid NOT NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        "accepted_at" timestamptz,
        "canceled_at" timestamptz,
        "resent_count" int NOT NULL DEFAULT 0
      )
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_invitations_team_id" ON "invitations" ("team_id")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_invitations_invited_email" ON "invitations" ("invited_email")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_invitations_token" ON "invitations" ("token")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "invitations"`);
  }
}
