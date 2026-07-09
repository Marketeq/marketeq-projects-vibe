import { MigrationInterface, QueryRunner } from "typeorm";

export class InitSchema1710000000000 implements MigrationInterface {
  name = "InitSchema1710000000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Initial schema — tables already exist via synchronize.
    // This migration exists as a baseline so that future migrations
    // can be applied incrementally on top of the current schema.
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // No-op — cannot revert the initial schema created by synchronize.
  }
}
