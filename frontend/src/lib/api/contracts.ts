// frontend/src/lib/api/contracts.ts
const CONTRACTS_API_URL =
  process.env.NEXT_PUBLIC_CONTRACTS_API_URL || "http://localhost:3010"

function authHeaders(): HeadersInit {
  return {
    "Content-Type": "application/json",
  }
}

// ── Types ──────────────────────────────────────────────

export type GroupType = "PROJECT" | "SERVICE" | "TEAM" | "JOB"

export type ContractStatus =
  | "PENDING"
  | "ACTIVE"
  | "ENDED"
  | "CANCELED"
  | "DISPUTED"

export interface Contract {
  id: string
  groupId: string
  clientId: string
  talentId: string
  title: string
  rate: number
  schedule: string
  duration: string
  status: ContractStatus
  startAtISO: string | null
  endAtISO: string | null
  projectId: string | null
  serviceId: string | null
  teamId: string | null
  jobId: string | null
  createdAt: string
  updatedAt: string
}

export interface ContractGroup {
  id: string
  type: GroupType
  ownerClientId: string
  projectId: string | null
  serviceId: string | null
  teamId: string | null
  jobId: string | null
  depositPaid: boolean
  createdAt: string
  updatedAt: string
  contracts: Contract[]
}

export interface CreateContractInput {
  talentId: string
  title: string
  rate: number
  schedule: string
  duration: string
}

export interface CreateGroupDto {
  type: GroupType
  ownerClientId: string
  projectId?: string
  serviceId?: string
  teamId?: string
  jobId?: string
  contracts: CreateContractInput[]
}

export interface EndContractDto {
  reasonCode: string
  notes: string
}

export interface AcceptRejectDto {
  accepted: boolean
  talentId: string
}

export interface DisputeContractDto {
  reason: string
}

// ── API Functions ──────────────────────────────────────

/** Get a single contract by ID */
export async function getContract(
  contractId: string
): Promise<Contract | null> {
  try {
    const res = await fetch(`${CONTRACTS_API_URL}/contracts/${contractId}`, {
      headers: authHeaders(),
      credentials: "include",
      cache: "no-store",
    })
    if (!res.ok) return null
    return res.json()
  } catch (error) {
    console.error("Error fetching contract:", error)
    return null
  }
}

/** Get all contracts for a client */
export async function getClientContracts(
  clientId: string
): Promise<Contract[]> {
  try {
    const res = await fetch(
      `${CONTRACTS_API_URL}/contracts/client/${clientId}`,
      {
        headers: authHeaders(),
        credentials: "include",
        cache: "no-store",
      }
    )
    if (!res.ok) return []
    return res.json()
  } catch (error) {
    console.error("Error fetching client contracts:", error)
    return []
  }
}

/** Get all contracts for a talent */
export async function getTalentContracts(
  talentId: string
): Promise<Contract[]> {
  try {
    const res = await fetch(
      `${CONTRACTS_API_URL}/contracts/talent/${talentId}`,
      {
        headers: authHeaders(),
        credentials: "include",
        cache: "no-store",
      }
    )
    if (!res.ok) return []
    return res.json()
  } catch (error) {
    console.error("Error fetching talent contracts:", error)
    return []
  }
}

/** Create a contract group with N contracts */
export async function createContractGroup(
  dto: CreateGroupDto
): Promise<ContractGroup | null> {
  try {
    const res = await fetch(`${CONTRACTS_API_URL}/contract-groups`, {
      method: "POST",
      headers: authHeaders(),
      credentials: "include",
      body: JSON.stringify(dto),
    })
    if (!res.ok) {
      const text = await res.text()
      console.error("Failed to create contract group:", res.status, text)
      return null
    }
    return res.json()
  } catch (error) {
    console.error("Error creating contract group:", error)
    return null
  }
}

/** Get a contract group by ID (includes all contracts) */
export async function getContractGroup(
  groupId: string
): Promise<ContractGroup | null> {
  try {
    const res = await fetch(`${CONTRACTS_API_URL}/contract-groups/${groupId}`, {
      headers: authHeaders(),
      credentials: "include",
      cache: "no-store",
    })
    if (!res.ok) return null
    return res.json()
  } catch (error) {
    console.error("Error fetching contract group:", error)
    return null
  }
}

/** End a contract (client only) */
export async function endContract(
  contractId: string,
  dto: EndContractDto
): Promise<Contract | null> {
  try {
    const res = await fetch(
      `${CONTRACTS_API_URL}/contracts/${contractId}/end`,
      {
        method: "PUT",
        headers: authHeaders(),
        credentials: "include",
        body: JSON.stringify(dto),
      }
    )
    if (!res.ok) {
      const text = await res.text()
      console.error("Failed to end contract:", res.status, text)
      return null
    }
    return res.json()
  } catch (error) {
    console.error("Error ending contract:", error)
    return null
  }
}

/** Accept or reject a contract offer (talent only) */
export async function respondToContract(
  contractId: string,
  dto: AcceptRejectDto
): Promise<Contract | null> {
  try {
    const res = await fetch(
      `${CONTRACTS_API_URL}/contracts/${contractId}/respond`,
      {
        method: "PUT",
        headers: authHeaders(),
        credentials: "include",
        body: JSON.stringify(dto),
      }
    )
    if (!res.ok) {
      const text = await res.text()
      console.error("Failed to respond to contract:", res.status, text)
      return null
    }
    return res.json()
  } catch (error) {
    console.error("Error responding to contract:", error)
    return null
  }
}

/** Dispute a contract */
export async function disputeContract(
  contractId: string,
  dto: DisputeContractDto
): Promise<Contract | null> {
  try {
    const res = await fetch(
      `${CONTRACTS_API_URL}/contracts/${contractId}/dispute`,
      {
        method: "PUT",
        headers: authHeaders(),
        credentials: "include",
        body: JSON.stringify(dto),
      }
    )
    if (!res.ok) {
      const text = await res.text()
      console.error("Failed to dispute contract:", res.status, text)
      return null
    }
    return res.json()
  } catch (error) {
    console.error("Error disputing contract:", error)
    return null
  }
}
