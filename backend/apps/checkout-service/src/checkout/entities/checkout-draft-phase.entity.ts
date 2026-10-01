import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Unique,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { CheckoutDraft } from './checkout-draft.entity';
import { CheckoutDraftTaskEntity } from './checkout-draft-task.entity';

@Entity('checkout_draft_phases')
@Unique('UQ_checkout_draft_phases_draft_order', ['draftId', 'order'], {
  deferrable: 'INITIALLY DEFERRED',
})
export class CheckoutDraftPhaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  draftId: string;

  @ManyToOne(() => CheckoutDraft, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'draftId', foreignKeyConstraintName: 'FK_checkout_draft_phases_draft' })
  draft: CheckoutDraft;

  @Column({ type: 'varchar', nullable: true })
  sourcePhaseId: string | null;

  @Column()
  title: string;

  @Column({ type: 'int' })
  order: number;

  @Column({ type: 'int', default: 1 })
  startDay: number;

  @Column({ type: 'int', default: 1 })
  endDay: number;

  @OneToMany(() => CheckoutDraftTaskEntity, (task) => task.phase)
  tasks: CheckoutDraftTaskEntity[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
