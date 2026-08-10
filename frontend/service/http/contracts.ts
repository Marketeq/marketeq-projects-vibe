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
