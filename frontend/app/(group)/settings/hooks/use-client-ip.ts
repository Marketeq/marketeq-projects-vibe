import { useEffect, useState } from "react"
import AxiosRequest from "@/service"

/**
 * The caller's own public IP, as the server sees it.
 *
 * IP Restrictions has to tell someone which address to allow, and until this
 * existed the screen showed a constant that was identical for every user. The
 * gateway resolves it because it is the only service that sees the real
 * client — everything downstream is reached over an internal hop.
 *
 * Only fetches while the panel is open, and returns null rather than a
 * placeholder when the address cannot be determined: a wrong-but-plausible
 * address is worse than an absent one when it is the value being offered for
 * an allow-list.
 */
export function useClientIp(enabled: boolean) {
  const [ip, setIp] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (!enabled) return

    let cancelled = false
    setIsLoading(true)

    AxiosRequest.get("/v1/client-ip")
      .then((res) => {
        if (cancelled) return
        const payload = res?.data as { ip?: string | null } | undefined
        setIp(payload?.ip ?? null)
      })
      .catch((error) => {
        if (cancelled) return
        // Leave it unknown rather than guessing. The panel renders a dash.
        console.warn("[settings] could not resolve the client IP", error)
        setIp(null)
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [enabled])

  return { ip, isLoading }
}
