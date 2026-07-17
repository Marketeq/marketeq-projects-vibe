import { MigrationInterface, QueryRunner } from "typeorm";

export class AddExperienceRelation1770156537621 implements MigrationInterface {
    name = 'AddExperienceRelation1770156537621'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX IF EXISTS "public"."IDX_mte_user_startAt"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "public"."IDX_screenshots_user_takenAt"`);
        await queryRunner.query(`ALTER TABLE "manual_time_entries" DROP CONSTRAINT IF EXISTS "CHK_mte_time"`);
        await queryRunner.query(`ALTER TABLE "screenshots" DROP CONSTRAINT IF EXISTS "screenshots_activityPercent_check"`);
        await queryRunner.query(`
            DO $$
            DECLARE
                created_type text;
                updated_type text;
            BEGIN
                SELECT c.udt_name
                INTO created_type
                FROM information_schema.columns c
                WHERE c.table_schema = 'public'
                  AND c.table_name = 'screenshots'
                  AND c.column_name = 'createdAt';

                IF created_type IS NULL THEN
                    ALTER TABLE "screenshots" ADD COLUMN "createdAt" TIMESTAMP NOT NULL DEFAULT now();
                ELSIF created_type = 'timestamptz' THEN
                    ALTER TABLE "screenshots"
                    ALTER COLUMN "createdAt" TYPE TIMESTAMP
                    USING ("createdAt" AT TIME ZONE 'UTC');
                END IF;

                UPDATE "screenshots" SET "createdAt" = now() WHERE "createdAt" IS NULL;
                ALTER TABLE "screenshots" ALTER COLUMN "createdAt" SET DEFAULT now();
                ALTER TABLE "screenshots" ALTER COLUMN "createdAt" SET NOT NULL;

                SELECT c.udt_name
                INTO updated_type
                FROM information_schema.columns c
                WHERE c.table_schema = 'public'
                  AND c.table_name = 'screenshots'
                  AND c.column_name = 'updatedAt';

                IF updated_type IS NULL THEN
                    ALTER TABLE "screenshots" ADD COLUMN "updatedAt" TIMESTAMP NOT NULL DEFAULT now();
                ELSIF updated_type = 'timestamptz' THEN
                    ALTER TABLE "screenshots"
                    ALTER COLUMN "updatedAt" TYPE TIMESTAMP
                    USING ("updatedAt" AT TIME ZONE 'UTC');
                END IF;

                UPDATE "screenshots" SET "updatedAt" = now() WHERE "updatedAt" IS NULL;
                ALTER TABLE "screenshots" ALTER COLUMN "updatedAt" SET DEFAULT now();
                ALTER TABLE "screenshots" ALTER COLUMN "updatedAt" SET NOT NULL;
            END $$;
        `);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_0d6e0895920837c762ab067a23" ON "manual_time_entries" ("userId") `);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_12dfc9cd09dde692224456e1b2" ON "manual_time_entries" ("startAt") `);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_8fb78c3c2d0f5c8f322187e1f1" ON "manual_time_entries" ("endAt") `);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_506e12c316e5c4b0197bf3f188" ON "manual_time_entries" ("approved") `);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_f01e0b50926889409e89203874" ON "screenshots" ("userId") `);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_ce039c18fc12a6ca744379604a" ON "screenshots" ("projectId") `);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_51cc04701bb431a73aed4f7b49" ON "screenshots" ("taskId") `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX IF EXISTS "public"."IDX_51cc04701bb431a73aed4f7b49"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "public"."IDX_ce039c18fc12a6ca744379604a"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "public"."IDX_f01e0b50926889409e89203874"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "public"."IDX_506e12c316e5c4b0197bf3f188"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "public"."IDX_8fb78c3c2d0f5c8f322187e1f1"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "public"."IDX_12dfc9cd09dde692224456e1b2"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "public"."IDX_0d6e0895920837c762ab067a23"`);
        await queryRunner.query(`
            DO $$
            DECLARE
                created_type text;
                updated_type text;
            BEGIN
                SELECT c.udt_name
                INTO updated_type
                FROM information_schema.columns c
                WHERE c.table_schema = 'public'
                  AND c.table_name = 'screenshots'
                  AND c.column_name = 'updatedAt';

                IF updated_type IS NULL THEN
                    ALTER TABLE "screenshots" ADD COLUMN "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now();
                ELSIF updated_type = 'timestamp' THEN
                    ALTER TABLE "screenshots"
                    ALTER COLUMN "updatedAt" TYPE TIMESTAMP WITH TIME ZONE
                    USING ("updatedAt" AT TIME ZONE 'UTC');
                END IF;

                UPDATE "screenshots" SET "updatedAt" = now() WHERE "updatedAt" IS NULL;
                ALTER TABLE "screenshots" ALTER COLUMN "updatedAt" SET DEFAULT now();
                ALTER TABLE "screenshots" ALTER COLUMN "updatedAt" SET NOT NULL;

                SELECT c.udt_name
                INTO created_type
                FROM information_schema.columns c
                WHERE c.table_schema = 'public'
                  AND c.table_name = 'screenshots'
                  AND c.column_name = 'createdAt';

                IF created_type IS NULL THEN
                    ALTER TABLE "screenshots" ADD COLUMN "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now();
                ELSIF created_type = 'timestamp' THEN
                    ALTER TABLE "screenshots"
                    ALTER COLUMN "createdAt" TYPE TIMESTAMP WITH TIME ZONE
                    USING ("createdAt" AT TIME ZONE 'UTC');
                END IF;

                UPDATE "screenshots" SET "createdAt" = now() WHERE "createdAt" IS NULL;
                ALTER TABLE "screenshots" ALTER COLUMN "createdAt" SET DEFAULT now();
                ALTER TABLE "screenshots" ALTER COLUMN "createdAt" SET NOT NULL;
            END $$;
        `);
        await queryRunner.query(`ALTER TABLE "screenshots" DROP CONSTRAINT IF EXISTS "screenshots_activityPercent_check"`);
        await queryRunner.query(`ALTER TABLE "screenshots" ADD CONSTRAINT "screenshots_activityPercent_check" CHECK ((("activityPercent" >= 0) AND ("activityPercent" <= 100)))`);
        await queryRunner.query(`ALTER TABLE "manual_time_entries" DROP CONSTRAINT IF EXISTS "CHK_mte_time"`);
        await queryRunner.query(`ALTER TABLE "manual_time_entries" ADD CONSTRAINT "CHK_mte_time" CHECK (("endAt" > "startAt"))`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_screenshots_user_takenAt" ON "screenshots" ("userId", "takenAt") `);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_mte_user_startAt" ON "manual_time_entries" ("userId", "startAt") `);
    }

}
