// apps/offer-service/seeds/seed.ts
// OS-18: Seed runner — inserts all offer records into dev database.
// Safe to run multiple times (INSERT ON CONFLICT DO NOTHING).
import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { DataSource } from 'typeorm';
import { getDataSourceToken } from '@nestjs/typeorm';
import { AppModule } from '../src/app.module';
import { OfferStatus } from '../src/offers/enums/offer-status.enum';
import { ContractType } from '../src/offers/enums/contract-type.enum';
import { CounterOfferStatus } from '../src/counter-offers/enums/counter-offer-status.enum';
import { OFFER_EVENTS } from '../src/messaging/events/offer-events';
import { SEED_USERS, SEED_LISTINGS, SEED_OFFERS, SEED_COUNTER_OFFERS, SEED_HISTORY } from './constants/seed-ids';

const ALLOWED_ENVS = ['development', 'test', 'local'];
const NODE_ENV = process.env.NODE_ENV ?? 'development';

if (!ALLOWED_ENVS.includes(NODE_ENV)) {
  console.error(`[seed] ABORTED. NODE_ENV="${NODE_ENV}" is not allowed.`);
  process.exit(1);
}

async function seed(): Promise<void> {
  console.log('[seed] Starting offer-service seed...');
  const app = await NestFactory.createApplicationContext(AppModule, { logger: ['error'] });
  const ds = app.get<DataSource>(getDataSourceToken());

  async function insert(table: string, rows: Record<string, unknown>[]): Promise<void> {
    if (rows.length === 0) return;
    const cols = Object.keys(rows[0]);
    const colList = cols.map(c => `"${c}"`).join(', ');
    for (const row of rows) {
      const vals = cols.map((_, i) => `$${i + 1}`).join(', ');
      const values = cols.map(c => {
        const v = row[c];
        if (v && typeof v === 'object' && !(v instanceof Date)) return JSON.stringify(v);
        return v;
      });
      await ds.query(
        `INSERT INTO offer_service.${table} (${colList}) VALUES (${vals}) ON CONFLICT (id) DO NOTHING`,
        values,
      );
    }
  }

  function futureDate(daysFromNow: number): string {
    const d = new Date(); d.setDate(d.getDate() + daysFromNow);
    return d.toISOString().split('T')[0];
  }
  function nowPlusDays(days: number): Date {
    const d = new Date(); d.setDate(d.getDate() + days); return d;
  }
  function nowMinusDays(days: number): Date {
    const d = new Date(); d.setDate(d.getDate() - days); return d;
  }

  console.log('[seed] Inserting offers...');
  const fullTime = JSON.stringify({ type: 'FULL_TIME' });
  const custom30 = JSON.stringify({ type: 'CUSTOM', hoursPerWeek: 30 });

  await insert('offers', [
    { id: SEED_OFFERS.PENDING, client_id: SEED_USERS.CLIENT_A, talent_id: SEED_USERS.TALENT_X, job_listing_id: SEED_LISTINGS.PROJECT_ALPHA, contract_type: ContractType.PROJECT, contract_title: 'Alpha Platform Rebuild', status: OfferStatus.PENDING, rate: 95, currency_code: 'USD', duration_months: 6, work_schedule: fullTime, start_date: futureDate(30), message: 'Looking forward to working together.', expires_at: nowPlusDays(12) },
    { id: SEED_OFFERS.ACCEPTED, client_id: SEED_USERS.CLIENT_B, talent_id: SEED_USERS.TALENT_Y, job_listing_id: SEED_LISTINGS.SERVICE_BETA, contract_type: ContractType.SERVICE, contract_title: 'Beta UX Design Retainer', status: OfferStatus.ACCEPTED, rate: 120, currency_code: 'USD', duration_months: 3, work_schedule: custom30, start_date: futureDate(7), message: null, expires_at: nowPlusDays(12), accepted_at: nowMinusDays(2) },
    { id: SEED_OFFERS.DECLINED, client_id: SEED_USERS.CLIENT_A, talent_id: SEED_USERS.TALENT_Z, job_listing_id: SEED_LISTINGS.CONTRACT_DELTA, contract_type: ContractType.CONTRACT, contract_title: 'Delta Senior Engineer', status: OfferStatus.DECLINED, rate: 85, currency_code: 'USD', duration_months: 12, work_schedule: fullTime, start_date: futureDate(14), message: null, expires_at: nowMinusDays(1), declined_at: nowMinusDays(1), declined_reason: "The budget doesn't align with my current rate.", declined_chip: 'BUDGET_DOESNT_WORK' },
    { id: SEED_OFFERS.WITHDRAWN, client_id: SEED_USERS.CLIENT_A, talent_id: SEED_USERS.TALENT_Y, job_listing_id: SEED_LISTINGS.TEAM_GAMMA, contract_type: ContractType.TEAM, contract_title: 'Gamma Launch Team', status: OfferStatus.WITHDRAWN, rate: 100, currency_code: 'USD', duration_months: 4, work_schedule: fullTime, start_date: futureDate(60), message: null, expires_at: nowMinusDays(3), withdrawn_at: nowMinusDays(3), withdrawal_message: 'We have decided to pause this hiring initiative.' },
    { id: SEED_OFFERS.EXPIRED, client_id: SEED_USERS.CLIENT_B, talent_id: SEED_USERS.TALENT_X, job_listing_id: SEED_LISTINGS.PROJECT_ALPHA, contract_type: ContractType.PROJECT, contract_title: 'Alpha Mobile App Phase 2', status: OfferStatus.EXPIRED, rate: 90, currency_code: 'USD', duration_months: 3, work_schedule: custom30, start_date: futureDate(30), message: null, expires_at: nowMinusDays(10), expired_at: nowMinusDays(10) },
    { id: SEED_OFFERS.COUNTERED, client_id: SEED_USERS.CLIENT_A, talent_id: SEED_USERS.TALENT_X, job_listing_id: SEED_LISTINGS.SERVICE_BETA, contract_type: ContractType.SERVICE, contract_title: 'Beta API Integration Service', status: OfferStatus.COUNTERED, rate: 80, currency_code: 'USD', duration_months: 6, work_schedule: fullTime, start_date: futureDate(21), message: 'I think we can make this work.', expires_at: nowPlusDays(8) },
    { id: SEED_OFFERS.EXPIRED_30_DAYS, client_id: SEED_USERS.CLIENT_B, talent_id: SEED_USERS.TALENT_Z, job_listing_id: SEED_LISTINGS.TEAM_GAMMA, contract_type: ContractType.TEAM, contract_title: 'Gamma Data Team', status: OfferStatus.EXPIRED, rate: 110, currency_code: 'USD', duration_months: 6, work_schedule: fullTime, start_date: futureDate(60), message: null, expires_at: nowMinusDays(45), expired_at: nowMinusDays(45) },
    { id: SEED_OFFERS.EXPIRING_SOON, client_id: SEED_USERS.CLIENT_A, talent_id: SEED_USERS.TALENT_Y, job_listing_id: SEED_LISTINGS.CONTRACT_DELTA, contract_type: ContractType.CONTRACT, contract_title: 'Delta Frontend Lead', status: OfferStatus.PENDING, rate: 105, currency_code: 'USD', duration_months: 6, work_schedule: custom30, start_date: futureDate(14), message: null, expires_at: new Date(Date.now() + 20 * 60 * 60 * 1000), warning_sent_at: new Date(Date.now() - 4 * 60 * 60 * 1000) },
    { id: SEED_OFFERS.RESENT_ORIGINAL, client_id: SEED_USERS.CLIENT_B, talent_id: SEED_USERS.TALENT_Z, job_listing_id: SEED_LISTINGS.SERVICE_BETA, contract_type: ContractType.SERVICE, contract_title: 'Beta Analytics Service', status: OfferStatus.DECLINED, rate: 95, currency_code: 'USD', duration_months: 3, work_schedule: fullTime, start_date: futureDate(30), message: null, expires_at: nowMinusDays(20), declined_at: nowMinusDays(20), declined_reason: "The rate doesn't match current market rates.", declined_chip: 'BUDGET_DOESNT_WORK' },
    { id: SEED_OFFERS.RESENT, client_id: SEED_USERS.CLIENT_B, talent_id: SEED_USERS.TALENT_Z, job_listing_id: SEED_LISTINGS.SERVICE_BETA, contract_type: ContractType.SERVICE, contract_title: 'Beta Analytics Service', status: OfferStatus.PENDING, rate: 110, currency_code: 'USD', duration_months: 3, work_schedule: fullTime, start_date: futureDate(14), message: 'Revised the rate based on your feedback.', expires_at: nowPlusDays(14), original_offer_id: SEED_OFFERS.RESENT_ORIGINAL },
    { id: SEED_OFFERS.DIFFERENT_CURRENCY, client_id: SEED_USERS.CLIENT_B, talent_id: SEED_USERS.TALENT_Y, job_listing_id: SEED_LISTINGS.PROJECT_ALPHA, contract_type: ContractType.PROJECT, contract_title: 'Alpha European Expansion', status: OfferStatus.PENDING, rate: 88, currency_code: 'EUR', duration_months: 4, work_schedule: custom30, start_date: futureDate(45), message: null, expires_at: nowPlusDays(14) },
    { id: SEED_OFFERS.CO_MULTI_ROUND, client_id: SEED_USERS.CLIENT_A, talent_id: SEED_USERS.TALENT_X, job_listing_id: SEED_LISTINGS.CONTRACT_DELTA, contract_type: ContractType.CONTRACT, contract_title: 'Delta Principal Engineer', status: OfferStatus.COUNTERED, rate: 120, currency_code: 'USD', duration_months: 12, work_schedule: fullTime, start_date: futureDate(30), message: 'This is a senior role with significant ownership.', expires_at: nowPlusDays(5) },
  ]);

  console.log('[seed] Inserting counter offers...');
  await insert('counter_offers', [
    { id: SEED_COUNTER_OFFERS.PENDING, offer_id: SEED_OFFERS.COUNTERED, submitted_by: 'TALENT', submitted_by_id: SEED_USERS.TALENT_X, status: CounterOfferStatus.PENDING, rate: 100, currency_code: 'USD', duration_months: 6, work_schedule: fullTime, start_date: futureDate(28), message: 'I would need $100/hr given the scope.', expires_at: nowPlusDays(10) },
    { id: SEED_COUNTER_OFFERS.ROUND_3, offer_id: SEED_OFFERS.CO_MULTI_ROUND, submitted_by: 'CLIENT', submitted_by_id: SEED_USERS.CLIENT_A, status: CounterOfferStatus.PENDING, rate: 135, currency_code: 'USD', duration_months: 12, work_schedule: fullTime, start_date: futureDate(30), message: 'Final offer: $135/hr.', expires_at: nowPlusDays(5) },
    { id: SEED_COUNTER_OFFERS.ROUND_2, offer_id: SEED_OFFERS.CO_MULTI_ROUND, submitted_by: 'TALENT', submitted_by_id: SEED_USERS.TALENT_X, status: CounterOfferStatus.SUPERSEDED, rate: 145, currency_code: 'USD', duration_months: 12, work_schedule: fullTime, start_date: futureDate(30), message: '$145/hr is my rate for this seniority.', expires_at: nowMinusDays(2), superseded_at: nowMinusDays(2) },
    { id: SEED_COUNTER_OFFERS.ROUND_1, offer_id: SEED_OFFERS.CO_MULTI_ROUND, submitted_by: 'CLIENT', submitted_by_id: SEED_USERS.CLIENT_A, status: CounterOfferStatus.SUPERSEDED, rate: 125, currency_code: 'USD', duration_months: 12, work_schedule: fullTime, start_date: futureDate(30), message: '$125 is our budget for this role.', expires_at: nowMinusDays(5), superseded_at: nowMinusDays(5) },
  ]);

  console.log('[seed] Inserting offer history...');
  // Every row below carries the SAME key set (id, offer_id,
  // counter_offer_id, event_type, actor, actor_id, terms, created_at),
  // including explicit nulls where a field doesn't apply — insert()'s
  // column list is derived from row 0 only, so a later row with an extra
  // key that row 0 lacks would have that value silently dropped from the
  // INSERT rather than persisted (confirmed against SEED_OFFERS.ACCEPTED's
  // accepted_at/SEED_OFFERS.DECLINED's declined_at, which are NULL in the
  // DB today for exactly this reason — a pre-existing gap in this insert()
  // helper, not something this change fixes, just one this change avoids
  // tripping over).
  //
  // terms is a JS object per row (not pre-stringified) — insert()'s own
  // serialization (`typeof v === 'object' -> JSON.stringify(v)`) handles
  // the whole nested object, workSchedule included, in one pass.
  //
  // event_type values are the real OFFER_EVENTS constants used at the
  // matching outbox-write call sites in offers.service.ts /
  // counter-offers.service.ts. Note: counter-offers.service.ts's
  // create()/accept()/decline()/withdraw()/expireCO() and offers.service.ts's
  // expire() only ever write to outbox, never to offer_history — only
  // edit()/COUNTER_EDITED does. So OFFER_EVENTS.COUNTERED and
  // OFFER_EVENTS.EXPIRED below use real, correct constants, but a live
  // counter-offer submission or offer expiry would NOT actually produce a
  // history row like this today. Flagged as a finding, not fixed here —
  // out of scope for seeding test data the frontend can render against.
  const coMultiRoundStartDate = futureDate(30);
  const acceptedStartDate = futureDate(7);
  const declinedStartDate = futureDate(14);
  const expiredStartDate = futureDate(30);

  await insert('offer_history', [
    // --- CO_MULTI_ROUND: created, then three countered rounds ---
    {
      id: SEED_HISTORY.CO_MULTI_ROUND_CREATED,
      offer_id: SEED_OFFERS.CO_MULTI_ROUND,
      counter_offer_id: null,
      event_type: OFFER_EVENTS.CREATED,
      actor: 'CLIENT',
      actor_id: SEED_USERS.CLIENT_A,
      terms: { rate: 120, currencyCode: 'USD', durationMonths: 12, workSchedule: { type: 'FULL_TIME' }, startDate: coMultiRoundStartDate, message: 'This is a senior role with significant ownership.' },
      created_at: nowMinusDays(7),
    },
    {
      id: SEED_HISTORY.CO_MULTI_ROUND_COUNTERED_1,
      offer_id: SEED_OFFERS.CO_MULTI_ROUND,
      counter_offer_id: SEED_COUNTER_OFFERS.ROUND_1,
      event_type: OFFER_EVENTS.COUNTERED,
      actor: 'CLIENT',
      actor_id: SEED_USERS.CLIENT_A,
      terms: { rate: 125, currencyCode: 'USD', durationMonths: 12, workSchedule: { type: 'FULL_TIME' }, startDate: coMultiRoundStartDate, message: '$125 is our budget for this role.' },
      created_at: nowMinusDays(6),
    },
    {
      id: SEED_HISTORY.CO_MULTI_ROUND_COUNTERED_2,
      offer_id: SEED_OFFERS.CO_MULTI_ROUND,
      counter_offer_id: SEED_COUNTER_OFFERS.ROUND_2,
      event_type: OFFER_EVENTS.COUNTERED,
      actor: 'TALENT',
      actor_id: SEED_USERS.TALENT_X,
      terms: { rate: 145, currencyCode: 'USD', durationMonths: 12, workSchedule: { type: 'FULL_TIME' }, startDate: coMultiRoundStartDate, message: '$145/hr is my rate for this seniority.' },
      created_at: nowMinusDays(5),
    },
    {
      id: SEED_HISTORY.CO_MULTI_ROUND_COUNTERED_3,
      offer_id: SEED_OFFERS.CO_MULTI_ROUND,
      counter_offer_id: SEED_COUNTER_OFFERS.ROUND_3,
      event_type: OFFER_EVENTS.COUNTERED,
      actor: 'CLIENT',
      actor_id: SEED_USERS.CLIENT_A,
      terms: { rate: 135, currencyCode: 'USD', durationMonths: 12, workSchedule: { type: 'FULL_TIME' }, startDate: coMultiRoundStartDate, message: 'Final offer: $135/hr.' },
      created_at: nowMinusDays(2),
    },
    // --- ACCEPTED: created, then accepted (TALENT) ---
    {
      id: SEED_HISTORY.ACCEPTED_CREATED,
      offer_id: SEED_OFFERS.ACCEPTED,
      counter_offer_id: null,
      event_type: OFFER_EVENTS.CREATED,
      actor: 'CLIENT',
      actor_id: SEED_USERS.CLIENT_B,
      terms: { rate: 120, currencyCode: 'USD', durationMonths: 3, workSchedule: { type: 'CUSTOM', hoursPerWeek: 30 }, startDate: acceptedStartDate, message: null },
      created_at: nowMinusDays(5),
    },
    {
      id: SEED_HISTORY.ACCEPTED_ACCEPTED,
      offer_id: SEED_OFFERS.ACCEPTED,
      counter_offer_id: null,
      event_type: OFFER_EVENTS.ACCEPTED,
      actor: 'TALENT',
      actor_id: SEED_USERS.TALENT_Y,
      terms: { rate: 120, currencyCode: 'USD', durationMonths: 3, workSchedule: { type: 'CUSTOM', hoursPerWeek: 30 }, startDate: acceptedStartDate, message: null },
      created_at: nowMinusDays(2),
    },
    // --- DECLINED: created, then declined (TALENT) ---
    {
      id: SEED_HISTORY.DECLINED_CREATED,
      offer_id: SEED_OFFERS.DECLINED,
      counter_offer_id: null,
      event_type: OFFER_EVENTS.CREATED,
      actor: 'CLIENT',
      actor_id: SEED_USERS.CLIENT_A,
      terms: { rate: 85, currencyCode: 'USD', durationMonths: 12, workSchedule: { type: 'FULL_TIME' }, startDate: declinedStartDate, message: null },
      created_at: nowMinusDays(3),
    },
    {
      id: SEED_HISTORY.DECLINED_DECLINED,
      offer_id: SEED_OFFERS.DECLINED,
      counter_offer_id: null,
      event_type: OFFER_EVENTS.DECLINED,
      actor: 'TALENT',
      actor_id: SEED_USERS.TALENT_Z,
      terms: { rate: 85, currencyCode: 'USD', durationMonths: 12, workSchedule: { type: 'FULL_TIME' }, startDate: declinedStartDate, message: null },
      created_at: nowMinusDays(1),
    },
    // --- EXPIRED: created (CLIENT), then expired (SYSTEM, actor_id null) ---
    {
      id: SEED_HISTORY.EXPIRED_CREATED,
      offer_id: SEED_OFFERS.EXPIRED,
      counter_offer_id: null,
      event_type: OFFER_EVENTS.CREATED,
      actor: 'CLIENT',
      actor_id: SEED_USERS.CLIENT_B,
      terms: { rate: 90, currencyCode: 'USD', durationMonths: 3, workSchedule: { type: 'CUSTOM', hoursPerWeek: 30 }, startDate: expiredStartDate, message: null },
      created_at: nowMinusDays(13),
    },
    {
      id: SEED_HISTORY.EXPIRED_EXPIRED,
      offer_id: SEED_OFFERS.EXPIRED,
      counter_offer_id: null,
      event_type: OFFER_EVENTS.EXPIRED,
      actor: 'SYSTEM',
      actor_id: null,
      terms: { rate: 90, currencyCode: 'USD', durationMonths: 3, workSchedule: { type: 'CUSTOM', hoursPerWeek: 30 }, startDate: expiredStartDate, message: null },
      created_at: nowMinusDays(10),
    },
  ]);

  console.log('[seed] Seed complete.');
  console.log(`[seed] Offers: ${Object.keys(SEED_OFFERS).length}`);
  console.log(`[seed] Counter offers: 4`);
  console.log(`[seed] History events: 10`);
  await app.close();
}

seed().catch(err => { console.error('[seed] Error:', err); process.exit(1); });