import AxiosRequest from ".."

export interface ContractDTO {
  id: string
  groupId: string
  clientId: string
  talentId: string
  title: string
  rate: number
  schedule: string
  duration: string
  status: string
  startAtISO: string | null
  endAtISO: string | null
  projectId: string | null
  serviceId: string | null
  teamId: string | null
  jobId: string | null
  note: string | null
  createdAt: string
  updatedAt: string
}

export interface AddableContractDTO {
  id: string
  name: string
  type: string
  status: string
  phase: string | null
  memberAvatars: string[]
  memberCount: number
  createdAt: string
}

export const getContractsForTalent = async (
  talentId: string
): Promise<ContractDTO[]> => {
  const res = await AxiosRequest.get(
    `/contracts/talent/${encodeURIComponent(talentId)}`
  )
  return Array.isArray(res.data) ? res.data : []
}

export const getContractsForClient = async (
  clientId: string
): Promise<ContractDTO[]> => {
  const res = await AxiosRequest.get(
    `/contracts/client/${encodeURIComponent(clientId)}`
  )
  return Array.isArray(res.data) ? res.data : []
}

export const getAddableJobContractsForClient = async (
  clientUserId: string
): Promise<AddableContractDTO[]> => {
  const res = await AxiosRequest.get("/v1/contracts", {
    params: {
      clientUserId,
      addableJobsOnly: true,
    },
  })

  return Array.isArray(res.data?.contracts) ? res.data.contracts : []
}

export type TalentNetworkStatus = "active" | "pending" | "past"

export interface TalentNetworkContractDTO {
  id: string
  groupId: string
  title: string
  status: string
  rate: number
  schedule: string
  duration: string
  startAtISO: string | null
  endAtISO: string | null
  projectId: string | null
  serviceId: string | null
  teamId: string | null
  jobId: string | null
  createdAt: string
  updatedAt: string
}

export interface TalentNetworkEntryDTO {
  talentId: string
  status: TalentNetworkStatus
  countsTowardTeam: boolean
  contract: TalentNetworkContractDTO
  contractIds: string[]
  firstHiredAtISO: string | null
  lastEndedAtISO: string | null
}

export interface TalentNetworkCountsDTO {
  active: number
  pending: number
  past: number
  total: number
}

export interface TalentNetworkDTO {
  clientId: string
  active: TalentNetworkEntryDTO[]
  pending: TalentNetworkEntryDTO[]
  past: TalentNetworkEntryDTO[]
  counts: TalentNetworkCountsDTO
}

// Identity comes from req.user server-side, same as getMyContractGroups.
// Never trust a caller-supplied clientId for "whose network is this".
export const getTalentNetwork = async (): Promise<TalentNetworkDTO | null> => {
  const res = await AxiosRequest.get("/contracts/talent-network")
  return res.data ?? null
}

export const getContract = async (id: string): Promise<ContractDTO | null> => {
  const res = await AxiosRequest.get(`/contracts/${encodeURIComponent(id)}`)
  return res.data ?? null
}

export const logHireFlowInitiated = async (talentId: string): Promise<void> => {
  await AxiosRequest.post("/contracts/audit/hire-initiated", { talentId })
}

export interface ContractGroupMemberSummary {
  contractId: string
  talentId: string
  title: string
  status: string
}

export interface ContractGroupSummary {
  id: string
  members: ContractGroupMemberSummary[]
  projectId: string | null
  serviceId: string | null
  teamId: string | null
  jobId: string | null
}

// Identity comes from req.user server-side — no clientId param, matching
// the T2-1 fix (never trust a caller-supplied id for "whose data is this").
export const getMyContractGroups = async (): Promise<
  ContractGroupSummary[]
> => {
  const res = await AxiosRequest.get("/contracts/groups/mine")
  return Array.isArray(res.data) ? res.data : []
}

export interface AddContractGroupMemberPayload {
  talentId: string
  title: string
  rate: number
  schedule: string
  duration: string
  note?: string
}

// T2-14: attach a talent to an existing group (T2-13's endpoint). clientId
// and groupId both come from the URL/server side, not the body — same
// identity discipline as getMyContractGroups above. Throws on non-2xx
// (401/403/404/409/5xx) via AxiosRequest's interceptor, same as every other
// call in this file — callers handle status codes in their own catch.
export const addContractGroupMember = async (
  groupId: string,
  payload: AddContractGroupMemberPayload
): Promise<ContractDTO> => {
  const res = await AxiosRequest.post(
    `/contracts/groups/${encodeURIComponent(groupId)}/members`,
    payload
  )
  return res.data
}

export interface EndContractPayload {
  reasonCode: string
  notes: string
}

// PMCM-331: gateway-routed counterpart to src/lib/api/contracts.ts's
// endContract, which fetches localhost:3010 directly with no Authorization
// header and always 401s. Throws on non-2xx via AxiosRequest's interceptor,
// same as every other call in this file — callers handle status codes in
// their own catch.
export const endContract = async (
  contractId: string,
  payload: EndContractPayload
): Promise<ContractDTO> => {
  const res = await AxiosRequest.put(
    `/contracts/${encodeURIComponent(contractId)}/end`,
    payload
  )
  return res.data
}
