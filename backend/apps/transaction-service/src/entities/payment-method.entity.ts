import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, UpdateDateColumn, Index,
} from 'typeorm'

export enum PaymentMethodType {
  BANK_ACH = 'bank_ach',
  CREDIT_CARD = 'credit_card',
  KLARNA = 'klarna',
  GOOGLE_PAY = 'google_pay',
  APPLE_PAY = 'apple_pay',
}

@Entity({ schema: 'transaction_service', name: 'payment_methods' })
@Index(['userId'])
export class PaymentMethod {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string

  @Column({ type: 'enum', enum: PaymentMethodType })
  type: PaymentMethodType

  @Column({ type: 'varchar', length: 50 })
  label: string

  @Column({ type: 'varchar', length: 100 })
  identifier: string

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date
}
