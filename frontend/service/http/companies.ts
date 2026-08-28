import AxiosRequest from ".."
import {
  Company,
  CompanyMember,
  CreateCompanyDto,
  UpdateCompanyDto,
  UpdateCompanyMemberDto,
} from "@/types/company"

const COMPANIES_BASE = "/v1/companies"

interface ApiEnvelope<T> {
  success?: boolean
  data?: T
  message?: string
}

const unwrap = <T>(payload: unknown, fallback: T): T => {
  if (payload && typeof payload === "object" && "data" in (payload as ApiEnvelope<T>)) {
    return ((payload as ApiEnvelope<T>).data ?? fallback) as T
  }
  return (payload as T) ?? fallback
}

export const createCompany = async (dto: CreateCompanyDto): Promise<Company> => {
  const res = await AxiosRequest.post(COMPANIES_BASE, dto)
  return unwrap<Company>(res.data, res.data)
}

/**
 * Uploads a company logo and returns its persisted public URL.
 *
 * Not scoped to a company id on purpose: the register step collects the logo
 * before the company record exists. The returned URL is then passed to
 * `createCompany`/`updateCompany` like any other field.
 *
 * Throws on failure rather than returning undefined, so callers must surface
 * the problem. Silently resolving is what let companies save with no logo.
 */
export const uploadCompanyLogo = async (file: File): Promise<string> => {
  const form = new FormData()
  form.append("file", file)
  const res = await AxiosRequest.post(`${COMPANIES_BASE}/logo`, form, {
    headers: { "Content-Type": "multipart/form-data" },
  })
  const { url } = unwrap<{ url?: string }>(res.data, {})
  if (!url) throw new Error("The logo upload did not return a URL.")
  return url
}

export const listMyCompanies = async (): Promise<Company[]> => {
  const res = await AxiosRequest.get(COMPANIES_BASE)
  return unwrap<Company[]>(res.data, [])
}

export const searchCompanies = async (q: string): Promise<Company[]> => {
  if (!q.trim()) return []
  const res = await AxiosRequest.get(
    `${COMPANIES_BASE}/search?q=${encodeURIComponent(q)}`
  )
  return unwrap<Company[]>(res.data, [])
}

export const getCompany = async (id: string): Promise<Company | null> => {
  const res = await AxiosRequest.get(`${COMPANIES_BASE}/${encodeURIComponent(id)}`)
  return unwrap<Company | null>(res.data, null)
}

export const updateCompany = async (
  id: string,
  dto: UpdateCompanyDto
): Promise<Company> => {
  const res = await AxiosRequest.patch(`${COMPANIES_BASE}/${encodeURIComponent(id)}`, dto)
  return unwrap<Company>(res.data, res.data)
}

export const getCompanyMembers = async (id: string): Promise<CompanyMember[]> => {
  const res = await AxiosRequest.get(`${COMPANIES_BASE}/${encodeURIComponent(id)}/members`)
  return Array.isArray(res.data?.members) ? res.data.members : []
}

export const updateCompanyMember = async (
  companyId: string,
  userId: string,
  dto: UpdateCompanyMemberDto
): Promise<CompanyMember> => {
  const res = await AxiosRequest.patch(
    `${COMPANIES_BASE}/${encodeURIComponent(companyId)}/members/${encodeURIComponent(userId)}`,
    dto
  )
  return unwrap<CompanyMember>(res.data, res.data)
}

export const removeCompanyMember = async (
  companyId: string,
  userId: string
): Promise<void> => {
  await AxiosRequest.del(
    `${COMPANIES_BASE}/${encodeURIComponent(companyId)}/members/${encodeURIComponent(userId)}`
  )
}
