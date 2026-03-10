"use client"

import React, { useState } from "react"
import { callAll, cn, isNotEmpty } from "@/utils/functions"
import {
  AlertCircle,
  ArrowLeft,
  Check,
  ChevronDown,
  Clock,
  Eye,
  Link01,
  Lock,
  Minus,
  Plus,
  Settings,
  X,
  X2,
} from "@blend-metrics/icons"
import { Slot } from "@radix-ui/react-slot"
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
  DropdownMenuRadioCheckItem,
  DropdownMenuRadioGroup,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Label,
  Listbox,
  ListboxButton,
  ListboxOption,
  ListboxOptions,
  Switch,
  Textarea,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
  inputVariants,
} from "./ui"

interface Invitee {
  avatar?: string
  username?: string
  email: string
  role?: string
}

type Invitees = Invitee[]

const contacts = [
  {
    avatar: "/man.jpg",
    username: "Thomas",
    email: "tranthuy.nute@gmail.com",
  },
  {
    avatar: "/woman.jpg",
    username: "Tiffany Steiner",
    email: "tiff.steinter@gmail.com",
  },
]

const isEmail = (value: string) => z.string().email().safeParse(value).success

export const useInviteWindowStore = create(
  combine({ open: false }, (set) => ({
    toggle: (open?: boolean) =>
      set((state) => ({
        ...state,
        open: typeof open === "boolean" ? open : !state.open,
      })),
  }))
)

export const InviteWindowTrigger = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & { asChild?: boolean }
>(({ asChild, onClick, ...props }, ref) => {
  const Comp = asChild ? Slot : "button"
  const { toggle } = useInviteWindowStore()
  return <Comp onClick={callAll(onClick, toggle)} {...props} ref={ref} />
})

InviteWindowTrigger.displayName = "InviteWindowTrigger"

type InviteView = "invite" | "settings"

const EXPIRATION_OPTIONS = [
  "Never",
  "1 hour",
  "24 hours",
  "7 days",
  "30 days",
  "90 days",
]

const ACCESS_OPTIONS = ["Anyone with the link", "Only invited people"]

const InviteSettingsPanel = ({
  onBack,
}: {
  onBack: () => void
}) => {
  const [allowAnyone, setAllowAnyone] = useState(true)
  const [requireApproval, setRequireApproval] = useState(false)
  const [accessLevel, setAccessLevel] = useState(ACCESS_OPTIONS[0])
  const [expiration, setExpiration] = useState(EXPIRATION_OPTIONS[0])
  const [enablePassword, setEnablePassword] = useState(false)
  const [password, setPassword] = useState("")

  return (
    <div className="space-y-0">
      <div className="flex items-center gap-x-3 mb-6">
        <button
          type="button"
          onClick={onBack}
          className="focus-visible:outline-none text-gray-500 hover:text-gray-900"
        >
          <ArrowLeft className="size-5" />
        </button>
        <h2 className="text-lg leading-7 font-semibold text-gray-800">
          Manage Invite Settings
        </h2>
        <div className="flex-auto" />
        <DialogClose className="text-gray-400 hover:text-gray-900 focus-visible:outline-none">
          <X className="size-5" />
        </DialogClose>
      </div>

      <div>
        <div className="bg-gray-100 px-4 py-3 rounded-t-lg">
          <h3 className="text-base font-semibold text-gray-700">
            General Invites
          </h3>
        </div>
        <div className="px-4 py-4 space-y-4">
          <div className="flex items-start justify-between gap-x-4">
            <div className="space-y-1">
              <p className="text-sm font-medium text-gray-700">
                Allow anyone to request to join
              </p>
              <p className="text-sm text-gray-500">
                Anyone with the link can request to join your team
              </p>
            </div>
            <Switch
              checked={allowAnyone}
              onCheckedChange={setAllowAnyone}
            />
          </div>
          <div className="flex items-start justify-between gap-x-4">
            <div className="space-y-1">
              <p className="text-sm font-medium text-gray-700">
                Require admin approval for new members
              </p>
              <p className="text-sm text-gray-500">
                New members must be approved by an admin before joining
              </p>
            </div>
            <Switch
              checked={requireApproval}
              onCheckedChange={setRequireApproval}
            />
          </div>
        </div>
      </div>

      <div className="pt-4">
        <h2 className="text-lg leading-7 font-semibold text-gray-800 mb-4">
          Manage Sharing Settings
        </h2>
      </div>

      <div>
        <div className="bg-gray-100 px-4 py-3 rounded-t-lg">
          <h3 className="text-base font-semibold text-gray-700">
            Link Settings
          </h3>
        </div>
        <div className="px-4 py-4 space-y-5">
          <div className="space-y-2">
            <div className="flex items-center gap-x-2">
              <Eye className="size-4 text-gray-500" />
              <p className="text-sm font-medium text-gray-700">
                Who Has Access
              </p>
            </div>
            <Listbox value={accessLevel} onChange={setAccessLevel}>
              <ListboxButton className="w-full justify-between text-sm" />
              <ListboxOptions>
                {ACCESS_OPTIONS.map((opt) => (
                  <ListboxOption key={opt} value={opt}>
                    {opt}
                  </ListboxOption>
                ))}
              </ListboxOptions>
            </Listbox>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-x-2">
              <Clock className="size-4 text-gray-500" />
              <p className="text-sm font-medium text-gray-700">
                Allow Link Expiration After:
              </p>
            </div>
            <Listbox value={expiration} onChange={setExpiration}>
              <ListboxButton className="w-full justify-between text-sm" />
              <ListboxOptions>
                {EXPIRATION_OPTIONS.map((opt) => (
                  <ListboxOption key={opt} value={opt}>
                    {opt}
                  </ListboxOption>
                ))}
              </ListboxOptions>
            </Listbox>
          </div>

          <div className="space-y-3">
            <div className="flex items-start justify-between gap-x-4">
              <div className="flex items-center gap-x-2">
                <Lock className="size-4 text-gray-500" />
                <p className="text-sm font-medium text-gray-700">
                  Enable Link Password
                </p>
              </div>
              <Switch
                checked={enablePassword}
                onCheckedChange={setEnablePassword}
              />
            </div>
            {enablePassword && (
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter a password"
                className={cn(inputVariants(), "text-sm")}
              />
            )}
          </div>

          <div className="flex items-center justify-end gap-x-3 pt-2">
            <Button
              variant="outlined"
              visual="gray"
              size="sm"
              onClick={onBack}
            >
              Cancel
            </Button>
            <Button size="sm" onClick={onBack}>
              Save Settings
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

export const InviteWindow = () => {
  const [invitees, setInvitees] = useState<Invitees>([])
  const [inputValue, setInputValue] = useState("")
  const { open, toggle: toggleInviteWindow } = useInviteWindowStore()
  const [view, setView] = useState<InviteView>("invite")
  const [inviteSent, setInviteSent] = useState(false)
  const [isOpen, toggle] = useToggle(false)
  const [message, setMessage] = useState("")
  const [showSuggestions, setShowSuggestions] = useState(false)

  const filteredContacts = inputValue
    ? contacts.filter(
        (c) =>
          c.username.toLowerCase().includes(inputValue.toLowerCase()) ||
          c.email.toLowerCase().includes(inputValue.toLowerCase())
      )
    : []

  const handleAddEmail = () => {
    if (isEmail(inputValue) && !invitees.some((i) => i.email === inputValue)) {
      setInvitees((prev) => [...prev, { email: inputValue }])
      setInputValue("")
      setShowSuggestions(false)
    }
  }

  const handleAddContact = (contact: (typeof contacts)[0]) => {
    if (!invitees.some((i) => i.email === contact.email)) {
      setInvitees((prev) => [...prev, contact])
      setInputValue("")
      setShowSuggestions(false)
    }
  }

  const handleRemoveInvitee = (email: string) => {
    setInvitees((prev) => prev.filter((i) => i.email !== email))
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault()
      handleAddEmail()
    }
  }

  const handleSendInvite = () => {
    if (isNotEmpty(invitees)) {
      setInviteSent(true)
      setTimeout(() => {
        setInviteSent(false)
        toggleInviteWindow(false)
        setInvitees([])
        setMessage("")
      }, 2000)
    }
  }

  const handleCopyLink = () => {
    navigator.clipboard?.writeText(
      `${window.location.origin}/invite/team`
    )
  }

  const handleOpenChange = (nextOpen: boolean | undefined) => {
    toggleInviteWindow(typeof nextOpen === "boolean" ? nextOpen : undefined)
    if (!nextOpen) {
      setView("invite")
      setInviteSent(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-[690px] p-0">
        <div className="max-w-[690px] bg-white p-6 rounded-xl shadow-lg">
          {inviteSent ? (
            <div className="flex flex-col items-center justify-center py-8 gap-y-4">
              <div className="size-12 rounded-full bg-success-50 flex items-center justify-center">
                <Check className="size-6 text-success-500" />
              </div>
              <h2 className="text-lg font-semibold text-gray-800">
                Invite Sent!
              </h2>
              <p className="text-sm text-gray-500 text-center">
                Your team invite has been sent successfully.
              </p>
            </div>
          ) : view === "settings" ? (
            <InviteSettingsPanel onBack={() => setView("invite")} />
          ) : (
            <>
              <div className="flex justify-between items-center">
                <h2 className="text-lg leading-7 font-semibold text-gray-800">
                  Invite Your Team
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
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger
                        className="text-gray-500 hover:text-gray-900"
                        onClick={() => setView("settings")}
                      >
                        <Settings className="h-6 w-6" />
                      </TooltipTrigger>
                      <TooltipContent side="bottom">Settings</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              </div>

              <div className="space-y-2 mt-8">
                <Label className="text-gray-700" size="md">
                  Invite by email
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
                      {invitees.map((invitee) => (
                        <Badge key={invitee.email} visual="primary">
                          {invitee.email}
                          <button
                            onClick={() => handleRemoveInvitee(invitee.email)}
                            className="focus-visible:outline-none flex-none"
                          >
                            <X2 className="h-3 w-3" />
                          </button>
                        </Badge>
                      ))}
                      <input
                        className="text-base min-w-[132px] flex-auto text-gray-700 p-0 focus:ring-0 border-none placeholder:text-gray-500 outline-none bg-transparent"
                        placeholder="Add emails or find contacts"
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
                            <div className="h-10 flex-none relative rounded-full overflow-hidden w-10">
                              <NextImage
                                className="object-cover"
                                src={contact.avatar}
                                alt={contact.username}
                                sizes="100vh"
                                fill
                              />
                            </div>
                            <div className="flex-auto text-left">
                              <h2 className="text-sm leading-6 font-medium text-gray-800">
                                {contact.username}
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

              {isNotEmpty(invitees) && (
                <div className="mt-6 space-y-3">
                  <span className="text-base leading-5 font-medium text-gray-700">
                    Invites
                  </span>
                  {invitees.map(({ email, avatar, username }) => (
                    <div className="space-y-3 mt-3" key={email}>
                      <div className="flex justify-between items-center">
                        <div className="inline-flex items-center gap-x-3">
                          {avatar ? (
                            <div className="h-8 w-8 rounded-full overflow-hidden relative">
                              <NextImage
                                className="object-cover"
                                src={avatar}
                                alt={username ?? email}
                                sizes="100vh"
                                fill
                              />
                            </div>
                          ) : (
                            <div className="h-8 w-8 rounded-full overflow-hidden border border-gray-300 border-dashed bg-gray-50 relative" />
                          )}
                          <span className="font-medium text-sm leading-5 text-gray-800">
                            {username ? username : email}
                          </span>
                        </div>

                        <DropdownMenu>
                          <DropdownMenuTrigger className="inline-flex items-center gap-x-1 text-sm font-medium text-gray-900">
                            Viewer
                            <ChevronDown className="text-gray-500 h-5 w-5 flex-none" />
                          </DropdownMenuTrigger>
                          <DropdownMenuContent>
                            <DropdownMenuRadioGroup>
                              <DropdownMenuRadioCheckItem value="Viewer">
                                Viewer
                              </DropdownMenuRadioCheckItem>
                              <DropdownMenuRadioCheckItem value="Editor">
                                Editor
                              </DropdownMenuRadioCheckItem>
                            </DropdownMenuRadioGroup>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem>Resend Invite</DropdownMenuItem>
                            <DropdownMenuItem
                              onSelect={() => handleRemoveInvitee(email)}
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
                  <Link01 className="h-[15px] w-[15px]" />
                  Copy Link
                </button>
                <div className="inline-flex items-center gap-x-3">
                  <DialogClose asChild>
                    <Button visual="gray" variant="outlined">
                      Cancel
                    </Button>
                  </DialogClose>
                  <Button onClick={handleSendInvite}>Send Invite</Button>
                </div>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
