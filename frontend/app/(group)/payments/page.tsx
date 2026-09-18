"use client"

import { forwardRef, useImperativeHandle, useMemo, useState } from "react"
import NextLink from "next/link"
import AuthenticatedRoute from "@/hoc/AuthenticatedRoute"
import { cn } from "@/utils/functions"
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Check,
  Edit03,
  File02,
  HelpCircle,
  Lock,
  MapPin,
  Plus,
  Trash03,
  X,
} from "@blend-metrics/icons"
import { InputRightElement } from "@/components/ui/input/input-element"
import { BillingSectionHeader } from "@/components/billing-section-header"
import { CreditCardInput } from "@/components/credit-card-input"
import {
  ACH,
  ApplePay1,
  GPay1,
  Amex as PaymentAmex,
  Visa as PaymentVisa,
} from "@/components/icons/payment-icons"
import NextImage from "@/components/next-image"
import { LeftSidebar } from "@/components/talent-dashboard-comps"
import {
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
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
  useToast,
} from "@/components/ui"

type PaymentMethod = {
  id: string
  bankName: string
  contractSummary: string
  contractCount: number
  label: string
  holder: string
  expires: string
  network: "VISA" | "ACH"
  kind: "DEBIT" | "SAVINGS"
  last4: string
  default: boolean
  cardImageSrc: string
  cardImageActiveSrc: string
  cardImageWidth: number
  cardImageHeight: number
  cardImageActiveWidth: number
  cardImageActiveHeight: number
  featuredCardImageSrc: string
  featuredCardImageActiveSrc: string
  featuredCardImageWidth: number
  featuredCardImageHeight: number
  featuredCardImageActiveWidth: number
  featuredCardImageActiveHeight: number
  billingAddress: string[]
  plans: { name: string; renews: string }[]
  contracts: { name: string; renews: string }[]
}

type NewPaymentMethodOptionValue =
  | "credit-card"
  | "bank-account"
  | "google-pay"
  | "apple-pay"

const PAYMENT_METHODS_TOTAL = 21

const CARD_IMAGE_VARIANTS = {
  white: {
    cardImageSrc: "/payment-method-cards/compact/card-compact-white.png",
    cardImageActiveSrc: "/payment-method-cards/compact/card-compact-violet.png",
    cardImageWidth: 248,
    cardImageHeight: 160,
    cardImageActiveWidth: 248,
    cardImageActiveHeight: 155,
    featuredCardImageSrc: "/payment-method-cards/card-large-white.png",
    featuredCardImageActiveSrc: "/payment-method-cards/card-large-violet.png",
    featuredCardImageWidth: 695,
    featuredCardImageHeight: 449,
    featuredCardImageActiveWidth: 695,
    featuredCardImageActiveHeight: 436,
  },
  lilac: {
    cardImageSrc: "/payment-method-cards/compact/card-compact-lilac.png",
    cardImageActiveSrc: "/payment-method-cards/compact/card-compact-violet.png",
    cardImageWidth: 248,
    cardImageHeight: 160,
    cardImageActiveWidth: 248,
    cardImageActiveHeight: 155,
    featuredCardImageSrc: "/payment-method-cards/card-large-lilac.png",
    featuredCardImageActiveSrc: "/payment-method-cards/card-large-violet.png",
    featuredCardImageWidth: 695,
    featuredCardImageHeight: 449,
    featuredCardImageActiveWidth: 695,
    featuredCardImageActiveHeight: 436,
  },
  dark: {
    cardImageSrc: "/payment-method-cards/compact/card-compact-dark.png",
    cardImageActiveSrc: "/payment-method-cards/compact/card-compact-blue.png",
    cardImageWidth: 248,
    cardImageHeight: 160,
    cardImageActiveWidth: 248,
    cardImageActiveHeight: 160,
    featuredCardImageSrc: "/payment-method-cards/card-large-dark.png",
    featuredCardImageActiveSrc: "/payment-method-cards/card-large-blue.png",
    featuredCardImageWidth: 695,
    featuredCardImageHeight: 449,
    featuredCardImageActiveWidth: 695,
    featuredCardImageActiveHeight: 449,
  },
} as const

const BASE_PAYMENT_METHODS: PaymentMethod[] = [
  {
    id: "boa-one",
    bankName: "Bank of America",
    contractSummary: "No Active Contracts",
    contractCount: 0,
    label: "Credit Card ••••1937",
    holder: "John Doe",
    expires: "02/27",
    network: "VISA",
    kind: "DEBIT",
    last4: "1234",
    default: false,
    ...CARD_IMAGE_VARIANTS.white,
    billingAddress: ["1010 E32nd St", "Brooklyn, NY 11201", "United States"],
    plans: [
      { name: "Essentials Agency Plan", renews: "Renews on March 26th, 2025" },
      { name: "Premium Individual Plan", renews: "Renews on March 26th, 2025" },
    ],
    contracts: [
      {
        name: "Hourly Payment for “Chris @uxdesign_231”",
        renews: "Renews on Feb 21st",
      },
      {
        name: "Monthly installment for “UX Audit Project”",
        renews: "April 1, 2025",
      },
    ],
  },
  {
    id: "boa-two",
    bankName: "Bank of America",
    contractSummary: "No Active Contracts",
    contractCount: 0,
    label: "Credit Card ••••1937",
    holder: "John Doe",
    expires: "02/27",
    network: "VISA",
    kind: "DEBIT",
    last4: "1234",
    default: true,
    ...CARD_IMAGE_VARIANTS.lilac,
    billingAddress: ["1010 E32nd St", "Brooklyn, NY 11201", "United States"],
    plans: [
      { name: "Essentials Agency Plan", renews: "Renews on March 26th, 2025" },
    ],
    contracts: [
      {
        name: "Hourly Payment for “Chris @uxdesign_231”",
        renews: "Renews on Feb 21st",
      },
      {
        name: "Monthly installment for “UX Audit Project”",
        renews: "April 1, 2025",
      },
    ],
  },
  {
    id: "boa-three",
    bankName: "Bank of America",
    contractSummary: "No Active Contracts",
    contractCount: 0,
    label: "Credit Card ••••1937",
    holder: "John Doe",
    expires: "02/27",
    network: "VISA",
    kind: "DEBIT",
    last4: "1234",
    default: false,
    ...CARD_IMAGE_VARIANTS.white,
    billingAddress: ["1010 E32nd St", "Brooklyn, NY 11201", "United States"],
    plans: [
      { name: "Premium Individual Plan", renews: "Renews on March 26th, 2025" },
    ],
    contracts: [
      {
        name: "Hourly Payment for “Chris @uxdesign_231”",
        renews: "Renews on Feb 21st",
      },
      {
        name: "Monthly installment for “UX Audit Project”",
        renews: "April 1, 2025",
      },
    ],
  },
  {
    id: "boa-four",
    bankName: "Bank of America",
    contractSummary: "No Active Contracts",
    contractCount: 0,
    label: "Credit Card ••••1937",
    holder: "John Doe",
    expires: "02/27",
    network: "VISA",
    kind: "DEBIT",
    last4: "1234",
    default: false,
    ...CARD_IMAGE_VARIANTS.dark,
    billingAddress: ["1010 E32nd St", "Brooklyn, NY 11201", "United States"],
    plans: [
      { name: "Premium Individual Plan", renews: "Renews on March 26th, 2025" },
    ],
    contracts: [
      {
        name: "Hourly Payment for “Chris @uxdesign_231”",
        renews: "Renews on Feb 21st",
      },
      {
        name: "Monthly installment for “UX Audit Project”",
        renews: "April 1, 2025",
      },
    ],
  },
  {
    id: "boa-five",
    bankName: "Bank of America",
    contractSummary: "No Active Contracts",
    contractCount: 0,
    label: "Credit Card ••••1937",
    holder: "John Doe",
    expires: "02/27",
    network: "VISA",
    kind: "DEBIT",
    last4: "1234",
    default: false,
    ...CARD_IMAGE_VARIANTS.lilac,
    billingAddress: ["1010 E32nd St", "Brooklyn, NY 11201", "United States"],
    plans: [
      { name: "Premium Individual Plan", renews: "Renews on March 26th, 2025" },
    ],
    contracts: [
      {
        name: "Hourly Payment for “Chris @uxdesign_231”",
        renews: "Renews on Feb 21st",
      },
      {
        name: "Monthly installment for “UX Audit Project”",
        renews: "April 1, 2025",
      },
    ],
  },
  {
    id: "boa-six",
    bankName: "Bank of America",
    contractSummary: "No Active Contracts",
    contractCount: 0,
    label: "Credit Card ••••1937",
    holder: "John Doe",
    expires: "02/27",
    network: "VISA",
    kind: "DEBIT",
    last4: "1234",
    default: false,
    ...CARD_IMAGE_VARIANTS.white,
    billingAddress: ["1010 E32nd St", "Brooklyn, NY 11201", "United States"],
    plans: [
      { name: "Premium Individual Plan", renews: "Renews on March 26th, 2025" },
    ],
    contracts: [
      {
        name: "Hourly Payment for “Chris @uxdesign_231”",
        renews: "Renews on Feb 21st",
      },
      {
        name: "Monthly installment for “UX Audit Project”",
        renews: "April 1, 2025",
      },
    ],
  },
  {
    id: "boa-seven",
    bankName: "Bank of America",
    contractSummary: "No Active Contracts",
    contractCount: 0,
    label: "Credit Card ••••1937",
    holder: "John Doe",
    expires: "02/27",
    network: "VISA",
    kind: "DEBIT",
    last4: "1234",
    default: false,
    ...CARD_IMAGE_VARIANTS.lilac,
    billingAddress: ["1010 E32nd St", "Brooklyn, NY 11201", "United States"],
    plans: [
      { name: "Premium Individual Plan", renews: "Renews on March 26th, 2025" },
    ],
    contracts: [
      {
        name: "Hourly Payment for “Chris @uxdesign_231”",
        renews: "Renews on Feb 21st",
      },
      {
        name: "Monthly installment for “UX Audit Project”",
        renews: "April 1, 2025",
      },
    ],
  },
]

const INITIAL_PAYMENT_METHODS: PaymentMethod[] = Array.from(
  { length: PAYMENT_METHODS_TOTAL },
  (_, index) => {
    const method = BASE_PAYMENT_METHODS[index % BASE_PAYMENT_METHODS.length]

    return {
      ...method,
      id: `${method.id}-${index + 1}`,
      default: index === 0,
      plans: [...method.plans],
      contracts: [...method.contracts],
      billingAddress: [...method.billingAddress],
    }
  }
)

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
] as const

const getDialogExpiration = (expires: string) => {
  const [month, year] = expires.split("/")
  if (!month || !year) return ""
  return `${month}/20${year}`
}

const getBillingAddressParts = (billingAddress: string[]) => {
  const [addressLine1 = "", cityStateZip = "", country = ""] = billingAddress
  const cityMatch = cityStateZip.match(/^(.+?),\s*([A-Z]{2})\s+(.+)$/)

  return {
    addressLine1,
    addressLine2: "",
    city: cityMatch?.[1] || "",
    billingState: cityMatch?.[2] || "",
    zipcode: cityMatch?.[3] || "",
    country,
  }
}

const formatMethodDescription = (method: PaymentMethod) =>
  method.network === "ACH"
    ? `${method.bankName} ${method.label.replace("••••", "****")}`
    : `${method.bankName} ${method.label.replace("••••", "****")}`

const prioritizeDefaultMethod = (methods: PaymentMethod[]) => {
  const defaultIndex = methods.findIndex((method) => method.default)

  if (defaultIndex <= 0) return methods

  const nextMethods = [...methods]
  const [defaultMethod] = nextMethods.splice(defaultIndex, 1)

  return defaultMethod ? [defaultMethod, ...nextMethods] : methods
}

function PaymentPreview({
  imageSrc,
  bankName,
  size = "compact",
  width,
  height,
}: {
  imageSrc: string
  bankName: string
  size?: "compact" | "featured"
  width?: number
  height?: number
}) {
  const isCompact = size === "compact"

  return (
    <div
      className={cn(
        "relative",
        isCompact ? "w-[124px] shrink-0" : "w-full max-w-[272px]"
      )}
    >
      <NextImage
        src={imageSrc}
        alt={`${bankName} payment card`}
        width={width ?? (isCompact ? 124 : 348)}
        height={height ?? (isCompact ? 79 : 225)}
        unoptimized
        className="block h-auto w-full rounded-[7px]"
      />
    </div>
  )
}

export type BillingPaymentMethodsContentHandle = {
  openAddPaymentMethodDialog: () => void
}

export const BillingPaymentMethodsContent = forwardRef<
  BillingPaymentMethodsContentHandle,
  {
    embedded?: boolean
    /**
     * Mounts only the dialogs, not the payment methods list. Lets a screen
     * that just needs the add-payment-method flow (the client dashboard
     * "Verify Payment Method" link) open it in place instead of navigating
     * to billing, without duplicating the dialogs.
     */
    dialogsOnly?: boolean
  }
>(function BillingPaymentMethodsContent(
  { embedded = false, dialogsOnly = false },
  ref
) {
  const { toast } = useToast()
  const [methods, setMethods] = useState(INITIAL_PAYMENT_METHODS)
  const [selectedMethodId, setSelectedMethodId] = useState(
    INITIAL_PAYMENT_METHODS[0]?.id ?? ""
  )
  const [selectedNewPaymentMethodType, setSelectedNewPaymentMethodType] =
    useState("")
  const [isAddNewPaymentMethodDialogOpen, setIsAddNewPaymentMethodDialogOpen] =
    useState(false)
  const [
    isAddCardPaymentMethodDialogOpen,
    setIsAddCardPaymentMethodDialogOpen,
  ] = useState(false)
  const [
    isAddBankPaymentMethodDialogOpen,
    setIsAddBankPaymentMethodDialogOpen,
  ] = useState(false)
  const [dialogMode, setDialogMode] = useState<"add" | "update">("add")
  const [editingMethodId, setEditingMethodId] = useState<string | null>(null)
  const [isSetDefaultDialogOpen, setIsSetDefaultDialogOpen] = useState(false)
  const [isRemoveDialogOpen, setIsRemoveDialogOpen] = useState(false)
  const [isRemoveSuccessDialogOpen, setIsRemoveSuccessDialogOpen] =
    useState(false)
  const [removedMethodLabel, setRemovedMethodLabel] = useState("")

  const [cardNumber, setCardNumber] = useState("")
  const [cardName, setCardName] = useState("")
  const [expirationDate, setExpirationDate] = useState("")
  const [cvv, setCvv] = useState("")
  const [saveCard, setSaveCard] = useState(false)

  const [accountType, setAccountType] = useState("")
  const [accountHolderName, setAccountHolderName] = useState("")
  const [bankRoutingNumber, setBankRoutingNumber] = useState("")
  const [accountNumber, setAccountNumber] = useState("")
  const [confirmAccountNumber, setConfirmAccountNumber] = useState("")
  const [saveBankAccount, setSaveBankAccount] = useState(false)

  const [fullName, setFullName] = useState("John Doe")
  const [addressLine1, setAddressLine1] = useState("1010 E32nd St")
  const [addressLine2, setAddressLine2] = useState("")
  const [city, setCity] = useState("Brooklyn")
  const [billingState, setBillingState] = useState("NY")
  const [zipcode, setZipcode] = useState("11201")
  const [phoneNumber, setPhoneNumber] = useState("+1 (555) 000-0000")

  const selectedMethod = useMemo(
    () =>
      methods.find((method) => method.id === selectedMethodId) ??
      methods[0] ??
      null,
    [methods, selectedMethodId]
  )

  const editingMethod = useMemo(
    () => methods.find((method) => method.id === editingMethodId) ?? null,
    [editingMethodId, methods]
  )

  const billingAddressSummary = {
    fullName: fullName || "John Doe",
    addressLine1: addressLine1 || "1010 E32nd St",
    cityStateZip:
      city && billingState && zipcode
        ? `${city}, ${billingState} ${zipcode}`
        : "Brooklyn, NY 11201",
    phoneNumber: phoneNumber || "+1 (555) 000-0000",
  }

  const isCardFormValid =
    Boolean(cardNumber) &&
    Boolean(cardName) &&
    Boolean(expirationDate) &&
    Boolean(cvv)

  const isBankFormValid =
    Boolean(accountType) &&
    Boolean(accountHolderName) &&
    Boolean(bankRoutingNumber) &&
    Boolean(accountNumber) &&
    Boolean(confirmAccountNumber) &&
    accountNumber === confirmAccountNumber

  const closePaymentMethodDialogs = () => {
    setIsAddNewPaymentMethodDialogOpen(false)
    setIsAddCardPaymentMethodDialogOpen(false)
    setIsAddBankPaymentMethodDialogOpen(false)
  }

  const resetCardForm = () => {
    setCardNumber("")
    setCardName("")
    setExpirationDate("")
    setCvv("")
    setSaveCard(false)
  }

  const resetBankForm = () => {
    setAccountType("")
    setAccountHolderName("")
    setBankRoutingNumber("")
    setAccountNumber("")
    setConfirmAccountNumber("")
    setSaveBankAccount(false)
  }

  const prefillBillingAddress = (method: PaymentMethod) => {
    const nextAddress = getBillingAddressParts(method.billingAddress)
    setFullName(method.holder || "John Doe")
    setAddressLine1(nextAddress.addressLine1)
    setAddressLine2(nextAddress.addressLine2)
    setCity(nextAddress.city)
    setBillingState(nextAddress.billingState)
    setZipcode(nextAddress.zipcode)
  }

  const openAddNewPaymentMethodDialog = () => {
    setDialogMode("add")
    setEditingMethodId(null)
    setSelectedNewPaymentMethodType("")
    resetCardForm()
    resetBankForm()
    closePaymentMethodDialogs()
    setIsAddNewPaymentMethodDialogOpen(true)
  }

  useImperativeHandle(
    ref,
    () => ({
      openAddPaymentMethodDialog: openAddNewPaymentMethodDialog,
    }),
    [openAddNewPaymentMethodDialog]
  )

  const openUpdateDialog = () => {
    if (!selectedMethod) return

    setDialogMode("update")
    setEditingMethodId(selectedMethod.id)
    prefillBillingAddress(selectedMethod)

    if (selectedMethod.network === "ACH") {
      const accountLabel = selectedMethod.label.split(" ")[0]
      setAccountType(accountLabel === "Checking" ? "Checking" : "Savings")
      setAccountHolderName(selectedMethod.holder)
      setBankRoutingNumber("121000358")
      setAccountNumber(`000000${selectedMethod.last4}`)
      setConfirmAccountNumber(`000000${selectedMethod.last4}`)
      setSaveBankAccount(selectedMethod.default)
      closePaymentMethodDialogs()
      setIsAddBankPaymentMethodDialogOpen(true)
      return
    }

    setCardNumber(`411111111111${selectedMethod.last4}`)
    setCardName(selectedMethod.holder)
    setExpirationDate(getDialogExpiration(selectedMethod.expires))
    setCvv("")
    setSaveCard(selectedMethod.default)
    closePaymentMethodDialogs()
    setIsAddCardPaymentMethodDialogOpen(true)
  }

  const handleOpenPaymentMethodType = (value: NewPaymentMethodOptionValue) => {
    setSelectedNewPaymentMethodType(value)

    if (value === "credit-card") {
      setIsAddNewPaymentMethodDialogOpen(false)
      setIsAddCardPaymentMethodDialogOpen(true)
      return
    }

    if (value === "bank-account") {
      setIsAddNewPaymentMethodDialogOpen(false)
      setIsAddBankPaymentMethodDialogOpen(true)
      return
    }

    const walletMethod: PaymentMethod = {
      id: `${value}-${Date.now()}`,
      bankName: value === "google-pay" ? "Google Pay" : "Apple Pay",
      contractSummary: "No Active Contracts",
      contractCount: 0,
      label: "Wallet",
      holder: fullName || "John Doe",
      expires: "02/27",
      network: "VISA",
      kind: "DEBIT",
      last4: "5555",
      default: false,
      ...CARD_IMAGE_VARIANTS.white,
      billingAddress: ["1010 E32nd St", "Brooklyn, NY 11201", "United States"],
      plans: [],
      contracts: [],
    }

    setMethods((prev) => [walletMethod, ...prev])
    setSelectedMethodId(walletMethod.id)
    closePaymentMethodDialogs()
  }

  const upsertMethod = (nextMethod: PaymentMethod) => {
    setMethods((prev) => {
      const nextPrev = nextMethod.default
        ? prev.map((method) => ({
            ...method,
            default: false,
          }))
        : prev

      if (editingMethodId) {
        const nextMethods = nextPrev.map((method) =>
          method.id === editingMethodId ? nextMethod : method
        )

        return nextMethod.default
          ? prioritizeDefaultMethod(nextMethods)
          : nextMethods
      }

      const nextMethods = [nextMethod, ...nextPrev]

      return nextMethod.default
        ? prioritizeDefaultMethod(nextMethods)
        : nextMethods
    })
    setSelectedMethodId(nextMethod.id)
  }

  const handleSaveCard = () => {
    if (!isCardFormValid) return

    const sourceMethod = editingMethod
    const nextMethod: PaymentMethod = {
      id: editingMethodId ?? `card-${Date.now()}`,
      bankName: sourceMethod?.bankName ?? "Bank of America",
      contractSummary: sourceMethod?.contractSummary ?? "No Active Contracts",
      contractCount: sourceMethod?.contractCount ?? 0,
      label: `Credit Card ••••${cardNumber.slice(-4)}`,
      holder: cardName,
      expires:
        expirationDate.length >= 7
          ? `${expirationDate.slice(0, 2)}/${expirationDate.slice(-2)}`
          : (sourceMethod?.expires ?? "02/27"),
      network: "VISA",
      kind: sourceMethod?.kind ?? "DEBIT",
      last4: cardNumber.slice(-4),
      default: saveCard,
      cardImageSrc:
        sourceMethod?.cardImageSrc ?? CARD_IMAGE_VARIANTS.white.cardImageSrc,
      cardImageActiveSrc:
        sourceMethod?.cardImageActiveSrc ??
        CARD_IMAGE_VARIANTS.white.cardImageActiveSrc,
      cardImageWidth:
        sourceMethod?.cardImageWidth ??
        CARD_IMAGE_VARIANTS.white.cardImageWidth,
      cardImageHeight:
        sourceMethod?.cardImageHeight ??
        CARD_IMAGE_VARIANTS.white.cardImageHeight,
      cardImageActiveWidth:
        sourceMethod?.cardImageActiveWidth ??
        CARD_IMAGE_VARIANTS.white.cardImageActiveWidth,
      cardImageActiveHeight:
        sourceMethod?.cardImageActiveHeight ??
        CARD_IMAGE_VARIANTS.white.cardImageActiveHeight,
      featuredCardImageSrc:
        sourceMethod?.featuredCardImageSrc ??
        CARD_IMAGE_VARIANTS.white.featuredCardImageSrc,
      featuredCardImageActiveSrc:
        sourceMethod?.featuredCardImageActiveSrc ??
        CARD_IMAGE_VARIANTS.white.featuredCardImageActiveSrc,
      featuredCardImageWidth:
        sourceMethod?.featuredCardImageWidth ??
        CARD_IMAGE_VARIANTS.white.featuredCardImageWidth,
      featuredCardImageHeight:
        sourceMethod?.featuredCardImageHeight ??
        CARD_IMAGE_VARIANTS.white.featuredCardImageHeight,
      featuredCardImageActiveWidth:
        sourceMethod?.featuredCardImageActiveWidth ??
        CARD_IMAGE_VARIANTS.white.featuredCardImageActiveWidth,
      featuredCardImageActiveHeight:
        sourceMethod?.featuredCardImageActiveHeight ??
        CARD_IMAGE_VARIANTS.white.featuredCardImageActiveHeight,
      billingAddress: [
        addressLine1 || "1010 E32nd St",
        `${city || "Brooklyn"}, ${billingState || "NY"} ${zipcode || "11201"}`,
        "United States",
      ],
      plans: sourceMethod?.plans ?? [],
      contracts: sourceMethod?.contracts ?? [],
    }

    upsertMethod(saveCard ? { ...nextMethod, default: true } : nextMethod)
    closePaymentMethodDialogs()
    resetCardForm()
  }

  const handleSaveBank = () => {
    if (!isBankFormValid) return

    const sourceMethod = editingMethod
    const nextMethod: PaymentMethod = {
      id: editingMethodId ?? `bank-${Date.now()}`,
      bankName: sourceMethod?.bankName ?? "Bank of America",
      contractSummary: sourceMethod?.contractSummary ?? "No Active Contracts",
      contractCount: sourceMethod?.contractCount ?? 0,
      label: `${accountType} ••••${accountNumber.slice(-4)}`,
      holder: accountHolderName,
      expires: sourceMethod?.expires ?? "02/27",
      network: "ACH",
      kind: accountType === "Checking" ? "DEBIT" : "SAVINGS",
      last4: accountNumber.slice(-4),
      default: saveBankAccount,
      cardImageSrc:
        sourceMethod?.cardImageSrc ?? CARD_IMAGE_VARIANTS.dark.cardImageSrc,
      cardImageActiveSrc:
        sourceMethod?.cardImageActiveSrc ??
        CARD_IMAGE_VARIANTS.dark.cardImageActiveSrc,
      cardImageWidth:
        sourceMethod?.cardImageWidth ?? CARD_IMAGE_VARIANTS.dark.cardImageWidth,
      cardImageHeight:
        sourceMethod?.cardImageHeight ??
        CARD_IMAGE_VARIANTS.dark.cardImageHeight,
      cardImageActiveWidth:
        sourceMethod?.cardImageActiveWidth ??
        CARD_IMAGE_VARIANTS.dark.cardImageActiveWidth,
      cardImageActiveHeight:
        sourceMethod?.cardImageActiveHeight ??
        CARD_IMAGE_VARIANTS.dark.cardImageActiveHeight,
      featuredCardImageSrc:
        sourceMethod?.featuredCardImageSrc ??
        CARD_IMAGE_VARIANTS.dark.featuredCardImageSrc,
      featuredCardImageActiveSrc:
        sourceMethod?.featuredCardImageActiveSrc ??
        CARD_IMAGE_VARIANTS.dark.featuredCardImageActiveSrc,
      featuredCardImageWidth:
        sourceMethod?.featuredCardImageWidth ??
        CARD_IMAGE_VARIANTS.dark.featuredCardImageWidth,
      featuredCardImageHeight:
        sourceMethod?.featuredCardImageHeight ??
        CARD_IMAGE_VARIANTS.dark.featuredCardImageHeight,
      featuredCardImageActiveWidth:
        sourceMethod?.featuredCardImageActiveWidth ??
        CARD_IMAGE_VARIANTS.dark.featuredCardImageActiveWidth,
      featuredCardImageActiveHeight:
        sourceMethod?.featuredCardImageActiveHeight ??
        CARD_IMAGE_VARIANTS.dark.featuredCardImageActiveHeight,
      billingAddress: sourceMethod?.billingAddress ?? [
        "1010 E32nd St",
        "Brooklyn, NY 11201",
        "United States",
      ],
      plans: sourceMethod?.plans ?? [],
      contracts: sourceMethod?.contracts ?? [],
    }

    upsertMethod(
      saveBankAccount ? { ...nextMethod, default: true } : nextMethod
    )
    closePaymentMethodDialogs()
    resetBankForm()
  }

  const handleSetDefault = () => {
    if (!selectedMethod) return

    setMethods((prev) =>
      prioritizeDefaultMethod(
        prev.map((method) => ({
          ...method,
          default: method.id === selectedMethod.id,
        }))
      )
    )
    setIsSetDefaultDialogOpen(false)
    toast({
      title: "Default payment method updated",
      variant: "success",
    })
  }

  const handleRemoveMethod = () => {
    if (!selectedMethod || methods.length <= 1) return

    const removedLabel =
      selectedMethod.network === "ACH"
        ? `${selectedMethod.bankName} ·${selectedMethod.last4}`
        : `${selectedMethod.network.charAt(0)}${selectedMethod.network.slice(1).toLowerCase()} ·${selectedMethod.last4}`

    const remainingMethods = methods.filter(
      (method) => method.id !== selectedMethod.id
    )
    const nextMethods = selectedMethod.default
      ? remainingMethods.map((method, index) => ({
          ...method,
          default: index === 0,
        }))
      : remainingMethods

    setMethods(nextMethods)
    setSelectedMethodId(remainingMethods[0]?.id ?? "")
    setRemovedMethodLabel(removedLabel)
    setIsRemoveDialogOpen(false)
    setIsRemoveSuccessDialogOpen(true)
  }

  const content = (
    <div className="grid h-full min-h-0 gap-5 overflow-hidden xl:grid-cols-[314px_minmax(0,1fr)]">
      <section className="flex h-full min-h-0 flex-col overflow-hidden rounded-[10px] border border-gray-200 bg-white shadow-[0px_1px_4px_0px_rgba(16,24,40,.04)]">
        <div className="px-6 pb-3 pt-5">
          <h2 className="text-[17px] font-semibold leading-7 text-dark-blue-400">
            Payment Methods ({PAYMENT_METHODS_TOTAL})
          </h2>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-0 pb-0">
          <div>
            {methods.map((method) => (
              <button
                key={method.id}
                type="button"
                onClick={() => setSelectedMethodId(method.id)}
                className="block w-full text-left focus-visible:outline-none"
              >
                <div
                  className={cn(
                    "grid grid-cols-[124px_minmax(0,1fr)] items-start gap-3 transition duration-200",
                    method.id === selectedMethodId
                      ? "rounded-[8px] border-2 border-primary-500 bg-primary-50 p-[10px] shadow-[0px_4px_12px_-6px_rgba(48,108,254,.28)]"
                      : "border-b border-gray-200 bg-white px-[12px] py-[12px] hover:bg-gray-50"
                  )}
                >
                  <PaymentPreview
                    imageSrc={method.cardImageSrc}
                    bankName={method.bankName}
                    size="compact"
                    width={method.cardImageWidth}
                    height={method.cardImageHeight}
                  />

                  <div className="min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="truncate text-[14px] font-semibold leading-5 text-dark-blue-400">
                        {method.bankName}
                      </h3>
                      {method.default ? (
                        <Badge
                          visual="primary"
                          size="sm"
                          className="shrink-0 rounded-[5px] px-2 py-0.5 text-[10px] font-semibold"
                        >
                          Default
                        </Badge>
                      ) : null}
                    </div>
                    <p className="text-[10px] leading-4 text-gray-500">
                      {method.contractSummary}
                    </p>
                    <div className="mt-[7px]">
                      <p className="text-[10px] font-medium leading-4 text-dark-blue-400">
                        {method.label}
                      </p>
                      <p className="text-[8px] leading-3 text-gray-500">
                        Expires {method.expires}
                      </p>
                    </div>
                  </div>
                </div>
              </button>
            ))}

            <button
              type="button"
              onClick={openAddNewPaymentMethodDialog}
              className="block w-full border-t border-gray-200 bg-white px-[12px] py-[12px] text-left transition duration-200 hover:bg-gray-50 focus-visible:outline-none"
            >
              <div className="flex items-center gap-3 rounded-[8px] border border-dashed border-gray-300 bg-gray-25 px-4 py-4">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary-50 text-primary-500">
                  <Plus className="size-5" />
                </div>

                <div className="min-w-0">
                  <p className="text-[14px] font-semibold leading-5 text-dark-blue-400">
                    Add a new payment method
                  </p>
                  <p className="text-[10px] leading-4 text-gray-500">
                    Add a card or bank account
                  </p>
                </div>
              </div>
            </button>
          </div>
        </div>
      </section>

      {selectedMethod ? (
        <section className="flex h-full min-h-0 flex-col overflow-hidden rounded-lg border border-gray-200 bg-white shadow-[0px_1px_5px_0px_rgba(16,24,40,.02)]">
          <div className="px-4 py-4 md:px-5 md:py-4">
            <div className="grid items-center gap-6 xl:grid-cols-[272px_minmax(0,1fr)]">
              <PaymentPreview
                imageSrc={selectedMethod.featuredCardImageSrc}
                bankName={selectedMethod.bankName}
                size="featured"
                width={selectedMethod.featuredCardImageWidth}
                height={selectedMethod.featuredCardImageHeight}
              />

              <div className="flex h-full items-center">
                <div className="grid gap-6 md:grid-cols-2">
                  <div>
                    <div className="flex items-start gap-2.5">
                      <MapPin className="mt-0.5 size-4 shrink-0 text-gray-400" />
                      <div>
                        <h3 className="text-sm font-semibold text-dark-blue-400">
                          Billing address
                        </h3>
                        <div className="mt-2 space-y-0.5 text-sm leading-5 text-dark-blue-400">
                          {selectedMethod.billingAddress.map((line) => (
                            <p key={line}>{line}</p>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div>
                    <div className="flex items-start gap-2.5">
                      <File02 className="mt-0.5 size-4 shrink-0 text-gray-400" />
                      <div>
                        <h3 className="text-sm font-semibold text-dark-blue-400">
                          Your Plans
                        </h3>
                        <div className="mt-2 space-y-2">
                          {selectedMethod.plans.map((plan) => (
                            <div key={plan.name}>
                              <p className="text-sm font-semibold leading-5 text-dark-blue-400">
                                {plan.name}
                              </p>
                              <p className="text-sm leading-5 text-gray-500">
                                {plan.renews}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-4 grid gap-2 md:grid-cols-3">
              <Button
                size="sm"
                variant="outlined"
                visual="gray"
                className="bg-white text-dark-blue-400"
                leftIcon={<Edit03 className="size-4" />}
                onClick={openUpdateDialog}
              >
                Update card
              </Button>
              <Button
                size="sm"
                variant="outlined"
                visual={selectedMethod.default ? "primary" : "gray"}
                className={cn(
                  selectedMethod.default
                    ? "bg-primary-50 text-primary-600 hover:bg-primary-50"
                    : "bg-white text-dark-blue-400"
                )}
                leftIcon={<Check className="size-4" />}
                onClick={() => {
                  if (!selectedMethod || selectedMethod.default) return
                  setIsSetDefaultDialogOpen(true)
                }}
                disabled={selectedMethod.default}
              >
                {selectedMethod.default ? "Default Card" : "Set as Default"}
              </Button>
              <Button
                size="sm"
                variant="outlined"
                visual="gray"
                className="bg-white text-error-500 hover:bg-error-50"
                leftIcon={<Trash03 className="size-4" />}
                onClick={() => setIsRemoveDialogOpen(true)}
                disabled={methods.length <= 1}
              >
                Remove card
              </Button>
            </div>
          </div>

          <div className="min-h-0 flex-1 border-t border-gray-200 px-4 py-4 md:px-5">
            <div className="flex items-center justify-between gap-4">
              <h3 className="text-sm font-semibold text-dark-blue-400">
                Active Contracts
              </h3>

              <NextLink href="/my-contracts">
                <Button
                  variant="link"
                  visual="gray"
                  size="sm"
                  className="justify-start text-sm font-semibold text-dark-blue-400 hover:text-primary-500 hover:underline"
                  rightIcon={<ArrowRight className="size-4" />}
                >
                  View All Contracts
                </Button>
              </NextLink>
            </div>

            <div className="mt-3 overflow-hidden rounded-lg border border-gray-200">
              {selectedMethod.contracts.map((contract, index) => (
                <div
                  key={`${selectedMethod.id}-${contract.name}-${contract.renews}`}
                  className={cn(
                    "flex flex-col gap-1 bg-white px-5 py-5 sm:flex-row sm:items-center sm:justify-between",
                    index !== selectedMethod.contracts.length - 1 &&
                      "border-b border-gray-200"
                  )}
                >
                  <p className="text-sm leading-5 text-dark-blue-400">
                    {contract.name}
                  </p>
                  <p className="text-sm leading-5 text-gray-500">
                    {contract.renews}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>
      ) : null}
    </div>
  )

  return (
    <>
      {dialogsOnly ? null : !embedded ? (
        <AuthenticatedRoute>
          <div className="flex h-[100dvh] overflow-hidden bg-gray-50">
            <LeftSidebar />

            <div className="min-[1024px]:pl-[var(--sidebar-content-pl,274px)] transition-[padding-left] duration-300 ease-in-out min-[1024px]:pr-[50px] min-[1024px]:pt-[50px] min-[1024px]:pb-8 flex h-full flex-auto overflow-hidden p-3.5 md:p-6">
              <div className="mx-auto flex h-full max-h-full w-full max-w-[1160px] flex-col gap-5 overflow-hidden">
                <BillingSectionHeader
                  title="Billing"
                  description=""
                  actions={
                    <>
                      <Button
                        variant="link"
                        visual="gray"
                        size="sm"
                        className="text-gray-500"
                        leftIcon={<HelpCircle className="size-4" />}
                      >
                        Get Help
                      </Button>
                      <Button
                        onClick={openAddNewPaymentMethodDialog}
                        leftIcon={<Plus className="size-4" />}
                      >
                        Add Payment Method
                      </Button>
                    </>
                  }
                />

                <div className="flex h-full min-h-0 flex-col overflow-hidden">
                  {content}
                </div>
              </div>
            </div>
          </div>
        </AuthenticatedRoute>
      ) : (
        <div className="flex h-full min-h-0 flex-col overflow-hidden">
          {content}
        </div>
      )}

      <Dialog
        open={isSetDefaultDialogOpen}
        onOpenChange={setIsSetDefaultDialogOpen}
      >
        <DialogContent className="max-w-[420px] p-0">
          <div className="border-b border-gray-200 px-5 py-4">
            <h2 className="text-lg font-semibold leading-7 text-dark-blue-400">
              Set Default Payment Method?
            </h2>
            <p className="mt-1 text-sm leading-6 text-gray-500">
              {selectedMethod
                ? `Use ${formatMethodDescription(selectedMethod)} as your default payment method?`
                : "Use this payment method as your default?"}
            </p>
          </div>

          <div className="flex items-center justify-end gap-3 px-5 py-4">
            <DialogClose asChild>
              <Button variant="outlined" visual="gray">
                Cancel
              </Button>
            </DialogClose>
            <Button onClick={handleSetDefault}>Set as Default</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isRemoveDialogOpen} onOpenChange={setIsRemoveDialogOpen}>
        <DialogContent className="max-w-[548px] p-0">
          <div className="flex items-start justify-between border-b border-gray-200 px-5 py-4">
            <div>
              <h2 className="text-[18px] font-semibold leading-7 text-dark-blue-400">
                Remove payment method?
              </h2>
              <p className="mt-2 text-sm leading-6 text-gray-500">
                This payment method will be removed from your account.
              </p>
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

          {selectedMethod ? (
            <div className="px-5 py-5">
              <div className="rounded-lg border border-gray-200 bg-white px-4 py-4">
                <div className="flex items-center gap-4">
                  <NextImage
                    src={selectedMethod.cardImageSrc}
                    alt={`${selectedMethod.bankName} payment card`}
                    width={56}
                    height={36}
                    unoptimized
                    className="h-[36px] w-[56px] rounded-[4px]"
                  />

                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold leading-5 text-dark-blue-400">
                      {formatMethodDescription(selectedMethod)}
                    </p>
                    <p className="mt-1 text-xs leading-4 text-gray-500">
                      {selectedMethod.holder} • Expires {selectedMethod.expires}
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-3 flex items-center gap-2 rounded-[4px] bg-gray-100 px-3 py-3">
                <AlertCircle className="size-[18px] shrink-0 text-dark-blue-400/60" />
                <p className="text-xs leading-5 text-gray-500">
                  Any payment in progress will complete before this method is
                  removed.
                </p>
              </div>

              <div className="mt-5 flex items-center justify-end gap-3">
                <DialogClose asChild>
                  <Button variant="outlined" visual="gray">
                    Cancel
                  </Button>
                </DialogClose>
                <Button visual="error" onClick={handleRemoveMethod}>
                  Remove
                </Button>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog
        open={isRemoveSuccessDialogOpen}
        onOpenChange={setIsRemoveSuccessDialogOpen}
      >
        <DialogContent className="max-w-[580px] p-0">
          <div className="flex justify-end px-5 pt-5">
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

          <div className="px-6 pb-7 pt-2 text-center">
            <div className="mx-auto flex size-[64px] items-center justify-center rounded-full bg-black text-white">
              <Check className="size-9" />
            </div>

            <h2 className="mt-8 text-[18px] font-semibold leading-7 text-dark-blue-400">
              {removedMethodLabel || "Payment method"} has been removed
            </h2>
            <p className="mt-2 text-sm leading-6 text-gray-500">
              This payment method was successfully removed from your account.
            </p>

            <div className="mt-6 flex justify-center">
              <DialogClose asChild>
                <Button className="min-w-[100px]">Done</Button>
              </DialogClose>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={isAddNewPaymentMethodDialogOpen}
        onOpenChange={setIsAddNewPaymentMethodDialogOpen}
      >
        <DialogContent className="max-w-[700px] p-0">
          <div className="flex items-center justify-between border-b border-gray-200 p-3">
            <div className="flex items-center gap-x-3">
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
              value={selectedNewPaymentMethodType}
              onValueChange={(value) =>
                handleOpenPaymentMethodType(
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
        open={isAddCardPaymentMethodDialogOpen}
        onOpenChange={setIsAddCardPaymentMethodDialogOpen}
      >
        <DialogContent className="max-w-[700px] p-0">
          <div className="flex items-center justify-between border-b border-gray-200 p-3">
            <div className="flex items-center gap-x-3">
              <IconButton
                variant="ghost"
                visual="gray"
                size="md"
                className="text-dark-blue-400"
                onClick={() => {
                  setIsAddCardPaymentMethodDialogOpen(false)
                  setIsAddNewPaymentMethodDialogOpen(true)
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
              <Lock className="size-4" /> Your payment is secure. Your card
              details will not be shared.
            </p>

            <div className="mt-6 space-y-3">
              <div className="space-y-1.5">
                <Label size="sm" htmlFor="payment-method-card-number">
                  Card Number
                </Label>
                <CreditCardInput
                  id="payment-method-card-number"
                  value={cardNumber}
                  onValueChange={setCardNumber}
                />
              </div>

              <div className="space-y-1.5">
                <Label size="sm" htmlFor="payment-method-card-name">
                  Name On Card
                </Label>
                <Input
                  id="payment-method-card-name"
                  type="text"
                  placeholder="John Doe"
                  value={cardName}
                  onChange={(event) => setCardName(event.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-x-3">
                <div className="space-y-1.5">
                  <Label size="sm" htmlFor="payment-method-expiration-date">
                    Expiration Date
                  </Label>
                  <Input
                    id="payment-method-expiration-date"
                    type="text"
                    placeholder="MM/YYYY"
                    value={expirationDate}
                    onChange={(event) => {
                      const sanitized = event.target.value.replace(/[^\d]/g, "")
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
                  <Label size="sm" htmlFor="payment-method-cvv-cvc">
                    CVV / CVC
                  </Label>
                  <InputGroup>
                    <Input
                      id="payment-method-cvv-cvc"
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
                          <TooltipContent
                            className="max-w-[139px]"
                            visual="gray"
                          >
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
                id="save-payment-method-default"
                checked={saveCard}
                onCheckedChange={(value) => setSaveCard(value === true)}
              />
              <Label size="sm" htmlFor="save-payment-method-default">
                Save as default payment method
              </Label>
            </div>

            <div className="mt-[50px]">
              <h3 className="text-lg font-bold leading-none text-dark-blue-400">
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
                  setIsAddCardPaymentMethodDialogOpen(false)
                  setIsAddNewPaymentMethodDialogOpen(true)
                }}
              >
                Cancel
              </Button>
              <Button disabled={!isCardFormValid} onClick={handleSaveCard}>
                Save Card
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={isAddBankPaymentMethodDialogOpen}
        onOpenChange={setIsAddBankPaymentMethodDialogOpen}
      >
        <DialogContent className="max-w-[700px] p-0">
          <div className="flex items-center justify-between border-b border-gray-200 p-3">
            <div className="flex items-center gap-x-3">
              <IconButton
                variant="ghost"
                visual="gray"
                size="md"
                className="text-dark-blue-400"
                onClick={() => {
                  setIsAddBankPaymentMethodDialogOpen(false)
                  setIsAddNewPaymentMethodDialogOpen(true)
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
                <Label size="sm" htmlFor="payment-method-account-type">
                  Account Type
                </Label>
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
                <Label size="sm" htmlFor="payment-method-account-holder-name">
                  Account Holder Name
                </Label>
                <Input
                  id="payment-method-account-holder-name"
                  type="text"
                  placeholder="John Doe"
                  value={accountHolderName}
                  onChange={(event) => setAccountHolderName(event.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label size="sm" htmlFor="payment-method-bank-routing-number">
                  Bank Routing Number
                </Label>
                <Input
                  id="payment-method-bank-routing-number"
                  type="text"
                  placeholder="xxxx-xxxx-xx"
                  value={bankRoutingNumber}
                  onChange={(event) => setBankRoutingNumber(event.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-x-3">
                <div className="space-y-1.5">
                  <Label size="sm" htmlFor="payment-method-account-number">
                    Account Number
                  </Label>
                  <Input
                    id="payment-method-account-number"
                    type="text"
                    placeholder="Up to 17 digits"
                    value={accountNumber}
                    onChange={(event) => setAccountNumber(event.target.value)}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label
                    size="sm"
                    htmlFor="payment-method-confirm-account-number"
                  >
                    Re-Enter Account Number
                  </Label>
                  <Input
                    id="payment-method-confirm-account-number"
                    type="text"
                    placeholder="Up to 17 digits"
                    value={confirmAccountNumber}
                    onChange={(event) =>
                      setConfirmAccountNumber(event.target.value)
                    }
                  />
                </div>
              </div>
            </div>

            <div className="mt-[22px] flex items-center gap-x-3">
              <Checkbox
                size="md"
                id="save-payment-method-bank-default"
                checked={saveBankAccount}
                onCheckedChange={(value) => setSaveBankAccount(value === true)}
              />
              <Label size="sm" htmlFor="save-payment-method-bank-default">
                Save as default payment method
              </Label>
            </div>

            <div className="mt-[50px] flex items-center justify-end gap-x-2">
              <Button
                type="button"
                variant="outlined"
                visual="gray"
                onClick={() => {
                  setIsAddBankPaymentMethodDialogOpen(false)
                  setIsAddNewPaymentMethodDialogOpen(true)
                }}
              >
                Cancel
              </Button>
              <Button disabled={!isBankFormValid} onClick={handleSaveBank}>
                Save Account
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
})

export default function ClientPaymentsPage() {
  return <BillingPaymentMethodsContent />
}
