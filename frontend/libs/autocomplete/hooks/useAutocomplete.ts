import { useState, useEffect, useRef } from 'react'
import { autocompleteSources } from '../config/autocompleteConfig'

export function useAutocomplete(type: string, query: string, debounceMs = 250) {
  const [suggestions, setSuggestions] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout>>(null)

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current)

    const source = autocompleteSources[type]
    if (!source) return

    if (!query || query.trim().length === 0) {
      // Load defaults (no query)
      setLoading(true)
      source().then(data => {
        setSuggestions(data)
        setLoading(false)
      }).catch(() => setLoading(false))
      return
    }

    timerRef.current = setTimeout(() => {
      setLoading(true)
      source(query).then(data => {
        setSuggestions(data)
        setLoading(false)
      }).catch(() => setLoading(false))
    }, debounceMs)

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [type, query, debounceMs])

  return { suggestions, loading }
}
