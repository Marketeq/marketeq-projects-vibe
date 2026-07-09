import {
    Entity, PrimaryGeneratedColumn, Column,
    CreateDateColumn, UpdateDateColumn, Index,
  } from 'typeorm';
  import { PaymentMethodType } from './enums';
   
  @Entity({ schema: 'transaction_service', name: 'payment_methods' })
  export class PaymentMethod {
   
    @PrimaryGeneratedColumn('uuid')
    id!: string;
   
    @Column({ name: 'user_id', type: 'uuid' })
    @Index()
    userId!: string;
   
    @Column({ type: 'enum', enum: PaymentMethodType })
    type!: PaymentMethodType;
   
    @Column({ type: 'varchar', length: 50 })
    label!: string;
   
    @Column({ type: 'varchar', length: 100 })
    identifier!: string;
   
    @Column({ name: 'is_active', type: 'boolean', default: true })
    isActive!: boolean;
   
    @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
    createdAt!: Date;
   
    @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
    updatedAt!: Date;
  }
  