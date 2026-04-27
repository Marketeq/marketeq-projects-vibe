import { MigrationInterface, QueryRunner } from "typeorm";

export class AddEducationUserLink1770518813106 implements MigrationInterface {
    name = 'AddEducationUserLink1770518813106'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE IF NOT EXISTS "manual_time_entries" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "userId" uuid NOT NULL, "projectId" uuid, "taskId" uuid, "startAt" TIMESTAMP WITH TIME ZONE NOT NULL, "endAt" TIMESTAMP WITH TIME ZONE NOT NULL, "note" text NOT NULL DEFAULT '', "approved" boolean NOT NULL DEFAULT false, "deleted" boolean NOT NULL DEFAULT false, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_4c80ca1ead0a108a1df2c9ed4f5" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_0d6e0895920837c762ab067a23" ON "manual_time_entries" ("userId") `);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_12dfc9cd09dde692224456e1b2" ON "manual_time_entries" ("startAt") `);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_8fb78c3c2d0f5c8f322187e1f1" ON "manual_time_entries" ("endAt") `);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_506e12c316e5c4b0197bf3f188" ON "manual_time_entries" ("approved") `);
        await queryRunner.query(`CREATE TABLE IF NOT EXISTS "screenshots" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "userId" uuid NOT NULL, "projectId" uuid, "taskId" uuid, "takenAt" TIMESTAMP WITH TIME ZONE NOT NULL, "imageUrl" character varying(1024) NOT NULL, "activityPercent" smallint NOT NULL DEFAULT '0', "appsUsed" text array NOT NULL DEFAULT '{}', "blurred" boolean NOT NULL DEFAULT false, "deleted" boolean NOT NULL DEFAULT false, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_97dd05f8da66717af0d97be00ff" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_f01e0b50926889409e89203874" ON "screenshots" ("userId") `);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_ce039c18fc12a6ca744379604a" ON "screenshots" ("projectId") `);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_51cc04701bb431a73aed4f7b49" ON "screenshots" ("taskId") `);
        await queryRunner.query(`ALTER TABLE "educations" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP NOT NULL DEFAULT now()`);
        await queryRunner.query(`ALTER TABLE "educations" DROP CONSTRAINT IF EXISTS "FK_86e26478ad7a3d8543cfb922358"`);
        await queryRunner.query(`ALTER TABLE "educations" ALTER COLUMN "userId" SET NOT NULL`);
        await queryRunner.query(`DO $$ BEGIN
            IF NOT EXISTS (
                SELECT 1 FROM pg_constraint WHERE conname = 'FK_86e26478ad7a3d8543cfb922358'
            ) THEN
                ALTER TABLE "educations" ADD CONSTRAINT "FK_86e26478ad7a3d8543cfb922358" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
            END IF;
        END $$;`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "educations" DROP CONSTRAINT IF EXISTS "FK_86e26478ad7a3d8543cfb922358"`);
        await queryRunner.query(`ALTER TABLE "educations" ALTER COLUMN "userId" DROP NOT NULL`);
        await queryRunner.query(`DO $$ BEGIN
            IF NOT EXISTS (
                SELECT 1 FROM pg_constraint WHERE conname = 'FK_86e26478ad7a3d8543cfb922358'
            ) THEN
                ALTER TABLE "educations" ADD CONSTRAINT "FK_86e26478ad7a3d8543cfb922358" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
            END IF;
        END $$;`);
        await queryRunner.query(`ALTER TABLE "educations" DROP COLUMN "updatedAt"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "public"."IDX_51cc04701bb431a73aed4f7b49"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "public"."IDX_ce039c18fc12a6ca744379604a"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "public"."IDX_f01e0b50926889409e89203874"`);
        await queryRunner.query(`DROP TABLE IF EXISTS "screenshots"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "public"."IDX_506e12c316e5c4b0197bf3f188"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "public"."IDX_8fb78c3c2d0f5c8f322187e1f1"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "public"."IDX_12dfc9cd09dde692224456e1b2"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "public"."IDX_0d6e0895920837c762ab067a23"`);
        await queryRunner.query(`DROP TABLE IF EXISTS "manual_time_entries"`);
    }

}
