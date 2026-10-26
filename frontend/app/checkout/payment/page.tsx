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
import {
  CheckoutAPI,
  type CheckoutPaymentMethodOption,
  type CheckoutPaymentMethods,
} from "@/service/http/checkout"
import { useAuth } from "@/contexts/auth"
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
  type BillingAddressValidation,
  type RecommendedBillingAddress,
} from "@/service/http/billing-addresses"
import { apiFetch } from "@/src/lib/api"
import { cn } from "@/utils/functions"
import {
  AlertCircle,
  ArrowLeft,
  Bank,
  Check,
  CheckCircle,
  ChevronDown,
  CreditCard,
  DivideSquare,
  Download02,
  Edit03,
  HelpCircle,
  Lock,
  MoreHorizontal,
  Plus,
  RefreshCcw,
  SwitchHorizontal01,
  Trash03,
  X,
} from "@blend-metrics/icons"
import {
  DinersClubDefault,
  Jcbdefault,
  MastercardDefault,
  UnionPayDefault,
} from "@blend-metrics/icons/payment-methods"
import { loadStripe } from "@stripe/stripe-js"
import type {
  PaymentRequest,
  PaymentRequestPaymentMethodEvent,
  PaymentRequestWallet,
  Stripe,
  StripeCardCvcElement,
  StripeCardExpiryElement,
  StripeCardNumberElement,
} from "@stripe/stripe-js"
import CurrencyInput from "react-currency-input-field"
import type { UserProfile } from "@/types/user"
import {
  getDraftDateRangeLabel,
  getDraftDurationLabel,
} from "@/lib/checkout/draft-summary"
import { CreditDebitCardArticle3 } from "@/components/ui/credit-debit-card-article/credit-debit-card-article"
import { HelperText } from "@/components/ui/helper-text"
import {
  PhoneNumberInput,
  isPhoneValid,
  phoneUtil,
} from "@/components/phone-number-input"
import { CountriesCombobox } from "@/components/own-combobox"
import { resolveCountryCodeByName } from "@/src/lib/api/resolve-country-code"
import { inputVariants } from "@/components/ui/input"
import {
  InputLeftElement,
  InputRightElement,
} from "@/components/ui/input/input-element"
import { CheckoutNavigation } from "@/components/checkout-navigation"
import UserGroup from "@/components/icons/user-group"
import {
  Amex,
  CreditCardInput,
  Discover,
  Visa,
  getCardType,
} from "@/components/credit-card-input"
import { getDefaultJobTitle, offerRates } from "@/components/hire-me-button"
import {
  ACH,
  ApplePay1,
  GPay1,
  Klarna,
  Amex as PaymentAmex,
  Discover as PaymentDiscover,
  GPay as PaymentGPay,
  Mastercard as PaymentMastercard,
  Visa as PaymentVisa,
  ApplePay as PaymentApplePay,
  Swift as PaymentSwift,
  Wire as PaymentWire,
  WireTransfer,
} from "@/components/icons/payment-icons"
import NextImage from "@/components/next-image"
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
  Card,
  Checkbox,
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  HeadlessRadioGroupItem,
  IconButton,
  Input,
  InputGroup,
  Label,
  Listbox,
  ListboxButton,
  ListboxOption,
  ListboxOptions,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  RadioGroup,
  RadioGroupItem,
  RadioGroupItemSelector,
  RmDialog,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableRow,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
  toast,
} from "@/components/ui"
import { Spinner } from "@/components/ui/spinner/spinner"

const formatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
})

const currencyWithCentsFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

const stripePublishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
const isStripePublishableKeyConfigured = Boolean(
  stripePublishableKey &&
  /^pk_(test|live)_/.test(stripePublishableKey) &&
  !stripePublishableKey.includes("YOUR") &&
  !stripePublishableKey.endsWith("...")
)
const stripeElementStyle = {
  base: {
    color: "#101828",
    fontFamily: "Inter, system-ui, sans-serif",
    fontSize: "16px",
    lineHeight: "24px",
    "::placeholder": {
      color: "#667085",
    },
  },
  invalid: {
    color: "#101828",
  },
}

type StripeCardField = "cardNumber" | "expirationDate" | "cvv"
type StripeCardFieldState = {
  empty: boolean
  complete: boolean
  errorCode?: string
}
type BillingField =
  | "fullName"
  | "addressLine1"
  | "country"
  | "city"
  | "state"
  | "zipcode"
  | "phone"
type BankField =
  | "accountType"
  | "accountHolderName"
  | "bankRoutingNumber"
  | "accountNumber"
  | "confirmAccountNumber"

type CheckoutPaymentIntentResponse = {
  paymentIntentId: string
  clientSecret: string
  checkoutSessionId: string
  billingName?: string
  billingEmail?: string
}

type CheckoutConfirmPaymentIntentResponse = {
  status: string
  verified: boolean
  paymentMethod?: {
    id: string
    type: string
    brand?: string
    last4?: string
    expMonth?: number
    expYear?: number
    bankName?: string
    accountType?: string
    financialConnectionsAccount?: string
  } | null
}

type WireTransferDetails = {
  wireTransferId: string
  referenceCode: string
  amount: number
  status: string
  confirmedAt?: string | null
  reminderAt: string
  expiresAt: string
  processingTimeline: string
  expiryWindowDays: number
  wireInstructions: {
    accountNumber: string
    routingNumber: string
    swiftCode: string
    accountName: string
    bankName: string
    bankAddress: string
    reference: string
  }
}

const parseCurrencyAmount = (value?: string | null) => {
  if (!value) return undefined

  const numericValue = Number(value.replace(/[^0-9.-]/g, ""))
  return Number.isFinite(numericValue) ? numericValue : undefined
}

const US_STATES: [string, string][] = [
  ["AL", "Alabama"],
  ["AK", "Alaska"],
  ["AZ", "Arizona"],
  ["AR", "Arkansas"],
  ["CA", "California"],
  ["CO", "Colorado"],
  ["CT", "Connecticut"],
  ["DE", "Delaware"],
  ["DC", "District of Columbia"],
  ["FL", "Florida"],
  ["GA", "Georgia"],
  ["HI", "Hawaii"],
  ["ID", "Idaho"],
  ["IL", "Illinois"],
  ["IN", "Indiana"],
  ["IA", "Iowa"],
  ["KS", "Kansas"],
  ["KY", "Kentucky"],
  ["LA", "Louisiana"],
  ["ME", "Maine"],
  ["MD", "Maryland"],
  ["MA", "Massachusetts"],
  ["MI", "Michigan"],
  ["MN", "Minnesota"],
  ["MS", "Mississippi"],
  ["MO", "Missouri"],
  ["MT", "Montana"],
  ["NE", "Nebraska"],
  ["NV", "Nevada"],
  ["NH", "New Hampshire"],
  ["NJ", "New Jersey"],
  ["NM", "New Mexico"],
  ["NY", "New York"],
  ["NC", "North Carolina"],
  ["ND", "North Dakota"],
  ["OH", "Ohio"],
  ["OK", "Oklahoma"],
  ["OR", "Oregon"],
  ["PA", "Pennsylvania"],
  ["RI", "Rhode Island"],
  ["SC", "South Carolina"],
  ["SD", "South Dakota"],
  ["TN", "Tennessee"],
  ["TX", "Texas"],
  ["UT", "Utah"],
  ["VT", "Vermont"],
  ["VA", "Virginia"],
  ["WA", "Washington"],
  ["WV", "West Virginia"],
  ["WI", "Wisconsin"],
  ["WY", "Wyoming"],
]

const isValidAbaRoutingNumber = (value: string) => {
  if (!/^\d{9}$/.test(value)) return false
  const digits = value.split("").map(Number)
  const checksum =
    3 * (digits[0] + digits[3] + digits[6]) +
    7 * (digits[1] + digits[4] + digits[7]) +
    (digits[2] + digits[5] + digits[8])

  return checksum > 0 && checksum % 10 === 0
}

const getBankFieldErrors = ({
  accountType,
  accountHolderName,
  bankRoutingNumber,
  accountNumber,
  confirmAccountNumber,
}: {
  accountType: string
  accountHolderName: string
  bankRoutingNumber: string
  accountNumber: string
  confirmAccountNumber: string
}): Record<BankField, string> => ({
  accountType: accountType
    ? ""
    : "Please select an account type — checking or savings.",
  accountHolderName:
    accountHolderName.trim().length >= 2 &&
    /^[A-Za-z ]+$/.test(accountHolderName.trim())
      ? ""
      : "Please enter the full name as it appears on your bank account.",
  bankRoutingNumber: isValidAbaRoutingNumber(bankRoutingNumber)
    ? ""
    : "Please enter a valid 9-digit routing number.",
  accountNumber: /^\d{4,17}$/.test(accountNumber)
    ? ""
    : "Please enter a valid account number between 4 and 17 digits.",
  confirmAccountNumber:
    confirmAccountNumber && accountNumber === confirmAccountNumber
      ? ""
      : "Account numbers do not match. Please check and try again.",
})

const sanitizeBalanceInput = (value: string): string => {
  const isNegative = value.trim().startsWith("-")
  const sanitized = value.replace(/[^0-9.]/g, "")
  const [integerPart] = sanitized.split(".")
  const normalizedIntegerPart = integerPart.replace(/^0+(?=\d)/, "")
  const sign = isNegative ? "-" : ""

  return `${sign}${normalizedIntegerPart}`
}

const normalizeGiftCardCode = (value: string): string =>
  value
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")

const formatGiftCardCode = (value: string): string =>
  normalizeGiftCardCode(value)
    .slice(0, 16)
    .replace(/(.{4})(?=.)/g, "$1-")

const maskGiftCardCode = (code: string): string => `*${code.slice(-4)}`

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

const giftCardAmounts: Record<string, number> = {
  A23SDBTREQWTDQAE: 1000,
  A23SDBTREQWTWEQ2: 2500,
  A23SDBTREQWT12CD: 2000,
}

const safeDecodeSlug = (value: string): string => {
  try {
    return decodeURIComponent(value)
  } catch {
    return value
  }
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
  | "KLARNA"
  | "WIRE_TRANSFER"

type InstallmentPaymentMethod = {
  id: string
  method: InstallmentPaymentMethodType
  title: string
  subtitle: string
  cardNumber?: string
  brand?: string
  funding?: string
  saveDefaultPaymentMethod?: boolean
  accountType?: string
  accountNumber?: string
}

type NewPaymentMethodOptionValue =
  | "credit-card"
  | "bank-account"
  | "google-pay"
  | "apple-pay"

type AppliedGiftCard = {
  code: string
  amount: number
}

type CardField = "cardNumber" | "cardName" | "expirationDate" | "cvv"
type BillingAddressMode = "summary" | "saved" | "new"
type StripeLinkStep = "intro" | "select" | "login" | "account" | "success"

const SPLIT_PAYMENT_MAX_METHODS = 3
const SPLIT_ELIGIBLE_METHOD_TYPES: InstallmentPaymentMethodType[] = [
  "CREDIT_DEBIT_CARD",
  "BANK_ACCOUNT",
  "GOOGLE_PAY",
  "APPLE_PAY",
]

const getPaymentMethodTypeFromSelection = (
  value: string
): InstallmentPaymentMethodType | null => {
  switch (value) {
    case "item-0":
      return "CREDIT_DEBIT_CARD"
    case "item-1":
      return "BANK_ACCOUNT"
    case "item-3":
      return "GOOGLE_PAY"
    case "item-4":
      return "APPLE_PAY"
    default:
      return null
  }
}

const formatEditableCurrencyValue = (amount: number) =>
  amount > 0 ? String(Math.floor(amount)) : ""

const MasterCard01 = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    width={62}
    height={37}
    viewBox="0 0 62 37"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M43.35 36.57c10.217 0 18.5-8.121 18.5-18.138S53.566.295 43.35.295c-4.58 0-8.77 1.63-12 4.333a18.65 18.65 0 0 0-12-4.333C9.131.295.85 8.415.85 18.432S9.132 36.57 19.35 36.57c4.579 0 8.77-1.63 12-4.333a18.65 18.65 0 0 0 12 4.333"
      fill="#98A2B3"
    />
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M31.35 32.236c3.977-3.326 6.5-8.276 6.5-13.804 0-5.527-2.523-10.477-6.5-13.804a18.65 18.65 0 0 1 12-4.333c10.217 0 18.5 8.12 18.5 18.137s-8.283 18.137-18.5 18.137c-4.58 0-8.77-1.63-12-4.333"
      fill="#EAECF0"
    />
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M31.35 32.237c3.977-3.327 6.499-8.276 6.499-13.804 0-5.527-2.522-10.477-6.5-13.804-3.977 3.327-6.5 8.277-6.5 13.804s2.523 10.478 6.5 13.804"
      fill="#D0D5DD"
    />
  </svg>
)

const Visa01 = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    width={62}
    height={37}
    viewBox="0 0 62 37"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <rect
      x={0.85}
      y={0.295}
      width={60.3}
      height={36.275}
      rx={5}
      fill="#fff"
      stroke="#D0D5DD"
      strokeWidth={1.5}
    />
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="m24.7 25.24h-3.62L18.4 13.24c-.13-.49-.41-.92-.8-1.13a11.6 11.6 0 0 0-2.95-.96v-.41h5.82c.8 0 1.4.61 1.5 1.33l1.4 7.67 3.62-9h3.52zm7.43 0h-3.42l2.82-13.33h3.42zm7.23-9.63c.1-.71.7-1.12 1.41-1.12a6.2 6.2 0 0 1 3.32.61l.6-2.86a8.4 8.4 0 0 0-3.12-.61c-3.32 0-5.73 1.84-5.73 4.4 0 1.94 1.71 2.96 2.92 3.57 1.3.61 1.8 1.02 1.7 1.63 0 .92-1 1.33-2.01 1.33a8.4 8.4 0 0 1-3.52-.82l-.6 2.87c1.2.51 2.51.72 3.72.72 3.72.1 6.03-1.74 6.03-4.5 0-3.47-4.72-3.68-4.72-5.22m16.69 9.63l-2.72-13.33h-2.91a1.5 1.5 0 0 0-1.41 1.02l-5.03 12.31h3.52l.7-1.94h4.32l.4 1.94zm-5.13-9.73l1.01 5.01h-2.82z"
      fill="#172B85"
    />
  </svg>
)

const WireTransferIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    width={47}
    height={32}
    viewBox="0 0 47 32"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <g clipPath="url(#wt-a)">
      <rect y={0.5} width={46.5} height={31} rx={4} fill="#006E90" />
      <path
        d="M8.73 21.53v-3.236h-.976v-1.001h3.14v1.001h-.976v3.235zm2.744 0v-4.237h1.241q.729 0 1.017.065.287.064.495.219.235.173.362.442.126.27.126.593 0 .492-.248.8-.25.309-.725.41l1.187 1.707h-1.342l-1-1.658v1.658zm1.113-2.235h.22q.384 0 .561-.127t.178-.4q0-.317-.166-.452-.165-.135-.555-.135h-.238z"
        fill="#fff"
      />
      <path
        d="m14.871 21.529 1.503-4.236h1.488l1.506 4.236h-1.181l-.22-.758h-1.688l-.226.758zm1.664-1.583h1.181l-.443-1.398a3 3 0 0 1-.057-.205l-.092-.364-.076.298q-.036.136-.076.271zm3.25 1.583v-4.236h1.146l1.645 2.178q.048.067.157.268.108.201.24.48a9 9 0 0 1-.053-.47 5 5 0 0 1-.016-.364v-2.092h1.14v4.236h-1.14l-1.646-2.188a2.4 2.4 0 0 1-.16-.267 10 10 0 0 1-.236-.473q.036.265.052.471.015.183.017.365v2.092zm5.387-1.369q.264.292.522.437t.514.145a.6.6 0 0 0 .39-.125.39.39 0 0 0 .154-.315q0-.211-.132-.325-.133-.115-.6-.236-.64-.168-.905-.437-.264-.27-.265-.738 0-.607.418-.991.419-.384 1.085-.384.36 0 .683.094.324.095.612.285l-.372.83a1.6 1.6 0 0 0-.415-.252 1.1 1.1 0 0 0-.421-.086.57.57 0 0 0-.349.1.3.3 0 0 0-.134.256q0 .159.118.255.117.095.454.182l.053.015q.727.19.956.42.154.155.235.374t.08.484q0 .675-.455 1.084-.456.41-1.214.41-.455 0-.83-.15-.373-.151-.718-.472zm3.348 1.369v-4.236h2.67v.928h-1.513v.735h1.426v.91h-1.426v1.663zm3.315 0v-4.236h2.67v.928h-1.512v.735h1.426v.91h-1.426v.714h1.512v.949zm3.456 0v-4.236h1.24q.73 0 1.017.065.288.065.496.218.235.174.361.443.127.27.127.593 0 .492-.249.8-.248.308-.724.41l1.187 1.707h-1.342l-1-1.658v1.658zm1.113-2.234h.22q.384 0 .56-.127.178-.127.178-.4 0-.318-.165-.453-.165-.134-.555-.134h-.238z"
        fill="#fff"
      />
      <path
        d="M7.807 10.36h7.852v1.211H7.807zm0 2.35h7.852v1.212H7.807zm0 2.567h7.852v1.212H7.807z"
        fill="#41E700"
      />
    </g>
    <defs>
      <clipPath id="wt-a">
        <rect y={0.5} width={46.5} height={31} rx={4} fill="#fff" />
      </clipPath>
    </defs>
  </svg>
)

const BankIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    width={17}
    height={16}
    viewBox="0 0 17 16"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <path
      d="M2.5 14.666h12M4.5 12V7.335M7.166 12V7.335M9.834 12V7.335M12.5 12V7.335m-4-6.001 5.333 3.333H3.166z"
      stroke="currentColor"
      strokeWidth={1.25}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
)

const PAYMENT_METHODS = [
  {
    value: "item-0",
    title: "Credit / Debit Card",
    desc: "2.9% + $0.30\nper transaction",
    icons: [
      <PaymentVisa key="visa" />,
      <PaymentMastercard key="mastercard" />,
      <PaymentDiscover key="discover" />,
      <PaymentAmex key="amex" />,
    ],
  },
  {
    value: "item-1",
    title: "Bank Account",
    desc: "0.8%\nper transaction",
    icons: [<ACH key="ach" />],
  },
  {
    value: "item-2",
    title: "Wire Transfer",
    desc: "0.8%\nper transaction",
    icons: [<PaymentWire key="wire" />, <PaymentSwift key="swift" />],
  },
  {
    value: "item-3",
    title: "Google Pay",
    desc: "2.9% + $0.30\nper transaction",
    icons: [<PaymentGPay key="gpay" />],
  },
  {
    value: "item-4",
    title: "Apple Pay",
    desc: "2.9% + $0.30\nper transaction",
    icons: [<PaymentApplePay key="apple-pay" />],
  },
  {
    value: "item-5",
    title: "Pay with Klarna",
    desc: "starting at 5.9% + $0.30\nper transaction",
    icons: [<Klarna key="klarna" />],
  },
]

const PAYMENT_METHOD_SERVER_IDS: Record<string, string> = {
  "item-0": "card",
  "item-1": "ach",
  "item-2": "wire",
  "item-3": "google_pay",
  "item-4": "apple_pay",
  "item-5": "klarna",
}

const FULL_METHOD_TYPE_SERVER_IDS: Record<
  InstallmentPaymentMethodType,
  string
> = {
  CREDIT_DEBIT_CARD: "card",
  BANK_ACCOUNT: "ach",
  WIRE_TRANSFER: "wire",
  GOOGLE_PAY: "google_pay",
  APPLE_PAY: "apple_pay",
  KLARNA: "klarna",
}

const getPaymentSelectionStorageKey = (sessionId: string) =>
  `checkout-payment-selection:${sessionId}`

const ALWAYS_AVAILABLE_PAYMENT_METHOD_VALUES = ["item-0", "item-1", "item-2"]

const formatPaymentMethodFee = (feeLabel: string) =>
  feeLabel.replace(/ per transaction$/, "\nper transaction")

const BANK_OPTIONS = [
  {
    id: "chase",
    name: "JP Morgan Chase",
    shortName: "Chase",
    logo: "CHASE",
    color: "#1F2937",
  },
  {
    id: "boa",
    name: "Bank of America",
    shortName: "Bank of America",
    logo: "BANK OF AMERICA",
    color: "#123C7C",
  },
  {
    id: "wells-fargo",
    name: "Wells Fargo",
    shortName: "Wells Fargo",
    logo: "WELLS FARGO",
    color: "#D71920",
  },
  {
    id: "citibank",
    name: "Citibank",
    shortName: "Citibank",
    logo: "citibank",
    color: "#064F7A",
  },
  {
    id: "usaa",
    name: "USAA",
    shortName: "USAA",
    logo: "USAA",
    color: "#22376B",
  },
  {
    id: "td",
    name: "TD Bank",
    shortName: "TD Bank",
    logo: "TD Bank",
    color: "#00843D",
  },
  {
    id: "regions",
    name: "Regions Bank",
    shortName: "Regions",
    logo: "REGIONS",
    color: "#6BB536",
  },
  {
    id: "capital-one",
    name: "Capital One",
    shortName: "Capital One",
    logo: "Capital One",
    color: "#004B7A",
  },
  {
    id: "pnc",
    name: "PNC",
    shortName: "PNC",
    logo: "PNC",
    color: "#F58220",
  },
  {
    id: "barclays",
    name: "Barclays",
    shortName: "Barclays",
    logo: "BARCLAYS",
    color: "#00AEEF",
  },
  {
    id: "hsbc",
    name: "HSBC",
    shortName: "HSBC",
    logo: "HSBC",
    color: "#DB0011",
  },
  {
    id: "amex",
    name: "American Express",
    shortName: "American Express",
    logo: "AMERICAN EXPRESS",
    color: "#006FCF",
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

const getCardDigits = (value: string) => value.replace(/\D/g, "")

const formatExpiryInput = (value: string) => {
  const digits = value.replace(/\D/g, "").slice(0, 6)

  if (digits.length <= 2) return digits

  return `${digits.slice(0, 2)}/${digits.slice(2)}`
}

const isValidLuhn = (value: string) => {
  const digits = getCardDigits(value)

  if (digits.length < 13) return false

  let sum = 0
  let shouldDouble = false

  for (let i = digits.length - 1; i >= 0; i -= 1) {
    let digit = Number(digits[i])

    if (shouldDouble) {
      digit *= 2
      if (digit > 9) digit -= 9
    }

    sum += digit
    shouldDouble = !shouldDouble
  }

  return sum % 10 === 0
}

const getCardNumberError = (value: string) => {
  const digits = getCardDigits(value)
  const cardType = getCardType(digits)
  const hasValidLength =
    cardType === "amex"
      ? digits.length === 15
      : cardType === "unknown"
        ? digits.length >= 12 && digits.length <= 19
        : digits.length === 16

  if (digits.length === 0) return "Please enter your credit card number"
  if (!hasValidLength || !isValidLuhn(digits)) {
    return "Please enter a valid card number"
  }

  return ""
}

const getCardNameError = (value: string) => {
  const normalized = value.trim().replace(/\s+/g, " ")

  if (normalized.length === 0) return "Please enter the name on your card"
  if (normalized.length < 2 || !/^[A-Za-z ]+$/.test(normalized)) {
    return "Please enter the full name as it appears on your card"
  }

  return ""
}

const getExpiryError = (value: string) => {
  if (value.length === 0) return "Please enter the expiration date"

  const match = value.match(/^(\d{2})\/(\d{2}|\d{4})$/)

  if (!match) return "Please enter a valid expiry date in MM/YY format"

  const month = Number(match[1])
  const rawYear = Number(match[2])
  const year = match[2].length === 2 ? 2000 + rawYear : rawYear

  if (month < 1 || month > 12) {
    return "Please enter a valid expiry date in MM/YY format"
  }

  const expiryDate = new Date(year, month, 0, 23, 59, 59)
  if (expiryDate < new Date()) {
    return "Your card has expired. Please use a different card"
  }

  return ""
}

const getCvvError = (value: string, cardNumber: string) => {
  const digits = value.replace(/\D/g, "")
  const cardType = getCardType(getCardDigits(cardNumber))
  const expectedLength = cardType === "amex" ? 4 : 3

  if (digits.length === 0) return "Please enter the CVV / CVC code"
  if (digits.length !== expectedLength) return "Please enter a valid CVV"

  return ""
}

const STRIPE_CARD_BRAND_ICONS: Record<
  string,
  React.ComponentType<React.SVGProps<SVGSVGElement>>
> = {
  visa: Visa,
  mastercard: MastercardDefault,
  amex: Amex,
  discover: Discover,
  diners: DinersClubDefault,
  jcb: Jcbdefault,
  unionpay: UnionPayDefault,
}

const SAVED_CARD_BRAND_NAMES: Record<string, string> = {
  visa: "Visa",
  mastercard: "Mastercard",
  amex: "American Express",
  discover: "Discover",
  diners: "Diners Club",
  jcb: "JCB",
  unionpay: "UnionPay",
}

type SavedCardSummary = {
  id: string
  brand: string
  funding: string
  last4: string
  isDefault: boolean
}

type SavedCardDetail = SavedCardSummary & {
  expMonth: number
  expYear: number
  billingAddressId: string | null
  cardholderName: string | null
}

const getStripeCardFieldError = (
  field: StripeCardField,
  fieldState: StripeCardFieldState
) => {
  if (field === "cardNumber") {
    if (fieldState.empty) return "Please enter your credit card number"
    if (fieldState.errorCode || !fieldState.complete) {
      return "Please enter a valid card number"
    }
    return ""
  }

  if (field === "expirationDate") {
    if (fieldState.empty) return "Please enter the expiration date"
    if (
      fieldState.errorCode === "invalid_expiry_year_past" ||
      fieldState.errorCode === "invalid_expiry_month_past"
    ) {
      return "Your card has expired. Please use a different card"
    }
    if (fieldState.errorCode || !fieldState.complete) {
      return "Please enter a valid expiry date in MM/YY format"
    }
    return ""
  }

  if (fieldState.empty) return "Please enter the CVV / CVC code"
  if (fieldState.errorCode || !fieldState.complete) {
    return "Please enter a valid CVV"
  }
  return ""
}

const formatPreviewCardNumber = (value: string) => {
  const digits = getCardDigits(value || "5375441145400954").slice(0, 16)
  const paddedDigits = digits.padEnd(16, "0")

  return paddedDigits.replace(/(.{4})(?=.)/g, "$1 ")
}

const ContactlessMark = ({ className }: { className?: string }) => (
  <NextImage
    alt=""
    aria-hidden="true"
    className={cn("object-contain", className)}
    data-testid="credit-card-contactless-icon"
    height={25}
    src="/checkout/card-preview/paypass.svg"
    width={20}
  />
)

const cardChipStrokes = [
  {
    large: false,
    className:
      "left-[18.0995px] top-[61.044px] [mask-position:0.242px_-2.395px]",
  },
  {
    large: false,
    className:
      "left-[18.0995px] top-[68.9605px] [mask-position:0.242px_-10.307px]",
  },
  {
    large: true,
    className:
      "left-[29.598px] top-[68.087px] [mask-position:-11.251px_-9.428px]",
  },
  {
    large: false,
    className:
      "left-[18.0995px] top-[76.874px] [mask-position:0.242px_-18.217px]",
  },
  {
    large: false,
    className:
      "left-[47.2575px] top-[61.044px] [mask-position:-28.932px_-2.395px]",
  },
  {
    large: false,
    className:
      "left-[47.2575px] top-[68.9605px] [mask-position:-28.932px_-10.307px]",
  },
  {
    large: false,
    className:
      "left-[47.2575px] top-[76.874px] [mask-position:-28.932px_-18.217px]",
  },
]

const CardChip = () => (
  <div aria-hidden="true">
    <NextImage
      alt=""
      className="absolute left-[18.333px] top-[58.652px] h-[29.007px] w-[40.667px] max-w-none"
      height={29}
      src="/checkout/card-preview/chip-base.svg"
      width={41}
    />
    {cardChipStrokes.map((stroke) => (
      <div
        key={stroke.className}
        className={cn(
          "absolute [mask-composite:intersect] [mask-image:url(/checkout/card-preview/chip-mask.svg)] [mask-mode:alpha] [mask-repeat:no-repeat] [mask-size:40.667px_29.008px]",
          stroke.large
            ? "h-[11.0295px] w-[18.1653px]"
            : "h-[8.39244px] w-[11.9769px]",
          stroke.className
        )}
      >
        <NextImage
          alt=""
          className="block size-full max-w-none"
          height={stroke.large ? 11 : 8}
          src={
            stroke.large
              ? "/checkout/card-preview/chip-stroke-large.svg"
              : "/checkout/card-preview/chip-stroke-small.svg"
          }
          width={stroke.large ? 18 : 12}
        />
      </div>
    ))}
  </div>
)

const MastercardMark = () => (
  <div
    className="absolute left-[221.666px] top-[123.339px] h-[36.2744px] w-[61.0001px]"
    aria-hidden="true"
  >
    <NextImage
      alt=""
      className="absolute left-0 top-0 block h-[36.2743px] w-[60.9998px] max-w-none"
      height={36}
      src="/checkout/card-preview/mastercard-left.svg"
      width={61}
    />
    <NextImage
      alt=""
      className="absolute left-[30.5px] top-0 block h-[36.2742px] w-[30.5002px] max-w-none"
      height={36}
      src="/checkout/card-preview/mastercard-right.svg"
      width={31}
    />
    <NextImage
      alt=""
      className="absolute left-[24px] top-[4.349px] block h-[27.6083px] w-[12.9994px] max-w-none"
      height={28}
      src="/checkout/card-preview/mastercard-middle.svg"
      width={13}
    />
  </div>
)

const CreditCardPreview = ({
  cardNumber,
  cardName,
  expiry,
  cvv,
  isBack,
  activeField,
}: {
  cardNumber: string
  cardName: string
  expiry: string
  cvv: string
  isBack: boolean
  activeField?: CardField | null
}) => {
  const displayCardNumber = formatPreviewCardNumber(cardNumber)
  const displayCardName =
    cardName.trim().toUpperCase() || "DONALD FLINCH CORTEZ"
  const cardNameFontSize =
    displayCardName.length > 22 ? 9 : displayCardName.length > 18 ? 10 : 11.5
  const displayExpiry = expiry || "06/24"
  const displayCvv = cvv.replace(/\D/g, "").slice(0, 3) || "537"

  return (
    <div
      data-testid={
        isBack ? "credit-card-preview-back" : "credit-card-preview-front"
      }
      className="relative h-[181.95px] w-[305px] overflow-hidden rounded-[11.402px] border-2 border-[#EAECF0] bg-white shadow-[3.801px_4.751px_7.601px_0px_rgba(0,0,0,0.05)]"
    >
      {isBack ? (
        <>
          <div className="absolute left-0 top-[17.1px] h-[29.45px] w-[305px] bg-[#F3F3F3]" />
          <div className="absolute left-[20.43px] top-[60.81px] h-[33.26px] w-[189.08px] bg-[#F6F6F6]" />
          <div className="absolute left-[217.11px] top-[66.99px] flex h-[20.9px] w-[47.03px] items-center justify-center bg-transparent px-[4.75px] font-mono text-[18px] font-bold leading-none tracking-[0.16em] text-[#334155]">
            {displayCvv}
          </div>
          <div className="absolute left-[34.77px] top-[103.17px] flex h-[11.6px] w-[234.71px] rotate-180 items-center justify-center overflow-visible bg-gradient-to-b from-[#475569] to-[#334155] bg-clip-text font-mono text-[15px] leading-[11.6px] tracking-[0.18em] text-transparent opacity-10 shadow-[0px_0.24px_0px_0px_#0F172A] whitespace-nowrap">
            {displayCardNumber}
          </div>
          <ContactlessMark className="absolute left-[264.14px] top-[133.97px] h-[24.82px] w-[19.35px]" />
          {activeField === "cvv" ? (
            <div
              aria-hidden="true"
              className="pointer-events-none absolute left-[214.735px] top-[64.615px] h-[25.65px] w-[51.78px] rounded-[3.563px] border-[2.375px] border-primary-500"
            />
          ) : null}
        </>
      ) : (
        <>
          <NextImage
            alt=""
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 size-full max-w-none rounded-[11.402px] object-cover"
            height={178}
            src="/checkout/card-preview/card-bg.png"
            width={301}
          />
          <NextImage
            alt=""
            aria-hidden="true"
            className="absolute left-[262.333px] top-[18.218px] block h-[25.0308px] w-[20.3333px] max-w-none"
            height={25}
            src="/checkout/card-preview/paypass.svg"
            width={20}
          />
          <p
            className="[text-box-edge:cap_alphabetic] [text-box-trim:trim-both] [word-break:break-word] absolute left-[18px] top-[24px] text-[20px] font-bold leading-[26.677px] tracking-[-0.4px] text-[#667085] whitespace-nowrap"
            style={{ fontFamily: "Sen, Inter, sans-serif" }}
          >
            credit
          </p>
          <NextImage
            alt=""
            aria-hidden="true"
            className="absolute left-[123.388px] top-[22.071px] block h-[18.7731px] w-[0.968254px] max-w-none"
            height={19}
            src="/checkout/card-preview/logotype-divider.svg"
            width={1}
          />
          <p
            className="[text-box-edge:cap_alphabetic] [text-box-trim:trim-both] [word-break:break-word] absolute left-[135px] top-[26px] h-[9px] w-[72px] text-[13.153px] font-medium leading-[17.545px] tracking-[-0.2631px] text-[#667085]"
            style={{ fontFamily: "Sen, Inter, sans-serif" }}
          >
            Credit Bank
          </p>
          <CardChip />
          <div className="absolute left-[28.016px] top-[96.417px] h-[21.106px] w-[244.214px]">
            <NextImage
              alt=""
              aria-hidden="true"
              className="absolute inset-0 block size-full max-w-none"
              height={21}
              src="/checkout/card-preview/card-number.svg"
              width={244}
            />
          </div>
          <div className="absolute left-[143.352px] top-[122.045px] flex h-[18.747px] w-[61.484px] items-start gap-[4.751px] rounded-[2.375px] bg-[rgba(255,255,255,0)] p-[4.751px]">
            <div className="relative h-[9.204px] w-[13.889px] shrink-0">
              <NextImage
                alt=""
                aria-hidden="true"
                className="absolute inset-0 block size-full max-w-none"
                height={9}
                src="/checkout/card-preview/valid-thru-label.svg"
                width={14}
              />
            </div>
            <div className="relative h-[9.246px] w-[33.342px] shrink-0">
              <NextImage
                alt=""
                aria-hidden="true"
                className="absolute inset-[0_0_-2.57%_0] block h-[102.57%] w-full max-w-none"
                height={9}
                src="/checkout/card-preview/valid-thru-date.svg"
                width={33}
              />
            </div>
          </div>
          <div className="absolute left-[14.11px] top-[147.03px] h-[17.603px] w-[185.868px]">
            <NextImage
              alt=""
              aria-hidden="true"
              className="absolute left-[4.751px] top-[4.751px] block h-[8.339px] w-[176.366px] max-w-none"
              height={8}
              src="/checkout/card-preview/cardholder.svg"
              width={176}
            />
          </div>
          <MastercardMark />
          {activeField === "cardNumber" ? (
            <div
              aria-hidden="true"
              className="pointer-events-none absolute left-[25.641px] top-[94.042px] h-[25.856px] w-[248.964px] rounded-[3.563px] border-[2.375px] border-primary-500"
            />
          ) : null}
          {activeField === "expirationDate" ? (
            <div
              aria-hidden="true"
              className="pointer-events-none absolute left-[140.977px] top-[119.67px] h-[23.497px] w-[66.234px] rounded-[3.563px] border-[2.375px] border-primary-500"
            />
          ) : null}
          {activeField === "cardName" ? (
            <div
              aria-hidden="true"
              className="pointer-events-none absolute left-[11.73px] top-[144.655px] h-[22.354px] w-[190.618px] rounded-[3.563px] border-[2.375px] border-primary-500"
            />
          ) : null}
        </>
      )}
    </div>
  )
}

type SavedBillingAddress = {
  id: string
  fullName: string
  line: string
  addressLine1: string
  cityStateZip: string
  phoneNumber: string
  country: string
  raw: BillingAddress
}

const formatSavedBillingPhone = (phoneNumber: string) => {
  try {
    return phoneUtil.formatOutOfCountryCallingNumber(
      phoneUtil.parseAndKeepRawInput(phoneNumber)
    )
  } catch {
    return phoneNumber
  }
}

const toSavedBillingAddress = (
  address: BillingAddress
): SavedBillingAddress => {
  const streetAddress = address.addressLine2
    ? `${address.addressLine1}, ${address.addressLine2}`
    : address.addressLine1
  const cityStateZip = [
    address.city,
    [address.state, address.postalCode].filter(Boolean).join(" "),
  ]
    .filter(Boolean)
    .join(", ")

  return {
    id: address.id,
    fullName: address.fullName,
    line: `${streetAddress}, ${cityStateZip}`,
    addressLine1: streetAddress,
    cityStateZip,
    phoneNumber: formatSavedBillingPhone(address.phoneNumber),
    country: address.country,
    raw: address,
  }
}

export default function PaymentPage() {
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
  const projectDetailsHref = `${basePath}/project-details?${
    isTalentCheckout
      ? listingQuery
      : `listingId=${encodeURIComponent(checkout.listingId ?? "")}`
  }`
  const slugQuery = isTalentCheckout
    ? listingQuery
    : `sessionId=${encodeURIComponent(checkout.sessionId)}`
  const [talentProfile, setTalentProfile] = React.useState<UserProfile | null>(
    null
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

  const selectedRateValue = searchParams.get("rate") || "web-development"
  const selectedSchedule = searchParams.get("schedule") || "full-time"
  const selectedDuration =
    searchParams.get("duration") || (isTalentCheckout ? "Ongoing" : "")
  const isInstallmentServiceAvailable =
    searchParams.get("installments") !== "unavailable"
  const [walletBalance, setWalletBalance] = React.useState<number | null>(null)
  const [hasWalletBalanceFailed, setHasWalletBalanceFailed] =
    React.useState(false)
  const isBalanceServiceAvailable = isTalentCheckout
    ? searchParams.get("balanceService") !== "unavailable"
    : !hasWalletBalanceFailed
  const balanceAmountParam = parseCurrencyAmount(searchParams.get("balance"))
  const availableBalance = isTalentCheckout
    ? balanceAmountParam === undefined
      ? 4000
      : Math.max(balanceAmountParam, 0)
    : Math.max(walletBalance ?? 0, 0)
  const isBalanceLoading =
    !isTalentCheckout && walletBalance === null && !hasWalletBalanceFailed
  const checkoutTypeParam = (
    searchParams.get("checkoutType") ||
    searchParams.get("type") ||
    searchParams.get("kind") ||
    ""
  ).toLowerCase()
  const isOngoingTalentContract =
    isTalentCheckout && selectedDuration === "Ongoing"
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
  // See checkout/[slug]/project-details/page.tsx — a custom rate has no offerRates tile, so
  // it travels as its own param and wins over the tile price here.
  const customRateParam = Number(searchParams.get("customRate"))
  const hourlyRate =
    Number.isFinite(customRateParam) && customRateParam > 0
      ? customRateParam
      : Number(selectedRate?.price.replace(/[^0-9.]/g, "") || 0)
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
  const checkoutSession = checkout.session
  const checkoutProjectTitle =
    checkoutSession?.title || "Project Title Unavailable"
  const checkoutProjectImage = checkoutSession?.mediaUrl || "/dashboard.png"
  const checkoutProjectTeamCount = checkoutSession?.teamMemberCount ?? null
  const checkoutProjectTeamLabel =
    checkoutProjectTeamCount !== null
      ? `${checkoutProjectTeamCount} team member${checkoutProjectTeamCount === 1 ? "" : "s"}`
      : "Team Details Unavailable"
  const checkoutProjectDateRange =
    getDraftDateRangeLabel(checkoutSession?.durationDays ?? null, true) ||
    "Timeline Unavailable"
  const checkoutProjectDuration =
    getDraftDurationLabel(checkoutSession?.durationDays ?? null) || "0 Weeks"
  const scheduleTitle =
    selectedSchedule === "part-time" ? "Part time" : "Full time"
  const scheduleDetail =
    selectedSchedule === "part-time" ? "Up to 30 hrs/week" : "Over 30 hrs/week"
  const formattedHourlyRate = `$${hourlyRate.toFixed(0)}/hr`
  const formattedEstimatedTaxHourly = `$${estimatedTaxHourly.toFixed(2)}/hr`
  const formattedTotalHourlyRate = `$${totalHourlyRate.toFixed(2)}/hr`
  const formattedJobCost = formatter.format(Math.round(jobCost))
  const formattedAddOnTotal = formatter.format(Math.round(addOnTotal))
  const formattedDueToday = formatter.format(Math.round(dueTodayTotal))
  const weeklyPaymentValue = formatter.format(
    Math.round(dueTodayTotal / totalWeeks)
  )
  const biWeeklyPaymentValue = formatter.format(
    Math.round((dueTodayTotal / totalWeeks) * 2)
  )
  const monthlyPaymentValue = formatter.format(Math.round(dueTodayTotal / 8))
  const recurringSectionPaymentOptions = React.useMemo<
    PaymentPlanOption[]
  >(() => {
    const options: PaymentPlanOption[] = [
      {
        id: "weekly",
        label: "Weekly",
        value: formatter.format(Math.round(dueTodayTotal / 24)),
        meta: "24",
      },
      {
        id: "bi-weekly",
        label: "Bi-Weekly",
        value: formatter.format(Math.round(dueTodayTotal / 16)),
        meta: "16",
      },
      {
        id: "monthly",
        label: "Monthly",
        value: formatter.format(Math.round(dueTodayTotal / 8)),
        meta: "8",
      },
    ]

    if (!isOngoingTalentContract) {
      options.push({
        id: "final",
        label: "Pay Remaining Balance",
        value: formatter.format(Math.max(Math.round(dueTodayTotal - 6000), 0)),
      })
    }

    return options
  }, [dueTodayTotal, isOngoingTalentContract])
  const recurringPaymentOptions = React.useMemo<PaymentPlanOption[]>(() => {
    const options: PaymentPlanOption[] = [
      { id: "weekly", label: "Weekly", value: weeklyPaymentValue },
      { id: "bi-weekly", label: "Bi-Weekly", value: biWeeklyPaymentValue },
      { id: "monthly", label: "Monthly", value: monthlyPaymentValue },
    ]

    if (!isOngoingTalentContract) {
      options.push({
        id: "final",
        label: "Pay Full Amount",
        value: formattedDueToday,
      })
    }

    return options
  }, [
    biWeeklyPaymentValue,
    formattedDueToday,
    isOngoingTalentContract,
    monthlyPaymentValue,
    weeklyPaymentValue,
  ])
  const talentPaymentPlanOptions = React.useMemo<PaymentPlanOption[]>(
    () => recurringPaymentOptions,
    [recurringPaymentOptions]
  )
  const defaultTalentPaymentPlanId =
    talentPaymentPlanOptions[Math.min(2, talentPaymentPlanOptions.length - 1)]
      ?.id ?? "monthly"
  const [selectedTalentPaymentPlanId, setSelectedTalentPaymentPlanId] =
    React.useState(
      searchParams.get("paymentPlan") || defaultTalentPaymentPlanId
    )
  const talentPaymentPlan =
    talentPaymentPlanOptions.find(
      (option) => option.id === selectedTalentPaymentPlanId
    ) ||
    talentPaymentPlanOptions[Math.min(2, talentPaymentPlanOptions.length - 1)]
  const paymentFrequency =
    recurringSectionPaymentOptions.find(
      (option) => option.id === selectedTalentPaymentPlanId
    ) || null

  React.useEffect(() => {
    if (
      !talentPaymentPlanOptions.some(
        (option) => option.id === selectedTalentPaymentPlanId
      )
    ) {
      setSelectedTalentPaymentPlanId(defaultTalentPaymentPlanId)
    }
  }, [
    defaultTalentPaymentPlanId,
    selectedTalentPaymentPlanId,
    talentPaymentPlanOptions,
  ])

  const [pay, setPay] = React.useState<"AT_ONCE" | "IN_INSTALLMENTS">(
    isOngoingTalentContract ? "IN_INSTALLMENTS" : "AT_ONCE"
  )
  const [savedInstallmentPaymentMethods, setSavedInstallmentPaymentMethods] =
    React.useState<InstallmentPaymentMethod[]>([])
  const [fullPaymentMethods, setFullPaymentMethods] = React.useState<
    InstallmentPaymentMethod[]
  >([])
  const [hasSplitFullPayment, setHasSplitFullPayment] = React.useState(false)
  const [showFullPaymentMethods, setShowFullPaymentMethods] =
    React.useState(false)
  const [isAutoSplitEnabled, setIsAutoSplitEnabled] = React.useState(true)
  const [splitPaymentAllocations, setSplitPaymentAllocations] = React.useState<
    Record<string, string>
  >({})
  const [splitPaymentError, setSplitPaymentError] = React.useState("")
  const [showSplitAddNewPaymentOptions, setShowSplitAddNewPaymentOptions] =
    React.useState(false)
  const [fullPaymentFlowPreservesSplit, setFullPaymentFlowPreservesSplit] =
    React.useState(false)
  const [activeInstallmentBlock, setActiveInstallmentBlock] =
    React.useState<InstallmentBlock>("first")
  const [paymentMethodFlowTarget, setPaymentMethodFlowTarget] =
    React.useState<PaymentMethodFlowTarget>("first")
  const [firstInstallmentMethods, setFirstInstallmentMethods] = React.useState<
    InstallmentPaymentMethod[]
  >([])
  const [secondInstallmentMethods, setSecondInstallmentMethods] =
    React.useState<InstallmentPaymentMethod[]>([])
  const [
    selectedExistingInstallmentMethodId,
    setSelectedExistingInstallmentMethodId,
  ] = React.useState("")
  const [
    selectedNewInstallmentMethodType,
    setSelectedNewInstallmentMethodType,
  ] = React.useState<NewPaymentMethodOptionValue | "">("")
  const [
    isExistingInstallmentMethodsDialogOpen,
    setIsExistingInstallmentMethodsDialogOpen,
  ] = React.useState(false)
  const [
    isAddNewInstallmentMethodDialogOpen,
    setIsAddNewInstallmentMethodDialogOpen,
  ] = React.useState(false)
  const [
    isAddCardInstallmentMethodDialogOpen,
    setIsAddCardInstallmentMethodDialogOpen,
  ] = React.useState(false)
  const [
    isAddBankInstallmentMethodDialogOpen,
    setIsAddBankInstallmentMethodDialogOpen,
  ] = React.useState(false)
  const [useBalance, setUseBalance] = React.useState(
    isBalanceServiceAvailable && availableBalance > 0
  )
  const [isBalanceCustom, setIsBalanceCustom] = React.useState(false)
  const [customAmount, setCustomAmount] = React.useState("")
  const [customAmountDraft, setCustomAmountDraft] = React.useState("")
  const [showGiftCard, setShowGiftCard] = React.useState(false)
  const [giftCardInput, setGiftCardInput] = React.useState("")
  const [giftCards, setGiftCards] = React.useState<AppliedGiftCard[]>([])
  const [giftCardError, setGiftCardError] = React.useState("")
  const [showAllGiftCards, setShowAllGiftCards] = React.useState(false)
  const [showGiftCardSuccess, setShowGiftCardSuccess] = React.useState(false)
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
  const [paymentMethod, setPaymentMethod] = React.useState("")
  const [isWireTransfer, setIsWireTransfer] = React.useState(false)
  const [wireTransferDetails, setWireTransferDetails] =
    React.useState<WireTransferDetails | null>(null)
  const [wireTransferConfirmed, setWireTransferConfirmed] =
    React.useState(false)
  const [isWireTransferLoading, setIsWireTransferLoading] =
    React.useState(false)
  const [isWireTransferSubmitting, setIsWireTransferSubmitting] =
    React.useState(false)
  const [wireTransferError, setWireTransferError] = React.useState("")
  const [wireTransferType, setWireTransferType] = React.useState<
    "Domestic Transfer" | "International Transfer"
  >("Domestic Transfer")
  const [isProcessing, setIsProcessing] = React.useState(false)

  // Credit card form
  const [cardNumber, setCardNumber] = React.useState("")
  const [cardName, setCardName] = React.useState("")
  const [expirationDate, setExpirationDate] = React.useState("")
  const [cvv, setCvv] = React.useState("")
  const [activeCardField, setActiveCardField] =
    React.useState<CardField | null>(null)
  const [saveCard, setSaveCard] = React.useState(false)
  const [cardFieldTouched, setCardFieldTouched] = React.useState<
    Record<CardField, boolean>
  >({
    cardNumber: false,
    cardName: false,
    expirationDate: false,
    cvv: false,
  })
  const stripeRef = React.useRef<Stripe | null>(null)
  const stripeCardNumberElementRef =
    React.useRef<StripeCardNumberElement | null>(null)
  const stripeCardExpiryElementRef =
    React.useRef<StripeCardExpiryElement | null>(null)
  const stripeCardCvcElementRef = React.useRef<StripeCardCvcElement | null>(
    null
  )
  const stripeCardNumberMountRef = React.useRef<HTMLDivElement | null>(null)
  const stripeCardExpiryMountRef = React.useRef<HTMLDivElement | null>(null)
  const stripeCardCvcMountRef = React.useRef<HTMLDivElement | null>(null)
  const [stripeCardBrand, setStripeCardBrand] = React.useState("unknown")
  const [stripeFocusedField, setStripeFocusedField] =
    React.useState<StripeCardField | null>(null)
  const [stripeCardFieldStates, setStripeCardFieldStates] = React.useState<
    Record<StripeCardField, StripeCardFieldState>
  >({
    cardNumber: { empty: true, complete: false },
    expirationDate: { empty: true, complete: false },
    cvv: { empty: true, complete: false },
  })
  const [isStripeReady, setIsStripeReady] = React.useState(false)
  // Stripe.js is fetched from js.stripe.com at runtime. That request can fail
  // for reasons that have nothing to do with our code — an ad blocker or
  // privacy extension (js.stripe.com is on several common filter lists), a
  // corporate firewall, or a dropped connection. Without this state the
  // rejection was unhandled: the card fields stayed permanently blank with no
  // explanation and the only trace was a console error.
  const [stripeLoadFailed, setStripeLoadFailed] = React.useState(false)
  // Bumping this re-runs the init effect so Retry actually re-attempts the
  // script fetch. Safe because stripe-js nulls its cached promise on error.
  const [stripeLoadAttempt, setStripeLoadAttempt] = React.useState(0)
  const [paymentError, setPaymentError] = React.useState("")
  const [hasAttemptedCardSubmit, setHasAttemptedCardSubmit] =
    React.useState(false)
  const [savedCardNotification, setSavedCardNotification] = React.useState("")
  const [legalDialog, setLegalDialog] = React.useState<
    "terms" | "privacy" | null
  >(null)
  const lastLegalDialogRef = React.useRef<"terms" | "privacy">("terms")
  if (legalDialog) lastLegalDialogRef.current = legalDialog
  const shownLegalDialog = legalDialog ?? lastLegalDialogRef.current

  // Billing address
  const [savedBillingAddresses, setSavedBillingAddresses] = React.useState<
    SavedBillingAddress[]
  >([])
  const hasSavedBillingAddresses = savedBillingAddresses.length > 0
  const [fullName, setFullName] = React.useState("")
  const [addressLine1, setAddressLine1] = React.useState("")
  const [addressLine2, setAddressLine2] = React.useState("")
  const [city, setCity] = React.useState("")
  const [billingState, setBillingState] = React.useState("")
  const [billingCountry, setBillingCountry] = React.useState("United States")
  const isUnitedStatesBilling = billingCountry === "United States"
  const [zipcode, setZipcode] = React.useState("")
  const [phoneNumber, setPhoneNumber] = React.useState("")
  const [billingFieldTouched, setBillingFieldTouched] = React.useState<
    Record<BillingField, boolean>
  >({
    fullName: false,
    addressLine1: false,
    country: false,
    city: false,
    state: false,
    zipcode: false,
    phone: false,
  })
  const [billingAddressMode, setBillingAddressMode] =
    React.useState<BillingAddressMode>(
      hasSavedBillingAddresses ? "summary" : "new"
    )
  const [selectedBillingAddressId, setSelectedBillingAddressId] =
    React.useState(savedBillingAddresses[0]?.id ?? "")
  const [isConfirmAddressDialogOpen, setIsConfirmAddressDialogOpen] =
    React.useState(false)
  const [confirmAddressChoice, setConfirmAddressChoice] = React.useState<
    "recommended" | "provided"
  >("recommended")
  const [recommendedBillingAddress, setRecommendedBillingAddress] =
    React.useState<RecommendedBillingAddress | null>(null)
  const [isValidatingAddress, setIsValidatingAddress] = React.useState(false)
  const [isSavingBillingAddress, setIsSavingBillingAddress] =
    React.useState(false)
  const [isSavingCard, setIsSavingCard] = React.useState(false)
  const [isSavedCardsLoading, setIsSavedCardsLoading] = React.useState(true)
  const [savedCards, setSavedCards] = React.useState<SavedCardSummary[]>([])
  const [duplicateCardError, setDuplicateCardError] = React.useState("")
  const [cardPendingDeletion, setCardPendingDeletion] = React.useState<{
    id: string
    label: string
  } | null>(null)
  const [isDeletingCard, setIsDeletingCard] = React.useState(false)
  const [editingCard, setEditingCard] = React.useState<SavedCardDetail | null>(
    null
  )
  const [isLoadingEditCard, setIsLoadingEditCard] = React.useState(false)
  const [isChangeCardPanelOpen, setIsChangeCardPanelOpen] =
    React.useState(false)

  React.useEffect(() => {
    let isActive = true
    BillingAddressesAPI.list()
      .then((response) => {
        if (!isActive) return
        const addresses = (response.data as BillingAddress[]).map(
          toSavedBillingAddress
        )
        if (addresses.length === 0) return
        setSavedBillingAddresses(addresses)
        setSelectedBillingAddressId(addresses[0].id)
        setBillingAddressMode("saved")
      })
      .catch(() => {})
    return () => {
      isActive = false
    }
  }, [])

  React.useEffect(() => {
    if (!savedCardNotification) return
    toast({ variant: "success", title: savedCardNotification })
  }, [savedCardNotification])

  React.useEffect(() => {
    let isActive = true
    CheckoutAPI.ListSavedCards()
      .then((response) => {
        if (isActive) setSavedCards(response.data as SavedCardSummary[])
      })
      .catch(() => {})
      .finally(() => {
        if (isActive) setIsSavedCardsLoading(false)
      })
    return () => {
      isActive = false
    }
  }, [])

  const hasPreselectedCardRef = React.useRef(false)
  React.useEffect(() => {
    if (hasPreselectedCardRef.current || isSavedCardsLoading) return
    if (checkout.sessionId && !checkout.session) return
    hasPreselectedCardRef.current = true

    const chosenId = checkout.session?.paymentSelection?.id
    const card =
      savedCards.find((saved) => saved.id === chosenId) ??
      savedCards.find((saved) => saved.isDefault)
    if (!card) return
    setFullPaymentMethods((current) =>
      current.length > 0
        ? current
        : [
            {
              id: `full-card-${card.id}`,
              method: "CREDIT_DEBIT_CARD",
              title: "Credit Card",
              subtitle: "Stripe card",
              cardNumber: card.last4,
              brand: card.brand,
              funding: card.funding,
              saveDefaultPaymentMethod: card.isDefault,
            },
          ]
    )
  }, [checkout.session, checkout.sessionId, isSavedCardsLoading, savedCards])

  React.useEffect(() => {
    if (!isChangeCardPanelOpen) return
    let isActive = true
    CheckoutAPI.ListSavedCards()
      .then((response) => {
        if (isActive) setSavedCards(response.data as SavedCardSummary[])
      })
      .catch(() => {})
    return () => {
      isActive = false
    }
  }, [isChangeCardPanelOpen])

  // Bank account
  const [accountType, setAccountType] = React.useState("")
  const [accountHolderName, setAccountHolderName] = React.useState("")
  const [bankRoutingNumber, setBankRoutingNumber] = React.useState("")
  const [accountNumber, setAccountNumber] = React.useState("")
  const [confirmAccountNumber, setConfirmAccountNumber] = React.useState("")
  const [saveBankAccount, setSaveBankAccount] = React.useState(false)
  const [bankFieldTouched, setBankFieldTouched] = React.useState<
    Record<BankField, boolean>
  >({
    accountType: false,
    accountHolderName: false,
    bankRoutingNumber: false,
    accountNumber: false,
    confirmAccountNumber: false,
  })
  const [hasAttemptedBankSubmit, setHasAttemptedBankSubmit] =
    React.useState(false)
  const [isBankAccountFocused, setIsBankAccountFocused] = React.useState(false)
  const [isConfirmBankAccountFocused, setIsConfirmBankAccountFocused] =
    React.useState(false)
  const [isBankSubmitting, setIsBankSubmitting] = React.useState(false)
  const [isBankConnecting, setIsBankConnecting] = React.useState(false)
  const [bankSubmissionError, setBankSubmissionError] = React.useState("")
  const [microDepositMessage, setMicroDepositMessage] = React.useState("")
  const [isSessionExpiredDialogOpen, setIsSessionExpiredDialogOpen] =
    React.useState(false)
  const [
    isCheckoutSessionInactiveDialogOpen,
    setIsCheckoutSessionInactiveDialogOpen,
  ] = React.useState(false)
  const [bankSearch, setBankSearch] = React.useState("")
  const [selectedBankId, setSelectedBankId] = React.useState("chase")
  const [isStripeLinkDialogOpen, setIsStripeLinkDialogOpen] =
    React.useState(false)
  const [stripeLinkStep, setStripeLinkStep] =
    React.useState<StripeLinkStep>("intro")
  const [stripeLinkUsername, setStripeLinkUsername] = React.useState("")
  const [stripeLinkPassword, setStripeLinkPassword] = React.useState("")
  const [stripeLinkError, setStripeLinkError] = React.useState("")
  const [stripeLinkAccountType, setStripeLinkAccountType] = React.useState<
    "Checking" | "Savings"
  >("Checking")
  const [googlePayAvailability, setGooglePayAvailability] = React.useState<
    "unknown" | "available" | "unavailable" | "error"
  >("unknown")
  const [googlePayError, setGooglePayError] = React.useState("")
  const [isGooglePayProcessing, setIsGooglePayProcessing] =
    React.useState(false)
  const [
    hasAcceptedGooglePayAuthorization,
    setHasAcceptedGooglePayAuthorization,
  ] = React.useState(false)
  const [applePayAvailability, setApplePayAvailability] = React.useState<
    "unknown" | "available" | "unavailable" | "error"
  >("unknown")
  const [applePayError, setApplePayError] = React.useState("")
  const [isApplePayProcessing, setIsApplePayProcessing] = React.useState(false)
  const [
    hasAcceptedApplePayAuthorization,
    setHasAcceptedApplePayAuthorization,
  ] = React.useState(false)
  const [klarnaError, setKlarnaError] = React.useState("")
  const [isKlarnaProcessing, setIsKlarnaProcessing] = React.useState(false)

  React.useEffect(() => {
    if (isOngoingTalentContract) {
      setPay("IN_INSTALLMENTS")
    }
  }, [isOngoingTalentContract])

  React.useEffect(() => {
    if (!isInstallmentServiceAvailable && pay === "IN_INSTALLMENTS") {
      setPay("AT_ONCE")
    }
  }, [isInstallmentServiceAvailable, pay])

  React.useEffect(() => {
    if (!isBalanceServiceAvailable || availableBalance <= 0) {
      setUseBalance(false)
      setIsBalanceCustom(false)
      setCustomAmount("")
    }
  }, [availableBalance, isBalanceServiceAvailable])

  const { user: authUser } = useAuth()
  const authUserId = authUser?.id

  React.useEffect(() => {
    if (isTalentCheckout || !authUserId) return

    let isCancelled = false

    CheckoutAPI.GetWalletBalance()
      .then((response) => {
        if (isCancelled) return
        const balance = Number(response.data?.balance)
        if (Number.isFinite(balance)) {
          setWalletBalance(balance)
        } else {
          setHasWalletBalanceFailed(true)
        }
      })
      .catch(() => {
        if (!isCancelled) setHasWalletBalanceFailed(true)
      })

    return () => {
      isCancelled = true
    }
  }, [isTalentCheckout, authUserId])

  React.useEffect(() => {
    if (isTalentCheckout || walletBalance === null || walletBalance <= 0) return

    setUseBalance(true)
  }, [isTalentCheckout, walletBalance])

  const projectCost = isTalentCheckout
    ? 94_000
    : (checkoutSession?.projectCost ?? 0)
  const estimatedProjectTax = isTalentCheckout ? 4_000 : 0
  const sessionGiftCards = checkoutSession?.appliedGiftCards ?? []
  const sessionPromo = checkoutSession?.promo ?? null
  const sessionPromoAmount = sessionPromo?.amount ?? 0
  const sessionGiftCardAmount = sessionGiftCards.reduce(
    (total, giftCard) => total + giftCard.amountUsed,
    0
  )
  const priceFormatter = formatter
  const fullAmount = Math.max(
    projectCost +
      estimatedProjectTax -
      (isTalentCheckout ? 0 : sessionPromoAmount + sessionGiftCardAmount),
    0
  )
  const projectDurationMonths = 8
  const installmentAmount = fullAmount / projectDurationMonths
  const initialInstallmentAmount = installmentAmount
  const recurringInstallmentAmount = installmentAmount
  const [
    formattedFirstRecurringPaymentDate,
    setFormattedFirstRecurringPaymentDate,
  ] = React.useState("")
  const parsedCustomAmount = parseCurrencyAmount(customAmount)
  const amountDueNow =
    pay === "IN_INSTALLMENTS" ? initialInstallmentAmount : fullAmount
  const maxApplicableBalance = Math.min(availableBalance, amountDueNow)
  const customBalanceError =
    customAmount.trim() === "" || parsedCustomAmount === undefined
      ? ""
      : parsedCustomAmount < 1
        ? "Please enter an amount of at least $1"
        : parsedCustomAmount > availableBalance
          ? `Amount cannot exceed your available balance of ${formatter.format(availableBalance)}`
          : parsedCustomAmount > amountDueNow
            ? `Amount cannot exceed your order total of ${formatter.format(amountDueNow)}`
            : ""
  const hasValidCustomBalanceAmount =
    parsedCustomAmount !== undefined &&
    customBalanceError === "" &&
    parsedCustomAmount >= 1
  const parsedCustomAmountDraft = parseCurrencyAmount(customAmountDraft)
  const customBalanceDraftError =
    customAmountDraft.trim() === "" || parsedCustomAmountDraft === undefined
      ? ""
      : parsedCustomAmountDraft < 1
        ? "Please enter an amount of at least $1"
        : parsedCustomAmountDraft > availableBalance
          ? `Amount cannot exceed your available balance of ${formatter.format(availableBalance)}`
          : parsedCustomAmountDraft > amountDueNow
            ? `Amount cannot exceed your order total of ${formatter.format(amountDueNow)}`
            : ""
  const hasValidCustomBalanceDraft =
    parsedCustomAmountDraft !== undefined &&
    customBalanceDraftError === "" &&
    parsedCustomAmountDraft >= 1
  const appliedBalanceAmount =
    isBalanceServiceAvailable && useBalance
      ? customAmount.trim() !== ""
        ? hasValidCustomBalanceAmount
          ? parsedCustomAmount
          : 0
        : maxApplicableBalance
      : 0
  const totalGiftCardAmount = giftCards.reduce(
    (total, giftCard) => total + giftCard.amount,
    0
  )
  const totalAmountToBePaid = Math.max(
    amountDueNow - appliedBalanceAmount - totalGiftCardAmount,
    0
  )
  const [serverPaymentMethods, setServerPaymentMethods] = React.useState<
    CheckoutPaymentMethodOption[] | null
  >(null)
  const [hasPaymentMethodsFailed, setHasPaymentMethodsFailed] =
    React.useState(false)
  const appliedBalanceCents = Math.round(appliedBalanceAmount * 100)

  React.useEffect(() => {
    if (isTalentCheckout || !checkout.sessionId) return

    let isCancelled = false

    CheckoutAPI.GetPaymentMethods(checkout.sessionId, appliedBalanceCents / 100)
      .then((response) => {
        if (isCancelled) return
        const result = response.data as CheckoutPaymentMethods
        if (Array.isArray(result?.methods)) {
          setServerPaymentMethods(result.methods)
          setHasPaymentMethodsFailed(false)
          return
        }
        setHasPaymentMethodsFailed(true)
      })
      .catch((error) => {
        if (isCancelled) return
        const failure = error as {
          response?: { status?: number; data?: { code?: string } }
        }
        if (failure.response?.status === 401) {
          setIsSessionExpiredDialogOpen(true)
        } else if (failure.response?.data?.code === "SESSION_NOT_ACTIVE") {
          setIsCheckoutSessionInactiveDialogOpen(true)
        }
        setHasPaymentMethodsFailed(true)
      })

    return () => {
      isCancelled = true
    }
  }, [
    isTalentCheckout,
    checkout.sessionId,
    checkout.session,
    appliedBalanceCents,
  ])
  const isPaymentMethodsLoading =
    !isTalentCheckout &&
    Boolean(checkout.sessionId) &&
    serverPaymentMethods === null &&
    !hasPaymentMethodsFailed

  const paymentMethodOptions = React.useMemo(() => {
    if (!serverPaymentMethods) {
      return PAYMENT_METHODS.filter(
        (option) =>
          isTalentCheckout ||
          ALWAYS_AVAILABLE_PAYMENT_METHOD_VALUES.includes(option.value)
      )
    }

    const serverOptions = serverPaymentMethods.flatMap((serverMethod) => {
      if (!serverMethod.available) return []
      const method = PAYMENT_METHODS.find(
        (option) => PAYMENT_METHOD_SERVER_IDS[option.value] === serverMethod.id
      )
      return method
        ? [{ ...method, desc: formatPaymentMethodFee(serverMethod.feeLabel) }]
        : []
    })

    return PAYMENT_METHODS.flatMap((method) => {
      const serverOption = serverOptions.find(
        (option) => option.value === method.value
      )
      if (serverOption) return [serverOption]
      return ALWAYS_AVAILABLE_PAYMENT_METHOD_VALUES.includes(method.value)
        ? [method]
        : []
    })
  }, [isTalentCheckout, serverPaymentMethods])
  const [isSelectedMethodUnavailable, setIsSelectedMethodUnavailable] =
    React.useState(false)

  React.useEffect(() => {
    if (!serverPaymentMethods) return

    const isAvailable = (value: string) =>
      paymentMethodOptions.some((option) => option.value === value)
    const hasUnavailableSelection =
      paymentMethod !== "" && !isAvailable(paymentMethod)
    const hasUnavailableKlarna =
      fullPaymentMethods.some((method) => method.method === "KLARNA") &&
      !isAvailable("item-5")

    if (!hasUnavailableSelection && !hasUnavailableKlarna) return

    if (hasUnavailableSelection) setPaymentMethod("")
    if (hasUnavailableKlarna) {
      setFullPaymentMethods((current) =>
        current.filter((method) => method.method !== "KLARNA")
      )
      setHasSplitFullPayment(false)
      setShowFullPaymentMethods(false)
      setSplitPaymentAllocations({})
    }
    setSplitPaymentError("")
    if (totalAmountToBePaid > 0) setIsSelectedMethodUnavailable(true)
  }, [
    fullPaymentMethods,
    paymentMethod,
    paymentMethodOptions,
    serverPaymentMethods,
    totalAmountToBePaid,
  ])

  const hasRestoredSelectionRef = React.useRef(false)

  React.useEffect(() => {
    if (hasRestoredSelectionRef.current || isTalentCheckout) return
    if (!checkout.sessionId || !serverPaymentMethods) return

    hasRestoredSelectionRef.current = true
    const storageKey = getPaymentSelectionStorageKey(checkout.sessionId)

    try {
      const rawSelection = window.sessionStorage.getItem(storageKey)
      if (!rawSelection) return

      const savedSelection = JSON.parse(rawSelection) as { method?: string }
      const savedValue = Object.keys(PAYMENT_METHOD_SERVER_IDS).find(
        (value) => PAYMENT_METHOD_SERVER_IDS[value] === savedSelection.method
      )

      if (
        savedValue &&
        paymentMethodOptions.some((option) => option.value === savedValue)
      ) {
        setPaymentMethod(savedValue)
      }
    } catch {
      window.sessionStorage.removeItem(storageKey)
    }
  }, [
    checkout.sessionId,
    isTalentCheckout,
    paymentMethodOptions,
    serverPaymentMethods,
  ])

  React.useEffect(() => {
    if (fullPaymentMethods.length > 0) setIsSelectedMethodUnavailable(false)
  }, [fullPaymentMethods.length])

  React.useEffect(() => {
    if (!(projectCost > 0) || totalAmountToBePaid > 0) return
    if (paymentMethod === "" && !hasSplitFullPayment) return

    setPaymentMethod("")
    setHasSplitFullPayment(false)
    setShowFullPaymentMethods(false)
    setSplitPaymentAllocations({})
    setSplitPaymentError("")
  }, [hasSplitFullPayment, paymentMethod, projectCost, totalAmountToBePaid])
  const isSplitPaymentActive =
    pay === "AT_ONCE" && hasSplitFullPayment && fullPaymentMethods.length > 1
  const splitPaymentMethods = React.useMemo(
    () =>
      fullPaymentMethods.filter((method) =>
        SPLIT_ELIGIBLE_METHOD_TYPES.includes(method.method)
      ),
    [fullPaymentMethods]
  )
  const availableSplitPaymentOptions = React.useMemo(
    () =>
      paymentMethodOptions.filter((method) => {
        const methodType = getPaymentMethodTypeFromSelection(method.value)
        return Boolean(methodType)
      }),
    [paymentMethodOptions]
  )
  const canAddAnotherSplitPaymentMethod =
    hasSplitFullPayment &&
    splitPaymentMethods.length < SPLIT_PAYMENT_MAX_METHODS
  const autoSplitAmounts = React.useMemo(() => {
    if (splitPaymentMethods.length === 0) return {}

    const totalCents = Math.round(totalAmountToBePaid * 100)
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
  }, [splitPaymentMethods, totalAmountToBePaid])
  const getSplitMethodAmount = React.useCallback(
    (methodId: string) =>
      isAutoSplitEnabled
        ? (autoSplitAmounts[methodId] ?? 0)
        : (parseCurrencyAmount(splitPaymentAllocations[methodId]) ?? 0),
    [autoSplitAmounts, isAutoSplitEnabled, splitPaymentAllocations]
  )
  const splitAllocatedAmount = splitPaymentMethods.reduce(
    (total, method) => total + getSplitMethodAmount(method.id),
    0
  )
  const splitRemainingAmount = totalAmountToBePaid - splitAllocatedAmount
  const hasZeroSplitAllocation =
    isSplitPaymentActive &&
    splitPaymentMethods.some((method) => getSplitMethodAmount(method.id) <= 0)
  const splitPaymentValidationMessage = !isSplitPaymentActive
    ? ""
    : splitPaymentMethods.length > SPLIT_PAYMENT_MAX_METHODS
      ? "You can split payment across up to 3 payment methods."
      : hasZeroSplitAllocation
        ? "Please enter an amount greater than $0.00 for each payment method."
        : splitRemainingAmount > 0.009
          ? `You still have ${formatter.format(splitRemainingAmount)} left to allocate. Please add or adjust your payment methods.`
          : splitRemainingAmount < -0.009
            ? "The total allocated amount exceeds the amount due. Please adjust your payment amounts."
            : ""
  const isSplitPaymentInvalid =
    isSplitPaymentActive && Boolean(splitPaymentValidationMessage)
  const isSplitPaymentIncomplete =
    pay === "AT_ONCE" && hasSplitFullPayment && fullPaymentMethods.length < 2
  const normalizedGiftCardInput = normalizeGiftCardCode(giftCardInput)
  const isGiftCardApplyDisabled = normalizedGiftCardInput.length !== 16
  const isRedeemedGiftCardError = giftCardError.includes(
    "already been redeemed"
  )
  const isBankAccountSelectedWithoutSavedMethod =
    pay === "AT_ONCE" &&
    paymentMethod === "item-1" &&
    fullPaymentMethods.every((method) => method.method !== "BANK_ACCOUNT")
  const isCardPaymentSelected =
    pay === "AT_ONCE" &&
    (paymentMethod === "item-0" ||
      fullPaymentMethods.some(
        (method) => method.method === "CREDIT_DEBIT_CARD"
      ))
  const isWireTransferSelectedWithoutSavedMethod =
    pay === "AT_ONCE" &&
    paymentMethod === "item-2" &&
    !isWireTransfer &&
    fullPaymentMethods.every((method) => method.method !== "WIRE_TRANSFER")
  const isGooglePaySelected = pay === "AT_ONCE" && paymentMethod === "item-3"
  const isApplePaySelected = pay === "AT_ONCE" && paymentMethod === "item-4"
  const isKlarnaSelected = pay === "AT_ONCE" && paymentMethod === "item-5"
  const hasGooglePayPaymentMethod = fullPaymentMethods.some(
    (method) => method.method === "GOOGLE_PAY"
  )
  const hasApplePayPaymentMethod = fullPaymentMethods.some(
    (method) => method.method === "APPLE_PAY"
  )
  const hasKlarnaPaymentMethod = fullPaymentMethods.some(
    (method) => method.method === "KLARNA"
  )
  const isAddingSplitPaymentMethod =
    pay === "AT_ONCE" && hasSplitFullPayment && !showFullPaymentMethods
  const shouldShowFullPaymentCardForm =
    paymentMethod === "item-0" &&
    (pay !== "AT_ONCE" ||
      fullPaymentMethods.length < 1 ||
      isAddingSplitPaymentMethod ||
      editingCard !== null)
  const isGooglePaySelectedWithoutSavedMethod =
    isGooglePaySelected && !hasGooglePayPaymentMethod
  const isApplePaySelectedWithoutSavedMethod =
    isApplePaySelected && !hasApplePayPaymentMethod
  const isKlarnaSelectedWithoutSavedMethod =
    isKlarnaSelected && !hasKlarnaPaymentMethod
  const requiresGooglePayAuthorization = totalAmountToBePaid >= 10_000
  const requiresApplePayAuthorization = totalAmountToBePaid >= 10_000
  const isGooglePayButtonDisabled =
    isGooglePayProcessing ||
    googlePayAvailability === "unavailable" ||
    googlePayAvailability === "error" ||
    (requiresGooglePayAuthorization && !hasAcceptedGooglePayAuthorization)
  const isApplePayButtonDisabled =
    isApplePayProcessing ||
    applePayAvailability === "unavailable" ||
    applePayAvailability === "error" ||
    (requiresApplePayAuthorization && !hasAcceptedApplePayAuthorization)
  const isPaymentMethodMissing =
    !isTalentCheckout &&
    totalAmountToBePaid > 0 &&
    (pay === "AT_ONCE"
      ? paymentMethod === "" && fullPaymentMethods.length === 0
      : firstInstallmentMethods.length === 0 ||
        secondInstallmentMethods.length === 0)
  const isCardFormOpen =
    !isTalentCheckout &&
    pay === "AT_ONCE" &&
    totalAmountToBePaid > 0 &&
    shouldShowFullPaymentCardForm
  const isSubmitOrderDisabled =
    isProcessing ||
    isCardFormOpen ||
    isPaymentMethodMissing ||
    isGooglePayProcessing ||
    isApplePayProcessing ||
    isKlarnaProcessing ||
    isBankAccountSelectedWithoutSavedMethod ||
    isWireTransferSelectedWithoutSavedMethod ||
    isGooglePaySelectedWithoutSavedMethod ||
    isApplePaySelectedWithoutSavedMethod ||
    isKlarnaSelectedWithoutSavedMethod ||
    isSplitPaymentIncomplete ||
    isSplitPaymentInvalid

  React.useEffect(() => {
    setHasAcceptedGooglePayAuthorization(false)
    setHasAcceptedApplePayAuthorization(false)
  }, [totalAmountToBePaid])

  React.useEffect(() => {
    if (!isSplitPaymentActive || !isAutoSplitEnabled) return

    setSplitPaymentAllocations(
      splitPaymentMethods.reduce<Record<string, string>>((next, method) => {
        next[method.id] = formatEditableCurrencyValue(
          autoSplitAmounts[method.id] ?? 0
        )
        return next
      }, {})
    )
  }, [
    autoSplitAmounts,
    isAutoSplitEnabled,
    isSplitPaymentActive,
    splitPaymentMethods,
  ])

  React.useEffect(() => {
    if (!hasSplitFullPayment) {
      setSplitPaymentError("")
      return
    }

    setSplitPaymentAllocations((current) =>
      fullPaymentMethods.reduce<Record<string, string>>((next, method) => {
        if (current[method.id] !== undefined) {
          next[method.id] = current[method.id]
        }
        return next
      }, {})
    )
  }, [fullPaymentMethods, hasSplitFullPayment])

  const createWalletPaymentRequest = React.useCallback(
    (
      stripe: Stripe,
      wallet: Extract<PaymentRequestWallet, "applePay" | "googlePay">
    ): PaymentRequest =>
      stripe.paymentRequest({
        country: "US",
        currency: "usd",
        total: {
          label: "Marketeq project payment",
          amount: Math.round(totalAmountToBePaid * 100),
        },
        displayItems: [
          {
            label: pay === "IN_INSTALLMENTS" ? "Due today" : "Project payment",
            amount: Math.round(amountDueNow * 100),
          },
          ...(appliedBalanceAmount > 0
            ? [
                {
                  label: "Balance applied",
                  amount: -Math.round(appliedBalanceAmount * 100),
                },
              ]
            : []),
          ...(totalGiftCardAmount > 0
            ? [
                {
                  label: "Gift card applied",
                  amount: -Math.round(totalGiftCardAmount * 100),
                },
              ]
            : []),
        ],
        requestPayerName: true,
        requestPayerEmail: true,
        requestShipping: false,
        disableWallets:
          wallet === "googlePay"
            ? ["applePay", "link", "browserCard"]
            : ["googlePay", "link", "browserCard"],
      }),
    [
      amountDueNow,
      appliedBalanceAmount,
      pay,
      totalAmountToBePaid,
      totalGiftCardAmount,
    ]
  )

  React.useEffect(() => {
    if (!isGooglePaySelected) {
      setGooglePayError("")
      return
    }

    if (!isStripePublishableKeyConfigured) {
      setGooglePayAvailability("error")
      setGooglePayError(
        "Stripe is not configured for this environment. Add NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY to enable real Google Pay payments."
      )
      return
    }

    const stripe = stripeRef.current
    if (!stripe) {
      setGooglePayAvailability("unknown")
      return
    }

    let isActive = true
    const paymentRequest = createWalletPaymentRequest(stripe, "googlePay")

    setGooglePayAvailability("unknown")
    paymentRequest
      .canMakePayment()
      .then((result) => {
        if (!isActive) return
        if (result?.googlePay) {
          setGooglePayAvailability("available")
          setGooglePayError("")
          return
        }

        setGooglePayAvailability("unavailable")
        setGooglePayError(
          "Google Pay is not available on your device. Please select a different payment method."
        )
      })
      .catch(() => {
        if (!isActive) return
        setGooglePayAvailability("error")
        setGooglePayError(
          "We were unable to load Google Pay. Please try again or select a different payment method."
        )
      })

    return () => {
      isActive = false
    }
  }, [
    createWalletPaymentRequest,
    isGooglePaySelected,
    isStripePublishableKeyConfigured,
    isStripeReady,
  ])

  React.useEffect(() => {
    if (!isApplePaySelected) {
      setApplePayError("")
      return
    }

    if (!isStripePublishableKeyConfigured) {
      setApplePayAvailability("error")
      setApplePayError(
        "Stripe is not configured for this environment. Add NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY to enable real Apple Pay payments."
      )
      return
    }

    const stripe = stripeRef.current
    if (!stripe) {
      setApplePayAvailability("unknown")
      return
    }

    let isActive = true
    const paymentRequest = createWalletPaymentRequest(stripe, "applePay")

    setApplePayAvailability("unknown")
    paymentRequest
      .canMakePayment()
      .then((result) => {
        if (!isActive) return
        if (result?.applePay) {
          setApplePayAvailability("available")
          setApplePayError("")
          return
        }

        setApplePayAvailability("unavailable")
        setApplePayError(
          "Apple Pay is not available on your device. Please select a different payment method."
        )
      })
      .catch(() => {
        if (!isActive) return
        setApplePayAvailability("error")
        setApplePayError(
          "We were unable to load Apple Pay. Please try again or select a different payment method."
        )
      })

    return () => {
      isActive = false
    }
  }, [
    createWalletPaymentRequest,
    isApplePaySelected,
    isStripePublishableKeyConfigured,
    isStripeReady,
  ])

  React.useEffect(() => {
    const nextMonth = new Date()
    nextMonth.setMonth(nextMonth.getMonth() + 1, 1)
    setFormattedFirstRecurringPaymentDate(
      nextMonth.toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      })
    )
  }, [])

  const navigateToReview = () => {
    if (checkout.sessionId) {
      const selectedMethodId = paymentMethod
        ? (PAYMENT_METHOD_SERVER_IDS[paymentMethod] ?? null)
        : fullPaymentMethods[0]
          ? FULL_METHOD_TYPE_SERVER_IDS[fullPaymentMethods[0].method]
          : null
      window.sessionStorage.setItem(
        getPaymentSelectionStorageKey(checkout.sessionId),
        JSON.stringify({
          method: selectedMethodId,
          amountDue: totalAmountToBePaid,
        })
      )
    }

    const nextSearchParams = new URLSearchParams(searchParams.toString())
    const nextUrl = nextSearchParams.toString()
      ? `${basePath}/review?${nextSearchParams.toString()}`
      : `${basePath}/review?${slugQuery}`
    router.push(nextUrl)
  }

  const getCheckoutProjectId = () =>
    searchParams.get("projectId") || checkout.listingId || decodedSlug

  const formatWireDate = (value?: string | null) =>
    value
      ? new Date(value).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        })
      : "Pending"

  const getWireTransferDownloadText = (details: WireTransferDetails) => {
    const instructions = details.wireInstructions

    return [
      "Marketeq Wire Transfer Instructions",
      `Amount due: ${formatter.format(details.amount)}`,
      `Account name: ${instructions.accountName}`,
      `Bank name: ${instructions.bankName}`,
      `Bank address: ${instructions.bankAddress}`,
      `Account number: ${instructions.accountNumber}`,
      `Routing number: ${instructions.routingNumber}`,
      `SWIFT code: ${instructions.swiftCode}`,
      `Reference number: ${details.referenceCode}`,
      `Processing timeline: ${details.processingTimeline}`,
      `Expires: ${formatWireDate(details.expiresAt)}`,
    ].join("\n")
  }

  const downloadWireTransferFile = (
    filename: string,
    details: WireTransferDetails
  ) => {
    const blob = new Blob([getWireTransferDownloadText(details)], {
      type: "text/plain;charset=utf-8",
    })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement("a")
    anchor.href = url
    anchor.download = filename
    anchor.click()
    URL.revokeObjectURL(url)
  }

  const loadWireTransferDetails = async () => {
    if (isWireTransferLoading) return wireTransferDetails

    setIsWireTransferLoading(true)
    setWireTransferError("")

    try {
      const timeout = new Promise<never>((_, reject) => {
        window.setTimeout(
          () =>
            reject(
              new Error(
                "Connection timed out. Please check your internet connection and try again."
              )
            ),
          10_000
        )
      })

      const details = await Promise.race([
        apiFetch<WireTransferDetails>("/checkout/v1/checkout/wire-transfer", {
          method: "POST",
          body: {
            projectId: getCheckoutProjectId(),
            contractId: searchParams.get("contractId") || undefined,
            amount: totalAmountToBePaid,
          },
        }),
        timeout,
      ])

      setWireTransferDetails(details)
      setWireTransferConfirmed(Boolean(details.confirmedAt))
      return details
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "We were unable to load your wire transfer details. Please try again or contact support."

      if (message.includes("API error 401")) {
        setIsSessionExpiredDialogOpen(true)
        return
      }

      setWireTransferError(message)
      return null
    } finally {
      setIsWireTransferLoading(false)
    }
  }

  React.useEffect(() => {
    if (
      paymentMethod === "item-2" &&
      !isWireTransfer &&
      (!wireTransferDetails ||
        wireTransferDetails.amount !== totalAmountToBePaid) &&
      !isWireTransferLoading
    ) {
      void loadWireTransferDetails()
    }
  }, [
    isWireTransfer,
    isWireTransferLoading,
    paymentMethod,
    totalAmountToBePaid,
    wireTransferDetails,
  ])

  const handleSubmitOrder = async () => {
    setPaymentError("")

    const selectedCardMethod = fullPaymentMethods.find(
      (method) => method.method === "CREDIT_DEBIT_CARD"
    )
    const mustRecordCard =
      isCardPaymentSelected &&
      !isTalentCheckout &&
      Boolean(checkout.sessionId) &&
      totalAmountToBePaid > 0

    if (!mustRecordCard) {
      navigateToReview()
      return
    }

    const savedCardId = selectedCardMethod?.id.startsWith("full-card-")
      ? selectedCardMethod.id.slice("full-card-".length)
      : null
    if (!savedCardId) return

    setIsProcessing(true)
    try {
      const response = await CheckoutAPI.SetSessionPaymentSelection(
        checkout.sessionId,
        { method: "card", id: savedCardId }
      )
      if (checkout.session) {
        checkout.updateSession({
          ...checkout.session,
          paymentSelection: response.data,
        })
      }
    } catch (error) {
      setIsProcessing(false)
      const failure = error as {
        code?: string
        response?: { status?: number; data?: { code?: string } }
      }
      if (failure.response?.status === 401) {
        setIsSessionExpiredDialogOpen(true)
      } else if (
        failure.response?.data?.code === "SESSION_NOT_ACTIVE" ||
        failure.response?.data?.code === "SESSION_ALREADY_PAID"
      ) {
        setIsCheckoutSessionInactiveDialogOpen(true)
      } else if (
        !failure.response ||
        failure.code === "ECONNABORTED" ||
        failure.code === "ETIMEDOUT"
      ) {
        toast({
          variant: "destructive",
          title:
            "Connection timed out. Please check your internet connection and try again.",
        })
      } else {
        toast({
          variant: "destructive",
          title:
            "We were unable to process your card at this time. Please try again or contact support.",
        })
      }
      return
    }
    navigateToReview()
  }

  const handleWalletCheckout = (
    wallet: Extract<PaymentRequestWallet, "applePay" | "googlePay">
  ) => {
    const isApplePay = wallet === "applePay"
    const walletLabel = isApplePay ? "Apple Pay" : "Google Pay"
    const setWalletAvailability = isApplePay
      ? setApplePayAvailability
      : setGooglePayAvailability
    const setWalletError = isApplePay ? setApplePayError : setGooglePayError
    const setWalletProcessing = isApplePay
      ? setIsApplePayProcessing
      : setIsGooglePayProcessing
    const hasAcceptedAuthorization = isApplePay
      ? hasAcceptedApplePayAuthorization
      : hasAcceptedGooglePayAuthorization

    setWalletError("")

    if (!isStripePublishableKeyConfigured) {
      setWalletAvailability("error")
      setWalletError(
        `Stripe is not configured for this environment. Add NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY to enable real ${walletLabel} payments.`
      )
      return
    }

    if (totalAmountToBePaid >= 10_000 && !hasAcceptedAuthorization) {
      setWalletError(
        "Please authorize Marketeq to charge your selected payment method for the amount shown above."
      )
      return
    }

    const stripe = stripeRef.current

    if (!stripe) {
      setWalletError(
        `We were unable to load ${walletLabel}. Please try again or select a different payment method.`
      )
      return
    }

    const paymentRequest = createWalletPaymentRequest(stripe, wallet)
    let didReceivePaymentMethod = false

    paymentRequest.once("cancel", () => {
      if (!didReceivePaymentMethod) {
        setWalletProcessing(false)
      }
    })

    paymentRequest.once(
      "paymentmethod",
      async (event: PaymentRequestPaymentMethodEvent) => {
        didReceivePaymentMethod = true
        setWalletProcessing(true)
        let hasCompletedPaymentRequest = false

        try {
          const timeout = new Promise<never>((_, reject) => {
            window.setTimeout(
              () =>
                reject(
                  new Error(
                    "Connection timed out. Please check your internet connection and try again."
                  )
                ),
              10_000
            )
          })

          const intent = await Promise.race([
            apiFetch<CheckoutPaymentIntentResponse>(
              "/checkout/v1/checkout/payment-intent",
              {
                method: "POST",
                body: {
                  amount: totalAmountToBePaid,
                  currency: "usd",
                  paymentMethod: "card",
                  projectId:
                searchParams.get("projectId") ||
                checkout.listingId ||
                decodedSlug,
                  contractId: searchParams.get("contractId") || undefined,
                  savePaymentMethod: false,
                  metadata: {
                    checkoutSlug: decodedSlug,
                    checkoutType: isTalentCheckout ? "talent" : "project",
                    pay,
                    wallet: isApplePay ? "apple_pay" : "google_pay",
                  },
                },
              }
            ),
            timeout,
          ])

          const { error, paymentIntent } = await stripe.confirmCardPayment(
            intent.clientSecret,
            {
              payment_method: event.paymentMethod.id,
            },
            { handleActions: false }
          )

          if (error || !paymentIntent) {
            hasCompletedPaymentRequest = true
            event.complete("fail")
            setWalletError(
              error?.message ||
                `${walletLabel} authorization was unsuccessful. Please try again or use a different payment method.`
            )
            return
          }

          hasCompletedPaymentRequest = true
          event.complete("success")

          let confirmedPaymentIntent = paymentIntent

          if (paymentIntent.status === "requires_action") {
            const actionResult = await stripe.confirmCardPayment(
              intent.clientSecret
            )

            if (actionResult.error || !actionResult.paymentIntent) {
              setWalletError(
                actionResult.error?.message ||
                  `${walletLabel} authorization was unsuccessful. Please try again or use a different payment method.`
              )
              return
            }

            confirmedPaymentIntent = actionResult.paymentIntent
          }

          const confirmation =
            await apiFetch<CheckoutConfirmPaymentIntentResponse>(
              "/checkout/v1/checkout/payment-intent/confirm",
              {
                method: "POST",
                body: {
                  paymentIntentId: confirmedPaymentIntent.id,
                },
              }
            )

          if (!confirmation.verified) {
            setWalletError(
              `${walletLabel} authorization was unsuccessful. Please try again or use a different payment method.`
            )
            return
          }

          const walletPaymentMethod =
            event.paymentMethod as typeof event.paymentMethod & {
              card?: {
                brand?: string
                last4?: string
              }
            }
          const last4 =
            confirmation.paymentMethod?.last4 || walletPaymentMethod.card?.last4
          const brand =
            confirmation.paymentMethod?.brand || walletPaymentMethod.card?.brand
          const method: InstallmentPaymentMethod = {
            id: confirmation.paymentMethod?.id || event.paymentMethod.id,
            method: isApplePay ? "APPLE_PAY" : "GOOGLE_PAY",
            title: walletLabel,
            subtitle: last4
              ? `${brand ? `${brand.toUpperCase()} ` : ""}****${last4}`
              : "Wallet payment authorized",
            cardNumber: last4,
          }

          saveFullPaymentMethod(method)
          setSavedCardNotification(
            `${walletLabel} is authorized and applied to this order`
          )
          window.setTimeout(() => setSavedCardNotification(""), 5000)
          navigateToReview()
        } catch (error) {
          if (!hasCompletedPaymentRequest) {
            event.complete("fail")
          }
          const message =
            error instanceof Error
              ? error.message
              : `${walletLabel} authorization was unsuccessful. Please try again or use a different payment method.`

          if (message.includes("API error 401")) {
            setIsSessionExpiredDialogOpen(true)
            return
          }

          setWalletError(message)
        } finally {
          setWalletProcessing(false)
        }
      }
    )

    setWalletProcessing(true)

    try {
      paymentRequest.show()
    } catch {
      setWalletProcessing(false)
      setWalletError(
        `We were unable to launch ${walletLabel}. Please try again or select a different payment method.`
      )
    }
  }

  const handleGooglePayCheckout = () => handleWalletCheckout("googlePay")
  const handleApplePayCheckout = () => handleWalletCheckout("applePay")

  const handleKlarnaCheckout = async () => {
    setKlarnaError("")

    if (!isStripePublishableKeyConfigured) {
      setKlarnaError(
        "Stripe is not configured for this environment. Add NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY to enable real Klarna payments."
      )
      return
    }

    const stripe = stripeRef.current
    if (!stripe) {
      setKlarnaError(
        "We were unable to load Klarna. Please try again or select a different payment method."
      )
      return
    }

    setIsKlarnaProcessing(true)

    try {
      const timeout = new Promise<never>((_, reject) => {
        window.setTimeout(
          () =>
            reject(
              new Error(
                "Connection timed out. Please check your internet connection and try again."
              )
            ),
          10_000
        )
      })

      const intent = await Promise.race([
        apiFetch<CheckoutPaymentIntentResponse>(
          "/checkout/v1/checkout/payment-intent",
          {
            method: "POST",
            body: {
              amount: totalAmountToBePaid,
              currency: "usd",
              paymentMethod: "klarna",
              projectId:
                searchParams.get("projectId") ||
                checkout.listingId ||
                decodedSlug,
              contractId: searchParams.get("contractId") || undefined,
              savePaymentMethod: false,
              metadata: {
                checkoutSlug: decodedSlug,
                checkoutType: isTalentCheckout ? "talent" : "project",
                pay,
                splitPaymentEnabled: "false",
              },
            },
          }
        ),
        timeout,
      ])

      const nextSearchParams = new URLSearchParams(searchParams.toString())
      nextSearchParams.set("paymentMethod", "klarna")
      nextSearchParams.set("paymentIntentId", intent.paymentIntentId)
      const returnUrl = `${window.location.origin}${basePath}/review?${nextSearchParams.toString()}`

      const result = await stripe.confirmKlarnaPayment(intent.clientSecret, {
        payment_method: {
          billing_details: {
            name: billingAddressSummary.fullName,
            email: intent.billingEmail,
            phone: billingAddressSummary.phoneNumber,
            address: {
              country: "US",
              line1: billingAddressSummary.addressLine1,
            },
          },
        },
        return_url: returnUrl,
      })

      if (result.error) {
        setKlarnaError(
          result.error.message ||
            "Klarna authorization was unsuccessful. Please try again or use a different payment method."
        )
        return
      }

      const method: InstallmentPaymentMethod = {
        id: intent.paymentIntentId,
        method: "KLARNA",
        title: "Klarna",
        subtitle: `4 interest-free payments of ${formatter.format(totalAmountToBePaid / 4)}`,
      }
      saveFullPaymentMethod(method)
      navigateToReview()
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Klarna authorization was unsuccessful. Please try again or use a different payment method."

      if (message.includes("API error 401")) {
        setIsSessionExpiredDialogOpen(true)
        return
      }

      setKlarnaError(message)
    } finally {
      setIsKlarnaProcessing(false)
    }
  }

  const appliedRedeemPromo =
    sessionPromo && sessionPromo.status === "valid" ? sessionPromo : null

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
      } else if (failure.response?.status === 401) {
        setIsSessionExpiredDialogOpen(true)
        setRedeemGiftCardStatus("idle")
      } else if (lockCode === "SESSION_NOT_ACTIVE") {
        setIsCheckoutSessionInactiveDialogOpen(true)
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
        } catch {
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

  const formatRedeemRemovalAmount = (amount: number) =>
    formatter.format(amount)

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
    } catch {
      toast({
        variant: "destructive",
        title: "The promo code could not be removed. Please try again.",
      })
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

  const redeemGiftCardPanel = (
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
                        redeemGiftCardStatus === "invalid" ? "error" : "primary"
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
                    Too many invalid gift card attempts. Please try again in 1
                    hour.
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
                        Gift Card &ldquo;{lastAppliedRedeemGiftCard}&rdquo; has
                        been applied.
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
                        Gift Card &ldquo;{duplicateRedeemGiftCard}&rdquo; has
                        already been redeemed.
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
                          {formatter.format(
                            sessionGiftCardAmount
                          )}
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
                                  {formatter.format(
                                    giftCard.amountUsed
                                  )}
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
  )

  const handleGiftCardSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const normalizedGiftCardCode = normalizeGiftCardCode(giftCardInput)

    if (isGiftCardApplyDisabled) return

    setShowGiftCardSuccess(false)

    if (
      giftCards.some((giftCard) => giftCard.code === normalizedGiftCardCode)
    ) {
      setGiftCardError(
        `Gift Card "${formatGiftCardCode(normalizedGiftCardCode)}" has already been redeemed.`
      )
      setGiftCardInput("")
      return
    }

    const giftCardAmount = giftCardAmounts[normalizedGiftCardCode]

    if (!giftCardAmount) {
      setGiftCardError(
        "You have enter an invalid gift card code. Please check the code and try again."
      )
      return
    }

    setGiftCards((prev) => [
      ...prev,
      { code: normalizedGiftCardCode, amount: giftCardAmount },
    ])
    setGiftCardInput("")
    setGiftCardError("")
    setShowGiftCardSuccess(true)
    setTimeout(() => setShowGiftCardSuccess(false), 5000)
  }

  const removeGiftCard = (code: string) => {
    setGiftCards((currentGiftCards) =>
      currentGiftCards.filter((giftCard) => giftCard.code !== code)
    )
    setShowGiftCardSuccess(false)
  }

  const removeAllGiftCards = () => {
    setGiftCards([])
    setShowAllGiftCards(false)
    setShowGiftCardSuccess(false)
  }

  React.useEffect(() => {
    if (!isStripePublishableKeyConfigured || !stripePublishableKey) {
      return
    }

    let isActive = true
    const isEditingCard = editingCard !== null

    setStripeLoadFailed(false)

    const initializeStripeElements = async () => {
      const stripe = await loadStripe(stripePublishableKey)
      if (!stripe || !isActive) return
      stripeRef.current = stripe
      setIsStripeReady(true)

      if (
        !stripeCardCvcMountRef.current ||
        (!isEditingCard &&
          (!stripeCardNumberMountRef.current ||
            !stripeCardExpiryMountRef.current)) ||
        stripeCardCvcElementRef.current
      ) {
        return
      }

      const elements = stripe.elements()
      const cardNumberElement = isEditingCard
        ? null
        : elements.create("cardNumber", {
            style: stripeElementStyle,
            placeholder: "0000 0000 0000 0000",
            disableLink: true,
          })
      const cardExpiryElement = isEditingCard
        ? null
        : elements.create("cardExpiry", {
            style: stripeElementStyle,
            placeholder: "MM/YY",
          })
      const cardCvcElement = elements.create("cardCvc", {
        style: stripeElementStyle,
        placeholder: "3 or 4 digits",
      })

      if (cardNumberElement && stripeCardNumberMountRef.current) {
        cardNumberElement.mount(stripeCardNumberMountRef.current)
      }
      if (cardExpiryElement && stripeCardExpiryMountRef.current) {
        cardExpiryElement.mount(stripeCardExpiryMountRef.current)
      }
      cardCvcElement.mount(stripeCardCvcMountRef.current)

      stripeCardNumberElementRef.current = cardNumberElement
      stripeCardExpiryElementRef.current = cardExpiryElement
      stripeCardCvcElementRef.current = cardCvcElement
      if (!isEditingCard) setStripeCardBrand("unknown")
      setStripeCardFieldStates({
        cardNumber: { empty: true, complete: false },
        expirationDate: { empty: true, complete: false },
        cvv: { empty: true, complete: false },
      })

      const handleChange =
        (field: StripeCardField) =>
        (event: {
          empty: boolean
          complete: boolean
          error?: { code?: string }
        }) => {
          setPaymentError("")
          setStripeCardFieldStates((current) => ({
            ...current,
            [field]: {
              empty: event.empty,
              complete: event.complete,
              errorCode: event.error?.code,
            },
          }))
        }
      const handleFocus = (field: StripeCardField) => () => {
        setActiveCardField(field)
        setStripeFocusedField(field)
      }
      const handleBlur = (field: StripeCardField) => () => {
        setStripeFocusedField((current) => (current === field ? null : current))
        setCardFieldTouched((current) => ({ ...current, [field]: true }))
      }

      cardNumberElement?.on("change", (event) => {
        handleChange("cardNumber")(event)
        setDuplicateCardError("")
        setStripeCardBrand(event.brand)
      })
      cardExpiryElement?.on("change", handleChange("expirationDate"))
      cardCvcElement.on("change", handleChange("cvv"))
      cardNumberElement?.on("focus", handleFocus("cardNumber"))
      cardExpiryElement?.on("focus", handleFocus("expirationDate"))
      cardCvcElement.on("focus", handleFocus("cvv"))
      cardNumberElement?.on("blur", handleBlur("cardNumber"))
      cardExpiryElement?.on("blur", handleBlur("expirationDate"))
      cardCvcElement.on("blur", handleBlur("cvv"))
    }

    // loadStripe rejects with "Failed to load Stripe.js" when the
    // js.stripe.com script tag fires its error event. Surface it instead of
    // leaving an unhandled rejection and a silently dead payment form.
    initializeStripeElements().catch((error) => {
      if (!isActive) return
      console.error("Stripe.js failed to load", error)
      setStripeLoadFailed(true)
      setIsStripeReady(false)
    })

    return () => {
      isActive = false
      stripeCardNumberElementRef.current?.destroy()
      stripeCardExpiryElementRef.current?.destroy()
      stripeCardCvcElementRef.current?.destroy()
      stripeCardNumberElementRef.current = null
      stripeCardExpiryElementRef.current = null
      stripeCardCvcElementRef.current = null
      setIsStripeReady(false)
      if (!isStripePublishableKeyConfigured) {
        stripeRef.current = null
      }
    }
  }, [paymentMethod, stripeLoadAttempt, editingCard?.id])

  const handleCustomBalanceSubmit = (event: React.FormEvent) => {
    event.preventDefault()

    if (!hasValidCustomBalanceDraft) return
    setCustomAmount(customAmountDraft)
    setUseBalance(true)
    setIsBalanceCustom(false)
  }

  const selectedBillingAddress = savedBillingAddresses.find(
    (address) => address.id === selectedBillingAddressId
  ) ??
    savedBillingAddresses[0] ?? {
      fullName: "",
      addressLine1: "",
      cityStateZip: "",
      phoneNumber: "",
      country: "United States",
    }
  const billingAddressSummary = {
    fullName: fullName || selectedBillingAddress.fullName,
    addressLine1: addressLine1 || selectedBillingAddress.addressLine1,
    cityStateZip:
      city && zipcode && (billingState || !isUnitedStatesBilling)
        ? `${city}, ${[isUnitedStatesBilling ? billingState : "", zipcode]
            .filter(Boolean)
            .join(" ")}`
        : selectedBillingAddress.cityStateZip,
    phoneNumber: phoneNumber
      ? formatSavedBillingPhone(phoneNumber)
      : selectedBillingAddress.phoneNumber,
    country: selectedBillingAddress.country,
  }
  const confirmAddressDetails = {
    ...billingAddressSummary,
    addressLine1:
      billingAddressMode === "new" && addressLine2.trim()
        ? `${billingAddressSummary.addressLine1}, ${addressLine2.trim()}`
        : billingAddressSummary.addressLine1,
    country:
      billingAddressMode === "new"
        ? billingCountry
        : billingAddressSummary.country,
  }
  const cardNumberError = getCardNumberError(cardNumber)
  const cardNameError = getCardNameError(cardName)
  const expirationDateError = getExpiryError(expirationDate)
  const cvvError = getCvvError(cvv, cardNumber)
  const stripeCardNumberError = getStripeCardFieldError(
    "cardNumber",
    stripeCardFieldStates.cardNumber
  )
  const stripeExpirationDateError = getStripeCardFieldError(
    "expirationDate",
    stripeCardFieldStates.expirationDate
  )
  const stripeCvvError = getStripeCardFieldError(
    "cvv",
    stripeCardFieldStates.cvv
  )
  const StripeCardBrandIcon = STRIPE_CARD_BRAND_ICONS[stripeCardBrand]
  const cardFieldErrors: Record<CardField, string> = {
    cardNumber: editingCard
      ? duplicateCardError
      : stripeCardNumberError || duplicateCardError,
    cardName: cardNameError,
    expirationDate: editingCard
      ? expirationDate.trim()
        ? expirationDateError
        : ""
      : stripeExpirationDateError,
    cvv: stripeCvvError,
  }
  const shouldShowCardFieldError = (field: CardField) =>
    (hasAttemptedCardSubmit || cardFieldTouched[field]) &&
    Boolean(cardFieldErrors[field])
  const getStripeFieldClassName = (
    field: StripeCardField,
    className?: string
  ) => {
    const hasError = shouldShowCardFieldError(field)

    return cn(
      inputVariants({
        variant: hasError ? "error" : undefined,
        className: cn("items-center [&>div]:w-full", className),
      }),
      stripeFocusedField === field &&
        (hasError
          ? "ring-2 ring-error-100"
          : "border-primary-500 ring-2 ring-primary-50")
    )
  }
  const isBillingZipValid = isUnitedStatesBilling
    ? /^\d{5}(?:-\d{4})?$/.test(zipcode.trim())
    : zipcode.trim().length > 0
  const isBillingAddressValid =
    (billingAddressMode !== "new" && billingAddressMode !== "saved") ||
    (fullName.trim().length >= 2 &&
      addressLine1.trim().length > 0 &&
      city.trim().length > 0 &&
      billingCountry.trim().length > 0 &&
      (!isUnitedStatesBilling || billingState.trim().length > 0) &&
      isBillingZipValid &&
      isPhoneValid(phoneNumber))
  const billingFieldErrors: Record<BillingField, string> = {
    fullName:
      fullName.trim().length >= 2 ? "" : "Please enter your full name",
    addressLine1: addressLine1.trim() ? "" : "Please enter your address",
    city: city.trim() ? "" : "Please enter your city",
    country: billingCountry.trim() ? "" : "Please select your country",
    state:
      !isUnitedStatesBilling || billingState.trim()
        ? ""
        : "Please select your state",
    zipcode: !zipcode.trim()
      ? "Please enter your zip code"
      : isBillingZipValid
        ? ""
        : "Please enter a valid zip code",
    phone:
      phoneNumber.replace(/\D/g, "").length <= 3
        ? "Please enter your phone number"
        : isPhoneValid(phoneNumber)
          ? ""
          : "Please enter a valid phone number",
  }
  const shouldShowBillingFieldError = (field: BillingField) =>
    (hasAttemptedCardSubmit || billingFieldTouched[field]) &&
    Boolean(billingFieldErrors[field])
  const touchBillingField = (field: BillingField) =>
    setBillingFieldTouched((current) => ({ ...current, [field]: true }))
  const isCardDetailsValid = editingCard
    ? !cardNameError &&
      !stripeCvvError &&
      !(expirationDate.trim() && expirationDateError)
    : !stripeCardNumberError &&
      !cardNameError &&
      !stripeExpirationDateError &&
      !stripeCvvError
  const isFullPaymentCardFormValid = isCardDetailsValid && isBillingAddressValid
  const showCardBackPreview = activeCardField === "cvv"
  const recurringPaymentFrequencyMeasureRef =
    React.useRef<HTMLSpanElement>(null)
  const [recurringPaymentFrequencyWidth, setRecurringPaymentFrequencyWidth] =
    React.useState<number | null>(null)

  React.useLayoutEffect(() => {
    if (!recurringPaymentFrequencyMeasureRef.current) return

    const nextWidth =
      Math.ceil(
        recurringPaymentFrequencyMeasureRef.current.getBoundingClientRect()
          .width
      ) + 72
    setRecurringPaymentFrequencyWidth(nextWidth)
  }, [paymentFrequency])

  const isInstallmentCardFormValid =
    !cardNumberError && !cardNameError && !expirationDateError && !cvvError

  const bankFieldErrors = getBankFieldErrors({
    accountType,
    accountHolderName,
    bankRoutingNumber,
    accountNumber,
    confirmAccountNumber,
  })
  const shouldShowBankFieldError = (field: BankField) =>
    (hasAttemptedBankSubmit || bankFieldTouched[field]) &&
    Boolean(bankFieldErrors[field])
  const isInstallmentBankFormValid = Object.values(bankFieldErrors).every(
    (error) => !error
  )

  const selectedBank =
    BANK_OPTIONS.find((bankOption) => bankOption.id === selectedBankId) ||
    BANK_OPTIONS[0]!

  const filteredBankOptions = React.useMemo(() => {
    const normalizedSearch = bankSearch.trim().toLowerCase()

    if (!normalizedSearch) return BANK_OPTIONS

    return BANK_OPTIONS.filter((bankOption) =>
      `${bankOption.name} ${bankOption.logo}`
        .toLowerCase()
        .includes(normalizedSearch)
    )
  }, [bankSearch])

  const closeInstallmentMethodDialogs = () => {
    setIsExistingInstallmentMethodsDialogOpen(false)
    setIsAddNewInstallmentMethodDialogOpen(false)
    setIsAddCardInstallmentMethodDialogOpen(false)
    setIsAddBankInstallmentMethodDialogOpen(false)
  }

  const getSplitPaymentAddError = React.useCallback(
    (method: InstallmentPaymentMethod) => {
      if (fullPaymentMethods.length >= SPLIT_PAYMENT_MAX_METHODS) {
        return "You can split payment across up to 3 payment methods."
      }

      if (!SPLIT_ELIGIBLE_METHOD_TYPES.includes(method.method)) {
        return "This payment method is not available for split payment. Please choose a different one."
      }

      if (fullPaymentMethods.some((current) => current.id === method.id)) {
        return "You have already added this payment method. Please choose a different one."
      }

      return ""
    },
    [fullPaymentMethods]
  )

  const getAvailableSplitSavedPaymentMethods = React.useCallback(
    () =>
      savedInstallmentPaymentMethods.filter(
        (method) =>
          SPLIT_ELIGIBLE_METHOD_TYPES.includes(method.method) &&
          !fullPaymentMethods.some((current) => current.id === method.id)
      ),
    [fullPaymentMethods, savedInstallmentPaymentMethods]
  )

  const assignPaymentMethodToFlowTarget = React.useCallback(
    (method: InstallmentPaymentMethod) => {
      if (paymentMethodFlowTarget === "full") {
        if (fullPaymentFlowPreservesSplit && fullPaymentMethods.length > 0) {
          const splitAddError = getSplitPaymentAddError(method)

          if (splitAddError) {
            setSplitPaymentError(splitAddError)
            return
          }

          setFullPaymentMethods((prev) => [...prev, method])
          setHasSplitFullPayment(true)
          setShowFullPaymentMethods(true)
          setIsAutoSplitEnabled(true)
          setSplitPaymentAllocations({})
          setShowSplitAddNewPaymentOptions(false)
        } else {
          setFullPaymentMethods([method])
          setHasSplitFullPayment(false)
          setShowFullPaymentMethods(false)
          setSplitPaymentAllocations({})
        }

        setPaymentMethod("")
        setIsWireTransfer(false)
        setSplitPaymentError("")
        return
      }

      if (activeInstallmentBlock === "first") {
        setFirstInstallmentMethods((prev) => [...prev, method])
        return
      }

      setSecondInstallmentMethods((prev) => [...prev, method])
    },
    [
      activeInstallmentBlock,
      fullPaymentFlowPreservesSplit,
      fullPaymentMethods.length,
      getSplitPaymentAddError,
      paymentMethodFlowTarget,
    ]
  )

  const resetInstallmentCardForm = () => {
    setCardNumber("")
    setCardName("")
    setExpirationDate("")
    setCvv("")
    stripeCardNumberElementRef.current?.clear()
    stripeCardExpiryElementRef.current?.clear()
    stripeCardCvcElementRef.current?.clear()
    setPaymentError("")
    setSaveCard(false)
    setCardFieldTouched({
      cardNumber: false,
      cardName: false,
      expirationDate: false,
      cvv: false,
    })
    setHasAttemptedCardSubmit(false)
  }

  const resetInstallmentBankForm = () => {
    setAccountType("")
    setAccountHolderName("")
    setBankRoutingNumber("")
    setAccountNumber("")
    setConfirmAccountNumber("")
    setSaveBankAccount(false)
    setBankFieldTouched({
      accountType: false,
      accountHolderName: false,
      bankRoutingNumber: false,
      accountNumber: false,
      confirmAccountNumber: false,
    })
    setHasAttemptedBankSubmit(false)
    setBankSubmissionError("")
    setMicroDepositMessage("")
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

  const handleSelectExistingInstallmentMethod = (
    method: InstallmentPaymentMethod
  ) => {
    setSelectedExistingInstallmentMethodId(method.id)
    assignPaymentMethodToFlowTarget(method)
    closeInstallmentMethodDialogs()
  }

  const openFullPaymentMethodFlow = (preserveSplit = false) => {
    if (
      preserveSplit &&
      fullPaymentMethods.length >= SPLIT_PAYMENT_MAX_METHODS
    ) {
      return
    }

    setPaymentMethodFlowTarget("full")
    setFullPaymentFlowPreservesSplit(preserveSplit)
    setSelectedExistingInstallmentMethodId("")
    setSelectedNewInstallmentMethodType("")
    setSplitPaymentError("")
    closeInstallmentMethodDialogs()

    if (
      savedInstallmentPaymentMethods.length > 0 &&
      (!preserveSplit || getAvailableSplitSavedPaymentMethods().length > 0)
    ) {
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
    assignPaymentMethodToFlowTarget(method)
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

  const handleOpenInstallmentMethodType = (
    value: NewPaymentMethodOptionValue
  ) => {
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

    const walletMethodType = value === "google-pay" ? "GOOGLE_PAY" : "APPLE_PAY"
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
    setHasAttemptedCardSubmit(true)
    if (!isInstallmentCardFormValid) return

    const method: InstallmentPaymentMethod = {
      id: `card-${Date.now()}`,
      method: "CREDIT_DEBIT_CARD",
      title: "Credit Card",
      subtitle: "Stripe card",
      saveDefaultPaymentMethod: saveCard,
    }

    setSavedInstallmentPaymentMethods((prev) => [method, ...prev])
    assignPaymentMethodToFlowTarget(method)
    closeInstallmentMethodDialogs()
  }

  const handleSaveInstallmentBank = () => {
    if (!isInstallmentBankFormValid) return

    const accountLast4 = accountNumber.slice(-4)
    const method: InstallmentPaymentMethod = {
      id: `bank-${Date.now()}`,
      method: "BANK_ACCOUNT",
      title: accountHolderName || "Bank Account",
      subtitle: `${accountType} ****${accountLast4}`,
      accountType,
      accountNumber: accountLast4,
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
    setBillingCountry("United States")
    setZipcode("")
    setPhoneNumber("")
    setBillingFieldTouched({
      fullName: false,
      addressLine1: false,
      country: false,
      city: false,
      state: false,
      zipcode: false,
      phone: false,
    })
    setBillingAddressMode(hasSavedBillingAddresses ? "saved" : "new")
  }

  const clearNewBillingAddressFields = () => {
    setFullName("")
    setAddressLine1("")
    setAddressLine2("")
    setCity("")
    setBillingState("")
    setBillingCountry("United States")
    setZipcode("")
    setPhoneNumber("")
    setBillingFieldTouched({
      fullName: false,
      addressLine1: false,
      country: false,
      city: false,
      state: false,
      zipcode: false,
      phone: false,
    })
  }

  const resetFullPaymentBankForm = () => {
    resetInstallmentBankForm()
  }

  const saveFullPaymentMethod = (method: InstallmentPaymentMethod) => {
    if (hasSplitFullPayment && fullPaymentMethods.length > 0) {
      const splitAddError = getSplitPaymentAddError(method)

      if (splitAddError) {
        setSplitPaymentError(splitAddError)
        return
      }

      setFullPaymentMethods((prev) => [...prev, method])
      setShowFullPaymentMethods(true)
      setIsAutoSplitEnabled(true)
      setPaymentMethod("")
      setSplitPaymentError("")
      setShowSplitAddNewPaymentOptions(false)
      return
    }

    setFullPaymentMethods([method])
    setHasSplitFullPayment(false)
    setShowFullPaymentMethods(false)
    setPaymentMethod("")
    setSplitPaymentAllocations({})
    setSplitPaymentError("")
  }

  const saveNewBillingAddress = async (
    override?: RecommendedBillingAddress | null
  ) => {
    setIsSavingBillingAddress(true)
    try {
      const addressLine2Value = override
        ? override.addressLine2 ?? ""
        : addressLine2.trim()
      const response = await BillingAddressesAPI.create({
        fullName: fullName.trim(),
        addressLine1: override ? override.addressLine1 : addressLine1.trim(),
        ...(addressLine2Value ? { addressLine2: addressLine2Value } : {}),
        city: override ? override.city : city.trim(),
        ...(isUnitedStatesBilling
          ? { state: override?.state || billingState }
          : {}),
        postalCode: override ? override.postalCode : zipcode.trim(),
        country: billingCountry,
        phoneNumber,
      })
      const savedAddress = toSavedBillingAddress(
        response.data as BillingAddress
      )
      setSavedBillingAddresses((current) => [...current, savedAddress])
      setSelectedBillingAddressId(savedAddress.id)
      setFullName("")
      setAddressLine1("")
      setAddressLine2("")
      setCity("")
      setBillingState("")
      setBillingCountry("United States")
      setZipcode("")
      setPhoneNumber("")
      setBillingFieldTouched({
        fullName: false,
        addressLine1: false,
        country: false,
        city: false,
        state: false,
        zipcode: false,
        phone: false,
      })
      setBillingAddressMode("summary")
      return savedAddress
    } catch {
      toast({
        variant: "destructive",
        title: "Your billing address could not be saved. Please try again.",
      })
      return null
    } finally {
      setIsSavingBillingAddress(false)
    }
  }

  const saveCardToAccount = async (billingAddress: SavedBillingAddress | null) => {
    const stripe = stripeRef.current
    const cardNumberElement = stripeCardNumberElementRef.current
    if (!stripe || !cardNumberElement) return null

    setDuplicateCardError("")
    const setupIntentResponse = await CheckoutAPI.CreateCardSetupIntent()
    const clientSecret = (setupIntentResponse.data as { clientSecret: string })
      .clientSecret

    const rawAddress = billingAddress?.raw
    const setupResult = await stripe.confirmCardSetup(clientSecret, {
      payment_method: {
        card: cardNumberElement,
        billing_details: {
          name: cardName.trim(),
          ...(rawAddress
            ? {
                phone: rawAddress.phoneNumber,
                address: {
                  line1: rawAddress.addressLine1,
                  line2: rawAddress.addressLine2 ?? undefined,
                  city: rawAddress.city,
                  state: rawAddress.state ?? undefined,
                  postal_code: rawAddress.postalCode,
                  country:
                    rawAddress.country === "United States"
                      ? "US"
                      : (resolveCountryCodeByName(rawAddress.country) ??
                        undefined),
                },
              }
            : {}),
        },
      },
    })
    if (setupResult.error) {
      toast({
        variant: "destructive",
        title:
          setupResult.error.message ||
          "Your card could not be saved. Please try again.",
      })
      return null
    }

    const paymentMethodId = setupResult.setupIntent.payment_method
    if (typeof paymentMethodId !== "string") return null

    let saveResponse
    try {
      saveResponse = await CheckoutAPI.SaveCard({
        paymentMethodId,
        ...(billingAddress ? { billingAddressId: billingAddress.id } : {}),
        ...(saveCard ? { setAsDefault: true } : {}),
      })
    } catch (error) {
      const failure = error as { response?: { data?: { code?: string } } }
      if (failure.response?.data?.code === "CARD_ALREADY_SAVED") {
        setDuplicateCardError("This credit card has already been added")
        return null
      }
      throw error
    }
    return saveResponse.data as {
      id: string
      brand: string
      funding: string
      last4: string
    }
  }

  const handleValidateBillingAddress = async () => {
    setIsValidatingAddress(true)
    try {
      const response = await BillingAddressesAPI.validate({
        addressLine1: addressLine1.trim(),
        ...(addressLine2.trim() ? { addressLine2: addressLine2.trim() } : {}),
        city: city.trim(),
        ...(isUnitedStatesBilling ? { state: billingState } : {}),
        postalCode: zipcode.trim(),
        country: billingCountry,
      })
      const validation = response.data as BillingAddressValidation
      if (validation.status === "corrected" && validation.recommended) {
        setRecommendedBillingAddress(validation.recommended)
        setConfirmAddressChoice("recommended")
        setIsConfirmAddressDialogOpen(true)
        return
      }
    } catch {
      setRecommendedBillingAddress(null)
    } finally {
      setIsValidatingAddress(false)
    }
    handleSaveFullPaymentCard()
  }

  const resetCardFormAfterSave = () => {
    resetInstallmentCardForm()
    setDuplicateCardError("")
    setStripeCardBrand("unknown")
    setActiveCardField(null)
    setStripeFocusedField(null)
    setStripeCardFieldStates({
      cardNumber: { empty: true, complete: false },
      expirationDate: { empty: true, complete: false },
      cvv: { empty: true, complete: false },
    })
  }

  const handleStartEditCard = async () => {
    const current = fullPaymentMethods[0]
    if (!current || isLoadingEditCard) return
    setIsLoadingEditCard(true)
    try {
      const response = await CheckoutAPI.GetSavedCard(
        current.id.replace("full-card-", "")
      )
      const card = response.data as SavedCardDetail
      resetCardFormAfterSave()
      setCardName(card.cardholderName ?? "")
      setSaveCard(card.isDefault)
      setStripeCardBrand(card.brand)
      const linkedAddress = savedBillingAddresses.find(
        (address) => address.id === card.billingAddressId
      )
      setSelectedBillingAddressId(
        linkedAddress?.id ?? savedBillingAddresses[0]?.id ?? ""
      )
      setBillingAddressMode(savedBillingAddresses.length > 0 ? "summary" : "new")
      setIsChangeCardPanelOpen(false)
      setEditingCard(card)
      setPaymentMethod("item-0")
    } catch {
      toast({
        variant: "destructive",
        title: "The card could not be loaded. Please try again.",
      })
    } finally {
      setIsLoadingEditCard(false)
    }
  }

  const handleCancelEditCard = () => {
    setEditingCard(null)
    resetCardFormAfterSave()
    setPaymentMethod("")
  }

  const handleSaveEditedCard = async (
    override?: RecommendedBillingAddress | null
  ) => {
    if (!editingCard || isSavingCard) return
    setHasAttemptedCardSubmit(true)
    if (!isFullPaymentCardFormValid) return
    setIsSavingCard(true)
    try {
      let billingAddress: SavedBillingAddress | null =
        savedBillingAddresses.find(
          (address) => address.id === selectedBillingAddressId
        ) ??
        savedBillingAddresses[0] ??
        null
      if (billingAddressMode === "new") {
        billingAddress = await saveNewBillingAddress(override)
        if (!billingAddress) return
      }

      const rawAddress = billingAddress?.raw
      const countryCode = rawAddress
        ? rawAddress.country === "United States"
          ? "US"
          : resolveCountryCodeByName(rawAddress.country)
        : undefined
      const expiryMatch = expirationDate
        .trim()
        .match(/^(\d{2})\/(\d{2}|\d{4})$/)

      let response
      try {
        response = await CheckoutAPI.UpdateSavedCard(editingCard.id, {
          cardholderName: cardName.trim(),
          ...(expiryMatch
            ? {
                expMonth: Number(expiryMatch[1]),
                expYear:
                  expiryMatch[2].length === 2
                    ? 2000 + Number(expiryMatch[2])
                    : Number(expiryMatch[2]),
              }
            : {}),
          ...(billingAddress ? { billingAddressId: billingAddress.id } : {}),
          ...(rawAddress && countryCode
            ? {
                billingDetails: {
                  phone: rawAddress.phoneNumber,
                  address: {
                    line1: rawAddress.addressLine1,
                    ...(rawAddress.addressLine2
                      ? { line2: rawAddress.addressLine2 }
                      : {}),
                    city: rawAddress.city,
                    ...(rawAddress.state ? { state: rawAddress.state } : {}),
                    postalCode: rawAddress.postalCode,
                    country: countryCode,
                  },
                },
              }
            : {}),
          ...(saveCard ? { setAsDefault: true } : {}),
        })
      } catch (error) {
        const failure = error as { response?: { data?: { code?: string } } }
        if (failure.response?.data?.code === "CARD_ALREADY_SAVED") {
          setDuplicateCardError("This credit card has already been added")
          return
        }
        throw error
      }

      const updated = response.data as SavedCardDetail
      saveFullPaymentMethod({
        id: `full-card-${updated.id}`,
        method: "CREDIT_DEBIT_CARD",
        title: "Credit Card",
        subtitle: "Stripe card",
        cardNumber: updated.last4,
        brand: updated.brand,
        funding: updated.funding,
        saveDefaultPaymentMethod: updated.isDefault,
      })
      setEditingCard(null)
      resetCardFormAfterSave()
      CheckoutAPI.ListSavedCards()
        .then((listResponse) =>
          setSavedCards(listResponse.data as SavedCardSummary[])
        )
        .catch(() => {})
      setSavedCardNotification(
        `${SAVED_CARD_BRAND_NAMES[updated.brand] ?? "Credit Card"} ending in *${updated.last4} has been updated.`
      )
      window.setTimeout(() => setSavedCardNotification(""), 5000)
    } catch {
      toast({
        variant: "destructive",
        title: "Your card could not be updated. Please try again.",
      })
    } finally {
      setIsSavingCard(false)
    }
  }

  const handleSaveFullPaymentCard = async (
    override?: RecommendedBillingAddress | null
  ) => {
    if (editingCard) {
      await handleSaveEditedCard(override)
      return
    }
    setHasAttemptedCardSubmit(true)
    if (!isFullPaymentCardFormValid || isSavingCard) return
    setIsSavingCard(true)
    try {
      let billingAddress: SavedBillingAddress | null =
        savedBillingAddresses.find(
          (address) => address.id === selectedBillingAddressId
        ) ??
        savedBillingAddresses[0] ??
        null
      if (billingAddressMode === "new") {
        billingAddress = await saveNewBillingAddress(override)
        if (!billingAddress) return
      }

      const savedCard = await saveCardToAccount(billingAddress)
      if (!savedCard) return

      const method: InstallmentPaymentMethod = {
        id: `full-card-${savedCard.id}`,
        method: "CREDIT_DEBIT_CARD",
        title: "Credit Card",
        subtitle: "Stripe card",
        cardNumber: savedCard.last4,
        brand: savedCard.brand,
        funding: savedCard.funding,
        saveDefaultPaymentMethod: saveCard,
      }

      saveFullPaymentMethod(method)
      resetCardFormAfterSave()
      setSavedCardNotification("Your card was saved to your account.")
      window.setTimeout(() => setSavedCardNotification(""), 5000)
    } catch {
      toast({
        variant: "destructive",
        title: "Your card could not be saved. Please try again.",
      })
    } finally {
      setIsSavingCard(false)
    }
  }

  const handleSaveFullPaymentBank = (options?: { resetForm?: boolean }) => {
    setHasAttemptedBankSubmit(true)
    if (!isInstallmentBankFormValid) return

    const accountLast4 = accountNumber.slice(-4)
    const method: InstallmentPaymentMethod = {
      id: `full-bank-${Date.now()}`,
      method: "BANK_ACCOUNT",
      title: selectedBank.name,
      subtitle: `${accountType} ****${accountLast4}`,
      accountType,
      accountNumber: accountLast4,
      saveDefaultPaymentMethod: saveBankAccount,
    }

    saveFullPaymentMethod(method)
    setSavedCardNotification(
      `${selectedBank.shortName} ${accountType.toLowerCase()} *${accountLast4} is saved and applied to this order`
    )
    window.setTimeout(() => setSavedCardNotification(""), 5000)
    if (options?.resetForm !== false) {
      resetFullPaymentBankForm()
    }
  }

  const clearSensitiveBankDetails = () => {
    setAccountHolderName("")
    setBankRoutingNumber("")
    setAccountNumber("")
    setConfirmAccountNumber("")
  }

  const saveConnectedBankPaymentMethod = (
    paymentMethod: NonNullable<
      CheckoutConfirmPaymentIntentResponse["paymentMethod"]
    >,
    fallbackBankName: string
  ) => {
    if (paymentMethod.type !== "us_bank_account" || !paymentMethod.last4) {
      setBankSubmissionError(
        "Stripe connected your bank, but did not return usable account details. Please try again."
      )
      return false
    }

    const bankName = paymentMethod.bankName || fallbackBankName
    const connectedAccountType = paymentMethod.accountType
      ? paymentMethod.accountType.charAt(0).toUpperCase() +
        paymentMethod.accountType.slice(1)
      : "Bank Account"

    const method: InstallmentPaymentMethod = {
      id: paymentMethod.id,
      method: "BANK_ACCOUNT",
      title: bankName,
      subtitle: `${connectedAccountType} ****${paymentMethod.last4}`,
      accountType: connectedAccountType,
      accountNumber: paymentMethod.last4,
      saveDefaultPaymentMethod: saveBankAccount,
    }

    saveFullPaymentMethod(method)
    setSavedCardNotification(
      `${bankName} *${paymentMethod.last4} is saved and applied to this order`
    )
    window.setTimeout(() => setSavedCardNotification(""), 5000)
    return true
  }

  const handleManualBankContinue = async () => {
    setHasAttemptedBankSubmit(true)
    setBankSubmissionError("")
    setMicroDepositMessage("")

    if (!isInstallmentBankFormValid) return

    if (!isStripePublishableKeyConfigured) {
      handleSaveFullPaymentBank({ resetForm: false })
      clearSensitiveBankDetails()
      setMicroDepositMessage(
        "Micro-deposit verification is required. Stripe will send two small deposits in 1 to 2 business days, and payment will only be processed after the account is verified."
      )
      return
    }

    const stripe = stripeRef.current
    if (
      !stripe ||
      typeof (stripe as any).confirmUsBankAccountPayment !== "function"
    ) {
      setBankSubmissionError(
        "We were unable to verify your bank account. Please check your details and try again or use a different payment method."
      )
      return
    }

    setIsBankSubmitting(true)

    try {
      const intent = await apiFetch<CheckoutPaymentIntentResponse>(
        "/checkout/v1/checkout/payment-intent",
        {
          method: "POST",
          body: {
            amount: totalAmountToBePaid,
            currency: "usd",
            paymentMethod: "ach",
            projectId:
                searchParams.get("projectId") ||
                checkout.listingId ||
                decodedSlug,
            contractId: searchParams.get("contractId") || undefined,
            savePaymentMethod: saveBankAccount,
            metadata: {
              checkoutSlug: decodedSlug,
              checkoutType: isTalentCheckout ? "talent" : "project",
              pay,
              accountType,
            },
          },
        }
      )

      const timeout = new Promise<never>((_, reject) => {
        window.setTimeout(
          () =>
            reject(
              new Error(
                "Connection timed out. Please check your internet connection and try again."
              )
            ),
          10_000
        )
      })

      const result = await Promise.race([
        (stripe as any).confirmUsBankAccountPayment(intent.clientSecret, {
          payment_method: {
            billing_details: {
              name: accountHolderName.trim(),
            },
            us_bank_account: {
              routing_number: bankRoutingNumber,
              account_number: accountNumber,
              account_holder_type: "individual",
              account_type: accountType.toLowerCase(),
            },
          },
        }),
        timeout,
      ])

      if (result.error) {
        const code = result.error.code || ""
        setBankSubmissionError(
          code === "routing_number_invalid"
            ? "The routing number you entered could not be found. Please check and try again."
            : result.error.message ||
                "We were unable to verify your bank account. Please check your details and try again or use a different payment method."
        )
        return
      }

      const paymentIntent = result.paymentIntent
      if (
        paymentIntent?.status === "processing" ||
        paymentIntent?.status === "requires_action"
      ) {
        setMicroDepositMessage(
          "Micro-deposit verification is required. Stripe will send two small deposits in 1 to 2 business days, and payment will only be processed after the account is verified."
        )
      }

      if (paymentIntent?.id) {
        await apiFetch<CheckoutConfirmPaymentIntentResponse>(
          "/checkout/v1/checkout/payment-intent/confirm",
          {
            method: "POST",
            body: { paymentIntentId: paymentIntent.id },
          }
        ).catch(() => null)
      }

      handleSaveFullPaymentBank({ resetForm: false })
      clearSensitiveBankDetails()
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "We were unable to verify your bank account. Please check your details and try again or use a different payment method."

      if (message.includes("API error 401")) {
        resetFullPaymentBankForm()
        setIsSessionExpiredDialogOpen(true)
        return
      }

      setBankSubmissionError(message)
    } finally {
      setIsBankSubmitting(false)
    }
  }

  const openStripeLinkFlow = async (bankId?: string) => {
    const bankForFlow =
      BANK_OPTIONS.find((bankOption) => bankOption.id === bankId) ||
      selectedBank

    if (bankId) {
      setSelectedBankId(bankId)
    }

    setBankSubmissionError("")
    setMicroDepositMessage("")
    setStripeLinkError("")

    if (!isStripePublishableKeyConfigured) {
      setBankSubmissionError(
        "Stripe is not configured for this environment. Add NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY to enable real bank connections."
      )
      return
    }

    const billingName = fullName.trim() || accountHolderName.trim()
    if (!billingName) {
      setBankSubmissionError(
        "Please enter the account holder name before connecting your bank."
      )
      window.setTimeout(
        () => document.getElementById("connect-account-holder-name")?.focus(),
        0
      )
      return
    }

    const stripe = stripeRef.current
    if (
      !stripe ||
      typeof (stripe as any).collectBankAccountForPayment !== "function"
    ) {
      setBankSubmissionError(
        "Stripe bank connection is still loading. Please wait a moment and try again."
      )
      return
    }

    setIsBankConnecting(true)

    try {
      const intent = await apiFetch<CheckoutPaymentIntentResponse>(
        "/checkout/v1/checkout/payment-intent",
        {
          method: "POST",
          body: {
            amount: totalAmountToBePaid,
            currency: "usd",
            paymentMethod: "ach",
            projectId:
                searchParams.get("projectId") ||
                checkout.listingId ||
                decodedSlug,
            contractId: searchParams.get("contractId") || undefined,
            savePaymentMethod: saveBankAccount,
            metadata: {
              checkoutSlug: decodedSlug,
              checkoutType: isTalentCheckout ? "talent" : "project",
              pay,
              connectionType: "stripe_financial_connections",
            },
          },
        }
      )

      const collected = await (stripe as any).collectBankAccountForPayment({
        clientSecret: intent.clientSecret,
        params: {
          payment_method_type: "us_bank_account",
          payment_method_data: {
            billing_details: {
              name: intent.billingName || billingName,
              email: intent.billingEmail,
            },
          },
        },
      })

      if (collected.error || !collected.paymentIntent) {
        setBankSubmissionError(
          collected.error?.message ||
            "Stripe could not connect your bank account. Please try again or add your bank manually."
        )
        return
      }

      let paymentIntent = collected.paymentIntent

      if (paymentIntent.status === "requires_confirmation") {
        if (typeof (stripe as any).confirmUsBankAccountPayment !== "function") {
          setBankSubmissionError(
            "Stripe connected your bank, but payment confirmation is unavailable. Please try again."
          )
          return
        }

        const confirmed = await (stripe as any).confirmUsBankAccountPayment(
          intent.clientSecret
        )

        if (confirmed.error || !confirmed.paymentIntent) {
          setBankSubmissionError(
            confirmed.error?.message ||
              "Stripe could not confirm your bank payment authorization."
          )
          return
        }

        paymentIntent = confirmed.paymentIntent
      }

      const confirmation = await apiFetch<CheckoutConfirmPaymentIntentResponse>(
        "/checkout/v1/checkout/payment-intent/confirm",
        {
          method: "POST",
          body: { paymentIntentId: paymentIntent.id },
        }
      )

      if (
        confirmation.status === "requires_payment_method" ||
        confirmation.status === "canceled"
      ) {
        setBankSubmissionError(
          "Stripe could not use that bank account for this payment. Please choose another account or add details manually."
        )
        return
      }

      if (!confirmation.paymentMethod) {
        setBankSubmissionError(
          "Stripe connected your bank, but did not return a payment method. Please try again."
        )
        return
      }

      if (
        confirmation.status === "processing" ||
        confirmation.status === "requires_action"
      ) {
        setMicroDepositMessage(
          "Your bank account is connected. If Stripe needs micro-deposit verification, payment will process after verification is complete."
        )
      }

      saveConnectedBankPaymentMethod(
        confirmation.paymentMethod,
        bankForFlow.name
      )
      clearSensitiveBankDetails()
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Stripe could not connect your bank account. Please try again."

      if (message.includes("API error 401")) {
        resetFullPaymentBankForm()
        setIsSessionExpiredDialogOpen(true)
        return
      }

      setBankSubmissionError(message)
    } finally {
      setIsBankConnecting(false)
    }
  }

  const closeStripeLinkFlow = () => {
    setIsStripeLinkDialogOpen(false)
    setStripeLinkStep("intro")
    setStripeLinkError("")
    setStripeLinkUsername("")
    setStripeLinkPassword("")
  }

  const handleStripeLinkBankSelect = (bankId: string) => {
    void openStripeLinkFlow(bankId)
  }

  const handleStripeLinkLogin = () => {
    if (!stripeLinkUsername.trim() || !stripeLinkPassword.trim()) {
      setStripeLinkError(
        "We were unable to connect your bank account. Please try again or use a different account."
      )
      return
    }

    setStripeLinkError("")
    setStripeLinkStep("account")
  }

  const completeStripeLinkConnection = () => {
    const method: InstallmentPaymentMethod = {
      id: `full-bank-${Date.now()}`,
      method: "BANK_ACCOUNT",
      title: selectedBank.name,
      subtitle: `${stripeLinkAccountType} ****1234`,
      accountType: stripeLinkAccountType,
      accountNumber: "1234",
      saveDefaultPaymentMethod: true,
    }

    saveFullPaymentMethod(method)
    setSavedCardNotification(
      `${selectedBank.shortName} ${stripeLinkAccountType.toLowerCase()} *1234 is saved and applied to this order`
    )
    window.setTimeout(() => setSavedCardNotification(""), 5000)
    closeStripeLinkFlow()
  }

  const confirmStripeLinkAccount = () => {
    setStripeLinkError("")
    setStripeLinkStep("success")
  }

  const handleSaveFullPaymentWire = async () => {
    setWireTransferError("")

    const details = wireTransferDetails || (await loadWireTransferDetails())
    if (!details) return

    if (!wireTransferConfirmed) {
      setWireTransferError(
        "Please confirm you have initiated the wire transfer before continuing."
      )
      return
    }

    setIsWireTransferSubmitting(true)

    try {
      await apiFetch<{ success: boolean; status: string }>(
        "/checkout/v1/checkout/confirm-wire-initiation",
        {
          method: "POST",
          body: { wireTransferId: details.wireTransferId },
        }
      )
      setWireTransferDetails({
        ...details,
        confirmedAt: new Date().toISOString(),
      })
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "We were unable to record your confirmation. Please try again or contact support."

      if (message.includes("API error 401")) {
        setIsSessionExpiredDialogOpen(true)
        return
      }

      setWireTransferError(message)
      return
    } finally {
      setIsWireTransferSubmitting(false)
    }

    const method: InstallmentPaymentMethod = {
      id: details.wireTransferId,
      method: "WIRE_TRANSFER",
      title: wireTransferType,
      subtitle: `Reference ${details.referenceCode}`,
    }

    saveFullPaymentMethod(method)
    setIsWireTransfer(true)
    setSavedCardNotification(
      `Wire transfer ${details.referenceCode} is saved for this order`
    )
    window.setTimeout(() => setSavedCardNotification(""), 5000)
  }

  const handleStartFullPaymentSplit = () => {
    const primaryMethod = fullPaymentMethods[0]

    if (!primaryMethod) return

    const splitAddError = !SPLIT_ELIGIBLE_METHOD_TYPES.includes(
      primaryMethod.method
    )
      ? "This payment method is not available for split payment. Please choose a different one."
      : ""

    if (splitAddError) {
      setSplitPaymentError(splitAddError)
      return
    }

    setHasSplitFullPayment(true)
    setShowFullPaymentMethods(false)
    setFullPaymentFlowPreservesSplit(true)
    setIsAutoSplitEnabled(true)
    setSplitPaymentAllocations({})
    setSplitPaymentError("")
    setShowSplitAddNewPaymentOptions(false)
    setPaymentMethod("")
  }

  const handleEditPrimaryFullPaymentMethod = (value: string) => {
    setFullPaymentMethods([])
    setHasSplitFullPayment(false)
    setShowFullPaymentMethods(false)
    setIsWireTransfer(false)
    setPaymentMethod(value)
    setSplitPaymentAllocations({})
    setSplitPaymentError("")
    setShowSplitAddNewPaymentOptions(false)
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
    const removedMethod = fullPaymentMethods.find(
      (method) => method.id === methodId
    )
    const nextMethods = fullPaymentMethods.filter(
      (method) => method.id !== methodId
    )
    setFullPaymentMethods(nextMethods)
    setSplitPaymentAllocations((current) => {
      const next = { ...current }
      delete next[methodId]
      return next
    })

    if (removedMethod?.method === "WIRE_TRANSFER") {
      setIsWireTransfer(false)
      setWireTransferConfirmed(false)
    }

    if (nextMethods.length <= 1) {
      setShowFullPaymentMethods(false)
    }

    if (nextMethods.length === 0) {
      setHasSplitFullPayment(false)
      setPaymentMethod("")
      setSplitPaymentError("")
    }
  }

  const renderInstallmentMethodSummary = (
    method: InstallmentPaymentMethod,
    block: InstallmentBlock
  ) => {
    const defaultAmount =
      block === "first"
        ? availableBalance
        : (parseCurrencyAmount(paymentFrequency?.value) ??
          parseCurrencyAmount(talentPaymentPlan?.value) ??
          fullAmount)

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
                    {isCard
                      ? getInstallmentCardBrandName(method.cardNumber)
                      : method.title}
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
                  onRemove={() =>
                    handleRemoveInstallmentMethod(block, method.id)
                  }
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
            allowDecimals={false}
            defaultValue={defaultAmount}
          />
        </div>
      </div>
    )
  }

  const handleSelectSavedCard = (card: SavedCardSummary) => {
    saveFullPaymentMethod({
      id: `full-card-${card.id}`,
      method: "CREDIT_DEBIT_CARD",
      title: "Credit Card",
      subtitle: "Stripe card",
      cardNumber: card.last4,
      brand: card.brand,
      funding: card.funding,
      saveDefaultPaymentMethod: card.isDefault,
    })
    setIsChangeCardPanelOpen(false)
  }

  const handleConfirmDeleteCard = async () => {
    if (!cardPendingDeletion || isDeletingCard) return
    setIsDeletingCard(true)
    try {
      try {
        await CheckoutAPI.DeleteSavedCard(cardPendingDeletion.id)
      } catch (error) {
        const failure = error as { response?: { status?: number } }
        if (failure.response?.status !== 404) throw error
      }
      const response = await CheckoutAPI.ListSavedCards()
      const cards = response.data as SavedCardSummary[]
      setSavedCards(cards)
      setCardPendingDeletion(null)
      const defaultCard = cards.find((card) => card.isDefault)
      if (defaultCard) {
        handleSelectSavedCard(defaultCard)
      } else {
        handleEditPrimaryFullPaymentMethod("")
      }
      toast({
        variant: "success",
        title: "Your card was removed from your account.",
      })
    } catch {
      toast({
        variant: "destructive",
        title: "The card could not be removed. Please try again.",
      })
    } finally {
      setIsDeletingCard(false)
    }
  }

  const renderSavedCardIdentity = (
    brand?: string,
    funding?: string,
    lastFour?: string,
    isDefault?: boolean
  ) => {
    const brandKey = brand && SAVED_CARD_BRAND_NAMES[brand] ? brand : ""
    const BrandIcon = STRIPE_CARD_BRAND_ICONS[brandKey]

    return (
      <div className="flex items-center gap-x-3">
        {BrandIcon ? (
          <BrandIcon className="h-[30px] w-[45px] shrink-0 rounded-[4px]" />
        ) : (
          <div className="inline-flex h-[30px] w-[45px] shrink-0 items-center justify-center rounded-[4px] border border-gray-100 bg-white text-gray-500">
            <CreditCard className="size-6" />
          </div>
        )}
        <div className="flex flex-col">
          <div className="-mb-[2.5px] flex items-center gap-x-2">
            <span className="text-sm font-medium leading-[normal] text-dark-blue-400">
              {brandKey ? SAVED_CARD_BRAND_NAMES[brandKey] : "Credit Card"}
            </span>
            {isDefault ? <Badge visual="primary">Default</Badge> : null}
          </div>
          <span className="text-xs leading-[18px] text-[#858585]">
            {lastFour
              ? `${funding === "debit" ? "Debit" : "Credit"} ****${lastFour}`
              : "Credit card"}
          </span>
        </div>
      </div>
    )
  }

  const renderSavedCardRow = (
    method: InstallmentPaymentMethod,
    onChange?: () => void,
    onDelete?: () => void,
    onEditCard?: () => void
  ) => {
    return (
      <Card className="py-[15px] pl-[15px] pr-[25px]">
        {renderSavedCardIdentity(
          method.brand,
          method.funding,
          (method.cardNumber ?? "").slice(-4)
        )}

        <div className="flex items-center gap-x-5">
          <Button
            className="text-xs"
            variant="link"
            visual="gray"
            type="button"
            onClick={onChange}
          >
            Change
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                className="h-[23px] w-[27px] p-0 text-gray-500"
                variant="ghost"
                visual="gray"
                type="button"
              >
                <MoreHorizontal className="size-[15px]" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-[165px]" align="end">
              <DropdownMenuItem onSelect={onEditCard}>
                <Edit03 className="h-4 w-4" /> Edit
              </DropdownMenuItem>
              <DropdownMenuItem visual="destructive" onSelect={onDelete}>
                <Trash03 className="h-4 w-4" /> Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </Card>
    )
  }

  const renderFullPaymentMethodRow = (
    method: InstallmentPaymentMethod,
    options?: {
      splitAmount?: string
      splitAmountValue?: string
      isAutoSplitEnabled?: boolean
      onEdit?: () => void
      onChange?: () => void
      onDelete?: () => void
      onEditCard?: () => void
      onSplit?: () => void
      onSplitAmountChange?: (value: string) => void
      onRemove?: () => void
    }
  ) => {
    const renderSplitAmountBox = () => (
      <div className="flex h-[67.5px] min-w-[122px] flex-col justify-center rounded-lg border border-gray-200 bg-white px-4 py-3 shadow-[0px_1px_2px_0px_rgba(16,24,40,.05)]">
        <span className="block text-xs font-light leading-none text-gray-400">
          Amount
        </span>
        {options?.isAutoSplitEnabled ? (
          <h3 className="text-base font-medium text-dark-blue-400">
            {options.splitAmount}
          </h3>
        ) : (
          <CurrencyInput
            className={cn(
              inputVariants({
                className:
                  "w-[108px] min-w-[108px] border-0 p-0 text-base font-medium text-dark-blue-400 shadow-none focus:ring-0",
              })
            )}
            intlConfig={{
              locale: "en-US",
              currency: "USD",
            }}
            value={options?.splitAmountValue ?? ""}
            allowDecimals={false}
            allowNegativeValue={false}
            placeholder="$0"
            onValueChange={(value) =>
              options?.onSplitAmountChange?.(sanitizeBalanceInput(value ?? ""))
            }
          />
        )}
      </div>
    )

    if (method.method === "CREDIT_DEBIT_CARD") {
      if (options?.splitAmount) {
        return (
          <div className="flex items-center gap-x-2.5">
            <div className="flex flex-auto items-center justify-between rounded-lg border border-gray-200 bg-white p-[15px] shadow-[0px_1px_4px_0px_rgba(0,0,0,.03)]">
              <div className="flex items-center gap-x-3">
                <div className="inline-flex h-[31px] w-[46.5px] shrink-0 items-center justify-center rounded-[4px] border border-gray-[#DADADA] bg-white text-gray-500">
                  {getInstallmentCardBrandIcon(method.cardNumber)}
                </div>

                <div className="inline-flex flex-col gap-y-1">
                  <div className="inline-flex items-center gap-x-2">
                    <span className="inline-block text-sm text-dark-blue-400">
                      {getInstallmentCardBrandName(method.cardNumber)}
                    </span>
                    {method.saveDefaultPaymentMethod && (
                      <Badge visual="primary">Default</Badge>
                    )}
                  </div>
                  <span className="inline-block text-xs leading-none text-[#858585]">
                    {method.cardNumber?.slice(-4)
                      ? `Credit ****${method.cardNumber.slice(-4)}`
                      : "Credit card"}
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
                  description={`Are you sure you want to remove ${getInstallmentCardBrandName(method.cardNumber)} ${
                    method.cardNumber?.slice(-4)
                      ? `Credit ****${method.cardNumber.slice(-4)}`
                      : "credit card"
                  } from your payment methods?`}
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

            {renderSplitAmountBox()}
          </div>
        )
      }

      return renderSavedCardRow(
        method,
        options?.onChange,
        options?.onDelete,
        options?.onEditCard
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

            {renderSplitAmountBox()}
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

    if (method.method === "GOOGLE_PAY" || method.method === "APPLE_PAY") {
      const WalletIcon = method.method === "GOOGLE_PAY" ? GPay1 : ApplePay1

      if (options?.splitAmount) {
        return (
          <div className="flex items-center gap-x-2.5">
            <div className="rounded-lg flex-auto bg-white border border-gray-200 p-[15px] flex items-center justify-between shadow-[0px_1px_4px_0px_rgba(0,0,0,.03)]">
              <div className="flex items-center gap-x-3">
                <WalletIcon className="h-[31px] w-[46.5px] shrink-0" />
                <div className="inline-flex flex-col gap-y-1">
                  <span className="inline-block text-sm text-dark-blue-400">
                    {method.title}
                  </span>
                  <span className="inline-block text-xs text-[#858585] leading-none">
                    {method.subtitle}
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
                  description={`Are you sure you want to remove ${method.title} from your payment methods?`}
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

            {renderSplitAmountBox()}
          </div>
        )
      }

      return (
        <div className="rounded-lg bg-white border border-gray-200 p-[15px] flex items-center justify-between">
          <div className="flex items-center gap-x-3">
            <WalletIcon className="h-[31px] w-[46.5px] shrink-0" />

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
            {/* {options?.onSplit ? (
              <Button variant="link" onClick={options.onSplit}>
                <DivideSquare className="size-[15px]" />
                Split Payment
              </Button>
            ) : null} */}
          </div>
        </div>
      )
    }

    if (method.method === "KLARNA") {
      return (
        <div className="rounded-lg bg-white border border-gray-200 p-[15px] flex items-center justify-between">
          <div className="flex items-center gap-x-3">
            <Klarna className="h-[31px] w-[46.5px] shrink-0" />

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
          {/* {options?.onSplit ? (
            <Button variant="link" onClick={options.onSplit}>
              <DivideSquare className="size-[15px]" />
              Split Payment
            </Button>
          ) : null} */}
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

  const isPaymentMethodTilesHiddenAtZero =
    pay === "AT_ONCE" &&
    !hasSplitFullPayment &&
    fullPaymentMethods.length < 1 &&
    savedInstallmentPaymentMethods.length < 1 &&
    totalAmountToBePaid <= 0

  if (!isTalentCheckout && !(projectCost > 0)) {
    return (
      <div className="bg-gray-50 pt-[64px]">
        <CheckoutNavigation
          currentStep={2}
          logoHref=""
          firstStepLabel="Project Details"
        />
        <div className="flex min-h-[calc(100vh-64px)] items-center justify-center px-4 py-[50px]">
          <div className="w-full max-w-[600px]">
            <Alert variant="error" className="items-center p-5">
              <AlertIcon>
                <AlertCircle className="size-5" />
              </AlertIcon>
              <AlertContent>
                <AlertTitle>We could not retrieve your payment amount.</AlertTitle>
                <AlertDescription className="mt-1">
                  Please return to the project page and try again.
                </AlertDescription>
                {checkout.listingId ? (
                  <Button
                    variant="filled"
                    className="mt-4"
                    onClick={() =>
                      router.push(projectDetailsHref)
                    }
                  >
                    Back to Project Details
                  </Button>
                ) : null}
              </AlertContent>
            </Alert>
          </div>
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="bg-gray-50 pt-[64px]">
        {/* Navigation */}
        <CheckoutNavigation
          currentStep={2}
          logoHref=""
          firstStepLabel={
            isTalentCheckout ? "Contract Details" : "Project Details"
          }
        />

        {isStripeLinkDialogOpen ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#667085]/75 px-4">
            <div className="relative w-[360px] overflow-hidden rounded-xl bg-white shadow-[0_20px_45px_rgba(16,24,40,0.18)]">
              <button
                type="button"
                aria-label="Close Stripe Link"
                className="absolute right-5 top-5 z-10 inline-flex size-6 items-center justify-center text-gray-500 hover:text-gray-700"
                onClick={closeStripeLinkFlow}
              >
                <X className="size-5" />
              </button>

              {stripeLinkStep === "intro" ? (
                <div className="flex min-h-[560px] flex-col px-6 py-6">
                  <div className="mt-10 flex items-center justify-center gap-x-3">
                    <span className="inline-flex size-14 items-center justify-center rounded-xl bg-gray-950 text-2xl font-bold text-white">
                      M
                    </span>
                    <span className="text-2xl font-bold text-gray-400">
                      ...
                    </span>
                    <span className="inline-flex size-14 items-center justify-center rounded-xl bg-[#635BFF] text-2xl font-bold text-white">
                      S
                    </span>
                  </div>
                  <h2 className="mt-8 text-center text-2xl font-bold leading-8 text-gray-900">
                    Marketeq uses Stripe to connect your accounts
                  </h2>
                  <div className="mt-8 space-y-5">
                    <div className="flex gap-x-3">
                      <RefreshCcw className="mt-0.5 size-5 shrink-0 text-gray-700" />
                      <div>
                        <h3 className="text-sm font-bold text-gray-900">
                          Fast and simple
                        </h3>
                        <p className="mt-1 text-sm leading-5 text-gray-600">
                          Connect your account in seconds.
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-x-3">
                      <Lock className="mt-0.5 size-5 shrink-0 text-gray-700" />
                      <div>
                        <h3 className="text-sm font-bold text-gray-900">
                          Data is encrypted
                        </h3>
                        <p className="mt-1 text-sm leading-5 text-gray-600">
                          Your shared data is protected, and you can disconnect
                          at any time.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-auto">
                    <p className="text-center text-xs leading-5 text-gray-600">
                      By continuing, you agree to Stripe&apos;s{" "}
                      <span className="underline">Terms</span> and{" "}
                      <span className="underline">Privacy Policy</span>
                    </p>
                    <Button
                      className="mt-4 h-12 w-full bg-[#635BFF] text-sm font-bold text-white hover:bg-[#5548e8]"
                      onClick={() => setStripeLinkStep("select")}
                    >
                      Agree and continue
                    </Button>
                    <button
                      type="button"
                      className="mt-4 w-full text-center text-xs font-semibold text-gray-600 underline"
                      onClick={closeStripeLinkFlow}
                    >
                      Manually verify instead
                    </button>
                  </div>
                </div>
              ) : null}

              {stripeLinkStep === "select" ? (
                <div className="flex min-h-[560px] flex-col px-6 py-6">
                  <button
                    type="button"
                    className="mb-6 inline-flex size-6 items-center justify-center text-gray-600"
                    onClick={() => setStripeLinkStep("intro")}
                    aria-label="Back"
                  >
                    <ArrowLeft className="size-5" />
                  </button>
                  <h2 className="text-2xl font-bold text-gray-900">
                    Select bank
                  </h2>
                  <div className="mt-6">
                    <Input
                      value={bankSearch}
                      onChange={(event) => setBankSearch(event.target.value)}
                      placeholder="Search"
                    />
                  </div>
                  <div className="mt-6 max-h-[360px] space-y-3 overflow-y-auto pr-1">
                    {filteredBankOptions.map((bankOption) => (
                      <button
                        key={bankOption.id}
                        type="button"
                        className="flex w-full items-center gap-x-3 rounded-lg p-2 text-left hover:bg-gray-50"
                        onClick={() =>
                          handleStripeLinkBankSelect(bankOption.id)
                        }
                      >
                        <span
                          className="inline-flex size-12 shrink-0 items-center justify-center rounded-xl text-[10px] font-bold leading-none text-white"
                          style={{ backgroundColor: bankOption.color }}
                        >
                          {bankOption.logo}
                        </span>
                        <span>
                          <span className="block text-sm font-bold text-gray-900">
                            {bankOption.name}
                          </span>
                          <span className="block text-xs text-gray-500">
                            {bankOption.shortName
                              .toLowerCase()
                              .replaceAll(" ", "")}
                            .com
                          </span>
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}

              {stripeLinkStep === "login" ? (
                <div className="flex min-h-[560px] flex-col px-6 py-6">
                  <button
                    type="button"
                    className="mb-6 inline-flex size-6 items-center justify-center text-gray-600"
                    onClick={() => setStripeLinkStep("select")}
                    aria-label="Back"
                  >
                    <ArrowLeft className="size-5" />
                  </button>
                  <span
                    className="inline-flex size-14 items-center justify-center rounded-xl text-[10px] font-bold leading-none text-white"
                    style={{ backgroundColor: selectedBank.color }}
                  >
                    {selectedBank.logo}
                  </span>
                  <h2 className="mt-5 text-2xl font-bold text-gray-900">
                    Log in to {selectedBank.shortName}
                  </h2>
                  <div className="mt-6 space-y-3">
                    <Input
                      value={stripeLinkUsername}
                      onChange={(event) =>
                        setStripeLinkUsername(event.target.value)
                      }
                      placeholder="Username"
                    />
                    <Input
                      value={stripeLinkPassword}
                      onChange={(event) =>
                        setStripeLinkPassword(event.target.value)
                      }
                      placeholder="Password"
                      type="password"
                    />
                  </div>
                  {stripeLinkError ? (
                    <div className="mt-4 rounded-md border border-error-200 bg-error-50 px-3 py-2 text-sm text-error-500">
                      {stripeLinkError}
                    </div>
                  ) : null}
                  <button
                    type="button"
                    className="mt-6 text-center text-sm font-semibold text-[#635BFF]"
                  >
                    Forgot password?
                  </button>
                  <Button
                    className="mt-auto h-12 w-full bg-[#635BFF] text-sm font-bold text-white hover:bg-[#5548e8]"
                    onClick={handleStripeLinkLogin}
                  >
                    Log in
                  </Button>
                </div>
              ) : null}

              {stripeLinkStep === "account" ? (
                <div className="flex min-h-[560px] flex-col px-6 py-6">
                  <button
                    type="button"
                    className="mb-6 inline-flex size-6 items-center justify-center text-gray-600"
                    onClick={() => setStripeLinkStep("login")}
                    aria-label="Back"
                  >
                    <ArrowLeft className="size-5" />
                  </button>
                  <span
                    className="inline-flex size-14 items-center justify-center rounded-xl text-[10px] font-bold leading-none text-white"
                    style={{ backgroundColor: selectedBank.color }}
                  >
                    {selectedBank.logo}
                  </span>
                  <h2 className="mt-5 text-2xl font-bold text-gray-900">
                    Select account
                  </h2>
                  <div className="mt-6 space-y-3">
                    {(["Savings", "Checking"] as const).map((type, index) => (
                      <button
                        key={type}
                        type="button"
                        className={cn(
                          "flex w-full items-center justify-between rounded-lg border p-4 text-left",
                          stripeLinkAccountType === type
                            ? "border-[#635BFF] ring-1 ring-[#635BFF]"
                            : "border-gray-200"
                        )}
                        onClick={() => setStripeLinkAccountType(type)}
                      >
                        <span>
                          <span className="block text-sm font-bold text-gray-900">
                            {type}
                          </span>
                          <span className="block text-xs text-gray-500">
                            ....{index === 0 ? "4242" : "1234"}
                          </span>
                        </span>
                        {stripeLinkAccountType === type ? (
                          <Check className="size-5 text-[#635BFF]" />
                        ) : null}
                      </button>
                    ))}
                    <button
                      type="button"
                      disabled
                      className="flex w-full items-center justify-between rounded-lg border border-gray-200 p-4 text-left opacity-50"
                    >
                      <span>
                        <span className="block text-sm font-bold text-gray-500">
                          Credit Card
                        </span>
                        <span className="block text-xs text-gray-400">
                          Not available
                        </span>
                      </span>
                    </button>
                  </div>
                  <p className="mt-auto text-center text-xs leading-5 text-gray-600">
                    Marketeq will have access to account details, balances and
                    transactions. <span className="underline">Learn more</span>
                  </p>
                  <Button
                    className="mt-4 h-12 w-full bg-[#635BFF] text-sm font-bold text-white hover:bg-[#5548e8]"
                    onClick={confirmStripeLinkAccount}
                  >
                    Connect account
                  </Button>
                </div>
              ) : null}

              {stripeLinkStep === "success" ? (
                <div className="flex min-h-[560px] flex-col items-center justify-center px-6 py-6 text-center">
                  <span className="inline-flex size-16 items-center justify-center rounded-full bg-[#635BFF]">
                    <Check className="size-8 text-white" />
                  </span>
                  <h2 className="mt-8 text-2xl font-bold text-gray-900">
                    Success
                  </h2>
                  <p className="mt-4 text-sm leading-5 text-gray-600">
                    Your account was connected.
                  </p>
                  <Button
                    className="mt-16 h-12 w-full bg-[#635BFF] text-sm font-bold text-white hover:bg-[#5548e8]"
                    onClick={completeStripeLinkConnection}
                  >
                    Back to Marketeq
                  </Button>
                </div>
              ) : null}
            </div>
          </div>
        ) : null}

        {/* Content */}
        <div className="px-[150px] py-[50px]">
          <div className="max-w-[1140px] mx-auto">
            <Button
              className="gap-x-1 rounded-none font-normal hover:text-gray-700 hover:no-underline focus:text-gray-500 mb-2 h-5 py-0"
              variant="link"
              visual="gray"
              onClick={() =>
                router.push(projectDetailsHref)
              }
            >
              <ArrowLeft className="size-4" /> Back
            </Button>

            <h1 className="text-2xl leading-7 font-bold text-dark-blue-400">
              Payment Details
            </h1>

            <div className="mt-6 flex items-start gap-x-8">
              {/* Main content */}
              <Card className="flex-auto flex-col items-stretch justify-start p-[50px] shadow-[0px_1px_2.5px_0px_rgba(16,24,40,0.02)]">
                {/* How do you want to pay? */}
                <h3 className="text-base leading-[.703] font-bold text-[#122A4B]">
                  {isOngoingTalentContract
                    ? "Pay In Installments"
                    : "How do you want to pay?"}
                </h3>

                {!isOngoingTalentContract ? (
                  <div className="mt-6">
                    <RadioGroup
                      value={pay}
                      onValueChange={(v) =>
                        setPay(v as "AT_ONCE" | "IN_INSTALLMENTS")
                      }
                      className="flex gap-x-3 items-start"
                    >
                      <RadioGroupItemSelector
                        className="px-3"
                        size="md"
                        value="AT_ONCE"
                      >
                        <Label size="sm" asChild>
                          <span>Pay Full Amount</span>
                        </Label>
                        <HelperText size="sm">
                          {formatter.format(fullAmount)}
                        </HelperText>
                      </RadioGroupItemSelector>
                      {isInstallmentServiceAvailable ? (
                        <RadioGroupItemSelector
                          className="px-3"
                          size="md"
                          value="IN_INSTALLMENTS"
                        >
                          <Label size="sm" asChild>
                            <span>Pay In Installments</span>
                          </Label>
                          <HelperText size="sm">
                            Select your payment plan
                          </HelperText>
                        </RadioGroupItemSelector>
                      ) : null}
                    </RadioGroup>
                    {!isInstallmentServiceAvailable ? (
                      <p className="mt-3 text-xs leading-5 text-gray-500">
                        Installment plans are temporarily unavailable. You can
                        still pay the full project amount today.
                      </p>
                    ) : null}
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
                          To confirm this {installmentSubjectLabel}, an initial
                          one-time payment is required. Your installment plan
                          will begin after this payment is successfully
                          processed.
                        </AlertDescription>
                      </AlertTitle>
                    </AlertContent>
                  </Alert>
                )}

                {/* Available Balance */}
                {isBalanceServiceAvailable ? (
                  <div className="mt-6 border-t pt-6 border-gray-200">
                    <h3 className="text-base leading-[normal] font-semibold text-black">
                      Your Available Balance
                    </h3>

                    {isBalanceLoading ? (
                      <div className="mt-5">
                        <Spinner size={24} strokeWidth={3} />
                      </div>
                    ) : (
                    <div className="mt-5 flex items-start gap-x-2">
                      <Checkbox
                        size="md"
                        checked={useBalance}
                        disabled={availableBalance <= 0}
                        onCheckedChange={(value) => {
                          const checked = value === true
                          setUseBalance(checked)
                          if (!checked) {
                            setIsBalanceCustom(false)
                            setCustomAmount("")
                            setCustomAmountDraft("")
                          }
                        }}
                      />

                      <div className="flex-auto flex flex-col items-start">
                        {isBalanceCustom ? (
                          <form
                            className="contents"
                            onSubmit={handleCustomBalanceSubmit}
                          >
                            <div className="flex items-center flex-auto max-w-[328px] gap-x-3">
                              <Input
                                className="flex-auto"
                                aria-invalid={
                                  customBalanceDraftError ? true : false
                                }
                                placeholder="Enter amount"
                                value={
                                  customAmountDraft.trim() === ""
                                    ? ""
                                    : `$${customAmountDraft}`
                                }
                                onChange={(event) =>
                                  setCustomAmountDraft(
                                    sanitizeBalanceInput(
                                      event.target.value.replace(/^\$/, "")
                                    )
                                  )
                                }
                              />
                              <Button
                                size="lg"
                                disabled={
                                  !hasValidCustomBalanceDraft ||
                                  availableBalance <= 0
                                }
                              >
                                Apply
                              </Button>
                            </div>

                            {customBalanceDraftError ? (
                              <span className="mt-2 block text-xs leading-none text-error-500">
                                {customBalanceDraftError}
                              </span>
                            ) : (
                              <span className="mt-2 block text-xs leading-none text-gray-500">
                                {formatter.format(
                                  Math.max(
                                    availableBalance -
                                      (hasValidCustomBalanceDraft
                                        ? (parsedCustomAmountDraft ?? 0)
                                        : 0),
                                    0
                                  )
                                )}{" "}
                                remaining of available balance
                              </span>
                            )}

                            <Button
                              className="underline mt-1"
                              variant="link"
                              visual="gray"
                              type="button"
                              onClick={() => {
                                setCustomAmount("")
                                setUseBalance(true)
                                setIsBalanceCustom(false)
                              }}
                            >
                              Use full balance
                            </Button>
                          </form>
                        ) : useBalance &&
                          customAmount.trim() !== "" &&
                          hasValidCustomBalanceAmount ? (
                          <>
                            <Label size="sm">
                              Using{" "}
                              <span className="font-bold">
                                {formatter.format(
                                  parsedCustomAmount ?? 0
                                )}
                              </span>{" "}
                              of total available balance of{" "}
                              {formatter.format(
                                availableBalance
                              )}
                            </Label>
                            <div className="flex items-center gap-x-1 mt-1.5">
                              <Button
                                className="underline"
                                variant="link"
                                visual="gray"
                                onClick={() => {
                                  setCustomAmountDraft(customAmount)
                                  setIsBalanceCustom(true)
                                }}
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
                                onClick={() => {
                                  setCustomAmount("")
                                  setUseBalance(true)
                                }}
                              >
                                Use full balance
                              </Button>
                            </div>
                          </>
                        ) : (
                          <>
                            <Label
                              className="font-light text-dark-blue-400"
                              size="sm"
                            >
                              Use my{" "}
                              <span className="font-bold">
                                {formatter.format(availableBalance)}
                              </span>{" "}
                              available balance
                            </Label>
                            {availableBalance > 0 ? (
                              <Button
                                className="underline mt-1.5 h-5 p-0 text-xs"
                                variant="link"
                                visual="gray"
                                onClick={() => {
                                  setCustomAmountDraft(customAmount)
                                  setUseBalance(true)
                                  setIsBalanceCustom(true)
                                }}
                              >
                                Apply Custom Amount
                              </Button>
                            ) : null}
                          </>
                        )}
                      </div>
                    </div>
                    )}
                  </div>
                ) : null}

                {/* Gift Cards */}
                <div
                  className={cn(
                    "mt-6 py-6 border-gray-200",
                    isPaymentMethodTilesHiddenAtZero ? "border-t" : "border-y"
                  )}
                >
                  {!isTalentCheckout &&
                  (sessionGiftCards.length > 0 || showGiftCard) ? (
                    <div className="max-w-[656px]">{redeemGiftCardPanel}</div>
                  ) : showGiftCard ? (
                    <div className="max-w-[656px] rounded-lg bg-primary-25 p-5">
                      <div className="flex items-center justify-between">
                        <Label size="sm">
                          Redeem a gift card{" "}
                          <span className="font-light">
                            (dashes not required)
                          </span>
                        </Label>
                        {giftCards.length > 0 ? (
                          <RmDialog
                            title={
                              giftCards.length > 1
                                ? "Remove All Gift Cards?"
                                : "Remove Gift Card?"
                            }
                            description={
                              giftCards.length > 1
                                ? `Are you sure you want to remove all added gift cards for the amount of ${formatter.format(totalGiftCardAmount)}?`
                                : `Are you sure you want to remove gift card ending in ${maskGiftCardCode(giftCards[0].code)} for the amount of ${formatter.format(giftCards[0].amount)}?`
                            }
                            onRemove={removeAllGiftCards}
                            trigger={({ isOpen, setIsOpen }) => (
                              <button
                                type="button"
                                onClick={() => setIsOpen(!isOpen)}
                                className="inline-flex items-center gap-x-2 text-xs font-semibold leading-none text-gray-500"
                              >
                                Remove ({giftCards.length})
                                <Trash03 className="size-[15px]" />
                              </button>
                            )}
                          />
                        ) : (
                          <Button
                            variant="link"
                            visual="gray"
                            onClick={() => {
                              setShowGiftCard(false)
                              setGiftCardInput("")
                              setGiftCardError("")
                            }}
                          >
                            Cancel
                          </Button>
                        )}
                      </div>

                      <form className="mt-3" onSubmit={handleGiftCardSubmit}>
                        <div className="flex items-center gap-x-3">
                          <InputGroup className="flex-auto">
                            <Input
                              className={cn(
                                "pr-11",
                                giftCardError &&
                                  !isRedeemedGiftCardError &&
                                  "border-error-300 text-gray-950 focus:border-error-300 focus:ring-error-100"
                              )}
                              placeholder="Enter gift card number"
                              value={giftCardInput}
                              aria-invalid={giftCardError ? true : false}
                              onChange={(e) => {
                                setGiftCardInput(
                                  formatGiftCardCode(e.target.value)
                                )
                                setGiftCardError("")
                                setShowGiftCardSuccess(false)
                              }}
                            />
                            {giftCardError && !isRedeemedGiftCardError ? (
                              <InputRightElement>
                                <AlertCircle className="size-5 text-error-500" />
                              </InputRightElement>
                            ) : null}
                          </InputGroup>
                          <Button
                            className="w-[64px]"
                            size="lg"
                            disabled={isGiftCardApplyDisabled}
                          >
                            Apply
                          </Button>
                        </div>
                        {giftCardError && !isRedeemedGiftCardError ? (
                          <p className="mt-2 text-sm font-normal leading-5 text-error-500">
                            {giftCardError}
                          </p>
                        ) : null}
                      </form>

                      {giftCardError && isRedeemedGiftCardError ? (
                        <Alert
                          variant="error"
                          className="mt-3 max-w-[420px] items-center p-3"
                        >
                          <AlertIcon>
                            <AlertCircle className="size-4" />
                          </AlertIcon>
                          <AlertContent>
                            <AlertTitle className="text-xs leading-5">
                              {giftCardError}
                            </AlertTitle>
                          </AlertContent>
                        </Alert>
                      ) : null}

                      {showGiftCardSuccess && giftCards.length > 0 && (
                        <Alert
                          variant="success"
                          className="mt-3 max-w-[420px] items-center p-3"
                        >
                          <AlertIcon>
                            <CheckCircle className="size-4" />
                          </AlertIcon>
                          <AlertContent>
                            <AlertTitle className="text-xs leading-5">
                              Gift Card &quot;
                              {formatGiftCardCode(giftCards.at(-1)?.code ?? "")}
                              &quot; has been applied.
                            </AlertTitle>
                          </AlertContent>
                        </Alert>
                      )}

                      {giftCards.length > 0 && (
                        <div className="mt-3">
                          <div className="flex items-center justify-between">
                            <span className="text-xs leading-none text-dark-blue-400 font-light">
                              Total gift card amount{" "}
                              <span className="font-bold">
                                {formatter.format(totalGiftCardAmount)}
                              </span>
                            </span>
                            <Button
                              variant="link"
                              visual="gray"
                              onClick={() =>
                                setShowAllGiftCards((isOpen) => !isOpen)
                              }
                            >
                              View All Gift Cards
                              <ChevronDown
                                className={cn(
                                  "size-[15px]",
                                  showAllGiftCards && "rotate-180"
                                )}
                              />
                            </Button>
                          </div>

                          {showAllGiftCards ? (
                            <div className="mt-5 space-y-3">
                              {giftCards.map((giftCard) => (
                                <div
                                  key={giftCard.code}
                                  className="flex items-center justify-between text-xs leading-none text-dark-blue-400"
                                >
                                  <div className="flex items-center gap-x-3">
                                    <div className="flex size-5 items-center justify-center rounded-sm border border-dark-blue-400">
                                      <DivideSquare className="size-4" />
                                    </div>
                                    <span className="font-semibold">
                                      Gift card ending in{" "}
                                      {maskGiftCardCode(giftCard.code)}
                                    </span>
                                  </div>
                                  <span>
                                    Amount:{" "}
                                    <span className="font-bold">
                                      {formatter.format(
                                        giftCard.amount
                                      )}
                                    </span>
                                  </span>
                                  <RmDialog
                                    title="Remove Gift Card?"
                                    description={`Are you sure you want to remove gift card ending in ${maskGiftCardCode(giftCard.code)} for the amount of ${formatter.format(giftCard.amount)}?`}
                                    onRemove={() =>
                                      removeGiftCard(giftCard.code)
                                    }
                                    trigger={({ isOpen, setIsOpen }) => (
                                      <IconButton
                                        className="size-6 text-gray-400 hover:bg-error-50 hover:text-error-500"
                                        variant="ghost"
                                        visual="gray"
                                        onClick={() => setIsOpen(!isOpen)}
                                      >
                                        <Trash03 className="size-[15px]" />
                                      </IconButton>
                                    )}
                                  />
                                </div>
                              ))}
                            </div>
                          ) : null}
                        </div>
                      )}
                    </div>
                  ) : (
                    <Button
                      className="h-5 p-0"
                      variant="link"
                      size="md"
                      onClick={() => setShowGiftCard(true)}
                    >
                      <Plus className="size-[15px]" /> Add Gift Card(s)
                    </Button>
                  )}
                </div>

                {isSelectedMethodUnavailable &&
                paymentMethod === "" &&
                fullPaymentMethods.length < 1 &&
                totalAmountToBePaid > 0 ? (
                  <Alert
                    variant="error"
                    className="mt-6 items-center rounded-[5px] p-4"
                  >
                    <AlertIcon className="shrink-0">
                      <AlertCircle className="size-5" />
                    </AlertIcon>
                    <AlertContent>
                      <AlertTitle className="text-sm leading-5 text-error-600">
                        The selected payment method is no longer available.
                        Please choose a different option.
                      </AlertTitle>
                    </AlertContent>
                  </Alert>
                ) : null}

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
                  savedInstallmentPaymentMethods.length < 1 &&
                  totalAmountToBePaid > 0 && (
                    <div className="mt-6">
                      <h3 className="text-base leading-[.703] font-bold text-[#122A4B]">
                        Select payment method
                      </h3>
                      {isPaymentMethodsLoading || isSavedCardsLoading ? (
                        <div className="mt-5">
                          <Spinner size={24} strokeWidth={3} />
                        </div>
                      ) : (
                      <RadioGroup
                        value={paymentMethod}
                        onValueChange={(value) => {
                          setPaymentMethod(value)
                          setIsSelectedMethodUnavailable(false)
                          if (value === "item-5") {
                            setHasSplitFullPayment(false)
                            setShowFullPaymentMethods(false)
                          }
                        }}
                        className={cn(
                          "mt-5 grid gap-3",
                          paymentMethod ? "grid-cols-2" : "grid-cols-3"
                        )}
                      >
                        {(paymentMethod
                          ? paymentMethodOptions.filter(
                              (m) => m.value === paymentMethod
                            )
                          : paymentMethodOptions
                        ).map((method) => (
                          <HeadlessRadioGroupItem
                            value={method.value}
                            key={method.value}
                            className="group relative flex shrink-0 flex-col items-center justify-center gap-3 rounded-lg border border-gray-200 p-5 shadow-[0px_1px_2px_0px_rgba(0,0,0,0.03)] transition duration-300 hover:border-2 hover:border-gray-300 hover:p-[19px] focus-visible:outline-none data-[state=checked]:border-2 data-[state=checked]:border-primary-500 data-[state=checked]:p-[19px] data-[state=checked]:hover:border-primary-500 data-[state=checked]:hover:ring-4 data-[state=checked]:hover:ring-light-blue-700 data-[state=checked]:hover:shadow-none"
                          >
                            <div className="absolute transition inline-flex items-center justify-center duration-300 left-2 top-2 size-5 rounded-full border-[1.5px] border-primary-500 bg-primary-500 text-white group-hover:ring-4 group-hover:ring-light-blue-700 opacity-0 group-data-[state=checked]:opacity-100">
                              <Check className="size-3.5 shrink-0" />
                            </div>
                            <div className="gap-x-[3px] flex items-center justify-center [&>svg]:shrink-0">
                              {method.icons.map((icon) => icon)}
                            </div>
                            <div className="flex w-full flex-col items-center justify-center gap-1">
                              <h3 className="text-center text-sm font-medium leading-5 text-gray-800">
                                {method.title}
                              </h3>
                              <p className="text-center text-sm leading-[normal] text-gray-500 whitespace-pre-line">
                                {method.desc}
                              </p>
                            </div>
                          </HeadlessRadioGroupItem>
                        ))}
                        {paymentMethod && (
                          <HeadlessRadioGroupItem
                            value=""
                            className="group relative flex shrink-0 flex-col items-center justify-center gap-3 rounded-lg border border-gray-200 p-[25px] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.03)] transition duration-300 hover:border-2 hover:border-gray-300 hover:p-6 focus-visible:outline-none"
                          >
                            <div className="flex items-center justify-center">
                              <RefreshCcw className="size-5 text-gray-500" />
                            </div>
                            <h3 className="text-center text-sm font-medium leading-5 text-gray-800">
                              Change Payment Method
                            </h3>
                          </HeadlessRadioGroupItem>
                        )}
                      </RadioGroup>
                      )}
                    </div>
                  )}

                {pay === "AT_ONCE" &&
                  fullPaymentMethods.length > 0 &&
                  !hasSplitFullPayment && (
                    <div className="mt-6">
                      <div className="flex items-center justify-between">
                        <h3 className="text-base leading-[.703] font-bold text-dark-blue-400">
                          Payment Method
                        </h3>

                        {/* {SPLIT_ELIGIBLE_METHOD_TYPES.includes(
                          fullPaymentMethods[0].method
                        ) ? (
                          <Button
                            variant="link"
                            onClick={handleStartFullPaymentSplit}
                          >
                            <DivideSquare className="size-[15px]" />
                            Split Payment
                          </Button>
                        ) : null} */}
                      </div>

                      {isChangeCardPanelOpen ? (
                        <Card className="mt-5 flex-col items-stretch justify-center gap-5 p-5">
                          <div className="flex w-full items-center justify-between">
                            <h3 className="text-base font-bold leading-[.703] text-dark-blue-400">
                              Select a payment method
                            </h3>
                            <Button
                              className="gap-x-1 text-xs"
                              variant="link"
                              visual="primary"
                              type="button"
                              onClick={() => setIsChangeCardPanelOpen(false)}
                            >
                              <X className="size-[15px]" /> Cancel
                            </Button>
                          </div>

                          <div className="flex flex-col gap-y-2.5">
                            {savedCards.map((card) => {
                              const isSelectedCard =
                                fullPaymentMethods[0]?.id ===
                                `full-card-${card.id}`
                              return (
                                <Card
                                  key={card.id}
                                  className={cn(
                                    "p-[15px]",
                                    isSelectedCard
                                      ? "h-[65px] border-2 border-primary-500 pr-[25px]"
                                      : "h-[66px] border-gray-300 bg-gray-50"
                                  )}
                                >
                                  {renderSavedCardIdentity(
                                    card.brand,
                                    card.funding,
                                    card.last4,
                                    card.isDefault
                                  )}
                                  {isSelectedCard ? (
                                    <div className="inline-flex size-6 shrink-0 items-center justify-center rounded-full bg-primary-500">
                                      <Check className="size-[16.4px] text-white" />
                                    </div>
                                  ) : (
                                    <Button
                                      className="bg-white text-xs"
                                      variant="outlined"
                                      visual="gray"
                                      type="button"
                                      onClick={() =>
                                        handleSelectSavedCard(card)
                                      }
                                    >
                                      Use This
                                    </Button>
                                  )}
                                </Card>
                              )
                            })}
                          </div>

                          <Button
                            className="self-start text-xs"
                            variant="link"
                            visual="gray"
                            type="button"
                            onClick={() => {
                              setIsChangeCardPanelOpen(false)
                              handleEditPrimaryFullPaymentMethod("")
                            }}
                          >
                            <Plus className="size-[15px]" /> Add Payment Method
                          </Button>
                        </Card>
                      ) : (
                      <div className="mt-5">
                        {renderFullPaymentMethodRow(fullPaymentMethods[0], {
                          onChange: () => setIsChangeCardPanelOpen(true),
                          onEditCard: handleStartEditCard,
                          onDelete: () => {
                            const current = fullPaymentMethods[0]
                            setCardPendingDeletion({
                              id: current.id.replace("full-card-", ""),
                              label: `${
                                (current.brand &&
                                  SAVED_CARD_BRAND_NAMES[current.brand]) ||
                                "Credit Card"
                              } ${
                                current.funding === "debit" ? "Debit" : "Credit"
                              } ****${(current.cardNumber ?? "").slice(-4)}`,
                            })
                          },
                          onEdit: () =>
                            handleEditPrimaryFullPaymentMethod(
                              fullPaymentMethods[0].method === "BANK_ACCOUNT"
                                ? "item-1"
                                : fullPaymentMethods[0].method ===
                                    "WIRE_TRANSFER"
                                  ? "item-2"
                                  : fullPaymentMethods[0].method ===
                                      "GOOGLE_PAY"
                                    ? "item-3"
                                    : fullPaymentMethods[0].method ===
                                        "APPLE_PAY"
                                      ? "item-4"
                                      : fullPaymentMethods[0].method ===
                                          "KLARNA"
                                        ? "item-5"
                                        : "item-0"
                            ),
                          onRemove: () =>
                            handleRemoveFullPaymentMethod(
                              fullPaymentMethods[0].id
                            ),
                        })}
                      </div>
                      )}

                      <Dialog
                        open={cardPendingDeletion !== null}
                        onOpenChange={(open) => {
                          if (!open && !isDeletingCard) {
                            setCardPendingDeletion(null)
                          }
                        }}
                      >
                        <DialogContent className="max-w-[400px]">
                          <DialogHeader>
                            <div className="flex flex-col gap-y-2">
                              <DialogTitle>Remove Payment Method?</DialogTitle>
                              <DialogDescription>
                                Are you sure you want to remove{" "}
                                <span className="font-bold">
                                  {cardPendingDeletion?.label}
                                </span>{" "}
                                from your payment methods?
                              </DialogDescription>
                            </div>
                          </DialogHeader>

                          <DialogFooter className="mt-8 gap-x-3">
                            <DialogClose asChild>
                              <Button
                                variant="outlined"
                                visual="gray"
                                type="button"
                                disabled={isDeletingCard}
                              >
                                Cancel
                              </Button>
                            </DialogClose>
                            <Button
                              visual="error"
                              type="button"
                              loading={isDeletingCard}
                              onClick={handleConfirmDeleteCard}
                            >
                              Yes, Remove
                            </Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
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
                          onEdit: () =>
                            handleEditPrimaryFullPaymentMethod(
                              fullPaymentMethods[0].method === "BANK_ACCOUNT"
                                ? "item-1"
                                : fullPaymentMethods[0].method ===
                                    "WIRE_TRANSFER"
                                  ? "item-2"
                                  : fullPaymentMethods[0].method ===
                                      "GOOGLE_PAY"
                                    ? "item-3"
                                    : fullPaymentMethods[0].method ===
                                        "APPLE_PAY"
                                      ? "item-4"
                                      : fullPaymentMethods[0].method ===
                                          "KLARNA"
                                        ? "item-5"
                                        : "item-0"
                            ),
                          onRemove: () =>
                            handleRemoveFullPaymentMethod(
                              fullPaymentMethods[0].id
                            ),
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
                          <Switch
                            id="auto-split"
                            checked={isAutoSplitEnabled}
                            onCheckedChange={(checked) =>
                              setIsAutoSplitEnabled(Boolean(checked))
                            }
                          />
                        </div>
                      </div>

                      <div className="mt-5 space-y-2.5">
                        {fullPaymentMethods.map((method) => (
                          <React.Fragment key={method.id}>
                            {renderFullPaymentMethodRow(method, {
                              splitAmount: formatter.format(
                                getSplitMethodAmount(method.id)
                              ),
                              splitAmountValue:
                                splitPaymentAllocations[method.id] ??
                                formatEditableCurrencyValue(
                                  getSplitMethodAmount(method.id)
                                ),
                              isAutoSplitEnabled,
                              onSplitAmountChange: (value) => {
                                setSplitPaymentError("")
                                setSplitPaymentAllocations((current) => ({
                                  ...current,
                                  [method.id]: value,
                                }))
                              },
                              onEdit: () =>
                                handleEditPrimaryFullPaymentMethod(
                                  method.method === "CREDIT_DEBIT_CARD"
                                    ? "item-0"
                                    : method.method === "BANK_ACCOUNT"
                                      ? "item-1"
                                      : method.method === "WIRE_TRANSFER"
                                        ? "item-2"
                                        : method.method === "GOOGLE_PAY"
                                          ? "item-3"
                                          : method.method === "APPLE_PAY"
                                            ? "item-4"
                                            : "item-0"
                                ),
                              onRemove: () =>
                                handleRemoveFullPaymentMethod(method.id),
                            })}
                          </React.Fragment>
                        ))}
                      </div>

                      <div className="mt-4 flex items-start justify-between gap-x-4">
                        <div className="space-y-1 text-sm">
                          <p className="text-dark-blue-400">
                            <span className="font-semibold">
                              {formatter.format(
                                splitAllocatedAmount
                              )}
                            </span>{" "}
                            allocated of{" "}
                            <span className="font-semibold">
                              {formatter.format(
                                totalAmountToBePaid
                              )}
                            </span>
                          </p>
                          {(splitPaymentError ||
                            splitPaymentValidationMessage) && (
                            <p className="text-error-500">
                              {splitPaymentError ||
                                splitPaymentValidationMessage}
                            </p>
                          )}
                        </div>

                        {canAddAnotherSplitPaymentMethod ? (
                          <Button
                            className="shrink-0 text-xs"
                            variant="link"
                            visual="gray"
                            onClick={() => {
                              setPaymentMethod("")
                              setShowFullPaymentMethods(false)
                              setFullPaymentFlowPreservesSplit(true)
                              setSplitPaymentError("")
                              setShowSplitAddNewPaymentOptions(false)
                            }}
                          >
                            <Plus className="size-[15px]" /> Add Payment Method
                          </Button>
                        ) : null}
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
                            Split payment will be enabled once an additional
                            payment is added.
                          </p>
                        </div>

                        <Button
                          variant="link"
                          visual="primary"
                          onClick={() => {
                            setHasSplitFullPayment(false)
                            setShowFullPaymentMethods(false)
                            setPaymentMethod("")
                            setShowSplitAddNewPaymentOptions(false)
                            setSplitPaymentError("")
                          }}
                        >
                          <X className="size-[15px]" />
                          Cancel
                        </Button>
                      </div>

                      {splitPaymentError ? (
                        <p className="mt-4 text-sm text-error-500">
                          {splitPaymentError}
                        </p>
                      ) : null}

                      {!showSplitAddNewPaymentOptions &&
                      !paymentMethod &&
                      getAvailableSplitSavedPaymentMethods().length > 0 ? (
                        <div className="mt-5 rounded-lg border border-gray-200 bg-white p-4">
                          <h4 className="text-sm font-semibold text-dark-blue-400">
                            Saved payment methods
                          </h4>
                          <RadioGroup
                            className="mt-4 space-y-2"
                            value={selectedExistingInstallmentMethodId}
                            onValueChange={
                              setSelectedExistingInstallmentMethodId
                            }
                          >
                            {getAvailableSplitSavedPaymentMethods().map(
                              (method) =>
                                renderSavedPaymentMethodOption(method, () => {
                                  setFullPaymentFlowPreservesSplit(true)
                                  handleSelectExistingInstallmentMethod(method)
                                })
                            )}
                          </RadioGroup>

                          {availableSplitPaymentOptions.length > 0 ? (
                            <Button
                              className="mt-4 text-xs"
                              variant="link"
                              visual="gray"
                              onClick={() =>
                                setShowSplitAddNewPaymentOptions(true)
                              }
                            >
                              <Plus className="size-[15px]" /> Add Payment
                              Method
                            </Button>
                          ) : null}
                        </div>
                      ) : (
                        <RadioGroup
                          value={paymentMethod}
                          onValueChange={(value) => {
                            setSplitPaymentError("")
                            setPaymentMethod(value)
                          }}
                          className="mt-5 grid grid-cols-2 gap-3"
                        >
                          {(paymentMethod
                            ? availableSplitPaymentOptions.filter(
                                (method) => method.value === paymentMethod
                              )
                            : availableSplitPaymentOptions
                          ).map((method) => (
                            <HeadlessRadioGroupItem
                              value={method.value}
                              key={method.value}
                              className="group p-5 border relative shrink-0 border-gray-200 rounded-lg shadow-[0px_1px_2px_0px_rgba(0,0,0,0.03)] transition duration-300 hover:border-2 hover:border-gray-300 hover:p-[19px] focus-visible:outline-none data-[state=checked]:border-2 data-[state=checked]:border-primary-500 data-[state=checked]:p-[19px] data-[state=checked]:hover:border-primary-500 data-[state=checked]:hover:ring-4 data-[state=checked]:hover:ring-light-blue-700 data-[state=checked]:hover:shadow-none"
                            >
                              <div className="absolute transition inline-flex items-center justify-center duration-300 left-2 top-2 size-5 rounded-full border-[1.5px] border-primary-500 bg-primary-500 text-white group-hover:ring-4 group-hover:ring-light-blue-700 opacity-0 group-data-[state=checked]:opacity-100">
                                <Check className="size-3.5 shrink-0" />
                              </div>
                              <div className="gap-x-[3px] flex items-center justify-center [&>svg]:shrink-0">
                                {method.icons.map((icon) => icon)}
                              </div>
                              <h3 className="mt-3 text-sm font-medium text-gray-800 leading-5 text-center">
                                {method.title}
                              </h3>
                              <p className="text-sm mt-1 text-gray-500 leading-[normal] text-center whitespace-pre-line">
                                {method.desc}
                              </p>
                            </HeadlessRadioGroupItem>
                          ))}
                          {paymentMethod && (
                            <HeadlessRadioGroupItem
                              value=""
                              className="group p-[25px] border relative shrink-0 border-gray-200 rounded-lg shadow-[0px_1px_2px_0px_rgba(0,0,0,0.03)] transition duration-300 hover:border-2 hover:border-gray-300 hover:p-6 focus-visible:outline-none"
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
                      )}
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
                        <Button
                          variant="outlined"
                          visual="gray"
                          disabled={!wireTransferDetails}
                          onClick={() =>
                            wireTransferDetails &&
                            downloadWireTransferFile(
                              `marketeq-wire-invoice-${wireTransferDetails.referenceCode}.txt`,
                              wireTransferDetails
                            )
                          }
                        >
                          <Download02 className="size-[15px]" /> Download
                          Invoice
                        </Button>
                      </div>

                      {isWireTransferLoading ? (
                        <div className="mt-6 rounded-lg border border-gray-200 bg-white p-6 shadow-[0px_1px_4px_0px_rgba(0,0,0,.03)]">
                          <div className="h-5 w-48 rounded bg-gray-100" />
                          <div className="mt-6 space-y-3">
                            {[0, 1, 2, 3, 4, 5].map((item) => (
                              <div
                                key={item}
                                className="h-12 rounded bg-gray-50"
                              />
                            ))}
                          </div>
                        </div>
                      ) : wireTransferError && !wireTransferDetails ? (
                        <Alert className="mt-6 border-error-200 bg-error-50">
                          <AlertIcon>
                            <AlertCircle className="size-5" />
                          </AlertIcon>
                          <AlertContent>
                            <AlertTitle>
                              We were unable to load your wire transfer details
                            </AlertTitle>
                            <AlertDescription>
                              {wireTransferError}
                              <Button
                                className="ml-2"
                                variant="link"
                                onClick={() => void loadWireTransferDetails()}
                              >
                                Try again
                              </Button>
                            </AlertDescription>
                          </AlertContent>
                        </Alert>
                      ) : wireTransferDetails ? (
                        <>
                          <div className="mt-6 border border-gray-200 shadow-[0px_1px_4px_0px_rgba(0,0,0,.03)] bg-white rounded-lg">
                            <Tabs
                              value={wireTransferType}
                              onValueChange={(value) =>
                                setWireTransferType(
                                  value as
                                    | "Domestic Transfer"
                                    | "International Transfer"
                                )
                              }
                            >
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
                                {wireTransferType === "Domestic Transfer"
                                  ? "Domestic wire transfers typically take 1 to 2 business days to receive."
                                  : "International wire transfers can take up to 5 business days to receive."}
                              </span>
                            </div>

                            <Table>
                              <TableBody className="[&_tr:last-child]:rounded-b-lg [&_td]:[&_tr:last-child]:rounded-b-lg">
                                {[
                                  {
                                    label: "Account Number:",
                                    value:
                                      wireTransferDetails.wireInstructions
                                        .accountNumber,
                                  },
                                  ...(wireTransferType === "Domestic Transfer"
                                    ? [
                                        {
                                          label: "Routing Number:",
                                          value:
                                            wireTransferDetails.wireInstructions
                                              .routingNumber,
                                        },
                                      ]
                                    : [
                                        {
                                          label: "SWIFT Code:",
                                          value:
                                            wireTransferDetails.wireInstructions
                                              .swiftCode,
                                        },
                                      ]),
                                  {
                                    label: "Account Name:",
                                    value:
                                      wireTransferDetails.wireInstructions
                                        .accountName,
                                  },
                                  {
                                    label: "Bank Name:",
                                    value:
                                      wireTransferDetails.wireInstructions
                                        .bankName,
                                  },
                                  {
                                    label: "Bank Address:",
                                    value:
                                      wireTransferDetails.wireInstructions
                                        .bankAddress,
                                  },
                                  {
                                    label: "Remark:",
                                    value: wireTransferDetails.referenceCode,
                                  },
                                ].map((row) => (
                                  <TableRow
                                    key={row.label}
                                    className="odd:bg-gray-25 even:bg-white hover:even:bg-white hover:odd:bg-gray-25 border-gray-200"
                                  >
                                    <TableCell className="py-4 border-r border-gray-200 px-6 whitespace-nowrap">
                                      {row.label}
                                    </TableCell>
                                    <TableCell className="font-semibold py-4 px-6 text-gray-950">
                                      {row.label === "Remark:" ? (
                                        <div className="flex items-center gap-x-6">
                                          #{row.value}
                                          <div className="inline-flex flex-auto items-center gap-x-2">
                                            <ArrowLeft className="size-4 text-gray-500" />
                                            <span className="text-sm font-normal whitespace-nowrap text-gray-500">
                                              Please attach this order number
                                            </span>
                                          </div>
                                        </div>
                                      ) : (
                                        row.value
                                      )}
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </div>
                        </>
                      ) : null}
                    </div>

                    {/* Steps to complete wire transfer */}
                    <div className="mt-[50px]">
                      <div className="flex justify-between items-end">
                        <h1 className="text-lg font-bold text-dark-blue-400 leading-none">
                          Steps to complete your wire transfer
                        </h1>
                        <Button
                          variant="outlined"
                          visual="gray"
                          disabled={!wireTransferDetails}
                          onClick={() =>
                            wireTransferDetails &&
                            downloadWireTransferFile(
                              `marketeq-wire-instructions-${wireTransferDetails.referenceCode}.txt`,
                              wireTransferDetails
                            )
                          }
                        >
                          <Download02 className="size-[15px]" /> Download
                          Instructions
                        </Button>
                      </div>

                      <div className="mt-8">
                        <div className="pl-2.5">
                          <div className="gap-x-6 pb-[25px] relative flex items-start">
                            <div className="inline-block">
                              <div className="size-8 rounded-full shrink-0 border border-primary-500 text-primary-500 text-sm leading-none font-semibold inline-flex items-center justify-center">
                                1
                              </div>
                              <span className="block w-0.5 absolute bottom-[5px] top-[37px] left-[15px] bg-gray-200" />
                            </div>
                            <div className="flex-auto space-y-2 pt-[7px]">
                              <h3 className="text-sm text-dark-blue-400 leading-[18px]">
                                Select your preferred transfer method (Domestic
                                or International).
                              </h3>
                            </div>
                          </div>
                        </div>
                        <div className="pl-2.5">
                          <div className="gap-x-6 pb-[25px] relative flex items-start">
                            <div className="inline-block">
                              <div className="size-8 rounded-full shrink-0 border border-primary-500 text-primary-500 text-sm leading-none font-semibold inline-flex items-center justify-center">
                                2
                              </div>
                              <span className="block w-0.5 absolute bottom-[5px] top-[37px] left-[15px] bg-gray-200" />
                            </div>
                            <div className="flex-auto space-y-2">
                              <h3 className="text-sm text-dark-blue-400 leading-[18px]">
                                Download and attach your invoice and proceed
                                with your payment using the bank account details
                                provided.
                              </h3>
                              <h3 className="text-sm text-dark-blue-400 leading-[18px]">
                                <span className="font-semibold">NOTE:</span>{" "}
                                Please mention your{" "}
                                <span className="font-semibold">
                                  project title
                                </span>{" "}
                                and{" "}
                                <span className="font-semibold">
                                  order number
                                </span>{" "}
                                in the reference area to help us identify your
                                payment
                              </h3>
                            </div>
                          </div>
                        </div>
                        <div className="pl-2.5">
                          <div className="gap-x-6 pb-[25px] relative flex items-start">
                            <div className="inline-block">
                              <div className="size-8 rounded-full shrink-0 border border-primary-500 text-primary-500 text-sm leading-none font-semibold inline-flex items-center justify-center">
                                3
                              </div>
                            </div>
                            <div className="flex-auto space-y-2">
                              <h3 className="text-sm text-dark-blue-400 leading-[18px]">
                                Upload the payment receipt or proof of your
                                transaction. This helps us process your payment
                                faster and keep everything on track.
                              </h3>
                              <h3 className="text-sm text-dark-blue-400 leading-[18px]">
                                <span className="font-semibold">NOTE:</span> You
                                will able to upload your wire transfer receipt
                                after you submit your order.
                              </h3>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {wireTransferError && wireTransferDetails ? (
                      <Alert className="mt-5 border-error-200 bg-error-50">
                        <AlertIcon>
                          <AlertCircle className="size-5" />
                        </AlertIcon>
                        <AlertContent>
                          <AlertTitle>Wire transfer action failed</AlertTitle>
                          <AlertDescription>
                            {wireTransferError}
                          </AlertDescription>
                        </AlertContent>
                      </Alert>
                    ) : null}

                    <div className="mt-6 flex items-start gap-x-3 rounded-lg border border-gray-200 bg-white p-4">
                      <Checkbox
                        id="wire-transfer-confirmed"
                        checked={wireTransferConfirmed}
                        onCheckedChange={(value) =>
                          setWireTransferConfirmed(value === true)
                        }
                      />
                      <Label
                        htmlFor="wire-transfer-confirmed"
                        className="text-sm font-normal leading-5 text-dark-blue-400"
                      >
                        I have initiated this wire transfer through my bank and
                        included the reference number shown above.
                      </Label>
                    </div>

                    <div className="mt-[26px]">
                      <div className="flex items-center gap-x-2">
                        <Button
                          variant="outlined"
                          visual="gray"
                          onClick={() => setPaymentMethod("")}
                        >
                          Cancel
                        </Button>
                        <Button
                          onClick={handleSaveFullPaymentWire}
                          disabled={
                            !wireTransferDetails ||
                            !wireTransferConfirmed ||
                            isWireTransferSubmitting
                          }
                          className="bg-primary-50 text-primary-500 hover:bg-primary-500 hover:text-white disabled:text-primary-300"
                        >
                          {isWireTransferSubmitting
                            ? "Saving..."
                            : "Save Payment Method"}
                        </Button>
                      </div>
                      <div className="mt-3.5">
                        <span className="text-xs font-light text-dark-blue-400">
                          By adding sending your wire transfer, you agree to
                          Marketeq&apos;s{" "}
                          <Button variant="link">Terms and Conditions</Button>
                        </span>
                      </div>
                    </div>
                  </>
                )}

                {/* Wire Transfer Saved */}
                {isWireTransfer && paymentMethod === "item-2" && (
                  <div className="mt-6">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg leading-none font-bold text-dark-blue-400">
                        Payment Method
                      </h3>
                    </div>
                    <div className="mt-5">
                      <div className="rounded-lg bg-white border border-gray-200 p-[15px] flex items-center justify-between">
                        <div className="flex items-center gap-x-3">
                          <div className="inline-flex items-center shrink-0 justify-center w-[46.5px] h-[31px]">
                            <WireTransferIcon />
                          </div>
                          <div className="inline-flex flex-col gap-y-1">
                            <span className="inline-block text-sm text-dark-blue-400">
                              {wireTransferType}
                            </span>
                            <span className="inline-block text-xs text-[#858585] leading-none">
                              {wireTransferDetails
                                ? `Reference ${wireTransferDetails.referenceCode}`
                                : "Wire transfer pending confirmation"}
                            </span>
                          </div>
                        </div>
                        <Button
                          variant="link"
                          visual="gray"
                          onClick={() => setIsWireTransfer(false)}
                        >
                          Edit
                        </Button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Google Pay */}
                {paymentMethod === "item-3" && !hasGooglePayPaymentMethod && (
                  <div className="mt-6 rounded-lg border border-gray-200 bg-white p-6 shadow-[0px_1px_4px_0px_rgba(0,0,0,.03)]">
                    <div className="flex items-center gap-x-3">
                      <GPay1 className="h-[31px] w-[46.5px] shrink-0" />
                      <h3 className="text-base font-semibold text-dark-blue-400">
                        Google Pay selected for checkout
                      </h3>
                    </div>

                    <div className="mt-5 flex items-center justify-between border-y border-gray-200 py-4">
                      <span className="text-sm text-gray-500">Amount due</span>
                      <span className="text-xl font-bold text-dark-blue-400">
                        {formatter.format(totalAmountToBePaid)}
                      </span>
                    </div>

                    <div className="mt-6 flex items-start gap-x-4">
                      <div className="mt-0.5 flex size-10 shrink-0 items-center justify-center rounded border border-gray-200 bg-gray-50 text-gray-400">
                        <GPay1 className="h-5 w-8" />
                      </div>
                      <div className="flex-auto">
                        <p className="max-w-[580px] text-sm leading-5 text-dark-blue-400">
                          After submitting your order you will be redirected to
                          Google Pay Window. Follow the instruction in google
                          pay window to complete your payment.
                        </p>

                        {requiresGooglePayAuthorization ? (
                          <div className="mt-5 flex items-start gap-x-3 rounded-lg border border-gray-200 bg-gray-25 p-4">
                            <Checkbox
                              id="google-pay-authorization"
                              checked={hasAcceptedGooglePayAuthorization}
                              onCheckedChange={(value) =>
                                setHasAcceptedGooglePayAuthorization(
                                  value === true
                                )
                              }
                            />
                            <Label
                              htmlFor="google-pay-authorization"
                              className="text-sm font-normal leading-5 text-dark-blue-400"
                            >
                              I authorize Marketeq to charge my selected payment
                              method for the amount shown above
                            </Label>
                          </div>
                        ) : null}

                        {googlePayError ? (
                          <Alert className="mt-5 border-error-200 bg-error-50">
                            <AlertIcon>
                              <AlertCircle className="size-5" />
                            </AlertIcon>
                            <AlertContent>
                              <AlertTitle>Google Pay is unavailable</AlertTitle>
                              <AlertDescription>
                                {googlePayError}
                              </AlertDescription>
                            </AlertContent>
                          </Alert>
                        ) : null}

                        <Button
                          className="mt-6 bg-black text-white hover:bg-gray-900 disabled:bg-gray-300 disabled:text-white"
                          onClick={handleGooglePayCheckout}
                          disabled={
                            isGooglePayButtonDisabled ||
                            googlePayAvailability === "unknown"
                          }
                        >
                          {isGooglePayProcessing
                            ? "Opening Google Pay..."
                            : "Continue with Google Pay"}
                          <GPay1 className="h-[18px] w-[31px]" />
                        </Button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Apple Pay */}
                {paymentMethod === "item-4" && !hasApplePayPaymentMethod && (
                  <div className="mt-6 rounded-lg border border-gray-200 bg-white p-6 shadow-[0px_1px_4px_0px_rgba(0,0,0,.03)]">
                    <div className="flex items-center gap-x-3">
                      <ApplePay1 className="h-[31px] w-[46.5px] shrink-0" />
                      <h3 className="text-base font-semibold text-dark-blue-400">
                        Apple Pay selected for checkout
                      </h3>
                    </div>

                    <div className="mt-5 flex items-center justify-between border-y border-gray-200 py-4">
                      <span className="text-sm text-gray-500">Amount due</span>
                      <span className="text-xl font-bold text-dark-blue-400">
                        {formatter.format(totalAmountToBePaid)}
                      </span>
                    </div>

                    <div className="mt-6 flex items-start gap-x-4">
                      <div className="mt-0.5 flex size-10 shrink-0 items-center justify-center rounded border border-gray-200 bg-gray-50 text-gray-400">
                        <ApplePay1 className="h-5 w-8" />
                      </div>
                      <div className="flex-auto">
                        <p className="max-w-[580px] text-sm leading-5 text-dark-blue-400">
                          After submitting your order you will be redirected to
                          Apple Pay Window. Follow the instruction in Apple pay
                          window to complete your payment.
                        </p>

                        {requiresApplePayAuthorization ? (
                          <div className="mt-5 flex items-start gap-x-3 rounded-lg border border-gray-200 bg-gray-25 p-4">
                            <Checkbox
                              id="apple-pay-authorization"
                              checked={hasAcceptedApplePayAuthorization}
                              onCheckedChange={(value) =>
                                setHasAcceptedApplePayAuthorization(
                                  value === true
                                )
                              }
                            />
                            <Label
                              htmlFor="apple-pay-authorization"
                              className="text-sm font-normal leading-5 text-dark-blue-400"
                            >
                              I authorize Marketeq to charge my selected payment
                              method for the amount shown above
                            </Label>
                          </div>
                        ) : null}

                        {applePayError ? (
                          <Alert className="mt-5 border-error-200 bg-error-50">
                            <AlertIcon>
                              <AlertCircle className="size-5" />
                            </AlertIcon>
                            <AlertContent>
                              <AlertTitle>Apple Pay is unavailable</AlertTitle>
                              <AlertDescription>
                                {applePayError}
                              </AlertDescription>
                            </AlertContent>
                          </Alert>
                        ) : null}

                        <Button
                          className="mt-6 bg-black text-white hover:bg-gray-900 disabled:bg-gray-300 disabled:text-white"
                          onClick={handleApplePayCheckout}
                          disabled={
                            isApplePayButtonDisabled ||
                            applePayAvailability === "unknown"
                          }
                        >
                          {isApplePayProcessing
                            ? "Opening Apple Pay..."
                            : "Continue with Apple Pay"}
                          <ApplePay1 className="h-[18px] w-[31px]" />
                        </Button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Klarna */}
                {paymentMethod === "item-5" && !hasKlarnaPaymentMethod && (
                  <div className="mt-6 rounded-lg border border-gray-200 bg-white p-6 shadow-[0px_1px_4px_0px_rgba(0,0,0,.03)]">
                    <div className="flex items-center gap-x-4">
                      <Klarna className="h-12 w-[70px] shrink-0" />
                      <div>
                        <h3 className="text-xl font-bold leading-7 text-dark-blue-400">
                          Pay over time with Klarna
                        </h3>
                        <p className="text-sm leading-5 text-gray-500">
                          4 interest-free payments of{" "}
                          {formatter.format(
                            totalAmountToBePaid / 4
                          )}
                          .{" "}
                          <Button
                            className="h-auto p-0 align-baseline text-sm underline"
                            variant="link"
                            type="button"
                          >
                            Learn More
                          </Button>
                        </p>
                      </div>
                    </div>

                    <div className="mt-6 grid grid-cols-2 gap-3 border-y border-gray-200 py-5">
                      <div className="rounded-lg border border-gray-200 bg-gray-25 p-4">
                        <span className="text-xs font-light text-gray-500">
                          Total through Klarna
                        </span>
                        <h4 className="mt-2 text-lg font-bold text-dark-blue-400">
                          {formatter.format(
                            totalAmountToBePaid
                          )}
                        </h4>
                      </div>
                      <div className="rounded-lg border border-gray-200 bg-gray-25 p-4">
                        <span className="text-xs font-light text-gray-500">
                          Split payment
                        </span>
                        <h4 className="mt-2 text-lg font-bold text-dark-blue-400">
                          Not available with Klarna
                        </h4>
                      </div>
                    </div>

                    <div className="mt-6 flex items-start gap-x-4">
                      <div className="mt-0.5 flex size-10 shrink-0 items-center justify-center rounded border border-gray-200 bg-gray-50 text-gray-400">
                        <ArrowLeft className="size-5 rotate-180" />
                      </div>
                      <div className="flex-auto">
                        <p className="max-w-[580px] text-sm leading-5 text-dark-blue-400">
                          After submitting your order you will be redirected to
                          Klarna. Follow the instruction in Klarna window to
                          complete your payment securely.
                        </p>
                        <p className="mt-3 max-w-[580px] text-xs leading-5 text-gray-500">
                          Klarna manages payment reminders, missed payments, and
                          installment servicing directly after authorization.
                        </p>

                        {klarnaError ? (
                          <Alert className="mt-5 border-error-200 bg-error-50">
                            <AlertIcon>
                              <AlertCircle className="size-5" />
                            </AlertIcon>
                            <AlertContent>
                              <AlertTitle>Klarna is unavailable</AlertTitle>
                              <AlertDescription>{klarnaError}</AlertDescription>
                            </AlertContent>
                          </Alert>
                        ) : null}

                        <Button
                          className="mt-6 bg-black text-white hover:bg-gray-900 disabled:bg-gray-300 disabled:text-white"
                          onClick={handleKlarnaCheckout}
                          disabled={isKlarnaProcessing}
                        >
                          {isKlarnaProcessing
                            ? "Opening Klarna..."
                            : "Continue with Klarna"}
                        </Button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Credit / Debit Card Form */}
                {shouldShowFullPaymentCardForm && (() => {
                  const cardForm = (
                  <div className={editingCard ? undefined : "mt-[50px]"}>
                    {editingCard ? null : (
                    <>
                    <div className="flex items-start justify-between">
                      <h1 className="text-lg leading-[22px] font-bold text-dark-blue-400">
                        {editingCard
                          ? "Change Your Credit / Debit Card"
                          : "Add Your Credit / Debit Card"}
                      </h1>
                      {editingCard ? (
                        <Button
                          className="gap-x-1 text-xs"
                          variant="link"
                          visual="primary"
                          type="button"
                          onClick={handleCancelEditCard}
                        >
                          <X className="size-[15px]" /> Cancel
                        </Button>
                      ) : null}
                    </div>
                    <p className="mt-3 text-gray-500 text-xs leading-none flex items-center gap-x-1">
                      <Lock className="size-4" /> Your payment is secure. Your
                      card details will not be shared.
                    </p>
                    </>
                    )}

                    {stripeLoadFailed || !isStripePublishableKeyConfigured ? (
                      <Alert className="mt-4 border-error-200 bg-error-50">
                        <AlertIcon>
                          <AlertCircle className="size-5" />
                        </AlertIcon>
                        <AlertContent>
                          <AlertTitle>
                            Secure card entry couldn&apos;t load.
                          </AlertTitle>
                          <AlertDescription>
                            {isStripePublishableKeyConfigured
                              ? "We couldn't reach Stripe to load the card form. An ad blocker or privacy extension is the usual cause. Allow js.stripe.com and try again, or use another payment method below."
                              : "Stripe is not configured for this environment. Add NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY to enable card entry."}
                          </AlertDescription>
                          {isStripePublishableKeyConfigured ? (
                            <Button
                              type="button"
                              variant="link"
                              className="mt-2 h-auto p-0 text-sm"
                              onClick={() =>
                                setStripeLoadAttempt((attempt) => attempt + 1)
                              }
                            >
                              Try again
                            </Button>
                          ) : null}
                        </AlertContent>
                      </Alert>
                    ) : null}

                    <div className={cn("space-y-3", !editingCard && "mt-6")}>
                      <div className="space-y-1.5">
                        <Label
                          size="sm"
                          htmlFor="card-number"
                          className="text-gray-700"
                        >
                          Card Number
                        </Label>
                        <InputGroup>
                          {editingCard ? (
                            <Input
                              id="card-number"
                              type="text"
                              value={`**** **** **** ${editingCard.last4}`}
                              readOnly
                              disabled
                              className="pl-[52px]"
                              aria-invalid={shouldShowCardFieldError(
                                "cardNumber"
                              )}
                              isInvalid={shouldShowCardFieldError("cardNumber")}
                            />
                          ) : (
                            <div
                              id="card-number"
                              ref={stripeCardNumberMountRef}
                              aria-invalid={shouldShowCardFieldError(
                                "cardNumber"
                              )}
                              className={getStripeFieldClassName(
                                "cardNumber",
                                "pl-[52px]"
                              )}
                            />
                          )}
                          <InputLeftElement className="w-[52px]">
                            {StripeCardBrandIcon ? (
                              <StripeCardBrandIcon />
                            ) : (
                              <div className="inline-flex h-6 w-[34px] shrink-0 items-center justify-center rounded border border-gray-100 bg-white text-gray-500">
                                <CreditCard className="size-4" />
                              </div>
                            )}
                          </InputLeftElement>
                        </InputGroup>
                        {shouldShowCardFieldError("cardNumber") ? (
                          <span className="block text-xs leading-5 text-error-500">
                            {cardFieldErrors.cardNumber}
                          </span>
                        ) : null}
                      </div>

                      <div className="space-y-1.5">
                        <Label
                          size="sm"
                          htmlFor="name-on-card"
                          className="text-gray-700"
                        >
                          Name On Card
                        </Label>
                        <Input
                          id="name-on-card"
                          type="text"
                          placeholder="John Doe"
                          value={cardName}
                          onFocus={() => setActiveCardField("cardName")}
                          onChange={(e) =>
                            setCardName(
                              e.target.value.replace(/[^A-Za-z ]/g, "")
                            )
                          }
                          onBlur={() =>
                            setCardFieldTouched((current) => ({
                              ...current,
                              cardName: true,
                            }))
                          }
                          aria-invalid={shouldShowCardFieldError("cardName")}
                          isInvalid={shouldShowCardFieldError("cardName")}
                        />
                        {shouldShowCardFieldError("cardName") ? (
                          <span className="block text-xs leading-5 text-error-500">
                            {cardNameError}
                          </span>
                        ) : null}
                      </div>

                      <div className="grid grid-cols-2 gap-x-3">
                        <div className="space-y-1.5">
                          <Label
                            size="sm"
                            htmlFor="expiration-date"
                            className="text-gray-700"
                          >
                            Expiration Date
                          </Label>
                          {editingCard ? (
                            <Input
                              id="expiration-date"
                              type="text"
                              inputMode="numeric"
                              placeholder="MM/YY"
                              value={expirationDate}
                              maxLength={5}
                              onFocus={() => setActiveCardField("expirationDate")}
                              onChange={(e) =>
                                setExpirationDate(
                                  formatExpiryInput(
                                    e.target.value.replace(/\D/g, "").slice(0, 4)
                                  )
                                )
                              }
                              onBlur={() =>
                                setCardFieldTouched((current) => ({
                                  ...current,
                                  expirationDate: true,
                                }))
                              }
                              aria-invalid={shouldShowCardFieldError(
                                "expirationDate"
                              )}
                              isInvalid={shouldShowCardFieldError(
                                "expirationDate"
                              )}
                            />
                          ) : (
                            <div
                              id="expiration-date"
                              ref={stripeCardExpiryMountRef}
                              aria-invalid={shouldShowCardFieldError(
                                "expirationDate"
                              )}
                              className={getStripeFieldClassName(
                                "expirationDate"
                              )}
                            />
                          )}
                          {shouldShowCardFieldError("expirationDate") ? (
                            <span className="block text-xs leading-5 text-error-500">
                              {cardFieldErrors.expirationDate}
                            </span>
                          ) : null}
                        </div>

                        <div className="space-y-1.5">
                          <Label
                            size="sm"
                            htmlFor="cvv-cvc"
                            className="text-gray-700"
                          >
                            CVV / CVC
                          </Label>
                          <InputGroup>
                            <div
                              id="cvv-cvc"
                              ref={stripeCardCvcMountRef}
                              aria-invalid={shouldShowCardFieldError("cvv")}
                              className={getStripeFieldClassName(
                                "cvv",
                                "pr-[38px]"
                              )}
                            />
                            <InputRightElement>
                              <TooltipProvider delayDuration={75}>
                                <Tooltip>
                                  <TooltipTrigger className="focus-visible:outline-none">
                                    <HelpCircle className="text-gray-500 h-4 w-4" />
                                  </TooltipTrigger>
                                  <TooltipContent
                                    className="max-w-[139px] font-semibold"
                                    visual="gray"
                                  >
                                    3-4 digit code on the back of your card
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            </InputRightElement>
                          </InputGroup>
                          {shouldShowCardFieldError("cvv") ? (
                            <span className="block text-xs leading-5 text-error-500">
                              {stripeCvvError}
                            </span>
                          ) : null}
                        </div>
                      </div>
                    </div>

                    <div className="mt-3 flex items-center gap-x-3 p-2.5">
                      <Checkbox
                        size="md"
                        id="save-default-payment-method"
                        checked={saveCard}
                        onCheckedChange={(v) => setSaveCard(v === true)}
                      />
                      <Label size="sm" htmlFor="save-default-payment-method">
                        Save as default payment method
                      </Label>
                    </div>

                    {paymentError ? (
                      <Alert className="mt-5 border-error-200 bg-error-50">
                        <AlertIcon>
                          <AlertCircle className="size-5" />
                        </AlertIcon>
                        <AlertContent>
                          <AlertTitle>
                            Payment could not be completed
                          </AlertTitle>
                          <AlertDescription>{paymentError}</AlertDescription>
                        </AlertContent>
                      </Alert>
                    ) : null}

                    {/* Billing Address */}
                    <div className="mt-[50px]">
                      <div className="flex items-end justify-between">
                        <h3 className="text-lg leading-[22px] font-bold text-dark-blue-400">
                          Billing Address
                        </h3>
                        {billingAddressMode === "new" ? (
                          <Button
                            className="text-xs leading-5 underline"
                            variant="link"
                            disabled={!hasSavedBillingAddresses}
                            onClick={() => {
                              clearNewBillingAddressFields()
                              setBillingAddressMode("saved")
                            }}
                          >
                            Use a Saved Address
                          </Button>
                        ) : null}
                      </div>

                      {billingAddressMode === "summary" ? (
                        <div className="mt-6 rounded-[7px] border-2 border-gray-200 bg-white py-6 pl-6 pr-[35px]">
                          <div className="flex items-center justify-between gap-x-6">
                            <div className="space-y-1 text-base leading-5 text-[#122A4B]">
                              <p className="font-semibold">
                                {billingAddressSummary.fullName}
                              </p>
                              <div>
                                <p>{billingAddressSummary.addressLine1}</p>
                                <p>{billingAddressSummary.cityStateZip}</p>
                                <p>{billingAddressSummary.country}</p>
                                <p>{billingAddressSummary.phoneNumber}</p>
                              </div>
                            </div>
                            <Button
                              className="text-xs"
                              variant="outlined"
                              visual="gray"
                              onClick={() => setBillingAddressMode("saved")}
                            >
                              Change Address
                            </Button>
                          </div>
                        </div>
                      ) : null}

                      {billingAddressMode === "saved" ? (
                        <div className="mt-3">
                          <p className="text-xs text-gray-500">
                            Please choose a billing address from your address
                            book below, or{" "}
                            <button
                              type="button"
                              className="text-xs font-semibold leading-5 text-primary-500 underline"
                              onClick={() => setBillingAddressMode("new")}
                            >
                              add a new billing address
                            </button>
                          </p>
                          <RadioGroup
                            className="mt-6 gap-y-2"
                            value={selectedBillingAddressId}
                            onValueChange={setSelectedBillingAddressId}
                          >
                            {savedBillingAddresses.map((address) => (
                              <HeadlessRadioGroupItem
                                key={address.id}
                                value={address.id}
                                className="group flex w-full items-center gap-x-5 rounded-[7px] border-2 border-transparent px-[18px] py-2.5 text-left text-sm leading-[18px] text-gray-500 focus-visible:outline-none data-[state=checked]:border-primary-500"
                              >
                                <span className="inline-flex size-4 flex-none items-center justify-center rounded-full border-[1.5px] border-gray-300 group-data-[state=checked]:border-primary-500 group-data-[state=checked]:ring-4 group-data-[state=checked]:ring-primary-50">
                                  <span className="hidden size-1.5 rounded-full bg-primary-500 group-data-[state=checked]:block" />
                                </span>
                                <span>
                                  <span className="font-semibold text-gray-800">
                                    {address.fullName},
                                  </span>{" "}
                                  {address.line}
                                </span>
                              </HeadlessRadioGroupItem>
                            ))}
                          </RadioGroup>
                          <div className="mt-6 flex items-center gap-x-3">
                            <Button
                              className="text-xs"
                              variant="light"
                              onClick={() => setBillingAddressMode("summary")}
                            >
                              Use This Address
                            </Button>
                            <Button
                              className="text-xs"
                              variant="outlined"
                              visual="gray"
                              onClick={() => setBillingAddressMode("new")}
                            >
                              <Plus className="size-[15px]" />
                              New Address
                            </Button>
                          </div>
                        </div>
                      ) : null}

                      {billingAddressMode === "new" ? (
                        <form
                          className="mt-6 space-y-3"
                          onSubmit={(e) => e.preventDefault()}
                        >
                          <div className="space-y-1.5">
                            <Label
                              size="sm"
                              htmlFor="full-name"
                              className="text-gray-700"
                            >
                              Full Name
                            </Label>
                            <Input
                              placeholder="John Doe"
                              id="full-name"
                              name="name"
                              autoComplete="name"
                              value={fullName}
                              onChange={(e) => setFullName(e.target.value)}
                              onBlur={() => touchBillingField("fullName")}
                              isInvalid={shouldShowBillingFieldError("fullName")}
                            />
                            {shouldShowBillingFieldError("fullName") ? (
                              <span className="block text-xs leading-5 text-error-500">
                                {billingFieldErrors.fullName}
                              </span>
                            ) : null}
                          </div>
                          <div className="space-y-1.5">
                            <Label
                              size="sm"
                              htmlFor="address-line-1"
                              className="text-gray-700"
                            >
                              Address Line 1
                            </Label>
                            <Input
                              placeholder="Street Address or P.O. Box"
                              id="address-line-1"
                              name="address-line1"
                              autoComplete="address-line1"
                              value={addressLine1}
                              onChange={(e) => setAddressLine1(e.target.value)}
                              onBlur={() => touchBillingField("addressLine1")}
                              isInvalid={shouldShowBillingFieldError(
                                "addressLine1"
                              )}
                            />
                            {shouldShowBillingFieldError("addressLine1") ? (
                              <span className="block text-xs leading-5 text-error-500">
                                {billingFieldErrors.addressLine1}
                              </span>
                            ) : null}
                          </div>
                          <div className="space-y-1.5">
                            <Label
                              size="sm"
                              htmlFor="address-line-2"
                              className="text-gray-700"
                            >
                              Address Line 2
                            </Label>
                            <Input
                              placeholder="Apt, Suite, Unit, or Building #"
                              id="address-line-2"
                              name="address-line2"
                              autoComplete="address-line2"
                              value={addressLine2}
                              onChange={(e) => setAddressLine2(e.target.value)}
                            />
                          </div>
                          <div className="space-y-1.5">
                            <Label size="sm" className="text-gray-700">
                              Country
                            </Label>
                            <CountriesCombobox
                              value={billingCountry}
                              placeholder="Select"
                              onValueChange={(country) => {
                                setBillingCountry(country)
                                if (country !== "United States") {
                                  setBillingState("")
                                }
                                touchBillingField("country")
                              }}
                              triggerClassName={cn(
                                "h-11 w-full justify-start gap-x-2 border-solid border-gray-300 bg-white px-[14px] py-3 shadow-xs [&>svg]:ml-auto [&>svg]:inline-block [&_span.truncate]:max-w-none [&_span.truncate]:text-base [&_span.truncate]:font-normal [&_span.truncate]:leading-normal [&_span.truncate]:text-gray-black",
                                shouldShowBillingFieldError("country") &&
                                  "border-error-300"
                              )}
                              contentClassName="w-[var(--radix-popover-trigger-width)]"
                              contentSideOffset={4}
                            />
                            {shouldShowBillingFieldError("country") ? (
                              <span className="block text-xs leading-5 text-error-500">
                                {billingFieldErrors.country}
                              </span>
                            ) : null}
                          </div>
                          <div
                            className={cn(
                              "gap-x-3 grid",
                              isUnitedStatesBilling
                                ? "grid-cols-3"
                                : "grid-cols-2"
                            )}
                          >
                            <div className="space-y-1.5">
                              <Label
                                size="sm"
                                htmlFor="city"
                                className="text-gray-700"
                              >
                                City
                              </Label>
                              <Input
                                placeholder="Marketown"
                                id="city"
                                name="city"
                                autoComplete="address-level2"
                                value={city}
                                onChange={(e) => setCity(e.target.value)}
                                onBlur={() => touchBillingField("city")}
                                isInvalid={shouldShowBillingFieldError("city")}
                              />
                              {shouldShowBillingFieldError("city") ? (
                                <span className="block text-xs leading-5 text-error-500">
                                  {billingFieldErrors.city}
                                </span>
                              ) : null}
                            </div>
                            {isUnitedStatesBilling ? (
                            <div className="space-y-1.5">
                              <Label
                                size="sm"
                                htmlFor="state"
                                className="text-gray-700"
                              >
                                State
                              </Label>
                              <Select
                                name="state"
                                autoComplete="address-level1"
                                value={billingState}
                                onValueChange={setBillingState}
                                onOpenChange={(open) => {
                                  if (!open) touchBillingField("state")
                                }}
                              >
                                <SelectTrigger
                                  id="state"
                                  invalid={shouldShowBillingFieldError("state")}
                                  className={cn(
                                    "w-full text-base shadow-xs",
                                    shouldShowBillingFieldError("state") &&
                                      "border-error-300"
                                  )}
                                >
                                  <SelectValue placeholder="Select" />
                                </SelectTrigger>
                                <SelectContent>
                                  {US_STATES.map(([code, name]) => (
                                    <SelectItem key={code} value={code}>
                                      {name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              {shouldShowBillingFieldError("state") ? (
                                <span className="block text-xs leading-5 text-error-500">
                                  {billingFieldErrors.state}
                                </span>
                              ) : null}
                            </div>
                            ) : null}
                            <div className="space-y-1.5">
                              <Label
                                size="sm"
                                htmlFor="zipcode"
                                className="text-gray-700"
                              >
                                {isUnitedStatesBilling ? "Zipcode" : "Postal code"}
                              </Label>
                              <Input
                                placeholder={
                                  isUnitedStatesBilling ? "12345" : "Postal code"
                                }
                                id="zipcode"
                                name="zipcode"
                                autoComplete="postal-code"
                                value={zipcode}
                                onChange={(e) =>
                                  setZipcode(
                                    isUnitedStatesBilling
                                      ? e.target.value.replace(/[^\d-]/g, "")
                                      : e.target.value
                                  )
                                }
                                onBlur={() => touchBillingField("zipcode")}
                                isInvalid={shouldShowBillingFieldError("zipcode")}
                              />
                              {shouldShowBillingFieldError("zipcode") ? (
                                <span className="block text-xs leading-5 text-error-500">
                                  {billingFieldErrors.zipcode}
                                </span>
                              ) : null}
                            </div>
                          </div>
                          <div className="space-y-1.5">
                            <Label
                              size="sm"
                              htmlFor="phone-number"
                              className="text-gray-700"
                            >
                              Phone Number
                            </Label>
                            <PhoneNumberInput
                              invalid={shouldShowBillingFieldError("phone")}
                              onBlur={() => touchBillingField("phone")}
                              inputProps={{ id: "phone-number" }}
                              value={phoneNumber}
                              onChange={setPhoneNumber}
                            />
                            {shouldShowBillingFieldError("phone") ? (
                              <span className="block text-xs leading-5 text-error-500">
                                {billingFieldErrors.phone}
                              </span>
                            ) : null}
                          </div>
                        </form>
                      ) : null}

                      {editingCard ? null : (
                      <div className="flex mt-[50px] justify-end">
                        <TooltipProvider delayDuration={75}>
                          <Tooltip
                            open={
                              !isFullPaymentCardFormValid ? undefined : false
                            }
                          >
                            <TooltipTrigger asChild>
                              <span>
                                <Button
                                  className={cn(
                                    "text-xs",
                                    !isFullPaymentCardFormValid &&
                                      "pointer-events-none"
                                  )}
                                  disabled={
                                    !isFullPaymentCardFormValid ||
                                    isSavingCard ||
                                    isValidatingAddress
                                  }
                                  onClick={() => {
                                    setHasAttemptedCardSubmit(true)
                                    if (
                                      !isFullPaymentCardFormValid ||
                                      isSavingCard ||
                                      isValidatingAddress
                                    )
                                      return
                                    if (billingAddressMode !== "new") {
                                      handleSaveFullPaymentCard()
                                      return
                                    }
                                    handleValidateBillingAddress()
                                  }}
                                >
                                  Save Card
                                </Button>
                              </span>
                            </TooltipTrigger>
                            <TooltipContent visual="gray">
                              {billingAddressMode === "saved" &&
                              isCardDetailsValid
                                ? "Please select a billing address"
                                : "Please fill in the required fields"}
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                      )}
                    </div>

                    <Dialog
                      open={isConfirmAddressDialogOpen}
                      onOpenChange={setIsConfirmAddressDialogOpen}
                    >
                      <DialogContent className="flex max-w-[702px] flex-col gap-[50px] p-6">
                        <div className="flex flex-col gap-2">
                          <DialogTitle className="text-lg font-semibold leading-7 text-dark-blue-400">
                            Confirm Address
                          </DialogTitle>
                          <DialogDescription className="text-sm leading-5 text-gray-500">
                            The address you provided doesn&apos;t match official
                            postal records.
                            <br />
                            Here&apos;s a suggested alternative.
                          </DialogDescription>
                        </div>
                        <DialogClose asChild>
                          <IconButton
                            variant="ghost"
                            visual="gray"
                            className="absolute right-6 top-6"
                          >
                            <X className="size-5" />
                          </IconButton>
                        </DialogClose>

                        <RadioGroup
                          className="flex items-start gap-x-[14px]"
                          value={confirmAddressChoice}
                          onValueChange={(value) =>
                            setConfirmAddressChoice(
                              value as "recommended" | "provided"
                            )
                          }
                        >
                          {(["recommended", "provided"] as const).map(
                            (option) => {
                              const isRecommended = option === "recommended"
                              const optionDetails =
                                isRecommended && recommendedBillingAddress
                                  ? {
                                      ...confirmAddressDetails,
                                      addressLine1: [
                                        recommendedBillingAddress.addressLine1,
                                        recommendedBillingAddress.addressLine2,
                                      ]
                                        .filter(Boolean)
                                        .join(", "),
                                      cityStateZip: `${recommendedBillingAddress.city}, ${[
                                        recommendedBillingAddress.state,
                                        recommendedBillingAddress.postalCode,
                                      ]
                                        .filter(Boolean)
                                        .join(" ")}`,
                                    }
                                  : confirmAddressDetails
                              const cityStateZip = optionDetails.cityStateZip
                              const zipStart = cityStateZip.lastIndexOf(" ") + 1
                              return (
                                <div
                                  key={option}
                                  className="flex w-[320px] items-start gap-x-4"
                                >
                                  <RadioGroupItem
                                    size="lg"
                                    id={`confirm-address-${option}`}
                                    value={option}
                                  />
                                  <Label
                                    htmlFor={`confirm-address-${option}`}
                                    className={cn(
                                      "flex min-w-px flex-1 flex-col text-base font-normal leading-6 text-dark-blue-400",
                                      isRecommended && "gap-1"
                                    )}
                                  >
                                    <span className="font-bold">
                                      {isRecommended
                                        ? "We Recommend"
                                        : "You Provided"}
                                    </span>
                                    <span>
                                      {optionDetails.fullName}
                                      <br />
                                      <span
                                        className={cn(
                                          isRecommended && "font-bold"
                                        )}
                                      >
                                        {optionDetails.addressLine1}
                                      </span>
                                      <br />
                                      {cityStateZip.slice(0, zipStart)}
                                      <span
                                        className={cn(
                                          isRecommended && "font-bold"
                                        )}
                                      >
                                        {cityStateZip.slice(zipStart)}
                                      </span>
                                      <br />
                                      {confirmAddressDetails.country}
                                      <br />
                                      {confirmAddressDetails.phoneNumber}
                                    </span>
                                  </Label>
                                </div>
                              )
                            }
                          )}
                        </RadioGroup>

                        <div className="flex justify-end gap-3">
                          <Button
                            onClick={() => {
                              setIsConfirmAddressDialogOpen(false)
                              handleSaveFullPaymentCard(
                                confirmAddressChoice === "recommended"
                                  ? recommendedBillingAddress
                                  : null
                              )
                            }}
                          >
                            Use this address
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                  )
                  return editingCard ? (
                    <Dialog
                      open
                      onOpenChange={(open) => {
                        if (!open) handleCancelEditCard()
                      }}
                    >
                      <DialogContent className="flex h-[min(740px,calc(100vh-48px))] max-w-[743px] flex-col gap-0 overflow-hidden p-0">
                        <div className="flex items-start justify-between border-b border-gray-200 py-3 pl-[18px] pr-3">
                          <div className="flex flex-col gap-y-1">
                            <DialogTitle className="text-lg font-semibold capitalize leading-7 text-dark-blue-400">
                              Edit your credit card
                            </DialogTitle>
                            <DialogDescription className="flex items-center gap-x-1 text-xs text-gray-500">
                              <Lock className="size-4" /> Your payment is
                              secure. Your card details will not be shared.
                            </DialogDescription>
                          </div>
                          <DialogClose asChild>
                            <IconButton variant="ghost" visual="gray">
                              <X className="size-5" />
                            </IconButton>
                          </DialogClose>
                        </div>

                        <div className="min-h-0 flex-1 overflow-y-auto p-6">
                          {cardForm}
                        </div>

                        <div className="flex h-[68px] items-center justify-between border-t border-gray-200 px-6 py-3">
                          <div className="flex items-center gap-x-[3px] text-xs">
                            <span className="font-light text-dark-blue-400">
                              By updating your card info, you agree to
                              Marketeq&apos;s
                            </span>
                            <Button
                              className="text-xs"
                              variant="link"
                              type="button"
                              onClick={() => setLegalDialog("terms")}
                            >
                              Terms &amp; Conditions
                            </Button>
                          </div>
                          <div className="flex items-center gap-x-3">
                            <Button
                              className="text-xs"
                              variant="outlined"
                              visual="gray"
                              type="button"
                              onClick={handleCancelEditCard}
                            >
                              Cancel
                            </Button>
                            <TooltipProvider delayDuration={75}>
                              <Tooltip
                                open={
                                  !isFullPaymentCardFormValid ? undefined : false
                                }
                              >
                                <TooltipTrigger asChild>
                                  <span>
                                    <Button
                                      className={cn(
                                        "text-xs",
                                        !isFullPaymentCardFormValid &&
                                          "pointer-events-none"
                                      )}
                                      disabled={
                                        !isFullPaymentCardFormValid ||
                                        isSavingCard ||
                                        isValidatingAddress
                                      }
                                      onClick={() => {
                                        setHasAttemptedCardSubmit(true)
                                        if (
                                          !isFullPaymentCardFormValid ||
                                          isSavingCard ||
                                          isValidatingAddress
                                        )
                                          return
                                        if (billingAddressMode !== "new") {
                                          handleSaveFullPaymentCard()
                                          return
                                        }
                                        handleValidateBillingAddress()
                                      }}
                                    >
                                      Save Card
                                    </Button>
                                  </span>
                                </TooltipTrigger>
                                <TooltipContent visual="gray">
                                  {billingAddressMode === "saved" &&
                                  isCardDetailsValid
                                    ? "Please select a billing address"
                                    : "Please fill in the required fields"}
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                  ) : (
                    cardForm
                  )
                })()}

                {/* Bank Account Form */}
                {paymentMethod === "item-1" && (
                  <>
                    <div className="mt-8">
                      <div className="max-w-[504px]">
                        <div className="mb-4 space-y-1.5">
                          <Label
                            size="sm"
                            htmlFor="connect-account-holder-name"
                          >
                            Account Holder Name
                          </Label>
                          <Input
                            id="connect-account-holder-name"
                            type="text"
                            placeholder="John Doe"
                            value={accountHolderName}
                            onChange={(event) =>
                              setAccountHolderName(
                                event.target.value.replace(/[^A-Za-z ]/g, "")
                              )
                            }
                          />
                        </div>
                        <Button
                          type="button"
                          className="h-14 w-full gap-x-3 rounded-lg bg-black px-8 text-[22px] font-bold leading-none text-white hover:bg-black/90"
                          disabled={isBankConnecting}
                          onClick={() => void openStripeLinkFlow()}
                        >
                          {isBankConnecting
                            ? "Connecting..."
                            : "Connect My Account"}
                          <Download02 className="size-5" />
                        </Button>
                        <p className="mt-3 max-w-[504px] text-sm leading-5 text-gray-500">
                          You&apos;ll be redirected to Stripe Link to securely
                          authenticate your bank account. Marketeq will never
                          see or store your bank login credentials.
                        </p>
                        {bankSubmissionError ? (
                          <Alert className="mt-4 border-error-200 bg-error-50">
                            <AlertIcon>
                              <AlertCircle className="size-5" />
                            </AlertIcon>
                            <AlertContent>
                              <AlertTitle>
                                Bank connection did not open
                              </AlertTitle>
                              <AlertDescription>
                                {bankSubmissionError}
                              </AlertDescription>
                            </AlertContent>
                          </Alert>
                        ) : null}
                      </div>

                      <div className="mt-10">
                        <div className="relative">
                          <span className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2">
                            <span className="absolute left-0 top-0 size-4 rounded-full border-2 border-gray-400" />
                            <span className="absolute left-[13px] top-[14px] h-2 w-0.5 -rotate-45 rounded-full bg-gray-400" />
                          </span>
                          <Input
                            value={bankSearch}
                            onChange={(event) =>
                              setBankSearch(event.target.value)
                            }
                            placeholder="Find your bank"
                            className="h-12 pl-12 text-base"
                          />
                        </div>
                        <div className="mt-4 grid grid-cols-4 gap-4">
                          {filteredBankOptions.map((bankOption) => (
                            <button
                              key={bankOption.id}
                              type="button"
                              className="flex h-[118px] items-center justify-center rounded-lg border border-gray-200 bg-white px-4 text-center shadow-sm transition hover:border-primary-300"
                              disabled={isBankConnecting}
                              onClick={() =>
                                handleStripeLinkBankSelect(bankOption.id)
                              }
                            >
                              <span
                                className="text-[20px] font-bold leading-tight"
                                style={{ color: bankOption.color }}
                              >
                                {bankOption.logo}
                              </span>
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="mt-10 flex items-center gap-x-4">
                        <span className="h-px flex-auto bg-gray-200" />
                        <span className="text-sm font-medium leading-5 text-gray-400">
                          Or
                        </span>
                        <span className="h-px flex-auto bg-gray-200" />
                      </div>
                    </div>

                    <div className="mt-10">
                      <h1 className="text-lg leading-none font-bold text-dark-blue-400">
                        Add Your Bank Account Manually
                      </h1>

                      <div className="mt-6 space-y-3">
                        <div className="space-y-1.5">
                          <Label
                            size="sm"
                            htmlFor="manual-account-type-checking"
                          >
                            Account Type
                          </Label>
                          <div className="grid grid-cols-2 gap-3">
                            {["Checking", "Savings"].map((option) => {
                              const selected = accountType === option

                              return (
                                <button
                                  key={option}
                                  id={`manual-account-type-${option.toLowerCase()}`}
                                  type="button"
                                  onClick={() => {
                                    setAccountType(option)
                                    setBankFieldTouched((current) => ({
                                      ...current,
                                      accountType: true,
                                    }))
                                  }}
                                  className={cn(
                                    "flex h-11 items-center gap-x-3 rounded-[5px] border px-3 text-left text-sm font-medium transition",
                                    selected
                                      ? "border-primary-500 text-primary-500 ring-1 ring-primary-500"
                                      : "border-gray-200 text-dark-blue-400 hover:border-gray-300"
                                  )}
                                >
                                  <span
                                    className={cn(
                                      "flex size-5 items-center justify-center rounded-full border",
                                      selected
                                        ? "border-primary-500"
                                        : "border-gray-300"
                                    )}
                                  >
                                    {selected ? (
                                      <span className="size-2.5 rounded-full bg-primary-500" />
                                    ) : null}
                                  </span>
                                  {option}
                                </button>
                              )
                            })}
                          </div>
                          {shouldShowBankFieldError("accountType") ? (
                            <span className="block text-xs leading-5 text-error-500">
                              {bankFieldErrors.accountType}
                            </span>
                          ) : null}
                        </div>
                        <div className="space-y-1.5">
                          <Label size="sm" htmlFor="account-holder-name">
                            Account Holder Name
                          </Label>
                          <Input
                            id="account-holder-name"
                            type="text"
                            placeholder="John Doe"
                            value={accountHolderName}
                            onChange={(e) =>
                              setAccountHolderName(
                                e.target.value.replace(/[^A-Za-z ]/g, "")
                              )
                            }
                            onBlur={() =>
                              setBankFieldTouched((current) => ({
                                ...current,
                                accountHolderName: true,
                              }))
                            }
                            aria-invalid={shouldShowBankFieldError(
                              "accountHolderName"
                            )}
                            className={cn(
                              shouldShowBankFieldError("accountHolderName") &&
                                "border-error-300 focus:border-error-300 focus:ring-error-100"
                            )}
                          />
                          {shouldShowBankFieldError("accountHolderName") ? (
                            <span className="block text-xs leading-5 text-error-500">
                              {bankFieldErrors.accountHolderName}
                            </span>
                          ) : null}
                        </div>
                        <div className="space-y-1.5">
                          <Label size="sm" htmlFor="bank-routing-number">
                            Bank Routing Number
                          </Label>
                          <Input
                            id="bank-routing-number"
                            type="text"
                            placeholder="xxxx-xxxx-xx"
                            value={bankRoutingNumber}
                            onChange={(e) =>
                              setBankRoutingNumber(
                                e.target.value.replace(/\D/g, "").slice(0, 9)
                              )
                            }
                            onBlur={() =>
                              setBankFieldTouched((current) => ({
                                ...current,
                                bankRoutingNumber: true,
                              }))
                            }
                            aria-invalid={shouldShowBankFieldError(
                              "bankRoutingNumber"
                            )}
                            className={cn(
                              shouldShowBankFieldError("bankRoutingNumber") &&
                                "border-error-300 focus:border-error-300 focus:ring-error-100"
                            )}
                          />
                          {shouldShowBankFieldError("bankRoutingNumber") ? (
                            <span className="block text-xs leading-5 text-error-500">
                              {bankFieldErrors.bankRoutingNumber}
                            </span>
                          ) : null}
                        </div>
                        <div className="grid grid-cols-2 gap-x-3">
                          <div className="space-y-1.5">
                            <Label size="sm" htmlFor="account-number">
                              Account Number
                            </Label>
                            <Input
                              id="account-number"
                              type={isBankAccountFocused ? "text" : "password"}
                              placeholder="Up to 17 digits"
                              value={accountNumber}
                              onFocus={() => setIsBankAccountFocused(true)}
                              onBlur={() => {
                                setIsBankAccountFocused(false)
                                setBankFieldTouched((current) => ({
                                  ...current,
                                  accountNumber: true,
                                }))
                              }}
                              onChange={(e) =>
                                setAccountNumber(
                                  e.target.value.replace(/\D/g, "").slice(0, 17)
                                )
                              }
                              aria-invalid={shouldShowBankFieldError(
                                "accountNumber"
                              )}
                              className={cn(
                                shouldShowBankFieldError("accountNumber") &&
                                  "border-error-300 focus:border-error-300 focus:ring-error-100"
                              )}
                            />
                            {shouldShowBankFieldError("accountNumber") ? (
                              <span className="block text-xs leading-5 text-error-500">
                                {bankFieldErrors.accountNumber}
                              </span>
                            ) : null}
                          </div>
                          <div className="space-y-1.5">
                            <Label size="sm" htmlFor="re-enter-account-number">
                              Re-Enter Account Number
                            </Label>
                            <Input
                              id="re-enter-account-number"
                              type={
                                isConfirmBankAccountFocused
                                  ? "text"
                                  : "password"
                              }
                              placeholder="Up to 17 digits"
                              value={confirmAccountNumber}
                              onFocus={() =>
                                setIsConfirmBankAccountFocused(true)
                              }
                              onBlur={() => {
                                setIsConfirmBankAccountFocused(false)
                                setBankFieldTouched((current) => ({
                                  ...current,
                                  confirmAccountNumber: true,
                                }))
                              }}
                              onChange={(e) =>
                                setConfirmAccountNumber(
                                  e.target.value.replace(/\D/g, "").slice(0, 17)
                                )
                              }
                              aria-invalid={shouldShowBankFieldError(
                                "confirmAccountNumber"
                              )}
                              className={cn(
                                shouldShowBankFieldError(
                                  "confirmAccountNumber"
                                ) &&
                                  "border-error-300 focus:border-error-300 focus:ring-error-100"
                              )}
                            />
                            {shouldShowBankFieldError(
                              "confirmAccountNumber"
                            ) ? (
                              <span className="block text-xs leading-5 text-error-500">
                                {bankFieldErrors.confirmAccountNumber}
                              </span>
                            ) : null}
                          </div>
                        </div>
                      </div>

                      <Alert className="mt-5 border-primary-100 bg-primary-50">
                        <AlertIcon>
                          <HelpCircle className="size-5" />
                        </AlertIcon>
                        <AlertContent>
                          <AlertTitle>
                            Micro-deposit verification may be required
                          </AlertTitle>
                          <AlertDescription>
                            If instant verification is unavailable, Stripe will
                            send two small deposits in 1 to 2 business days.
                            Payment is processed only after verification.
                          </AlertDescription>
                        </AlertContent>
                      </Alert>

                      {bankSubmissionError ? (
                        <Alert className="mt-5 border-error-200 bg-error-50">
                          <AlertIcon>
                            <AlertCircle className="size-5" />
                          </AlertIcon>
                          <AlertContent>
                            <AlertTitle>
                              Bank account could not be verified
                            </AlertTitle>
                            <AlertDescription>
                              {bankSubmissionError}
                            </AlertDescription>
                          </AlertContent>
                        </Alert>
                      ) : null}

                      {microDepositMessage ? (
                        <Alert className="mt-5 border-primary-100 bg-primary-50">
                          <AlertIcon>
                            <CheckCircle className="size-5" />
                          </AlertIcon>
                          <AlertContent>
                            <AlertTitle>
                              Micro-deposit verification pending
                            </AlertTitle>
                            <AlertDescription>
                              {microDepositMessage}
                            </AlertDescription>
                          </AlertContent>
                        </Alert>
                      ) : null}

                      <div className="mt-[22px] flex items-center gap-x-3">
                        <Checkbox
                          size="md"
                          id="save-bank-default"
                          checked={saveBankAccount}
                          onCheckedChange={(v) =>
                            setSaveBankAccount(v === true)
                          }
                        />
                        <Label size="sm" htmlFor="save-bank-default">
                          Save as default payment method
                        </Label>
                      </div>

                      <div className="mt-[50px]">
                        <div className="flex items-center justify-end gap-x-2">
                          <Button
                            type="button"
                            variant="outlined"
                            visual="gray"
                            onClick={() => {
                              resetFullPaymentBankForm()
                              setPaymentMethod("")
                            }}
                          >
                            Cancel
                          </Button>
                          <Button
                            className="bg-primary-500 text-white hover:bg-primary-600 disabled:bg-primary-50 disabled:text-primary-300"
                            disabled={
                              !isInstallmentBankFormValid || isBankSubmitting
                            }
                            onClick={handleManualBankContinue}
                          >
                            {isBankSubmitting
                              ? "Saving..."
                              : "Save Bank Account"}
                          </Button>
                        </div>
                        <div className="mt-3.5 flex items-center justify-end">
                          <span className="text-xs font-light text-dark-blue-400">
                            By adding your bank account, you agree to
                            Marketeq&apos;s{" "}
                            <Button variant="link">Terms & Conditions</Button>
                          </span>
                        </div>
                      </div>
                    </div>
                  </>
                )}

                {/* Installments */}
                {pay === "IN_INSTALLMENTS" && (
                  <>
                    <div className="mt-6">
                      <h1 className="text-base text-dark-blue-400 font-bold leading-[.7]">
                        Initial One-Time Payment
                      </h1>
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
                          <Button
                            className="hover:no-underline"
                            variant="link"
                            visual="gray"
                          >
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
                      <h1 className="text-base text-dark-blue-400 font-bold leading-[.7]">
                        Recurring Payments
                      </h1>
                      <div className="flex items-end justify-between">
                        <div className="flex items-center gap-x-6 mt-5">
                          <span
                            ref={recurringPaymentFrequencyMeasureRef}
                            aria-hidden="true"
                            className="pointer-events-none absolute opacity-0 whitespace-nowrap text-xs text-dark-blue-400"
                          >
                            {paymentFrequency ? (
                              <>
                                {paymentFrequency.label} -{" "}
                                <span className="font-bold">
                                  {paymentFrequency.value}
                                </span>
                              </>
                            ) : (
                              "Select Payment Frequency"
                            )}
                          </span>
                          <Listbox
                            className="transition-[width] duration-300"
                            style={
                              recurringPaymentFrequencyWidth
                                ? {
                                    width: `${recurringPaymentFrequencyWidth}px`,
                                  }
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
                                  {value.label} -{" "}
                                  <span className="font-bold">
                                    {value.value}
                                  </span>
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
                                    <span className="font-bold">
                                      {option.value}
                                    </span>
                                  </span>
                                </ListboxOption>
                              ))}
                            </ListboxOptions>
                          </Listbox>

                          <div className="w-[220px] h-7 shrink-0 overflow-hidden">
                            {paymentFrequency ? (
                              paymentFrequency.label ===
                              "Pay Remaining Balance" ? (
                                <span className="inline-block text-xs leading-[14px] font-medium text-gray-500">
                                  <span className="block whitespace-nowrap">
                                    Your remaining amount will be
                                  </span>
                                  <span className="block whitespace-nowrap">
                                    charged on{" "}
                                    <span className="font-bold">
                                      January 1st, 2025
                                    </span>
                                  </span>
                                </span>
                              ) : (
                                <span className="inline-block text-xs leading-[14px] font-medium text-gray-500">
                                  <span className="block whitespace-nowrap">
                                    {paymentFrequency.meta}{" "}
                                    {paymentFrequency.label.toLowerCase()}{" "}
                                    payments, starting
                                  </span>
                                  <span className="block whitespace-nowrap">
                                    from{" "}
                                    <span className="font-bold">
                                      January 1st, 2025
                                    </span>
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
                          <Button
                            className="hover:no-underline"
                            variant="link"
                            visual="gray"
                          >
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
                              {paymentFrequency?.value ??
                                talentPaymentPlan?.value}
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
                            onValueChange={
                              setSelectedExistingInstallmentMethodId
                            }
                          >
                            {savedInstallmentPaymentMethods.map((method) => (
                              <HeadlessRadioGroupItem
                                className="group/item block focus-visible:outline-none"
                                value={method.id}
                                key={method.id}
                                onClick={() =>
                                  handleSelectExistingInstallmentMethod(method)
                                }
                              >
                                {method.method === "CREDIT_DEBIT_CARD" ? (
                                  <CreditDebitCardArticle3
                                    cardNumber={method.cardNumber}
                                    saveDefaultPaymentMethod={
                                      method.saveDefaultPaymentMethod
                                    }
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
                                            <Badge visual="primary">
                                              Default
                                            </Badge>
                                          )}
                                        </div>
                                        <span className="inline-block text-xs text-[#858585] leading-none">
                                          {method.accountType} ****
                                          {method.accountNumber?.slice(-4)}
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
                              onClick={
                                handleBackFromAddNewInstallmentMethodDialog
                              }
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
                            <Lock className="size-4" /> Your payment is secure.
                            Your card details will not be shared.
                          </p>

                          <div className="mt-6 space-y-3">
                            <div className="space-y-1.5">
                              <Label
                                size="sm"
                                htmlFor="installment-card-number"
                              >
                                Card Number
                              </Label>
                              <CreditCardInput
                                id="installment-card-number"
                                value={cardNumber}
                                onValueChange={setCardNumber}
                                onFocus={() => setActiveCardField("cardNumber")}
                              />
                            </div>

                            <div className="space-y-1.5">
                              <Label size="sm" htmlFor="installment-card-name">
                                Name On Card
                              </Label>
                              <Input
                                id="installment-card-name"
                                type="text"
                                placeholder="John Doe"
                                value={cardName}
                                onFocus={() => setActiveCardField("cardName")}
                                onChange={(event) =>
                                  setCardName(event.target.value)
                                }
                              />
                            </div>

                            <div className="grid grid-cols-2 gap-x-3">
                              <div className="space-y-1.5">
                                <Label
                                  size="sm"
                                  htmlFor="installment-expiration-date"
                                >
                                  Expiration Date
                                </Label>
                                <Input
                                  id="installment-expiration-date"
                                  type="text"
                                  placeholder="MM/YYYY"
                                  value={expirationDate}
                                  onFocus={() =>
                                    setActiveCardField("expirationDate")
                                  }
                                  onChange={(event) => {
                                    const sanitized =
                                      event.target.value.replace(/[^\d]/g, "")
                                    if (sanitized.length >= 2) {
                                      setExpirationDate(
                                        `${sanitized.slice(0, 2)}/${sanitized.slice(2, 6)}`
                                      )
                                      return
                                    }
                                    setExpirationDate(sanitized)
                                  }}
                                />
                              </div>

                              <div className="space-y-1.5">
                                <Label size="sm" htmlFor="installment-cvv-cvc">
                                  CVV / CVC
                                </Label>
                                <InputGroup>
                                  <Input
                                    id="installment-cvv-cvc"
                                    type="text"
                                    placeholder="3 or 4 digits"
                                    value={cvv}
                                    onFocus={() => setActiveCardField("cvv")}
                                    onChange={(event) => {
                                      setCvv(
                                        event.target.value
                                          .replace(/\D/g, "")
                                          .slice(0, 4)
                                      )
                                    }}
                                  />
                                  <InputRightElement>
                                    <TooltipProvider delayDuration={75}>
                                      <Tooltip>
                                        <TooltipTrigger className="focus-visible:outline-none">
                                          <HelpCircle className="h-4 w-4 text-gray-500" />
                                        </TooltipTrigger>
                                        <TooltipContent
                                          className="max-w-[139px]"
                                          visual="gray"
                                        >
                                          3-4 digit code on the back of your
                                          card
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
                              onCheckedChange={(value) =>
                                setSaveCard(value === true)
                              }
                            />
                            <Label
                              size="sm"
                              htmlFor="save-installment-default-payment-method"
                            >
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

                              <Button
                                visual="gray"
                                variant="outlined"
                                type="button"
                              >
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
                              <Label
                                size="sm"
                                htmlFor="installment-account-type"
                              >
                                Account Type
                              </Label>
                              <Listbox
                                value={accountType}
                                onChange={(value) => {
                                  setAccountType(value)
                                  setBankFieldTouched((current) => ({
                                    ...current,
                                    accountType: true,
                                  }))
                                }}
                              >
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
                              <Label
                                size="sm"
                                htmlFor="installment-account-holder-name"
                              >
                                Account Holder Name
                              </Label>
                              <Input
                                id="installment-account-holder-name"
                                type="text"
                                placeholder="John Doe"
                                value={accountHolderName}
                                onChange={(event) =>
                                  setAccountHolderName(
                                    event.target.value.replace(
                                      /[^A-Za-z ]/g,
                                      ""
                                    )
                                  )
                                }
                                onBlur={() =>
                                  setBankFieldTouched((current) => ({
                                    ...current,
                                    accountHolderName: true,
                                  }))
                                }
                              />
                              {shouldShowBankFieldError("accountHolderName") ? (
                                <span className="block text-xs leading-5 text-error-500">
                                  {bankFieldErrors.accountHolderName}
                                </span>
                              ) : null}
                            </div>

                            <div className="space-y-1.5">
                              <Label
                                size="sm"
                                htmlFor="installment-bank-routing-number"
                              >
                                Bank Routing Number
                              </Label>
                              <Input
                                id="installment-bank-routing-number"
                                type="text"
                                placeholder="xxxx-xxxx-xx"
                                value={bankRoutingNumber}
                                onChange={(event) =>
                                  setBankRoutingNumber(
                                    event.target.value
                                      .replace(/\D/g, "")
                                      .slice(0, 9)
                                  )
                                }
                                onBlur={() =>
                                  setBankFieldTouched((current) => ({
                                    ...current,
                                    bankRoutingNumber: true,
                                  }))
                                }
                              />
                              {shouldShowBankFieldError("bankRoutingNumber") ? (
                                <span className="block text-xs leading-5 text-error-500">
                                  {bankFieldErrors.bankRoutingNumber}
                                </span>
                              ) : null}
                            </div>

                            <div className="grid grid-cols-2 gap-x-3">
                              <div className="space-y-1.5">
                                <Label
                                  size="sm"
                                  htmlFor="installment-account-number"
                                >
                                  Account Number
                                </Label>
                                <Input
                                  id="installment-account-number"
                                  type="text"
                                  placeholder="Up to 17 digits"
                                  value={accountNumber}
                                  onChange={(event) =>
                                    setAccountNumber(
                                      event.target.value
                                        .replace(/\D/g, "")
                                        .slice(0, 17)
                                    )
                                  }
                                  onBlur={() =>
                                    setBankFieldTouched((current) => ({
                                      ...current,
                                      accountNumber: true,
                                    }))
                                  }
                                />
                                {shouldShowBankFieldError("accountNumber") ? (
                                  <span className="block text-xs leading-5 text-error-500">
                                    {bankFieldErrors.accountNumber}
                                  </span>
                                ) : null}
                              </div>

                              <div className="space-y-1.5">
                                <Label
                                  size="sm"
                                  htmlFor="installment-confirm-account-number"
                                >
                                  Re-Enter Account Number
                                </Label>
                                <Input
                                  id="installment-confirm-account-number"
                                  type="text"
                                  placeholder="Up to 17 digits"
                                  value={confirmAccountNumber}
                                  onChange={(event) =>
                                    setConfirmAccountNumber(
                                      event.target.value
                                        .replace(/\D/g, "")
                                        .slice(0, 17)
                                    )
                                  }
                                  onBlur={() =>
                                    setBankFieldTouched((current) => ({
                                      ...current,
                                      confirmAccountNumber: true,
                                    }))
                                  }
                                />
                                {shouldShowBankFieldError(
                                  "confirmAccountNumber"
                                ) ? (
                                  <span className="block text-xs leading-5 text-error-500">
                                    {bankFieldErrors.confirmAccountNumber}
                                  </span>
                                ) : null}
                              </div>
                            </div>
                          </div>

                          <div className="mt-[22px] flex items-center gap-x-3">
                            <Checkbox
                              size="md"
                              id="save-installment-bank-default"
                              checked={saveBankAccount}
                              onCheckedChange={(value) =>
                                setSaveBankAccount(value === true)
                              }
                            />
                            <Label
                              size="sm"
                              htmlFor="save-installment-bank-default"
                            >
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
                              Save Bank Account
                            </Button>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </>
                )}
              </Card>

              {/* Sidebar */}
              <div className="w-[305px] shrink-0">
                <Card className="w-[305px] shrink-0 flex-col items-stretch justify-start p-5 shadow-[0px_1px_2.5px_0px_rgba(16,24,40,0.02)]">
                  {isTalentCheckout ? (
                    <>
                      <div className="pb-4 border-b border-gray-200">
                        <h1 className="text-base font-semibold leading-none text-dark-blue-400">
                          Contract Details
                        </h1>

                        <div className="mt-4 flex items-start gap-x-3">
                          <Avatar className="size-[52px] shrink-0">
                            <AvatarImage
                              src={talentAvatarUrl}
                              alt={talentName}
                            />
                            <AvatarFallback>
                              {talentName.charAt(0)}
                            </AvatarFallback>
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
                            <h3 className="text-[10px] leading-none text-dark-blue-400 font-light">
                              Total Duration
                            </h3>
                            <h1 className="text-xs font-semibold leading-none text-dark-blue-400">
                              Jan 2025 - Aug 2025
                            </h1>
                          </div>
                          <Badge size="sm" visual="primary">
                            8 months
                          </Badge>
                        </div>
                      </div>

                      <div className="mt-5 pb-4 border-b border-gray-200">
                        <h1 className="text-base leading-none font-semibold text-dark-blue-400">
                          Price Details
                        </h1>
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

                        <div className="mt-5 flex items-center justify-between">
                          <span className="inline-block text-xs leading-none text-dark-blue-400 font-light">
                            Estimated Total Job Cost
                          </span>
                          <h1 className="inline-block text-base font-bold leading-none text-dark-blue-400">
                            {formattedJobCost}
                          </h1>
                        </div>
                      </div>

                      <div className="mt-5 pb-4 border-b border-gray-200">
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
                            Estimated Add-on total
                          </span>
                          <h1 className="inline-block text-base font-bold leading-none text-dark-blue-400">
                            {formattedAddOnTotal}
                          </h1>
                        </div>
                      </div>

                      <div className="mt-5">
                        <h1 className="text-base leading-none font-semibold text-dark-blue-400">
                          Payment Plan
                        </h1>

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
                                    <span className="font-bold">
                                      {value.value}
                                    </span>
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
                            <Button
                              onClick={handleSubmitOrder}
                              disabled={isSubmitOrderDisabled}
                            >
                              Review your order
                            </Button>
                          </div>

                          <div className="mt-5 text-center">
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
                              By clicking the above, you agree to
                              Marketeq&apos;s{" "}
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
                            <Button
                              variant="link"
                              visual="gray"
                              onClick={() => setShowGiftCard(true)}
                            >
                              Add Gift Card / Promo Code
                            </Button>
                          </div>
                        </div>
                      </div>
                    </>
                  ) : (
                    <>
                      <h1 className="text-base font-semibold leading-[normal] text-dark-blue-400">
                        Project Details
                      </h1>

                      <div className="mt-4 space-y-4 pb-[15px] border-b border-gray-200">
                        <div className="relative h-[92px] rounded-md overflow-hidden">
                          <NextImage
                            className="object-cover"
                            src={checkoutProjectImage}
                            alt={checkoutProjectTitle}
                            sizes="50vw"
                            fill
                          />
                        </div>

                        <h3 className="text-sm font-medium text-dark-blue-400 leading-[18px]">
                          {checkoutProjectTitle}
                        </h3>

                        <div className="flex items-center gap-x-2">
                          <UserGroup className="h-4 w-[15px]" />
                          <span className="inline-block text-xs leading-5 font-semibold text-primary-500">
                            {checkoutProjectTeamLabel}
                          </span>
                        </div>

                        <div className="flex items-end justify-between">
                          <div className="space-y-1">
                            <h3 className="text-[10px] leading-[normal] text-dark-blue-400 font-light">
                              Total Duration
                            </h3>
                            <h1 className="whitespace-pre text-xs font-semibold leading-[normal] text-dark-blue-400">
                              {checkoutProjectDateRange}
                            </h1>
                          </div>
                          <Badge size="sm" visual="primary">
                            {checkoutProjectDuration}
                          </Badge>
                        </div>
                      </div>

                      <div className="mt-5 pb-[15px] border-b border-gray-200">
                        <h1 className="text-base leading-[normal] font-semibold text-dark-blue-400">
                          Price Details
                        </h1>
                        <div className="mt-4 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="inline-block text-xs leading-[normal] text-dark-blue-400 font-light">
                              Project cost
                            </span>
                            <span className="inline-block text-xs leading-[normal] text-dark-blue-400 font-normal">
                              {priceFormatter.format(projectCost)}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="inline-block text-xs leading-[normal] text-dark-blue-400 font-light">
                              Estimated tax *
                            </span>
                            <span className="inline-block text-xs leading-[normal] text-dark-blue-400 font-normal">
                              {currencyWithCentsFormatter.format(estimatedProjectTax)}
                            </span>
                          </div>
                          {pay === "IN_INSTALLMENTS" && (
                            <>
                              <div className="flex items-center justify-between">
                                <span className="inline-block text-xs leading-[normal] text-dark-blue-400 font-light">
                                  Initial payment
                                </span>
                                <span className="inline-block text-xs leading-[normal] text-dark-blue-400 font-normal">
                                  {priceFormatter.format(initialInstallmentAmount)}
                                </span>
                              </div>
                              <div className="flex items-center justify-between">
                                <span className="inline-block text-xs leading-[normal] text-dark-blue-400 font-light">
                                  Recurring payment
                                </span>
                                <span className="inline-block text-xs leading-[normal] text-dark-blue-400 font-normal">
                                  {priceFormatter.format(recurringInstallmentAmount)}
                                </span>
                              </div>
                            </>
                          )}
                          {appliedBalanceAmount > 0 && (
                            <div className="flex items-center justify-between">
                              <span className="inline-block text-xs leading-[normal] text-dark-blue-400 font-light">
                                Balance applied
                              </span>
                              <span className="inline-block text-xs leading-[normal] text-dark-blue-400 font-normal">
                                - {priceFormatter.format(appliedBalanceAmount)}
                              </span>
                            </div>
                          )}
                          {sessionPromoAmount > 0 && (
                            <div className="flex items-center justify-between">
                              <span className="inline-block text-xs leading-[normal] text-dark-blue-400 font-light">
                                Promo code applied
                              </span>
                              <span className="inline-block text-xs leading-[normal] text-dark-blue-400 font-normal">
                                - {priceFormatter.format(sessionPromoAmount)}
                              </span>
                            </div>
                          )}
                          {sessionGiftCardAmount > 0 && (
                            <div className="flex items-center justify-between">
                              <span className="inline-block text-xs leading-[normal] text-dark-blue-400 font-light">
                                {sessionGiftCards.length === 1
                                  ? "Gift card applied"
                                  : `${sessionGiftCards.length} Gift cards applied`}
                              </span>
                              <span className="inline-block text-xs leading-[normal] text-dark-blue-400 font-normal">
                                - {priceFormatter.format(sessionGiftCardAmount)}
                              </span>
                            </div>
                          )}
                          {totalGiftCardAmount > 0 && (
                            <div className="flex items-center justify-between">
                              <span className="inline-block text-xs leading-[normal] text-dark-blue-400 font-light">
                                {giftCards.length}{" "}
                                {giftCards.length === 1
                                  ? "Gift card applied"
                                  : "Gift cards applied"}
                              </span>
                              <span className="inline-block text-xs leading-[normal] text-dark-blue-400 font-normal">
                                - {priceFormatter.format(totalGiftCardAmount)}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="mt-4">
                        <div className="flex items-center justify-between">
                          <span className="inline-block text-xs leading-[normal] text-dark-blue-400 font-light">
                            {pay === "IN_INSTALLMENTS"
                              ? "Amount due today"
                              : "Total amount to be paid"}
                          </span>
                          <h1 className="inline-block text-base font-bold leading-[normal] text-dark-blue-400">
                            {priceFormatter.format(totalAmountToBePaid)}
                          </h1>
                        </div>

                        <div className="grid mt-5">
                          <Button
                            onClick={handleSubmitOrder}
                            disabled={isSubmitOrderDisabled}
                          >
                            Review your order
                          </Button>
                        </div>

                        <div className="mt-5">
                          <span className="block text-center text-[10px] font-light text-dark-blue-400 leading-[14px]">
                            By clicking the above, you agree to Marketeq&apos;s
                            <br />
                            <Button
                              className="h-auto p-0 align-baseline text-[10px] font-medium leading-[14px] underline"
                              variant="link"
                              onClick={() => setLegalDialog("terms")}
                            >
                              Terms of Use
                            </Button>{" "}
                            and{" "}
                            <Button
                              className="h-auto p-0 align-baseline text-[10px] font-medium leading-[14px] underline"
                              variant="link"
                              onClick={() => setLegalDialog("privacy")}
                            >
                              Privacy Policy
                            </Button>
                          </span>
                        </div>

                        <div className="mt-5 flex items-center justify-center">
                          <Button
                            className="h-5 p-0 text-xs"
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
                </Card>
                {!isTalentCheckout &&
                paymentMethod === "item-0" &&
                fullPaymentMethods.length < 1 ? (
                  <div className="mt-8 flex justify-center">
                    <CreditCardPreview
                      cardNumber=""
                      cardName=""
                      expiry=""
                      cvv=""
                      isBack={showCardBackPreview}
                      activeField={activeCardField}
                    />
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </div>

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

      <Dialog
        open={isSessionExpiredDialogOpen}
        onOpenChange={setIsSessionExpiredDialogOpen}
      >
        <DialogContent className="max-w-[480px] p-6">
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
            <Button onClick={() => router.push(projectDetailsHref)}>
              Try Again
            </Button>
          </div>
        </DialogContent>
      </Dialog>

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
                    <TabsTrigger containerClassName="h-full" value="gift-card">
                      Gift Card
                    </TabsTrigger>
                    <TabsTrigger containerClassName="h-full" value="promo-code">
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
              {redeemGiftCardPanel}
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
                            setRedeemPromoCode(event.target.value.toUpperCase())
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
                          Promo code &ldquo;{lastRemovedRedeemPromo}&rdquo; has
                          been removed
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
                        redeemPromoStatus === "invalid" ? "error" : "primary"
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
                          -
                          {formatter.format(
                            appliedRedeemPromo.amount
                          )}
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
                    ? `gift card ending in ${getRedeemGiftCardEnding(redeemGiftCardRemoval.code)} for the amount of ${formatRedeemRemovalAmount(redeemGiftCardRemoval.amount)}`
                    : `all added gift cards for the amount of ${formatRedeemRemovalAmount(sessionGiftCardAmount)}`}
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
        open={legalDialog !== null}
        onOpenChange={(open) => {
          if (!open) setLegalDialog(null)
        }}
      >
        <DialogContent className="max-w-[480px] p-6">
          <h2 className="text-lg font-semibold text-dark-blue-400">
            {shownLegalDialog === "privacy"
              ? "Privacy Policy"
              : "Terms & Conditions"}
          </h2>
          <DialogClose asChild>
            <IconButton
              variant="ghost"
              visual="gray"
              className="absolute right-6 top-6 rounded-full text-gray-500 hover:text-gray-900"
            >
              <X className="size-5" />
            </IconButton>
          </DialogClose>
          <p className="mt-3 text-sm leading-5 text-gray-500">
            {shownLegalDialog === "privacy"
              ? "This privacy policy explains how Marketeq collects, uses, and protects checkout information. Payment details are handled securely and are only used to process and support your order."
              : "These terms explain the basic conditions for using Marketeq checkout. By continuing, you confirm that your order details are accurate and authorize Marketeq to process the selected payment method."}
          </p>
        </DialogContent>
      </Dialog>
    </>
  )
}
