import {
    Entity, PrimaryGeneratedColumn, Column, CreateDateColumn,
  } from 'typeorm';
  
  @Entity({ schema: 'transaction_service', name: 'audit_logs' })
  export class AuditLog {
  
    @PrimaryGeneratedColumn('uuid')
    id!: string;
  
    @Column({ type: 'varchar', length: 50 })
    action!: string;
  
    @Column({ name: 'user_id', type: 'uuid' })
    userId!: string;
  
    @Column({ name: 'transaction_id', type: 'uuid', nullable: true })
    transactionId!: string | null;
  
    @Column({ name: 'invoice_id', type: 'uuid', nullable: true })
    invoiceId!: string | null;
  
    @Column({ type: 'varchar', length: 50, nullable: true })
    scope!: string | null;
  
    @Column({ type: 'varchar', length: 10, nullable: true })
    format!: string | null;
  
    @Column({ type: 'jsonb', nullable: true })
    metadata!: Record<string, unknown> | null;
  
    @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
    createdAt!: Date;
  }