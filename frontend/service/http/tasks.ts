import axios from "axios"

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
  const res = await ttsClient.get(
    `/api/tasks/contract/${encodeURIComponent(contractId)}`
  )
  return Array.isArray(res.data) ? res.data : []
}

export const createContractTask = async (data: {
  contractId: string
  name: string
  createdBy: string
}): Promise<ContractTaskDTO> => {
  const res = await ttsClient.post("/api/tasks", data)
  return res.data
}

export const updateContractTask = async (
  id: string,
  data: { name?: string; archived?: number }
): Promise<ContractTaskDTO> => {
  const res = await ttsClient.put(`/api/tasks/${id}`, data)
  return res.data
}

export const deleteContractTask = async (id: string): Promise<void> => {
  await ttsClient.del(`/api/tasks/${id}`)
}
