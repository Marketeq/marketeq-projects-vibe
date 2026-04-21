"use client"

import * as React from "react"
import { useParams, usePathname, useRouter, useSearchParams } from "next/navigation"
import { UserAPI } from "@/service/http/user"
import type { UserProfile } from "@/types/user"
import {
  AlertCircle,
  ArrowLeft,
  Bank,
  Check,
  CheckCircle,
  ChevronDown,
  DivideSquare,
  Download02,
  Edit03,
  HelpCircle,
  Lock,
  Plus,
  RefreshCcw,
  ShieldTick,
  SwitchHorizontal01,
  Trash03,
  X,
  Zap,
} from "@blend-metrics/icons"
import CurrencyInput from "react-currency-input-field"
import { CheckoutNavigation } from "@/components/checkout-navigation"
import { CreditCardInput, getCardType } from "@/components/credit-card-input"
import {
  ACH,
  Amex as PaymentAmex,
  ApplePay1,
  Discover as PaymentDiscover,
  Mastercard as PaymentMastercard,
  GPay1,
  Visa as PaymentVisa,
  WireTransfer,
} from "@/components/icons/payment-icons"
import NextImage from "@/components/next-image"
import CreditDebitCardArticle1, {
  CreditDebitCardArticle2,
  CreditDebitCardArticle3,
} from "@/components/ui/credit-debit-card-article/credit-debit-card-article"
import {
  Alert,
  AlertContent,
  AlertDescription,
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
  HeadlessRadioGroupItem,
  IconButton,
  Input,
  InputGroup,
  Label,
  Listbox,
  ListboxButton,
  ListboxOption,
  ListboxOptions,
  RadioGroup,
  RadioGroupItemSelector,
  RmDialog,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableRow,
  Tabs,
  TabsList,
  TabsTrigger,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui"
import { HelperText } from "@/components/ui/helper-text"
import { inputVariants } from "@/components/ui/input"
import { InputRightElement } from "@/components/ui/input/input-element"
import { getDefaultJobTitle, offerRates } from "@/components/hire-me-button"
import { cn } from "@/utils/functions"

const formatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
})

const parseCurrencyAmount = (value?: string | null) => {
  if (!value) return undefined

  const numericValue = Number(value.replace(/[^0-9.]/g, ""))
  return Number.isFinite(numericValue) ? numericValue : undefined
}

type PaymentPlanOption = {
  id: string
  label: string
  value: string
  meta?: string
}

type InstallmentBlock = "first" | "second"
type PaymentMethodFlowTarget = InstallmentBlock | "full"

type InstallmentPaymentMethodType =
  | "CREDIT_DEBIT_CARD"
  | "BANK_ACCOUNT"
  | "APPLE_PAY"
  | "GOOGLE_PAY"
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

type NewPaymentMethodOptionValue =
  | "credit-card"
  | "bank-account"
  | "google-pay"
  | "apple-pay"

type PaymentPageSnapshot = {
  pay: "AT_ONCE" | "IN_INSTALLMENTS"
  selectedTalentPaymentPlanId: string
  savedInstallmentPaymentMethods: InstallmentPaymentMethod[]
  fullPaymentMethods: InstallmentPaymentMethod[]
  hasSplitFullPayment: boolean
  showFullPaymentMethods: boolean
  firstInstallmentMethods: InstallmentPaymentMethod[]
  secondInstallmentMethods: InstallmentPaymentMethod[]
  isWireTransfer: boolean
}

const MasterCard01 = (props: React.SVGProps<SVGSVGElement>) => (
  <svg width={62} height={37} viewBox="0 0 62 37" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
    <path fillRule="evenodd" clipRule="evenodd" d="M43.35 36.57c10.217 0 18.5-8.121 18.5-18.138S53.566.295 43.35.295c-4.58 0-8.77 1.63-12 4.333a18.65 18.65 0 0 0-12-4.333C9.131.295.85 8.415.85 18.432S9.132 36.57 19.35 36.57c4.579 0 8.77-1.63 12-4.333a18.65 18.65 0 0 0 12 4.333" fill="#98A2B3" />
    <path fillRule="evenodd" clipRule="evenodd" d="M31.35 32.236c3.977-3.326 6.5-8.276 6.5-13.804 0-5.527-2.523-10.477-6.5-13.804a18.65 18.65 0 0 1 12-4.333c10.217 0 18.5 8.12 18.5 18.137s-8.283 18.137-18.5 18.137c-4.58 0-8.77-1.63-12-4.333" fill="#EAECF0" />
    <path fillRule="evenodd" clipRule="evenodd" d="M31.35 32.237c3.977-3.327 6.499-8.276 6.499-13.804 0-5.527-2.522-10.477-6.5-13.804-3.977 3.327-6.5 8.277-6.5 13.804s2.523 10.478 6.5 13.804" fill="#D0D5DD" />
  </svg>
)

const Visa01 = (props: React.SVGProps<SVGSVGElement>) => (
  <svg width={62} height={37} viewBox="0 0 62 37" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
    <rect x={0.85} y={0.295} width={60.3} height={36.275} rx={5} fill="#fff" stroke="#D0D5DD" strokeWidth={1.5} />
    <path fillRule="evenodd" clipRule="evenodd" d="m24.7 25.24h-3.62L18.4 13.24c-.13-.49-.41-.92-.8-1.13a11.6 11.6 0 0 0-2.95-.96v-.41h5.82c.8 0 1.4.61 1.5 1.33l1.4 7.67 3.62-9h3.52zm7.43 0h-3.42l2.82-13.33h3.42zm7.23-9.63c.1-.71.7-1.12 1.41-1.12a6.2 6.2 0 0 1 3.32.61l.6-2.86a8.4 8.4 0 0 0-3.12-.61c-3.32 0-5.73 1.84-5.73 4.4 0 1.94 1.71 2.96 2.92 3.57 1.3.61 1.8 1.02 1.7 1.63 0 .92-1 1.33-2.01 1.33a8.4 8.4 0 0 1-3.52-.82l-.6 2.87c1.2.51 2.51.72 3.72.72 3.72.1 6.03-1.74 6.03-4.5 0-3.47-4.72-3.68-4.72-5.22m16.69 9.63l-2.72-13.33h-2.91a1.5 1.5 0 0 0-1.41 1.02l-5.03 12.31h3.52l.7-1.94h4.32l.4 1.94zm-5.13-9.73l1.01 5.01h-2.82z" fill="#172B85" />
  </svg>
)

const WireTransferIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg width={47} height={32} viewBox="0 0 47 32" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
    <g clipPath="url(#wt-a)">
      <rect y={0.5} width={46.5} height={31} rx={4} fill="#006E90" />
      <path d="M8.73 21.53v-3.236h-.976v-1.001h3.14v1.001h-.976v3.235zm2.744 0v-4.237h1.241q.729 0 1.017.065.287.064.495.219.235.173.362.442.126.27.126.593 0 .492-.248.8-.25.309-.725.41l1.187 1.707h-1.342l-1-1.658v1.658zm1.113-2.235h.22q.384 0 .561-.127t.178-.4q0-.317-.166-.452-.165-.135-.555-.135h-.238z" fill="#fff" />
      <path d="m14.871 21.529 1.503-4.236h1.488l1.506 4.236h-1.181l-.22-.758h-1.688l-.226.758zm1.664-1.583h1.181l-.443-1.398a3 3 0 0 1-.057-.205l-.092-.364-.076.298q-.036.136-.076.271zm3.25 1.583v-4.236h1.146l1.645 2.178q.048.067.157.268.108.201.24.48a9 9 0 0 1-.053-.47 5 5 0 0 1-.016-.364v-2.092h1.14v4.236h-1.14l-1.646-2.188a2.4 2.4 0 0 1-.16-.267 10 10 0 0 1-.236-.473q.036.265.052.471.015.183.017.365v2.092zm5.387-1.369q.264.292.522.437t.514.145a.6.6 0 0 0 .39-.125.39.39 0 0 0 .154-.315q0-.211-.132-.325-.133-.115-.6-.236-.64-.168-.905-.437-.264-.27-.265-.738 0-.607.418-.991.419-.384 1.085-.384.36 0 .683.094.324.095.612.285l-.372.83a1.6 1.6 0 0 0-.415-.252 1.1 1.1 0 0 0-.421-.086.57.57 0 0 0-.349.1.3.3 0 0 0-.134.256q0 .159.118.255.117.095.454.182l.053.015q.727.19.956.42.154.155.235.374t.08.484q0 .675-.455 1.084-.456.41-1.214.41-.455 0-.83-.15-.373-.151-.718-.472zm3.348 1.369v-4.236h2.67v.928h-1.513v.735h1.426v.91h-1.426v1.663zm3.315 0v-4.236h2.67v.928h-1.512v.735h1.426v.91h-1.426v.714h1.512v.949zm3.456 0v-4.236h1.24q.73 0 1.017.065.288.065.496.218.235.174.361.443.127.27.127.593 0 .492-.249.8-.248.308-.724.41l1.187 1.707h-1.342l-1-1.658v1.658zm1.113-2.234h.22q.384 0 .56-.127.178-.127.178-.4 0-.318-.165-.453-.165-.134-.555-.134h-.238z" fill="#fff" />
      <path d="M7.807 10.36h7.852v1.211H7.807zm0 2.35h7.852v1.212H7.807zm0 2.567h7.852v1.212H7.807z" fill="#41E700" />
    </g>
    <defs>
      <clipPath id="wt-a"><rect y={0.5} width={46.5} height={31} rx={4} fill="#fff" /></clipPath>
    </defs>
  </svg>
)

const BankIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg width={17} height={16} viewBox="0 0 17 16" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
    <path d="M2.5 14.666h12M4.5 12V7.335M7.166 12V7.335M9.834 12V7.335M12.5 12V7.335m-4-6.001 5.333 3.333H3.166z" stroke="currentColor" strokeWidth={1.25} strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)

const UserGroup = (props: React.SVGProps<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={15} height={15} viewBox="0 0 15 15" fill="none" {...props}>
    <path d="M10.625 13.125v-1.25a2.5 2.5 0 0 0-2.5-2.5h-5a2.5 2.5 0 0 0-2.5 2.5v1.25M5.625 6.875a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5ZM14.375 13.125v-1.25a2.5 2.5 0 0 0-1.875-2.419M10 1.956a2.5 2.5 0 0 1 0 4.838" stroke="currentColor" strokeWidth={1.25} strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)

const PAYMENT_METHODS = [
  {
    value: "item-0",
    title: "Credit / Debit Card",
    desc: "Visa, Mastercard, AMEX",
    icons: [<MasterCard01 key="mc" />, <Visa01 key="visa" />],
  },
  {
    value: "item-1",
    title: "Bank Account (ACH)",
    desc: "Direct bank transfer",
    icons: [<BankIcon key="bank" className="size-8 text-gray-500" />],
  },
  {
    value: "item-2",
    title: "Wire Transfer",
    desc: "Domestic & International",
    icons: [<WireTransferIcon key="wire" />],
  },
]

const EXISTING_INSTALLMENT_PAYMENT_METHODS: InstallmentPaymentMethod[] = [
  {
    id: "amex-1234",
    method: "CREDIT_DEBIT_CARD",
    title: "American Express",
    subtitle: "Credit ****1234",
    cardNumber: "3782123412341234",
    saveDefaultPaymentMethod: true,
  },
  {
    id: "visa-1234",
    method: "CREDIT_DEBIT_CARD",
    title: "Visa",
    subtitle: "Credit ****1234",
    cardNumber: "4111111111111234",
  },
  {
    id: "bank-1234",
    method: "BANK_ACCOUNT",
    title: "Bank of America",
    subtitle: "Checking ****1234",
    accountType: "Checking",
    accountNumber: "1234",
  },
]

const NEW_PAYMENT_METHOD_OPTIONS = [
  {
    value: "credit-card",
    title: "Credit / Debit Card",
    description: "2.9% + $0.30 per transaction",
    icons: [<PaymentVisa key="visa" />, <PaymentAmex key="amex" />],
  },
  {
    value: "bank-account",
    title: "Bank Account",
    description: "0.8% per transaction",
    icons: [<ACH key="ach" />],
  },
  {
    value: "google-pay",
    title: "Google Pay",
    description: "2.9% + $0.30 per transaction",
    icons: [<GPay1 key="gpay" />],
  },
  {
    value: "apple-pay",
    title: "Apple Pay",
    description: "2.9% + $0.30 per transaction",
    icons: [<ApplePay1 key="apple-pay" />],
  },
]

const getInstallmentCardBrandName = (cardNumber?: string) => {
  const kind = getCardType(cardNumber || "")

  if (kind === "visa") return "Visa"
  if (kind === "amex") return "American Express"
  if (kind === "discover") return "Discover"
  if (kind === "mastercard") return "Mastercard"

  return "Credit Card"
}

const getInstallmentCardBrandIcon = (cardNumber?: string) => {
  const kind = getCardType(cardNumber || "")

  if (kind === "visa") {
    return <PaymentVisa className="h-[31px] w-[46.5px] shrink-0" />
  }

  if (kind === "amex") {
    return <PaymentAmex className="h-[31px] w-[46.5px] shrink-0" />
  }

  if (kind === "discover") {
    return <PaymentDiscover className="h-[31px] w-[46.5px] shrink-0" />
  }

  if (kind === "mastercard") {
    return <PaymentMastercard className="h-[31px] w-[46.5px] shrink-0" />
  }

  return (
    <div className="inline-flex h-[31px] w-[46.5px] shrink-0 items-center justify-center rounded-[4px] border border-gray-200 bg-white text-gray-500">
      <Lock className="size-4" />
    </div>
  )
}

export default function PaymentPage() {
  const params = useParams()
  const pathname = usePathname()
  const router = useRouter()
  const searchParams = useSearchParams()
  const slug = params.slug as string
  const isTalentCheckout = pathname.startsWith("/talent-checkout/")
  const basePath = isTalentCheckout ? "/talent-checkout" : "/checkout"
  const decodedSlug = decodeURIComponent(slug)
  const [talentProfile, setTalentProfile] = React.useState<UserProfile | null>(null)

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

  const selectedRateValue = searchParams.get("rate") || "web-development"
  const selectedSchedule = searchParams.get("schedule") || "full-time"
  const selectedDuration = searchParams.get("duration") || (isTalentCheckout ? "Ongoing" : "")
  const checkoutTypeParam = (
    searchParams.get("checkoutType") ||
    searchParams.get("type") ||
    searchParams.get("kind") ||
    ""
  ).toLowerCase()
  const isOngoingTalentContract = isTalentCheckout && selectedDuration === "Ongoing"
  const paymentStateStorageKey = React.useMemo(
    () => `checkout-payment-state:${basePath}:${decodedSlug}`,
    [basePath, decodedSlug]
  )
  const installmentSubjectLabel = isTalentCheckout
    ? "contract"
    : checkoutTypeParam === "team"
      ? "team"
    : checkoutTypeParam === "service"
      ? "service"
      : "project"
  const selectedRate =
    offerRates.find((rate) => rate.value === selectedRateValue) ||
    offerRates.find((rate) => rate.value === "web-development") ||
    offerRates[0]
  const hourlyRate = Number(selectedRate?.price.replace(/[^0-9.]/g, "") || 0)
  const estimatedTaxHourly = hourlyRate * 0.07
  const totalHourlyRate = hourlyRate + estimatedTaxHourly
  const totalWeeks = 32
  const jobCost = totalHourlyRate * 40 * totalWeeks
  const addOnWeeklyTotal = 340
  const addOnTotal = addOnWeeklyTotal * totalWeeks
  const dueTodayTotal = jobCost + addOnTotal
  const talentName =
    talentProfile?.firstName ||
    decodedSlug.split("-")[0]?.replace(/^./, (char) => char.toUpperCase()) ||
    "Alex"
  const talentAvatarUrl = talentProfile?.avatarUrl || ""
  const talentJobTitle = getDefaultJobTitle(talentProfile)
  const scheduleTitle = selectedSchedule === "part-time" ? "Part time" : "Full time"
  const scheduleDetail = selectedSchedule === "part-time" ? "Up to 30 hrs/week" : "Over 30 hrs/week"
  const formattedHourlyRate = `$${hourlyRate.toFixed(0)}/hr`
  const formattedEstimatedTaxHourly = `$${estimatedTaxHourly.toFixed(2)}/hr`
  const formattedTotalHourlyRate = `$${totalHourlyRate.toFixed(2)}/hr`
  const formattedJobCost = formatter.format(Math.round(jobCost))
  const formattedAddOnTotal = formatter.format(Math.round(addOnTotal))
  const formattedDueToday = formatter.format(Math.round(dueTodayTotal))
  const weeklyPaymentValue = formatter.format(Math.round(dueTodayTotal / totalWeeks))
  const biWeeklyPaymentValue = formatter.format(Math.round((dueTodayTotal / totalWeeks) * 2))
  const monthlyPaymentValue = formatter.format(Math.round(dueTodayTotal / 8))
  const recurringSectionPaymentOptions = React.useMemo<PaymentPlanOption[]>(
    () => {
      const options: PaymentPlanOption[] = [
        { id: "weekly", label: "Weekly", value: formatter.format(Math.round(dueTodayTotal / 24)), meta: "24" },
        { id: "bi-weekly", label: "Bi-Weekly", value: formatter.format(Math.round(dueTodayTotal / 16)), meta: "16" },
        { id: "monthly", label: "Monthly", value: formatter.format(Math.round(dueTodayTotal / 8)), meta: "8" },
      ]

      if (!isOngoingTalentContract) {
        options.push({
          id: "final",
          label: "Pay Remaining Balance",
          value: formatter.format(Math.max(Math.round(dueTodayTotal - 6000), 0)),
        })
      }

      return options
    },
    [dueTodayTotal, isOngoingTalentContract]
  )
  const recurringPaymentOptions = React.useMemo<PaymentPlanOption[]>(
    () => {
      const options: PaymentPlanOption[] = [
        { id: "weekly", label: "Weekly", value: weeklyPaymentValue },
        { id: "bi-weekly", label: "Bi-Weekly", value: biWeeklyPaymentValue },
        { id: "monthly", label: "Monthly", value: monthlyPaymentValue },
      ]

      if (!isOngoingTalentContract) {
        options.push({ id: "final", label: "Pay Full Amount", value: formattedDueToday })
      }

      return options
    },
    [
      biWeeklyPaymentValue,
      formattedDueToday,
      isOngoingTalentContract,
      monthlyPaymentValue,
      weeklyPaymentValue,
    ]
  )
  const talentPaymentPlanOptions = React.useMemo<PaymentPlanOption[]>(
    () => recurringPaymentOptions,
    [recurringPaymentOptions]
  )
  const defaultTalentPaymentPlanId = talentPaymentPlanOptions[Math.min(2, talentPaymentPlanOptions.length - 1)]?.id ?? "monthly"
  const [selectedTalentPaymentPlanId, setSelectedTalentPaymentPlanId] = React.useState(
    searchParams.get("paymentPlan") || defaultTalentPaymentPlanId
  )
  const talentPaymentPlan =
    talentPaymentPlanOptions.find((option) => option.id === selectedTalentPaymentPlanId) ||
    talentPaymentPlanOptions[Math.min(2, talentPaymentPlanOptions.length - 1)]
  const paymentFrequency =
    recurringSectionPaymentOptions.find((option) => option.id === selectedTalentPaymentPlanId) || null

  React.useEffect(() => {
    if (!talentPaymentPlanOptions.some((option) => option.id === selectedTalentPaymentPlanId)) {
      setSelectedTalentPaymentPlanId(defaultTalentPaymentPlanId)
    }
  }, [defaultTalentPaymentPlanId, selectedTalentPaymentPlanId, talentPaymentPlanOptions])

  const [pay, setPay] = React.useState<"AT_ONCE" | "IN_INSTALLMENTS">(
    isOngoingTalentContract ? "IN_INSTALLMENTS" : "AT_ONCE"
  )
  const [savedInstallmentPaymentMethods, setSavedInstallmentPaymentMethods] = React.useState(
    EXISTING_INSTALLMENT_PAYMENT_METHODS
  )
  const [fullPaymentMethods, setFullPaymentMethods] = React.useState<
    InstallmentPaymentMethod[]
  >([])
  const [hasSplitFullPayment, setHasSplitFullPayment] = React.useState(false)
  const [showFullPaymentMethods, setShowFullPaymentMethods] = React.useState(false)
  const [fullPaymentFlowPreservesSplit, setFullPaymentFlowPreservesSplit] =
    React.useState(false)
  const [activeInstallmentBlock, setActiveInstallmentBlock] =
    React.useState<InstallmentBlock>("first")
  const [paymentMethodFlowTarget, setPaymentMethodFlowTarget] =
    React.useState<PaymentMethodFlowTarget>("first")
  const [firstInstallmentMethods, setFirstInstallmentMethods] = React.useState<
    InstallmentPaymentMethod[]
  >([])
  const [secondInstallmentMethods, setSecondInstallmentMethods] = React.useState<
    InstallmentPaymentMethod[]
  >([])
  const [selectedExistingInstallmentMethodId, setSelectedExistingInstallmentMethodId] =
    React.useState("")
  const [selectedNewInstallmentMethodType, setSelectedNewInstallmentMethodType] =
    React.useState<NewPaymentMethodOptionValue | "">("")
  const [isExistingInstallmentMethodsDialogOpen, setIsExistingInstallmentMethodsDialogOpen] =
    React.useState(false)
  const [isAddNewInstallmentMethodDialogOpen, setIsAddNewInstallmentMethodDialogOpen] =
    React.useState(false)
  const [isAddCardInstallmentMethodDialogOpen, setIsAddCardInstallmentMethodDialogOpen] =
    React.useState(false)
  const [isAddBankInstallmentMethodDialogOpen, setIsAddBankInstallmentMethodDialogOpen] =
    React.useState(false)
  const [useBalance, setUseBalance] = React.useState(false)
  const [isBalanceCustom, setIsBalanceCustom] = React.useState(false)
  const [customAmount, setCustomAmount] = React.useState("")
  const [showGiftCard, setShowGiftCard] = React.useState(false)
  const [giftCardInput, setGiftCardInput] = React.useState("")
  const [giftCards, setGiftCards] = React.useState<string[]>([])
  const [showGiftCardSuccess, setShowGiftCardSuccess] = React.useState(false)
  const [paymentMethod, setPaymentMethod] = React.useState("")
  const [isWireTransfer, setIsWireTransfer] = React.useState(false)
  const [isProcessing, setIsProcessing] = React.useState(false)
  const [hasHydratedPaymentState, setHasHydratedPaymentState] = React.useState(false)

  // Credit card form
  const [cardNumber, setCardNumber] = React.useState("")
  const [cardName, setCardName] = React.useState("")
  const [expirationDate, setExpirationDate] = React.useState("")
  const [cvv, setCvv] = React.useState("")
  const [saveCard, setSaveCard] = React.useState(false)

  // Billing address
  const [fullName, setFullName] = React.useState("")
  const [addressLine1, setAddressLine1] = React.useState("")
  const [addressLine2, setAddressLine2] = React.useState("")
  const [city, setCity] = React.useState("")
  const [billingState, setBillingState] = React.useState("")
  const [zipcode, setZipcode] = React.useState("")
  const [phoneNumber, setPhoneNumber] = React.useState("")

  // Bank account
  const [accountType, setAccountType] = React.useState("")
  const [accountHolderName, setAccountHolderName] = React.useState("")
  const [bankRoutingNumber, setBankRoutingNumber] = React.useState("")
  const [accountNumber, setAccountNumber] = React.useState("")
  const [confirmAccountNumber, setConfirmAccountNumber] = React.useState("")
  const [saveBankAccount, setSaveBankAccount] = React.useState(false)

  React.useEffect(() => {
    if (isOngoingTalentContract) {
      setPay("IN_INSTALLMENTS")
    }
  }, [isOngoingTalentContract])

  React.useEffect(() => {
    if (typeof window === "undefined") return

    try {
      const rawSnapshot = window.sessionStorage.getItem(paymentStateStorageKey)

      if (!rawSnapshot) {
        setHasHydratedPaymentState(true)
        return
      }

      const snapshot = JSON.parse(rawSnapshot) as Partial<PaymentPageSnapshot>

      if (snapshot.pay === "AT_ONCE" || snapshot.pay === "IN_INSTALLMENTS") {
        setPay(snapshot.pay)
      }

      if (typeof snapshot.selectedTalentPaymentPlanId === "string") {
        setSelectedTalentPaymentPlanId(snapshot.selectedTalentPaymentPlanId)
      }

      if (Array.isArray(snapshot.savedInstallmentPaymentMethods)) {
        setSavedInstallmentPaymentMethods(snapshot.savedInstallmentPaymentMethods)
      }

      if (Array.isArray(snapshot.fullPaymentMethods)) {
        setFullPaymentMethods(snapshot.fullPaymentMethods)
      }

      if (typeof snapshot.hasSplitFullPayment === "boolean") {
        setHasSplitFullPayment(snapshot.hasSplitFullPayment)
      }

      if (typeof snapshot.showFullPaymentMethods === "boolean") {
        setShowFullPaymentMethods(snapshot.showFullPaymentMethods)
      }

      if (Array.isArray(snapshot.firstInstallmentMethods)) {
        setFirstInstallmentMethods(snapshot.firstInstallmentMethods)
      }

      if (Array.isArray(snapshot.secondInstallmentMethods)) {
        setSecondInstallmentMethods(snapshot.secondInstallmentMethods)
      }

      if (typeof snapshot.isWireTransfer === "boolean") {
        setIsWireTransfer(snapshot.isWireTransfer)
      }
    } catch {
      if (typeof window !== "undefined") {
        window.sessionStorage.removeItem(paymentStateStorageKey)
      }
    } finally {
      setHasHydratedPaymentState(true)
    }
  }, [paymentStateStorageKey])

  React.useEffect(() => {
    if (!hasHydratedPaymentState || typeof window === "undefined") return

    const snapshot: PaymentPageSnapshot = {
      pay,
      selectedTalentPaymentPlanId,
      savedInstallmentPaymentMethods,
      fullPaymentMethods,
      hasSplitFullPayment,
      showFullPaymentMethods,
      firstInstallmentMethods,
      secondInstallmentMethods,
      isWireTransfer,
    }

    window.sessionStorage.setItem(paymentStateStorageKey, JSON.stringify(snapshot))
  }, [
    firstInstallmentMethods,
    fullPaymentMethods,
    hasHydratedPaymentState,
    hasSplitFullPayment,
    isWireTransfer,
    pay,
    paymentStateStorageKey,
    savedInstallmentPaymentMethods,
    secondInstallmentMethods,
    selectedTalentPaymentPlanId,
    showFullPaymentMethods,
  ])

  const availableBalance = 4000
  const fullAmount = 98_000

  const handleSubmitOrder = () => {
    setIsProcessing(true)
    setTimeout(() => {
      const nextSearchParams = new URLSearchParams(searchParams.toString())
      const nextUrl = nextSearchParams.toString()
        ? `${basePath}/${slug}/confirmation?${nextSearchParams.toString()}`
        : `${basePath}/${slug}/confirmation`
      router.push(nextUrl)
    }, 1500)
  }

  const handleGiftCardSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (giftCardInput) {
      setGiftCards((prev) => [...prev, giftCardInput])
      setGiftCardInput("")
      setShowGiftCardSuccess(true)
      setTimeout(() => setShowGiftCardSuccess(false), 5000)
    }
  }

  const billingAddressSummary = {
    fullName: fullName || "Jarvis Batman",
    addressLine1: addressLine1 || "2614 Rio Grande St, Apt 211",
    cityStateZip:
      city && billingState && zipcode
        ? `${city}, ${billingState} ${zipcode}`
        : "Austin, TX 78705-4017",
    phoneNumber: phoneNumber || "+1 (737) 436-4562",
  }
  const recurringPaymentFrequencyMeasureRef = React.useRef<HTMLSpanElement>(null)
  const [recurringPaymentFrequencyWidth, setRecurringPaymentFrequencyWidth] =
    React.useState<number | null>(null)

  React.useLayoutEffect(() => {
    if (!recurringPaymentFrequencyMeasureRef.current) return

    const nextWidth =
      Math.ceil(recurringPaymentFrequencyMeasureRef.current.getBoundingClientRect().width) + 72
    setRecurringPaymentFrequencyWidth(nextWidth)
  }, [paymentFrequency])

  const isInstallmentCardFormValid =
    Boolean(cardNumber) &&
    Boolean(cardName) &&
    Boolean(expirationDate) &&
    Boolean(cvv)

  const isInstallmentBankFormValid =
    Boolean(accountType) &&
    Boolean(accountHolderName) &&
    Boolean(bankRoutingNumber) &&
    Boolean(accountNumber) &&
    Boolean(confirmAccountNumber) &&
    accountNumber === confirmAccountNumber

  const closeInstallmentMethodDialogs = () => {
    setIsExistingInstallmentMethodsDialogOpen(false)
    setIsAddNewInstallmentMethodDialogOpen(false)
    setIsAddCardInstallmentMethodDialogOpen(false)
    setIsAddBankInstallmentMethodDialogOpen(false)
  }

  const assignPaymentMethodToFlowTarget = React.useCallback(
    (method: InstallmentPaymentMethod) => {
      if (paymentMethodFlowTarget === "full") {
        setFullPaymentMethods([method])
        setHasSplitFullPayment(fullPaymentFlowPreservesSplit)
        setShowFullPaymentMethods(false)
        setPaymentMethod("")
        setIsWireTransfer(false)
        return
      }

      if (activeInstallmentBlock === "first") {
        setFirstInstallmentMethods((prev) => [...prev, method])
        return
      }

      setSecondInstallmentMethods((prev) => [...prev, method])
    },
    [activeInstallmentBlock, fullPaymentFlowPreservesSplit, paymentMethodFlowTarget]
  )

  const resetInstallmentCardForm = () => {
    setCardNumber("")
    setCardName("")
    setExpirationDate("")
    setCvv("")
    setSaveCard(false)
  }

  const resetInstallmentBankForm = () => {
    setAccountType("")
    setAccountHolderName("")
    setBankRoutingNumber("")
    setAccountNumber("")
    setConfirmAccountNumber("")
    setSaveBankAccount(false)
  }

  const openInstallmentMethodFlow = (block: InstallmentBlock) => {
    setActiveInstallmentBlock(block)
    setPaymentMethodFlowTarget(block)
    setSelectedExistingInstallmentMethodId("")
    setSelectedNewInstallmentMethodType("")
    closeInstallmentMethodDialogs()

    if (savedInstallmentPaymentMethods.length > 0) {
      setIsExistingInstallmentMethodsDialogOpen(true)
      return
    }

    setIsAddNewInstallmentMethodDialogOpen(true)
  }

  const handleSelectExistingInstallmentMethod = (method: InstallmentPaymentMethod) => {
    setSelectedExistingInstallmentMethodId(method.id)
    assignPaymentMethodToFlowTarget(method)
    closeInstallmentMethodDialogs()
  }

  const openFullPaymentMethodFlow = (preserveSplit = false) => {
    setPaymentMethodFlowTarget("full")
    setFullPaymentFlowPreservesSplit(preserveSplit)
    setSelectedExistingInstallmentMethodId("")
    setSelectedNewInstallmentMethodType("")
    closeInstallmentMethodDialogs()

    if (savedInstallmentPaymentMethods.length > 0) {
      setIsExistingInstallmentMethodsDialogOpen(true)
      return
    }

    setIsAddNewInstallmentMethodDialogOpen(true)
  }

  const openAddNewFullPaymentMethodDialog = () => {
    setFullPaymentFlowPreservesSplit(false)
    setPaymentMethodFlowTarget("full")
    setSelectedExistingInstallmentMethodId("")
    setSelectedNewInstallmentMethodType("")
    closeInstallmentMethodDialogs()
    setIsAddNewInstallmentMethodDialogOpen(true)
  }

  const handleSelectFullPaymentMethod = (method: InstallmentPaymentMethod) => {
    setFullPaymentMethods([method])
    setHasSplitFullPayment(fullPaymentFlowPreservesSplit)
    setShowFullPaymentMethods(false)
    setPaymentMethod("")
    setIsWireTransfer(false)
  }

  const handleOpenAddNewInstallmentMethodDialog = () => {
    setSelectedNewInstallmentMethodType("")
    setIsExistingInstallmentMethodsDialogOpen(false)
    setIsAddCardInstallmentMethodDialogOpen(false)
    setIsAddBankInstallmentMethodDialogOpen(false)
    setIsAddNewInstallmentMethodDialogOpen(true)
  }

  const handleBackFromAddNewInstallmentMethodDialog = () => {
    setIsAddNewInstallmentMethodDialogOpen(false)

    if (paymentMethodFlowTarget === "full") {
      return
    }

    if (savedInstallmentPaymentMethods.length > 0) {
      setIsExistingInstallmentMethodsDialogOpen(true)
    }
  }

  const handleOpenInstallmentMethodType = (value: NewPaymentMethodOptionValue) => {
    setSelectedNewInstallmentMethodType(value)

    if (value === "credit-card") {
      setIsAddNewInstallmentMethodDialogOpen(false)
      setIsAddCardInstallmentMethodDialogOpen(true)
      return
    }

    if (value === "bank-account") {
      setIsAddNewInstallmentMethodDialogOpen(false)
      setIsAddBankInstallmentMethodDialogOpen(true)
      return
    }

    const walletMethodType =
      value === "google-pay" ? "GOOGLE_PAY" : "APPLE_PAY"
    const existingWalletMethod = savedInstallmentPaymentMethods.find(
      (method) => method.method === walletMethodType
    )

    if (existingWalletMethod) {
      assignPaymentMethodToFlowTarget(existingWalletMethod)
      closeInstallmentMethodDialogs()
      return
    }

    const method: InstallmentPaymentMethod = {
      id: `${value}-${Date.now()}`,
      method: walletMethodType,
      title: value === "google-pay" ? "Google Pay" : "Apple Pay",
      subtitle: value === "google-pay" ? "Wallet" : "Wallet",
    }

    setSavedInstallmentPaymentMethods((prev) => [method, ...prev])
    assignPaymentMethodToFlowTarget(method)
    closeInstallmentMethodDialogs()
  }

  const handleSaveInstallmentCard = () => {
    if (!isInstallmentCardFormValid) return

    const method: InstallmentPaymentMethod = {
      id: `card-${Date.now()}`,
      method: "CREDIT_DEBIT_CARD",
      title: getInstallmentCardBrandName(cardNumber),
      subtitle: `Credit ****${cardNumber.slice(-4)}`,
      cardNumber,
      saveDefaultPaymentMethod: saveCard,
    }

    setSavedInstallmentPaymentMethods((prev) => [method, ...prev])
    assignPaymentMethodToFlowTarget(method)
    closeInstallmentMethodDialogs()
    resetInstallmentCardForm()
  }

  const handleSaveInstallmentBank = () => {
    if (!isInstallmentBankFormValid) return

    const method: InstallmentPaymentMethod = {
      id: `bank-${Date.now()}`,
      method: "BANK_ACCOUNT",
      title: accountHolderName || "Bank Account",
      subtitle: `${accountType} ****${accountNumber.slice(-4)}`,
      accountType,
      accountNumber,
      saveDefaultPaymentMethod: saveBankAccount,
    }

    setSavedInstallmentPaymentMethods((prev) => [method, ...prev])
    assignPaymentMethodToFlowTarget(method)
    closeInstallmentMethodDialogs()
    resetInstallmentBankForm()
  }

  const resetFullPaymentCardForm = () => {
    resetInstallmentCardForm()
    setFullName("")
    setAddressLine1("")
    setAddressLine2("")
    setCity("")
    setBillingState("")
    setZipcode("")
    setPhoneNumber("")
  }

  const resetFullPaymentBankForm = () => {
    resetInstallmentBankForm()
  }

  const saveFullPaymentMethod = (method: InstallmentPaymentMethod) => {
    if (hasSplitFullPayment && fullPaymentMethods.length > 0) {
      setFullPaymentMethods((prev) => [...prev, method])
      setShowFullPaymentMethods(true)
      setPaymentMethod("")
      return
    }

    setFullPaymentMethods([method])
    setHasSplitFullPayment(false)
    setShowFullPaymentMethods(false)
    setPaymentMethod("")
  }

  const handleSaveFullPaymentCard = () => {
    if (!isInstallmentCardFormValid) return

    const method: InstallmentPaymentMethod = {
      id: `full-card-${Date.now()}`,
      method: "CREDIT_DEBIT_CARD",
      title: getInstallmentCardBrandName(cardNumber),
      subtitle: `Credit ****${cardNumber.slice(-4)}`,
      cardNumber,
      saveDefaultPaymentMethod: saveCard,
    }

    saveFullPaymentMethod(method)
    resetFullPaymentCardForm()
  }

  const handleSaveFullPaymentBank = () => {
    if (!isInstallmentBankFormValid) return

    const method: InstallmentPaymentMethod = {
      id: `full-bank-${Date.now()}`,
      method: "BANK_ACCOUNT",
      title: accountHolderName || "Bank of America",
      subtitle: `${accountType} ****${accountNumber.slice(-4)}`,
      accountType,
      accountNumber,
      saveDefaultPaymentMethod: saveBankAccount,
    }

    saveFullPaymentMethod(method)
    resetFullPaymentBankForm()
  }

  const handleSaveFullPaymentWire = () => {
    const method: InstallmentPaymentMethod = {
      id: `full-wire-${Date.now()}`,
      method: "WIRE_TRANSFER",
      title: "Domestic Wire Transfer",
      subtitle: "Wire details will appear after you submit the order",
    }

    saveFullPaymentMethod(method)
    setIsWireTransfer(true)
  }

  const handleStartFullPaymentSplit = () => {
    setHasSplitFullPayment(true)
    setShowFullPaymentMethods(false)
    setPaymentMethod("")
  }

  const handleEditPrimaryFullPaymentMethod = (value: string) => {
    setFullPaymentMethods([])
    setHasSplitFullPayment(false)
    setShowFullPaymentMethods(false)
    setIsWireTransfer(false)
    setPaymentMethod(value)
  }

  const handleRemoveInstallmentMethod = (
    block: InstallmentBlock,
    methodId: string
  ) => {
    if (block === "first") {
      setFirstInstallmentMethods((prev) =>
        prev.filter((method) => method.id !== methodId)
      )
      return
    }

    setSecondInstallmentMethods((prev) =>
      prev.filter((method) => method.id !== methodId)
    )
  }

  const handleMoveInstallmentMethod = (
    block: InstallmentBlock,
    methodId: string
  ) => {
    if (block === "first") {
      const methodToMove = firstInstallmentMethods.find(
        (method) => method.id === methodId
      )

      if (!methodToMove) return

      setFirstInstallmentMethods((prev) =>
        prev.filter((method) => method.id !== methodId)
      )
      setSecondInstallmentMethods((prev) => [...prev, methodToMove])
      return
    }

    const methodToMove = secondInstallmentMethods.find(
      (method) => method.id === methodId
    )

    if (!methodToMove) return

    setSecondInstallmentMethods((prev) =>
      prev.filter((method) => method.id !== methodId)
    )
    setFirstInstallmentMethods((prev) => [...prev, methodToMove])
  }

  const handleRemoveFullPaymentMethod = (methodId: string) => {
    const nextMethods = fullPaymentMethods.filter((method) => method.id !== methodId)
    setFullPaymentMethods(nextMethods)

    if (nextMethods.length <= 1) {
      setShowFullPaymentMethods(false)
    }

    if (nextMethods.length === 0) {
      setHasSplitFullPayment(false)
    }
  }

  const renderInstallmentMethodSummary = (
    method: InstallmentPaymentMethod,
    block: InstallmentBlock
  ) => {
    const defaultAmount =
      block === "first"
        ? availableBalance
        : parseCurrencyAmount(paymentFrequency?.value) ??
          parseCurrencyAmount(talentPaymentPlan?.value) ??
          fullAmount

    const isCard = method.method === "CREDIT_DEBIT_CARD"
    const isBank = method.method === "BANK_ACCOUNT"
    const isGooglePay = method.method === "GOOGLE_PAY"
    const subtitle = isCard
      ? `Credit ****${method.cardNumber?.slice(-4)}`
      : isBank
        ? `${method.accountType} ****${method.accountNumber?.slice(-4)}`
        : method.subtitle

    return (
      <div className="mt-5 flex items-center gap-x-2.5">
        <div className="relative flex-auto rounded-lg border border-gray-200 bg-white p-[15px] shadow-[0px_1px_4px_0px_rgba(0,0,0,.03)]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-x-3">
              {isCard ? (
                <div className="inline-flex items-center rounded-[4px] shrink-0 bg-white border border-gray-[#DADADA] text-gray-500 justify-center w-[46.5px] h-[31px]">
                  {getInstallmentCardBrandIcon(method.cardNumber)}
                </div>
              ) : isBank ? (
                <div className="inline-flex items-center rounded-[4px] shrink-0 bg-white border border-gray-[#DADADA] text-gray-500 justify-center w-[46.5px] h-[31px]">
                  <Bank className="size-4" />
                </div>
              ) : isGooglePay ? (
                <GPay1 className="h-[31px] w-[46.5px] shrink-0" />
              ) : (
                <ApplePay1 className="h-[31px] w-[46.5px] shrink-0" />
              )}

              <div className="inline-flex flex-col gap-y-1">
                <div className="inline-flex items-center gap-x-2">
                  <span className="inline-block text-sm text-dark-blue-400">
                    {isCard ? getInstallmentCardBrandName(method.cardNumber) : method.title}
                  </span>
                </div>
                <span className="inline-block text-xs text-[#858585] leading-none">
                  {subtitle}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-x-3 pr-12">
              <div className="flex items-center gap-x-1">
                <IconButton
                  className="rounded-full opacity-50 hover:opacity-100"
                  variant="ghost"
                  visual="gray"
                  onClick={() => openInstallmentMethodFlow(block)}
                >
                  <Edit03 className="size-[18px]" />
                </IconButton>

                <RmDialog
                  title="Remove Payment Method?"
                  description={`Are you sure you want to remove ${
                    isCard
                      ? `${getInstallmentCardBrandName(method.cardNumber)} Credit ****${method.cardNumber?.slice(-4)}`
                      : `${method.title} ${subtitle}`
                  } from your payment methods?`}
                  onRemove={() => handleRemoveInstallmentMethod(block, method.id)}
                  trigger={({ isOpen, setIsOpen }) => (
                    <IconButton
                      className="rounded-full opacity-50 hover:opacity-100 hover:bg-error-100 hover:text-error-500"
                      variant="ghost"
                      visual="gray"
                      onClick={() => setIsOpen(!isOpen)}
                    >
                      <Trash03 className="size-[18px]" />
                    </IconButton>
                  )}
                />
              </div>

              <IconButton
                className="group absolute right-[15px] top-1/2 -translate-y-1/2 gap-x-2 transition-[width] duration-300 hover:w-[246px]"
                variant="outlined"
                visual="gray"
                onClick={() => handleMoveInstallmentMethod(block, method.id)}
              >
                <SwitchHorizontal01 className="size-[15px]" />
                <span className="hidden truncate text-sm font-semibold leading-6 text-gray-500 group-hover:inline-block">
                  {block === "first"
                    ? "Change to recurring payment"
                    : "Change to one-time payment"}
                </span>
              </IconButton>
            </div>
          </div>
        </div>

        <div className="w-fit min-w-[122px] h-[67.5px] rounded-lg border border-gray-200 bg-white px-4 py-3 shadow-[0px_1px_2px_0px_rgba(16,24,40,.05)] flex flex-col justify-center">
          <span className="block text-xs font-light leading-none text-gray-400">
            Enter Amount
          </span>

          <CurrencyInput
            className={cn(
              inputVariants({
                className:
                  "w-[122px] min-w-[122px] inline-flex border-0 p-0 shadow-none font-medium text-dark-blue-400 focus:ring-0",
              })
            )}
            intlConfig={{
              locale: "en-US",
              currency: "USD",
            }}
            placeholder="Enter amount"
            decimalsLimit={20}
            defaultValue={defaultAmount}
          />
        </div>
      </div>
    )
  }

  const renderFullPaymentMethodRow = (
    method: InstallmentPaymentMethod,
    options?: {
      splitAmount?: string
      onEdit?: () => void
      onSplit?: () => void
      onRemove?: () => void
    }
  ) => {
    if (method.method === "CREDIT_DEBIT_CARD") {
      if (options?.splitAmount) {
        return (
          <CreditDebitCardArticle2
            cardNumber={method.cardNumber}
            saveDefaultPaymentMethod={method.saveDefaultPaymentMethod}
            amountToBePaid={options.splitAmount}
            onRemove={options.onRemove}
          />
        )
      }

      return (
        <CreditDebitCardArticle1
          cardNumber={method.cardNumber}
          saveDefaultPaymentMethod={method.saveDefaultPaymentMethod}
          onChange={options?.onEdit}
        />
      )
    }

    if (method.method === "BANK_ACCOUNT") {
      if (options?.splitAmount) {
        return (
          <div className="flex items-center gap-x-2.5">
            <div className="rounded-lg flex-auto bg-white border border-gray-200 p-[15px] flex items-center justify-between shadow-[0px_1px_4px_0px_rgba(0,0,0,.03)]">
              <div className="flex items-center gap-x-3">
                <div className="inline-flex items-center rounded-[4px] shrink-0 bg-white border border-gray-[#DADADA] text-gray-500 justify-center w-[46.5px] h-[31px]">
                  <Bank className="size-4" />
                </div>

                <div className="inline-flex flex-col gap-y-1">
                  <div className="inline-flex items-center gap-x-2">
                    <span className="inline-block text-sm text-dark-blue-400">
                      {method.title}
                    </span>
                    {method.saveDefaultPaymentMethod && (
                      <Badge visual="primary">Default</Badge>
                    )}
                  </div>
                  <span className="inline-block text-xs text-[#858585] leading-none">
                    {method.accountType} ****{method.accountNumber?.slice(-4)}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-x-2">
                <IconButton
                  className="rounded-full opacity-50 hover:opacity-100"
                  variant="ghost"
                  visual="gray"
                  onClick={options?.onEdit}
                >
                  <Edit03 className="size-[18px]" />
                </IconButton>

                <RmDialog
                  title="Remove Payment Method?"
                  description={`Are you sure you want to remove ${method.title} ${method.accountType} ****${method.accountNumber?.slice(-4)} from your payment methods?`}
                  onRemove={options.onRemove}
                  trigger={({ isOpen, setIsOpen }) => (
                    <IconButton
                      className="rounded-full opacity-50 hover:opacity-100 hover:bg-error-100 hover:text-error-500"
                      variant="ghost"
                      visual="gray"
                      onClick={() => setIsOpen(!isOpen)}
                    >
                      <Trash03 className="size-[18px]" />
                    </IconButton>
                  )}
                />
              </div>
            </div>

            <div className="bg-white border flex flex-col justify-center h-[67.5px] border-gray-200 rounded-lg py-3 px-4 shadow-[0px_1px_2px_0px_rgba(16,24,40,.05)]">
              <span className="text-xs block font-light leading-none text-gray-400">
                Amount
              </span>
              <h3 className="text-base font-medium text-dark-blue-400">
                {options.splitAmount}
              </h3>
            </div>
          </div>
        )
      }

      return (
        <div className="rounded-lg bg-white border border-gray-200 p-[15px] flex items-center justify-between">
          <div className="flex items-center gap-x-3">
            <div className="inline-flex items-center rounded-[4px] shrink-0 bg-white border border-gray-100 text-gray-500 justify-center w-[46.5px] h-[31px]">
              <Bank className="size-4" />
            </div>

            <div className="inline-flex flex-col gap-y-1">
              <div className="inline-flex items-center gap-x-2">
                <span className="inline-block text-sm text-dark-blue-400">
                  {method.title}
                </span>
                {method.saveDefaultPaymentMethod && (
                  <Badge visual="primary">Default</Badge>
                )}
              </div>
              <span className="inline-block text-xs text-[#858585] leading-none">
                {method.accountType} ****{method.accountNumber?.slice(-4)}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-x-5">
            <Button variant="link" visual="gray" onClick={options?.onEdit}>
              Change
            </Button>
          </div>
        </div>
      )
    }

    return (
      <div className="rounded-lg bg-white border border-gray-200 p-[15px] flex items-center justify-between">
        <div className="flex items-center gap-x-3">
          <div className="inline-flex items-center shrink-0 justify-center w-[46.5px] h-[31px]">
            <WireTransfer className="w-[46.5px] h-[31px]" />
          </div>

          <div className="inline-flex flex-col gap-y-1">
            <span className="inline-block text-sm text-dark-blue-400">
              {method.title}
            </span>
            <span className="inline-block text-xs text-[#858585] leading-none">
              {method.subtitle}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-x-5">
          <Button variant="link" visual="gray" onClick={options?.onEdit}>
            Change
          </Button>
          {options?.onSplit ? (
            <Button variant="link" onClick={options.onSplit}>
              <DivideSquare className="size-[15px]" />
              Split Payment
            </Button>
          ) : null}
        </div>
      </div>
    )
  }

  const renderSavedPaymentMethodOption = (
    method: InstallmentPaymentMethod,
    onSelect: () => void
  ) => (
    <HeadlessRadioGroupItem
      className="group/item block focus-visible:outline-none"
      value={method.id}
      key={method.id}
      onClick={onSelect}
    >
      {method.method === "CREDIT_DEBIT_CARD" ? (
        <CreditDebitCardArticle3
          cardNumber={method.cardNumber}
          saveDefaultPaymentMethod={method.saveDefaultPaymentMethod}
        />
      ) : method.method === "BANK_ACCOUNT" ? (
        <div className="rounded-lg flex-auto bg-gray-50 border border-gray-300 p-[15px] flex items-center justify-between shadow-[0px_1px_4px_0px_rgba(0,0,0,.03)] transition duration-300 group-data-[state=checked]/item:border-primary-500 group-data-[state=checked]/item:ring-1 group-data-[state=checked]/item:ring-primary-500">
          <div className="flex items-center gap-x-3">
            <div className="inline-flex items-center rounded-[4px] shrink-0 bg-white border border-gray-200 text-gray-500 justify-center w-[46.5px] h-[31px]">
              <BankIcon className="size-4" />
            </div>

            <div className="inline-flex flex-col gap-y-1">
              <div className="inline-flex items-center gap-x-2">
                <span className="inline-block text-sm text-dark-blue-400">
                  {method.title}
                </span>
                {method.saveDefaultPaymentMethod && (
                  <Badge visual="primary">Default</Badge>
                )}
              </div>
              <span className="inline-block text-xs text-[#858585] leading-none">
                {method.accountType} ****{method.accountNumber?.slice(-4)}
              </span>
            </div>
          </div>

          <Button
            className="bg-white group-data-[state=checked]/item:hidden"
            variant="outlined"
            visual="gray"
            type="button"
          >
            Use This
          </Button>
          <div className="size-6 rounded-full bg-primary-500 hidden items-center justify-center shrink-0 group-data-[state=checked]/item:inline-flex">
            <Check className="size-[16.4px] text-white" />
          </div>
        </div>
      ) : (
        <div className="rounded-lg flex-auto bg-gray-50 border border-gray-300 p-[15px] flex items-center justify-between shadow-[0px_1px_4px_0px_rgba(0,0,0,.03)] transition duration-300 group-data-[state=checked]/item:border-primary-500 group-data-[state=checked]/item:ring-1 group-data-[state=checked]/item:ring-primary-500">
          <div className="flex items-center gap-x-3">
            {method.method === "GOOGLE_PAY" ? (
              <GPay1 className="h-[31px] w-[46.5px] shrink-0" />
            ) : (
              <ApplePay1 className="h-[31px] w-[46.5px] shrink-0" />
            )}
            <div className="inline-flex flex-col gap-y-1">
              <span className="inline-block text-sm text-dark-blue-400">
                {method.title}
              </span>
              <span className="inline-block text-xs text-[#858585] leading-none">
                {method.subtitle}
              </span>
            </div>
          </div>

          <Button
            className="bg-white group-data-[state=checked]/item:hidden"
            variant="outlined"
            visual="gray"
            type="button"
          >
            Use This
          </Button>
          <div className="size-6 rounded-full bg-primary-500 hidden items-center justify-center shrink-0 group-data-[state=checked]/item:inline-flex">
            <Check className="size-[16.4px] text-white" />
          </div>
        </div>
      )}
    </HeadlessRadioGroupItem>
  )

  return (
    <div className="bg-gray-50 pt-[64px]">
      {/* Navigation */}
      <CheckoutNavigation
        currentStep={2}
        firstStepLabel={isTalentCheckout ? "Contract Details" : "Project Details"}
      />

      {/* Content */}
      <div className="px-[150px] py-[50px]">
        <div className="max-w-[1140px] mx-auto">
          <Button
            className="group"
            size="md"
            variant="link"
            visual="gray"
            onClick={() => router.push(`${basePath}/${slug}`)}
          >
            <ArrowLeft className="size-[15px] group-hover:-translate-x-1 transition duration-300" />{" "}
            Back
          </Button>

          <h1 className="mt-2 text-2xl leading-[.7] font-bold text-dark-blue-400">
            Payment Details
          </h1>

          <div className="mt-6 flex items-start gap-x-8">
            {/* Main content */}
            <div className="flex-auto p-[50px] rounded-lg shadow-[0px_1px_5px_0px_rgba(16,24,40,.02)] border border-gray-200 bg-white">
              {/* How do you want to pay? */}
              <h3 className="text-base leading-[.7] font-semibold text-dark-blue-400">
                {isOngoingTalentContract ? "Pay In Installments" : "How do you want to pay?"}
              </h3>

            {!isOngoingTalentContract ? (
              <div className="mt-6">
                <RadioGroup
                  value={pay}
                  onValueChange={(v) => setPay(v as "AT_ONCE" | "IN_INSTALLMENTS")}
                  className="flex gap-x-3 items-start"
                >
                  <RadioGroupItemSelector size="md" value="AT_ONCE">
                    <Label size="sm" asChild>
                      <span>Pay Full Amount</span>
                    </Label>
                    <HelperText size="sm">
                      {formatter.format(fullAmount)}
                    </HelperText>
                  </RadioGroupItemSelector>
                  <RadioGroupItemSelector size="md" value="IN_INSTALLMENTS">
                    <Label size="sm" asChild>
                      <span>Pay In Installments</span>
                    </Label>
                    <HelperText size="sm">
                      Select your payment plan
                    </HelperText>
                  </RadioGroupItemSelector>
                </RadioGroup>
              </div>
            ) : null}

            {pay === "IN_INSTALLMENTS" && (
              <Alert className="mt-6">
                <AlertIcon>
                  <AlertCircle className="h-5 w-5" />
                </AlertIcon>
                <AlertContent>
                  <AlertTitle className="inline-block">
                    Please Note:{" "}
                    <AlertDescription className="inline mt-0 font-normal">
                      To confirm this {installmentSubjectLabel}, an initial one-time payment is
                      required. Your installment plan will begin after this
                      payment is successfully processed.
                    </AlertDescription>
                  </AlertTitle>
                </AlertContent>
              </Alert>
            )}

            {/* Available Balance */}
            <div className="mt-6 border-t pt-6 border-gray-200">
              <h3 className="text-base leading-[.7] font-semibold text-dark-blue-400">
                Your Available Balance
              </h3>

              <div className="mt-5 flex items-start gap-x-4">
                <Checkbox
                  size="md"
                  checked={useBalance}
                  onCheckedChange={(v) => setUseBalance(v === true)}
                />

                <div className="flex-auto flex flex-col items-start">
                  {isBalanceCustom ? (
                    <form
                      className="contents"
                      onSubmit={(e) => {
                        e.preventDefault()
                        setIsBalanceCustom(false)
                      }}
                    >
                      <div className="flex items-center flex-auto max-w-[328px] gap-x-3">
                        <Input
                          className="flex-auto"
                          placeholder="Enter amount"
                          value={customAmount}
                          onChange={(e) => setCustomAmount(e.target.value)}
                        />
                        <Button size="lg">Apply</Button>
                      </div>

                      <div className="mt-2">
                        <span className="block text-xs leading-none text-gray-500">
                          {formatter.format(
                            customAmount
                              ? availableBalance - Number(customAmount)
                              : availableBalance
                          )}{" "}
                          remaining of available balance
                        </span>
                      </div>

                      <Button
                        className="underline mt-1"
                        variant="link"
                        visual="gray"
                        type="button"
                        onClick={() => {
                          setCustomAmount("")
                          setIsBalanceCustom(false)
                        }}
                      >
                        Use full balance
                      </Button>
                    </form>
                  ) : customAmount ? (
                    <>
                      <Label size="sm">
                        Using{" "}
                        <span className="font-bold">
                          {formatter.format(Number(customAmount))}
                        </span>{" "}
                        of total available balance of{" "}
                        {formatter.format(availableBalance)}
                      </Label>
                      <div className="flex items-center gap-x-1 mt-1.5">
                        <Button
                          className="underline"
                          variant="link"
                          visual="gray"
                          onClick={() => setIsBalanceCustom(true)}
                        >
                          Edit amount
                        </Button>
                        <span className="inline-block text-xs leading-[15px] text-gray-500">
                          or
                        </span>
                        <Button
                          className="underline"
                          variant="link"
                          visual="gray"
                          onClick={() => setCustomAmount("")}
                        >
                          Use full balance
                        </Button>
                      </div>
                    </>
                  ) : (
                    <>
                      <Label size="sm">
                        Use my{" "}
                        <span className="font-bold">
                          {formatter.format(availableBalance)}
                        </span>{" "}
                        available balance{" "}
                      </Label>
                      <Button
                        className="underline mt-1.5"
                        variant="link"
                        visual="gray"
                        onClick={() => setIsBalanceCustom(true)}
                      >
                        Apply Custom Amount
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Gift Cards */}
            <div className="mt-6 border-y py-6 border-gray-200">
              {showGiftCard ? (
                <div className="max-w-[477px] p-5 rounded-lg space-y-3 bg-primary-25">
                  <div className="flex items-center justify-between">
                    <Label size="sm">
                      Redeem a gift card{" "}
                      <span className="font-light">(dashes not required)</span>
                    </Label>
                    <Button
                      variant="link"
                      visual="gray"
                      onClick={() => setShowGiftCard(false)}
                    >
                      Cancel
                    </Button>
                  </div>

                  <form
                    className="flex items-center gap-x-3"
                    onSubmit={handleGiftCardSubmit}
                  >
                    <Input
                      className="flex-auto"
                      value={giftCardInput}
                      onChange={(e) => setGiftCardInput(e.target.value)}
                    />
                    <Button size="lg">Apply</Button>
                  </form>

                  {showGiftCardSuccess && giftCards.length > 0 && (
                    <Alert variant="success" className="mt-3">
                      <AlertIcon>
                        <CheckCircle className="size-5" />
                      </AlertIcon>
                      <AlertContent>
                        <AlertTitle>
                          Gift Card &quot;{giftCards.slice(-1)}&quot; has been applied.
                        </AlertTitle>
                      </AlertContent>
                    </Alert>
                  )}

                  {giftCards.length > 0 && (
                    <div className="mt-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs leading-none text-dark-blue-400 font-light">
                          Total gift card amount{" "}
                          <span className="font-bold">$1,000</span>
                        </span>
                        <Button variant="link" visual="gray">
                          View All Gift Cards
                          <ChevronDown className="size-[15px]" />
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <Button
                  variant="link"
                  size="md"
                  onClick={() => setShowGiftCard(true)}
                >
                  <Plus className="size-[15px]" /> Add Gift Card(s)
                </Button>
              )}
            </div>

            {/* Select Payment Method */}
            {pay === "AT_ONCE" &&
              !hasSplitFullPayment &&
              fullPaymentMethods.length < 1 &&
              savedInstallmentPaymentMethods.length > 0 && (
                <div className="mt-6">
                  <h3 className="text-base leading-[.7] font-semibold text-dark-blue-400">
                    Payment Methods
                  </h3>

                  <RadioGroup
                    className="mt-5 space-y-2.5"
                    value={fullPaymentMethods[0]?.id ?? ""}
                    onValueChange={(value) => {
                      const method = savedInstallmentPaymentMethods.find(
                        (savedMethod) => savedMethod.id === value
                      )

                      if (method) {
                        handleSelectFullPaymentMethod(method)
                      }
                    }}
                  >
                    {savedInstallmentPaymentMethods.map((method) =>
                      renderSavedPaymentMethodOption(method, () =>
                        handleSelectFullPaymentMethod(method)
                      )
                    )}
                  </RadioGroup>

                  <Button
                    className="mt-5"
                    variant="link"
                    visual="gray"
                    type="button"
                    onClick={openAddNewFullPaymentMethodDialog}
                  >
                    <Plus className="size-[15px]" /> Add Payment Method
                  </Button>
                </div>
              )}

            {pay === "AT_ONCE" &&
              !hasSplitFullPayment &&
              fullPaymentMethods.length < 1 &&
              savedInstallmentPaymentMethods.length < 1 && (
                <div className="mt-6">
                  <h3 className="text-base leading-[.7] font-semibold text-dark-blue-400">
                    Select Payment Method
                  </h3>
                  <RadioGroup
                    value={paymentMethod}
                    onValueChange={setPaymentMethod}
                    className="mt-5 grid grid-cols-3 gap-3"
                  >
                    {(paymentMethod
                      ? PAYMENT_METHODS.filter((m) => m.value === paymentMethod)
                      : PAYMENT_METHODS
                    ).map((method) => (
                      <HeadlessRadioGroupItem
                        value={method.value}
                        key={method.value}
                        className="group p-5 border relative shrink-0 border-gray-200 rounded-lg shadow-[0px_1px_4px_0px_rgba(0,0,0,.03)] hover:ring-1 hover:ring-gray-200 transition duration-300 focus-visible:outline-none data-[state=checked]:ring-1 data-[state=checked]:ring-primary-500 data-[state=checked]:border-primary-500 hover:data-[state=checked]:ring-primary-500"
                      >
                        <div className="absolute transition inline-flex items-center justify-center duration-300 left-2.5 top-2.5 size-5 rounded-full bg-primary-500 text-white group-hover:ring-[1.5px] group-hover:ring-primary-25 opacity-0 group-data-[state=checked]:opacity-100">
                          <Check className="size-3.5 shrink-0" />
                        </div>
                        <div className="gap-x-[3px] flex items-center justify-center [&>svg]:shrink-0">
                          {method.icons.map((icon) => icon)}
                        </div>
                        <h3 className="mt-3 text-sm font-medium text-gray-800 leading-5 text-center">
                          {method.title}
                        </h3>
                        <p className="text-xs mt-1 text-gray-500 leading-none text-center">
                          {method.desc}
                        </p>
                      </HeadlessRadioGroupItem>
                    ))}
                    {paymentMethod && (
                      <HeadlessRadioGroupItem
                        value=""
                        className="group p-[25px] border relative shrink-0 border-gray-200 rounded-lg shadow-[0px_1px_4px_0px_rgba(0,0,0,.03)] hover:ring-1 hover:ring-gray-200 transition duration-300 focus-visible:outline-none"
                      >
                        <div className="flex items-center justify-center">
                          <ArrowLeft className="size-5 text-gray-500 rotate-180" />
                        </div>
                        <h3 className="text-sm leading-5 mt-3 font-medium text-center text-gray-800">
                          Change Payment Method
                        </h3>
                      </HeadlessRadioGroupItem>
                    )}
                  </RadioGroup>
                </div>
              )}

            {pay === "AT_ONCE" &&
              fullPaymentMethods.length > 0 &&
              !hasSplitFullPayment && (
              <div className="mt-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg leading-none font-bold text-dark-blue-400">
                    Payment Method
                  </h3>

                  <Button variant="link" onClick={handleStartFullPaymentSplit}>
                    <DivideSquare className="size-[15px]" />
                    Split Payment
                  </Button>
                </div>

                <div className="mt-5">
                  {renderFullPaymentMethodRow(fullPaymentMethods[0], {
                    onEdit: () => openFullPaymentMethodFlow(false),
                  })}
                </div>
              </div>
            )}

            {pay === "AT_ONCE" &&
              hasSplitFullPayment &&
              fullPaymentMethods.length <= 1 && (
              <div className="mt-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg leading-none font-bold text-dark-blue-400">
                    Payment Method
                  </h3>
                </div>

                <div className="mt-5">
                  {renderFullPaymentMethodRow(fullPaymentMethods[0], {
                    onEdit: () => openFullPaymentMethodFlow(true),
                  })}
                </div>
              </div>
            )}

            {pay === "AT_ONCE" &&
              hasSplitFullPayment &&
              showFullPaymentMethods && (
              <div className="mt-6">
                <div className="flex items-center justify-between">
                  <h1 className="text-base font-bold text-dark-blue-400 leading-[.7]">
                    Payment Methods
                  </h1>

                  <div className="flex items-center gap-x-2">
                    <Label htmlFor="auto-split">Auto Split</Label>
                    <Switch id="auto-split" />
                  </div>
                </div>

                <div className="mt-5 space-y-2.5">
                  {fullPaymentMethods.map((method) => (
                    <React.Fragment key={method.id}>
                      {renderFullPaymentMethodRow(method, {
                        splitAmount: formatter.format(
                          fullAmount / fullPaymentMethods.length
                        ),
                        onEdit: () =>
                          handleEditPrimaryFullPaymentMethod(
                            method.method === "CREDIT_DEBIT_CARD"
                              ? "item-0"
                              : method.method === "BANK_ACCOUNT"
                                ? "item-1"
                                : "item-2"
                          ),
                        onRemove: () => handleRemoveFullPaymentMethod(method.id),
                      })}
                    </React.Fragment>
                  ))}
                </div>

                <div className="mt-5">
                  <Button
                    className="text-xs"
                    variant="link"
                    visual="gray"
                    onClick={() => setShowFullPaymentMethods(false)}
                  >
                    <Plus className="size-[15px]" /> Add Payment Method
                  </Button>
                </div>
              </div>
            )}

            {pay === "AT_ONCE" &&
              hasSplitFullPayment &&
              !showFullPaymentMethods && (
              <div className="mt-6">
                <div className="flex items-end justify-between">
                  <div className="space-y-1">
                    <h3 className="text-base leading-[.7] font-semibold text-dark-blue-400">
                      Add an additional payment method
                    </h3>
                    <p className="text-sm text-gray-500">
                      Split payment will be enabled once an additional payment
                      is added.
                    </p>
                  </div>

                  <Button
                    variant="link"
                    visual="primary"
                    onClick={() => {
                      setHasSplitFullPayment(false)
                      setShowFullPaymentMethods(false)
                      setPaymentMethod("")
                    }}
                  >
                    <X className="size-[15px]" />
                    Cancel
                  </Button>
                </div>

                <RadioGroup
                  value={paymentMethod}
                  onValueChange={setPaymentMethod}
                  className="mt-5 grid grid-cols-3 gap-3"
                >
                  {(paymentMethod
                    ? PAYMENT_METHODS.filter((method) => method.value === paymentMethod)
                    : PAYMENT_METHODS
                  ).map((method) => (
                    <HeadlessRadioGroupItem
                      value={method.value}
                      key={method.value}
                      className="group p-5 border relative shrink-0 border-gray-200 rounded-lg shadow-[0px_1px_4px_0px_rgba(0,0,0,.03)] hover:ring-1 hover:ring-gray-200 transition duration-300 focus-visible:outline-none data-[state=checked]:ring-1 data-[state=checked]:ring-primary-500 data-[state=checked]:border-primary-500 hover:data-[state=checked]:ring-primary-500"
                    >
                      <div className="absolute transition inline-flex items-center justify-center duration-300 left-2.5 top-2.5 size-5 rounded-full bg-primary-500 text-white group-hover:ring-[1.5px] group-hover:ring-primary-25 opacity-0 group-data-[state=checked]:opacity-100">
                        <Check className="size-3.5 shrink-0" />
                      </div>
                      <div className="gap-x-[3px] flex items-center justify-center [&>svg]:shrink-0">
                        {method.icons.map((icon) => icon)}
                      </div>
                      <h3 className="mt-3 text-sm font-medium text-gray-800 leading-5 text-center">
                        {method.title}
                      </h3>
                      <p className="text-xs mt-1 text-gray-500 leading-none text-center">
                        {method.desc}
                      </p>
                    </HeadlessRadioGroupItem>
                  ))}
                  {paymentMethod && (
                    <HeadlessRadioGroupItem
                      value=""
                      className="group p-[25px] border relative shrink-0 border-gray-200 rounded-lg shadow-[0px_1px_4px_0px_rgba(0,0,0,.03)] hover:ring-1 hover:ring-gray-200 transition duration-300 focus-visible:outline-none"
                    >
                      <div className="flex items-center justify-center">
                        <RefreshCcw className="size-5 text-gray-500" />
                      </div>
                      <h3 className="text-sm leading-5 mt-3 font-medium text-center text-gray-800">
                        Change Payment Method
                      </h3>
                    </HeadlessRadioGroupItem>
                  )}
                </RadioGroup>
              </div>
            )}

            {/* Wire Transfer Details */}
            {!isWireTransfer && paymentMethod === "item-2" && (
              <>
                <div className="mt-[50px]">
                  <div className="flex justify-between items-end">
                    <div className="space-y-3">
                      <h1 className="text-lg font-bold text-dark-blue-400 leading-none">
                        Wire transfer details
                      </h1>
                      <p className="text-xs text-gray-500 leading-none">
                        Please follow the instructions below in order to
                        complete your wire transfer
                      </p>
                    </div>
                    <Button variant="outlined" visual="gray">
                      <Download02 className="size-[15px]" /> Download Invoice
                    </Button>
                  </div>

                  <div className="mt-6 border border-gray-200 shadow-[0px_1px_4px_0px_rgba(0,0,0,.03)] bg-white rounded-lg">
                    <Tabs defaultValue="Domestic Transfer">
                      <TabsList className="justify-start w-full">
                        <TabsTrigger value="Domestic Transfer">
                          Domestic Transfer
                        </TabsTrigger>
                        <TabsTrigger value="International Transfer">
                          International Transfer
                        </TabsTrigger>
                      </TabsList>
                    </Tabs>

                    <div className="py-4 px-6 border-b border-gray-200">
                      <span className="text-gray-950 text-sm">
                        Domestic wire transfers will take 24 - 48 hours to receive.
                      </span>
                    </div>

                    <Table>
                      <TableBody className="[&_tr:last-child]:rounded-b-lg [&_td]:[&_tr:last-child]:rounded-b-lg">
                        <TableRow className="odd:bg-gray-25 even:bg-white hover:even:bg-white hover:odd:bg-gray-25 border-gray-200">
                          <TableCell className="py-4 border-r border-gray-200 px-6 whitespace-nowrap">Account Number:</TableCell>
                          <TableCell className="font-semibold py-4 px-6 whitespace-nowrap text-gray-950">712000528</TableCell>
                        </TableRow>
                        <TableRow className="odd:bg-gray-25 even:bg-white hover:even:bg-white hover:odd:bg-gray-25 border-gray-200">
                          <TableCell className="py-4 border-r border-gray-200 px-6 whitespace-nowrap">Routing Number:</TableCell>
                          <TableCell className="font-semibold py-4 px-6 whitespace-nowrap text-gray-950">111000523</TableCell>
                        </TableRow>
                        <TableRow className="odd:bg-gray-25 even:bg-white hover:even:bg-white hover:odd:bg-gray-25 border-gray-200">
                          <TableCell className="py-4 border-r border-gray-200 px-6 whitespace-nowrap">Account Name:</TableCell>
                          <TableCell className="font-semibold py-4 px-6 whitespace-nowrap text-gray-950">Marketeq Digital Inc.</TableCell>
                        </TableRow>
                        <TableRow className="odd:bg-gray-25 even:bg-white hover:even:bg-white hover:odd:bg-gray-25 border-gray-200">
                          <TableCell className="py-4 border-r border-gray-200 px-6 whitespace-nowrap">Bank Name:</TableCell>
                          <TableCell className="font-semibold py-4 px-6 whitespace-nowrap text-gray-950">JP Morgan Chase & Co.</TableCell>
                        </TableRow>
                        <TableRow className="odd:bg-gray-25 even:bg-white hover:even:bg-white hover:odd:bg-gray-25 border-gray-200">
                          <TableCell className="py-4 border-r border-gray-200 px-6 whitespace-nowrap">Bank Address:</TableCell>
                          <TableCell className="font-semibold py-4 px-6 whitespace-nowrap text-gray-950">111 Wall Street New York, New York 10043, United States</TableCell>
                        </TableRow>
                        <TableRow className="odd:bg-gray-25 even:bg-white hover:even:bg-white hover:odd:bg-gray-25 border-gray-200">
                          <TableCell className="py-4 border-r border-gray-200 px-6 whitespace-nowrap">Remark:</TableCell>
                          <TableCell className="font-semibold py-4 px-6 whitespace-nowrap text-gray-950">
                            <div className="flex items-center gap-x-6">
                              #22602731500102292
                              <div className="inline-flex flex-auto items-center gap-x-2">
                                <ArrowLeft className="size-4 text-gray-500" />
                                <span className="text-sm font-normal whitespace-nowrap text-gray-500">
                                  Please attach this order number
                                </span>
                              </div>
                            </div>
                          </TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </div>
                </div>

                {/* Steps to complete wire transfer */}
                <div className="mt-[50px]">
                  <div className="flex justify-between items-end">
                    <h1 className="text-lg font-bold text-dark-blue-400 leading-none">
                      Steps to complete your wire transfer
                    </h1>
                    <Button variant="outlined" visual="gray">
                      <Download02 className="size-[15px]" /> Download Instructions
                    </Button>
                  </div>

                  <div className="mt-8">
                    <div className="pl-2.5">
                      <div className="gap-x-6 pb-[25px] relative flex items-start">
                        <div className="inline-block">
                          <div className="size-8 rounded-full shrink-0 border border-primary-500 text-primary-500 text-sm leading-none font-semibold inline-flex items-center justify-center">1</div>
                          <span className="block w-0.5 absolute bottom-[5px] top-[37px] left-[15px] bg-gray-200" />
                        </div>
                        <div className="flex-auto space-y-2 pt-[7px]">
                          <h3 className="text-sm text-dark-blue-400 leading-[18px]">Select your preferred transfer method (Domestic or International).</h3>
                        </div>
                      </div>
                    </div>
                    <div className="pl-2.5">
                      <div className="gap-x-6 pb-[25px] relative flex items-start">
                        <div className="inline-block">
                          <div className="size-8 rounded-full shrink-0 border border-primary-500 text-primary-500 text-sm leading-none font-semibold inline-flex items-center justify-center">2</div>
                          <span className="block w-0.5 absolute bottom-[5px] top-[37px] left-[15px] bg-gray-200" />
                        </div>
                        <div className="flex-auto space-y-2">
                          <h3 className="text-sm text-dark-blue-400 leading-[18px]">Download and attach your invoice and proceed with your payment using the bank account details provided.</h3>
                          <h3 className="text-sm text-dark-blue-400 leading-[18px]"><span className="font-semibold">NOTE:</span> Please mention your <span className="font-semibold">project title</span> and <span className="font-semibold">order number</span> in the reference area to help us identify your payment</h3>
                        </div>
                      </div>
                    </div>
                    <div className="pl-2.5">
                      <div className="gap-x-6 pb-[25px] relative flex items-start">
                        <div className="inline-block">
                          <div className="size-8 rounded-full shrink-0 border border-primary-500 text-primary-500 text-sm leading-none font-semibold inline-flex items-center justify-center">3</div>
                        </div>
                        <div className="flex-auto space-y-2">
                          <h3 className="text-sm text-dark-blue-400 leading-[18px]">Upload the payment receipt or proof of your transaction. This helps us process your payment faster and keep everything on track.</h3>
                          <h3 className="text-sm text-dark-blue-400 leading-[18px]"><span className="font-semibold">NOTE:</span> You will able to upload your wire transfer receipt after you submit your order.</h3>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-[26px]">
                  <div className="flex items-center gap-x-2">
                    <Button variant="outlined" visual="gray" onClick={() => setPaymentMethod("")}>Cancel</Button>
                    <Button onClick={handleSaveFullPaymentWire} className="bg-primary-50 text-primary-500 hover:bg-primary-500 hover:text-white">Save Payment Method</Button>
                  </div>
                  <div className="mt-3.5">
                    <span className="text-xs font-light text-dark-blue-400">By adding sending your wire transfer, you agree to Marketeq&apos;s <Button variant="link">Terms and Conditions</Button></span>
                  </div>
                </div>
              </>
            )}

            {/* Wire Transfer Saved */}
            {isWireTransfer && paymentMethod === "item-2" && (
              <div className="mt-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg leading-none font-bold text-dark-blue-400">Payment Method</h3>
                </div>
                <div className="mt-5">
                  <div className="rounded-lg bg-white border border-gray-200 p-[15px] flex items-center justify-between">
                    <div className="flex items-center gap-x-3">
                      <div className="inline-flex items-center shrink-0 justify-center w-[46.5px] h-[31px]"><WireTransferIcon /></div>
                      <div className="inline-flex flex-col gap-y-1">
                        <span className="inline-block text-sm text-dark-blue-400">Domestic Wire Transfer</span>
                        <span className="inline-block text-xs text-[#858585] leading-none">Wire details will appear after you submit the order</span>
                      </div>
                    </div>
                    <Button variant="link" visual="gray" onClick={() => setIsWireTransfer(false)}>Edit</Button>
                  </div>
                </div>
              </div>
            )}

            {/* Credit / Debit Card Form */}
            {paymentMethod === "item-0" && (
              <div className="mt-[50px]">
                <h1 className="text-lg leading-none font-bold text-dark-blue-400">Add your credit / debit card</h1>
                <p className="mt-3 text-gray-500 text-xs leading-none flex items-center gap-x-1">
                  <Lock className="size-4" /> Your payment is secure. Your card details will not be shared.
                </p>

                <div className="mt-6 space-y-3">
                  <div className="space-y-1.5">
                    <Label size="sm" htmlFor="card-number">Card number</Label>
                    <Input id="card-number" placeholder="0000 0000 0000 0000" value={cardNumber} onChange={(e) => setCardNumber(e.target.value)} />
                  </div>

                  <div className="space-y-1.5">
                    <Label size="sm" htmlFor="name-on-card">Name on card</Label>
                    <Input id="name-on-card" type="text" placeholder="John Doe" value={cardName} onChange={(e) => setCardName(e.target.value)} />
                  </div>

                  <div className="grid grid-cols-2 gap-x-3">
                    <div className="space-y-1.5">
                      <Label size="sm" htmlFor="expiration-date">Expiration Date</Label>
                      <Input
                        id="expiration-date"
                        type="text"
                        placeholder="MM/YY"
                        value={expirationDate}
                        onChange={(e) => {
                          const sanitized = e.target.value.replace(/[^\d]/g, "")
                          if (sanitized.length >= 2) {
                            setExpirationDate(`${sanitized.slice(0, 2)}/${sanitized.slice(2, 4)}`)
                          } else {
                            setExpirationDate(sanitized)
                          }
                        }}
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label size="sm" htmlFor="cvv-cvc">CVV / CVC</Label>
                      <InputGroup>
                        <Input id="cvv-cvc" type="text" placeholder="3 or 4 digits" value={cvv} onChange={(e) => { if (e.target.value.length <= 4) setCvv(e.target.value) }} />
                        <InputRightElement>
                          <TooltipProvider delayDuration={75}>
                            <Tooltip>
                              <TooltipTrigger className="focus-visible:outline-none">
                                <HelpCircle className="text-gray-500 h-4 w-4" />
                              </TooltipTrigger>
                              <TooltipContent className="max-w-[139px]" visual="gray">3-4 digit code on the back of your card</TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </InputRightElement>
                      </InputGroup>
                    </div>
                  </div>
                </div>

                <div className="mt-[22px] flex items-center gap-x-3">
                  <Checkbox size="md" id="save-default-payment-method" checked={saveCard} onCheckedChange={(v) => setSaveCard(v === true)} />
                  <Label size="sm" htmlFor="save-default-payment-method">Save as default payment method</Label>
                </div>

                {/* Billing Address */}
                <div className="mt-[50px]">
                  <h3 className="text-lg leading-none font-bold text-dark-blue-400">Billing Address</h3>

                  <div className="mt-6 space-y-3">
                    <div className="space-y-1.5">
                      <Label size="sm" htmlFor="full-name">Full Name</Label>
                      <Input placeholder="John Doe" id="full-name" value={fullName} onChange={(e) => setFullName(e.target.value)} />
                    </div>
                    <div className="space-y-1.5">
                      <Label size="sm" htmlFor="address-line-1">Address Line 1</Label>
                      <Input placeholder="Street Address or P.O. Box" id="address-line-1" value={addressLine1} onChange={(e) => setAddressLine1(e.target.value)} />
                    </div>
                    <div className="space-y-1.5">
                      <Label size="sm" htmlFor="address-line-2">Address Line 2</Label>
                      <Input placeholder="Apt, Suite, Unit, or Building #" id="address-line-2" value={addressLine2} onChange={(e) => setAddressLine2(e.target.value)} />
                    </div>
                    <div className="gap-x-3 grid grid-cols-3">
                      <div className="space-y-1.5">
                        <Label size="sm" htmlFor="city">City</Label>
                        <Input placeholder="Marketown" id="city" value={city} onChange={(e) => setCity(e.target.value)} />
                      </div>
                      <div className="space-y-1.5">
                        <Label size="sm" htmlFor="state">State</Label>
                        <Listbox value={billingState} onChange={setBillingState}>
                          <ListboxButton placeholder="Select" />
                          <ListboxOptions>
                            {["New York", "Florida", "Alaska", "Arizona", "Georgia", "Hawaii", "California"].map((s) => (
                              <ListboxOption key={s} value={s}>{s}</ListboxOption>
                            ))}
                          </ListboxOptions>
                        </Listbox>
                      </div>
                      <div className="space-y-1.5">
                        <Label size="sm" htmlFor="zipcode">Zipcode</Label>
                        <Input placeholder="12345" id="zipcode" value={zipcode} onChange={(e) => setZipcode(e.target.value)} />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label size="sm" htmlFor="phone-number">Phone number</Label>
                      <Input placeholder="+1 (555) 000-0000" id="phone-number" value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} />
                    </div>
                  </div>

                  <div className="flex mt-[50px] justify-end">
                    <Button onClick={handleSaveFullPaymentCard}>Save Card</Button>
                  </div>
                </div>
              </div>
            )}

            {/* Bank Account Form */}
            {paymentMethod === "item-1" && (
              <>
                <div className="mt-[50px]">
                  <div className="px-[55.25px] flex items-end pb-5 gap-x-[22.55px]">
                    <div className="h-[95.88px] shrink-0 relative w-[198.92px]">
                      <NextImage className="object-contain" src="/connect-bank-account.png" alt="Connect Bank Account" fill sizes="25vw" />
                    </div>
                    <h1 className="text-[26.62px] leading-[1.2] text-gray-950">
                      Marketeq uses <span className="font-bold">Plaid</span> to connect your bank account
                    </h1>
                  </div>

                  <div className="py-[50px] px-[75px] rounded-xl border-2 border-gray-200 bg-white grid grid-cols-2 gap-x-[60px] items-center">
                    <div className="space-y-[30px]">
                      <div className="flex items-start gap-x-2.5">
                        <Zap className="size-[14.77px] shrink-0 text-gray-950" />
                        <div className="flex-auto">
                          <h3 className="text-[13px] leading-none font-semibold text-gray-950">Connect in seconds</h3>
                          <p className="mt-2 text-[13px] leading-none font-light text-gray-950">8000+ apps trust Plaid to quickly connect to financial institutions</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-x-2.5">
                        <ShieldTick className="size-[14.77px] shrink-0 text-gray-950" />
                        <div className="flex-auto">
                          <h3 className="text-[13px] leading-none font-semibold text-gray-950">Keep your data safe</h3>
                          <p className="mt-2 text-[13px] leading-none font-light text-gray-950">Plaid uses best-in-class encryption to help protect your data</p>
                        </div>
                      </div>
                    </div>
                    <div className="space-y-5">
                      <Button className="h-[56.24px] bg-black gap-x-3 hover:bg-black/70 px-8 text-[17.62px] leading-[20.88px] font-semibold">Connect my account</Button>
                      <div>
                        <span className="inline-block text-[11px] leading-[1.5] font-light text-gray-950">
                          By continuing, you agree to Plaid&apos;s <span className="underline inline-block">Privacy Policy</span> and to receiving updates on plaid.com
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-[50px] flex items-center gap-x-[9px]">
                    <span className="inline-block flex-auto h-px bg-[#E1E6EA]" />
                    <span className="text-xs font-medium text-[#939DA7] leading-5">Or</span>
                    <span className="inline-block flex-auto h-px bg-[#E1E6EA]" />
                  </div>
                </div>

                <div className="mt-[50px]">
                  <h1 className="text-lg leading-none font-bold text-dark-blue-400">Add Your Bank Account Manually</h1>

                  <div className="mt-6 space-y-3">
                    <div className="space-y-1.5">
                      <Label size="sm" htmlFor="account-type">Account Type</Label>
                      <Listbox value={accountType} onChange={setAccountType}>
                        <ListboxButton placeholder="Select" />
                        <ListboxOptions>
                          {["Checking", "Savings"].map((option) => (
                            <ListboxOption key={option} value={option}>{option}</ListboxOption>
                          ))}
                        </ListboxOptions>
                      </Listbox>
                    </div>
                    <div className="space-y-1.5">
                      <Label size="sm" htmlFor="account-holder-name">Account Holder Name</Label>
                      <Input id="account-holder-name" type="text" placeholder="John Doe" value={accountHolderName} onChange={(e) => setAccountHolderName(e.target.value)} />
                    </div>
                    <div className="space-y-1.5">
                      <Label size="sm" htmlFor="bank-routing-number">Bank Routing Number</Label>
                      <Input id="bank-routing-number" type="text" placeholder="xxxx-xxxx-xx" value={bankRoutingNumber} onChange={(e) => setBankRoutingNumber(e.target.value)} />
                    </div>
                    <div className="grid grid-cols-2 gap-x-3">
                      <div className="space-y-1.5">
                        <Label size="sm" htmlFor="account-number">Account Number</Label>
                        <Input id="account-number" type="text" placeholder="Up to 17 digits" value={accountNumber} onChange={(e) => setAccountNumber(e.target.value)} />
                      </div>
                      <div className="space-y-1.5">
                        <Label size="sm" htmlFor="re-enter-account-number">Re-Enter Account Number</Label>
                        <Input id="re-enter-account-number" type="text" placeholder="Up to 17 digits" value={confirmAccountNumber} onChange={(e) => setConfirmAccountNumber(e.target.value)} />
                      </div>
                    </div>
                  </div>

                  <div className="mt-[22px] flex items-center gap-x-3">
                    <Checkbox size="md" id="save-bank-default" checked={saveBankAccount} onCheckedChange={(v) => setSaveBankAccount(v === true)} />
                    <Label size="sm" htmlFor="save-bank-default">Save as default payment method</Label>
                  </div>

                  <div className="mt-[50px]">
                    <div className="flex items-center justify-end gap-x-2">
                      <Button type="button" variant="outlined" visual="gray" onClick={() => setPaymentMethod("")}>Cancel</Button>
                      <Button className="bg-primary-50 text-primary-500 hover:bg-primary-500 hover:text-white" onClick={handleSaveFullPaymentBank}>Save account</Button>
                    </div>
                    <div className="mt-3.5 flex items-center justify-end">
                      <span className="text-xs font-light text-dark-blue-400">By adding your bank account, you agree to Marketeq&apos;s <Button variant="link">Terms and Conditions</Button></span>
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* Installments */}
            {pay === "IN_INSTALLMENTS" && (
              <>
                <div className="mt-6">
                  <h1 className="text-base text-dark-blue-400 font-bold leading-[.7]">Initial One-Time Payment</h1>
                  {firstInstallmentMethods.length > 0 ? (
                    <div className="mt-5 space-y-2.5">
                      {firstInstallmentMethods.map((method) => (
                        <React.Fragment key={method.id}>
                          {renderInstallmentMethodSummary(method, "first")}
                        </React.Fragment>
                      ))}
                    </div>
                  ) : (
                    <div
                      className="mt-5 border-dashed rounded-lg py-[50px] px-6 h-[120px] border-2 border-gray-300 hover:border-gray-400 hover:bg-gray-100 transition duration-300 bg-gray-50 flex items-center justify-center gap-x-2 cursor-pointer"
                      role="button"
                      tabIndex={0}
                      onClick={() => openInstallmentMethodFlow("first")}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault()
                          openInstallmentMethodFlow("first")
                        }
                      }}
                    >
                      <Button className="hover:no-underline" variant="link" visual="gray">
                        <Plus className="size-[15px]" /> Add Payment Method
                      </Button>
                    </div>
                  )}

                  {firstInstallmentMethods.length > 0 ? (
                    <div className="mt-5 flex items-center justify-between">
                      <Button
                        variant="link"
                        visual="gray"
                        onClick={() => openInstallmentMethodFlow("first")}
                      >
                        <Plus className="size-[15px]" />
                        Add Payment Method
                      </Button>

                      <div className="flex items-center gap-x-2">
                        <h3 className="text-xs font-light text-dark-blue-400">
                          Total one-time amount
                        </h3>
                        <h1 className="text-base font-bold text-dark-blue-400">
                          {formatter.format(availableBalance)}
                        </h1>
                      </div>
                    </div>
                  ) : null}
                </div>

                <div className="mt-6">
                  <h1 className="text-base text-dark-blue-400 font-bold leading-[.7]">Recurring Payments</h1>
                  <div className="flex items-end justify-between">
                    <div className="flex items-center gap-x-6 mt-5">
                      <span
                        ref={recurringPaymentFrequencyMeasureRef}
                        aria-hidden="true"
                        className="pointer-events-none absolute opacity-0 whitespace-nowrap text-xs text-dark-blue-400"
                      >
                        {paymentFrequency ? (
                          <>
                            {paymentFrequency.label} - <span className="font-bold">{paymentFrequency.value}</span>
                          </>
                        ) : (
                          "Select Payment Frequency"
                        )}
                      </span>
                      <Listbox
                        className="transition-[width] duration-300"
                        style={
                          recurringPaymentFrequencyWidth
                            ? { width: `${recurringPaymentFrequencyWidth}px` }
                            : undefined
                        }
                        value={paymentFrequency}
                        onChange={(option) => {
                          if (option) {
                            setSelectedTalentPaymentPlanId(option.id)
                          }
                        }}
                      >
                        <ListboxButton
                          className="whitespace-nowrap text-xs text-dark-blue-400"
                          displayValue={(value: PaymentPlanOption) => (
                            <>
                              {value.label} - <span className="font-bold">{value.value}</span>
                            </>
                          )}
                          placeholderClassName="text-xs"
                          placeholder="Select Payment Frequency"
                        />
                        <ListboxOptions className="min-w-[265px] w-max">
                          {recurringSectionPaymentOptions.map((option) => (
                            <ListboxOption
                              className="hover:text-gray-900"
                              indicator={false}
                              key={option.label}
                              value={option}
                            >
                              {option.label}
                              <span className="inline-block ml-auto font-normal">
                                {option.meta ? `${option.meta} x` : ""}
                                <span className="font-bold">{option.value}</span>
                              </span>
                            </ListboxOption>
                          ))}
                        </ListboxOptions>
                      </Listbox>

                      <div className="w-[220px] h-7 shrink-0 overflow-hidden">
                        {paymentFrequency ? (
                          paymentFrequency.label === "Pay Remaining Balance" ? (
                            <span className="inline-block text-xs leading-[14px] font-medium text-gray-500">
                              <span className="block whitespace-nowrap">Your remaining amount will be</span>
                              <span className="block whitespace-nowrap">
                                charged on <span className="font-bold">January 1st, 2025</span>
                              </span>
                            </span>
                          ) : (
                            <span className="inline-block text-xs leading-[14px] font-medium text-gray-500">
                              <span className="block whitespace-nowrap">
                                {paymentFrequency.meta} {paymentFrequency.label.toLowerCase()} payments, starting
                              </span>
                              <span className="block whitespace-nowrap">
                                from <span className="font-bold">January 1st, 2025</span>
                              </span>
                            </span>
                          )
                        ) : null}
                      </div>
                    </div>
                  </div>

                  {secondInstallmentMethods.length > 0 ? (
                    <div className="mt-5 space-y-2.5">
                      {secondInstallmentMethods.map((method) => (
                        <React.Fragment key={method.id}>
                          {renderInstallmentMethodSummary(method, "second")}
                        </React.Fragment>
                      ))}
                    </div>
                  ) : (
                    <div
                      className="mt-5 border-dashed rounded-lg py-[50px] px-6 h-[120px] border-2 border-gray-300 bg-gray-50 hover:border-gray-400 hover:bg-gray-100 transition duration-300 flex items-center justify-center gap-x-2 cursor-pointer"
                      role="button"
                      tabIndex={0}
                      onClick={() => openInstallmentMethodFlow("second")}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault()
                          openInstallmentMethodFlow("second")
                        }
                      }}
                    >
                      <Button className="hover:no-underline" variant="link" visual="gray">
                        <Plus className="size-[15px]" /> Add Payment Method
                      </Button>
                    </div>
                  )}

                  {secondInstallmentMethods.length > 0 ? (
                    <div className="mt-5 flex items-center justify-between">
                      <Button
                        variant="link"
                        visual="gray"
                        onClick={() => openInstallmentMethodFlow("second")}
                      >
                        <Plus className="size-[15px]" />
                        Add Payment Method
                      </Button>

                      <div className="flex items-center gap-x-2">
                        <h3 className="text-xs font-light text-dark-blue-400">
                          Total recurring amount
                        </h3>
                        <h1 className="text-base font-bold text-dark-blue-400">
                          {paymentFrequency?.value ?? talentPaymentPlan?.value}
                        </h1>
                      </div>
                    </div>
                  ) : null}
                </div>

                <Dialog
                  open={isExistingInstallmentMethodsDialogOpen}
                  onOpenChange={setIsExistingInstallmentMethodsDialogOpen}
                >
                  <DialogContent className="max-w-[743px] p-0">
                    <div className="flex items-center justify-between border-b border-gray-200 p-3">
                      <h2 className="text-lg font-semibold leading-7 text-dark-blue-400">
                        Select Payment Method
                      </h2>
                      <DialogClose asChild>
                        <IconButton
                          className="text-gray-500"
                          variant="ghost"
                          visual="gray"
                          size="md"
                        >
                          <X className="size-5" />
                        </IconButton>
                      </DialogClose>
                    </div>

                    <div className="p-6">
                      <RadioGroup
                        className="space-y-2.5"
                        value={selectedExistingInstallmentMethodId}
                        onValueChange={setSelectedExistingInstallmentMethodId}
                      >
                        {savedInstallmentPaymentMethods.map((method) => (
                          <HeadlessRadioGroupItem
                            className="group/item block focus-visible:outline-none"
                            value={method.id}
                            key={method.id}
                            onClick={() => handleSelectExistingInstallmentMethod(method)}
                          >
                            {method.method === "CREDIT_DEBIT_CARD" ? (
                              <CreditDebitCardArticle3
                                cardNumber={method.cardNumber}
                                saveDefaultPaymentMethod={method.saveDefaultPaymentMethod}
                              />
                            ) : method.method === "BANK_ACCOUNT" ? (
                              <div className="rounded-lg flex-auto bg-gray-50 border border-gray-300 p-[15px] flex items-center justify-between shadow-[0px_1px_4px_0px_rgba(0,0,0,.03)] transition duration-300 group-data-[state=checked]/item:border-primary-500 group-data-[state=checked]/item:ring-1 group-data-[state=checked]/item:ring-primary-500">
                                <div className="flex items-center gap-x-3">
                                  <div className="inline-flex items-center rounded-[4px] shrink-0 bg-white border border-gray-200 text-gray-500 justify-center w-[46.5px] h-[31px]">
                                    <BankIcon className="size-4" />
                                  </div>

                                  <div className="inline-flex flex-col gap-y-1">
                                    <div className="inline-flex items-center gap-x-2">
                                      <span className="inline-block text-sm text-dark-blue-400">
                                        {method.title}
                                      </span>
                                      {method.saveDefaultPaymentMethod && (
                                        <Badge visual="primary">Default</Badge>
                                      )}
                                    </div>
                                    <span className="inline-block text-xs text-[#858585] leading-none">
                                      {method.accountType} ****{method.accountNumber?.slice(-4)}
                                    </span>
                                  </div>
                                </div>

                                <Button
                                  className="bg-white group-data-[state=checked]/item:hidden"
                                  variant="outlined"
                                  visual="gray"
                                  type="button"
                                >
                                  Use This
                                </Button>
                                <div className="size-6 rounded-full bg-primary-500 hidden items-center justify-center shrink-0 group-data-[state=checked]/item:inline-flex">
                                  <Check className="size-[16.4px] text-white" />
                                </div>
                              </div>
                            ) : (
                              <div className="rounded-lg flex-auto bg-gray-50 border border-gray-300 p-[15px] flex items-center justify-between shadow-[0px_1px_4px_0px_rgba(0,0,0,.03)] transition duration-300 group-data-[state=checked]/item:border-primary-500 group-data-[state=checked]/item:ring-1 group-data-[state=checked]/item:ring-primary-500">
                                <div className="flex items-center gap-x-3">
                                  {method.method === "GOOGLE_PAY" ? (
                                    <GPay1 className="h-[31px] w-[46.5px] shrink-0" />
                                  ) : (
                                    <ApplePay1 className="h-[31px] w-[46.5px] shrink-0" />
                                  )}
                                  <div className="inline-flex flex-col gap-y-1">
                                    <span className="inline-block text-sm text-dark-blue-400">
                                      {method.title}
                                    </span>
                                    <span className="inline-block text-xs text-[#858585] leading-none">
                                      {method.subtitle}
                                    </span>
                                  </div>
                                </div>

                                <Button
                                  className="bg-white group-data-[state=checked]/item:hidden"
                                  variant="outlined"
                                  visual="gray"
                                  type="button"
                                >
                                  Use This
                                </Button>
                                <div className="size-6 rounded-full bg-primary-500 hidden items-center justify-center shrink-0 group-data-[state=checked]/item:inline-flex">
                                  <Check className="size-[16.4px] text-white" />
                                </div>
                              </div>
                            )}
                          </HeadlessRadioGroupItem>
                        ))}
                      </RadioGroup>

                      <Button
                        className="mt-5"
                        variant="link"
                        visual="gray"
                        type="button"
                        onClick={handleOpenAddNewInstallmentMethodDialog}
                      >
                        <Plus className="size-[15px]" /> Add Payment Method
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>

                <Dialog
                  open={isAddNewInstallmentMethodDialogOpen}
                  onOpenChange={setIsAddNewInstallmentMethodDialogOpen}
                >
                  <DialogContent className="max-w-[743px] p-0">
                    <div className="flex items-center justify-between border-b border-gray-200 p-3">
                      <div className="flex items-center gap-x-3">
                        <IconButton
                          variant="ghost"
                          visual="gray"
                          size="md"
                          className="text-dark-blue-400"
                          onClick={handleBackFromAddNewInstallmentMethodDialog}
                        >
                          <ArrowLeft className="size-5" />
                        </IconButton>
                        <h2 className="text-lg font-semibold leading-7 text-dark-blue-400">
                          Add New Payment Method
                        </h2>
                      </div>
                      <DialogClose asChild>
                        <IconButton
                          className="text-gray-500"
                          variant="ghost"
                          visual="gray"
                          size="md"
                        >
                          <X className="size-5" />
                        </IconButton>
                      </DialogClose>
                    </div>

                    <div className="p-6">
                      <RadioGroup
                        value={selectedNewInstallmentMethodType}
                        onValueChange={(value) =>
                          handleOpenInstallmentMethodType(
                            value as NewPaymentMethodOptionValue
                          )
                        }
                        className="grid grid-cols-2 gap-3"
                      >
                        {NEW_PAYMENT_METHOD_OPTIONS.map((method) => (
                          <HeadlessRadioGroupItem
                            value={method.value}
                            key={method.value}
                            className="group relative shrink-0 rounded-lg border border-gray-200 p-5 shadow-[0px_1px_4px_0px_rgba(0,0,0,.03)] transition duration-300 hover:ring-1 hover:ring-gray-200 focus-visible:outline-none data-[state=checked]:border-primary-500 data-[state=checked]:ring-1 data-[state=checked]:ring-primary-500 hover:data-[state=checked]:ring-primary-500"
                          >
                            <div className="absolute left-2.5 top-2.5 inline-flex size-5 items-center justify-center rounded-full bg-primary-500 text-white opacity-0 transition duration-300 group-hover:ring-[1.5px] group-hover:ring-primary-25 group-data-[state=checked]:opacity-100">
                              <Check className="size-3.5 shrink-0" />
                            </div>
                            <div className="flex items-center justify-center gap-x-[3px] [&>svg]:shrink-0">
                              {method.icons}
                            </div>
                            <h3 className="mt-3 text-center text-sm font-medium leading-5 text-gray-800">
                              {method.title}
                            </h3>
                            <p className="mt-1 text-center text-xs leading-none text-gray-500">
                              {method.description}
                            </p>
                          </HeadlessRadioGroupItem>
                        ))}
                      </RadioGroup>
                    </div>
                  </DialogContent>
                </Dialog>

                <Dialog
                  open={isAddCardInstallmentMethodDialogOpen}
                  onOpenChange={setIsAddCardInstallmentMethodDialogOpen}
                >
                  <DialogContent className="max-w-[743px] p-0">
                    <div className="flex items-center justify-between border-b border-gray-200 p-3">
                      <div className="flex items-center gap-x-3">
                        <IconButton
                          variant="ghost"
                          visual="gray"
                          size="md"
                          className="text-dark-blue-400"
                          onClick={() => {
                            setIsAddCardInstallmentMethodDialogOpen(false)
                            setIsAddNewInstallmentMethodDialogOpen(true)
                          }}
                        >
                          <ArrowLeft className="size-5" />
                        </IconButton>
                        <h2 className="text-lg font-semibold leading-7 text-dark-blue-400">
                          Add Your Credit / Debit Card
                        </h2>
                      </div>
                      <DialogClose asChild>
                        <IconButton
                          className="text-gray-500"
                          variant="ghost"
                          visual="gray"
                          size="md"
                        >
                          <X className="size-5" />
                        </IconButton>
                      </DialogClose>
                    </div>

                    <div className="p-6">
                      <p className="flex items-center gap-x-1 text-xs leading-none text-gray-500">
                        <Lock className="size-4" /> Your payment is secure. Your card details will not be shared.
                      </p>

                      <div className="mt-6 space-y-3">
                        <div className="space-y-1.5">
                          <Label size="sm" htmlFor="installment-card-number">Card Number</Label>
                          <CreditCardInput
                            id="installment-card-number"
                            value={cardNumber}
                            onValueChange={setCardNumber}
                          />
                        </div>

                        <div className="space-y-1.5">
                          <Label size="sm" htmlFor="installment-card-name">Name On Card</Label>
                          <Input
                            id="installment-card-name"
                            type="text"
                            placeholder="John Doe"
                            value={cardName}
                            onChange={(event) => setCardName(event.target.value)}
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-x-3">
                          <div className="space-y-1.5">
                            <Label size="sm" htmlFor="installment-expiration-date">Expiration Date</Label>
                            <Input
                              id="installment-expiration-date"
                              type="text"
                              placeholder="MM/YYYY"
                              value={expirationDate}
                              onChange={(event) => {
                                const sanitized = event.target.value.replace(/[^\d]/g, "")
                                if (sanitized.length >= 2) {
                                  setExpirationDate(`${sanitized.slice(0, 2)}/${sanitized.slice(2, 6)}`)
                                  return
                                }
                                setExpirationDate(sanitized)
                              }}
                            />
                          </div>

                          <div className="space-y-1.5">
                            <Label size="sm" htmlFor="installment-cvv-cvc">CVV / CVC</Label>
                            <InputGroup>
                              <Input
                                id="installment-cvv-cvc"
                                type="text"
                                placeholder="3 or 4 digits"
                                value={cvv}
                                onChange={(event) => {
                                  if (event.target.value.length <= 4) {
                                    setCvv(event.target.value)
                                  }
                                }}
                              />
                              <InputRightElement>
                                <TooltipProvider delayDuration={75}>
                                  <Tooltip>
                                    <TooltipTrigger className="focus-visible:outline-none">
                                      <HelpCircle className="h-4 w-4 text-gray-500" />
                                    </TooltipTrigger>
                                    <TooltipContent className="max-w-[139px]" visual="gray">
                                      3-4 digit code on the back of your card
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              </InputRightElement>
                            </InputGroup>
                          </div>
                        </div>
                      </div>

                      <div className="mt-[22px] flex items-center gap-x-3">
                        <Checkbox
                          size="md"
                          id="save-installment-default-payment-method"
                          checked={saveCard}
                          onCheckedChange={(value) => setSaveCard(value === true)}
                        />
                        <Label size="sm" htmlFor="save-installment-default-payment-method">
                          Save as default payment method
                        </Label>
                      </div>

                      <div className="mt-[50px]">
                        <h3 className="text-lg leading-none font-bold text-dark-blue-400">
                          Billing Address
                        </h3>

                        <div className="mt-6 flex items-center justify-between rounded-[7px] border-2 border-gray-200 bg-white p-6 pt-[35px]">
                          <div className="space-y-1">
                            <h3 className="text-base font-semibold leading-5 text-dark-blue-400">
                              {billingAddressSummary.fullName}
                            </h3>

                            <ul className="max-w-[211px]">
                              <li className="text-base leading-5 text-dark-blue-400">
                                {billingAddressSummary.addressLine1}
                              </li>
                              <li className="text-base leading-5 text-dark-blue-400">
                                {billingAddressSummary.cityStateZip}
                              </li>
                              <li className="text-base leading-5 text-dark-blue-400">
                                {billingAddressSummary.phoneNumber}
                              </li>
                            </ul>
                          </div>

                          <Button visual="gray" variant="outlined" type="button">
                            Change Address
                          </Button>
                        </div>
                      </div>

                      <div className="mt-[50px] flex items-center justify-end gap-x-2">
                        <Button
                          type="button"
                          variant="outlined"
                          visual="gray"
                          onClick={() => {
                            setIsAddCardInstallmentMethodDialogOpen(false)
                            setIsAddNewInstallmentMethodDialogOpen(true)
                          }}
                        >
                          Cancel
                        </Button>
                        <Button
                          disabled={!isInstallmentCardFormValid}
                          onClick={handleSaveInstallmentCard}
                        >
                          Save Card
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>

                <Dialog
                  open={isAddBankInstallmentMethodDialogOpen}
                  onOpenChange={setIsAddBankInstallmentMethodDialogOpen}
                >
                  <DialogContent className="max-w-[743px] p-0">
                    <div className="flex items-center justify-between border-b border-gray-200 p-3">
                      <div className="flex items-center gap-x-3">
                        <IconButton
                          variant="ghost"
                          visual="gray"
                          size="md"
                          className="text-dark-blue-400"
                          onClick={() => {
                            setIsAddBankInstallmentMethodDialogOpen(false)
                            setIsAddNewInstallmentMethodDialogOpen(true)
                          }}
                        >
                          <ArrowLeft className="size-5" />
                        </IconButton>
                        <h2 className="text-lg font-semibold leading-7 text-dark-blue-400">
                          Add Your Bank Account
                        </h2>
                      </div>
                      <DialogClose asChild>
                        <IconButton
                          className="text-gray-500"
                          variant="ghost"
                          visual="gray"
                          size="md"
                        >
                          <X className="size-5" />
                        </IconButton>
                      </DialogClose>
                    </div>

                    <div className="p-6">
                      <div className="space-y-3">
                        <div className="space-y-1.5">
                          <Label size="sm" htmlFor="installment-account-type">Account Type</Label>
                          <Listbox value={accountType} onChange={setAccountType}>
                            <ListboxButton placeholder="Select" />
                            <ListboxOptions>
                              {["Checking", "Savings"].map((option) => (
                                <ListboxOption key={option} value={option}>
                                  {option}
                                </ListboxOption>
                              ))}
                            </ListboxOptions>
                          </Listbox>
                        </div>

                        <div className="space-y-1.5">
                          <Label size="sm" htmlFor="installment-account-holder-name">Account Holder Name</Label>
                          <Input
                            id="installment-account-holder-name"
                            type="text"
                            placeholder="John Doe"
                            value={accountHolderName}
                            onChange={(event) => setAccountHolderName(event.target.value)}
                          />
                        </div>

                        <div className="space-y-1.5">
                          <Label size="sm" htmlFor="installment-bank-routing-number">Bank Routing Number</Label>
                          <Input
                            id="installment-bank-routing-number"
                            type="text"
                            placeholder="xxxx-xxxx-xx"
                            value={bankRoutingNumber}
                            onChange={(event) => setBankRoutingNumber(event.target.value)}
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-x-3">
                          <div className="space-y-1.5">
                            <Label size="sm" htmlFor="installment-account-number">Account Number</Label>
                            <Input
                              id="installment-account-number"
                              type="text"
                              placeholder="Up to 17 digits"
                              value={accountNumber}
                              onChange={(event) => setAccountNumber(event.target.value)}
                            />
                          </div>

                          <div className="space-y-1.5">
                            <Label size="sm" htmlFor="installment-confirm-account-number">Re-Enter Account Number</Label>
                            <Input
                              id="installment-confirm-account-number"
                              type="text"
                              placeholder="Up to 17 digits"
                              value={confirmAccountNumber}
                              onChange={(event) => setConfirmAccountNumber(event.target.value)}
                            />
                          </div>
                        </div>
                      </div>

                      <div className="mt-[22px] flex items-center gap-x-3">
                        <Checkbox
                          size="md"
                          id="save-installment-bank-default"
                          checked={saveBankAccount}
                          onCheckedChange={(value) => setSaveBankAccount(value === true)}
                        />
                        <Label size="sm" htmlFor="save-installment-bank-default">
                          Save as default payment method
                        </Label>
                      </div>

                      <div className="mt-[50px] flex items-center justify-end gap-x-2">
                        <Button
                          type="button"
                          variant="outlined"
                          visual="gray"
                          onClick={() => {
                            setIsAddBankInstallmentMethodDialogOpen(false)
                            setIsAddNewInstallmentMethodDialogOpen(true)
                          }}
                        >
                          Cancel
                        </Button>
                        <Button
                          disabled={!isInstallmentBankFormValid}
                          onClick={handleSaveInstallmentBank}
                        >
                          Save Account
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </>
            )}
          </div>

          {/* Sidebar */}
          <div className="w-[305px] shrink-0">
            <div className="w-[305px] shrink-0 p-5 rounded-lg bg-white border border-gray-200 shadow-[0px_1px_5px_0px_rgba(16,24,40,.02)]">
              {isTalentCheckout ? (
                <>
                  <div className="pb-4 border-b border-gray-200">
                    <h1 className="text-base font-semibold leading-none text-dark-blue-400">Contract Details</h1>

                    <div className="mt-4 flex items-start gap-x-3">
                      <Avatar className="size-[52px] shrink-0">
                        <AvatarImage src={talentAvatarUrl} alt={talentName} />
                        <AvatarFallback>{talentName.charAt(0)}</AvatarFallback>
                      </Avatar>

                      <div className="flex-auto">
                        <h2 className="text-sm font-semibold leading-[18px] text-dark-blue-400">
                          {talentName}
                        </h2>
                        <p className="mt-0.5 text-sm leading-[18px] text-dark-blue-400">
                          {talentJobTitle}
                        </p>
                        <div className="mt-1 inline-flex items-center gap-x-2">
                          <span className="text-xs font-medium leading-none text-dark-blue-400">
                            {scheduleTitle}
                          </span>
                          <span className="text-xs font-light leading-none text-dark-blue-400">
                            {scheduleDetail}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="mt-5 flex items-end justify-between">
                      <div className="space-y-1">
                        <h3 className="text-[10px] leading-none text-dark-blue-400 font-light">Total Duration</h3>
                        <h1 className="text-xs font-semibold leading-none text-dark-blue-400">Jan 2025 - Aug 2025</h1>
                      </div>
                      <Badge size="sm" visual="primary">8 months</Badge>
                    </div>
                  </div>

                  <div className="mt-5 pb-4 border-b border-gray-200">
                    <h1 className="text-base leading-none font-semibold text-dark-blue-400">Price Details</h1>
                    <div className="mt-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="inline-block text-xs leading-none text-dark-blue-400 font-light">Hourly Rate</span>
                        <span className="inline-block text-xs leading-none text-dark-blue-400 font-light">{formattedHourlyRate}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="inline-block text-xs leading-none text-dark-blue-400 font-light">Estimated tax *</span>
                        <span className="inline-block text-xs leading-none text-dark-blue-400 font-light">{formattedEstimatedTaxHourly}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="inline-block text-xs leading-none text-dark-blue-400 font-light">Total Hourly rate</span>
                        <span className="inline-block text-xs leading-none text-dark-blue-400 font-light">{formattedTotalHourlyRate}</span>
                      </div>
                    </div>

                    <div className="mt-5 flex items-center justify-between">
                      <span className="inline-block text-xs leading-none text-dark-blue-400 font-light">Estimated Total Job Cost</span>
                      <h1 className="inline-block text-base font-bold leading-none text-dark-blue-400">{formattedJobCost}</h1>
                    </div>
                  </div>

                  <div className="mt-5 pb-4 border-b border-gray-200">
                    <h1 className="text-base leading-none font-semibold text-dark-blue-400">Add-ons</h1>
                    <div className="mt-4 flex items-start justify-between gap-x-3">
                      <span className="inline-flex flex-col">
                        <span className="inline-block text-xs leading-none text-dark-blue-400 font-light">Project Manager</span>
                        <Button className="mt-1 h-auto justify-start px-0 text-[10px] leading-[14px] underline" variant="link" visual="gray">
                          Remove
                        </Button>
                      </span>
                      <span className="inline-flex flex-col items-end">
                        <span className="inline-block text-xs leading-none text-dark-blue-400 font-light">Est. $85/hr</span>
                        <span className="inline-block mt-1 text-[10px] leading-[14px] text-dark-blue-400 font-light">4hrs/week</span>
                      </span>
                    </div>

                    <div className="mt-5 flex items-center justify-between">
                      <span className="inline-block text-xs leading-none text-dark-blue-400 font-light">Estimated Add-on total</span>
                      <h1 className="inline-block text-base font-bold leading-none text-dark-blue-400">{formattedAddOnTotal}</h1>
                    </div>
                  </div>

                  <div className="mt-5">
                    <h1 className="text-base leading-none font-semibold text-dark-blue-400">Payment Plan</h1>

                    <div className="mt-4">
                      <Listbox
                        className="mt-4"
                        value={talentPaymentPlan}
                        onChange={(option) => {
                          if (option) {
                            setSelectedTalentPaymentPlanId(option.id)
                          }
                        }}
                      >
                        <ListboxButton
                          className="text-xs text-dark-blue-400"
                          iconClassName="text-gray-500"
                          placeholderClassName="text-xs"
                          placeholder="Select Option"
                        >
                          {({ value }) =>
                            value ? (
                              <span className="flex w-full items-center justify-between gap-x-3">
                                <span>{value.label}</span>
                                <span className="font-bold">{value.value}</span>
                              </span>
                            ) : null
                          }
                        </ListboxButton>
                        <ListboxOptions>
                          {() => (
                            <>
                              {talentPaymentPlanOptions.map((option) => (
                                <ListboxOption
                                  className="hover:text-gray-900"
                                  indicator={false}
                                  key={option.label}
                                  value={option}
                                >
                                  <>
                                    {option.label}
                                    <span className="ml-auto inline-block font-bold">
                                      {option.value}
                                    </span>
                                  </>
                                </ListboxOption>
                              ))}
                            </>
                          )}
                        </ListboxOptions>
                      </Listbox>
                    </div>

                    <div className="mt-5 pt-4 border-t border-gray-200">
                      <div className="flex items-center justify-between">
                        <span className="inline-flex items-center gap-x-1.5 text-base leading-none font-bold text-dark-blue-400">
                          Due today
                          <HelpCircle className="size-[15px]" />
                        </span>
                        <h1 className="inline-block text-base font-bold leading-none text-dark-blue-400">
                          {talentPaymentPlan.value}
                        </h1>
                      </div>

                      <div className="grid mt-5">
                        <Button onClick={handleSubmitOrder} disabled={isProcessing}>
                          {isProcessing ? "Loading..." : "Review your order"}
                        </Button>
                      </div>

                      <div className="mt-5 text-center">
                        <span className="inline-block text-center text-[10px] font-light text-dark-blue-400 leading-[14px]">
                          Learn More about{" "}
                          <Button className="text-[10px] leading-[14px] underline" variant="link">Estimated Taxes</Button>
                        </span>
                      </div>

                      <div className="mt-5">
                        <span className="inline-block text-center text-[10px] font-light text-dark-blue-400 leading-[14px]">
                          By clicking the above, you agree to Marketeq&apos;s{" "}
                          <Button className="text-[10px] leading-[14px] underline" variant="link">Terms of Use</Button>{" "}
                          and{" "}
                          <Button className="text-[10px] leading-[14px] underline" variant="link">Privacy Policy</Button>
                        </span>
                      </div>

                      <div className="mt-5 flex items-center justify-center">
                        <Button variant="link" visual="gray">Add Gift Card / Promo Code</Button>
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <h1 className="text-base font-semibold leading-none text-dark-blue-400">Project Details</h1>

                  <div className="mt-4 space-y-4 pb-4 border-b border-gray-200">
                    <div className="relative h-[92px] rounded-md overflow-hidden">
                      <NextImage className="object-cover" src="/dashboard.png" alt="Dashboard" sizes="50vw" fill />
                    </div>

                    <h3 className="text-sm font-medium text-dark-blue-400 leading-[18px]">
                      Marketeq Client Portal - Redesigning and Optimizing Website for Enhanced User Experience.
                    </h3>

                    <div className="flex items-center gap-x-2">
                      <UserGroup className="size-[15px]" />
                      <span className="inline-block text-xs leading-5 font-semibold text-primary-500">8 team members</span>
                    </div>

                    <div className="flex items-end justify-between">
                      <div className="space-y-1">
                        <h3 className="text-[10px] leading-none text-dark-blue-400 font-light">Total Duration</h3>
                        <h1 className="text-xs font-semibold leading-none text-dark-blue-400">Jan 2025 - Aug 2025</h1>
                      </div>
                      <Badge size="sm" visual="primary">8 months</Badge>
                    </div>
                  </div>

                  <div className="mt-5 pb-4 border-b border-gray-200">
                    <h1 className="text-base leading-none font-semibold text-dark-blue-400">Price Details</h1>
                    <div className="mt-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="inline-block text-xs leading-none text-dark-blue-400 font-light">Project cost</span>
                        <span className="inline-block text-xs leading-none text-dark-blue-400 font-light">$94,000</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="inline-block text-xs leading-none text-dark-blue-400 font-light">Estimated tax *</span>
                        <span className="inline-block text-xs leading-none text-dark-blue-400 font-light">$4,000</span>
                      </div>
                      {useBalance && (
                        <div className="flex items-center justify-between">
                          <span className="inline-block text-xs leading-none text-dark-blue-400 font-light">Balance applied</span>
                          <span className="inline-block text-xs leading-none text-dark-blue-400 font-light">- {formatter.format(customAmount ? Number(customAmount) : availableBalance)}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="mt-4">
                    <div className="flex items-center justify-between">
                      <span className="inline-block text-xs leading-none text-dark-blue-400 font-light">Total amount to be paid</span>
                      <h1 className="inline-block text-base font-bold leading-none text-dark-blue-400">$94,000</h1>
                    </div>

                    <div className="grid mt-5">
                      <Button onClick={handleSubmitOrder} disabled={isProcessing}>
                        {isProcessing ? "Loading..." : "Review your order"}
                      </Button>
                    </div>

                    <div className="mt-5">
                      <span className="inline-block text-center text-[10px] font-light text-dark-blue-400 leading-[14px]">
                        By clicking the above, you agree to Marketeq&apos;s{" "}
                        <Button className="text-[10px] leading-[14px] underline" variant="link">Terms of Use</Button>{" "}
                        and{" "}
                        <Button className="text-[10px] leading-[14px] underline" variant="link">Privacy Policy</Button>
                      </span>
                    </div>

                    <div className="mt-5 flex items-center justify-center">
                      <Button variant="link" visual="gray">Add Gift Card / Promo Code</Button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
  )
}
