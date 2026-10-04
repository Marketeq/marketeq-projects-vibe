import { useCallback, useEffect, useState } from "react"
import {
  createCompany,
  listMyCompanies,
  updateCompany,
  uploadCompanyLogo,
} from "@/service/http/companies"
import type { Company } from "@/types/company"

/**
 * Loads and saves the company record behind Settings > Company Info.
 *
 * Backed by the `companies` table rather than the `teamName` / `companyWebsite`
 * columns on the user row. Company data is shared, not personal: two people at
 * the same company editing their own user row would produce two divergent
 * copies with no way to reconcile them. The company record also already
 * carries membership with roles, which is what makes the admin-only rule for
 * account-level settings enforceable.
 *
 * A client can have no company yet — registration does not always create one —
 * so the first save creates the record and later saves update it. Creating also
 * enrols the caller as an admin, which is what lets the subsequent PATCH pass
 * its permission check.
 *
 * All eight fields persist. Industry, business type, company size, annual
 * revenue, phone and time zone gained columns on `companies`; before that they
 * were deliberately withheld from the payload rather than sent and silently
 * dropped.
 */
export type CompanyInfoDraft = {
  name: string
  website: string
  industry: string
  businessType: string
  companySize: string
  annualRevenue: string
  phone: string
  timeZone: string
}

export function useCompanyInfo(enabled: boolean) {
  const [company, setCompany] = useState<Company | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [hasLoaded, setHasLoaded] = useState(false)

  useEffect(() => {
    if (!enabled || hasLoaded) return

    let cancelled = false
    setIsLoading(true)

    listMyCompanies()
      .then((companies) => {
        if (cancelled) return
        // A user can belong to several. Settings edits the first, which is the
        // one registration creates; picking between them needs a product rule
        // that does not exist yet.
        setCompany(companies[0] ?? null)
      })
      .catch((error) => {
        // Leave the form empty rather than blocking the panel. A company that
        // cannot be read is indistinguishable from one that does not exist yet,
        // and the first save will create it.
        console.warn("[settings] could not load the company record", error)
      })
      .finally(() => {
        if (cancelled) return
        setIsLoading(false)
        setHasLoaded(true)
      })

    return () => {
      cancelled = true
    }
  }, [enabled, hasLoaded])

  /**
   * Persists the fields that have storage and returns the saved record
   * alongside `logoError`, which is set when the details saved but the logo
   * upload did not.
   *
   * Throws on failure of the record write itself, so the caller can surface it
   * — a silent failure there is what lets someone believe their company
   * details were saved.
   */
  const save = useCallback(
    async (draft: CompanyInfoDraft, logoFile?: File | null) => {
      const name = draft.name.trim()
      if (!name) {
        throw new Error("Company name is required.")
      }

      // Upload first: the logo endpoint is not scoped to a company id, so the
      // URL is just another field once it resolves.
      //
      // A failure here used to abort the whole save, so an unconfigured bucket
      // or a momentary storage fault discarded every text field the person had
      // just typed — they lost the form and were told only that the logo
      // storage was misconfigured. The details are worth keeping on their own,
      // so the upload failing is reported rather than thrown, and the record is
      // written either way. The caller decides how to surface a partial save.
      let logoUrl: string | undefined
      let logoError: string | null = null
      if (logoFile) {
        try {
          logoUrl = await uploadCompanyLogo(logoFile)
        } catch (error: any) {
          logoError =
            error?.response?.data?.errors?.message ||
            error?.response?.data?.message ||
            error?.message ||
            "We could not upload that logo."
        }
      }

      const domain = draft.website.trim()

      const profile = {
        industry: draft.industry.trim(),
        businessType: draft.businessType.trim(),
        companySize: draft.companySize.trim(),
        annualRevenue: draft.annualRevenue.trim(),
        phone: draft.phone.trim(),
        timeZone: draft.timeZone.trim(),
      }

      const saved = company
        ? await updateCompany(company.id, {
            name,
            domain,
            ...profile,
            ...(logoUrl ? { logoUrl } : {}),
          })
        : await createCompany({
            name,
            domain: domain || undefined,
            ...profile,
            ...(logoUrl ? { logoUrl } : {}),
          })

      setCompany(saved)
      // logoError is non-null only when the details saved and the logo did
      // not, so the caller can report a partial save instead of a success.
      return { company: saved, logoError }
    },
    [company]
  )

  return { company, isLoading, hasLoaded, save }
}
