import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddReportsDedupIndex1777800000000 implements MigrationInterface {
  name = 'AddReportsDedupIndex1777800000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DELETE FROM "user_service"."reports" r
      USING (
        SELECT "id"
        FROM (
          SELECT
            "id",
            ROW_NUMBER() OVER (
              PARTITION BY
                "reporterId",
                "reportedId",
                COALESCE("contextMessageId", '00000000-0000-0000-0000-000000000000'::uuid),
                COALESCE("contextThreadId", '00000000-0000-0000-0000-000000000000'::uuid)
              ORDER BY "createdAt" ASC, "id" ASC
            ) AS rn
          FROM "user_service"."reports"
        ) ranked
        WHERE rn > 1
      ) dupes
      WHERE r."id" = dupes."id"
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "uq_reports_dedup"
      ON "user_service"."reports" (
        "reporterId",
        "reportedId",
        (COALESCE("contextMessageId", '00000000-0000-0000-0000-000000000000'::uuid)),
        (COALESCE("contextThreadId", '00000000-0000-0000-0000-000000000000'::uuid))
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "user_service"."uq_reports_dedup"`,
    );
  }
}
