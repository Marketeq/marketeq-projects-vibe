import { getPublicApiUrl } from "@/lib/runtime-urls"
import AxiosRequest from ".."

const BASE = getPublicApiUrl()

export type CaseStudyStatus = "draft" | "published" | "hidden" | "archived"

export interface CaseStudyBlock {
  type: string
  data: Record<string, unknown>
}

export interface CaseStudy {
  id: string
  ownerUserId: string
  title: string
  slug: string
  status: CaseStudyStatus
  schemaJson: { blocks: CaseStudyBlock[] } | null
  htmlPreview: string | null
  htmlPublished: string | null
  description: string | null
  coverImage: string | null
  coverImageZoom: number
  coverImageRotation: number
  coverImageOffsetX: number
  coverImageOffsetY: number
  skills: string[]
  likesCount: number
  createdAt: string
  updatedAt: string
}

/** Reply shape of both case-study like routes. */
export interface CaseStudyLikeState {
  /** Whether the CURRENT viewer has liked it — not whether anyone has. */
  liked: boolean
  likesCount: number
}

export interface ListCaseStudiesParams {
  status?: CaseStudyStatus | "all"
  limit?: number
  offset?: number
}

export interface ListCaseStudiesResult {
  items: CaseStudy[]
  total: number
}

export interface CreateCaseStudyPayload {
  title: string
  templateId?: string
}

export interface UpdateCaseStudyPayload {
  title?: string
  description?: string
  schemaJson?: { blocks: CaseStudyBlock[] }
}

export interface PublishCaseStudyPayload {
  coverImage?: string
  coverImageZoom?: number
  coverImageRotation?: number
  coverImageOffsetX?: number
  coverImageOffsetY?: number
  skills?: string[]
}

export interface RequestUploadResult {
  uploadUrl: string
  publicUrl: string
  key: string
  contentType: string
}

export const CaseStudyAPI = {
  Create: (data: CreateCaseStudyPayload) => {
    return AxiosRequest.post<CreateCaseStudyPayload>(
      `${BASE}/case-studies`,
      data
    )
  },
  List: (params?: ListCaseStudiesParams) => {
    return AxiosRequest.get(`${BASE}/case-studies`, { params })
  },
  Get: (id: string) => {
    return AxiosRequest.get(`${BASE}/case-studies/${id}`)
  },
  Update: (id: string, data: UpdateCaseStudyPayload) => {
    return AxiosRequest.patch<UpdateCaseStudyPayload>(
      `${BASE}/case-studies/${id}`,
      data
    )
  },
  ReorderBlocks: (id: string, blockOrder: string[]) => {
    return AxiosRequest.patch<{ blockOrder: string[] }>(
      `${BASE}/case-studies/${id}/blocks/reorder`,
      { blockOrder }
    )
  },
  Publish: (id: string, details?: PublishCaseStudyPayload) => {
    return AxiosRequest.post<PublishCaseStudyPayload | undefined>(
      `${BASE}/case-studies/${id}/publish`,
      details
    )
  },
  SetVisibility: (id: string, status: Extract<CaseStudyStatus, "published" | "hidden">) => {
    return AxiosRequest.patch<{ status: string }>(
      `${BASE}/case-studies/${id}/visibility`,
      { status }
    )
  },
  Delete: (id: string) => {
    return AxiosRequest.del(`${BASE}/case-studies/${id}`)
  },
  GetPublicBySlug: (slug: string) => {
    return AxiosRequest.get(`${BASE}/case-studies/public/${slug}`)
  },
  /** One talent's PUBLISHED case studies — no login needed, any viewer. */
  ListPublic: (
    ownerUserId: string,
    params?: Omit<ListCaseStudiesParams, "status">
  ) => {
    return AxiosRequest.get(`${BASE}/case-studies/public`, {
      params: { ...params, ownerUserId },
    })
  },
  /** A published case study by id, for a viewer who doesn't own it. */
  GetPublicById: (id: string) => {
    return AxiosRequest.get(`${BASE}/case-studies/public/id/${id}`)
  },
  GetLikeState: (id: string) => {
    return AxiosRequest.get(`${BASE}/case-studies/${id}/like`)
  },
  /** Likes it, or removes this viewer's like if they already had one. */
  ToggleLike: (id: string) => {
    return AxiosRequest.post<Record<string, never>>(
      `${BASE}/case-studies/${id}/like`,
      {}
    )
  },
  RequestUpload: (fileName: string, fileSize: number) => {
    return AxiosRequest.post<{ fileName: string; fileSize: number }>(
      `${BASE}/media/upload`,
      { fileName, fileSize }
    )
  },
  DeleteUpload: (key: string) => {
    return AxiosRequest.del(`${BASE}/media/remove`, { params: { key } })
  },
}
