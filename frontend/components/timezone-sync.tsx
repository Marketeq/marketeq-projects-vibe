"use client"

import { useEffect } from "react"
import AxiosRequest from "../service/index"

export function TimezoneSync() {
  useEffect(() => {
    let alive = true

    const sync = async () => {
      try {
        const res = await AxiosRequest.patch(
          "/user/refresh-timezone",
          {},
          {
            withCredentials: true,
          }
        )

        if (!alive) return
        const { timeZone } = res.data
        // console.log("Timezone updated to:", timeZone)
      } catch (error) {
        // console.error("Timezone sync failed:", error)
      }
    }

    sync() // Initial call
    const intervalId = setInterval(sync, 1 * 60 * 1000) // Every 5 min

    return () => {
      alive = false
      clearInterval(intervalId)
    }
  }, [])

  return null
}
