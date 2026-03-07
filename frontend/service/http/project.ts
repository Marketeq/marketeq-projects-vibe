import { CreateProjectType } from "@/types/project"
import AxiosRequest from ".."

type CreatePhaseTaskPayload = {
  taskName: string
  role: string
  location: string[]
  experience: string[]
  experienceLevel: string
  duration: string
  estimatedHours?: number
  phaseId: string
}

type CreatePhasePayload = {
  name: string
  stageName: string
  startDay: number
  endDay: number
  order: number
  projectId: string
  tasks: CreatePhaseTaskPayload[]
}

type CreateTaskPayload = CreatePhaseTaskPayload

type UpdateTaskPayload = Pick<
  CreateTaskPayload,
  "taskName" | "role" | "location" | "experience" | "duration"
>
const LISTINGS_BASE = process.env.NEXT_PUBLIC_AUTH_URL ?? "";

export const ProjectAPI = {
  CreateProject: (data: CreateProjectType | FormData) => {
    return AxiosRequest.post(`${LISTINGS_BASE}/publish/project`, data, {
      headers: {
        "Content-Type":
          data instanceof FormData ? "multipart/form-data" : "application/json",
      },
    })
  },
  UploadMedia: (data: FormData) => {
    return AxiosRequest.post(`${LISTINGS_BASE}/publish/media`, data, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    })
  },
  CreatePhase: (data: CreatePhasePayload) => {
    return AxiosRequest.post(`${LISTINGS_BASE}/publish/phase`, data)
  },
  DuplicatePhase: (phaseId: string) => {
    return AxiosRequest.post(`${LISTINGS_BASE}/publish/phase/${phaseId}/duplicate`, {})
  },
  UpdatePhase: (phaseId: string, data: { name: string }) => {
    return AxiosRequest.put(`${LISTINGS_BASE}/publish/phase/update/${phaseId}`, data)
  },
  DeletePhase: (phaseId: string) => {
    return AxiosRequest.del(`${LISTINGS_BASE}/publish/phase/delete/${phaseId}`)
  },
  CreateTask: (data: CreateTaskPayload) => {
    return AxiosRequest.post(`${LISTINGS_BASE}/publish/task`, data)
  },
  UpdateTask: (id: string, data: UpdateTaskPayload) => {
    return AxiosRequest.put(`${LISTINGS_BASE}/publish/task/update/${id}`, data)
  },
}
