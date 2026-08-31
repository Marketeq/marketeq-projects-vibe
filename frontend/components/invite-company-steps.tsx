"use client"

import React, { useEffect, useRef, useState } from "react"
import { cn } from "@/utils/functions"
import {
  ArrowLeft,
  Building01,
  Check,
  ChevronDown,
  Plus,
  X,
  X2,
} from "@blend-metrics/icons"
import {
  COMPANY_NAME_IS_EMAIL_MESSAGE,
  Company,
  createCompany,
  isEmailLikeCompanyName,
  listCompanies,
  uploadCompanyLogo,
} from "@/lib/company-directory"
import {
  CompanyLogoField,
  CompanyRow,
  CompanySearchField,
} from "./company-fields"
import { DialogClose, ErrorMessage, inputVariants } from "./ui"
import { Button } from "./ui"

/** Kept as the invite-side name for the shared directory type. */
export type InviteCompany = Company

type CompanyStep = "select" | "create" | "logo"

const StepHeader = ({
  title,
  subtitle,
  onBack,
}: {
  title: string
  subtitle: string
  onBack?: () => void
}) => (
  <div>
    <div className="flex items-center justify-between gap-x-3">
      {onBack ? (
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-x-1.5 text-sm font-medium text-gray-500 hover:text-gray-900 focus-visible:outline-none"
        >
          <ArrowLeft className="size-4" />
          Back
        </button>
      ) : (
        <span />
      )}
      <DialogClose className="flex-none text-gray-400 hover:text-gray-900 focus-visible:outline-none">
        <X className="size-5" />
      </DialogClose>
    </div>
    <h2 className="mt-3 text-lg leading-7 font-semibold text-gray-800">
      {title}
    </h2>
    <p className="mt-1 text-sm leading-5 text-gray-500">{subtitle}</p>
  </div>
)

const StepFooter = ({
  onCancel,
  children,
}: {
  onCancel: () => void
  children: React.ReactNode
}) => (
  <div className="-mx-6 -mb-6 mt-8 flex items-center justify-between border-t border-gray-100 px-6 py-4">
    <button
      type="button"
      onClick={onCancel}
      className="inline-flex items-center gap-x-2 text-sm font-medium text-gray-500 hover:text-gray-900 focus-visible:outline-none"
    >
      <X2 className="size-4" />
      Cancel
    </button>
    <div className="inline-flex items-center gap-x-3">{children}</div>
  </div>
)

const AddCompanyButton = ({
  label,
  onClick,
}: {
  label: string
  onClick: () => void
}) => (
  <button
    type="button"
    onClick={onClick}
    className="flex w-full items-center gap-x-2 border-t border-gray-100 px-3.5 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 focus-visible:outline-none"
  >
    <Plus className="size-4 text-gray-500" />
    {label}
  </button>
)

/**
 * The company-assignment steps that run before the invite-by-email panel:
 * pick a company -> (optionally) create one -> (optionally) add its logo.
 *
 * `onContinue` hands the chosen company (or null, when the user continues
 * without one) to the invite panel.
 */
export const InviteCompanySteps = ({
  onContinue,
  onCancel,
}: {
  onContinue: (company: Company | null) => void
  onCancel: () => void
}) => {
  // `listCompanies` reads localStorage, so it must not run during SSR. The
  // effect below fills the list in once mounted.
  const [companies, setCompanies] = useState<Company[]>([])
  const [step, setStep] = useState<CompanyStep>("select")
  const [selectedId, setSelectedId] = useState<string | undefined>()
  const [menuOpen, setMenuOpen] = useState(false)
  const [draftName, setDraftName] = useState("")
  const [draftLogo, setDraftLogo] = useState<string | undefined>()
  const [logoUploading, setLogoUploading] = useState(false)
  const [logoError, setLogoError] = useState<string | undefined>()
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | undefined>()
  const menuRef = useRef<HTMLDivElement>(null)

  const selected = companies.find((company) => company.id === selectedId)
  const trimmedName = draftName.trim()
  // Guards the Continue buttons the same way CompanySearchField guards its
  // create row: an email address is an invitee, never a company name.
  const nameIsEmail = isEmailLikeCompanyName(trimmedName)

  useEffect(() => {
    let cancelled = false
    listCompanies().then((stored) => {
      if (cancelled) return
      setCompanies(stored)
      setSelectedId(stored[0]?.id)
    })
    return () => {
      cancelled = true
    }
  }, [])

  // Search-as-you-type for the create step's company matcher, over the
  // caller's own companies only. It used to query the global directory, but
  // picking a company the caller isn't a member of set `selectedId` to an id
  // that `companies` never contains, leaving the select step stuck with
  // nothing selected and Continue disabled.
  const searchMatches = trimmedName
    ? companies.filter((company) =>
        company.name.toLowerCase().includes(trimmedName.toLowerCase())
      )
    : []

  useEffect(() => {
    if (!menuOpen) return
    const onPointerDown = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) setMenuOpen(false)
    }
    document.addEventListener("mousedown", onPointerDown)
    return () => document.removeEventListener("mousedown", onPointerDown)
  }, [menuOpen])

  const goToCreate = () => {
    setMenuOpen(false)
    setDraftName("")
    setDraftLogo(undefined)
    setSaveError(undefined)
    setLogoError(undefined)
    setStep("create")
  }

  const commitNewCompany = async (logoUrl?: string) => {
    // A blob: preview URL is local-only and fails the backend's @IsUrl()
    // check; only ever submit the persisted URL from the upload response.
    const persistedLogoUrl = logoUrl?.startsWith("blob:") ? undefined : logoUrl
    setSaveError(undefined)
    setSaving(true)
    try {
      const company = await createCompany({
        name: trimmedName,
        logoUrl: persistedLogoUrl,
      })
      const refreshed = await listCompanies()
      // The created/reused company is always one of the caller's, so it is in
      // `refreshed`; the concat is a belt-and-braces guard so the select step
      // can never land on an id that isn't in the list it renders from.
      setCompanies(
        refreshed.some((entry) => entry.id === company.id)
          ? refreshed
          : [...refreshed, company]
      )
      setSelectedId(company.id)
      setDraftName("")
      setDraftLogo(undefined)
      setStep("select")
    } catch (error) {
      // Stay on the logo step so the name and logo the user picked survive.
      // A rejected name (an email address) reports why; anything else is a
      // transient failure worth retrying.
      setSaveError(
        error instanceof Error && error.message === COMPANY_NAME_IS_EMAIL_MESSAGE
          ? COMPANY_NAME_IS_EMAIL_MESSAGE
          : "Couldn't save your company. Please try again."
      )
    } finally {
      setSaving(false)
    }
  }

  if (step === "create") {
    return (
      <>
        <StepHeader
          title="Invite Team Member"
          subtitle="Select a company to assign your team member"
          onBack={companies.length ? () => setStep("select") : undefined}
        />

        <div className="mt-6">
          <CompanySearchField
            id="invite-company-name"
            autoFocus
            value={draftName}
            onChange={setDraftName}
            matches={searchMatches}
            selectedId={selectedId}
            onSelect={(company) => {
              setSelectedId(company.id)
              setDraftName("")
              setStep("select")
            }}
            onCreate={() => setStep("logo")}
          />
        </div>

        {nameIsEmail && (
          <ErrorMessage size="sm" className="mt-3">
            {COMPANY_NAME_IS_EMAIL_MESSAGE}
          </ErrorMessage>
        )}

        <StepFooter onCancel={onCancel}>
          <Button
            size="sm"
            disabled={!trimmedName || nameIsEmail}
            onClick={() => setStep("logo")}
          >
            Continue
          </Button>
        </StepFooter>
      </>
    )
  }

  if (step === "logo") {
    return (
      <>
        <StepHeader
          title="Add your company logo"
          subtitle="Start typing your company name to search or create"
          onBack={() => setStep("create")}
        />

        <div className="mt-6">
          <CompanyLogoField
            name={trimmedName}
            logoUrl={draftLogo}
            onChange={setDraftLogo}
            onFileSelected={(file) => {
              // Swap the immediate blob preview for the persisted URL from
              // POST /v1/companies/logo.
              setLogoUploading(true)
              setLogoError(undefined)
              uploadCompanyLogo(file)
                .then((uploadedUrl) => setDraftLogo(uploadedUrl))
                .catch((error) => {
                  // Drop the preview along with the error. Keeping a blob:
                  // URL that commitNewCompany then strips is what made a
                  // failed upload look like a saved logo.
                  setDraftLogo(undefined)
                  setLogoError(
                    error?.response?.data?.message ||
                      "Couldn't upload that logo. Please try again."
                  )
                })
                .finally(() => setLogoUploading(false))
            }}
          />
        </div>

        {(logoError || saveError) && (
          <ErrorMessage size="sm" className="mt-3">
            {logoError ?? saveError}
          </ErrorMessage>
        )}

        <StepFooter onCancel={onCancel}>
          {!draftLogo && (
            <Button
              variant="ghost"
              visual="gray"
              size="sm"
              disabled={saving}
              onClick={() => commitNewCompany()}
            >
              Skip
            </Button>
          )}
          <Button
            size="sm"
            disabled={logoUploading || saving}
            onClick={() => commitNewCompany(draftLogo)}
          >
            {logoUploading ? "Uploading..." : saving ? "Saving..." : "Continue"}
          </Button>
        </StepFooter>
      </>
    )
  }

  return (
    <>
      <StepHeader
        title="Invite Team Member"
        subtitle="Select a company to assign your team member"
      />

      {companies.length === 0 ? (
        <div className="mt-6 rounded-lg border border-gray-200 bg-gray-50 px-4 py-6">
          <div className="flex flex-col items-center gap-y-3">
            <Building01 className="size-6 text-gray-400" />
            <p className="text-sm font-medium text-gray-700">
              You don&apos;t have a registered company yet
            </p>
            <button
              type="button"
              onClick={goToCreate}
              className="inline-flex items-center gap-x-2 text-sm font-semibold text-primary-500 hover:text-primary-600 focus-visible:outline-none"
            >
              <Plus className="size-4" />
              Add Your Company
            </button>
          </div>
        </div>
      ) : (
        <div ref={menuRef} className="relative mt-6">
          <button
            type="button"
            onClick={() => setMenuOpen((prev) => !prev)}
            aria-expanded={menuOpen}
            className={cn(
              inputVariants(),
              "flex h-auto items-center justify-between gap-x-3 py-2.5 text-left"
            )}
          >
            {selected ? (
              <CompanyRow company={selected} />
            ) : (
              <span className="text-sm text-gray-500">Select a company</span>
            )}
            <ChevronDown
              className={cn(
                "size-5 flex-none text-gray-500 transition-transform",
                menuOpen && "rotate-180"
              )}
            />
          </button>

          {menuOpen && (
            <div className="absolute z-50 mt-2 w-full overflow-hidden rounded-lg border border-gray-100 bg-white shadow-lg">
              <div className="max-h-[220px] overflow-y-auto">
                {companies.map((company) => (
                  <button
                    key={company.id}
                    type="button"
                    onClick={() => {
                      setSelectedId(company.id)
                      setMenuOpen(false)
                    }}
                    className="flex w-full items-center justify-between px-3.5 py-2.5 hover:bg-gray-50 focus-visible:outline-none"
                  >
                    <CompanyRow company={company} />
                    {selectedId === company.id && (
                      <Check className="size-4 flex-none text-primary-500" />
                    )}
                  </button>
                ))}
              </div>
              <AddCompanyButton label="Add New Company" onClick={goToCreate} />
            </div>
          )}
        </div>
      )}

      <StepFooter onCancel={onCancel}>
        {companies.length === 0 ? (
          <Button size="sm" onClick={() => onContinue(null)}>
            Continue Anyway
          </Button>
        ) : (
          <Button
            size="sm"
            disabled={!selected}
            onClick={() => onContinue(selected ?? null)}
          >
            Continue
          </Button>
        )}
      </StepFooter>
    </>
  )
}
