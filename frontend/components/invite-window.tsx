"use client"

import React, { useCallback, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/auth"
import { InvitationsAPI } from "@/service/http/invitations"
import { useCompanyMembers } from "@/src/hooks/useCompanies"
import {
  useCancelInvitation,
  useCreateInvitations,
} from "@/src/hooks/useInvitations"
import { callAll, cn, isNotEmpty } from "@/utils/functions"
import {
  ArrowLeft,
  Calendar,
  Clock,
  Code01,
  InfoCircle,
  Link01,
  Minus,
  Plus,
  Settings,
  X2,
} from "@blend-metrics/icons"
import { Slot } from "@radix-ui/react-slot"
import { useToggle } from "react-use"
import { z } from "zod"
import { create } from "zustand"
import { combine } from "zustand/middleware"
import { appendInviteContext } from "@/lib/invite-link"
import { InviteCompany, InviteCompanySteps } from "./invite-company-steps"
import { InviteSentNotification } from "./invite-sent-notification"
import NextImage from "./next-image"
import { SelectPermissionsControl } from "./select-permissions-panel"
import {
  Badge,
  Button,
  Checkbox,
  Dialog,
  DialogClose,
  DialogContent,
  Label,
  Listbox,
  ListboxButton,
  ListboxOption,
  ListboxOptions,
  Textarea,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
  inputVariants,
  useToast,
} from "./ui"

type InviteRole = "admin" | "editor" | "viewer"

interface Invitee {
  avatar?: string
  /** Real name. Absent for plain email invites, which show the email alone. */
  name?: string
  /** Handle without the leading "@". Only rendered alongside a name. */
  username?: string
  email: string
  role: InviteRole
  /** Granular roles picked in the Select Permissions side menu. */
  permissions: string[]
  /** Kept as a chip so the user can see and fix the typo, but never sent. */
  invalid?: boolean
}

type Invitees = Invitee[]

const isEmail = (value: string) => z.string().email().safeParse(value).success

const parseEmails = (input: string): string[] => {
  return input
    .split(/[\s,;]+/)
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean)
}

// QA-180/PMCM-399: teamInvite/listingId/onInvited are additive — every
// existing caller keeps calling toggle(open, title) exactly as before and
// gets the exact same behavior (teamInvite/listingId/onInvited stay
// unset). Without an explicit teamInvite: true, isTeamInvite below still
// falls back to the original "no title" heuristic, so share-flavored
// callers (Share Your Project/Transactions/Invoices) are unaffected.
export interface InviteWindowContext {
  teamInvite?: boolean
  listingId?: string | null
  onInvited?: (emails: string[]) => void
}

export const useInviteWindowStore = create(
  combine(
    {
      open: false,
      title: "",
      teamInvite: false,
      listingId: null as string | null,
      onInvited: undefined as ((emails: string[]) => void) | undefined,
    },
    (set) => ({
      toggle: (
        open?: boolean,
        title?: string,
        context?: InviteWindowContext
      ) =>
        set((state) => {
          const closing = typeof open === "boolean" && !open
          return {
            ...state,
            open: typeof open === "boolean" ? open : !state.open,
            title: title ?? (closing ? "" : state.title),
            // Closing always clears the per-caller context so the next
            // opener (a different page, or the default "Invite Your Team"
            // trigger) never inherits a stale flavor/listing/callback.
            teamInvite: closing
              ? false
              : context?.teamInvite ?? state.teamInvite,
            listingId: closing ? null : (context?.listingId ?? state.listingId),
            onInvited: closing ? undefined : (context?.onInvited ?? state.onInvited),
          }
        }),
    })
  )
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

const EXPIRATION_OPTIONS = ["15 Days", "30 Days", "90 Days", "Custom"]

const ACCESS_OPTIONS = [
  "Anyone with a link",
  "Only invited guests",
  "Owner Only",
]

/**
 * Masks for the custom link-expiration fields. Both accept digits only and
 * insert the separators themselves, so the value can never drift from the
 * MM/DD/YYYY and HH:MM shapes shown in the placeholders. Out-of-range parts
 * are clamped as they are typed (month 01-12, day 01-31, hour 01-12 on the
 * 12-hour clock, minute 00-59); whether the date actually exists on the
 * calendar is settled by `isValidExpiryDate` once the field is complete.
 */
export const formatExpiryDateInput = (value: string) => {
  let digits = value.replace(/\D/g, "").slice(0, 8)

  // A leading digit above 1 can only be a single-digit month: 5 -> 05.
  if (digits.length >= 1 && Number(digits[0]) > 1) {
    digits = `0${digits}`.slice(0, 8)
  }
  if (digits.length >= 2) {
    const month = Number(digits.slice(0, 2))
    if (month === 0) digits = `01${digits.slice(2)}`
    else if (month > 12) digits = `12${digits.slice(2)}`
  }
  // Same idea for the day: 4 -> 04.
  if (digits.length >= 3 && Number(digits[2]) > 3) {
    digits = `${digits.slice(0, 2)}0${digits.slice(2)}`.slice(0, 8)
  }
  if (digits.length >= 4) {
    const day = Number(digits.slice(2, 4))
    if (day === 0) digits = `${digits.slice(0, 2)}01${digits.slice(4)}`
    else if (day > 31) digits = `${digits.slice(0, 2)}31${digits.slice(4)}`
  }

  return [digits.slice(0, 2), digits.slice(2, 4), digits.slice(4, 8)]
    .filter(Boolean)
    .join("/")
}

export const formatExpiryTimeInput = (value: string) => {
  let digits = value.replace(/\D/g, "").slice(0, 4)

  if (digits.length >= 1 && Number(digits[0]) > 1) {
    digits = `0${digits}`.slice(0, 4)
  }
  if (digits.length >= 2) {
    const hour = Number(digits.slice(0, 2))
    if (hour === 0) digits = `01${digits.slice(2)}`
    else if (hour > 12) digits = `12${digits.slice(2)}`
  }
  if (digits.length >= 3 && Number(digits[2]) > 5) {
    digits = `${digits.slice(0, 2)}5${digits.slice(3)}`
  }

  return digits.length > 2
    ? `${digits.slice(0, 2)}:${digits.slice(2, 4)}`
    : digits
}

/** True once the field holds a complete date that exists on the calendar. */
export const isValidExpiryDate = (value: string) => {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value)
  if (!match) return false

  const [, month, day, year] = match.map(Number)
  const date = new Date(year, month - 1, day)
  return (
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day
  )
}

export const isValidExpiryTime = (value: string) => {
  const match = /^(\d{2}):(\d{2})$/.exec(value)
  if (!match) return false

  const [, hour, minute] = match.map(Number)
  return hour >= 1 && hour <= 12 && minute <= 59
}

const SettingsCard = ({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) => (
  <div className="overflow-hidden rounded-lg border border-gray-200">
    <div className="border-b border-gray-200 bg-gray-50 px-4 py-3">
      <h3 className="text-base font-semibold text-gray-700">{title}</h3>
    </div>
    <div className="divide-y divide-gray-200">{children}</div>
  </div>
)

const SettingsRow = ({
  id,
  label,
  description,
  checked,
  onCheckedChange,
  children,
}: {
  id: string
  label: string
  description?: string
  checked: boolean
  onCheckedChange: (checked: boolean) => void
  children?: React.ReactNode
}) => (
  <div className="px-4 py-4">
    <div className="flex items-start gap-x-3">
      <Checkbox
        id={id}
        size="md"
        className="mt-0.5"
        checked={checked}
        onCheckedChange={(value) => onCheckedChange(value === true)}
      />
      <div className="flex-auto">
        <label
          htmlFor={id}
          className="cursor-pointer text-base font-medium text-gray-700"
        >
          {label}
        </label>
        {description && (
          <p className="mt-1 text-sm leading-5 text-gray-500">{description}</p>
        )}
      </div>
    </div>
    {children && <div className="mt-3 pl-8">{children}</div>}
  </div>
)

const InviteSettingsPanel = ({ onBack }: { onBack: () => void }) => {
  const [userTracking, setUserTracking] = useState(false)
  const [guestSharing, setGuestSharing] = useState(false)
  const [whoHasAccess, setWhoHasAccess] = useState(true)
  const [accessLevel, setAccessLevel] = useState(ACCESS_OPTIONS[0])
  const [linkExpiration, setLinkExpiration] = useState(true)
  const [expiration, setExpiration] = useState("Custom")
  const [expiresOnDate, setExpiresOnDate] = useState("")
  const [expiresOnTime, setExpiresOnTime] = useState("")
  const [meridiem, setMeridiem] = useState<"AM" | "PM">("AM")
  const [expiryTouched, setExpiryTouched] = useState(false)
  const [enablePassword, setEnablePassword] = useState(true)
  const [password, setPassword] = useState("")
  const [notificationAlerts, setNotificationAlerts] = useState(false)
  const [embedCode, setEmbedCode] = useState(false)
  const { toast } = useToast()

  // A custom expiry needs both halves filled in and valid before it can be
  // saved; the fields only complain once they've been left.
  const dateComplete = isValidExpiryDate(expiresOnDate)
  const timeComplete = isValidExpiryTime(expiresOnTime)
  const dateInvalid = expiryTouched && !dateComplete
  const timeInvalid = expiryTouched && !timeComplete
  const expiryError =
    dateInvalid && timeInvalid
      ? "Enter the expiry date as MM/DD/YYYY and the time as HH:MM."
      : dateInvalid
        ? expiresOnDate
          ? "Enter a real date in MM/DD/YYYY format."
          : "Enter the expiry date as MM/DD/YYYY."
        : timeInvalid
          ? "Enter the expiry time as HH:MM."
          : null

  const handleSave = () => {
    if (
      linkExpiration &&
      expiration === "Custom" &&
      !(dateComplete && timeComplete)
    ) {
      setExpiryTouched(true)
      return
    }
    onBack()
  }

  const copyEmbedCode = async () => {
    const url = typeof window !== "undefined" ? window.location.href : ""
    const snippet = `<iframe src="${url}" width="100%" height="600" frameborder="0" allowfullscreen></iframe>`

    try {
      await navigator.clipboard.writeText(snippet)
      toast({ title: "Embed code copied to clipboard." })
    } catch {
      toast({
        title: "Couldn't copy the embed code.",
        variant: "destructive",
      })
    }
  }

  return (
    <div>
      <div className="mb-6 flex items-center gap-x-3">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-x-2 text-base font-semibold text-primary-500 hover:text-primary-600 focus-visible:outline-none"
        >
          <ArrowLeft className="size-5" />
          Back
        </button>
        <h2 className="flex-auto text-center text-lg leading-7 font-semibold text-gray-800">
          Manage Invite Settings
        </h2>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger className="text-gray-500 hover:text-gray-900">
              <InfoCircle className="size-6" />
            </TooltipTrigger>
            <TooltipContent side="bottom">Support</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      <div className="max-h-[60vh] space-y-6 overflow-y-auto pr-1">
        <SettingsCard title="General Invites">
          <SettingsRow
            id="invite-user-tracking"
            label="Enable User Tracking"
            description="Track the usage of the shared content, such as views, or edits"
            checked={userTracking}
            onCheckedChange={setUserTracking}
          />
          <SettingsRow
            id="invite-guest-sharing"
            label="Guest Sharing"
            description="Allow guests to make requests to admin to share content."
            checked={guestSharing}
            onCheckedChange={setGuestSharing}
          />
        </SettingsCard>

        <SettingsCard title="Link Settings">
          <SettingsRow
            id="invite-who-has-access"
            label="Who Has Access"
            description="Determine which users can access the shared content."
            checked={whoHasAccess}
            onCheckedChange={setWhoHasAccess}
          >
            {whoHasAccess && (
              <Listbox value={accessLevel} onChange={setAccessLevel}>
                <ListboxButton className="w-[220px] justify-between text-sm" />
                <ListboxOptions>
                  {ACCESS_OPTIONS.map((opt) => (
                    <ListboxOption key={opt} value={opt}>
                      {opt}
                    </ListboxOption>
                  ))}
                </ListboxOptions>
              </Listbox>
            )}
          </SettingsRow>

          <SettingsRow
            id="invite-link-expiration"
            label="Allow Link Expiration After:"
            description="Set when the shared link will no longer be accessible."
            checked={linkExpiration}
            onCheckedChange={setLinkExpiration}
          >
            {linkExpiration && (
              <div className="flex flex-nowrap items-center gap-2">
                <Listbox value={expiration} onChange={setExpiration}>
                  <ListboxButton className="w-[130px] shrink-0 justify-between text-sm" />
                  <ListboxOptions>
                    {EXPIRATION_OPTIONS.map((opt) => (
                      <ListboxOption key={opt} value={opt}>
                        {opt}
                      </ListboxOption>
                    ))}
                  </ListboxOptions>
                </Listbox>

                {expiration === "Custom" && (
                  <>
                    <div className="relative shrink-0">
                      <Calendar className="pointer-events-none absolute left-3.5 top-1/2 size-5 -translate-y-1/2 text-gray-500" />
                      <input
                        value={expiresOnDate}
                        onChange={(e) =>
                          setExpiresOnDate(
                            formatExpiryDateInput(e.target.value)
                          )
                        }
                        onBlur={() => setExpiryTouched(true)}
                        inputMode="numeric"
                        autoComplete="off"
                        maxLength={10}
                        aria-invalid={dateInvalid}
                        aria-label="Expiration date, MM/DD/YYYY"
                        placeholder="MM/DD/YYYY"
                        className={cn(
                          inputVariants(),
                          "w-[165px] pl-11 text-sm",
                          dateInvalid && "border-error-300"
                        )}
                      />
                    </div>

                    <div className="relative shrink-0">
                      <Clock className="pointer-events-none absolute left-3.5 top-1/2 size-5 -translate-y-1/2 text-gray-500" />
                      <input
                        value={expiresOnTime}
                        onChange={(e) =>
                          setExpiresOnTime(
                            formatExpiryTimeInput(e.target.value)
                          )
                        }
                        onBlur={() => setExpiryTouched(true)}
                        inputMode="numeric"
                        autoComplete="off"
                        maxLength={5}
                        aria-invalid={timeInvalid}
                        aria-label="Expiration time, HH:MM"
                        placeholder="HH:MM"
                        className={cn(
                          inputVariants(),
                          "w-[125px] pl-11 text-sm",
                          timeInvalid && "border-error-300"
                        )}
                      />
                    </div>

                    <div className="inline-flex h-11 shrink-0 items-center overflow-hidden rounded-[5px] border border-gray-300 shadow-xs">
                      {(["AM", "PM"] as const).map((value) => (
                        <button
                          key={value}
                          type="button"
                          onClick={() => setMeridiem(value)}
                          className={cn(
                            "h-full px-3.5 text-sm font-medium focus-visible:outline-none",
                            meridiem === value
                              ? "bg-white text-gray-800"
                              : "bg-gray-50 text-gray-500 hover:text-gray-700"
                          )}
                        >
                          {value}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}

            {linkExpiration && expiration === "Custom" && expiryError && (
              <p className="mt-2 text-sm leading-5 text-error-500">
                {expiryError}
              </p>
            )}
          </SettingsRow>

          <SettingsRow
            id="invite-link-password"
            label="Enable Link Password"
            description="Set a password that users need to enter to access the shared content."
            checked={enablePassword}
            onCheckedChange={setEnablePassword}
          >
            {enablePassword && (
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                className={cn(inputVariants(), "w-[330px] text-sm")}
              />
            )}
          </SettingsRow>

          <SettingsRow
            id="invite-notification-alerts"
            label="Allow Notification Alerts"
            description="Notify users when the content has been shared with them."
            checked={notificationAlerts}
            onCheckedChange={setNotificationAlerts}
          />

          <SettingsRow
            id="invite-embed-code"
            label="Enable Embed Code"
            description="Copy the embed code to share the content on a website or in an application."
            checked={embedCode}
            onCheckedChange={setEmbedCode}
          >
            {embedCode && (
              <Button
                variant="outlined"
                visual="gray"
                size="md"
                onClick={copyEmbedCode}
              >
                <Code01 className="size-5" />
                Copy Embed Code
              </Button>
            )}
          </SettingsRow>
        </SettingsCard>
      </div>

      <div className="mt-6 flex items-center justify-end gap-x-3">
        <Button variant="outlined" visual="gray" size="sm" onClick={onBack}>
          Cancel
        </Button>
        <Button size="sm" onClick={handleSave}>
          Save Settings
        </Button>
      </div>
    </div>
  )
}

export const InviteWindow = () => {
  const [invitees, setInvitees] = useState<Invitees>([])
  // Addresses typed or picked from the contacts dropdown, shown as chips
  // inside the "Invite by email" field. They only move into `invitees` (the
  // Invites list below) once the Add button commits them. See
  // handleAddToInvites.
  const [chips, setChips] = useState<Invitees>([])
  const [inputValue, setInputValue] = useState("")
  const {
    open,
    title: storeTitle,
    teamInvite: storeTeamInvite,
    listingId: storeListingId,
    onInvited: storeOnInvited,
    toggle: toggleInviteWindow,
  } = useInviteWindowStore()
  const [view, setView] = useState<InviteView>("invite")
  // Set once invitations come back from the API. Drives the top-right
  // confirmation card that replaces the old in-dialog "Invite Sent!" screen.
  // Lives outside the dialog reset in handleOpenChange so closing the dialog
  // (which is what sending now does) doesn't wipe the confirmation with it.
  const [sentInvites, setSentInvites] = useState<{
    emails: string[]
    ids: string[]
    /** Captured at send time, because the store's title (and so `isTeamInvite`)
     * is reset by the close that immediately follows. */
    isTeam: boolean
  } | null>(null)
  const [isUndoing, setIsUndoing] = useState(false)
  // QA-180/PMCM-399: a caller can now opt into team-invite behavior
  // (company assignment shown, so contact search has a company to search)
  // even while also passing its own title, via toggle's context.teamInvite
  // — see edit-listing/[slug]/page.tsx's "Add Team Member" trigger. Every
  // other title-passing caller (Share Your Project/Transactions/Invoices)
  // never sets that flag, so they keep the original share-flavored
  // behavior unchanged: share-flavored callers pass their own title and
  // skip company assignment.
  const isTeamInvite = !storeTitle || storeTeamInvite
  const [showCompanySteps, setShowCompanySteps] = useState(isTeamInvite)
  const [company, setCompany] = useState<InviteCompany | null>(null)
  // Fixed role for every invitee. Permissions (via SelectPermissionsControl)
  // are the only per-invitee access control now, so there's no role picker.
  // It must still be a real role: the backend validates `role` against
  // admin/editor/viewer, and the empty string this used to send made every
  // Send Invite fail with "role must be one of the following values".
  const defaultRole: InviteRole = "viewer"
  const [isOpen, toggle] = useToggle(false)
  const [message, setMessage] = useState("")
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [copySuccess, setCopySuccess] = useState(false)
  const { user } = useAuth()
  const { toast } = useToast()
  const router = useRouter()
  const createInvitations = useCreateInvitations()
  const cancelInvitation = useCancelInvitation()
  const { data: companyMembers } = useCompanyMembers(company?.id)

  // Real company members replace the previous 2 hard-coded contacts.
  const contacts = (companyMembers ?? [])
    .filter((member) => !!member.email)
    .map((member) => ({
      // No generated stand-in: a member without an uploaded picture shows an
      // empty avatar, never initials.
      avatar: member.avatarUrl || undefined,
      name: member.name || undefined,
      username: member.username || undefined,
      email: member.email as string,
    }))
  const inviteBaseUrl = (
    process.env.NEXT_PUBLIC_APP_URL ||
    (typeof window !== "undefined" ? window.location.origin : "")
  ).replace(/\/$/, "")

  // Restart at the company step each time the team-invite flow is reopened.
  useEffect(() => {
    if (open) {
      setShowCompanySteps(isTeamInvite)
      setCompany(null)
    }
  }, [open, isTeamInvite])

  const filteredContacts = inputValue
    ? contacts.filter((c) => {
        const needle = inputValue.toLowerCase()
        return [c.name, c.username, c.email].some((field) =>
          field?.toLowerCase().includes(needle)
        )
      })
    : []

  const validInvitees = invitees.filter((invitee) => !invitee.invalid)
  // Only pending chips can be flagged, since anything already committed to
  // `invitees` was valid at commit time.
  const hasInvalid = chips.some((chip) => chip.invalid)
  // Addresses typed but not yet turned into chips. Send picks these up too
  // (handleSendInvite adds them before sending), so they count as something
  // to send even though Add hasn't been pressed.
  const pendingEmails = parseEmails(inputValue)
  // Nothing to add until an address has been typed/picked, and flagged
  // chips have to be fixed (or removed) first.
  const canAdd = !hasInvalid && (chips.length > 0 || pendingEmails.length > 0)
  const canSend =
    !hasInvalid &&
    (isNotEmpty(invitees) || chips.length > 0 || pendingEmails.length > 0)

  // Turns currently-typed text into pending chips inside the input. It does
  // NOT touch the Invites list below. That only happens via handleAddToInvites.
  const addPendingChips = (raw: string) => {
    const values = parseEmails(raw)
    if (!values.length) return

    setChips((prev) => {
      const existing = new Set([
        ...prev.map((item) => item.email.toLowerCase()),
        ...invitees.map((item) => item.email.toLowerCase()),
      ])
      const additions: Invitee[] = []

      for (const email of values) {
        if (existing.has(email)) continue
        additions.push({
          email,
          role: defaultRole,
          permissions: [],
          invalid: !isEmail(email),
        })
        existing.add(email)
      }

      return additions.length ? [...prev, ...additions] : prev
    })
  }

  // Enter key: confirm the typed text as a chip, nothing more.
  const handleConfirmInput = () => {
    if (hasInvalid) return
    addPendingChips(inputValue)
    setInputValue("")
    setShowSuggestions(false)
  }

  // Add button: chip-ify any leftover typed text, then move every valid
  // pending chip into the Invites list below and clear it from the input.
  // An invalid chip (e.g. from text typed on this same click) stays behind
  // so it's still visible to fix, mirroring how flagged chips already work.
  const handleAddToInvites = () => {
    if (hasInvalid) return
    addPendingChips(inputValue)
    setInputValue("")
    setShowSuggestions(false)

    setChips((prevChips) => {
      const valid = prevChips.filter((chip) => !chip.invalid)
      const stillPending = prevChips.filter((chip) => chip.invalid)

      if (valid.length) {
        setInvitees((prevInvitees) => {
          const existing = new Set(
            prevInvitees.map((item) => item.email.toLowerCase())
          )
          const additions = valid.filter((chip) => {
            const email = chip.email.toLowerCase()
            if (existing.has(email)) return false
            existing.add(email)
            return true
          })
          return additions.length
            ? [...prevInvitees, ...additions]
            : prevInvitees
        })
      }

      return stillPending
    })
  }

  const handleAddContact = (contact: (typeof contacts)[0]) => {
    const normalizedEmail = contact.email.toLowerCase()
    const alreadyPresent =
      chips.some((c) => c.email.toLowerCase() === normalizedEmail) ||
      invitees.some((i) => i.email.toLowerCase() === normalizedEmail)
    if (!alreadyPresent) {
      setChips((prev) => [
        ...prev,
        {
          ...contact,
          email: normalizedEmail,
          role: defaultRole,
          permissions: [],
        },
      ])
      setInputValue("")
      setShowSuggestions(false)
    }
  }

  const handleRemoveChip = (email: string) => {
    setChips((prev) => prev.filter((c) => c.email !== email))
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault()
      handleConfirmInput()
    }
  }

  const handleSendInvite = async () => {
    let finalInvitees = [...invitees]
    const existing = new Set(
      finalInvitees.map((item) => item.email.toLowerCase())
    )
    const sweepIn: Invitee[] = []

    // Safety net: sweep in anything still sitting as a pending chip or typed
    // but unconfirmed, so forgetting to press Add doesn't drop an invitee.
    for (const chip of chips) {
      const email = chip.email.toLowerCase()
      if (existing.has(email)) continue
      sweepIn.push(chip)
      existing.add(email)
    }

    if (inputValue.trim()) {
      for (const email of parseEmails(inputValue)) {
        if (existing.has(email)) continue
        sweepIn.push({
          email,
          role: defaultRole,
          permissions: [],
          invalid: !isEmail(email),
        })
        existing.add(email)
      }
    }

    if (sweepIn.length) {
      finalInvitees = [...finalInvitees, ...sweepIn]
      setInvitees(finalInvitees)
      setChips([])
      setInputValue("")
    }

    if (finalInvitees.some((invitee) => invitee.invalid)) {
      toast({
        title: "Invalid email address",
        description:
          "Fix or remove the highlighted addresses before sending invites.",
        variant: "destructive",
      })
      return
    }

    if (!isNotEmpty(finalInvitees)) {
      toast({
        title: "No invitees",
        description: "Please add at least one email address",
        variant: "destructive",
      })
      return
    }

    const teamId = user?.id || (user as any)?.sub
    if (!teamId) {
      toast({
        title: "Authentication required",
        description: "Please sign in again to send invitations.",
        variant: "destructive",
      })
      return
    }

    // Group by role AND permissions, not role alone. Permissions are
    // per-invitee (SelectPermissionsControl), so two invitees with the same
    // role but different permission sets must not be batched together.
    const groups = new Map<
      string,
      { role: InviteRole; permissions: string[]; emails: string[] }
    >()
    for (const invitee of finalInvitees) {
      const sortedPermissions = [...invitee.permissions].sort()
      const key = `${invitee.role}|${sortedPermissions.join(",")}`
      const existing = groups.get(key)
      if (existing) {
        existing.emails.push(invitee.email)
      } else {
        groups.set(key, {
          role: invitee.role,
          permissions: sortedPermissions,
          emails: [invitee.email],
        })
      }
    }

    try {
      const results = await Promise.all(
        Array.from(groups.values()).map(({ role, permissions, emails }) =>
          createInvitations.mutateAsync({
            teamId,
            companyId: company?.id,
            role,
            emails,
            permissions,
            note: message || undefined,
          })
        )
      )

      const created = results.flat()
      // The saved rows carry `invitedEmail`; only the rejection shape has
      // `email`. Anything that still resolves to nothing falls back to what
      // was typed in, so the confirmation always names an address.
      const sentEmails = created
        .map((invitation) => invitation.invitedEmail ?? invitation.email)
        .filter((email): email is string => Boolean(email))
      setSentInvites({
        emails: sentEmails.length
          ? sentEmails
          : finalInvitees.map((invitee) => invitee.email),
        // Only invitations this send actually created can be undone. An
        // address that was already invited keeps its existing invite.
        ids: created
          .filter((invitation) => invitation.id && !invitation.alreadyInvited)
          .map((invitation) => invitation.id),
        isTeam: isTeamInvite,
      })
      // QA-180/PMCM-399: lets a caller (e.g. the listing wizard's Team
      // step) know which addresses were actually invited, so it can show
      // its own "Pending Invite" row for each — same sentEmails-or-fallback
      // derivation as setSentInvites above, captured from this render's
      // closure so it still fires correctly even though handleOpenChange
      // below clears the store's copy of it on close.
      storeOnInvited?.(
        sentEmails.length
          ? sentEmails
          : finalInvitees.map((invitee) => invitee.email)
      )
      // Close straight away; the confirmation lives in the top-right card now.
      // Same teardown as Cancel, so a sent draft can't linger either.
      handleOpenChange(false)
    } catch (error: any) {
      toast({
        title: "Failed to send invitations",
        description:
          error?.response?.data?.message ||
          error?.message ||
          "Please try again.",
        variant: "destructive",
      })
    }
  }

  const handleCopyLink = async () => {
    const teamId = user?.id || (user as any)?.sub
    if (!teamId) {
      toast({
        title: "Unable to copy link",
        description:
          "Could not determine your team. Please sign in and try again.",
        variant: "destructive",
      })
      return
    }

    try {
      let teamName = (user as any)?.teamName || "Client Team"
      try {
        const teamResponse = await (
          await import("@/service/http/teams")
        ).TeamsAPI.getTeam(teamId)
        const teamData = teamResponse?.data
        teamName = teamData?.name || teamData?.teamName || teamName
      } catch {
        // If team lookup fails, continue with fallback teamName
      }

      const res = await InvitationsAPI.createInvitationLink({
        teamId,
        companyId: company?.id,
        teamName,
        role: defaultRole,
      })
      const inviteLink =
        res?.url ||
        (res?.token ? `${inviteBaseUrl}/invite/accept?token=${res.token}` : "")

      if (!inviteLink) {
        throw new Error(
          "We couldn't generate the invite link. Please try again."
        )
      }

      // Company/inviter travel on the invitation record now (companyId
      // above) and /invite/accept + /invite/setup resolve them server-side
      // via GET /invitations/preview. They still ride the URL here too,
      // though: frontend/app/sign-in and frontend/app/sign-up are
      // login-frozen (SOP §1.4, out of scope for this change) and their
      // InviteBanner reads this exact context from the URL
      // (readInviteContextForAuthPage in lib/invite-link.ts). Dropping it
      // here would silently break a banner in files this change cannot
      // touch to fix a different way.
      const inviteLinkWithContext = appendInviteContext(inviteLink, {
        company: company?.name,
        companyId: company?.id,
        inviter:
          [user?.firstName, user?.lastName].filter(Boolean).join(" ") ||
          user?.email,
        inviterHandle: user?.username ? `@${user.username}` : undefined,
        // QA-180/PMCM-399 AC: the listing's own id, so the invite is
        // traceable back to the listing that generated it. Absent for
        // every non-listing caller (Share Your Project/Transactions/
        // Invoices, or the default "Invite Your Team").
        listingId: storeListingId ?? undefined,
      })

      await navigator.clipboard.writeText(inviteLinkWithContext)
      setCopySuccess(true)
      setTimeout(() => setCopySuccess(false), 2000)
      toast({
        title: "Link copied!",
        description: "A team invite link was copied to your clipboard",
      })
    } catch (err: any) {
      toast({
        title: "Failed to copy",
        description:
          err?.response?.data?.message ||
          err?.message ||
          "We couldn't generate the invite link. Please try again.",
        variant: "destructive",
      })
    }
  }

  const handleOpenChange = (nextOpen: boolean | undefined) => {
    toggleInviteWindow(typeof nextOpen === "boolean" ? nextOpen : undefined)
    if (!nextOpen) {
      setView("invite")
      setCompany(null)
      setShowCompanySteps(isTeamInvite)
      // Cancel/X/Esc discards the draft entirely, so reopening starts empty
      // rather than resurrecting addresses the user walked away from.
      setInvitees([])
      setChips([])
      setInputValue("")
      setMessage("")
      setShowSuggestions(false)
      setCopySuccess(false)
      toggle(false)
    }
  }

  // Stable so the card's auto-dismiss timer isn't restarted on every render.
  const dismissSentNotification = useCallback(() => setSentInvites(null), [])

  const handleUndoInvites = async () => {
    if (!sentInvites) return

    setIsUndoing(true)
    try {
      await Promise.all(
        sentInvites.ids.map((id) => cancelInvitation.mutateAsync(id))
      )
      setSentInvites(null)
      toast({
        title: "Invitation undone",
        description:
          sentInvites.emails.length === 1
            ? `The invite to ${sentInvites.emails[0]} was canceled.`
            : "The invites you just sent were canceled.",
      })
    } catch (error: any) {
      toast({
        title: "Couldn't undo the invite",
        description:
          error?.response?.data?.message ||
          error?.message ||
          "Please cancel it from My Team instead.",
        variant: "destructive",
      })
    } finally {
      setIsUndoing(false)
    }
  }

  const handleManageRoles = () => {
    setSentInvites(null)
    router.push("/my-network")
  }

  return (
    <>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent
          className={cn(showCompanySteps ? "max-w-[560px]" : "max-w-[690px]")}
        >
          <div>
            {showCompanySteps ? (
              <InviteCompanySteps
                onCancel={() => handleOpenChange(false)}
                onContinue={(selectedCompany) => {
                  setCompany(selectedCompany)
                  setShowCompanySteps(false)
                }}
              />
            ) : view === "settings" ? (
              <InviteSettingsPanel onBack={() => setView("invite")} />
            ) : (
              <>
                <div className="flex justify-between items-center">
                  <h2 className="text-lg leading-7 font-semibold text-gray-800">
                    {storeTitle || "Invite Your Team"}
                  </h2>

                  <div className="inline-flex items-center gap-x-4">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger className="text-gray-500 hover:text-gray-900">
                          <InfoCircle className="h-6 w-6" />
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
                          }),
                          hasInvalid &&
                            "border-error-300 focus-within:border-error-500 focus-within:ring-error-50"
                        )}
                      >
                        {chips.map((chip) => (
                          <Badge
                            key={chip.email}
                            visual={chip.invalid ? "error" : "primary"}
                          >
                            {chip.email}
                            <button
                              onClick={() => handleRemoveChip(chip.email)}
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
                              {contact.avatar ? (
                                <div className="h-10 flex-none relative rounded-full overflow-hidden w-10">
                                  <NextImage
                                    className="object-cover"
                                    src={contact.avatar}
                                    alt={contact.name ?? contact.email}
                                    sizes="100vh"
                                    fill
                                  />
                                </div>
                              ) : (
                                <div className="h-10 w-10 flex-none rounded-full border border-dashed border-gray-300 bg-gray-50" />
                              )}
                              <div className="flex-auto text-left">
                                {/* Without a name the email is all we know, so it
                                  takes the primary line instead of appearing on
                                  both lines. */}
                                {contact.name ? (
                                  <>
                                    <h2 className="text-sm leading-6 font-medium text-gray-800">
                                      {contact.name}
                                      {contact.username && (
                                        <span className="font-normal text-gray-500">
                                          {" "}
                                          @{contact.username}
                                        </span>
                                      )}
                                    </h2>
                                    <p className="text-sm leading-5 text-gray-500">
                                      {contact.email}
                                    </p>
                                  </>
                                ) : (
                                  <h2 className="text-sm leading-6 font-medium text-gray-800">
                                    {contact.email}
                                  </h2>
                                )}
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
                      disabled={!canAdd}
                      onClick={handleAddToInvites}
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

                {isNotEmpty(validInvitees) && (
                  <div className="mt-6 space-y-3">
                    <span className="text-base leading-5 font-medium text-gray-700">
                      Invites
                    </span>
                    {validInvitees.map(
                      ({ email, avatar, name, username, permissions }) => (
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
                              {/* "Name @handle" when we know the person, plain
                                email when we don't. */}
                              <span className="font-medium text-sm leading-5 text-gray-800">
                                {name ?? email}
                                {name && username && (
                                  <span className="font-normal text-gray-500">
                                    {" "}
                                    @{username}
                                  </span>
                                )}
                              </span>
                            </div>

                            <div className="inline-flex items-center gap-x-3">
                              <SelectPermissionsControl
                                value={permissions}
                                onApply={(roleIds) =>
                                  setInvitees((prev) =>
                                    prev.map((item) =>
                                      item.email === email
                                        ? { ...item, permissions: roleIds }
                                        : item
                                    )
                                  )
                                }
                              />
                            </div>
                          </div>
                        </div>
                      )
                    )}
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
                    <Button disabled={!canSend} onClick={handleSendInvite}>
                      Send Invite
                    </Button>
                  </div>
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {sentInvites && (
        <InviteSentNotification
          emails={sentInvites.emails}
          onUndo={sentInvites.ids.length ? handleUndoInvites : undefined}
          onManageRoles={sentInvites.isTeam ? handleManageRoles : undefined}
          onDismiss={dismissSentNotification}
          isUndoing={isUndoing}
        />
      )}
    </>
  )
}
