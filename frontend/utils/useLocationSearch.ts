import { useEffect, useState } from "react"

const LOCATIONIQ_API_KEY = "pk.8d6cd3795ace5efa9a0a3469b55d08cb" // Your key

export const useLocationSearch = (query: string) => {
  const [results, setResults] = useState<string[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const controller = new AbortController()

    if (query.length > 1) {
      setLoading(true)
      fetch(
        `https://api.locationiq.com/v1/autocomplete?key=${LOCATIONIQ_API_KEY}&q=${query}&limit=5&dedupe=1`,
        { signal: controller.signal }
      )
        .then((res) => res.json())
        .then((data) => {
          const filteredPlaces = data
            .map((item: any) => {
              const address = item.address || {}

              const city =
                address.city ||
                address.town ||
                address.village ||
                address.hamlet
              const state = address.state
              const country = address.country

              if (city && state && country) {
                return `${city}, ${state}, ${country}`
              }

              return null // Skip entries without full info
            })
            .filter((place: string | null) => place !== null)

          setResults(filteredPlaces as string[])
        })
        .catch((err) => {
          if (err.name !== "AbortError") console.error("Fetch error:", err)
        })
        .finally(() => setLoading(false))
    } else {
      setResults([])
    }

    return () => controller.abort()
  }, [query])

  return { results, loading }
}
