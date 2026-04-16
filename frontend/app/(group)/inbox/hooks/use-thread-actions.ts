import { useCallback } from "react"
import { apiFetch } from "@/src/lib/api"

type JsonOpts = { method: "POST" | "DELETE" | "PATCH"; token: string }

async function call(path: string, { method, token }: JsonOpts) {
  return apiFetch(path, {
    method,
    headers: { Authorization: `Bearer ${token}` },
  })
}

export function useThreadActions(token: string) {
  // Thread-level pin (distinct from message-level pin)
  const pin = useCallback(
    (threadId: string) => call(`/v1/threads/${threadId}/pin`, { method: "POST", token }),
    [token]
  )
  const unpin = useCallback(
    (threadId: string) => call(`/v1/threads/${threadId}/pin`, { method: "DELETE", token }),
    [token]
  )

  // Star = favorite per AC §2
  const star = useCallback(
    (threadId: string) => call(`/v1/threads/${threadId}/star`, { method: "POST", token }),
    [token]
  )
  const unstar = useCallback(
    (threadId: string) => call(`/v1/threads/${threadId}/star`, { method: "DELETE", token }),
    [token]
  )

  const archive = useCallback(
    (threadId: string) => call(`/v1/threads/${threadId}/archive`, { method: "POST", token }),
    [token]
  )
  const unarchive = useCallback(
    (threadId: string) => call(`/v1/threads/${threadId}/archive`, { method: "DELETE", token }),
    [token]
  )

  const markUnread = useCallback(
    (threadId: string) => call(`/v1/threads/${threadId}/mark-unread`, { method: "POST", token }),
    [token]
  )
  const markRead = useCallback(
    (threadId: string) => call(`/v1/threads/${threadId}/read`, { method: "PATCH", token }),
    [token]
  )

  const spam = useCallback(
    (threadId: string) => call(`/v1/threads/${threadId}/spam`, { method: "POST", token }),
    [token]
  )
  const trash = useCallback(
    (threadId: string) => call(`/v1/threads/${threadId}/trash`, { method: "POST", token }),
    [token]
  )

  return { pin, unpin, star, unstar, archive, unarchive, markUnread, markRead, spam, trash }
}
