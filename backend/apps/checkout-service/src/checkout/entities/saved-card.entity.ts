import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('saved_cards')
export class SavedCard {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'uuid' })
  userId: string;

  @Column({ type: 'varchar', unique: true })
  stripePaymentMethodId: string;

  @Column({ type: 'varchar', nullable: true })
  fingerprint: string | null;

  @Column({ type: 'varchar' })
  brand: string;

  @Column({ type: 'varchar' })
  funding: string;

  @Column({ type: 'varchar' })
  last4: string;

  @Column({ type: 'int' })
  expMonth: number;

  @Column({ type: 'int' })
  expYear: number;

  @Column({ type: 'uuid', nullable: true })
  billingAddressId: string | null;

  @Column({ type: 'boolean', default: false })
  isDefault: boolean;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
