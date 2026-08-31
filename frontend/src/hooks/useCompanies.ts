import {
  useMutation,
  useQueries,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query"
import * as CompanyAPI from "@/service/http/companies"
import { useAuth } from "@/contexts/auth"
import type {
  CreateCompanyDto,
  UpdateCompanyDto,
  UpdateCompanyMemberDto,
} from "@/types/company"

const KEYS = {
  mine: ["companies", "mine"] as const,
  members: (companyId: string) => ["companies", companyId, "members"] as const,
  search: (q: string) => ["companies", "search", q] as const,
}

export function useMyCompanies() {
  return useQuery({
    queryKey: KEYS.mine,
    queryFn: () => CompanyAPI.listMyCompanies(),
  })
}

/**
 * Deliberately not added to AuthContext (frontend/contexts/auth.tsx is
 * login-frozen, SOP §1.4) even though "the caller's company" is
 * conceptually adjacent to the user session. This hook is the seam instead.
 *
 * The app has no multi-company switcher UI yet, so this resolves to the
 * company the caller owns, falling back to their first membership. That is
 * the same single-company assumption my-team/page.tsx already makes via
 * `teamId = user.id`.
 */
export function useCurrentCompany() {
  const { user } = useAuth()
  const query = useMyCompanies()
  const companies = query.data ?? []
  const owned = companies.find((c) => c.ownerUserId === user?.id)
  return {
    ...query,
    company: owned ?? companies[0] ?? null,
  }
}

export function useCompanySearch(q: string) {
  return useQuery({
    queryKey: KEYS.search(q),
    queryFn: () => CompanyAPI.searchCompanies(q),
    enabled: q.trim().length > 0,
  })
}

export function useCompanyMembers(companyId: string | undefined) {
  return useQuery({
    queryKey: KEYS.members(companyId ?? ""),
    queryFn: () => CompanyAPI.getCompanyMembers(companyId as string),
    enabled: !!companyId,
  })
}

/**
 * Live memberships for several companies at once, flattened to
 * `${companyId}:${userId}` -> permissions.
 *
 * /my-team builds its roster from invitations, whose `permissions` column is
 * frozen at invite time, while the record Edit Permissions actually writes is
 * company_users. A single useCompanyMembers would cover one company and leave
 * every other row on the roster reading the stale invite, and hooks cannot be
 * called in a loop, hence useQueries.
 *
 * The query keys are identical to useCompanyMembers, so a write through
 * useUpdateCompanyMember invalidates the matching entry here and the roster
 * re-reads it.
 *
 * Pass only companies the caller belongs to: GET :id/members is
 * membership-gated and anything else 403s.
 */
export function useCompanyMemberPermissions(companyIds: string[]) {
  return useQueries({
    queries: companyIds.map((companyId) => ({
      queryKey: KEYS.members(companyId),
      queryFn: () => CompanyAPI.getCompanyMembers(companyId),
    })),
    combine: (results) => {
      const map = new Map<string, string[]>()
      results.forEach((result, index) => {
        for (const member of result.data ?? []) {
          map.set(
            `${companyIds[index]}:${member.userId}`,
            member.permissions ?? []
          )
        }
      })
      return map
    },
  })
}

export function useCreateCompany() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (dto: CreateCompanyDto) => CompanyAPI.createCompany(dto),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.mine })
    },
  })
}

export function useUpdateCompany(companyId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (dto: UpdateCompanyDto) => CompanyAPI.updateCompany(companyId, dto),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.mine })
    },
  })
}

export function useUpdateCompanyMember(companyId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ userId, dto }: { userId: string; dto: UpdateCompanyMemberDto }) =>
      CompanyAPI.updateCompanyMember(companyId, userId, dto),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.members(companyId) })
    },
  })
}

export function useRemoveCompanyMember(companyId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (userId: string) => CompanyAPI.removeCompanyMember(companyId, userId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.members(companyId) })
    },
  })
}
