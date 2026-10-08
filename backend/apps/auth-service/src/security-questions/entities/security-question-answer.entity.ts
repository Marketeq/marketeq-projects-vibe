import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';

/**
 * One answered security question.
 *
 * The answer is hashed, not encrypted, for the same reason a password is: it is
 * only ever compared, never read back or displayed. Nothing in the product
 * needs to know what the answer was, so nothing should be able to recover it
 * from a database dump.
 *
 * Only the question id is stored, not the prompt — see
 * security-questions.catalog.ts for why.
 */
@Entity('security_question_answers')
@Unique('UQ_security_question_answers_user_question', ['userId', 'questionId'])
export class SecurityQuestionAnswer {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column('uuid')
  userId: string;

  @Column({ type: 'varchar', length: 64 })
  questionId: string;

  @Column({ select: false })
  answerHash: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
