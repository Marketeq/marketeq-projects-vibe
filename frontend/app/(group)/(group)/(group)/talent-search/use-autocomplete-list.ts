"use client"

import { useQuery } from "@tanstack/react-query"
import { AutocompleteAPI } from "@/service/http/autocomplete"

/**
 * Fetches a full autocomplete option list (job titles, industries, skills,
 * locations, languages, ...) once per type and caches it — the sidebar
 * filters do their own client-side substring filtering as the user types,
 * so this asks for the whole list up front rather than re-querying per
 * keystroke.
 */
export function useAutocompleteList(type: string) {
  const query = useQuery({
    queryKey: ["autocomplete-list", type],
    queryFn: async () => {
      const response = await AutocompleteAPI.getByType(type, "", 200)
      const data = response?.data
      return Array.isArray(data)
        ? data
            .map((item: { label?: string }) => item?.label)
            .filter((label: unknown): label is string => Boolean(label))
        : []
    },
    staleTime: 5 * 60 * 1000,
    retry: 1,
  })

  return query.data ?? []
}
