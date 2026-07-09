import AxiosRequest from ".."

export interface ManualTimeDTO {
  id: string
  userId: string
  contractId: string
  taskId: string | null
  startTime: string
  endTime: string
  notes: string | null
  status: string
  createdAt: string
}

export const createManualTime = async (data: {
  startTime: string
  endTime: string
  projectId: string
  taskId?: string
  notes?: string
}): Promise<ManualTimeDTO> => {
  const res = await AxiosRequest.post("/manual-time", data)
  return res.data
}
