import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAffiliatedTeamTables1772767311535
  implements MigrationInterface
{
  name = 'AddAffiliatedTeamTables1772767311535';

  private isLegacyOwnershipIssue(error: unknown): boolean {
    const message = error instanceof Error ? error.message : String(error);
    return /must be owner of table|permission denied|insufficient privilege|object not in prerequisite state/i.test(
      message,
    );
  }

  private async runBestEffort(
    queryRunner: QueryRunner,
    sql: string,
    notice: string,
  ): Promise<void> {
    try {
      await queryRunner.query(sql);
    } catch (error) {
      if (!this.isLegacyOwnershipIssue(error)) {
        throw error;
      }

      const message = error instanceof Error ? error.message : String(error);
      // Keep legacy staging ownership mismatches from aborting the entire boot.
      console.warn(`[${this.name}] ${notice}: ${message}`);
    }
  }

  public async up(queryRunner: QueryRunner): Promise<void> {
    await this.runBestEffort(
      queryRunner,
      `ALTER TABLE "experiences" DROP CONSTRAINT IF EXISTS "FK_experiences_user"`,
      'Skipping legacy experiences foreign-key drop',
    );
    await queryRunner.query(
      `CREATE TABLE IF NOT EXISTS "industries" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "industry" character varying NOT NULL, "yearsOfExperience" integer, "description" text, "userId" uuid NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_f1626dcb2d58142d7dfcca7b8d1" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE IF NOT EXISTS "languages" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying NOT NULL, "fluency" character varying NOT NULL, "userId" uuid NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_b517f827ca496b29f4d549c631d" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE IF NOT EXISTS "certifications" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying NOT NULL, "issuer" character varying NOT NULL, "issueDate" date NOT NULL, "expirationDate" date, "credentialId" character varying, "credentialUrl" character varying, "userId" uuid NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_fd763d412e4a1fb1b6dadd6e72b" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE IF NOT EXISTS "portfolio" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying NOT NULL, "description" text, "url" character varying, "imageUrl" character varying, "tags" text array, "userId" uuid NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_6936bb92ca4b7cda0ff28794e48" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE IF NOT EXISTS "affiliated_teams" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying NOT NULL, "location" character varying NOT NULL, "time" character varying NOT NULL, "userId" uuid NOT NULL, CONSTRAINT "PK_d444bd7ce56cf399f7654b3a624" PRIMARY KEY ("id"))`,
    );
    await this.runBestEffort(
      queryRunner,
      `ALTER TABLE "users" DROP COLUMN IF EXISTS "dateFormat"`,
      'Skipping legacy users.dateFormat drop',
    );
    await this.runBestEffort(
      queryRunner,
      `ALTER TABLE "users" DROP COLUMN IF EXISTS "startOfWeek"`,
      'Skipping legacy users.startOfWeek drop',
    );
    await this.runBestEffort(
      queryRunner,
      `ALTER TABLE "users" DROP COLUMN IF EXISTS "timeFormat"`,
      'Skipping legacy users.timeFormat drop',
    );
    await this.runBestEffort(
      queryRunner,
      `ALTER TABLE "experiences" ADD COLUMN IF NOT EXISTS "industryType" character varying`,
      'Skipping legacy experiences.industryType alteration',
    );
    await this.runBestEffort(
      queryRunner,
      `
      DO $$
      DECLARE
        skills_type text;
      BEGIN
        SELECT c.udt_name
        INTO skills_type
        FROM information_schema.columns c
        WHERE c.table_schema = 'public'
          AND c.table_name = 'experiences'
          AND c.column_name = 'skills';

        IF skills_type IS NULL THEN
          ALTER TABLE "experiences" ADD COLUMN "skills" text[];
        ELSIF skills_type IN ('text', 'varchar', 'bpchar') THEN
          ALTER TABLE "experiences" ADD COLUMN IF NOT EXISTS "skills_tmp" text[];
          EXECUTE 'UPDATE "experiences" SET "skills_tmp" = CASE WHEN "skills" IS NULL OR btrim("skills"::text) = '''' THEN NULL ELSE ARRAY["skills"::text] END';
          ALTER TABLE "experiences" DROP COLUMN "skills";
          ALTER TABLE "experiences" RENAME COLUMN "skills_tmp" TO "skills";
        ELSIF skills_type = '_varchar' THEN
          ALTER TABLE "experiences"
          ALTER COLUMN "skills"
          TYPE text[]
          USING "skills"::text[];
        END IF;
      END $$;
    `,
      'Skipping legacy experiences.skills normalization',
    );
    await this.runBestEffort(
      queryRunner,
      `
      DO $$
      DECLARE
        description_type text;
        location_type text;
        start_type text;
        end_type text;
        created_type text;
        updated_type text;
      BEGIN
        SELECT c.udt_name
        INTO description_type
        FROM information_schema.columns c
        WHERE c.table_schema = 'public'
          AND c.table_name = 'experiences'
          AND c.column_name = 'description';

        IF description_type IS NULL THEN
          ALTER TABLE "experiences" ADD COLUMN "description" character varying;
        ELSIF description_type NOT IN ('varchar', 'bpchar') THEN
          ALTER TABLE "experiences"
          ALTER COLUMN "description" TYPE character varying
          USING "description"::character varying;
        END IF;

        SELECT c.udt_name
        INTO location_type
        FROM information_schema.columns c
        WHERE c.table_schema = 'public'
          AND c.table_name = 'experiences'
          AND c.column_name = 'location';

        IF location_type IS NULL THEN
          ALTER TABLE "experiences" ADD COLUMN "location" text;
        ELSIF location_type <> 'text' THEN
          ALTER TABLE "experiences"
          ALTER COLUMN "location" TYPE text
          USING "location"::text;
        END IF;

        SELECT c.udt_name
        INTO start_type
        FROM information_schema.columns c
        WHERE c.table_schema = 'public'
          AND c.table_name = 'experiences'
          AND c.column_name = 'startDate';

        IF start_type IS NULL THEN
          ALTER TABLE "experiences" ADD COLUMN "startDate" date;
        ELSIF start_type IN ('timestamp', 'timestamptz') THEN
          ALTER TABLE "experiences"
          ALTER COLUMN "startDate" TYPE date
          USING "startDate"::date;
        END IF;
        ALTER TABLE "experiences" ALTER COLUMN "startDate" SET NOT NULL;

        SELECT c.udt_name
        INTO end_type
        FROM information_schema.columns c
        WHERE c.table_schema = 'public'
          AND c.table_name = 'experiences'
          AND c.column_name = 'endDate';

        IF end_type IS NULL THEN
          ALTER TABLE "experiences" ADD COLUMN "endDate" date;
        ELSIF end_type IN ('timestamp', 'timestamptz') THEN
          ALTER TABLE "experiences"
          ALTER COLUMN "endDate" TYPE date
          USING "endDate"::date;
        END IF;

        SELECT c.udt_name
        INTO created_type
        FROM information_schema.columns c
        WHERE c.table_schema = 'public'
          AND c.table_name = 'experiences'
          AND c.column_name = 'createdAt';

        IF created_type IS NULL THEN
          ALTER TABLE "experiences" ADD COLUMN "createdAt" TIMESTAMP NOT NULL DEFAULT now();
        ELSIF created_type = 'timestamptz' THEN
          ALTER TABLE "experiences"
          ALTER COLUMN "createdAt" TYPE TIMESTAMP
          USING ("createdAt" AT TIME ZONE 'UTC');
        END IF;
        UPDATE "experiences" SET "createdAt" = now() WHERE "createdAt" IS NULL;
        ALTER TABLE "experiences" ALTER COLUMN "createdAt" SET DEFAULT now();
        ALTER TABLE "experiences" ALTER COLUMN "createdAt" SET NOT NULL;

        SELECT c.udt_name
        INTO updated_type
        FROM information_schema.columns c
        WHERE c.table_schema = 'public'
          AND c.table_name = 'experiences'
          AND c.column_name = 'updatedAt';

        IF updated_type IS NULL THEN
          ALTER TABLE "experiences" ADD COLUMN "updatedAt" TIMESTAMP NOT NULL DEFAULT now();
        ELSIF updated_type = 'timestamptz' THEN
          ALTER TABLE "experiences"
          ALTER COLUMN "updatedAt" TYPE TIMESTAMP
          USING ("updatedAt" AT TIME ZONE 'UTC');
        END IF;
        UPDATE "experiences" SET "updatedAt" = now() WHERE "updatedAt" IS NULL;
        ALTER TABLE "experiences" ALTER COLUMN "updatedAt" SET DEFAULT now();
        ALTER TABLE "experiences" ALTER COLUMN "updatedAt" SET NOT NULL;
      END $$;
    `,
      'Skipping legacy experiences column normalization',
    );
    await this.runBestEffort(
      queryRunner,
      `ALTER TABLE "experiences" ALTER COLUMN "isCurrentRole" SET NOT NULL`,
      'Skipping legacy experiences.isCurrentRole hardening',
    );
    await this.runBestEffort(
      queryRunner,
      `DROP INDEX IF EXISTS "public"."IDX_97672ac88f789774dd47f7c8be"`,
      'Skipping legacy users email index drop',
    );
    await this.runBestEffort(
      queryRunner,
      `ALTER TABLE "users" DROP CONSTRAINT IF EXISTS "users_email_key"`,
      'Skipping legacy users email constraint drop',
    );
    await this.runBestEffort(
      queryRunner,
      `ALTER TABLE "users" ALTER COLUMN "email" TYPE character varying`,
      'Skipping legacy users.email widening',
    );
    await this.runBestEffort(
      queryRunner,
      `ALTER TABLE "users" ALTER COLUMN "password" DROP DEFAULT`,
      'Skipping legacy users.password default cleanup',
    );
    await this.runBestEffort(
      queryRunner,
      `
      DO $$
      DECLARE
        timezone_type text;
      BEGIN
        SELECT c.udt_name
        INTO timezone_type
        FROM information_schema.columns c
        WHERE c.table_schema = 'public'
          AND c.table_name = 'users'
          AND c.column_name = 'timezone';

        IF timezone_type IS NULL THEN
          ALTER TABLE "users" ADD COLUMN "timezone" character varying;
        ELSIF timezone_type <> 'varchar' THEN
          ALTER TABLE "users"
          ALTER COLUMN "timezone" TYPE character varying
          USING "timezone"::character varying;
        END IF;

        ALTER TABLE "users" ALTER COLUMN "timezone" DROP DEFAULT;
        ALTER TABLE "users" ALTER COLUMN "timezone" DROP NOT NULL;
      END $$;
    `,
      'Skipping legacy users.timezone normalization',
    );
    await this.runBestEffort(
      queryRunner,
      `CREATE UNIQUE INDEX IF NOT EXISTS "IDX_97672ac88f789774dd47f7c8be" ON "users" ("email") `,
      'Skipping legacy users email index creation',
    );
    await this.runBestEffort(
      queryRunner,
      `DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'FK_dc2f8d935eb8e84267b05aabfd4'
        ) THEN
          BEGIN
            ALTER TABLE "industries" ADD CONSTRAINT "FK_dc2f8d935eb8e84267b05aabfd4" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
          EXCEPTION
            WHEN insufficient_privilege OR object_not_in_prerequisite_state THEN
              RAISE NOTICE 'Skipping industries foreign key migration due to ownership mismatch';
          END;
        END IF;
      END $$;`,
      'Skipping industries foreign-key migration',
    );
    await this.runBestEffort(
      queryRunner,
      `DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'FK_8f1b96a30ff66e0cd5c5c2fd797'
        ) THEN
          BEGIN
            ALTER TABLE "languages" ADD CONSTRAINT "FK_8f1b96a30ff66e0cd5c5c2fd797" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
          EXCEPTION
            WHEN insufficient_privilege OR object_not_in_prerequisite_state THEN
              RAISE NOTICE 'Skipping languages foreign key migration due to ownership mismatch';
          END;
        END IF;
      END $$;`,
      'Skipping languages foreign-key migration',
    );
    await this.runBestEffort(
      queryRunner,
      `DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'FK_c5d9770c24adc7be0680f9bd963'
        ) THEN
          BEGIN
            ALTER TABLE "certifications" ADD CONSTRAINT "FK_c5d9770c24adc7be0680f9bd963" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
          EXCEPTION
            WHEN insufficient_privilege OR object_not_in_prerequisite_state THEN
              RAISE NOTICE 'Skipping certifications foreign key migration due to ownership mismatch';
          END;
        END IF;
      END $$;`,
      'Skipping certifications foreign-key migration',
    );
    await this.runBestEffort(
      queryRunner,
      `DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'FK_9d041c43c782a9135df1388ae16'
        ) THEN
          BEGIN
            ALTER TABLE "portfolio" ADD CONSTRAINT "FK_9d041c43c782a9135df1388ae16" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
          EXCEPTION
            WHEN insufficient_privilege OR object_not_in_prerequisite_state THEN
              RAISE NOTICE 'Skipping portfolio foreign key migration due to ownership mismatch';
          END;
        END IF;
      END $$;`,
      'Skipping portfolio foreign-key migration',
    );
    await this.runBestEffort(
      queryRunner,
      `DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'FK_2f83b2f81cd02f84dca26794814'
        ) THEN
          BEGIN
            ALTER TABLE "affiliated_teams" ADD CONSTRAINT "FK_2f83b2f81cd02f84dca26794814" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
          EXCEPTION
            WHEN insufficient_privilege OR object_not_in_prerequisite_state THEN
              RAISE NOTICE 'Skipping affiliated teams foreign key migration due to ownership mismatch';
          END;
        END IF;
      END $$;`,
      'Skipping affiliated teams foreign-key migration',
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "affiliated_teams" DROP CONSTRAINT IF EXISTS "FK_2f83b2f81cd02f84dca26794814"`,
    );
    await queryRunner.query(
      `ALTER TABLE "portfolio" DROP CONSTRAINT IF EXISTS "FK_9d041c43c782a9135df1388ae16"`,
    );
    await queryRunner.query(
      `ALTER TABLE "certifications" DROP CONSTRAINT IF EXISTS "FK_c5d9770c24adc7be0680f9bd963"`,
    );
    await queryRunner.query(
      `ALTER TABLE "languages" DROP CONSTRAINT IF EXISTS "FK_8f1b96a30ff66e0cd5c5c2fd797"`,
    );
    await queryRunner.query(
      `ALTER TABLE "industries" DROP CONSTRAINT IF EXISTS "FK_dc2f8d935eb8e84267b05aabfd4"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "public"."IDX_97672ac88f789774dd47f7c8be"`,
    );
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "timezone"`);
    await queryRunner.query(
      `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "timezone" character varying(64) NOT NULL DEFAULT 'UTC'`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ALTER COLUMN "password" SET DEFAULT ''`,
    );
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "email"`);
    await queryRunner.query(
      `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "email" character varying(320) NOT NULL`,
    );
    await queryRunner.query(
      `DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'users_email_key'
        ) THEN
          ALTER TABLE "users" ADD CONSTRAINT "users_email_key" UNIQUE ("email");
        END IF;
      END $$;`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "IDX_97672ac88f789774dd47f7c8be" ON "users" ("email") `,
    );
    await queryRunner.query(
      `ALTER TABLE "experiences" DROP COLUMN IF EXISTS "updatedAt"`,
    );
    await queryRunner.query(
      `ALTER TABLE "experiences" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT now()`,
    );
    await queryRunner.query(
      `ALTER TABLE "experiences" DROP COLUMN IF EXISTS "createdAt"`,
    );
    await queryRunner.query(
      `ALTER TABLE "experiences" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT now()`,
    );
    await queryRunner.query(
      `ALTER TABLE "experiences" ALTER COLUMN "isCurrentRole" DROP NOT NULL`,
    );
    await queryRunner.query(`ALTER TABLE "experiences" DROP COLUMN IF EXISTS "endDate"`);
    await queryRunner.query(
      `ALTER TABLE "experiences" ADD COLUMN IF NOT EXISTS "endDate" TIMESTAMP WITH TIME ZONE`,
    );
    await queryRunner.query(
      `ALTER TABLE "experiences" DROP COLUMN IF EXISTS "startDate"`,
    );
    await queryRunner.query(
      `ALTER TABLE "experiences" ADD COLUMN IF NOT EXISTS "startDate" TIMESTAMP WITH TIME ZONE NOT NULL`,
    );
    await queryRunner.query(`ALTER TABLE "experiences" DROP COLUMN IF EXISTS "location"`);
    await queryRunner.query(
      `ALTER TABLE "experiences" ADD COLUMN IF NOT EXISTS "location" character varying`,
    );
    await queryRunner.query(
      `ALTER TABLE "experiences" DROP COLUMN IF EXISTS "description"`,
    );
    await queryRunner.query(`ALTER TABLE "experiences" ADD COLUMN IF NOT EXISTS "description" text`);
    await queryRunner.query(`ALTER TABLE "experiences" DROP COLUMN IF EXISTS "skills"`);
    await queryRunner.query(
      `ALTER TABLE "experiences" DROP COLUMN IF EXISTS "industryType"`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "timeFormat" character varying(8) NOT NULL DEFAULT '12h'`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "startOfWeek" character varying(16) NOT NULL DEFAULT 'Sunday'`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "dateFormat" character varying(16) NOT NULL DEFAULT 'MM/DD/YYYY'`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "affiliated_teams"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "portfolio"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "certifications"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "languages"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "industries"`);
    await queryRunner.query(
      `DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'FK_experiences_user'
        ) THEN
          ALTER TABLE "experiences" ADD CONSTRAINT "FK_experiences_user" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
        END IF;
      END $$;`,
    );
  }
}
