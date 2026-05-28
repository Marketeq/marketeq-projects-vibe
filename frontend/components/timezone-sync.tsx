"use client"

import { useEffect } from "react"
import Cookies from "js-cookie"
import AxiosRequest from "../service/index"

export function TimezoneSync() {
  useEffect(() => {
    let alive = true

    const sync = async () => {
      try {
        const hasSession =
          Boolean(Cookies.get("access_token")) ||
          Boolean(Cookies.get("refresh_token"))
        if (!hasSession) return

        const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone
        if (!timeZone) return

        if (!alive) return

        await AxiosRequest.patch(
          "/user/refresh-timezone",
          { clientTimeZone: timeZone },
          { withCredentials: true }
        )
      } catch {
        // Sync failed silently
      }
    }

    sync()
    const intervalId = setInterval(sync, 5 * 60 * 1000)

    return () => {
      alive = false
      clearInterval(intervalId)
    }
  }, [])

  return null
}
