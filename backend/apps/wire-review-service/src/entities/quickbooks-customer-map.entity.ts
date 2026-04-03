// src/entities/quickbooks-customer-map.entity.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('quickbooks_customer_map')
export class QuickBooksCustomerMap {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  clientId: string; // your platform user ID

  @Column()
  quickbooksCustomerId: string; // mapped QBO ID

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
