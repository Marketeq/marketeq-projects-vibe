import { useCallback, useEffect, useState } from "react"
import AllowedIpsAPI, {
  type AllowedIp,
  type AllowedIpInput,
  type OverlappingAllowedIp,
} from "@/service/http/allowed-ips"

/** The shape the IP Restrictions table renders. */
export interface AllowedIpEntry {
  id: string
  address: string
  description: string
  addedAt: string
}

const toEntry = (row: AllowedIp): AllowedIpEntry => ({
  id: row.id,
  address: row.address,
  description: row.description ?? "",
  addedAt: row.createdAt,
})

const messageFrom = (err: any, fallback: string): string =>
  err?.response?.data?.message || err?.message || fallback

/**
 * Persistence for Settings > IP Restrictions.
 *
 * The screen was fully built against React state, so every entry — including a
 * CSV import of hundreds of addresses — was lost on reload. Entries now live on
 * the server and come back keyed by the row id it assigns, which is also what
 * makes edit and delete address a specific row rather than a client-generated
 * timestamp id.
 *
 * Note what this does **not** do: nothing enforces the list at sign-in yet.
 * That belongs in the auth flow, which is under the login freeze. Saving an
 * address records an intent; it does not restrict anything.
 *
 * Only loads while the panel is open, matching useClientIp.
 */
export function useAllowedIps(enabled: boolean) {
  const [entries, setEntries] = useState<AllowedIpEntry[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!enabled) return
    let cancelled = false

    setIsLoading(true)
    AllowedIpsAPI.list()
      .then((res) => {
        if (cancelled) return
        setEntries((res.data ?? []).map(toEntry))
        setError(null)
      })
      .catch((err) => {
        if (cancelled) return
        setError(messageFrom(err, "Couldn't load your allowed IP addresses"))
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [enabled])

  /**
   * Adds one or many. Always goes through the bulk route so a single add and a
   * CSV import take the same path — and so an address already on the list comes
   * back as skipped rather than failing the whole request, which would make a
   * 200-row import something the user has to diff by hand.
   */
  const addMany = useCallback(
    async (
      inputs: AllowedIpInput[]
    ): Promise<{
      added: number
      skipped: string[]
      overlapping: OverlappingAllowedIp[]
    }> => {
      if (inputs.length === 0)
        return { added: 0, skipped: [], overlapping: [] }
      const res = await AllowedIpsAPI.createMany(inputs)
      const created = (res.data?.created ?? []).map(toEntry)
      setEntries((prev) => [...created, ...prev])
      return {
        added: created.length,
        skipped: res.data?.skipped ?? [],
        overlapping: res.data?.overlapping ?? [],
      }
    },
    []
  )

  const updateOne = useCallback(
    async (id: string, input: Partial<AllowedIpInput>) => {
      const res = await AllowedIpsAPI.update(id, input)
      const updated = toEntry(res.data)
      setEntries((prev) =>
        prev.map((entry) => (entry.id === id ? updated : entry))
      )
    },
    []
  )

  const removeOne = useCallback(async (id: string) => {
    // Dropped from the list first: the row is already gone from the user's
    // point of view, and restoring it on failure is less jarring than a row
    // that lingers after the click.
    const snapshot = entries
    setEntries((prev) => prev.filter((entry) => entry.id !== id))
    try {
      await AllowedIpsAPI.remove(id)
    } catch (err) {
      setEntries(snapshot)
      throw err
    }
  }, [entries])

  return { entries, isLoading, error, addMany, updateOne, removeOne }
}
