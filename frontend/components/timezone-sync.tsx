"use client"

import { useEffect } from "react"
import { useAuth } from "@/contexts/auth"
import { UserAPI } from "@/service/http/user"

type TimezoneSyncState = {
  userId: string
  timeZone: string
  syncedAt: number
}

const TIMEZONE_SYNC_STORAGE_KEY = "marketeq:timezone-sync"
const SYNC_TTL_MS = 6 * 60 * 60 * 1000
const CHECK_INTERVAL_MS = 15 * 60 * 1000

const getBrowserTimeZone = () => {
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone
  return typeof timeZone === "string" && timeZone.trim()
    ? timeZone.trim()
    : null
}

const readSyncState = (): TimezoneSyncState | null => {
  try {
    const raw = window.localStorage.getItem(TIMEZONE_SYNC_STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as TimezoneSyncState

    if (
      typeof parsed?.userId !== "string" ||
      typeof parsed?.timeZone !== "string" ||
      typeof parsed?.syncedAt !== "number"
    ) {
      return null
    }

    return parsed
  } catch {
    return null
  }
}

const writeSyncState = (state: TimezoneSyncState) => {
  try {
    window.localStorage.setItem(
      TIMEZONE_SYNC_STORAGE_KEY,
      JSON.stringify(state)
    )
  } catch {
    // Best-effort cache only.
  }
}

const shouldSync = (userId: string, timeZone: string) => {
  const state = readSyncState()
  if (!state) return true
  if (state.userId !== userId) return true
  if (state.timeZone !== timeZone) return true
  return Date.now() - state.syncedAt > SYNC_TTL_MS
}

export function TimezoneSync() {
  const { user, isAuthChecked } = useAuth()

  useEffect(() => {
    if (!isAuthChecked || !user?.id) return

    let mounted = true
    const userId = user.id

    const sync = async () => {
      const clientTimeZone = getBrowserTimeZone()
      if (!clientTimeZone) return
      if (!shouldSync(userId, clientTimeZone)) return

      try {
        const response = await UserAPI.refreshTimezone({ clientTimeZone })
        if (!mounted) return
        const resolvedTimeZone =
          typeof response?.data?.timeZone === "string" &&
          response.data.timeZone.trim()
            ? response.data.timeZone.trim()
            : clientTimeZone

        writeSyncState({
          userId,
          timeZone: resolvedTimeZone,
          syncedAt: Date.now(),
        })
      } catch {
        // Best effort; do not block the app.
      }
    }

    void sync()

    const intervalId = window.setInterval(() => {
      void sync()
    }, CHECK_INTERVAL_MS)

    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        void sync()
      }
    }

    document.addEventListener("visibilitychange", onVisibilityChange)

    return () => {
      mounted = false
      window.clearInterval(intervalId)
      document.removeEventListener("visibilitychange", onVisibilityChange)
    }
  }, [isAuthChecked, user?.id])

  return null
}
