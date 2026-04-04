import { MigrationInterface, QueryRunner } from "typeorm";

export class TestEmpty1750915114845 implements MigrationInterface {
    name = 'TestEmpty1750915114845'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            CREATE TYPE "public"."favorites_type_enum" AS ENUM('talent', 'project', 'service', 'job', 'team')
        `);
        await queryRunner.query(`
            CREATE TABLE "favorites" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "userId" uuid NOT NULL,
                "groupId" uuid NOT NULL,
                "type" "public"."favorites_type_enum" NOT NULL,
                "itemId" character varying(100) NOT NULL,
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_890818d27523748dd36a4d1bdc8" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_e747534006c6e3c2f09939da60" ON "favorites" ("userId")
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_522952c2afbf691468d0f233bf" ON "favorites" ("groupId")
        `);
        await queryRunner.query(`
            CREATE TABLE "favorite_groups" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "name" character varying(100) NOT NULL,
                "userId" uuid NOT NULL,
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_ff86891fccb555984e16043342f" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_fc91d977e0ab7f0c09820ae050" ON "favorite_groups" ("userId")
        `);
        await queryRunner.query(`
            ALTER TABLE "favorites"
            ADD CONSTRAINT "FK_522952c2afbf691468d0f233bf1" FOREIGN KEY ("groupId") REFERENCES "favorite_groups"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "favorites" DROP CONSTRAINT "FK_522952c2afbf691468d0f233bf1"
        `);
        await queryRunner.query(`
            DROP INDEX "public"."IDX_fc91d977e0ab7f0c09820ae050"
        `);
        await queryRunner.query(`
            DROP TABLE "favorite_groups"
        `);
        await queryRunner.query(`
            DROP INDEX "public"."IDX_522952c2afbf691468d0f233bf"
        `);
        await queryRunner.query(`
            DROP INDEX "public"."IDX_e747534006c6e3c2f09939da60"
        `);
        await queryRunner.query(`
            DROP TABLE "favorites"
        `);
        await queryRunner.query(`
            DROP TYPE "public"."favorites_type_enum"
        `);
    }

}
