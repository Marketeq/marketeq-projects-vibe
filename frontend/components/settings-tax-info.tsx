"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import {
  AlertCircle,
  ArrowRight,
  CheckCircle,
  ChevronDown,
  Download01,
  Edit03,
  File02,
  Hourglass03,
  HelpCircle,
  MessageQuestionSquare,
  Play,
  X,
} from "@blend-metrics/icons"
import {
  getTaxInfo,
  saveTaxInfo,
  submitTaxInfo,
  type TaxInfo,
} from "@/src/lib/api/tax-info"
import NextLink from "@/components/next-link"
import NextImage from "@/components/next-image"
import { useAuth } from "@/contexts/auth"
import { getPublicApiUrl } from "@/lib/runtime-urls"
import { CountriesCombobox } from "@/components/own-combobox"
import { cn } from "@/utils/functions"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
  Badge,
  Button,
  Checkbox,
  Input,
  Label,
  RadioGroup,
  RadioGroupItem,
  ScrollArea,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  Dialog,
  DialogClose,
  DialogContent,
  DialogTitle,
  DialogTrigger,
  SelectValue,
  Tabs,
  TabsList,
  TabsTrigger,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
  useToast,
} from "@/components/ui"

const TABS = [
  { id: "tax-forms", label: "Tax Forms" },
  { id: "tax-information", label: "Tax Information" },
  { id: "faqs", label: "FAQ's" },
] as const

// Support, not tax preparation. Each card is something we can genuinely do:
// explain our own forms, and hand over the records someone else files with.
const HELP_CARDS = [
  {
    icon: MessageQuestionSquare,
    title: "Questions about your forms",
    subtitle:
      "Confused by a 1099 or a field on your W-9? Our support team can explain it.",
    linkLabel: "Read the FAQs",
    tab: "faqs",
  },
  {
    icon: Download01,
    title: "Get your records",
    subtitle:
      "Export every payment as CSV or PDF for whoever files your return.",
    linkLabel: "Go to Earnings",
    href: "/earnings",
  },
]

const VIDEOS: {
  title: string
  description: string
  thumbnailUrl?: string
  videoUrl?: string
}[] = [
  {
    title: "How to Submit Your Tax Information",
    description:
      "A step-by-step walkthrough for users to complete their tax forms.",
  },
  {
    title: "Filling Tax as Non US Citizen",
    description:
      "A step-by-step walkthrough for users to complete their tax forms.",
  },
  {
    title: "Self Employed Taxes- Contractors need to know",
    description: "Contractors need to know this!",
  },
]

const FAQ_SECTIONS = [
  {
    title: "General Tax Information",
    items: [
      {
        q: "Do contractors need to pay taxes?",
        a: "Yes. Contract income is self-employment income and is taxable. Marketeq does not normally withhold taxes on your behalf, so you are responsible for reporting your earnings and paying what you owe. The exception is backup withholding, which applies if your taxpayer information is missing or does not match IRS records.",
      },
      {
        q: "Why do I need to submit a W-9?",
        a: "When Marketeq pays you directly rather than a client paying you, we are required to collect a W-9 from US-based contractors before making payments. It provides your taxpayer information, name, SSN or EIN, and address, for reporting purposes.",
      },
      {
        q: "What is a 1099 form, and do I receive one?",
        a: "There are two. A 1099-NEC is issued by Marketeq to US contractors we paid directly, once those payments reach $600 in a calendar year, and it reports them to the IRS. A 1099-K is issued by a third-party payment processor such as Stripe or PayPal when one handled the transactions and their reporting threshold is met. Reporting thresholds for the 1099-K have changed several times, so check the current rules. Neither form is issued to non-US persons, who are covered by a W-8 series form instead.",
      },
      {
        q: "What if I didn't receive a 1099 form from a client?",
        a: "For work paid through Marketeq, the form comes from us or from the payment processor, not from the client. A client who paid you directly, outside the platform, may have their own reporting obligation to you. Either way, income below a reporting threshold still has to be reported by you: not receiving a form does not make it untaxable.",
      },
    ],
  },
  {
    title: "Income Reporting & Tracking",
    items: [
      {
        q: "How do I report my income as a contractor?",
        a: "Report your gross earnings, then deduct allowable business expenses. Your Marketeq earnings history and any 1099 forms under Tax Forms give you the figures to work from.",
      },
      {
        q: "How do I track my earnings on the platform for tax purposes?",
        a: "Earnings shows every payment you have received and lets you export the full history as CSV or PDF, which is what most people hand to their accountant.",
      },
      {
        q: "What should I do if I made a mistake in my earnings report?",
        a: "Contact support with the contract and payment in question. If a correction affects a form already issued, a corrected version is produced rather than the original being edited.",
      },
    ],
  },
  {
    title: "Deductions & Business Expenses",
    items: [
      {
        q: "What business expenses can I deduct as a contractor?",
        a: "Generally, expenses that are both ordinary and necessary for your work: software, equipment, professional services and business travel. A home office is deductible only if the space is used regularly and exclusively for work. Keep records and receipts, and confirm specifics with a tax professional, since eligibility depends on your circumstances.",
      },
    ],
  },
  {
    title: "Tax Payments & Filing",
    items: [
      {
        q: "Do I need to pay estimated taxes as a contractor?",
        a: "Usually yes. The IRS generally expects estimated payments if you will owe at least $1,000 for the year after credits and withholding, and they are made quarterly. Because nothing is withheld from your Marketeq payments, that threshold is easy to reach.",
      },
      {
        q: "How can I calculate my self-employment tax?",
        a: "It is calculated on your net earnings after expenses, and generally applies once those net earnings reach $400 for the year. It covers Social Security and Medicare, and only part of your net earnings is subject to it. Your exported earnings history gives you the income side; filing software or a tax professional will apply the current rates and caps.",
      },
      {
        q: "Can I file my taxes through the platform?",
        a: "Not directly. Marketeq issues your forms and earnings records, and you can file with TurboTax using the link at the top of this page.",
      },
    ],
  },
]

// Same list client-profile uses. Only applies when filing from the USA; other
// countries keep a free-text field because provinces vary too much to enumerate.
const US_STATES: string[] = [
  "Alabama", "Alaska", "Arizona", "Arkansas", "California", "Colorado",
  "Connecticut", "Delaware", "District of Columbia", "Florida", "Georgia",
  "Hawaii", "Idaho", "Illinois", "Indiana", "Iowa", "Kansas", "Kentucky",
  "Louisiana", "Maine", "Maryland", "Massachusetts", "Michigan", "Minnesota",
  "Mississippi", "Missouri", "Montana", "Nebraska", "Nevada", "New Hampshire",
  "New Jersey", "New Mexico", "New York", "North Carolina", "North Dakota",
  "Ohio", "Oklahoma", "Oregon", "Pennsylvania", "Rhode Island",
  "South Carolina", "South Dakota", "Tennessee", "Texas", "Utah", "Vermont",
  "Virginia", "Washington", "West Virginia", "Wisconsin", "Wyoming",
]

/**
 * The countdown never disappears, it changes tone as the deadline approaches:
 * informational most of the year, a warning inside three months, urgent inside
 * one, and a plain statement on the day itself.
 */
const deadlineStage = (days: number) => {
  if (days === 0)
    return {
      label: "Today is the tax filing deadline",
      wrap: "bg-error-50",
      text: "text-error-600",
    }
  if (days <= 30)
    return {
      label: `Only ${days} ${days === 1 ? "day" : "days"} left to file your taxes`,
      wrap: "bg-error-50",
      text: "text-error-600",
    }
  if (days <= 90)
    return {
      label: `${days} days left to file your taxes`,
      wrap: "bg-warning-50",
      text: "text-warning-700",
    }
  return {
    label: `${days} days left to file your taxes`,
    wrap: "bg-primary-50",
    text: "text-primary-500",
  }
}

/** MM-DD-YYYY, matching the signed date in the design (03-20-2025). */
const todayFormatted = () => {
  const now = new Date()
  const mm = String(now.getMonth() + 1).padStart(2, "0")
  const dd = String(now.getDate()).padStart(2, "0")
  return `${mm}-${dd}-${now.getFullYear()}`
}

/** Days until the 15 April filing deadline, so the banner is never stale. */
const daysUntilFilingDeadline = () => {
  const now = new Date()
  const year =
    now.getMonth() > 3 || (now.getMonth() === 3 && now.getDate() > 15)
      ? now.getFullYear() + 1
      : now.getFullYear()
  const deadline = new Date(year, 3, 15)
  return Math.max(
    0,
    Math.ceil((deadline.getTime() - now.getTime()) / 86400000)
  )
}

// An individual files under an SSN; an entity files under an EIN. Selecting a
// classification therefore decides which identifier applies.
const CLASSIFICATIONS: { label: string; tinType: "SSN" | "EIN" }[] = [
  { label: "Individual", tinType: "SSN" },
  { label: "Sole Proprietor", tinType: "SSN" },
  { label: "Single-member LLC", tinType: "SSN" },
  { label: "C Corporation", tinType: "EIN" },
  { label: "S Corporation", tinType: "EIN" },
  { label: "Partnership", tinType: "EIN" },
  { label: "Trust or Estate", tinType: "EIN" },
]

/** Digits only, formatted to the IRS layout for the selected identifier. */
const formatTin = (raw: string, tinType: string) => {
  const digits = raw.replace(/\D/g, "").slice(0, 9)
  if (tinType === "EIN") {
    return digits.length > 2 ? `${digits.slice(0, 2)}-${digits.slice(2)}` : digits
  }
  if (digits.length > 5)
    return `${digits.slice(0, 3)}-${digits.slice(3, 5)}-${digits.slice(5)}`
  if (digits.length > 3) return `${digits.slice(0, 3)}-${digits.slice(3)}`
  return digits
}

const isTinComplete = (value: string) => value.replace(/\D/g, "").length === 9

/**
 * Force capitalisation on a legal name. Only the first letter of each part is
 * touched, including after a hyphen or apostrophe, and the rest is left as
 * typed so "McDonald" and "O'Brien" survive.
 */
/** Loose comparison: case and spacing should not decide a name match. */
const namesMatch = (a: string, b: string) =>
  a.trim().replace(/\s+/g, " ").toLowerCase() ===
  b.trim().replace(/\s+/g, " ").toLowerCase()

const capitalizeName = (value: string) =>
  value.replace(/(^|[\s\-'])(\p{L})/gu, (_, sep, letter) => sep + letter.toUpperCase())

const W8BEN_CERTIFICATION = [
  "I am the individual that is the beneficial owner of all the income to which this form relates, or am using this form to document myself for chapter 4 purposes; and",
  "I am not a U.S. person; and",
  "The income to which this form relates is not effectively connected with the conduct of a trade or business in the United States; and",
  "The details given on this form are correct, and I will submit a new form within 30 days if any certification becomes incorrect.",
]

const W9_CERTIFICATION = [
  "The number shown on this form is my correct taxpayer identification number (or I am waiting for a number to be issued to me); and",
  "I am not subject to backup withholding because:",
  "I am a U.S. citizen or other U.S. person (defined below); and",
  "The FATCA code(s) entered on this form (if any) indicating that I am exempt from FATCA reporting is correct.",
]

const W9_BACKUP_WITHHOLDING = [
  "(a) I am exempt from backup withholding, or",
  "(b) I have not been notified by the Internal Revenue Service (IRS) that I am subject to backup withholding as a result of a failure to report all interest or dividends, or",
  "(c) the IRS has notified me that I am no longer subject to backup withholding; and",
]

const ELECTRONIC_CONSENT = [
  "By checking the box below, you acknowledge that you have read, understand, and affirmatively agree to this Consent.",
  "You consent to receive electronic tax statements and documents (including Form 1099).",
  "This includes the ability to access, retain, and print these documents.",
  "You agree that the information may be communicated through email or by posting statements, notices, or disclosures on the account page of the relevant platform or institution.",
  "Your consent remains effective until withdrawn. If you do not consent to the electronic delivery of tax-related documents or wish to withdraw this consent, you may do so by contacting the appropriate tax support team.",
  "Depending on when electronic consent was provided, tax documents may have already been processed for physical delivery, in which case you will also receive a paper copy by mail.",
  "Should you choose to refuse or withdraw consent, you will receive paper copies of all required tax-related documents (including Form 1099) at your tax residence address.",
]

export function SettingsTaxInfo() {
  const { toast } = useToast()
  const { user } = useAuth()

  // Source of truth for both the name and the signature: whatever Personal Info
  // holds. A W-9 signed under a different name to the account is not a match.
  const accountName = [user?.firstName, user?.lastName]
    .filter(Boolean)
    .join(" ")
    .trim()
  const [tab, setTab] = useState<string>("tax-forms")
  const [openFaq, setOpenFaq] = useState<string>("")
  // First-time certification only: the card promises the text is read before
  // consenting, so the consents wait until it has been scrolled through.
  const [certRead, setCertRead] = useState(false)
  // Errors appear once Submit has been pressed, not while someone is typing.
  const [showErrors, setShowErrors] = useState(false)
  const certRef = useRef<HTMLDivElement | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [editing, setEditing] = useState(false)
  const [data, setData] = useState<TaxInfo | null>(null)
  const [form, setForm] = useState({
    legalFullName: "",
    federalTaxClassification: "Individual",
    tinType: "SSN",
    tin: "",
    country: "United States",
    addressLine1: "",
    addressLine2: "",
    city: "",
    stateOrProvince: "",
    postalCode: "",
    signature: "",
    signedDate: todayFormatted(),
    consentESignature: false,
    consentDigitalDelivery: false,
  })

  useEffect(() => {
    const viewport = certRef.current?.closest<HTMLElement>(
      "[data-radix-scroll-area-viewport]"
    )
    if (!viewport) return

    // Nothing to scroll on a tall screen means nothing to read past.
    const settle = () => {
      if (viewport.scrollHeight <= viewport.clientHeight + 8) setCertRead(true)
    }
    const onScroll = () => {
      if (
        viewport.scrollTop + viewport.clientHeight >=
        viewport.scrollHeight - 24
      ) {
        setCertRead(true)
      }
    }
    settle()
    viewport.addEventListener("scroll", onScroll, { passive: true })
    return () => viewport.removeEventListener("scroll", onScroll)
  }, [tab, form.country])

  const hydrate = useCallback(
    (next: TaxInfo) => {
    setData(next)
    setForm((prev) => ({
      ...prev,
      legalFullName: next.legalFullName || accountName,
      federalTaxClassification: next.federalTaxClassification ?? "Individual",
      tinType: next.tinType ?? "SSN",
      tin: "",
      country: next.country ?? "United States",
      addressLine1: next.addressLine1 ?? "",
      addressLine2: next.addressLine2 ?? "",
      city: next.city ?? "",
      stateOrProvince: next.stateOrProvince ?? "",
      postalCode: next.postalCode ?? "",
      signature: next.signature ?? "",
      signedDate: next.signedDate || todayFormatted(),
      consentESignature: !!next.consentESignature,
      consentDigitalDelivery: !!next.consentDigitalDelivery,
    }))
    },
    [accountName]
  )

  useEffect(() => {
    let active = true
    getTaxInfo().then((next) => {
      if (!active) return
      if (next) {
        hydrate(next)
        setEditing(!next.identificationComplete)
      } else {
        setEditing(true)
      }
      setLoading(false)
    })
    return () => {
      active = false
    }
  }, [hydrate])

  const set = (key: keyof typeof form, value: string | boolean) =>
    setForm((prev) => ({ ...prev, [key]: value }))

  const persist = async (patch: Partial<typeof form>) => {
    setSaving(true)
    try {
      // An untouched TIN field means "leave the stored one alone".
      const { tin, ...rest } = { ...form, ...patch }
      const next = await saveTaxInfo(tin ? { ...rest, tin } : rest)
      hydrate(next)
      toast({ title: "Tax information saved" })
      return next
    } catch (e) {
      toast({
        title: "Could not save",
        description: e instanceof Error ? e.message : undefined,
      })
      return null
    } finally {
      setSaving(false)
    }
  }

  const submit = async () => {
    const ready =
      identificationComplete &&
      localCertProgress === 100 &&
      signatureMatches &&
      (certRead || !!data?.submitted)

    if (!ready) {
      setShowErrors(true)
      return
    }

    setSaving(true)
    try {
      // Signing and submitting is one action. There is no meaningful state
      // where a signature is saved but not certified, so this writes the
      // certification and then certifies it.
      const { tin, ...rest } = form
      await saveTaxInfo(tin ? { ...rest, tin } : rest)
      hydrate(await submitTaxInfo())
      toast({
        title: `Your ${formKind} was submitted`,
        description: "Your tax documents are ready under Tax Forms.",
      })
      setTab("tax-forms")
    } catch (e) {
      toast({
        title: "Could not submit",
        description: e instanceof Error ? e.message : undefined,
      })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <p className="text-sm font-light text-gray-500">Loading…</p>
      </div>
    )
  }

  const identificationComplete = !!data?.identificationComplete
  const forms = data?.forms ?? []
  const certificationProgress = data?.certificationProgress ?? 0
  // Editable only while editing. Previously this also depended on completeness,
  // which left incomplete records with enabled fields but no Save button.
  const readOnly = !editing

  // Progress is measured from what is on screen, not from the last server
  // response. Nothing autosaves, so a typed signature would otherwise leave the
  // badge at 0% and Submit disabled with no explanation.
  const certParts = [
    !!form.signature,
    !!form.signedDate,
    form.consentESignature,
    form.consentDigitalDelivery,
  ]
  const localCertProgress = Math.round(
    (certParts.filter(Boolean).length / certParts.length) * 100
  )


  const signatureMatches =
    !!form.signature && !!accountName && namesMatch(form.signature, accountName)
  const signatureInvalid = !!form.signature && !signatureMatches

  const formKind = data?.formKind ?? (form.country === "United States" ? "W-9" : "W-8BEN")
  const isW9 = formKind === "W-9"

  // Documents are served by user-service, not by Next. A NextLink would
  // resolve these against the app origin and 404.
  const apiBase = (getPublicApiUrl() || "http://localhost:4000").replace(/\/$/, "")

  const days = daysUntilFilingDeadline()
  const deadline = deadlineStage(days)

  return (
    <div className="flex flex-col gap-6">
      {/* Page header */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <h1 className="text-3xl font-bold text-dark-blue-400">Taxes</h1>

        <div
          className={cn(
            "flex items-center gap-x-3 rounded-lg py-2 pl-4 pr-2",
            deadline.wrap
          )}
        >
          <span
            className={cn(
              "flex items-center gap-x-2 text-sm font-semibold",
              deadline.text
            )}
          >
            <Hourglass03 className="size-4 shrink-0" />
            {deadline.label}
          </span>
          <Button
            variant="outlined"
            visual="gray"
            size="sm"
            className="shrink-0 rounded-[5px] border-gray-300 bg-white shadow-xs"
            rightIcon={<ArrowRight className="size-4" />}
          >
            File Now with TurboTax
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="w-full justify-start gap-x-8 border-b border-gray-200 bg-transparent px-0 pt-0">
          {TABS.map((item) => (
            <TabsTrigger key={item.id} value={item.id} className="gap-x-2 pb-3">
              {item.label}
              {item.id === "tax-information" &&
                (identificationComplete ? (
                  <CheckCircle className="size-4 text-success-500" />
                ) : (
                  <AlertCircle className="size-4 text-orange-500" />
                ))}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <p className="text-sm font-light leading-[1.5] text-dark-blue-400">
        Submitting your tax information is essential to verify your taxpayer
        status and determine if any tax withholding applies to your earnings.
        Add your details now to ensure smooth payments and avoid any delays.
      </p>

      {tab === "tax-forms" && (
        <div className="flex flex-col gap-10">
          {data?.submitted && (
            <p className="flex items-start gap-x-2 text-sm text-dark-blue-400">
              <CheckCircle className="size-5 shrink-0 text-success-500" />
              <span>
                <span className="font-bold">
                  Your {formKind} was submitted successfully.
                </span>{" "}
                In order to change any information visit{" "}
                <Button
                  variant="link"
                  visual="primary"
                  size="sm"
                  className="h-auto px-0 py-0 align-baseline text-sm font-medium underline decoration-primary-500/30 transition-colors duration-300 hover:decoration-primary-500 hover:text-primary-600"
                  onClick={() => setTab("tax-information")}
                >
                  Tax Information
                </Button>
                .
              </span>
            </p>
          )}

          {forms.length > 0 ? (
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
              {forms.map((form) => {
                const isK = form.formType === "1099-K"
                return (
                  <div
                    key={form.id}
                    className="relative flex flex-col rounded-lg border border-gray-200 bg-white p-4 shadow-xs"
                  >
                    {form.isLastYear && (
                      <Badge
                        visual="success"
                        className="absolute right-4 top-4 rounded-full px-2.5 py-0.5 text-xs font-medium"
                      >
                        Last Year
                      </Badge>
                    )}

                    <div className="flex h-[170px] items-center justify-center rounded-md bg-gray-50">
                      <File02 className="size-10 text-gray-300" />
                    </div>

                    <div className="mt-4 flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="flex items-center gap-x-1.5 text-base font-bold text-dark-blue-400">
                          {form.formType}
                          {isK && (
                            <TooltipProvider delayDuration={150}>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <span className="inline-flex cursor-pointer">
                                    <HelpCircle className="size-4 text-gray-400" />
                                  </span>
                                </TooltipTrigger>
                                <TooltipContent
                                  visual="white"
                                  className="max-w-[260px] p-3 text-left"
                                >
                                  <p className="text-xs font-light leading-[1.5] text-gray-500">
                                    A 1099-K is issued by the third-party
                                    payment processor that handled the
                                    transaction, such as Stripe or PayPal, not
                                    by Marketeq.
                                  </p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          )}
                        </p>
                        <p className="mt-0.5 text-sm font-light text-dark-blue-400">
                          {form.taxYear}
                        </p>
                      </div>

                      <a
                        href={`${apiBase}${form.downloadUrl}`}
                        download
                        className="flex shrink-0 items-center gap-x-1.5 text-sm font-medium text-primary-500 underline decoration-primary-500/30 transition-colors duration-300 hover:decoration-primary-500 hover:text-primary-600"
                      >
                        <Download01 className="size-4" />
                        Download
                      </a>
                    </div>

                    <div className="mt-3 flex flex-col gap-y-1.5 border-t border-gray-200 pt-3">
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-xs font-light text-gray-500">
                          {isK ? "Payment Provider" : "Payer"}
                        </span>
                        <span className="truncate text-xs font-medium text-dark-blue-400">
                          {form.issuerName || "Not reported yet"}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-xs font-light text-gray-500">
                          {isK ? "Total Processed" : "Amount Earned"}
                        </span>
                        <span className="text-xs font-medium text-dark-blue-400">
                          {form.amount || "Pending year-end totals"}
                        </span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-gray-300 bg-white px-6 py-20 text-center">
              <File02 className="size-12 text-gray-300" />
              <p className="mt-4 text-xl font-bold text-dark-blue-400">
                We do not have any tax form to display
              </p>
              <p className="mt-1.5 text-sm font-light text-dark-blue-400">
                Please complete the {formKind}{" "}
                <Button
                  variant="link"
                  visual="primary"
                  size="sm"
                  className="h-auto px-0 py-0 align-baseline text-sm font-medium underline decoration-primary-500/30 transition-colors duration-300 hover:decoration-primary-500 hover:text-primary-600"
                  onClick={() => setTab("tax-information")}
                >
                  Tax Information
                </Button>{" "}
                to display your tax forms.
              </p>
            </div>
          )}

          {/* Help */}
          <div>
            <h2 className="text-2xl font-bold text-dark-blue-400">
              Need help with your taxes?
            </h2>
            <p className="mt-1.5 max-w-[720px] text-sm font-light leading-[1.5] text-dark-blue-400">
              We can explain the forms we issue, show you what you earned, and
              answer questions about how it all works. We do not prepare or file
              returns and we cannot give tax advice, so for anything specific to
              your situation, speak to a tax professional.
            </p>

            <div className="mt-5 grid grid-cols-1 gap-5 md:grid-cols-2">
              {HELP_CARDS.map((card) => {
                const Icon = card.icon
                const linkClass =
                  "shrink-0 text-sm font-medium text-primary-500 underline decoration-primary-500/30 transition-colors duration-300 hover:decoration-primary-500 hover:text-primary-600"

                return (
                  <div
                    key={card.title}
                    className="flex items-center gap-x-8 rounded-lg border border-gray-200 bg-white p-8"
                  >
                    <Icon className="size-10 shrink-0 text-dark-blue-400" />
                    <div className="min-w-0 flex-auto">
                      <p className="text-base font-bold text-dark-blue-400">
                        {card.title}
                      </p>
                      <p className="mt-1 line-clamp-2 text-sm font-light leading-[1.5] text-dark-blue-400">
                        {card.subtitle}
                      </p>
                    </div>

                    {/* The card itself is not clickable; the action is an
                        explicit link on the right. */}
                    {card.href ? (
                      <NextLink href={card.href} className={cn(linkClass, "ml-4")}>
                        {card.linkLabel}
                      </NextLink>
                    ) : (
                      <Button
                        variant="link"
                        visual="primary"
                        size="sm"
                        className={cn(linkClass, "ml-4 h-auto px-0 py-0")}
                        onClick={() => card.tab && setTab(card.tab)}
                      >
                        {card.linkLabel}
                      </Button>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {/* Tax expert */}
          <div className="flex flex-col items-center gap-8 rounded-lg border border-gray-200 bg-white p-10 lg:flex-row lg:justify-between">
            <div className="min-w-0">
              <h2 className="text-2xl font-bold text-dark-blue-400">
                Chat with our Tax Expert
              </h2>
              <p className="mt-3 max-w-[420px] text-sm font-light leading-[1.5] text-dark-blue-400">
                Our experts, with 25+ years of experience, are here to help, no
                question is too small or complex!
              </p>
              <Button visual="primary" className="mt-6">
                Chat Now
              </Button>
            </div>

            {/* Same line-art style as the onboarding role picker: 2.5 stroke in
                primary-500, lighter blues as accents, on a primary-50 tile. */}
            <div className="flex size-[200px] shrink-0 items-center justify-center rounded-lg bg-primary-50">
              <svg
                width="132"
                height="132"
                viewBox="0 0 132 132"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                aria-hidden
              >
                {/* Tax form */}
                <rect
                  x="18"
                  y="16"
                  width="62"
                  height="82"
                  rx="6"
                  stroke="#306CFE"
                  strokeWidth="2.5"
                  fill="white"
                />
                <line x1="30" y1="34" x2="56" y2="34" stroke="#98B6FF" strokeWidth="2.5" strokeLinecap="round" />
                <line x1="30" y1="46" x2="68" y2="46" stroke="#C9D9FF" strokeWidth="2.5" strokeLinecap="round" />
                <line x1="30" y1="58" x2="62" y2="58" stroke="#C9D9FF" strokeWidth="2.5" strokeLinecap="round" />
                <line x1="30" y1="70" x2="48" y2="70" stroke="#C9D9FF" strokeWidth="2.5" strokeLinecap="round" />

                {/* Expert reply */}
                <path
                  d="M62 74h44a6 6 0 016 6v24a6 6 0 01-6 6H78l-10 10v-10h-6a6 6 0 01-6-6V80a6 6 0 016-6z"
                  fill="white"
                  stroke="#306CFE"
                  strokeWidth="2.5"
                  strokeLinejoin="round"
                />
                <circle cx="78" cy="92" r="3" fill="#5687FF" />
                <circle cx="90" cy="92" r="3" fill="#98B6FF" />
                <circle cx="102" cy="92" r="3" fill="#C9D9FF" />

                {/* Verified badge */}
                <circle cx="98" cy="30" r="14" fill="#306CFE" />
                <path
                  d="M91 30l5 5 9-9"
                  stroke="white"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
          </div>

          {/* Videos. Composed from the design system Dialog, the same shape the
              Video Player Modal story uses; that story is not an exported
              component so it cannot be imported. */}
          <div>
            <h2 className="text-2xl font-bold text-dark-blue-400">Videos</h2>
            <div className="mt-5 grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
              {VIDEOS.map((video) => (
                <Dialog key={video.title}>
                  <DialogTrigger asChild>
                    <Button
                      variant="ghost"
                      visual="gray"
                      // Button's base sets whitespace-nowrap and shrink-0, which
                      // kept the title and description on one line instead of
                      // wrapping to the video's width.
                      className="group/video h-auto w-full min-w-0 shrink flex-col items-stretch gap-0 whitespace-normal p-0 text-left hover:bg-transparent"
                    >
                      <div className="relative flex h-[190px] w-full items-center justify-center overflow-hidden rounded-md bg-gray-100 ring-1 ring-transparent transition duration-300 group-hover/video:ring-gray-300">
                        {video.thumbnailUrl && (
                          <NextImage
                            className="object-cover transition duration-300 group-hover/video:scale-105"
                            src={video.thumbnailUrl}
                            alt={video.title}
                            fill
                            sizes="33vw"
                          />
                        )}
                        <span className="absolute inset-0 bg-dark-blue-400/0 transition-colors duration-300 group-hover/video:bg-dark-blue-400/10" />
                        <span className="relative inline-flex size-12 items-center justify-center rounded-full bg-white/90 shadow-xs transition duration-300 group-hover/video:scale-110 group-hover/video:bg-white group-hover/video:shadow-md">
                          <Play className="size-5 text-dark-blue-400 transition-colors duration-300 group-hover/video:text-primary-500" />
                        </span>
                      </div>
                      <p className="mt-3 w-full break-words text-base font-bold leading-snug text-dark-blue-400 transition-colors duration-300 group-hover/video:text-primary-500">
                        {video.title}
                      </p>
                      <p className="mt-1 w-full break-words text-sm font-light leading-[1.5] text-dark-blue-400">
                        {video.description}
                      </p>
                    </Button>
                  </DialogTrigger>

                  <DialogContent className="max-w-[885.66px] rounded-none border-0 bg-transparent p-0 shadow-none">
                    <DialogTitle className="sr-only">{video.title}</DialogTitle>
                    <div className="group relative">
                      <DialogClose className="absolute -right-[22px] -top-[22px] z-10 inline-flex size-11 shrink-0 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-500 opacity-0 transition duration-300 hover:border-black hover:bg-black hover:text-white group-hover:opacity-100">
                        <X className="size-6" />
                      </DialogClose>

                      <div className="relative flex h-[498.2px] items-center justify-center overflow-hidden rounded-[9.23px] bg-gray-900">
                        {video.videoUrl ? (
                          <video
                            className="size-full object-cover"
                            src={video.videoUrl}
                            controls
                            autoPlay
                          />
                        ) : (
                          <p className="px-8 text-center text-sm font-light text-white">
                            This video has not been uploaded yet.
                          </p>
                        )}
                        <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-[linear-gradient(180deg,rgba(0,0,0,0)_0%,rgba(0,0,0,0.64)_100%)] p-8">
                          <h1 className="text-lg font-bold text-white drop-shadow-[0px_0px_20px_0px_rgba(0,0,0,.5)]">
                            {video.title}
                          </h1>
                        </div>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              ))}
            </div>
          </div>
        </div>
      )}

      {tab === "faqs" && (
        <div className="flex flex-col gap-10">
          <p className="text-sm font-light leading-[1.5] text-dark-blue-400">
            Common questions about tax obligations, form completion, and payment
            summaries.
          </p>

          {FAQ_SECTIONS.map((section) => (
            <div key={section.title}>
              <h2 className="text-2xl font-bold text-dark-blue-400">
                {section.title}
              </h2>
              <Accordion
                type="single"
                collapsible
                value={openFaq}
                onValueChange={setOpenFaq}
                className="mt-5 flex flex-col gap-y-3"
              >
                {section.items.map((item) => (
                  <AccordionItem
                    key={item.q}
                    value={item.q}
                    className="rounded-lg border border-gray-200 bg-white"
                  >
                    <AccordionTrigger className="flex w-full items-center justify-between gap-x-4 px-6 py-5 text-left text-base font-medium text-dark-blue-400">
                      <span>{item.q}</span>
                      <ChevronDown
                        className={cn(
                          "size-5 shrink-0 text-gray-500 transition-transform duration-300",
                          openFaq === item.q && "rotate-180"
                        )}
                      />
                    </AccordionTrigger>
                    {/* Padding comes from innerClassName. AccordionContent
                        already wraps children in p-6, so padding the child too
                        double-indents the answer away from the question. */}
                    <AccordionContent innerClassName="px-6 pb-5 pt-0">
                      <p className="text-sm font-light leading-[1.5] text-dark-blue-400">
                        {item.a}
                      </p>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </div>
          ))}
        </div>
      )}

      {tab === "tax-information" && (
      <div className="flex flex-col gap-6">
        {/* Filing location. Derived from the residence country rather than a
            separate field, so the two can never disagree. */}
        <RadioGroup
          value={form.country === "United States" ? "us" : "outside"}
          disabled={readOnly}
          onValueChange={(v) => {
            set("country", v === "us" ? "United States" : "")
          }}
          className="flex items-center gap-x-8"
        >
          <div className="flex items-center gap-x-2">
            <RadioGroupItem value="us" id="filing-us" />
            <Label htmlFor="filing-us" className="text-sm font-normal text-dark-blue-400">
              Filing From USA
            </Label>
          </div>
          <div className="flex items-center gap-x-2">
            <RadioGroupItem value="outside" id="filing-outside" />
            <Label htmlFor="filing-outside" className="text-sm font-normal text-dark-blue-400">
              Filing Outside USA
            </Label>
          </div>
        </RadioGroup>
        {/* Tax Identification */}
        <section className="rounded-lg border border-gray-200 bg-white p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="flex items-center gap-x-3">
                <h2 className="text-xl font-bold text-dark-blue-400">
                  Tax Identification
                </h2>
                {!editing && (
                  <Badge
                    visual={identificationComplete ? "success" : "orange"}
                    className="shrink-0 gap-x-1.5 rounded-full px-3 py-1 text-xs font-medium"
                  >
                    {identificationComplete ? "Completed" : "Incomplete"}
                    {identificationComplete ? (
                      <CheckCircle className="size-4" />
                    ) : (
                      <AlertCircle className="size-4" />
                    )}
                  </Badge>
                )}
              </div>
              <p className="mt-2 text-sm font-light leading-[1.5] text-dark-blue-400">
                Your taxpayer identification information will be included on W9
                or W8 series substitute form.
              </p>
            </div>

            {/* While editing this slot holds the actions. The badge describes
                the saved record, so it would be wrong next to unsaved edits. */}
            {editing ? (
              <div className="flex shrink-0 items-center gap-x-3">
                {data?.exists && (
                  <Button
                    variant="outlined"
                    visual="gray"
                    size="md"
                    className="bg-white"
                    disabled={saving}
                    onClick={() => {
                      if (data) hydrate(data)
                      setEditing(false)
                    }}
                  >
                    Cancel
                  </Button>
                )}
                <Button
                  visual="primary"
                  size="md"
                  disabled={saving}
                  onClick={async () => {
                    const next = await persist({})
                    if (next) setEditing(false)
                  }}
                >
                  {saving ? "Saving…" : "Save"}
                </Button>
              </div>
            ) : (
              <div className="flex shrink-0 items-center">
                <Button
                  variant="outlined"
                  visual="gray"
                  size="md"
                  className="bg-white"
                  leftIcon={<Edit03 className="size-4" />}
                  onClick={() => setEditing(true)}
                >
                  Edit
                </Button>
              </div>
            )}
          </div>

          <div className="mt-6 grid grid-cols-1 gap-5 md:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="tax-legal-name" className="text-sm font-normal text-dark-blue-400">
                Full Legal Name
              </Label>
              <Input
                id="tax-legal-name"
                placeholder="e.g. Jacob Mathew"
                value={form.legalFullName}
                disabled={readOnly}
                onChange={(e) =>
                  set("legalFullName", capitalizeName(e.target.value))
                }
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label className="text-sm font-normal text-dark-blue-400">
                Federal Tax Classification
              </Label>
              <Select
                value={form.federalTaxClassification}
                disabled={readOnly}
                onValueChange={(v) => {
                  // Switching classification switches the identifier with it,
                  // and clears a number that no longer applies.
                  const tinType =
                    CLASSIFICATIONS.find((c) => c.label === v)?.tinType ?? "SSN"
                  const changed = tinType !== form.tinType
                  setForm((prev) => ({
                    ...prev,
                    federalTaxClassification: v,
                    tinType,
                    tin: changed ? "" : prev.tin,
                  }))
                }}
              >
                <SelectTrigger className="text-base shadow-xs">
                  <SelectValue placeholder="How you file with the IRS" />
                </SelectTrigger>
                <SelectContent>
                  {CLASSIFICATIONS.map((c) => (
                    <SelectItem key={c.label} value={c.label}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="mt-5 flex flex-col gap-1.5">
            <Label className="text-sm font-normal text-dark-blue-400">
              Taxpayer Identification type
            </Label>
            <RadioGroup
              value={form.tinType}
              disabled={readOnly}
              onValueChange={(v) => {
                set("tinType", v)
              }}
              className="flex flex-col gap-y-2"
            >
              <div className="flex items-center gap-x-2">
                <RadioGroupItem value="SSN" id="tin-ssn" />
                <Label htmlFor="tin-ssn" className="text-sm font-normal text-dark-blue-400">
                  Social Security Number
                </Label>
              </div>
              <div className="flex items-center gap-x-2">
                <RadioGroupItem value="EIN" id="tin-ein" />
                <Label htmlFor="tin-ein" className="text-sm font-normal text-dark-blue-400">
                  Employment Identification Number
                </Label>
              </div>
            </RadioGroup>

            <div className="mt-2 md:w-1/2 md:pr-2.5">
              <Input
                aria-label={
                  form.tinType === "EIN"
                    ? "Employer identification number"
                    : "Social security number"
                }
                // IRS formats: SSN is 3-2-4, EIN is 2-7.
                placeholder={
                  form.tinType === "EIN" ? "XX-XXXXXXX" : "XXX-XX-XXXX"
                }
                inputMode="numeric"
                maxLength={11}
                isInvalid={showErrors && !!form.tin && !isTinComplete(form.tin)}
                value={form.tin}
                disabled={readOnly}
                onChange={(e) => set("tin", formatTin(e.target.value, form.tinType))}
              />
              {showErrors && !!form.tin && !isTinComplete(form.tin) && (
                <p className="mt-1.5 text-xs font-medium text-error-500">
                  {form.tinType === "EIN"
                    ? "Please enter a 9 digit EIN, formatted XX-XXXXXXX."
                    : "Please enter a 9 digit SSN, formatted XXX-XX-XXXX."}
                </p>
              )}
              {data?.tinLast4 && !form.tin && (
                <p className="mt-1.5 text-xs font-light text-gray-500">
                  Saved and ending in {data.tinLast4}. Type a new number to
                  replace it.
                </p>
              )}
            </div>
          </div>

          <p className="mt-6 text-sm leading-[1.5] text-dark-blue-400">
            <span className="font-bold">Residence:</span>{" "}
            <span className="font-light">
              Your taxpayer residence information will be included on W9 or W8
              series substitute form.
            </span>
          </p>

          <div className="mt-4 grid grid-cols-1 gap-5 md:grid-cols-3">
            <div className="flex flex-col gap-1.5">
              <Label className="text-sm font-normal text-dark-blue-400">
                Country
              </Label>
              <CountriesCombobox
                disabled={readOnly}
                placeholder="Where you pay tax"
                value={form.country}
                onValueChange={(v) => {
                  set("country", v)
                }}
                // Its default trigger is a dashed grey chip. Match the other
                // fields on this form: white, solid border, same height.
                // Standard dropdown field: flag on the left, label left-aligned
                // in the same 14px/normal/gray-black the Select trigger uses.
                // The combobox's own label span is 12px medium gray-700 and
                // capped at 120px, so it is overridden here.
                // Flag left, country name left, chevron pinned right, like any
                // other dropdown field. The component hides its chevron behind
                // `group-data-[state=open]`, a variant that emits no CSS in
                // this build, so it is forced visible here.
                triggerClassName="h-11 w-full justify-start gap-x-2 border-solid border-gray-300 bg-white px-[14px] py-3 shadow-xs [&>svg]:ml-auto [&>svg]:inline-block [&_span.truncate]:max-w-none [&_span.truncate]:text-base [&_span.truncate]:font-normal [&_span.truncate]:leading-normal [&_span.truncate]:text-gray-black"
                // Popover matches the field width and sits 4px below it.
                contentClassName="w-[var(--radix-popover-trigger-width)]"
                contentSideOffset={4}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="tax-street-1" className="text-sm font-normal text-dark-blue-400">
                Street Address 1
              </Label>
              <Input
                id="tax-street-1"
                placeholder="e.g. 1st Oregon Street"
                value={form.addressLine1}
                disabled={readOnly}
                onChange={(e) => set("addressLine1", e.target.value)}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="tax-street-2" className="text-sm font-normal text-dark-blue-400">
                Street Address 2
              </Label>
              <Input
                id="tax-street-2"
                placeholder="e.g. Apt 3107"
                value={form.addressLine2}
                disabled={readOnly}
                onChange={(e) => set("addressLine2", e.target.value)}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="tax-city" className="text-sm font-normal text-dark-blue-400">
                City
              </Label>
              <Input
                id="tax-city"
                placeholder="e.g. Edison"
                value={form.city}
                disabled={readOnly}
                onChange={(e) => set("city", e.target.value)}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="tax-state" className="text-sm font-normal text-dark-blue-400">
                State or Province
              </Label>
              {form.country === "United States" ? (
                <Select
                  value={form.stateOrProvince}
                  disabled={readOnly}
                  onValueChange={(v) => set("stateOrProvince", v)}
                >
                  <SelectTrigger className="text-base shadow-xs">
                    <SelectValue placeholder="e.g. New Jersey" />
                  </SelectTrigger>
                  <SelectContent>
                    {US_STATES.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  id="tax-state"
                  placeholder="e.g. Ontario"
                  value={form.stateOrProvince}
                  disabled={readOnly}
                  onChange={(e) => set("stateOrProvince", e.target.value)}
                />
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="tax-postal" className="text-sm font-normal text-dark-blue-400">
                Postal Code
              </Label>
              <Input
                id="tax-postal"
                placeholder="e.g. 07730"
                value={form.postalCode}
                disabled={readOnly}
                onChange={(e) => set("postalCode", e.target.value)}
              />
            </div>
          </div>

        </section>

        {/* Certification */}
        <section className="rounded-lg border border-gray-200 bg-white p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="flex items-center gap-x-3">
                <h2 className="text-xl font-bold text-dark-blue-400">
                  Tax Certification and Confirmation
                </h2>
                <Badge
                  visual={localCertProgress === 100 ? "success" : "orange"}
                  className="shrink-0 gap-x-1.5 rounded-full px-3 py-1 text-xs font-medium"
                >
                  {localCertProgress === 100
                    ? "Completed"
                    : localCertProgress === 0
                      ? "Incomplete"
                      : `${localCertProgress}% Completed`}
                  {localCertProgress === 100 ? (
                    <CheckCircle className="size-4" />
                  ) : (
                    <AlertCircle className="size-4" />
                  )}
                </Badge>
              </div>
              <p className="mt-2 text-sm font-light leading-[1.5] text-dark-blue-400">
                Please read the {formKind} Certification carefully and scroll to
                the bottom to provide your consent for electronic delivery of
                the document.
              </p>
            </div>

          </div>

          {/* Not collapsible: this is a perjury certification, and a collapsed
              panel lets someone consent below without ever opening the text
              they are certifying to. */}
          <div className="mt-6">
            <p className="text-sm font-bold text-dark-blue-400">
              {formKind} Certification
            </p>
            <p className="mt-1 text-sm font-light leading-[1.5] text-dark-blue-400">
              Read the certification in full, scrolling to the end, before you
              consent below.
            </p>
            {/* Padding goes on the content, not the ScrollArea root: the root
                sits outside the viewport, so padding there insets the scroll
                region and the scrollbar instead of letting content run to the
                edge of the box. */}
            <ScrollArea className="mt-3 h-[260px] rounded-lg border border-gray-200 bg-gray-50">
              <div className="p-4" ref={certRef}>
                  <p className="text-sm font-bold text-dark-blue-400">
                    Under penalties of perjury, I certify that:
                  </p>
                  <ol className="mt-3 flex list-decimal flex-col gap-y-2 pl-5 text-sm font-light leading-[1.5] text-dark-blue-400">
                    {(isW9 ? W9_CERTIFICATION : W8BEN_CERTIFICATION).map((line, i) => (
                      <li key={i}>
                        {line}
                        {isW9 && i === 1 && (
                          <span className="mt-1 flex flex-col gap-y-1 pl-3">
                            {W9_BACKUP_WITHHOLDING.map((sub) => (
                              <span key={sub}>{sub}</span>
                            ))}
                          </span>
                        )}
                      </li>
                    ))}
                  </ol>
                  <p className="mt-5 text-sm font-bold text-dark-blue-400">
                    Electronic Consent
                  </p>
                  <div className="mt-2 flex flex-col gap-y-3 text-sm font-light leading-[1.5] text-dark-blue-400">
                    {ELECTRONIC_CONSENT.map((paragraph) => (
                      <p key={paragraph}>{paragraph}</p>
                    ))}
                  </div>
            </div>
            </ScrollArea>

            {showErrors && !certRead && !data?.submitted && (
              <p className="mt-1.5 text-xs font-medium text-error-500">
                Please read the certification to the end.
              </p>
            )}
          </div>

          <div className="mt-6 grid grid-cols-1 gap-5 md:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="tax-signature" className="text-sm font-normal text-dark-blue-400">
                <span className="font-medium">Signature</span>{" "}
                <span className="font-light">(Write your Full legal name)</span>
              </Label>
              <Input
                id="tax-signature"
                placeholder="Type your name to sign"
                value={form.signature}
                isInvalid={showErrors && signatureInvalid}
                onChange={(e) => set("signature", e.target.value)}
              />
              {showErrors && signatureInvalid && (
                <p className="text-xs font-medium text-error-500">
                  Please match the name on your account,{" "}
                  <span className="font-semibold">{accountName}</span>. Update it
                  under Personal Info if it is wrong.
                </p>
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="tax-signed-date" className="text-sm font-medium text-dark-blue-400">
                Date
              </Label>
              <Input
                id="tax-signed-date"
                placeholder="MM-DD-YYYY"
                value={form.signedDate}
                onChange={(e) => set("signedDate", e.target.value)}
              />
            </div>
          </div>

          <div className="mt-5 flex flex-col gap-y-3">
            <div className="flex items-center gap-x-2">
              <Checkbox
                id="consent-signature"
                checked={form.consentESignature}
                onCheckedChange={(checked) => {
                  const next = checked === true
                  set("consentESignature", next)
                }}
              />
              <Label htmlFor="consent-signature" className="text-sm font-normal text-dark-blue-400">
                I consent to provide an electronic signature by typing my
                signature above.
              </Label>
            </div>
            <div className="flex items-center gap-x-2">
              <Checkbox
                id="consent-digital"
                checked={form.consentDigitalDelivery}
                onCheckedChange={(checked) => {
                  const next = checked === true
                  set("consentDigitalDelivery", next)
                }}
              />
              <Label htmlFor="consent-digital" className="text-sm font-normal text-dark-blue-400">
                I consent to receive tax documents digitally.
              </Label>
            </div>
          </div>

          <div className="mt-8 flex flex-col gap-3 border-t border-gray-200 pt-6 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs font-light leading-[1.5] text-gray-500">
              {saving
                ? "Saving…"
                : !identificationComplete
                  ? "Complete and save your tax identification first."
                  : localCertProgress < 100
                    ? "Add your signature, the date and both consents to submit."
                    : !signatureMatches
                      ? "Your signature must match the name on your account."
                      : "Submitting certifies this form under penalties of perjury."}
            </p>
            <div className="flex shrink-0 items-center gap-x-3">
              <Button
                visual="primary"
                size="xl"
                disabled={saving}
                onClick={submit}
              >
                {data?.submitted ? `Resubmit ${formKind}` : `Submit ${formKind}`}
              </Button>
            </div>
          </div>
        </section>
      </div>
      )}
    </div>
  )
}
