import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('invoices')
export class Invoice {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  clientId: string;

  @Column('decimal', { precision: 10, scale: 2 })
  amount: number;

  @Column({ default: 'PENDING_WIRE' })
  status: 'PENDING_WIRE' | 'PAID' | 'CANCELLED';

  @Column({ nullable: true })
  paymentMethod?: 'wire' | 'stripe' | 'wallet';

  @Column({ nullable: true })
  qbInvoiceId?: string; // QuickBooks external reference

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}