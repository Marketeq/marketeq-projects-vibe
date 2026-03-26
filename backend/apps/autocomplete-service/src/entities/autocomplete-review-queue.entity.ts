import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { AutocompleteEntry } from './autocomplete-entry.entity';

export enum ReviewAction {
  APPROVE = 'approve',
  REJECT = 'reject',
}

@Entity('autocomplete_review_queue')
export class AutocompleteReviewQueue {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => AutocompleteEntry, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'entry_id' })
  entry: AutocompleteEntry;

  @Column()
  entryId: string;

  @Column({ nullable: true })
  reviewedBy: string;

  @Column({ type: 'enum', enum: ReviewAction, nullable: true })
  action: ReviewAction;

  @Column({ nullable: true })
  reason: string;

  @CreateDateColumn()
  createdAt: Date;

  @Column({ nullable: true })
  reviewedAt: Date;
}
