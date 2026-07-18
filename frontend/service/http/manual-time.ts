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
  contractId: string
  taskId?: string
  notes?: string
  confirmOverlap?: boolean
}): Promise<ManualTimeDTO> => {
  // CreateManualTimeDto (time-tracking-service) only recognizes contractId —
  // main.ts's ValidationPipe runs with forbidNonWhitelisted: true, so a
  // mismatched field name (e.g. the old "projectId") doesn't get silently
  // dropped, it 400s the entire request.
  const res = await AxiosRequest.post("/manual-time", data)
  return res.data
}

export const getManualTime = async (): Promise<ManualTimeDTO[]> => {
  const res = await AxiosRequest.get("/manual-time")
  return res.data
}
