"use client"

import * as React from "react"
import {
  useParams,
  usePathname,
  useRouter,
  useSearchParams,
} from "next/navigation"
import { UserAPI } from "@/service/http/user"
import { cn } from "@/utils/functions"
import { useControllableState } from "@/utils/hooks"
import {
  ArrowDown,
  ArrowLeft,
  ChevronDown,
  Edit03,
  Lock,
  MoreHorizontal,
  Plus,
} from "@blend-metrics/icons"
import { AnimatePresence, motion } from "framer-motion"
import type { UserProfile } from "@/types/user"
import { CheckoutNavigation } from "@/components/checkout-navigation"
import {
  OfferDialog,
  getExperienceLabel,
  offerRates,
} from "@/components/hire-me-button"
import { Logo3 } from "@/components/icons"
import { Network } from "@/components/icons/network"
import { Network1 } from "@/components/icons/network-1"
import { Network2 } from "@/components/icons/network-2"
import { Network3 } from "@/components/icons/network-3"
import { Network4 } from "@/components/icons/network-4"
import NextImage from "@/components/next-image"
import { CountriesCombobox } from "@/components/own-combobox"
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  Avatar,
  AvatarFallback,
  AvatarImage,
  Badge,
  Button,
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DisclosureContent,
  DisclosureTrigger,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
  IconButton,
  Listbox,
  ListboxButton,
  ListboxOption,
  ListboxOptions,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Tabs,
  TabsContent,
  TabsList,
} from "@/components/ui"

const UserGroup = ({ className, ...props }: React.SVGProps<SVGSVGElement>) => (
  <svg
    className={cn("size-4 text-primary-500", className)}
    viewBox="0 0 15 16"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <path
      d="M12.9837 11.75C13.4521 11.75 13.8246 11.4553 14.159 11.0432C14.8437 10.1996 13.7196 9.5255 13.2908 9.19537C12.855 8.85975 12.3684 8.66963 11.875 8.625M11.25 7.375C12.1129 7.375 12.8125 6.67544 12.8125 5.8125C12.8125 4.94956 12.1129 4.25 11.25 4.25"
      stroke="currentColor"
      strokeWidth={0.9375}
      strokeLinecap="round"
    />
    <path
      d="M2.01623 11.75C1.54791 11.75 1.17542 11.4553 0.840964 11.0432C0.156307 10.1996 1.28042 9.5255 1.70915 9.19537C2.14498 8.85975 2.63161 8.66963 3.125 8.625M3.4375 7.375C2.57456 7.375 1.875 6.67544 1.875 5.8125C1.875 4.94956 2.57456 4.25 3.4375 4.25"
      stroke="currentColor"
      strokeWidth={0.9375}
      strokeLinecap="round"
    />
    <path
      d="M5.05238 9.94401C4.41376 10.3389 2.73936 11.1452 3.75919 12.1541C4.25736 12.647 4.8122 12.9995 5.50976 12.9995H9.49026C10.1878 12.9995 10.7426 12.647 11.2408 12.1541C12.2606 11.1452 10.5863 10.3389 9.94764 9.94401C8.45008 9.01801 6.54989 9.01801 5.05238 9.94401Z"
      stroke="currentColor"
      strokeWidth={0.9375}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M9.68751 5.18799C9.68751 6.39611 8.70814 7.37549 7.50001 7.37549C6.29189 7.37549 5.3125 6.39611 5.3125 5.18799C5.3125 3.97986 6.29189 3.00049 7.50001 3.00049C8.70814 3.00049 9.68751 3.97986 9.68751 5.18799Z"
      stroke="currentColor"
      strokeWidth={0.9375}
    />
  </svg>
)

const Dropdown = ({
  onValueChange,
  value,
  placeholder,
  defaultValue,
}: {
  onValueChange?: (value: string) => void
  value?: string
  placeholder?: string
  defaultValue?: string
}) => {
  const [state, setState] = useControllableState({
    onChange: onValueChange,
    value,
    defaultValue,
  })
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="group bg-white data-[state=open]:bg-gray-100 hover:bg-gray-100 focus-visible:outline-none px-2 py-[5px] border border-gray-200 data-[state=open]:border-gray-300 data-[state=open]:border-dashed hover:border-gray-300 hover:border-dashed border-solid rounded-[5px] inline-flex items-center gap-x-1.5">
        <span className="text-xs leading-[18px] font-medium text-gray-700">
          {state ? state : placeholder}
        </span>
        <ChevronDown className="group-data-[state=open]:inline-block hidden size-[18px] shrink-0 text-gray-500" />
      </DropdownMenuTrigger>

      <DropdownMenuContent align="start" className="min-w-max">
        <DropdownMenuRadioGroup value={value} onValueChange={setState}>
          <DropdownMenuRadioItem
            className="gap-x-2"
            hideIndicator={false}
            value="Student"
          >
            <Network />
            Student (0 - 2 years)
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem
            className="gap-x-2"
            hideIndicator={false}
            value="Junior"
          >
            <Network1 />
            Junior (2 - 3 years)
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem
            className="gap-x-2"
            hideIndicator={false}
            value="Mediator"
          >
            <Network2 />
            Medior (3 - 5 years)
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem
            className="gap-x-2"
            hideIndicator={false}
            value="Senior"
          >
            <Network3 />
            Senior (5 - 10 years)
          </DropdownMenuRadioItem>

          <DropdownMenuRadioItem
            className="gap-x-2"
            hideIndicator={false}
            value="Guru"
          >
            <Network4 />
            Guru (10+ years)
          </DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

type PaymentPlanOption = {
  id: string
  label: string
  value: string
}

const safeDecodeSlug = (value: string): string => {
  try {
    return decodeURIComponent(value)
  } catch {
    return value
  }
}

export default function CheckoutPage() {
  const params = useParams()
  const pathname = usePathname()
  const router = useRouter()
  const searchParams = useSearchParams()
  const slug = params.slug as string
  const isTalentCheckout = pathname.startsWith("/talent-checkout/")
  const basePath = isTalentCheckout ? "/talent-checkout" : "/checkout"
  const decodedSlug = safeDecodeSlug(slug)
  const safeSlugSegment = encodeURIComponent(decodedSlug)
  const addOnStateStorageKey = React.useMemo(
    () => `checkout-addons:${basePath}:${decodedSlug}`,
    [basePath, decodedSlug]
  )
  const fallbackTalentName =
    decodedSlug.split("-")[0]?.replace(/^./, (char) => char.toUpperCase()) ||
    "Alex"
  const [talentProfile, setTalentProfile] = React.useState<UserProfile | null>(
    null
  )
  const [isTalentProfileLoading, setIsTalentProfileLoading] =
    React.useState(isTalentCheckout)
  const [selectedRateValue, setSelectedRateValue] = React.useState(
    searchParams.get("rate") || "web-development"
  )
  const [selectedSchedule, setSelectedSchedule] = React.useState(
    searchParams.get("schedule") || "full-time"
  )
  const [selectedDuration, setSelectedDuration] = React.useState(
    searchParams.get("duration") || "Ongoing"
  )
  const [isEditOfferOpen, setIsEditOfferOpen] = React.useState(false)

  React.useEffect(() => {
    setSelectedRateValue(searchParams.get("rate") || "web-development")
    setSelectedSchedule(searchParams.get("schedule") || "full-time")
    setSelectedDuration(searchParams.get("duration") || "Ongoing")
  }, [searchParams])

  React.useEffect(() => {
    if (!isTalentCheckout) return

    let isActive = true

    const loadTalentProfile = async () => {
      if (isActive) {
        setIsTalentProfileLoading(true)
      }
      try {
        const response = await UserAPI.getByUsername(decodedSlug)
        if (isActive && response?.data) {
          setTalentProfile(response.data)
        }
      } catch {
        if (isActive) {
          setTalentProfile(null)
        }
      } finally {
        if (isActive) {
          setIsTalentProfileLoading(false)
        }
      }
    }

    loadTalentProfile()

    return () => {
      isActive = false
    }
  }, [decodedSlug, isTalentCheckout])

  const talentName = talentProfile?.firstName || fallbackTalentName
  const talentUsername = talentProfile?.username || decodedSlug
  const talentAvatarUrl = talentProfile?.avatarUrl || ""
  const talentExperienceLabel = getExperienceLabel(talentProfile)
  const selectedRate =
    offerRates.find((rate) => rate.value === selectedRateValue) ||
    offerRates.find((rate) => rate.value === "web-development") ||
    offerRates[0]
  const hourlyRate = Number(selectedRate?.price.replace(/[^0-9.]/g, "") || 0)
  const estimatedTax = hourlyRate * 0.07
  const totalHourlyRate = hourlyRate + estimatedTax
  const estimatedWeeklyCost = totalHourlyRate * 40
  const baseDueToday = estimatedWeeklyCost * 2
  const isOngoingTalentContract =
    isTalentCheckout && selectedDuration === "Ongoing"
  const formatter = React.useMemo(
    () =>
      new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        maximumFractionDigits: 0,
      }),
    []
  )
  const scheduleLabel =
    selectedSchedule === "part-time" ? "Part time" : "Full time"
  const scheduleDetail =
    selectedSchedule === "part-time" ? "Up to 30 hrs/week" : "Over 30 hrs/week"
  const formattedHourlyRate = `$${hourlyRate.toFixed(0)}/hr`
  const formattedEstimatedTax = `$${estimatedTax.toFixed(2)}/hr`
  const formattedTotalHourlyRate = `$${totalHourlyRate.toFixed(2)}/hr`
  const formattedWeeklyCost = `$${Math.round(estimatedWeeklyCost).toLocaleString()}/wk`

  const recommendations = [
    {
      id: "project-manager",
      title: "Project manager",
      description: "Because your contract is 6+ months",
      points: [
        "A dedicated project manager to oversee your contract",
        "A dedicated point of contact to oversee your contract",
      ],
      checked: false,
      total: "$340/wk",
      weeklyTotal: 340,
      weeklyHours: "4hrs/week",
    },
    {
      id: "account-manager",
      title: "Account manager",
      description: "Because your hourly rate is $75+/hr",
      points: [
        "Handles invoicing, payments, and billing disputes on your behalf",
        "Supports contract renewals and ensures the engagement stays on track long term",
      ],
      checked: false,
      total: "$340/wk",
      weeklyTotal: 340,
      weeklyHours: "4hrs/week",
    },
  ]
  const [selectedAddOnIds, setSelectedAddOnIds] = React.useState<string[]>(
    recommendations
      .filter((recommendation) => recommendation.checked)
      .map((recommendation) => recommendation.id)
  )
  const selectedAddOns = recommendations.filter((recommendation) =>
    selectedAddOnIds.includes(recommendation.id)
  )
  const addOnsWeeklyTotal = selectedAddOns.reduce(
    (total, recommendation) => total + recommendation.weeklyTotal,
    0
  )
  const dueTodayTotal = baseDueToday + addOnsWeeklyTotal
  const talentPaymentPlanOptions = React.useMemo<PaymentPlanOption[]>(() => {
    const options: PaymentPlanOption[] = [
      {
        id: "weekly",
        label: "Weekly",
        value: formatter.format(Math.round(dueTodayTotal / 2)),
      },
      {
        id: "bi-weekly",
        label: "Bi-Weekly",
        value: formatter.format(Math.round(dueTodayTotal)),
      },
      {
        id: "monthly",
        label: "Monthly",
        value: formatter.format(Math.round(dueTodayTotal * 2)),
      },
    ]

    if (!isOngoingTalentContract) {
      options.push({
        id: "final",
        label: "Pay Full Amount",
        value: formatter.format(Math.round(dueTodayTotal * 4)),
      })
    }

    return options
  }, [dueTodayTotal, formatter, isOngoingTalentContract])
  const defaultTalentPaymentPlanId =
    talentPaymentPlanOptions[Math.min(1, talentPaymentPlanOptions.length - 1)]
      ?.id ?? "bi-weekly"
  const [selectedTalentPaymentPlanId, setSelectedTalentPaymentPlanId] =
    React.useState(
      searchParams.get("paymentPlan") || defaultTalentPaymentPlanId
    )
  const selectedTalentPaymentPlan =
    talentPaymentPlanOptions.find(
      (option) => option.id === selectedTalentPaymentPlanId
    ) ||
    talentPaymentPlanOptions[Math.min(1, talentPaymentPlanOptions.length - 1)]
  const paymentPlanCostLabel =
    selectedTalentPaymentPlanId === "weekly"
      ? "Estimated Weekly Cost"
      : selectedTalentPaymentPlanId === "bi-weekly"
        ? "Estimated Bi-Weekly Cost"
        : selectedTalentPaymentPlanId === "monthly"
          ? "Estimated Monthly Cost"
          : "Estimated Total Cost"
  const formattedDueTodayTotal = `$${Math.round(dueTodayTotal).toLocaleString()}`

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

  React.useEffect(() => {
    if (typeof window === "undefined") return

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
  }, [addOnStateStorageKey])

  React.useEffect(() => {
    if (typeof window === "undefined") return
    window.sessionStorage.setItem(
      addOnStateStorageKey,
      JSON.stringify(selectedAddOnIds)
    )
  }, [addOnStateStorageKey, selectedAddOnIds])

  const updateOfferInUrl = React.useCallback(
    (nextRate: string, nextSchedule: string, nextDuration: string) => {
      const nextSearchParams = new URLSearchParams(searchParams.toString())
      nextSearchParams.set("rate", nextRate)
      nextSearchParams.set("schedule", nextSchedule)
      nextSearchParams.set("duration", nextDuration)
      router.replace(`${pathname}?${nextSearchParams.toString()}`, {
        scroll: false,
      })
    },
    [pathname, router, searchParams]
  )

  const toggleAddOn = (addOnId: string, enabled?: boolean) => {
    setSelectedAddOnIds((current) => {
      const hasAddOn = current.includes(addOnId)

      if (enabled === true && !hasAddOn) return [...current, addOnId]
      if (enabled === false && hasAddOn)
        return current.filter((id) => id !== addOnId)
      if (enabled !== undefined) return current

      return hasAddOn
        ? current.filter((id) => id !== addOnId)
        : [...current, addOnId]
    })
  }

  return (
    <div className="bg-gray-50 pt-[64px]">
      <CheckoutNavigation
        currentStep={1}
        firstStepLabel={
          isTalentCheckout ? "Contract Details" : "Project Details"
        }
      />

      <div className="px-[150px] py-[50px]">
        <div className="max-w-[1140px] mx-auto">
          <button
            onClick={() => {
              if (isTalentCheckout) {
                router.push(
                  `/talent-profile?username=${encodeURIComponent(decodedSlug)}`
                )
                return
              }
              router.back()
            }}
            className="inline-flex items-center gap-x-1 text-sm text-gray-500 hover:text-gray-700 transition-colors duration-300 mb-6"
          >
            <ArrowLeft className="size-4" />{" "}
            {isTalentCheckout ? "Back to profile" : "Back to project"}
          </button>

          <h1 className="text-2xl leading-[.7] font-bold text-dark-blue-400">
            {isTalentCheckout
              ? "Please confirm your offer details below"
              : "Please confirm your project details below"}
          </h1>
          <p className="mt-2 text-base font-light text-dark-blue-400 leading-none">
            Then click{" "}
            <span className="font-normal">&quot;Proceed to Payment&quot;</span>{" "}
            to continue
          </p>

          <div className="mt-6 flex items-start gap-x-8">
            <div className="flex-auto">
              {isTalentCheckout ? (
                <>
                  <div className="p-5 rounded-lg border flex items-center gap-x-3 border-gray-200 shadow-[0px_1px_5px_0px_rgba(16,24,40,.02)] bg-white">
                    {isTalentProfileLoading && !talentAvatarUrl ? (
                      <div
                        className="relative size-[92px] shrink-0 overflow-hidden rounded-full bg-gray-100"
                        aria-hidden="true"
                      >
                        <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-gray-100 via-white to-gray-100" />
                      </div>
                    ) : (
                      <Avatar className="size-[92px] shrink-0">
                        <AvatarImage src={talentAvatarUrl} alt={talentName} />
                        <AvatarFallback>{talentName.charAt(0)}</AvatarFallback>
                      </Avatar>
                    )}

                    <div className="flex-auto flex items-stretch justify-between gap-x-5">
                      <div className="flex-auto">
                        <div className="inline-flex items-center gap-x-1.5">
                          <h1 className="text-[14px] font-bold leading-[16.26px] text-dark-blue-400">
                            {talentName}
                          </h1>
                          <span className="text-[12px] text-nowrap leading-[16.26px] font-light text-dark-blue-400">
                            @{talentUsername}
                          </span>
                        </div>
                        <p className="mt-1 text-[12px] font-medium text-dark-blue-400">
                          Expert React Developer
                        </p>
                        <p className="mt-0.5 text-[12px] font-normal leading-normal text-gray-500">
                          {talentExperienceLabel}
                        </p>

                        <div className="mt-3 flex items-center gap-x-2">
                          <span className="text-[13px] leading-none font-semibold text-dark-blue-400">
                            Start Date: Feb 5th, 2025
                          </span>
                        </div>
                      </div>

                      <div className="inline-flex flex-col items-end justify-between gap-y-3 self-stretch">
                        <Button
                          variant="link"
                          className="bg-white text-xs leading-5 text-primary-500"
                          onClick={() => setIsEditOfferOpen(true)}
                        >
                          <Edit03 className="size-[15px] text-primary-500" />
                          Edit Offer
                        </Button>

                        <div className="inline-flex flex-col items-end gap-y-0.5">
                          <span className="inline-block text-dark-blue-400 text-[20px] leading-none font-semibold">
                            {formattedHourlyRate}
                          </span>
                          <span className="mt-[2px] inline-flex items-center gap-x-1.5 text-xs leading-none text-dark-blue-400">
                            <span className="font-medium">{scheduleLabel}</span>
                            <span className="font-normal">
                              {scheduleDetail}
                            </span>
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 p-6 rounded-lg border border-gray-200 shadow-[0px_1px_5px_0px_rgba(16,24,40,.02)] bg-white">
                    <h1 className="text-2xl font-bold leading-[0.7] text-dark-blue-400">
                      Recommendations
                    </h1>

                    <div className="mt-6 space-y-3">
                      {recommendations.map((recommendation) => (
                        <article
                          key={recommendation.id}
                          className="rounded-lg border border-gray-200 shadow-sm bg-white"
                        >
                          <div className="p-5">
                            <div className="flex items-start justify-between gap-x-4">
                              <div className="flex-auto">
                                <h2 className="text-base font-semibold leading-[1.3] text-dark-blue-400">
                                  {recommendation.title}
                                </h2>
                                <p className="mt-1 text-xs font-light text-dark-blue-400">
                                  {recommendation.description}
                                </p>
                              </div>

                              <Switch
                                size="md"
                                checked={selectedAddOnIds.includes(
                                  recommendation.id
                                )}
                                onCheckedChange={(checked) =>
                                  toggleAddOn(recommendation.id, checked)
                                }
                              />
                            </div>

                            <div className="mt-4 space-y-1">
                              {recommendation.points.map((point) => (
                                <p
                                  key={point}
                                  className="text-xs font-light leading-[1.5] text-dark-blue-400"
                                >
                                  • {point}
                                </p>
                              ))}
                            </div>

                            <div className="mt-4 pt-4 border-t border-gray-200 flex items-center justify-between">
                              <div className="inline-flex items-center gap-x-2">
                                <span className="text-base font-bold leading-none text-dark-blue-400">
                                  Est. $85/hr
                                </span>
                                <span className="text-xs font-light text-dark-blue-400">
                                  •
                                </span>
                                <span className="text-xs font-light text-dark-blue-400">
                                  United States
                                </span>
                                <Button
                                  className="font-medium underline text-[10px] leading-[14px]"
                                  variant="link"
                                >
                                  Change
                                </Button>
                              </div>

                              <span className="text-base font-bold leading-none text-dark-blue-400">
                                {recommendation.total}
                              </span>
                            </div>
                          </div>
                        </article>
                      ))}
                    </div>
                  </div>

                  <div className="mt-6 p-6 rounded-lg border border-gray-200 shadow-[0px_1px_5px_0px_rgba(16,24,40,.02)] bg-white">
                    <h1 className="text-2xl font-bold leading-[0.7] text-dark-blue-400">
                      FAQ&apos;s
                    </h1>

                    <p className="mt-5 text-base leading-none font-light text-dark-blue-400">
                      We use proven design methods to create a personal approach
                      to each product. This allows you to achieve high results
                      and the quality of the work done.
                    </p>

                    <div className="mt-6">
                      <Accordion
                        type="multiple"
                        className="pt-6 space-y-[15px] overflow-hidden [interpolate-size:allow-keywords] transition-[height] duration-300"
                        defaultValue={["item-1"]}
                      >
                        <AccordionItem
                          className="rounded-lg bg-white border border-gray-300"
                          value="item-1"
                        >
                          <AccordionTrigger className="w-full px-5 py-3 flex items-center gap-x-2 text-base leading-[1.3] font-semibold flex-auto text-dark-blue-400">
                            <span className="flex-auto text-left inline-block">
                              How will you ensure we&apos;re aligned on progress
                              and feedback throughout each stage?
                            </span>
                            <ChevronDown className="size-6 shrink-0 group-data-[state=open]/item:-rotate-180 transition duration-300" />
                          </AccordionTrigger>

                          <DisclosureContent className="text-base px-5 pb-5 leading-[1.5] text-dark-blue-400 font-light">
                            We offer a comprehensive range of IT consulting
                            services, including IT strategy development,
                            software development, network infrastructure design
                            and implementation, cybersecurity assessment and
                            solutions, cloud computing solutions, and IT project
                            management.
                          </DisclosureContent>
                        </AccordionItem>
                        <AccordionItem
                          className="rounded-lg bg-white border border-gray-300"
                          value="item-2"
                        >
                          <AccordionTrigger className="w-full px-5 py-3 flex items-center gap-x-2 text-base leading-[1.3] font-semibold flex-auto text-dark-blue-400">
                            <span className="flex-auto text-left inline-block">
                              How will you ensure we&apos;re aligned on progress
                              and feedback throughout each stage?
                            </span>
                            <ChevronDown className="size-6 shrink-0 group-data-[state=open]/item:-rotate-180 transition duration-300" />
                          </AccordionTrigger>

                          <DisclosureContent className="text-base px-5 pb-5 leading-[1.5] text-dark-blue-400 font-light">
                            We offer a comprehensive range of IT consulting
                            services, including IT strategy development,
                            software development, network infrastructure design
                            and implementation, cybersecurity assessment and
                            solutions, cloud computing solutions, and IT project
                            management.
                          </DisclosureContent>
                        </AccordionItem>
                        <AccordionItem
                          className="rounded-lg bg-white border border-gray-300"
                          value="item-3"
                        >
                          <AccordionTrigger className="w-full px-5 py-3 flex items-center gap-x-2 text-base leading-[1.3] font-semibold flex-auto text-dark-blue-400">
                            <span className="flex-auto text-left inline-block">
                              How will you ensure we&apos;re aligned on progress
                              and feedback throughout each stage?
                            </span>
                            <ChevronDown className="size-6 shrink-0 group-data-[state=open]/item:-rotate-180 transition duration-300" />
                          </AccordionTrigger>

                          <DisclosureContent className="text-base px-5 pb-5 leading-[1.5] text-dark-blue-400 font-light">
                            We offer a comprehensive range of IT consulting
                            services, including IT strategy development,
                            software development, network infrastructure design
                            and implementation, cybersecurity assessment and
                            solutions, cloud computing solutions, and IT project
                            management.
                          </DisclosureContent>
                        </AccordionItem>
                        <AccordionItem
                          className="rounded-lg bg-white border border-gray-300"
                          value="item-4"
                        >
                          <AccordionTrigger className="w-full px-5 py-3 flex items-center gap-x-2 text-base leading-[1.3] font-semibold flex-auto text-dark-blue-400">
                            <span className="flex-auto text-left inline-block">
                              How will you ensure we&apos;re aligned on progress
                              and feedback throughout each stage?
                            </span>
                            <ChevronDown className="size-6 shrink-0 group-data-[state=open]/item:-rotate-180 transition duration-300" />
                          </AccordionTrigger>

                          <DisclosureContent className="text-base px-5 pb-5 leading-[1.5] text-dark-blue-400 font-light">
                            We offer a comprehensive range of IT consulting
                            services, including IT strategy development,
                            software development, network infrastructure design
                            and implementation, cybersecurity assessment and
                            solutions, cloud computing solutions, and IT project
                            management.
                          </DisclosureContent>
                        </AccordionItem>
                        <AccordionItem
                          className="rounded-lg bg-white border border-gray-300"
                          value="item-5"
                        >
                          <AccordionTrigger className="w-full px-5 py-3 flex items-center gap-x-2 text-base leading-[1.3] font-semibold flex-auto text-dark-blue-400">
                            <span className="flex-auto text-left inline-block">
                              How will you ensure we&apos;re aligned on progress
                              and feedback throughout each stage?
                            </span>
                            <ChevronDown className="size-6 shrink-0 group-data-[state=open]/item:-rotate-180 transition duration-300" />
                          </AccordionTrigger>

                          <DisclosureContent className="text-base px-5 pb-5 leading-[1.5] text-dark-blue-400 font-light">
                            We offer a comprehensive range of IT consulting
                            services, including IT strategy development,
                            software development, network infrastructure design
                            and implementation, cybersecurity assessment and
                            solutions, cloud computing solutions, and IT project
                            management.
                          </DisclosureContent>
                        </AccordionItem>
                        <AccordionItem
                          className="rounded-lg bg-white border border-gray-300"
                          value="item-6"
                        >
                          <AccordionTrigger className="w-full px-5 py-3 flex items-center gap-x-2 text-base leading-[1.3] font-semibold flex-auto text-dark-blue-400">
                            <span className="flex-auto text-left inline-block">
                              How will you ensure we&apos;re aligned on progress
                              and feedback throughout each stage?
                            </span>
                            <ChevronDown className="size-6 shrink-0 group-data-[state=open]/item:-rotate-180 transition duration-300" />
                          </AccordionTrigger>

                          <DisclosureContent className="text-base px-5 pb-5 leading-[1.5] text-dark-blue-400 font-light">
                            We offer a comprehensive range of IT consulting
                            services, including IT strategy development,
                            software development, network infrastructure design
                            and implementation, cybersecurity assessment and
                            solutions, cloud computing solutions, and IT project
                            management.
                          </DisclosureContent>
                        </AccordionItem>
                        <AccordionItem
                          className="rounded-lg bg-white border border-gray-300"
                          value="item-7"
                        >
                          <AccordionTrigger className="w-full px-5 py-3 flex items-center gap-x-2 text-base leading-[1.3] font-semibold flex-auto text-dark-blue-400">
                            <span className="flex-auto text-left inline-block">
                              How will you ensure we&apos;re aligned on progress
                              and feedback throughout each stage?
                            </span>
                            <ChevronDown className="size-6 shrink-0 group-data-[state=open]/item:-rotate-180 transition duration-300" />
                          </AccordionTrigger>

                          <DisclosureContent className="text-base px-5 pb-5 leading-[1.5] text-dark-blue-400 font-light">
                            We offer a comprehensive range of IT consulting
                            services, including IT strategy development,
                            software development, network infrastructure design
                            and implementation, cybersecurity assessment and
                            solutions, cloud computing solutions, and IT project
                            management.
                          </DisclosureContent>
                        </AccordionItem>
                      </Accordion>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="p-5 border flex items-center gap-x-3 border-gray-200 shadow-[0px_1px_5px_0px_rgba(16,24,40,.02)]">
                    <div className="relative h-[92px] overflow-hidden w-[181px] border border-[#DFDFDF] rounded-md shrink-0">
                      <NextImage
                        className="object-cover"
                        src="/dashboard.png"
                        alt="Dashboard"
                        sizes="25vw"
                        fill
                      />
                    </div>

                    <div className="flex-auto flex items-center gap-x-5">
                      <div className="flex-auto">
                        <h1 className="text-sm font-medium leading-5 border-gray-800">
                          Marketeq Client Portal - Redesigning and Optimizing
                          Website for Enhanced User Experience.
                        </h1>

                        <div className="mt-2 inline-flex items-center gap-x-2">
                          <UserGroup />
                          <span className="text-xs leading-5 font-semibold text-primary-500">
                            8 team members
                          </span>
                        </div>

                        <div className="flex mt-2 items-center gap-x-2">
                          <span className="text-[13px] leading-none font-semibold text-[#122A4B]">
                            January 2024 - August 2024
                          </span>
                        </div>
                      </div>
                      <div className="inline-flex flex-col items-end gap-y-[26px]">
                        <Badge size="md" visual="primary">
                          8 months
                        </Badge>

                        <div className="inline-flex flex-col gap-y-0.5">
                          <span className="inline-block text-dark-blue-400 text-xl leading-none font-semibold">
                            $94,000
                          </span>
                          <span className="inline-block text-dark-blue-400 text-xs leading-none">
                            Project Cost
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-6">
                    <Tabs defaultValue="Project Scope">
                      <div className="flex items-center justify-between">
                        <TabsList className="p-1 rounded-[5px] gap-x-2 h-11 bg-white border border-gray-200">
                          <DisclosureTrigger
                            className="focus-visible:outline-none transition duration-300 h-9 shrink-0 inline-flex items-center justify-center py-2 px-3 text-xs leading-5 font-semibold rounded-[4px] data-[state=active]:bg-gray-100 text-gray-700"
                            value="Project Scope"
                          >
                            Project Scope
                          </DisclosureTrigger>
                          <DisclosureTrigger
                            className="focus-visible:outline-none transition duration-300 h-9 shrink-0 inline-flex items-center justify-center py-2 px-3 text-xs leading-5 font-semibold rounded-[4px] data-[state=active]:bg-gray-100 text-gray-700"
                            value="Team Members"
                          >
                            Team Members
                          </DisclosureTrigger>
                        </TabsList>

                        <Dialog>
                          <DialogTrigger asChild>
                            <Button
                              variant="outlined"
                              className="bg-white text-xs leading-5"
                            >
                              <Edit03 className="size-[15px] text-gray-500" />{" "}
                              Edit Scope
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>
                                Are you sure you want to leave checkout to edit
                                the scope?
                              </DialogTitle>
                            </DialogHeader>
                            <DialogFooter className="mt-8">
                              <DialogClose asChild>
                                <Button
                                  variant="outlined"
                                  visual="gray"
                                  onClick={() =>
                                    router.push(
                                      `/project-details/${safeSlugSegment}`
                                    )
                                  }
                                >
                                  Edit Scope
                                </Button>
                              </DialogClose>
                              <DialogClose asChild>
                                <Button>Continue Checkout</Button>
                              </DialogClose>
                            </DialogFooter>
                          </DialogContent>
                        </Dialog>
                      </div>
                      <TabsContent value="Team Members">
                        <div className="rounded-lg mt-6 bg-white border border-gray-200 overflow-hidden">
                          <Table>
                            <TableHeader className="bg-gray-50 [&_tr]:border-t-0">
                              <TableRow className="hover:bg-transparent">
                                <TableHead className="bg-gray-50 hover:text-gray-600">
                                  <span className="inline-flex items-center gap-x-1">
                                    Name <ArrowDown className="size-[15px]" />
                                  </span>
                                </TableHead>
                                <TableHead className="bg-gray-50 hover:text-gray-600">
                                  Phase
                                </TableHead>
                                <TableHead className="bg-gray-50 hover:text-gray-600">
                                  Experience
                                </TableHead>
                                <TableHead className="bg-gray-50 hover:text-gray-600">
                                  Location
                                </TableHead>
                                <TableHead className="bg-gray-50 hover:text-gray-600">
                                  Rate
                                </TableHead>
                                <TableHead className="bg-gray-50 hover:text-gray-600">
                                  Status
                                </TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              <TableRow className="hover:bg-white">
                                <TableCell className="py-4 px-6">
                                  <span className="inline-flex items-start gap-x-2">
                                    <Avatar size="sm">
                                      <AvatarImage src="/man.jpg" alt="Man" />
                                      <AvatarFallback>M</AvatarFallback>
                                    </Avatar>

                                    <span className="inline-flex flex-col">
                                      <span className="text-xs text-nowrap leading-[16.26px] font-semibold text-dark-blue-400">
                                        Vivek
                                      </span>
                                      <span className="text-xs text-nowrap leading-[16.26px] font-extralight text-dark-blue-400">
                                        @topdesigner321
                                      </span>
                                    </span>
                                  </span>
                                </TableCell>
                                <TableCell className="py-4 px-6">
                                  <Badge
                                    className="text-xs leading-[18px] rounded-[5px] border border-gray-200 bg-white"
                                    visual="gray"
                                    size="lg"
                                  >
                                    4 Phases
                                  </Badge>
                                </TableCell>
                                <TableCell className="py-4 px-6">
                                  <Dropdown defaultValue="Junior" />
                                </TableCell>
                                <TableCell className="py-4 px-6">
                                  <CountriesCombobox
                                    triggerClassName="group border-gray-200 data-[state=open]:border-gray-300 data-[state=open]:border-dashed data-[state=open]:bg-gray-100 hover:border-gray-300 hover:border-dashed bg-white hover:bg-gray-100 border-solid"
                                    defaultValue="United States"
                                  />
                                </TableCell>
                                <TableCell className="py-4 px-6">
                                  <span className="whitespace-nowrap inline-block text-sm leading-5 text-gray-600">
                                    $500/hr
                                  </span>
                                </TableCell>
                                <TableCell className="py-4 px-6">
                                  <Badge visual="success">Confirmed</Badge>
                                </TableCell>

                                <TableCell className="py-4 px-6">
                                  <IconButton
                                    className="w-[27px] h-[23px]"
                                    variant="ghost"
                                    visual="gray"
                                  >
                                    <MoreHorizontal className="size-[15px]" />
                                  </IconButton>
                                </TableCell>
                              </TableRow>
                              <TableRow className="hover:bg-white">
                                <TableCell className="py-4 px-6">
                                  <span className="inline-flex items-start gap-x-2">
                                    <Avatar size="sm">
                                      <AvatarImage src="/man.jpg" alt="Man" />
                                      <AvatarFallback>M</AvatarFallback>
                                    </Avatar>

                                    <span className="inline-flex flex-col">
                                      <span className="text-xs text-nowrap leading-[16.26px] font-semibold text-dark-blue-400">
                                        Vivek
                                      </span>
                                      <span className="text-xs text-nowrap leading-[16.26px] font-extralight text-dark-blue-400">
                                        @topdesigner321
                                      </span>
                                    </span>
                                  </span>
                                </TableCell>
                                <TableCell className="py-4 px-6">
                                  <Badge
                                    className="text-xs leading-[18px] rounded-[5px] border border-gray-200 bg-white"
                                    visual="gray"
                                    size="lg"
                                  >
                                    4 Phases
                                  </Badge>
                                </TableCell>
                                <TableCell className="py-4 px-6">
                                  <Dropdown defaultValue="Junior" />
                                </TableCell>
                                <TableCell className="py-4 px-6">
                                  <CountriesCombobox
                                    triggerClassName="group border-gray-200 data-[state=open]:border-gray-300 data-[state=open]:border-dashed data-[state=open]:bg-gray-100 hover:border-gray-300 hover:border-dashed bg-white hover:bg-gray-100 border-solid"
                                    defaultValue="United States"
                                  />
                                </TableCell>
                                <TableCell className="py-4 px-6">
                                  <span className="whitespace-nowrap inline-block text-sm leading-5 text-gray-600">
                                    $500/hr
                                  </span>
                                </TableCell>
                                <TableCell className="py-4 px-6">
                                  <Badge visual="success">Confirmed</Badge>
                                </TableCell>

                                <TableCell className="py-4 px-6">
                                  <IconButton
                                    className="w-[27px] h-[23px]"
                                    variant="ghost"
                                    visual="gray"
                                  >
                                    <MoreHorizontal className="size-[15px]" />
                                  </IconButton>
                                </TableCell>
                              </TableRow>
                              <TableRow className="hover:bg-white">
                                <TableCell className="py-4 px-6">
                                  <span className="inline-flex items-start gap-x-2">
                                    <Avatar size="sm">
                                      <AvatarImage src="/man.jpg" alt="Man" />
                                      <AvatarFallback>M</AvatarFallback>
                                    </Avatar>

                                    <span className="inline-flex flex-col">
                                      <span className="text-xs text-nowrap leading-[16.26px] font-semibold text-dark-blue-400">
                                        Vivek
                                      </span>
                                      <span className="text-xs text-nowrap leading-[16.26px] font-extralight text-dark-blue-400">
                                        @topdesigner321
                                      </span>
                                    </span>
                                  </span>
                                </TableCell>
                                <TableCell className="py-4 px-6">
                                  <Badge
                                    className="text-xs leading-[18px] rounded-[5px] border border-gray-200 bg-white"
                                    visual="gray"
                                    size="lg"
                                  >
                                    4 Phases
                                  </Badge>
                                </TableCell>
                                <TableCell className="py-4 px-6">
                                  <Dropdown defaultValue="Junior" />
                                </TableCell>
                                <TableCell className="py-4 px-6">
                                  <CountriesCombobox
                                    triggerClassName="group border-gray-200 data-[state=open]:border-gray-300 data-[state=open]:border-dashed data-[state=open]:bg-gray-100 hover:border-gray-300 hover:border-dashed bg-white hover:bg-gray-100 border-solid"
                                    defaultValue="United States"
                                  />
                                </TableCell>
                                <TableCell className="py-4 px-6">
                                  <span className="whitespace-nowrap inline-block text-sm leading-5 text-gray-600">
                                    $500/hr
                                  </span>
                                </TableCell>
                                <TableCell className="py-4 px-6">
                                  <Badge visual="success">Confirmed</Badge>
                                </TableCell>

                                <TableCell className="py-4 px-6">
                                  <IconButton
                                    className="w-[27px] h-[23px]"
                                    variant="ghost"
                                    visual="gray"
                                  >
                                    <MoreHorizontal className="size-[15px]" />
                                  </IconButton>
                                </TableCell>
                              </TableRow>
                              <TableRow className="hover:bg-white">
                                <TableCell className="py-4 px-6">
                                  <span className="inline-flex items-start gap-x-2">
                                    <Avatar size="sm">
                                      <AvatarImage src="/man.jpg" alt="Man" />
                                      <AvatarFallback>M</AvatarFallback>
                                    </Avatar>

                                    <span className="inline-flex flex-col">
                                      <span className="text-xs text-nowrap leading-[16.26px] font-semibold text-dark-blue-400">
                                        Vivek
                                      </span>
                                      <span className="text-xs text-nowrap leading-[16.26px] font-extralight text-dark-blue-400">
                                        @topdesigner321
                                      </span>
                                    </span>
                                  </span>
                                </TableCell>
                                <TableCell className="py-4 px-6">
                                  <Badge
                                    className="text-xs leading-[18px] rounded-[5px] border border-gray-200 bg-white"
                                    visual="gray"
                                    size="lg"
                                  >
                                    4 Phases
                                  </Badge>
                                </TableCell>
                                <TableCell className="py-4 px-6">
                                  <Dropdown defaultValue="Junior" />
                                </TableCell>
                                <TableCell className="py-4 px-6">
                                  <CountriesCombobox
                                    triggerClassName="group border-gray-200 data-[state=open]:border-gray-300 data-[state=open]:border-dashed data-[state=open]:bg-gray-100 hover:border-gray-300 hover:border-dashed bg-white hover:bg-gray-100 border-solid"
                                    defaultValue="United States"
                                  />
                                </TableCell>
                                <TableCell className="py-4 px-6">
                                  <span className="whitespace-nowrap inline-block text-sm leading-5 text-gray-600">
                                    $500/hr
                                  </span>
                                </TableCell>
                                <TableCell className="py-4 px-6">
                                  <Badge visual="success">Confirmed</Badge>
                                </TableCell>

                                <TableCell className="py-4 px-6">
                                  <IconButton
                                    className="w-[27px] h-[23px]"
                                    variant="ghost"
                                    visual="gray"
                                  >
                                    <MoreHorizontal className="size-[15px]" />
                                  </IconButton>
                                </TableCell>
                              </TableRow>
                            </TableBody>
                          </Table>
                        </div>

                        <div className="mt-6 p-6 rounded-lg border border-gray-200 shadow-[0px_1px_5px_0px_rgba(16,24,40,.02)] bg-white">
                          <h1 className="text-2xl font-bold leading-[0.7] text-dark-blue-400">
                            FAQ&apos;s
                          </h1>

                          <p className="mt-5 text-base leading-none font-light text-dark-blue-400">
                            We use proven design methods to create a personal
                            approach to each product. This allows you to achieve
                            high results and the quality of the work done.
                          </p>

                          <div className="mt-6">
                            <Accordion
                              type="multiple"
                              className="pt-6 space-y-[15px] overflow-hidden [interpolate-size:allow-keywords] transition-[height] duration-300"
                              defaultValue={["item-1"]}
                            >
                              <AccordionItem
                                className="rounded-lg bg-white border border-gray-300"
                                value="item-1"
                              >
                                <AccordionTrigger className="w-full px-5 py-3 flex items-center gap-x-2 text-base leading-[1.3] font-semibold flex-auto text-dark-blue-400">
                                  <span className="flex-auto text-left inline-block">
                                    How will you ensure we&apos;re aligned on
                                    progress and feedback throughout each stage?
                                  </span>
                                  <ChevronDown className="size-6 shrink-0 group-data-[state=open]/item:-rotate-180 transition duration-300" />
                                </AccordionTrigger>

                                <DisclosureContent className="text-base px-5 pb-5 leading-[1.5] text-dark-blue-400 font-light">
                                  We offer a comprehensive range of IT
                                  consulting services, including IT strategy
                                  development, software development, network
                                  infrastructure design and implementation,
                                  cybersecurity assessment and solutions, cloud
                                  computing solutions, and IT project
                                  management.
                                </DisclosureContent>
                              </AccordionItem>
                              <AccordionItem
                                className="rounded-lg bg-white border border-gray-300"
                                value="item-2"
                              >
                                <AccordionTrigger className="w-full px-5 py-3 flex items-center gap-x-2 text-base leading-[1.3] font-semibold flex-auto text-dark-blue-400">
                                  <span className="flex-auto text-left inline-block">
                                    How will you ensure we&apos;re aligned on
                                    progress and feedback throughout each stage?
                                  </span>
                                  <ChevronDown className="size-6 shrink-0 group-data-[state=open]/item:-rotate-180 transition duration-300" />
                                </AccordionTrigger>

                                <DisclosureContent className="text-base px-5 pb-5 leading-[1.5] text-dark-blue-400 font-light">
                                  We offer a comprehensive range of IT
                                  consulting services, including IT strategy
                                  development, software development, network
                                  infrastructure design and implementation,
                                  cybersecurity assessment and solutions, cloud
                                  computing solutions, and IT project
                                  management.
                                </DisclosureContent>
                              </AccordionItem>
                              <AccordionItem
                                className="rounded-lg bg-white border border-gray-300"
                                value="item-3"
                              >
                                <AccordionTrigger className="w-full px-5 py-3 flex items-center gap-x-2 text-base leading-[1.3] font-semibold flex-auto text-dark-blue-400">
                                  <span className="flex-auto text-left inline-block">
                                    How will you ensure we&apos;re aligned on
                                    progress and feedback throughout each stage?
                                  </span>
                                  <ChevronDown className="size-6 shrink-0 group-data-[state=open]/item:-rotate-180 transition duration-300" />
                                </AccordionTrigger>

                                <DisclosureContent className="text-base px-5 pb-5 leading-[1.5] text-dark-blue-400 font-light">
                                  We offer a comprehensive range of IT
                                  consulting services, including IT strategy
                                  development, software development, network
                                  infrastructure design and implementation,
                                  cybersecurity assessment and solutions, cloud
                                  computing solutions, and IT project
                                  management.
                                </DisclosureContent>
                              </AccordionItem>
                              <AccordionItem
                                className="rounded-lg bg-white border border-gray-300"
                                value="item-4"
                              >
                                <AccordionTrigger className="w-full px-5 py-3 flex items-center gap-x-2 text-base leading-[1.3] font-semibold flex-auto text-dark-blue-400">
                                  <span className="flex-auto text-left inline-block">
                                    How will you ensure we&apos;re aligned on
                                    progress and feedback throughout each stage?
                                  </span>
                                  <ChevronDown className="size-6 shrink-0 group-data-[state=open]/item:-rotate-180 transition duration-300" />
                                </AccordionTrigger>

                                <DisclosureContent className="text-base px-5 pb-5 leading-[1.5] text-dark-blue-400 font-light">
                                  We offer a comprehensive range of IT
                                  consulting services, including IT strategy
                                  development, software development, network
                                  infrastructure design and implementation,
                                  cybersecurity assessment and solutions, cloud
                                  computing solutions, and IT project
                                  management.
                                </DisclosureContent>
                              </AccordionItem>
                              <AccordionItem
                                className="rounded-lg bg-white border border-gray-300"
                                value="item-5"
                              >
                                <AccordionTrigger className="w-full px-5 py-3 flex items-center gap-x-2 text-base leading-[1.3] font-semibold flex-auto text-dark-blue-400">
                                  <span className="flex-auto text-left inline-block">
                                    How will you ensure we&apos;re aligned on
                                    progress and feedback throughout each stage?
                                  </span>
                                  <ChevronDown className="size-6 shrink-0 group-data-[state=open]/item:-rotate-180 transition duration-300" />
                                </AccordionTrigger>

                                <DisclosureContent className="text-base px-5 pb-5 leading-[1.5] text-dark-blue-400 font-light">
                                  We offer a comprehensive range of IT
                                  consulting services, including IT strategy
                                  development, software development, network
                                  infrastructure design and implementation,
                                  cybersecurity assessment and solutions, cloud
                                  computing solutions, and IT project
                                  management.
                                </DisclosureContent>
                              </AccordionItem>
                              <AccordionItem
                                className="rounded-lg bg-white border border-gray-300"
                                value="item-6"
                              >
                                <AccordionTrigger className="w-full px-5 py-3 flex items-center gap-x-2 text-base leading-[1.3] font-semibold flex-auto text-dark-blue-400">
                                  <span className="flex-auto text-left inline-block">
                                    How will you ensure we&apos;re aligned on
                                    progress and feedback throughout each stage?
                                  </span>
                                  <ChevronDown className="size-6 shrink-0 group-data-[state=open]/item:-rotate-180 transition duration-300" />
                                </AccordionTrigger>

                                <DisclosureContent className="text-base px-5 pb-5 leading-[1.5] text-dark-blue-400 font-light">
                                  We offer a comprehensive range of IT
                                  consulting services, including IT strategy
                                  development, software development, network
                                  infrastructure design and implementation,
                                  cybersecurity assessment and solutions, cloud
                                  computing solutions, and IT project
                                  management.
                                </DisclosureContent>
                              </AccordionItem>
                              <AccordionItem
                                className="rounded-lg bg-white border border-gray-300"
                                value="item-7"
                              >
                                <AccordionTrigger className="w-full px-5 py-3 flex items-center gap-x-2 text-base leading-[1.3] font-semibold flex-auto text-dark-blue-400">
                                  <span className="flex-auto text-left inline-block">
                                    How will you ensure we&apos;re aligned on
                                    progress and feedback throughout each stage?
                                  </span>
                                  <ChevronDown className="size-6 shrink-0 group-data-[state=open]/item:-rotate-180 transition duration-300" />
                                </AccordionTrigger>

                                <DisclosureContent className="text-base px-5 pb-5 leading-[1.5] text-dark-blue-400 font-light">
                                  We offer a comprehensive range of IT
                                  consulting services, including IT strategy
                                  development, software development, network
                                  infrastructure design and implementation,
                                  cybersecurity assessment and solutions, cloud
                                  computing solutions, and IT project
                                  management.
                                </DisclosureContent>
                              </AccordionItem>
                            </Accordion>
                          </div>
                        </div>
                      </TabsContent>
                      <TabsContent value="Project Scope">
                        <div className="mt-6">
                          <Accordion
                            type="multiple"
                            defaultValue={["item-1", "item-2", "item-3"]}
                            className="flex-auto space-y-3"
                          >
                            <AccordionItem
                              value="item-1"
                              className="rounded-lg border border-gray-200 shadow-sm bg-white"
                            >
                              <div className="flex items-center justify-between gap-x-4 px-3 py-3">
                                <div className="inline-flex items-center gap-x-3.5">
                                  <AccordionTrigger asChild>
                                    <IconButton variant="ghost" visual="gray">
                                      <ChevronDown className="size-5 shrink-0 text-gray-500 group-data-[state=open]/item:-rotate-180 transition duration-300" />
                                    </IconButton>
                                  </AccordionTrigger>

                                  <span className="text-base md:text-[18px] font-semibold leading-7 text-gray-900">
                                    Phase One{" "}
                                    <span className="font-light">Research</span>
                                  </span>
                                </div>

                                <div className="inline-flex items-center gap-x-8">
                                  <div className="inline-flex items-center gap-x-2 md:pl-0 pl-10">
                                    <span className="text-xs leading-[14.52px] md:text-[13px] md:leading-[15.73px] text-dark-blue-400 font-semibold">
                                      Day 1
                                    </span>
                                    <span className="text-xs leading-[14.52px] md:text-[13px] md:leading-[15.73px] text-dark-blue-400 font-semibold">
                                      -
                                    </span>
                                    <span className="text-xs leading-[14.52px] md:text-[13px] md:leading-[15.73px] text-dark-blue-400 font-semibold">
                                      Day 8
                                    </span>
                                  </div>

                                  <Button visual="gray" variant="outlined">
                                    <Plus className="size-[15px]" />
                                    Add task
                                  </Button>
                                </div>
                              </div>

                              <DisclosureContent>
                                <Table>
                                  <TableHeader className="bg-gray-50">
                                    <TableRow className="hover:bg-transparent">
                                      <TableHead className="hover:text-gray-600">
                                        Task
                                      </TableHead>
                                      <TableHead className="hover:text-gray-600">
                                        Description
                                      </TableHead>
                                      <TableHead className="hover:text-gray-600">
                                        Assignee
                                      </TableHead>
                                      <TableHead className="hover:text-gray-600">
                                        Duration
                                      </TableHead>
                                    </TableRow>
                                  </TableHeader>
                                  <TableBody>
                                    <TableRow className="hover:bg-white">
                                      <TableCell className="py-4 px-6">
                                        <span className="text-sm text-nowrap font-semibold text-dark-blue-400">
                                          Consumer Research
                                        </span>
                                      </TableCell>
                                      <TableCell className="py-4 px-6">
                                        <span className="text-sm font-extralight line-clamp-2 text-dark-blue-400">
                                          Conduct research to understand
                                          consumer needs, behaviors, and
                                          preferences for product optimization.
                                        </span>
                                      </TableCell>
                                      <TableCell className="py-4 px-6">
                                        <span className="inline-flex items-start gap-x-2">
                                          <Avatar>
                                            <AvatarImage
                                              src="/man.jpg"
                                              alt="Man"
                                            />
                                            <AvatarFallback>M</AvatarFallback>
                                          </Avatar>

                                          <span className="inline-flex flex-col">
                                            <span className="text-xs text-nowrap leading-[16.26px] font-semibold text-dark-blue-400">
                                              Vivek
                                            </span>
                                            <span className="text-xs text-nowrap leading-[16.26px] font-extralight text-dark-blue-400">
                                              @topdesigner321
                                            </span>
                                          </span>
                                        </span>
                                      </TableCell>
                                      <TableCell className="py-4 px-6">
                                        <span className="text-sm text-nowrap line-clamp-2 text-dark-blue-400">
                                          40 hours
                                        </span>
                                      </TableCell>
                                    </TableRow>
                                    <TableRow className="hover:bg-white">
                                      <TableCell className="py-4 px-6">
                                        <span className="text-sm text-nowrap font-semibold text-dark-blue-400">
                                          Consumer Research
                                        </span>
                                      </TableCell>
                                      <TableCell className="py-4 px-6">
                                        <span className="text-sm font-extralight line-clamp-2 text-dark-blue-400">
                                          Conduct research to understand
                                          consumer needs, behaviors, and
                                          preferences for product optimization.
                                        </span>
                                      </TableCell>
                                      <TableCell className="py-4 px-6">
                                        <span className="inline-flex items-start gap-x-2">
                                          <Avatar>
                                            <AvatarImage
                                              src="/man.jpg"
                                              alt="Man"
                                            />
                                            <AvatarFallback>M</AvatarFallback>
                                          </Avatar>

                                          <span className="inline-flex flex-col">
                                            <span className="text-xs text-nowrap leading-[16.26px] font-semibold text-dark-blue-400">
                                              Vivek
                                            </span>
                                            <span className="text-xs text-nowrap leading-[16.26px] font-extralight text-dark-blue-400">
                                              @topdesigner321
                                            </span>
                                          </span>
                                        </span>
                                      </TableCell>
                                      <TableCell className="py-4 px-6">
                                        <span className="text-sm text-nowrap line-clamp-2 text-dark-blue-400">
                                          40 hours
                                        </span>
                                      </TableCell>
                                    </TableRow>
                                    <TableRow className="hover:bg-white">
                                      <TableCell className="py-4 px-6">
                                        <span className="text-sm text-nowrap font-semibold text-dark-blue-400">
                                          Consumer Research
                                        </span>
                                      </TableCell>
                                      <TableCell className="py-4 px-6">
                                        <span className="text-sm font-extralight line-clamp-2 text-dark-blue-400">
                                          Conduct research to understand
                                          consumer needs, behaviors, and
                                          preferences for product optimization.
                                        </span>
                                      </TableCell>
                                      <TableCell className="py-4 px-6">
                                        <span className="inline-flex items-start gap-x-2">
                                          <Avatar>
                                            <AvatarImage
                                              src="/man.jpg"
                                              alt="Man"
                                            />
                                            <AvatarFallback>M</AvatarFallback>
                                          </Avatar>

                                          <span className="inline-flex flex-col">
                                            <span className="text-xs text-nowrap leading-[16.26px] font-semibold text-dark-blue-400">
                                              Vivek
                                            </span>
                                            <span className="text-xs text-nowrap leading-[16.26px] font-extralight text-dark-blue-400">
                                              @topdesigner321
                                            </span>
                                          </span>
                                        </span>
                                      </TableCell>
                                      <TableCell className="py-4 px-6">
                                        <span className="text-sm text-nowrap line-clamp-2 text-dark-blue-400">
                                          40 hours
                                        </span>
                                      </TableCell>
                                    </TableRow>
                                    <TableRow className="hover:bg-white">
                                      <TableCell className="py-4 px-6">
                                        <span className="text-sm text-nowrap font-semibold text-dark-blue-400">
                                          Consumer Research
                                        </span>
                                      </TableCell>
                                      <TableCell className="py-4 px-6">
                                        <span className="text-sm font-extralight line-clamp-2 text-dark-blue-400">
                                          Conduct research to understand
                                          consumer needs, behaviors, and
                                          preferences for product optimization.
                                        </span>
                                      </TableCell>
                                      <TableCell className="py-4 px-6">
                                        <span className="inline-flex items-start gap-x-2">
                                          <Avatar>
                                            <AvatarImage
                                              src="/man.jpg"
                                              alt="Man"
                                            />
                                            <AvatarFallback>M</AvatarFallback>
                                          </Avatar>

                                          <span className="inline-flex flex-col">
                                            <span className="text-xs text-nowrap leading-[16.26px] font-semibold text-dark-blue-400">
                                              Vivek
                                            </span>
                                            <span className="text-xs text-nowrap leading-[16.26px] font-extralight text-dark-blue-400">
                                              @topdesigner321
                                            </span>
                                          </span>
                                        </span>
                                      </TableCell>
                                      <TableCell className="py-4 px-6">
                                        <span className="text-sm text-nowrap line-clamp-2 text-dark-blue-400">
                                          40 hours
                                        </span>
                                      </TableCell>
                                    </TableRow>
                                  </TableBody>
                                </Table>
                              </DisclosureContent>
                            </AccordionItem>
                            <AccordionItem
                              value="item-2"
                              className="rounded-lg border border-gray-200 shadow-sm bg-white"
                            >
                              <div className="flex items-center justify-between gap-x-4 px-3 py-3">
                                <div className="inline-flex items-center gap-x-3.5">
                                  <AccordionTrigger asChild>
                                    <IconButton
                                      className="size-8"
                                      variant="ghost"
                                      visual="gray"
                                    >
                                      <ChevronDown className="size-5 shrink-0 text-gray-500 group-data-[state=open]/item:-rotate-180 transition duration-300" />
                                    </IconButton>
                                  </AccordionTrigger>

                                  <span className="text-base md:text-[18px] font-semibold leading-7 text-gray-900">
                                    Phase One{" "}
                                    <span className="font-light">Research</span>
                                  </span>
                                </div>

                                <div className="inline-flex items-center gap-x-8">
                                  <div className="inline-flex items-center gap-x-2 md:pl-0 pl-10">
                                    <span className="text-xs leading-[14.52px] md:text-[13px] md:leading-[15.73px] text-dark-blue-400 font-semibold">
                                      Day 1
                                    </span>
                                    <span className="text-xs leading-[14.52px] md:text-[13px] md:leading-[15.73px] text-dark-blue-400 font-semibold">
                                      -
                                    </span>
                                    <span className="text-xs leading-[14.52px] md:text-[13px] md:leading-[15.73px] text-dark-blue-400 font-semibold">
                                      Day 8
                                    </span>
                                  </div>

                                  <Button visual="gray" variant="outlined">
                                    <Plus className="size-[15px]" />
                                    Add task
                                  </Button>
                                </div>
                              </div>

                              <DisclosureContent>
                                <Table>
                                  <TableHeader className="bg-gray-50">
                                    <TableRow className="hover:bg-transparent">
                                      <TableHead className="hover:text-gray-600">
                                        Task
                                      </TableHead>
                                      <TableHead className="hover:text-gray-600">
                                        Description
                                      </TableHead>
                                      <TableHead className="hover:text-gray-600">
                                        Assignee
                                      </TableHead>
                                      <TableHead className="hover:text-gray-600">
                                        Duration
                                      </TableHead>
                                    </TableRow>
                                  </TableHeader>
                                  <TableBody>
                                    <TableRow className="hover:bg-white">
                                      <TableCell className="py-4 px-6">
                                        <span className="text-sm text-nowrap font-semibold text-dark-blue-400">
                                          Consumer Research
                                        </span>
                                      </TableCell>
                                      <TableCell className="py-4 px-6">
                                        <span className="text-sm font-extralight line-clamp-2 text-dark-blue-400">
                                          Conduct research to understand
                                          consumer needs, behaviors, and
                                          preferences for product optimization.
                                        </span>
                                      </TableCell>
                                      <TableCell className="py-4 px-6">
                                        <span className="inline-flex items-start gap-x-2">
                                          <Avatar>
                                            <AvatarImage
                                              src="/man.jpg"
                                              alt="Man"
                                            />
                                            <AvatarFallback>M</AvatarFallback>
                                          </Avatar>

                                          <span className="inline-flex flex-col">
                                            <span className="text-xs text-nowrap leading-[16.26px] font-semibold text-dark-blue-400">
                                              Vivek
                                            </span>
                                            <span className="text-xs text-nowrap leading-[16.26px] font-extralight text-dark-blue-400">
                                              @topdesigner321
                                            </span>
                                          </span>
                                        </span>
                                      </TableCell>
                                      <TableCell className="py-4 px-6">
                                        <span className="text-sm text-nowrap line-clamp-2 text-dark-blue-400">
                                          40 hours
                                        </span>
                                      </TableCell>
                                    </TableRow>
                                    <TableRow className="hover:bg-white">
                                      <TableCell className="py-4 px-6">
                                        <span className="text-sm text-nowrap font-semibold text-dark-blue-400">
                                          Consumer Research
                                        </span>
                                      </TableCell>
                                      <TableCell className="py-4 px-6">
                                        <span className="text-sm font-extralight line-clamp-2 text-dark-blue-400">
                                          Conduct research to understand
                                          consumer needs, behaviors, and
                                          preferences for product optimization.
                                        </span>
                                      </TableCell>
                                      <TableCell className="py-4 px-6">
                                        <span className="inline-flex items-start gap-x-2">
                                          <Avatar>
                                            <AvatarImage
                                              src="/man.jpg"
                                              alt="Man"
                                            />
                                            <AvatarFallback>M</AvatarFallback>
                                          </Avatar>

                                          <span className="inline-flex flex-col">
                                            <span className="text-xs text-nowrap leading-[16.26px] font-semibold text-dark-blue-400">
                                              Vivek
                                            </span>
                                            <span className="text-xs text-nowrap leading-[16.26px] font-extralight text-dark-blue-400">
                                              @topdesigner321
                                            </span>
                                          </span>
                                        </span>
                                      </TableCell>
                                      <TableCell className="py-4 px-6">
                                        <span className="text-sm text-nowrap line-clamp-2 text-dark-blue-400">
                                          40 hours
                                        </span>
                                      </TableCell>
                                    </TableRow>
                                    <TableRow className="hover:bg-white">
                                      <TableCell className="py-4 px-6">
                                        <span className="text-sm text-nowrap font-semibold text-dark-blue-400">
                                          Consumer Research
                                        </span>
                                      </TableCell>
                                      <TableCell className="py-4 px-6">
                                        <span className="text-sm font-extralight line-clamp-2 text-dark-blue-400">
                                          Conduct research to understand
                                          consumer needs, behaviors, and
                                          preferences for product optimization.
                                        </span>
                                      </TableCell>
                                      <TableCell className="py-4 px-6">
                                        <span className="inline-flex items-start gap-x-2">
                                          <Avatar>
                                            <AvatarImage
                                              src="/man.jpg"
                                              alt="Man"
                                            />
                                            <AvatarFallback>M</AvatarFallback>
                                          </Avatar>

                                          <span className="inline-flex flex-col">
                                            <span className="text-xs text-nowrap leading-[16.26px] font-semibold text-dark-blue-400">
                                              Vivek
                                            </span>
                                            <span className="text-xs text-nowrap leading-[16.26px] font-extralight text-dark-blue-400">
                                              @topdesigner321
                                            </span>
                                          </span>
                                        </span>
                                      </TableCell>
                                      <TableCell className="py-4 px-6">
                                        <span className="text-sm text-nowrap line-clamp-2 text-dark-blue-400">
                                          40 hours
                                        </span>
                                      </TableCell>
                                    </TableRow>
                                    <TableRow className="hover:bg-white">
                                      <TableCell className="py-4 px-6">
                                        <span className="text-sm text-nowrap font-semibold text-dark-blue-400">
                                          Consumer Research
                                        </span>
                                      </TableCell>
                                      <TableCell className="py-4 px-6">
                                        <span className="text-sm font-extralight line-clamp-2 text-dark-blue-400">
                                          Conduct research to understand
                                          consumer needs, behaviors, and
                                          preferences for product optimization.
                                        </span>
                                      </TableCell>
                                      <TableCell className="py-4 px-6">
                                        <span className="inline-flex items-start gap-x-2">
                                          <Avatar>
                                            <AvatarImage
                                              src="/man.jpg"
                                              alt="Man"
                                            />
                                            <AvatarFallback>M</AvatarFallback>
                                          </Avatar>

                                          <span className="inline-flex flex-col">
                                            <span className="text-xs text-nowrap leading-[16.26px] font-semibold text-dark-blue-400">
                                              Vivek
                                            </span>
                                            <span className="text-xs text-nowrap leading-[16.26px] font-extralight text-dark-blue-400">
                                              @topdesigner321
                                            </span>
                                          </span>
                                        </span>
                                      </TableCell>
                                      <TableCell className="py-4 px-6">
                                        <span className="text-sm text-nowrap line-clamp-2 text-dark-blue-400">
                                          40 hours
                                        </span>
                                      </TableCell>
                                    </TableRow>
                                  </TableBody>
                                </Table>
                              </DisclosureContent>
                            </AccordionItem>
                            <AccordionItem
                              value="item-3"
                              className="rounded-lg border border-gray-200 shadow-sm bg-white"
                            >
                              <div className="flex items-center justify-between gap-x-4 px-3 py-3">
                                <div className="inline-flex items-center gap-x-3.5">
                                  <AccordionTrigger asChild>
                                    <IconButton variant="ghost" visual="gray">
                                      <ChevronDown className="size-5 shrink-0 text-gray-500 group-data-[state=open]/item:-rotate-180 transition duration-300" />
                                    </IconButton>
                                  </AccordionTrigger>

                                  <span className="text-base md:text-[18px] font-semibold leading-7 text-gray-900">
                                    Phase One{" "}
                                    <span className="font-light">Research</span>
                                  </span>
                                </div>

                                <div className="inline-flex items-center gap-x-8">
                                  <div className="inline-flex items-center gap-x-2 md:pl-0 pl-10">
                                    <span className="text-xs leading-[14.52px] md:text-[13px] md:leading-[15.73px] text-dark-blue-400 font-semibold">
                                      Day 1
                                    </span>
                                    <span className="text-xs leading-[14.52px] md:text-[13px] md:leading-[15.73px] text-dark-blue-400 font-semibold">
                                      -
                                    </span>
                                    <span className="text-xs leading-[14.52px] md:text-[13px] md:leading-[15.73px] text-dark-blue-400 font-semibold">
                                      Day 8
                                    </span>
                                  </div>

                                  <Button visual="gray" variant="outlined">
                                    <Plus className="size-[15px]" />
                                    Add task
                                  </Button>
                                </div>
                              </div>

                              <DisclosureContent>
                                <Table>
                                  <TableHeader className="bg-gray-50">
                                    <TableRow className="hover:bg-transparent">
                                      <TableHead className="hover:text-gray-600">
                                        Task
                                      </TableHead>
                                      <TableHead className="hover:text-gray-600">
                                        Description
                                      </TableHead>
                                      <TableHead className="hover:text-gray-600">
                                        Assignee
                                      </TableHead>
                                      <TableHead className="hover:text-gray-600">
                                        Duration
                                      </TableHead>
                                    </TableRow>
                                  </TableHeader>
                                  <TableBody>
                                    <TableRow className="hover:bg-white">
                                      <TableCell className="py-4 px-6">
                                        <span className="text-sm text-nowrap font-semibold text-dark-blue-400">
                                          Consumer Research
                                        </span>
                                      </TableCell>
                                      <TableCell className="py-4 px-6">
                                        <span className="text-sm font-extralight line-clamp-2 text-dark-blue-400">
                                          Conduct research to understand
                                          consumer needs, behaviors, and
                                          preferences for product optimization.
                                        </span>
                                      </TableCell>
                                      <TableCell className="py-4 px-6">
                                        <span className="inline-flex items-start gap-x-2">
                                          <Avatar>
                                            <AvatarImage
                                              src="/man.jpg"
                                              alt="Man"
                                            />
                                            <AvatarFallback>M</AvatarFallback>
                                          </Avatar>

                                          <span className="inline-flex flex-col">
                                            <span className="text-xs text-nowrap leading-[16.26px] font-semibold text-dark-blue-400">
                                              Vivek
                                            </span>
                                            <span className="text-xs text-nowrap leading-[16.26px] font-extralight text-dark-blue-400">
                                              @topdesigner321
                                            </span>
                                          </span>
                                        </span>
                                      </TableCell>
                                      <TableCell className="py-4 px-6">
                                        <span className="text-sm text-nowrap line-clamp-2 text-dark-blue-400">
                                          40 hours
                                        </span>
                                      </TableCell>
                                    </TableRow>
                                    <TableRow className="hover:bg-white">
                                      <TableCell className="py-4 px-6">
                                        <span className="text-sm text-nowrap font-semibold text-dark-blue-400">
                                          Consumer Research
                                        </span>
                                      </TableCell>
                                      <TableCell className="py-4 px-6">
                                        <span className="text-sm font-extralight line-clamp-2 text-dark-blue-400">
                                          Conduct research to understand
                                          consumer needs, behaviors, and
                                          preferences for product optimization.
                                        </span>
                                      </TableCell>
                                      <TableCell className="py-4 px-6">
                                        <span className="inline-flex items-start gap-x-2">
                                          <Avatar>
                                            <AvatarImage
                                              src="/man.jpg"
                                              alt="Man"
                                            />
                                            <AvatarFallback>M</AvatarFallback>
                                          </Avatar>

                                          <span className="inline-flex flex-col">
                                            <span className="text-xs text-nowrap leading-[16.26px] font-semibold text-dark-blue-400">
                                              Vivek
                                            </span>
                                            <span className="text-xs text-nowrap leading-[16.26px] font-extralight text-dark-blue-400">
                                              @topdesigner321
                                            </span>
                                          </span>
                                        </span>
                                      </TableCell>
                                      <TableCell className="py-4 px-6">
                                        <span className="text-sm text-nowrap line-clamp-2 text-dark-blue-400">
                                          40 hours
                                        </span>
                                      </TableCell>
                                    </TableRow>
                                    <TableRow className="hover:bg-white">
                                      <TableCell className="py-4 px-6">
                                        <span className="text-sm text-nowrap font-semibold text-dark-blue-400">
                                          Consumer Research
                                        </span>
                                      </TableCell>
                                      <TableCell className="py-4 px-6">
                                        <span className="text-sm font-extralight line-clamp-2 text-dark-blue-400">
                                          Conduct research to understand
                                          consumer needs, behaviors, and
                                          preferences for product optimization.
                                        </span>
                                      </TableCell>
                                      <TableCell className="py-4 px-6">
                                        <span className="inline-flex items-start gap-x-2">
                                          <Avatar>
                                            <AvatarImage
                                              src="/man.jpg"
                                              alt="Man"
                                            />
                                            <AvatarFallback>M</AvatarFallback>
                                          </Avatar>

                                          <span className="inline-flex flex-col">
                                            <span className="text-xs text-nowrap leading-[16.26px] font-semibold text-dark-blue-400">
                                              Vivek
                                            </span>
                                            <span className="text-xs text-nowrap leading-[16.26px] font-extralight text-dark-blue-400">
                                              @topdesigner321
                                            </span>
                                          </span>
                                        </span>
                                      </TableCell>
                                      <TableCell className="py-4 px-6">
                                        <span className="text-sm text-nowrap line-clamp-2 text-dark-blue-400">
                                          40 hours
                                        </span>
                                      </TableCell>
                                    </TableRow>
                                    <TableRow className="hover:bg-white">
                                      <TableCell className="py-4 px-6">
                                        <span className="text-sm text-nowrap font-semibold text-dark-blue-400">
                                          Consumer Research
                                        </span>
                                      </TableCell>
                                      <TableCell className="py-4 px-6">
                                        <span className="text-sm font-extralight line-clamp-2 text-dark-blue-400">
                                          Conduct research to understand
                                          consumer needs, behaviors, and
                                          preferences for product optimization.
                                        </span>
                                      </TableCell>
                                      <TableCell className="py-4 px-6">
                                        <span className="inline-flex items-start gap-x-2">
                                          <Avatar>
                                            <AvatarImage
                                              src="/man.jpg"
                                              alt="Man"
                                            />
                                            <AvatarFallback>M</AvatarFallback>
                                          </Avatar>

                                          <span className="inline-flex flex-col">
                                            <span className="text-xs text-nowrap leading-[16.26px] font-semibold text-dark-blue-400">
                                              Vivek
                                            </span>
                                            <span className="text-xs text-nowrap leading-[16.26px] font-extralight text-dark-blue-400">
                                              @topdesigner321
                                            </span>
                                          </span>
                                        </span>
                                      </TableCell>
                                      <TableCell className="py-4 px-6">
                                        <span className="text-sm text-nowrap line-clamp-2 text-dark-blue-400">
                                          40 hours
                                        </span>
                                      </TableCell>
                                    </TableRow>
                                  </TableBody>
                                </Table>
                              </DisclosureContent>
                            </AccordionItem>
                          </Accordion>
                        </div>
                      </TabsContent>
                    </Tabs>
                  </div>
                </>
              )}
            </div>
            <div className="w-[305px] shrink-0 bg-white">
              <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-[0px_1px_5px_0px_rgba(16,24,40,0.02)]">
                <h1 className="text-base font-semibold leading-none text-dark-blue-400">
                  Price Details
                </h1>

                {isTalentCheckout ? (
                  <>
                    <ul className="pt-4 mt-4 space-y-2 border-t border-gray-200">
                      <li className="flex items-center justify-between">
                        <span className="text-xs font-light text-dark-blue-400">
                          Hourly Rate
                        </span>
                        <span className="text-xs text-dark-blue-400">
                          {formattedHourlyRate}
                        </span>
                      </li>
                      <li className="flex items-center justify-between">
                        <span className="text-xs font-light text-dark-blue-400">
                          Estimated tax *
                        </span>
                        <span className="text-xs text-dark-blue-400">
                          {formattedEstimatedTax}
                        </span>
                      </li>
                      <li className="flex items-center justify-between">
                        <span className="text-xs font-light text-dark-blue-400">
                          Total Hourly rate
                        </span>
                        <span className="text-xs text-dark-blue-400">
                          {formattedTotalHourlyRate}
                        </span>
                      </li>
                    </ul>

                    <ul className="pt-4 mt-4 space-y-2 border-t border-gray-200">
                      <li className="flex items-center justify-between">
                        <span className="text-xs font-light text-dark-blue-400">
                          {paymentPlanCostLabel}
                        </span>
                        <span className="text-base font-bold leading-none text-dark-blue-400">
                          {selectedTalentPaymentPlan?.value ||
                            formattedWeeklyCost}
                        </span>
                      </li>
                    </ul>

                    <AnimatePresence initial={false}>
                      {selectedAddOns.length > 0 ? (
                        <motion.div
                          key="talent-add-ons"
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2, ease: "easeInOut" }}
                          className="overflow-hidden"
                        >
                          <div className="pt-4 mt-4 border-t border-gray-200">
                            <h2 className="text-base font-semibold leading-none text-dark-blue-400">
                              Add-ons
                            </h2>

                            <ul className="mt-4 space-y-2">
                              <AnimatePresence initial={false}>
                                {selectedAddOns.map((recommendation) => (
                                  <motion.li
                                    key={recommendation.id}
                                    layout
                                    initial={{ height: 0, opacity: 0, y: -8 }}
                                    animate={{
                                      height: "auto",
                                      opacity: 1,
                                      y: 0,
                                    }}
                                    exit={{ height: 0, opacity: 0, y: -8 }}
                                    transition={{
                                      duration: 0.2,
                                      ease: "easeInOut",
                                    }}
                                    className="flex items-start justify-between gap-x-3"
                                  >
                                    <span className="inline-flex flex-col">
                                      <span className="text-xs font-light text-dark-blue-400">
                                        {recommendation.title.replace(
                                          /\b\w/g,
                                          (char) => char.toUpperCase()
                                        )}
                                      </span>
                                      <Button
                                        className="group h-auto justify-start px-0 font-light text-[10px] leading-[14px] text-primary-500"
                                        variant="link"
                                        onClick={() =>
                                          toggleAddOn(recommendation.id, false)
                                        }
                                      >
                                        <span className="underline decoration-primary-500/30 transition-[text-decoration-color,color] duration-300 group-hover:decoration-primary-500">
                                          Remove
                                        </span>
                                      </Button>
                                    </span>
                                    <span className="inline-flex flex-col items-end">
                                      <span className="text-xs text-dark-blue-400">
                                        Est. $85/hr
                                      </span>
                                      <span className="text-[10px] leading-[14px] text-dark-blue-400">
                                        {recommendation.weeklyHours}
                                      </span>
                                    </span>
                                  </motion.li>
                                ))}
                              </AnimatePresence>
                              <li className="flex items-center justify-between">
                                <span className="text-xs font-light text-dark-blue-400">
                                  Estimated Weekly Total
                                </span>
                                <span className="text-base font-bold leading-none text-dark-blue-400">
                                  ${addOnsWeeklyTotal.toLocaleString()}/wk
                                </span>
                              </li>
                            </ul>
                          </div>
                        </motion.div>
                      ) : null}
                    </AnimatePresence>

                    <div className="pt-4 mt-4 border-t border-gray-200">
                      <h1 className="text-base leading-none font-semibold text-dark-blue-400">
                        Payment Plan
                      </h1>

                      <div className="mt-4">
                        <Listbox
                          className="mt-4"
                          value={selectedTalentPaymentPlan}
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
                                    key={option.id}
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
                    </div>

                    <ul className="pt-4 mt-4 space-y-2 border-t border-gray-200">
                      <li className="flex items-center justify-between">
                        <span className="text-base font-bold leading-none text-dark-blue-400">
                          Due today
                        </span>
                        <span className="text-base font-bold leading-none text-dark-blue-400">
                          {selectedTalentPaymentPlan?.value ||
                            formattedDueTodayTotal}
                        </span>
                      </li>
                    </ul>
                  </>
                ) : (
                  <>
                    <ul className="pt-4 mt-4 space-y-2 border-t border-gray-200">
                      <li className="flex items-center justify-between">
                        <span className="text-xs font-light text-dark-blue-400">
                          Project cost
                        </span>
                        <span className="text-xs text-dark-blue-400">
                          $94,000
                        </span>
                      </li>
                      <li className="flex items-center justify-between">
                        <span className="text-xs font-light text-dark-blue-400">
                          Project cost
                        </span>
                        <span className="text-xs text-dark-blue-400">
                          $0.00
                        </span>
                      </li>
                    </ul>

                    <ul className="pt-4 mt-4 space-y-2 border-t border-gray-200">
                      <li className="flex items-center justify-between">
                        <span className="text-xs font-light text-dark-blue-400">
                          Project cost
                        </span>
                        <span className="text-base font-bold leading-none text-dark-blue-400">
                          $94,000
                        </span>
                      </li>
                    </ul>
                  </>
                )}

                <div className="mt-[21.33px]">
                  <Button
                    className="w-full"
                    size="md"
                    onClick={() => {
                      if (isTalentCheckout) {
                        const nextSearchParams = new URLSearchParams(
                          searchParams.toString()
                        )
                        nextSearchParams.set("rate", selectedRateValue)
                        nextSearchParams.set("schedule", selectedSchedule)
                        nextSearchParams.set("duration", selectedDuration)
                        nextSearchParams.set(
                          "paymentPlan",
                          selectedTalentPaymentPlanId
                        )
                        router.push(
                          `${basePath}/${safeSlugSegment}/payment?${nextSearchParams.toString()}`
                        )
                        return
                      }
                      router.push(`${basePath}/${safeSlugSegment}/payment`)
                    }}
                  >
                    {isTalentCheckout
                      ? "Proceed to Payment"
                      : "Proceed to Payment"}
                  </Button>
                </div>

                {isTalentCheckout ? (
                  <div className="mt-[21.33px] flex items-center justify-center">
                    <span className="inline-block text-center font-light text-[10px] leading-[14px]">
                      Learn More about{" "}
                      <Button
                        className="font-medium underline text-[10px] leading-[14px]"
                        variant="link"
                      >
                        Estimated Taxes
                      </Button>
                    </span>
                  </div>
                ) : null}

                <div className="mt-[21.33px]">
                  <span className="inline-block text-center font-light text-[10px] leading-[14px]">
                    By clicking the above, you agree to Marketeq&apos;s{" "}
                    <Button
                      className="font-medium underline text-[10px] leading-[14px]"
                      variant="link"
                    >
                      Terms of Use
                    </Button>
                    and{" "}
                    <Button
                      className="font-medium underline text-[10px] leading-[14px]"
                      variant="link"
                    >
                      Privacy Policy
                    </Button>
                  </span>
                </div>

                <div className="mt-[21.33px] flex items-center justify-center">
                  <Button variant="link" visual="gray">
                    Add Gift Card / Promo Code
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      {isTalentCheckout ? (
        <OfferDialog
          open={isEditOfferOpen}
          onOpenChange={setIsEditOfferOpen}
          mode="edit"
          onSaveOffer={({ selectedRate, schedule, selectedDuration }) => {
            setSelectedRateValue(selectedRate)
            setSelectedSchedule(schedule)
            setSelectedDuration(selectedDuration)
            updateOfferInUrl(selectedRate, schedule, selectedDuration)
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
