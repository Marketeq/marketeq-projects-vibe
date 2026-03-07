"use client"

import { createContext } from "@/utils/react-utils"

export const [EditContextProvider, useEditContext] = createContext<{
  chat: string
  onChatChange: (value: string) => void
  isSaved: boolean
  onSave: () => void
  onUnsave: () => void
}>({
  displayName: "EditContext",
})
