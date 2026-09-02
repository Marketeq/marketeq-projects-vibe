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
  createdAt: string
  updatedAt: string
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
