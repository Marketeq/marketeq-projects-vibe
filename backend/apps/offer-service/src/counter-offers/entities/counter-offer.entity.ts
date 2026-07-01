// apps/offer-service/src/counter-offers/entities/counter-offer.entity.ts
// OS-15: CounterOffer entity — maps to offer_service.counter_offers
import { Entity, Column, Index, ManyToOne, JoinColumn, OneToMany } from 'typeorm';
import { OfferServiceBaseEntity } from '../../common/entities/base.entity';
import { CounterOfferStatus } from '../enums/counter-offer-status.enum';
import { WorkSchedule } from '../../offers/entities/offer.entity';
import { Offer } from '../../offers/entities/offer.entity';
import { OfferHistoryEvent } from '../../offer-history/entities/offer-history-event.entity';

@Entity({ name: 'counter_offers', schema: 'offer_service' })
@Index('idx_co_offer_id', ['offerId'])
@Index('idx_co_offer_status', ['offerId', 'status'])
@Index('idx_co_expires', ['status', 'expiresAt'])
export class CounterOffer extends OfferServiceBaseEntity {
  // ---- Parent offer reference ----
  @Column({ name: 'offer_id', type: 'uuid' })
  offerId: string;

  @ManyToOne(() => Offer, (offer) => offer.counterOffers, {
    onDelete: 'RESTRICT',
    nullable: false,
    eager: false,
  })
  @JoinColumn({ name: 'offer_id' })
  offer: Offer;

  // ---- Submitter ----
  @Column({ name: 'submitted_by', type: 'varchar', length: 10 })
  submittedBy: 'CLIENT' | 'TALENT';

  @Column({ name: 'submitted_by_id', type: 'uuid' })
  submittedById: string;

  // ---- Status ----
  @Column({ name: 'status', type: 'varchar', length: 20, default: CounterOfferStatus.PENDING })
  status: CounterOfferStatus;

  // ---- Terms ----
  @Column({ name: 'rate', type: 'int' })
  rate: number;

  @Column({ name: 'currency_code', type: 'char', length: 3 })
  currencyCode: string;

  @Column({ name: 'duration_months', type: 'int' })
  durationMonths: number;

  @Column({
    name: 'work_schedule',
    type: 'jsonb',
    transformer: { to: (v: WorkSchedule) => v, from: (v: WorkSchedule) => v },
  })
  workSchedule: WorkSchedule;

  @Column({
    name: 'start_date',
    type: 'date',
    transformer: {
      to: (v: string) => v,
      from: (v: string | Date) => {
        if (v instanceof Date) return v.toISOString().split('T')[0];
        return v;
      },
    },
  })
  startDate: string;

  @Column({ name: 'message', type: 'text', nullable: true, default: null })
  message: string | null;

  // ---- TTL & expiry ----
  @Column({ name: 'expires_at', type: 'timestamptz' })
  expiresAt: Date;

  @Column({ name: 'warning_sent_at', type: 'timestamptz', nullable: true, default: null })
  warningSentAt: Date | null;

  // ---- Terminal state timestamps ----
  @Column({ name: 'accepted_at', type: 'timestamptz', nullable: true, default: null })
  acceptedAt: Date | null;

  @Column({ name: 'declined_at', type: 'timestamptz', nullable: true, default: null })
  declinedAt: Date | null;

  @Column({ name: 'withdrawn_at', type: 'timestamptz', nullable: true, default: null })
  withdrawnAt: Date | null;

  @Column({ name: 'withdrawal_message', type: 'text', nullable: true, default: null })
  withdrawalMessage: string | null;

  @Column({ name: 'expired_at', type: 'timestamptz', nullable: true, default: null })
  expiredAt: Date | null;

  @Column({ name: 'superseded_at', type: 'timestamptz', nullable: true, default: null })
  supersededAt: Date | null;

  // ---- Relations ----
  @OneToMany(() => OfferHistoryEvent, (e) => e.counterOffer, { cascade: false })
  historyEvents: OfferHistoryEvent[];
}