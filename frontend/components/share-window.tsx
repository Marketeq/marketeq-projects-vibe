"use client"

import React, { useState } from "react"
import { InvitationsAPI } from "@/service/http/invitations"
import { cn, isNotEmpty } from "@/utils/functions"
import {
  AlertCircle,
  Check,
  ChevronDown,
  Link01,
  Minus,
  Plus,
  X2,
} from "@blend-metrics/icons"
import { useToggle } from "react-use"
import { z } from "zod"
import { create } from "zustand"
import { combine } from "zustand/middleware"
import NextImage from "./next-image"
import {
  Badge,
  Button,
  Dialog,
  DialogClose,
  DialogContent,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  Label,
  Textarea,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
  inputVariants,
  useToast,
} from "./ui"

interface Sharee {
  email: string
  name?: string
  avatar?: string
}

type Sharees = Sharee[]

interface Contact {
  email: string
  name: string
  avatar?: string
}

const isEmail = (value: string) => z.string().email().safeParse(value).success

const parseEmails = (input: string): string[] => {
  return input
    .split(/[\s,;]+/)
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean)
}

export const useShareWindowStore = create(
  combine({ open: false, title: "" }, (set) => ({
    toggle: (open?: boolean, title?: string) =>
      set((state) => ({
        ...state,
        open: typeof open === "boolean" ? open : !state.open,
        title: title ?? (typeof open === "boolean" && !open ? "" : state.title),
      })),
  }))
)

export const ShareWindow = () => {
  const [sharees, setSharees] = useState<Sharees>([])
  const [inputValue, setInputValue] = useState("")
  const {
    open,
    title: storeTitle,
    toggle: toggleShareWindow,
  } = useShareWindowStore()
  const [isOpen, toggle] = useToggle(false)
  const [message, setMessage] = useState("")
  const [copySuccess, setCopySuccess] = useState(false)
  const [url, setUrl] = useState("")
  const [contacts, setContacts] = useState<Contact[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const { toast } = useToast()

  React.useEffect(() => {
    if (open && typeof window !== "undefined") {
      setUrl(window.location.href)
    }
  }, [open])

  React.useEffect(() => {
    if (!open || contacts.length > 0) return
    let cancelled = false
    import("@/service/http/user")
      .then(({ UserAPI }) => UserAPI.listUsers(100, 0))
      .then((res) => {
        if (cancelled) return
        const raw = (res as any)?.data
        const users: any[] = Array.isArray(raw)
          ? raw
          : raw?.data ?? raw?.users ?? raw?.items ?? []
        const mapped = users
          .map((u) => ({
            email: (u.email ?? "").toLowerCase().trim(),
            name:
              [u.firstName, u.lastName].filter(Boolean).join(" ") ||
              u.username ||
              u.email ||
              "",
            avatar: u.avatarUrl,
          }))
          .filter((c) => c.email && isEmail(c.email))
        setContacts(mapped)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [open, contacts.length])

  const filteredContacts = inputValue
    ? contacts
        .filter(
          (c) =>
            !sharees.some((s) => s.email.toLowerCase() === c.email) &&
            (c.name.toLowerCase().includes(inputValue.toLowerCase()) ||
              c.email.toLowerCase().includes(inputValue.toLowerCase()))
        )
        .slice(0, 6)
    : []

  const handleAddEmail = () => {
    const values = parseEmails(inputValue)
    if (!values.length) return

    setSharees((prev) => {
      const existing = new Set(prev.map((item) => item.email.toLowerCase()))
      const additions: Sharee[] = []

      for (const email of values) {
        if (!isEmail(email) || existing.has(email)) continue
        additions.push({ email })
        existing.add(email)
      }

      return additions.length ? [...prev, ...additions] : prev
    })

    setInputValue("")
    setShowSuggestions(false)
  }

  const handleAddContact = (contact: Contact) => {
    const normalizedEmail = contact.email.toLowerCase()
    if (!sharees.some((i) => i.email.toLowerCase() === normalizedEmail)) {
      setSharees((prev) => [
        ...prev,
        { email: normalizedEmail, name: contact.name, avatar: contact.avatar },
      ])
      setInputValue("")
      setShowSuggestions(false)
    }
  }

  const handleRemoveSharee = (email: string) => {
    setSharees((prev) => prev.filter((i) => i.email !== email))
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault()
      handleAddEmail()
    }
  }

  const handleShare = async () => {
    let finalSharees = [...sharees]

    if (inputValue.trim()) {
      const values = parseEmails(inputValue)
      const existing = new Set(
        finalSharees.map((item) => item.email.toLowerCase())
      )
      const additions = values
        .filter((email) => isEmail(email) && !existing.has(email))
        .map((email) => ({ email }))

      if (additions.length) {
        finalSharees = [...finalSharees, ...additions]
        setSharees(finalSharees)
      }
      setInputValue("")
    }

    if (!isNotEmpty(finalSharees)) {
      toast({
        title: "No recipients",
        description: "Please add at least one email address",
        variant: "destructive",
      })
      return
    }

    try {
      await InvitationsAPI.shareProjectLink({
        emails: finalSharees.map((s) => s.email),
        projectUrl: url,
        projectTitle: storeTitle || undefined,
        message: message.trim() || undefined,
      })

      toast({
        title: "Project link shared",
        description: "The link was sent to the selected recipients.",
      })
      toggleShareWindow(false)
      setSharees([])
      setMessage("")
    } catch (error: any) {
      toast({
        title: "Failed to share link",
        description:
          error?.response?.data?.message ||
          error?.message ||
          "Please try again.",
        variant: "destructive",
      })
    }
  }

  const handleCopyLink = async () => {
    const link = url || (typeof window !== "undefined" ? window.location.href : "")
    if (!link) return
    await navigator.clipboard.writeText(link)
    setCopySuccess(true)
    setTimeout(() => setCopySuccess(false), 2000)
    toast({
      title: "Link copied!",
      description: "The project link was copied to your clipboard",
    })
  }

  const handleOpenChange = (nextOpen: boolean | undefined) => {
    toggleShareWindow(typeof nextOpen === "boolean" ? nextOpen : undefined)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-[690px] p-0">
        <div className="max-w-[690px] bg-white p-6 rounded-xl shadow-lg">
          <>
              <div className="flex justify-between items-center">
                <h2 className="text-lg leading-7 font-semibold text-gray-800">
                  Share this project
                </h2>

                <div className="inline-flex items-center gap-x-4">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger className="text-gray-500 hover:text-gray-900">
                        <AlertCircle className="h-6 w-6" />
                      </TooltipTrigger>
                      <TooltipContent side="bottom">Support</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              </div>

              <div className="space-y-2 mt-8">
                <Label className="text-gray-700" size="md">
                  Share by email
                </Label>
                <div className="flex items-center gap-x-3">
                  <div className="flex-auto relative">
                    <div
                      className={cn(
                        inputVariants({
                          className:
                            "min-h-[44px] h-auto flex flex-wrap gap-2 focus-within:border-primary-500 focus-within:ring-2 focus-within:ring-primary-50",
                        })
                      )}
                    >
                      {sharees.map((sharee) => (
                        <Badge key={sharee.email} visual="primary">
                          {sharee.email}
                          <button
                            onClick={() => handleRemoveSharee(sharee.email)}
                            className="focus-visible:outline-none flex-none"
                          >
                            <X2 className="h-3 w-3" />
                          </button>
                        </Badge>
                      ))}
                      <input
                        className="text-base min-w-[132px] flex-auto text-gray-700 p-0 focus:ring-0 border-none placeholder:text-gray-500 outline-none bg-transparent"
                        placeholder="Add emails or find people"
                        value={inputValue}
                        onChange={(e) => {
                          setInputValue(e.target.value)
                          setShowSuggestions(true)
                        }}
                        onKeyDown={handleKeyDown}
                        onFocus={() => setShowSuggestions(true)}
                        onBlur={() =>
                          setTimeout(() => setShowSuggestions(false), 200)
                        }
                      />
                    </div>

                    {showSuggestions && filteredContacts.length > 0 && (
                      <div className="absolute w-full z-50 rounded-lg bg-white border border-gray-100 shadow-lg mt-2">
                        {filteredContacts.map((contact) => (
                          <button
                            key={contact.email}
                            type="button"
                            className="flex w-full cursor-pointer items-center gap-x-3 py-2.5 h-16 px-3.5 hover:bg-gray-50"
                            onMouseDown={(e) => {
                              e.preventDefault()
                              handleAddContact(contact)
                            }}
                          >
                            {contact.avatar ? (
                              <div className="h-10 flex-none relative rounded-full overflow-hidden w-10">
                                <NextImage
                                  className="object-cover"
                                  src={contact.avatar}
                                  alt={contact.name}
                                  sizes="100vh"
                                  fill
                                />
                              </div>
                            ) : (
                              <div className="h-10 w-10 flex-none rounded-full overflow-hidden border border-gray-300 border-dashed bg-gray-50" />
                            )}
                            <div className="flex-auto text-left">
                              <h2 className="text-sm leading-6 font-medium text-gray-800">
                                {contact.name}
                              </h2>
                              <p className="text-sm leading-5 text-gray-500">
                                {contact.email}
                              </p>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <Button
                    variant="light"
                    size="lg"
                    type="button"
                    onClick={handleAddEmail}
                  >
                    Add
                  </Button>
                </div>
              </div>

              <button
                className="inline-flex focus-visible:outline-none gap-x-2 mt-6 text-base font-semibold text-gray-700 items-center"
                onClick={toggle}
              >
                Add a Message{" "}
                {isOpen ? (
                  <Minus className="h-6 w-6 flex-none" />
                ) : (
                  <Plus className="h-6 w-6 flex-none" />
                )}
              </button>

              {isOpen && (
                <Textarea
                  className="h-20 mt-3"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Write message here..."
                />
              )}

              {isNotEmpty(sharees) && (
                <div className="mt-6 space-y-3">
                  <span className="text-base leading-5 font-medium text-gray-700">
                    Sharing with
                  </span>
                  {sharees.map(({ email, name, avatar }) => (
                    <div className="space-y-3 mt-3" key={email}>
                      <div className="flex justify-between items-center">
                        <div className="inline-flex items-center gap-x-3">
                          {avatar ? (
                            <div className="h-8 w-8 rounded-full overflow-hidden relative">
                              <NextImage
                                className="object-cover"
                                src={avatar}
                                alt={name ?? email}
                                sizes="100vh"
                                fill
                              />
                            </div>
                          ) : (
                            <div className="h-8 w-8 rounded-full overflow-hidden border border-gray-300 border-dashed bg-gray-50 relative" />
                          )}
                          <span className="font-medium text-sm leading-5 text-gray-800">
                            {name ? name : email}
                          </span>
                        </div>

                        <DropdownMenu>
                          <DropdownMenuTrigger className="inline-flex items-center gap-x-1 text-sm font-medium text-gray-900 capitalize">
                            Can view
                            <ChevronDown className="text-gray-500 h-5 w-5 flex-none" />
                          </DropdownMenuTrigger>
                          <DropdownMenuContent>
                            <DropdownMenuItem
                              onSelect={() => handleRemoveSharee(email)}
                            >
                              Remove
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex mt-8 justify-between">
                <button
                  className="inline-flex gap-x-2 focus-visible:outline-none text-primary-500 font-semibold items-center"
                  onClick={handleCopyLink}
                >
                  {copySuccess ? (
                    <Check className="h-[15px] w-[15px]" />
                  ) : (
                    <Link01 className="h-[15px] w-[15px]" />
                  )}
                  {copySuccess ? "Copied" : "Copy Link"}
                </button>
                <div className="inline-flex items-center gap-x-3">
                  <DialogClose asChild>
                    <Button visual="gray" variant="outlined">
                      Cancel
                    </Button>
                  </DialogClose>
                  <Button onClick={handleShare}>Share</Button>
                </div>
              </div>
            </>
        </div>
      </DialogContent>
    </Dialog>
  )
}
