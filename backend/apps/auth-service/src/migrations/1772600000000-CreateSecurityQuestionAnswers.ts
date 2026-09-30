import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateSecurityQuestionAnswers1772600000000
  implements MigrationInterface
{
  name = 'CreateSecurityQuestionAnswers1772600000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "security_question_answers" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "userId" uuid NOT NULL,
        "questionId" character varying(64) NOT NULL,
        "answerHash" character varying NOT NULL,
        "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_security_question_answers_userId" ON "security_question_answers" ("userId")`,
    );
    // One answer per question per user. The set path replaces the whole row set
    // inside a transaction, so this exists to stop a concurrent second write
    // leaving an account with two different answers to the same question --
    // which would make verification depend on row order.
    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "UQ_security_question_answers_user_question" ON "security_question_answers" ("userId", "questionId")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "UQ_security_question_answers_user_question"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_security_question_answers_userId"`,
    );
    await queryRunner.query(
      `DROP TABLE IF EXISTS "security_question_answers"`,
    );
  }
}
