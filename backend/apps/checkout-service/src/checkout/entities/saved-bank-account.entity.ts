import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

@Entity('saved_bank_accounts')
export class SavedBankAccount {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column('uuid')
  userId: string;

  @Column({ type: 'text' })
  stripePaymentMethodId: string;

  @Column({ type: 'text' })
  bankName: string;

  @Column({ type: 'text' })
  last4: string;

  @Column({ type: 'text', nullable: true })
  fingerprint: string | null;

  @Column({ type: 'boolean', default: false })
  verified: boolean;

  @Column({ type: 'timestamptz', nullable: true })
  verifiedAt: Date | null;

  @Column({ type: 'int', default: 0 })
  failedVerificationAttempts: number;

  @CreateDateColumn()
  createdAt: Date;
}
