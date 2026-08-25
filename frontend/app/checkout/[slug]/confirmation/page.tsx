"use client"

import * as React from "react"
import {
  useParams,
  usePathname,
  useRouter,
  useSearchParams,
} from "next/navigation"
import { UserAPI } from "@/service/http/user"
import {
  getCheckoutProjectSummary,
  titleizeCheckoutSlug,
  type CheckoutProjectSummary,
} from "@/lib/checkout/project-summary"
import { cn } from "@/utils/functions"
import { Bank, Edit03, Users03 } from "@blend-metrics/icons"
import type { UserProfile } from "@/types/user"
import { CheckoutNavigation } from "@/components/checkout-navigation"
import {
  OfferDialog,
  getDefaultJobTitle,
  getExperienceLabel,
  offerRates,
} from "@/components/hire-me-button"
import {
  ApplePay1,
  GPay1,
  Klarna,
  WireTransfer,
} from "@/components/icons/payment-icons"
import NextImage from "@/components/next-image"
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  Badge,
  Button,
  Checkbox,
  Dialog,
  DialogContent,
  ErrorMessage,
} from "@/components/ui"

const formatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
})

type PaymentMethodType =
  | "CREDIT_DEBIT_CARD"
  | "BANK_ACCOUNT"
  | "APPLE_PAY"
  | "GOOGLE_PAY"
  | "KLARNA"
  | "WIRE_TRANSFER"

type PaymentMethodSummary = {
  id: string
  method: PaymentMethodType
  title: string
  subtitle: string
  cardNumber?: string
  accountType?: string
  accountNumber?: string
  saveDefaultPaymentMethod?: boolean
}

type AppliedGiftCard = {
  code: string
  amount: number
}

type PaymentPageSnapshot = {
  pay: "AT_ONCE" | "IN_INSTALLMENTS"
  selectedTalentPaymentPlanId: string
  useBalance?: boolean
  customAmount?: string
  savedInstallmentPaymentMethods: PaymentMethodSummary[]
  fullPaymentMethods: PaymentMethodSummary[]
  hasSplitFullPayment: boolean
  showFullPaymentMethods: boolean
  isAutoSplitEnabled: boolean
  splitPaymentAllocations: Record<string, string>
  firstInstallmentMethods: PaymentMethodSummary[]
  secondInstallmentMethods: PaymentMethodSummary[]
  isWireTransfer: boolean
  giftCards: AppliedGiftCard[]
}

type ReviewPaymentRow = {
  id: string
  method: PaymentMethodSummary
  amount: number
  label: string
  showBillingAddress?: boolean
}

const SPLIT_ELIGIBLE_METHOD_TYPES: PaymentMethodType[] = [
  "CREDIT_DEBIT_CARD",
  "BANK_ACCOUNT",
  "GOOGLE_PAY",
  "APPLE_PAY",
]

const parseCurrencyAmount = (value?: string | null) => {
  if (!value) return undefined
  const numericValue = Number(value.replace(/[^0-9.-]/g, ""))
  return Number.isFinite(numericValue) ? numericValue : undefined
}

const safeDecodeSlug = (value: string): string => {
  try {
    return decodeURIComponent(value)
  } catch {
    return value
  }
}

const Visa = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    width={34}
    height={24}
    viewBox="0 0 34 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <rect x={0.5} y={0.5} width={33} height={23} rx={3.5} fill="#fff" />
    <rect x={0.5} y={0.5} width={33} height={23} rx={3.5} stroke="#D0D5DD" />
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="m10.75 15.858H8.69L7.146 9.792c-.074-.279-.23-.526-.458-.642A6.6 6.6 0 0 0 4.8 8.508v-.233h3.318c.458 0 .801.35.859.758l.8 4.375 2.06-5.133h2.002zm4.234 0h-1.945l1.602-7.584h1.945zm4.118-5.483c.058-.408.401-.642.802-.642a3.53 3.53 0 0 1 1.888.35l.343-1.633a4.8 4.8 0 0 0-1.773-.35c-1.888 0-3.262 1.05-3.262 2.508 0 1.109.973 1.691 1.66 2.042.743.35 1.03.583.972.933 0 .525-.572.758-1.144.758a4.8 4.8 0 0 1-2.002-.467l-.344 1.634c.687.291 1.43.409 2.117.409 2.117.057 3.433-.992 3.433-2.567 0-1.984-2.69-2.1-2.69-2.975m9.498 5.483-1.545-7.584h-1.659a.86.86 0 0 0-.801.584l-2.86 7h2.002l.4-1.108h2.46l.23 1.108zm-2.918-5.541.572 2.858h-1.602z"
      fill="#172B85"
    />
  </svg>
)

const Amex = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    width={34}
    height={24}
    viewBox="0 0 34 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <rect width={34} height={24} rx={4} fill="#1F72CD" />
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="m6.095 8.5-3.18 7.247h3.807l.472-1.156h1.08l.472 1.156h4.192v-.882l.373.882h2.168l.374-.9v.9h8.718l1.06-1.126.992 1.126 4.478.01-3.191-3.613L31.1 8.5h-4.407L25.66 9.605 24.699 8.5h-9.483l-.815 1.87-.833-1.87h-3.8v.852L9.345 8.5zm.737 1.029h1.856l2.11 4.914V9.53h2.034l1.63 3.523 1.502-3.523h2.023v5.2h-1.231l-.01-4.075-1.795 4.075H13.85l-1.805-4.075v4.075H9.512l-.48-1.166H6.437l-.479 1.165H4.601zm17.288 0h-5.007v5.197h4.93l1.588-1.722 1.53 1.722h1.601l-2.326-2.583 2.326-2.614h-1.53l-1.581 1.703zm-16.385.88-.855 2.077h1.71zm12.615 1.146v-.95h3.123l1.363 1.518-1.423 1.526H20.35v-1.036h2.73v-1.058z"
      fill="#fff"
    />
  </svg>
)

const getCardBrandLabel = (method: PaymentMethodSummary) => {
  const source = `${method.title} ${method.subtitle}`.toLowerCase()

  if (source.includes("amex") || source.includes("american express")) {
    return "AMEX"
  }

  if (source.includes("visa")) return "Visa"

  return method.title || "Credit card"
}

const getPaymentMethodLast4 = (method: PaymentMethodSummary) =>
  method.cardNumber?.slice(-4) ||
  method.accountNumber?.slice(-4) ||
  method.subtitle.match(/\*+(\d{4})/)?.[1] ||
  "1234"

const getMethodTitle = (method: PaymentMethodSummary) => {
  if (method.method === "CREDIT_DEBIT_CARD") {
    return `${getCardBrandLabel(method)} ${method.title.toLowerCase().includes("debit") ? "debit card" : "credit card"} ending in *${getPaymentMethodLast4(method)}`
  }

  if (method.method === "BANK_ACCOUNT") {
    const accountType = method.accountType || "checking"
    return `${method.title} ${accountType.toLowerCase()} ending in *${getPaymentMethodLast4(method)}`
  }

  if (method.method === "WIRE_TRANSFER") return "Wire transfer"
  if (method.method === "GOOGLE_PAY") return "Google Pay"
  if (method.method === "APPLE_PAY") return "Apple Pay"
  if (method.method === "KLARNA") return "Klarna"

  return method.title
}

const PaymentMethodIcon = ({ method }: { method: PaymentMethodSummary }) => {
  if (method.method === "BANK_ACCOUNT") {
    return (
      <div className="inline-flex h-[31px] w-[46.5px] shrink-0 items-center justify-center rounded-[4px] border border-gray-200 bg-white text-gray-500">
        <Bank className="size-4" />
      </div>
    )
  }

  if (method.method === "GOOGLE_PAY") {
    return <GPay1 className="h-[31px] w-[46.5px] shrink-0" />
  }

  if (method.method === "APPLE_PAY") {
    return <ApplePay1 className="h-[31px] w-[46.5px] shrink-0" />
  }

  if (method.method === "KLARNA") {
    return <Klarna className="h-[31px] w-[46.5px] shrink-0" />
  }

  if (method.method === "WIRE_TRANSFER") {
    return <WireTransfer className="h-[31px] w-[46.5px] shrink-0" />
  }

  return getCardBrandLabel(method).toLowerCase().includes("amex") ? (
    <Amex className="h-[30px] w-[45px] shrink-0" />
  ) : (
    <Visa className="h-[30px] w-[45px] shrink-0" />
  )
}

export default function ConfirmationPage() {
  const params = useParams()
  const pathname = usePathname()
  const router = useRouter()
  const searchParams = useSearchParams()
  const slug = params.slug as string
  const isTalentCheckout = pathname.startsWith("/talent-checkout/")
  const basePath = isTalentCheckout ? "/talent-checkout" : "/checkout"
  const decodedSlug = safeDecodeSlug(slug)
  const safeSlugSegment = encodeURIComponent(decodedSlug)
  const [talentProfile, setTalentProfile] = React.useState<UserProfile | null>(
    null
  )
  const [projectSummary, setProjectSummary] =
    React.useState<CheckoutProjectSummary | null>(null)
  const [isEditOfferOpen, setIsEditOfferOpen] = React.useState(false)
  const [hasAuthorizedPayment, setHasAuthorizedPayment] = React.useState(false)
  const [authorizationError, setAuthorizationError] = React.useState("")
  const [isSubmittingPayment, setIsSubmittingPayment] = React.useState(false)
  const [submitError, setSubmitError] = React.useState("")
  const [paymentSnapshot, setPaymentSnapshot] =
    React.useState<PaymentPageSnapshot | null>(null)
  const [legalDialog, setLegalDialog] = React.useState<
    "terms" | "privacy" | null
  >(null)
  const [hasHydratedPaymentState, setHasHydratedPaymentState] =
    React.useState(false)
  const [hasSubmittedOrder, setHasSubmittedOrder] = React.useState(false)
  const hasAuthorizationError = authorizationError.length > 0
  const authorizationSectionRef = React.useRef<HTMLDivElement | null>(null)
  const paymentStateStorageKey = React.useMemo(
    () => `checkout-payment-state:${basePath}:${decodedSlug}`,
    [basePath, decodedSlug]
  )
  const submittedOrderStorageKey = React.useMemo(
    () => `checkout-order-submitted:${basePath}:${decodedSlug}`,
    [basePath, decodedSlug]
  )

  React.useEffect(() => {
    if (!isTalentCheckout) return

    let isActive = true

    const loadTalentProfile = async () => {
      try {
        const response = await UserAPI.getByUsername(decodedSlug)
        if (isActive && response?.data) {
          setTalentProfile(response.data)
        }
      } catch {
        if (isActive) {
          setTalentProfile(null)
        }
      }
    }

    loadTalentProfile()

    return () => {
      isActive = false
    }
  }, [decodedSlug, isTalentCheckout])

  React.useEffect(() => {
    if (isTalentCheckout) return

    let isActive = true

    const loadProjectSummary = async () => {
      try {
        const summary = await getCheckoutProjectSummary(decodedSlug)
        if (isActive) {
          setProjectSummary(summary)
        }
      } catch {
        if (isActive) {
          setProjectSummary(null)
        }
      }
    }

    loadProjectSummary()

    return () => {
      isActive = false
    }
  }, [decodedSlug, isTalentCheckout])

  React.useEffect(() => {
    if (typeof window === "undefined") return

    try {
      const rawSnapshot = window.sessionStorage.getItem(paymentStateStorageKey)
      if (rawSnapshot) {
        setPaymentSnapshot(JSON.parse(rawSnapshot) as PaymentPageSnapshot)
      }
      setHasSubmittedOrder(
        window.sessionStorage.getItem(submittedOrderStorageKey) === "true"
      )
    } catch {
      setPaymentSnapshot(null)
    } finally {
      setHasHydratedPaymentState(true)
    }
  }, [paymentStateStorageKey, submittedOrderStorageKey])

  const selectedRateValue = searchParams.get("rate") || "web-development"
  const selectedSchedule = searchParams.get("schedule") || "full-time"
  const selectedDuration = searchParams.get("duration") || "Ongoing"
  const selectedRate =
    offerRates.find((rate) => rate.value === selectedRateValue) ||
    offerRates.find((rate) => rate.value === "web-development") ||
    offerRates[0]
  // See checkout/[slug]/page.tsx — a custom rate has no offerRates tile, so
  // it travels as its own param and wins over the tile price here.
  const customRateParam = Number(searchParams.get("customRate"))
  const hourlyRate =
    Number.isFinite(customRateParam) && customRateParam > 0
      ? customRateParam
      : Number(selectedRate?.price.replace(/[^0-9.]/g, "") || 0)
  const estimatedTaxHourly = hourlyRate * 0.07
  const totalHourlyRate = hourlyRate + estimatedTaxHourly
  const monthlyHours = 160
  const estimatedMonthlyCost = totalHourlyRate * monthlyHours
  const addOnMonthlyTotal = 340 * 4
  const dueTodayTotal = estimatedMonthlyCost + addOnMonthlyTotal
  const formattedHourlyRate = `$${hourlyRate.toFixed(0)}/hr`
  const formattedEstimatedTaxHourly = `$${estimatedTaxHourly.toFixed(2)}/hr`
  const formattedTotalHourlyRate = `$${totalHourlyRate.toFixed(2)}/hr`
  const formattedMonthlyCost = `${formatter.format(Math.round(estimatedMonthlyCost))}/mo`
  const formattedAddOnMonthlyTotal = `${formatter.format(Math.round(addOnMonthlyTotal))}/mo`
  const formattedDueToday = formatter.format(Math.round(dueTodayTotal))
  const talentName =
    talentProfile?.firstName ||
    decodedSlug.split("-")[0]?.replace(/^./, (char) => char.toUpperCase()) ||
    "Alex"
  const talentUsername = talentProfile?.username || decodedSlug
  const talentAvatarUrl = talentProfile?.avatarUrl || ""
  const talentJobTitle = getDefaultJobTitle(talentProfile)
  const talentExperienceLabel = getExperienceLabel(talentProfile)
  const checkoutProjectTitle =
    projectSummary?.title || titleizeCheckoutSlug(decodedSlug)
  const checkoutProjectImage = projectSummary?.mediaUrl || "/dashboard.png"
  const checkoutProjectTeamLabel =
    projectSummary?.teamMemberCount !== null &&
    projectSummary?.teamMemberCount !== undefined
      ? `${projectSummary.teamMemberCount} team members`
      : "Team details unavailable"
  const checkoutProjectDateRange =
    projectSummary?.dateRangeLabel || "Timeline unavailable"
  const scheduleTitle =
    selectedSchedule === "part-time" ? "Part time" : "Full time"
  const scheduleDetail =
    selectedSchedule === "part-time" ? "Up to 30 hrs/week" : "Over 30 hrs/week"
  const durationBadgeLabel =
    selectedDuration === "Ongoing" ? "On-Going" : selectedDuration
  const recurringAmountLabel =
    selectedDuration === "Ongoing"
      ? `Monthly Payment Amount: ${formattedDueToday}`
      : `Payment Amount: ${formattedDueToday}`
  const projectCost = 94_000
  const estimatedProjectTax = 4_000
  const fullAmount = projectCost + estimatedProjectTax
  const projectDurationMonths = 8
  const installmentAmount = fullAmount / projectDurationMonths
  const paymentPlan = paymentSnapshot?.pay || "AT_ONCE"
  const amountDueBeforeCredits =
    paymentPlan === "IN_INSTALLMENTS" ? installmentAmount : fullAmount
  const balanceAmountParam = parseCurrencyAmount(searchParams.get("balance"))
  const availableBalance =
    balanceAmountParam === undefined ? 4000 : Math.max(balanceAmountParam, 0)
  const customBalanceAmount = parseCurrencyAmount(paymentSnapshot?.customAmount)
  const appliedBalanceAmount =
    paymentSnapshot?.useBalance === false
      ? 0
      : paymentSnapshot?.customAmount && customBalanceAmount !== undefined
        ? Math.min(
            customBalanceAmount,
            availableBalance,
            amountDueBeforeCredits
          )
        : Math.min(availableBalance, amountDueBeforeCredits)
  const totalGiftCardAmount = (paymentSnapshot?.giftCards || []).reduce(
    (total, giftCard) => total + giftCard.amount,
    0
  )
  const totalDueToday = Math.max(
    amountDueBeforeCredits - appliedBalanceAmount - totalGiftCardAmount,
    0
  )
  const fullPaymentMethods = paymentSnapshot?.fullPaymentMethods || []
  const firstInstallmentMethods = paymentSnapshot?.firstInstallmentMethods || []
  const secondInstallmentMethods =
    paymentSnapshot?.secondInstallmentMethods || []
  const isSplitPayment =
    paymentPlan === "AT_ONCE" &&
    Boolean(paymentSnapshot?.hasSplitFullPayment) &&
    fullPaymentMethods.length > 1
  const splitPaymentMethods = fullPaymentMethods.filter((method) =>
    SPLIT_ELIGIBLE_METHOD_TYPES.includes(method.method)
  )
  const autoSplitAmounts = React.useMemo(() => {
    if (!isSplitPayment || splitPaymentMethods.length === 0) return {}

    const totalCents = Math.round(totalDueToday * 100)
    const baseCents = Math.floor(totalCents / splitPaymentMethods.length)
    let remainderCents = totalCents - baseCents * splitPaymentMethods.length

    return splitPaymentMethods.reduce<Record<string, number>>(
      (amounts, method) => {
        const extraCent = remainderCents > 0 ? 1 : 0
        remainderCents -= extraCent
        amounts[method.id] = (baseCents + extraCent) / 100
        return amounts
      },
      {}
    )
  }, [isSplitPayment, splitPaymentMethods, totalDueToday])
  const getSplitAmount = React.useCallback(
    (method: PaymentMethodSummary) =>
      paymentSnapshot?.isAutoSplitEnabled
        ? (autoSplitAmounts[method.id] ?? 0)
        : (parseCurrencyAmount(
            paymentSnapshot?.splitPaymentAllocations?.[method.id]
          ) ?? 0),
    [autoSplitAmounts, paymentSnapshot]
  )
  const oneTimePaymentRows: ReviewPaymentRow[] = isSplitPayment
    ? splitPaymentMethods.map((method) => ({
        id: method.id,
        method,
        amount: getSplitAmount(method),
        label: "Payment Amount",
        showBillingAddress: method.method === "CREDIT_DEBIT_CARD",
      }))
    : fullPaymentMethods.map((method) => ({
        id: method.id,
        method,
        amount: totalDueToday,
        label: "Payment Amount",
        showBillingAddress: method.method === "CREDIT_DEBIT_CARD",
      }))
  const initialInstallmentRows: ReviewPaymentRow[] =
    firstInstallmentMethods.map((method) => ({
      id: method.id,
      method,
      amount: totalDueToday,
      label: "Payment Amount",
      showBillingAddress: method.method === "CREDIT_DEBIT_CARD",
    }))
  const recurringInstallmentRows: ReviewPaymentRow[] =
    secondInstallmentMethods.map((method) => ({
      id: method.id,
      method,
      amount: installmentAmount,
      label: "Monthly Payment Amount",
      showBillingAddress: method.method === "CREDIT_DEBIT_CARD",
    }))
  const projectPaymentRows =
    paymentPlan === "IN_INSTALLMENTS"
      ? [...initialInstallmentRows, ...recurringInstallmentRows]
      : oneTimePaymentRows
  const hasProjectPaymentRows = projectPaymentRows.length > 0
  const authorizationAmountLabel =
    paymentPlan === "IN_INSTALLMENTS"
      ? `initial one-time payment of ${formatter.format(totalDueToday)} and monthly recurring amount of ${formatter.format(installmentAmount)} starting on January 1st, 2025`
      : `total one-time amount of ${formatter.format(totalDueToday)}`

  const updateOfferInUrl = React.useCallback(
    (
      nextRate: string,
      nextSchedule: string,
      nextDuration: string,
      nextCustomRate?: string
    ) => {
      const nextSearchParams = new URLSearchParams(searchParams.toString())
      nextSearchParams.set("rate", nextRate)
      nextSearchParams.set("schedule", nextSchedule)
      nextSearchParams.set("duration", nextDuration)
      // Deleted, not just skipped, when the offer moves back to a predefined
      // tile — otherwise a customRate left over from a previous edit would
      // keep overriding the newly-picked tile's price.
      if (nextCustomRate) {
        nextSearchParams.set("customRate", nextCustomRate)
      } else {
        nextSearchParams.delete("customRate")
      }
      router.replace(`${pathname}?${nextSearchParams.toString()}`, {
        scroll: false,
      })
    },
    [pathname, router, searchParams]
  )

  const handleEditPaymentMethods = React.useCallback(() => {
    const nextUrl = searchParams.toString()
      ? `${basePath}/${safeSlugSegment}/payment?${searchParams.toString()}`
      : `${basePath}/${safeSlugSegment}/payment`
    router.push(nextUrl)
  }, [basePath, router, safeSlugSegment, searchParams])

  const handleEditProjectDetails = React.useCallback(() => {
    const nextUrl = searchParams.toString()
      ? `${basePath}/${safeSlugSegment}?${searchParams.toString()}`
      : `${basePath}/${safeSlugSegment}`
    router.push(nextUrl)
  }, [basePath, router, safeSlugSegment, searchParams])

  const handleSubmitPayment = () => {
    if (hasSubmittedOrder) return

    if (!isTalentCheckout && !hasHydratedPaymentState) return

    if (!isTalentCheckout && !hasProjectPaymentRows) {
      setSubmitError(
        "Your payment method is no longer valid. Please go back and select a different payment method."
      )
      return
    }

    if (!hasAuthorizedPayment) {
      setAuthorizationError("Please confirm authorization")
      requestAnimationFrame(() => {
        authorizationSectionRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "center",
        })
      })
      return
    }

    setSubmitError("")
    setIsSubmittingPayment(true)
    window.setTimeout(() => {
      window.sessionStorage.setItem(submittedOrderStorageKey, "true")
      setHasSubmittedOrder(true)
      router.push(`${basePath}/${safeSlugSegment}/thank-you`)
    }, 300)
  }

  const renderReviewPaymentRow = (
    row: ReviewPaymentRow,
    options?: { isLast?: boolean }
  ) => (
    <div
      key={row.id}
      className={cn(
        "grid grid-cols-2 gap-x-6 py-4",
        !options?.isLast && "border-b border-gray-200"
      )}
    >
      <div className="flex items-start gap-x-3">
        <PaymentMethodIcon method={row.method} />
        <div className="flex-auto space-y-1">
          <h2 className="text-sm font-semibold text-dark-blue-400">
            {getMethodTitle(row.method)}
          </h2>
          {row.method.method === "CREDIT_DEBIT_CARD" ? (
            <p className="text-xs font-light text-dark-blue-400">
              Expires: 09/2027
            </p>
          ) : null}
          <p className="text-xs font-light text-dark-blue-400">
            {row.label}:{" "}
            <span className="font-semibold">
              {formatter.format(row.amount)}
            </span>
          </p>
        </div>
      </div>

      {row.showBillingAddress ? (
        <div className="space-y-1 px-3">
          <h2 className="text-sm font-semibold text-dark-blue-400">
            Billing Address
          </h2>
          <p className="text-xs font-light text-dark-blue-400">
            2125 Chestnut Street, San Francisco, CA 94123
          </p>
        </div>
      ) : (
        <div />
      )}
    </div>
  )

  const renderSidebarPaymentRow = (row: ReviewPaymentRow) => (
    <article key={row.id} className="flex items-start gap-x-3">
      <PaymentMethodIcon method={row.method} />
      <div className="flex-auto space-y-1 border-b border-gray-300 pb-3">
        <h1 className="text-sm font-medium text-dark-blue-400">
          {formatter.format(row.amount)}
        </h1>
        <p className="text-xs font-light uppercase text-dark-blue-400">
          {row.method.method === "BANK_ACCOUNT"
            ? `${row.method.title} *${getPaymentMethodLast4(row.method)}`
            : row.method.method === "CREDIT_DEBIT_CARD"
              ? `${getCardBrandLabel(row.method)} *${getPaymentMethodLast4(row.method)}`
              : getMethodTitle(row.method)}
        </p>
      </div>
    </article>
  )

  return (
    <div className="bg-gray-50 pt-[64px]">
      <CheckoutNavigation
        currentStep={3}
        logoHref=""
        firstStepLabel={
          isTalentCheckout ? "Contract Details" : "Project Details"
        }
      />

      <div className="px-[150px] py-[50px]">
        <Button
          className="mb-6 px-0"
          variant="link"
          visual="gray"
          onClick={handleEditPaymentMethods}
        >
          {"<-"} Back
        </Button>
        <h1 className="text-2xl font-bold text-dark-blue-400">
          Review your order details
        </h1>
        <p className="mt-3 text-base font-light text-dark-blue-400">
          Then click{" "}
          <span className="font-normal">&quot;Submit payment&quot;</span> below
          to confirm your {isTalentCheckout ? "team" : "project"}
        </p>

        <div className="mt-6 flex gap-x-8">
          <div className="flex-auto">
            {isTalentCheckout ? (
              <>
                <div className="rounded-lg border border-gray-200 bg-white shadow-[0px_1px_5px_0px_rgba(16,24,40,.02)]">
                  <div className="py-5 px-6 border-b flex items-center justify-between border-gray-200">
                    <h1 className="text-lg font-semibold text-dark-blue-400">
                      Contract Details
                    </h1>

                    <Button
                      variant="link"
                      visual="primary"
                      onClick={() => setIsEditOfferOpen(true)}
                    >
                      <Edit03 className="size-[15px]" />
                      Edit Offer
                    </Button>
                  </div>

                  <div className="p-5 flex items-center gap-x-5">
                    <Avatar className="size-[76px] shrink-0">
                      <AvatarImage src={talentAvatarUrl} alt={talentName} />
                      <AvatarFallback>{talentName.charAt(0)}</AvatarFallback>
                    </Avatar>

                    <div className="flex-auto">
                      <div className="inline-flex items-center gap-x-1.5">
                        <h1 className="text-[14px] font-bold leading-[16.26px] text-dark-blue-400">
                          {talentName}
                        </h1>
                        <span className="text-[12px] leading-[16.26px] font-light text-dark-blue-400">
                          @{talentUsername}
                        </span>
                      </div>
                      <p className="mt-1 text-[12px] font-medium text-dark-blue-400">
                        {talentJobTitle}
                      </p>
                      <p className="mt-0.5 text-[12px] font-normal leading-normal text-gray-500">
                        {talentExperienceLabel}
                      </p>
                      <div className="mt-3">
                        <span className="text-[13px] leading-none font-semibold text-dark-blue-400">
                          Start Date: Feb 5th, 2025
                        </span>
                      </div>
                    </div>

                    <div className="inline-flex flex-col items-end justify-between self-stretch">
                      <Badge size="sm" visual="primary">
                        {durationBadgeLabel}
                      </Badge>
                      <div className="inline-flex flex-col items-end gap-y-0.5">
                        <span className="inline-block text-dark-blue-400 text-[20px] leading-none font-semibold">
                          {formattedHourlyRate}
                        </span>
                        <span className="mt-[2px] inline-flex items-center gap-x-1.5 text-xs leading-none text-dark-blue-400">
                          <span className="font-medium">{scheduleTitle}</span>
                          <span className="font-normal">{scheduleDetail}</span>
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="rounded-lg mt-6 border border-gray-200 bg-white shadow-[0px_1px_5px_0px_rgba(16,24,40,.02)]">
                  <div className="py-5 px-6 border-b flex items-center justify-between border-gray-200">
                    <h1 className="text-lg font-semibold text-dark-blue-400">
                      Payment Methods
                    </h1>

                    <Button
                      variant="link"
                      visual="primary"
                      onClick={handleEditProjectDetails}
                    >
                      <Edit03 className="size-[15px]" />
                      Edit
                    </Button>
                  </div>

                  <div className="p-6">
                    <h1 className="text-base font-semibold text-dark-blue-400">
                      Initial One-Time Payment
                    </h1>

                    <div className="grid grid-cols-2">
                      <div className="border-b flex col-span-2 items-start gap-x-3 border-gray-200 py-4">
                        <div className="inline-flex items-center rounded-[4px] shrink-0 bg-white border border-gray-200 text-gray-500 justify-center w-[46.5px] h-[31px]">
                          <Bank className="size-4" />
                        </div>
                        <div className="flex-auto space-y-1">
                          <h2 className="text-sm font-semibold text-dark-blue-400">
                            Bank of America checking ending in *1234
                          </h2>
                          <p className="text-xs font-light text-dark-blue-400">
                            Payment Amount:{" "}
                            <span className="font-semibold">
                              {formattedDueToday}
                            </span>
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="mt-6">
                      <h1 className="text-lg font-semibold text-dark-blue-400">
                        Recurring Payments
                      </h1>

                      <div className="grid grid-cols-2">
                        <div className="border-b flex items-start gap-x-3 border-gray-200 py-4">
                          <Amex className="h-[30px] w-[45px] shrink-0" />
                          <div className="flex-auto space-y-1">
                            <h2 className="text-sm font-semibold text-dark-blue-400">
                              AMEX credit card ending in *1234
                            </h2>
                            <p className="text-xs font-light text-dark-blue-400">
                              Expires: 09/2027
                            </p>
                            <p className="text-xs font-light text-dark-blue-400">
                              {recurringAmountLabel}
                            </p>
                          </div>
                        </div>

                        <div className="border-b border-gray-200 py-4 px-3">
                          <div className="space-y-1">
                            <h2 className="text-sm font-semibold text-dark-blue-400">
                              Billing Address
                            </h2>
                            <p className="text-xs font-light text-dark-blue-400">
                              2125 Chestnut Street, San Francisco, CA 94123
                            </p>
                          </div>
                        </div>

                        <div className="flex items-start gap-x-3 py-4">
                          <Visa className="h-[30px] w-[45px] shrink-0" />
                          <div className="flex-auto space-y-1">
                            <h2 className="text-sm font-semibold text-dark-blue-400">
                              Visa debit card ending in *1234
                            </h2>
                            <p className="text-xs font-light text-dark-blue-400">
                              Expires: 09/2027
                            </p>
                            <p className="text-xs font-light text-dark-blue-400">
                              {recurringAmountLabel}
                            </p>
                          </div>
                        </div>

                        <div className="py-4 px-3">
                          <div className="space-y-1">
                            <h2 className="text-sm font-semibold text-dark-blue-400">
                              Billing Address
                            </h2>
                            <p className="text-xs font-light text-dark-blue-400">
                              2125 Chestnut Street, San Francisco, CA 94123
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div
                      ref={authorizationSectionRef}
                      className={cn(
                        "mt-6 rounded-md py-2 px-5 transition-colors",
                        hasAuthorizationError &&
                          "border border-error-300 bg-error-50"
                      )}
                    >
                      <label
                        className="flex cursor-pointer items-start gap-x-5"
                        htmlFor="talent-payment-authorization"
                      >
                        <Checkbox
                          checked={hasAuthorizedPayment}
                          className={cn(
                            hasAuthorizationError &&
                              "border-error-500 hover:border-error-500 hover:ring-error-50 active:ring-error-50"
                          )}
                          id="talent-payment-authorization"
                          onCheckedChange={(checked) => {
                            const nextChecked = checked === true
                            setHasAuthorizedPayment(nextChecked)
                            if (nextChecked) {
                              setAuthorizationError("")
                            }
                          }}
                          size="lg"
                        />
                        <span
                          className={cn(
                            "text-sm font-light text-dark-blue-400",
                            hasAuthorizationError && "text-error-500"
                          )}
                        >
                          I hereby authorize{" "}
                          <span className="font-semibold">Marketeq</span> to
                          charge my above payment methods for the total initial
                          one-time payment of{" "}
                          <span className="font-semibold">
                            {formattedDueToday}
                          </span>{" "}
                          and total monthly recurring amount of{" "}
                          <span className="font-semibold">
                            {formattedDueToday}
                          </span>{" "}
                          starting on{" "}
                          <span className="font-semibold">
                            January 1st, 2025
                          </span>
                        </span>
                      </label>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="rounded-lg border border-gray-200 bg-white shadow-[0px_1px_5px_0px_rgba(16,24,40,.02)]">
                  <div className="py-5 px-6 border-b flex items-center justify-between border-gray-200">
                    <h1 className="text-lg font-semibold text-dark-blue-400">
                      Project Details
                    </h1>

                    <Button
                      variant="link"
                      visual="primary"
                      onClick={handleEditPaymentMethods}
                    >
                      <Edit03 className="size-[15px]" />
                      Edit
                    </Button>
                  </div>
                  <div className="p-5 flex gap-x-5">
                    <div className="relative flex-none w-[181px] bg-white border border-gray-200 rounded-md overflow-hidden">
                      <NextImage
                        className="object-cover"
                        src={checkoutProjectImage}
                        alt={checkoutProjectTitle}
                        sizes="50vw"
                        fill
                      />
                    </div>
                    <div className="flex-auto">
                      <h1 className="text-sm font-medium text-dark-blue-400">
                        {checkoutProjectTitle}
                      </h1>

                      <div className="mt-1.5 inline-flex gap-x-2">
                        <Users03 className="size-[15px] shrink-0" />
                        <span className="text-xs leading-5 font-semibold text-dark-blue-400">
                          {checkoutProjectTeamLabel}
                        </span>
                      </div>

                      <div className="mt-1.5 leading-5 text-[13px] text-dark-blue-400">
                        {checkoutProjectDateRange}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="rounded-lg mt-8 border border-gray-200 bg-white shadow-[0px_1px_5px_0px_rgba(16,24,40,.02)]">
                  <div className="py-5 px-6 border-b flex items-center justify-between border-gray-200">
                    <h1 className="text-lg font-semibold text-dark-blue-400">
                      Payment Methods
                    </h1>

                    <Button
                      variant="link"
                      visual="primary"
                      onClick={handleEditPaymentMethods}
                    >
                      <Edit03 className="size-[15px]" />
                      Edit
                    </Button>
                  </div>
                  <div className="p-6">
                    {!hasHydratedPaymentState ? (
                      <div className="space-y-3">
                        <div className="h-14 rounded bg-gray-100" />
                        <div className="h-14 rounded bg-gray-100" />
                        <div className="h-14 rounded bg-gray-100" />
                      </div>
                    ) : hasProjectPaymentRows ? (
                      <>
                        {paymentPlan === "IN_INSTALLMENTS" ? (
                          <>
                            <h1 className="text-base font-semibold text-dark-blue-400">
                              Initial One-Time Payment
                            </h1>
                            <div className="mt-2">
                              {initialInstallmentRows.length > 0
                                ? initialInstallmentRows.map((row, index) =>
                                    renderReviewPaymentRow(row, {
                                      isLast:
                                        index ===
                                        initialInstallmentRows.length - 1,
                                    })
                                  )
                                : null}
                            </div>

                            <h1 className="mt-6 text-lg font-semibold text-dark-blue-400">
                              Recurring Payments
                            </h1>
                            <div className="mt-2">
                              {recurringInstallmentRows.map((row, index) =>
                                renderReviewPaymentRow(row, {
                                  isLast:
                                    index ===
                                    recurringInstallmentRows.length - 1,
                                })
                              )}
                            </div>
                          </>
                        ) : (
                          <div>
                            {oneTimePaymentRows.map((row, index) =>
                              renderReviewPaymentRow(row, {
                                isLast: index === oneTimePaymentRows.length - 1,
                              })
                            )}
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="rounded-md border border-error-200 bg-error-50 p-4 text-sm text-error-500">
                        We were unable to load your order summary. Please try
                        again or contact support.
                      </div>
                    )}

                    <div
                      ref={authorizationSectionRef}
                      className={cn(
                        "mt-6 rounded-md py-2 px-5 transition-colors",
                        hasAuthorizationError &&
                          "border border-error-300 bg-error-50"
                      )}
                    >
                      <label
                        className="flex cursor-pointer items-start gap-x-5"
                        htmlFor="project-payment-authorization"
                      >
                        <Checkbox
                          checked={hasAuthorizedPayment}
                          className={cn(
                            hasAuthorizationError &&
                              "border-error-500 hover:border-error-500 hover:ring-error-50 active:ring-error-50"
                          )}
                          id="project-payment-authorization"
                          onCheckedChange={(checked) => {
                            const nextChecked = checked === true
                            setHasAuthorizedPayment(nextChecked)
                            if (nextChecked) {
                              setAuthorizationError("")
                            }
                          }}
                          size="lg"
                        />
                        <span
                          className={cn(
                            "text-sm font-light text-dark-blue-400",
                            hasAuthorizationError && "text-error-500"
                          )}
                        >
                          I hereby authorize{" "}
                          <span className="font-semibold">Marketeq</span> to
                          charge my above payment methods for the{" "}
                          <span className="font-semibold">
                            {authorizationAmountLabel}
                          </span>
                        </span>
                      </label>
                      {hasAuthorizationError ? (
                        <ErrorMessage className="mt-3" size="sm">
                          {authorizationError}
                        </ErrorMessage>
                      ) : null}
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>

          <div className="w-[305px] shrink-0">
            <div className="w-[305px] shrink-0 p-5 rounded-lg bg-white border border-gray-200 shadow-[0px_1px_5px_0px_rgba(16,24,40,.02)]">
              <div className="border-b pb-4 border-gray-200">
                <h1 className="text-base leading-none font-semibold text-dark-blue-400">
                  Price Details
                </h1>
              </div>

              {isTalentCheckout ? (
                <>
                  <div className="mt-5 border-b pb-4 border-gray-200">
                    <div className="mt-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="inline-block text-xs leading-none text-dark-blue-400 font-light">
                          Hourly Rate
                        </span>
                        <span className="inline-block text-xs leading-none text-dark-blue-400 font-light">
                          {formattedHourlyRate}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="inline-block text-xs leading-none text-dark-blue-400 font-light">
                          Estimated tax *
                        </span>
                        <span className="inline-block text-xs leading-none text-dark-blue-400 font-light">
                          {formattedEstimatedTaxHourly}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="inline-block text-xs leading-none text-dark-blue-400 font-light">
                          Total Hourly rate
                        </span>
                        <span className="inline-block text-xs leading-none text-dark-blue-400 font-light">
                          {formattedTotalHourlyRate}
                        </span>
                      </div>
                    </div>

                    <div className="flex mt-4 items-center justify-between">
                      <h1 className="inline-block text-base font-bold leading-none text-dark-blue-400">
                        Estimated Monthly Cost
                      </h1>
                      <h1 className="inline-block text-base font-bold leading-none text-dark-blue-400">
                        {formattedMonthlyCost}
                      </h1>
                    </div>
                  </div>

                  <div className="mt-5 border-b pb-4 border-gray-200">
                    <h1 className="text-base leading-none font-semibold text-dark-blue-400">
                      Add-ons
                    </h1>

                    <div className="mt-4 flex items-start justify-between gap-x-3">
                      <span className="inline-flex flex-col">
                        <span className="inline-block text-xs leading-none text-dark-blue-400 font-light">
                          Project Manager
                        </span>
                        <Button
                          className="mt-1 h-auto justify-start px-0 text-[10px] leading-[14px] underline"
                          variant="link"
                          visual="gray"
                        >
                          Remove
                        </Button>
                      </span>
                      <span className="inline-flex flex-col items-end">
                        <span className="inline-block text-xs leading-none text-dark-blue-400 font-light">
                          Est. $85/hr
                        </span>
                        <span className="inline-block mt-1 text-[10px] leading-[14px] text-dark-blue-400 font-light">
                          4hrs/week
                        </span>
                      </span>
                    </div>

                    <div className="mt-5 flex items-center justify-between">
                      <span className="inline-block text-xs leading-none text-dark-blue-400 font-light">
                        Estimated Monthly Total
                      </span>
                      <h1 className="inline-block text-base font-bold leading-none text-dark-blue-400">
                        {formattedAddOnMonthlyTotal}
                      </h1>
                    </div>
                  </div>

                  <div className="mt-4">
                    <div className="flex items-center justify-between">
                      <span className="inline-block text-base font-bold leading-none text-dark-blue-400">
                        Due today
                      </span>
                      <h1 className="inline-block text-base font-bold leading-none text-dark-blue-400">
                        {formattedDueToday}
                      </h1>
                    </div>

                    <div className="grid mt-5">
                      <Button
                        disabled={isSubmittingPayment}
                        onClick={handleSubmitPayment}
                        visual={hasAuthorizationError ? "error" : "primary"}
                      >
                        {isSubmittingPayment
                          ? "Submitting..."
                          : "Submit Payment"}
                      </Button>
                    </div>
                    {hasAuthorizationError ? (
                      <ErrorMessage className="mt-2 text-center" size="sm">
                        {authorizationError}
                      </ErrorMessage>
                    ) : null}

                    <div className="mt-5">
                      <span className="inline-block text-center text-[10px] font-light text-dark-blue-400 leading-[14px]">
                        Learn More about{" "}
                        <Button
                          className="text-[10px] leading-[14px] underline"
                          variant="link"
                        >
                          Estimated Taxes
                        </Button>
                      </span>
                    </div>

                    <div className="mt-5">
                      <span className="inline-block text-center text-[10px] font-light text-dark-blue-400 leading-[14px]">
                        By clicking the above, you agree to Marketeq&apos;s{" "}
                        <Button
                          className="text-[10px] leading-[14px] underline"
                          variant="link"
                          onClick={() => setLegalDialog("terms")}
                        >
                          Terms of Use
                        </Button>{" "}
                        and{" "}
                        <Button
                          className="text-[10px] leading-[14px] underline"
                          variant="link"
                          onClick={() => setLegalDialog("privacy")}
                        >
                          Privacy Policy
                        </Button>
                      </span>
                    </div>

                    <div className="mt-5 flex items-center justify-center">
                      <Button variant="link" visual="gray">
                        Add Gift Card / Promo Code
                      </Button>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="mt-5 border-b pb-4 border-gray-200">
                    <div className="mt-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="inline-block text-xs leading-none text-dark-blue-400 font-light">
                          Project cost
                        </span>
                        <span className="inline-block text-xs leading-none text-dark-blue-400 font-light">
                          {formatter.format(projectCost)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="inline-block text-xs leading-none text-dark-blue-400 font-light">
                          Estimated tax *
                        </span>
                        <span className="inline-block text-xs leading-none text-dark-blue-400 font-light">
                          {formatter.format(estimatedProjectTax)}
                        </span>
                      </div>
                      {paymentPlan === "IN_INSTALLMENTS" ? (
                        <>
                          <div className="flex items-center justify-between">
                            <span className="inline-block text-xs leading-none text-dark-blue-400 font-light">
                              Initial payment
                            </span>
                            <span className="inline-block text-xs leading-none text-dark-blue-400 font-light">
                              {formatter.format(installmentAmount)}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="inline-block text-xs leading-none text-dark-blue-400 font-light">
                              Recurring payment
                            </span>
                            <span className="inline-block text-xs leading-none text-dark-blue-400 font-light">
                              {formatter.format(installmentAmount)}
                            </span>
                          </div>
                        </>
                      ) : null}
                      {appliedBalanceAmount > 0 ? (
                        <div className="flex items-center justify-between">
                          <span className="inline-block text-xs leading-none text-dark-blue-400 font-light">
                            Balance applied
                          </span>
                          <span className="inline-block text-xs leading-none text-dark-blue-400 font-light">
                            - {formatter.format(appliedBalanceAmount)}
                          </span>
                        </div>
                      ) : null}
                      {totalGiftCardAmount > 0 ? (
                        <div className="flex items-center justify-between">
                          <span className="inline-block text-xs leading-none text-dark-blue-400 font-light">
                            {paymentSnapshot?.giftCards.length || 0}{" "}
                            {(paymentSnapshot?.giftCards.length || 0) === 1
                              ? "Gift card applied"
                              : "Gift cards applied"}
                          </span>
                          <span className="inline-block text-xs leading-none text-dark-blue-400 font-light">
                            - {formatter.format(totalGiftCardAmount)}
                          </span>
                        </div>
                      ) : null}
                    </div>

                    <div className="flex mt-4 items-center justify-between">
                      <h1 className="inline-block text-base font-bold leading-none text-dark-blue-400">
                        {paymentPlan === "IN_INSTALLMENTS"
                          ? "Total Due Today"
                          : "Total"}
                      </h1>
                      <h1 className="inline-block text-base font-bold leading-none text-dark-blue-400">
                        {formatter.format(totalDueToday)}
                      </h1>
                    </div>
                  </div>

                  <div className="mt-4">
                    <div className="mt-5 space-y-3">
                      {hasHydratedPaymentState && hasProjectPaymentRows ? (
                        projectPaymentRows.map(renderSidebarPaymentRow)
                      ) : (
                        <div className="rounded-md bg-gray-100 p-3 text-xs text-gray-500">
                          Loading payment methods...
                        </div>
                      )}
                    </div>

                    {paymentPlan === "IN_INSTALLMENTS" ? (
                      <div className="mt-5 rounded-[4px] p-2 bg-primary-25 flex items-center justify-between">
                        <span className="text-[10px] text-dark-blue-400">
                          Your monthly payments start on
                        </span>
                        <span className="text-[10px] font-medium text-primary-500">
                          Jan 1st, 2025
                        </span>
                      </div>
                    ) : null}

                    <div className="grid mt-2.5">
                      <Button
                        disabled={
                          isSubmittingPayment ||
                          hasSubmittedOrder ||
                          !hasHydratedPaymentState
                        }
                        onClick={handleSubmitPayment}
                        visual={
                          /* hasAuthorizationError ? "error" : */ "primary"
                        }
                      >
                        {hasSubmittedOrder
                          ? "Order Submitted"
                          : isSubmittingPayment
                            ? "Submitting..."
                            : "Submit Payment"}
                      </Button>
                    </div>
                    {submitError ? (
                      <ErrorMessage className="mt-2 text-center" size="sm">
                        {submitError}
                      </ErrorMessage>
                    ) : null}
                    {hasSubmittedOrder ? (
                      <p className="mt-2 text-center text-xs text-gray-500">
                        Your order has already been submitted.
                      </p>
                    ) : null}

                    <div className="mt-5">
                      <span className="inline-block text-center text-[10px] font-light text-dark-blue-400 leading-[14px]">
                        By clicking this button, you agree to Marketeq&apos;s{" "}
                        <Button
                          className="text-[10px] leading-[14px] underline"
                          variant="link"
                          onClick={() => setLegalDialog("terms")}
                        >
                          Terms of Use
                        </Button>{" "}
                        and{" "}
                        <Button
                          className="text-[10px] leading-[14px] underline"
                          variant="link"
                          onClick={() => setLegalDialog("privacy")}
                        >
                          Privacy Policy
                        </Button>
                      </span>
                    </div>

                    <div className="mt-5 flex items-center justify-center">
                      <Button variant="link" visual="gray">
                        Add Gift Card / Promo Code
                      </Button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
      {isTalentCheckout ? (
        <OfferDialog
          open={isEditOfferOpen}
          onOpenChange={setIsEditOfferOpen}
          mode="edit"
          onSaveOffer={({
            selectedRate,
            schedule,
            selectedDuration: nextDuration,
            customRate,
          }) => {
            updateOfferInUrl(selectedRate, schedule, nextDuration, customRate)
          }}
          profile={{
            username: talentUsername,
            firstName: talentName,
            avatarUrl: talentAvatarUrl,
            location: talentProfile?.location || "United States",
            experience: talentProfile?.experience || [],
          }}
        />
      ) : null}

      <Dialog
        open={legalDialog !== null}
        onOpenChange={(open) => {
          if (!open) setLegalDialog(null)
        }}
      >
        <DialogContent className="max-w-[480px] p-6">
          <h2 className="text-lg font-semibold text-dark-blue-400">
            {legalDialog === "privacy" ? "Privacy Policy" : "Terms of Use"}
          </h2>
          <p className="mt-3 text-sm leading-5 text-gray-500">
            {legalDialog === "privacy"
              ? "This privacy policy explains how Marketeq collects, uses, and protects checkout information. Payment details are handled securely and are only used to process and support your order."
              : "These terms explain the basic conditions for using Marketeq checkout. By continuing, you confirm that your order details are accurate and authorize Marketeq to process the selected payment method."}
          </p>
          <div className="mt-6 flex justify-end">
            <Button onClick={() => setLegalDialog(null)}>Close</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
