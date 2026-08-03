import axios from "axios"

// TTS_BASE already includes the /api prefix TasksController is mounted
// under — every call below previously ALSO prefixed "/api/...", doubling
// up to a literal "/api/api/..." path that 400s (found live: fetching
// tasks for a contract from the Log Time modal never actually worked).
const TTS_BASE = process.env.NEXT_PUBLIC_TTS_URL ?? "http://localhost:3017/api"
const ttsClient = {
  get: (url: string) => axios.get(`${TTS_BASE}${url}`),
  post: (url: string, data: any) => axios.post(`${TTS_BASE}${url}`, data),
  put: (url: string, data: any) => axios.put(`${TTS_BASE}${url}`, data),
  del: (url: string) => axios.delete(`${TTS_BASE}${url}`),
}

export interface ContractTaskDTO {
  id: string
  contractId: string
  name: string
  archived: boolean
  createdBy: string
  createdAt: string
  updatedAt: string
}

export const getTasksForContract = async (
  contractId: string
): Promise<ContractTaskDTO[]> => {
  const res = await ttsClient.get(`/tasks/contract/${encodeURIComponent(contractId)}`)
  return Array.isArray(res.data) ? res.data : []
}

export const createContractTask = async (data: {
  contractId: string
  name: string
  createdBy: string
}): Promise<ContractTaskDTO> => {
  const res = await ttsClient.post("/tasks", data)
  return res.data
}

export const updateContractTask = async (
  id: string,
  data: { name?: string; archived?: boolean }
): Promise<ContractTaskDTO> => {
  const res = await ttsClient.put(`/tasks/${id}`, data)
  return res.data
}

export const deleteContractTask = async (id: string): Promise<void> => {
  await ttsClient.del(`/tasks/${id}`)
}