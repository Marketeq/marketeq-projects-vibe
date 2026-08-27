import { getPublicPortfolioUrl } from "@/lib/runtime-urls"
import AxiosRequest from ".."

const BASE = getPublicPortfolioUrl()

export type CaseStudyStatus = "draft" | "published" | "archived"

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
  schemaJson?: { blocks: CaseStudyBlock[] }
}

export interface RequestUploadResult {
  uploadUrl: string
  publicUrl: string
  key: string
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
  Publish: (id: string) => {
    return AxiosRequest.post<undefined>(`${BASE}/case-studies/${id}/publish`, undefined)
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
