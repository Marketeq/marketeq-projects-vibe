import { useQuery } from "@tanstack/react-query"
import { type CategoryPageData, CategoryPagesAPI } from "./api"

const queryKeys = {
  l1: (l1: string, params?: any) =>
    ["category-page", "l1", l1, params ?? {}] as const,
  l2: (l1: string, l2: string, params?: any) =>
    ["category-page", "l2", l1, l2, params ?? {}] as const,
  l3: (l1: string, l2: string, l3: string, params?: any) =>
    ["category-page", "l3", l1, l2, l3, params ?? {}] as const,
}

export function useCategoryPageL1(
  l1: string,
  params?: { kind?: string; cursor?: string; limit?: number },
  options?: { enabled?: boolean }
) {
  return useQuery<CategoryPageData>({
    queryKey: queryKeys.l1(l1, params),
    queryFn: () => CategoryPagesAPI.getL1(l1, params),
    ...(options ?? {}),
  })
}

export function useCategoryPageL2(
  l1: string,
  l2: string,
  params?: { kind?: string; cursor?: string; limit?: number },
  options?: { enabled?: boolean }
) {
  return useQuery<CategoryPageData>({
    queryKey: queryKeys.l2(l1, l2, params),
    queryFn: () => CategoryPagesAPI.getL2(l1, l2, params),
    ...(options ?? {}),
  })
}

export function useCategoryPageL3(
  l1: string,
  l2: string,
  l3: string,
  params?: { kind?: string; cursor?: string; limit?: number },
  options?: { enabled?: boolean }
) {
  return useQuery<CategoryPageData>({
    queryKey: queryKeys.l3(l1, l2, l3, params),
    queryFn: () => CategoryPagesAPI.getL3(l1, l2, l3, params),
    ...(options ?? {}),
  })
}
