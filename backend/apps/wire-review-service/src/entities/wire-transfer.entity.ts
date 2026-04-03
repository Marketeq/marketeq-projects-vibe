import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('wire_transfers')
export class WireTransfer {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  invoiceId: string;

  @Column()
  clientId: string;

  @Column('decimal', { precision: 10, scale: 2 })
  expectedAmount: number;

  @Column()
  currency: string;

  @Column({ default: 'pending' })
  status: 'pending' | 'confirmed' | 'failed';

  @Column({ nullable: true })
  qbInvoiceId?: string;

  @Column({ nullable: true })
  receivedAt?: Date;

  @Column({ nullable: true })
  confirmedBy?: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
