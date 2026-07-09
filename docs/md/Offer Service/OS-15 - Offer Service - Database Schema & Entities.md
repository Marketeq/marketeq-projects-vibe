**OS-15**

**Offer Service --- Database Schema & Entities**

**DB Schema:** offer_service **Tables:** offers, counter_offers,
offer_history, outbox **ORM:** TypeORM with decorators

This document defines the complete database schema for offer-service.
There are four tables, all in the offer_service PostgreSQL schema. Every
column, constraint, default value, and foreign key relationship is
documented. The TypeORM entity classes are production-ready --- copy
each file exactly as shown, in the path specified.

**File Map --- All Files to Create**

  ---------- ---------------------------------------------------------- ----------------------
  **Step**   **File Path**                                              **Purpose**

  **1**      src/common/entities/base.entity.ts                         Base entity with
                                                                        shared columns (id,
                                                                        createdAt, updatedAt)

  **2**      src/offers/enums/offer-status.enum.ts                      Already created in
                                                                        OS-11 --- verify it
                                                                        exists

  **3**      src/offers/enums/contract-type.enum.ts                     Already created in
                                                                        OS-11 --- verify it
                                                                        exists

  **4**      src/offers/enums/work-schedule-type.enum.ts                Already created in
                                                                        OS-11 --- verify it
                                                                        exists

  **5**      src/counter-offers/enums/counter-offer-status.enum.ts      Already created in
                                                                        OS-11 --- verify it
                                                                        exists

  **6**      src/offers/entities/offer.entity.ts                        Offer entity --- maps
                                                                        to offers table

  **7**      src/counter-offers/entities/counter-offer.entity.ts        CounterOffer entity
                                                                        --- maps to
                                                                        counter_offers table

  **8**      src/offer-history/entities/offer-history-event.entity.ts   OfferHistoryEvent
                                                                        entity --- append-only
                                                                        log

  **9**      src/outbox/entities/outbox-event.entity.ts                 OutboxEvent entity ---
                                                                        transactional outbox

  **10**     src/database/migrations/001_create_schema.sql              Raw SQL --- create the
                                                                        offer_service schema
                                                                        and all tables
  ---------- ---------------------------------------------------------- ----------------------

+-----------------------------------------------------------------------+
| **Overview Table Overview & Relationships**                           |
|                                                                       |
| Four tables, all in the offer_service schema                          |
+-----------------------------------------------------------------------+

All four tables live in the PostgreSQL schema named offer_service. This
isolates offer-service data from other services in the same database
instance. The schema must be created before any tables.

  -------------------- ---------- ----------- ---------------------------------------------
  **Table**            **Rows**   **Write**   **Purpose**

  **offers**           1 per      Insert +    Primary offer records. One row from creation
                       offer      Update      to terminal state. Status transitions update
                                              the same row.

  **counter_offers**   1 per CO   Insert +    Counter offer records. References offers via
                                  Update      offer_id. Same single-row-per-CO pattern as
                                              offers.

  **offer_history**    1 per      Insert ONLY Immutable append-only event log. Every
                       event                  lifecycle action appends a new row. Rows are
                                              NEVER updated or deleted.

  **outbox**           1 per      Insert +    Transactional outbox for RabbitMQ. Rows are
                       event      Delete      written atomically with state changes.
                                              Deleted after successful publish.
  -------------------- ---------- ----------- ---------------------------------------------

**Entity Relationship Summary**

+-----------------------------------------------------------------------+
| offers (1) ────────────────── (N) counter_offers                      |
|                                                                       |
| offers.id = counter_offers.offer_id (FK)                              |
|                                                                       |
| One offer can have many counter offers (across all rounds)            |
|                                                                       |
| Only ONE counter offer can be PENDING at any time (partial unique     |
| index)                                                                |
|                                                                       |
| offers (1) ────────────────── (N) offer_history                       |
|                                                                       |
| offers.id = offer_history.offer_id (FK)                               |
|                                                                       |
| Every lifecycle event appends a row to offer_history                  |
|                                                                       |
| counter_offers (1) ─────────── (N) offer_history                      |
|                                                                       |
| counter_offers.id = offer_history.counter_offer_id (FK, nullable)     |
|                                                                       |
| Counter offer events reference the specific CO that triggered them    |
|                                                                       |
| offers (1) ────────────────── (N) outbox                              |
|                                                                       |
| offers.id = outbox.aggregate_id (no FK --- loose coupling)            |
|                                                                       |
| Outbox rows reference the offer ID in the payload, not via FK         |
|                                                                       |
| (Avoids constraint issues if outbox rows outlive their source         |
| records)                                                              |
+-----------------------------------------------------------------------+

+-----------------------------------------------------------------------+
| **Step 1 BaseEntity --- Shared Columns**                              |
|                                                                       |
| Inherited by all four entity classes                                  |
+-----------------------------------------------------------------------+

BaseEntity provides three columns shared by all entities: id (UUID v4
primary key), createdAt (auto-set on insert), and updatedAt (auto-set on
every update). All four entity classes extend this. This avoids
repeating the same boilerplate in every entity.

+-----------------------------------------------------------------------+
| TypeORM has a built-in BaseEntity class. This is NOT that class.      |
|                                                                       |
| Do NOT extend from TypeORM\'s BaseEntity --- it adds active record    |
| pattern methods                                                       |
|                                                                       |
| that conflict with the repository pattern used in this service.       |
|                                                                       |
| This custom base class only adds columns. It does NOT extend          |
| TypeORM\'s BaseEntity.                                                |
|                                                                       |
| The class name in this file is OfferServiceBaseEntity to avoid any    |
| naming conflict.                                                      |
|                                                                       |
| All four entity files import it as BaseEntity for readability.        |
+-----------------------------------------------------------------------+

  -----------------------------------------------------------------------
  **FILE: apps/offer-service/src/common/entities/base.entity.ts**

  -----------------------------------------------------------------------

+-----------------------------------------------------------------------+
| import {                                                              |
|                                                                       |
| PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn,           |
|                                                                       |
| } from \'typeorm\';                                                   |
|                                                                       |
| /\*\*                                                                 |
|                                                                       |
| \* OfferServiceBaseEntity --- Shared columns for all offer-service    |
| tables.                                                               |
|                                                                       |
| \*                                                                    |
|                                                                       |
| \* Extends this class (not TypeORM\'s BaseEntity) to get:             |
|                                                                       |
| \* id --- UUID v4 primary key, auto-generated by the database         |
|                                                                       |
| \* created_at --- Timestamp set once on INSERT                        |
|                                                                       |
| \* updated_at --- Timestamp updated on every UPDATE                   |
|                                                                       |
| \*                                                                    |
|                                                                       |
| \* All four entities extend this class.                               |
|                                                                       |
| \*/                                                                   |
|                                                                       |
| export abstract class OfferServiceBaseEntity {                        |
|                                                                       |
| \@PrimaryGeneratedColumn(\'uuid\', { name: \'id\' })                  |
|                                                                       |
| id: string;                                                           |
|                                                                       |
| /\*\*                                                                 |
|                                                                       |
| \* created_at --- auto-set on INSERT by TypeORM.                      |
|                                                                       |
| \* Maps to a TIMESTAMPTZ column with DEFAULT NOW().                   |
|                                                                       |
| \* Never set this manually. TypeORM handles it.                       |
|                                                                       |
| \*/                                                                   |
|                                                                       |
| \@CreateDateColumn({ name: \'created_at\', type: \'timestamptz\' })   |
|                                                                       |
| createdAt: Date;                                                      |
|                                                                       |
| /\*\*                                                                 |
|                                                                       |
| \* updated_at --- auto-updated on every save() call by TypeORM.       |
|                                                                       |
| \* Maps to a TIMESTAMPTZ column.                                      |
|                                                                       |
| \* Never set this manually. TypeORM handles it.                       |
|                                                                       |
| \*/                                                                   |
|                                                                       |
| \@UpdateDateColumn({ name: \'updated_at\', type: \'timestamptz\' })   |
|                                                                       |
| updatedAt: Date;                                                      |
|                                                                       |
| }                                                                     |
+-----------------------------------------------------------------------+

+-----------------------------------------------------------------------+
| **Steps 2--5 Confirm Enums Exist from OS-11**                         |
|                                                                       |
| These should already be created --- verify before proceeding          |
+-----------------------------------------------------------------------+

These enum files were created in OS-11. Verify they exist at the correct
paths before creating the entity files. The entity files import from
these enum files. If they do not exist, create them now using the code
from OS-11.

+--------------------------------------------------------------------------+
| Verify these files exist:                                                |
|                                                                          |
| apps/offer-service/src/offers/enums/offer-status.enum.ts                 |
|                                                                          |
| → export enum OfferStatus { PENDING, ACCEPTED, DECLINED, WITHDRAWN,      |
| EXPIRED, COUNTERED }                                                     |
|                                                                          |
| apps/offer-service/src/offers/enums/contract-type.enum.ts                |
|                                                                          |
| → export enum ContractType { PROJECT, SERVICE, TEAM, CONTRACT }          |
|                                                                          |
| apps/offer-service/src/offers/enums/work-schedule-type.enum.ts           |
|                                                                          |
| → export enum WorkScheduleType { PART_TIME, FULL_TIME, CUSTOM }          |
|                                                                          |
| apps/offer-service/src/counter-offers/enums/counter-offer-status.enum.ts |
|                                                                          |
| → export enum CounterOfferStatus { PENDING, ACCEPTED, DECLINED,          |
| WITHDRAWN, EXPIRED, SUPERSEDED }                                         |
|                                                                          |
| Run: ls apps/offer-service/src/offers/enums/ and                         |
|                                                                          |
| ls apps/offer-service/src/counter-offers/enums/                          |
|                                                                          |
| to confirm all four files are present.                                   |
+--------------------------------------------------------------------------+

+-----------------------------------------------------------------------+
| **Step 6 Offer Entity --- offers table**                              |
|                                                                       |
| The primary offer record                                              |
+-----------------------------------------------------------------------+

The Offer entity maps to the offers table in the offer_service schema.
One row exists per offer from creation through to its terminal state.
Status changes update the same row --- there is no audit trail in this
table (that lives in offer_history). The workSchedule column stores the
work schedule object as JSONB.

**offers Table --- Column Reference**

  ------------------------ -------------- ---------- ------------------- ------------------------------------------------------------
  **Column**               **Type**       **Null**   **Default**         **Notes**

  **id**                   UUID           **NO**     gen_random_uuid()   Primary key. UUID v4 generated by PostgreSQL.

  **client_id**            UUID           **NO**     ---                 FK-like. The user who sent the offer. Not a foreign key ---
                                                                         users live in auth-service.

  **talent_id**            UUID           **NO**     ---                 FK-like. The user who received the offer.

  **job_listing_id**       UUID           **NO**     ---                 FK-like. The job listing this offer is attached to. Owned by
                                                                         listings-service.

  **contract_type**        VARCHAR(20)    **NO**     ---                 Enum: PROJECT \| SERVICE \| TEAM \| CONTRACT

  **contract_title**       VARCHAR(200)   **NO**     ---                 The contract title. 1-200 chars, UTF-8, trimmed.

  **status**               VARCHAR(20)    **NO**     PENDING             Enum:
                                                                         PENDING\|ACCEPTED\|DECLINED\|WITHDRAWN\|EXPIRED\|COUNTERED

  **rate**                 INTEGER        **NO**     ---                 Whole number rate. Min 1, max 9999. No decimals.

  **currency_code**        CHAR(3)        **NO**     ---                 ISO 4217 uppercase. E.g. USD, EUR, GBP.

  **duration_months**      INTEGER        **NO**     ---                 Contract duration in months. 1-60.

  **work_schedule**        JSONB          **NO**     ---                 Object: { type: PART_TIME\|FULL_TIME\|CUSTOM, hoursPerWeek?:
                                                                         number }

  **start_date**           DATE           **NO**     ---                 ISO 8601 date (no time). Stored as DATE type.

  **message**              TEXT           **YES**    NULL                Optional message from client. NULL if not provided.

  **expires_at**           TIMESTAMPTZ    **NO**     ---                 Offer expiry datetime. Set to created_at + 14 days on
                                                                         creation. Reset on edit/counter.

  **warning_sent_at**      TIMESTAMPTZ    **YES**    NULL                When the 48h expiry warning was sent. NULL = not yet sent.
                                                                         Reset to NULL on edit.

  **accepted_at**          TIMESTAMPTZ    **YES**    NULL                Set when status transitions to ACCEPTED.

  **declined_at**          TIMESTAMPTZ    **YES**    NULL                Set when status transitions to DECLINED.

  **declined_reason**      TEXT           **YES**    NULL                Talent-provided decline reason. Stored but NOT in
                                                                         notification.

  **declined_chip**        VARCHAR(30)    **YES**    NULL                Which quick-select chip was selected. Enum:
                                                                         BUDGET_DOESNT_WORK etc.

  **withdrawn_at**         TIMESTAMPTZ    **YES**    NULL                Set when status transitions to WITHDRAWN.

  **withdrawal_message**   TEXT           **YES**    NULL                Optional client message on withdrawal.

  **expired_at**           TIMESTAMPTZ    **YES**    NULL                Set when the scheduler transitions status to EXPIRED.

  **original_offer_id**    UUID           **YES**    NULL                Self-reference. Set on resent offers only. References the
                                                                         offer that was resent.

  **created_at**           TIMESTAMPTZ    **NO**     NOW()               Auto-set on insert by TypeORM \@CreateDateColumn.

  **updated_at**           TIMESTAMPTZ    **NO**     NOW()               Auto-updated on every save by TypeORM \@UpdateDateColumn.
  ------------------------ -------------- ---------- ------------------- ------------------------------------------------------------

  -----------------------------------------------------------------------
  **FILE: apps/offer-service/src/offers/entities/offer.entity.ts**

  -----------------------------------------------------------------------

+-------------------------------------------------------------------------------------------------------------------------+
| import {                                                                                                                |
|                                                                                                                         |
| Entity, Column, Index, OneToMany, ManyToOne, JoinColumn,                                                                |
|                                                                                                                         |
| } from \'typeorm\';                                                                                                     |
|                                                                                                                         |
| import { OfferServiceBaseEntity } from \'../../common/entities/base.entity\';                                           |
|                                                                                                                         |
| import { OfferStatus } from \'../enums/offer-status.enum\';                                                             |
|                                                                                                                         |
| import { ContractType } from \'../enums/contract-type.enum\';                                                           |
|                                                                                                                         |
| import { WorkScheduleType } from \'../enums/work-schedule-type.enum\';                                                  |
|                                                                                                                         |
| import { CounterOffer } from \'../../counter-offers/entities/counter-offer.entity\';                                    |
|                                                                                                                         |
| import { OfferHistoryEvent } from \'../../offer-history/entities/offer-history-event.entity\';                          |
|                                                                                                                         |
| import { OutboxEvent } from \'../../outbox/entities/outbox-event.entity\';                                              |
|                                                                                                                         |
| /\*\*                                                                                                                   |
|                                                                                                                         |
| \* WorkSchedule JSONB structure stored in offers.work_schedule.                                                         |
|                                                                                                                         |
| \* Typed here for full TypeScript safety on the entity property.                                                        |
|                                                                                                                         |
| \*/                                                                                                                     |
|                                                                                                                         |
| export interface WorkSchedule {                                                                                         |
|                                                                                                                         |
| type: WorkScheduleType;                                                                                                 |
|                                                                                                                         |
| hoursPerWeek?: number; // Only present when type = CUSTOM                                                               |
|                                                                                                                         |
| }                                                                                                                       |
|                                                                                                                         |
| /\*\*                                                                                                                   |
|                                                                                                                         |
| \* Offer --- TypeORM entity mapping to offer_service.offers.                                                            |
|                                                                                                                         |
| \*                                                                                                                      |
|                                                                                                                         |
| \* One row per offer. Status transitions update the same row.                                                           |
|                                                                                                                         |
| \* All offers go through: PENDING → ACCEPTED\|DECLINED\|WITHDRAWN\|EXPIRED\|COUNTERED                                   |
|                                                                                                                         |
| \* COUNTERED is not terminal --- it is restored to PENDING when the CO resolves.                                        |
|                                                                                                                         |
| \*                                                                                                                      |
|                                                                                                                         |
| \* Extends OfferServiceBaseEntity for id, createdAt, updatedAt columns.                                                 |
|                                                                                                                         |
| \*/                                                                                                                     |
|                                                                                                                         |
| \@Entity({ name: \'offers\', schema: \'offer_service\' })                                                               |
|                                                                                                                         |
| \@Index(\'idx_offers_client_talent\', \[\'clientId\', \'talentId\'\])                                                   |
|                                                                                                                         |
| \@Index(\'idx_offers_status_expires\', \[\'status\', \'expiresAt\'\])                                                   |
|                                                                                                                         |
| \@Index(\'idx_offers_talent_status\', \[\'talentId\', \'status\'\])                                                     |
|                                                                                                                         |
| export class Offer extends OfferServiceBaseEntity {                                                                     |
|                                                                                                                         |
| //                                                                                                                      |
| \-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-- |
|                                                                                                                         |
| // Party identifiers                                                                                                    |
|                                                                                                                         |
| // Not foreign keys --- user records live in auth-service                                                               |
|                                                                                                                         |
| //                                                                                                                      |
| \-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-- |
|                                                                                                                         |
| \@Column({ name: \'client_id\', type: \'uuid\' })                                                                       |
|                                                                                                                         |
| \@Index(\'idx_offers_client_id\')                                                                                       |
|                                                                                                                         |
| clientId: string;                                                                                                       |
|                                                                                                                         |
| \@Column({ name: \'talent_id\', type: \'uuid\' })                                                                       |
|                                                                                                                         |
| \@Index(\'idx_offers_talent_id\')                                                                                       |
|                                                                                                                         |
| talentId: string;                                                                                                       |
|                                                                                                                         |
| \@Column({ name: \'job_listing_id\', type: \'uuid\' })                                                                  |
|                                                                                                                         |
| jobListingId: string;                                                                                                   |
|                                                                                                                         |
| //                                                                                                                      |
| \-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-- |
|                                                                                                                         |
| // Contract details                                                                                                     |
|                                                                                                                         |
| //                                                                                                                      |
| \-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-- |
|                                                                                                                         |
| \@Column({                                                                                                              |
|                                                                                                                         |
| name: \'contract_type\',                                                                                                |
|                                                                                                                         |
| type: \'varchar\',                                                                                                      |
|                                                                                                                         |
| length: 20,                                                                                                             |
|                                                                                                                         |
| enum: ContractType,                                                                                                     |
|                                                                                                                         |
| })                                                                                                                      |
|                                                                                                                         |
| contractType: ContractType;                                                                                             |
|                                                                                                                         |
| \@Column({                                                                                                              |
|                                                                                                                         |
| name: \'contract_title\',                                                                                               |
|                                                                                                                         |
| type: \'varchar\',                                                                                                      |
|                                                                                                                         |
| length: 200,                                                                                                            |
|                                                                                                                         |
| })                                                                                                                      |
|                                                                                                                         |
| contractTitle: string;                                                                                                  |
|                                                                                                                         |
| //                                                                                                                      |
| \-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-- |
|                                                                                                                         |
| // Status                                                                                                               |
|                                                                                                                         |
| //                                                                                                                      |
| \-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-- |
|                                                                                                                         |
| \@Column({                                                                                                              |
|                                                                                                                         |
| name: \'status\',                                                                                                       |
|                                                                                                                         |
| type: \'varchar\',                                                                                                      |
|                                                                                                                         |
| length: 20,                                                                                                             |
|                                                                                                                         |
| default: OfferStatus.PENDING,                                                                                           |
|                                                                                                                         |
| })                                                                                                                      |
|                                                                                                                         |
| status: OfferStatus;                                                                                                    |
|                                                                                                                         |
| //                                                                                                                      |
| \-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-- |
|                                                                                                                         |
| // Financial terms                                                                                                      |
|                                                                                                                         |
| //                                                                                                                      |
| \-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-- |
|                                                                                                                         |
| /\*\*                                                                                                                   |
|                                                                                                                         |
| \* Whole number hourly rate. No decimals.                                                                               |
|                                                                                                                         |
| \* Stored as INTEGER in PostgreSQL.                                                                                     |
|                                                                                                                         |
| \* TypeORM int type maps to INTEGER.                                                                                    |
|                                                                                                                         |
| \*/                                                                                                                     |
|                                                                                                                         |
| \@Column({ name: \'rate\', type: \'int\' })                                                                             |
|                                                                                                                         |
| rate: number;                                                                                                           |
|                                                                                                                         |
| \@Column({ name: \'currency_code\', type: \'char\', length: 3 })                                                        |
|                                                                                                                         |
| currencyCode: string;                                                                                                   |
|                                                                                                                         |
| //                                                                                                                      |
| \-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-- |
|                                                                                                                         |
| // Contract terms                                                                                                       |
|                                                                                                                         |
| //                                                                                                                      |
| \-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-- |
|                                                                                                                         |
| \@Column({ name: \'duration_months\', type: \'int\' })                                                                  |
|                                                                                                                         |
| durationMonths: number;                                                                                                 |
|                                                                                                                         |
| /\*\*                                                                                                                   |
|                                                                                                                         |
| \* Work schedule stored as JSONB.                                                                                       |
|                                                                                                                         |
| \* TypeORM simple-json would also work but JSONB gives us                                                               |
|                                                                                                                         |
| \* full PostgreSQL JSON operator support for queries.                                                                   |
|                                                                                                                         |
| \*/                                                                                                                     |
|                                                                                                                         |
| \@Column({                                                                                                              |
|                                                                                                                         |
| name: \'work_schedule\',                                                                                                |
|                                                                                                                         |
| type: \'jsonb\',                                                                                                        |
|                                                                                                                         |
| transformer: {                                                                                                          |
|                                                                                                                         |
| to: (v: WorkSchedule) =\> v,                                                                                            |
|                                                                                                                         |
| from: (v: WorkSchedule) =\> v,                                                                                          |
|                                                                                                                         |
| },                                                                                                                      |
|                                                                                                                         |
| })                                                                                                                      |
|                                                                                                                         |
| workSchedule: WorkSchedule;                                                                                             |
|                                                                                                                         |
| /\*\*                                                                                                                   |
|                                                                                                                         |
| \* Start date stored as PostgreSQL DATE (no time component).                                                            |
|                                                                                                                         |
| \* TypeORM returns this as a Date object --- we use string for                                                          |
|                                                                                                                         |
| \* consistent handling as YYYY-MM-DD.                                                                                   |
|                                                                                                                         |
| \* transformer converts to/from string to avoid timezone issues.                                                        |
|                                                                                                                         |
| \*/                                                                                                                     |
|                                                                                                                         |
| \@Column({                                                                                                              |
|                                                                                                                         |
| name: \'start_date\',                                                                                                   |
|                                                                                                                         |
| type: \'date\',                                                                                                         |
|                                                                                                                         |
| transformer: {                                                                                                          |
|                                                                                                                         |
| to: (v: string) =\> v,                                                                                                  |
|                                                                                                                         |
| from: (v: string \| Date) =\> {                                                                                         |
|                                                                                                                         |
| if (v instanceof Date) {                                                                                                |
|                                                                                                                         |
| return v.toISOString().split(\'T\')\[0\]; // Returns YYYY-MM-DD                                                         |
|                                                                                                                         |
| }                                                                                                                       |
|                                                                                                                         |
| return v;                                                                                                               |
|                                                                                                                         |
| },                                                                                                                      |
|                                                                                                                         |
| },                                                                                                                      |
|                                                                                                                         |
| })                                                                                                                      |
|                                                                                                                         |
| startDate: string; // YYYY-MM-DD format                                                                                 |
|                                                                                                                         |
| \@Column({                                                                                                              |
|                                                                                                                         |
| name: \'message\',                                                                                                      |
|                                                                                                                         |
| type: \'text\',                                                                                                         |
|                                                                                                                         |
| nullable: true,                                                                                                         |
|                                                                                                                         |
| default: null,                                                                                                          |
|                                                                                                                         |
| })                                                                                                                      |
|                                                                                                                         |
| message: string \| null;                                                                                                |
|                                                                                                                         |
| //                                                                                                                      |
| \-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-- |
|                                                                                                                         |
| // TTL & expiry                                                                                                         |
|                                                                                                                         |
| //                                                                                                                      |
| \-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-- |
|                                                                                                                         |
| /\*\*                                                                                                                   |
|                                                                                                                         |
| \* expiresAt is set to createdAt + 14 days on offer creation.                                                           |
|                                                                                                                         |
| \* Reset to NOW() + 14 days on: edit, counter offer submission,                                                         |
|                                                                                                                         |
| \* edit counter offer, resend.                                                                                          |
|                                                                                                                         |
| \* NOT reset on: decline, withdraw, accept (terminal actions).                                                          |
|                                                                                                                         |
| \*/                                                                                                                     |
|                                                                                                                         |
| \@Column({                                                                                                              |
|                                                                                                                         |
| name: \'expires_at\',                                                                                                   |
|                                                                                                                         |
| type: \'timestamptz\',                                                                                                  |
|                                                                                                                         |
| })                                                                                                                      |
|                                                                                                                         |
| expiresAt: Date;                                                                                                        |
|                                                                                                                         |
| /\*\*                                                                                                                   |
|                                                                                                                         |
| \* warningSentAt tracks whether the 48h expiry warning has been sent.                                                   |
|                                                                                                                         |
| \* NULL = warning not yet sent.                                                                                         |
|                                                                                                                         |
| \* Reset to NULL whenever expiresAt is reset.                                                                           |
|                                                                                                                         |
| \*/                                                                                                                     |
|                                                                                                                         |
| \@Column({                                                                                                              |
|                                                                                                                         |
| name: \'warning_sent_at\',                                                                                              |
|                                                                                                                         |
| type: \'timestamptz\',                                                                                                  |
|                                                                                                                         |
| nullable: true,                                                                                                         |
|                                                                                                                         |
| default: null,                                                                                                          |
|                                                                                                                         |
| })                                                                                                                      |
|                                                                                                                         |
| warningSentAt: Date \| null;                                                                                            |
|                                                                                                                         |
| //                                                                                                                      |
| \-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-- |
|                                                                                                                         |
| // Terminal state timestamps                                                                                            |
|                                                                                                                         |
| //                                                                                                                      |
| \-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-- |
|                                                                                                                         |
| \@Column({                                                                                                              |
|                                                                                                                         |
| name: \'accepted_at\',                                                                                                  |
|                                                                                                                         |
| type: \'timestamptz\',                                                                                                  |
|                                                                                                                         |
| nullable: true, default: null,                                                                                          |
|                                                                                                                         |
| })                                                                                                                      |
|                                                                                                                         |
| acceptedAt: Date \| null;                                                                                               |
|                                                                                                                         |
| \@Column({                                                                                                              |
|                                                                                                                         |
| name: \'declined_at\',                                                                                                  |
|                                                                                                                         |
| type: \'timestamptz\',                                                                                                  |
|                                                                                                                         |
| nullable: true, default: null,                                                                                          |
|                                                                                                                         |
| })                                                                                                                      |
|                                                                                                                         |
| declinedAt: Date \| null;                                                                                               |
|                                                                                                                         |
| \@Column({                                                                                                              |
|                                                                                                                         |
| name: \'declined_reason\',                                                                                              |
|                                                                                                                         |
| type: \'text\',                                                                                                         |
|                                                                                                                         |
| nullable: true, default: null,                                                                                          |
|                                                                                                                         |
| })                                                                                                                      |
|                                                                                                                         |
| declinedReason: string \| null;                                                                                         |
|                                                                                                                         |
| \@Column({ name: \'declined_chip\', type: \'varchar\', length: 30, nullable: true, default: null })                     |
|                                                                                                                         |
| declinedChip: string \| null;                                                                                           |
|                                                                                                                         |
| \@Column({                                                                                                              |
|                                                                                                                         |
| name: \'withdrawn_at\',                                                                                                 |
|                                                                                                                         |
| type: \'timestamptz\',                                                                                                  |
|                                                                                                                         |
| nullable: true, default: null,                                                                                          |
|                                                                                                                         |
| })                                                                                                                      |
|                                                                                                                         |
| withdrawnAt: Date \| null;                                                                                              |
|                                                                                                                         |
| \@Column({ name: \'withdrawal_message\', type: \'text\', nullable: true, default: null })                               |
|                                                                                                                         |
| withdrawalMessage: string \| null;                                                                                      |
|                                                                                                                         |
| \@Column({                                                                                                              |
|                                                                                                                         |
| name: \'expired_at\',                                                                                                   |
|                                                                                                                         |
| type: \'timestamptz\',                                                                                                  |
|                                                                                                                         |
| nullable: true, default: null,                                                                                          |
|                                                                                                                         |
| })                                                                                                                      |
|                                                                                                                         |
| expiredAt: Date \| null;                                                                                                |
|                                                                                                                         |
| /\*\*                                                                                                                   |
|                                                                                                                         |
| \* originalOfferId --- self-referencing FK for resent offers.                                                           |
|                                                                                                                         |
| \* When a client resends an expired/declined/withdrawn offer, a new                                                     |
|                                                                                                                         |
| \* Offer record is created and originalOfferId points to the source offer.                                              |
|                                                                                                                         |
| \* NULL for all offers that were not resent.                                                                            |
|                                                                                                                         |
| \*/                                                                                                                     |
|                                                                                                                         |
| \@Column({                                                                                                              |
|                                                                                                                         |
| name: \'original_offer_id\',                                                                                            |
|                                                                                                                         |
| type: \'uuid\',                                                                                                         |
|                                                                                                                         |
| nullable: true,                                                                                                         |
|                                                                                                                         |
| default: null,                                                                                                          |
|                                                                                                                         |
| })                                                                                                                      |
|                                                                                                                         |
| originalOfferId: string \| null;                                                                                        |
|                                                                                                                         |
| //                                                                                                                      |
| \-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-- |
|                                                                                                                         |
| // Relations                                                                                                            |
|                                                                                                                         |
| //                                                                                                                      |
| \-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-- |
|                                                                                                                         |
| /\*\*                                                                                                                   |
|                                                                                                                         |
| \* One offer can have many counter offers across all negotiation rounds.                                                |
|                                                                                                                         |
| \* Only ONE counter offer can be PENDING at any time (enforced by partial unique index).                                |
|                                                                                                                         |
| \*/                                                                                                                     |
|                                                                                                                         |
| \@OneToMany(() =\> CounterOffer, (co) =\> co.offer, { cascade: false })                                                 |
|                                                                                                                         |
| counterOffers: CounterOffer\[\];                                                                                        |
|                                                                                                                         |
| /\*\*                                                                                                                   |
|                                                                                                                         |
| \* Immutable event log. Every lifecycle action adds a row here.                                                         |
|                                                                                                                         |
| \*/                                                                                                                     |
|                                                                                                                         |
| \@OneToMany(() =\> OfferHistoryEvent, (e) =\> e.offer, { cascade: false })                                              |
|                                                                                                                         |
| historyEvents: OfferHistoryEvent\[\];                                                                                   |
|                                                                                                                         |
| }                                                                                                                       |
+-------------------------------------------------------------------------------------------------------------------------+

+-----------------------------------------------------------------------+
| **Step 7 CounterOffer Entity --- counter_offers table**               |
|                                                                       |
| One row per counter offer submitted                                   |
+-----------------------------------------------------------------------+

The CounterOffer entity maps to the counter_offers table. A counter
offer is submitted in response to a primary offer and contains a full
set of alternative terms. Multiple counter offers can exist per parent
offer across negotiation rounds, but only ONE can be PENDING at a time.
The submittedBy field records whether CLIENT or TALENT initiated this
counter offer.

**counter_offers Table --- Column Reference**

  ------------------------ ------------- ---------- ------------------- -------------------------------------------------------------
  **Column**               **Type**      **Null**   **Default**         **Notes**

  **id**                   UUID          **NO**     gen_random_uuid()   Primary key.

  **offer_id**             UUID          **NO**     ---                 FK → offers.id. The parent offer this counter offer belongs
                                                                        to.

  **submitted_by**         VARCHAR(10)   **NO**     ---                 Enum: CLIENT \| TALENT. Which side submitted this CO.

  **submitted_by_id**      UUID          **NO**     ---                 userId of the submitter. Matches client_id or talent_id from
                                                                        the parent offer.

  **status**               VARCHAR(20)   **NO**     PENDING             PENDING\|ACCEPTED\|DECLINED\|WITHDRAWN\|EXPIRED\|SUPERSEDED

  **rate**                 INTEGER       **NO**     ---                 Counter offer rate. Same constraints as offer rate.

  **currency_code**        CHAR(3)       **NO**     ---                 ISO 4217.

  **duration_months**      INTEGER       **NO**     ---                 1-60 months.

  **work_schedule**        JSONB         **NO**     ---                 Same structure as offers.work_schedule.

  **start_date**           DATE          **NO**     ---                 ISO 8601 date.

  **message**              TEXT          **YES**    NULL                Optional message with the counter offer.

  **expires_at**           TIMESTAMPTZ   **NO**     ---                 CO TTL. Set to NOW() + 14 days on creation. NOT reset on
                                                                        in-place edit.

  **warning_sent_at**      TIMESTAMPTZ   **YES**    NULL                48h warning tracking. NULL = not sent.

  **accepted_at**          TIMESTAMPTZ   **YES**    NULL                Set on ACCEPTED transition.

  **declined_at**          TIMESTAMPTZ   **YES**    NULL                Set on DECLINED transition.

  **withdrawn_at**         TIMESTAMPTZ   **YES**    NULL                Set on WITHDRAWN transition.

  **withdrawal_message**   TEXT          **YES**    NULL                Optional message on withdrawal.

  **expired_at**           TIMESTAMPTZ   **YES**    NULL                Set by scheduler on EXPIRED transition.

  **superseded_at**        TIMESTAMPTZ   **YES**    NULL                Set when client submits a new CO superseding this one.

  **created_at**           TIMESTAMPTZ   **NO**     NOW()               Auto-set by TypeORM.

  **updated_at**           TIMESTAMPTZ   **NO**     NOW()               Auto-updated by TypeORM.
  ------------------------ ------------- ---------- ------------------- -------------------------------------------------------------

  --------------------------------------------------------------------------
  **FILE:
  apps/offer-service/src/counter-offers/entities/counter-offer.entity.ts**

  --------------------------------------------------------------------------

+-------------------------------------------------------------------------------------------------------------------------+
| import {                                                                                                                |
|                                                                                                                         |
| Entity, Column, Index, ManyToOne, JoinColumn, OneToMany,                                                                |
|                                                                                                                         |
| } from \'typeorm\';                                                                                                     |
|                                                                                                                         |
| import { OfferServiceBaseEntity } from \'../../common/entities/base.entity\';                                           |
|                                                                                                                         |
| import { CounterOfferStatus } from \'../enums/counter-offer-status.enum\';                                              |
|                                                                                                                         |
| import { WorkSchedule } from \'../../offers/entities/offer.entity\';                                                    |
|                                                                                                                         |
| import { Offer } from \'../../offers/entities/offer.entity\';                                                           |
|                                                                                                                         |
| import { OfferHistoryEvent } from \'../../offer-history/entities/offer-history-event.entity\';                          |
|                                                                                                                         |
| /\*\*                                                                                                                   |
|                                                                                                                         |
| \* CounterOffer --- Maps to offer_service.counter_offers.                                                               |
|                                                                                                                         |
| \*                                                                                                                      |
|                                                                                                                         |
| \* One row per counter offer submission.                                                                                |
|                                                                                                                         |
| \* Only ONE counter offer per parent offer can be PENDING at any time.                                                  |
|                                                                                                                         |
| \* This is enforced by a partial unique index on (offer_id) WHERE status = \'PENDING\'.                                 |
|                                                                                                                         |
| \*                                                                                                                      |
|                                                                                                                         |
| \* submittedBy records which side submitted: CLIENT or TALENT.                                                          |
|                                                                                                                         |
| \* When TALENT submits: parent offer status → COUNTERED.                                                                |
|                                                                                                                         |
| \* When CLIENT submits: previous CO → SUPERSEDED, new CO becomes Active Offer.                                          |
|                                                                                                                         |
| \*/                                                                                                                     |
|                                                                                                                         |
| \@Entity({ name: \'counter_offers\', schema: \'offer_service\' })                                                       |
|                                                                                                                         |
| \@Index(\'idx_co_offer_id\', \[\'offerId\'\])                                                                           |
|                                                                                                                         |
| \@Index(\'idx_co_offer_status\', \[\'offerId\', \'status\'\])                                                           |
|                                                                                                                         |
| \@Index(\'idx_co_expires\', \[\'status\', \'expiresAt\'\])                                                              |
|                                                                                                                         |
| export class CounterOffer extends OfferServiceBaseEntity {                                                              |
|                                                                                                                         |
| //                                                                                                                      |
| \-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-- |
|                                                                                                                         |
| // Parent offer reference                                                                                               |
|                                                                                                                         |
| //                                                                                                                      |
| \-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-- |
|                                                                                                                         |
| \@Column({ name: \'offer_id\', type: \'uuid\' })                                                                        |
|                                                                                                                         |
| offerId: string;                                                                                                        |
|                                                                                                                         |
| \@ManyToOne(() =\> Offer, (offer) =\> offer.counterOffers, {                                                            |
|                                                                                                                         |
| onDelete: \'RESTRICT\', // Prevent deleting an offer with counter offers                                                |
|                                                                                                                         |
| nullable: false,                                                                                                        |
|                                                                                                                         |
| eager: false,                                                                                                           |
|                                                                                                                         |
| })                                                                                                                      |
|                                                                                                                         |
| \@JoinColumn({ name: \'offer_id\' })                                                                                    |
|                                                                                                                         |
| offer: Offer;                                                                                                           |
|                                                                                                                         |
| //                                                                                                                      |
| \-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-- |
|                                                                                                                         |
| // Submitter                                                                                                            |
|                                                                                                                         |
| //                                                                                                                      |
| \-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-- |
|                                                                                                                         |
| /\*\*                                                                                                                   |
|                                                                                                                         |
| \* Which side submitted this counter offer.                                                                             |
|                                                                                                                         |
| \* CLIENT: the client responded to the talent\'s counter offer.                                                         |
|                                                                                                                         |
| \* TALENT: the talent submitted a counter offer on the primary offer.                                                   |
|                                                                                                                         |
| \*/                                                                                                                     |
|                                                                                                                         |
| \@Column({                                                                                                              |
|                                                                                                                         |
| name: \'submitted_by\',                                                                                                 |
|                                                                                                                         |
| type: \'varchar\',                                                                                                      |
|                                                                                                                         |
| length: 10,                                                                                                             |
|                                                                                                                         |
| })                                                                                                                      |
|                                                                                                                         |
| submittedBy: \'CLIENT\' \| \'TALENT\';                                                                                  |
|                                                                                                                         |
| \@Column({                                                                                                              |
|                                                                                                                         |
| name: \'submitted_by_id\',                                                                                              |
|                                                                                                                         |
| type: \'uuid\',                                                                                                         |
|                                                                                                                         |
| })                                                                                                                      |
|                                                                                                                         |
| submittedById: string;                                                                                                  |
|                                                                                                                         |
| //                                                                                                                      |
| \-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-- |
|                                                                                                                         |
| // Status                                                                                                               |
|                                                                                                                         |
| //                                                                                                                      |
| \-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-- |
|                                                                                                                         |
| \@Column({                                                                                                              |
|                                                                                                                         |
| name: \'status\',                                                                                                       |
|                                                                                                                         |
| type: \'varchar\',                                                                                                      |
|                                                                                                                         |
| length: 20,                                                                                                             |
|                                                                                                                         |
| default: CounterOfferStatus.PENDING,                                                                                    |
|                                                                                                                         |
| })                                                                                                                      |
|                                                                                                                         |
| status: CounterOfferStatus;                                                                                             |
|                                                                                                                         |
| //                                                                                                                      |
| \-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-- |
|                                                                                                                         |
| // Terms (identical structure to Offer)                                                                                 |
|                                                                                                                         |
| //                                                                                                                      |
| \-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-- |
|                                                                                                                         |
| \@Column({ name: \'rate\', type: \'int\' })                                                                             |
|                                                                                                                         |
| rate: number;                                                                                                           |
|                                                                                                                         |
| \@Column({ name: \'currency_code\', type: \'char\', length: 3 })                                                        |
|                                                                                                                         |
| currencyCode: string;                                                                                                   |
|                                                                                                                         |
| \@Column({ name: \'duration_months\', type: \'int\' })                                                                  |
|                                                                                                                         |
| durationMonths: number;                                                                                                 |
|                                                                                                                         |
| \@Column({                                                                                                              |
|                                                                                                                         |
| name: \'work_schedule\',                                                                                                |
|                                                                                                                         |
| type: \'jsonb\',                                                                                                        |
|                                                                                                                         |
| transformer: {                                                                                                          |
|                                                                                                                         |
| to: (v: WorkSchedule) =\> v,                                                                                            |
|                                                                                                                         |
| from: (v: WorkSchedule) =\> v,                                                                                          |
|                                                                                                                         |
| },                                                                                                                      |
|                                                                                                                         |
| })                                                                                                                      |
|                                                                                                                         |
| workSchedule: WorkSchedule;                                                                                             |
|                                                                                                                         |
| \@Column({                                                                                                              |
|                                                                                                                         |
| name: \'start_date\',                                                                                                   |
|                                                                                                                         |
| type: \'date\',                                                                                                         |
|                                                                                                                         |
| transformer: {                                                                                                          |
|                                                                                                                         |
| to: (v: string) =\> v,                                                                                                  |
|                                                                                                                         |
| from: (v: string \| Date) =\> {                                                                                         |
|                                                                                                                         |
| if (v instanceof Date) return v.toISOString().split(\'T\')\[0\];                                                        |
|                                                                                                                         |
| return v;                                                                                                               |
|                                                                                                                         |
| },                                                                                                                      |
|                                                                                                                         |
| },                                                                                                                      |
|                                                                                                                         |
| })                                                                                                                      |
|                                                                                                                         |
| startDate: string;                                                                                                      |
|                                                                                                                         |
| \@Column({ name: \'message\', type: \'text\', nullable: true, default: null })                                          |
|                                                                                                                         |
| message: string \| null;                                                                                                |
|                                                                                                                         |
| //                                                                                                                      |
| \-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-- |
|                                                                                                                         |
| // TTL & expiry                                                                                                         |
|                                                                                                                         |
| // NOTE: expiresAt is NOT reset on in-place edit (PATCH)                                                                |
|                                                                                                                         |
| // The TTL clock started when the CO was created and runs continuously.                                                 |
|                                                                                                                         |
| //                                                                                                                      |
| \-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-- |
|                                                                                                                         |
| \@Column({ name: \'expires_at\', type: \'timestamptz\' })                                                               |
|                                                                                                                         |
| expiresAt: Date;                                                                                                        |
|                                                                                                                         |
| \@Column({ name: \'warning_sent_at\', type: \'timestamptz\', nullable: true, default: null })                           |
|                                                                                                                         |
| warningSentAt: Date \| null;                                                                                            |
|                                                                                                                         |
| //                                                                                                                      |
| \-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-- |
|                                                                                                                         |
| // Terminal state timestamps                                                                                            |
|                                                                                                                         |
| //                                                                                                                      |
| \-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-- |
|                                                                                                                         |
| \@Column({ name: \'accepted_at\', type: \'timestamptz\', nullable: true, default: null })                               |
|                                                                                                                         |
| acceptedAt: Date \| null;                                                                                               |
|                                                                                                                         |
| \@Column({ name: \'declined_at\', type: \'timestamptz\', nullable: true, default: null })                               |
|                                                                                                                         |
| declinedAt: Date \| null;                                                                                               |
|                                                                                                                         |
| \@Column({ name: \'withdrawn_at\', type: \'timestamptz\', nullable: true, default: null })                              |
|                                                                                                                         |
| withdrawnAt: Date \| null;                                                                                              |
|                                                                                                                         |
| \@Column({ name: \'withdrawal_message\', type: \'text\', nullable: true, default: null })                               |
|                                                                                                                         |
| withdrawalMessage: string \| null;                                                                                      |
|                                                                                                                         |
| \@Column({ name: \'expired_at\', type: \'timestamptz\', nullable: true, default: null })                                |
|                                                                                                                         |
| expiredAt: Date \| null;                                                                                                |
|                                                                                                                         |
| /\*\*                                                                                                                   |
|                                                                                                                         |
| \* supersededAt is set when the client submits a new counter offer,                                                     |
|                                                                                                                         |
| \* which supersedes this pending one. Not a terminal state from the                                                     |
|                                                                                                                         |
| \* negotiation perspective --- the parent offer remains COUNTERED.                                                      |
|                                                                                                                         |
| \*/                                                                                                                     |
|                                                                                                                         |
| \@Column({ name: \'superseded_at\', type: \'timestamptz\', nullable: true, default: null })                             |
|                                                                                                                         |
| supersededAt: Date \| null;                                                                                             |
|                                                                                                                         |
| //                                                                                                                      |
| \-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-- |
|                                                                                                                         |
| // Relations                                                                                                            |
|                                                                                                                         |
| //                                                                                                                      |
| \-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-- |
|                                                                                                                         |
| \@OneToMany(() =\> OfferHistoryEvent, (e) =\> e.counterOffer, { cascade: false })                                       |
|                                                                                                                         |
| historyEvents: OfferHistoryEvent\[\];                                                                                   |
|                                                                                                                         |
| }                                                                                                                       |
+-------------------------------------------------------------------------------------------------------------------------+

+-----------------------------------------------------------------------+
| **Step 8 OfferHistoryEvent Entity --- offer_history table**           |
|                                                                       |
| Immutable append-only event log                                       |
+-----------------------------------------------------------------------+

The OfferHistoryEvent entity maps to the offer_history table. This is a
write-once append-only log. A new row is inserted for every lifecycle
event: offer created, offer edited, offer accepted, counter offer
submitted, and so on. Rows are NEVER updated and NEVER deleted. They
provide a complete audit trail of every negotiation round.

+-----------------------------------------------------------------------+
| The terms column stores a snapshot of the offer terms at the moment   |
| the event occurred.                                                   |
|                                                                       |
| This is critical for the Offer History modal on the frontend.         |
|                                                                       |
| When the modal shows \"Round 2: rate \$85, start Feb 1\", that data   |
| comes from                                                            |
|                                                                       |
| the terms snapshot in offer_history, not from the current offer       |
| record.                                                               |
|                                                                       |
| Without the snapshot, we could not show the historical terms after    |
| they were changed.                                                    |
+-----------------------------------------------------------------------+

**offer_history Table --- Column Reference**

  ---------------------- ------------- ---------- ------------------- -------------------------------
  **Column**             **Type**      **Null**   **Default**         **Notes**

  **id**                 UUID          **NO**     gen_random_uuid()   Primary key.

  **offer_id**           UUID          **NO**     ---                 FK → offers.id.

  **counter_offer_id**   UUID          **YES**    NULL                FK → counter_offers.id. NULL
                                                                      for primary offer events.

  **event_type**         VARCHAR(50)   **NO**     ---                 Event name. E.g. offer.created,
                                                                      offer.edited, offer.countered.

  **actor**              VARCHAR(10)   **NO**     ---                 Who triggered: CLIENT \| TALENT
                                                                      \| SYSTEM

  **actor_id**           UUID          **YES**    NULL                userId of the actor. NULL for
                                                                      SYSTEM events.

  **terms**              JSONB         **NO**     ---                 Full terms snapshot at this
                                                                      event: rate, currencyCode,
                                                                      durationMonths, workSchedule,
                                                                      startDate, message.

  **created_at**         TIMESTAMPTZ   **NO**     NOW()               Auto-set on insert. NEVER
                                                                      updated.
  ---------------------- ------------- ---------- ------------------- -------------------------------

  -------------------------------------------------------------------------------
  **FILE:
  apps/offer-service/src/offer-history/entities/offer-history-event.entity.ts**

  -------------------------------------------------------------------------------

+-------------------------------------------------------------------------------------------------------------------------+
| import {                                                                                                                |
|                                                                                                                         |
| Entity, Column, Index, ManyToOne, JoinColumn,                                                                           |
|                                                                                                                         |
| PrimaryGeneratedColumn, CreateDateColumn,                                                                               |
|                                                                                                                         |
| } from \'typeorm\';                                                                                                     |
|                                                                                                                         |
| import { Offer } from \'../../offers/entities/offer.entity\';                                                           |
|                                                                                                                         |
| import { CounterOffer } from \'../../counter-offers/entities/counter-offer.entity\';                                    |
|                                                                                                                         |
| /\*\*                                                                                                                   |
|                                                                                                                         |
| \* Snapshot of offer terms stored with every history event.                                                             |
|                                                                                                                         |
| \* Allows the frontend to show exact terms at each negotiation round.                                                   |
|                                                                                                                         |
| \*/                                                                                                                     |
|                                                                                                                         |
| export interface OfferTermsSnapshot {                                                                                   |
|                                                                                                                         |
| rate: number;                                                                                                           |
|                                                                                                                         |
| currencyCode: string;                                                                                                   |
|                                                                                                                         |
| durationMonths: number;                                                                                                 |
|                                                                                                                         |
| workSchedule: { type: string; hoursPerWeek?: number };                                                                  |
|                                                                                                                         |
| startDate: string; // YYYY-MM-DD                                                                                        |
|                                                                                                                         |
| message: string \| null;                                                                                                |
|                                                                                                                         |
| }                                                                                                                       |
|                                                                                                                         |
| /\*\*                                                                                                                   |
|                                                                                                                         |
| \* OfferHistoryEvent --- Maps to offer_service.offer_history.                                                           |
|                                                                                                                         |
| \*                                                                                                                      |
|                                                                                                                         |
| \* APPEND-ONLY. Never update. Never delete.                                                                             |
|                                                                                                                         |
| \*                                                                                                                      |
|                                                                                                                         |
| \* A new row is inserted for every lifecycle event.                                                                     |
|                                                                                                                         |
| \* The terms snapshot captures the full offer state at that moment.                                                     |
|                                                                                                                         |
| \*                                                                                                                      |
|                                                                                                                         |
| \* Note: This entity does NOT extend OfferServiceBaseEntity because                                                     |
|                                                                                                                         |
| \* it does NOT have an updated_at column (it is immutable).                                                             |
|                                                                                                                         |
| \* It has id and created_at only.                                                                                       |
|                                                                                                                         |
| \*/                                                                                                                     |
|                                                                                                                         |
| \@Entity({ name: \'offer_history\', schema: \'offer_service\' })                                                        |
|                                                                                                                         |
| \@Index(\'idx_oh_offer_id_created\', \[\'offerId\', \'createdAt\'\])                                                    |
|                                                                                                                         |
| export class OfferHistoryEvent {                                                                                        |
|                                                                                                                         |
| \@PrimaryGeneratedColumn(\'uuid\', { name: \'id\' })                                                                    |
|                                                                                                                         |
| id: string;                                                                                                             |
|                                                                                                                         |
| //                                                                                                                      |
| \-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-- |
|                                                                                                                         |
| // References                                                                                                           |
|                                                                                                                         |
| //                                                                                                                      |
| \-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-- |
|                                                                                                                         |
| \@Column({ name: \'offer_id\', type: \'uuid\' })                                                                        |
|                                                                                                                         |
| \@Index(\'idx_oh_offer_id\')                                                                                            |
|                                                                                                                         |
| offerId: string;                                                                                                        |
|                                                                                                                         |
| \@ManyToOne(() =\> Offer, (offer) =\> offer.historyEvents, {                                                            |
|                                                                                                                         |
| onDelete: \'RESTRICT\',                                                                                                 |
|                                                                                                                         |
| nullable: false,                                                                                                        |
|                                                                                                                         |
| eager: false,                                                                                                           |
|                                                                                                                         |
| })                                                                                                                      |
|                                                                                                                         |
| \@JoinColumn({ name: \'offer_id\' })                                                                                    |
|                                                                                                                         |
| offer: Offer;                                                                                                           |
|                                                                                                                         |
| /\*\*                                                                                                                   |
|                                                                                                                         |
| \* counter_offer_id is NULL for primary offer events.                                                                   |
|                                                                                                                         |
| \* It is set for events triggered by counter offer actions:                                                             |
|                                                                                                                         |
| \* offer.countered, offer.counter_accepted, offer.counter_declined,                                                     |
|                                                                                                                         |
| \* offer.counter_withdrawn, offer.counter_edited, offer.counter_expired                                                 |
|                                                                                                                         |
| \*/                                                                                                                     |
|                                                                                                                         |
| \@Column({ name: \'counter_offer_id\', type: \'uuid\', nullable: true, default: null })                                 |
|                                                                                                                         |
| counterOfferId: string \| null;                                                                                         |
|                                                                                                                         |
| \@ManyToOne(() =\> CounterOffer, (co) =\> co.historyEvents, {                                                           |
|                                                                                                                         |
| onDelete: \'SET NULL\',                                                                                                 |
|                                                                                                                         |
| nullable: true,                                                                                                         |
|                                                                                                                         |
| eager: false,                                                                                                           |
|                                                                                                                         |
| })                                                                                                                      |
|                                                                                                                         |
| \@JoinColumn({ name: \'counter_offer_id\' })                                                                            |
|                                                                                                                         |
| counterOffer: CounterOffer \| null;                                                                                     |
|                                                                                                                         |
| //                                                                                                                      |
| \-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-- |
|                                                                                                                         |
| // Event metadata                                                                                                       |
|                                                                                                                         |
| //                                                                                                                      |
| \-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-- |
|                                                                                                                         |
| /\*\*                                                                                                                   |
|                                                                                                                         |
| \* eventType mirrors the RabbitMQ event name.                                                                           |
|                                                                                                                         |
| \* Consistent with the events emitted to marketeq.offers exchange.                                                      |
|                                                                                                                         |
| \* Examples: offer.created, offer.accepted, offer.edited,                                                               |
|                                                                                                                         |
| \* offer.countered, offer.counter_accepted, offer.resent                                                                |
|                                                                                                                         |
| \*/                                                                                                                     |
|                                                                                                                         |
| \@Column({                                                                                                              |
|                                                                                                                         |
| name: \'event_type\',                                                                                                   |
|                                                                                                                         |
| type: \'varchar\',                                                                                                      |
|                                                                                                                         |
| length: 50,                                                                                                             |
|                                                                                                                         |
| })                                                                                                                      |
|                                                                                                                         |
| eventType: string;                                                                                                      |
|                                                                                                                         |
| /\*\*                                                                                                                   |
|                                                                                                                         |
| \* actor is who triggered this event.                                                                                   |
|                                                                                                                         |
| \* CLIENT --- client user action (create offer, edit offer, withdraw, resend)                                           |
|                                                                                                                         |
| \* TALENT --- talent user action (accept, decline, counter offer)                                                       |
|                                                                                                                         |
| \* SYSTEM --- automated action (expiry cron, warning cron)                                                              |
|                                                                                                                         |
| \*/                                                                                                                     |
|                                                                                                                         |
| \@Column({                                                                                                              |
|                                                                                                                         |
| name: \'actor\',                                                                                                        |
|                                                                                                                         |
| type: \'varchar\',                                                                                                      |
|                                                                                                                         |
| length: 10,                                                                                                             |
|                                                                                                                         |
| })                                                                                                                      |
|                                                                                                                         |
| actor: \'CLIENT\' \| \'TALENT\' \| \'SYSTEM\';                                                                          |
|                                                                                                                         |
| \@Column({ name: \'actor_id\', type: \'uuid\', nullable: true, default: null })                                         |
|                                                                                                                         |
| actorId: string \| null;                                                                                                |
|                                                                                                                         |
| //                                                                                                                      |
| \-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-- |
|                                                                                                                         |
| // Terms snapshot                                                                                                       |
|                                                                                                                         |
| //                                                                                                                      |
| \-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-- |
|                                                                                                                         |
| /\*\*                                                                                                                   |
|                                                                                                                         |
| \* Full snapshot of offer terms at the moment this event occurred.                                                      |
|                                                                                                                         |
| \* Stored as JSONB for efficient retrieval.                                                                             |
|                                                                                                                         |
| \* Used by the Offer History modal to show terms for each round.                                                        |
|                                                                                                                         |
| \*/                                                                                                                     |
|                                                                                                                         |
| \@Column({                                                                                                              |
|                                                                                                                         |
| name: \'terms\',                                                                                                        |
|                                                                                                                         |
| type: \'jsonb\',                                                                                                        |
|                                                                                                                         |
| transformer: {                                                                                                          |
|                                                                                                                         |
| to: (v: OfferTermsSnapshot) =\> v,                                                                                      |
|                                                                                                                         |
| from: (v: OfferTermsSnapshot) =\> v,                                                                                    |
|                                                                                                                         |
| },                                                                                                                      |
|                                                                                                                         |
| })                                                                                                                      |
|                                                                                                                         |
| terms: OfferTermsSnapshot;                                                                                              |
|                                                                                                                         |
| //                                                                                                                      |
| \-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-- |
|                                                                                                                         |
| // Timestamp (no updated_at --- this record is immutable)                                                               |
|                                                                                                                         |
| //                                                                                                                      |
| \-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-- |
|                                                                                                                         |
| \@CreateDateColumn({ name: \'created_at\', type: \'timestamptz\' })                                                     |
|                                                                                                                         |
| createdAt: Date;                                                                                                        |
|                                                                                                                         |
| }                                                                                                                       |
+-------------------------------------------------------------------------------------------------------------------------+

+-----------------------------------------------------------------------+
| **Step 9 OutboxEvent Entity --- outbox table**                        |
|                                                                       |
| Transactional outbox for guaranteed RabbitMQ delivery                 |
+-----------------------------------------------------------------------+

The OutboxEvent entity maps to the outbox table. This is the core of the
transactional outbox pattern. When an offer state changes, an
OutboxEvent row is written in the SAME database transaction as the state
change. A background poller picks up PENDING rows and publishes them to
RabbitMQ. Successfully published rows are deleted. Failed rows are
retried up to 10 times. This guarantees that events are never lost even
if RabbitMQ is temporarily unavailable.

+-----------------------------------------------------------------------+
| Why transactional outbox?                                             |
|                                                                       |
| Without outbox: publish to RabbitMQ, then save to DB.                 |
|                                                                       |
| Problem: DB save could fail. Event published but state not saved.     |
| Inconsistent.                                                         |
|                                                                       |
| Without outbox: save to DB, then publish to RabbitMQ.                 |
|                                                                       |
| Problem: RabbitMQ publish could fail after DB save. State saved but   |
| no event. Silent failure.                                             |
|                                                                       |
| With outbox: write event row + state change in ONE TRANSACTION.       |
|                                                                       |
| Guarantee: if DB commit succeeds, the event row exists. Poller will   |
| publish it.                                                           |
|                                                                       |
| If DB fails, both the state change AND the event row are rolled back. |
| No inconsistency.                                                     |
|                                                                       |
| The outbox rows for a given offer are NOT related via FK to the       |
| offers table.                                                         |
|                                                                       |
| This is intentional: it avoids cascade/constraint issues and keeps    |
| the outbox                                                            |
|                                                                       |
| table clean and independently operable.                               |
+-----------------------------------------------------------------------+

**outbox Table --- Column Reference**

  -------------------- -------------- ---------- ------------------- -------------------------------
  **Column**           **Type**       **Null**   **Default**         **Notes**

  **id**               UUID           **NO**     gen_random_uuid()   Primary key.

  **aggregate_id**     UUID           **NO**     ---                 The offer ID this event relates
                                                                     to. Not a FK --- loose
                                                                     coupling.

  **aggregate_type**   VARCHAR(30)    **NO**     offer               The type of aggregate. Always
                                                                     \"offer\" in offer-service.

  **event_type**       VARCHAR(50)    **NO**     ---                 RabbitMQ routing key. E.g.
                                                                     offer.created, offer.accepted.

  **exchange**         VARCHAR(100)   **NO**     marketeq.offers     Target RabbitMQ exchange.

  **routing_key**      VARCHAR(100)   **NO**     ---                 Routing key for the exchange.
                                                                     Same as event_type in this
                                                                     service.

  **payload**          JSONB          **NO**     ---                 Full event payload to be
                                                                     published to RabbitMQ.

  **status**           VARCHAR(20)    **NO**     PENDING             PENDING \| PROCESSING \|
                                                                     PUBLISHED \| FAILED

  **retry_count**      INTEGER        **NO**     0                   Number of publish attempts. Max
                                                                     10 before status → FAILED.

  **last_error**       TEXT           **YES**    NULL                Last error message if publish
                                                                     failed. For debugging.

  **scheduled_at**     TIMESTAMPTZ    **NO**     NOW()               When this row is eligible to be
                                                                     picked up by the poller.

  **processed_at**     TIMESTAMPTZ    **YES**    NULL                When the poller successfully
                                                                     published and deleted this row.

  **created_at**       TIMESTAMPTZ    **NO**     NOW()               Auto-set on insert.

  **updated_at**       TIMESTAMPTZ    **NO**     NOW()               Auto-updated by TypeORM.
  -------------------- -------------- ---------- ------------------- -------------------------------

  -----------------------------------------------------------------------
  **FILE: apps/offer-service/src/outbox/entities/outbox-event.entity.ts**

  -----------------------------------------------------------------------

+-----------------------------------------------------------------------+
| import { Entity, Column, Index } from \'typeorm\';                    |
|                                                                       |
| import { OfferServiceBaseEntity } from                                |
| \'../../common/entities/base.entity\';                                |
|                                                                       |
| /\*\*                                                                 |
|                                                                       |
| \* Outbox event status lifecycle:                                     |
|                                                                       |
| \* PENDING → Row created. Waiting for poller to pick it up.           |
|                                                                       |
| \* PROCESSING → Poller has claimed this row. In-flight.               |
|                                                                       |
| \* PUBLISHED → Successfully published to RabbitMQ. Row is deleted     |
| after this.                                                           |
|                                                                       |
| \* FAILED → Max retry attempts (10) reached. Engineering alert sent.  |
|                                                                       |
| \*/                                                                   |
|                                                                       |
| export enum OutboxEventStatus {                                       |
|                                                                       |
| PENDING = \'PENDING\',                                                |
|                                                                       |
| PROCESSING = \'PROCESSING\',                                          |
|                                                                       |
| PUBLISHED = \'PUBLISHED\',                                            |
|                                                                       |
| FAILED = \'FAILED\',                                                  |
|                                                                       |
| }                                                                     |
|                                                                       |
| /\*\*                                                                 |
|                                                                       |
| \* OutboxEvent --- Maps to offer_service.outbox.                      |
|                                                                       |
| \*                                                                    |
|                                                                       |
| \* Written atomically with offer state changes.                       |
|                                                                       |
| \* Rows are deleted after successful publish.                         |
|                                                                       |
| \* Failed rows remain with status = FAILED for debugging.             |
|                                                                       |
| \*                                                                    |
|                                                                       |
| \* The poller (OutboxProcessor) runs on a configurable interval       |
|                                                                       |
| \* and claims batches of PENDING rows using SELECT FOR UPDATE SKIP    |
| LOCKED                                                                |
|                                                                       |
| \* to prevent multiple instances from processing the same row.        |
|                                                                       |
| \*/                                                                   |
|                                                                       |
| \@Entity({ name: \'outbox\', schema: \'offer_service\' })             |
|                                                                       |
| \@Index(\'idx_outbox_status_scheduled\', \[\'status\',                |
| \'scheduledAt\'\])                                                    |
|                                                                       |
| export class OutboxEvent extends OfferServiceBaseEntity {             |
|                                                                       |
| /\*\*                                                                 |
|                                                                       |
| \* aggregateId is the offer ID this event belongs to.                 |
|                                                                       |
| \* Not a foreign key --- loose coupling allows outbox to operate      |
|                                                                       |
| \* independently even if the source record is deleted.                |
|                                                                       |
| \*/                                                                   |
|                                                                       |
| \@Column({ name: \'aggregate_id\', type: \'uuid\' })                  |
|                                                                       |
| \@Index(\'idx_outbox_aggregate_id\')                                  |
|                                                                       |
| aggregateId: string;                                                  |
|                                                                       |
| \@Column({ name: \'aggregate_type\', type: \'varchar\', length: 30,   |
| default: \'offer\' })                                                 |
|                                                                       |
| aggregateType: string;                                                |
|                                                                       |
| /\*\*                                                                 |
|                                                                       |
| \* eventType mirrors the RabbitMQ routing key.                        |
|                                                                       |
| \* Examples: offer.created, offer.accepted, offer.countered           |
|                                                                       |
| \* Full list of 14 event types documented in OS-20.                   |
|                                                                       |
| \*/                                                                   |
|                                                                       |
| \@Column({ name: \'event_type\', type: \'varchar\', length: 50 })     |
|                                                                       |
| eventType: string;                                                    |
|                                                                       |
| \@Column({ name: \'exchange\', type: \'varchar\', length: 100,        |
| default: \'marketeq.offers\' })                                       |
|                                                                       |
| exchange: string;                                                     |
|                                                                       |
| \@Column({ name: \'routing_key\', type: \'varchar\', length: 100 })   |
|                                                                       |
| routingKey: string;                                                   |
|                                                                       |
| /\*\*                                                                 |
|                                                                       |
| \* Full event payload to be published to RabbitMQ.                    |
|                                                                       |
| \* Stored as JSONB. The exact payload shape is defined per event in   |
| OS-20.                                                                |
|                                                                       |
| \*/                                                                   |
|                                                                       |
| \@Column({                                                            |
|                                                                       |
| name: \'payload\',                                                    |
|                                                                       |
| type: \'jsonb\',                                                      |
|                                                                       |
| transformer: {                                                        |
|                                                                       |
| to: (v: Record\<string, unknown\>) =\> v,                             |
|                                                                       |
| from: (v: Record\<string, unknown\>) =\> v,                           |
|                                                                       |
| },                                                                    |
|                                                                       |
| })                                                                    |
|                                                                       |
| payload: Record\<string, unknown\>;                                   |
|                                                                       |
| \@Column({                                                            |
|                                                                       |
| name: \'status\',                                                     |
|                                                                       |
| type: \'varchar\',                                                    |
|                                                                       |
| length: 20,                                                           |
|                                                                       |
| default: OutboxEventStatus.PENDING,                                   |
|                                                                       |
| })                                                                    |
|                                                                       |
| status: OutboxEventStatus;                                            |
|                                                                       |
| \@Column({                                                            |
|                                                                       |
| name: \'retry_count\',                                                |
|                                                                       |
| type: \'int\',                                                        |
|                                                                       |
| default: 0,                                                           |
|                                                                       |
| })                                                                    |
|                                                                       |
| retryCount: number;                                                   |
|                                                                       |
| \@Column({ name: \'last_error\', type: \'text\', nullable: true,      |
| default: null })                                                      |
|                                                                       |
| lastError: string \| null;                                            |
|                                                                       |
| /\*\*                                                                 |
|                                                                       |
| \* scheduledAt controls when the row is eligible for pickup.          |
|                                                                       |
| \* Initially set to NOW(). For retries, set to NOW() + backoff.       |
|                                                                       |
| \* Exponential backoff: attempt 1 = +1min, 2 = +2min, 3 = +4min, \... |
|                                                                       |
| \*/                                                                   |
|                                                                       |
| \@Column({ name: \'scheduled_at\', type: \'timestamptz\', default: () |
| =\> \'NOW()\' })                                                      |
|                                                                       |
| scheduledAt: Date;                                                    |
|                                                                       |
| \@Column({ name: \'processed_at\', type: \'timestamptz\', nullable:   |
| true, default: null })                                                |
|                                                                       |
| processedAt: Date \| null;                                            |
|                                                                       |
| }                                                                     |
+-----------------------------------------------------------------------+

+-----------------------------------------------------------------------+
| **Step 10 Raw SQL DDL --- Create Schema and All Tables**              |
|                                                                       |
| Run this once to set up the database                                  |
+-----------------------------------------------------------------------+

This SQL file creates the offer_service schema and all four tables with
their constraints, indexes, and triggers. Run this once in your
PostgreSQL database before starting the service. In development, TypeORM
synchronize: true can auto-create tables from entities, but in
production you MUST run migrations --- never use synchronize: true in
production (see OS-09 for the DB_SYNC safety rule).

+-----------------------------------------------------------------------+
| Never run with DB_SYNC=true in production.                            |
|                                                                       |
| DB_SYNC=true (synchronize: true in TypeORM) drops and recreates       |
| columns.                                                              |
|                                                                       |
| It will destroy production data if your entities change.              |
|                                                                       |
| In development: DB_SYNC=true is convenient but not required if you    |
| run the SQL below.                                                    |
|                                                                       |
| In production and staging: always use migrations (OS-17).             |
|                                                                       |
| The validation schema in OS-09 enforces DB_SYNC=false when            |
| NODE_ENV=production.                                                  |
+-----------------------------------------------------------------------+

  -----------------------------------------------------------------------
  **FILE:
  apps/offer-service/src/database/migrations/001_create_schema.sql**

  -----------------------------------------------------------------------

+------------------------------------------------------------------------------------+
| \-- OS-15: offer-service database schema setup                                     |
|                                                                                    |
| \-- Run this once before starting the service.                                     |
|                                                                                    |
| \-- Safe to run multiple times (uses IF NOT EXISTS throughout).                    |
|                                                                                    |
| \-- ============================================================                   |
|                                                                                    |
| \-- Schema                                                                         |
|                                                                                    |
| \-- ============================================================                   |
|                                                                                    |
| CREATE SCHEMA IF NOT EXISTS offer_service;                                         |
|                                                                                    |
| \-- ============================================================                   |
|                                                                                    |
| \-- Table: offers                                                                  |
|                                                                                    |
| \-- ============================================================                   |
|                                                                                    |
| CREATE TABLE IF NOT EXISTS offer_service.offers (                                  |
|                                                                                    |
| id UUID NOT NULL DEFAULT gen_random_uuid(),                                        |
|                                                                                    |
| client_id UUID NOT NULL,                                                           |
|                                                                                    |
| talent_id UUID NOT NULL,                                                           |
|                                                                                    |
| job_listing_id UUID NOT NULL,                                                      |
|                                                                                    |
| contract_type VARCHAR(20) NOT NULL CHECK (contract_type IN                         |
| (\'PROJECT\',\'SERVICE\',\'TEAM\',\'CONTRACT\')),                                  |
|                                                                                    |
| contract_title VARCHAR(200) NOT NULL,                                              |
|                                                                                    |
| status VARCHAR(20) NOT NULL DEFAULT \'PENDING\'                                    |
|                                                                                    |
| CHECK (status IN                                                                   |
| (\'PENDING\',\'ACCEPTED\',\'DECLINED\',\'WITHDRAWN\',\'EXPIRED\',\'COUNTERED\')),  |
|                                                                                    |
| rate INTEGER NOT NULL CHECK (rate \>= 1 AND rate \<= 9999),                        |
|                                                                                    |
| currency_code CHAR(3) NOT NULL,                                                    |
|                                                                                    |
| duration_months INTEGER NOT NULL CHECK (duration_months \>= 1 AND duration_months  |
| \<= 60),                                                                           |
|                                                                                    |
| work_schedule JSONB NOT NULL,                                                      |
|                                                                                    |
| start_date DATE NOT NULL,                                                          |
|                                                                                    |
| message TEXT,                                                                      |
|                                                                                    |
| expires_at TIMESTAMPTZ NOT NULL,                                                   |
|                                                                                    |
| warning_sent_at TIMESTAMPTZ,                                                       |
|                                                                                    |
| accepted_at TIMESTAMPTZ,                                                           |
|                                                                                    |
| declined_at TIMESTAMPTZ,                                                           |
|                                                                                    |
| declined_reason TEXT,                                                              |
|                                                                                    |
| declined_chip VARCHAR(30),                                                         |
|                                                                                    |
| withdrawn_at TIMESTAMPTZ,                                                          |
|                                                                                    |
| withdrawal_message TEXT,                                                           |
|                                                                                    |
| expired_at TIMESTAMPTZ,                                                            |
|                                                                                    |
| original_offer_id UUID REFERENCES offer_service.offers(id) ON DELETE SET NULL,     |
|                                                                                    |
| created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),                                     |
|                                                                                    |
| updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),                                     |
|                                                                                    |
| CONSTRAINT pk_offers PRIMARY KEY (id)                                              |
|                                                                                    |
| );                                                                                 |
|                                                                                    |
| \-- Indexes on offers                                                              |
|                                                                                    |
| CREATE INDEX IF NOT EXISTS idx_offers_client_id ON offer_service.offers            |
| (client_id);                                                                       |
|                                                                                    |
| CREATE INDEX IF NOT EXISTS idx_offers_talent_id ON offer_service.offers            |
| (talent_id);                                                                       |
|                                                                                    |
| CREATE INDEX IF NOT EXISTS idx_offers_client_talent ON offer_service.offers        |
| (client_id, talent_id);                                                            |
|                                                                                    |
| CREATE INDEX IF NOT EXISTS idx_offers_status_expires ON offer_service.offers       |
| (status, expires_at);                                                              |
|                                                                                    |
| CREATE INDEX IF NOT EXISTS idx_offers_talent_status ON offer_service.offers        |
| (talent_id, status);                                                               |
|                                                                                    |
| \-- Trigger: auto-update updated_at on every UPDATE                                |
|                                                                                    |
| CREATE OR REPLACE FUNCTION offer_service.set_updated_at()                          |
|                                                                                    |
| RETURNS TRIGGER AS \$\$                                                            |
|                                                                                    |
| BEGIN                                                                              |
|                                                                                    |
| NEW.updated_at = NOW();                                                            |
|                                                                                    |
| RETURN NEW;                                                                        |
|                                                                                    |
| END;                                                                               |
|                                                                                    |
| \$\$ LANGUAGE plpgsql;                                                             |
|                                                                                    |
| DROP TRIGGER IF EXISTS offers_updated_at ON offer_service.offers;                  |
|                                                                                    |
| CREATE TRIGGER offers_updated_at                                                   |
|                                                                                    |
| BEFORE UPDATE ON offer_service.offers                                              |
|                                                                                    |
| FOR EACH ROW EXECUTE FUNCTION offer_service.set_updated_at();                      |
|                                                                                    |
| \-- ============================================================                   |
|                                                                                    |
| \-- Table: counter_offers                                                          |
|                                                                                    |
| \-- ============================================================                   |
|                                                                                    |
| CREATE TABLE IF NOT EXISTS offer_service.counter_offers (                          |
|                                                                                    |
| id UUID NOT NULL DEFAULT gen_random_uuid(),                                        |
|                                                                                    |
| offer_id UUID NOT NULL REFERENCES offer_service.offers(id) ON DELETE RESTRICT,     |
|                                                                                    |
| submitted_by VARCHAR(10) NOT NULL CHECK (submitted_by IN (\'CLIENT\',\'TALENT\')), |
|                                                                                    |
| submitted_by_id UUID NOT NULL,                                                     |
|                                                                                    |
| status VARCHAR(20) NOT NULL DEFAULT \'PENDING\'                                    |
|                                                                                    |
| CHECK (status IN                                                                   |
| (\'PENDING\',\'ACCEPTED\',\'DECLINED\',\'WITHDRAWN\',\'EXPIRED\',\'SUPERSEDED\')), |
|                                                                                    |
| rate INTEGER NOT NULL CHECK (rate \>= 1 AND rate \<= 9999),                        |
|                                                                                    |
| currency_code CHAR(3) NOT NULL,                                                    |
|                                                                                    |
| duration_months INTEGER NOT NULL CHECK (duration_months \>= 1 AND duration_months  |
| \<= 60),                                                                           |
|                                                                                    |
| work_schedule JSONB NOT NULL,                                                      |
|                                                                                    |
| start_date DATE NOT NULL,                                                          |
|                                                                                    |
| message TEXT,                                                                      |
|                                                                                    |
| expires_at TIMESTAMPTZ NOT NULL,                                                   |
|                                                                                    |
| warning_sent_at TIMESTAMPTZ,                                                       |
|                                                                                    |
| accepted_at TIMESTAMPTZ,                                                           |
|                                                                                    |
| declined_at TIMESTAMPTZ,                                                           |
|                                                                                    |
| withdrawn_at TIMESTAMPTZ,                                                          |
|                                                                                    |
| withdrawal_message TEXT,                                                           |
|                                                                                    |
| expired_at TIMESTAMPTZ,                                                            |
|                                                                                    |
| superseded_at TIMESTAMPTZ,                                                         |
|                                                                                    |
| created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),                                     |
|                                                                                    |
| updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),                                     |
|                                                                                    |
| CONSTRAINT pk_counter_offers PRIMARY KEY (id)                                      |
|                                                                                    |
| );                                                                                 |
|                                                                                    |
| \-- Standard indexes                                                               |
|                                                                                    |
| CREATE INDEX IF NOT EXISTS idx_co_offer_id ON offer_service.counter_offers         |
| (offer_id);                                                                        |
|                                                                                    |
| CREATE INDEX IF NOT EXISTS idx_co_offer_status ON offer_service.counter_offers     |
| (offer_id, status);                                                                |
|                                                                                    |
| CREATE INDEX IF NOT EXISTS idx_co_expires ON offer_service.counter_offers (status, |
| expires_at);                                                                       |
|                                                                                    |
| \-- CRITICAL: Partial unique index enforcing only ONE PENDING CO per offer.        |
|                                                                                    |
| \-- This is the database-level enforcement of the \"one active counter offer\"     |
| rule.                                                                              |
|                                                                                    |
| \-- The service layer also checks this, but the DB constraint is the safety net.   |
|                                                                                    |
| CREATE UNIQUE INDEX IF NOT EXISTS uq_counter_offers_one_pending                    |
|                                                                                    |
| ON offer_service.counter_offers (offer_id)                                         |
|                                                                                    |
| WHERE status = \'PENDING\';                                                        |
|                                                                                    |
| \-- updated_at trigger                                                             |
|                                                                                    |
| DROP TRIGGER IF EXISTS counter_offers_updated_at ON offer_service.counter_offers;  |
|                                                                                    |
| CREATE TRIGGER counter_offers_updated_at                                           |
|                                                                                    |
| BEFORE UPDATE ON offer_service.counter_offers                                      |
|                                                                                    |
| FOR EACH ROW EXECUTE FUNCTION offer_service.set_updated_at();                      |
|                                                                                    |
| \-- ============================================================                   |
|                                                                                    |
| \-- Table: offer_history                                                           |
|                                                                                    |
| \-- APPEND-ONLY. No UPDATE or DELETE operations.                                   |
|                                                                                    |
| \-- ============================================================                   |
|                                                                                    |
| CREATE TABLE IF NOT EXISTS offer_service.offer_history (                           |
|                                                                                    |
| id UUID NOT NULL DEFAULT gen_random_uuid(),                                        |
|                                                                                    |
| offer_id UUID NOT NULL REFERENCES offer_service.offers(id) ON DELETE RESTRICT,     |
|                                                                                    |
| counter_offer_id UUID REFERENCES offer_service.counter_offers(id) ON DELETE SET    |
| NULL,                                                                              |
|                                                                                    |
| event_type VARCHAR(50) NOT NULL,                                                   |
|                                                                                    |
| actor VARCHAR(10) NOT NULL CHECK (actor IN (\'CLIENT\',\'TALENT\',\'SYSTEM\')),    |
|                                                                                    |
| actor_id UUID,                                                                     |
|                                                                                    |
| terms JSONB NOT NULL,                                                              |
|                                                                                    |
| created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),                                     |
|                                                                                    |
| CONSTRAINT pk_offer_history PRIMARY KEY (id)                                       |
|                                                                                    |
| );                                                                                 |
|                                                                                    |
| CREATE INDEX IF NOT EXISTS idx_oh_offer_id ON offer_service.offer_history          |
| (offer_id);                                                                        |
|                                                                                    |
| CREATE INDEX IF NOT EXISTS idx_oh_offer_id_created ON offer_service.offer_history  |
| (offer_id, created_at DESC);                                                       |
|                                                                                    |
| \-- ============================================================                   |
|                                                                                    |
| \-- Table: outbox                                                                  |
|                                                                                    |
| \-- ============================================================                   |
|                                                                                    |
| CREATE TABLE IF NOT EXISTS offer_service.outbox (                                  |
|                                                                                    |
| id UUID NOT NULL DEFAULT gen_random_uuid(),                                        |
|                                                                                    |
| aggregate_id UUID NOT NULL,                                                        |
|                                                                                    |
| aggregate_type VARCHAR(30) NOT NULL DEFAULT \'offer\',                             |
|                                                                                    |
| event_type VARCHAR(50) NOT NULL,                                                   |
|                                                                                    |
| exchange VARCHAR(100) NOT NULL DEFAULT \'marketeq.offers\',                        |
|                                                                                    |
| routing_key VARCHAR(100) NOT NULL,                                                 |
|                                                                                    |
| payload JSONB NOT NULL,                                                            |
|                                                                                    |
| status VARCHAR(20) NOT NULL DEFAULT \'PENDING\'                                    |
|                                                                                    |
| CHECK (status IN (\'PENDING\',\'PROCESSING\',\'PUBLISHED\',\'FAILED\')),           |
|                                                                                    |
| retry_count INTEGER NOT NULL DEFAULT 0,                                            |
|                                                                                    |
| last_error TEXT,                                                                   |
|                                                                                    |
| scheduled_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),                                   |
|                                                                                    |
| processed_at TIMESTAMPTZ,                                                          |
|                                                                                    |
| created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),                                     |
|                                                                                    |
| updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),                                     |
|                                                                                    |
| CONSTRAINT pk_outbox PRIMARY KEY (id)                                              |
|                                                                                    |
| );                                                                                 |
|                                                                                    |
| CREATE INDEX IF NOT EXISTS idx_outbox_status_scheduled ON offer_service.outbox     |
| (status, scheduled_at)                                                             |
|                                                                                    |
| WHERE status IN (\'PENDING\', \'PROCESSING\');                                     |
|                                                                                    |
| CREATE INDEX IF NOT EXISTS idx_outbox_aggregate_id ON offer_service.outbox         |
| (aggregate_id);                                                                    |
|                                                                                    |
| DROP TRIGGER IF EXISTS outbox_updated_at ON offer_service.outbox;                  |
|                                                                                    |
| CREATE TRIGGER outbox_updated_at                                                   |
|                                                                                    |
| BEFORE UPDATE ON offer_service.outbox                                              |
|                                                                                    |
| FOR EACH ROW EXECUTE FUNCTION offer_service.set_updated_at();                      |
|                                                                                    |
| \-- ============================================================                   |
|                                                                                    |
| \-- Verification queries                                                           |
|                                                                                    |
| \-- ============================================================                   |
|                                                                                    |
| \-- Run these to confirm all tables and indexes were created:                      |
|                                                                                    |
| SELECT table_name FROM information_schema.tables                                   |
|                                                                                    |
| WHERE table_schema = \'offer_service\' ORDER BY table_name;                        |
|                                                                                    |
| \-- Expected: counter_offers, offer_history, offers, outbox                        |
|                                                                                    |
| SELECT indexname, tablename FROM pg_indexes                                        |
|                                                                                    |
| WHERE schemaname = \'offer_service\' ORDER BY tablename, indexname;                |
|                                                                                    |
| \-- Expected: all indexes listed above                                             |
+------------------------------------------------------------------------------------+

+-----------------------------------------------------------------------+
| **Step 11 Register Entities in Feature Modules**                      |
|                                                                       |
| Tell TypeORM which entities each module owns                          |
+-----------------------------------------------------------------------+

Every entity must be registered in the TypeOrmModule.forFeature() call
inside its feature module. TypeORM uses this to create the repository
for that entity. Without this registration,
\@InjectRepository(EntityClass) will fail with an error at startup.

  -----------------------------------------------------------------------
  **FILE: apps/offer-service/src/offers/offers.module.ts**

  -----------------------------------------------------------------------

+-----------------------------------------------------------------------+
| import { Module } from \'@nestjs/common\';                            |
|                                                                       |
| import { TypeOrmModule } from \'@nestjs/typeorm\';                    |
|                                                                       |
| import { OffersController } from \'./offers.controller\';             |
|                                                                       |
| import { OffersService } from \'./offers.service\';                   |
|                                                                       |
| import { Offer } from \'./entities/offer.entity\';                    |
|                                                                       |
| import { OfferHistoryEvent } from                                     |
| \'../offer-history/entities/offer-history-event.entity\';             |
|                                                                       |
| import { OutboxEvent } from                                           |
| \'../outbox/entities/outbox-event.entity\';                           |
|                                                                       |
| import { OutboxModule } from \'../outbox/outbox.module\';             |
|                                                                       |
| import { RealtimeModule } from \'../realtime/realtime.module\';       |
|                                                                       |
| \@Module({                                                            |
|                                                                       |
| imports: \[                                                           |
|                                                                       |
| // Register entities owned by this module                             |
|                                                                       |
| TypeOrmModule.forFeature(\[                                           |
|                                                                       |
| Offer,                                                                |
|                                                                       |
| OfferHistoryEvent,                                                    |
|                                                                       |
| OutboxEvent,                                                          |
|                                                                       |
| \]),                                                                  |
|                                                                       |
| OutboxModule,                                                         |
|                                                                       |
| RealtimeModule,                                                       |
|                                                                       |
| \],                                                                   |
|                                                                       |
| controllers: \[OffersController\],                                    |
|                                                                       |
| providers: \[OffersService\],                                         |
|                                                                       |
| exports: \[OffersService\],                                           |
|                                                                       |
| })                                                                    |
|                                                                       |
| export class OffersModule {}                                          |
+-----------------------------------------------------------------------+

  -----------------------------------------------------------------------
  **FILE:
  apps/offer-service/src/counter-offers/counter-offers.module.ts**

  -----------------------------------------------------------------------

+-----------------------------------------------------------------------+
| import { Module } from \'@nestjs/common\';                            |
|                                                                       |
| import { TypeOrmModule } from \'@nestjs/typeorm\';                    |
|                                                                       |
| import { CounterOffersController } from                               |
| \'./counter-offers.controller\';                                      |
|                                                                       |
| import { CounterOffersService } from \'./counter-offers.service\';    |
|                                                                       |
| import { CounterOffer } from \'./entities/counter-offer.entity\';     |
|                                                                       |
| import { OfferHistoryEvent } from                                     |
| \'../offer-history/entities/offer-history-event.entity\';             |
|                                                                       |
| import { OutboxEvent } from                                           |
| \'../outbox/entities/outbox-event.entity\';                           |
|                                                                       |
| import { OffersModule } from \'../offers/offers.module\';             |
|                                                                       |
| import { OutboxModule } from \'../outbox/outbox.module\';             |
|                                                                       |
| import { RealtimeModule } from \'../realtime/realtime.module\';       |
|                                                                       |
| \@Module({                                                            |
|                                                                       |
| imports: \[                                                           |
|                                                                       |
| TypeOrmModule.forFeature(\[                                           |
|                                                                       |
| CounterOffer,                                                         |
|                                                                       |
| OfferHistoryEvent,                                                    |
|                                                                       |
| OutboxEvent,                                                          |
|                                                                       |
| \]),                                                                  |
|                                                                       |
| OffersModule,                                                         |
|                                                                       |
| OutboxModule,                                                         |
|                                                                       |
| RealtimeModule,                                                       |
|                                                                       |
| \],                                                                   |
|                                                                       |
| controllers: \[CounterOffersController\],                             |
|                                                                       |
| providers: \[CounterOffersService\],                                  |
|                                                                       |
| exports: \[CounterOffersService\],                                    |
|                                                                       |
| })                                                                    |
|                                                                       |
| export class CounterOffersModule {}                                   |
+-----------------------------------------------------------------------+

+-----------------------------------------------------------------------+
| **Step 12 Verification --- Confirm Schema and Entities**              |
|                                                                       |
| Test database setup before building services                          |
+-----------------------------------------------------------------------+

**Step 1 --- Run the SQL DDL**

+-----------------------------------------------------------------------+
| \# Connect to your PostgreSQL instance                                |
|                                                                       |
| psql -h localhost -U postgres -d marketeq_dev                         |
|                                                                       |
| \# Run the DDL file                                                   |
|                                                                       |
| \\i apps/offer-service/src/database/migrations/001_create_schema.sql  |
|                                                                       |
| \# Verify tables were created                                         |
|                                                                       |
| SELECT table_name FROM information_schema.tables                      |
|                                                                       |
| WHERE table_schema = \'offer_service\' ORDER BY table_name;           |
|                                                                       |
| \# Expected output:                                                   |
|                                                                       |
| \# counter_offers                                                     |
|                                                                       |
| \# offer_history                                                      |
|                                                                       |
| \# offers                                                             |
|                                                                       |
| \# outbox                                                             |
+-----------------------------------------------------------------------+

**Step 2 --- Verify the partial unique index**

+-----------------------------------------------------------------------+
| \# This index is the DB-level enforcement of \"one pending CO per     |
| offer\".                                                              |
|                                                                       |
| \# Verify it exists and has the WHERE clause.                         |
|                                                                       |
| SELECT indexname, indexdef FROM pg_indexes                            |
|                                                                       |
| WHERE schemaname = \'offer_service\'                                  |
|                                                                       |
| AND indexname = \'uq_counter_offers_one_pending\';                    |
|                                                                       |
| \# Expected output:                                                   |
|                                                                       |
| \# indexname \| indexdef                                              |
|                                                                       |
| \# uq_counter_offers_one_pending \| CREATE UNIQUE INDEX               |
| uq_counter_offers_one_pending                                         |
|                                                                       |
| \# \| ON offer_service.counter_offers(offer_id)                       |
|                                                                       |
| \# \| WHERE ((status)::text = \'PENDING\')                            |
+-----------------------------------------------------------------------+

**Step 3 --- Start the service and check TypeORM startup**

+-----------------------------------------------------------------------+
| \# Start the service                                                  |
|                                                                       |
| npm run start:dev \--project=offer-service                            |
|                                                                       |
| \# Look for TypeORM entity loading in the startup logs:               |
|                                                                       |
| \# \[TypeORM\] entity metadata for Offer was loaded                   |
|                                                                       |
| \# \[TypeORM\] entity metadata for CounterOffer was loaded            |
|                                                                       |
| \# \[TypeORM\] entity metadata for OfferHistoryEvent was loaded       |
|                                                                       |
| \# \[TypeORM\] entity metadata for OutboxEvent was loaded             |
|                                                                       |
| \# If you see \"Cannot find entity class\" errors:                    |
|                                                                       |
| \# The entity is not in TypeOrmModule.forFeature() in its module.     |
|                                                                       |
| \# If you see \"relation does not exist\" errors:                     |
|                                                                       |
| \# The SQL DDL has not been run yet, or ran against the wrong         |
| database.                                                             |
+-----------------------------------------------------------------------+

**Step 4 --- Insert a test row to verify columns**

+-----------------------------------------------------------------------+
| \# Insert a minimal test offer row directly                           |
|                                                                       |
| INSERT INTO offer_service.offers (                                    |
|                                                                       |
| client_id, talent_id, job_listing_id,                                 |
|                                                                       |
| contract_type, contract_title, status,                                |
|                                                                       |
| rate, currency_code, duration_months,                                 |
|                                                                       |
| work_schedule, start_date, expires_at                                 |
|                                                                       |
| ) VALUES (                                                            |
|                                                                       |
| gen_random_uuid(), gen_random_uuid(), gen_random_uuid(),              |
|                                                                       |
| \'TEAM\', \'Test Offer\', \'PENDING\',                                |
|                                                                       |
| 45, \'USD\', 3,                                                       |
|                                                                       |
| \'{\"type\": \"FULL_TIME\"}\'::jsonb, \'2099-01-01\', NOW() +         |
| INTERVAL \'14 days\'                                                  |
|                                                                       |
| ) RETURNING id, status, expires_at;                                   |
|                                                                       |
| \# Expected: returns one row with id, status=PENDING, expires_at in   |
| 14 days                                                               |
|                                                                       |
| \# Clean up test row                                                  |
|                                                                       |
| DELETE FROM offer_service.offers WHERE contract_title = \'Test        |
| Offer\';                                                              |
+-----------------------------------------------------------------------+

+-----------------------------------------------------------------------+
| If TypeORM reports \"column X of relation offers does not exist\":    |
|                                                                       |
| The DDL was run but had an error partway through. Check for errors in |
| the DDL output.                                                       |
|                                                                       |
| Drop and recreate: DROP SCHEMA offer_service CASCADE; then re-run the |
| DDL.                                                                  |
|                                                                       |
| If the service fails with \"relation offer_service.offers does not    |
| exist\":                                                              |
|                                                                       |
| The schema was not created. Run: CREATE SCHEMA IF NOT EXISTS          |
| offer_service;                                                        |
|                                                                       |
| Then re-run the full DDL.                                             |
|                                                                       |
| If \@InjectRepository(Offer) fails with \"No metadata found for       |
| Offer\":                                                              |
|                                                                       |
| Offer is not in TypeOrmModule.forFeature(\[Offer, \...\]) in          |
| OffersModule.                                                         |
|                                                                       |
| Add it to the forFeature array and restart.                           |
|                                                                       |
| If TypeORM creates tables but with wrong column names (camelCase      |
| instead of snake_case):                                               |
|                                                                       |
| The \@Column({ name: \'\...\' }) name property is missing.            |
|                                                                       |
| TypeORM defaults to the property name when name is not provided.      |
|                                                                       |
| Every column in the entity must have an explicit name matching the    |
| SQL.                                                                  |
+-----------------------------------------------------------------------+
