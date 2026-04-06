"use client"

import React, { useState } from "react"
import { useAuth } from "@/contexts/auth"
import { InvitationsAPI } from "@/service/http/invitations"
import { callAll, cn, isNotEmpty } from "@/utils/functions"
import {
  AlertCircle,
  ChevronDown,
  Link01,
  Minus,
  Plus,
  Settings,
  X2,
} from "@blend-metrics/icons"
import { Combobox } from "@headlessui/react"
import { Slot } from "@radix-ui/react-slot"
import Cookies from "js-cookie"
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
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuRadioCheckItem,
  DropdownMenuRadioGroup,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Label,
  Textarea,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
  inputVariants,
  toast,
} from "./ui"

interface Invitee {
  avatar?: string
  username?: string
  email: string
  role: "admin" | "editor" | "viewer"
  invalid?: boolean // true if email failed validation
}

type Invitees = Invitee[]

const options = [
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

// Parse multiple emails from a string separated by commas, spaces, or semicolons
const parseEmails = (input: string): string[] => {
  return input
    .split(/[\s,;]+/)
    .map((e) => e.trim())
    .filter(Boolean)
}

function getJwtPayload(): Record<string, any> | null {
  try {
    const token = Cookies.get("access_token")
    if (!token) return null
    const parts = token.split(".")
    if (parts.length !== 3) return null
    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/")
    const decoded = atob(base64)
    return JSON.parse(decoded)
  } catch {
    return null
  }
}

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

export const InviteWindow = () => {
  const [selected, setSelected] = React.useState<Invitees>([])
  const [inputValue, setInputValue] = React.useState("")
  const [defaultRole, setDefaultRole] = React.useState<
    "admin" | "editor" | "viewer"
  >("viewer")
  const [settingsOpen, setSettingsOpen] = React.useState(false)
  const [settings, setSettings] = React.useState({
    userTracking: false,
    embedCode: true,
    guestSharing: false,
    access: "anyone",
    linkExpires: false,
    expiryDate: "",
    expiryTime: "",
    linkPassword: "",
    notifications: false,
  })
  const { open, toggle: toggleInviteWindow } = useInviteWindowStore()
  const { user } = useAuth()
  const id = React.useId()
  const [isOpen, toggle] = useToggle(false)
  const [message, setMessage] = useState("")
  const [copySuccess, setCopySuccess] = useState(false)
  const inviteBaseUrl = (
    process.env.NEXT_PUBLIC_APP_URL ||
    (typeof window !== "undefined" ? window.location.origin : "")
  ).replace(/\/$/, "")

  // ─── Email validation ───────────────────────────────────────────────────────
  const getIsValid = () => {
    return isEmail(inputValue) && !selected.find((s) => s.email === inputValue)
  }

  // ─── Add single or multiple emails from input ───────────────────────────────
  const addEmailsFromInput = (input: string) => {
    const emails = parseEmails(input)
    if (emails.length === 0) return

    const newInvitees: Invitee[] = []
    for (const email of emails) {
      // Skip duplicates already in selected
      if (selected.find((s) => s.email === email)) continue
      newInvitees.push({
        email,
        role: defaultRole,
        invalid: !isEmail(email),
      })
    }

    if (newInvitees.length > 0) {
      setSelected((prev) => [...prev, ...newInvitees])
    }
    setInputValue("")
  }

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    // Add on Enter
    if (event.key === "Enter") {
      event.preventDefault()
      addEmailsFromInput(inputValue)
      return
    }
    // Add on comma or semicolon typed
    if (event.key === "," || event.key === ";") {
      event.preventDefault()
      addEmailsFromInput(inputValue)
      return
    }
    // Add on Space if current input looks like a complete email
    if (event.key === " " && isEmail(inputValue.trim())) {
      event.preventDefault()
      addEmailsFromInput(inputValue.trim())
      return
    }
  }

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value
    // Handle paste with multiple emails (contains comma/semicolon/space between emails)
    const hasMultiple = /[\s,;]/.test(value) && parseEmails(value).length > 1
    if (hasMultiple) {
      addEmailsFromInput(value)
      return
    }
    setInputValue(value)
  }

  const handleAddTag = () => {
    addEmailsFromInput(inputValue)
  }

  const onMessageChanged = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(event.target.value)
  }

  const handleRemove = (email: string) => {
    setSelected((prev) => prev.filter((value) => value.email !== email))
  }

  const handleRoleChange = (
    email: string,
    role: "admin" | "editor" | "viewer"
  ) => {
    setSelected((prev) =>
      prev.map((inv) => (inv.email === email ? { ...inv, role } : inv))
    )
  }

  // ─── Copy invite link ───────────────────────────────────────────────────────
  // Generic invite link flow
  const handleCopyLink = async () => {
    try {
      const payload = getJwtPayload()
      const teamId =
        user?.id || (user as any)?.sub || payload?.sub || payload?.id
      if (!teamId) {
        toast({
          title: "Authentication required",
          description: "Please log in to copy invite link",
          variant: "destructive",
        })
        return
      }
      // Validate teamId before creating invitation
      try {
        const teamResponse =
          await (await import("@/service/http/teams")).TeamsAPI.getTeam(teamId)
        const teamData = teamResponse?.data
        const teamName =
          teamData?.name || teamData?.teamName || user?.teamName || "Client Team"

        const res = await InvitationsAPI.createInvitationLink({
          teamId,
          teamName,
          role: defaultRole,
        })
        const inviteLink =
          res?.data?.url ||
          (res?.data?.token
            ? `${inviteBaseUrl}/invite/accept?token=${res.data.token}`
            : "")

        if (!inviteLink) {
          throw new Error("We couldn't generate the invite link. Please try again.")
        }

        await navigator.clipboard.writeText(inviteLink)
        setCopySuccess(true)
        setTimeout(() => setCopySuccess(false), 2000)
        toast({
          title: "Link copied!",
          description: "A team invite link was copied to your clipboard",
        })
      } catch (err) {
        toast({
          title: "Failed to copy",
          description:
            (err as any)?.response?.data?.message ||
            (err as any)?.message ||
            "We couldn't generate the invite link. Please try again.",
          variant: "destructive",
        })
        return
      }
    } catch (err: any) {
      toast({
        title: "Failed to copy",
        description:
          err?.response?.data?.message ||
          err?.message ||
          "Please copy the link manually",
        variant: "destructive",
      })
    }
  }

  // ─── Send invites ───────────────────────────────────────────────────────────
  // Enhanced: show specific error messages and refresh invites after sending
  const handleSendInvites = async () => {
    // Auto-add valid email from input if present
    let finalInvitees = [...selected]
    if (inputValue.trim()) {
      const emails = parseEmails(inputValue)
      const newOnes = emails
        .filter((e) => !finalInvitees.find((s) => s.email === e))
        .map((e) => ({ email: e, role: defaultRole, invalid: !isEmail(e) }))
      finalInvitees = [...finalInvitees, ...newOnes]
      setSelected(finalInvitees)
      setInputValue("")
    }

    if (finalInvitees.length === 0) {
      toast({
        title: "No invitees",
        description: "Please add at least one email address",
        variant: "destructive",
      })
      return
    }

    // Block send if any invalid emails
    const invalidOnes = finalInvitees.filter((i) => i.invalid)
    if (invalidOnes.length > 0) {
      toast({
        title: "Invalid emails",
        description: `Please fix or remove: ${invalidOnes.map((i) => i.email).join(", ")}`,
        variant: "destructive",
      })
      return
    }

    try {
      const payload = getJwtPayload()
      const teamId =
        user?.id || (user as any)?.sub || payload?.sub || payload?.id

      if (!teamId) {
        toast({
          title: "Authentication required",
          description: "Please log in to send invitations",
          variant: "destructive",
        })
        return
      }

      // Group by role and send — or send all at once with per-invitee roles
      // Since the API accepts one role per batch, send separate requests per role group
      const byRole = finalInvitees.reduce(
        (acc, inv) => {
          if (!acc[inv.role]) acc[inv.role] = []
          acc[inv.role].push(inv.email)
          return acc
        },
        {} as Record<string, string[]>
      )

      await Promise.all(
        Object.entries(byRole).map(async ([role, emails]) => {
          try {
            await InvitationsAPI.createInvitations({
              teamId: teamId,
              role: role as "admin" | "editor" | "viewer",
              emails,
              note: message || undefined,
            })
          } catch (error: any) {
            // Try to parse common error cases
            const apiMsg = error?.response?.data?.message || "Unknown error"
            let userMsg = apiMsg
            if (/already invited/i.test(apiMsg)) {
              userMsg =
                "One or more emails have already been invited. Check pending invitations."
            } else if (/already a member/i.test(apiMsg)) {
              userMsg = "One or more emails are already team members."
            } else if (/invalid email/i.test(apiMsg)) {
              userMsg = "One or more emails are invalid."
            } else if (/not found/i.test(apiMsg)) {
              userMsg = "User not found for one or more emails."
            } else if (/limit/i.test(apiMsg)) {
              userMsg = "You have reached the invitation limit."
            }
            toast({
              title: "Failed to send some invitations",
              description: userMsg,
              variant: "destructive",
            })
            throw error // rethrow to prevent success toast
          }
        })
      )

      toast({
        title: "Invitations sent!",
        description: `Successfully sent ${finalInvitees.length} invitation(s)`,
      })

      // Reset form
      setSelected([])
      setMessage("")
      setDefaultRole("viewer")
      setInputValue("")
      toggleInviteWindow()

      // Refresh pending invites in parent (if available)
      if (typeof window !== "undefined") {
        // Dispatch a custom event to notify parent to refresh invites
        window.dispatchEvent(new CustomEvent("refresh-pending-invites"))
      }
    } catch (error: any) {
      // If not already handled above
      if (!error?.response?.data?.message) {
        toast({
          title: "Failed to send invitations",
          description: "Please try again",
          variant: "destructive",
        })
      }
      // else: already shown specific error
    }
  }

  const filteredOptions =
    inputValue === ""
      ? options
      : options.filter((option) =>
          option.username?.toLowerCase().includes(inputValue.toLowerCase())
        )

  const props = { multiple: true } as unknown as { multiple: false }

  const validSelected = selected.filter((i) => !i.invalid)
  const invalidSelected = selected.filter((i) => i.invalid)

  return (
    <>
      <Dialog open={open} onOpenChange={toggleInviteWindow}>
        <DialogContent className="max-w-[690px] p-0">
          <DialogTitle className="sr-only">Invite Your Team</DialogTitle>
          <DialogDescription className="sr-only">
            Send invitation emails to team members
          </DialogDescription>
          <div className="max-w-[690px] bg-white p-6 rounded-xl shadow-lg">
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
                      onClick={() => setSettingsOpen(true)}
                    >
                      <Settings className="h-6 w-6" />
                    </TooltipTrigger>
                    <TooltipContent side="bottom">Settings</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </div>

            <div className="space-y-2 mt-8">
              <Label className="text-gray-700" size="md" htmlFor={id}>
                Invite by email
              </Label>
              <p className="text-xs text-gray-500">
                Type one or multiple emails separated by comma, space, or
                semicolon
              </p>
              <div className="flex items-center gap-x-3">
                <Combobox
                  className="flex-auto relative"
                  as="div"
                  value={selected}
                  onChange={setSelected}
                  {...props}
                >
                  <div
                    className={cn(
                      inputVariants({
                        className:
                          "min-h-[44px] h-auto flex flex-wrap gap-2 focus-within:border-primary-500 focus-within:ring-2 focus-within:ring-primary-50",
                      })
                    )}
                    tabIndex={0}
                  >
                    {selected.map((item, index) => (
                      <Badge
                        key={index}
                        visual={item.invalid ? "error" : "primary"}
                        className={
                          item.invalid
                            ? "border-red-300 bg-red-50 text-red-700"
                            : ""
                        }
                      >
                        {item.email}
                        {item.invalid && (
                          <span className="text-red-500 text-[10px] ml-1">
                            invalid
                          </span>
                        )}
                        <button
                          onClick={() => handleRemove(item.email)}
                          className="focus-visible:outline-none flex-none"
                        >
                          <X2 className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                    <Combobox.Input
                      className="text-base min-w-[132px] flex-auto text-gray-700 p-0 focus:ring-0 border-none placeholder:text-gray-500"
                      placeholder="Add emails or find contacts"
                      id={id}
                      value={inputValue}
                      onKeyDown={handleKeyDown}
                      onChange={handleChange}
                    />
                  </div>

                  <Combobox.Options className="absolute w-full z-50 rounded-lg bg-white border border-gray-100 shadow-lg mt-2">
                    {filteredOptions.map((option) => (
                      <Combobox.Option
                        key={option.email}
                        className="flex cursor-pointer items-center gap-x-3 py-2.5 h-16 px-3.5"
                        value={{ ...option, role: defaultRole }}
                      >
                        <div className="h-10 flex-none relative rounded-full overflow-hidden w-10">
                          <NextImage
                            className="object-cover"
                            src={option.avatar}
                            alt="man.jpg"
                            sizes="100vh"
                            fill
                          />
                        </div>
                        <div className="flex-auto">
                          <h2 className="text-sm leading-6 font-medium text-gray-800">
                            {option.username}
                          </h2>
                          <p className="text-sm leading-5 text-gray-500">
                            {option.email}
                          </p>
                        </div>
                      </Combobox.Option>
                    ))}
                  </Combobox.Options>
                </Combobox>
                <Button
                  variant="light"
                  size="lg"
                  type="button"
                  onClick={handleAddTag}
                >
                  Add
                </Button>
              </div>

              {/* Invalid email warning */}
              {invalidSelected.length > 0 && (
                <p className="text-xs text-red-600 mt-1">
                  {invalidSelected.length} invalid email
                  {invalidSelected.length > 1 ? "s" : ""} — fix or remove before
                  sending
                </p>
              )}
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
                onChange={onMessageChanged}
                placeholder="Write message here..."
              />
            )}

            {selected && isNotEmpty(selected) && (
              <div className="mt-6 space-y-3">
                <span className="text-base leading-5 font-medium text-gray-700">
                  Invites ({validSelected.length} valid
                  {invalidSelected.length > 0
                    ? `, ${invalidSelected.length} invalid`
                    : ""}
                  )
                </span>
                {selected.map(({ email, avatar, username, role, invalid }) => (
                  <div className="space-y-3 mt-3" key={email}>
                    <div className="flex justify-between items-center">
                      <div className="inline-flex items-center gap-x-3">
                        {avatar ? (
                          <div className="h-8 w-8 rounded-full overflow-hidden relative">
                            <NextImage
                              className="object-cover"
                              src={avatar}
                              alt="Man"
                              sizes="100vh"
                              fill
                            />
                          </div>
                        ) : (
                          <div
                            className={cn(
                              "h-8 w-8 rounded-full overflow-hidden border border-dashed bg-gray-50 relative",
                              invalid ? "border-red-300" : "border-gray-300"
                            )}
                          />
                        )}
                        <span
                          className={cn(
                            "font-medium text-sm leading-5",
                            invalid ? "text-red-600" : "text-gray-800"
                          )}
                        >
                          {username ? username : email}
                          {invalid && (
                            <span className="ml-1 text-xs text-red-400">
                              (invalid)
                            </span>
                          )}
                        </span>
                      </div>

                      <DropdownMenu>
                        <DropdownMenuTrigger className="inline-flex items-center gap-x-1 text-sm font-medium text-gray-900">
                          {role.charAt(0).toUpperCase() + role.slice(1)}
                          <ChevronDown className="text-gray-500 h-5 w-5 flex-none" />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                          <DropdownMenuRadioGroup
                            value={role}
                            onValueChange={(value) =>
                              handleRoleChange(
                                email,
                                value as "admin" | "editor" | "viewer"
                              )
                            }
                          >
                            <DropdownMenuRadioCheckItem value="viewer">
                              Viewer
                            </DropdownMenuRadioCheckItem>
                            <DropdownMenuRadioCheckItem value="editor">
                              Editor
                            </DropdownMenuRadioCheckItem>
                            <DropdownMenuRadioCheckItem value="admin">
                              Admin
                            </DropdownMenuRadioCheckItem>
                          </DropdownMenuRadioGroup>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => handleRemove(email)}>
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
                {copySuccess ? "Copied!" : "Copy Link"}
              </button>
              <div className="inline-flex items-center gap-x-3">
                <DialogClose asChild>
                  <Button visual="gray" variant="outlined">
                    Cancel
                  </Button>
                </DialogClose>
                <Button onClick={handleSendInvites}>Send Invite</Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogContent className="max-w-[720px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold text-gray-900">
              Manage Invite Settings
            </DialogTitle>
            <DialogDescription className="text-sm text-gray-500">
              Control how invite links are shared and protected.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 mt-4">
            <section className="space-y-3">
              <h3 className="text-sm font-semibold text-gray-800">
                General Invites
              </h3>
              <label className="flex items-start gap-3 text-sm text-gray-700">
                <input
                  type="checkbox"
                  className="mt-1"
                  checked={settings.userTracking}
                  onChange={(e) =>
                    setSettings((s) => ({
                      ...s,
                      userTracking: e.target.checked,
                    }))
                  }
                />
                <div>
                  <span className="font-medium">Enable User Tracking</span>
                  <p className="text-xs text-gray-500">
                    Track views, edits or usage of the shared content.
                  </p>
                </div>
              </label>
              <label className="flex items-start gap-3 text-sm text-gray-700">
                <input
                  type="checkbox"
                  className="mt-1"
                  checked={settings.embedCode}
                  onChange={(e) =>
                    setSettings((s) => ({ ...s, embedCode: e.target.checked }))
                  }
                />
                <div className="flex items-center gap-3 flex-wrap">
                  <div>
                    <span className="font-medium">Enable Embed Code</span>
                    <p className="text-xs text-gray-500">
                      Copy the embed code to share content in apps or sites.
                    </p>
                  </div>
                  <Button variant="outlined" size="sm" visual="gray">
                    Copy Embed Code
                  </Button>
                </div>
              </label>
              <label className="flex items-start gap-3 text-sm text-gray-700">
                <input
                  type="checkbox"
                  className="mt-1"
                  checked={settings.guestSharing}
                  onChange={(e) =>
                    setSettings((s) => ({
                      ...s,
                      guestSharing: e.target.checked,
                    }))
                  }
                />
                <div>
                  <span className="font-medium">Guest Sharing</span>
                  <p className="text-xs text-gray-500">
                    Allow guests to request access.
                  </p>
                </div>
              </label>
            </section>

            <section className="space-y-3">
              <h3 className="text-sm font-semibold text-gray-800">
                Link Settings
              </h3>
              <div className="space-y-2">
                <Label className="text-sm text-gray-700">Who Has Access</Label>
                <select
                  className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
                  value={settings.access}
                  onChange={(e) =>
                    setSettings((s) => ({ ...s, access: e.target.value }))
                  }
                >
                  <option value="anyone">Anyone with a link</option>
                  <option value="team">Team members only</option>
                  <option value="invited">Invited people only</option>
                </select>
              </div>

              <label className="flex items-start gap-3 text-sm text-gray-700">
                <input
                  type="checkbox"
                  className="mt-1"
                  checked={settings.linkExpires}
                  onChange={(e) =>
                    setSettings((s) => ({
                      ...s,
                      linkExpires: e.target.checked,
                    }))
                  }
                />
                <div className="flex flex-col gap-2 w-full">
                  <span className="font-medium">
                    Allow Link Expiration After
                  </span>
                  <div className="flex gap-2 flex-wrap">
                    <input
                      type="date"
                      className="border border-gray-300 rounded px-2 py-1 text-sm"
                      value={settings.expiryDate}
                      onChange={(e) =>
                        setSettings((s) => ({
                          ...s,
                          expiryDate: e.target.value,
                        }))
                      }
                    />
                    <input
                      type="time"
                      className="border border-gray-300 rounded px-2 py-1 text-sm"
                      value={settings.expiryTime}
                      onChange={(e) =>
                        setSettings((s) => ({
                          ...s,
                          expiryTime: e.target.value,
                        }))
                      }
                    />
                  </div>
                </div>
              </label>

              <div className="space-y-2">
                <Label className="text-sm text-gray-700">
                  Enable Link Password
                </Label>
                <input
                  type="password"
                  className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
                  value={settings.linkPassword}
                  onChange={(e) =>
                    setSettings((s) => ({ ...s, linkPassword: e.target.value }))
                  }
                  placeholder="Enter password"
                />
              </div>

              <label className="flex items-start gap-3 text-sm text-gray-700">
                <input
                  type="checkbox"
                  className="mt-1"
                  checked={settings.notifications}
                  onChange={(e) =>
                    setSettings((s) => ({
                      ...s,
                      notifications: e.target.checked,
                    }))
                  }
                />
                <div>
                  <span className="font-medium">Allow Notification Alerts</span>
                  <p className="text-xs text-gray-500">
                    Notify when recipients open or use the link.
                  </p>
                </div>
              </label>
            </section>
          </div>

          <DialogFooter className="mt-6">
            <Button
              visual="gray"
              variant="outlined"
              onClick={() => setSettingsOpen(false)}
            >
              Close
            </Button>
            <Button onClick={() => setSettingsOpen(false)}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
