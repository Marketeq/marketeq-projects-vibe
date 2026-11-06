/**
 * Company directory: the single seam between the company UI and its data.
 *
 * Previously persisted in localStorage because no backend service owned
 * companies. user-service now does (backend/apps/user-service/src/companies/),
 * so every function here is a thin async wrapper around CompanyAPI. Signatures
 * are async where they previously were not, and callers were updated alongside
 * this file. Kept as the single seam intentionally: if the company API shape
 * ever changes again, this is still the only file that needs to.
 */

import * as CompanyAPI from "@/service/http/companies"
import type { Company as ApiCompany } from "@/types/company"

export interface Company {
  id: string
  name: string
  memberCount: number
  logoUrl?: string
}

/**
 * A company name that is really an email address is always a mis-fill. The
 * company pickers render "Register a company with this name" directly under a
 * free-text field, so an address typed there to invite that person used to be
 * saved as a company and then appeared in the company dropdown.
 * user-service rejects these too; this keeps the UI from ever sending one.
 */
const EMAIL_LIKE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export const isEmailLikeCompanyName = (name: string): boolean =>
  EMAIL_LIKE.test(name.trim())

export const COMPANY_NAME_IS_EMAIL_MESSAGE =
  "That's an email address. Enter the company's name instead."

/**
 * `memberCount` comes from the API where the API has it (GET /companies now
 * counts the roster). The fallback of 1 is for the responses that carry no
 * count — a company the caller can see always has at least their own
 * membership. It used to be the *only* source, so every company in the
 * selector read "1 Member" no matter how many people were in it.
 */
const toCompany = (company: ApiCompany, memberCount?: number): Company => ({
  id: company.id,
  name: company.name,
  memberCount: memberCount ?? company.memberCount ?? 1,
  logoUrl: company.logoUrl,
})

/**
 * Uploads a logo and returns its persisted URL. Rejects on failure so the
 * caller can tell the user. A company must never be saved with a preview
 * URL the backend never received.
 */
export const uploadCompanyLogo = (file: File): Promise<string> =>
  CompanyAPI.uploadCompanyLogo(file)

export const listCompanies = async (): Promise<Company[]> => {
  const companies = await CompanyAPI.listMyCompanies()
  return companies.map((c) => toCompany(c))
}

export const getCompany = async (id: string): Promise<Company | undefined> => {
  const company = await CompanyAPI.getCompany(id)
  return company ? toCompany(company) : undefined
}

/**
 * Exact-name lookup restricted to the companies the caller belongs to.
 *
 * Deliberately not a directory (`searchCompanies`) lookup: the directory is
 * global, so a match there is usually somebody else's company. Only a company
 * the caller is a member of can be handed back to the pickers, because those
 * render from `listCompanies()`, which is membership-scoped.
 */
export const findMyCompanyByName = async (
  name: string
): Promise<Company | undefined> => {
  const normalized = name.trim().toLowerCase()
  if (!normalized) return undefined
  const mine = await CompanyAPI.listMyCompanies()
  const exact = mine.find((c) => c.name.trim().toLowerCase() === normalized)
  return exact ? toCompany(exact) : undefined
}

export const searchCompanies = async (query: string): Promise<Company[]> => {
  const trimmed = query.trim()
  if (!trimmed) return []
  const matches = await CompanyAPI.searchCompanies(trimmed)
  return matches.map((c) => toCompany(c))
}

/**
 * Creates the company, or returns the caller's existing one when they already
 * belong to a company under that name. Re-running the register step with the
 * same name must not pile up duplicate memberships.
 *
 * The collision check is membership-scoped on purpose. It used to search the
 * global directory, which meant typing a name any other user had registered
 * returned that stranger's company: nothing was created, the caller was never
 * added as a member, so the company never appeared in `listCompanies()` and
 * the picker fell back to its "no registered company" empty state with an
 * unselectable id. Names are not unique across the directory, so two users
 * registering the same name each get their own company.
 *
 * A freshly picked logo still needs to land somewhere, so a collision with
 * a logo-less existing record is treated as "attach the logo" rather than
 * silently dropping it. If the caller isn't an admin of that company the
 * update 403s and this falls back to the pre-existing record.
 */
export const createCompany = async ({
  name,
  logoUrl,
}: {
  name: string
  logoUrl?: string
  memberCount?: number
}): Promise<Company> => {
  const trimmed = name.trim()
  if (isEmailLikeCompanyName(trimmed)) {
    throw new Error(COMPANY_NAME_IS_EMAIL_MESSAGE)
  }
  const existing = await findMyCompanyByName(trimmed)
  if (existing) {
    if (logoUrl && logoUrl !== existing.logoUrl) {
      try {
        const updated = await CompanyAPI.updateCompany(existing.id, { logoUrl })
        return toCompany(updated)
      } catch {
        return existing
      }
    }
    return existing
  }

  const company = await CompanyAPI.createCompany({ name: trimmed, logoUrl })
  return toCompany(company)
}

export const updateCompany = async (
  id: string,
  changes: { name?: string; logoUrl?: string }
): Promise<Company | undefined> => {
  const company = await CompanyAPI.updateCompany(id, changes)
  return company ? toCompany(company) : undefined
}
