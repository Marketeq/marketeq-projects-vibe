import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

export type WireTransferStatus = 'pending' | 'verified' | 'rejected';

@Entity('wire_transfers')
export class WireTransfer {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  projectId: string;

  @Column({ type: 'uuid', nullable: true })
  contractId: string | null;

  @Column('uuid')
  clientId: string;

  @Column({ type: 'text', unique: true })
  referenceCode: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  amount: number;

  @Column({ type: 'enum', enum: ['pending', 'verified', 'rejected'], default: 'pending' })
  status: WireTransferStatus;

  @Column({ type: 'text', nullable: true })
  wireConfirmedBy: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  wireConfirmedAt: Date | null;

  @Column({ type: 'text', nullable: true })
  quickBooksInvoiceId: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
