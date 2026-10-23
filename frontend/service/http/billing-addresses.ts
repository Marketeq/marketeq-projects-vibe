import AxiosRequest from "@/service"
import { getPublicUserUrl } from "@/lib/runtime-urls"

const USER_BASE = getPublicUserUrl()
const BASE = `${USER_BASE}/user/billing-addresses`

export interface BillingAddress {
  id: string
  fullName: string
  addressLine1: string
  addressLine2: string | null
  city: string
  state: string | null
  postalCode: string
  country: string
  phoneNumber: string
}

export interface CreateBillingAddressPayload {
  fullName: string
  addressLine1: string
  addressLine2?: string
  city: string
  state?: string
  postalCode: string
  country: string
  phoneNumber: string
}

export interface ValidateBillingAddressPayload {
  addressLine1: string
  addressLine2?: string
  city: string
  state?: string
  postalCode: string
  country: string
}

export interface RecommendedBillingAddress {
  addressLine1: string
  addressLine2: string | null
  city: string
  state: string | null
  postalCode: string
  country: string
}

export interface BillingAddressValidation {
  status:
    | "verified"
    | "corrected"
    | "unverified"
    | "undeliverable"
    | "unavailable"
  recommended: RecommendedBillingAddress | null
  resultCodes: string[]
}

export const BillingAddressesAPI = {
  list: () => AxiosRequest.get(BASE),
  create: (payload: CreateBillingAddressPayload) =>
    AxiosRequest.post(BASE, payload),
  validate: (payload: ValidateBillingAddressPayload) =>
    AxiosRequest.post(`${BASE}/validate`, payload),
}
