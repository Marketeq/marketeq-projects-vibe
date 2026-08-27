"use client"

import React, { useEffect, useRef } from "react"
import { cn } from "@/utils/functions"
import {
  Check,
  MarkerPin01,
  Plus,
  SwitchHorizontal01,
  Trash01,
  Upload01,
} from "@blend-metrics/icons"
import {
  COMPANY_NAME_IS_EMAIL_MESSAGE,
  Company,
  isEmailLikeCompanyName,
} from "@/lib/company-directory"
import { Button, inputVariants } from "./ui"

/**
 * The company form controls shared by the two places companies are picked:
 * the invite dialog (`invite-company-steps.tsx`) and the invitee onboarding
 * flow (`app/invite/setup`). Presentational only, so state lives with callers.
 */

export const CompanyAvatar = ({
  company,
  className,
}: {
  company: Pick<Company, "name" | "logoUrl">
  className?: string
}) => (
  <div
    className={cn(
      "flex size-12 flex-none items-center justify-center overflow-hidden rounded-[8px] bg-[#F0F7FF]",
      className
    )}
  >
    {company.logoUrl ? (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={company.logoUrl}
        alt={company.name}
        className="size-full object-contain"
      />
    ) : (
      <MarkerPin01 className="size-6 text-[#0066FF]" />
    )}
  </div>
)

export const CompanyRow = ({ company }: { company: Company }) => (
  <div className="flex min-w-0 items-center gap-x-4">
    <CompanyAvatar company={company} />
    <div className="min-w-0 text-left">
      <p className="truncate text-[14px] font-medium leading-[100%] tracking-normal text-gray-900">
        {company.name}
      </p>
      <p className="mt-1 text-[12px] font-normal leading-[100%] tracking-normal text-gray-500">
        {company.memberCount} {company.memberCount === 1 ? "Member" : "Members"}
      </p>
    </div>
  </div>
)

/**
 * The selected company shown as a filled field with a Remove affordance,
 * the state the register step lands in once a company has been chosen.
 */
export const SelectedCompanyField = ({
  company,
  onRemove,
}: {
  company: Company
  onRemove: () => void
}) => (
  <div className="flex items-center justify-between gap-x-4 rounded-xl border border-gray-200 bg-white p-3.5 shadow-xs">
    <CompanyRow company={company} />
    <button
      type="button"
      onClick={onRemove}
      className="inline-flex flex-none items-center gap-x-2 rounded-lg border border-gray-200 bg-white px-3.5 py-2 text-sm font-semibold text-gray-800 shadow-xs hover:bg-gray-50 hover:text-gray-900 focus-visible:outline-none transition-colors"
    >
      <Trash01 className="size-4 text-gray-500" />
      Remove
    </button>
  </div>
)

/**
 * Type-to-search field over the company directory. Matching companies are
 * offered first; the trailing row registers a brand new company under the
 * typed name.
 */
export const CompanySearchField = ({
  id = "company-name",
  label = "Company Name",
  placeholder = "Enter company name",
  value,
  onChange,
  matches,
  selectedId,
  onSelect,
  onCreate,
  autoFocus,
}: {
  id?: string
  label?: string
  placeholder?: string
  value: string
  onChange: (value: string) => void
  matches: Company[]
  selectedId?: string
  onSelect: (company: Company) => void
  onCreate: () => void
  autoFocus?: boolean
}) => {
  const trimmed = value.trim()
  // An address typed here is someone being invited, not a company. Offering
  // "Register a company with this name" for it is what put email-named
  // companies in the picker, so the create row is replaced by the reason.
  const isEmail = isEmailLikeCompanyName(trimmed)

  return (
    <div className="relative space-y-1.5">
      {label && (
        <label htmlFor={id} className="block text-sm font-medium text-gray-700">
          {label}
        </label>
      )}
      <div className="relative">
        <input
          id={id}
          autoFocus={autoFocus}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          className="flex h-12 w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-base text-gray-900 shadow-xs placeholder:text-gray-400 focus:border-primary-500 focus:ring-2 focus:ring-primary-50 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
        />
      </div>

      {trimmed && (
        <div className="absolute z-50 mt-2.5 w-full overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-xl shadow-gray-200/50 divide-y divide-gray-100">
          {isEmail ? (
            <div className="flex w-full items-center gap-x-4 px-4 py-3.5 text-left">
              <div className="flex size-12 flex-none items-center justify-center rounded-[8px] border border-dashed border-gray-300 bg-white">
                <Plus className="size-5 text-gray-300" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[14px] font-medium leading-[100%] tracking-normal text-gray-400">
                  {trimmed}
                </p>
                <p className="mt-1 text-[12px] font-normal leading-[100%] tracking-normal text-gray-500">
                  {COMPANY_NAME_IS_EMAIL_MESSAGE}
                </p>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={onCreate}
              className="flex w-full items-center gap-x-4 px-4 py-3.5 hover:bg-gray-50/80 transition-colors text-left focus-visible:outline-none"
            >
              <div className="flex size-12 flex-none items-center justify-center rounded-[8px] border border-dashed border-gray-300 bg-white">
                <Plus className="size-5 text-gray-400" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[14px] font-medium leading-[100%] tracking-normal text-gray-900">
                  {trimmed}
                </p>
                <p className="mt-1 text-[12px] font-normal leading-[100%] tracking-normal text-gray-500">
                  Register a company with this name
                </p>
              </div>
            </button>
          )}

          {matches.map((company) => (
            <button
              key={company.id}
              type="button"
              onClick={() => onSelect(company)}
              className="flex w-full items-center justify-between gap-x-4 px-4 py-3.5 hover:bg-gray-50/80 transition-colors text-left focus-visible:outline-none"
            >
              <CompanyRow company={company} />
              {selectedId === company.id && (
                <Check className="size-5 flex-none text-primary-500" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

/**
 * Logo picker with a local object-URL preview. The caller owns `logoUrl` so it
 * can decide when to persist; `onChange(undefined)` clears it.
 *
 * `onFileSelected`, when given, is called with the raw File alongside the
 * immediate blob preview. Callers use it to upload the file and swap the
 * blob URL for a persisted one (see invite-company-steps.tsx and
 * app/invite/setup/page.tsx, which both upload via ClientAPI.UploadAvatar).
 * Without it, `logoUrl` stays a `blob:` URL that is never persisted and
 * breaks on reload.
 */
export const CompanyLogoField = ({
  name,
  logoUrl,
  onChange,
  onFileSelected,
}: {
  name: string
  logoUrl?: string
  onChange: (logoUrl: string | undefined) => void
  onFileSelected?: (file: File) => void
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null)
  // Object URLs created here have to be released by hand once replaced.
  const previousUrlRef = useRef<string | undefined>(logoUrl)

  useEffect(() => {
    const previous = previousUrlRef.current
    if (previous && previous !== logoUrl && previous.startsWith("blob:")) {
      URL.revokeObjectURL(previous)
    }
    previousUrlRef.current = logoUrl
  }, [logoUrl])

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    onChange(URL.createObjectURL(file))
    onFileSelected?.(file)
    // Allow re-picking the same file.
    event.target.value = ""
  }

  return (
    <div className="flex items-center gap-x-[24px]">
      <div className="flex size-[106px] flex-none items-center justify-center rounded-[5px] border border-[#EAECF0] bg-white p-1">
        <div className="flex size-[96px] items-center justify-center overflow-hidden rounded-[5px] border-[4px] border-white bg-[#F2F4F7]">
          {logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={logoUrl}
              alt={name || "Company logo"}
              className="size-full object-contain"
            />
          ) : (
            <span className="font-sans text-[49.5px] font-extrabold italic text-[#D0D5DD] uppercase leading-none">
              {name.trim().charAt(0).toUpperCase() || "A"}
            </span>
          )}
        </div>
      </div>

      <div className="flex flex-col items-start gap-y-3">
        {logoUrl ? (
          <div className="flex flex-col items-start gap-y-[12px]">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex h-10 shrink-0 items-center justify-center gap-x-2 whitespace-nowrap rounded-full bg-[#E8EEFF] px-[16px] py-[10px] text-[14px] font-semibold leading-[20px] text-[#306CFE] hover:bg-[#dbe6ff] transition-colors focus-visible:outline-none"
            >
              <SwitchHorizontal01 className="size-[15px] shrink-0 text-[#306CFE]" />
              <span className="whitespace-nowrap">Change Logo</span>
            </button>
            <button
              type="button"
              onClick={() => onChange(undefined)}
              className="inline-flex h-10 min-w-[145px] shrink-0 items-center justify-center gap-x-2 whitespace-nowrap rounded-full border border-[#D0D5DD] bg-white px-[16px] py-[10px] text-[14px] font-semibold leading-[20px] text-[#1D2939] shadow-[0px_1px_4px_rgba(0,0,0,0.03)] hover:bg-gray-50 transition-colors focus-visible:outline-none"
            >
              <span className="whitespace-nowrap">Remove Logo</span>
            </button>
          </div>
        ) : (
          <>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex h-10 shrink-0 items-center justify-center gap-x-2 whitespace-nowrap rounded-full bg-[#E8EEFF] px-[16px] py-[10px] text-[14px] font-semibold leading-[20px] text-[#306CFE] hover:bg-[#dbe6ff] transition-colors focus-visible:outline-none"
            >
              <Upload01 className="size-[15px] shrink-0 text-[#306CFE]" />
              <span className="whitespace-nowrap">Upload Logo</span>
            </button>
            <p className="text-[12px] font-normal leading-[18px] text-[#475467]">
              SVG Preferred, PNG, or JPG (300&times;300px)
            </p>
          </>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/svg+xml,image/png,image/jpeg"
        className="hidden"
        onChange={handleChange}
      />
    </div>
  )
}
