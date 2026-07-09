// apps/offer-service/src/offers/entities/offer.entity.ts
// OS-15: Offer entity — maps to offer_service.offers
import { Entity, Column, Index, OneToMany } from 'typeorm';
import { OfferServiceBaseEntity } from '../../common/entities/base.entity';
import { OfferStatus } from '../enums/offer-status.enum';
import { ContractType } from '../enums/contract-type.enum';
import { WorkScheduleType } from '../enums/work-schedule-type.enum';
import { CounterOffer } from '../../counter-offers/entities/counter-offer.entity';
import { OfferHistoryEvent } from '../../offer-history/entities/offer-history-event.entity';

export interface WorkSchedule {
  type: WorkScheduleType;
  hoursPerWeek?: number;
}

@Entity({ name: 'offers', schema: 'offer_service' })
@Index('idx_offers_client_talent', ['clientId', 'talentId'])
@Index('idx_offers_status_expires', ['status', 'expiresAt'])
@Index('idx_offers_talent_status', ['talentId', 'status'])
export class Offer extends OfferServiceBaseEntity {
  // ---- Party identifiers ----
  @Column({ name: 'client_id', type: 'uuid' })
  @Index('idx_offers_client_id')
  clientId: string;

  @Column({ name: 'talent_id', type: 'uuid' })
  @Index('idx_offers_talent_id')
  talentId: string;

  @Column({ name: 'job_listing_id', type: 'uuid' })
  jobListingId: string;

  // ---- Contract details ----
  @Column({ name: 'contract_type', type: 'varchar', length: 20 })
  contractType: ContractType;

  @Column({ name: 'contract_title', type: 'varchar', length: 200 })
  contractTitle: string;

  // ---- Status ----
  @Column({ name: 'status', type: 'varchar', length: 20, default: OfferStatus.PENDING })
  status: OfferStatus;

  // ---- Financial terms ----
  @Column({ name: 'rate', type: 'int' })
  rate: number;

  @Column({ name: 'currency_code', type: 'char', length: 3 })
  currencyCode: string;

  // ---- Contract terms ----
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

  @Column({ name: 'declined_reason', type: 'text', nullable: true, default: null })
  declinedReason: string | null;

  @Column({ name: 'declined_chip', type: 'varchar', length: 30, nullable: true, default: null })
  declinedChip: string | null;

  @Column({ name: 'withdrawn_at', type: 'timestamptz', nullable: true, default: null })
  withdrawnAt: Date | null;

  @Column({ name: 'withdrawal_message', type: 'text', nullable: true, default: null })
  withdrawalMessage: string | null;

  @Column({ name: 'expired_at', type: 'timestamptz', nullable: true, default: null })
  expiredAt: Date | null;

  @Column({ name: 'original_offer_id', type: 'uuid', nullable: true, default: null })
  originalOfferId: string | null;

  // ---- Relations ----
  @OneToMany(() => CounterOffer, (co) => co.offer, { cascade: false })
  counterOffers: CounterOffer[];

  @OneToMany(() => OfferHistoryEvent, (e) => e.offer, { cascade: false })
  historyEvents: OfferHistoryEvent[];
}