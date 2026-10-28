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

// PMCM-261/AC5: explicit per-call timeouts at this client, not a change to
// the shared axios instance's default (that default — 30s, service/index.ts
// — stays as-is for every other feature using it). Uploads get a longer
// budget than plain CRUD since multi-MB files over a slow connection
// legitimately take longer than 30s.
const LISTING_REQUEST_TIMEOUT_MS = 30000
const LISTING_UPLOAD_TIMEOUT_MS = 120000

export const ProjectAPI = {
  // G2: read-only check that the talent may start a listing; resolves only when the gate
  // is open, a closed gate (403 VERIFICATION_REQUIRED) or an unanswered one (503) rejects.
  CheckCreateListingGate: () => {
    return AxiosRequest.get(`${LISTINGS_BASE}/publish/create-gate`, {
      timeout: LISTING_REQUEST_TIMEOUT_MS,
    })
  },
  CreateProjectDraft: (
    data: Partial<CreateProjectType> & {
      title?: string
      shortDescription?: string
      fullDescription?: string
      projectType?: string
      faqs?: Array<{ question: string; answer: string }>
      videoUrl?: string
    } = {}
  ) => {
    return AxiosRequest.post(`${LISTINGS_BASE}/publish/project/draft`, data, {
      timeout: LISTING_REQUEST_TIMEOUT_MS,
    })
  },
  GetProjectDraft: (projectId: string) => {
    return AxiosRequest.get(`${LISTINGS_BASE}/publish/project/${projectId}`, {
      timeout: LISTING_REQUEST_TIMEOUT_MS,
    })
  },
  UpdateProjectDraft: (
    projectId: string,
    data: Partial<CreateProjectType> & {
      title?: string
      shortDescription?: string
      fullDescription?: string
      projectType?: string
      faqs?: Array<{ question: string; answer: string }>
      videoUrl?: string
    }
  ) => {
    return AxiosRequest.put(
      `${LISTINGS_BASE}/publish/project/${projectId}`,
      data,
      { timeout: LISTING_REQUEST_TIMEOUT_MS }
    )
  },
  GetMyProjects: () => {
    return AxiosRequest.get(`${LISTINGS_BASE}/publish/projects/mine`, {
      timeout: LISTING_REQUEST_TIMEOUT_MS,
    })
  },
  GetProjectMembers: (projectId: string) => {
    return AxiosRequest.get(
      `${LISTINGS_BASE}/publish/project/${projectId}/members`,
      { timeout: LISTING_REQUEST_TIMEOUT_MS }
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
      { members },
      { timeout: LISTING_REQUEST_TIMEOUT_MS }
    )
  },
  GetProjectQuestions: (projectId: string) => {
    return AxiosRequest.get(
      `${LISTINGS_BASE}/publish/project/${projectId}/questions`,
      { timeout: LISTING_REQUEST_TIMEOUT_MS }
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
      { questions },
      { timeout: LISTING_REQUEST_TIMEOUT_MS }
    )
  },
  SuggestFaqs: (projectId: string) => {
    return AxiosRequest.post(
      `${LISTINGS_BASE}/publish/project/${projectId}/faqs/suggest`,
      {},
      { timeout: LISTING_REQUEST_TIMEOUT_MS }
    )
  },
  SuggestFaqAnswer: (projectId: string, question: string) => {
    return AxiosRequest.post(
      `${LISTINGS_BASE}/publish/project/${projectId}/faqs/answer`,
      { question },
      { timeout: LISTING_REQUEST_TIMEOUT_MS }
    )
  },
  SuggestSkills: (input: {
    description?: string
    category?: string
    tags?: string[]
    scopeTaskTitles?: string[]
  }) => {
    return AxiosRequest.post(
      `${LISTINGS_BASE}/publish/suggest-skills`,
      input,
      { timeout: LISTING_REQUEST_TIMEOUT_MS }
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
      },
      { timeout: LISTING_REQUEST_TIMEOUT_MS }
    )
  },
  CreateProject: (data: CreateProjectType | FormData) => {
    return AxiosRequest.post(`${LISTINGS_BASE}/publish/project`, data, {
      headers: {
        "Content-Type":
          data instanceof FormData ? "multipart/form-data" : "application/json",
      },
      timeout:
        data instanceof FormData
          ? LISTING_UPLOAD_TIMEOUT_MS
          : LISTING_REQUEST_TIMEOUT_MS,
    })
  },
  CreateModeratedSubcategory: (data: { name: string; parentUuid?: string }) => {
    return AxiosRequest.post(
      `${LISTINGS_BASE}/publish/category/subcategory`,
      data,
      { timeout: LISTING_REQUEST_TIMEOUT_MS }
    )
  },
  UploadMedia: (data: FormData) => {
    return AxiosRequest.post(`${LISTINGS_BASE}/publish/media`, data, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
      timeout: LISTING_UPLOAD_TIMEOUT_MS,
    })
  },
  UpdateGalleryImages: (
    projectId: string,
    additionalImages: string[],
    hiddenImages?: string[]
  ) => {
    return AxiosRequest.put(
      `${LISTINGS_BASE}/publish/media/${projectId}/gallery`,
      { additionalImages, hiddenImages },
      { timeout: LISTING_REQUEST_TIMEOUT_MS }
    )
  },
  UploadRichTextImage: (data: FormData) => {
    return AxiosRequest.post(`${LISTINGS_BASE}/publish/rich-text-image`, data, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
      timeout: LISTING_UPLOAD_TIMEOUT_MS,
    })
  },
  CreatePhase: (data: CreatePhasePayload) => {
    return AxiosRequest.post(`${LISTINGS_BASE}/publish/phase`, data, {
      timeout: LISTING_REQUEST_TIMEOUT_MS,
    })
  },
  DuplicatePhase: (phaseId: string) => {
    return AxiosRequest.post(
      `${LISTINGS_BASE}/publish/phase/${phaseId}/duplicate`,
      {},
      { timeout: LISTING_REQUEST_TIMEOUT_MS }
    )
  },
  UpdatePhase: (phaseId: string, data: { name: string }) => {
    return AxiosRequest.put(
      `${LISTINGS_BASE}/publish/phase/update/${phaseId}`,
      data,
      { timeout: LISTING_REQUEST_TIMEOUT_MS }
    )
  },
  DeletePhase: (phaseId: string) => {
    return AxiosRequest.del(
      `${LISTINGS_BASE}/publish/phase/delete/${phaseId}`,
      { timeout: LISTING_REQUEST_TIMEOUT_MS }
    )
  },
  CreateTask: (data: CreateTaskPayload) => {
    return AxiosRequest.post(`${LISTINGS_BASE}/publish/task`, data, {
      timeout: LISTING_REQUEST_TIMEOUT_MS,
    })
  },
  PublishProject: (projectId: string) => {
    return AxiosRequest.post(
      `${LISTINGS_BASE}/publish/project/${projectId}/publish`,
      {},
      { timeout: LISTING_REQUEST_TIMEOUT_MS }
    )
  },
  UnpublishProject: (projectId: string) => {
    return AxiosRequest.put(
      `${LISTINGS_BASE}/publish/project/${projectId}/unpublish`,
      {},
      { timeout: LISTING_REQUEST_TIMEOUT_MS }
    )
  },
  DeleteProject: (projectId: string) => {
    return AxiosRequest.del(`${LISTINGS_BASE}/publish/project/${projectId}`, {
      timeout: LISTING_REQUEST_TIMEOUT_MS,
    })
  },
  UpdateTask: (id: string, data: UpdateTaskPayload) => {
    return AxiosRequest.put(
      `${LISTINGS_BASE}/publish/task/update/${id}`,
      data,
      { timeout: LISTING_REQUEST_TIMEOUT_MS }
    )
  },
  GetProjectBySlug: async (slug: string) => {
    try {
      const res = await AxiosRequest.get(
        `${LISTINGS_BASE}/publish/project/slug/${slug}`,
        { timeout: LISTING_REQUEST_TIMEOUT_MS }
      )
      if (res?.data) return res
    } catch (err: any) {
      // QA-196/PMCM-402: a 403 means the listing exists but this user isn't
      // on its team — that has to reach the caller so it can show an
      // "unauthorized" state instead of silently treating it the same as a
      // genuine 404 and falling through to creating a brand-new draft.
      if (err?.response?.status === 403) throw err
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
      `${LISTINGS_BASE}/v1/projects/${projectId}/suggested-questions`,
      { timeout: LISTING_REQUEST_TIMEOUT_MS }
    )
  },
}
