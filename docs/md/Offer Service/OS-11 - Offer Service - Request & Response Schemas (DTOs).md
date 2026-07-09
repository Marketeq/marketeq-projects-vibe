**OS-11**

**Offer Service --- Request & Response Schemas (DTOs)**

**Validation:** class-validator + class-transformer **Pattern:** DTO
classes with decorators applied globally via ValidationPipe

This document defines every DTO (Data Transfer Object) used by
offer-service. All request DTOs use class-validator decorators for
field-level validation. All validations are enforced server-side on
every request via the global ValidationPipe. The frontend mirrors these
rules, but the backend is the authoritative source.

+-----------------------------------------------------------------------+
| How DTOs work in this service:                                        |
|                                                                       |
| 1\. Every incoming request body is deserialized into the              |
| corresponding DTO class.                                              |
|                                                                       |
| 2\. ValidationPipe runs all \@Decorator() checks on the class         |
| instance.                                                             |
|                                                                       |
| 3\. Any violation returns 422 Unprocessable Entity with field-level   |
| error details.                                                        |
|                                                                       |
| 4\. Unknown properties are silently stripped (whitelist: true).       |
|                                                                       |
| 5\. Types are auto-coerced from string to number where \@Type(() =\>  |
| Number) is applied.                                                   |
|                                                                       |
| 6\. Nested objects (e.g. workSchedule) use \@ValidateNested() +       |
| \@Type() to recurse.                                                  |
+=======================================================================+

## **File Map --- All DTOs at a Glance**

  --------------------------------------------------------------------------------------------------------------------------------------------
  **Step**   **File Path**                                                       **Purpose**
  ---------- ------------------------------------------------------------------- -------------------------------------------------------------
  **0**      (install)                                                           npm install class-validator class-transformer

  **1**      src/common/constants/offer.constants.ts                             All validation constants --- min, max, lengths, TTLs

  **2a**     src/offers/enums/offer-status.enum.ts                               PENDING\|ACCEPTED\|DECLINED\|WITHDRAWN\|EXPIRED\|COUNTERED

  **2b**     src/counter-offers/enums/counter-offer-status.enum.ts               PENDING\|ACCEPTED\|DECLINED\|WITHDRAWN\|EXPIRED\|SUPERSEDED

  **2c**     src/offers/enums/contract-type.enum.ts                              PROJECT\|SERVICE\|TEAM\|CONTRACT

  **2d**     src/offers/enums/work-schedule-type.enum.ts                         PART_TIME\|FULL_TIME\|CUSTOM

  **2e**     src/offers/enums/decline-chip.enum.ts                               6 pre-defined decline reason chips

  **3a**     src/common/validators/is-iso8601-date-string.validator.ts           Custom: YYYY-MM-DD format + calendar validity

  **3b**     src/common/validators/is-future-date.validator.ts                   Custom: startDate must not be in the past

  **3c**     src/common/validators/is-not-too-far-future.validator.ts            Custom: startDate max 5 years out

  **4**      src/common/dto/work-schedule.dto.ts                                 Shared nested DTO: type + optional hoursPerWeek

  **5**      src/offers/dto/create-offer.dto.ts                                  POST /v1/offers request body

  **6**      src/offers/dto/edit-offer.dto.ts                                    PATCH /v1/offers/:id request body

  **7**      src/offers/dto/accept-offer.dto.ts                                  POST /v1/offers/:id/accept request body

  **8**      src/offers/dto/decline-offer.dto.ts                                 POST /v1/offers/:id/decline request body

  **9**      src/offers/dto/withdraw-offer.dto.ts                                POST /v1/offers/:id/withdraw request body

  **10**     src/offers/dto/resend-offer.dto.ts                                  POST /v1/offers/:id/resend request body

  **11**     src/offers/dto/offer-history-query.dto.ts                           GET /v1/offers/:id/history query parameters

  **12**     src/counter-offers/dto/create-counter-offer.dto.ts                  POST /v1/offers/:offerId/counter-offers request body

  **13**     src/counter-offers/dto/edit-counter-offer.dto.ts                    PATCH counter-offers/:id request body

  **14**     src/counter-offers/dto/withdraw-counter-offer.dto.ts                POST counter-offers/:id/withdraw request body

  **15**     src/offers/interfaces/offer-response.interface.ts                   TypeScript interfaces for all offer API responses

  **16**     src/counter-offers/interfaces/counter-offer-response.interface.ts   TypeScript interfaces for counter offer responses
  --------------------------------------------------------------------------------------------------------------------------------------------

+-----------------------------------------------------------------------+
| **Step 0 Install Dependencies**                                       |
|                                                                       |
| Run this before creating any DTO files                                |
+=======================================================================+

class-validator provides all validation decorators (@IsString, \@IsInt,
\@Min, \@Max, etc.). class-transformer enables auto type coercion
(string to number) and nested object transformation. Both are required.
If they are already installed in the monorepo, skip this step --- check
package.json first.

+-----------------------------------------------------------------------+
| Check before running: look in the monorepo root package.json and in   |
| apps/offer-service/package.json.                                      |
|                                                                       |
| If class-validator and class-transformer already appear in            |
| dependencies, skip this step.                                         |
|                                                                       |
| Installing duplicate versions in a monorepo can cause decorator       |
| reflection errors.                                                    |
+=======================================================================+

  -----------------------------------------------------------------------
  **FILE: Terminal --- run from the monorepo root**
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

+-----------------------------------------------------------------------+
| \# Install both packages together                                     |
|                                                                       |
| npm install class-validator class-transformer                         |
|                                                                       |
| \# Verify they are installed                                          |
|                                                                       |
| cat package.json \| grep -E \"class-validator\|class-transformer\"    |
|                                                                       |
| \# Expected output (versions may differ):                             |
|                                                                       |
| \# \"class-validator\": \"\^0.14.0\",                                 |
|                                                                       |
| \# \"class-transformer\": \"\^0.5.1\"                                 |
|                                                                       |
| \# Also ensure reflect-metadata is in your monorepo (required by      |
| class-validator)                                                      |
|                                                                       |
| cat package.json \| grep reflect-metadata                             |
|                                                                       |
| \# If missing: npm install reflect-metadata                           |
|                                                                       |
| \# Also ensure emitDecoratorMetadata is true in tsconfig              |
|                                                                       |
| cat tsconfig.json \| grep emitDecoratorMetadata                       |
|                                                                       |
| \# Must return: \"emitDecoratorMetadata\": true                       |
+=======================================================================+

+-----------------------------------------------------------------------+
| **Step 1 Validation Constants**                                       |
|                                                                       |
| Single source of truth for all field limits                           |
+=======================================================================+

All numeric limits and thresholds are defined in one constants file.
Every DTO decorator references these constants instead of hardcoded
numbers. If a business rule changes (e.g. max rate increases to 49,999),
you change it in one place and every DTO updates automatically.

  -----------------------------------------------------------------------
  **FILE: apps/offer-service/src/common/constants/offer.constants.ts**
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

+-----------------------------------------------------------------------+
| /\*\*                                                                 |
|                                                                       |
| \* Offer Service --- Validation Constants                             |
|                                                                       |
| \* Single source of truth for all field limits, thresholds, and       |
| business rule values.                                                 |
|                                                                       |
| \* Every DTO decorator imports from here. Never hardcode these values |
| elsewhere.                                                            |
|                                                                       |
| \*/                                                                   |
|                                                                       |
| export const OFFER_CONSTANTS = {                                      |
|                                                                       |
| // ============================================================       |
|                                                                       |
| // RATE                                                               |
|                                                                       |
| // ============================================================       |
|                                                                       |
| // Whole numbers only. No decimals. Enforced by \@IsInt() in every    |
| rate field.                                                           |
|                                                                       |
| // Currency symbols are never accepted as input (numeric input only). |
|                                                                       |
| MIN_RATE: 1, // \$1 minimum                                           |
|                                                                       |
| MAX_RATE: 9999, // \$9,999 maximum                                    |
|                                                                       |
| // ============================================================       |
|                                                                       |
| // DURATION                                                           |
|                                                                       |
| // ============================================================       |
|                                                                       |
| MIN_DURATION_MONTHS: 1, // 1 month minimum                            |
|                                                                       |
| MAX_DURATION_MONTHS: 60, // 60 months = 5 years maximum               |
|                                                                       |
| // ============================================================       |
|                                                                       |
| // WORK SCHEDULE                                                      |
|                                                                       |
| // ============================================================       |
|                                                                       |
| // hoursPerWeek is only required when workSchedule.type = CUSTOM.     |
|                                                                       |
| MIN_HOURS_PER_WEEK: 1,                                                |
|                                                                       |
| MAX_HOURS_PER_WEEK: 80,                                               |
|                                                                       |
| // ============================================================       |
|                                                                       |
| // TEXT FIELDS                                                        |
|                                                                       |
| // ============================================================       |
|                                                                       |
| MAX_CONTRACT_TITLE_LENGTH: 200, // UTF-8, trimmed, 1-200 chars        |
|                                                                       |
| MAX_MESSAGE_LENGTH: 500, // All message fields (offer, withdraw,      |
| accept, resend)                                                       |
|                                                                       |
| MIN_DECLINE_REASON_LENGTH: 1, // Decline reason is required           |
|                                                                       |
| MAX_DECLINE_REASON_LENGTH: 500,                                       |
|                                                                       |
| // ============================================================       |
|                                                                       |
| // START DATE                                                         |
|                                                                       |
| // ============================================================       |
|                                                                       |
| // Format: YYYY-MM-DD (ISO 8601 date, not datetime)                   |
|                                                                       |
| // Display: \"Monday, Jan 30, 2025\" (formatted on the frontend)      |
|                                                                       |
| // Must not be in the past. Max 5 years out.                          |
|                                                                       |
| MAX_START_DATE_YEARS_OUT: 5,                                          |
|                                                                       |
| // ============================================================       |
|                                                                       |
| // CURRENCY                                                           |
|                                                                       |
| // ============================================================       |
|                                                                       |
| // ISO 4217 currency code. 3 uppercase letters. E.g. USD, EUR, GBP.   |
|                                                                       |
| // Default is the user\'s account currency set at signup. NOT always  |
| USD.                                                                  |
|                                                                       |
| CURRENCY_CODE_LENGTH: 3,                                              |
|                                                                       |
| // ============================================================       |
|                                                                       |
| // TTL & EXPIRY                                                       |
|                                                                       |
| // ============================================================       |
|                                                                       |
| OFFER_TTL_DAYS: 14, // New expiresAt = createdAt + 14 days            |
|                                                                       |
| // TTL clock resets on: create, edit, counter offer, edit counter     |
| offer, resend                                                         |
|                                                                       |
| // TTL clock does NOT reset on: decline, withdraw, accept (terminal   |
| states)                                                               |
|                                                                       |
| OFFER_WARNING_HOURS: 48, // offer.expiring_soon fires 48h before      |
| expiresAt                                                             |
|                                                                       |
| OFFER_EXTENSION_THRESHOLD_DAYS: 30, // \<= 30 days since expired:     |
| Request Extension                                                     |
|                                                                       |
| // \> 30 days since expired: Ask Now (chat message)                   |
|                                                                       |
| // ============================================================       |
|                                                                       |
| // RATE WARNING                                                       |
|                                                                       |
| // ============================================================       |
|                                                                       |
| // Server evaluates rate warning and returns advisory flag in         |
| response.                                                             |
|                                                                       |
| // Never blocks submission. Direction flips based on who submitted:   |
|                                                                       |
| // Talent CO: warn if counterRate \> parentRate \* 1.25               |
|                                                                       |
| // Client CO: warn if counterRate \< parentRate \* 0.8 (i.e. \> 20%   |
| lower)                                                                |
|                                                                       |
| RATE_WARNING_MULTIPLIER: 1.25,                                        |
|                                                                       |
| // ============================================================       |
|                                                                       |
| // IDEMPOTENCY                                                        |
|                                                                       |
| // ============================================================       |
|                                                                       |
| IDEMPOTENCY_KEY_TTL_HOURS: 24, // Keys stored in Redis for 24h        |
|                                                                       |
| // ============================================================       |
|                                                                       |
| // HISTORY PAGINATION                                                 |
|                                                                       |
| // ============================================================       |
|                                                                       |
| HISTORY_PAGE_SIZE: 50, // Max events per page (cursor-based)          |
|                                                                       |
| // ============================================================       |
|                                                                       |
| // RABBITMQ                                                           |
|                                                                       |
| // ============================================================       |
|                                                                       |
| RABBITMQ_EXCHANGE: \'marketeq.offers\',                               |
|                                                                       |
| // ============================================================       |
|                                                                       |
| // ABLY                                                               |
|                                                                       |
| // ============================================================       |
|                                                                       |
| ABLY_CHANNEL_PREFIX: \'offer:\', // Full channel: offer:{offerId}     |
|                                                                       |
| } as const;                                                           |
|                                                                       |
| // Export individual constants for convenience in decorators          |
|                                                                       |
| export const {                                                        |
|                                                                       |
| MIN_RATE, MAX_RATE,                                                   |
|                                                                       |
| MIN_DURATION_MONTHS, MAX_DURATION_MONTHS,                             |
|                                                                       |
| MIN_HOURS_PER_WEEK, MAX_HOURS_PER_WEEK,                               |
|                                                                       |
| MAX_CONTRACT_TITLE_LENGTH, MAX_MESSAGE_LENGTH,                        |
|                                                                       |
| MIN_DECLINE_REASON_LENGTH, MAX_DECLINE_REASON_LENGTH,                 |
|                                                                       |
| MAX_START_DATE_YEARS_OUT, CURRENCY_CODE_LENGTH,                       |
|                                                                       |
| HISTORY_PAGE_SIZE,                                                    |
|                                                                       |
| } = OFFER_CONSTANTS;                                                  |
+=======================================================================+

+-----------------------------------------------------------------------+
| **Step 2 Enums**                                                      |
|                                                                       |
| 5 enum files --- create all before writing any DTOs                   |
+=======================================================================+

Enums provide type safety for all status fields, contract types, work
schedule types, and decline chips. DTOs import these enums for
\@IsEnum() validation. The database stores the string values (e.g.
\"PENDING\", \"PROJECT\"). TypeORM entities also import these enums.

## **Step 2a --- OfferStatus**

The primary offer state machine. COUNTERED is not a terminal state ---
it is restored to PENDING when a counter offer is declined or withdrawn.

  -----------------------------------------------------------------------
  **FILE: apps/offer-service/src/offers/enums/offer-status.enum.ts**
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

+-----------------------------------------------------------------------+
| /\*\*                                                                 |
|                                                                       |
| \* OfferStatus --- All possible states of a primary offer.            |
|                                                                       |
| \*                                                                    |
|                                                                       |
| \* State machine:                                                     |
|                                                                       |
| \* PENDING → ACCEPTED \| DECLINED \| WITHDRAWN \| EXPIRED \|          |
| COUNTERED                                                             |
|                                                                       |
| \* COUNTERED → PENDING (when CO declined/withdrawn/expired)           |
|                                                                       |
| \* COUNTERED → ACCEPTED (when CO accepted by non-submitter)           |
|                                                                       |
| \* All others are terminal --- no transitions out.                    |
|                                                                       |
| \*                                                                    |
|                                                                       |
| \* TTL clock resets on: create, edit, counter offer, edit counter     |
| offer, resend.                                                        |
|                                                                       |
| \* TTL clock does NOT reset on: decline, withdraw, accept.            |
|                                                                       |
| \*/                                                                   |
|                                                                       |
| export enum OfferStatus {                                             |
|                                                                       |
| PENDING = \'PENDING\', // Active, awaiting action from talent         |
|                                                                       |
| ACCEPTED = \'ACCEPTED\', // Terminal. Talent accepted. ContractGroup  |
| created.                                                              |
|                                                                       |
| DECLINED = \'DECLINED\', // Terminal. Talent declined with reason.    |
|                                                                       |
| WITHDRAWN = \'WITHDRAWN\', // Terminal. Client withdrew the offer.    |
|                                                                       |
| EXPIRED = \'EXPIRED\', // Terminal. 14-day TTL elapsed with no        |
| action.                                                               |
|                                                                       |
| COUNTERED = \'COUNTERED\', // Active. Talent submitted a counter      |
| offer.                                                                |
|                                                                       |
| }                                                                     |
+=======================================================================+

## **Step 2b --- CounterOfferStatus**

Counter offer states. SUPERSEDED is unique to counter offers --- it
occurs when the client submits a new counter offer while one is already
PENDING, causing the existing one to be superseded.

  ----------------------------------------------------------------------------
  **FILE:
  apps/offer-service/src/counter-offers/enums/counter-offer-status.enum.ts**
  ----------------------------------------------------------------------------

  ----------------------------------------------------------------------------

+-----------------------------------------------------------------------+
| /\*\*                                                                 |
|                                                                       |
| \* CounterOfferStatus --- All possible states of a counter offer.     |
|                                                                       |
| \*                                                                    |
|                                                                       |
| \* When a CO reaches DECLINED, WITHDRAWN, or EXPIRED:                 |
|                                                                       |
| \* → Parent offer is restored to PENDING (if not independently        |
| expired).                                                             |
|                                                                       |
| \*                                                                    |
|                                                                       |
| \* SUPERSEDED occurs when client submits a new CO while one is        |
| PENDING.                                                              |
|                                                                       |
| \* The old CO → SUPERSEDED, the new CO → PENDING (becomes the Active  |
| Offer).                                                               |
|                                                                       |
| \*                                                                    |
|                                                                       |
| \* Only ONE counter offer can be in PENDING state at any time.        |
|                                                                       |
| \*/                                                                   |
|                                                                       |
| export enum CounterOfferStatus {                                      |
|                                                                       |
| PENDING = \'PENDING\', // Active, awaiting response from other party  |
|                                                                       |
| ACCEPTED = \'ACCEPTED\', // Terminal. Non-submitter accepted. Both    |
| offer + CO → ACCEPTED.                                                |
|                                                                       |
| DECLINED = \'DECLINED\', // Terminal. Non-submitter declined. Parent  |
| offer restored.                                                       |
|                                                                       |
| WITHDRAWN = \'WITHDRAWN\', // Terminal. Submitter withdrew. Parent    |
| offer restored.                                                       |
|                                                                       |
| EXPIRED = \'EXPIRED\', // Terminal. 14-day TTL elapsed. Parent offer  |
| restored.                                                             |
|                                                                       |
| SUPERSEDED = \'SUPERSEDED\', // Terminal. Client submitted new CO,    |
| this one replaced.                                                    |
|                                                                       |
| }                                                                     |
+=======================================================================+

## **Step 2c --- ContractType**

The contract type determines the start date sub-flow, whether
contractTitle is required, and how the offer modal is displayed.
contractType is set at offer creation and never changes.

  -----------------------------------------------------------------------
  **FILE: apps/offer-service/src/offers/enums/contract-type.enum.ts**
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

+-----------------------------------------------------------------------+
| /\*\*                                                                 |
|                                                                       |
| \* ContractType --- The type of contract this offer is for.           |
|                                                                       |
| \*                                                                    |
|                                                                       |
| \* Determines:                                                        |
|                                                                       |
| \* - Start date sub-flow (scoped projects vs no-scope)                |
|                                                                       |
| \* - Whether contractTitle is required in the DTO                     |
|                                                                       |
| \* - How the offer modal and contract badge is displayed              |
|                                                                       |
| \*                                                                    |
|                                                                       |
| \* PROJECT --- Scoped work. Start date from listings-service scope    |
| phases.                                                               |
|                                                                       |
| \* contractTitle inherited from project name (not required in DTO).   |
|                                                                       |
| \* SERVICE --- Ongoing or scoped service. contractTitle required.     |
|                                                                       |
| \* Scoped: start date from listings-service. Ongoing: next Monday.    |
|                                                                       |
| \* TEAM --- No-scope multi-role. Start date defaults to next Monday.  |
|                                                                       |
| \* contractTitle required.                                            |
|                                                                       |
| \* CONTRACT --- Individual role hire (e.g. UX Designer). No scope.    |
|                                                                       |
| \* Start date defaults to next Monday. contractTitle required.        |
|                                                                       |
| \*/                                                                   |
|                                                                       |
| export enum ContractType {                                            |
|                                                                       |
| PROJECT = \'PROJECT\',                                                |
|                                                                       |
| SERVICE = \'SERVICE\',                                                |
|                                                                       |
| TEAM = \'TEAM\',                                                      |
|                                                                       |
| CONTRACT = \'CONTRACT\',                                              |
|                                                                       |
| }                                                                     |
|                                                                       |
| /\*\* Contract types that require a contractTitle in the request      |
| body. \*/                                                             |
|                                                                       |
| export const CONTRACT_TYPES_REQUIRING_TITLE: ContractType\[\] = \[    |
|                                                                       |
| ContractType.TEAM,                                                    |
|                                                                       |
| ContractType.CONTRACT,                                                |
|                                                                       |
| ContractType.SERVICE,                                                 |
|                                                                       |
| \];                                                                   |
|                                                                       |
| /\*\* Contract types where start date is suggested by                 |
| listings-service scope. \*/                                           |
|                                                                       |
| export const SCOPED_CONTRACT_TYPES: ContractType\[\] = \[             |
|                                                                       |
| ContractType.PROJECT,                                                 |
|                                                                       |
| ContractType.SERVICE, // SERVICE can be scoped or ongoing             |
|                                                                       |
| \];                                                                   |
+=======================================================================+

## **Step 2d --- WorkScheduleType**

  -----------------------------------------------------------------------
  **FILE:
  apps/offer-service/src/offers/enums/work-schedule-type.enum.ts**
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

+-----------------------------------------------------------------------+
| /\*\*                                                                 |
|                                                                       |
| \* WorkScheduleType --- The work schedule commitment type.            |
|                                                                       |
| \*                                                                    |
|                                                                       |
| \* PART_TIME --- Part-time engagement. hoursPerWeek not required.     |
|                                                                       |
| \* FULL_TIME --- Full-time engagement. hoursPerWeek not required.     |
|                                                                       |
| \* CUSTOM --- Custom hours. hoursPerWeek IS required (1-80).          |
|                                                                       |
| \*                                                                    |
|                                                                       |
| \* WorkScheduleDto enforces the hoursPerWeek requirement via          |
| \@ValidateIf.                                                         |
|                                                                       |
| \*/                                                                   |
|                                                                       |
| export enum WorkScheduleType {                                        |
|                                                                       |
| PART_TIME = \'PART_TIME\',                                            |
|                                                                       |
| FULL_TIME = \'FULL_TIME\',                                            |
|                                                                       |
| CUSTOM = \'CUSTOM\',                                                  |
|                                                                       |
| }                                                                     |
+=======================================================================+

## **Step 2e --- DeclineChip**

The six pre-defined decline reason chips. These are pill buttons in the
UI. Selecting a chip pre-fills the reason text field but the talent can
also type a free-form reason. The chip enum value is sent alongside the
free-text reason.

  -----------------------------------------------------------------------
  **FILE: apps/offer-service/src/offers/enums/decline-chip.enum.ts**
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

+-----------------------------------------------------------------------+
| /\*\*                                                                 |
|                                                                       |
| \* DeclineChip --- Pre-defined decline reason chips shown in the      |
| Decline modal.                                                        |
|                                                                       |
| \*                                                                    |
|                                                                       |
| \* These correspond exactly to the 6 pill buttons in the \"Decline    |
| This Offer\" modal.                                                   |
|                                                                       |
| \* The talent selects one or types a free-form reason. Both are       |
| stored.                                                               |
|                                                                       |
| \*                                                                    |
|                                                                       |
| \* chip is OPTIONAL in DeclineOfferDto --- reason (free text) is      |
| REQUIRED.                                                             |
|                                                                       |
| \* The decline reason is stored in the database but NOT included in   |
| the                                                                   |
|                                                                       |
| \* notification sent to the client. It is only visible in the         |
| declined                                                              |
|                                                                       |
| \* offer details modal when the client clicks \"View Details.\"       |
|                                                                       |
| \*/                                                                   |
|                                                                       |
| export enum DeclineChip {                                             |
|                                                                       |
| BUDGET_DOESNT_WORK = \'BUDGET_DOESNT_WORK\', // \"Budget doesn\'t     |
| work\"                                                                |
|                                                                       |
| START_DATE_DOESNT_WORK = \'START_DATE_DOESNT_WORK\', // \"Start date  |
| doesn\'t work\"                                                       |
|                                                                       |
| REQUIREMENTS_UNCLEAR = \'REQUIREMENTS_UNCLEAR\', // \"Requirements    |
| are unclear\"                                                         |
|                                                                       |
| NOT_A_FIT = \'NOT_A_FIT\', // \"Not a fit for my skills\"             |
|                                                                       |
| TOO_BUSY = \'TOO_BUSY\', // \"Too busy right now\"                    |
|                                                                       |
| NEED_DIFFERENT_TERMS = \'NEED_DIFFERENT_TERMS\', // \"Need different  |
| terms\"                                                               |
|                                                                       |
| }                                                                     |
+=======================================================================+

+-----------------------------------------------------------------------+
| **Step 3 Custom Validators**                                          |
|                                                                       |
| 3 files --- must exist before any DTO that validates startDate        |
+=======================================================================+

class-validator provides standard decorators but does not ship with
start date validation logic. These three custom validators implement the
confirmed business rules: ISO 8601 date format, not in the past, and not
more than 5 years out. They are composed together on every startDate
field.

+-----------------------------------------------------------------------+
| Order of decorators matters on startDate fields.                      |
|                                                                       |
| Always apply in this order: \@IsString() → \@IsIso8601DateString() →  |
| \@IsFutureDate() → \@IsNotTooFarFuture()                              |
|                                                                       |
| class-validator runs decorators top to bottom and stops on first      |
| failure by default.                                                   |
|                                                                       |
| If \@IsString() fails (value is not a string), the other validators   |
| will not run.                                                         |
+=======================================================================+

## **Step 3a --- IsIso8601DateString**

Validates that a string is a valid YYYY-MM-DD date. It rejects invalid
calendar dates like February 30 (the regex passes but the Date
constructor detects the overflow). It does NOT accept full ISO 8601
datetime strings like \"2025-01-30T10:00:00Z\" --- offer-service stores
dates only, not datetimes.

  --------------------------------------------------------------------------------
  **FILE:
  apps/offer-service/src/common/validators/is-iso8601-date-string.validator.ts**
  --------------------------------------------------------------------------------

  --------------------------------------------------------------------------------

+-----------------------------------------------------------------------+
| import {                                                              |
|                                                                       |
| registerDecorator,                                                    |
|                                                                       |
| ValidationOptions,                                                    |
|                                                                       |
| ValidatorConstraint,                                                  |
|                                                                       |
| ValidatorConstraintInterface,                                         |
|                                                                       |
| ValidationArguments,                                                  |
|                                                                       |
| } from \'class-validator\';                                           |
|                                                                       |
| /\*\* YYYY-MM-DD regex: validates month 01-12, day 01-31. \*/         |
|                                                                       |
| const ISO_DATE_REGEX =                                                |
| /\^\\d{4}-(?:0\[1-9\]\|1\[0-2\])-(?:0\[1-9\]\|\[12\]\\d\|3\[01\])\$/; |
|                                                                       |
| \@ValidatorConstraint({ name: \'IsIso8601DateString\', async: false   |
| })                                                                    |
|                                                                       |
| export class IsIso8601DateStringConstraint implements                 |
| ValidatorConstraintInterface {                                        |
|                                                                       |
| validate(value: unknown): boolean {                                   |
|                                                                       |
| if (typeof value !== \'string\') return false;                        |
|                                                                       |
| if (!ISO_DATE_REGEX.test(value)) return false;                        |
|                                                                       |
| // Validate actual calendar date.                                     |
|                                                                       |
| // Catches overflows like Feb 30 that pass the regex.                 |
|                                                                       |
| const \[year, month, day\] = value.split(\'-\').map(Number);          |
|                                                                       |
| const date = new Date(year, month - 1, day);                          |
|                                                                       |
| return (                                                              |
|                                                                       |
| date.getFullYear() === year &&                                        |
|                                                                       |
| date.getMonth() === month - 1 &&                                      |
|                                                                       |
| date.getDate() === day                                                |
|                                                                       |
| );                                                                    |
|                                                                       |
| }                                                                     |
|                                                                       |
| defaultMessage(\_args: ValidationArguments): string {                 |
|                                                                       |
| return \'startDate must be a valid date in YYYY-MM-DD format (e.g.    |
| 2025-01-30).\';                                                       |
|                                                                       |
| }                                                                     |
|                                                                       |
| }                                                                     |
|                                                                       |
| /\*\*                                                                 |
|                                                                       |
| \* \@IsIso8601DateString()                                            |
|                                                                       |
| \* Validates that the field is a valid YYYY-MM-DD calendar date       |
| string.                                                               |
|                                                                       |
| \* Does not accept full ISO 8601 datetimes (no T or Z suffix).        |
|                                                                       |
| \*/                                                                   |
|                                                                       |
| export function IsIso8601DateString(validationOptions?:               |
| ValidationOptions) {                                                  |
|                                                                       |
| return function (object: object, propertyName: string) {              |
|                                                                       |
| registerDecorator({                                                   |
|                                                                       |
| target: object.constructor,                                           |
|                                                                       |
| propertyName,                                                         |
|                                                                       |
| options: validationOptions,                                           |
|                                                                       |
| constraints: \[\],                                                    |
|                                                                       |
| validator: IsIso8601DateStringConstraint,                             |
|                                                                       |
| });                                                                   |
|                                                                       |
| };                                                                    |
|                                                                       |
| }                                                                     |
+=======================================================================+

## **Step 3b --- IsFutureDate**

Validates that a startDate is not in the past. \"Not in the past\" means
the date is today or later. A startDate of today is valid. The
comparison is done using local midnight to avoid timezone edge cases.
This validator assumes the string is already a valid YYYY-MM-DD date ---
always apply \@IsIso8601DateString() before this one.

  ------------------------------------------------------------------------
  **FILE:
  apps/offer-service/src/common/validators/is-future-date.validator.ts**
  ------------------------------------------------------------------------

  ------------------------------------------------------------------------

+-----------------------------------------------------------------------+
| import {                                                              |
|                                                                       |
| registerDecorator,                                                    |
|                                                                       |
| ValidationOptions,                                                    |
|                                                                       |
| ValidatorConstraint,                                                  |
|                                                                       |
| ValidatorConstraintInterface,                                         |
|                                                                       |
| ValidationArguments,                                                  |
|                                                                       |
| } from \'class-validator\';                                           |
|                                                                       |
| \@ValidatorConstraint({ name: \'IsFutureDate\', async: false })       |
|                                                                       |
| export class IsFutureDateConstraint implements                        |
| ValidatorConstraintInterface {                                        |
|                                                                       |
| validate(value: unknown): boolean {                                   |
|                                                                       |
| if (typeof value !== \'string\') return false;                        |
|                                                                       |
| // Parse as local date components to avoid UTC offset shift.          |
|                                                                       |
| // e.g. \"2025-01-30\" should be Jan 30 in the user\'s timezone,      |
|                                                                       |
| // not potentially Jan 29 due to UTC conversion.                      |
|                                                                       |
| const parts = value.split(\'-\').map(Number);                         |
|                                                                       |
| if (parts.length !== 3 \|\| parts.some(isNaN)) return false;          |
|                                                                       |
| const \[year, month, day\] = parts;                                   |
|                                                                       |
| const inputDate = new Date(year, month - 1, day);                     |
|                                                                       |
| // Compare against today at midnight local time.                      |
|                                                                       |
| const today = new Date();                                             |
|                                                                       |
| today.setHours(0, 0, 0, 0);                                           |
|                                                                       |
| return inputDate \>= today;                                           |
|                                                                       |
| }                                                                     |
|                                                                       |
| defaultMessage(\_args: ValidationArguments): string {                 |
|                                                                       |
| return \'startDate must not be in the past. Please select today or a  |
| future date.\';                                                       |
|                                                                       |
| }                                                                     |
|                                                                       |
| }                                                                     |
|                                                                       |
| /\*\*                                                                 |
|                                                                       |
| \* \@IsFutureDate()                                                   |
|                                                                       |
| \* Validates that the date string (YYYY-MM-DD) is today or in the     |
| future.                                                               |
|                                                                       |
| \* Apply AFTER \@IsIso8601DateString() so the format is guaranteed    |
| valid.                                                                |
|                                                                       |
| \*/                                                                   |
|                                                                       |
| export function IsFutureDate(validationOptions?: ValidationOptions) { |
|                                                                       |
| return function (object: object, propertyName: string) {              |
|                                                                       |
| registerDecorator({                                                   |
|                                                                       |
| target: object.constructor,                                           |
|                                                                       |
| propertyName,                                                         |
|                                                                       |
| options: validationOptions,                                           |
|                                                                       |
| constraints: \[\],                                                    |
|                                                                       |
| validator: IsFutureDateConstraint,                                    |
|                                                                       |
| });                                                                   |
|                                                                       |
| };                                                                    |
|                                                                       |
| }                                                                     |
+=======================================================================+

## **Step 3c --- IsNotTooFarFuture**

Validates that a startDate is no more than 5 years in the future. This
is a confirmed hard limit. The comparison is done in local date
components for consistency with IsFutureDate.

  -------------------------------------------------------------------------------
  **FILE:
  apps/offer-service/src/common/validators/is-not-too-far-future.validator.ts**
  -------------------------------------------------------------------------------

  -------------------------------------------------------------------------------

+-----------------------------------------------------------------------+
| import {                                                              |
|                                                                       |
| registerDecorator,                                                    |
|                                                                       |
| ValidationOptions,                                                    |
|                                                                       |
| ValidatorConstraint,                                                  |
|                                                                       |
| ValidatorConstraintInterface,                                         |
|                                                                       |
| ValidationArguments,                                                  |
|                                                                       |
| } from \'class-validator\';                                           |
|                                                                       |
| import { MAX_START_DATE_YEARS_OUT } from                              |
| \'../constants/offer.constants\';                                     |
|                                                                       |
| \@ValidatorConstraint({ name: \'IsNotTooFarFuture\', async: false })  |
|                                                                       |
| export class IsNotTooFarFutureConstraint implements                   |
| ValidatorConstraintInterface {                                        |
|                                                                       |
| validate(value: unknown): boolean {                                   |
|                                                                       |
| if (typeof value !== \'string\') return false;                        |
|                                                                       |
| const parts = value.split(\'-\').map(Number);                         |
|                                                                       |
| if (parts.length !== 3 \|\| parts.some(isNaN)) return false;          |
|                                                                       |
| const \[year, month, day\] = parts;                                   |
|                                                                       |
| const inputDate = new Date(year, month - 1, day);                     |
|                                                                       |
| // Max date = today + MAX_START_DATE_YEARS_OUT years                  |
|                                                                       |
| const maxDate = new Date();                                           |
|                                                                       |
| maxDate.setFullYear(maxDate.getFullYear() +                           |
| MAX_START_DATE_YEARS_OUT);                                            |
|                                                                       |
| return inputDate \<= maxDate;                                         |
|                                                                       |
| }                                                                     |
|                                                                       |
| defaultMessage(\_args: ValidationArguments): string {                 |
|                                                                       |
| return \`startDate cannot be more than \${MAX_START_DATE_YEARS_OUT}   |
| years in the future.\`;                                               |
|                                                                       |
| }                                                                     |
|                                                                       |
| }                                                                     |
|                                                                       |
| /\*\*                                                                 |
|                                                                       |
| \* \@IsNotTooFarFuture()                                              |
|                                                                       |
| \* Validates that the date string is within 5 years from today.       |
|                                                                       |
| \* Apply AFTER \@IsFutureDate().                                      |
|                                                                       |
| \*/                                                                   |
|                                                                       |
| export function IsNotTooFarFuture(validationOptions?:                 |
| ValidationOptions) {                                                  |
|                                                                       |
| return function (object: object, propertyName: string) {              |
|                                                                       |
| registerDecorator({                                                   |
|                                                                       |
| target: object.constructor,                                           |
|                                                                       |
| propertyName,                                                         |
|                                                                       |
| options: validationOptions,                                           |
|                                                                       |
| constraints: \[\],                                                    |
|                                                                       |
| validator: IsNotTooFarFutureConstraint,                               |
|                                                                       |
| });                                                                   |
|                                                                       |
| };                                                                    |
|                                                                       |
| }                                                                     |
+=======================================================================+

+-----------------------------------------------------------------------+
| **Step 4 WorkScheduleDto --- Shared Nested DTO**                      |
|                                                                       |
| Used by 4 other DTOs as a nested object                               |
+=======================================================================+

WorkScheduleDto is a shared nested DTO used inside CreateOfferDto,
EditOfferDto, CreateCounterOfferDto, and EditCounterOfferDto. It must be
created before any of those DTOs. The key validation rule: hoursPerWeek
is ONLY required when type = CUSTOM. For PART_TIME and FULL_TIME, it is
ignored even if provided.

+-----------------------------------------------------------------------+
| Why \@ValidateIf instead of \@IsOptional:                             |
|                                                                       |
| \@IsOptional() skips validation if the value is undefined or null.    |
|                                                                       |
| \@ValidateIf(o =\> o.type === WorkScheduleType.CUSTOM) is stricter:   |
|                                                                       |
| it runs all decorators on hoursPerWeek ONLY when type = CUSTOM.       |
|                                                                       |
| If type = CUSTOM and hoursPerWeek is missing, validation fails with a |
| clear error.                                                          |
|                                                                       |
| If type = FULL_TIME and hoursPerWeek is present, it is silently       |
| stripped (whitelist: true).                                           |
+=======================================================================+

  -----------------------------------------------------------------------
  **FILE: apps/offer-service/src/common/dto/work-schedule.dto.ts**
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

+-----------------------------------------------------------------------+
| import { IsEnum, IsInt, Min, Max, ValidateIf } from                   |
| \'class-validator\';                                                  |
|                                                                       |
| import { Type } from \'class-transformer\';                           |
|                                                                       |
| import { WorkScheduleType } from                                      |
| \'../../offers/enums/work-schedule-type.enum\';                       |
|                                                                       |
| import { MIN_HOURS_PER_WEEK, MAX_HOURS_PER_WEEK } from                |
| \'../constants/offer.constants\';                                     |
|                                                                       |
| /\*\*                                                                 |
|                                                                       |
| \* WorkScheduleDto --- Nested DTO for the workSchedule field.         |
|                                                                       |
| \*                                                                    |
|                                                                       |
| \* Used by: CreateOfferDto, EditOfferDto, CreateCounterOfferDto,      |
| EditCounterOfferDto.                                                  |
|                                                                       |
| \* Always referenced via \@ValidateNested() + \@Type(() =\>           |
| WorkScheduleDto).                                                     |
|                                                                       |
| \*                                                                    |
|                                                                       |
| \* Business rules:                                                    |
|                                                                       |
| \* - type is always required.                                         |
|                                                                       |
| \* - hoursPerWeek is required ONLY when type = CUSTOM (min 1, max     |
| 80).                                                                  |
|                                                                       |
| \* - hoursPerWeek is ignored for PART_TIME and FULL_TIME.             |
|                                                                       |
| \*/                                                                   |
|                                                                       |
| export class WorkScheduleDto {                                        |
|                                                                       |
| /\*\*                                                                 |
|                                                                       |
| \* The schedule type.                                                 |
|                                                                       |
| \* PART_TIME \| FULL_TIME \| CUSTOM                                   |
|                                                                       |
| \*/                                                                   |
|                                                                       |
| \@IsEnum(WorkScheduleType, {                                          |
|                                                                       |
| message: \'workSchedule.type must be one of: PART_TIME, FULL_TIME,    |
| CUSTOM.\',                                                            |
|                                                                       |
| })                                                                    |
|                                                                       |
| type: WorkScheduleType;                                               |
|                                                                       |
| /\*\*                                                                 |
|                                                                       |
| \* Hours per week --- required only when type = CUSTOM.               |
|                                                                       |
| \* Must be a whole number between 1 and 80.                           |
|                                                                       |
| \*                                                                    |
|                                                                       |
| \* \@ValidateIf ensures this validator only runs when type = CUSTOM.  |
|                                                                       |
| \* If type is PART_TIME or FULL_TIME and this field is provided, it   |
| is                                                                    |
|                                                                       |
| \* stripped by ValidationPipe whitelist and never reaches the         |
| service.                                                              |
|                                                                       |
| \*/                                                                   |
|                                                                       |
| \@ValidateIf((o: WorkScheduleDto) =\> o.type ===                      |
| WorkScheduleType.CUSTOM)                                              |
|                                                                       |
| \@IsInt({ message: \'workSchedule.hoursPerWeek must be a whole        |
| number.\' })                                                          |
|                                                                       |
| \@Min(MIN_HOURS_PER_WEEK, {                                           |
|                                                                       |
| message: \`workSchedule.hoursPerWeek must be at least                 |
| \${MIN_HOURS_PER_WEEK}.\`,                                            |
|                                                                       |
| })                                                                    |
|                                                                       |
| \@Max(MAX_HOURS_PER_WEEK, {                                           |
|                                                                       |
| message: \`workSchedule.hoursPerWeek cannot exceed                    |
| \${MAX_HOURS_PER_WEEK}.\`,                                            |
|                                                                       |
| })                                                                    |
|                                                                       |
| \@Type(() =\> Number)                                                 |
|                                                                       |
| hoursPerWeek?: number;                                                |
|                                                                       |
| }                                                                     |
+=======================================================================+

### **Field Summary**

  ------------------------------------------------------------------------------------------------
  **Field**          **Decorators**               **Req**      **Business Rule / Constraint**
  ------------------ ---------------------------- ------------ -----------------------------------
  **type**           \@IsEnum(WorkScheduleType)   **Yes**      Must be PART_TIME \| FULL_TIME \|
                                                               CUSTOM

  **hoursPerWeek**   \@IsInt \@Min(1) \@Max(80)   **CUSTOM**   Required only when type = CUSTOM.
                                                               Whole numbers only.
  ------------------------------------------------------------------------------------------------

+-----------------------------------------------------------------------+
| **Step 5 CreateOfferDto**                                             |
|                                                                       |
| POST /v1/offers --- most complex DTO in the service                   |
+=======================================================================+

CreateOfferDto validates the request body for creating a new offer. It
is the most complex DTO because contractTitle is conditionally required
based on contractType, and startDate has three separate validators
chained together.

+-----------------------------------------------------------------------+
| Key business rules enforced by this DTO:                              |
|                                                                       |
| \- rate: integer only, no decimals. Min 1, max 9999. Never \$0.       |
|                                                                       |
| \- contractTitle: required for TEAM, CONTRACT, SERVICE. Optional for  |
| PROJECT.                                                              |
|                                                                       |
| (PROJECT inherits title from the listing name.)                       |
|                                                                       |
| \- startDate: YYYY-MM-DD only. Not in the past. Max 5 years out.      |
|                                                                       |
| \- workSchedule.hoursPerWeek: required only when type = CUSTOM.       |
|                                                                       |
| \- currencyCode: exactly 3 uppercase letters (e.g. USD). NOT always   |
| USD.                                                                  |
|                                                                       |
| Default is the user\'s account currency from signup settings.         |
|                                                                       |
| \- message: optional, max 500 chars. Stored as null if not provided.  |
+=======================================================================+

  -----------------------------------------------------------------------
  **FILE: apps/offer-service/src/offers/dto/create-offer.dto.ts**
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

+-----------------------------------------------------------------------+
| import {                                                              |
|                                                                       |
| IsUUID, IsEnum, IsInt, IsString, IsOptional, MaxLength,               |
|                                                                       |
| Min, Max, Length, IsUppercase, ValidateNested, ValidateIf,            |
| IsNotEmpty,                                                           |
|                                                                       |
| } from \'class-validator\';                                           |
|                                                                       |
| import { Type } from \'class-transformer\';                           |
|                                                                       |
| import { ContractType, CONTRACT_TYPES_REQUIRING_TITLE } from          |
| \'../enums/contract-type.enum\';                                      |
|                                                                       |
| import { WorkScheduleDto } from                                       |
| \'../../common/dto/work-schedule.dto\';                               |
|                                                                       |
| import { IsIso8601DateString } from                                   |
| \'../../common/validators/is-iso8601-date-string.validator\';         |
|                                                                       |
| import { IsFutureDate } from                                          |
| \'../../common/validators/is-future-date.validator\';                 |
|                                                                       |
| import { IsNotTooFarFuture } from                                     |
| \'../../common/validators/is-not-too-far-future.validator\';          |
|                                                                       |
| import {                                                              |
|                                                                       |
| MIN_RATE, MAX_RATE,                                                   |
|                                                                       |
| MIN_DURATION_MONTHS, MAX_DURATION_MONTHS,                             |
|                                                                       |
| MAX_CONTRACT_TITLE_LENGTH, MAX_MESSAGE_LENGTH,                        |
|                                                                       |
| CURRENCY_CODE_LENGTH,                                                 |
|                                                                       |
| } from \'../../common/constants/offer.constants\';                    |
|                                                                       |
| /\*\*                                                                 |
|                                                                       |
| \* CreateOfferDto --- Request body for POST /v1/offers.               |
|                                                                       |
| \*                                                                    |
|                                                                       |
| \* Called by: OffersController.createOffer()                          |
|                                                                       |
| \* Auth required: CLIENT role, JWT.                                   |
|                                                                       |
| \* Idempotency key required: X-Idempotency-Key header (UUID v4).      |
|                                                                       |
| \*                                                                    |
|                                                                       |
| \* After validation, OffersService:                                   |
|                                                                       |
| \* 1. Checks one-active-offer-per-client-talent-pair constraint.      |
|                                                                       |
| \* 2. Calls listings-service for start date if contractType is        |
| scoped.                                                               |
|                                                                       |
| \* 3. Creates Offer record + OutboxEvent in a single DB transaction.  |
|                                                                       |
| \* 4. expiresAt is always computed server-side: createdAt + 14 days.  |
|                                                                       |
| \*/                                                                   |
|                                                                       |
| export class CreateOfferDto {                                         |
|                                                                       |
| /\*\*                                                                 |
|                                                                       |
| \* UUID of the talent being offered a contract.                       |
|                                                                       |
| \* Validated against the active talent pool by OffersService.         |
|                                                                       |
| \*/                                                                   |
|                                                                       |
| \@IsUUID(\'4\', { message: \'talentId must be a valid UUID v4.\' })   |
|                                                                       |
| talentId: string;                                                     |
|                                                                       |
| /\*\*                                                                 |
|                                                                       |
| \* UUID of the job listing this offer is associated with.             |
|                                                                       |
| \* Used to look up contractType, contractTitle (PROJECT), and         |
| suggested start date.                                                 |
|                                                                       |
| \*/                                                                   |
|                                                                       |
| \@IsUUID(\'4\', { message: \'jobListingId must be a valid UUID v4.\'  |
| })                                                                    |
|                                                                       |
| jobListingId: string;                                                 |
|                                                                       |
| /\*\*                                                                 |
|                                                                       |
| \* The type of contract.                                              |
|                                                                       |
| \* Determines start date sub-flow and contractTitle requirement.      |
|                                                                       |
| \* Enum: PROJECT \| SERVICE \| TEAM \| CONTRACT                       |
|                                                                       |
| \*/                                                                   |
|                                                                       |
| \@IsEnum(ContractType, {                                              |
|                                                                       |
| message: \'contractType must be one of: PROJECT, SERVICE, TEAM,       |
| CONTRACT.\',                                                          |
|                                                                       |
| })                                                                    |
|                                                                       |
| contractType: ContractType;                                           |
|                                                                       |
| /\*\*                                                                 |
|                                                                       |
| \* The contract title.                                                |
|                                                                       |
| \*                                                                    |
|                                                                       |
| \* REQUIRED for: TEAM \| CONTRACT \| SERVICE.                         |
|                                                                       |
| \* OPTIONAL for: PROJECT (inherited from the listing name on the      |
| frontend,                                                             |
|                                                                       |
| \* but still accepted if sent).                                       |
|                                                                       |
| \*                                                                    |
|                                                                       |
| \* Uniqueness across all contracts per client is enforced by          |
| contracts-service                                                     |
|                                                                       |
| \* when it consumes offer.accepted --- NOT validated here.            |
|                                                                       |
| \*/                                                                   |
|                                                                       |
| \@ValidateIf((o: CreateOfferDto) =\>                                  |
|                                                                       |
| CONTRACT_TYPES_REQUIRING_TITLE.includes(o.contractType)               |
|                                                                       |
| )                                                                     |
|                                                                       |
| \@IsNotEmpty({                                                        |
|                                                                       |
| message: \'contractTitle is required for TEAM, CONTRACT, and SERVICE  |
| contract types.\',                                                    |
|                                                                       |
| })                                                                    |
|                                                                       |
| \@IsString()                                                          |
|                                                                       |
| \@MaxLength(MAX_CONTRACT_TITLE_LENGTH, {                              |
|                                                                       |
| message: \`contractTitle cannot exceed \${MAX_CONTRACT_TITLE_LENGTH}  |
| characters.\`,                                                        |
|                                                                       |
| })                                                                    |
|                                                                       |
| contractTitle?: string;                                               |
|                                                                       |
| /\*\*                                                                 |
|                                                                       |
| \* Hourly rate. Must be a whole number (integer).                     |
|                                                                       |
| \* No decimals, no currency symbols.                                  |
|                                                                       |
| \* \@Type(() =\> Number) coerces strings to numbers if sent as        |
| strings.                                                              |
|                                                                       |
| \*/                                                                   |
|                                                                       |
| \@IsInt({ message: \'rate must be a whole number with no decimal      |
| places.\' })                                                          |
|                                                                       |
| \@Min(MIN_RATE, { message: \`rate must be at least \$\${MIN_RATE}.\`  |
| })                                                                    |
|                                                                       |
| \@Max(MAX_RATE, { message: \`rate cannot exceed \$\${MAX_RATE}.\` })  |
|                                                                       |
| \@Type(() =\> Number)                                                 |
|                                                                       |
| rate: number;                                                         |
|                                                                       |
| /\*\*                                                                 |
|                                                                       |
| \* ISO 4217 currency code. Exactly 3 uppercase letters.               |
|                                                                       |
| \* Not always USD --- defaults to the user\'s account currency from   |
| signup.                                                               |
|                                                                       |
| \* Examples: USD, EUR, GBP, CAD, AUD                                  |
|                                                                       |
| \*/                                                                   |
|                                                                       |
| \@IsString()                                                          |
|                                                                       |
| \@Length(CURRENCY_CODE_LENGTH, CURRENCY_CODE_LENGTH, {                |
|                                                                       |
| message: \'currencyCode must be exactly 3 characters (e.g. USD, EUR,  |
| GBP).\',                                                              |
|                                                                       |
| })                                                                    |
|                                                                       |
| \@IsUppercase({ message: \'currencyCode must be uppercase.\' })       |
|                                                                       |
| currencyCode: string;                                                 |
|                                                                       |
| /\*\*                                                                 |
|                                                                       |
| \* Contract duration in whole months.                                 |
|                                                                       |
| \* Min 1 month, max 60 months (5 years).                              |
|                                                                       |
| \*/                                                                   |
|                                                                       |
| \@IsInt({ message: \'durationMonths must be a whole number of         |
| months.\' })                                                          |
|                                                                       |
| \@Min(MIN_DURATION_MONTHS, { message: \`durationMonths must be at     |
| least \${MIN_DURATION_MONTHS}.\` })                                   |
|                                                                       |
| \@Max(MAX_DURATION_MONTHS, { message: \`durationMonths cannot exceed  |
| \${MAX_DURATION_MONTHS}.\` })                                         |
|                                                                       |
| \@Type(() =\> Number)                                                 |
|                                                                       |
| durationMonths: number;                                               |
|                                                                       |
| /\*\*                                                                 |
|                                                                       |
| \* Work schedule. Nested DTO.                                         |
|                                                                       |
| \* \@ValidateNested() tells class-validator to recurse into the       |
| nested object.                                                        |
|                                                                       |
| \* \@Type(() =\> WorkScheduleDto) tells class-transformer to          |
| instantiate it.                                                       |
|                                                                       |
| \* Both are required together for nested validation to work.          |
|                                                                       |
| \*/                                                                   |
|                                                                       |
| \@ValidateNested({ message: \'workSchedule must be a valid schedule   |
| object.\' })                                                          |
|                                                                       |
| \@Type(() =\> WorkScheduleDto)                                        |
|                                                                       |
| workSchedule: WorkScheduleDto;                                        |
|                                                                       |
| /\*\*                                                                 |
|                                                                       |
| \* Start date. ISO 8601 date string (YYYY-MM-DD only, not datetime).  |
|                                                                       |
| \* Three validators chained in order:                                 |
|                                                                       |
| \* 1. \@IsString() --- must be a string                               |
|                                                                       |
| \* 2. \@IsIso8601DateString() --- must be valid YYYY-MM-DD calendar   |
| date                                                                  |
|                                                                       |
| \* 3. \@IsFutureDate() --- must be today or future                    |
|                                                                       |
| \* 4. \@IsNotTooFarFuture() --- must be within 5 years                |
|                                                                       |
| \*                                                                    |
|                                                                       |
| \* Display format on frontend: \"Monday, Jan 30, 2025\"               |
|                                                                       |
| \*/                                                                   |
|                                                                       |
| \@IsString()                                                          |
|                                                                       |
| \@IsIso8601DateString()                                               |
|                                                                       |
| \@IsFutureDate()                                                      |
|                                                                       |
| \@IsNotTooFarFuture()                                                 |
|                                                                       |
| startDate: string;                                                    |
|                                                                       |
| /\*\*                                                                 |
|                                                                       |
| \* Optional message to accompany the offer.                           |
|                                                                       |
| \* Stored as null if not provided.                                    |
|                                                                       |
| \*/                                                                   |
|                                                                       |
| \@IsOptional()                                                        |
|                                                                       |
| \@IsString()                                                          |
|                                                                       |
| \@MaxLength(MAX_MESSAGE_LENGTH, {                                     |
|                                                                       |
| message: \`message cannot exceed \${MAX_MESSAGE_LENGTH}               |
| characters.\`,                                                        |
|                                                                       |
| })                                                                    |
|                                                                       |
| message?: string;                                                     |
|                                                                       |
| }                                                                     |
+=======================================================================+

### **Field Summary**

  ---------------------------------------------------------------------------------------------
  **Field**            **Decorators**           **Req**     **Business Rule / Constraint**
  -------------------- ------------------------ ----------- -----------------------------------
  **talentId**         \@IsUUID(\'4\')          **Yes**     UUID v4 of the talent

  **jobListingId**     \@IsUUID(\'4\')          **Yes**     UUID v4 of the job listing

  **contractType**     \@IsEnum(ContractType)   **Yes**     PROJECT \| SERVICE \| TEAM \|
                                                            CONTRACT

  **contractTitle**    \@IsNotEmpty             **Cond.**   Required for TEAM, CONTRACT,
                       \@MaxLength(200)                     SERVICE

  **rate**             \@IsInt \@Min(1)         **Yes**     Whole number only. No decimals.
                       \@Max(9999)                          

  **currencyCode**     \@Length(3)              **Yes**     ISO 4217. Not always USD.
                       \@IsUppercase                        

  **durationMonths**   \@IsInt \@Min(1)         **Yes**     Whole months.
                       \@Max(60)                            

  **workSchedule**     \@ValidateNested         **Yes**     Nested: type + optional
                       WorkScheduleDto                      hoursPerWeek

  **startDate**        \@IsIso8601DateString    **Yes**     YYYY-MM-DD. Not past. Max 5 years.
                       \@IsFutureDate                       
                       \@IsNotTooFarFuture                  

  **message**          \@IsOptional             **No**      Optional. Null if not sent.
                       \@MaxLength(500)                     
  ---------------------------------------------------------------------------------------------

+-----------------------------------------------------------------------+
| **Step 6 EditOfferDto**                                               |
|                                                                       |
| PATCH /v1/offers/:id --- all fields optional, at least one required   |
+=======================================================================+

EditOfferDto validates the request body for editing a pending offer. All
fields are optional but at least one must be provided (enforced in
OffersService, not the DTO, because class-validator cannot easily
enforce \"at least one field\"). Editing an offer resets expiresAt =
NOW() + 14 days and sets warningSentAt = null.

+-----------------------------------------------------------------------+
| Business rules enforced by OffersService after DTO validation:        |
|                                                                       |
| \- Offer must be in PENDING status. 409 returned if COUNTERED or      |
| terminal.                                                             |
|                                                                       |
| \- At least one field must be provided in the body.                   |
|                                                                       |
| \- requesterId must equal offer.clientId. 403 otherwise.              |
|                                                                       |
| \- expiresAt is reset to NOW() + 14 days after any successful edit.   |
|                                                                       |
| \- warningSentAt is set to null after any successful edit.            |
|                                                                       |
| \- A notification IS sent to talent: \"Offer Updated\" (see OS-29).   |
+=======================================================================+

  -----------------------------------------------------------------------
  **FILE: apps/offer-service/src/offers/dto/edit-offer.dto.ts**
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

+-----------------------------------------------------------------------+
| import {                                                              |
|                                                                       |
| IsInt, IsString, IsOptional, MaxLength, Min, Max,                     |
|                                                                       |
| Length, IsUppercase, ValidateNested,                                  |
|                                                                       |
| } from \'class-validator\';                                           |
|                                                                       |
| import { Type } from \'class-transformer\';                           |
|                                                                       |
| import { WorkScheduleDto } from                                       |
| \'../../common/dto/work-schedule.dto\';                               |
|                                                                       |
| import { IsIso8601DateString } from                                   |
| \'../../common/validators/is-iso8601-date-string.validator\';         |
|                                                                       |
| import { IsFutureDate } from                                          |
| \'../../common/validators/is-future-date.validator\';                 |
|                                                                       |
| import { IsNotTooFarFuture } from                                     |
| \'../../common/validators/is-not-too-far-future.validator\';          |
|                                                                       |
| import {                                                              |
|                                                                       |
| MIN_RATE, MAX_RATE, MIN_DURATION_MONTHS, MAX_DURATION_MONTHS,         |
|                                                                       |
| MAX_CONTRACT_TITLE_LENGTH, MAX_MESSAGE_LENGTH, CURRENCY_CODE_LENGTH,  |
|                                                                       |
| } from \'../../common/constants/offer.constants\';                    |
|                                                                       |
| /\*\*                                                                 |
|                                                                       |
| \* EditOfferDto --- Request body for PATCH /v1/offers/:id.            |
|                                                                       |
| \*                                                                    |
|                                                                       |
| \* All fields are optional. At least one must be provided (enforced   |
| in service).                                                          |
|                                                                       |
| \* Only available when offer.status = PENDING.                        |
|                                                                       |
| \* Side effects: resets expiresAt = NOW() + 14 days, clears           |
| warningSentAt.                                                        |
|                                                                       |
| \*/                                                                   |
|                                                                       |
| export class EditOfferDto {                                           |
|                                                                       |
| \@IsOptional()                                                        |
|                                                                       |
| \@IsInt({ message: \'rate must be a whole number.\' })                |
|                                                                       |
| \@Min(MIN_RATE, { message: \`rate must be at least \$\${MIN_RATE}.\`  |
| })                                                                    |
|                                                                       |
| \@Max(MAX_RATE, { message: \`rate cannot exceed \$\${MAX_RATE}.\` })  |
|                                                                       |
| \@Type(() =\> Number)                                                 |
|                                                                       |
| rate?: number;                                                        |
|                                                                       |
| \@IsOptional()                                                        |
|                                                                       |
| \@IsString()                                                          |
|                                                                       |
| \@Length(CURRENCY_CODE_LENGTH, CURRENCY_CODE_LENGTH, {                |
|                                                                       |
| message: \'currencyCode must be exactly 3 characters.\',              |
|                                                                       |
| })                                                                    |
|                                                                       |
| \@IsUppercase({ message: \'currencyCode must be uppercase.\' })       |
|                                                                       |
| currencyCode?: string;                                                |
|                                                                       |
| \@IsOptional()                                                        |
|                                                                       |
| \@IsInt({ message: \'durationMonths must be a whole number.\' })      |
|                                                                       |
| \@Min(MIN_DURATION_MONTHS, { message: \`durationMonths must be at     |
| least \${MIN_DURATION_MONTHS}.\` })                                   |
|                                                                       |
| \@Max(MAX_DURATION_MONTHS, { message: \`durationMonths cannot exceed  |
| \${MAX_DURATION_MONTHS}.\` })                                         |
|                                                                       |
| \@Type(() =\> Number)                                                 |
|                                                                       |
| durationMonths?: number;                                              |
|                                                                       |
| \@IsOptional()                                                        |
|                                                                       |
| \@ValidateNested()                                                    |
|                                                                       |
| \@Type(() =\> WorkScheduleDto)                                        |
|                                                                       |
| workSchedule?: WorkScheduleDto;                                       |
|                                                                       |
| \@IsOptional()                                                        |
|                                                                       |
| \@IsString()                                                          |
|                                                                       |
| \@IsIso8601DateString()                                               |
|                                                                       |
| \@IsFutureDate()                                                      |
|                                                                       |
| \@IsNotTooFarFuture()                                                 |
|                                                                       |
| startDate?: string;                                                   |
|                                                                       |
| \@IsOptional()                                                        |
|                                                                       |
| \@IsString()                                                          |
|                                                                       |
| \@MaxLength(MAX_CONTRACT_TITLE_LENGTH, {                              |
|                                                                       |
| message: \`contractTitle cannot exceed \${MAX_CONTRACT_TITLE_LENGTH}  |
| characters.\`,                                                        |
|                                                                       |
| })                                                                    |
|                                                                       |
| contractTitle?: string;                                               |
|                                                                       |
| \@IsOptional()                                                        |
|                                                                       |
| \@IsString()                                                          |
|                                                                       |
| \@MaxLength(MAX_MESSAGE_LENGTH, {                                     |
|                                                                       |
| message: \`message cannot exceed \${MAX_MESSAGE_LENGTH}               |
| characters.\`,                                                        |
|                                                                       |
| })                                                                    |
|                                                                       |
| message?: string;                                                     |
|                                                                       |
| }                                                                     |
+=======================================================================+

### **Field Summary**

  -------------------------------------------------------------------------------------
  **Field**            **Decorators**     **Req**   **Business Rule / Constraint**
  -------------------- ------------------ --------- -----------------------------------
  **rate**             \@IsOptional       **No**    Whole number. Same rules as create.
                       \@IsInt \@Min(1)             
                       \@Max(9999)                  

  **currencyCode**     \@IsOptional       **No**    ISO 4217. Same rules as create.
                       \@Length(3)                  
                       \@IsUppercase                

  **durationMonths**   \@IsOptional       **No**    Whole months.
                       \@IsInt \@Min(1)             
                       \@Max(60)                    

  **workSchedule**     \@IsOptional       **No**    Same rules as create.
                       \@ValidateNested             

  **startDate**        \@IsOptional + 3   **No**    YYYY-MM-DD. Not past. Max 5 years.
                       date validators              

  **contractTitle**    \@IsOptional       **No**    Max 200 chars. No required
                       \@MaxLength(200)             constraint here.

  **message**          \@IsOptional       **No**    Optional. Replaces previous
                       \@MaxLength(500)             message.
  -------------------------------------------------------------------------------------

+-----------------------------------------------------------------------+
| **Step 7 AcceptOfferDto**                                             |
|                                                                       |
| POST /v1/offers/:id/accept                                            |
+=======================================================================+

AcceptOfferDto is the simplest DTO in the service. The only field is an
optional acceptance message. All the real validation (offer status
check, atomic CAS, idempotency) happens in OffersService. TALENT role,
OfferPartyGuard, and X-Idempotency-Key are enforced by the controller.

  -----------------------------------------------------------------------
  **FILE: apps/offer-service/src/offers/dto/accept-offer.dto.ts**
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

+-----------------------------------------------------------------------+
| import { IsOptional, IsString, MaxLength } from \'class-validator\';  |
|                                                                       |
| import { MAX_MESSAGE_LENGTH } from                                    |
| \'../../common/constants/offer.constants\';                           |
|                                                                       |
| /\*\*                                                                 |
|                                                                       |
| \* AcceptOfferDto --- Request body for POST /v1/offers/:id/accept.    |
|                                                                       |
| \*                                                                    |
|                                                                       |
| \* Auth: TALENT role only. Must be offer.talentId.                    |
|                                                                       |
| \* Idempotency: X-Idempotency-Key required.                           |
|                                                                       |
| \* Offer must be in PENDING status (not COUNTERED).                   |
|                                                                       |
| \*                                                                    |
|                                                                       |
| \* Side effects after acceptance:                                     |
|                                                                       |
| \* - status = ACCEPTED, acceptedAt = NOW()                            |
|                                                                       |
| \* - offer.accepted event emitted to marketeq.offers                  |
|                                                                       |
| \* - contracts-service creates ContractGroup from offer terms         |
|                                                                       |
| \* - Ably: offer:{offerId} channel updated for both parties           |
|                                                                       |
| \*                                                                    |
|                                                                       |
| \* Note: Talent CANNOT accept an offer when offer.status = COUNTERED. |
|                                                                       |
| \* A pending counter offer means the primary offer action buttons are |
| hidden.                                                               |
|                                                                       |
| \* The talent must withdraw their counter offer first.                |
|                                                                       |
| \*/                                                                   |
|                                                                       |
| export class AcceptOfferDto {                                         |
|                                                                       |
| \@IsOptional()                                                        |
|                                                                       |
| \@IsString()                                                          |
|                                                                       |
| \@MaxLength(MAX_MESSAGE_LENGTH, {                                     |
|                                                                       |
| message: \`message cannot exceed \${MAX_MESSAGE_LENGTH}               |
| characters.\`,                                                        |
|                                                                       |
| })                                                                    |
|                                                                       |
| message?: string;                                                     |
|                                                                       |
| }                                                                     |
+=======================================================================+

### **Field Summary**

  -----------------------------------------------------------------------------------
  **Field**          **Decorators**     **Req**   **Business Rule / Constraint**
  ------------------ ------------------ --------- -----------------------------------
  **message**        \@IsOptional       **No**    Optional acceptance message. Stored
                     \@IsString                   alongside the accepted offer.
                     \@MaxLength(500)             

  -----------------------------------------------------------------------------------

+-----------------------------------------------------------------------+
| **Step 8 DeclineOfferDto**                                            |
|                                                                       |
| POST /v1/offers/:id/decline                                           |
+=======================================================================+

DeclineOfferDto validates the decline reason and optional chip. The
reason is required --- the talent must provide at least some text. The
chip is optional and represents which quick-select button they tapped.
Both are stored in the database. IMPORTANT: the decline reason is NOT
included in the notification sent to the client. It is only visible when
the client opens the Declined Offer Details modal.

  -----------------------------------------------------------------------
  **FILE: apps/offer-service/src/offers/dto/decline-offer.dto.ts**
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

+-----------------------------------------------------------------------+
| import { IsString, IsOptional, IsEnum, IsNotEmpty, MaxLength } from   |
| \'class-validator\';                                                  |
|                                                                       |
| import { DeclineChip } from \'../enums/decline-chip.enum\';           |
|                                                                       |
| import {                                                              |
|                                                                       |
| MIN_DECLINE_REASON_LENGTH,                                            |
|                                                                       |
| MAX_DECLINE_REASON_LENGTH,                                            |
|                                                                       |
| } from \'../../common/constants/offer.constants\';                    |
|                                                                       |
| /\*\*                                                                 |
|                                                                       |
| \* DeclineOfferDto --- Request body for POST /v1/offers/:id/decline.  |
|                                                                       |
| \*                                                                    |
|                                                                       |
| \* Auth: TALENT role only. Must be offer.talentId.                    |
|                                                                       |
| \* Idempotency: X-Idempotency-Key required.                           |
|                                                                       |
| \* Offer must be in PENDING status.                                   |
|                                                                       |
| \*                                                                    |
|                                                                       |
| \* Side effects after decline:                                        |
|                                                                       |
| \* - status = DECLINED, declinedAt = NOW()                            |
|                                                                       |
| \* - declineReason and declineChip stored on the Offer record         |
|                                                                       |
| \* - offer.declined event emitted to marketeq.offers                  |
|                                                                       |
| \* - Client notified: \"Offer Declined\" with View Details CTA        |
|                                                                       |
| \* - Decline reason is NOT in the notification --- only in the        |
| details modal                                                         |
|                                                                       |
| \*/                                                                   |
|                                                                       |
| export class DeclineOfferDto {                                        |
|                                                                       |
| /\*\*                                                                 |
|                                                                       |
| \* The decline reason text. Required.                                 |
|                                                                       |
| \* Min 1 char, max 500 chars.                                         |
|                                                                       |
| \* Can be free-form text or the display text of the selected chip.    |
|                                                                       |
| \* Stored on the offer record for the client to see in the details    |
| modal.                                                                |
|                                                                       |
| \*/                                                                   |
|                                                                       |
| \@IsString()                                                          |
|                                                                       |
| \@IsNotEmpty({ message: \'A decline reason is required.\' })          |
|                                                                       |
| \@MaxLength(MAX_DECLINE_REASON_LENGTH, {                              |
|                                                                       |
| message: \`reason cannot exceed \${MAX_DECLINE_REASON_LENGTH}         |
| characters.\`,                                                        |
|                                                                       |
| })                                                                    |
|                                                                       |
| reason: string;                                                       |
|                                                                       |
| /\*\*                                                                 |
|                                                                       |
| \* The pre-defined chip that was selected. Optional.                  |
|                                                                       |
| \* If the talent selected a chip, this identifies which one.          |
|                                                                       |
| \* Enum values correspond to the 6 quick-select pills in the UI:      |
|                                                                       |
| \* BUDGET_DOESNT_WORK \| START_DATE_DOESNT_WORK \|                    |
| REQUIREMENTS_UNCLEAR                                                  |
|                                                                       |
| \* NOT_A_FIT \| TOO_BUSY \| NEED_DIFFERENT_TERMS                      |
|                                                                       |
| \*/                                                                   |
|                                                                       |
| \@IsOptional()                                                        |
|                                                                       |
| \@IsEnum(DeclineChip, { message: \'chip must be a valid DeclineChip   |
| value.\' })                                                           |
|                                                                       |
| chip?: DeclineChip;                                                   |
|                                                                       |
| }                                                                     |
+=======================================================================+

### **Field Summary**

  ----------------------------------------------------------------------------------------
  **Field**          **Decorators**          **Req**   **Business Rule / Constraint**
  ------------------ ----------------------- --------- -----------------------------------
  **reason**         \@IsString \@IsNotEmpty **Yes**   Required. Free text or chip label.
                     \@MaxLength(500)                  1-500 chars.

  **chip**           \@IsOptional            **No**    Optional. Identifies which
                     \@IsEnum(DeclineChip)             quick-select chip was tapped.
  ----------------------------------------------------------------------------------------

+-----------------------------------------------------------------------+
| **Step 9 WithdrawOfferDto**                                           |
|                                                                       |
| POST /v1/offers/:id/withdraw                                          |
+=======================================================================+

WithdrawOfferDto validates the optional withdrawal message. The message
is stored as withdrawalMessage on the offer record. Withdrawal is CLIENT
only and only available when status = PENDING. COUNTERED offers cannot
be withdrawn --- the client must first ask the talent to withdraw their
counter offer.

  -----------------------------------------------------------------------
  **FILE: apps/offer-service/src/offers/dto/withdraw-offer.dto.ts**
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

+-----------------------------------------------------------------------+
| import { IsOptional, IsString, MaxLength } from \'class-validator\';  |
|                                                                       |
| import { MAX_MESSAGE_LENGTH } from                                    |
| \'../../common/constants/offer.constants\';                           |
|                                                                       |
| /\*\*                                                                 |
|                                                                       |
| \* WithdrawOfferDto --- Request body for POST                         |
| /v1/offers/:id/withdraw.                                              |
|                                                                       |
| \*                                                                    |
|                                                                       |
| \* Auth: CLIENT role only. Must be offer.clientId.                    |
|                                                                       |
| \* Idempotency: X-Idempotency-Key required.                           |
|                                                                       |
| \* Offer must be in PENDING status. Cannot withdraw COUNTERED offers. |
|                                                                       |
| \*                                                                    |
|                                                                       |
| \* Side effects:                                                      |
|                                                                       |
| \* - status = WITHDRAWN, withdrawnAt = NOW()                          |
|                                                                       |
| \* - withdrawalMessage stored on offer record                         |
|                                                                       |
| \* - offer.withdrawn event emitted                                    |
|                                                                       |
| \* - Talent notified: \"Offer Withdrawn\"                             |
|                                                                       |
| \*/                                                                   |
|                                                                       |
| export class WithdrawOfferDto {                                       |
|                                                                       |
| \@IsOptional()                                                        |
|                                                                       |
| \@IsString()                                                          |
|                                                                       |
| \@MaxLength(MAX_MESSAGE_LENGTH, {                                     |
|                                                                       |
| message: \`message cannot exceed \${MAX_MESSAGE_LENGTH}               |
| characters.\`,                                                        |
|                                                                       |
| })                                                                    |
|                                                                       |
| message?: string;                                                     |
|                                                                       |
| }                                                                     |
+=======================================================================+

+-----------------------------------------------------------------------+
| **Step 10 ResendOfferDto**                                            |
|                                                                       |
| POST /v1/offers/:id/resend                                            |
+=======================================================================+

ResendOfferDto validates the optional message to accompany the resent
offer. Resending creates a NEW offer record with identical terms to the
original --- same rate, duration, schedule, startDate, and title. A
fresh expiresAt = NOW() + 14 days is set. The original offer record is
unchanged in its terminal state.

+-----------------------------------------------------------------------+
| What happens when resend is called (OffersService logic):             |
|                                                                       |
| 1\. Original offer must be in EXPIRED \| DECLINED \| WITHDRAWN        |
| status.                                                               |
|                                                                       |
| 2\. No active offer can exist for this client-talent pair (409 if one |
| does).                                                                |
|                                                                       |
| 3\. New Offer record created with originalOfferId reference.          |
|                                                                       |
| 4\. Fresh expiresAt = NOW() + 14 days computed server-side.           |
|                                                                       |
| 5\. offer.created AND offer.resent both emitted to marketeq.offers.   |
|                                                                       |
| 6\. Response includes both the new offer AND originalOfferId.         |
+=======================================================================+

  -----------------------------------------------------------------------
  **FILE: apps/offer-service/src/offers/dto/resend-offer.dto.ts**
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

+-----------------------------------------------------------------------+
| import { IsOptional, IsString, MaxLength } from \'class-validator\';  |
|                                                                       |
| import { MAX_MESSAGE_LENGTH } from                                    |
| \'../../common/constants/offer.constants\';                           |
|                                                                       |
| /\*\*                                                                 |
|                                                                       |
| \* ResendOfferDto --- Request body for POST /v1/offers/:id/resend.    |
|                                                                       |
| \*                                                                    |
|                                                                       |
| \* Auth: CLIENT role only. Must be offer.clientId.                    |
|                                                                       |
| \* Idempotency: X-Idempotency-Key required.                           |
|                                                                       |
| \* Original offer must be in EXPIRED \| DECLINED \| WITHDRAWN status. |
|                                                                       |
| \* Response includes the new offer (PENDING) with originalOfferId     |
| field.                                                                |
|                                                                       |
| \*/                                                                   |
|                                                                       |
| export class ResendOfferDto {                                         |
|                                                                       |
| \@IsOptional()                                                        |
|                                                                       |
| \@IsString()                                                          |
|                                                                       |
| \@MaxLength(MAX_MESSAGE_LENGTH, {                                     |
|                                                                       |
| message: \`message cannot exceed \${MAX_MESSAGE_LENGTH}               |
| characters.\`,                                                        |
|                                                                       |
| })                                                                    |
|                                                                       |
| message?: string;                                                     |
|                                                                       |
| }                                                                     |
+=======================================================================+

+-----------------------------------------------------------------------+
| **Step 11 OfferHistoryQueryDto**                                      |
|                                                                       |
| GET /v1/offers/:id/history --- query params                           |
+=======================================================================+

OfferHistoryQueryDto validates query string parameters for the paginated
offer history endpoint. Both fields are optional. If limit is not
provided, it defaults to the maximum (50). cursor is an opaque string
from the previous page\'s nextCursor field.

  -----------------------------------------------------------------------
  **FILE: apps/offer-service/src/offers/dto/offer-history-query.dto.ts**
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

+-----------------------------------------------------------------------+
| import { IsOptional, IsString, IsInt, Min, Max } from                 |
| \'class-validator\';                                                  |
|                                                                       |
| import { Type } from \'class-transformer\';                           |
|                                                                       |
| import { HISTORY_PAGE_SIZE } from                                     |
| \'../../common/constants/offer.constants\';                           |
|                                                                       |
| /\*\*                                                                 |
|                                                                       |
| \* OfferHistoryQueryDto --- Query parameters for GET                  |
| /v1/offers/:id/history.                                               |
|                                                                       |
| \*                                                                    |
|                                                                       |
| \* Cursor-based pagination. Max 50 events per page.                   |
|                                                                       |
| \* cursor is an opaque string --- pass the nextCursor from the        |
| previous response.                                                    |
|                                                                       |
| \*/                                                                   |
|                                                                       |
| export class OfferHistoryQueryDto {                                   |
|                                                                       |
| /\*\*                                                                 |
|                                                                       |
| \* Pagination cursor from the previous page\'s nextCursor field.      |
|                                                                       |
| \* Do not construct cursors manually --- use the value from the       |
| response.                                                             |
|                                                                       |
| \*/                                                                   |
|                                                                       |
| \@IsOptional()                                                        |
|                                                                       |
| \@IsString()                                                          |
|                                                                       |
| cursor?: string;                                                      |
|                                                                       |
| /\*\*                                                                 |
|                                                                       |
| \* Number of events to return per page.                               |
|                                                                       |
| \* Default: 50 (HISTORY_PAGE_SIZE).                                   |
|                                                                       |
| \* Max: 50.                                                           |
|                                                                       |
| \* \@Type coerces query string \"50\" to number 50.                   |
|                                                                       |
| \*/                                                                   |
|                                                                       |
| \@IsOptional()                                                        |
|                                                                       |
| \@IsInt()                                                             |
|                                                                       |
| \@Min(1)                                                              |
|                                                                       |
| \@Max(HISTORY_PAGE_SIZE)                                              |
|                                                                       |
| \@Type(() =\> Number)                                                 |
|                                                                       |
| limit: number = HISTORY_PAGE_SIZE;                                    |
|                                                                       |
| }                                                                     |
+=======================================================================+

+-----------------------------------------------------------------------+
| **Step 12 CreateCounterOfferDto**                                     |
|                                                                       |
| POST /v1/offers/:offerId/counter-offers                               |
+=======================================================================+

CreateCounterOfferDto validates counter offer creation. The fields are
identical to CreateOfferDto\'s terms fields (rate, currencyCode,
durationMonths, workSchedule, startDate) but without talentId,
jobListingId, or contractType --- those are inherited from the parent
offer. Either TALENT or CLIENT can submit a counter offer; the service
determines direction from req.user.role.

+-----------------------------------------------------------------------+
| Counter offer direction rules (enforced in CounterOffersService, not  |
| DTO):                                                                 |
|                                                                       |
| TALENT initiating: parent offer must be PENDING. Sets parent →        |
| COUNTERED.                                                            |
|                                                                       |
| CLIENT responding: parent offer must be COUNTERED. Previous CO →      |
| SUPERSEDED.                                                           |
|                                                                       |
| Rate warning (advisory, not blocking):                                |
|                                                                       |
| Server evaluates after validation and returns rateWarning:            |
| true\|false in response.                                              |
|                                                                       |
| Talent CO: warn if coRate \> parentRate \* 1.25 (talent asking more   |
| than 25% above)                                                       |
|                                                                       |
| Client CO: warn if coRate \< parentRate \* 0.8 (client offering more  |
| than 20% below)                                                       |
|                                                                       |
| Direction flips because the meaning of \"high\" vs \"low\" depends on |
| who sent it.                                                          |
+=======================================================================+

  -------------------------------------------------------------------------
  **FILE:
  apps/offer-service/src/counter-offers/dto/create-counter-offer.dto.ts**
  -------------------------------------------------------------------------

  -------------------------------------------------------------------------

+-----------------------------------------------------------------------+
| import {                                                              |
|                                                                       |
| IsInt, IsString, IsOptional, MaxLength, Min, Max,                     |
|                                                                       |
| Length, IsUppercase, ValidateNested,                                  |
|                                                                       |
| } from \'class-validator\';                                           |
|                                                                       |
| import { Type } from \'class-transformer\';                           |
|                                                                       |
| import { WorkScheduleDto } from                                       |
| \'../../common/dto/work-schedule.dto\';                               |
|                                                                       |
| import { IsIso8601DateString } from                                   |
| \'../../common/validators/is-iso8601-date-string.validator\';         |
|                                                                       |
| import { IsFutureDate } from                                          |
| \'../../common/validators/is-future-date.validator\';                 |
|                                                                       |
| import { IsNotTooFarFuture } from                                     |
| \'../../common/validators/is-not-too-far-future.validator\';          |
|                                                                       |
| import {                                                              |
|                                                                       |
| MIN_RATE, MAX_RATE, MIN_DURATION_MONTHS, MAX_DURATION_MONTHS,         |
|                                                                       |
| MAX_MESSAGE_LENGTH, CURRENCY_CODE_LENGTH,                             |
|                                                                       |
| } from \'../../common/constants/offer.constants\';                    |
|                                                                       |
| /\*\*                                                                 |
|                                                                       |
| \* CreateCounterOfferDto --- Request body for POST                    |
| /v1/offers/:offerId/counter-offers.                                   |
|                                                                       |
| \*                                                                    |
|                                                                       |
| \* Auth: JWT. Either CLIENT or TALENT --- role determines direction.  |
|                                                                       |
| \* Idempotency: X-Idempotency-Key required.                           |
|                                                                       |
| \*                                                                    |
|                                                                       |
| \* The parentOffer provides: contractType, contractTitle, clientId,   |
| talentId.                                                             |
|                                                                       |
| \* The CO provides its own: rate, currencyCode, durationMonths,       |
| workSchedule, startDate.                                              |
|                                                                       |
| \*                                                                    |
|                                                                       |
| \* expiresAt is computed server-side: NOW() + 14 days (fresh TTL      |
| clock).                                                               |
|                                                                       |
| \* rateWarning is computed server-side and returned in the response.  |
|                                                                       |
| \*/                                                                   |
|                                                                       |
| export class CreateCounterOfferDto {                                  |
|                                                                       |
| \@IsInt({ message: \'rate must be a whole number.\' })                |
|                                                                       |
| \@Min(MIN_RATE, { message: \`rate must be at least \$\${MIN_RATE}.\`  |
| })                                                                    |
|                                                                       |
| \@Max(MAX_RATE, { message: \`rate cannot exceed \$\${MAX_RATE}.\` })  |
|                                                                       |
| \@Type(() =\> Number)                                                 |
|                                                                       |
| rate: number;                                                         |
|                                                                       |
| \@IsString()                                                          |
|                                                                       |
| \@Length(CURRENCY_CODE_LENGTH, CURRENCY_CODE_LENGTH, {                |
|                                                                       |
| message: \'currencyCode must be exactly 3 characters.\',              |
|                                                                       |
| })                                                                    |
|                                                                       |
| \@IsUppercase({ message: \'currencyCode must be uppercase.\' })       |
|                                                                       |
| currencyCode: string;                                                 |
|                                                                       |
| \@IsInt({ message: \'durationMonths must be a whole number of         |
| months.\' })                                                          |
|                                                                       |
| \@Min(MIN_DURATION_MONTHS, { message: \`durationMonths must be at     |
| least \${MIN_DURATION_MONTHS}.\` })                                   |
|                                                                       |
| \@Max(MAX_DURATION_MONTHS, { message: \`durationMonths cannot exceed  |
| \${MAX_DURATION_MONTHS}.\` })                                         |
|                                                                       |
| \@Type(() =\> Number)                                                 |
|                                                                       |
| durationMonths: number;                                               |
|                                                                       |
| \@ValidateNested({ message: \'workSchedule must be a valid schedule   |
| object.\' })                                                          |
|                                                                       |
| \@Type(() =\> WorkScheduleDto)                                        |
|                                                                       |
| workSchedule: WorkScheduleDto;                                        |
|                                                                       |
| \@IsString()                                                          |
|                                                                       |
| \@IsIso8601DateString()                                               |
|                                                                       |
| \@IsFutureDate()                                                      |
|                                                                       |
| \@IsNotTooFarFuture()                                                 |
|                                                                       |
| startDate: string;                                                    |
|                                                                       |
| \@IsOptional()                                                        |
|                                                                       |
| \@IsString()                                                          |
|                                                                       |
| \@MaxLength(MAX_MESSAGE_LENGTH, {                                     |
|                                                                       |
| message: \`message cannot exceed \${MAX_MESSAGE_LENGTH}               |
| characters.\`,                                                        |
|                                                                       |
| })                                                                    |
|                                                                       |
| message?: string;                                                     |
|                                                                       |
| }                                                                     |
+=======================================================================+

### **Field Summary**

  ------------------------------------------------------------------------------------------
  **Field**            **Decorators**          **Req**   **Business Rule / Constraint**
  -------------------- ----------------------- --------- -----------------------------------
  **rate**             \@IsInt \@Min(1)        **Yes**   Same rules as offer rate.
                       \@Max(9999)                       

  **currencyCode**     \@Length(3)             **Yes**   ISO 4217.
                       \@IsUppercase                     

  **durationMonths**   \@IsInt \@Min(1)        **Yes**   Whole months.
                       \@Max(60)                         

  **workSchedule**     \@ValidateNested        **Yes**   Nested. Same rules as offer.
                       WorkScheduleDto                   

  **startDate**        \@IsIso8601DateString   **Yes**   YYYY-MM-DD. Not past. Max 5 yrs.
                       \@IsFutureDate                    
                       \@IsNotTooFarFuture               

  **message**          \@IsOptional            **No**    Optional counter offer message.
                       \@MaxLength(500)                  
  ------------------------------------------------------------------------------------------

+-----------------------------------------------------------------------+
| **Step 13 EditCounterOfferDto**                                       |
|                                                                       |
| PATCH /v1/offers/:offerId/counter-offers/:id --- in-place edit        |
+=======================================================================+

EditCounterOfferDto validates an in-place edit of a pending counter
offer. This is a TRUE in-place edit --- the same counter offer record is
mutated, not superseded. The expiresAt clock is NOT reset on edit (only
the submitter\'s terms update). The event emitted is
offer.counter_edited (NOT offer.countered).

+-----------------------------------------------------------------------+
| In-place edit means: same record, same ID, same expiresAt.            |
|                                                                       |
| The TTL clock started when the CO was created and keeps running after |
| an edit.                                                              |
|                                                                       |
| If the talent wants to negotiate further rounds, they must decline    |
| the CO first,                                                         |
|                                                                       |
| wait for the parent offer to restore to PENDING, then submit a new    |
| CO.                                                                   |
|                                                                       |
| The edit event (offer.counter_edited) notifies the other party of the |
| change.                                                               |
+=======================================================================+

  -----------------------------------------------------------------------
  **FILE:
  apps/offer-service/src/counter-offers/dto/edit-counter-offer.dto.ts**
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

+-----------------------------------------------------------------------+
| import {                                                              |
|                                                                       |
| IsInt, IsString, IsOptional, MaxLength, Min, Max,                     |
|                                                                       |
| Length, IsUppercase, ValidateNested,                                  |
|                                                                       |
| } from \'class-validator\';                                           |
|                                                                       |
| import { Type } from \'class-transformer\';                           |
|                                                                       |
| import { WorkScheduleDto } from                                       |
| \'../../common/dto/work-schedule.dto\';                               |
|                                                                       |
| import { IsIso8601DateString } from                                   |
| \'../../common/validators/is-iso8601-date-string.validator\';         |
|                                                                       |
| import { IsFutureDate } from                                          |
| \'../../common/validators/is-future-date.validator\';                 |
|                                                                       |
| import { IsNotTooFarFuture } from                                     |
| \'../../common/validators/is-not-too-far-future.validator\';          |
|                                                                       |
| import {                                                              |
|                                                                       |
| MIN_RATE, MAX_RATE, MIN_DURATION_MONTHS, MAX_DURATION_MONTHS,         |
|                                                                       |
| MAX_MESSAGE_LENGTH, CURRENCY_CODE_LENGTH,                             |
|                                                                       |
| } from \'../../common/constants/offer.constants\';                    |
|                                                                       |
| /\*\*                                                                 |
|                                                                       |
| \* EditCounterOfferDto --- Request body for PATCH counter-offers/:id. |
|                                                                       |
| \*                                                                    |
|                                                                       |
| \* Auth: JWT. Must be the submitter of the counter offer.             |
|                                                                       |
| \* Idempotency: X-Idempotency-Key required.                           |
|                                                                       |
| \* Counter offer must be in PENDING status.                           |
|                                                                       |
| \*                                                                    |
|                                                                       |
| \* All fields optional. At least one required (enforced in service).  |
|                                                                       |
| \* expiresAt is NOT reset. The original TTL clock continues.          |
|                                                                       |
| \* Emits: offer.counter_edited (NOT offer.countered).                 |
|                                                                       |
| \*/                                                                   |
|                                                                       |
| export class EditCounterOfferDto {                                    |
|                                                                       |
| \@IsOptional()                                                        |
|                                                                       |
| \@IsInt({ message: \'rate must be a whole number.\' })                |
|                                                                       |
| \@Min(MIN_RATE, { message: \`rate must be at least \$\${MIN_RATE}.\`  |
| })                                                                    |
|                                                                       |
| \@Max(MAX_RATE, { message: \`rate cannot exceed \$\${MAX_RATE}.\` })  |
|                                                                       |
| \@Type(() =\> Number)                                                 |
|                                                                       |
| rate?: number;                                                        |
|                                                                       |
| \@IsOptional()                                                        |
|                                                                       |
| \@IsString()                                                          |
|                                                                       |
| \@Length(CURRENCY_CODE_LENGTH, CURRENCY_CODE_LENGTH, {                |
|                                                                       |
| message: \'currencyCode must be exactly 3 characters.\',              |
|                                                                       |
| })                                                                    |
|                                                                       |
| \@IsUppercase({ message: \'currencyCode must be uppercase.\' })       |
|                                                                       |
| currencyCode?: string;                                                |
|                                                                       |
| \@IsOptional()                                                        |
|                                                                       |
| \@IsInt({ message: \'durationMonths must be a whole number.\' })      |
|                                                                       |
| \@Min(MIN_DURATION_MONTHS, { message: \`durationMonths must be at     |
| least \${MIN_DURATION_MONTHS}.\` })                                   |
|                                                                       |
| \@Max(MAX_DURATION_MONTHS, { message: \`durationMonths cannot exceed  |
| \${MAX_DURATION_MONTHS}.\` })                                         |
|                                                                       |
| \@Type(() =\> Number)                                                 |
|                                                                       |
| durationMonths?: number;                                              |
|                                                                       |
| \@IsOptional()                                                        |
|                                                                       |
| \@ValidateNested()                                                    |
|                                                                       |
| \@Type(() =\> WorkScheduleDto)                                        |
|                                                                       |
| workSchedule?: WorkScheduleDto;                                       |
|                                                                       |
| \@IsOptional()                                                        |
|                                                                       |
| \@IsString()                                                          |
|                                                                       |
| \@IsIso8601DateString()                                               |
|                                                                       |
| \@IsFutureDate()                                                      |
|                                                                       |
| \@IsNotTooFarFuture()                                                 |
|                                                                       |
| startDate?: string;                                                   |
|                                                                       |
| \@IsOptional()                                                        |
|                                                                       |
| \@IsString()                                                          |
|                                                                       |
| \@MaxLength(MAX_MESSAGE_LENGTH, {                                     |
|                                                                       |
| message: \`message cannot exceed \${MAX_MESSAGE_LENGTH}               |
| characters.\`,                                                        |
|                                                                       |
| })                                                                    |
|                                                                       |
| message?: string;                                                     |
|                                                                       |
| }                                                                     |
+=======================================================================+

+-----------------------------------------------------------------------+
| **Step 14 WithdrawCounterOfferDto**                                   |
|                                                                       |
| POST /v1/offers/:offerId/counter-offers/:id/withdraw                  |
+=======================================================================+

WithdrawCounterOfferDto validates the optional withdrawal message. When
a counter offer is withdrawn, the parent offer is automatically restored
to PENDING (unless the parent offer independently expired during the
counter offer period). Both the updated counter offer and updated parent
offer are returned in the response.

  ---------------------------------------------------------------------------
  **FILE:
  apps/offer-service/src/counter-offers/dto/withdraw-counter-offer.dto.ts**
  ---------------------------------------------------------------------------

  ---------------------------------------------------------------------------

+-----------------------------------------------------------------------+
| import { IsOptional, IsString, MaxLength } from \'class-validator\';  |
|                                                                       |
| import { MAX_MESSAGE_LENGTH } from                                    |
| \'../../common/constants/offer.constants\';                           |
|                                                                       |
| /\*\*                                                                 |
|                                                                       |
| \* WithdrawCounterOfferDto --- POST                                   |
| /v1/offers/:offerId/counter-offers/:id/withdraw.                      |
|                                                                       |
| \*                                                                    |
|                                                                       |
| \* Auth: JWT. Must be the submitter of the counter offer.             |
|                                                                       |
| \* Idempotency: X-Idempotency-Key required.                           |
|                                                                       |
| \* Counter offer must be in PENDING status.                           |
|                                                                       |
| \*                                                                    |
|                                                                       |
| \* Side effects:                                                      |
|                                                                       |
| \* - CO status = WITHDRAWN, withdrawnAt = NOW()                       |
|                                                                       |
| \* - Parent offer status restored to PENDING (if not independently    |
| expired)                                                              |
|                                                                       |
| \* - offer.counter_withdrawn event emitted                            |
|                                                                       |
| \* - Other party notified: \"Counter Offer Withdrawn\" with \"View    |
| Active Offer\" CTA                                                    |
|                                                                       |
| \* - Response includes both { counterOffer, parentOffer }             |
|                                                                       |
| \*/                                                                   |
|                                                                       |
| export class WithdrawCounterOfferDto {                                |
|                                                                       |
| \@IsOptional()                                                        |
|                                                                       |
| \@IsString()                                                          |
|                                                                       |
| \@MaxLength(MAX_MESSAGE_LENGTH, {                                     |
|                                                                       |
| message: \`message cannot exceed \${MAX_MESSAGE_LENGTH}               |
| characters.\`,                                                        |
|                                                                       |
| })                                                                    |
|                                                                       |
| message?: string;                                                     |
|                                                                       |
| }                                                                     |
+=======================================================================+

+-----------------------------------------------------------------------+
| **Step 15 Offer Response Interfaces**                                 |
|                                                                       |
| TypeScript interfaces for all offer API response shapes               |
+=======================================================================+

Response interfaces define the exact TypeScript types returned by every
offer endpoint. These are NOT class instances with decorators --- they
are plain TypeScript interfaces. Services use these types to ensure they
return the correct shape. The frontend TypeScript types should mirror
these exactly.

  ------------------------------------------------------------------------
  **FILE:
  apps/offer-service/src/offers/interfaces/offer-response.interface.ts**
  ------------------------------------------------------------------------

  ------------------------------------------------------------------------

+-----------------------------------------------------------------------+
| import { OfferStatus } from \'../enums/offer-status.enum\';           |
|                                                                       |
| import { ContractType } from \'../enums/contract-type.enum\';         |
|                                                                       |
| import { WorkScheduleType } from                                      |
| \'../enums/work-schedule-type.enum\';                                 |
|                                                                       |
| // ============================================================       |
|                                                                       |
| // Shared types                                                       |
|                                                                       |
| // ============================================================       |
|                                                                       |
| /\*\* WorkSchedule as returned in all API responses. \*/              |
|                                                                       |
| export interface WorkScheduleResponse {                               |
|                                                                       |
| type: WorkScheduleType;                                               |
|                                                                       |
| hoursPerWeek?: number; // Only present when type = CUSTOM             |
|                                                                       |
| }                                                                     |
|                                                                       |
| // ============================================================       |
|                                                                       |
| // Primary offer response                                             |
|                                                                       |
| // ============================================================       |
|                                                                       |
| /\*\*                                                                 |
|                                                                       |
| \* OfferResponse --- Returned by:                                     |
|                                                                       |
| \* POST /v1/offers (201)                                              |
|                                                                       |
| \* GET /v1/offers/:id (200)                                           |
|                                                                       |
| \* PATCH /v1/offers/:id (200)                                         |
|                                                                       |
| \* POST /v1/offers/:id/accept (200)                                   |
|                                                                       |
| \* POST /v1/offers/:id/decline (200)                                  |
|                                                                       |
| \* POST /v1/offers/:id/withdraw (200)                                 |
|                                                                       |
| \*/                                                                   |
|                                                                       |
| export interface OfferResponse {                                      |
|                                                                       |
| id: string; // UUID                                                   |
|                                                                       |
| clientId: string; // UUID                                             |
|                                                                       |
| talentId: string; // UUID                                             |
|                                                                       |
| jobListingId: string; // UUID                                         |
|                                                                       |
| contractType: ContractType; // PROJECT \| SERVICE \| TEAM \| CONTRACT |
|                                                                       |
| contractTitle: string;                                                |
|                                                                       |
| status: OfferStatus; // Current status                                |
|                                                                       |
| rate: number; // Integer. No decimals.                                |
|                                                                       |
| currencyCode: string; // ISO 4217 (e.g. USD)                          |
|                                                                       |
| durationMonths: number; // Integer                                    |
|                                                                       |
| workSchedule: WorkScheduleResponse;                                   |
|                                                                       |
| startDate: string; // YYYY-MM-DD                                      |
|                                                                       |
| startDateDisplay: string; // \"Monday, Jan 30, 2025\"                 |
|                                                                       |
| message: string \| null; // null if not provided                      |
|                                                                       |
| expiresAt: string; // ISO 8601 datetime (UTC)                         |
|                                                                       |
| createdAt: string; // ISO 8601 datetime (UTC)                         |
|                                                                       |
| updatedAt: string; // ISO 8601 datetime (UTC)                         |
|                                                                       |
| acceptedAt: string \| null;                                           |
|                                                                       |
| declinedAt: string \| null;                                           |
|                                                                       |
| withdrawnAt: string \| null;                                          |
|                                                                       |
| expiredAt: string \| null;                                            |
|                                                                       |
| warningSentAt: string \| null;                                        |
|                                                                       |
| }                                                                     |
|                                                                       |
| // ============================================================       |
|                                                                       |
| // Resend response                                                    |
|                                                                       |
| // ============================================================       |
|                                                                       |
| /\*\*                                                                 |
|                                                                       |
| \* ResendOfferResponse --- Returned by POST /v1/offers/:id/resend     |
| (201)                                                                 |
|                                                                       |
| \*                                                                    |
|                                                                       |
| \* Extends OfferResponse with originalOfferId.                        |
|                                                                       |
| \* The returned offer is the NEW offer (PENDING status, new           |
| expiresAt).                                                           |
|                                                                       |
| \* The original offer is unchanged in its terminal state.             |
|                                                                       |
| \*/                                                                   |
|                                                                       |
| export interface ResendOfferResponse extends OfferResponse {          |
|                                                                       |
| originalOfferId: string; // ID of the original                        |
| EXPIRED\|DECLINED\|WITHDRAWN offer                                    |
|                                                                       |
| }                                                                     |
|                                                                       |
| // ============================================================       |
|                                                                       |
| // Offer history response                                             |
|                                                                       |
| // ============================================================       |
|                                                                       |
| /\*\* Terms snapshot stored at each history event. \*/                |
|                                                                       |
| export interface OfferHistoryTerms {                                  |
|                                                                       |
| rate: number;                                                         |
|                                                                       |
| currencyCode: string;                                                 |
|                                                                       |
| durationMonths: number;                                               |
|                                                                       |
| workSchedule: WorkScheduleResponse;                                   |
|                                                                       |
| startDate: string;                                                    |
|                                                                       |
| startDateDisplay: string;                                             |
|                                                                       |
| message: string \| null;                                              |
|                                                                       |
| }                                                                     |
|                                                                       |
| /\*\* A single event in the offer history timeline. \*/               |
|                                                                       |
| export interface OfferHistoryEvent {                                  |
|                                                                       |
| id: string;                                                           |
|                                                                       |
| offerId: string;                                                      |
|                                                                       |
| eventType: string; // e.g. \'offer.created\', \'offer.edited\',       |
| \'offer.countered\'                                                   |
|                                                                       |
| actor: \'CLIENT\' \| \'TALENT\' \| \'SYSTEM\';                        |
|                                                                       |
| actorId: string;                                                      |
|                                                                       |
| terms: OfferHistoryTerms; // Full terms snapshot at this event        |
|                                                                       |
| createdAt: string;                                                    |
|                                                                       |
| }                                                                     |
|                                                                       |
| /\*\*                                                                 |
|                                                                       |
| \* OfferHistoryResponse --- Returned by GET /v1/offers/:id/history    |
| (200)                                                                 |
|                                                                       |
| \* Cursor-based pagination. Max 50 events per page.                   |
|                                                                       |
| \*/                                                                   |
|                                                                       |
| export interface OfferHistoryResponse {                               |
|                                                                       |
| data: OfferHistoryEvent\[\];                                          |
|                                                                       |
| nextCursor: string \| null; // Pass as ?cursor= on the next request.  |
| null if last page.                                                    |
|                                                                       |
| total: number; // Total event count across all pages                  |
|                                                                       |
| }                                                                     |
+=======================================================================+

+-----------------------------------------------------------------------+
| **Step 16 Counter Offer Response Interfaces**                         |
|                                                                       |
| TypeScript interfaces for counter offer API responses                 |
+=======================================================================+

  ----------------------------------------------------------------------------------------
  **FILE:
  apps/offer-service/src/counter-offers/interfaces/counter-offer-response.interface.ts**
  ----------------------------------------------------------------------------------------

  ----------------------------------------------------------------------------------------

+-----------------------------------------------------------------------+
| import { CounterOfferStatus } from                                    |
| \'../enums/counter-offer-status.enum\';                               |
|                                                                       |
| import { WorkScheduleResponse, OfferResponse } from                   |
| \'../../offers/interfaces/offer-response.interface\';                 |
|                                                                       |
| /\*\*                                                                 |
|                                                                       |
| \* CounterOfferResponse --- Returned by:                              |
|                                                                       |
| \* POST /v1/offers/:offerId/counter-offers (201)                      |
|                                                                       |
| \* GET /v1/offers/:offerId/counter-offers/:id (200)                   |
|                                                                       |
| \* PATCH /v1/offers/:offerId/counter-offers/:id (200)                 |
|                                                                       |
| \* POST \.../accept (200)                                             |
|                                                                       |
| \*/                                                                   |
|                                                                       |
| export interface CounterOfferResponse {                               |
|                                                                       |
| id: string; // UUID                                                   |
|                                                                       |
| offerId: string; // Parent offer UUID                                 |
|                                                                       |
| submittedBy: \'CLIENT\' \| \'TALENT\';                                |
|                                                                       |
| submittedById: string;                                                |
|                                                                       |
| status: CounterOfferStatus;                                           |
|                                                                       |
| rate: number;                                                         |
|                                                                       |
| currencyCode: string;                                                 |
|                                                                       |
| durationMonths: number;                                               |
|                                                                       |
| workSchedule: WorkScheduleResponse;                                   |
|                                                                       |
| startDate: string; // YYYY-MM-DD                                      |
|                                                                       |
| startDateDisplay: string; // \"Monday, Jan 30, 2025\"                 |
|                                                                       |
| message: string \| null;                                              |
|                                                                       |
| expiresAt: string; // ISO 8601 datetime (UTC)                         |
|                                                                       |
| createdAt: string;                                                    |
|                                                                       |
| updatedAt: string;                                                    |
|                                                                       |
| acceptedAt: string \| null;                                           |
|                                                                       |
| declinedAt: string \| null;                                           |
|                                                                       |
| withdrawnAt: string \| null;                                          |
|                                                                       |
| rateWarning: boolean; // true if rate exceeds threshold (advisory     |
| only)                                                                 |
|                                                                       |
| }                                                                     |
|                                                                       |
| /\*\*                                                                 |
|                                                                       |
| \* DeclineCounterOfferResponse --- Returned by POST \.../decline      |
| (200)                                                                 |
|                                                                       |
| \*                                                                    |
|                                                                       |
| \* Both records are returned because declining a CO restores the      |
| parent offer.                                                         |
|                                                                       |
| \* The frontend needs both to update its state in a single render     |
| cycle.                                                                |
|                                                                       |
| \*/                                                                   |
|                                                                       |
| export interface DeclineCounterOfferResponse {                        |
|                                                                       |
| counterOffer: CounterOfferResponse; // status: DECLINED               |
|                                                                       |
| parentOffer: OfferResponse; // status: PENDING (restored)             |
|                                                                       |
| }                                                                     |
|                                                                       |
| /\*\*                                                                 |
|                                                                       |
| \* WithdrawCounterOfferResponse --- Returned by POST \.../withdraw    |
| (200)                                                                 |
|                                                                       |
| \*                                                                    |
|                                                                       |
| \* Same dual-record response as decline: both CO and parent offer     |
| returned.                                                             |
|                                                                       |
| \*/                                                                   |
|                                                                       |
| export interface WithdrawCounterOfferResponse {                       |
|                                                                       |
| counterOffer: CounterOfferResponse; // status: WITHDRAWN              |
|                                                                       |
| parentOffer: OfferResponse; // status: PENDING (restored)             |
|                                                                       |
| }                                                                     |
+=======================================================================+

+-----------------------------------------------------------------------+
| **Step 17 Verification --- Test Your DTOs**                           |
|                                                                       |
| Confirm all validators work before writing services                   |
+=======================================================================+

Run these manual curl commands after starting the service (npm run
start:dev \--project=offer-service). Each test confirms a specific
validation rule. All should return 422 with the expected field-level
error before OffersService is implemented, because ValidationPipe runs
before any service method.

## **Test 1 --- Rate validation**

+---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------+
| \# Rate too low (0) --- should return 422                                                                                                                                                                                                                                                                     |
|                                                                                                                                                                                                                                                                                                               |
| curl -s -X POST http://localhost:3005/v1/offers \\                                                                                                                                                                                                                                                            |
|                                                                                                                                                                                                                                                                                                               |
| -H \"Authorization: Bearer \<client_jwt\>\" \\                                                                                                                                                                                                                                                                |
|                                                                                                                                                                                                                                                                                                               |
| -H \"Content-Type: application/json\" \\                                                                                                                                                                                                                                                                      |
|                                                                                                                                                                                                                                                                                                               |
| -H \"X-Idempotency-Key: \$(uuidgen)\" \\                                                                                                                                                                                                                                                                      |
|                                                                                                                                                                                                                                                                                                               |
| -d \'{\"talentId\":\"00000000-0000-0000-0000-000000000001\",\"jobListingId\":\"00000000-0000-0000-0000-000000000002\",\"contractType\":\"TEAM\",\"contractTitle\":\"Test\",\"rate\":0,\"currencyCode\":\"USD\",\"durationMonths\":3,\"workSchedule\":{\"type\":\"FULL_TIME\"},\"startDate\":\"2099-01-01\"}\' |
| \| jq .statusCode                                                                                                                                                                                                                                                                                             |
|                                                                                                                                                                                                                                                                                                               |
| \# Expected: 422                                                                                                                                                                                                                                                                                              |
|                                                                                                                                                                                                                                                                                                               |
| \# Rate decimal (45.5) --- should return 422                                                                                                                                                                                                                                                                  |
|                                                                                                                                                                                                                                                                                                               |
| curl -s -X POST http://localhost:3005/v1/offers \\                                                                                                                                                                                                                                                            |
|                                                                                                                                                                                                                                                                                                               |
| -H \"Authorization: Bearer \<client_jwt\>\" \\                                                                                                                                                                                                                                                                |
|                                                                                                                                                                                                                                                                                                               |
| -H \"Content-Type: application/json\" \\                                                                                                                                                                                                                                                                      |
|                                                                                                                                                                                                                                                                                                               |
| -H \"X-Idempotency-Key: \$(uuidgen)\" \\                                                                                                                                                                                                                                                                      |
|                                                                                                                                                                                                                                                                                                               |
| -d                                                                                                                                                                                                                                                                                                            |
| \'{\"talentId\":\"00000000-0000-0000-0000-000000000001\",\"jobListingId\":\"00000000-0000-0000-0000-000000000002\",\"contractType\":\"TEAM\",\"contractTitle\":\"Test\",\"rate\":45.5,\"currencyCode\":\"USD\",\"durationMonths\":3,\"workSchedule\":{\"type\":\"FULL_TIME\"},\"startDate\":\"2099-01-01\"}\' |
| \| jq .message                                                                                                                                                                                                                                                                                                |
|                                                                                                                                                                                                                                                                                                               |
| \# Expected: error mentioning \"whole number\"                                                                                                                                                                                                                                                                |
+===============================================================================================================================================================================================================================================================================================================+

## **Test 2 --- Start date validation**

+-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------+
| \# Past date --- should return 422                                                                                                                                                                                                                                                                          |
|                                                                                                                                                                                                                                                                                                             |
| curl -s -X POST http://localhost:3005/v1/offers \\                                                                                                                                                                                                                                                          |
|                                                                                                                                                                                                                                                                                                             |
| -H \"Authorization: Bearer \<client_jwt\>\" \\                                                                                                                                                                                                                                                              |
|                                                                                                                                                                                                                                                                                                             |
| -H \"Content-Type: application/json\" \\                                                                                                                                                                                                                                                                    |
|                                                                                                                                                                                                                                                                                                             |
| -H \"X-Idempotency-Key: \$(uuidgen)\" \\                                                                                                                                                                                                                                                                    |
|                                                                                                                                                                                                                                                                                                             |
| -d                                                                                                                                                                                                                                                                                                          |
| \'{\"talentId\":\"00000000-0000-0000-0000-000000000001\",\"jobListingId\":\"00000000-0000-0000-0000-000000000002\",\"contractType\":\"TEAM\",\"contractTitle\":\"Test\",\"rate\":45,\"currencyCode\":\"USD\",\"durationMonths\":3,\"workSchedule\":{\"type\":\"FULL_TIME\"},\"startDate\":\"2020-01-01\"}\' |
| \| jq .message                                                                                                                                                                                                                                                                                              |
|                                                                                                                                                                                                                                                                                                             |
| \# Expected: error mentioning \"must not be in the past\"                                                                                                                                                                                                                                                   |
|                                                                                                                                                                                                                                                                                                             |
| \# Invalid date string (not YYYY-MM-DD) --- should return 422                                                                                                                                                                                                                                               |
|                                                                                                                                                                                                                                                                                                             |
| curl -s -X POST http://localhost:3005/v1/offers \\                                                                                                                                                                                                                                                          |
|                                                                                                                                                                                                                                                                                                             |
| -H \"Authorization: Bearer \<client_jwt\>\" \\                                                                                                                                                                                                                                                              |
|                                                                                                                                                                                                                                                                                                             |
| -H \"Content-Type: application/json\" \\                                                                                                                                                                                                                                                                    |
|                                                                                                                                                                                                                                                                                                             |
| -H \"X-Idempotency-Key: \$(uuidgen)\" \\                                                                                                                                                                                                                                                                    |
|                                                                                                                                                                                                                                                                                                             |
| -d                                                                                                                                                                                                                                                                                                          |
| \'{\"talentId\":\"00000000-0000-0000-0000-000000000001\",\"jobListingId\":\"00000000-0000-0000-0000-000000000002\",\"contractType\":\"TEAM\",\"contractTitle\":\"Test\",\"rate\":45,\"currencyCode\":\"USD\",\"durationMonths\":3,\"workSchedule\":{\"type\":\"FULL_TIME\"},\"startDate\":\"01/30/2025\"}\' |
| \| jq .message                                                                                                                                                                                                                                                                                              |
|                                                                                                                                                                                                                                                                                                             |
| \# Expected: error mentioning \"YYYY-MM-DD format\"                                                                                                                                                                                                                                                         |
+=============================================================================================================================================================================================================================================================================================================+

## **Test 3 --- contractTitle conditional validation**

+-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------+
| \# TEAM without contractTitle --- should return 422                                                                                                                                                                                                                                 |
|                                                                                                                                                                                                                                                                                     |
| curl -s -X POST http://localhost:3005/v1/offers \\                                                                                                                                                                                                                                  |
|                                                                                                                                                                                                                                                                                     |
| -H \"Authorization: Bearer \<client_jwt\>\" \\                                                                                                                                                                                                                                      |
|                                                                                                                                                                                                                                                                                     |
| -H \"Content-Type: application/json\" \\                                                                                                                                                                                                                                            |
|                                                                                                                                                                                                                                                                                     |
| -H \"X-Idempotency-Key: \$(uuidgen)\" \\                                                                                                                                                                                                                                            |
|                                                                                                                                                                                                                                                                                     |
| -d \'{\"talentId\":\"00000000-0000-0000-0000-000000000001\",\"jobListingId\":\"00000000-0000-0000-0000-000000000002\",\"contractType\":\"TEAM\",\"rate\":45,\"currencyCode\":\"USD\",\"durationMonths\":3,\"workSchedule\":{\"type\":\"FULL_TIME\"},\"startDate\":\"2099-01-01\"}\' |
| \| jq .message                                                                                                                                                                                                                                                                      |
|                                                                                                                                                                                                                                                                                     |
| \# Expected: error mentioning \"contractTitle is required\"                                                                                                                                                                                                                         |
|                                                                                                                                                                                                                                                                                     |
| \# PROJECT without contractTitle --- should PASS (201 or 409 if active offer exists)                                                                                                                                                                                                |
|                                                                                                                                                                                                                                                                                     |
| curl -s -o /dev/null -w \"%{http_code}\" -X POST http://localhost:3005/v1/offers \\                                                                                                                                                                                                 |
|                                                                                                                                                                                                                                                                                     |
| -H \"Authorization: Bearer \<client_jwt\>\" \\                                                                                                                                                                                                                                      |
|                                                                                                                                                                                                                                                                                     |
| -H \"Content-Type: application/json\" \\                                                                                                                                                                                                                                            |
|                                                                                                                                                                                                                                                                                     |
| -H \"X-Idempotency-Key: \$(uuidgen)\" \\                                                                                                                                                                                                                                            |
|                                                                                                                                                                                                                                                                                     |
| -d                                                                                                                                                                                                                                                                                  |
| \'{\"talentId\":\"00000000-0000-0000-0000-000000000001\",\"jobListingId\":\"00000000-0000-0000-0000-000000000002\",\"contractType\":\"PROJECT\",\"rate\":45,\"currencyCode\":\"USD\",\"durationMonths\":3,\"workSchedule\":{\"type\":\"FULL_TIME\"},\"startDate\":\"2099-01-01\"}\' |
|                                                                                                                                                                                                                                                                                     |
| \# Expected: 201 or 409 (not 422 --- validation passed)                                                                                                                                                                                                                             |
+=====================================================================================================================================================================================================================================================================================+

## **Test 4 --- workSchedule.hoursPerWeek conditional validation**

+------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------+
| \# CUSTOM without hoursPerWeek --- should return 422                                                                                                                                                                                                                                                                         |
|                                                                                                                                                                                                                                                                                                                              |
| curl -s -X POST http://localhost:3005/v1/offers \\                                                                                                                                                                                                                                                                           |
|                                                                                                                                                                                                                                                                                                                              |
| -H \"Authorization: Bearer \<client_jwt\>\" \\                                                                                                                                                                                                                                                                               |
|                                                                                                                                                                                                                                                                                                                              |
| -H \"Content-Type: application/json\" \\                                                                                                                                                                                                                                                                                     |
|                                                                                                                                                                                                                                                                                                                              |
| -H \"X-Idempotency-Key: \$(uuidgen)\" \\                                                                                                                                                                                                                                                                                     |
|                                                                                                                                                                                                                                                                                                                              |
| -d \'{\"talentId\":\"00000000-0000-0000-0000-000000000001\",\"jobListingId\":\"00000000-0000-0000-0000-000000000002\",\"contractType\":\"TEAM\",\"contractTitle\":\"Test\",\"rate\":45,\"currencyCode\":\"USD\",\"durationMonths\":3,\"workSchedule\":{\"type\":\"CUSTOM\"},\"startDate\":\"2099-01-01\"}\' \| jq .message   |
|                                                                                                                                                                                                                                                                                                                              |
| \# Expected: error mentioning \"hoursPerWeek\"                                                                                                                                                                                                                                                                               |
|                                                                                                                                                                                                                                                                                                                              |
| \# CUSTOM with hoursPerWeek = 40 --- should PASS validation                                                                                                                                                                                                                                                                  |
|                                                                                                                                                                                                                                                                                                                              |
| curl -s -X POST http://localhost:3005/v1/offers \\                                                                                                                                                                                                                                                                           |
|                                                                                                                                                                                                                                                                                                                              |
| -H \"Authorization: Bearer \<client_jwt\>\" \\                                                                                                                                                                                                                                                                               |
|                                                                                                                                                                                                                                                                                                                              |
| -H \"Content-Type: application/json\" \\                                                                                                                                                                                                                                                                                     |
|                                                                                                                                                                                                                                                                                                                              |
| -H \"X-Idempotency-Key: \$(uuidgen)\" \\                                                                                                                                                                                                                                                                                     |
|                                                                                                                                                                                                                                                                                                                              |
| -d                                                                                                                                                                                                                                                                                                                           |
| \'{\"talentId\":\"00000000-0000-0000-0000-000000000001\",\"jobListingId\":\"00000000-0000-0000-0000-000000000002\",\"contractType\":\"TEAM\",\"contractTitle\":\"Test\",\"rate\":45,\"currencyCode\":\"USD\",\"durationMonths\":3,\"workSchedule\":{\"type\":\"CUSTOM\",\"hoursPerWeek\":40},\"startDate\":\"2099-01-01\"}\' |
| \| jq .statusCode                                                                                                                                                                                                                                                                                                            |
|                                                                                                                                                                                                                                                                                                                              |
| \# Expected: 201 or 409 (not 422)                                                                                                                                                                                                                                                                                            |
+==============================================================================================================================================================================================================================================================================================================================+

## **Test 5 --- Decline reason required**

+------------------------------------------------------------------------------+
| \# Decline with empty reason --- should return 422                           |
|                                                                              |
| curl -s -X POST                                                              |
| http://localhost:3005/v1/offers/00000000-0000-0000-0000-000000000001/decline |
| \\                                                                           |
|                                                                              |
| -H \"Authorization: Bearer \<talent_jwt\>\" \\                               |
|                                                                              |
| -H \"Content-Type: application/json\" \\                                     |
|                                                                              |
| -H \"X-Idempotency-Key: \$(uuidgen)\" \\                                     |
|                                                                              |
| -d \'{\"reason\":\"\"}\' \| jq .message                                      |
|                                                                              |
| \# Expected: 422 with error mentioning \"reason is required\"                |
|                                                                              |
| \# Decline with valid reason and chip                                        |
|                                                                              |
| curl -s -X POST                                                              |
| http://localhost:3005/v1/offers/00000000-0000-0000-0000-000000000001/decline |
| \\                                                                           |
|                                                                              |
| -H \"Authorization: Bearer \<talent_jwt\>\" \\                               |
|                                                                              |
| -H \"Content-Type: application/json\" \\                                     |
|                                                                              |
| -H \"X-Idempotency-Key: \$(uuidgen)\" \\                                     |
|                                                                              |
| -d \'{\"reason\":\"The budget does not match my current                      |
| rate\",\"chip\":\"BUDGET_DOESNT_WORK\"}\' \| jq .statusCode                  |
|                                                                              |
| \# Expected: 200 (offer declined) or 404 (offer not found)                   |
+==============================================================================+

+-----------------------------------------------------------------------+
| If validation passes but you get 500 instead of 422:                  |
|                                                                       |
| The DTO is not imported in the controller, or the service method is   |
| throwing.                                                             |
|                                                                       |
| A 500 means the request passed validation and reached service code.   |
|                                                                       |
| A 422 means validation caught the error before reaching the service.  |
|                                                                       |
| If unknown fields are not being stripped:                             |
|                                                                       |
| Confirm ValidationPipe has whitelist: true in main.ts.                |
|                                                                       |
| Confirm the controller uses \@Body() dto: CreateOfferDto (typed, not  |
| any).                                                                 |
|                                                                       |
| If hoursPerWeek is not being validated on CUSTOM:                     |
|                                                                       |
| Confirm \@ValidateNested() and \@Type(() =\> WorkScheduleDto) are     |
| both on workSchedule.                                                 |
|                                                                       |
| Both are required. Missing either one causes the nested object to     |
| skip validation.                                                      |
+=======================================================================+
