// apps/offer-service/src/offer-history/entities/offer-history-event.entity.ts
// OS-15: Append-only event log. Does NOT extend BaseEntity (no updated_at).
import {
  Entity, Column, Index, ManyToOne, JoinColumn,
  PrimaryGeneratedColumn, CreateDateColumn,
} from 'typeorm';
import { Offer } from '../../offers/entities/offer.entity';
import { CounterOffer } from '../../counter-offers/entities/counter-offer.entity';

export interface OfferTermsSnapshot {
  rate: number;
  currencyCode: string;
  durationMonths: number;
  workSchedule: { type: string; hoursPerWeek?: number };
  startDate: string;
  message: string | null;
}

@Entity({ name: 'offer_history', schema: 'offer_service' })
@Index('idx_oh_offer_id_created', ['offerId', 'createdAt'])
export class OfferHistoryEvent {
  @PrimaryGeneratedColumn('uuid', { name: 'id' })
  id: string;

  // ---- References ----
  @Column({ name: 'offer_id', type: 'uuid' })
  @Index('idx_oh_offer_id')
  offerId: string;

  @ManyToOne(() => Offer, (offer) => offer.historyEvents, {
    onDelete: 'RESTRICT',
    nullable: false,
    eager: false,
  })
  @JoinColumn({ name: 'offer_id' })
  offer: Offer;

  @Column({ name: 'counter_offer_id', type: 'uuid', nullable: true, default: null })
  counterOfferId: string | null;

  @ManyToOne(() => CounterOffer, (co) => co.historyEvents, {
    onDelete: 'SET NULL',
    nullable: true,
    eager: false,
  })
  @JoinColumn({ name: 'counter_offer_id' })
  counterOffer: CounterOffer | null;

  // ---- Event metadata ----
  @Column({ name: 'event_type', type: 'varchar', length: 50 })
  eventType: string;

  @Column({ name: 'actor', type: 'varchar', length: 10 })
  actor: 'CLIENT' | 'TALENT' | 'SYSTEM';

  @Column({ name: 'actor_id', type: 'uuid', nullable: true, default: null })
  actorId: string | null;

  // ---- Terms snapshot ----
  @Column({
    name: 'terms',
    type: 'jsonb',
    transformer: {
      to: (v: OfferTermsSnapshot) => v,
      from: (v: OfferTermsSnapshot) => v,
    },
  })
  terms: OfferTermsSnapshot;

  // ---- Timestamp (immutable — no updated_at) ----
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}