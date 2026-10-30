import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

const decimal = {
  to: (value: number | null) => value,
  from: (value: string | null) => (value === null ? null : Number(value)),
};

@Entity('promo_redemptions')
export class PromoRedemption {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'promo_code_id', type: 'uuid' })
  promoCodeId: string;

  @Column({ name: 'client_id', type: 'uuid' })
  clientId: string;

  @Column({ name: 'draft_id', type: 'uuid' })
  draftId: string;

  @Column({ name: 'order_id', type: 'varchar', length: 14 })
  orderId: string;

  @Column({
    name: 'discount_amount',
    type: 'numeric',
    precision: 12,
    scale: 2,
    transformer: decimal,
  })
  discountAmount: number;

  @Column({ name: 'redeemed_at', type: 'timestamptz', default: () => 'now()' })
  redeemedAt: Date;

  @Column({ name: 'voided_at', type: 'timestamptz', nullable: true })
  voidedAt: Date | null;
}
