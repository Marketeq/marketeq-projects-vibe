"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { useAuth } from "@/contexts/auth"
import {
  type TaxInfo,
  getTaxFormPreview,
  getTaxInfo,
  saveTaxInfo,
  submitTaxInfo,
} from "@/src/lib/api/tax-info"
import { cn } from "@/utils/functions"
import {
  AlertCircle,
  ArrowRight,
  CheckCircle,
  ChevronDown,
  Download01,
  Edit03,
  File02,
  HelpCircle,
  Hourglass03,
  MessageQuestionSquare,
  Play,
  X,
} from "@blend-metrics/icons"
import { getPublicApiUrl } from "@/lib/runtime-urls"
import NextImage from "@/components/next-image"
import NextLink from "@/components/next-link"
import { CountriesCombobox } from "@/components/own-combobox"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
  Badge,
  Button,
  Checkbox,
  Dialog,
  DialogClose,
  DialogContent,
  DialogTitle,
  DialogTrigger,
  Input,
  Label,
  RadioGroup,
  RadioGroupItem,
  ScrollArea,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
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
        a: "A 1099-K. Because clients pay Marketeq and Marketeq pays you, we settle your payments rather than passing them between you and each client, so the form that reports them is a Form 1099-K. It reports gross settled volume for the year, before platform fees and any refunds, along with a month by month breakdown, which is why the figure on it is usually higher than what reached your account. Your clients do not issue you anything, and you should not expect a separate 1099-NEC for the same money. Reporting thresholds have changed several times in recent years, so check the current figures on irs.gov. Neither form is issued to non-US persons, who are covered by a W-8 series form instead.",
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
  "Alabama",
  "Alaska",
  "Arizona",
  "Arkansas",
  "California",
  "Colorado",
  "Connecticut",
  "Delaware",
  "District of Columbia",
  "Florida",
  "Georgia",
  "Hawaii",
  "Idaho",
  "Illinois",
  "Indiana",
  "Iowa",
  "Kansas",
  "Kentucky",
  "Louisiana",
  "Maine",
  "Maryland",
  "Massachusetts",
  "Michigan",
  "Minnesota",
  "Mississippi",
  "Missouri",
  "Montana",
  "Nebraska",
  "Nevada",
  "New Hampshire",
  "New Jersey",
  "New Mexico",
  "New York",
  "North Carolina",
  "North Dakota",
  "Ohio",
  "Oklahoma",
  "Oregon",
  "Pennsylvania",
  "Rhode Island",
  "South Carolina",
  "South Dakota",
  "Tennessee",
  "Texas",
  "Utah",
  "Vermont",
  "Virginia",
  "Washington",
  "West Virginia",
  "Wisconsin",
  "Wyoming",
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
  return Math.max(0, Math.ceil((deadline.getTime() - now.getTime()) / 86400000))
}

// An individual files under an SSN; an entity files under an EIN. Selecting a
// classification therefore decides which identifier applies.
/**
 * Line 4 of the W-9 states its codes "apply only to certain entities, not
 * individuals", so the exemption fields are shown only for the entity
 * classifications and stay hidden for an individual or sole proprietor.
 */
const ENTITY_CLASSIFICATIONS = new Set([
  "C Corporation",
  "S Corporation",
  "Partnership",
  "Trust or Estate",
])

/** Line 4 exists on the W-9 only; a W-8BEN has no equivalent. */
const isW9Form = (kind: string) => kind === "W-9"

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
    return digits.length > 2
      ? `${digits.slice(0, 2)}-${digits.slice(2)}`
      : digits
  }
  if (digits.length > 5)
    return `${digits.slice(0, 3)}-${digits.slice(3, 5)}-${digits.slice(5)}`
  if (digits.length > 3) return `${digits.slice(0, 3)}-${digits.slice(3)}`
  return digits
}

const isTinComplete = (value: string) => value.replace(/\D/g, "").length === 9

/** The country list labels the US "USA"; older records stored the long name. */
const isUnitedStates = (country?: string | null) =>
  country === "USA" || country === "United States"

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
  value.replace(
    /(^|[\s\-'])(\p{L})/gu,
    (_, sep, letter) => sep + letter.toUpperCase()
  )

// Part III of Form W-8BEN. A non-US person never signs a W-9: item 3 of the W-9
// certification is an affirmation of US person status, which is the opposite of
// what a W-8BEN establishes.
const W8BEN_CERTIFICATION = [
  "I am the individual that is the beneficial owner (or am authorized to sign for the individual that is the beneficial owner) of all the income or proceeds to which this form relates, or am using this form to document myself for chapter 4 purposes; and",
  "The person named on this form is not a U.S. person; and",
  "The income to which this form relates is not effectively connected with the conduct of a trade or business in the United States, or is effectively connected but is not subject to tax under an applicable income tax treaty; and",
  "The person named on this form is a resident of the treaty country listed on this form, if any, within the meaning of the income tax treaty between that country and the United States; and",
  "I will submit a new form within 30 days if any certification made on this form becomes incorrect.",
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
  // Toasts are for confirmations only, so a failed save reports itself inline.
  const [saveError, setSaveError] = useState<string | null>(null)
  const certRef = useRef<HTMLDivElement | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [editing, setEditing] = useState(false)
  const [data, setData] = useState<TaxInfo | null>(null)
  // An SSN and an EIN are different numbers, so each keeps its own value while
  // the other is on screen. Switching type parks the current one and restores
  // whatever was last typed for the type being switched to.
  const tinDrafts = useRef<Record<string, string>>({ SSN: "", EIN: "" })
  const switchTinType = (next: string) => {
    setForm((prev) => {
      if (prev.tinType === next) return prev
      tinDrafts.current[prev.tinType] = prev.tin
      return { ...prev, tinType: next, tin: tinDrafts.current[next] ?? "" }
    })
  }

  const [form, setForm] = useState({
    legalFullName: "",
    federalTaxClassification: "Individual",
    tinType: "SSN",
    tin: "",
    exemptPayeeCode: "",
    fatcaExemptionCode: "",
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
      tinDrafts.current = { SSN: "", EIN: "" }
      setForm((prev) => ({
        ...prev,
        legalFullName: next.legalFullName || accountName,
        federalTaxClassification: next.federalTaxClassification ?? "Individual",
        tinType: next.tinType ?? "SSN",
        // The stored number is never sent back, so both drafts start empty and
        // the field falls back to the "saved and ending in" hint.
        tin: "",
        exemptPayeeCode: next.exemptPayeeCode ?? "",
        fatcaExemptionCode: next.fatcaExemptionCode ?? "",
        country: next.country ?? "United States",
        addressLine1: next.addressLine1 ?? "",
        addressLine2: next.addressLine2 ?? "",
        city: next.city ?? "",
        stateOrProvince: next.stateOrProvince ?? "",
        postalCode: next.postalCode ?? "",
        signature: next.signature ?? "",
        // The date stamps this signing, so it is always today, including on a
        // resubmission of a record that was signed on an earlier date.
        signedDate: todayFormatted(),
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
    setSaveError(null)
    setSaving(true)
    try {
      // An untouched TIN field means "leave the stored one alone".
      const { tin, ...rest } = { ...form, ...patch }
      const next = await saveTaxInfo(tin ? { ...rest, tin } : rest)
      hydrate(next)
      toast({ title: "Tax information saved", variant: "success" })
      return next
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : "Please try saving again")
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

    setSaveError(null)
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
        variant: "success",
      })
      setTab("tax-forms")
    } catch (e) {
      setSaveError(
        e instanceof Error ? e.message : "Please try submitting again"
      )
    } finally {
      setSaving(false)
    }
  }

  // Each card shows the contractor's own filled-in copy. The renders are
  // fetched as blob URLs because the preview sits behind the same auth as the
  // download, and are revoked when the set of forms changes or the page closes.
  const [previews, setPreviews] = useState<Record<string, string>>({})

  // `data.forms` is a fresh array on every render, so the effect keys off the
  // identifiers instead; depending on the array itself would refetch in a loop.
  const previewForms = data?.forms ?? []
  const previewKey = previewForms
    .map((form) => `${form.id}:${form.previewUrl ?? ""}`)
    .join("|")
  const formsRef = useRef(previewForms)
  formsRef.current = previewForms

  useEffect(() => {
    let live = true
    const created: string[] = []

    Promise.all(
      formsRef.current.map(async (form) => {
        if (!form.previewUrl) return null
        const url = await getTaxFormPreview(form.previewUrl)
        if (!url) return null
        created.push(url)
        return [form.id, url] as const
      })
    ).then((entries) => {
      const resolved = entries.filter(Boolean) as (readonly [string, string])[]
      if (!live) {
        created.forEach((url) => URL.revokeObjectURL(url))
        return
      }
      setPreviews(Object.fromEntries(resolved))
    })

    return () => {
      live = false
      created.forEach((url) => URL.revokeObjectURL(url))
    }
  }, [previewKey])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <p className="text-sm font-light text-gray-500">Loading…</p>
      </div>
    )
  }

  // Completeness is measured from what is on screen. Reading it off the last
  // server response let Submit fire against stale state and come back with a
  // server-side "complete every field" error the form had already satisfied.
  // The TIN counts as present when a complete one is typed, or when one is
  // already stored and the field was left untouched.
  const tinSatisfied = form.tin ? isTinComplete(form.tin) : !!data?.tinLast4
  const identificationMissing: Record<string, boolean> = {
    legalFullName: !form.legalFullName.trim(),
    federalTaxClassification: !form.federalTaxClassification,
    tinType: !form.tinType,
    tin: !tinSatisfied,
    country: !form.country,
    addressLine1: !form.addressLine1.trim(),
    addressLine2: !form.addressLine2.trim(),
    city: !form.city.trim(),
    stateOrProvince: !form.stateOrProvince,
    postalCode: !form.postalCode.trim(),
  }
  const identificationComplete = !Object.values(identificationMissing).some(
    Boolean
  )
  const forms = data?.forms ?? []
  const certificationProgress = data?.certificationProgress ?? 0
  // Editable only while editing. Previously this also depended on completeness,
  // which left incomplete records with enabled fields but no Save button.
  const readOnly = !editing

  // Progress is measured from what is on screen, not from the last server
  // response. Nothing autosaves, so a typed signature would otherwise leave the
  // badge at 0% and Submit disabled with no explanation.
  // Each certification field reports its own failure, so pressing Submit with
  // an empty signature, a bad date or an unticked consent says which one.
  const signatureMissing = !form.signature.trim()
  // The date is the date of signing, so it has to be today's.
  const signedDateInvalid = (form.signedDate ?? "").trim() !== todayFormatted()

  // A malformed date must not count towards completion, or Submit would go
  // through while the field shows an error.
  const certParts = [
    !signatureMissing,
    !signedDateInvalid,
    form.consentESignature,
    form.consentDigitalDelivery,
  ]
  const localCertProgress = Math.round(
    (certParts.filter(Boolean).length / certParts.length) * 100
  )

  const signatureMatches =
    !!form.signature && !!accountName && namesMatch(form.signature, accountName)
  const signatureInvalid = !!form.signature && !signatureMatches

  // Driven by the country on screen, not by the last server response. Reading
  // it off `data` meant switching country showed the wrong certification until
  // the form was saved, so a non-US filer was shown the W-9's "I am a U.S.
  // citizen" affirmation.
  const formKind = isUnitedStates(form.country) ? "W-9" : "W-8BEN"
  const showsExemptions =
    isW9Form(formKind) &&
    ENTITY_CLASSIFICATIONS.has(form.federalTaxClassification)
  const isW9 = formKind === "W-9"

  // Documents are served by user-service, not by Next. A NextLink would
  // resolve these against the app origin and 404.
  const apiBase = (getPublicApiUrl() || "http://localhost:4000").replace(
    /\/$/,
    ""
  )

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

                    <div className="flex h-[170px] items-center justify-center overflow-hidden rounded-md bg-gray-50 p-3">
                      {previews[form.id] ? (
                        <img
                          src={previews[form.id]}
                          alt={`${form.formType} for ${form.taxYear}`}
                          className="size-full rounded-sm object-cover object-top"
                        />
                      ) : (
                        <File02 className="size-10 text-gray-300" />
                      )}
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
                {data?.submitted
                  ? "No tax forms have been issued yet"
                  : "We do not have any tax form to display"}
              </p>
              {data?.submitted ? (
                <p className="mt-1.5 max-w-md text-sm font-light text-dark-blue-400">
                  Your 1099-K will appear here once it is issued. Forms are
                  furnished by January 31 for the previous tax year, and only
                  when your settled payments reach the IRS reporting threshold.
                </p>
              ) : (
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
              )}
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
                      <NextLink
                        href={card.href}
                        className={cn(linkClass, "ml-4")}
                      >
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
                Questions about your tax forms?
              </h2>
              <p className="mt-3 max-w-[420px] text-sm font-light leading-[1.5] text-dark-blue-400">
                Ask about your W-9, your 1099-K, and how Marketeq reports the
                payments it settles for you. For advice about your own tax
                situation, speak to a licensed tax professional.
              </p>
              <Button visual="primary" className="mt-6">
                Ask a Question
              </Button>
            </div>

            {/* Same line-art style as the onboarding role picker: 2.5 stroke in
                primary-500, lighter blues as accents, on a primary-50 tile. */}
            <div className="relative flex h-[200px] w-full shrink-0 items-center justify-center overflow-hidden rounded-lg bg-primary-50 lg:w-[320px]">
              {/* Engraved guilloche waves, the security-print texture used on
                  certificates and financial documents. Hairline weight in the
                  lightest tone of the same palette, with the centre faded back
                  so the line art in front stays legible. */}
              <svg
                className="pointer-events-none absolute inset-0 size-full"
                viewBox="0 0 320 200"
                fill="none"
                preserveAspectRatio="xMidYMid slice"
                xmlns="http://www.w3.org/2000/svg"
                aria-hidden
              >
                <defs>
                  <radialGradient id="taxTileFade" cx="50%" cy="50%" r="42%">
                    <stop offset="0%" stopColor="#EFF4FF" stopOpacity="1" />
                    <stop offset="100%" stopColor="#EFF4FF" stopOpacity="0" />
                  </radialGradient>
                </defs>
                <g
                  fill="none"
                  stroke="#C9D9FF"
                  strokeWidth="0.9"
                  opacity="0.75"
                >
                  <path d="M 0 8.0 L 6 9.7 L 12 11.4 L 18 12.8 L 24 13.9 L 30 14.7 L 36 15.0 L 42 14.9 L 48 14.3 L 54 13.4 L 60 12.1 L 66 10.6 L 72 8.9 L 78 7.1 L 84 5.4 L 90 3.9 L 96 2.6 L 102 1.7 L 108 1.1 L 114 1.0 L 120 1.3 L 126 2.1 L 132 3.2 L 138 4.6 L 144 6.3 L 150 8.0 L 156 9.7 L 162 11.4 L 168 12.8 L 174 13.9 L 180 14.7 L 186 15.0 L 192 14.9 L 198 14.3 L 204 13.4 L 210 12.1 L 216 10.6 L 222 8.9 L 228 7.1 L 234 5.4 L 240 3.9 L 246 2.6 L 252 1.7 L 258 1.1 L 264 1.0 L 270 1.3 L 276 2.1 L 282 3.2 L 288 4.6 L 294 6.3 L 300 8.0 L 306 9.7 L 312 11.4 L 318 12.8 L 320 13.2" />
                  <path d="M 0 25.9 L 6 27.4 L 12 28.6 L 18 29.5 L 24 29.9 L 30 30.0 L 36 29.6 L 42 28.7 L 48 27.6 L 54 26.1 L 60 24.4 L 66 22.7 L 72 21.0 L 78 19.4 L 84 18.0 L 90 16.9 L 96 16.3 L 102 16.0 L 108 16.2 L 114 16.8 L 120 17.8 L 126 19.1 L 132 20.7 L 138 22.4 L 144 24.2 L 150 25.9 L 156 27.4 L 162 28.6 L 168 29.5 L 174 29.9 L 180 30.0 L 186 29.6 L 192 28.7 L 198 27.6 L 204 26.1 L 210 24.4 L 216 22.7 L 222 21.0 L 228 19.4 L 234 18.0 L 240 16.9 L 246 16.3 L 252 16.0 L 258 16.2 L 264 16.8 L 270 17.8 L 276 19.1 L 282 20.7 L 288 22.4 L 294 24.2 L 300 25.9 L 306 27.4 L 312 28.6 L 318 29.5 L 320 29.7" />
                  <path d="M 0 43.2 L 6 44.2 L 12 44.8 L 18 45.0 L 24 44.7 L 30 44.1 L 36 43.0 L 42 41.6 L 48 40.0 L 54 38.3 L 60 36.5 L 66 34.9 L 72 33.4 L 78 32.2 L 84 31.4 L 90 31.0 L 96 31.1 L 102 31.6 L 108 32.4 L 114 33.7 L 120 35.2 L 126 36.8 L 132 38.6 L 138 40.3 L 144 41.9 L 150 43.2 L 156 44.2 L 162 44.8 L 168 45.0 L 174 44.7 L 180 44.1 L 186 43.0 L 192 41.6 L 198 40.0 L 204 38.3 L 210 36.5 L 216 34.9 L 222 33.4 L 228 32.2 L 234 31.4 L 240 31.0 L 246 31.1 L 252 31.6 L 258 32.4 L 264 33.7 L 270 35.2 L 276 36.8 L 282 38.6 L 288 40.3 L 294 41.9 L 300 43.2 L 306 44.2 L 312 44.8 L 318 45.0 L 320 45.0" />
                  <path d="M 0 59.7 L 6 60.0 L 12 59.9 L 18 59.3 L 24 58.4 L 30 57.1 L 36 55.6 L 42 53.9 L 48 52.1 L 54 50.4 L 60 48.9 L 66 47.6 L 72 46.7 L 78 46.1 L 84 46.0 L 90 46.3 L 96 47.1 L 102 48.2 L 108 49.6 L 114 51.3 L 120 53.0 L 126 54.8 L 132 56.4 L 138 57.8 L 144 58.9 L 150 59.7 L 156 60.0 L 162 59.9 L 168 59.3 L 174 58.4 L 180 57.1 L 186 55.6 L 192 53.9 L 198 52.1 L 204 50.4 L 210 48.9 L 216 47.6 L 222 46.7 L 228 46.1 L 234 46.0 L 240 46.3 L 246 47.1 L 252 48.2 L 258 49.6 L 264 51.3 L 270 53.0 L 276 54.8 L 282 56.4 L 288 57.8 L 294 58.9 L 300 59.7 L 306 60.0 L 312 59.9 L 318 59.3 L 320 59.1" />
                  <path d="M 0 75.0 L 6 74.5 L 12 73.7 L 18 72.6 L 24 71.1 L 30 69.4 L 36 67.7 L 42 65.9 L 48 64.3 L 54 63.0 L 60 61.9 L 66 61.2 L 72 61.0 L 78 61.2 L 84 61.8 L 90 62.8 L 96 64.2 L 102 65.7 L 108 67.4 L 114 69.2 L 120 70.9 L 126 72.4 L 132 73.6 L 138 74.5 L 144 74.9 L 150 75.0 L 156 74.5 L 162 73.7 L 168 72.6 L 174 71.1 L 180 69.4 L 186 67.7 L 192 65.9 L 198 64.3 L 204 63.0 L 210 61.9 L 216 61.2 L 222 61.0 L 228 61.2 L 234 61.8 L 240 62.8 L 246 64.2 L 252 65.7 L 258 67.4 L 264 69.2 L 270 70.9 L 276 72.4 L 282 73.6 L 288 74.5 L 294 74.9 L 300 75.0 L 306 74.5 L 312 73.7 L 318 72.6 L 320 72.1" />
                  <path d="M 0 89.0 L 6 88.0 L 12 86.6 L 18 85.0 L 24 83.3 L 30 81.5 L 36 79.9 L 42 78.4 L 48 77.2 L 54 76.4 L 60 76.0 L 66 76.1 L 72 76.6 L 78 77.4 L 84 78.7 L 90 80.2 L 96 81.9 L 102 83.6 L 108 85.3 L 114 86.9 L 120 88.2 L 126 89.2 L 132 89.8 L 138 90.0 L 144 89.7 L 150 89.0 L 156 88.0 L 162 86.6 L 168 85.0 L 174 83.3 L 180 81.5 L 186 79.9 L 192 78.4 L 198 77.2 L 204 76.4 L 210 76.0 L 216 76.1 L 222 76.6 L 228 77.4 L 234 78.7 L 240 80.2 L 246 81.9 L 252 83.6 L 258 85.3 L 264 86.9 L 270 88.2 L 276 89.2 L 282 89.8 L 288 90.0 L 294 89.7 L 300 89.0 L 306 88.0 L 312 86.6 L 318 85.0 L 320 84.4" />
                  <path d="M 0 102.1 L 6 100.5 L 12 98.8 L 18 97.1 L 24 95.4 L 30 93.8 L 36 92.6 L 42 91.6 L 48 91.1 L 54 91.0 L 60 91.4 L 66 92.1 L 72 93.2 L 78 94.7 L 84 96.3 L 90 98.0 L 96 99.8 L 102 101.4 L 108 102.8 L 114 103.9 L 120 104.7 L 126 105.0 L 132 104.9 L 138 104.3 L 144 103.4 L 150 102.1 L 156 100.5 L 162 98.8 L 168 97.1 L 174 95.4 L 180 93.8 L 186 92.6 L 192 91.6 L 198 91.1 L 204 91.0 L 210 91.4 L 216 92.1 L 222 93.2 L 228 94.7 L 234 96.3 L 240 98.0 L 246 99.8 L 252 101.4 L 258 102.8 L 264 103.9 L 270 104.7 L 276 105.0 L 282 104.9 L 288 104.3 L 294 103.4 L 300 102.1 L 306 100.5 L 312 98.8 L 318 97.1 L 320 96.5" />
                  <path d="M 0 114.4 L 6 112.7 L 12 110.9 L 18 109.3 L 24 108.0 L 30 106.9 L 36 106.2 L 42 106.0 L 48 106.2 L 54 106.8 L 60 107.8 L 66 109.2 L 72 110.7 L 78 112.5 L 84 114.2 L 90 115.9 L 96 117.4 L 102 118.6 L 108 119.5 L 114 119.9 L 120 120.0 L 126 119.5 L 132 118.7 L 138 117.5 L 144 116.1 L 150 114.4 L 156 112.7 L 162 110.9 L 168 109.3 L 174 108.0 L 180 106.9 L 186 106.2 L 192 106.0 L 198 106.2 L 204 106.8 L 210 107.8 L 216 109.2 L 222 110.7 L 228 112.5 L 234 114.2 L 240 115.9 L 246 117.4 L 252 118.6 L 258 119.5 L 264 119.9 L 270 120.0 L 276 119.5 L 282 118.7 L 288 117.5 L 294 116.1 L 300 114.4 L 306 112.7 L 312 110.9 L 318 109.3 L 320 108.8" />
                  <path d="M 0 126.5 L 6 124.8 L 12 123.4 L 18 122.2 L 24 121.4 L 30 121.0 L 36 121.1 L 42 121.6 L 48 122.5 L 54 123.7 L 60 125.2 L 66 126.9 L 72 128.6 L 78 130.4 L 84 131.9 L 90 133.2 L 96 134.2 L 102 134.8 L 108 135.0 L 114 134.7 L 120 134.0 L 126 133.0 L 132 131.6 L 138 130.0 L 144 128.2 L 150 126.5 L 156 124.8 L 162 123.4 L 168 122.2 L 174 121.4 L 180 121.0 L 186 121.1 L 192 121.6 L 198 122.5 L 204 123.7 L 210 125.2 L 216 126.9 L 222 128.6 L 228 130.4 L 234 131.9 L 240 133.2 L 246 134.2 L 252 134.8 L 258 135.0 L 264 134.7 L 270 134.0 L 276 133.0 L 282 131.6 L 288 130.0 L 294 128.2 L 300 126.5 L 306 124.8 L 312 123.4 L 318 122.2 L 320 121.9" />
                  <path d="M 0 138.8 L 6 137.6 L 12 136.6 L 18 136.1 L 24 136.0 L 30 136.4 L 36 137.1 L 42 138.3 L 48 139.7 L 54 141.3 L 60 143.1 L 66 144.8 L 72 146.4 L 78 147.8 L 84 148.9 L 90 149.7 L 96 150.0 L 102 149.9 L 108 149.3 L 114 148.3 L 120 147.1 L 126 145.5 L 132 143.8 L 138 142.1 L 144 140.4 L 150 138.8 L 156 137.6 L 162 136.6 L 168 136.1 L 174 136.0 L 180 136.4 L 186 137.1 L 192 138.3 L 198 139.7 L 204 141.3 L 210 143.1 L 216 144.8 L 222 146.4 L 228 147.8 L 234 148.9 L 240 149.7 L 246 150.0 L 252 149.9 L 258 149.3 L 264 148.3 L 270 147.1 L 276 145.5 L 282 143.8 L 288 142.1 L 294 140.4 L 300 138.8 L 306 137.6 L 312 136.6 L 318 136.1 L 320 136.0" />
                  <path d="M 0 151.9 L 6 151.2 L 12 151.0 L 18 151.2 L 24 151.8 L 30 152.9 L 36 154.2 L 42 155.8 L 48 157.5 L 54 159.2 L 60 160.9 L 66 162.4 L 72 163.6 L 78 164.5 L 84 164.9 L 90 165.0 L 96 164.5 L 102 163.7 L 108 162.5 L 114 161.0 L 120 159.4 L 126 157.6 L 132 155.9 L 138 154.3 L 144 152.9 L 150 151.9 L 156 151.2 L 162 151.0 L 168 151.2 L 174 151.8 L 180 152.9 L 186 154.2 L 192 155.8 L 198 157.5 L 204 159.2 L 210 160.9 L 216 162.4 L 222 163.6 L 228 164.5 L 234 164.9 L 240 165.0 L 246 164.5 L 252 163.7 L 258 162.5 L 264 161.0 L 270 159.4 L 276 157.6 L 282 155.9 L 288 154.3 L 294 152.9 L 300 151.9 L 306 151.2 L 312 151.0 L 318 151.2 L 320 151.4" />
                  <path d="M 0 166.0 L 6 166.1 L 12 166.6 L 18 167.5 L 24 168.7 L 30 170.2 L 36 171.9 L 42 173.7 L 48 175.4 L 54 176.9 L 60 178.3 L 66 179.2 L 72 179.8 L 78 180.0 L 84 179.7 L 90 179.0 L 96 177.9 L 102 176.6 L 108 174.9 L 114 173.2 L 120 171.5 L 126 169.8 L 132 168.4 L 138 167.2 L 144 166.4 L 150 166.0 L 156 166.1 L 162 166.6 L 168 167.5 L 174 168.7 L 180 170.2 L 186 171.9 L 192 173.7 L 198 175.4 L 204 176.9 L 210 178.3 L 216 179.2 L 222 179.8 L 228 180.0 L 234 179.7 L 240 179.0 L 246 177.9 L 252 176.6 L 258 174.9 L 264 173.2 L 270 171.5 L 276 169.8 L 282 168.4 L 288 167.2 L 294 166.4 L 300 166.0 L 306 166.1 L 312 166.6 L 318 167.5 L 320 167.9" />
                  <path d="M 0 181.4 L 6 182.1 L 12 183.3 L 18 184.7 L 24 186.4 L 30 188.1 L 36 189.8 L 42 191.5 L 48 192.9 L 54 194.0 L 60 194.7 L 66 195.0 L 72 194.9 L 78 194.3 L 84 193.3 L 90 192.0 L 96 190.5 L 102 188.8 L 108 187.0 L 114 185.3 L 120 183.8 L 126 182.5 L 132 181.6 L 138 181.1 L 144 181.0 L 150 181.4 L 156 182.1 L 162 183.3 L 168 184.7 L 174 186.4 L 180 188.1 L 186 189.8 L 192 191.5 L 198 192.9 L 204 194.0 L 210 194.7 L 216 195.0 L 222 194.9 L 228 194.3 L 234 193.3 L 240 192.0 L 246 190.5 L 252 188.8 L 258 187.0 L 264 185.3 L 270 183.8 L 276 182.5 L 282 181.6 L 288 181.1 L 294 181.0 L 300 181.4 L 306 182.1 L 312 183.3 L 318 184.7 L 320 185.2" />
                </g>
                <rect width="320" height="200" fill="url(#taxTileFade)" />
              </svg>

              <svg
                className="relative"
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
                <line
                  x1="30"
                  y1="34"
                  x2="56"
                  y2="34"
                  stroke="#98B6FF"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                />
                <line
                  x1="30"
                  y1="46"
                  x2="68"
                  y2="46"
                  stroke="#C9D9FF"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                />
                <line
                  x1="30"
                  y1="58"
                  x2="62"
                  y2="58"
                  stroke="#C9D9FF"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                />
                <line
                  x1="30"
                  y1="70"
                  x2="48"
                  y2="70"
                  stroke="#C9D9FF"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                />

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
              <Label
                htmlFor="filing-us"
                className="text-sm font-normal text-dark-blue-400"
              >
                Filing From USA
              </Label>
            </div>
            <div className="flex items-center gap-x-2">
              <RadioGroupItem value="outside" id="filing-outside" />
              <Label
                htmlFor="filing-outside"
                className="text-sm font-normal text-dark-blue-400"
              >
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
                  Your taxpayer identification information will be included on
                  W9 or W8 series substitute form.
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
                <Label
                  htmlFor="tax-legal-name"
                  className="text-sm font-normal text-dark-blue-400"
                >
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
                  isInvalid={showErrors && identificationMissing.legalFullName}
                />
                {showErrors && identificationMissing.legalFullName && (
                  <p className="text-xs font-medium text-error-500">
                    Please enter your full legal name
                  </p>
                )}
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
                    // and each identifier keeps its own number.
                    const tinType =
                      CLASSIFICATIONS.find((c) => c.label === v)?.tinType ??
                      "SSN"
                    // An individual cannot hold a line 4 code, so switching
                    // away from an entity clears anything already entered.
                    const exemptions = ENTITY_CLASSIFICATIONS.has(v)
                      ? {}
                      : { exemptPayeeCode: "", fatcaExemptionCode: "" }
                    setForm((prev) => {
                      if (prev.tinType === tinType) {
                        return {
                          ...prev,
                          federalTaxClassification: v,
                          ...exemptions,
                        }
                      }
                      tinDrafts.current[prev.tinType] = prev.tin
                      return {
                        ...prev,
                        federalTaxClassification: v,
                        tinType,
                        tin: tinDrafts.current[tinType] ?? "",
                        ...exemptions,
                      }
                    })
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
                {showErrors &&
                  identificationMissing.federalTaxClassification && (
                    <p className="text-xs font-medium text-error-500">
                      Please select how you file with the IRS
                    </p>
                  )}
              </div>
            </div>

            {showsExemptions && (
              <div className="mt-5 grid grid-cols-1 gap-5 md:grid-cols-2">
                <div className="flex flex-col gap-1.5">
                  <Label
                    htmlFor="tax-exempt-payee"
                    className="text-sm font-normal text-dark-blue-400"
                  >
                    <span className="font-medium">Exempt Payee Code</span>{" "}
                    <span className="font-light">(if any)</span>
                  </Label>
                  <Input
                    id="tax-exempt-payee"
                    placeholder="e.g. 5"
                    maxLength={2}
                    value={form.exemptPayeeCode}
                    disabled={readOnly}
                    onChange={(e) => set("exemptPayeeCode", e.target.value)}
                  />
                  <p className="text-xs font-light text-gray-500">
                    Only certain entities have one. Leave it blank if you do
                    not. It exempts you from backup withholding, not from tax.
                  </p>
                </div>

                <div className="flex flex-col gap-1.5">
                  <Label
                    htmlFor="tax-fatca"
                    className="text-sm font-normal text-dark-blue-400"
                  >
                    <span className="font-medium">FATCA Exemption Code</span>{" "}
                    <span className="font-light">(if any)</span>
                  </Label>
                  <Input
                    id="tax-fatca"
                    placeholder="e.g. A"
                    maxLength={2}
                    value={form.fatcaExemptionCode}
                    disabled={readOnly}
                    onChange={(e) => set("fatcaExemptionCode", e.target.value)}
                  />
                  <p className="text-xs font-light text-gray-500">
                    Applies only to accounts maintained outside the United
                    States. Leave it blank if that is not your situation.
                  </p>
                </div>
              </div>
            )}

            <div className="mt-5 flex flex-col gap-1.5">
              <Label className="text-sm font-normal text-dark-blue-400">
                Taxpayer Identification type
              </Label>
              <RadioGroup
                value={form.tinType}
                disabled={readOnly}
                onValueChange={switchTinType}
                className="flex flex-col gap-y-2"
              >
                <div className="flex items-center gap-x-2">
                  <RadioGroupItem value="SSN" id="tin-ssn" />
                  <Label
                    htmlFor="tin-ssn"
                    className="text-sm font-normal text-dark-blue-400"
                  >
                    Social Security Number
                  </Label>
                </div>
                <div className="flex items-center gap-x-2">
                  <RadioGroupItem value="EIN" id="tin-ein" />
                  <Label
                    htmlFor="tin-ein"
                    className="text-sm font-normal text-dark-blue-400"
                  >
                    Employment Identification Number
                  </Label>
                </div>
              </RadioGroup>
              {showErrors && identificationMissing.tinType && (
                <p className="text-xs font-medium text-error-500">
                  Please select your taxpayer identification type
                </p>
              )}

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
                  isInvalid={showErrors && identificationMissing.tin}
                  value={form.tin}
                  disabled={readOnly}
                  onChange={(e) =>
                    set("tin", formatTin(e.target.value, form.tinType))
                  }
                />
                {showErrors && identificationMissing.tin && (
                  <p className="mt-1.5 text-xs font-medium text-error-500">
                    {form.tinType === "EIN"
                      ? "Please enter your 9 digit employer identification number"
                      : "Please enter your 9 digit social security number"}
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
                {showErrors && identificationMissing.country && (
                  <p className="text-xs font-medium text-error-500">
                    Please select the country where you pay tax
                  </p>
                )}
              </div>

              <div className="flex flex-col gap-1.5">
                <Label
                  htmlFor="tax-street-1"
                  className="text-sm font-normal text-dark-blue-400"
                >
                  Street Address 1
                </Label>
                <Input
                  id="tax-street-1"
                  placeholder="e.g. 1st Oregon Street"
                  value={form.addressLine1}
                  disabled={readOnly}
                  onChange={(e) => set("addressLine1", e.target.value)}
                  isInvalid={showErrors && identificationMissing.addressLine1}
                />
                {showErrors && identificationMissing.addressLine1 && (
                  <p className="text-xs font-medium text-error-500">
                    Please enter your street address
                  </p>
                )}
              </div>

              <div className="flex flex-col gap-1.5">
                <Label
                  htmlFor="tax-street-2"
                  className="text-sm font-normal text-dark-blue-400"
                >
                  Street Address 2
                </Label>
                <Input
                  id="tax-street-2"
                  placeholder="e.g. Apt 3107"
                  value={form.addressLine2}
                  disabled={readOnly}
                  onChange={(e) => set("addressLine2", e.target.value)}
                  isInvalid={showErrors && identificationMissing.addressLine2}
                />
                {showErrors && identificationMissing.addressLine2 && (
                  <p className="text-xs font-medium text-error-500">
                    Please enter your apartment or suite number
                  </p>
                )}
              </div>

              <div className="flex flex-col gap-1.5">
                <Label
                  htmlFor="tax-city"
                  className="text-sm font-normal text-dark-blue-400"
                >
                  City
                </Label>
                <Input
                  id="tax-city"
                  placeholder="e.g. Edison"
                  value={form.city}
                  disabled={readOnly}
                  onChange={(e) => set("city", e.target.value)}
                  isInvalid={showErrors && identificationMissing.city}
                />
                {showErrors && identificationMissing.city && (
                  <p className="text-xs font-medium text-error-500">
                    Please enter your city
                  </p>
                )}
              </div>

              <div className="flex flex-col gap-1.5">
                <Label
                  htmlFor="tax-state"
                  className="text-sm font-normal text-dark-blue-400"
                >
                  State or Province
                </Label>
                {isUnitedStates(form.country) ? (
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
                {showErrors && identificationMissing.stateOrProvince && (
                  <p className="text-xs font-medium text-error-500">
                    Please select your state or province
                  </p>
                )}
              </div>

              <div className="flex flex-col gap-1.5">
                <Label
                  htmlFor="tax-postal"
                  className="text-sm font-normal text-dark-blue-400"
                >
                  Postal Code
                </Label>
                <Input
                  id="tax-postal"
                  placeholder="e.g. 07730"
                  value={form.postalCode}
                  disabled={readOnly}
                  onChange={(e) => set("postalCode", e.target.value)}
                  isInvalid={showErrors && identificationMissing.postalCode}
                />
                {showErrors && identificationMissing.postalCode && (
                  <p className="text-xs font-medium text-error-500">
                    Please enter your ZIP or postal code
                  </p>
                )}
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
                  Please read the {formKind} Certification carefully and scroll
                  to the bottom to provide your consent for electronic delivery
                  of the document.
                </p>
              </div>
              {/* The certified form is built entirely from what was
                submitted, so it is complete and downloadable as soon as it
                is signed. */}
              {data?.submitted && (
                <a
                  href={`${apiBase}/user/tax-info/documents/certification`}
                  download
                  className="flex shrink-0 items-center gap-x-1.5 text-sm font-medium text-primary-500 underline decoration-primary-500/30 transition-colors duration-300 hover:decoration-primary-500 hover:text-primary-600"
                >
                  <Download01 className="size-4" />
                  Download {formKind}
                </a>
              )}
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
                    {(isW9 ? W9_CERTIFICATION : W8BEN_CERTIFICATION).map(
                      (line, i) => (
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
                      )
                    )}
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
                  Please read the certification to the end
                </p>
              )}
            </div>

            <div className="mt-6 grid grid-cols-1 gap-5 md:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <Label
                  htmlFor="tax-signature"
                  className="text-sm font-normal text-dark-blue-400"
                >
                  <span className="font-medium">Signature</span>{" "}
                  <span className="font-light">
                    (Write your Full legal name)
                  </span>
                </Label>
                <Input
                  id="tax-signature"
                  placeholder="Type your name to sign"
                  value={form.signature}
                  isInvalid={
                    showErrors && (signatureMissing || signatureInvalid)
                  }
                  onChange={(e) => set("signature", e.target.value)}
                />
                {showErrors && signatureMissing && (
                  <p className="text-xs font-medium text-error-500">
                    Please type your full legal name to sign
                  </p>
                )}
                {showErrors && signatureInvalid && (
                  <p className="text-xs font-medium text-error-500">
                    Please match the name on your account,{" "}
                    <span className="font-semibold">{accountName}</span>. Update
                    it under Personal Info if it is wrong.
                  </p>
                )}
              </div>

              <div className="flex flex-col gap-1.5">
                <Label
                  htmlFor="tax-signed-date"
                  className="text-sm font-medium text-dark-blue-400"
                >
                  Date
                </Label>
                <Input
                  id="tax-signed-date"
                  placeholder="MM-DD-YYYY"
                  value={form.signedDate}
                  isInvalid={showErrors && signedDateInvalid}
                  readOnly
                />
                {showErrors && signedDateInvalid && (
                  <p className="text-xs font-medium text-error-500">
                    Please enter today's date
                  </p>
                )}
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
                <Label
                  htmlFor="consent-signature"
                  className="text-sm font-normal text-dark-blue-400"
                >
                  I consent to provide an electronic signature by typing my
                  signature above.
                </Label>
              </div>
              {showErrors && !form.consentESignature && (
                <p className="-mt-1.5 text-xs font-medium text-error-500">
                  Please consent to signing electronically
                </p>
              )}
              <div className="flex items-center gap-x-2">
                <Checkbox
                  id="consent-digital"
                  checked={form.consentDigitalDelivery}
                  onCheckedChange={(checked) => {
                    const next = checked === true
                    set("consentDigitalDelivery", next)
                  }}
                />
                <Label
                  htmlFor="consent-digital"
                  className="text-sm font-normal text-dark-blue-400"
                >
                  I consent to receive tax documents digitally.
                </Label>
              </div>
              {showErrors && !form.consentDigitalDelivery && (
                <p className="-mt-1.5 text-xs font-medium text-error-500">
                  Please consent to receiving your tax documents digitally
                </p>
              )}
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
                  {data?.submitted
                    ? `Resubmit ${formKind}`
                    : `Submit ${formKind}`}
                </Button>
              </div>
            </div>

            {saveError && (
              <p className="mt-3 text-xs font-medium text-error-500">
                {saveError}
              </p>
            )}
          </section>
        </div>
      )}
    </div>
  )
}
