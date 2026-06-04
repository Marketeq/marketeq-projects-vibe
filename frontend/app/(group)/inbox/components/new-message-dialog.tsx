"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { apiFetch } from "@/src/lib/api"
import { getAccessToken, getCurrentUser } from "@/utils/auth"
import { SearchMd, X } from "@blend-metrics/icons"
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  Dialog,
  DialogClose,
  DialogContent,
} from "@/components/ui"

interface UserPickerItem {
  id: string
  username?: string | null
  firstName?: string | null
  lastName?: string | null
  avatarUrl?: string | null
  displayName: string
}

interface NewMessageDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

// Bold the matching substring in `text`. Mirrors the helper used in
// forward-message-dialog.tsx so the two pickers feel identical.
function HighlightMatch({ text, query }: { text: string; query: string }) {
  if (!query.trim()) return <>{text}</>
  const q = query.trim().toLowerCase()
  const parts: React.ReactNode[] = []
  let i = 0
  const lower = text.toLowerCase()
  while (i < text.length) {
    const idx = lower.indexOf(q, i)
    if (idx === -1) {
      parts.push(text.slice(i))
      break
    }
    if (idx > i) parts.push(text.slice(i, idx))
    parts.push(
      <strong key={idx} className="font-bold text-dark-blue-400">
        {text.slice(idx, idx + q.length)}
      </strong>
    )
    i = idx + q.length
  }
  return <>{parts}</>
}

export function NewMessageDialog({
  open,
  onOpenChange,
}: NewMessageDialogProps) {
  const router = useRouter()
  const [users, setUsers] = useState<UserPickerItem[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fetchKey, setFetchKey] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const currentUser = getCurrentUser()

  useEffect(() => {
    if (!open) return
    setSearchQuery("")
    setError(null)
  }, [open])

  // Fetch users on open. Backend has no name-search endpoint, so we pull
  // a page of users and filter client-side. Same shape pattern the forward
  // dialog uses for its contacts list.
  useEffect(() => {
    if (!open) return
    const token = getAccessToken()
    if (!token) return

    setIsLoading(true)
    const controller = new AbortController()
    ;(async () => {
      try {
        const response = await apiFetch<unknown>(
          "/v1/users?limit=100&offset=0",
          {
            method: "GET",
            headers: { Authorization: `Bearer ${token}` },
            signal: controller.signal,
          }
        )
        if (controller.signal.aborted) return
        const list = Array.isArray(response)
          ? response
          : ((response as { data?: unknown[]; users?: unknown[] }).data ??
            (response as { users?: unknown[] }).users ??
            [])
        const items: UserPickerItem[] = (list as Array<Record<string, unknown>>)
          .filter((u) => u?.id && u.id !== currentUser?.id)
          .map((u) => ({
            id: String(u.id),
            username: (u.username as string | undefined) ?? null,
            firstName: (u.firstName as string | undefined) ?? null,
            lastName: (u.lastName as string | undefined) ?? null,
            avatarUrl: (u.avatarUrl as string | undefined) ?? null,
            displayName:
              (u.firstName as string | undefined)?.trim() ||
              (u.username as string | undefined) ||
              "Unknown",
          }))
        setUsers(items)
      } catch (err) {
        if ((err as { name?: string })?.name === "AbortError") return
        console.error("[NewMessageDialog] failed to fetch users", err)
        const msg = (err as Error)?.message || ""
        if (msg.includes("401") || msg.includes("UNAUTHORIZED")) {
          setError("Session expired — please log in again")
        } else if (msg.includes("502") || msg.includes("503")) {
          setError("Server is starting up — please retry in a moment")
        } else {
          setError("Failed to load users — please try again")
        }
      } finally {
        if (!controller.signal.aborted) setIsLoading(false)
      }
    })()
    return () => controller.abort()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, currentUser?.id, fetchKey])

  const filteredUsers = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    if (!q) return users
    return users.filter(
      (u) =>
        u.displayName.toLowerCase().includes(q) ||
        (u.username || "").toLowerCase().includes(q) ||
        (u.firstName || "").toLowerCase().includes(q) ||
        (u.lastName || "").toLowerCase().includes(q)
    )
  }, [users, searchQuery])

  // The existing left-sidebar effect at left-sidebar.tsx:468 picks up
  // ?participantId=... and either selects an existing 1:1 thread or creates
  // a new one via POST /v1/threads. Reuse that flow rather than duplicating
  // the create logic here.
  const handleSelect = (user: UserPickerItem) => {
    onOpenChange(false)
    router.push(`/inbox?participantId=${encodeURIComponent(user.id)}`)
  }

  const getInitials = (item: UserPickerItem) =>
    item.displayName.charAt(0).toUpperCase() || "?"

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[420px] p-0 rounded-xl shadow-2xl">
        <div className="px-6 pt-6 pb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-dark-blue-400">
            New message
          </h2>
          <DialogClose asChild>
            <button
              type="button"
              className="text-gray-400 hover:text-gray-600"
              aria-label="Close"
            >
              <X className="size-5" />
            </button>
          </DialogClose>
        </div>

        <div className="px-6 pb-3">
          <div className="min-h-11 px-2 py-1.5 border border-gray-300 rounded-lg flex items-center gap-1.5 transition focus-within:border-primary-500 focus-within:ring-2 focus-within:ring-primary-100">
            <SearchMd className="size-4 text-gray-400 shrink-0 ml-1" />
            <input
              ref={inputRef}
              type="text"
              className="flex-1 bg-transparent outline-none border-0 p-0 m-0 focus:ring-0 focus:outline-none text-sm placeholder:text-gray-400 min-w-0"
              placeholder="Search by name or username"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              autoFocus
            />
          </div>
        </div>

        <div className="max-h-[280px] overflow-y-auto px-2 pb-4">
          {isLoading ? (
            <div className="px-4 py-6 text-center text-sm text-gray-500">
              Loading...
            </div>
          ) : error ? (
            <div className="px-4 py-6 text-center">
              <p className="text-sm text-error-500">{error}</p>
              <button
                type="button"
                className="mt-2 text-xs font-medium text-primary-500 hover:text-primary-600 hover:underline transition"
                onClick={() => {
                  setError(null)
                  setFetchKey((k) => k + 1)
                }}
              >
                Retry
              </button>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="px-4 py-6 text-center text-sm text-gray-500">
              No users found
            </div>
          ) : (
            filteredUsers.map((user) => (
              <button
                key={user.id}
                type="button"
                className="w-full flex items-center gap-3 px-4 py-2 rounded-lg hover:bg-gray-50 text-left transition"
                onClick={() => handleSelect(user)}
              >
                <Avatar size="md" className="shrink-0">
                  <AvatarImage
                    src={user.avatarUrl ?? undefined}
                    alt={user.displayName}
                  />
                  <AvatarFallback>{getInitials(user)}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-dark-blue-400 truncate">
                    <HighlightMatch
                      text={user.displayName}
                      query={searchQuery}
                    />
                  </div>
                  {user.username && (
                    <div className="text-xs text-gray-500 truncate">
                      @
                      <HighlightMatch
                        text={user.username}
                        query={searchQuery}
                      />
                    </div>
                  )}
                </div>
              </button>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
