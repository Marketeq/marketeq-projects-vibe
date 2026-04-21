"use client"

import NextLink from "next/link"
import { forwardRef, useImperativeHandle, useMemo, useState } from "react"
import { BillingSectionHeader } from "@/components/billing-section-header"
import AuthenticatedRoute from "@/hoc/AuthenticatedRoute"
import { CreditCardInput, getCardType } from "@/components/credit-card-input"
import {
  ACH,
  Amex as PaymentAmex,
  ApplePay1,
  GPay1,
  Visa as PaymentVisa,
} from "@/components/icons/payment-icons"
import { LeftSidebar } from "@/components/talent-dashboard-comps"
import { InputRightElement } from "@/components/ui/input/input-element"
import {
  ArrowLeft,
  ArrowRight,
  Bank,
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
  RmDialog,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui"
import { cn } from "@/utils/functions"

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
  billingAddress: string[]
  plans: { name: string; renews: string }[]
  contracts: { name: string; renews: string }[]
}

type NewPaymentMethodOptionValue =
  | "credit-card"
  | "bank-account"
  | "google-pay"
  | "apple-pay"

const INITIAL_PAYMENT_METHODS: PaymentMethod[] = [
  {
    id: "boa-default",
    bankName: "Bank of America",
    contractSummary: "No Active Contracts",
    contractCount: 0,
    label: "Credit Card ••••1937",
    holder: "John Doe",
    expires: "02/27",
    network: "VISA",
    kind: "DEBIT",
    last4: "5555",
    default: true,
    billingAddress: ["1010 E32nd St", "Brooklyn, NY 11201", "United States"],
    plans: [
      { name: "Essentials Agency Plan", renews: "Renews On March 26, 2025" },
      { name: "Premium Individual Plan", renews: "Renews On March 26, 2025" },
    ],
    contracts: [
      { name: "Installment for Audit Project", renews: "Renews Feb 21" },
      { name: "Active Contract for Audit Project", renews: "Renews Feb 21" },
      { name: "Installment for “Chris @uxdesgn”", renews: "Renews Jun 26" },
      { name: "Installment for “Chris @uxdesgn”", renews: "Renews Jun 26" },
      { name: "Installment for “Chris @uxdesgn”", renews: "Renews Jun 26" },
      { name: "Installment for “Chris @uxdesgn”", renews: "Renews Jun 26" },
      { name: "Active Contract for “Chris @uxdesgn”", renews: "Renews Jun 26" },
    ],
  },
  {
    id: "boa-two",
    bankName: "Bank of America",
    contractSummary: "5 Active Contacts",
    contractCount: 5,
    label: "Credit Card ••••1937",
    holder: "John Doe",
    expires: "02/27",
    network: "VISA",
    kind: "DEBIT",
    last4: "5555",
    default: false,
    billingAddress: ["1010 E32nd St", "Brooklyn, NY 11201", "United States"],
    plans: [{ name: "Essentials Agency Plan", renews: "Renews On March 26, 2025" }],
    contracts: [
      { name: "Installment for Audit Project", renews: "Renews Feb 21" },
      { name: "Active Contract for Audit Project", renews: "Renews Feb 21" },
    ],
  },
  {
    id: "jpm-ach",
    bankName: "JP Morgan",
    contractSummary: "5 Active Contacts",
    contractCount: 5,
    label: "Checking ••••1937",
    holder: "John Doe",
    expires: "02/27",
    network: "ACH",
    kind: "SAVINGS",
    last4: "5555",
    default: false,
    billingAddress: ["420 Park Ave", "New York, NY 10022", "United States"],
    plans: [{ name: "Agency Banking Plan", renews: "Renews On April 9, 2025" }],
    contracts: [
      { name: "Monthly retainer for JP Morgan", renews: "Renews Apr 20" },
      { name: "Installment for Payments Dashboard", renews: "Renews May 18" },
    ],
  },
  {
    id: "boa-three",
    bankName: "Bank of America",
    contractSummary: "5 Active Contacts",
    contractCount: 5,
    label: "Credit Card ••••1937",
    holder: "John Doe",
    expires: "02/27",
    network: "VISA",
    kind: "DEBIT",
    last4: "5555",
    default: false,
    billingAddress: ["1010 E32nd St", "Brooklyn, NY 11201", "United States"],
    plans: [{ name: "Premium Individual Plan", renews: "Renews On March 26, 2025" }],
    contracts: [
      { name: "Active Contract for Audit Project", renews: "Renews Feb 21" },
      { name: "Installment for “Chris @uxdesgn”", renews: "Renews Jun 26" },
    ],
  },
  {
    id: "boa-four",
    bankName: "Bank of America",
    contractSummary: "5 Active Contacts",
    contractCount: 5,
    label: "Credit Card ••••1937",
    holder: "John Doe",
    expires: "02/27",
    network: "VISA",
    kind: "DEBIT",
    last4: "5555",
    default: false,
    billingAddress: ["1010 E32nd St", "Brooklyn, NY 11201", "United States"],
    plans: [{ name: "Premium Individual Plan", renews: "Renews On March 26, 2025" }],
    contracts: [
      { name: "Installment for Audit Project", renews: "Renews Feb 21" },
      { name: "Installment for “Chris @uxdesgn”", renews: "Renews Jun 26" },
    ],
  },
  {
    id: "boa-five",
    bankName: "Bank of America",
    contractSummary: "5 Active Contacts",
    contractCount: 5,
    label: "Credit Card ••••1937",
    holder: "John Doe",
    expires: "02/27",
    network: "VISA",
    kind: "DEBIT",
    last4: "5555",
    default: false,
    billingAddress: ["1010 E32nd St", "Brooklyn, NY 11201", "United States"],
    plans: [{ name: "Premium Individual Plan", renews: "Renews On March 26, 2025" }],
    contracts: [
      { name: "Installment for Audit Project", renews: "Renews Feb 21" },
      { name: "Active Contract for “Chris @uxdesgn”", renews: "Renews Jun 26" },
    ],
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
] as const

const getCardBrandName = (cardNumber?: string) => {
  const kind = getCardType(cardNumber || "")

  if (kind === "visa") return "Visa"
  if (kind === "amex") return "American Express"
  if (kind === "discover") return "Discover"
  if (kind === "mastercard") return "Mastercard"

  return "Credit Card"
}

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

function PaymentPreview({
  network,
  kind,
  last4,
  compact = false,
}: {
  network: PaymentMethod["network"]
  kind: PaymentMethod["kind"]
  last4: string
  compact?: boolean
}) {
  return (
    <div
      className={cn(
        "rounded-lg bg-black text-white shadow-sm",
        compact ? "h-[98px] w-[176px] p-3.5" : "h-[min(156px,20vh)] w-full max-w-[320px] p-4"
      )}
    >
      <div className="flex h-full flex-col justify-between">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-[10px] font-medium uppercase tracking-[0.08em] text-white/70">
              {kind}
            </p>
            <p className={cn("font-semibold", compact ? "mt-1 text-[19px]" : "mt-1 text-[24px] leading-none")}>
              {network}
            </p>
          </div>
        </div>

        <div>
          <p className={cn("tracking-[0.16em]", compact ? "text-[11px]" : "text-[18px] leading-none")}>
            •••• •••• •••• {last4}
          </p>

          <div className={cn("mt-3 flex items-end justify-between", compact && "mt-2")}>
            <div>
              <p className="text-[10px] text-white/70">CardHolder</p>
              <p className={cn("font-medium", compact ? "text-[10px]" : "text-sm")}>John Doe</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] text-white/70">Expires</p>
              <p className={cn("font-medium", compact ? "text-[10px]" : "text-sm")}>07/2028</p>
            </div>
          </div>
        </div>
      </div>
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
  }
>(function BillingPaymentMethodsContent({ embedded = false }, ref) {
  const [methods, setMethods] = useState(INITIAL_PAYMENT_METHODS)
  const [selectedMethodId, setSelectedMethodId] = useState(INITIAL_PAYMENT_METHODS[0]?.id ?? "")
  const [selectedNewPaymentMethodType, setSelectedNewPaymentMethodType] = useState("")
  const [isAddNewPaymentMethodDialogOpen, setIsAddNewPaymentMethodDialogOpen] = useState(false)
  const [isAddCardPaymentMethodDialogOpen, setIsAddCardPaymentMethodDialogOpen] = useState(false)
  const [isAddBankPaymentMethodDialogOpen, setIsAddBankPaymentMethodDialogOpen] = useState(false)
  const [dialogMode, setDialogMode] = useState<"add" | "update">("add")
  const [editingMethodId, setEditingMethodId] = useState<string | null>(null)

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
    () => methods.find((method) => method.id === selectedMethodId) ?? methods[0] ?? null,
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
      if (editingMethodId) {
        return prev.map((method) => (method.id === editingMethodId ? nextMethod : method))
      }

      return [nextMethod, ...prev]
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
          : sourceMethod?.expires ?? "02/27",
      network: "VISA",
      kind: sourceMethod?.kind ?? "DEBIT",
      last4: cardNumber.slice(-4),
      default: saveCard,
      billingAddress: [
        addressLine1 || "1010 E32nd St",
        `${city || "Brooklyn"}, ${billingState || "NY"} ${zipcode || "11201"}`,
        "United States",
      ],
      plans: sourceMethod?.plans ?? [],
      contracts: sourceMethod?.contracts ?? [],
    }

    const normalizedMethod = saveCard
      ? { ...nextMethod, default: true }
      : nextMethod

    if (saveCard) {
      setMethods((prev) =>
        prev.map((method) => ({
          ...method,
          default: false,
        }))
      )
    }

    upsertMethod(normalizedMethod)
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
      billingAddress: sourceMethod?.billingAddress ?? ["1010 E32nd St", "Brooklyn, NY 11201", "United States"],
      plans: sourceMethod?.plans ?? [],
      contracts: sourceMethod?.contracts ?? [],
    }

    const normalizedMethod = saveBankAccount
      ? { ...nextMethod, default: true }
      : nextMethod

    if (saveBankAccount) {
      setMethods((prev) =>
        prev.map((method) => ({
          ...method,
          default: false,
        }))
      )
    }

    upsertMethod(normalizedMethod)
    closePaymentMethodDialogs()
    resetBankForm()
  }

  const handleSetDefault = () => {
    if (!selectedMethod) return

    setMethods((prev) =>
      prev.map((method) => ({
        ...method,
        default: method.id === selectedMethod.id,
      }))
    )
  }

  const handleRemoveMethod = () => {
    if (!selectedMethod || methods.length <= 1) return

    const remainingMethods = methods.filter((method) => method.id !== selectedMethod.id)
    setMethods(remainingMethods)
    setSelectedMethodId(remainingMethods[0]?.id ?? "")
  }

  const content = (
    <div className="grid min-h-0 flex-1 gap-5 overflow-hidden xl:grid-cols-[540px_minmax(0,1fr)]">
      <div className="min-h-0 rounded-lg border border-gray-200 bg-white p-2.5">
        <div className="h-full max-h-full overflow-y-auto pr-1">
          <div className="space-y-3">
            {methods.map((method) => (
              <button
                key={method.id}
                type="button"
                onClick={() => setSelectedMethodId(method.id)}
                className="w-full text-left transition"
              >
                <div
                  className={cn(
                    "grid min-h-[118px] grid-cols-[176px_minmax(0,1fr)] items-stretch gap-3 rounded-lg border border-gray-200 bg-white p-3 transition",
                    method.id === selectedMethodId
                      ? "border-primary-500 ring-1 ring-primary-500"
                      : "hover:border-gray-300 hover:bg-gray-25"
                  )}
                >
                  <PaymentPreview
                    network={method.network}
                    kind={method.kind}
                    last4={method.last4}
                    compact
                  />

                  <div className="flex min-w-0 flex-col justify-between py-1 pr-1.5">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <h3 className="truncate text-sm font-semibold leading-5 text-dark-blue-400">
                          {method.bankName}
                        </h3>
                        <div className="mt-1 flex items-center gap-1.5 text-xs text-gray-500">
                          <span>{method.contractSummary}</span>
                          {method.contractCount > 0 && (
                            <HelpCircle className="size-3.5 text-gray-400" />
                          )}
                        </div>
                      </div>

                      {method.default && (
                        <Badge visual="primary" className="px-2.5">
                          Default
                        </Badge>
                      )}
                    </div>

                    <div>
                      <p className="text-sm font-medium text-dark-blue-400">{method.label}</p>
                      <p className="mt-0.5 text-xs text-gray-500">
                        {method.holder} • Expires {method.expires}
                      </p>
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {selectedMethod ? (
        <section className="flex h-full min-h-0 flex-col rounded-lg border border-gray-200 bg-white p-3 md:p-3.5">
          <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_210px]">
            <div>
              <PaymentPreview
                network={selectedMethod.network}
                kind={selectedMethod.kind}
                last4={selectedMethod.last4}
              />
            </div>

            <div className="space-y-3">
              <div className="flex gap-3">
                <MapPin className="mt-0.5 size-4 shrink-0 text-gray-400" />
                <div>
                  <h3 className="text-sm font-semibold text-dark-blue-400">
                    Billing address
                  </h3>
                  <div className="mt-1 space-y-0.5 text-sm text-dark-blue-400">
                    {selectedMethod.billingAddress.map((line) => (
                      <p key={line}>{line}</p>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <File02 className="mt-0.5 size-4 shrink-0 text-gray-400" />
                <div>
                  <h3 className="text-sm font-semibold text-dark-blue-400">Your Plans</h3>
                  <div className="mt-1 space-y-1.5">
                    {selectedMethod.plans.map((plan) => (
                      <div key={plan.name}>
                        <p className="text-sm font-medium text-dark-blue-400">{plan.name}</p>
                        <p className="text-sm text-gray-500">{plan.renews}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-3 grid gap-2 md:grid-cols-3">
            <Button
              size="sm"
              variant="outlined"
              visual="gray"
              leftIcon={<Edit03 className="size-4" />}
              onClick={openUpdateDialog}
            >
              Update card
            </Button>
            <Button size="sm" variant="outlined" visual="gray" onClick={handleSetDefault}>
              Set as Default
            </Button>
            <RmDialog
              title="Remove Payment Method?"
              description={`Are you sure you want to remove ${formatMethodDescription(selectedMethod)} from your payment methods?`}
              onRemove={handleRemoveMethod}
              trigger={() => (
                <Button size="sm" variant="outlined" visual="error" leftIcon={<Trash03 className="size-4" />}>
                  Remove card
                </Button>
              )}
            />
          </div>

          <section className="mt-3 flex min-h-0 flex-1 flex-col rounded-lg border border-gray-200 bg-white p-3">
            <div className="flex flex-col gap-2 border-b border-gray-200 pb-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2.5">
                <Bank className="size-4 text-gray-400" />
                <h3 className="text-sm font-semibold text-dark-blue-400">
                  Active Contracts
                </h3>
              </div>

              <NextLink href="/my-contracts">
                <Button
                  variant="link"
                  visual="gray"
                  size="sm"
                  className="justify-start p-0 text-sm font-semibold text-dark-blue-400 hover:text-primary-500 hover:underline"
                  rightIcon={<ArrowRight className="size-4" />}
                >
                  View all contracts
                </Button>
              </NextLink>
            </div>

            <div className="divide-y divide-gray-100">
              {selectedMethod.contracts.map((contract) => (
                <div
                  key={`${selectedMethod.id}-${contract.name}-${contract.renews}`}
                  className="flex flex-col gap-1 rounded-md px-2 py-2 transition hover:bg-gray-50 sm:flex-row sm:items-center sm:justify-between"
                >
                  <p className="text-sm text-dark-blue-400">{contract.name}</p>
                  <p className="text-sm text-gray-500">{contract.renews}</p>
                </div>
              ))}
            </div>
          </section>
        </section>
      ) : null}
    </div>
  )

  return (
    <>
      {!embedded ? (
        <AuthenticatedRoute>
          <div className="flex h-[100dvh] overflow-hidden bg-gray-50">
            <LeftSidebar />

            <div className="min-[1024px]:pl-[248px] min-[1024px]:pr-6 min-[1024px]:py-8 flex h-full flex-auto overflow-hidden p-3.5 md:p-6">
              <div className="mx-auto flex h-full max-h-full w-full max-w-[1160px] flex-col gap-5 overflow-hidden">
                <BillingSectionHeader
                  title="Billing"
                  description="Manage your plan, billing activity, invoices, and payment methods."
                  actions={
                    <>
                      <Button
                        variant="ghost"
                        visual="gray"
                        size="sm"
                        leftIcon={<HelpCircle className="size-4" />}
                      >
                        Get Help
                      </Button>
                      <Button onClick={openAddNewPaymentMethodDialog} leftIcon={<Plus className="size-4" />}>
                        Add payment method
                      </Button>
                    </>
                  }
                />

                {content}
              </div>
            </div>
          </div>
        </AuthenticatedRoute>
      ) : (
        content
      )}

      <Dialog
        open={isAddNewPaymentMethodDialogOpen}
        onOpenChange={setIsAddNewPaymentMethodDialogOpen}
      >
        <DialogContent className="max-w-[743px] p-0">
          <div className="flex items-center justify-between border-b border-gray-200 p-3">
            <div className="flex items-center gap-x-3">
              <h2 className="text-lg font-semibold leading-7 text-dark-blue-400">
                Add New Payment Method
              </h2>
            </div>
            <DialogClose asChild>
              <IconButton className="text-gray-500" variant="ghost" visual="gray" size="md">
                <X className="size-5" />
              </IconButton>
            </DialogClose>
          </div>

          <div className="p-6">
            <RadioGroup
              value={selectedNewPaymentMethodType}
              onValueChange={(value) =>
                handleOpenPaymentMethodType(value as NewPaymentMethodOptionValue)
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
        <DialogContent className="max-w-[743px] p-0">
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
              <IconButton className="text-gray-500" variant="ghost" visual="gray" size="md">
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
                <Label size="sm" htmlFor="payment-method-card-number">Card Number</Label>
                <CreditCardInput
                  id="payment-method-card-number"
                  value={cardNumber}
                  onValueChange={setCardNumber}
                />
              </div>

              <div className="space-y-1.5">
                <Label size="sm" htmlFor="payment-method-card-name">Name On Card</Label>
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
                  <Label size="sm" htmlFor="payment-method-expiration-date">Expiration Date</Label>
                  <Input
                    id="payment-method-expiration-date"
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
                  <Label size="sm" htmlFor="payment-method-cvv-cvc">CVV / CVC</Label>
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
        <DialogContent className="max-w-[743px] p-0">
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
              <IconButton className="text-gray-500" variant="ghost" visual="gray" size="md">
                <X className="size-5" />
              </IconButton>
            </DialogClose>
          </div>

          <div className="p-6">
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label size="sm" htmlFor="payment-method-account-type">Account Type</Label>
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
                <Label size="sm" htmlFor="payment-method-account-holder-name">Account Holder Name</Label>
                <Input
                  id="payment-method-account-holder-name"
                  type="text"
                  placeholder="John Doe"
                  value={accountHolderName}
                  onChange={(event) => setAccountHolderName(event.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label size="sm" htmlFor="payment-method-bank-routing-number">Bank Routing Number</Label>
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
                  <Label size="sm" htmlFor="payment-method-account-number">Account Number</Label>
                  <Input
                    id="payment-method-account-number"
                    type="text"
                    placeholder="Up to 17 digits"
                    value={accountNumber}
                    onChange={(event) => setAccountNumber(event.target.value)}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label size="sm" htmlFor="payment-method-confirm-account-number">Re-Enter Account Number</Label>
                  <Input
                    id="payment-method-confirm-account-number"
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
