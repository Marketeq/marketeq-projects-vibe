import { CreateProjectType } from "@/types/project"
import { getPublicApiUrl, getPublicListingsUrl } from "@/lib/runtime-urls"
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
// Prefer a dedicated listings URL if set; otherwise fall back to the general
// API URL so existing Vercel deployments keep working without a new env var.
const LISTINGS_BASE = getPublicListingsUrl()

const API_BASE = getPublicApiUrl() || "http://localhost:4000"

export const ProjectAPI = {
  CreateProjectDraft: (
    data: Partial<CreateProjectType> & {
      title?: string
      shortDescription?: string
      fullDescription?: string
    } = {}
  ) => {
    return AxiosRequest.post(`${LISTINGS_BASE}/publish/project/draft`, data)
  },
  GetProjectDraft: (projectId: string) => {
    return AxiosRequest.get(`${LISTINGS_BASE}/publish/project/${projectId}`)
  },
  UpdateProjectDraft: (
    projectId: string,
    data: Partial<CreateProjectType> & {
      title?: string
      shortDescription?: string
      fullDescription?: string
    }
  ) => {
    return AxiosRequest.put(
      `${LISTINGS_BASE}/publish/project/${projectId}`,
      data
    )
  },
  GetMyProjects: () => {
    return AxiosRequest.get(`${LISTINGS_BASE}/publish/projects/mine`)
  },
  GetProjectMembers: (projectId: string) => {
    return AxiosRequest.get(
      `${LISTINGS_BASE}/publish/project/${projectId}/members`
    )
  },
  SaveProjectMembers: (
    projectId: string,
    members: Array<{
      userId: string
      projectRole?: string | null
      status?: string | null
      isLead?: boolean | null
      leadLabel?: string | null
    }>
  ) => {
    return AxiosRequest.put(
      `${LISTINGS_BASE}/publish/project/${projectId}/members`,
      { members }
    )
  },
  GetProjectQuestions: (projectId: string) => {
    return AxiosRequest.get(
      `${LISTINGS_BASE}/publish/project/${projectId}/questions`
    )
  },
  SaveProjectQuestions: (
    projectId: string,
    questions: Array<{
      id?: string
      question: string
      answer?: string | null
      askedByName?: string | null
      askedByUsername?: string | null
      askedAt?: string | null
      answeredByUserId?: string | null
      answeredByName?: string | null
      answeredByRole?: string | null
      assignedToUserId?: string | null
      hidden?: boolean
    }>
  ) => {
    return AxiosRequest.put(
      `${LISTINGS_BASE}/publish/project/${projectId}/questions`,
      { questions }
    )
  },
  SuggestFaqs: (projectId: string) => {
    return AxiosRequest.post(
      `${LISTINGS_BASE}/publish/project/${projectId}/faqs/suggest`,
      {}
    )
  },
  SuggestFaqAnswer: (projectId: string, question: string) => {
    return AxiosRequest.post(
      `${LISTINGS_BASE}/publish/project/${projectId}/faqs/answer`,
      { question }
    )
  },
  ReplaceProjectScope: (
    projectId: string,
    scope: Array<{
      name: string
      stageName: string
      startDay: number
      endDay: number
      order: number
      projectId: string
      tasks: Array<{
        taskName: string
        role: string
        location: string[]
        experience: string[]
        experienceLevel: string
        duration: string
        estimatedHours?: number
        phaseId: string
      }>
    }>
  ) => {
    return AxiosRequest.put(
      `${LISTINGS_BASE}/publish/project/${projectId}/scope`,
      {
        scope,
      }
    )
  },
  CreateProject: (data: CreateProjectType | FormData) => {
    return AxiosRequest.post(`${LISTINGS_BASE}/publish/project`, data, {
      headers: {
        "Content-Type":
          data instanceof FormData ? "multipart/form-data" : "application/json",
      },
    })
  },
  CreateModeratedSubcategory: (data: { name: string; parentUuid?: string }) => {
    return AxiosRequest.post(
      `${LISTINGS_BASE}/publish/category/subcategory`,
      data
    )
  },
  UploadMedia: (data: FormData) => {
    return AxiosRequest.post(`${LISTINGS_BASE}/publish/media`, data, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    })
  },
  UpdateGalleryImages: (
    projectId: string,
    additionalImages: string[],
    hiddenImages?: string[]
  ) => {
    return AxiosRequest.put(
      `${LISTINGS_BASE}/publish/media/${projectId}/gallery`,
      { additionalImages, hiddenImages }
    )
  },
  UploadRichTextImage: (data: FormData) => {
    return AxiosRequest.post(`${LISTINGS_BASE}/publish/rich-text-image`, data, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    })
  },
  CreatePhase: (data: CreatePhasePayload) => {
    return AxiosRequest.post(`${LISTINGS_BASE}/publish/phase`, data)
  },
  DuplicatePhase: (phaseId: string) => {
    return AxiosRequest.post(
      `${LISTINGS_BASE}/publish/phase/${phaseId}/duplicate`,
      {}
    )
  },
  UpdatePhase: (phaseId: string, data: { name: string }) => {
    return AxiosRequest.put(
      `${LISTINGS_BASE}/publish/phase/update/${phaseId}`,
      data
    )
  },
  DeletePhase: (phaseId: string) => {
    return AxiosRequest.del(`${LISTINGS_BASE}/publish/phase/delete/${phaseId}`)
  },
  CreateTask: (data: CreateTaskPayload) => {
    return AxiosRequest.post(`${LISTINGS_BASE}/publish/task`, data)
  },
  PublishProject: (projectId: string) => {
    return AxiosRequest.post(
      `${LISTINGS_BASE}/publish/project/${projectId}/publish`,
      {}
    )
  },
  UnpublishProject: (projectId: string) => {
    return AxiosRequest.put(
      `${LISTINGS_BASE}/publish/project/${projectId}/unpublish`,
      {}
    )
  },
  UpdateTask: (id: string, data: UpdateTaskPayload) => {
    return AxiosRequest.put(`${LISTINGS_BASE}/publish/task/update/${id}`, data)
  },
  GetProjectBySlug: async (slug: string) => {
    try {
      const res = await AxiosRequest.get(
        `${LISTINGS_BASE}/publish/project/slug/${slug}`
      )
      if (res?.data) return res
    } catch {
      // not found
    }
    return null
  },
  getRecommended: (skills: string[], limit = 10) => {
    const params = new URLSearchParams({ limit: String(limit) })
    if (skills.length) params.set("skills", skills.join(","))
    return AxiosRequest.get(`${LISTINGS_BASE}/v1/projects/recommended?${params}`)
  },
  GetSuggestedQuestions: (projectId: string) => {
    return AxiosRequest.get(
      `${LISTINGS_BASE}/v1/projects/${projectId}/suggested-questions`
    )
  },
}
