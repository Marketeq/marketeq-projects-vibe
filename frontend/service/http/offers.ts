import type {
  AcceptOfferPayload,
  CounterOffer,
  CreateOfferPayload,
  CreateCounterOfferPayload,
  CreateCounterOfferResult,
  DeclineOfferPayload,
  ListOffersParams,
  Offer,
  OfferHistoryParams,
  OfferHistoryResponse,
  PaginatedOfferListResponse,
  ResendOfferPayload,
  WithdrawOfferPayload,
} from "@/types/offer"
import AxiosRequest from ".."

// api-gateway forwards this prefix to offer-service unchanged (it carries
// its own global 'v1' prefix — unlike contracts-service, which is mounted
// bare at /contracts). See proxy.controller.ts's catchAll: /v1/offers/* and
// /v1/offers/:offerId/counter-offers/* both resolve via the 'offers'
// SERVICE_PREFIX_MAP entry with no path rewrite, so the full /v1/... path
// has to be sent as-is.
const OFFERS_BASE = "/v1/offers"

// Offer-service applies its idempotency interceptor to every write endpoint.
// Generate once per user action here; Axios keeps the same header if its
// session-refresh interceptor retries the original request.
const idempotencyConfig = () => ({
  headers: { "X-Idempotency-Key": crypto.randomUUID() },
})

export const createOffer = async (
  payload: CreateOfferPayload
): Promise<Offer> => {
  const res = await AxiosRequest.post(OFFERS_BASE, payload, idempotencyConfig())
  return res.data
}

export const listOffers = async (
  params?: ListOffersParams
): Promise<PaginatedOfferListResponse> => {
  const query = new URLSearchParams()
  params?.status?.forEach((status) => query.append("status", status))
  if (params?.page !== undefined) query.set("page", String(params.page))
  if (params?.limit !== undefined) query.set("limit", String(params.limit))
  if (params?.sort) query.set("sort", params.sort)
  if (params?.order) query.set("order", params.order)
  if (params?.as) query.set("as", params.as)

  const queryString = query.toString()
  const url = queryString ? `${OFFERS_BASE}?${queryString}` : OFFERS_BASE

  const res = await AxiosRequest.get(url)
  return res.data
}

export const getOffer = async (id: string): Promise<Offer> => {
  const res = await AxiosRequest.get(`${OFFERS_BASE}/${encodeURIComponent(id)}`)
  return res.data
}

export const acceptOffer = async (
  id: string,
  payload?: AcceptOfferPayload
): Promise<Offer> => {
  const res = await AxiosRequest.post(
    `${OFFERS_BASE}/${encodeURIComponent(id)}/accept`,
    payload ?? {},
    idempotencyConfig()
  )
  return res.data
}

export const declineOffer = async (
  id: string,
  payload: DeclineOfferPayload
): Promise<Offer> => {
  const res = await AxiosRequest.post(
    `${OFFERS_BASE}/${encodeURIComponent(id)}/decline`,
    payload,
    idempotencyConfig()
  )
  return res.data
}

export const withdrawOffer = async (
  id: string,
  payload?: WithdrawOfferPayload
): Promise<Offer> => {
  const res = await AxiosRequest.post(
    `${OFFERS_BASE}/${encodeURIComponent(id)}/withdraw`,
    payload ?? {},
    idempotencyConfig()
  )
  return res.data
}

export const resendOffer = async (
  id: string,
  payload?: ResendOfferPayload
): Promise<Offer> => {
  const res = await AxiosRequest.post(
    `${OFFERS_BASE}/${encodeURIComponent(id)}/resend`,
    payload ?? {},
    idempotencyConfig()
  )
  return res.data
}

export const getOfferHistory = async (
  id: string,
  params?: OfferHistoryParams
): Promise<OfferHistoryResponse> => {
  const query = new URLSearchParams()
  if (params?.cursor) query.set("cursor", params.cursor)
  if (params?.limit !== undefined) query.set("limit", String(params.limit))

  const queryString = query.toString()
  const base = `${OFFERS_BASE}/${encodeURIComponent(id)}/history`
  const url = queryString ? `${base}?${queryString}` : base

  const res = await AxiosRequest.get(url)
  return res.data
}

// ---- Counter offers ----
// Mounted under the parent offer (offers/:offerId/counter-offers), not a
// flat /counter-offers — matches counter-offers.controller.ts's
// @Controller('offers/:offerId/counter-offers') exactly.

export const createCounterOffer = async (
  offerId: string,
  payload: CreateCounterOfferPayload
): Promise<CreateCounterOfferResult> => {
  const res = await AxiosRequest.post(
    `${OFFERS_BASE}/${encodeURIComponent(offerId)}/counter-offers`,
    payload,
    idempotencyConfig()
  )
  return res.data
}

export const acceptCounterOffer = async (
  offerId: string,
  counterOfferId: string
): Promise<CounterOffer> => {
  const res = await AxiosRequest.post(
    `${OFFERS_BASE}/${encodeURIComponent(offerId)}/counter-offers/${encodeURIComponent(counterOfferId)}/accept`,
    {},
    idempotencyConfig()
  )
  return res.data
}

export const declineCounterOffer = async (
  offerId: string,
  counterOfferId: string
): Promise<CounterOffer> => {
  const res = await AxiosRequest.post(
    `${OFFERS_BASE}/${encodeURIComponent(offerId)}/counter-offers/${encodeURIComponent(counterOfferId)}/decline`,
    {},
    idempotencyConfig()
  )
  return res.data
}
