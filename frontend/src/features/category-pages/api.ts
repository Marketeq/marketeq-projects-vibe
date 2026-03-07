import { http } from "../../lib/http"

export type CategoryPageData = {
  category: {
    uuid: string
    name: string
    slug: string
    seo?: {
      title?: string
      description?: string
    }
  }
  breadcrumbs: Array<{
    uuid: string
    name: string
    slug: string
  }>
  parent?: {
    uuid: string
    name: string
    slug: string
  } | null
  children?: Array<{
    uuid: string
    name: string
    slug: string
  }>
  siblings?: Array<{
    uuid: string
    name: string
    slug: string
  }>
  blocks: Array<{
    key: string
    type: string
    entity: string
    title: string
    description?: string
    items: any[]
    pagination?: {
      nextCursor?: string
      hasMore: boolean
    }
    viewMoreUrl?: string
  }>
  suggestions?: {
    relatedCategories?: any[]
    trendingCategories?: any[]
    popularCategories?: any[]
    relatedSkills?: any[]
  }
  editorial?: {
    hero?: any
    guides?: any[]
    courses?: any[]
    faq?: any[]
  }
}

export const CategoryPagesAPI = {
  getL1: (l1: string, params?: { kind?: string; cursor?: string; limit?: number }) => {
    const query = new URLSearchParams()
    if (params?.kind) query.set("kind", params.kind)
    if (params?.cursor) query.set("cursor", params.cursor)
    if (params?.limit) query.set("limit", String(params.limit))
    
    const qs = query.toString()
    return http.get<CategoryPageData>(`/category-pages/${l1}${qs ? `?${qs}` : ""}`)
  },

  getL2: (l1: string, l2: string, params?: { kind?: string; cursor?: string; limit?: number }) => {
    const query = new URLSearchParams()
    if (params?.kind) query.set("kind", params.kind)
    if (params?.cursor) query.set("cursor", params.cursor)
    if (params?.limit) query.set("limit", String(params.limit))
    
    const qs = query.toString()
    return http.get<CategoryPageData>(`/category-pages/${l1}/${l2}${qs ? `?${qs}` : ""}`)
  },

  getL3: (l1: string, l2: string, l3: string, params?: { kind?: string; cursor?: string; limit?: number }) => {
    const query = new URLSearchParams()
    if (params?.kind) query.set("kind", params.kind)
    if (params?.cursor) query.set("cursor", params.cursor)
    if (params?.limit) query.set("limit", String(params.limit))
    
    const qs = query.toString()
    return http.get<CategoryPageData>(`/category-pages/${l1}/${l2}/${l3}${qs ? `?${qs}` : ""}`)
  }
}