import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

export type PromoDiscountType = 'percent' | 'fixed';
export type PromoAppliesTo = 'project' | 'service' | 'both';
export type PromoPeriodScope = 'total' | 'first_n_periods' | 'every_period';

const decimal = {
  to: (value: number | null) => value,
  from: (value: string | null) => (value === null ? null : Number(value)),
};

@Entity('promo_codes')
export class PromoCode {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'text' })
  code: string;

  @Column({ name: 'discount_type', type: 'varchar' })
  discountType: PromoDiscountType;

  @Column({
    name: 'discount_value',
    type: 'numeric',
    precision: 12,
    scale: 2,
    transformer: decimal,
  })
  discountValue: number;

  @Column({ name: 'applies_to', type: 'varchar', default: 'project' })
  appliesTo: PromoAppliesTo;

  @Column({ name: 'period_scope', type: 'varchar', default: 'total' })
  periodScope: PromoPeriodScope;

  @Column({ name: 'period_count', type: 'int', nullable: true })
  periodCount: number | null;

  @Column({ name: 'starts_at', type: 'timestamptz', nullable: true })
  startsAt: Date | null;

  @Column({ name: 'expires_at', type: 'timestamptz', nullable: true })
  expiresAt: Date | null;

  @Column({ name: 'max_redemptions', type: 'int', nullable: true })
  maxRedemptions: number | null;

  @Column({ name: 'max_per_client', type: 'int', nullable: true })
  maxPerClient: number | null;

  @Column({ type: 'boolean', default: true })
  active: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
