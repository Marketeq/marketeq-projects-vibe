import { MigrationInterface, QueryRunner } from "typeorm";

export class Auto1774648937325 implements MigrationInterface {
    name = 'Auto1774648937325'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "tags_v2" ("id" SERIAL NOT NULL, "uuid" character varying, "name" character varying NOT NULL, "slug" character varying NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_8a6ddd45a5b780f21252390c756" UNIQUE ("uuid"), CONSTRAINT "UQ_2a34ded1dd0189b1187f86b25a1" UNIQUE ("slug"), CONSTRAINT "PK_c4e2bc2b54bc5213e18af824c54" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "categories_v2" ("id" SERIAL NOT NULL, "uuid" character varying NOT NULL, "name" character varying NOT NULL, "slug" character varying NOT NULL, "seo_meta_title" character varying, "seo_meta_description" text, "approved" boolean NOT NULL DEFAULT false, "published_in_marketplace" boolean NOT NULL DEFAULT false, "parentId" integer, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_c37ef1efe9726d2c004c03e522d" UNIQUE ("uuid"), CONSTRAINT "UQ_1323f600201a4dec074ac0844bf" UNIQUE ("slug"), CONSTRAINT "PK_ec815139543807d34e6af15e935" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "category_tags_v2" ("category_id" integer NOT NULL, "tag_id" integer NOT NULL, CONSTRAINT "PK_035acfd452b23c9bd77fd47b408" PRIMARY KEY ("category_id", "tag_id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_95d78962b7544cc0e74e4c5208" ON "category_tags_v2" ("category_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_3d6d080a7f8b40bdc393c466c9" ON "category_tags_v2" ("tag_id") `);
        await queryRunner.query(`ALTER TABLE "categories_v2" ADD CONSTRAINT "FK_535636209ee144bf47cf6ca46f4" FOREIGN KEY ("parentId") REFERENCES "categories_v2"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "category_tags_v2" ADD CONSTRAINT "FK_95d78962b7544cc0e74e4c52089" FOREIGN KEY ("category_id") REFERENCES "categories_v2"("id") ON DELETE CASCADE ON UPDATE CASCADE`);
        await queryRunner.query(`ALTER TABLE "category_tags_v2" ADD CONSTRAINT "FK_3d6d080a7f8b40bdc393c466c9d" FOREIGN KEY ("tag_id") REFERENCES "tags_v2"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "category_tags_v2" DROP CONSTRAINT "FK_3d6d080a7f8b40bdc393c466c9d"`);
        await queryRunner.query(`ALTER TABLE "category_tags_v2" DROP CONSTRAINT "FK_95d78962b7544cc0e74e4c52089"`);
        await queryRunner.query(`ALTER TABLE "categories_v2" DROP CONSTRAINT "FK_535636209ee144bf47cf6ca46f4"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_3d6d080a7f8b40bdc393c466c9"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_95d78962b7544cc0e74e4c5208"`);
        await queryRunner.query(`DROP TABLE "category_tags_v2"`);
        await queryRunner.query(`DROP TABLE "categories_v2"`);
        await queryRunner.query(`DROP TABLE "tags_v2"`);
    }

}
