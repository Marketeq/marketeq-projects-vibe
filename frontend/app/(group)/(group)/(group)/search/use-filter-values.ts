"use client"

import { useQuery } from "@tanstack/react-query"
import {
  SearchAPI,
  type FilterValueField,
  type FilterValuesResponse,
  type FilterValueScope,
  type NumericBucketCount,
  type NumericBucketField,
  type NumericBucketScope,
  type NumericBucketsResponse,
  type PopularValue,
} from "@/service/http/search"

export type {
  PopularValue,
  FilterValueField,
  FilterValueScope,
  NumericBucketCount,
  NumericBucketField,
  NumericBucketScope,
}

/**
 * The most-used values that entity's records actually carry for one filter
 * field, most popular first — each entity gets its own set.
 *
 * This is what makes the Tags, Industry, Skills and Job Title filters
 * self-maintaining: the options come from what people entered on their
 * listings and profiles rather than a hand-maintained list, so they stay
 * current as records are published, and a value is only ever offered when at
 * least one record carries it — picking one on its own can't land on zero
 * results. Values used by several entities show up in each response, which is
 * intended.
 *
 * `limit` is left to the backend by default: it applies a per-field default
 * chosen for that control's shape (a short checkbox list for Tags, a longer
 * scrollable list for Industry, Skills and Job Title).
 *
 * Scoped cache key: the entities must not serve each other's values from
 * cache when the user switches tabs.
 */
export function useFilterValues(
  scope: FilterValueScope | undefined,
  field: FilterValueField,
  limit?: number
) {
  return useQuery({
    queryKey: ["filter-values", scope, field, limit ?? null],
    queryFn: async () => {
      const response = await SearchAPI.getFilterValues(
        scope as FilterValueScope,
        field,
        limit
      )
      const values = (response?.data as FilterValuesResponse | undefined)?.values
      return Array.isArray(values) ? values : []
    },
    enabled: Boolean(scope),
    staleTime: 5 * 60 * 1000,
    retry: 1,
  })
}

/**
 * The rungs of a numeric filter that have records behind them, most selective
 * first. Same idea as useFilterValues, for a filter whose options are ranges:
 * ticking an offered threshold can't land on zero results, and a stat nobody
 * has filled in yields no rungs at all, so the section hides rather than
 * offering checkboxes that all return nothing.
 *
 * `undefined` while loading is deliberately distinct from `[]`: the caller
 * renders nothing in both cases, but only the empty array means "asked and
 * nobody qualifies".
 */
export function useNumericBuckets(
  scope: NumericBucketScope | undefined,
  field: NumericBucketField
) {
  return useQuery({
    queryKey: ["numeric-buckets", scope, field],
    queryFn: async () => {
      const response = await SearchAPI.getNumericBuckets(
        scope as NumericBucketScope,
        field
      )
      const buckets = (response?.data as NumericBucketsResponse | undefined)
        ?.buckets
      return Array.isArray(buckets) ? buckets : []
    },
    enabled: Boolean(scope),
    staleTime: 5 * 60 * 1000,
    retry: 1,
  })
}

/** Just the display names, in the same most-used-first order. */
export function useFilterValueNames(
  scope: FilterValueScope | undefined,
  field: FilterValueField,
  limit?: number
) {
  const query = useFilterValues(scope, field, limit)
  return {
    ...query,
    names: (query.data ?? []).map((value) => value.name),
  }
}
