"use client"

import React, { useCallback, useMemo, useState } from "react"
import { useEffect } from "react"
import { useSearchParams } from "next/navigation"
import AuthenticatedRoute from "@/hoc/AuthenticatedRoute"
import { ensureEncryptionKeysExist, loadPrivateKey } from "@/src/crypto/keys"
import { apiFetch } from "@/src/lib/api"
import { getAccessToken, getCurrentUser } from "@/utils/auth"
import { useMessageSearchIndex } from "@/utils/useMessageSearchIndex"
import { useToggle } from "react-use"
import { Conversation } from "@/types/conversation"
import { Message } from "@/types/message"
import { User } from "@/types/user"
import { ChatsContextProvider } from "@/components/chat"
import { EditContextProvider } from "@/components/inbox-comps"
import { Chats } from "./components/chats-comp"
import LeftSidebar from "./components/left-sidebar"
import RightSidebar from "./components/right-sidebar"

const Inbox = ({ children }: { children?: React.ReactNode }) => {
  const [pinnedChats, setPinnedChats] = useState(0)
  const [showPinnedIcon, toggleShowPinnedIcon] = useToggle(false)
  const [checkedChats, setCheckedChats] = useState(0)

  // If everything gets unpinned while in "View pinned" mode, exit the mode
  // so the sidebar doesn't render empty with no visible Close control.
  useEffect(() => {
    if (pinnedChats === 0 && showPinnedIcon) {
      toggleShowPinnedIcon(false)
    }
  }, [pinnedChats, showPinnedIcon, toggleShowPinnedIcon])

  const onChatPinned = useCallback(
    (value: boolean) =>
      value
        ? setPinnedChats((prev) => prev + 1)
        : setPinnedChats((prev) => prev - 1),
    []
  )

  const onChatChecked = useCallback(
    (value: boolean) =>
      value
        ? setCheckedChats((prev) => prev + 1)
        : setCheckedChats((prev) => prev - 1),
    []
  )

  const resetCheckedChats = useCallback(() => setCheckedChats(0), [])

  const value = useMemo(
    () => ({
      pinnedChats,
      setPinnedChats,
      onChatPinned,
      showPinnedIcon,
      toggleShowPinnedIcon,
      onChatChecked,
      resetCheckedChats,
      checkedChats,
    }),
    [
      pinnedChats,
      onChatPinned,
      showPinnedIcon,
      toggleShowPinnedIcon,
      onChatChecked,
      resetCheckedChats,
      checkedChats,
    ]
  )

  const [chat, setChat] = useState("")
  const [isSaved, setIsSaved] = useState(false)

  const [selectedUser, setSelectedUser] = useState<User | null>(null) //  NEW STATE

  const onSave = useCallback(() => {
    setIsSaved(true)
  }, [])

  const onUnsave = useCallback(() => {
    setChat("")
    setIsSaved(false)
  }, [])

  const editContextValue = useMemo(
    () => ({
      chat,
      onChatChange: setChat,
      onSave,
      isSaved,
      onUnsave,
    }),
    [chat, setChat, onSave, isSaved, onUnsave]
  )

  return (
    <EditContextProvider value={editContextValue}>
      <ChatsContextProvider value={value}>{children}</ChatsContextProvider>
    </EditContextProvider>
  )
}

//New implementation for new encryption logic
export default function InboxRoot() {
  const searchParams = useSearchParams()
  const initialThreadId = searchParams?.get("threadId") ?? null
  const initialParticipantId = searchParams?.get("participantId") ?? null

  const [selectedConversation, setSelectedConversation] =
    useState<Conversation | null>(null)
  const [privateKey, setPrivateKey] = useState<CryptoKey | null>(null)
  const [rightSidebarOpen, setRightSidebarOpen] = useState(true)
  const [highlightMessageId, setHighlightMessageId] = useState<string | null>(
    null
  )
  const [messagesByConversation, setMessagesByConversation] = useState<
    Record<string, Message[]>
  >({})

  const [token, setToken] = useState("")
  const [currentUserProfile, setCurrentUserProfile] = useState<any>(null)
  useEffect(() => {
    setToken(getAccessToken() || "")
  }, [])

  const selectedConversationCacheKey = currentUserProfile?.id
    ? `inbox_selected_conversation_${currentUserProfile.id}`
    : ""

  // Hydrate selected conversation AFTER mount — keyed by current user so
  // a stale snapshot from a different login can't fire chat effects with
  // the wrong jwt/profile.
  useEffect(() => {
    if (!selectedConversationCacheKey) return
    try {
      const cached = sessionStorage.getItem(selectedConversationCacheKey)
      if (cached) setSelectedConversation(JSON.parse(cached))
    } catch {}
  }, [selectedConversationCacheKey])

  useEffect(() => {
    if (!selectedConversationCacheKey) return
    try {
      if (selectedConversation) {
        sessionStorage.setItem(
          selectedConversationCacheKey,
          JSON.stringify(selectedConversation)
        )
      } else {
        sessionStorage.removeItem(selectedConversationCacheKey)
      }
    } catch {}
  }, [selectedConversation, selectedConversationCacheKey])

  useEffect(() => {
    ;(async () => {
      if (!token) return

      // 0) Fetch full user profile (includes username)
      try {
        const me = await apiFetch<any>("/user/me", {
          headers: { Authorization: `Bearer ${token}` },
        })
        setCurrentUserProfile(me)
      } catch (err) {
        console.error("Failed to fetch user profile", err)
      }

      // 1) Ensure keypair exists, device registered, public key pushed
      await ensureEncryptionKeysExist()

      // 2) Load private key from IndexedDB (keyed by userId)
      const uid = getCurrentUser()?.id
      if (!uid) {
        console.error("No userId available after key setup")
        return
      }
      const key = await loadPrivateKey(uid)
      if (!key) {
        console.error("No private key found after key setup")
        return
      }
      setPrivateKey(key)
    })()
  }, [token])

  // Callback to let Chats tell us when history is loaded. Stable ref so
  // chats-comp's effect dep array doesn't fire every render → infinite loop.
  const handleMessagesLoaded = useCallback(
    (convId: string, msgs: Message[]) => {
      setMessagesByConversation((prev) => {
        if (prev[convId] === msgs) return prev
        return { ...prev, [convId]: msgs }
      })
    },
    []
  )

  // Persisted client-side search index. Loads cached docs from IndexedDB
  // immediately, then rebuilds in the background as soon as we have a
  // private key (E2EE makes server-side search impossible).
  const currentUserId = getCurrentUser()?.id ?? null
  const searchIndex = useMessageSearchIndex({
    userId: currentUserId,
    token,
    privateKey,
  })

  return (
    <AuthenticatedRoute>
    <Inbox>
      <div
        className="flex w-full bg-white overflow-hidden"
        style={{ height: "calc(100vh - 65px)" }}
      >
        <LeftSidebar
          selectedConversation={selectedConversation}
          setSelectedConversation={setSelectedConversation}
          // We pass the whole map so Sidebar can show previews:
          messagesByConversation={messagesByConversation}
          initialThreadId={initialThreadId}
          initialParticipantId={initialParticipantId}
          searchIndex={searchIndex}
          onHighlightMessage={setHighlightMessageId}
          privateKey={privateKey}
        />

        {/* pass only the conversation and token into Chats */}
        <Chats
          selectedConversation={selectedConversation}
          jwtToken={token}
          privateKey={privateKey}
          currentUserProfile={currentUserProfile}
          onToggleRightSidebar={() => setRightSidebarOpen((v) => !v)}
          onMessagesLoaded={handleMessagesLoaded}
          highlightMessageId={highlightMessageId}
          onHighlightConsumed={() => setHighlightMessageId(null)}
          onIndexNewMessage={searchIndex.addDoc}
        />

        {rightSidebarOpen && (
          <RightSidebar
            selectedConversation={selectedConversation}
            jwtToken={token}
          />
        )}
      </div>
    </Inbox>
    </AuthenticatedRoute>
  )
}
