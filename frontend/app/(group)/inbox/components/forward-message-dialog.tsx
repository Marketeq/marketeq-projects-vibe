"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { SearchMd, X } from "@blend-metrics/icons"
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  Button,
  Dialog,
  DialogClose,
  DialogContent,
} from "@/components/ui"
import { apiFetch } from "@/src/lib/api"
import { decryptAES, encryptAES } from "@/src/crypto/e2ee"
import { loadKey, saveKey } from "@/src/crypto/storage"
import { getAccessToken } from "@/utils/auth"
import { useToast } from "@/components/ui/toast/use-toast"
import type { Conversation } from "@/types/conversation"
import type { Message } from "@/types/message"
import { UNDECRYPTABLE_PLACEHOLDER } from "../constants"

interface UserLike {
  id?: string
  username?: string | null
  firstName?: string | null
  lastName?: string | null
  avatarUrl?: string | null
}

interface ForwardMessageDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  message: Message | null
  currentUserId: string
  currentUserProfile?: UserLike | null
  receiverUser?: UserLike | null
  privateKey: CryptoKey | null
}

interface Contact {
  userId: string
  threadId: string
  firstName?: string
  lastName?: string
  username?: string
  avatarUrl?: string
  displayName: string
  isOnline?: boolean
}

const MAX_RECIPIENTS = 5

/**
 * Highlight matching letters in bold (case-insensitive).
 * Renders nodes with <strong> for the matching portions.
 */
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

function formatMessageDate(iso: string): string {
  try {
    const d = new Date(iso)
    const date = d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
    const time = d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true })
    return `${date} ${time}`
  } catch {
    return iso
  }
}

export function ForwardMessageDialog({
  open,
  onOpenChange,
  message,
  currentUserId,
  currentUserProfile,
  receiverUser,
  privateKey,
}: ForwardMessageDialogProps) {
  const { toast } = useToast()
  const [contacts, setContacts] = useState<Contact[]>([])
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [searchQuery, setSearchQuery] = useState("")
  const [addedMessage, setAddedMessage] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showLimitWarning, setShowLimitWarning] = useState(false)
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const searchContainerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Reset state when dialog opens
  useEffect(() => {
    if (!open) return
    setSelectedIds(new Set())
    setSearchQuery("")
    setAddedMessage("")
    setError(null)
    setShowLimitWarning(false)
    setIsDropdownOpen(false)
  }, [open])

  // Close dropdown when clicking outside the search container
  useEffect(() => {
    if (!isDropdownOpen) return
    const handleClickOutside = (e: MouseEvent) => {
      if (
        searchContainerRef.current &&
        !searchContainerRef.current.contains(e.target as Node)
      ) {
        setIsDropdownOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [isDropdownOpen])

  // Fetch recent contacts when dialog opens
  useEffect(() => {
    if (!open) return
    const token = getAccessToken()
    if (!token) return

    setIsLoading(true)
    ;(async () => {
      try {
        const threads = await apiFetch<Conversation[]>("/v1/threads", {
          method: "GET",
          headers: { Authorization: `Bearer ${token}` },
        })

        const contactList: Contact[] = []
        const seen = new Set<string>()

        for (const t of threads) {
          if (t.isGroup) continue
          const otherId = t.participantIds?.find((id) => id !== currentUserId)
          if (!otherId || seen.has(otherId)) continue
          seen.add(otherId)

          try {
            const user = await apiFetch<{
              id: string
              username?: string
              firstName?: string
              lastName?: string
              avatarUrl?: string
            }>(`/users/${otherId}`, {
              method: "GET",
              headers: { Authorization: `Bearer ${token}` },
            })

            const displayName =
              user.firstName?.trim() || user.username || "Unknown"

            contactList.push({
              userId: otherId,
              threadId: t.id,
              firstName: user.firstName,
              lastName: user.lastName,
              username: user.username,
              avatarUrl: user.avatarUrl,
              displayName,
              isOnline: true, // TODO: wire real presence
            })
          } catch {
            // Skip failed lookups
          }
        }

        setContacts(contactList)
      } catch (err) {
        console.error("[ForwardDialog] Failed to load contacts", err)
        setError("Failed to load contacts")
      } finally {
        setIsLoading(false)
      }
    })()
  }, [open, currentUserId])

  // Filter contacts by search query (exclude already-selected from dropdown)
  const filteredContacts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    return contacts.filter((c) => {
      if (selectedIds.has(c.userId)) return false
      if (!q) return true
      return (
        c.displayName.toLowerCase().includes(q) ||
        (c.username || "").toLowerCase().includes(q)
      )
    })
  }, [contacts, searchQuery, selectedIds])

  const selectedContacts = useMemo(
    () => contacts.filter((c) => selectedIds.has(c.userId)),
    [contacts, selectedIds]
  )

  const toggleSelect = (contact: Contact) => {
    setShowLimitWarning(false)
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(contact.userId)) {
        next.delete(contact.userId)
      } else {
        if (next.size >= MAX_RECIPIENTS) {
          setShowLimitWarning(true)
          return prev
        }
        next.add(contact.userId)
      }
      return next
    })
    setSearchQuery("")
    inputRef.current?.focus()
  }

  const removeSelected = (userId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      next.delete(userId)
      return next
    })
  }

  const handleSend = async () => {
    if (!message || selectedIds.size === 0) return
    const token = getAccessToken()
    if (!token) return

    setIsSending(true)
    setError(null)

    try {
      let originalText = message.content || ""
      const sourceThreadId = message.threadId || message.conversationId

      if (message.ciphertext && sourceThreadId) {
        let sourceKey: Uint8Array | null = null
        try {
          sourceKey = loadKey(sourceThreadId)
        } catch {
          // source key not cached
        }

        if (!sourceKey && privateKey) {
          try {
            const { encryptedKey } = await apiFetch<{ encryptedKey: string }>(
              `/api/messaging/conversations/${sourceThreadId}/key?isGroup=false`,
              { headers: { Authorization: `Bearer ${token}` } }
            )
            const wrapped = Uint8Array.from(atob(encryptedKey), (c) =>
              c.charCodeAt(0)
            )
            const rawBuffer = await crypto.subtle.decrypt(
              { name: "RSA-OAEP" },
              privateKey,
              wrapped
            )
            sourceKey = new Uint8Array(rawBuffer)
            const b64 = btoa(String.fromCharCode(...sourceKey))
            saveKey(sourceThreadId, b64)
          } catch (err) {
            console.error("[ForwardDialog] Failed to fetch source conversation key", err)
          }
        }

        if (!sourceKey) {
          throw new Error("Encryption key unavailable for source message.")
        }
        originalText = await decryptAES(message.ciphertext, sourceKey)
      } else if (originalText.trim() === UNDECRYPTABLE_PLACEHOLDER) {
        throw new Error("Source message is encrypted and unavailable for forwarding.")
      }

      for (const contact of selectedContacts) {
        let key: Uint8Array | null = null
        try {
          key = loadKey(contact.threadId)
        } catch {
          // key not cached
        }

        if (!key && privateKey) {
          try {
            const { encryptedKey } = await apiFetch<{ encryptedKey: string }>(
              `/api/messaging/conversations/${contact.threadId}/key?isGroup=false`,
              { headers: { Authorization: `Bearer ${token}` } }
            )
            const wrapped = Uint8Array.from(atob(encryptedKey), (c) =>
              c.charCodeAt(0)
            )
            const rawBuffer = await crypto.subtle.decrypt(
              { name: "RSA-OAEP" },
              privateKey,
              wrapped
            )
            key = new Uint8Array(rawBuffer)
            const b64 = btoa(String.fromCharCode(...key))
            saveKey(contact.threadId, b64)
          } catch (err) {
            console.error("[ForwardDialog] Failed to fetch conversation key", err)
          }
        }

        if (!key) {
          throw new Error(
            `Encryption key unavailable for ${contact.displayName}. Cannot forward.`
          )
        }

        // Slack/Telegram-style: one message carries both the wrapper and the quoted original.
        const quotedCiphertext = await encryptAES(originalText, key)
        const wrapperCiphertext = addedMessage.trim()
          ? await encryptAES(addedMessage.trim(), key)
          : null

        await apiFetch(`/v1/messages`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
          body: {
            threadId: contact.threadId,
            ciphertext: wrapperCiphertext,
            forwardedFromId: message.id,
            quotedCiphertext,
          },
        })
      }

      onOpenChange(false)
      toast({
        title: "Message Forwarded",
        variant: "success",
      })
    } catch (err) {
      console.error("[ForwardDialog] Send failed", err)
      setError("Failed to forward message. Try again.")
    } finally {
      setIsSending(false)
    }
  }

  const getInitials = (c: { displayName: string }) =>
    c.displayName.charAt(0).toUpperCase() || "?"

  // Pick sender profile based on who sent the message being forwarded
  const isMyMessage = message?.senderId === currentUserId
  const senderProfile: UserLike | null | undefined = isMyMessage
    ? currentUserProfile
    : receiverUser
  const senderFullName =
    senderProfile?.firstName?.trim() || (isMyMessage ? "Me" : "Unknown")
  const senderLabel = isMyMessage ? "Me" : senderFullName
  const senderUsername = senderProfile?.username || ""
  const senderAvatarUrl = senderProfile?.avatarUrl || undefined

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[420px] p-0 rounded-xl shadow-2xl">
        <div className="flex flex-col">
          {/* Header */}
          <div className="px-6 pt-6 pb-4 flex items-center justify-between">
            <h2 className="text-base leading-6 font-semibold text-dark-blue-400">
              Forward Message
            </h2>
            <DialogClose asChild>
              <button
                type="button"
                className="text-gray-400 hover:text-gray-600 transition"
                aria-label="Close"
              >
                <X className="size-4" />
              </button>
            </DialogClose>
          </div>

          {/* Search input with inline chips */}
          <div className="px-6 pb-3 relative" ref={searchContainerRef}>
            <div
              className={`min-h-11 px-2 py-1.5 border rounded-lg flex flex-wrap items-center gap-1.5 transition cursor-text ${
                isDropdownOpen
                  ? "border-primary-500 ring-2 ring-primary-100"
                  : "border-gray-300"
              }`}
              onClick={() => {
                setIsDropdownOpen(true)
                inputRef.current?.focus()
              }}
            >
              {selectedContacts.map((c) => (
                <span
                  key={c.userId}
                  className="inline-flex items-center gap-x-1 bg-gray-100 text-dark-blue-400 text-xs font-medium pl-0.5 pr-1.5 py-0.5 rounded-full"
                >
                  <Avatar size="xs" className="shrink-0 size-5">
                    <AvatarImage src={c.avatarUrl || undefined} alt={c.displayName} />
                    <AvatarFallback delayMs={0}>{getInitials(c)}</AvatarFallback>
                  </Avatar>
                  <span>
                    {c.displayName.split(" ")[0]}{" "}
                    <span className="text-primary-500">@{c.username}</span>
                  </span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      removeSelected(c.userId)
                    }}
                    className="hover:bg-gray-200 rounded-full p-0.5 transition"
                    aria-label={`Remove ${c.displayName}`}
                  >
                    <X className="size-3 text-gray-500" />
                  </button>
                </span>
              ))}
              <div className="inline-flex items-center flex-1 min-w-[120px] pl-1">
                <SearchMd className="size-4 text-gray-400 shrink-0" />
                <input
                  ref={inputRef}
                  type="text"
                  className="flex-1 bg-transparent outline-none border-0 p-0 m-0 focus:ring-0 focus:outline-none text-sm placeholder:text-gray-400 min-w-0 ml-1.5"
                  placeholder="Find people"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value)
                    setIsDropdownOpen(true)
                  }}
                  onFocus={() => setIsDropdownOpen(true)}
                  onKeyDown={(e) => {
                    if (
                      e.key === "Backspace" &&
                      searchQuery === "" &&
                      selectedContacts.length > 0
                    ) {
                      removeSelected(
                        selectedContacts[selectedContacts.length - 1].userId
                      )
                    }
                  }}
                />
              </div>
            </div>

            <Dialog open={showLimitWarning} onOpenChange={setShowLimitWarning}>
              <DialogContent className="max-w-[348px] shadow-xl p-6">
                <div className="rounded-xl bg-white">
                  <h1 className="text-lg leading-7 font-semibold text-gray-900">
                    Message Forwarding Limit
                  </h1>
                  <div className="mt-2 text-gray-500">
                    You can forward messages to{" "}
                    <span className="font-semibold text-gray-900">
                      max {MAX_RECIPIENTS} people
                    </span>{" "}
                    at a time
                  </div>
                  <div className="mt-9">
                    <Button
                      className="w-full"
                      variant="outlined"
                      visual="gray"
                      onClick={() => setShowLimitWarning(false)}
                    >
                      Ok
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>



            {/* Floating contacts dropdown */}
            {isDropdownOpen && (
              <div className="absolute left-6 right-6 top-full mt-1 z-30 bg-white rounded-lg shadow-xl border border-gray-200 max-h-[280px] overflow-y-auto">
                {!searchQuery.trim() && (
                  <div className="px-4 pt-3 pb-1 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
                    Recent Contacts
                  </div>
                )}

                {isLoading ? (
                  <div className="flex items-center justify-center py-6 text-gray-400 text-sm">
                    Loading contacts...
                  </div>
                ) : filteredContacts.length === 0 ? (
                  <div className="flex items-center justify-center py-6 text-gray-400 text-sm">
                    {searchQuery
                      ? "No contacts match"
                      : "No recent contacts"}
                  </div>
                ) : (
                  <ul className="flex flex-col py-1">
                    {filteredContacts.map((contact) => (
                      <li key={contact.userId}>
                        <button
                          type="button"
                          onClick={() => toggleSelect(contact)}
                          className="w-full flex items-center gap-x-3 px-4 py-2 hover:bg-gray-50 transition"
                        >
                          <div className="relative shrink-0">
                            <Avatar size="sm">
                              <AvatarImage
                                src={contact.avatarUrl || undefined}
                                alt={contact.displayName}
                              />
                              <AvatarFallback delayMs={0}>
                                {getInitials(contact)}
                              </AvatarFallback>
                            </Avatar>
                            {contact.isOnline && (
                              <span className="absolute -bottom-0.5 -right-0.5 size-2 rounded-full bg-success-500 ring-2 ring-white" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0 text-left text-sm text-dark-blue-400 truncate">
                            <HighlightMatch
                              text={contact.displayName}
                              query={searchQuery}
                            />{" "}
                            <span className="text-primary-500">
                              <HighlightMatch
                                text={`@${contact.username || ""}`}
                                query={searchQuery}
                              />
                            </span>
                          </div>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>

          {/* Add message textarea */}
          <div className="px-6 pb-3">
            <div className="border border-gray-300 rounded-lg px-3 py-2 min-h-24">
              <textarea
                className="w-full bg-transparent outline-none border-0 p-0 m-0 focus:ring-0 focus:outline-none resize-none text-sm leading-5 placeholder:text-gray-400"
                placeholder="Add a message..."
                rows={3}
                value={addedMessage}
                onChange={(e) => setAddedMessage(e.target.value)}
              />
            </div>
          </div>

          {/* Original message preview */}
          {message && (
            <div className="px-6 pb-4 border-l-2 border-primary-500 ml-6 mr-6">
              <div className="flex items-center gap-x-2">
                <Avatar size="xs" className="shrink-0 size-5">
                  <AvatarImage src={senderAvatarUrl} alt={senderLabel} />
                  <AvatarFallback delayMs={0}>
                    {senderFullName.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span className="text-xs font-semibold text-dark-blue-400">
                  {senderLabel}
                </span>
                {senderUsername && (
                  <span className="text-xs text-primary-500">@{senderUsername}</span>
                )}
              </div>
              <p className="mt-1.5 text-sm text-dark-blue-400 line-clamp-3">
                {message.content || "(empty)"}
              </p>
              {message.createdAt && (
                <div className="mt-1 text-[11px] text-gray-500">
                  {formatMessageDate(message.createdAt)}
                </div>
              )}
            </div>
          )}

          {error && (
            <div className="px-6 pb-2 text-xs text-error-500 text-center">
              {error}
            </div>
          )}

          {/* Footer */}
          <div className="px-6 pb-6 pt-2 grid grid-cols-2 gap-x-3">
            <DialogClose asChild>
              <Button visual="gray" variant="outlined" disabled={isSending}>
                Cancel
              </Button>
            </DialogClose>
            <Button
              visual="primary"
              variant="filled"
              disabled={selectedIds.size === 0 || isSending}
              onClick={handleSend}
            >
              {isSending ? "Sending..." : "Send"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
