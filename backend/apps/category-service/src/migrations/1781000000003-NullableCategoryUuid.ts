import { MigrationInterface, QueryRunner } from 'typeorm';

export class NullableCategoryUuid1781000000003 implements MigrationInterface {
  name = 'NullableCategoryUuid1781000000003';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_schema = 'public'
            AND table_name   = 'category_pages'
            AND column_name  = 'categoryUuid'
            AND is_nullable  = 'NO'
        ) THEN
          ALTER TABLE "category_pages" ALTER COLUMN "categoryUuid" DROP NOT NULL;
        END IF;
      END $$;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_schema = 'public'
            AND table_name   = 'category_pages'
            AND column_name  = 'categoryUuid'
            AND is_nullable  = 'YES'
        ) THEN
          ALTER TABLE "category_pages" ALTER COLUMN "categoryUuid" SET NOT NULL;
        END IF;
      END $$;
    `);
  }
}
