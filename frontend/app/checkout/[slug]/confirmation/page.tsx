"use client"

import * as React from "react"
import { useParams, usePathname, useRouter, useSearchParams } from "next/navigation"
import { UserAPI } from "@/service/http/user"
import type { UserProfile } from "@/types/user"
import {
  Bank,
  Edit03,
  Users03,
} from "@blend-metrics/icons"
import { CheckoutNavigation } from "@/components/checkout-navigation"
import { OfferDialog, getDefaultJobTitle, getExperienceLabel, offerRates } from "@/components/hire-me-button"
import NextImage from "@/components/next-image"
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  Badge,
  Button,
  Checkbox,
  ErrorMessage,
} from "@/components/ui"
import { cn } from "@/utils/functions"

const formatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
})

const Visa = (props: React.SVGProps<SVGSVGElement>) => (
  <svg width={34} height={24} viewBox="0 0 34 24" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
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
  <svg width={34} height={24} viewBox="0 0 34 24" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
    <rect width={34} height={24} rx={4} fill="#1F72CD" />
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="m6.095 8.5-3.18 7.247h3.807l.472-1.156h1.08l.472 1.156h4.192v-.882l.373.882h2.168l.374-.9v.9h8.718l1.06-1.126.992 1.126 4.478.01-3.191-3.613L31.1 8.5h-4.407L25.66 9.605 24.699 8.5h-9.483l-.815 1.87-.833-1.87h-3.8v.852L9.345 8.5zm.737 1.029h1.856l2.11 4.914V9.53h2.034l1.63 3.523 1.502-3.523h2.023v5.2h-1.231l-.01-4.075-1.795 4.075H13.85l-1.805-4.075v4.075H9.512l-.48-1.166H6.437l-.479 1.165H4.601zm17.288 0h-5.007v5.197h4.93l1.588-1.722 1.53 1.722h1.601l-2.326-2.583 2.326-2.614h-1.53l-1.581 1.703zm-16.385.88-.855 2.077h1.71zm12.615 1.146v-.95h3.123l1.363 1.518-1.423 1.526H20.35v-1.036h2.73v-1.058z"
      fill="#fff"
    />
  </svg>
)

export default function ConfirmationPage() {
  const params = useParams()
  const pathname = usePathname()
  const router = useRouter()
  const searchParams = useSearchParams()
  const slug = params.slug as string
  const isTalentCheckout = pathname.startsWith("/talent-checkout/")
  const basePath = isTalentCheckout ? "/talent-checkout" : "/checkout"
  const decodedSlug = decodeURIComponent(slug)
  const [talentProfile, setTalentProfile] = React.useState<UserProfile | null>(null)
  const [isEditOfferOpen, setIsEditOfferOpen] = React.useState(false)
  const [hasAuthorizedPayment, setHasAuthorizedPayment] = React.useState(false)
  const [authorizationError, setAuthorizationError] = React.useState("")
  const [isSubmittingPayment, setIsSubmittingPayment] = React.useState(false)
  const hasAuthorizationError = authorizationError.length > 0
  const authorizationSectionRef = React.useRef<HTMLDivElement | null>(null)

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
  const selectedDuration = searchParams.get("duration") || "Ongoing"
  const selectedRate =
    offerRates.find((rate) => rate.value === selectedRateValue) ||
    offerRates.find((rate) => rate.value === "web-development") ||
    offerRates[0]
  const hourlyRate = Number(selectedRate?.price.replace(/[^0-9.]/g, "") || 0)
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
  const scheduleTitle = selectedSchedule === "part-time" ? "Part time" : "Full time"
  const scheduleDetail = selectedSchedule === "part-time" ? "Up to 30 hrs/week" : "Over 30 hrs/week"
  const durationBadgeLabel = selectedDuration === "Ongoing" ? "On-Going" : selectedDuration
  const recurringAmountLabel = selectedDuration === "Ongoing"
    ? `Monthly Payment Amount: ${formattedDueToday}`
    : `Payment Amount: ${formattedDueToday}`

  const updateOfferInUrl = React.useCallback((
    nextRate: string,
    nextSchedule: string,
    nextDuration: string,
  ) => {
    const nextSearchParams = new URLSearchParams(searchParams.toString())
    nextSearchParams.set("rate", nextRate)
    nextSearchParams.set("schedule", nextSchedule)
    nextSearchParams.set("duration", nextDuration)
    router.replace(`${pathname}?${nextSearchParams.toString()}`, { scroll: false })
  }, [pathname, router, searchParams])

  const handleEditPaymentMethods = React.useCallback(() => {
    const nextUrl = searchParams.toString()
      ? `${basePath}/${slug}/payment?${searchParams.toString()}`
      : `${basePath}/${slug}/payment`
    router.push(nextUrl)
  }, [basePath, router, searchParams, slug])

  const handleSubmitPayment = () => {
    if (!hasAuthorizedPayment) {
      setAuthorizationError("Please authorize the payment methods at the bottom of the page before proceeding.")
      requestAnimationFrame(() => {
        authorizationSectionRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "center",
        })
      })
      return
    }

    setIsSubmittingPayment(true)
    router.push(`${basePath}/${slug}/thank-you`)
  }

  return (
    <div className="bg-gray-50 pt-[64px]">
      <CheckoutNavigation
        currentStep={3}
        firstStepLabel={isTalentCheckout ? "Contract Details" : "Project Details"}
      />

      <div className="px-[150px] py-[50px]">
        <h1 className="text-2xl font-bold text-dark-blue-400">
          Review your order details
        </h1>
        <p className="mt-3 text-base font-light text-dark-blue-400">
          Then click <span className="font-normal">&quot;Submit payment&quot;</span> below to
          confirm your {isTalentCheckout ? "team" : "project"}
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
                      <Badge size="sm" visual="primary">{durationBadgeLabel}</Badge>
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
                      onClick={handleEditPaymentMethods}
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
                            Payment Amount: <span className="font-semibold">{formattedDueToday}</span>
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
                        hasAuthorizationError && "border border-error-300 bg-error-50"
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
                          I hereby authorize <span className="font-semibold">Marketeq</span> to charge my
                          above payment methods for the total initial one-time payment of{" "}
                          <span className="font-semibold">{formattedDueToday}</span> and total monthly
                          recurring amount of <span className="font-semibold">{formattedDueToday}</span>{" "}
                          starting on <span className="font-semibold">January 1st, 2025</span>
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
                      <NextImage className="object-cover" src="/dashboard.png" alt="Dashboard" sizes="50vw" fill />
                    </div>
                    <div className="flex-auto">
                      <h1 className="text-sm font-medium text-dark-blue-400">
                        Marketeq Client Portal - Redesigning and Optimizing Website for Enhanced User Experience.
                      </h1>

                      <div className="mt-1.5 inline-flex gap-x-2">
                        <Users03 className="size-[15px] shrink-0" />
                        <span className="text-xs leading-5 font-semibold text-dark-blue-400">
                          8 team members
                        </span>
                      </div>

                      <div className="mt-1.5 leading-5 text-[13px] text-dark-blue-400">
                        January 2024 - August 2024
                      </div>
                    </div>
                  </div>
                </div>

                <div className="rounded-lg mt-8 border border-gray-200 bg-white shadow-[0px_1px_5px_0px_rgba(16,24,40,.02)]">
                  <div className="py-5 px-6 border-b flex items-center justify-between border-gray-200">
                    <h1 className="text-lg font-semibold text-dark-blue-400">
                      Payment Methods
                    </h1>

                    <Button variant="link" visual="primary">
                      <Edit03 className="size-[15px]" />
                      Edit
                    </Button>
                  </div>
                  <div className="p-6">
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
                            Payment Amount: <span className="font-semibold">$4,000</span>
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

                      <div className="border-b flex items-start gap-x-3 border-gray-200 py-4">
                        <Visa className="h-[30px] w-[45px] shrink-0" />
                        <div className="flex-auto space-y-1">
                          <h2 className="text-sm font-semibold text-dark-blue-400">
                            Visa debit card ending in *1234
                          </h2>
                          <p className="text-xs font-light text-dark-blue-400">
                            Expires: 09/2027
                          </p>
                          <p className="text-xs font-light text-dark-blue-400">
                            Payment Amount: <span className="font-semibold">$4,000</span>
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

                      <div className="border-b flex col-span-2 items-start gap-x-3 border-gray-200 py-4">
                        <div className="inline-flex items-center rounded-[4px] shrink-0 bg-white border border-gray-200 text-gray-500 justify-center w-[46.5px] h-[31px]">
                          <Bank className="size-4" />
                        </div>
                        <div className="flex-auto space-y-1">
                          <h2 className="text-sm font-semibold text-dark-blue-400">
                            Bank of America checking ending in *1234
                          </h2>

                          <p className="text-xs font-light text-dark-blue-400">
                            Payment Amount: <span className="font-semibold">$4,000</span>
                          </p>
                        </div>
                      </div>
                    </div>

                    <div
                      ref={authorizationSectionRef}
                      className={cn(
                        "mt-6 rounded-md py-2 px-5 transition-colors",
                        hasAuthorizationError && "border border-error-300 bg-error-50"
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
                          I hereby authorize <span className="font-semibold">Marketeq</span> to charge my
                          above payment methods for the total one-time amount of{" "}
                          <span className="font-semibold">$94,000</span>
                        </span>
                      </label>
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
                        <Button className="mt-1 h-auto justify-start px-0 text-[10px] leading-[14px] underline" variant="link" visual="gray">
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
                        {isSubmittingPayment ? "Submitting..." : "Submit Payment"}
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
                        <Button className="text-[10px] leading-[14px] underline" variant="link">
                          Estimated Taxes
                        </Button>
                      </span>
                    </div>

                    <div className="mt-5">
                      <span className="inline-block text-center text-[10px] font-light text-dark-blue-400 leading-[14px]">
                        By clicking the above, you agree to Marketeq&apos;s{" "}
                        <Button className="text-[10px] leading-[14px] underline" variant="link">
                          Terms of Use
                        </Button>{" "}
                        and{" "}
                        <Button className="text-[10px] leading-[14px] underline" variant="link">
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
                          $94,000
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="inline-block text-xs leading-none text-dark-blue-400 font-light">
                          Estimated tax *
                        </span>
                        <span className="inline-block text-xs leading-none text-dark-blue-400 font-light">
                          $4,000
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="inline-block text-xs leading-none text-dark-blue-400 font-light">
                          Balance applied
                        </span>
                        <span className="inline-block text-xs leading-none text-dark-blue-400 font-light">
                          - $4,000
                        </span>
                      </div>
                    </div>

                    <div className="flex mt-4 items-center justify-between">
                      <h1 className="inline-block text-base font-bold leading-none text-dark-blue-400">
                        Total
                      </h1>
                      <h1 className="inline-block text-base font-bold leading-none text-dark-blue-400">
                        $90,000
                      </h1>
                    </div>
                  </div>

                  <div className="mt-4">
                    <div className="mt-5 space-y-3">
                      <article className="flex items-start gap-x-3">
                        <Amex className="w-[45px] h-[30px]" />
                        <div className="space-y-1 flex-auto border-b border-gray-300 pb-3">
                          <h1 className="text-sm font-medium text-dark-blue-400">
                            $4,000
                          </h1>
                          <p className="text-xs font-light uppercase text-dark-blue-400">
                            AMEX *1234
                          </p>
                        </div>
                      </article>
                      <article className="flex items-start gap-x-3">
                        <Visa className="w-[45px] h-[30px]" />
                        <div className="space-y-1 flex-auto border-b border-gray-300 pb-3">
                          <h1 className="text-sm font-medium text-dark-blue-400">
                            $4,000
                          </h1>
                          <p className="text-xs font-light uppercase text-dark-blue-400">
                            VISA *1234
                          </p>
                        </div>
                      </article>
                      <article className="flex items-start gap-x-3">
                        <div className="inline-flex items-center rounded-[4px] shrink-0 bg-white border border-gray-200 text-gray-500 justify-center w-[46.5px] h-[31px]">
                          <Bank className="size-4" />
                        </div>
                        <div className="space-y-1 flex-auto">
                          <h1 className="text-sm font-medium text-dark-blue-400">
                            $45,000
                          </h1>
                          <p className="text-xs font-light uppercase text-dark-blue-400">
                            Bank of America *1234
                          </p>
                        </div>
                      </article>
                    </div>

                    <div className="mt-5 rounded-[4px] p-2 bg-primary-25 flex items-center justify-between">
                      <span className="text-[10px] text-dark-blue-400">
                        Your bi-weekly payments start from
                      </span>
                      <span className="text-[10px] font-medium text-primary-500">
                        Jan 1st, 2025
                      </span>
                    </div>

                    <div className="grid mt-2.5">
                      <Button
                        disabled={isSubmittingPayment}
                        onClick={handleSubmitPayment}
                        visual={hasAuthorizationError ? "error" : "primary"}
                      >
                        {isSubmittingPayment ? "Submitting..." : "Submit Payment"}
                      </Button>
                    </div>
                    {hasAuthorizationError ? (
                      <ErrorMessage className="mt-2 text-center" size="sm">
                        {authorizationError}
                      </ErrorMessage>
                    ) : null}

                    <div className="mt-5">
                      <span className="inline-block text-center text-[10px] font-light text-dark-blue-400 leading-[14px]">
                        By clicking the above, you agree to Marketeq&apos;s{" "}
                        <Button className="text-[10px] leading-[14px] underline" variant="link">
                          Terms of Use
                        </Button>{" "}
                        and{" "}
                        <Button className="text-[10px] leading-[14px] underline" variant="link">
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
          onSaveOffer={({ selectedRate, schedule, selectedDuration: nextDuration }) => {
            updateOfferInUrl(selectedRate, schedule, nextDuration)
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
    </div>
  )
}
