import { AutocompleteAPI } from "@/service/http/autocomplete"

export const fetchAutocomplete = async (
  type: string,
  q = ""
): Promise<any[]> => {
  const readLocalMock = async () => {
    const mod = await import(`@/public/mock/${type}.json`)
    return mod.default || mod
  }


  try {
    if (!q) {
      const data = await readLocalMock()
      return data.slice(0, 10)
    }

    const res = await AutocompleteAPI.getByType(type, q)
    return res.data
  } catch (err) {
    // Fallback to static JSON
    try {
      const data = await readLocalMock()
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
