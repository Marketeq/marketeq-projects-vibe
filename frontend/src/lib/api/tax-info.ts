// frontend/src/lib/api/tax-info.ts
import { getPublicApiUrl } from "@/lib/runtime-urls"

export type TaxInfo = {
  exists: boolean
  legalFullName?: string | null
  federalTaxClassification?: string | null
  tinType?: string | null
  /** Full TIN is never returned by the API. */
  tinLast4?: string | null
  /** W-9 line 4 codes. Entities only, and optional even then. */
  exemptPayeeCode?: string | null
  fatcaExemptionCode?: string | null
  country?: string | null
  addressLine1?: string | null
  addressLine2?: string | null
  city?: string | null
  stateOrProvince?: string | null
  postalCode?: string | null
  signature?: string | null
  signedDate?: string | null
  consentESignature?: boolean
  consentDigitalDelivery?: boolean
  identificationComplete: boolean
  certificationProgress: number
  submitted: boolean
  /** W-9 for US filers, W-8BEN otherwise. */
  formKind: "W-9" | "W-8BEN"
  forms: TaxForm[]
}

export type TaxForm = {
  id: string
  formType: "W-9" | "W-8BEN" | "1099-NEC" | "1099-K"
  /** Payer for a 1099-NEC, payment provider for a 1099-K. */
  issuerName: string
  /** Amount earned for a 1099-NEC, total processed for a 1099-K. */
  amount: string
  taxYear: string
  downloadUrl: string
  /** PNG render of this form, filled in with the contractor's details. */
  previewUrl?: string
  isLastYear: boolean
}

const base = () =>
  (getPublicApiUrl() || "http://localhost:4000").replace(/\/$/, "")

export async function getTaxInfo(): Promise<TaxInfo | null> {
  try {
    const res = await fetch(`${base()}/user/tax-info`, {
      credentials: "include",
    })
    if (!res.ok) return null
    return res.json()
  } catch {
    return null
  }
}

export async function saveTaxInfo(
  patch: Partial<Omit<TaxInfo, "exists" | "tinLast4" | "identificationComplete" | "certificationProgress">> & {
    tin?: string
  }
): Promise<TaxInfo> {
  const res = await fetch(`${base()}/user/tax-info`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(patch),
  })
  if (!res.ok) {
    const body = await res.json().catch(() => null)
    throw new Error(body?.message ?? "Could not save your tax information")
  }
  return res.json()
}

/** Certify the W-9. Produces the downloadable documents. */
export async function submitTaxInfo(): Promise<TaxInfo> {
  const res = await fetch(`${base()}/user/tax-info/submit`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
  })
  if (!res.ok) {
    const body = await res.json().catch(() => null)
    throw new Error(body?.message ?? "Could not submit your tax information")
  }
  return res.json()
}

/**
 * Loads the filled-in render of a form as an object URL.
 *
 * The preview is behind the same auth as the download, and a plain `<img>`
 * would not carry credentials cross-origin, so it is fetched the same way the
 * rest of this module fetches and handed back as a blob URL. Callers must
 * revoke the URL when they are done with it.
 */
export async function getTaxFormPreview(
  previewUrl: string
): Promise<string | null> {
  try {
    const res = await fetch(`${base()}${previewUrl}`, {
      credentials: "include",
    })
    if (!res.ok) return null
    return URL.createObjectURL(await res.blob())
  } catch {
    return null
  }
}
