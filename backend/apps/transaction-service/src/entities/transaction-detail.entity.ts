import {
    Entity, PrimaryGeneratedColumn, Column, CreateDateColumn,
    OneToOne, JoinColumn,
  } from 'typeorm';
  import { Transform } from 'class-transformer';
  import { Transaction } from './transaction.entity';
   
  const DISCLAIMER =
    'Transaction details are provided for reference and may be preliminary or incomplete. ' +
    'They may not exactly match the final records shown on your official bank or account statements.';
   
  @Entity({ schema: 'transaction_service', name: 'transaction_detail' })
  export class TransactionDetail {
   
    @PrimaryGeneratedColumn('uuid')
    id!: string;
   
    @Column({ name: 'transaction_id', type: 'uuid', unique: true })
    transactionId!: string;
   
    @OneToOne(() => Transaction, (t) => t.detail)
    @JoinColumn({ name: 'transaction_id' })
    transaction!: Transaction;
   
    @Column({ name: 'account_label', type: 'varchar', length: 50 })
    accountLabel!: string;
   
    @Column({ name: 'transaction_type_label', type: 'varchar', length: 50 })
    transactionTypeLabel!: string;
   
    @Column({ type: 'numeric', precision: 12, scale: 2 })
    @Transform(({ value }) => parseFloat(value))
    amount!: number;
   
    @Column({ name: 'paid_at', type: 'timestamptz', nullable: true })
    paidAt!: Date | null;
   
    @Column({ name: 'installment_label', type: 'varchar', length: 50, nullable: true })
    installmentLabel!: string | null;
   
    @Column({ name: 'description_full', type: 'text' })
    descriptionFull!: string;
   
    @Column({ name: 'disclaimer_text', type: 'text', default: DISCLAIMER })
    disclaimerText!: string;
   
    @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
    createdAt!: Date;
  }
  