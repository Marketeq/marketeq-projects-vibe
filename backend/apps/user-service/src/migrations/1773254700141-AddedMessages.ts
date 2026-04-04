import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddedMessages1773254700141 implements MigrationInterface {
  name = 'AddedMessages1773254700141';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "conversation_threads" ("threadId" uuid NOT NULL DEFAULT uuid_generate_v4(), "clientUserId" uuid NOT NULL, "talentUserId" uuid NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_9bd58df1fe5a4f2221316fdbcc1" PRIMARY KEY ("threadId"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_9a843eaa2c79feb811573aad22" ON "conversation_threads" ("clientUserId", "talentUserId") `,
    );
    await queryRunner.query(
      `CREATE TABLE "messages" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "threadId" uuid NOT NULL, "clientUserId" uuid NOT NULL, "talentUserId" uuid NOT NULL, "content" text NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_18325f38ae6de43878487eff986" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_15f9bd2bf472ff12b6ee20012d" ON "messages" ("threadId") `,
    );
    await queryRunner.query(
      `ALTER TABLE "conversation_threads" ADD CONSTRAINT "FK_dd45dd40eb089a2286c159a69f6" FOREIGN KEY ("clientUserId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "conversation_threads" ADD CONSTRAINT "FK_289b90ef6066f029c13ae746ca2" FOREIGN KEY ("talentUserId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "messages" ADD CONSTRAINT "FK_15f9bd2bf472ff12b6ee20012d0" FOREIGN KEY ("threadId") REFERENCES "conversation_threads"("threadId") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "messages" ADD CONSTRAINT "FK_d1b00f80a298d9794060ba99ceb" FOREIGN KEY ("clientUserId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "messages" ADD CONSTRAINT "FK_1d558c78cfa846287a55df26499" FOREIGN KEY ("talentUserId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "messages" DROP CONSTRAINT "FK_1d558c78cfa846287a55df26499"`,
    );
    await queryRunner.query(
      `ALTER TABLE "messages" DROP CONSTRAINT "FK_d1b00f80a298d9794060ba99ceb"`,
    );
    await queryRunner.query(
      `ALTER TABLE "messages" DROP CONSTRAINT "FK_15f9bd2bf472ff12b6ee20012d0"`,
    );
    await queryRunner.query(
      `ALTER TABLE "conversation_threads" DROP CONSTRAINT "FK_289b90ef6066f029c13ae746ca2"`,
    );
    await queryRunner.query(
      `ALTER TABLE "conversation_threads" DROP CONSTRAINT "FK_dd45dd40eb089a2286c159a69f6"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_15f9bd2bf472ff12b6ee20012d"`,
    );
    await queryRunner.query(`DROP TABLE "messages"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_9a843eaa2c79feb811573aad22"`,
    );
    await queryRunner.query(`DROP TABLE "conversation_threads"`);
  }
}
