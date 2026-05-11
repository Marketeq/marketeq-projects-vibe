import { MigrationInterface, QueryRunner } from 'typeorm';

const NIL_UUID = `'00000000-0000-0000-0000-000000000000'::uuid`;

export class AddReportsDedupIndex1777800000000 implements MigrationInterface {
  name = 'AddReportsDedupIndex1777800000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "user_service"."reports_dedup_purged" (
        "id" uuid PRIMARY KEY,
        "reporterId" uuid NOT NULL,
        "reportedId" uuid NOT NULL,
        "reason" text,
        "contextThreadId" uuid,
        "contextMessageId" uuid,
        "status" text,
        "createdAt" timestamptz,
        "updatedAt" timestamptz,
        "purgedAt" timestamptz NOT NULL DEFAULT now()
      )
    `);

    const dupes: Array<{ id: string }> = await queryRunner.query(`
      WITH ranked AS (
        SELECT
          "id",
          ROW_NUMBER() OVER (
            PARTITION BY
              "reporterId",
              "reportedId",
              COALESCE("contextMessageId", ${NIL_UUID}),
              COALESCE("contextThreadId", ${NIL_UUID})
            ORDER BY "createdAt" ASC, "id" ASC
          ) AS rn
        FROM "user_service"."reports"
      )
      INSERT INTO "user_service"."reports_dedup_purged"
        ("id", "reporterId", "reportedId", "reason",
         "contextThreadId", "contextMessageId", "status",
         "createdAt", "updatedAt")
      SELECT r."id", r."reporterId", r."reportedId", r."reason",
             r."contextThreadId", r."contextMessageId", r."status"::text,
             r."createdAt", r."updatedAt"
      FROM "user_service"."reports" r
      JOIN ranked ON ranked."id" = r."id"
      WHERE ranked.rn > 1
      ON CONFLICT ("id") DO NOTHING
      RETURNING "id"
    `);

    await queryRunner.query(`
      DELETE FROM "user_service"."reports" r
      USING "user_service"."reports_dedup_purged" p
      WHERE r."id" = p."id"
    `);

    console.log(
      `[migration:${this.name}] purged ${dupes.length} duplicate report(s) into reports_dedup_purged`,
    );

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "uq_reports_dedup"
      ON "user_service"."reports" (
        "reporterId",
        "reportedId",
        (COALESCE("contextMessageId", ${NIL_UUID})),
        (COALESCE("contextThreadId", ${NIL_UUID}))
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "user_service"."uq_reports_dedup"`,
    );
  }
}
