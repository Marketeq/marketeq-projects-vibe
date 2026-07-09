import { AutocompleteAPI } from "@/service/http/autocomplete"

export const fetchAutocomplete = async (
  type: string,
  q = ""
): Promise<any[]> => {
  try {
    const res = await AutocompleteAPI.getByType(type, q)
    return res.data
  } catch (err) {
    // Fallback to static JSON
    try {
      const mod = await import(`@/public/mock/${type}.json`)
      const data = mod.default || mod
      if (!q) return data.slice(0, 10)
      const lower = q.toLowerCase()
      return data
        .filter((item: any) => (item.label || "").toLowerCase().includes(lower))
        .slice(0, 20)
    } catch {
      return []
    }
  }
}
