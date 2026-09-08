import { getPublicUserUrl } from "@/lib/runtime-urls"
import AxiosRequest from ".."

const USER_BASE = getPublicUserUrl()

export interface DashboardTaskDTO {
  id: string
  userId: string
  value: string
  done: boolean
  sortOrder: number
  createdAt: string
  updatedAt: string
}

export const DashboardTasksAPI = {
  list: (): Promise<DashboardTaskDTO[]> =>
    AxiosRequest.get(`${USER_BASE}/dashboard-tasks`).then((r) =>
      Array.isArray(r.data) ? r.data : []
    ),

  create: (data: { value?: string; sortOrder?: number }): Promise<DashboardTaskDTO> =>
    AxiosRequest.post(`${USER_BASE}/dashboard-tasks`, data).then((r) => r.data),

  update: (
    id: string,
    data: { value?: string; done?: boolean; sortOrder?: number }
  ): Promise<DashboardTaskDTO> =>
    AxiosRequest.patch(`${USER_BASE}/dashboard-tasks/${id}`, data).then((r) => r.data),

  delete: (id: string): Promise<void> =>
    AxiosRequest.del(`${USER_BASE}/dashboard-tasks/${id}`).then(() => undefined),
}
