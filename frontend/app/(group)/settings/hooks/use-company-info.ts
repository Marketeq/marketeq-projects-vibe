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
 * Only three of the form's eight fields have anywhere to go today: name,
 * website and logo. Industry, business type, company size, annual revenue,
 * phone and time zone have no column on any table, so this hook does not
 * pretend to persist them — they are deliberately absent from the payload
 * rather than sent and silently dropped.
 */
export type CompanyInfoDraft = {
  name: string
  website: string
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
   * Persists the fields that have storage and returns the saved record.
   * Throws on failure so the caller can surface it — a silent failure here is
   * what lets someone believe their company details were saved.
   */
  const save = useCallback(
    async (draft: CompanyInfoDraft, logoFile?: File | null) => {
      const name = draft.name.trim()
      if (!name) {
        throw new Error("Company name is required.")
      }

      // Upload first: the logo endpoint is not scoped to a company id, so the
      // URL is just another field once it resolves.
      const logoUrl = logoFile ? await uploadCompanyLogo(logoFile) : undefined
      const domain = draft.website.trim()

      const saved = company
        ? await updateCompany(company.id, {
            name,
            domain,
            ...(logoUrl ? { logoUrl } : {}),
          })
        : await createCompany({
            name,
            domain: domain || undefined,
            ...(logoUrl ? { logoUrl } : {}),
          })

      setCompany(saved)
      return saved
    },
    [company]
  )

  return { company, isLoading, hasLoaded, save }
}
