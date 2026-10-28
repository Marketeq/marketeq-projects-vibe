"use client"

import * as React from "react"
import { useCheckoutTabLock } from "@/lib/checkout/use-checkout-tab-lock"
import {
  usePathname,
  useRouter,
  useSearchParams,
} from "next/navigation"
import { MotionConfig } from "framer-motion"
import { useCheckout } from "@/contexts/checkout"
import { CheckoutAPI } from "@/service/http/checkout"
import { type CheckoutSession } from "@/lib/checkout/session"
import {
  GIFT_CARD_ERROR_FALLBACK_MESSAGE,
  getGiftCardErrorMessage,
} from "@/lib/checkout/validation-messages"
import { GiftCard } from "@/components/icons"
import { UserAPI } from "@/service/http/user"
import {
  BillingAddressesAPI,
  type BillingAddress,
} from "@/service/http/billing-addresses"
import { getDraftDateRangeLabel } from "@/lib/checkout/draft-summary"
import { cn } from "@/utils/functions"
import {
  AlertCircle,
  ArrowLeft,
  Bank,
  CheckCircle,
  ChevronDown,
  Edit03,
  Trash03,
  Users03,
  X,
} from "@blend-metrics/icons"
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
  Discover as PaymentDiscover,
  Mastercard as PaymentMastercard,
  WireTransfer,
} from "@/components/icons/payment-icons"
import NextImage from "@/components/next-image"
import {
  Alert,
  AlertContent,
  AlertIcon,
  AlertTitle,
  Avatar,
  AvatarFallback,
  AvatarImage,
  Badge,
  Button,
  Checkbox,
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  ErrorMessage,
  IconButton,
  Input,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  toast,
} from "@/components/ui"

const formatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
})

const formatRedeemGiftCardCode = (value: string) =>
  value
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 16)
    .replace(/(.{4})(?=.)/g, "$1-")

const isCompleteRedeemGiftCardCode = (value: string) =>
  value.replace(/-/g, "").length === 16

const getRedeemGiftCardEnding = (code: string) =>
  `*${code.replace(/-/g, "").slice(-4)}`

const REDEEM_PROMO_INVALID_MESSAGE =
  "You have entered an invalid promo code. Please try again."

const getRedeemApiError = (error: unknown) =>
  (
    error as {
      response?: { data?: { code?: string; message?: string } }
    }
  )?.response?.data

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
  brand?: string
  funding?: string
  expiry?: string
  billingAddress?: string
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

const CARD_BRAND_LABELS: Record<string, string> = {
  amex: "AMEX",
  visa: "Visa",
  mastercard: "Mastercard",
  discover: "Discover",
}

const getCardBrandLabel = (method: PaymentMethodSummary) => {
  const brandKey = method.brand?.toLowerCase()
  if (brandKey && CARD_BRAND_LABELS[brandKey]) {
    return CARD_BRAND_LABELS[brandKey]
  }

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
    const isDebit = method.funding
      ? method.funding.toLowerCase() === "debit"
      : method.title.toLowerCase().includes("debit")
    return `${getCardBrandLabel(method)} ${isDebit ? "debit card" : "credit card"} ending in *${getPaymentMethodLast4(method)}`
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

  const cardBrand = getCardBrandLabel(method).toLowerCase()

  if (cardBrand.includes("mastercard")) {
    return <PaymentMastercard className="h-[30px] w-[45px] shrink-0" />
  }

  if (cardBrand.includes("discover")) {
    return <PaymentDiscover className="h-[30px] w-[45px] shrink-0" />
  }

  return cardBrand.includes("amex") ? (
    <Amex className="h-[30px] w-[45px] shrink-0" />
  ) : (
    <Visa className="h-[30px] w-[45px] shrink-0" />
  )
}

export default function ConfirmationPage() {
  const pathname = usePathname()
  const router = useRouter()
  const searchParams = useSearchParams()
  const isTalentCheckout = pathname.startsWith("/talent-checkout/")
  const slugParamName = isTalentCheckout ? "username" : "listingId"
  const checkout = useCheckout()
  const {
    isOtherTabOpen: isOtherCheckoutTabOpen,
    setIsOtherTabOpen: setIsOtherCheckoutTabOpen,
    continueHere: continueCheckoutHere,
  } = useCheckoutTabLock()
  const slug = isTalentCheckout
    ? (searchParams.get(slugParamName) ?? "")
    : (checkout.slug ?? "")
  const basePath = isTalentCheckout ? "/talent-checkout" : "/checkout"
  const decodedSlug = safeDecodeSlug(slug)
  const safeSlugSegment = encodeURIComponent(decodedSlug)
  const listingQuery = `${slugParamName}=${safeSlugSegment}`
  const slugQuery = isTalentCheckout
    ? listingQuery
    : `sessionId=${encodeURIComponent(checkout.sessionId)}`
  const [talentProfile, setTalentProfile] = React.useState<UserProfile | null>(
    null
  )
  const [billingAddresses, setBillingAddresses] = React.useState<
    BillingAddress[]
  >([])
  const [isBillingAddressesLoading, setIsBillingAddressesLoading] =
    React.useState(!isTalentCheckout)
  const [isEditOfferOpen, setIsEditOfferOpen] = React.useState(false)
  const [hasAuthorizedPayment, setHasAuthorizedPayment] = React.useState(false)
  const [authorizationError, setAuthorizationError] = React.useState("")
  const [isSubmittingPayment, setIsSubmittingPayment] = React.useState(false)
  const [submitError, setSubmitError] = React.useState("")
  const paymentSnapshot = null as PaymentPageSnapshot | null
  const [legalDialog, setLegalDialog] = React.useState<
    "terms" | "privacy" | null
  >(null)
  const lastLegalDialogRef = React.useRef<"terms" | "privacy">("terms")
  if (legalDialog) lastLegalDialogRef.current = legalDialog
  const shownLegalDialog = legalDialog ?? lastLegalDialogRef.current
  const hasAuthorizationError = authorizationError.length > 0
  const authorizationSectionRef = React.useRef<HTMLDivElement | null>(null)
  const [isRedeemCodeDialogOpen, setIsRedeemCodeDialogOpen] =
    React.useState(false)
  const [redeemCodeTab, setRedeemCodeTab] = React.useState<
    "gift-card" | "promo-code"
  >("gift-card")
  const [redeemGiftCardCode, setRedeemGiftCardCode] = React.useState("")
  const [redeemGiftCardMessage, setRedeemGiftCardMessage] = React.useState(
    GIFT_CARD_ERROR_FALLBACK_MESSAGE
  )
  const [redeemGiftCardStatus, setRedeemGiftCardStatus] = React.useState<
    "idle" | "applying" | "invalid"
  >("idle")
  const [redeemGiftCardLockedUntil, setRedeemGiftCardLockedUntil] =
    React.useState<number | null>(() => {
      const lockedUntil = Date.parse(
        checkout.session?.giftCardLockedUntil ?? ""
      )
      return Number.isFinite(lockedUntil) && lockedUntil > Date.now()
        ? lockedUntil
        : null
    })
  const [lastAppliedRedeemGiftCard, setLastAppliedRedeemGiftCard] =
    React.useState("")
  const [duplicateRedeemGiftCard, setDuplicateRedeemGiftCard] =
    React.useState("")
  const [redeemGiftCardRemoval, setRedeemGiftCardRemoval] = React.useState<{
    code: string
    amount: number
  } | null>(null)
  const [isRedeemGiftCardRemovalOpen, setIsRedeemGiftCardRemovalOpen] =
    React.useState(false)
  const [showAllRedeemGiftCards, setShowAllRedeemGiftCards] =
    React.useState(false)
  const [redeemPromoCode, setRedeemPromoCode] = React.useState("")
  const [redeemPromoStatus, setRedeemPromoStatus] = React.useState<
    "idle" | "applying" | "invalid" | "removed"
  >("idle")
  const [redeemPromoMessage, setRedeemPromoMessage] = React.useState(
    REDEEM_PROMO_INVALID_MESSAGE
  )
  const [redeemPromoNotice, setRedeemPromoNotice] = React.useState("")
  const [lastRemovedRedeemPromo, setLastRemovedRedeemPromo] =
    React.useState("")
  const redeemPromoRequestIdRef = React.useRef(0)
  const redeemRequestInFlightRef = React.useRef(false)
  const [isSessionExpiredDialogOpen, setIsSessionExpiredDialogOpen] =
    React.useState(false)
  const [
    isCheckoutSessionInactiveDialogOpen,
    setIsCheckoutSessionInactiveDialogOpen,
  ] = React.useState(false)

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

    BillingAddressesAPI.list()
      .then((response) => {
        if (isActive) setBillingAddresses(response.data as BillingAddress[])
      })
      .catch(() => {})
      .finally(() => {
        if (isActive) setIsBillingAddressesLoading(false)
      })

    return () => {
      isActive = false
    }
  }, [isTalentCheckout])

  const selectedRateValue = searchParams.get("rate") || "web-development"
  const selectedSchedule = searchParams.get("schedule") || "full-time"
  const selectedDuration = searchParams.get("duration") || "Ongoing"
  const selectedRate =
    offerRates.find((rate) => rate.value === selectedRateValue) ||
    offerRates.find((rate) => rate.value === "web-development") ||
    offerRates[0]
  // See checkout/[slug]/project-details/page.tsx — a custom rate has no offerRates tile, so
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
  const checkoutSession = checkout.session
  const checkoutProjectTitle =
    checkoutSession?.title || "Project Title Unavailable"
  const checkoutProjectImage = checkoutSession?.mediaUrl || "/dashboard.png"
  const checkoutProjectTeamCount = checkoutSession?.teamMemberCount ?? null
  const checkoutProjectTeamLabel =
    checkoutProjectTeamCount !== null
      ? `${checkoutProjectTeamCount} team member${checkoutProjectTeamCount === 1 ? "" : "s"}`
      : "Team Details Unavailable"
  const checkoutProjectDateRange = (
    getDraftDateRangeLabel(checkoutSession?.durationDays ?? null) ||
    "Timeline Unavailable"
  ).replace(" - ", "  -  ")
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
  const projectCost = isTalentCheckout
    ? 94_000
    : (checkoutSession?.projectCost ?? 0)
  const estimatedProjectTax = isTalentCheckout ? 4_000 : 0
  const sessionGiftCards = checkoutSession?.appliedGiftCards ?? []
  const sessionPromo = checkoutSession?.promo ?? null
  const sessionPromoAmount = isTalentCheckout ? 0 : (sessionPromo?.amount ?? 0)
  const sessionGiftCardAmount = isTalentCheckout
    ? 0
    : sessionGiftCards.reduce((total, giftCard) => total + giftCard.amountUsed, 0)
  const appliedRedeemPromo =
    !isTalentCheckout && sessionPromo && sessionPromo.status === "valid"
      ? sessionPromo
      : null
  const fullAmount = Math.max(
    projectCost +
      estimatedProjectTax -
      (sessionPromoAmount + sessionGiftCardAmount),
    0
  )
  const projectDurationMonths = 8
  const installmentAmount = fullAmount / projectDurationMonths
  const paymentPlan = paymentSnapshot?.pay || "AT_ONCE"
  const amountDueBeforeCredits =
    paymentPlan === "IN_INSTALLMENTS" ? installmentAmount : fullAmount
  const balanceAmountParam = parseCurrencyAmount(searchParams.get("balance"))
  const availableBalance = isTalentCheckout
    ? balanceAmountParam === undefined
      ? 4000
      : Math.max(balanceAmountParam, 0)
    : Math.max(checkoutSession?.walletAmountUsed ?? 0, 0)
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
  const sessionPaymentSelection = checkoutSession?.paymentSelection ?? null
  const sessionBillingAddress = billingAddresses.find(
    (address) => address.id === sessionPaymentSelection?.billingAddressId
  )
  const sessionPaymentMethods: PaymentMethodSummary[] =
    isTalentCheckout || !sessionPaymentSelection
      ? []
      : [
          {
            id: sessionPaymentSelection.id,
            method: "CREDIT_DEBIT_CARD",
            title: "Credit Card",
            subtitle: "Stripe card",
            cardNumber: sessionPaymentSelection.last4,
            brand: sessionPaymentSelection.brand,
            funding: sessionPaymentSelection.funding,
            expiry: `${String(sessionPaymentSelection.expMonth).padStart(2, "0")}/${sessionPaymentSelection.expYear}`,
            billingAddress: sessionBillingAddress
              ? [
                  sessionBillingAddress.addressLine1,
                  sessionBillingAddress.addressLine2,
                  sessionBillingAddress.city,
                  [sessionBillingAddress.state, sessionBillingAddress.postalCode]
                    .filter(Boolean)
                    .join(" "),
                ]
                  .filter(Boolean)
                  .join(", ")
              : undefined,
            saveDefaultPaymentMethod: sessionPaymentSelection.isDefault,
          },
        ]
  const fullPaymentMethods =
    paymentSnapshot?.fullPaymentMethods || sessionPaymentMethods
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

  const previousPriceLineValuesRef = React.useRef<Record<
    string,
    number
  > | null>(null)
  const [changedPriceLines, setChangedPriceLines] = React.useState<
    Record<string, boolean>
  >({})
  React.useEffect(() => {
    const priceLineValues: Record<string, number> = {
      promo: sessionPromoAmount,
      sessionGiftCard: sessionGiftCardAmount,
      total: totalDueToday,
    }
    const previous = previousPriceLineValuesRef.current
    previousPriceLineValuesRef.current = priceLineValues
    if (!previous) return
    const changed = Object.keys(priceLineValues).filter(
      (key) => previous[key] !== priceLineValues[key]
    )
    if (changed.length === 0) return
    if (changed.includes("total")) {
      setHasAuthorizedPayment(false)
      setAuthorizationError("")
    }
    setChangedPriceLines((current) => ({
      ...current,
      ...Object.fromEntries(changed.map((key) => [key, true])),
    }))
    window.setTimeout(
      () =>
        setChangedPriceLines((current) => ({
          ...current,
          ...Object.fromEntries(changed.map((key) => [key, false])),
        })),
      300
    )
  }, [sessionPromoAmount, sessionGiftCardAmount, totalDueToday])
  const isPromoApplying = redeemPromoStatus === "applying"
  const isGiftCardApplying = redeemGiftCardStatus === "applying"
  const isPromoLineShimmering =
    Boolean(changedPriceLines.promo) || isPromoApplying
  const isSessionGiftCardLineShimmering =
    Boolean(changedPriceLines.sessionGiftCard) || isGiftCardApplying
  const isTotalShimmering =
    Boolean(changedPriceLines.total) || isPromoApplying || isGiftCardApplying

  const redeemSessionRef = React.useRef(checkout.session)
  redeemSessionRef.current = checkout.session
  const redeemPendingRemovalsRef = React.useRef(new Set<string>())
  const redeemRemovalQueueRef = React.useRef<Promise<void>>(Promise.resolve())

  const applyRedeemServerSession = (session: CheckoutSession) => {
    const pending = redeemPendingRemovalsRef.current
    checkout.updateSession(
      pending.size === 0
        ? session
        : {
            ...session,
            appliedGiftCards: session.appliedGiftCards.filter(
              (giftCard) => !pending.has(giftCard.code)
            ),
          }
    )
  }

  const openSessionDialogForFailure = (error: unknown) => {
    const failure = error as {
      response?: {
        status?: number
        data?: { code?: string; message?: { code?: string } | string }
      }
    }
    const data = failure.response?.data
    const nested = typeof data?.message === "object" ? data.message : null
    if (failure.response?.status === 401) {
      setIsSessionExpiredDialogOpen(true)
      return true
    }
    if ((data?.code ?? nested?.code) === "SESSION_NOT_ACTIVE") {
      setIsCheckoutSessionInactiveDialogOpen(true)
      return true
    }
    return false
  }

  React.useEffect(() => {
    if (redeemGiftCardLockedUntil === null) return
    const remaining = redeemGiftCardLockedUntil - Date.now()
    if (remaining <= 0) {
      setRedeemGiftCardLockedUntil(null)
      return
    }
    const timer = window.setTimeout(
      () => setRedeemGiftCardLockedUntil(null),
      remaining
    )
    return () => window.clearTimeout(timer)
  }, [redeemGiftCardLockedUntil])

  const applyRedeemGiftCard = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (redeemGiftCardLockedUntil !== null) return

    const normalizedCode = formatRedeemGiftCardCode(redeemGiftCardCode)
    if (
      !isCompleteRedeemGiftCardCode(normalizedCode) ||
      redeemGiftCardStatus === "applying" ||
      redeemRequestInFlightRef.current ||
      !checkout.sessionId
    ) {
      return
    }

    if (
      sessionGiftCards.some(
        (giftCard) =>
          formatRedeemGiftCardCode(giftCard.code) === normalizedCode
      )
    ) {
      setLastAppliedRedeemGiftCard("")
      setDuplicateRedeemGiftCard(normalizedCode)
      setRedeemGiftCardStatus("idle")
      return
    }

    redeemRequestInFlightRef.current = true
    setRedeemGiftCardStatus("applying")
    try {
      const response = await CheckoutAPI.ApplySessionCode(checkout.sessionId, {
        type: "gift_card",
        code: normalizedCode,
      })
      applyRedeemServerSession(response.data as CheckoutSession)
      setLastAppliedRedeemGiftCard(normalizedCode)
      setDuplicateRedeemGiftCard("")
      setRedeemGiftCardCode("")
      setRedeemGiftCardStatus("idle")
    } catch (error) {
      const failure = error as {
        response?: {
          status?: number
          data?: {
            code?: string
            lockedUntil?: string
            message?: { code?: string; lockedUntil?: string } | string
          }
        }
      }
      const data = failure.response?.data
      const nested = typeof data?.message === "object" ? data.message : null
      const lockCode = data?.code ?? nested?.code
      if (
        failure.response?.status === 429 ||
        lockCode === "GIFT_CARD_LOCKED"
      ) {
        const lockedUntil = Date.parse(
          data?.lockedUntil ?? nested?.lockedUntil ?? ""
        )
        setRedeemGiftCardLockedUntil(
          Number.isFinite(lockedUntil) ? lockedUntil : Date.now() + 3600000
        )
        setRedeemGiftCardStatus("idle")
      } else if (openSessionDialogForFailure(error)) {
        setRedeemGiftCardStatus("idle")
      } else {
        setRedeemGiftCardMessage(getGiftCardErrorMessage(lockCode))
        setRedeemGiftCardStatus("invalid")
      }
    } finally {
      redeemRequestInFlightRef.current = false
    }
  }

  const hideRedeemGiftCards = (codes: string[]) => {
    const current = redeemSessionRef.current
    if (!current) return
    codes.forEach((code) => redeemPendingRemovalsRef.current.add(code))
    checkout.updateSession({
      ...current,
      appliedGiftCards: current.appliedGiftCards.filter(
        (giftCard) => !codes.includes(giftCard.code)
      ),
    })
  }

  const sendRedeemGiftCardRemoval = (giftCard: {
    code: string
    amountUsed: number
  }) => {
    redeemRemovalQueueRef.current = redeemRemovalQueueRef.current.then(
      async () => {
        try {
          const response = await CheckoutAPI.RemoveSessionCode(
            checkout.sessionId,
            giftCard.code
          )
          redeemPendingRemovalsRef.current.delete(giftCard.code)
          applyRedeemServerSession(response.data as CheckoutSession)
        } catch (error) {
          redeemPendingRemovalsRef.current.delete(giftCard.code)
          const current = redeemSessionRef.current
          if (
            current &&
            !current.appliedGiftCards.some((card) => card.code === giftCard.code)
          ) {
            checkout.updateSession({
              ...current,
              appliedGiftCards: [...current.appliedGiftCards, giftCard],
            })
          }
          if (openSessionDialogForFailure(error)) return
          toast({
            variant: "destructive",
            title: "The gift card could not be removed. Please try again.",
          })
        }
      }
    )
  }

  const removeRedeemGiftCard = (code: string) => {
    if (!checkout.sessionId) return
    const giftCard = sessionGiftCards.find((card) => card.code === code)
    if (!giftCard) return
    hideRedeemGiftCards([code])
    setLastAppliedRedeemGiftCard((current) => (current === code ? "" : current))
    setDuplicateRedeemGiftCard("")
    sendRedeemGiftCardRemoval(giftCard)
  }

  const removeAllRedeemGiftCards = () => {
    if (!checkout.sessionId || sessionGiftCards.length === 0) return
    const giftCards = [...sessionGiftCards]
    hideRedeemGiftCards(giftCards.map((giftCard) => giftCard.code))
    setLastAppliedRedeemGiftCard("")
    setDuplicateRedeemGiftCard("")
    setShowAllRedeemGiftCards(false)
    giftCards.forEach(sendRedeemGiftCardRemoval)
  }

  const askRemoveRedeemGiftCard = (code: string, amount: number) => {
    setRedeemGiftCardRemoval({ code, amount })
    setIsRedeemGiftCardRemovalOpen(true)
  }

  const askRemoveAllRedeemGiftCards = () => {
    setRedeemGiftCardRemoval(
      sessionGiftCards.length === 1
        ? {
            code: sessionGiftCards[0].code,
            amount: sessionGiftCards[0].amountUsed,
          }
        : null
    )
    setIsRedeemGiftCardRemovalOpen(true)
  }

  const confirmRedeemGiftCardRemoval = () => {
    setIsRedeemGiftCardRemovalOpen(false)
    if (redeemGiftCardRemoval) {
      removeRedeemGiftCard(redeemGiftCardRemoval.code)
      return
    }
    removeAllRedeemGiftCards()
  }

  const applyRedeemPromoCode = async (
    event: React.FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault()

    const normalizedCode = redeemPromoCode.trim().toUpperCase()
    if (
      !normalizedCode ||
      redeemPromoStatus === "applying" ||
      !checkout.sessionId
    ) {
      return
    }

    const requestId = redeemPromoRequestIdRef.current + 1
    redeemPromoRequestIdRef.current = requestId
    setRedeemPromoCode(normalizedCode)
    setRedeemPromoStatus("applying")
    setRedeemPromoNotice("")
    setLastRemovedRedeemPromo("")

    try {
      const response = await CheckoutAPI.ApplySessionCode(checkout.sessionId, {
        type: "promo",
        code: normalizedCode,
      })
      if (redeemPromoRequestIdRef.current !== requestId) return
      applyRedeemServerSession(response.data as CheckoutSession)
      setRedeemPromoStatus("idle")
    } catch (error) {
      if (redeemPromoRequestIdRef.current !== requestId) return
      if (openSessionDialogForFailure(error)) {
        setRedeemPromoStatus("idle")
        return
      }
      const apiError = getRedeemApiError(error)
      if (apiError?.code === "PROMO_ALREADY_APPLIED") {
        setRedeemPromoStatus("idle")
        setRedeemPromoNotice(apiError.message ?? "")
        return
      }
      setRedeemPromoMessage(
        apiError?.code === "CODE_UNAVAILABLE" && apiError.message
          ? apiError.message
          : REDEEM_PROMO_INVALID_MESSAGE
      )
      setRedeemPromoStatus("invalid")
    }
  }

  const removeRedeemPromoCode = async () => {
    if (
      redeemRequestInFlightRef.current ||
      !checkout.sessionId ||
      !appliedRedeemPromo
    ) {
      return
    }
    redeemRequestInFlightRef.current = true
    const removedCode = appliedRedeemPromo.code
    try {
      const response = await CheckoutAPI.RemoveSessionCode(
        checkout.sessionId,
        removedCode
      )
      applyRedeemServerSession(response.data as CheckoutSession)
    } catch (error) {
      if (!openSessionDialogForFailure(error)) {
        toast({
          variant: "destructive",
          title: "The promo code could not be removed. Please try again.",
        })
      }
      return
    } finally {
      redeemRequestInFlightRef.current = false
    }
    redeemPromoRequestIdRef.current += 1
    setRedeemPromoNotice("")
    setLastRemovedRedeemPromo(removedCode)
    setRedeemPromoCode("")
    setRedeemPromoStatus("removed")
  }

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
      ? `${basePath}/payment?${searchParams.toString()}`
      : `${basePath}/payment?${slugQuery}`
    router.push(nextUrl)
  }, [basePath, router, slugQuery, searchParams])

  const handleEditProjectDetails = React.useCallback(() => {
    const nextUrl =
      !isTalentCheckout || !searchParams.toString()
        ? `${basePath}/project-details?${listingQuery}`
        : `${basePath}/project-details?${searchParams.toString()}`
    router.push(nextUrl)
  }, [basePath, router, slugQuery, searchParams])

  const handleSubmitPayment = () => {
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
      router.push(`${basePath}/confirmation?${slugQuery}`)
    }, 300)
  }

  const renderReviewPaymentRow = (row: ReviewPaymentRow) => (
    <div
      key={row.id}
      className="grid min-h-[87px] grid-cols-2 border-b border-gray-200 py-4"
    >
      <div className="flex items-start gap-x-3">
        <PaymentMethodIcon method={row.method} />
        <div className="flex-auto space-y-1">
          <h2 className="text-sm font-semibold text-dark-blue-400">
            {getMethodTitle(row.method)}
          </h2>
          {row.method.method === "CREDIT_DEBIT_CARD" && row.method.expiry ? (
            <p className="text-xs font-light text-dark-blue-400">
              Expires: {row.method.expiry}
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

      {row.showBillingAddress && row.method.billingAddress ? (
        <div className="space-y-1 px-3">
          <h2 className="text-xs font-semibold text-dark-blue-400">
            Billing Address
          </h2>
          <p className="text-xs font-light text-dark-blue-400">
            {row.method.billingAddress}
          </p>
        </div>
      ) : (
        <div />
      )}
    </div>
  )

  const renderSidebarPaymentRow = (
    row: ReviewPaymentRow,
    options?: { isLast?: boolean }
  ) => (
    <article key={row.id} className="flex items-start gap-x-3">
      <PaymentMethodIcon method={row.method} />
      <div
        className={cn(
          "flex-auto space-y-1 pb-3",
          !options?.isLast && "border-b border-gray-200"
        )}
      >
        <h1 className="text-sm font-medium leading-[normal] text-dark-blue-400">
          {formatter.format(row.amount)}
        </h1>
        <p className="text-xs font-light leading-[normal] text-dark-blue-400">
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
    <div
      className={cn(
        "bg-gray-50 pt-[64px]",
        !isTalentCheckout && !hasProjectPaymentRows && "min-h-screen"
      )}
    >
      {!isTalentCheckout && !hasProjectPaymentRows ? null : (
        <CheckoutNavigation
          currentStep={3}
          logoHref=""
          firstStepLabel={
            isTalentCheckout ? "Contract Details" : "Project Details"
          }
        />
      )}

      <div
        className={
          isTalentCheckout
            ? "px-[150px] py-[50px]"
            : cn(
                "px-[150px] pt-[50px] pb-[10px]",
                !hasProjectPaymentRows && "hidden"
              )
        }
      >
        <Button
          className={
            isTalentCheckout
              ? "mb-6 px-0"
              : "gap-x-1 rounded-none font-normal hover:text-gray-700 hover:no-underline focus:text-gray-500 mb-2 h-5 py-0"
          }
          variant="link"
          visual="gray"
          onClick={handleEditPaymentMethods}
        >
          {isTalentCheckout ? (
            <>{"<-"} Back</>
          ) : (
            <>
              <ArrowLeft className="size-4" /> Back
            </>
          )}
        </Button>
        <h1
          className={
            isTalentCheckout
              ? "text-2xl font-bold text-dark-blue-400"
              : "text-2xl leading-7 font-bold text-dark-blue-400"
          }
        >
          Review your order details
        </h1>
        <p
          className={
            isTalentCheckout
              ? "mt-3 text-base font-light text-dark-blue-400"
              : "mt-3 text-base font-light leading-[normal] text-dark-blue-400"
          }
        >
          Then click{" "}
          {isTalentCheckout ? (
            <span className="font-normal">&quot;Submit payment&quot;</span>
          ) : (
            <span className="font-medium">“Submit payment”</span>
          )}{" "}
          below to confirm your {isTalentCheckout ? "team" : "project"}
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
                      onClick={handleEditProjectDetails}
                    >
                      <Edit03 className="size-[15px]" />
                      Edit
                    </Button>
                  </div>
                  <div className="p-5 flex gap-x-3">
                    <div className="relative h-[92px] w-[181px] shrink-0 overflow-hidden rounded-[6px] bg-white ring-1 ring-gray-200">
                      <NextImage
                        className="object-cover"
                        src={checkoutProjectImage}
                        alt={checkoutProjectTitle}
                        sizes="50vw"
                        fill
                      />
                    </div>
                    <div className="flex h-[92px] flex-auto flex-col items-start justify-between">
                      <h1 className="text-sm font-medium leading-5 text-dark-blue-400">
                        {checkoutProjectTitle}
                      </h1>

                      <div className="inline-flex items-center gap-x-2">
                        <Users03 className="size-[15px] shrink-0" />
                        <span className="text-xs leading-5 font-semibold text-dark-blue-400">
                          {checkoutProjectTeamLabel}
                        </span>
                      </div>

                      <div className="whitespace-pre-wrap capitalize leading-5 text-[13px] text-dark-blue-400">
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
                    {isBillingAddressesLoading ? (
                      <div
                        className="grid min-h-[87px] w-full grid-cols-1 grid-rows-3 gap-3"
                        aria-hidden="true"
                      >
                        {[0, 1, 2].map((item) => (
                          <div
                            key={item}
                            className="relative overflow-hidden rounded-lg bg-gray-100"
                          >
                            <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-gray-100 via-white to-gray-100" />
                          </div>
                        ))}
                      </div>
                    ) : paymentPlan === "IN_INSTALLMENTS" ? (
                      <>
                        <h1 className="text-base font-semibold text-dark-blue-400">
                          Initial One-Time Payment
                        </h1>
                        <div className="mt-2">
                          {initialInstallmentRows.map(renderReviewPaymentRow)}
                        </div>

                        <h1 className="mt-6 text-lg font-semibold text-dark-blue-400">
                          Recurring Payments
                        </h1>
                        <div className="mt-2">
                          {recurringInstallmentRows.map(renderReviewPaymentRow)}
                        </div>
                      </>
                    ) : (
                      <div>{oneTimePaymentRows.map(renderReviewPaymentRow)}</div>
                    )}

                    <div
                      ref={authorizationSectionRef}
                      className={cn(
                        "mt-6 px-5 py-2",
                        isBillingAddressesLoading && "hidden"
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
                            "text-sm font-light leading-[18px] text-dark-blue-400",
                            hasAuthorizationError && "text-error-500"
                          )}
                        >
                          I hereby authorize{" "}
                          <span className="font-semibold">Marketeq</span> to
                          charge my above payment methods for the{" "}
                          {paymentPlan === "IN_INSTALLMENTS" ? (
                            <span className="font-semibold">
                              {authorizationAmountLabel}
                            </span>
                          ) : (
                            <>
                              total one-time amount of{" "}
                              <span className="font-semibold">
                                {formatter.format(totalDueToday)}
                              </span>
                            </>
                          )}
                        </span>
                      </label>
                      {hasAuthorizationError ? (
                        <ErrorMessage className="mt-5" size="xs">
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
                <h1
                  className={cn(
                    "text-base font-semibold text-dark-blue-400",
                    isTalentCheckout ? "leading-none" : "leading-[normal]"
                  )}
                >
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
                  <div className="mt-4 border-b pb-4 border-gray-200">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs leading-[normal] text-dark-blue-400">
                        <span className="font-light">Project cost</span>
                        <span className="font-normal">
                          {formatter.format(projectCost)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-xs leading-[normal] text-dark-blue-400">
                        <span className="font-light">Estimated tax *</span>
                        <span className="font-normal">
                          {estimatedProjectTax.toLocaleString("en-US", {
                            style: "currency",
                            currency: "USD",
                          })}
                        </span>
                      </div>
                      {paymentPlan === "IN_INSTALLMENTS" ? (
                        <>
                          <div className="flex items-center justify-between text-xs leading-[normal] text-dark-blue-400">
                            <span className="font-light">Initial payment</span>
                            <span className="font-normal">
                              {formatter.format(installmentAmount)}
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-xs leading-[normal] text-dark-blue-400">
                            <span className="font-light">
                              Recurring payment
                            </span>
                            <span className="font-normal">
                              {formatter.format(installmentAmount)}
                            </span>
                          </div>
                        </>
                      ) : null}
                      {appliedBalanceAmount > 0 ? (
                        <div className="flex items-center justify-between text-xs leading-[normal] text-dark-blue-400">
                          <span className="font-light">Balance applied</span>
                          <span className="font-normal">
                            - {formatter.format(appliedBalanceAmount)}
                          </span>
                        </div>
                      ) : null}
                      {sessionPromoAmount > 0 ? (
                        <div className="flex items-center justify-between text-xs leading-[normal] text-dark-blue-400">
                          <span className="font-light">Promo code applied</span>
                          {isPromoLineShimmering ? (
                            <div
                              className="relative h-3.5 w-14 overflow-hidden rounded bg-gray-100"
                              aria-hidden="true"
                            >
                              <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-gray-100 via-white to-gray-100" />
                            </div>
                          ) : (
                            <span className="font-normal">
                              - {formatter.format(sessionPromoAmount)}
                            </span>
                          )}
                        </div>
                      ) : null}
                      {sessionGiftCardAmount > 0 ? (
                        <div className="flex items-center justify-between text-xs leading-[normal] text-dark-blue-400">
                          <span className="font-light">
                            {sessionGiftCards.length === 1
                              ? "Gift card applied"
                              : `${sessionGiftCards.length} Gift cards applied`}
                          </span>
                          {isSessionGiftCardLineShimmering ? (
                            <div
                              className="relative h-3.5 w-14 overflow-hidden rounded bg-gray-100"
                              aria-hidden="true"
                            >
                              <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-gray-100 via-white to-gray-100" />
                            </div>
                          ) : (
                            <span className="font-normal">
                              - {formatter.format(sessionGiftCardAmount)}
                            </span>
                          )}
                        </div>
                      ) : null}
                      {totalGiftCardAmount > 0 ? (
                        <div className="flex items-center justify-between text-xs leading-[normal] text-dark-blue-400">
                          <span className="font-light">
                            {paymentSnapshot?.giftCards.length || 0}{" "}
                            {(paymentSnapshot?.giftCards.length || 0) === 1
                              ? "Gift card applied"
                              : "Gift cards applied"}
                          </span>
                          <span className="font-normal">
                            - {formatter.format(totalGiftCardAmount)}
                          </span>
                        </div>
                      ) : null}
                    </div>

                    <div className="mt-4 flex items-center justify-between text-base font-bold leading-[normal] text-dark-blue-400">
                      <span>
                        {paymentPlan === "IN_INSTALLMENTS"
                          ? "Total Due Today"
                          : "Total"}
                      </span>
                      {isTotalShimmering ? (
                        <div
                          className="relative h-4 w-16 overflow-hidden rounded bg-gray-100"
                          aria-hidden="true"
                        >
                          <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-gray-100 via-white to-gray-100" />
                        </div>
                      ) : (
                        <span>{formatter.format(totalDueToday)}</span>
                      )}
                    </div>
                  </div>

                  <div className="mt-5">
                    <div className="space-y-3">
                      {projectPaymentRows.map((row, index) =>
                        renderSidebarPaymentRow(row, {
                          isLast: index === projectPaymentRows.length - 1,
                        })
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

                    <div className="grid mt-2">
                      <Button
                        disabled={
                          isSubmittingPayment || isBillingAddressesLoading
                        }
                        onClick={handleSubmitPayment}
                        visual={
                          /* hasAuthorizationError ? "error" : */ "primary"
                        }
                      >
                        {isSubmittingPayment
                          ? "Submitting..."
                          : "Submit Payment"}
                      </Button>
                    </div>
                    {submitError ? (
                      <ErrorMessage className="mt-2 text-center" size="sm">
                        {submitError}
                      </ErrorMessage>
                    ) : null}

                    <div className="mt-[21.33px]">
                      <span className="inline-block text-center font-light text-[10px] leading-[14px]">
                        By clicking the above, you agree to Marketeq&apos;s{" "}
                        <Button
                          className="font-medium underline text-[10px] leading-[14px]"
                          variant="link"
                          onClick={() => setLegalDialog("terms")}
                        >
                          Terms of Use
                        </Button>{" "}
                        and{" "}
                        <Button
                          className="font-medium underline text-[10px] leading-[14px]"
                          variant="link"
                          onClick={() => setLegalDialog("privacy")}
                        >
                          Privacy Policy
                        </Button>
                      </span>
                    </div>

                    <div className="mt-5 flex items-center justify-center">
                      <Button
                        variant="link"
                        visual="gray"
                        onClick={() => setIsRedeemCodeDialogOpen(true)}
                      >
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
        open={isOtherCheckoutTabOpen}
        onOpenChange={setIsOtherCheckoutTabOpen}
      >
        <DialogContent className="max-w-[480px] p-6">
          <h2 className="text-lg font-semibold text-dark-blue-400">
            Checkout open in another tab
          </h2>
          <p className="mt-3 text-sm leading-5 text-gray-500">
            You have checkout open in another tab. Please complete or close that
            session before continuing.
          </p>
          <div className="mt-6 flex justify-end">
            <Button onClick={continueCheckoutHere}>Continue Here</Button>
          </div>
        </DialogContent>
      </Dialog>

      {isTalentCheckout ? null : (
        <>
          <Dialog
            open={isRedeemCodeDialogOpen}
            onOpenChange={setIsRedeemCodeDialogOpen}
          >
            <DialogContent className="w-[735px] max-w-[calc(100vw-32px)] overflow-hidden p-0">
              <Tabs
                value={redeemCodeTab}
                onValueChange={(value) =>
                  setRedeemCodeTab(value as "gift-card" | "promo-code")
                }
                unanimated
              >
                <div className="flex h-11 items-center border-b border-gray-200 pl-6 pr-1">
                  <DialogTitle className="shrink-0 text-lg font-semibold leading-7 text-dark-blue-400">
                    Redeem Code
                  </DialogTitle>

                  <div className="ml-auto flex h-full items-center gap-x-6">
                    <MotionConfig transition={{ duration: 0 }}>
                      <TabsList className="h-full items-start border-b-0 px-5 pt-3">
                        <TabsTrigger
                          containerClassName="h-full"
                          value="gift-card"
                        >
                          Gift Card
                        </TabsTrigger>
                        <TabsTrigger
                          containerClassName="h-full"
                          value="promo-code"
                        >
                          Promo Code
                        </TabsTrigger>
                      </TabsList>
                    </MotionConfig>

                    <DialogClose asChild>
                      <IconButton
                        aria-label="Close redeem code dialog"
                        className="rounded-lg text-gray-500"
                        size="sm"
                        variant="ghost"
                        visual="gray"
                      >
                        <X className="size-5" />
                      </IconButton>
                    </DialogClose>
                  </div>
                </div>

                <TabsContent value="gift-card" className="p-5">
                  <div className="flex flex-col gap-y-3 rounded-lg bg-primary-25 p-5 text-dark-blue-400">
                    <div className="flex items-center justify-between gap-x-4">
                      <p className="text-sm font-semibold leading-normal">
                        Redeem a gift card{" "}
                        <span className="text-xs font-light">
                          (dashes not required)
                        </span>
                      </p>

                      {sessionGiftCards.length > 0 ? (
                        <Button
                          type="button"
                          className="rounded-none text-xs leading-5 hover:text-error-500 hover:no-underline focus:text-gray-500 focus-visible:ring-2 focus-visible:ring-primary-100"
                          onClick={askRemoveAllRedeemGiftCards}
                          variant="link"
                          visual="gray"
                        >
                          Remove ({sessionGiftCards.length})
                          <Trash03 className="size-[15px]" />
                        </Button>
                      ) : null}
                    </div>

                    <form onSubmit={applyRedeemGiftCard}>
                      <div className="flex items-stretch gap-x-2">
                        <div className="relative min-w-0 flex-1">
                          <Input
                            aria-label="Gift card number"
                            autoComplete="off"
                            className={cn(
                              "min-w-0",
                              redeemGiftCardStatus === "invalid" && "pr-11"
                            )}
                            disabled={redeemGiftCardLockedUntil !== null}
                            isInvalid={redeemGiftCardStatus === "invalid"}
                            placeholder="Enter gift card number"
                            value={redeemGiftCardCode}
                            onChange={(event) => {
                              setRedeemGiftCardCode(
                                formatRedeemGiftCardCode(event.target.value)
                              )
                              setRedeemGiftCardStatus("idle")
                              setLastAppliedRedeemGiftCard("")
                              setDuplicateRedeemGiftCard("")
                            }}
                          />
                          {redeemGiftCardStatus === "invalid" ? (
                            <AlertCircle className="absolute right-3.5 top-3.5 size-4 text-error-500" />
                          ) : null}
                        </div>
                        <Button
                          className={cn(
                            "h-11 px-3.5 text-xs",
                            redeemGiftCardStatus === "applying"
                              ? "w-[91px]"
                              : "w-[62px]"
                          )}
                          disabled={
                            !isCompleteRedeemGiftCardCode(redeemGiftCardCode) ||
                            redeemGiftCardLockedUntil !== null ||
                            redeemGiftCardStatus === "applying" ||
                            redeemGiftCardStatus === "invalid"
                          }
                          size="lg"
                          type="submit"
                          visual={
                            redeemGiftCardStatus === "invalid"
                              ? "error"
                              : "primary"
                          }
                        >
                          {redeemGiftCardStatus === "applying"
                            ? "Applying..."
                            : "Apply"}
                        </Button>
                      </div>
                    </form>

                    {redeemGiftCardLockedUntil !== null ? (
                      <p className="text-sm leading-5 text-error-500">
                        Too many invalid gift card attempts. Please try again in
                        1 hour.
                      </p>
                    ) : null}

                    {redeemGiftCardStatus === "invalid" &&
                    redeemGiftCardLockedUntil === null ? (
                      <p className="text-sm leading-5 text-error-500">
                        {redeemGiftCardMessage}
                      </p>
                    ) : null}

                    {lastAppliedRedeemGiftCard ? (
                      <Alert
                        variant="success"
                        className="w-fit max-w-full items-center rounded-[5px] p-4"
                      >
                        <AlertIcon className="shrink-0">
                          <CheckCircle className="size-5" />
                        </AlertIcon>
                        <AlertContent>
                          <AlertTitle className="text-sm leading-5 text-success-600">
                            Gift Card &ldquo;{lastAppliedRedeemGiftCard}&rdquo;
                            has been applied.
                          </AlertTitle>
                        </AlertContent>
                      </Alert>
                    ) : null}

                    {duplicateRedeemGiftCard ? (
                      <Alert
                        variant="error"
                        className="w-fit max-w-full items-center rounded-[5px] p-4"
                      >
                        <AlertIcon className="shrink-0">
                          <AlertCircle className="size-5" />
                        </AlertIcon>
                        <AlertContent>
                          <AlertTitle className="text-sm leading-5 text-error-600">
                            Gift Card &ldquo;{duplicateRedeemGiftCard}&rdquo;
                            has already been redeemed.
                          </AlertTitle>
                        </AlertContent>
                      </Alert>
                    ) : null}

                    {sessionGiftCards.length > 0 ? (
                      <div>
                        <div className="flex items-center justify-between gap-x-4">
                          <p className="text-xs font-light leading-normal">
                            Total gift card amount{" "}
                            <span className="font-bold">
                              {formatter.format(sessionGiftCardAmount)}
                            </span>
                          </p>

                          <Button
                            type="button"
                            className="rounded-none text-xs leading-5 hover:text-gray-600 hover:no-underline focus:text-gray-500 focus-visible:ring-2 focus-visible:ring-primary-100"
                            aria-expanded={showAllRedeemGiftCards}
                            onClick={() =>
                              setShowAllRedeemGiftCards((current) => !current)
                            }
                            variant="link"
                            visual="gray"
                          >
                            View All Gift Cards
                            <ChevronDown
                              className={cn(
                                "size-[15px] transition-transform",
                                showAllRedeemGiftCards && "rotate-180"
                              )}
                            />
                          </Button>
                        </div>

                        {showAllRedeemGiftCards ? (
                          <div className="mt-4">
                            {sessionGiftCards.map((giftCard, index) => (
                              <div
                                key={giftCard.code}
                                className={cn(
                                  "flex min-h-10 items-center gap-x-3",
                                  index < sessionGiftCards.length - 1 &&
                                    "border-b border-gray-300"
                                )}
                              >
                                <GiftCard className="size-7 shrink-0 text-dark-blue-400 [&>path]:fill-current" />
                                <div className="flex min-w-0 flex-1 items-center justify-between gap-x-8">
                                  <span className="w-[185px] shrink-0 text-sm font-medium leading-normal">
                                    Gift card ending in{" "}
                                    {getRedeemGiftCardEnding(giftCard.code)}
                                  </span>
                                  <span className="whitespace-nowrap text-xs leading-normal">
                                    Amount:{" "}
                                    <span className="font-bold">
                                      {formatter.format(giftCard.amountUsed)}
                                    </span>
                                  </span>
                                </div>
                                <IconButton
                                  type="button"
                                  aria-label={`Remove gift card ending in ${getRedeemGiftCardEnding(giftCard.code)}`}
                                  className="flex rounded-[4px] text-gray-400 hover:bg-transparent hover:text-error-500 focus:bg-transparent focus:text-gray-400 focus-visible:ring-2 focus-visible:ring-primary-100"
                                  onClick={() =>
                                    askRemoveRedeemGiftCard(
                                      giftCard.code,
                                      giftCard.amountUsed
                                    )
                                  }
                                  size="md"
                                  variant="ghost"
                                  visual="gray"
                                >
                                  <Trash03 className="size-[18px]" />
                                </IconButton>
                              </div>
                            ))}
                          </div>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                </TabsContent>

                <TabsContent value="promo-code" className="p-5">
                  <div className="flex flex-col gap-y-3 rounded-lg bg-primary-25 p-5">
                    <p className="text-sm font-semibold leading-normal text-dark-blue-400">
                      Redeem Promo Code
                    </p>

                    <form onSubmit={applyRedeemPromoCode}>
                      <div className="flex items-start gap-x-2">
                        <div className="min-w-0 flex-1">
                          <div className="relative">
                            <Input
                              aria-label="Promo code"
                              autoComplete="off"
                              className={cn(
                                "min-w-0",
                                redeemPromoStatus === "invalid" && "pr-11"
                              )}
                              isInvalid={redeemPromoStatus === "invalid"}
                              placeholder={
                                redeemPromoStatus === "removed"
                                  ? "Enter promo code number"
                                  : "Enter promo code"
                              }
                              value={redeemPromoCode}
                              onChange={(event) => {
                                redeemPromoRequestIdRef.current += 1
                                setRedeemPromoCode(
                                  event.target.value.toUpperCase()
                                )
                                setRedeemPromoStatus("idle")
                                setRedeemPromoNotice("")
                                setLastRemovedRedeemPromo("")
                              }}
                            />
                            {redeemPromoStatus === "invalid" ? (
                              <AlertCircle className="absolute right-3.5 top-3.5 size-4 text-error-500" />
                            ) : null}
                          </div>

                          {redeemPromoStatus === "invalid" ? (
                            <p className="mt-1.5 text-sm leading-5 text-error-500">
                              {redeemPromoMessage}
                            </p>
                          ) : null}

                          {redeemPromoNotice ? (
                            <p className="mt-1.5 text-sm leading-5 text-error-500">
                              {redeemPromoNotice}
                            </p>
                          ) : null}

                          {redeemPromoStatus === "removed" &&
                          lastRemovedRedeemPromo ? (
                            <p className="mt-1.5 text-sm leading-5 text-gray-500">
                              Promo code &ldquo;{lastRemovedRedeemPromo}&rdquo;
                              has been removed
                            </p>
                          ) : null}
                        </div>

                        <Button
                          className={cn(
                            "h-11 px-3.5 text-xs",
                            redeemPromoStatus === "applying"
                              ? "w-[91px]"
                              : "w-[62px]"
                          )}
                          disabled={
                            !redeemPromoCode.trim() ||
                            redeemPromoStatus === "applying" ||
                            redeemPromoStatus === "invalid"
                          }
                          size="lg"
                          type="submit"
                          visual={
                            redeemPromoStatus === "invalid"
                              ? "error"
                              : "primary"
                          }
                        >
                          {redeemPromoStatus === "applying"
                            ? "Applying..."
                            : "Apply"}
                        </Button>
                      </div>
                    </form>

                    {appliedRedeemPromo ? (
                      <Alert
                        variant="success"
                        className="items-center justify-between rounded-[5px] py-4 pl-4 pr-5"
                      >
                        <div className="flex min-w-0 items-center gap-x-3">
                          <AlertIcon className="shrink-0">
                            <CheckCircle className="size-5" />
                          </AlertIcon>
                          <AlertContent className="flex min-w-0 items-center gap-x-3">
                            <AlertTitle className="truncate text-sm leading-5 text-success-600">
                              &ldquo;{appliedRedeemPromo.code}&rdquo; has been
                              applied
                            </AlertTitle>
                            <span className="shrink-0 rounded-2xl bg-success-50 px-2 py-0.5 text-xs font-medium leading-[18px] text-success-700">
                              -{formatter.format(appliedRedeemPromo.amount)}
                              {appliedRedeemPromo.discountType === "percent"
                                ? ` (${appliedRedeemPromo.discountValue}% off)`
                                : null}
                            </span>
                          </AlertContent>
                        </div>

                        <Button
                          type="button"
                          className="rounded-none text-xs leading-5 text-success-600 underline hover:no-underline focus:text-success-600 focus-visible:ring-2 focus-visible:ring-success-100"
                          onClick={removeRedeemPromoCode}
                          variant="link"
                        >
                          Remove
                        </Button>
                      </Alert>
                    ) : null}
                  </div>
                </TabsContent>
              </Tabs>
            </DialogContent>
          </Dialog>

          <Dialog
            open={isRedeemGiftCardRemovalOpen}
            onOpenChange={setIsRedeemGiftCardRemovalOpen}
          >
            <DialogContent
              onInteractOutside={() => setIsRedeemGiftCardRemovalOpen(false)}
            >
              <DialogHeader>
                <div className="flex flex-col gap-y-2">
                  <DialogTitle>
                    {redeemGiftCardRemoval
                      ? "Remove Gift Card?"
                      : "Remove All Gift Cards?"}
                  </DialogTitle>
                  <DialogDescription>
                    Are you sure you want to remove{" "}
                    <span className="font-bold">
                      {redeemGiftCardRemoval
                        ? `gift card ending in ${getRedeemGiftCardEnding(redeemGiftCardRemoval.code)} for the amount of ${formatter.format(redeemGiftCardRemoval.amount)}`
                        : `all added gift cards for the amount of ${formatter.format(sessionGiftCardAmount)}`}
                    </span>
                    ?
                  </DialogDescription>
                </div>
              </DialogHeader>

              <DialogFooter className="mt-8 gap-x-3">
                <DialogClose asChild>
                  <Button variant="outlined" visual="gray">
                    Cancel
                  </Button>
                </DialogClose>
                <Button visual="error" onClick={confirmRedeemGiftCardRemoval}>
                  Yes, Remove
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog
            open={isSessionExpiredDialogOpen}
            onOpenChange={setIsSessionExpiredDialogOpen}
          >
            <DialogContent
              className="max-w-[480px] p-6"
              onPointerDownOutside={(event) => event.preventDefault()}
              onInteractOutside={(event) => event.preventDefault()}
              onEscapeKeyDown={(event) => event.preventDefault()}
            >
              <h2 className="text-lg font-semibold text-dark-blue-400">
                Your session has expired
              </h2>
              <p className="mt-3 text-sm leading-5 text-gray-500">
                Please log in again to continue.
              </p>
              <div className="mt-6 flex justify-end">
                <Button
                  onClick={() =>
                    router.push(
                      `/sign-in?redirect=${encodeURIComponent(
                        `${pathname}${searchParams.toString() ? `?${searchParams.toString()}` : ""}`
                      )}`
                    )
                  }
                >
                  Log In
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog
            open={isCheckoutSessionInactiveDialogOpen}
            onOpenChange={setIsCheckoutSessionInactiveDialogOpen}
          >
            <DialogContent className="max-w-[480px] p-6">
              <h2 className="text-lg font-semibold text-dark-blue-400">
                Your checkout session has ended
              </h2>
              <p className="mt-3 text-sm leading-5 text-gray-500">
                This checkout session is no longer active. Please try again to
                continue.
              </p>
              <div className="mt-6 flex justify-end">
                <Button
                  onClick={() =>
                    router.push(
                      `/checkout/project-details?listingId=${encodeURIComponent(checkout.listingId ?? "")}`
                    )
                  }
                >
                  Try Again
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={!hasProjectPaymentRows}>
            <DialogContent
              className="max-w-[480px] p-6"
              onPointerDownOutside={(event) => event.preventDefault()}
              onInteractOutside={(event) => event.preventDefault()}
              onEscapeKeyDown={(event) => event.preventDefault()}
            >
              <h2 className="text-lg font-semibold text-dark-blue-400">
                Your payment method is no longer valid
              </h2>
              <p className="mt-3 text-sm leading-5 text-gray-500">
                Please go back and select a different payment method.
              </p>
              <div className="mt-6 flex justify-end">
                <Button onClick={handleEditPaymentMethods}>Try Again</Button>
              </div>
            </DialogContent>
          </Dialog>
        </>
      )}

      <Dialog
        open={legalDialog !== null}
        onOpenChange={(open) => {
          if (!open) setLegalDialog(null)
        }}
      >
        <DialogContent className="max-w-[480px] p-6">
          <h2 className="text-lg font-semibold text-dark-blue-400">
            {shownLegalDialog === "privacy" ? "Privacy Policy" : "Terms of Use"}
          </h2>
          <p className="mt-3 text-sm leading-5 text-gray-500">
            {shownLegalDialog === "privacy"
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
