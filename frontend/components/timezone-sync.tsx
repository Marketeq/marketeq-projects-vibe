"use client"

import { useEffect } from "react"
import AxiosRequest from "../service/index"

export function TimezoneSync() {
  useEffect(() => {
    let alive = true

    const sync = async () => {
      try {
        const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone
        if (!timeZone) return

        // Get GPS coordinates from browser (server validates against IP region)
        let lat: number | undefined
        let lng: number | undefined
        try {
          const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
            navigator.geolocation.getCurrentPosition(resolve, reject, {
              timeout: 5000,
              maximumAge: 300000, // Cache for 5 min
            })
          )
          lat = pos.coords.latitude
          lng = pos.coords.longitude
        } catch {
          // Geolocation denied — server will use IP-only location
        }

        if (!alive) return

        await AxiosRequest.patch(
          "/user/refresh-timezone",
          { timeZone, ...(lat != null && lng != null ? { lat, lng } : {}) },
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
