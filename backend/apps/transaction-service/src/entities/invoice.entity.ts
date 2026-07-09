import {
    Entity, PrimaryGeneratedColumn, Column, CreateDateColumn,
    UpdateDateColumn, ManyToOne, JoinColumn, Index,
  } from 'typeorm';
  import { Transform } from 'class-transformer';
  import { InvoiceStatus } from './enums';
  import { Contract } from './contract.entity';
   
  @Entity({ schema: 'transaction_service', name: 'invoices' })
  export class Invoice {
   
    @PrimaryGeneratedColumn('uuid')
    id!: string;
   
    @Column({ name: 'invoice_id', type: 'varchar', length: 20, unique: true })
    invoiceId!: string;
   
    @Column({ name: 'stripe_invoice_id', type: 'varchar', length: 100, nullable: true })
    stripeInvoiceId!: string | null;
   
    @Column({ name: 'date_issued', type: 'date' })
    @Index()
    dateIssued!: Date;
   
    @Column({ name: 'description_type', type: 'varchar', length: 255 })
    descriptionType!: string;
   
    @Column({ name: 'description_billing_period', type: 'varchar', length: 20, nullable: true })
    descriptionBillingPeriod!: string | null;
   
    @Column({ name: 'due_date', type: 'date' })
    @Index()
    dueDate!: Date;
   
    @Column({ type: 'enum', enum: InvoiceStatus })
    @Index()
    status!: InvoiceStatus;
   
    @Column({ type: 'numeric', precision: 12, scale: 2 })
    @Transform(({ value }) => parseFloat(value))
    amount!: number;
   
    @Column({ name: 'contract_id', type: 'uuid' })
    @Index()
    contractId!: string;
   
    @ManyToOne(() => Contract, { eager: false })
    @JoinColumn({ name: 'contract_id' })
    contract!: Contract;
   
    @Column({ name: 'user_id', type: 'uuid' })
    @Index()
    userId!: string;
   
    @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
    createdAt!: Date;
   
    @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
    updatedAt!: Date;
  }
  