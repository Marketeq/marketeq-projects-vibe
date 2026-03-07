"use client"

import React, { useCallback, useMemo, useState } from "react"
import { useEffect } from "react"
import { importPrivateKey } from "@/src/crypto/keys"
import { apiFetch } from "@/src/lib/api"
import { useToggle } from "react-use"
import { parseJwt } from "src/lib/jwt"
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

  const value = useMemo(
    () => ({
      pinnedChats,
      onChatPinned,
      showPinnedIcon,
      toggleShowPinnedIcon,
      onChatChecked,
      checkedChats,
    }),
    [
      pinnedChats,
      onChatPinned,
      showPinnedIcon,
      toggleShowPinnedIcon,
      onChatChecked,
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
  const [selectedConversation, setSelectedConversation] =
    useState<Conversation | null>(null)
  const [privateKey, setPrivateKey] = useState<CryptoKey | null>(null)
  const [messagesByConversation, setMessagesByConversation] = useState<
    Record<string, Message[]>
  >({})

  const token =
    typeof window !== "undefined" ? localStorage.getItem("token") || "" : ""

  useEffect(() => {
    ;(async () => {
      if (!token) {
        console.error("No JWT token available")
        return
      }

      // 1) Parse userId if you still need it for other things
      const { sub: userId } = parseJwt<{ sub: string }>(token)

      // 2) Hit the single endpoint; get back clear‑text PEM
      const { publicKey, privateKeyPem } = await apiFetch<{
        publicKey: string
        privateKeyPem: string
      }>("/api/user-keys", {
        headers: { Authorization: `Bearer ${token}` },
      })

      // 3) Import into CryptoKey and keep in memory
      const key = await importPrivateKey(privateKeyPem)

      setPrivateKey(key)
      localStorage.setItem("privateKey", privateKeyPem)
    })()
  }, [token])

  // Callback to let Chats tell us when history is loaded:
  const handleMessagesLoaded = (convId: string, msgs: Message[]) => {
    setMessagesByConversation((prev) => ({
      ...prev,
      [convId]: msgs,
    }))
  }

  return (
    <Inbox>
      <div className="flex bg-white flex-auto">
        <LeftSidebar
          selectedConversation={selectedConversation}
          setSelectedConversation={setSelectedConversation}
          // We pass the whole map so Sidebar can show previews:
          messagesByConversation={messagesByConversation}
        />

        {/* pass only the conversation and token into Chats */}
        <Chats
          selectedConversation={selectedConversation}
          jwtToken={token}
          privateKey={privateKey}
        />

        <RightSidebar />
      </div>
    </Inbox>
  )
}
