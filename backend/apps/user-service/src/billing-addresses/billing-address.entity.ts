import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity({ name: 'billing_addresses', schema: 'user_service' })
export class BillingAddress {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'uuid' })
  userId: string;

  @Column({ type: 'varchar' })
  fullName: string;

  @Column({ type: 'varchar' })
  addressLine1: string;

  @Column({ type: 'varchar', nullable: true })
  addressLine2?: string | null;

  @Column({ type: 'varchar' })
  city: string;

  @Column({ type: 'varchar', nullable: true })
  state?: string | null;

  @Column({ type: 'varchar' })
  postalCode: string;

  @Column({ type: 'varchar' })
  country: string;

  @Column({ type: 'varchar' })
  phoneNumber: string;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
