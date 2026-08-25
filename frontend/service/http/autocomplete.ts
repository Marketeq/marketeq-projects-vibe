import AxiosRequest from ".."

export type AutocompleteTypeSuggestion = {
  id?: string
  label?: string
  value?: string
}

export type AutocompleteCategorySuggestion = {
  value: string
  uuid: string
  type: "category" | "subcategory"
}

export const AutocompleteAPI = {
  getCategories: (q: string) => {
    return AxiosRequest.get(
      `/autocomplete/categories?q=${encodeURIComponent(q)}`
    )
  },
  getByType: (type: string, q = "", limit?: number) => {
    const params = new URLSearchParams()
    if (q) params.set("q", q)
    if (limit) params.set("limit", String(limit))
    const suffix = params.toString() ? `?${params.toString()}` : ""
    return AxiosRequest.get(`/autocomplete/${type}${suffix}`)
  },
  submit: (data: { type: string; value: string; source?: string }) => {
    return AxiosRequest.post("/autocomplete/submit", data)
  },
  getCategoryMap: () => {
    return AxiosRequest.get("/autocomplete/category-map")
  },
  review: (data: { uuid: string; decision: "approve" | "reject" }) => {
    return AxiosRequest.patch("/autocomplete/review", data)
  },
}
