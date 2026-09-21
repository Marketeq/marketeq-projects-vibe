"use client"

import { useState } from "react"
import { resolveDashboardRole, useAuth } from "@/contexts/auth"
import { ROLE } from "@/types/user"
import { X } from "@blend-metrics/icons"
import { usePrivacySettings } from "@/src/hooks/usePrivacySettings"
import type {
  TalentPrivacyPrefs,
  ClientPrivacyPrefs,
} from "@/service/http/privacy"
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogOverlay,
  DialogTitle,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Switch,
  useToast,
} from "@/components/ui"

/* ------------------------------------------------------------------ */
/*  Confirmation Modal                                                 */
/* ------------------------------------------------------------------ */

function ConfirmationModal({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  onConfirm,
  variant = "warning",
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description: string
  confirmLabel: string
  onConfirm: () => void
  variant?: "warning" | "destructive"
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="w-[409px] max-w-[calc(100vw-2rem)] gap-0 overflow-hidden p-0 shadow-[0px_20px_24px_-4px_rgba(16,24,40,0.08),0px_8px_8px_-4px_rgba(16,24,40,0.03)]"
        dialogOverlay={
          <DialogOverlay className="bg-gray-700/50 backdrop-blur-[8px]" />
        }
      >
        <div className="flex w-full flex-col items-start gap-2 border-b border-gray-200 p-6">
          <DialogTitle className="w-full text-lg leading-7 font-semibold text-dark-blue-400">
            {title}
          </DialogTitle>
          <DialogDescription className="text-sm font-light text-dark-blue-400">
            {description}
          </DialogDescription>
        </div>

        <div className="flex w-full items-center justify-between gap-8 rounded-b-xl bg-gray-25 px-6 py-4">
          <Button
            variant="link"
            visual="gray"
            size="sm"
            className="h-5 p-0 opacity-50"
            onClick={() => onOpenChange(false)}
            leftIcon={<X className="size-[15px] text-dark-blue-400" />}
          >
            Cancel
          </Button>
          <Button
            variant="outlined"
            visual={variant === "destructive" ? "error" : "gray"}
            size="sm"
            className="bg-white shadow-xs"
            onClick={() => {
              onConfirm()
              onOpenChange(false)
            }}
          >
            {confirmLabel}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

/* ------------------------------------------------------------------ */
/*  Delete Account Modal (type-to-confirm)                             */
/* ------------------------------------------------------------------ */

function DeleteAccountModal({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const [confirmText, setConfirmText] = useState("")
  const isConfirmed = confirmText === "DELETE"

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) setConfirmText("")
        onOpenChange(v)
      }}
    >
      <DialogContent
        className="w-[440px] max-w-[calc(100vw-2rem)] gap-0 overflow-hidden p-0 shadow-[0px_20px_24px_-4px_rgba(16,24,40,0.08),0px_8px_8px_-4px_rgba(16,24,40,0.03)]"
        dialogOverlay={
          <DialogOverlay className="bg-gray-700/50 backdrop-blur-[8px]" />
        }
      >
        <div className="flex w-full flex-col items-start gap-3 border-b border-gray-200 p-6">
          <DialogTitle className="w-full text-lg leading-7 font-semibold text-dark-blue-400">
            Delete your account?
          </DialogTitle>
          <DialogDescription className="text-sm font-light text-dark-blue-400">
            This action is permanent and cannot be undone. All your data,
            messages, contracts, and payment history will be permanently removed.
          </DialogDescription>

          <div className="w-full mt-2 space-y-1.5">
            <Label size="sm">
              Type DELETE to confirm
            </Label>
            <Input
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder="DELETE"
              isInvalid={confirmText.length > 0 && !isConfirmed}
            />
          </div>
        </div>

        <div className="flex w-full items-center justify-between gap-8 rounded-b-xl bg-gray-25 px-6 py-4">
          <Button
            variant="link"
            visual="gray"
            size="sm"
            className="h-5 p-0 opacity-50"
            onClick={() => {
              setConfirmText("")
              onOpenChange(false)
            }}
            leftIcon={<X className="size-[15px] text-dark-blue-400" />}
          >
            Cancel
          </Button>
          <Button
            variant="outlined"
            visual="error"
            size="sm"
            className="bg-white shadow-xs"
            disabled={!isConfirmed}
            onClick={() => {
              setConfirmText("")
              onOpenChange(false)
            }}
          >
            Permanently Delete Account
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

/* ------------------------------------------------------------------ */
/*  Download Data Modal                                                */
/* ------------------------------------------------------------------ */

function DownloadDataModal({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="w-[409px] max-w-[calc(100vw-2rem)] gap-0 overflow-hidden p-0 shadow-[0px_20px_24px_-4px_rgba(16,24,40,0.08),0px_8px_8px_-4px_rgba(16,24,40,0.03)]"
        dialogOverlay={
          <DialogOverlay className="bg-gray-700/50 backdrop-blur-[8px]" />
        }
      >
        <div className="flex w-full flex-col items-start gap-2 border-b border-gray-200 p-6">
          <DialogTitle className="w-full text-lg leading-7 font-semibold text-dark-blue-400">
            Download your data
          </DialogTitle>
          <DialogDescription className="text-sm font-light text-dark-blue-400">
            We will prepare a ZIP file containing your profile information,
            messages, contracts, and invoices. You will receive an email when
            the export is ready.
          </DialogDescription>
        </div>

        <div className="flex w-full items-center justify-between gap-8 rounded-b-xl bg-gray-25 px-6 py-4">
          <Button
            variant="link"
            visual="gray"
            size="sm"
            className="h-5 p-0 opacity-50"
            onClick={() => onOpenChange(false)}
            leftIcon={<X className="size-[15px] text-dark-blue-400" />}
          >
            Cancel
          </Button>
          <Button
            variant="outlined"
            visual="gray"
            size="sm"
            className="bg-white shadow-xs"
            onClick={() => onOpenChange(false)}
          >
            Request Data Export
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

/* ------------------------------------------------------------------ */
/*  Reset Defaults Modal                                               */
/* ------------------------------------------------------------------ */

function ResetDefaultsModal({
  open,
  onOpenChange,
  onConfirm,
  isLoading,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => Promise<void> | void
  isLoading?: boolean
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="w-[409px] max-w-[calc(100vw-2rem)] gap-0 overflow-hidden p-0 shadow-[0px_20px_24px_-4px_rgba(16,24,40,0.08),0px_8px_8px_-4px_rgba(16,24,40,0.03)]"
        dialogOverlay={
          <DialogOverlay className="bg-gray-700/50 backdrop-blur-[8px]" />
        }
      >
        <div className="flex w-full flex-col items-start gap-2 border-b border-gray-200 p-6">
          <DialogTitle className="w-full text-lg leading-7 font-semibold text-dark-blue-400">
            Reset all privacy settings to default?
          </DialogTitle>
          <DialogDescription className="text-sm font-light text-dark-blue-400">
            All privacy preferences will be reverted to their default values.
            Your profile will become fully visible and all restrictions will
            be removed.
          </DialogDescription>
        </div>

        <div className="flex w-full items-center justify-between gap-8 rounded-b-xl bg-gray-25 px-6 py-4">
          <Button
            variant="link"
            visual="gray"
            size="sm"
            className="h-5 p-0 opacity-50"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
            leftIcon={<X className="size-[15px] text-dark-blue-400" />}
          >
            Cancel
          </Button>
          <Button
            variant="outlined"
            visual="gray"
            size="sm"
            className="bg-white shadow-xs"
            onClick={async () => {
              await onConfirm()
              onOpenChange(false)
            }}
            disabled={isLoading}
          >
            {isLoading ? "Please wait..." : "Yes, Reset to Default"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

/* ------------------------------------------------------------------ */
/*  Shared row + section                                               */
/* ------------------------------------------------------------------ */

function PrivacyRow({
  title,
  description,
  children,
}: {
  title: string
  description: string
  children: React.ReactNode
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-4 border-b border-gray-200 last:border-b-0">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-dark-blue-400">{title}</p>
        <p className="text-xs text-gray-500 mt-0.5">{description}</p>
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  )
}

function SectionCard({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-[0px_2px_5px_rgba(0,0,0,0.04)]">
      <div className="px-6 pt-6 pb-2">
        <h3 className="text-base font-semibold text-dark-blue-400">{title}</h3>
      </div>
      <div className="px-6 pb-6">{children}</div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Talent Privacy Settings                                            */
/* ------------------------------------------------------------------ */

type TalentModal =
  | null
  | "hideProfile"
  | "hideRate"
  | "restrictMessages"
  | "downloadData"
  | "deleteAccount"
  | "resetDefaults"

function TalentPrivacySettings({
  prefs,
  onUpdate,
  onReset,
  isSaving,
}: {
  prefs: TalentPrivacyPrefs
  onUpdate: (patch: Partial<TalentPrivacyPrefs>) => void
  onReset: () => Promise<void>
  isSaving: boolean
}) {
  const { toast } = useToast()
  const [modal, setModal] = useState<TalentModal>(null)
  const [pendingValue, setPendingValue] = useState<string | null>(null)
  const [resetLoading, setResetLoading] = useState(false)

  const handleProfileVisibilityChange = (v: string) => {
    if (v === "hidden") {
      setPendingValue(v)
      setModal("hideProfile")
    } else {
      onUpdate({ profileVisibility: v as TalentPrivacyPrefs["profileVisibility"] })
    }
  }

  const handleHideRateChange = (v: boolean) => {
    if (v) {
      setModal("hideRate")
    } else {
      onUpdate({ hideRate: false })
    }
  }

  const handleWhoCanMessageChange = (v: string) => {
    if (v === "past_clients") {
      setPendingValue(v)
      setModal("restrictMessages")
    } else {
      onUpdate({ whoCanMessage: v as TalentPrivacyPrefs["whoCanMessage"] })
    }
  }

  const handleConfirmReset = async () => {
    setResetLoading(true)
    try {
      await onReset()
      toast({ title: "Privacy settings have been reset to default", variant: "success" })
    } catch {
      toast({ title: "Failed to reset privacy settings", variant: "destructive" })
    } finally {
      setResetLoading(false)
    }
  }

  return (
    <>
      {isSaving && (
        <p className="text-xs text-gray-400 mb-2 text-right">Saving...</p>
      )}

      <div className="space-y-6">
        {/* Profile Visibility */}
        <SectionCard title="Profile Visibility">
          <PrivacyRow
            title="Show my profile in search results"
            description="Allow clients to find you through platform search"
          >
            <Switch
              checked={prefs.showInSearch}
              onCheckedChange={(v) => onUpdate({ showInSearch: v })}
              size="sm"
            />
          </PrivacyRow>

          <PrivacyRow
            title="Show my profile in browse pages"
            description="Appear in talent browse and category listings"
          >
            <Switch
              checked={prefs.showInBrowse}
              onCheckedChange={(v) => onUpdate({ showInBrowse: v })}
              size="sm"
            />
          </PrivacyRow>

          <PrivacyRow
            title="Profile visibility"
            description="Control who can view your full profile"
          >
            <Select
              value={prefs.profileVisibility}
              onValueChange={handleProfileVisibilityChange}
            >
              <SelectTrigger className="w-[180px] h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="public">Public</SelectItem>
                <SelectItem value="registered">Registered Users</SelectItem>
                <SelectItem value="hidden">Hidden</SelectItem>
              </SelectContent>
            </Select>
          </PrivacyRow>

          <PrivacyRow
            title="Hide my hourly rate"
            description="Rate is only revealed after a client initiates contact"
          >
            <Switch
              checked={prefs.hideRate}
              onCheckedChange={handleHideRateChange}
              size="sm"
            />
          </PrivacyRow>

          <PrivacyRow
            title="Location display"
            description="Choose how much of your location is visible"
          >
            <Select
              value={prefs.locationDisplay}
              onValueChange={(v) =>
                onUpdate({ locationDisplay: v as TalentPrivacyPrefs["locationDisplay"] })
              }
            >
              <SelectTrigger className="w-[180px] h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="city_state">City & State</SelectItem>
                <SelectItem value="state">State Only</SelectItem>
                <SelectItem value="country">Country Only</SelectItem>
                <SelectItem value="hidden">Hidden</SelectItem>
              </SelectContent>
            </Select>
          </PrivacyRow>
        </SectionCard>

        {/* Contact & Availability */}
        <SectionCard title="Contact & Availability">
          <PrivacyRow
            title="Who can message me"
            description="Control who is allowed to send you direct messages"
          >
            <Select
              value={prefs.whoCanMessage}
              onValueChange={handleWhoCanMessageChange}
            >
              <SelectTrigger className="w-[180px] h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="anyone">Anyone</SelectItem>
                <SelectItem value="clients">Clients Only</SelectItem>
                <SelectItem value="past_clients">Past Clients Only</SelectItem>
              </SelectContent>
            </Select>
          </PrivacyRow>

          <PrivacyRow
            title="Show online status"
            description="Display a green dot when you are active on the platform"
          >
            <Switch
              checked={prefs.showOnlineStatus}
              onCheckedChange={(v) => onUpdate({ showOnlineStatus: v })}
              size="sm"
            />
          </PrivacyRow>

          <PrivacyRow
            title="Show last active"
            description="Display when you were last online"
          >
            <Switch
              checked={prefs.showLastActive}
              onCheckedChange={(v) => onUpdate({ showLastActive: v })}
              size="sm"
            />
          </PrivacyRow>

          <PrivacyRow
            title="Show my availability publicly"
            description="Let clients see your calendar availability"
          >
            <Switch
              checked={prefs.showAvailability}
              onCheckedChange={(v) => onUpdate({ showAvailability: v })}
              size="sm"
            />
          </PrivacyRow>
        </SectionCard>

        {/* Work History & Portfolio */}
        <SectionCard title="Work History & Portfolio">
          <PrivacyRow
            title="Show completed projects"
            description="Display past projects on your profile"
          >
            <Switch
              checked={prefs.showCompletedProjects}
              onCheckedChange={(v) => onUpdate({ showCompletedProjects: v })}
              size="sm"
            />
          </PrivacyRow>

          <PrivacyRow
            title="Show client reviews"
            description="Display reviews from past clients on your profile"
          >
            <Switch
              checked={prefs.showReviews}
              onCheckedChange={(v) => onUpdate({ showReviews: v })}
              size="sm"
            />
          </PrivacyRow>
        </SectionCard>

        {/* Data & Account */}
        <SectionCard title="Data & Account">
          <PrivacyRow
            title="Download my data"
            description="Export all your profile data, messages, and contracts"
          >
            <Button
              variant="outlined"
              visual="gray"
              size="sm"
              onClick={() => setModal("downloadData")}
            >
              Request Export
            </Button>
          </PrivacyRow>

          <PrivacyRow
            title="Delete my account"
            description="Permanently remove your account and all associated data"
          >
            <Button
              variant="outlined"
              visual="error"
              size="sm"
              onClick={() => setModal("deleteAccount")}
            >
              Delete Account
            </Button>
          </PrivacyRow>

          <PrivacyRow
            title="Reset to defaults"
            description="Revert all privacy settings back to their default values"
          >
            <Button
              variant="outlined"
              visual="gray"
              size="sm"
              onClick={() => setModal("resetDefaults")}
            >
              Reset
            </Button>
          </PrivacyRow>
        </SectionCard>
      </div>

      {/* Modals */}
      <ConfirmationModal
        open={modal === "hideProfile"}
        onOpenChange={(v) => { if (!v) setModal(null) }}
        title="Hide your profile?"
        description="Your profile will be completely hidden from search results, browse pages, and category listings. Clients will not be able to find or view your profile."
        confirmLabel="Yes, Hide My Profile"
        variant="warning"
        onConfirm={() => {
          onUpdate({ profileVisibility: pendingValue as TalentPrivacyPrefs["profileVisibility"] })
          setPendingValue(null)
        }}
      />

      <ConfirmationModal
        open={modal === "hideRate"}
        onOpenChange={(v) => { if (!v) setModal(null) }}
        title="Hide your hourly rate?"
        description="Your rate will no longer be visible on your public profile. Clients will only see it after they initiate contact with you, which may reduce the number of inquiries you receive."
        confirmLabel="Yes, Hide My Rate"
        variant="warning"
        onConfirm={() => onUpdate({ hideRate: true })}
      />

      <ConfirmationModal
        open={modal === "restrictMessages"}
        onOpenChange={(v) => { if (!v) setModal(null) }}
        title="Restrict messages to past clients?"
        description="Only clients you have previously worked with will be able to message you. New clients will not be able to send you direct messages, which may cause you to miss new business opportunities."
        confirmLabel="Yes, Restrict Messages"
        variant="warning"
        onConfirm={() => {
          onUpdate({ whoCanMessage: pendingValue as TalentPrivacyPrefs["whoCanMessage"] })
          setPendingValue(null)
        }}
      />

      <DownloadDataModal
        open={modal === "downloadData"}
        onOpenChange={(v) => { if (!v) setModal(null) }}
      />

      <DeleteAccountModal
        open={modal === "deleteAccount"}
        onOpenChange={(v) => { if (!v) setModal(null) }}
      />

      <ResetDefaultsModal
        open={modal === "resetDefaults"}
        onOpenChange={(v) => { if (!v) setModal(null) }}
        onConfirm={handleConfirmReset}
        isLoading={resetLoading}
      />
    </>
  )
}

/* ------------------------------------------------------------------ */
/*  Client Privacy Settings                                            */
/* ------------------------------------------------------------------ */

type ClientModal =
  | null
  | "anonymousPostings"
  | "hidePostings"
  | "blockMessages"
  | "downloadData"
  | "deleteAccount"
  | "resetDefaults"

function ClientPrivacySettings({
  prefs,
  onUpdate,
  onReset,
  isSaving,
}: {
  prefs: ClientPrivacyPrefs
  onUpdate: (patch: Partial<ClientPrivacyPrefs>) => void
  onReset: () => Promise<void>
  isSaving: boolean
}) {
  const { toast } = useToast()
  const [modal, setModal] = useState<ClientModal>(null)
  const [pendingValue, setPendingValue] = useState<string | null>(null)
  const [resetLoading, setResetLoading] = useState(false)

  const handleAnonymousPostingsChange = (v: boolean) => {
    if (v) {
      setModal("anonymousPostings")
    } else {
      onUpdate({ anonymousPostings: false })
    }
  }

  const handleHidePostingsChange = (v: boolean) => {
    if (v) {
      setModal("hidePostings")
    } else {
      onUpdate({ hideActivePostings: false })
    }
  }

  const handleWhoCanMessageChange = (v: string) => {
    if (v === "nobody") {
      setPendingValue(v)
      setModal("blockMessages")
    } else {
      onUpdate({ whoCanMessage: v as ClientPrivacyPrefs["whoCanMessage"] })
    }
  }

  const handleConfirmReset = async () => {
    setResetLoading(true)
    try {
      await onReset()
      toast({ title: "Privacy settings have been reset to default", variant: "success" })
    } catch {
      toast({ title: "Failed to reset privacy settings", variant: "destructive" })
    } finally {
      setResetLoading(false)
    }
  }

  return (
    <>
      {isSaving && (
        <p className="text-xs text-gray-400 mb-2 text-right">Saving...</p>
      )}

      <div className="space-y-6">
        {/* Company Visibility */}
        <SectionCard title="Company Visibility">
          <PrivacyRow
            title="Show my company in talent search"
            description="Allow talent to find and view your company profile"
          >
            <Switch
              checked={prefs.showCompanyInSearch}
              onCheckedChange={(v) => onUpdate({ showCompanyInSearch: v })}
              size="sm"
            />
          </PrivacyRow>

          <PrivacyRow
            title="Post job listings anonymously"
            description="Company name is hidden on postings until you choose to reveal it"
          >
            <Switch
              checked={prefs.anonymousPostings}
              onCheckedChange={handleAnonymousPostingsChange}
              size="sm"
            />
          </PrivacyRow>

          <PrivacyRow
            title="Profile visibility"
            description="Control who can view your company profile"
          >
            <Select
              value={prefs.profileVisibility}
              onValueChange={(v) =>
                onUpdate({ profileVisibility: v as ClientPrivacyPrefs["profileVisibility"] })
              }
            >
              <SelectTrigger className="w-[180px] h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="public">Public</SelectItem>
                <SelectItem value="registered">Registered Users</SelectItem>
              </SelectContent>
            </Select>
          </PrivacyRow>
        </SectionCard>

        {/* Hiring Activity */}
        <SectionCard title="Hiring Activity">
          <PrivacyRow
            title="Hide my active job postings"
            description="Make your open positions invite-only and hidden from public browse"
          >
            <Switch
              checked={prefs.hideActivePostings}
              onCheckedChange={handleHidePostingsChange}
              size="sm"
            />
          </PrivacyRow>

          <PrivacyRow
            title="Show how many people I have hired"
            description="Display your hire count on your company profile"
          >
            <Switch
              checked={prefs.showHireCount}
              onCheckedChange={(v) => onUpdate({ showHireCount: v })}
              size="sm"
            />
          </PrivacyRow>

          <PrivacyRow
            title="Show my average response time"
            description="Let talent see how quickly you respond to proposals"
          >
            <Switch
              checked={prefs.showResponseTime}
              onCheckedChange={(v) => onUpdate({ showResponseTime: v })}
              size="sm"
            />
          </PrivacyRow>
        </SectionCard>

        {/* Contact & Communication */}
        <SectionCard title="Contact & Communication">
          <PrivacyRow
            title="Who can message me"
            description="Control who is allowed to send you direct messages"
          >
            <Select
              value={prefs.whoCanMessage}
              onValueChange={handleWhoCanMessageChange}
            >
              <SelectTrigger className="w-[180px] h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="anyone">Anyone</SelectItem>
                <SelectItem value="hired">Hired Talent Only</SelectItem>
                <SelectItem value="nobody">Nobody</SelectItem>
              </SelectContent>
            </Select>
          </PrivacyRow>

          <PrivacyRow
            title="Show online status"
            description="Display a green dot when you are active on the platform"
          >
            <Switch
              checked={prefs.showOnlineStatus}
              onCheckedChange={(v) => onUpdate({ showOnlineStatus: v })}
              size="sm"
            />
          </PrivacyRow>

          <PrivacyRow
            title="Show last active"
            description="Display when you were last online"
          >
            <Switch
              checked={prefs.showLastActive}
              onCheckedChange={(v) => onUpdate({ showLastActive: v })}
              size="sm"
            />
          </PrivacyRow>
        </SectionCard>

        {/* Billing & Financial */}
        <SectionCard title="Billing & Financial">
          <PrivacyRow
            title="Hide my total spend"
            description="Keep your total platform spending private"
          >
            <Switch
              checked={prefs.hideTotalSpend}
              onCheckedChange={(v) => onUpdate({ hideTotalSpend: v })}
              size="sm"
            />
          </PrivacyRow>

          <PrivacyRow
            title="Hide my average project budget"
            description="Keep your typical budget range private"
          >
            <Switch
              checked={prefs.hideAvgBudget}
              onCheckedChange={(v) => onUpdate({ hideAvgBudget: v })}
              size="sm"
            />
          </PrivacyRow>
        </SectionCard>

        {/* Data & Account */}
        <SectionCard title="Data & Account">
          <PrivacyRow
            title="Download my data"
            description="Export all your company data, messages, and contracts"
          >
            <Button
              variant="outlined"
              visual="gray"
              size="sm"
              onClick={() => setModal("downloadData")}
            >
              Request Export
            </Button>
          </PrivacyRow>

          <PrivacyRow
            title="Delete my account"
            description="Permanently remove your account and all associated data"
          >
            <Button
              variant="outlined"
              visual="error"
              size="sm"
              onClick={() => setModal("deleteAccount")}
            >
              Delete Account
            </Button>
          </PrivacyRow>

          <PrivacyRow
            title="Reset to defaults"
            description="Revert all privacy settings back to their default values"
          >
            <Button
              variant="outlined"
              visual="gray"
              size="sm"
              onClick={() => setModal("resetDefaults")}
            >
              Reset
            </Button>
          </PrivacyRow>
        </SectionCard>
      </div>

      {/* Modals */}
      <ConfirmationModal
        open={modal === "anonymousPostings"}
        onOpenChange={(v) => { if (!v) setModal(null) }}
        title="Enable anonymous postings?"
        description="Your company name will be hidden on all active and future job postings. Talent will not see who posted the listing until you choose to reveal your identity."
        confirmLabel="Yes, Post Anonymously"
        variant="warning"
        onConfirm={() => onUpdate({ anonymousPostings: true })}
      />

      <ConfirmationModal
        open={modal === "hidePostings"}
        onOpenChange={(v) => { if (!v) setModal(null) }}
        title="Hide all active job postings?"
        description="All your open job postings will be hidden from public browse and search. Talent will only be able to apply if you send them a direct invitation."
        confirmLabel="Yes, Hide My Postings"
        variant="warning"
        onConfirm={() => onUpdate({ hideActivePostings: true })}
      />

      <ConfirmationModal
        open={modal === "blockMessages"}
        onOpenChange={(v) => { if (!v) setModal(null) }}
        title="Block all incoming messages?"
        description="Nobody will be able to send you direct messages, including talent you have previously hired. You will need to initiate all conversations yourself."
        confirmLabel="Yes, Block All Messages"
        variant="destructive"
        onConfirm={() => {
          onUpdate({ whoCanMessage: pendingValue as ClientPrivacyPrefs["whoCanMessage"] })
          setPendingValue(null)
        }}
      />

      <DownloadDataModal
        open={modal === "downloadData"}
        onOpenChange={(v) => { if (!v) setModal(null) }}
      />

      <DeleteAccountModal
        open={modal === "deleteAccount"}
        onOpenChange={(v) => { if (!v) setModal(null) }}
      />

      <ResetDefaultsModal
        open={modal === "resetDefaults"}
        onOpenChange={(v) => { if (!v) setModal(null) }}
        onConfirm={handleConfirmReset}
        isLoading={resetLoading}
      />
    </>
  )
}

/* ------------------------------------------------------------------ */
/*  Main Export                                                         */
/* ------------------------------------------------------------------ */

export default function PrivacySettings() {
  const { user } = useAuth()
  const role = resolveDashboardRole(user)
  const isTalent = role === ROLE.TALENT
  const {
    talentPrefs,
    clientPrefs,
    isLoading,
    isError,
    isSaving,
    update,
    reset,
  } = usePrivacySettings()

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="bg-white rounded-lg border border-gray-200 h-48 animate-pulse" />
        <div className="bg-white rounded-lg border border-gray-200 h-64 animate-pulse" />
        <div className="bg-white rounded-lg border border-gray-200 h-48 animate-pulse" />
      </div>
    )
  }

  if (isError) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <p className="text-sm text-gray-500">
          Couldn&apos;t load your privacy settings. Please try again.
        </p>
      </div>
    )
  }

  if (isTalent) {
    const handleReset = async () => { await reset() }

    return (
      <TalentPrivacySettings
        prefs={talentPrefs}
        onUpdate={(patch) => update({ talent: patch })}
        onReset={handleReset}
        isSaving={isSaving}
      />
    )
  }

  const handleReset = async () => { await reset() }

  return (
    <ClientPrivacySettings
      prefs={clientPrefs}
      onUpdate={(patch) => update({ client: patch })}
      onReset={handleReset}
      isSaving={isSaving}
    />
  )
}
