import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTaskAssigneeUserId1792000000000
  implements MigrationInterface
{
  name = 'AddTaskAssigneeUserId1792000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "listings"."task" ADD COLUMN IF NOT EXISTS "assigneeUserId" uuid`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "listings"."task" DROP COLUMN IF EXISTS "assigneeUserId"`,
    );
  }
}
