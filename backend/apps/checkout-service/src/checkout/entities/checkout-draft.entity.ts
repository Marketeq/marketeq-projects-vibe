import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Unique,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { CheckoutSession } from './checkout-session.entity';

@Entity('drafts')
@Unique(['clientId', 'listingId'])
export class CheckoutDraft {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  clientId: string;

  @Column()
  listingId: string;

  @Column({ type: 'int', default: 1 })
  version: number;

  @Column({ type: 'varchar', nullable: true })
  title: string | null;

  @Column({ type: 'text', nullable: true })
  mediaUrl: string | null;

  @Column({ type: 'uuid', array: true, default: () => "'{}'" })
  memberUserIds: string[];

  @Column({ type: 'text', array: true, default: () => "'{}'" })
  giftCardCodes: string[];

  @Column({ type: 'text', array: true, default: () => "'{}'" })
  promoCodes: string[];

  @Index('IDX_drafts_sessionId')
  @Column({ type: 'uuid', nullable: true })
  sessionId: string | null;

  @ManyToOne(() => CheckoutSession, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'sessionId', foreignKeyConstraintName: 'FK_drafts_session' })
  session: CheckoutSession | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;

  @Column({ type: 'timestamptz', default: () => 'now()' })
  lastOpenedAt: Date;
}
