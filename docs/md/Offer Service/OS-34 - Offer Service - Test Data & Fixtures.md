**OS-34**

**Offer Service --- Test Data & Fixtures**

**Unit fixtures:** plain objects (no DB) **Integration fixtures:**
persisted via TypeORM EntityManager **Pattern:** builder + fluent
overrides

This document provides the complete test data and fixture library for
offer-service. It separates unit test fixtures (plain TypeScript
objects, no DB dependency) from integration test fixtures (persisted to
the test database via EntityManager). It also provides a fluent
OfferScenarioBuilder for assembling complex multi-entity test scenarios
without writing repetitive setup code in every test.

**File Map**

  ---------- ------------------------------------------- ----------------------
  **Step**   **File Path**                               **Purpose**

  **1**      test/fixtures/offer.factory.ts              Plain-object offer
                                                         factories for ALL 6
                                                         offer states

  **2**      test/fixtures/counter-offer.factory.ts      Plain-object CO
                                                         factories for ALL 6 CO
                                                         states

  **3**      test/fixtures/offer-history.factory.ts      All 8 history event
                                                         type factories

  **4**      test/fixtures/outbox.factory.ts             Outbox event factories
                                                         for all status
                                                         transitions

  **5**      test/fixtures/offer-scenario-builder.ts     Fluent builder:
                                                         assemble any
                                                         multi-round scenario

  **6**      test/fixtures/db-offer.fixture.ts           Integration fixture:
                                                         persists offers to the
                                                         test DB

  **7**      test/fixtures/scenarios/index.ts            Pre-built scenario
                                                         registry --- import
                                                         and use directly

  **8**      (reference)                                 Usage patterns: unit
                                                         tests, integration
                                                         tests, E2E setup
  ---------- ------------------------------------------- ----------------------

+-----------------------------------------------------------------------+
| **Overview Two Types of Fixtures**                                    |
|                                                                       |
| When to use each                                                      |
+-----------------------------------------------------------------------+

  -------------------------- -------------------------------------------------
  **Unit test fixtures**     Plain TypeScript objects. No database.
                             Instantiated in microseconds. Import
                             createOffer(), createPendingCO() etc. Use with
                             jest.fn() mocked repositories.

  **Integration test         Persisted to the real test database via
  fixtures**                 EntityManager. Required for testing service
                             methods that run SQL (CAS queries, active offer
                             constraint). Use DbOfferFixture from Step 6.

  **When to use plain        Service-layer unit tests, state machine tests,
  factories**                payload builder tests. The vast majority of
                             tests.

  **When to use DB           Integration tests and E2E tests where real DB
  fixtures**                 behaviour (transactions, indexes, constraints)
                             must be verified.

  **OfferScenarioBuilder**   Used in BOTH contexts. Produces plain objects for
                             unit tests or persists them for integration tests
                             depending on which build\*() method you call.
  -------------------------- -------------------------------------------------

+-----------------------------------------------------------------------+
| Relation to OS-18 (Seed Data):                                        |
|                                                                       |
| OS-18 covers seed.ts and reset.ts --- scripts that populate the dev   |
| database with                                                         |
|                                                                       |
| realistic scenarios for manual exploration.                           |
|                                                                       |
| OS-34 covers test fixtures --- factories used programmatically inside |
| test files.                                                           |
|                                                                       |
| The difference: seeds are run once per dev session. Fixtures are      |
| created and                                                           |
|                                                                       |
| destroyed per test (beforeEach/afterEach truncation).                 |
|                                                                       |
| Both use the same seed-ids.ts constants for fixed UUIDs.              |
|                                                                       |
| Both share the same factory functions from this document.             |
+-----------------------------------------------------------------------+

+-----------------------------------------------------------------------+
| **Step 1 Offer Factory --- offer.factory.ts**                         |
|                                                                       |
| All 6 offer states with typed overrides                               |
+-----------------------------------------------------------------------+

  -----------------------------------------------------------------------
  **FILE: apps/offer-service/test/fixtures/offer.factory.ts**

  -----------------------------------------------------------------------

+-----------------------------------------------------------------------+
| import { Offer } from \'../../src/offers/entities/offer.entity\';     |
|                                                                       |
| import { OfferStatus } from                                           |
| \'../../src/offers/enums/offer-status.enum\';                         |
|                                                                       |
| import { ContractType } from                                          |
| \'../../src/offers/enums/contract-type.enum\';                        |
|                                                                       |
| import { WorkScheduleType } from                                      |
| \'../../src/offers/enums/work-schedule-type.enum\';                   |
|                                                                       |
| import { SEED_USERS, SEED_LISTINGS } from                             |
| \'../../seeds/constants/seed-ids\';                                   |
|                                                                       |
| // ============================================================       |
|                                                                       |
| // Base factory                                                       |
|                                                                       |
| // ============================================================       |
|                                                                       |
| /\*\* calculateExpiresAt: 14 days from now. \*/                       |
|                                                                       |
| function defaultExpiry(): Date {                                      |
|                                                                       |
| const d = new Date(); d.setDate(d.getDate() + 14); return d;          |
|                                                                       |
| }                                                                     |
|                                                                       |
| /\*\* pastDate(n): n days ago. \*/                                    |
|                                                                       |
| function pastDate(daysAgo: number): Date {                            |
|                                                                       |
| const d = new Date(); d.setDate(d.getDate() - daysAgo); return d;     |
|                                                                       |
| }                                                                     |
|                                                                       |
| /\*\* futureStr(n): n days from now as YYYY-MM-DD. \*/                |
|                                                                       |
| function futureStr(days: number): string {                            |
|                                                                       |
| const d = new Date(); d.setDate(d.getDate() + days);                  |
|                                                                       |
| return d.toISOString().split(\'T\')\[0\];                             |
|                                                                       |
| }                                                                     |
|                                                                       |
| /\*\*                                                                 |
|                                                                       |
| \* createOffer() --- Base factory. All fields have defaults.          |
|                                                                       |
| \* Override only the fields relevant to your test.                    |
|                                                                       |
| \*/                                                                   |
|                                                                       |
| export function createOffer(overrides: Partial\<Offer\> = {}): Offer  |
| {                                                                     |
|                                                                       |
| const now = new Date();                                               |
|                                                                       |
| return {                                                              |
|                                                                       |
| id: overrides.id ?? crypto.randomUUID(),                              |
|                                                                       |
| clientId: overrides.clientId ?? SEED_USERS.CLIENT_A,                  |
|                                                                       |
| talentId: overrides.talentId ?? SEED_USERS.TALENT_X,                  |
|                                                                       |
| jobListingId: overrides.jobListingId ?? SEED_LISTINGS.PROJECT_ALPHA,  |
|                                                                       |
| contractType: overrides.contractType ?? ContractType.PROJECT,         |
|                                                                       |
| contractTitle: overrides.contractTitle ?? \'Test Project\',           |
|                                                                       |
| status: overrides.status ?? OfferStatus.PENDING,                      |
|                                                                       |
| rate: overrides.rate ?? 95,                                           |
|                                                                       |
| currencyCode: overrides.currencyCode ?? \'USD\',                      |
|                                                                       |
| durationMonths: overrides.durationMonths ?? 6,                        |
|                                                                       |
| workSchedule: overrides.workSchedule ?? { type:                       |
| WorkScheduleType.FULL_TIME },                                         |
|                                                                       |
| startDate: overrides.startDate ?? futureStr(30),                      |
|                                                                       |
| message: overrides.message ?? null,                                   |
|                                                                       |
| expiresAt: overrides.expiresAt ?? defaultExpiry(),                    |
|                                                                       |
| warningSentAt: overrides.warningSentAt ?? null,                       |
|                                                                       |
| acceptedAt: overrides.acceptedAt ?? null,                             |
|                                                                       |
| declinedAt: overrides.declinedAt ?? null,                             |
|                                                                       |
| declinedReason: overrides.declinedReason ?? null,                     |
|                                                                       |
| declinedChip: overrides.declinedChip ?? null,                         |
|                                                                       |
| withdrawnAt: overrides.withdrawnAt ?? null,                           |
|                                                                       |
| withdrawalMessage: overrides.withdrawalMessage ?? null,               |
|                                                                       |
| expiredAt: overrides.expiredAt ?? null,                               |
|                                                                       |
| originalOfferId: overrides.originalOfferId ?? null,                   |
|                                                                       |
| counterOffers: overrides.counterOffers ?? \[\],                       |
|                                                                       |
| historyEvents: overrides.historyEvents ?? \[\],                       |
|                                                                       |
| createdAt: overrides.createdAt ?? now,                                |
|                                                                       |
| updatedAt: overrides.updatedAt ?? now,                                |
|                                                                       |
| } as Offer;                                                           |
|                                                                       |
| }                                                                     |
|                                                                       |
| // ============================================================       |
|                                                                       |
| // State-specific convenience factories                               |
|                                                                       |
| // ============================================================       |
|                                                                       |
| /\*\* PENDING: Active offer waiting for talent response. \*/          |
|                                                                       |
| export function createPendingOffer(o: Partial\<Offer\> = {}): Offer { |
|                                                                       |
| return createOffer({ \...o, status: OfferStatus.PENDING });           |
|                                                                       |
| }                                                                     |
|                                                                       |
| /\*\* ACCEPTED: Talent accepted. acceptedAt set. \*/                  |
|                                                                       |
| export function createAcceptedOffer(o: Partial\<Offer\> = {}): Offer  |
| {                                                                     |
|                                                                       |
| return createOffer({ status: OfferStatus.ACCEPTED, acceptedAt: new    |
| Date(), \...o });                                                     |
|                                                                       |
| }                                                                     |
|                                                                       |
| /\*\* DECLINED: Talent declined. Reason and chip required in real     |
| use. \*/                                                              |
|                                                                       |
| export function createDeclinedOffer(o: Partial\<Offer\> = {}): Offer  |
| {                                                                     |
|                                                                       |
| return createOffer({                                                  |
|                                                                       |
| status: OfferStatus.DECLINED,                                         |
|                                                                       |
| declinedAt: new Date(),                                               |
|                                                                       |
| declinedReason: \'Budget does not match current rates.\',             |
|                                                                       |
| declinedChip: \'BUDGET_DOESNT_WORK\',                                 |
|                                                                       |
| \...o,                                                                |
|                                                                       |
| });                                                                   |
|                                                                       |
| }                                                                     |
|                                                                       |
| /\*\* WITHDRAWN: Client withdrew the offer. \*/                       |
|                                                                       |
| export function createWithdrawnOffer(o: Partial\<Offer\> = {}): Offer |
| {                                                                     |
|                                                                       |
| return createOffer({                                                  |
|                                                                       |
| status: OfferStatus.WITHDRAWN,                                        |
|                                                                       |
| withdrawnAt: new Date(),                                              |
|                                                                       |
| withdrawalMessage: \'Pausing hiring for now.\',                       |
|                                                                       |
| \...o,                                                                |
|                                                                       |
| });                                                                   |
|                                                                       |
| }                                                                     |
|                                                                       |
| /\*\*                                                                 |
|                                                                       |
| \* EXPIRED within 30-day extension window.                            |
|                                                                       |
| \* canRequestExtension = true in the API response.                    |
|                                                                       |
| \*/                                                                   |
|                                                                       |
| export function createExpiredOfferRecent(o: Partial\<Offer\> = {}):   |
| Offer {                                                               |
|                                                                       |
| const expiredAt = pastDate(10); // Expired 10 days ago                |
|                                                                       |
| return createOffer({                                                  |
|                                                                       |
| status: OfferStatus.EXPIRED,                                          |
|                                                                       |
| expiresAt: expiredAt,                                                 |
|                                                                       |
| expiredAt,                                                            |
|                                                                       |
| \...o,                                                                |
|                                                                       |
| });                                                                   |
|                                                                       |
| }                                                                     |
|                                                                       |
| /\*\*                                                                 |
|                                                                       |
| \* EXPIRED beyond 30-day extension window.                            |
|                                                                       |
| \* canRequestExtension = false. Shows \"Ask Now\" button.             |
|                                                                       |
| \*/                                                                   |
|                                                                       |
| export function createExpiredOfferOld(o: Partial\<Offer\> = {}):      |
| Offer {                                                               |
|                                                                       |
| const expiredAt = pastDate(40); // Expired 40 days ago                |
|                                                                       |
| return createOffer({                                                  |
|                                                                       |
| status: OfferStatus.EXPIRED,                                          |
|                                                                       |
| expiresAt: expiredAt,                                                 |
|                                                                       |
| expiredAt,                                                            |
|                                                                       |
| \...o,                                                                |
|                                                                       |
| });                                                                   |
|                                                                       |
| }                                                                     |
|                                                                       |
| /\*\* COUNTERED: Has an active counter offer. \*/                     |
|                                                                       |
| export function createCounteredOffer(o: Partial\<Offer\> = {}): Offer |
| {                                                                     |
|                                                                       |
| return createOffer({ \...o, status: OfferStatus.COUNTERED });         |
|                                                                       |
| }                                                                     |
|                                                                       |
| /\*\* EXPIRING SOON: expires within 48h. Warning already sent. \*/    |
|                                                                       |
| export function createExpiringSoonOffer(o: Partial\<Offer\> = {}):    |
| Offer {                                                               |
|                                                                       |
| const expiresAt = new Date(Date.now() + 20 \* 60 \* 60 \* 1000); //   |
| 20h                                                                   |
|                                                                       |
| const warningSentAt = new Date(Date.now() - 4 \* 60 \* 60 \* 1000);   |
| // 4h ago                                                             |
|                                                                       |
| return createOffer({ expiresAt, warningSentAt, \...o });              |
|                                                                       |
| }                                                                     |
|                                                                       |
| /\*\* RESENT: New offer that is a resend of a terminal one. \*/       |
|                                                                       |
| export function createResentOffer(originalOfferId: string, o:         |
| Partial\<Offer\> = {}): Offer {                                       |
|                                                                       |
| return createOffer({ status: OfferStatus.PENDING, originalOfferId,    |
| \...o });                                                             |
|                                                                       |
| }                                                                     |
+-----------------------------------------------------------------------+

+-----------------------------------------------------------------------+
| **Step 2 Counter Offer Factory --- counter-offer.factory.ts**         |
|                                                                       |
| All 6 CO states                                                       |
+-----------------------------------------------------------------------+

  -----------------------------------------------------------------------
  **FILE: apps/offer-service/test/fixtures/counter-offer.factory.ts**

  -----------------------------------------------------------------------

+-----------------------------------------------------------------------+
| import { CounterOffer } from                                          |
| \'../../src/counter-offers/entities/counter-offer.entity\';           |
|                                                                       |
| import { CounterOfferStatus } from                                    |
| \'../../src/counter-offers/enums/counter-offer-status.enum\';         |
|                                                                       |
| import { WorkScheduleType } from                                      |
| \'../../src/offers/enums/work-schedule-type.enum\';                   |
|                                                                       |
| import { SEED_USERS, SEED_OFFERS } from                               |
| \'../../seeds/constants/seed-ids\';                                   |
|                                                                       |
| function defaultCOExpiry(): Date {                                    |
|                                                                       |
| const d = new Date(); d.setDate(d.getDate() + 14); return d;          |
|                                                                       |
| }                                                                     |
|                                                                       |
| export function createCounterOffer(o: Partial\<CounterOffer\> = {}):  |
| CounterOffer {                                                        |
|                                                                       |
| const now = new Date();                                               |
|                                                                       |
| return {                                                              |
|                                                                       |
| id: o.id ?? crypto.randomUUID(),                                      |
|                                                                       |
| offerId: o.offerId ?? SEED_OFFERS.COUNTERED,                          |
|                                                                       |
| submittedBy: o.submittedBy ?? \'TALENT\',                             |
|                                                                       |
| submittedById: o.submittedById ?? SEED_USERS.TALENT_X,                |
|                                                                       |
| status: o.status ?? CounterOfferStatus.PENDING,                       |
|                                                                       |
| rate: o.rate ?? 110,                                                  |
|                                                                       |
| currencyCode: o.currencyCode ?? \'USD\',                              |
|                                                                       |
| durationMonths: o.durationMonths ?? 6,                                |
|                                                                       |
| workSchedule: o.workSchedule ?? { type: WorkScheduleType.FULL_TIME }, |
|                                                                       |
| startDate: o.startDate ?? futureStr(28),                              |
|                                                                       |
| message: o.message ?? null,                                           |
|                                                                       |
| expiresAt: o.expiresAt ?? defaultCOExpiry(),                          |
|                                                                       |
| warningSentAt: o.warningSentAt ?? null,                               |
|                                                                       |
| acceptedAt: o.acceptedAt ?? null,                                     |
|                                                                       |
| declinedAt: o.declinedAt ?? null,                                     |
|                                                                       |
| withdrawnAt: o.withdrawnAt ?? null,                                   |
|                                                                       |
| withdrawalMessage: o.withdrawalMessage ?? null,                       |
|                                                                       |
| expiredAt: o.expiredAt ?? null,                                       |
|                                                                       |
| supersededAt: o.supersededAt ?? null,                                 |
|                                                                       |
| offer: o.offer ?? undefined as any,                                   |
|                                                                       |
| historyEvents: o.historyEvents ?? \[\],                               |
|                                                                       |
| createdAt: o.createdAt ?? now,                                        |
|                                                                       |
| updatedAt: o.updatedAt ?? now,                                        |
|                                                                       |
| } as CounterOffer;                                                    |
|                                                                       |
| }                                                                     |
|                                                                       |
| function futureStr(days: number): string {                            |
|                                                                       |
| const d = new Date(); d.setDate(d.getDate() + days);                  |
|                                                                       |
| return d.toISOString().split(\'T\')\[0\];                             |
|                                                                       |
| }                                                                     |
|                                                                       |
| // State-specific factories                                           |
|                                                                       |
| export const createPendingCO = (o: Partial\<CounterOffer\> = {}) =\>  |
| createCounterOffer({ \...o, status: CounterOfferStatus.PENDING });    |
|                                                                       |
| export const createAcceptedCO = (o: Partial\<CounterOffer\> = {}) =\> |
| createCounterOffer({ status: CounterOfferStatus.ACCEPTED, acceptedAt: |
| new Date(), \...o });                                                 |
|                                                                       |
| export const createDeclinedCO = (o: Partial\<CounterOffer\> = {}) =\> |
| createCounterOffer({ status: CounterOfferStatus.DECLINED, declinedAt: |
| new Date(), \...o });                                                 |
|                                                                       |
| export const createWithdrawnCO = (o: Partial\<CounterOffer\> = {})    |
| =\> createCounterOffer({ status: CounterOfferStatus.WITHDRAWN,        |
| withdrawnAt: new Date(), withdrawalMessage: \'Reconsidering.\', \...o |
| });                                                                   |
|                                                                       |
| export const createSupersededCO = (o: Partial\<CounterOffer\> = {})   |
| =\> createCounterOffer({ status: CounterOfferStatus.SUPERSEDED,       |
| supersededAt: new Date(), \...o });                                   |
|                                                                       |
| export function createExpiredCO(daysAgo = 1, o:                       |
| Partial\<CounterOffer\> = {}): CounterOffer {                         |
|                                                                       |
| const past = new Date(); past.setDate(past.getDate() - daysAgo);      |
|                                                                       |
| return createCounterOffer({ status: CounterOfferStatus.EXPIRED,       |
| expiresAt: past, expiredAt: past, \...o });                           |
|                                                                       |
| }                                                                     |
|                                                                       |
| /\*\* CLIENT counter offer (client responds to talent CO). \*/        |
|                                                                       |
| export function createClientCO(offerId: string, rate: number,         |
| clientId: string, o: Partial\<CounterOffer\> = {}): CounterOffer {    |
|                                                                       |
| return createCounterOffer({                                           |
|                                                                       |
| offerId,                                                              |
|                                                                       |
| submittedBy: \'CLIENT\',                                              |
|                                                                       |
| submittedById: clientId,                                              |
|                                                                       |
| rate,                                                                 |
|                                                                       |
| \...o,                                                                |
|                                                                       |
| });                                                                   |
|                                                                       |
| }                                                                     |
|                                                                       |
| /\*\* CO with rate warning: talent asks \>25% above parent rate. \*/  |
|                                                                       |
| export function createHighRateCO(parentRate: number, offerId: string, |
| o: Partial\<CounterOffer\> = {}): CounterOffer {                      |
|                                                                       |
| const coRate = Math.ceil(parentRate \* 1.25) + 1; // Just above       |
| threshold                                                             |
|                                                                       |
| return createPendingCO({ offerId, rate: coRate, \...o });             |
|                                                                       |
| }                                                                     |
+-----------------------------------------------------------------------+

+-----------------------------------------------------------------------+
| **Step 3 & 4 History & Outbox Factories**                             |
|                                                                       |
| All event types for both tables                                       |
+-----------------------------------------------------------------------+

  -----------------------------------------------------------------------
  **FILE: apps/offer-service/test/fixtures/offer-history.factory.ts**

  -----------------------------------------------------------------------

+-----------------------------------------------------------------------+
| import { OfferHistoryEvent } from                                     |
| \'../../src/offer-history/entities/offer-history-event.entity\';      |
|                                                                       |
| import { SEED_OFFERS, SEED_USERS } from                               |
| \'../../seeds/constants/seed-ids\';                                   |
|                                                                       |
| export function createHistoryEvent(o: Partial\<OfferHistoryEvent\> =  |
| {}): OfferHistoryEvent {                                              |
|                                                                       |
| return {                                                              |
|                                                                       |
| id: o.id ?? crypto.randomUUID(),                                      |
|                                                                       |
| offerId: o.offerId ?? SEED_OFFERS.PENDING,                            |
|                                                                       |
| counterOfferId: o.counterOfferId ?? null,                             |
|                                                                       |
| eventType: o.eventType ?? \'offer.created\',                          |
|                                                                       |
| actor: o.actor ?? \'CLIENT\',                                         |
|                                                                       |
| actorId: o.actorId ?? SEED_USERS.CLIENT_A,                            |
|                                                                       |
| terms: o.terms ?? {                                                   |
|                                                                       |
| rate: 95, currencyCode: \'USD\', durationMonths: 6,                   |
|                                                                       |
| workSchedule: { type: \'FULL_TIME\' }, startDate: futureStr(30),      |
| message: null,                                                        |
|                                                                       |
| },                                                                    |
|                                                                       |
| offer: o.offer ?? undefined as any,                                   |
|                                                                       |
| counterOffer: o.counterOffer ?? null,                                 |
|                                                                       |
| createdAt: o.createdAt ?? new Date(),                                 |
|                                                                       |
| } as OfferHistoryEvent;                                               |
|                                                                       |
| }                                                                     |
|                                                                       |
| function futureStr(days: number): string { const d=new Date();        |
| d.setDate(d.getDate()+days); return                                   |
| d.toISOString().split(\'T\')\[0\]; }                                  |
|                                                                       |
| export const createOfferCreatedEvent = (o={}) =\>                     |
| createHistoryEvent({ eventType: \'offer.created\', actor: \'CLIENT\', |
| \...o });                                                             |
|                                                                       |
| export const createOfferEditedEvent = (o={}) =\> createHistoryEvent({ |
| eventType: \'offer.edited\', actor: \'CLIENT\', \...o });             |
|                                                                       |
| export const createOfferAcceptedEvent = (o={}) =\>                    |
| createHistoryEvent({ eventType: \'offer.accepted\', actor:            |
| \'TALENT\', \...o });                                                 |
|                                                                       |
| export const createOfferDeclinedEvent = (o={}) =\>                    |
| createHistoryEvent({ eventType: \'offer.declined\', actor:            |
| \'TALENT\', \...o });                                                 |
|                                                                       |
| export const createOfferWithdrawnEvent = (o={}) =\>                   |
| createHistoryEvent({ eventType: \'offer.withdrawn\', actor:           |
| \'CLIENT\', \...o });                                                 |
|                                                                       |
| export const createOfferExpiredEvent = (o={}) =\>                     |
| createHistoryEvent({ eventType: \'offer.expired\', actor: \'SYSTEM\', |
| actorId: null, \...o });                                              |
|                                                                       |
| export const createOfferCounteredEvent = (o={}) =\>                   |
| createHistoryEvent({ eventType: \'offer.countered\', actor:           |
| \'TALENT\', \...o });                                                 |
|                                                                       |
| export const createCOAcceptedEvent = (o={}) =\> createHistoryEvent({  |
| eventType: \'offer.counter_accepted\', actor: \'CLIENT\', \...o });   |
|                                                                       |
| export const createCODeclinedEvent = (o={}) =\> createHistoryEvent({  |
| eventType: \'offer.counter_declined\', actor: \'CLIENT\', \...o });   |
|                                                                       |
| export const createCOWithdrawnEvent = (o={}) =\> createHistoryEvent({ |
| eventType: \'offer.counter_withdrawn\',actor: \'TALENT\', \...o });   |
|                                                                       |
| export const createCOEditedEvent = (o={}) =\> createHistoryEvent({    |
| eventType: \'offer.counter_edited\', actor: \'TALENT\', \...o });     |
|                                                                       |
| export const createCOExpiredEvent = (o={}) =\> createHistoryEvent({   |
| eventType: \'offer.counter_expired\', actor: \'SYSTEM\', actorId:     |
| null, \...o });                                                       |
|                                                                       |
| export const createOfferResentEvent = (o={}) =\> createHistoryEvent({ |
| eventType: \'offer.resent\', actor: \'CLIENT\', \...o });             |
+-----------------------------------------------------------------------+

  -----------------------------------------------------------------------
  **FILE: apps/offer-service/test/fixtures/outbox.factory.ts**

  -----------------------------------------------------------------------

+-----------------------------------------------------------------------+
| import { OutboxEvent, OutboxEventStatus } from                        |
| \'../../src/outbox/entities/outbox-event.entity\';                    |
|                                                                       |
| import { SEED_OFFERS } from \'../../seeds/constants/seed-ids\';       |
|                                                                       |
| export function createOutboxEvent(o: Partial\<OutboxEvent\> = {}):    |
| OutboxEvent {                                                         |
|                                                                       |
| const now = new Date();                                               |
|                                                                       |
| return {                                                              |
|                                                                       |
| id: o.id ?? crypto.randomUUID(),                                      |
|                                                                       |
| aggregateId: o.aggregateId ?? SEED_OFFERS.PENDING,                    |
|                                                                       |
| aggregateType: o.aggregateType ?? \'offer\',                          |
|                                                                       |
| eventType: o.eventType ?? \'offer.created\',                          |
|                                                                       |
| exchange: o.exchange ?? \'marketeq.offers\',                          |
|                                                                       |
| routingKey: o.routingKey ?? \'offer.created\',                        |
|                                                                       |
| payload: o.payload ?? { offerId: SEED_OFFERS.PENDING },               |
|                                                                       |
| status: o.status ?? OutboxEventStatus.PENDING,                        |
|                                                                       |
| retryCount: o.retryCount ?? 0,                                        |
|                                                                       |
| lastError: o.lastError ?? null,                                       |
|                                                                       |
| scheduledAt: o.scheduledAt ?? now,                                    |
|                                                                       |
| processedAt: o.processedAt ?? null,                                   |
|                                                                       |
| createdAt: o.createdAt ?? now,                                        |
|                                                                       |
| updatedAt: o.updatedAt ?? now,                                        |
|                                                                       |
| } as OutboxEvent;                                                     |
|                                                                       |
| }                                                                     |
|                                                                       |
| /\*\* FAILED event after max retries. \*/                             |
|                                                                       |
| export function createFailedOutboxEvent(o: Partial\<OutboxEvent\> =   |
| {}): OutboxEvent {                                                    |
|                                                                       |
| return createOutboxEvent({                                            |
|                                                                       |
| status: OutboxEventStatus.FAILED,                                     |
|                                                                       |
| retryCount: 10,                                                       |
|                                                                       |
| lastError: \'Connection refused after 10 attempts.\',                 |
|                                                                       |
| \...o,                                                                |
|                                                                       |
| });                                                                   |
|                                                                       |
| }                                                                     |
|                                                                       |
| /\*\* PROCESSING event (claimed by outbox processor). \*/             |
|                                                                       |
| export function createProcessingOutboxEvent(o: Partial\<OutboxEvent\> |
| = {}): OutboxEvent {                                                  |
|                                                                       |
| return createOutboxEvent({ status: OutboxEventStatus.PROCESSING,      |
| \...o });                                                             |
|                                                                       |
| }                                                                     |
|                                                                       |
| /\*\* Pending event scheduled for backoff retry (in the future). \*/  |
|                                                                       |
| export function createBackoffOutboxEvent(retryCount: number, o:       |
| Partial\<OutboxEvent\> = {}): OutboxEvent {                           |
|                                                                       |
| const backoffMs = Math.pow(2, retryCount) \* 60 \* 1000;              |
|                                                                       |
| const scheduledAt = new Date(Date.now() + backoffMs);                 |
|                                                                       |
| return createOutboxEvent({                                            |
|                                                                       |
| status: OutboxEventStatus.PENDING,                                    |
|                                                                       |
| retryCount,                                                           |
|                                                                       |
| lastError: \`Attempt \${retryCount} failed: timeout.\`,               |
|                                                                       |
| scheduledAt,                                                          |
|                                                                       |
| \...o,                                                                |
|                                                                       |
| });                                                                   |
|                                                                       |
| }                                                                     |
+-----------------------------------------------------------------------+

+-----------------------------------------------------------------------+
| **Step 5 OfferScenarioBuilder --- offer-scenario-builder.ts**         |
|                                                                       |
| Fluent builder for any multi-round negotiation scenario               |
+-----------------------------------------------------------------------+

The OfferScenarioBuilder lets you construct complete multi-entity
scenarios fluently without writing setup boilerplate in every test. Call
.build() for plain objects (unit tests) or pass an EntityManager to
.save() for integration tests.

  -----------------------------------------------------------------------
  **FILE: apps/offer-service/test/fixtures/offer-scenario-builder.ts**

  -----------------------------------------------------------------------

+-----------------------------------------------------------------------+
| import { EntityManager } from \'typeorm\';                            |
|                                                                       |
| import { Offer } from \'../../src/offers/entities/offer.entity\';     |
|                                                                       |
| import { CounterOffer } from                                          |
| \'../../src/counter-offers/entities/counter-offer.entity\';           |
|                                                                       |
| import { OfferHistoryEvent } from                                     |
| \'../../src/offer-history/entities/offer-history-event.entity\';      |
|                                                                       |
| import { OfferStatus } from                                           |
| \'../../src/offers/enums/offer-status.enum\';                         |
|                                                                       |
| import { CounterOfferStatus } from                                    |
| \'../../src/counter-offers/enums/counter-offer-status.enum\';         |
|                                                                       |
| import { createOffer, createCounteredOffer, createAcceptedOffer,      |
| createExpiredOfferRecent } from \'./offer.factory\';                  |
|                                                                       |
| import { createPendingCO, createAcceptedCO, createDeclinedCO,         |
| createSupersededCO, createExpiredCO } from                            |
| \'./counter-offer.factory\';                                          |
|                                                                       |
| import { createHistoryEvent } from \'./offer-history.factory\';       |
|                                                                       |
| import { SEED_USERS } from \'../../seeds/constants/seed-ids\';        |
|                                                                       |
| export interface ScenarioResult {                                     |
|                                                                       |
| offer: Offer;                                                         |
|                                                                       |
| counterOffers: CounterOffer\[\]; // All COs, ordered chronologically  |
|                                                                       |
| activeCO: CounterOffer \| null; // Current PENDING CO (if any)        |
|                                                                       |
| history: OfferHistoryEvent\[\];                                       |
|                                                                       |
| }                                                                     |
|                                                                       |
| /\*\*                                                                 |
|                                                                       |
| \* OfferScenarioBuilder --- Fluent builder for test scenarios.        |
|                                                                       |
| \*                                                                    |
|                                                                       |
| \* \@example                                                          |
|                                                                       |
| \* // Single round CO (most common scenario):                         |
|                                                                       |
| \* const scenario = new OfferScenarioBuilder()                        |
|                                                                       |
| \* .withOffer({ rate: 90 })                                           |
|                                                                       |
| \* .withTalentCO({ rate: 110 })                                       |
|                                                                       |
| \* .build();                                                          |
|                                                                       |
| \*                                                                    |
|                                                                       |
| \* // Three-round negotiation ending in acceptance:                   |
|                                                                       |
| \* const scenario = new OfferScenarioBuilder()                        |
|                                                                       |
| \* .withOffer({ rate: 120 })                                          |
|                                                                       |
| \* .withTalentCO({ rate: 145 }).declined()                            |
|                                                                       |
| \* .withClientCO({ rate: 130 }).declined()                            |
|                                                                       |
| \* .withTalentCO({ rate: 135 }).accepted()                            |
|                                                                       |
| \* .build();                                                          |
|                                                                       |
| \*/                                                                   |
|                                                                       |
| export class OfferScenarioBuilder {                                   |
|                                                                       |
| private offerOverrides: Partial\<Offer\> = {};                        |
|                                                                       |
| private coSteps: Array\<{                                             |
|                                                                       |
| party: \'CLIENT\' \| \'TALENT\';                                      |
|                                                                       |
| rate: number;                                                         |
|                                                                       |
| terminal: \'accepted\' \| \'declined\' \| \'withdrawn\' \|            |
| \'expired\' \| null;                                                  |
|                                                                       |
| }\> = \[\];                                                           |
|                                                                       |
| withOffer(overrides: Partial\<Offer\>): this {                        |
|                                                                       |
| this.offerOverrides = overrides;                                      |
|                                                                       |
| return this;                                                          |
|                                                                       |
| }                                                                     |
|                                                                       |
| withTalentCO(overrides: { rate: number; message?: string }): COStep { |
|                                                                       |
| return new COStep(this, \'TALENT\', overrides.rate);                  |
|                                                                       |
| }                                                                     |
|                                                                       |
| withClientCO(overrides: { rate: number; message?: string }): COStep { |
|                                                                       |
| return new COStep(this, \'CLIENT\', overrides.rate);                  |
|                                                                       |
| }                                                                     |
|                                                                       |
| /\*\* \@internal called by COStep \*/                                 |
|                                                                       |
| \_addStep(                                                            |
|                                                                       |
| party: \'CLIENT\' \| \'TALENT\',                                      |
|                                                                       |
| rate: number,                                                         |
|                                                                       |
| terminal: \'accepted\' \| \'declined\' \| \'withdrawn\' \|            |
| \'expired\' \| null,                                                  |
|                                                                       |
| ): this {                                                             |
|                                                                       |
| this.coSteps.push({ party, rate, terminal });                         |
|                                                                       |
| return this;                                                          |
|                                                                       |
| }                                                                     |
|                                                                       |
| /\*\*                                                                 |
|                                                                       |
| \* build() --- Returns plain objects. No database.                    |
|                                                                       |
| \* Use in unit tests.                                                 |
|                                                                       |
| \*/                                                                   |
|                                                                       |
| build(): ScenarioResult {                                             |
|                                                                       |
| const offerId = this.offerOverrides.id ?? crypto.randomUUID();        |
|                                                                       |
| const clientId = this.offerOverrides.clientId ?? SEED_USERS.CLIENT_A; |
|                                                                       |
| const talentId = this.offerOverrides.talentId ?? SEED_USERS.TALENT_X; |
|                                                                       |
| const counterOffers: CounterOffer\[\] = \[\];                         |
|                                                                       |
| const history: OfferHistoryEvent\[\] = \[\];                          |
|                                                                       |
| let activeCO: CounterOffer \| null = null;                            |
|                                                                       |
| // Determine final offer status based on last CO terminal state.      |
|                                                                       |
| const lastStep = this.coSteps\[this.coSteps.length - 1\];             |
|                                                                       |
| let offerStatus: OfferStatus;                                         |
|                                                                       |
| if (!lastStep) {                                                      |
|                                                                       |
| offerStatus = OfferStatus.PENDING;                                    |
|                                                                       |
| } else if (lastStep.terminal === \'accepted\') {                      |
|                                                                       |
| offerStatus = OfferStatus.ACCEPTED;                                   |
|                                                                       |
| } else if (lastStep.terminal === null) {                              |
|                                                                       |
| offerStatus = OfferStatus.COUNTERED;                                  |
|                                                                       |
| } else {                                                              |
|                                                                       |
| offerStatus = OfferStatus.PENDING; // Restored after CO terminal      |
|                                                                       |
| }                                                                     |
|                                                                       |
| const offer = createOffer({                                           |
|                                                                       |
| id: offerId, clientId, talentId,                                      |
|                                                                       |
| status: offerStatus,                                                  |
|                                                                       |
| \...this.offerOverrides,                                              |
|                                                                       |
| });                                                                   |
|                                                                       |
| history.push(createHistoryEvent({                                     |
|                                                                       |
| offerId, eventType: \'offer.created\', actor: \'CLIENT\', actorId:    |
| clientId,                                                             |
|                                                                       |
| }));                                                                  |
|                                                                       |
| this.coSteps.forEach((step, i) =\> {                                  |
|                                                                       |
| const coId = crypto.randomUUID();                                     |
|                                                                       |
| const isLast = i === this.coSteps.length - 1;                         |
|                                                                       |
| const submitterId = step.party === \'TALENT\' ? talentId : clientId;  |
|                                                                       |
| let co: CounterOffer;                                                 |
|                                                                       |
| if (isLast && step.terminal === null) {                               |
|                                                                       |
| co = createPendingCO({ id: coId, offerId, submittedBy: step.party,    |
| submittedById: submitterId, rate: step.rate });                       |
|                                                                       |
| activeCO = co;                                                        |
|                                                                       |
| } else if (step.terminal === \'accepted\') {                          |
|                                                                       |
| co = createAcceptedCO({ id: coId, offerId, submittedBy: step.party,   |
| submittedById: submitterId, rate: step.rate });                       |
|                                                                       |
| } else if (step.terminal === \'declined\') {                          |
|                                                                       |
| co = createDeclinedCO({ id: coId, offerId, submittedBy: step.party,   |
| submittedById: submitterId, rate: step.rate });                       |
|                                                                       |
| } else if (step.terminal === \'expired\') {                           |
|                                                                       |
| co = createExpiredCO(1, { id: coId, offerId, submittedBy: step.party, |
| submittedById: submitterId, rate: step.rate });                       |
|                                                                       |
| } else {                                                              |
|                                                                       |
| co = createSupersededCO({ id: coId, offerId, submittedBy: step.party, |
| submittedById: submitterId, rate: step.rate });                       |
|                                                                       |
| }                                                                     |
|                                                                       |
| counterOffers.push(co);                                               |
|                                                                       |
| history.push(createHistoryEvent({                                     |
|                                                                       |
| offerId, counterOfferId: coId, eventType: \'offer.countered\',        |
|                                                                       |
| actor: step.party, actorId: submitterId,                              |
|                                                                       |
| }));                                                                  |
|                                                                       |
| });                                                                   |
|                                                                       |
| return { offer, counterOffers, activeCO, history };                   |
|                                                                       |
| }                                                                     |
|                                                                       |
| }                                                                     |
|                                                                       |
| /\*\* Fluent CO step --- chain .accepted(), .declined(),              |
| .withdrawn(), .expired() or nothing (leaves PENDING). \*/             |
|                                                                       |
| class COStep {                                                        |
|                                                                       |
| constructor(                                                          |
|                                                                       |
| private readonly builder: OfferScenarioBuilder,                       |
|                                                                       |
| private readonly party: \'CLIENT\' \| \'TALENT\',                     |
|                                                                       |
| private readonly rate: number,                                        |
|                                                                       |
| ) {                                                                   |
|                                                                       |
| this.builder.\_addStep(party, rate, null);                            |
|                                                                       |
| }                                                                     |
|                                                                       |
| accepted(): OfferScenarioBuilder { return                             |
| this.builder.\_addStep(this.party, this.rate, \'accepted\'); }        |
|                                                                       |
| declined(): OfferScenarioBuilder { return                             |
| this.builder.\_addStep(this.party, this.rate, \'declined\'); }        |
|                                                                       |
| withdrawn(): OfferScenarioBuilder { return                            |
| this.builder.\_addStep(this.party, this.rate, \'withdrawn\'); }       |
|                                                                       |
| expired(): OfferScenarioBuilder { return                              |
| this.builder.\_addStep(this.party, this.rate, \'expired\'); }         |
|                                                                       |
| }                                                                     |
+-----------------------------------------------------------------------+

+-----------------------------------------------------------------------+
| **Step 6 DB Fixture --- db-offer.fixture.ts**                         |
|                                                                       |
| Persists scenarios to the integration test database                   |
+-----------------------------------------------------------------------+

  -----------------------------------------------------------------------
  **FILE: apps/offer-service/test/fixtures/db-offer.fixture.ts**

  -----------------------------------------------------------------------

+-----------------------------------------------------------------------+
| import { EntityManager } from \'typeorm\';                            |
|                                                                       |
| import { Offer } from \'../../src/offers/entities/offer.entity\';     |
|                                                                       |
| import { CounterOffer } from                                          |
| \'../../src/counter-offers/entities/counter-offer.entity\';           |
|                                                                       |
| import { OfferHistoryEvent } from                                     |
| \'../../src/offer-history/entities/offer-history-event.entity\';      |
|                                                                       |
| import { OfferScenarioBuilder, ScenarioResult } from                  |
| \'./offer-scenario-builder\';                                         |
|                                                                       |
| /\*\*                                                                 |
|                                                                       |
| \* DbOfferFixture --- Persists a scenario to the integration test     |
| database.                                                             |
|                                                                       |
| \*                                                                    |
|                                                                       |
| \* Usage in integration tests:                                        |
|                                                                       |
| \* const fixture = new DbOfferFixture(em);                            |
|                                                                       |
| \* const { offer, activeCO } = await fixture.createCounteredOffer({   |
| rate: 90 }, { rate: 110 });                                           |
|                                                                       |
| \*/                                                                   |
|                                                                       |
| export class DbOfferFixture {                                         |
|                                                                       |
| constructor(private readonly em: EntityManager) {}                    |
|                                                                       |
| /\*\* Persist a ScenarioResult to the DB. Returns the saved entities. |
| \*/                                                                   |
|                                                                       |
| async save(scenario: ScenarioResult): Promise\<ScenarioResult\> {     |
|                                                                       |
| const savedOffer = await this.em.save(Offer, scenario.offer);         |
|                                                                       |
| const savedCOs = await this.em.save(CounterOffer,                     |
| scenario.counterOffers);                                              |
|                                                                       |
| await this.em.save(OfferHistoryEvent, scenario.history);              |
|                                                                       |
| return {                                                              |
|                                                                       |
| offer: savedOffer,                                                    |
|                                                                       |
| counterOffers: savedCOs,                                              |
|                                                                       |
| activeCO: savedCOs.find(co =\> co.status === \'PENDING\') ?? null,    |
|                                                                       |
| history: scenario.history,                                            |
|                                                                       |
| };                                                                    |
|                                                                       |
| }                                                                     |
|                                                                       |
| /\*\* Create a PENDING offer in the DB. \*/                           |
|                                                                       |
| async createPendingOffer(overrides: Record\<string, unknown\> = {}):  |
| Promise\<ScenarioResult\> {                                           |
|                                                                       |
| return this.save(new OfferScenarioBuilder().withOffer(overrides as    |
| any).build());                                                        |
|                                                                       |
| }                                                                     |
|                                                                       |
| /\*\* Create a COUNTERED offer (offer + 1 pending CO). \*/            |
|                                                                       |
| async createCounteredOffer(                                           |
|                                                                       |
| offerOverrides: Record\<string, unknown\> = {},                       |
|                                                                       |
| coOverrides: Record\<string, unknown\> = {},                          |
|                                                                       |
| ): Promise\<ScenarioResult\> {                                        |
|                                                                       |
| return this.save(                                                     |
|                                                                       |
| new OfferScenarioBuilder()                                            |
|                                                                       |
| .withOffer(offerOverrides as any)                                     |
|                                                                       |
| .withTalentCO({ rate: (coOverrides.rate as number) ?? 110 })          |
|                                                                       |
| .build()                                                              |
|                                                                       |
| );                                                                    |
|                                                                       |
| }                                                                     |
|                                                                       |
| /\*\* Create offer + 3-round negotiation (last CO pending). \*/       |
|                                                                       |
| async createThreeRoundOffer(                                          |
|                                                                       |
| parentRate = 120,                                                     |
|                                                                       |
| ): Promise\<ScenarioResult\> {                                        |
|                                                                       |
| return this.save(                                                     |
|                                                                       |
| new OfferScenarioBuilder()                                            |
|                                                                       |
| .withOffer({ rate: parentRate })                                      |
|                                                                       |
| .withTalentCO({ rate: parentRate + 25 }).declined()                   |
|                                                                       |
| .withClientCO({ rate: parentRate + 10 }).declined()                   |
|                                                                       |
| .withTalentCO({ rate: parentRate + 15 })                              |
|                                                                       |
| .build()                                                              |
|                                                                       |
| );                                                                    |
|                                                                       |
| }                                                                     |
|                                                                       |
| /\*\* Create an accepted offer + CO. \*/                              |
|                                                                       |
| async createAcceptedViaCounterOffer(parentRate = 90, coRate = 110):   |
| Promise\<ScenarioResult\> {                                           |
|                                                                       |
| return this.save(                                                     |
|                                                                       |
| new OfferScenarioBuilder()                                            |
|                                                                       |
| .withOffer({ rate: parentRate })                                      |
|                                                                       |
| .withTalentCO({ rate: coRate }).accepted()                            |
|                                                                       |
| .build()                                                              |
|                                                                       |
| );                                                                    |
|                                                                       |
| }                                                                     |
|                                                                       |
| }                                                                     |
|                                                                       |
| // ============================================================       |
|                                                                       |
| // Usage in integration tests:                                        |
|                                                                       |
| // ============================================================       |
|                                                                       |
| // describe(\'OffersService.declineCO()\', () =\> {                   |
|                                                                       |
| // it(\'restores parent to PENDING when CO is declined\', async ()    |
| =\> {                                                                 |
|                                                                       |
| // const fixture = new DbOfferFixture(em);                            |
|                                                                       |
| // const { offer, activeCO } = await fixture.createCounteredOffer({   |
| rate: 90 });                                                          |
|                                                                       |
| //                                                                    |
|                                                                       |
| // await service.declineCO(offer.id, activeCO!.id, offer.clientId);   |
|                                                                       |
| //                                                                    |
|                                                                       |
| // const updated = await offerRepo.findOne({ where: { id: offer.id }  |
| });                                                                   |
|                                                                       |
| // expect(updated?.status).toBe(OfferStatus.PENDING);                 |
|                                                                       |
| // });                                                                |
|                                                                       |
| // });                                                                |
+-----------------------------------------------------------------------+

+-----------------------------------------------------------------------+
| **Step 7 Pre-Built Scenario Registry --- scenarios/index.ts**         |
|                                                                       |
| Named scenarios for the most common test setups                       |
+-----------------------------------------------------------------------+

The scenario registry exports named, pre-built plain-object scenarios
for the most frequently used test setups. Import the scenario you need
by name without writing any setup code.

  -----------------------------------------------------------------------
  **FILE: apps/offer-service/test/fixtures/scenarios/index.ts**

  -----------------------------------------------------------------------

+-------------------------------------------------------------------------+
| import { OfferScenarioBuilder } from \'../offer-scenario-builder\';     |
|                                                                         |
| import { SEED_USERS } from \'../../../seeds/constants/seed-ids\';       |
|                                                                         |
| /\*\*                                                                   |
|                                                                         |
| \* SCENARIOS --- Named, pre-built test scenarios.                       |
|                                                                         |
| \*                                                                      |
|                                                                         |
| \* All scenarios use SEED_USERS.CLIENT_A and SEED_USERS.TALENT_X.       |
|                                                                         |
| \* Override clientId/talentId via OfferScenarioBuilder if needed.       |
|                                                                         |
| \*                                                                      |
|                                                                         |
| \* Usage:                                                               |
|                                                                         |
| \* const { offer, activeCO } = SCENARIOS.singleRoundCO;                 |
|                                                                         |
| \* const { offer } = SCENARIOS.acceptedDirect;                          |
|                                                                         |
| \* const { offer, counterOffers } = SCENARIOS.threeRoundAccepted;       |
|                                                                         |
| \*/                                                                     |
|                                                                         |
| export const SCENARIOS = {                                              |
|                                                                         |
| /\*\* PENDING offer, no CO. \*/                                         |
|                                                                         |
| pending: new OfferScenarioBuilder()                                     |
|                                                                         |
| .withOffer({ rate: 95 })                                                |
|                                                                         |
| .build(),                                                               |
|                                                                         |
| /\*\* PENDING offer about to expire (20h). \*/                          |
|                                                                         |
| expiringSoon: new OfferScenarioBuilder()                                |
|                                                                         |
| .withOffer({                                                            |
|                                                                         |
| rate: 95,                                                               |
|                                                                         |
| expiresAt: new Date(Date.now() + 20 \* 3600 \* 1000),                   |
|                                                                         |
| warningSentAt: new Date(Date.now() - 4 \* 3600 \* 1000),                |
|                                                                         |
| })                                                                      |
|                                                                         |
| .build(),                                                               |
|                                                                         |
| /\*\* COUNTERED: talent submitted CO at \$110 on a \$90 offer (no       |
| warning). \*/                                                           |
|                                                                         |
| singleRoundCO: new OfferScenarioBuilder()                               |
|                                                                         |
| .withOffer({ rate: 90 })                                                |
|                                                                         |
| .withTalentCO({ rate: 110 })                                            |
|                                                                         |
| .build(),                                                               |
|                                                                         |
| /\*\* COUNTERED: talent asked \>25% above. rateWarning = true. \*/      |
|                                                                         |
| rateWarningCO: new OfferScenarioBuilder()                               |
|                                                                         |
| .withOffer({ rate: 100 })                                               |
|                                                                         |
| .withTalentCO({ rate: 126 }) // 126 \> 100 \* 1.25 = 125                |
|                                                                         |
| .build(),                                                               |
|                                                                         |
| /\*\* ACCEPTED via direct offer acceptance. \*/                         |
|                                                                         |
| acceptedDirect: new OfferScenarioBuilder()                              |
|                                                                         |
| .withOffer({ rate: 95 })                                                |
|                                                                         |
| .build(), // Offer stays PENDING; test sets status to ACCEPTED via      |
| service                                                                 |
|                                                                         |
| /\*\* ACCEPTED via counter offer acceptance (offer + CO both ACCEPTED). |
| \*/                                                                     |
|                                                                         |
| acceptedViaCO: new OfferScenarioBuilder()                               |
|                                                                         |
| .withOffer({ rate: 90 })                                                |
|                                                                         |
| .withTalentCO({ rate: 110 }).accepted()                                 |
|                                                                         |
| .build(),                                                               |
|                                                                         |
| /\*\* Three-round negotiation. Last CO is PENDING. \*/                  |
|                                                                         |
| threeRoundCO: new OfferScenarioBuilder()                                |
|                                                                         |
| .withOffer({ rate: 120 })                                               |
|                                                                         |
| .withTalentCO({ rate: 145 }).declined()                                 |
|                                                                         |
| .withClientCO({ rate: 130 }).declined()                                 |
|                                                                         |
| .withTalentCO({ rate: 135 })                                            |
|                                                                         |
| .build(),                                                               |
|                                                                         |
| /\*\* Three-round negotiation. Last CO accepted. \*/                    |
|                                                                         |
| threeRoundAccepted: new OfferScenarioBuilder()                          |
|                                                                         |
| .withOffer({ rate: 120 })                                               |
|                                                                         |
| .withTalentCO({ rate: 145 }).declined()                                 |
|                                                                         |
| .withClientCO({ rate: 130 }).declined()                                 |
|                                                                         |
| .withTalentCO({ rate: 135 }).accepted()                                 |
|                                                                         |
| .build(),                                                               |
|                                                                         |
| /\*\* Client CO direction: client offers below threshold (warns). \*/   |
|                                                                         |
| clientCOWithWarning: new OfferScenarioBuilder()                         |
|                                                                         |
| .withOffer({ rate: 100 })                                               |
|                                                                         |
| .withClientCO({ rate: 79 }) // 79 \< 100 \* 0.80 = 80                   |
|                                                                         |
| .build(),                                                               |
|                                                                         |
| /\*\* CO expired, parent restored to PENDING. \*/                       |
|                                                                         |
| coExpiredRestored: new OfferScenarioBuilder()                           |
|                                                                         |
| .withOffer({ rate: 90 })                                                |
|                                                                         |
| .withTalentCO({ rate: 110 }).expired()                                  |
|                                                                         |
| .build(),                                                               |
|                                                                         |
| /\*\* Resent offer (has originalOfferId). \*/                           |
|                                                                         |
| resent: (() =\> {                                                       |
|                                                                         |
| const original = new OfferScenarioBuilder().withOffer({ rate: 90        |
| }).build();                                                             |
|                                                                         |
| const resent = new OfferScenarioBuilder()                               |
|                                                                         |
| .withOffer({ rate: 100, originalOfferId: original.offer.id })           |
|                                                                         |
| .build();                                                               |
|                                                                         |
| return { original: original.offer, resent: resent.offer };              |
|                                                                         |
| })(),                                                                   |
|                                                                         |
| } as const;                                                             |
|                                                                         |
| // ============================================================         |
|                                                                         |
| // Usage examples:                                                      |
|                                                                         |
| // ============================================================         |
|                                                                         |
| // import { SCENARIOS } from \'../fixtures/scenarios\';                 |
|                                                                         |
| // Unit test: mock repo with singleRoundCO scenario                     |
|                                                                         |
| // mockRepo.findOne.mockResolvedValue(SCENARIOS.singleRoundCO.offer);   |
|                                                                         |
| //                                                                      |
| mockCoRepo.findOne.mockResolvedValue(SCENARIOS.singleRoundCO.activeCO); |
|                                                                         |
| // Check rate warning:                                                  |
|                                                                         |
| // expect(computeRateWarning(SCENARIOS.rateWarningCO.offer.rate,        |
|                                                                         |
| // SCENARIOS.rateWarningCO.activeCO!.rate, \'TALENT\')).toBe(true);     |
+-------------------------------------------------------------------------+

+-----------------------------------------------------------------------+
| **Step 8 (Reference) Usage Patterns**                                 |
|                                                                       |
| How to use factories and the builder in tests                         |
+-----------------------------------------------------------------------+

**Pattern 1 --- Unit test with plain factory**

+-----------------------------------------------------------------------+
| // Most common: create an offer, mock the repo, call the service.     |
|                                                                       |
| import { createOffer } from \'../fixtures/offer.factory\';            |
|                                                                       |
| import { OfferStatus } from                                           |
| \'../../src/offers/enums/offer-status.enum\';                         |
|                                                                       |
| it(\'accept() transitions PENDING -\> ACCEPTED\', async () =\> {      |
|                                                                       |
| const offer = createOffer({ status: OfferStatus.PENDING, rate: 95 }); |
|                                                                       |
| mockOfferRepo.findOne.mockResolvedValue(offer);                       |
|                                                                       |
| mockEm.query.mockResolvedValue(\[\[{ \...offer, status: \'ACCEPTED\'  |
| }\], 1\]);                                                            |
|                                                                       |
| await service.accept(offer.id, offer.talentId);                       |
|                                                                       |
| expect(mockOutbox.create).toHaveBeenCalledWith(                       |
|                                                                       |
| expect.anything(),                                                    |
|                                                                       |
| expect.objectContaining({ eventType: \'offer.accepted\' }),           |
|                                                                       |
| );                                                                    |
|                                                                       |
| });                                                                   |
+-----------------------------------------------------------------------+

**Pattern 2 --- Unit test with named scenario from registry**

+-----------------------------------------------------------------------+
| import { SCENARIOS } from \'../fixtures/scenarios\';                  |
|                                                                       |
| it(\'rate warning is true when talent asks \>25% above offer rate\',  |
| () =\> {                                                              |
|                                                                       |
| const { offer, activeCO } = SCENARIOS.rateWarningCO;                  |
|                                                                       |
| const warning = OfferStateMachine.computeRateWarning(offer.rate,      |
| activeCO!.rate, \'TALENT\');                                          |
|                                                                       |
| expect(warning).toBe(true);                                           |
|                                                                       |
| });                                                                   |
+-----------------------------------------------------------------------+

**Pattern 3 --- Integration test with DbOfferFixture**

+-----------------------------------------------------------------------+
| import { DbOfferFixture } from \'../fixtures/db-offer.fixture\';      |
|                                                                       |
| describe(\'OffersService (integration)\', () =\> {                    |
|                                                                       |
| let fixture: DbOfferFixture;                                          |
|                                                                       |
| beforeEach(async () =\> {                                             |
|                                                                       |
| fixture = new DbOfferFixture(em);                                     |
|                                                                       |
| await TestDbHelper.truncateAll();                                     |
|                                                                       |
| });                                                                   |
|                                                                       |
| it(\'declineCO restores parent to PENDING\', async () =\> {           |
|                                                                       |
| const { offer, activeCO } = await fixture.createCounteredOffer({      |
| rate: 90 }, { rate: 110 });                                           |
|                                                                       |
| await service.declineCO(offer.id, activeCO!.id, offer.clientId);      |
|                                                                       |
| const updated = await offerRepo.findOne({ where: { id: offer.id } }); |
|                                                                       |
| expect(updated?.status).toBe(\'PENDING\');                            |
|                                                                       |
| });                                                                   |
|                                                                       |
| });                                                                   |
+-----------------------------------------------------------------------+

**Pattern 4 --- Builder for custom scenario**

+-----------------------------------------------------------------------+
| import { OfferScenarioBuilder } from                                  |
| \'../fixtures/offer-scenario-builder\';                               |
|                                                                       |
| // Custom scenario: client and talent each submit 2 COs.              |
|                                                                       |
| const scenario = new OfferScenarioBuilder()                           |
|                                                                       |
| .withOffer({ rate: 100, clientId: myClientId, talentId: myTalentId }) |
|                                                                       |
| .withTalentCO({ rate: 130 }).declined()                               |
|                                                                       |
| .withClientCO({ rate: 115 }).declined()                               |
|                                                                       |
| .withTalentCO({ rate: 120 })                                          |
|                                                                       |
| .build();                                                             |
|                                                                       |
| // scenario.offer.status === COUNTERED                                |
|                                                                       |
| // scenario.counterOffers.length === 3                                |
|                                                                       |
| // scenario.counterOffers\[0\].status === SUPERSEDED (talent, 130,    |
| then declined by client)                                              |
|                                                                       |
| // scenario.counterOffers\[1\].status === SUPERSEDED (client, 115,    |
| then declined by talent)                                              |
|                                                                       |
| // scenario.counterOffers\[2\].status === PENDING (active)            |
|                                                                       |
| // scenario.activeCO.rate === 120                                     |
|                                                                       |
| // Persist to DB for integration test:                                |
|                                                                       |
| // const saved = await fixture.save(scenario);                        |
+-----------------------------------------------------------------------+
