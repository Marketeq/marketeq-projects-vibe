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
  getByType: (type: string, q = "") => {
    const suffix = q ? `?q=${encodeURIComponent(q)}` : ""
    return AxiosRequest.get(`/autocomplete/${type}${suffix}`)
  },
  submit: (data: { type: string; label: string }) => {
    return AxiosRequest.post("/autocomplete/submit", data)
  },
  getCategoryMap: () => {
    return AxiosRequest.get("/autocomplete/category-map")
  },
  review: (data: { uuid: string; decision: "approve" | "reject" }) => {
    return AxiosRequest.patch("/autocomplete/review", data)
  },
}
