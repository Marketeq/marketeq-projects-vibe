import { MigrationInterface, QueryRunner } from "typeorm";

export class AddUserProfileColumns1772000000000 implements MigrationInterface {
    name = 'AddUserProfileColumns1772000000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            DO $$ BEGIN
                IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'users_role_enum') THEN
                    CREATE TYPE "users_role_enum" AS ENUM ('ADMIN','TALENT','CLIENT');
                END IF;
            END $$;
        `);

        await queryRunner.query(`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "password" character varying NOT NULL DEFAULT ''`);
        await queryRunner.query(`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "overview" text`);
        await queryRunner.query(`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "firstName" character varying`);
        await queryRunner.query(`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "lastName" character varying`);
        await queryRunner.query(`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "avatarUrl" character varying`);
        await queryRunner.query(`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "language" character varying`);
        await queryRunner.query(`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "recentJobTitle" character varying`);
        await queryRunner.query(`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "industriesWorkedIn" character varying`);
        await queryRunner.query(`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "lookingToWorkWith" text`);
        await queryRunner.query(`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "projectTypes" text`);
        await queryRunner.query(`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "isStudent" boolean NOT NULL DEFAULT false`);
        await queryRunner.query(`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "customAvailability" jsonb`);
        await queryRunner.query(`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "role" "users_role_enum" NOT NULL DEFAULT 'CLIENT'`);
        await queryRunner.query(`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "onboardingDismissed" boolean NOT NULL DEFAULT false`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "onboardingDismissed"`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "role"`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "customAvailability"`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "isStudent"`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "projectTypes"`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "lookingToWorkWith"`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "industriesWorkedIn"`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "recentJobTitle"`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "language"`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "avatarUrl"`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "lastName"`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "firstName"`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "overview"`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "password"`);

        await queryRunner.query(`
            DO $$ BEGIN
                IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'users_role_enum') THEN
                    DROP TYPE "users_role_enum";
                END IF;
            END $$;
        `);
    }
}
