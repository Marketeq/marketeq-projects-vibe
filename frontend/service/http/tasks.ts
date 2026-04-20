import AxiosRequest from ".."

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
  const res = await AxiosRequest.get(`/tasks/contract/${encodeURIComponent(contractId)}`)
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
