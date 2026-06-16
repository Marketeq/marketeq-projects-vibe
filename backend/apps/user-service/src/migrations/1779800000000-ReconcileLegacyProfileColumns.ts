import { MigrationInterface, QueryRunner } from "typeorm";

export class ReconcileLegacyProfileColumns1779800000000 implements MigrationInterface {
    name = 'ReconcileLegacyProfileColumns1779800000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Ensure current entity columns exist. On supabase-live they are present (hand-patched);
        // IF NOT EXISTS makes this a no-op there. On fresh DBs without the hand-patch, this adds them.
        // Types/defaults intentionally match supabase-live state so IF NOT EXISTS skips silently.
        await queryRunner.query(`
            ALTER TABLE "user_service"."education"
            ADD COLUMN IF NOT EXISTS "school"       character varying DEFAULT '',
            ADD COLUMN IF NOT EXISTS "fieldOfStudy" character varying DEFAULT '',
            ADD COLUMN IF NOT EXISTS "startYear"    integer DEFAULT 2020,
            ADD COLUMN IF NOT EXISTS "startMonth"   integer,
            ADD COLUMN IF NOT EXISTS "endYear"      integer,
            ADD COLUMN IF NOT EXISTS "endMonth"     integer,
            ADD COLUMN IF NOT EXISTS "isCurrent"    boolean DEFAULT false
        `);
        await queryRunner.query(`
            ALTER TABLE "user_service"."experience"
            ADD COLUMN IF NOT EXISTS "title"         character varying DEFAULT '',
            ADD COLUMN IF NOT EXISTS "location"      text,
            ADD COLUMN IF NOT EXISTS "isCurrentRole" boolean DEFAULT false,
            ADD COLUMN IF NOT EXISTS "industryType"  character varying,
            ADD COLUMN IF NOT EXISTS "skills"        text[]
        `);
        await queryRunner.query(`
            ALTER TABLE "user_service"."user_industries"
            ADD COLUMN IF NOT EXISTS "industry"          character varying DEFAULT '',
            ADD COLUMN IF NOT EXISTS "yearsOfExperience" integer,
            ADD COLUMN IF NOT EXISTS "description"       text
        `);

        // Backfill new columns from legacy values, then drop legacy NOT NULL constraints.
        // Wrapped in DO blocks so fresh DBs (without legacy columns) skip cleanly.

        // experience: legacy `role` -> entity `title`
        await queryRunner.query(`
            DO $$
            BEGIN
                IF EXISTS (SELECT 1 FROM information_schema.columns
                           WHERE table_schema='user_service' AND table_name='experience' AND column_name='role') THEN
                    UPDATE "user_service"."experience"
                    SET title = role
                    WHERE (title IS NULL OR title = '') AND role IS NOT NULL AND role <> '';
                    ALTER TABLE "user_service"."experience" ALTER COLUMN "role" DROP NOT NULL;
                END IF;
            END $$;
        `);

        // user_industries: legacy `name` -> entity `industry`
        await queryRunner.query(`
            DO $$
            BEGIN
                IF EXISTS (SELECT 1 FROM information_schema.columns
                           WHERE table_schema='user_service' AND table_name='user_industries' AND column_name='name') THEN
                    UPDATE "user_service"."user_industries"
                    SET industry = name
                    WHERE (industry IS NULL OR industry = '') AND name IS NOT NULL AND name <> '';
                    ALTER TABLE "user_service"."user_industries" ALTER COLUMN "name" DROP NOT NULL;
                END IF;
            END $$;
        `);

        // education: legacy institution -> entity school, legacy field -> entity fieldOfStudy,
        // legacy startDate text ("YYYY-MM") -> integer startYear + startMonth.
        await queryRunner.query(`
            DO $$
            BEGIN
                IF EXISTS (SELECT 1 FROM information_schema.columns
                           WHERE table_schema='user_service' AND table_name='education' AND column_name='institution') THEN
                    UPDATE "user_service"."education"
                    SET school = institution
                    WHERE (school IS NULL OR school = '') AND institution IS NOT NULL AND institution <> '';
                    ALTER TABLE "user_service"."education" ALTER COLUMN "institution" DROP NOT NULL;
                END IF;

                IF EXISTS (SELECT 1 FROM information_schema.columns
                           WHERE table_schema='user_service' AND table_name='education' AND column_name='field') THEN
                    UPDATE "user_service"."education"
                    SET "fieldOfStudy" = field
                    WHERE ("fieldOfStudy" IS NULL OR "fieldOfStudy" = '') AND field IS NOT NULL AND field <> '';
                    ALTER TABLE "user_service"."education" ALTER COLUMN "field" DROP NOT NULL;
                END IF;

                IF EXISTS (SELECT 1 FROM information_schema.columns
                           WHERE table_schema='user_service' AND table_name='education' AND column_name='startDate') THEN
                    UPDATE "user_service"."education"
                    SET "startYear"  = CAST(SPLIT_PART("startDate", '-', 1) AS INTEGER),
                        "startMonth" = NULLIF(SPLIT_PART("startDate", '-', 2), '')::INTEGER
                    WHERE "startDate" ~ '^[0-9]{4}-[0-9]{2}'
                      AND ("startYear" IS NULL OR "startYear" = 2020);
                    ALTER TABLE "user_service"."education" ALTER COLUMN "startDate" DROP NOT NULL;
                END IF;
            END $$;
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Reverse: backfill legacy columns from entity columns, then restore NOT NULL.
        // Each legacy column is only restored if it still exists.
        await queryRunner.query(`
            DO $$
            BEGIN
                IF EXISTS (SELECT 1 FROM information_schema.columns
                           WHERE table_schema='user_service' AND table_name='experience' AND column_name='role') THEN
                    UPDATE "user_service"."experience"
                    SET role = COALESCE(NULLIF(role,''), title, '')
                    WHERE role IS NULL OR role = '';
                    ALTER TABLE "user_service"."experience" ALTER COLUMN "role" SET NOT NULL;
                END IF;

                IF EXISTS (SELECT 1 FROM information_schema.columns
                           WHERE table_schema='user_service' AND table_name='user_industries' AND column_name='name') THEN
                    UPDATE "user_service"."user_industries"
                    SET name = COALESCE(NULLIF(name,''), industry, '')
                    WHERE name IS NULL OR name = '';
                    ALTER TABLE "user_service"."user_industries" ALTER COLUMN "name" SET NOT NULL;
                END IF;

                IF EXISTS (SELECT 1 FROM information_schema.columns
                           WHERE table_schema='user_service' AND table_name='education' AND column_name='institution') THEN
                    UPDATE "user_service"."education"
                    SET institution = COALESCE(NULLIF(institution,''), school, '')
                    WHERE institution IS NULL OR institution = '';
                    ALTER TABLE "user_service"."education" ALTER COLUMN "institution" SET NOT NULL;
                END IF;

                IF EXISTS (SELECT 1 FROM information_schema.columns
                           WHERE table_schema='user_service' AND table_name='education' AND column_name='field') THEN
                    UPDATE "user_service"."education"
                    SET field = COALESCE(NULLIF(field,''), "fieldOfStudy", '')
                    WHERE field IS NULL OR field = '';
                    ALTER TABLE "user_service"."education" ALTER COLUMN "field" SET NOT NULL;
                END IF;

                IF EXISTS (SELECT 1 FROM information_schema.columns
                           WHERE table_schema='user_service' AND table_name='education' AND column_name='startDate') THEN
                    UPDATE "user_service"."education"
                    SET "startDate" = COALESCE(
                        NULLIF("startDate",''),
                        LPAD("startYear"::text, 4, '0') || '-' || LPAD(COALESCE("startMonth", 1)::text, 2, '0'),
                        ''
                    )
                    WHERE "startDate" IS NULL OR "startDate" = '';
                    ALTER TABLE "user_service"."education" ALTER COLUMN "startDate" SET NOT NULL;
                END IF;
            END $$;
        `);
    }
}
