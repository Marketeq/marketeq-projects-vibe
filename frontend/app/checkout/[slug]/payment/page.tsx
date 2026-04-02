"use client"

import * as React from "react"
import { useParams, useRouter } from "next/navigation"
import { cn } from "@/utils/functions"
import {
  AlertCircle,
  ArrowLeft,
  Check,
  CheckCircle,
  ChevronDown,
  Download02,
  HelpCircle,
  Lock,
  Plus,
  ShieldTick,
  Zap,
} from "@blend-metrics/icons"
import { Logo3 } from "@/components/icons"
import NextImage from "@/components/next-image"
import {
  Alert,
  AlertContent,
  AlertDescription,
  AlertIcon,
  AlertTitle,
  Badge,
  Button,
  Checkbox,
  HeadlessRadioGroupItem,
  Input,
  InputGroup,
  Label,
  Listbox,
  ListboxButton,
  ListboxOption,
  ListboxOptions,
  RadioGroup,
  RadioGroupItemSelector,
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
import { InputRightElement } from "@/components/ui/input/input-element"

const formatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
})

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

const StepIndicator = ({
  step,
  disabled,
  active,
  completed,
}: {
  step: number
  disabled?: boolean
  active?: boolean
  completed?: boolean
}) => (
  <button
    disabled={disabled}
    data-state={active ? "active" : completed ? "active" : disabled ? "disabled" : undefined}
    className="peer focus-visible:outline-none size-[25px] rounded-full border-2 inline-flex justify-center items-center shrink-0 text-primary-500 border-primary-500 disabled:text-white disabled:bg-gray-300 disabled:border-gray-300 data-[state=active]:bg-primary-500 data-[state=active]:text-white data-[state=active]:border-primary-500"
  >
    {completed ? <Check className="size-3" /> : step}
  </button>
)

const Step = ({
  label,
  step,
  disabled,
  active,
  completed,
}: {
  label: string
  step: number
  disabled?: boolean
  active?: boolean
  completed?: boolean
}) => (
  <div className="flex gap-x-3 items-center">
    <StepIndicator step={step} disabled={disabled} active={active} completed={completed} />
    <span
      className={cn(
        "text-sm shrink-0 whitespace-nowrap leading-none font-semibold",
        disabled ? "text-gray-300" : "text-dark-blue-400"
      )}
    >
      {label}
    </span>
  </div>
)

export default function PaymentPage() {
  const params = useParams()
  const router = useRouter()
  const slug = params.slug as string

  const [pay, setPay] = React.useState<"AT_ONCE" | "IN_INSTALLMENTS">("AT_ONCE")
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

  const availableBalance = 4000
  const fullAmount = 98_000

  const handleSubmitOrder = () => {
    setIsProcessing(true)
    setTimeout(() => {
      router.push(`/checkout/${slug}/confirmation`)
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

  return (
    <div className="bg-gray-50">
      {/* Navigation */}
      <div className="bg-white shadow-[0px_1px_3px_0px_rgba(16,24,40,.1)]">
        <div className="max-w-[1140px] h-[64px] mx-auto flex items-center justify-between">
          <div className="flex items-center gap-x-6">
            <Logo3 className="w-[128px] h-[18.81px] shrink-0" />
            <span className="inline-block h-[18px] w-px shrink-0 bg-gray-200" />
            <div className="inline-flex items-center gap-x-2">
              <Lock className="size-[18px] text-gray-500" />
              <span className="text-base font-semibold leading-none text-gray-500">
                Secure Checkout
              </span>
            </div>
          </div>

          <div className="flex items-center gap-x-3">
            <Step label="Project Details" step={1} completed />
            <span className="border-2 border-primary-500 border-dashed w-[35px] shrink-0" />
            <Step label="Payment" step={2} active />
            <span className="border-2 border-gray-300 border-dashed w-[35px] shrink-0" />
            <Step label="Confirmation" step={3} disabled />
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-[150px] py-[50px]">
        <Button
          className="group"
          size="md"
          variant="link"
          visual="gray"
          onClick={() => router.push(`/checkout/${slug}`)}
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
              How do you want to pay?
            </h3>

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

            {pay === "IN_INSTALLMENTS" && (
              <Alert className="mt-6">
                <AlertIcon>
                  <AlertCircle className="h-5 w-5" />
                </AlertIcon>
                <AlertContent>
                  <AlertTitle className="inline-block">
                    Please Note:{" "}
                    <AlertDescription className="inline mt-0 font-normal">
                      To confirm this project, an initial one-time payment is
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
            {pay === "AT_ONCE" && (
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
                    <Button onClick={() => setIsWireTransfer(true)} className="bg-primary-50 text-primary-500 hover:bg-primary-500 hover:text-white">Save Payment Method</Button>
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
                    <Button>Save Card</Button>
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
                      <Button className="bg-primary-50 text-primary-500 hover:bg-primary-500 hover:text-white">Save account</Button>
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
                  <div className="mt-5 border-dashed rounded-lg py-[50px] px-6 h-[120px] border-2 border-gray-300 hover:border-gray-400 hover:bg-gray-100 transition duration-300 bg-gray-50 flex items-center justify-center gap-x-2">
                    <Button className="hover:no-underline" variant="link" visual="gray">
                      <Plus className="size-[15px]" /> Add Payment Method
                    </Button>
                  </div>
                </div>

                <div className="mt-6">
                  <h1 className="text-base text-dark-blue-400 font-bold leading-[.7]">Recurring Payments</h1>
                  <div className="flex items-end justify-between">
                    <div className="flex items-center gap-x-6 mt-5">
                      <Listbox className="max-w-[265px]">
                        <ListboxButton className="text-xs text-dark-blue-400" placeholder="Select Payment Frequency" />
                        <ListboxOptions>
                          {[
                            { label: "Weekly", value: "$2,812" },
                            { label: "Bi-Weekly", value: "$5,625" },
                            { label: "Monthly", value: "$11,250" },
                            { label: "Pay Remaining Balance", value: "$88,000" },
                          ].map((option) => (
                            <ListboxOption key={option.label} value={option.label}>{option.label}</ListboxOption>
                          ))}
                        </ListboxOptions>
                      </Listbox>
                    </div>
                  </div>

                  <div className="mt-5 border-dashed rounded-lg py-[50px] px-6 h-[120px] border-2 border-gray-300 bg-gray-50 hover:border-gray-400 hover:bg-gray-100 transition duration-300 flex items-center justify-center gap-x-2">
                    <Button className="hover:no-underline" variant="link" visual="gray">
                      <Plus className="size-[15px]" /> Add Payment Method
                    </Button>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Sidebar */}
          <div className="w-[305px] shrink-0">
            <div className="w-[305px] shrink-0 p-5 rounded-lg bg-white border border-gray-200 shadow-[0px_1px_5px_0px_rgba(16,24,40,.02)]">
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
                    {isProcessing ? "Processing..." : "Submit Order"}
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
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
