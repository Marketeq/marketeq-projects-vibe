// Mirrors backend/apps/offer-service/src/offers/interfaces/offer-response.interface.ts,
// backend/apps/offer-service/src/offers/dto/list-offers-query.dto.ts, and the *.dto.ts
// files under offers/dto and counter-offers/dto — field-for-field, not an assumed shape.
//
// Several of the backend's *-response.interface.ts types are aspirational: the
// controllers/services don't actually build those shapes, they return raw
// TypeORM entities (or ad-hoc wrapper objects) instead. Where that's the case
// (getOffer/acceptOffer/declineOffer/withdrawOffer/resendOffer, counter-offer
// create/accept/decline, history), the types below mirror what the service
// methods actually return (confirmed against offers.service.ts /
// counter-offers.service.ts's mapRawToOffer/mapRawToCO and the entities), not
// the interface file's promised-but-unbuilt shape. OfferListItem/
// PaginatedOfferListResponse are the one place the interface IS what's
// actually returned, since that endpoint was built directly against it.

// An ISO 8601 timestamp exactly as the API delivers it — service/index.ts's
// axios instance has no transformResponse or date reviver, so JSON.parse
// yields a plain string here, never a Date. Do not type these fields as
// Date: a consumer calling offer.expiresAt.getTime() would typecheck clean
// and throw at runtime. Conversion to a real Date belongs at the
// view-model boundary (the page/hook that reads this), not in this file or
// in service/http/offers.ts.
export type IsoDateString = string

export type OfferStatus =
  "PENDING" | "ACCEPTED" | "DECLINED" | "WITHDRAWN" | "EXPIRED" | "COUNTERED"

export type ContractType = "PROJECT" | "SERVICE" | "TEAM" | "CONTRACT"

export type WorkScheduleType = "FULL_TIME" | "PART_TIME" | "CUSTOM"

export type DeclineChip =
  | "BUDGET_DOESNT_WORK"
  | "START_DATE_DOESNT_WORK"
  | "REQUIREMENTS_UNCLEAR"
  | "NOT_A_FIT"
  | "TOO_BUSY"
  | "NEED_DIFFERENT_TERMS"

export type CounterOfferStatus =
  "PENDING" | "ACCEPTED" | "DECLINED" | "WITHDRAWN" | "EXPIRED" | "SUPERSEDED"

export type OfferParty = "CLIENT" | "TALENT"

export type OfferListSortField = "createdAt" | "expiresAt"
export type SortOrder = "asc" | "desc"
// Mirrors ListOffersQueryDto's `as` param — lowercase, unlike OfferParty
// (the response-side "CLIENT" | "TALENT" union), since this is a request
// query value, not an echoed enum.
export type ViewerRoleFilter = "client" | "talent"

export interface WorkScheduleResponse {
  type: WorkScheduleType
  hoursPerWeek?: number // Only present when type = CUSTOM
}

export interface CreateOfferPayload {
  talentId: string
  jobListingId: string
  contractType: ContractType
  contractTitle?: string
  rate: number
  currencyCode: string
  durationMonths: number
  workSchedule: WorkScheduleResponse
  startDate: string
  message?: string
}

// ---- Main offer entity shape ----
// What GET/accept/decline/withdraw/resend on /v1/offers/:id actually return
// (offers.service.ts's mapRawToOffer / findByIdOrThrow), not OfferResponse —
// see the file header. Note declinedChip is a plain string on the entity
// (offer.entity.ts), not narrowed to DeclineChip — the DeclineChip enum only
// constrains the request body (DeclineOfferDto), not the stored/returned value.
export interface Offer {
  id: string
  clientId: string
  talentId: string
  jobListingId: string
  contractType: ContractType
  contractTitle: string
  status: OfferStatus
  rate: number
  currencyCode: string
  durationMonths: number
  workSchedule: WorkScheduleResponse
  startDate: string // YYYY-MM-DD
  message: string | null
  expiresAt: IsoDateString
  warningSentAt: IsoDateString | null
  acceptedAt: IsoDateString | null
  declinedAt: IsoDateString | null
  declinedReason: string | null
  declinedChip: string | null
  withdrawnAt: IsoDateString | null
  withdrawalMessage: string | null
  expiredAt: IsoDateString | null
  originalOfferId: string | null
  createdAt: IsoDateString
  updatedAt: IsoDateString
}

// ---- GET /v1/offers (list) ----
// Mirrors ListOffersQueryDto exactly: sort/order are two separate params,
// not one combined string; status is repeatable.
export interface ListOffersParams {
  status?: OfferStatus[]
  page?: number
  limit?: number
  sort?: OfferListSortField
  order?: SortOrder
  // Default (omitted) scope is "offers where the caller is either party" —
  // this only narrows to one side of that same set; the backend always
  // derives which offers are visible from the JWT's userId, never from
  // this param (list-offers-query.dto.ts).
  as?: ViewerRoleFilter
}

// Mirrors LatestCounterOfferSummary — offer-response.interface.ts.
export interface LatestCounterOfferSummary {
  id: string
  submittedBy: OfferParty
  submittedById: string
  status: CounterOfferStatus
  rate: number
  currencyCode: string
  durationMonths: number
  startDate: string
  createdAt: IsoDateString
}

// Mirrors OfferListItem — offer-response.interface.ts. Deliberately NOT
// OfferResponse: the list endpoint doesn't compute startDateDisplay (see
// that interface's own comment on OfferListItem for why).
export interface OfferListItem {
  id: string
  clientId: string
  talentId: string
  jobListingId: string
  contractType: ContractType
  contractTitle: string
  status: OfferStatus
  rate: number
  currencyCode: string
  durationMonths: number
  workSchedule: WorkScheduleResponse
  startDate: string
  message: string | null
  expiresAt: IsoDateString
  createdAt: IsoDateString
  updatedAt: IsoDateString
  acceptedAt: IsoDateString | null
  declinedAt: IsoDateString | null
  withdrawnAt: IsoDateString | null
  expiredAt: IsoDateString | null
  warningSentAt: IsoDateString | null
  latestCounterOffer: LatestCounterOfferSummary | null
  // Which side of this offer the authenticated caller is on — derived
  // server-side from clientId/talentId vs the JWT's userId
  // (offer-response.interface.ts), never from a client-supplied value.
  // Drives which row actions are offered; do not infer this from
  // anything else.
  viewerRole: OfferParty
}

// Mirrors PaginatedOfferListResponse — offer-response.interface.ts.
export interface PaginatedOfferListResponse {
  data: OfferListItem[]
  total: number
  page: number
  limit: number
}

// ---- Action request bodies (mirror each *.dto.ts field-for-field) ----

// AcceptOfferDto
export interface AcceptOfferPayload {
  message?: string
}

// DeclineOfferDto — reason is required there, no default.
export interface DeclineOfferPayload {
  reason: string
  chip?: DeclineChip
}

// WithdrawOfferDto
export interface WithdrawOfferPayload {
  message?: string
}

// ResendOfferDto — only `message`. offers.service.ts's resend() optionally
// reads other fields off the dto (rate, durationMonths, etc.) but
// ResendOfferDto never declares them, and the global ValidationPipe runs
// with whitelist+forbidNonWhitelisted — sending them would be rejected, not
// silently dropped. Not inventing a wider payload the DTO doesn't accept.
export interface ResendOfferPayload {
  message?: string
}

// ---- GET /v1/offers/:id/history ----
// Mirrors OfferHistoryQueryDto (cursor/limit) and the REAL shape
// offer-history.service.ts's append()/getHistory() produce — the entity
// (offer-history-event.entity.ts) has counterOfferId and a nullable actorId
// that the aspirational OfferHistoryEvent/OfferHistoryTerms interfaces don't
// (and terms never had startDateDisplay to begin with — OfferTermsSnapshot
// on the entity never declared it).
export interface OfferHistoryParams {
  cursor?: string
  limit?: number
}

export interface OfferHistoryTerms {
  rate: number
  currencyCode: string
  durationMonths: number
  workSchedule: WorkScheduleResponse
  startDate: string
  message: string | null
}

export interface OfferHistoryEvent {
  id: string
  offerId: string
  counterOfferId: string | null
  eventType: string
  actor: OfferParty | "SYSTEM"
  actorId: string | null
  terms: OfferHistoryTerms
  createdAt: IsoDateString
}

export interface OfferHistoryResponse {
  data: OfferHistoryEvent[]
  nextCursor: string | null
  total: number
}

// ---- Counter offers ----
// CreateCounterOfferDto — nested workSchedule uses the same shape as
// WorkScheduleDto (type + optional hoursPerWeek when type = CUSTOM).
export interface CreateCounterOfferPayload {
  rate: number
  currencyCode: string
  durationMonths: number
  workSchedule: WorkScheduleResponse
  startDate: string
  message?: string
}

// What counter-offers.service.ts's accept()/decline() actually return: the
// bare CounterOffer entity (mapRawToCO), not the aspirational
// AcceptCounterOfferResponse/DeclineCounterOfferResponse
// { counterOffer, parentOffer } wrapper — the controller returns the
// service's result unwrapped.
export interface CounterOffer {
  id: string
  offerId: string
  submittedBy: OfferParty
  submittedById: string
  status: CounterOfferStatus
  rate: number
  currencyCode: string
  durationMonths: number
  workSchedule: WorkScheduleResponse
  startDate: string
  message: string | null
  expiresAt: IsoDateString
  warningSentAt: IsoDateString | null
  acceptedAt: IsoDateString | null
  declinedAt: IsoDateString | null
  withdrawnAt: IsoDateString | null
  withdrawalMessage: string | null
  expiredAt: IsoDateString | null
  supersededAt: IsoDateString | null
  createdAt: IsoDateString
  updatedAt: IsoDateString
}

// create() is the one counter-offer mutation that DOES wrap its result —
// counter-offers.service.ts returns { counterOffer, rateWarning } precisely
// so the rate-warning advisory flag travels with the response.
export interface CreateCounterOfferResult {
  counterOffer: CounterOffer
  rateWarning: boolean
}
