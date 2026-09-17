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
  ArrowRight,
  Bank,
  CheckCircle,
  PhoneCall,
  Printer,
  Users03,
} from "@blend-metrics/icons"
import type { UserProfile } from "@/types/user"
import { CalBookingButton } from "@/components/cal-booking-button"
import { CheckoutNavigation } from "@/components/checkout-navigation"
import {
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
} from "@/components/ui"

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

type InstallmentPaymentMethodType =
  | "CREDIT_DEBIT_CARD"
  | "BANK_ACCOUNT"
  | "APPLE_PAY"
  | "GOOGLE_PAY"
  | "KLARNA"
  | "WIRE_TRANSFER"

type InstallmentPaymentMethod = {
  id: string
  method: InstallmentPaymentMethodType
  title: string
  subtitle: string
  cardNumber?: string
  saveDefaultPaymentMethod?: boolean
  accountType?: string
  accountNumber?: string
}

type PaymentPageSnapshot = {
  pay: "AT_ONCE" | "IN_INSTALLMENTS"
  selectedTalentPaymentPlanId: string
  useBalance?: boolean
  customAmount?: string
  savedInstallmentPaymentMethods: InstallmentPaymentMethod[]
  fullPaymentMethods: InstallmentPaymentMethod[]
  hasSplitFullPayment: boolean
  showFullPaymentMethods: boolean
  isAutoSplitEnabled?: boolean
  splitPaymentAllocations?: Record<string, string>
  firstInstallmentMethods: InstallmentPaymentMethod[]
  secondInstallmentMethods: InstallmentPaymentMethod[]
  isWireTransfer: boolean
  giftCards?: AppliedGiftCard[]
}

type AppliedGiftCard = {
  code: string
  amount: number
}

type ReviewPaymentRow = {
  id: string
  method: InstallmentPaymentMethod
  amount: number
  label: string
  showBillingAddress?: boolean
}

const formatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
})

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

const getCardBrandLabel = (method: InstallmentPaymentMethod) => {
  const source = `${method.title} ${method.subtitle}`.toLowerCase()

  if (source.includes("amex") || source.includes("american express")) {
    return "AMEX"
  }

  if (source.includes("visa")) return "Visa"

  return method.title || "Credit card"
}

const getPaymentMethodLast4 = (method: InstallmentPaymentMethod) =>
  method.cardNumber?.slice(-4) ||
  method.accountNumber?.slice(-4) ||
  method.subtitle.match(/\*+(\d{4})/)?.[1] ||
  null

const getPaymentMethodTitle = (method: InstallmentPaymentMethod) => {
  if (method.method === "CREDIT_DEBIT_CARD") {
    const last4 = getPaymentMethodLast4(method)
    return `${getCardBrandLabel(method)} ${
      method.title.toLowerCase().includes("debit")
        ? "debit card"
        : "credit card"
    }${last4 ? ` ending in *${last4}` : ""}`
  }

  if (method.method === "BANK_ACCOUNT") {
    const last4 = getPaymentMethodLast4(method)
    const accountType = method.accountType || "checking"
    return `${method.title} ${accountType.toLowerCase()}${
      last4 ? ` ending in *${last4}` : ""
    }`
  }

  if (method.method === "WIRE_TRANSFER") return "Wire transfer"
  if (method.method === "GOOGLE_PAY") return "Google Pay"
  if (method.method === "APPLE_PAY") return "Apple Pay"
  if (method.method === "KLARNA") return "Klarna"

  return method.title
}

const PaymentMethodIcon = ({
  method,
}: {
  method: InstallmentPaymentMethod
}) => {
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
  const [talentProfile, setTalentProfile] = React.useState<UserProfile | null>(
    null
  )
  const [paymentSnapshot, setPaymentSnapshot] =
    React.useState<PaymentPageSnapshot | null>(null)
  const [hasHydratedPaymentState, setHasHydratedPaymentState] =
    React.useState(false)
  const [selectedAddOnIds, setSelectedAddOnIds] = React.useState<string[]>([])
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
    if (typeof window === "undefined") return

    const paymentStateStorageKey = `checkout-payment-state:${basePath}:${decodedSlug}`

    try {
      const rawSnapshot = window.sessionStorage.getItem(paymentStateStorageKey)
      if (rawSnapshot) {
        setPaymentSnapshot(JSON.parse(rawSnapshot) as PaymentPageSnapshot)
      }
    } catch {
      window.sessionStorage.removeItem(paymentStateStorageKey)
    } finally {
      setHasHydratedPaymentState(true)
    }
  }, [basePath, decodedSlug])

  React.useEffect(() => {
    if (!isTalentCheckout || typeof window === "undefined") return

    const addOnStateStorageKey = `checkout-addons:${basePath}:${decodedSlug}`

    try {
      const rawSelectedAddOnIds =
        window.sessionStorage.getItem(addOnStateStorageKey)
      if (!rawSelectedAddOnIds) return
      const nextSelectedAddOnIds = JSON.parse(rawSelectedAddOnIds) as string[]
      if (Array.isArray(nextSelectedAddOnIds)) {
        setSelectedAddOnIds(nextSelectedAddOnIds)
      }
    } catch {
      window.sessionStorage.removeItem(addOnStateStorageKey)
    }
  }, [basePath, decodedSlug, isTalentCheckout])

  const projectCost = 94_000
  const estimatedProjectTax = 0
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
  const giftCards = paymentSnapshot?.giftCards || []
  const totalGiftCardAmount = giftCards.reduce(
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
  const initialInstallmentRows: ReviewPaymentRow[] =
    firstInstallmentMethods.map((method) => ({
      id: method.id,
      method,
      amount: totalDueToday,
      label: "Payment Amount",
      showBillingAddress: false,
    }))
  const recurringInstallmentRows: ReviewPaymentRow[] =
    secondInstallmentMethods.map((method) => ({
      id: method.id,
      method,
      amount: installmentAmount,
      label: "Monthly Payment Amount",
      showBillingAddress: false,
    }))
  const orderReference = "C01-12345-6789"
  const orderDateLabel = "November 5th, 2025 at 11:11 PM EST"
  const confirmationEmail = "jack2024@gmail.com"
  const downloadInvoice = React.useCallback(
    (invoiceText: string) => {
      const blob = new Blob([invoiceText], {
        type: "text/plain;charset=utf-8",
      })
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement("a")
      anchor.href = url
      anchor.download = `marketeq-invoice-${orderReference}.txt`
      anchor.click()
      URL.revokeObjectURL(url)
    },
    [orderReference]
  )

  const formatInvoicePaymentLine = (row: ReviewPaymentRow) =>
    `${getPaymentMethodTitle(row.method)} - ${row.label}: ${formatter.format(
      row.amount
    )}`

  const renderProjectPaymentRow = (
    row: ReviewPaymentRow,
    options?: { isLast?: boolean }
  ) => (
    <div
      key={row.id}
      className={
        options?.isLast
          ? "grid grid-cols-2"
          : "grid grid-cols-2 border-b border-gray-200"
      }
    >
      <div className="flex items-start gap-x-3 py-4">
        <PaymentMethodIcon method={row.method} />
        <div className="flex-auto space-y-1">
          <h2 className="text-sm font-semibold text-dark-blue-400">
            {getPaymentMethodTitle(row.method)}
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
        <div className="px-3 py-4">
          <div className="space-y-1">
            <h2 className="text-sm font-semibold text-dark-blue-400">
              Billing Address
            </h2>
            <p className="text-xs font-light text-dark-blue-400">
              2125 Chestnut Street, San Francisco, CA 94123
            </p>
          </div>
        </div>
      ) : (
        <div />
      )}
    </div>
  )

  if (isTalentCheckout) {
    const selectedRateValue = searchParams.get("rate") || "web-development"
    const selectedSchedule = searchParams.get("schedule") || "full-time"
    const selectedDuration = searchParams.get("duration") || "Ongoing"
    const selectedRate =
      offerRates.find((rate) => rate.value === selectedRateValue) ||
      offerRates.find((rate) => rate.value === "web-development") ||
      offerRates[0]
  // See checkout/[slug]/project-details/page.tsx — a custom rate has no offerRates tile,
    // so it travels as its own param and wins over the tile price here.
    const customRateParam = Number(searchParams.get("customRate"))
    const hourlyRate =
      Number.isFinite(customRateParam) && customRateParam > 0
        ? customRateParam
        : Number(selectedRate?.price.replace(/[^0-9.]/g, "") || 0)
    const estimatedTaxHourly = hourlyRate * 0.07
    const totalHourlyRate = hourlyRate + estimatedTaxHourly
    const weeklyAmountBase = Math.round(totalHourlyRate * 40)
    const hasProjectManagerAddOn = selectedAddOnIds.includes("project-manager")
    const addOnWeeklyTotal = hasProjectManagerAddOn ? 340 : 0
    const weeklyAmountTotal = weeklyAmountBase + addOnWeeklyTotal
    const estimatedJobCost = Math.round(totalHourlyRate * 40 * 32)
    const addOnTotal = addOnWeeklyTotal * 32
    const fullDueToday = estimatedJobCost + addOnTotal
    const recurringPlanOptions = [
      { id: "weekly", label: "Weekly", amount: weeklyAmountTotal },
      { id: "bi-weekly", label: "Bi-Weekly", amount: weeklyAmountTotal * 2 },
      { id: "monthly", label: "Monthly", amount: weeklyAmountTotal * 4 },
    ]
    const selectedRecurringPlan =
      recurringPlanOptions.find(
        (option) => option.id === paymentSnapshot?.selectedTalentPaymentPlanId
      ) || recurringPlanOptions[0]
    const recurringPlanAmount = selectedRecurringPlan.amount
    const formattedHourlyRate = `$${hourlyRate.toFixed(0)}/hr`
    const formattedEstimatedTaxHourly = `$${estimatedTaxHourly.toFixed(2)}/hr`
    const formattedTotalHourlyRate = `$${totalHourlyRate.toFixed(2)}/hr`
    const formattedRecurringPlanAmount = formatter.format(recurringPlanAmount)
    const formattedInitialOneTimeAmount = formatter.format(
      recurringPlanAmount * 2
    )
    const formattedFullDueToday = formatter.format(fullDueToday)
    const talentName =
      talentProfile?.firstName ||
      decodedSlug.split("-")[0]?.replace(/^./, (char) => char.toUpperCase()) ||
      "Alex"
    const talentUsername = talentProfile?.username || decodedSlug
    const talentAvatarUrl = talentProfile?.avatarUrl || ""
    const talentJobTitle = getDefaultJobTitle(talentProfile)
    const talentExperienceLabel = getExperienceLabel(talentProfile)
    const scheduleTitle =
      selectedSchedule === "part-time" ? "Part time" : "Full time"
    const scheduleDetail =
      selectedSchedule === "part-time"
        ? "Up to 30 hrs/week"
        : "Over 30 hrs/week"
    const paymentMode = paymentSnapshot?.pay || "AT_ONCE"
    const fullPaymentMethods = paymentSnapshot?.fullPaymentMethods || []
    const initialPaymentMethods = paymentSnapshot?.firstInstallmentMethods || []
    const recurringPaymentMethods =
      paymentSnapshot?.secondInstallmentMethods || []

    const renderPaymentMethodIdentity = (method: InstallmentPaymentMethod) => {
      if (method.method === "BANK_ACCOUNT") {
        return {
          icon: (
            <div className="inline-flex items-center rounded-[4px] shrink-0 bg-white border border-gray-200 text-gray-500 justify-center w-[46.5px] h-[31px]">
              <Bank className="size-4" />
            </div>
          ),
          title: method.title || "Bank of America",
          subtitle: method.accountNumber?.slice(-4)
            ? `${method.accountType || "Checking"} ending in *${method.accountNumber.slice(-4)}`
            : method.accountType || "Checking",
          meta: null as string | null,
        }
      }

      if (method.method === "WIRE_TRANSFER") {
        return {
          icon: (
            <div className="inline-flex items-center rounded-[4px] shrink-0 bg-white border border-gray-200 text-gray-500 justify-center w-[46.5px] h-[31px]">
              <Bank className="size-4" />
            </div>
          ),
          title: "Domestic wire transfer",
          subtitle: method.subtitle,
          meta: null as string | null,
        }
      }

      if (method.method === "GOOGLE_PAY") {
        return {
          icon: <Visa className="h-[30px] w-[45px] shrink-0" />,
          title: "Google Pay",
          subtitle: "Wallet",
          meta: null as string | null,
        }
      }

      if (method.method === "APPLE_PAY") {
        return {
          icon: <Visa className="h-[30px] w-[45px] shrink-0" />,
          title: "Apple Pay",
          subtitle: "Wallet",
          meta: null as string | null,
        }
      }

      const isAmex = method.cardNumber?.startsWith("3")
      return {
        icon: isAmex ? (
          <Amex className="h-[30px] w-[45px] shrink-0" />
        ) : (
          <Visa className="h-[30px] w-[45px] shrink-0" />
        ),
        title: `${isAmex ? "AMEX" : "Visa"} ${
          isAmex ? "credit" : "debit"
        } card${method.cardNumber?.slice(-4) ? ` ending in *${method.cardNumber.slice(-4)}` : ""}`,
        subtitle: null as string | null,
        meta: "Expires: 09/2027",
      }
    }

    const renderSummaryRow = (
      method: InstallmentPaymentMethod,
      amountLabel: string,
      _showBillingAddress = false,
      key?: string
    ) => {
      const identity = renderPaymentMethodIdentity(method)
      return (
        <div key={key || method.id} className="grid grid-cols-2">
          <div className="border-b flex items-start gap-x-3 border-gray-200 py-4">
            {identity.icon}
            <div className="flex-auto space-y-1">
              <h2 className="text-sm font-semibold text-dark-blue-400">
                {identity.title}
              </h2>
              {identity.meta ? (
                <p className="text-xs font-light text-dark-blue-400">
                  {identity.meta}
                </p>
              ) : null}
              <p className="text-xs font-light text-dark-blue-400">
                Payment Amount:{" "}
                <span className="font-semibold">{amountLabel}</span>
              </p>
            </div>
          </div>

          <div className="border-b border-gray-200 px-3 py-4" />
        </div>
      )
    }

    return (
      <div className="bg-gray-50 pt-[64px]">
        <CheckoutNavigation currentStep={3} showSteps={false} logoHref="" />

        <div className="px-[150px] py-[36px]">
          <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-[0px_1px_5px_0px_rgba(16,24,40,.02)]">
            <div className="flex items-start justify-between gap-x-8">
              <div className="flex min-w-0 flex-auto items-start gap-x-5">
                <div className="size-12 border-[8px] text-success-500 border-success-50 bg-success-100 rounded-full shrink-0 inline-flex items-center justify-center">
                  <CheckCircle className="size-6" />
                </div>

                <div className="min-w-0">
                  <h1 className="text-[20px] font-bold leading-none text-success-600">
                    Your Offer has been sent to {talentName}
                  </h1>

                  <div className="mt-5 flex items-center gap-x-2 flex-wrap">
                    <p className="text-base text-dark-blue-400">
                      A copy of your invoice and order details has been sent to{" "}
                      <span className="font-semibold">jack2024@gmail.com</span>
                    </p>
                    <Button className="underline" variant="link" visual="gray">
                      Change Email
                    </Button>
                  </div>

                  <div className="mt-3 flex items-center gap-x-3 flex-wrap">
                    <span className="text-base text-gray-500">
                      Your Order ID: C01-12345-6789
                    </span>
                    <span className="inline-block h-[17px] w-0.5 bg-gray-200 shrink-0" />
                    <span className="text-base text-gray-500">
                      Order Date: November 5th, 2025 at 11:11 PM EST
                    </span>
                  </div>

                  <div className="mt-5 text-base text-dark-blue-400">
                    Need to make changes to your order? View{" "}
                    <Button
                      className="underline"
                      variant="link"
                      onClick={() =>
                        router.push(
                          `${basePath}/${slug}/review?${searchParams.toString()}`
                        )
                      }
                    >
                      Order Details
                    </Button>{" "}
                    or{" "}
                    <Button className="underline" variant="link">
                      Contact Us
                    </Button>
                  </div>
                </div>
              </div>

              <Button
                variant="outlined"
                visual="gray"
                size="lg"
                onClick={() => router.push("/talent")}
              >
                Continue Browsing <ArrowRight className="size-[15px]" />
              </Button>
            </div>
          </div>

          <div className="mt-6 flex gap-x-8">
            <div className="flex-auto">
              <div className="rounded-lg border border-gray-200 bg-white shadow-[0px_1px_5px_0px_rgba(16,24,40,.02)]">
                <div className="py-5 px-6 border-b flex items-center justify-between border-gray-200">
                  <h1 className="text-lg font-semibold text-dark-blue-400">
                    Contract Details
                  </h1>

                  <Button
                    variant="link"
                    visual="primary"
                    onClick={() =>
                      router.push(
                        `${basePath}/${slug}/project-details?${searchParams.toString()}`
                      )
                    }
                  >
                    Review Your Offer
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
                    <div className="mt-3 inline-flex items-center gap-x-2">
                      <span className="text-[13px] leading-none font-semibold text-dark-blue-400">
                        January 2024 - August 2024
                      </span>
                      <span className="text-[13px] leading-none font-semibold text-primary-500">
                        8 months
                      </span>
                    </div>
                  </div>

                  <div className="inline-flex flex-col items-end justify-between self-stretch">
                    <Badge size="sm" visual="warning">
                      Offer Pending
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

                <div className="border-t border-gray-200 p-6 flex items-center justify-between gap-x-4">
                  <div>
                    <h1 className="text-base font-semibold text-dark-blue-400">
                      Set up your introductory call with {talentName}
                    </h1>
                    <p className="mt-1 text-sm font-light text-dark-blue-400">
                      Reach out to your hire to align on expectations before
                      work begins
                    </p>
                  </div>

                  <CalBookingButton
                    className="text-primary-500 bg-primary-50 hover:bg-primary-500 hover:text-white"
                    visual="primary"
                  >
                    <PhoneCall className="size-[15px]" />
                    Schedule Call
                  </CalBookingButton>
                </div>
              </div>

              <div className="rounded-lg mt-6 border border-gray-200 bg-white shadow-[0px_1px_5px_0px_rgba(16,24,40,.02)]">
                <div className="py-5 px-6 border-b border-gray-200">
                  <h1 className="text-lg font-semibold text-dark-blue-400">
                    Payment Methods
                  </h1>
                  <p className="mt-1.5 text-sm font-light text-dark-blue-400">
                    The following payment methods will be billed for the total
                    amount of{" "}
                    <span className="font-bold">{formattedFullDueToday}</span>
                  </p>
                  <p className="mt-1.5 text-sm font-light text-dark-blue-400">
                    You will see a charge on your bank statement from{" "}
                    <span className="font-bold">Marketeq</span>
                  </p>
                </div>

                <div className="p-6">
                  {paymentMode === "AT_ONCE" ? (
                    <div>
                      {fullPaymentMethods.map((method) =>
                        renderSummaryRow(
                          method,
                          formatter.format(
                            paymentSnapshot?.hasSplitFullPayment &&
                              fullPaymentMethods.length > 1
                              ? Math.round(
                                  fullDueToday / fullPaymentMethods.length
                                )
                              : fullDueToday
                          ),
                          method.method !== "BANK_ACCOUNT" &&
                            method.method !== "WIRE_TRANSFER"
                        )
                      )}
                    </div>
                  ) : (
                    <div>
                      {initialPaymentMethods.length > 0 ? (
                        <div>
                          <h1 className="text-lg font-semibold text-dark-blue-400">
                            Initial One-Time Payment
                          </h1>
                          <div className="mt-2">
                            {initialPaymentMethods.map((method) =>
                              renderSummaryRow(
                                method,
                                formatter.format(
                                  Math.round(
                                    (recurringPlanAmount * 2) /
                                      Math.max(initialPaymentMethods.length, 1)
                                  )
                                ),
                                false
                              )
                            )}
                          </div>
                        </div>
                      ) : null}

                      <div
                        className={
                          initialPaymentMethods.length > 0 ? "mt-6" : ""
                        }
                      >
                        <h1 className="text-lg font-semibold text-dark-blue-400">
                          Recurring Payments
                        </h1>
                        <p className="mt-1.5 text-sm font-light text-dark-blue-400">
                          Your following payment methods will be debited on{" "}
                          <span className="font-bold">1st of every</span> month
                          for the amount referenced below until the{" "}
                          <span className="font-bold">
                            completion of your project.
                          </span>
                        </p>
                        <div className="mt-2">
                          {(recurringPaymentMethods.length > 0
                            ? recurringPaymentMethods
                            : fullPaymentMethods
                          ).map((method) =>
                            renderSummaryRow(
                              method,
                              formatter.format(
                                Math.round(
                                  recurringPlanAmount /
                                    Math.max(
                                      recurringPaymentMethods.length > 0
                                        ? recurringPaymentMethods.length
                                        : fullPaymentMethods.length,
                                      1
                                    )
                                )
                              ),
                              method.method !== "BANK_ACCOUNT" &&
                                method.method !== "WIRE_TRANSFER"
                            )
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="w-[305px] shrink-0">
              <div className="w-[305px] shrink-0 p-5 rounded-lg bg-white border border-gray-200 shadow-[0px_1px_5px_0px_rgba(16,24,40,.02)]">
                <div className="border-b pb-4 border-gray-200">
                  <h1 className="text-base leading-none font-semibold text-dark-blue-400">
                    Payment Details
                  </h1>
                </div>

                <div className="mt-5">
                  <div className="mt-4 space-y-2">
                    {paymentMode === "AT_ONCE" ? (
                      <>
                        <div className="flex items-center justify-between">
                          <span className="inline-block text-xs leading-none text-dark-blue-400 font-light">
                            Estimated Total Team Cost
                          </span>
                          <span className="inline-block text-xs leading-none text-dark-blue-400 font-light">
                            {formatter.format(estimatedJobCost)}
                          </span>
                        </div>
                        {hasProjectManagerAddOn ? (
                          <div className="flex items-center justify-between">
                            <span className="inline-block text-xs leading-none text-dark-blue-400 font-light">
                              Estimated Add-on Cost
                            </span>
                            <span className="inline-block text-xs leading-none text-dark-blue-400 font-light">
                              {formatter.format(addOnTotal)}
                            </span>
                          </div>
                        ) : null}
                        <div className="flex items-center justify-between">
                          <span className="inline-block text-xs leading-none text-dark-blue-400 font-light">
                            Estimated tax *
                          </span>
                          <span className="inline-block text-xs leading-none text-dark-blue-400 font-light">
                            $0.00
                          </span>
                        </div>
                      </>
                    ) : (
                      <>
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
                        {hasProjectManagerAddOn ? (
                          <div className="flex items-start justify-between gap-x-3">
                            <span className="inline-flex flex-col">
                              <span className="inline-block text-xs leading-none text-dark-blue-400 font-light">
                                Project Manager
                              </span>
                              <span className="inline-block mt-1 text-[10px] leading-[14px] text-dark-blue-400 font-light">
                                4hrs/week
                              </span>
                            </span>
                            <span className="inline-block text-xs leading-none text-dark-blue-400 font-light">
                              Est. $85/hr
                            </span>
                          </div>
                        ) : null}
                        <div className="flex items-center justify-between">
                          <span className="inline-block text-xs leading-none text-dark-blue-400 font-light">
                            {selectedRecurringPlan.label} Amount
                          </span>
                          <span className="inline-block text-xs leading-none text-dark-blue-400 font-light">
                            {formattedRecurringPlanAmount}
                          </span>
                        </div>
                      </>
                    )}
                  </div>

                  <div className="flex mt-5 items-center justify-between">
                    <h1 className="inline-block text-base font-bold leading-none text-dark-blue-400">
                      Due today
                    </h1>
                    <h1 className="inline-block text-base font-bold leading-none text-dark-blue-400">
                      {paymentMode === "AT_ONCE"
                        ? formattedFullDueToday
                        : formattedInitialOneTimeAmount}
                    </h1>
                  </div>
                </div>

                <div className="mt-2">
                  {paymentMode === "IN_INSTALLMENTS" ? (
                    <div className="mt-5 rounded-[4px] p-2 bg-primary-25 flex items-center justify-between">
                      <span className="text-[10px] text-dark-blue-400">
                        Your {selectedRecurringPlan.label.toLowerCase()}{" "}
                        payments start from
                      </span>
                      <span className="text-[10px] font-medium text-dark-blue-400">
                        Jan 1st, 2025
                      </span>
                    </div>
                  ) : null}

                  <div className="grid mt-2.5">
                    <Button
                      className="border-2 border-primary-500 bg-transparent text-primary-500 hover:bg-primary-500 hover:text-white"
                      onClick={() => {
                        const paymentLines =
                          paymentMode === "AT_ONCE"
                            ? fullPaymentMethods.map(
                                (method) =>
                                  `${renderPaymentMethodIdentity(method).title} - Payment Amount: ${
                                    paymentSnapshot?.hasSplitFullPayment &&
                                    fullPaymentMethods.length > 1
                                      ? formatter.format(
                                          Math.round(
                                            fullDueToday /
                                              fullPaymentMethods.length
                                          )
                                        )
                                      : formattedFullDueToday
                                  }`
                              )
                            : [
                                ...initialPaymentMethods.map(
                                  (method) =>
                                    `${renderPaymentMethodIdentity(method).title} - Initial Payment: ${formatter.format(
                                      Math.round(
                                        (recurringPlanAmount * 2) /
                                          Math.max(
                                            initialPaymentMethods.length,
                                            1
                                          )
                                      )
                                    )}`
                                ),
                                ...(recurringPaymentMethods.length > 0
                                  ? recurringPaymentMethods
                                  : fullPaymentMethods
                                ).map(
                                  (method) =>
                                    `${renderPaymentMethodIdentity(method).title} - ${selectedRecurringPlan.label} Payment: ${formatter.format(
                                      Math.round(
                                        recurringPlanAmount /
                                          Math.max(
                                            recurringPaymentMethods.length > 0
                                              ? recurringPaymentMethods.length
                                              : fullPaymentMethods.length,
                                            1
                                          )
                                      )
                                    )}`
                                ),
                              ]

                        downloadInvoice(
                          [
                            "Marketeq Invoice",
                            `Order ID: ${orderReference}`,
                            `Order Date: ${orderDateLabel}`,
                            `Email: ${confirmationEmail}`,
                            "",
                            "Payment Details",
                            `Estimated Total Team Cost: ${formatter.format(
                              estimatedJobCost
                            )}`,
                            hasProjectManagerAddOn
                              ? `Estimated Add-on Cost: ${formatter.format(
                                  addOnTotal
                                )}`
                              : "",
                            "Estimated tax *: $0.00",
                            `Due today: ${
                              paymentMode === "AT_ONCE"
                                ? formattedFullDueToday
                                : formattedInitialOneTimeAmount
                            }`,
                            "",
                            "Payment Methods",
                            ...paymentLines,
                          ]
                            .filter(Boolean)
                            .join("\n")
                        )
                      }}
                    >
                      <Printer className="size-[15px]" />
                      Print Invoice
                    </Button>
                  </div>

                  <div className="mt-5">
                    <span className="inline-block text-center text-[10px] font-light text-dark-blue-400 leading-[14px]">
                      By submitting your payment, you agree to Marketeq&apos;s{" "}
                      <Button
                        className="text-[10px] leading-[14px] underline"
                        variant="link"
                      >
                        Terms of Use
                      </Button>{" "}
                      and{" "}
                      <Button
                        className="text-[10px] leading-[14px] underline"
                        variant="link"
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
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const isInstallmentPlan = paymentPlan === "IN_INSTALLMENTS"
  const designedInitialPaymentRows: ReviewPaymentRow[] =
    initialInstallmentRows.length > 0
      ? initialInstallmentRows
      : []
  const designedRecurringPaymentRows: ReviewPaymentRow[] =
    recurringInstallmentRows.length > 0
      ? recurringInstallmentRows
      : []

  return (
    <div className="bg-gray-50 pt-[64px]" aria-busy={!hasHydratedPaymentState}>
      <CheckoutNavigation currentStep={3} showSteps={false} logoHref="" />

      <div className="px-[150px] py-[50px]">
        <div className="rounded-lg border border-gray-200 bg-white p-8 pr-[60px] shadow-[0px_1px_5px_0px_rgba(16,24,40,.02)]">
          <div className="flex items-start justify-between gap-x-8">
            <div className="flex min-w-0 flex-auto items-start gap-x-5">
              <div className="size-12 inline-flex shrink-0 items-center justify-center rounded-full border-[8px] border-success-50 bg-success-100 text-success-500">
                <CheckCircle className="size-6" />
              </div>

              <div className="min-w-0 flex-auto">
                <h1 className="text-[28px] font-bold leading-none text-success-600">
                  Thank you for launching your project with Marketeq!
                </h1>

                <div className="mt-5 flex flex-wrap items-center gap-x-2">
                  <p className="text-base text-dark-blue-400">
                    A copy of your invoice and order details has been sent to{" "}
                    <span className="font-semibold">{confirmationEmail}</span>
                  </p>
                  <Button className="underline" variant="link" visual="gray">
                    Change Email
                  </Button>
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-x-3">
                  <span className="text-base text-gray-500">
                    Your Order ID: {orderReference}
                  </span>
                  <span className="inline-block h-[17px] w-0.5 shrink-0 bg-gray-200" />
                  <span className="text-base text-gray-500">
                    Order Date: {orderDateLabel}
                  </span>
                </div>

                <div className="mt-5 text-base text-dark-blue-400">
                  Need to make changes to your order? View{" "}
                  <Button
                    className="underline"
                    variant="link"
                    onClick={() =>
                      router.push(
                        `${basePath}/${slug}/review?${searchParams.toString()}`
                      )
                    }
                  >
                    Order Details
                  </Button>{" "}
                  or{" "}
                  <Button className="underline" variant="link">
                    Contact Us
                  </Button>
                </div>
              </div>
            </div>

            <Button
              variant="outlined"
              visual="gray"
              size="lg"
              onClick={() => router.push("/client-dashboard")}
            >
              Continue Browsing <ArrowRight className="size-[15px]" />
            </Button>
          </div>
        </div>

        <div className="mt-6 flex gap-x-8">
          <div className="flex-auto">
            <div className="rounded-lg border border-gray-200 bg-white shadow-[0px_1px_5px_0px_rgba(16,24,40,.02)]">
              <div className="border-b border-gray-200 px-6 py-5">
                <h1 className="text-lg font-semibold text-dark-blue-400">
                  Project Details
                </h1>
              </div>

              <div className="flex gap-x-5 p-5">
                <div className="relative w-[181px] flex-none overflow-hidden rounded-md border border-[#DFDFDF] bg-white">
                  <NextImage
                    className="object-cover"
                    src="/dashboard.png"
                    alt="Dashboard"
                    sizes="50vw"
                    fill
                  />
                </div>
                <div className="flex-auto">
                  <h1 className="text-sm font-medium text-dark-blue-400">
                    Marketeq Client Portal - Redesigning and Optimizing Website
                    for Enhanced User Experience.
                  </h1>

                  <div className="mt-1.5 inline-flex gap-x-2">
                    <Users03 className="size-[15px] shrink-0" />
                    <span className="text-xs font-semibold leading-5 text-dark-blue-400">
                      8 team members
                    </span>
                  </div>

                  <div className="mt-1.5 text-[13px] leading-5 text-dark-blue-400">
                    January 2024 - August 2024
                  </div>
                </div>
              </div>

              <div className="border-t border-gray-200 p-6">
                <h1 className="text-base font-semibold text-dark-blue-400">
                  Set up your introductory call
                </h1>
                <p className="mt-1 text-sm font-light text-dark-blue-400">
                  Connect with team leaders to align on project details and next
                  steps
                </p>

                <article className="flex items-center justify-between py-6">
                  <div className="flex items-center gap-x-3">
                    <Avatar size="md" className="shrink-0">
                      <AvatarImage src="/man.jpg" alt="John Villago" />
                      <AvatarFallback>J</AvatarFallback>
                    </Avatar>

                    <div>
                      <h1 className="text-sm font-semibold text-dark-blue-400">
                        John Villago
                      </h1>
                      <p className="text-xs font-light text-dark-blue-400">
                        Account Manager
                      </p>
                    </div>
                  </div>

                  <CalBookingButton
                    className="bg-primary-50 text-primary-500 hover:bg-primary-500 hover:text-white"
                    visual="primary"
                  >
                    <PhoneCall className="size-[15px]" />
                    Schedule Call
                  </CalBookingButton>
                </article>

                <article className="flex items-center justify-between border-t border-gray-200 py-6">
                  <div className="flex items-center gap-x-3">
                    <Avatar size="md" className="shrink-0">
                      <AvatarImage src="/man.jpg" alt="Larah Varghese" />
                      <AvatarFallback>L</AvatarFallback>
                    </Avatar>

                    <div>
                      <h1 className="text-sm font-semibold text-dark-blue-400">
                        Larah Varghese
                      </h1>
                      <p className="text-xs font-light text-dark-blue-400">
                        Project Manager
                      </p>
                    </div>
                  </div>

                  <CalBookingButton
                    className="bg-primary-50 text-primary-500 hover:bg-primary-500 hover:text-white"
                    visual="primary"
                  >
                    <PhoneCall className="size-[15px]" />
                    Schedule Call
                  </CalBookingButton>
                </article>
              </div>
            </div>

            <div className="mt-8 rounded-lg border border-gray-200 bg-white shadow-[0px_1px_5px_0px_rgba(16,24,40,.02)]">
              <div className="border-b border-gray-200 px-6 py-5">
                <h1 className="text-lg font-semibold text-dark-blue-400">
                  Payment Methods
                </h1>
                <p className="mt-1.5 text-sm font-light text-dark-blue-400">
                  The following payment methods will be billed for the total
                  amount of{" "}
                  <span className="font-bold">
                    {formatter.format(totalDueToday)}
                  </span>
                </p>
                <p className="mt-1.5 text-sm font-light text-dark-blue-400">
                  You will see a charge on your bank statement from{" "}
                  <span className="font-bold">Marketeq</span>
                </p>
              </div>

              <div className="p-6">
                <div>
                  <h1 className="text-lg font-semibold text-dark-blue-400">
                    Initial One-Time Payment
                  </h1>
                  <div className="mt-2">
                    {designedInitialPaymentRows.map((row, index, rows) =>
                      renderProjectPaymentRow(row, {
                        isLast: index === rows.length - 1,
                      })
                    )}
                  </div>

                  <div className="mt-6">
                    <h1 className="text-lg font-semibold text-dark-blue-400">
                      Recurring Payments
                    </h1>
                    <p className="mt-1.5 text-sm font-light text-dark-blue-400">
                      Your following payment methods will be debited on{" "}
                      <span className="font-bold">1st of every month</span> for
                      the amount referenced below until the{" "}
                      <span className="font-bold">
                        completion of your project.
                      </span>
                    </p>

                    <div className="mt-2">
                      {designedRecurringPaymentRows.map((row, index, rows) =>
                        renderProjectPaymentRow(row, {
                          isLast: index === rows.length - 1,
                        })
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-8 flex items-start gap-x-2 rounded-lg border border-gray-200 bg-white p-6 pr-8 shadow-[0px_1px_5px_0px_rgba(16,24,40,.02)]">
              <div className="flex-auto space-y-2">
                <h1 className="text-2xl font-bold text-dark-blue-400">
                  Kickoff your project
                </h1>
                <p className="text-base font-light text-dark-blue-400">
                  Here&apos;s some things you can do to get your project going
                  in the right direction.
                </p>
              </div>
              <Button
                onClick={() => router.push(`${basePath}/${slug}/next-steps`)}
              >
                Next Steps <ArrowRight className="size-[15px]" />
              </Button>
            </div>
          </div>

          <div className="w-[305px] shrink-0">
            <div className="w-[305px] shrink-0 rounded-lg border border-gray-200 bg-white p-5 shadow-[0px_1px_5px_0px_rgba(16,24,40,.02)]">
              <div className="border-b border-gray-200 pb-4">
                <h1 className="text-base font-semibold leading-none text-dark-blue-400">
                  Payment Details
                </h1>
              </div>

              <div className="mt-5">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="inline-block text-xs font-light leading-none text-dark-blue-400">
                      Project cost
                    </span>
                    <span className="inline-block text-xs font-light leading-none text-dark-blue-400">
                      {formatter.format(projectCost)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="inline-block text-xs font-light leading-none text-dark-blue-400">
                      Estimated tax *
                    </span>
                    <span className="inline-block text-xs font-light leading-none text-dark-blue-400">
                      {estimatedProjectTax === 0
                        ? "$0.00"
                        : formatter.format(estimatedProjectTax)}
                    </span>
                  </div>
                  {appliedBalanceAmount > 0 ? (
                    <div className="flex items-center justify-between">
                      <span className="inline-block text-xs font-light leading-none text-dark-blue-400">
                        Balance applied
                      </span>
                      <span className="inline-block text-xs font-light leading-none text-dark-blue-400">
                        - {formatter.format(appliedBalanceAmount)}
                      </span>
                    </div>
                  ) : null}
                  {totalGiftCardAmount > 0 ? (
                    <div className="flex items-center justify-between">
                      <span className="inline-block text-xs font-light leading-none text-dark-blue-400">
                        Gift card applied
                      </span>
                      <span className="inline-block text-xs font-light leading-none text-dark-blue-400">
                        - {formatter.format(totalGiftCardAmount)}
                      </span>
                    </div>
                  ) : null}
                </div>

                <div className="mt-4 flex items-center justify-between border-t border-gray-200 pt-4">
                  <h1 className="inline-block text-base font-bold leading-none text-dark-blue-400">
                    Total
                  </h1>
                  <h1 className="inline-block text-base font-bold leading-none text-dark-blue-400">
                    {formatter.format(totalDueToday)}
                  </h1>
                </div>
              </div>

              <div className="mt-5 flex items-center justify-between rounded-[4px] bg-primary-25 p-2">
                <span className="text-[10px] text-dark-blue-400">
                  Your monthly payments start from
                </span>
                <span className="text-[10px] font-medium text-dark-blue-400">
                  Jan 1st, 2025
                </span>
              </div>

              <div className="mt-4 grid">
                <Button
                  className="border-2 border-primary-500 bg-transparent text-primary-500 hover:bg-primary-500 hover:text-white"
                  onClick={() =>
                    downloadInvoice(
                      [
                        "Marketeq Invoice",
                        `Order ID: ${orderReference}`,
                        `Order Date: ${orderDateLabel}`,
                        `Email: ${confirmationEmail}`,
                        "",
                        "Payment Details",
                        `Project cost: ${formatter.format(projectCost)}`,
                        `Estimated tax *: ${
                          estimatedProjectTax === 0
                            ? "$0.00"
                            : formatter.format(estimatedProjectTax)
                        }`,
                        appliedBalanceAmount > 0
                          ? `Balance applied: - ${formatter.format(
                              appliedBalanceAmount
                            )}`
                          : "",
                        totalGiftCardAmount > 0
                          ? `Gift card applied: - ${formatter.format(
                              totalGiftCardAmount
                            )}`
                          : "",
                        `Total: ${formatter.format(totalDueToday)}`,
                        "",
                        "Initial One-Time Payment",
                        ...designedInitialPaymentRows.map(
                          formatInvoicePaymentLine
                        ),
                        "",
                        "Recurring Payments",
                        ...designedRecurringPaymentRows.map(
                          formatInvoicePaymentLine
                        ),
                      ]
                        .filter(Boolean)
                        .join("\n")
                    )
                  }
                >
                  <Printer className="size-[15px]" />
                  Print Invoice
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
