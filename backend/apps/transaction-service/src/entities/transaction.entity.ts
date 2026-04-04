import {
    Entity, PrimaryGeneratedColumn, Column, CreateDateColumn,
    UpdateDateColumn, ManyToOne, OneToOne, JoinColumn, Index,
  } from 'typeorm';
  import { Exclude, Expose, Transform } from 'class-transformer';
  import {
    TransactionType, TransactionStatus, PaymentMethodType,
    ContractType, BillingFrequency, MembershipTier, AmountDirection,
  } from './enums';
  import { Contract } from './contract.entity';
  import { TransactionDetail } from './transaction-detail.entity';
   
  @Entity({ schema: 'transaction_service', name: 'transactions' })
  export class Transaction {
   
    @PrimaryGeneratedColumn('uuid')
    id!: string;
   
    @Column({ name: 'transaction_id', type: 'varchar', length: 20, unique: true })
    transactionId!: string;
   
    @Column({ type: 'date' })
    @Index()
    date!: Date;
   
    @Column({ name: 'description_type', type: 'enum', enum: TransactionType })
    descriptionType!: TransactionType;
   
    @Column({ name: 'description_project_name', type: 'varchar', length: 255, nullable: true })
    descriptionProjectName!: string | null;
   
    @Column({ name: 'description_contractor_handle', type: 'varchar', length: 100, nullable: true })
    descriptionContractorHandle!: string | null;
   
    @Column({ name: 'description_billing_period', type: 'varchar', length: 20, nullable: true })
    descriptionBillingPeriod!: string | null;
   
    @Column({ name: 'description_hours', type: 'int', nullable: true })
    descriptionHours!: number | null;
   
    @Column({ name: 'description_months', type: 'int', nullable: true })
    descriptionMonths!: number | null;
   
    @Column({ name: 'invoice_number', type: 'varchar', length: 20, nullable: true })
    invoiceNumber!: string | null;
   
    @Column({ type: 'numeric', precision: 12, scale: 2 })
    @Transform(({ value }) => parseFloat(value))
    amount!: number;
   
    @Column({ name: 'amount_direction', type: 'enum', enum: AmountDirection })
    amountDirection!: AmountDirection;
   
    @Column({ type: 'enum', enum: TransactionStatus })
    @Index()
    status!: TransactionStatus;
   
    @Column({ name: 'payment_method_type', type: 'enum', enum: PaymentMethodType })
    paymentMethodType!: PaymentMethodType;
   
    @Column({ name: 'payment_method_label', type: 'varchar', length: 50 })
    paymentMethodLabel!: string;
   
    @Column({ name: 'payment_method_identifier', type: 'varchar', length: 100 })
    paymentMethodIdentifier!: string;
   
    @Column({ name: 'contract_type', type: 'enum', enum: ContractType })
    contractType!: ContractType;
   
    @Column({ name: 'contract_id', type: 'uuid' })
    @Index()
    contractId!: string;
   
    @ManyToOne(() => Contract, { eager: false })
    @JoinColumn({ name: 'contract_id' })
    contract!: Contract;
   
    @Column({ name: 'billing_frequency', type: 'enum', enum: BillingFrequency, nullable: true })
    billingFrequency!: BillingFrequency | null;
   
    @Column({ name: 'membership_tier', type: 'enum', enum: MembershipTier, nullable: true })
    membershipTier!: MembershipTier | null;
   
    @Column({ name: 'paid_at', type: 'timestamptz', nullable: true })
    paidAt!: Date | null;
   
    @Column({ name: 'user_id', type: 'uuid' })
    @Index()
    userId!: string;
   
    @Column({ name: 'parent_transaction_id', type: 'uuid', nullable: true })
    parentTransactionId!: string | null;
   
    @Column({ name: 'usd_equivalent', type: 'numeric', precision: 12, scale: 2 })
    @Transform(({ value }) => parseFloat(value))
    usdEquivalent!: number;
   
    @OneToOne(() => TransactionDetail, (detail) => detail.transaction, { eager: false })
    detail!: TransactionDetail;
   
    @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
    createdAt!: Date;
   
    @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
    updatedAt!: Date;
  }
  