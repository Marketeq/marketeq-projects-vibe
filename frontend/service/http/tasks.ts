import AxiosRequest from ".."

// Contract tasks live in time-tracking-service and are reached through the
// API gateway (it maps /tasks to that service), like every other domain
// client. These used to call NEXT_PUBLIC_TTS_URL directly; locally that is
// the bare service origin without its /api prefix, so every task request
// 404'd and task lists never loaded on the web.

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
  const res = await AxiosRequest.get(
    `/tasks/contract/${encodeURIComponent(contractId)}`
  )
  return Array.isArray(res.data) ? res.data : []
}

export const createContractTask = async (data: {
  contractId: string
  name: string
  createdBy: string
}): Promise<ContractTaskDTO> => {
  const res = await AxiosRequest.post("/tasks", data)
  return res.data
}

export const updateContractTask = async (
  id: string,
  data: { name?: string; archived?: boolean }
): Promise<ContractTaskDTO> => {
  const res = await AxiosRequest.put(`/tasks/${id}`, data)
  return res.data
}

export const deleteContractTask = async (id: string): Promise<void> => {
  await AxiosRequest.del(`/tasks/${id}`)
}
