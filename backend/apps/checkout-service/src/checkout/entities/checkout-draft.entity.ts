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

export type CheckoutDraftTask = {
  id: string;
  title: string;
  description: string | null;
  roleName: string | null;
  location: string[] | null;
  experienceLevel: string | null;
  estimatedHours: number | null;
};

export type CheckoutDraftPhase = {
  id: string;
  phaseName: string;
  order: number;
  tasks: CheckoutDraftTask[];
};

@Entity('checkout_drafts')
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

  @Column({ type: 'timestamptz', nullable: true })
  sourceListingUpdatedAt: Date | null;

  @Column({ type: 'text', array: true, default: () => "'{}'" })
  giftCardCodes: string[];

  @Column({ type: 'text', array: true, default: () => "'{}'" })
  promoCodes: string[];

  @Index('IDX_checkout_drafts_sessionId')
  @Column({ type: 'uuid', nullable: true })
  sessionId: string | null;

  @ManyToOne(() => CheckoutSession, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'sessionId', foreignKeyConstraintName: 'FK_checkout_drafts_session' })
  session: CheckoutSession | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
