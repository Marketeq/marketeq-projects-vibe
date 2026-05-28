"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { cn } from "@/utils/functions"
import {
  ArrowRight,
  ChevronLeft,
  MapPin,
  Plus,
  SearchMd,
  X,
} from "@blend-metrics/icons"
import { AnimatePresence, motion } from "framer-motion"
import type { UserProfile } from "@/types/user"
import NextImage from "@/components/next-image"
import {
  Avatar,
  AvatarFallback,
  AvatarGroup,
  AvatarImage,
  Button,
  Dialog,
  DialogClose,
  DialogContent,
  DialogTitle,
  DialogTrigger,
  ErrorMessage,
  IconButton,
  Input,
  RadioGroup,
  RadioGroupItemSelector,
  SearchField,
  SearchFieldButton,
  SearchFieldInput,
  Textarea,
} from "@/components/ui"

export const getDefaultJobTitle = (profile?: Partial<UserProfile> | null) => {
  const jobTitles = (profile as any)?.jobTitles
  return (
    jobTitles?.find((job: any) => job.isDefault)?.jobTitle ||
    jobTitles?.[0]?.jobTitle ||
    profile?.role ||
    "Full Stack Developer"
  )
}

export const getExperienceLabel = (profile?: Partial<UserProfile> | null) => {
  const dates: Date[] = []
  const endDates: Date[] = []

  profile?.experience?.forEach((experience) => {
    if (experience.startDate) dates.push(new Date(experience.startDate))
    if (experience.endDate) endDates.push(new Date(experience.endDate))
    else endDates.push(new Date())
  })

  if (dates.length === 0) return "10 years of experience"

  const earliest = dates.reduce((a, b) => (a < b ? a : b))
  const latest = endDates.reduce((a, b) => (a > b ? a : b))
  const months =
    (latest.getFullYear() - earliest.getFullYear()) * 12 +
    (latest.getMonth() - earliest.getMonth())

  if (months < 12) {
    return `${Math.max(1, months)} month${months === 1 ? "" : "s"} of experience`
  }

  const years = Math.round(months / 12)
  return `${years} year${years === 1 ? "" : "s"} of experience`
}

type HireMeButtonProps = {
  profile?: Partial<UserProfile> | null
  buttonProps?: React.ComponentPropsWithoutRef<typeof Button>
}

type OfferDialogProps = {
  profile?: Partial<UserProfile> | null
  open: boolean
  onOpenChange: (open: boolean) => void
  trigger?: React.ReactNode
  mode?: "create" | "edit"
  onSaveOffer?: (offer: {
    selectedRate: string
    schedule: string
    selectedDuration: string
  }) => void
}

const MAX_VISIBLE_CONTRACTS = 5

const existingContracts = [
  {
    id: "contract-1",
    title: "React Native Mobile App",
    subtitle: "Design Phase",
    avatars: [
      "/man.jpg",
      "/woman.jpg",
      "/tutorial-thumbnails/image-2.png",
      "/tutorial-thumbnails/image-3.png",
    ],
    extra: "+5",
  },
  {
    id: "contract-2",
    title: "React Native Mobile App",
    subtitle: "Design Phase",
    avatars: ["/man.jpg", "/woman.jpg", "/tutorial-thumbnails/image-2.png"],
  },
  {
    id: "contract-3",
    title: "React Native Mobile App",
    subtitle: "Design Phase",
    avatars: [
      "/man.jpg",
      "/tutorial-thumbnails/image-3.png",
      "/tutorial-thumbnails/image-2.png",
      "/woman.jpg",
    ],
  },
  {
    id: "contract-4",
    title: "React Native Mobile App",
    subtitle: "Design Phase",
    avatars: ["/man.jpg", "/tutorial-thumbnails/image-3.png"],
  },
  {
    id: "contract-5",
    title: "React Native Mobile App",
    subtitle: "Design Phase",
    avatars: [
      "/man.jpg",
      "/woman.jpg",
      "/tutorial-thumbnails/image-2.png",
      "/tutorial-thumbnails/image-3.png",
    ],
  },
  {
    id: "contract-6",
    title: "React Native Mobile App",
    subtitle: "Design Phase",
    avatars: [
      "/woman.jpg",
      "/tutorial-thumbnails/image-2.png",
      "/tutorial-thumbnails/image-3.png",
    ],
  },
]

export const offerRates = [
  { value: "logo-design", label: "Logo Design", price: "$45/hr" },
  { value: "web-development", label: "Web Development", price: "$70/hr" },
  { value: "ux-ui-design", label: "UX/UI Design", price: "$85/hr" },
]

const durations = [
  "3 Months",
  "6 Months",
  "1 Year",
  "18 Months",
  "2 Years",
  "Ongoing",
]

const getInitialOfferState = (mode: "create" | "edit") => ({
  schedule: mode === "edit" ? "full-time" : "",
  search: "",
  showAllContracts: false,
  selectedContractId:
    mode === "edit" ? (existingContracts[0]?.id ?? null) : null,
  creatingContract: false,
  selectedRate: mode === "edit" ? "web-development" : "",
  selectedDuration: mode === "edit" ? "Ongoing" : "",
  selectedStartDateAction: mode === "edit" ? "confirm" : "",
  contractTitle: "",
  message: "",
  offerSent: false,
})

export function OfferDialog({
  profile,
  open,
  onOpenChange,
  trigger,
  mode = "create",
  onSaveOffer,
}: OfferDialogProps) {
  const router = useRouter()
  const initialState = React.useMemo(() => getInitialOfferState(mode), [mode])
  const [schedule, setSchedule] = React.useState(initialState.schedule)
  const [search, setSearch] = React.useState(initialState.search)
  const [showAllContracts, setShowAllContracts] = React.useState(
    initialState.showAllContracts
  )
  const [selectedContractId, setSelectedContractId] = React.useState<
    string | null
  >(initialState.selectedContractId)
  const [creatingContract, setCreatingContract] = React.useState(
    initialState.creatingContract
  )
  const [selectedRate, setSelectedRate] = React.useState(
    initialState.selectedRate
  )
  const [selectedDuration, setSelectedDuration] = React.useState(
    initialState.selectedDuration
  )
  const [selectedStartDateAction, setSelectedStartDateAction] = React.useState(
    initialState.selectedStartDateAction
  )
  const [contractTitle, setContractTitle] = React.useState(
    initialState.contractTitle
  )
  const [message, setMessage] = React.useState(initialState.message)
  const [offerSent, setOfferSent] = React.useState(initialState.offerSent)
  const [showValidationErrors, setShowValidationErrors] = React.useState(false)

  const displayName =
    profile?.username ||
    `${profile?.firstName || ""}${profile?.lastName || ""}`.trim() ||
    "CodZen21"
  const checkoutSlug = encodeURIComponent(profile?.username || displayName)
  const jobTitle = getDefaultJobTitle(profile)
  const experienceLabel = getExperienceLabel(profile)
  const locationLabel = profile?.location || "Jersey City, NJ, United States"
  const filteredContracts = existingContracts.filter((contract) =>
    contract.title.toLowerCase().includes(search.toLowerCase())
  )
  const visibleContracts =
    search || showAllContracts
      ? filteredContracts
      : filteredContracts.slice(0, MAX_VISIBLE_CONTRACTS)
  const selectedContract =
    existingContracts.find((contract) => contract.id === selectedContractId) ||
    null
  const isStepTwo = Boolean(schedule) && !selectedContract && !creatingContract
  const isStepThree = Boolean(schedule) && Boolean(selectedContract)
  const isStepFour = Boolean(schedule) && creatingContract
  const scheduleLabel = schedule === "part-time" ? "part-time" : "full-time"
  const isEditMode = mode === "edit"
  const currentScreen = offerSent
    ? "offer-sent"
    : isStepFour
      ? "create-contract"
      : isStepThree
        ? "offer-details"
        : isStepTwo
          ? "select-contract"
          : "select-schedule"
  const screenTransition = {
    duration: 0.26,
    ease: [0.22, 1, 0.36, 1] as const,
  }
  const dialogContentClass = isEditMode
    ? "!top-[100px] !-translate-y-0 max-h-[calc(100dvh-200px)]"
    : "max-h-[calc(100vh-24px)]"
  const dialogBodyClass = isEditMode
    ? "max-h-[calc(100dvh-200px)]"
    : "max-h-[calc(100vh-24px)]"
  const isOfferDetailsStep = isStepThree || isStepFour
  const isOfferReady = isStepThree
    ? Boolean(
        schedule &&
        selectedContractId &&
        selectedRate &&
        selectedDuration &&
        selectedStartDateAction
      )
    : isStepFour
      ? Boolean(
          schedule && contractTitle.trim() && selectedRate && selectedDuration
        )
      : false
  const contractTitleError =
    showValidationErrors && isStepFour && !contractTitle.trim()
      ? "Please enter a contract title."
      : null
  const selectedRateError =
    showValidationErrors && isOfferDetailsStep && !selectedRate
      ? "Please select a rate."
      : null
  const selectedDurationError =
    showValidationErrors && isOfferDetailsStep && !selectedDuration
      ? "Please select a contract duration."
      : null
  const selectedStartDateActionError =
    showValidationErrors && isStepThree && !selectedStartDateAction
      ? "Please confirm or change the start date."
      : null
  const staticAvatarClassName = "hover:ring-0 active:ring-0"
  const staticAvatarFallbackClassName = "hover:bg-primary-25"

  const resetFlow = React.useCallback(() => {
    setSchedule(initialState.schedule)
    setSearch(initialState.search)
    setShowAllContracts(initialState.showAllContracts)
    setSelectedContractId(initialState.selectedContractId)
    setCreatingContract(initialState.creatingContract)
    setSelectedRate(initialState.selectedRate)
    setSelectedDuration(initialState.selectedDuration)
    setSelectedStartDateAction(initialState.selectedStartDateAction)
    setContractTitle(initialState.contractTitle)
    setMessage(initialState.message)
    setOfferSent(initialState.offerSent)
    setShowValidationErrors(false)
  }, [initialState])

  React.useEffect(() => {
    if (open) resetFlow()
  }, [open, resetFlow])

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        onOpenChange(nextOpen)
        if (!nextOpen) resetFlow()
      }}
    >
      {trigger ? <DialogTrigger asChild>{trigger}</DialogTrigger> : null}

      <DialogContent
        accessibilityTitle="Hire Me"
        className={`flex ${dialogContentClass} max-w-[520px] flex-col overflow-hidden rounded-[12px] p-0 shadow-[0px_32px_64px_-12px_rgba(16,24,40,.2)]`}
      >
        <div
          className={`relative flex ${dialogBodyClass} flex-1 flex-col overflow-hidden`}
        >
          <div className="shrink-0 flex h-[52px] items-center justify-between border-b border-gray-200 px-3 py-2 pl-3">
            {isEditMode ? (
              <DialogTitle className="text-[16px] font-semibold leading-normal text-dark-blue-400">
                Edit Offer
              </DialogTitle>
            ) : isStepThree || isStepFour ? (
              <Button
                variant="link"
                visual="gray"
                className="px-0 text-[16px] font-medium leading-normal text-dark-blue-400"
                onClick={() => {
                  setSelectedContractId(null)
                  setCreatingContract(false)
                }}
              >
                <ChevronLeft className="size-4" />
                Back
              </Button>
            ) : (
              <DialogTitle className="text-[16px] font-semibold leading-normal text-dark-blue-400">
                Hire Me
              </DialogTitle>
            )}

            <DialogClose asChild>
              <IconButton variant="ghost" visual="gray" size="sm">
                <X className="size-5" />
              </IconButton>
            </DialogClose>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-6 pb-6 pt-5">
            <motion.div layout transition={screenTransition}>
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={`${mode}-${currentScreen}`}
                  layout
                  initial={{ opacity: 0, x: 18 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -18 }}
                  transition={screenTransition}
                  className="will-change-transform"
                >
                  {offerSent ? (
                    <div className="flex flex-col items-center pb-2 pt-2 text-center">
                      <div className="inline-flex items-center justify-center text-primary-500">
                        <NextImage
                          src="/hire-me-sent-02.svg"
                          alt="Offer sent"
                          width={67}
                          height={67}
                          className="size-[67px]"
                        />
                      </div>

                      <h2 className="mt-7 text-[16px] font-semibold leading-normal text-dark-blue-400">
                        Offer Sent!
                      </h2>

                      <p className="mt-6 text-[14px] font-light leading-normal text-dark-blue-400">
                        <span className="font-semibold">{displayName}</span> has
                        been invited to a {scheduleLabel} contract
                      </p>

                      <Avatar
                        className={cn(
                          "mt-8 size-[64px]",
                          staticAvatarClassName
                        )}
                      >
                        <AvatarImage
                          src={profile?.avatarUrl || "/woman.jpg"}
                          alt={displayName}
                        />
                        <AvatarFallback
                          className={staticAvatarFallbackClassName}
                        >
                          {displayName.charAt(0)}
                        </AvatarFallback>
                      </Avatar>

                      <span className="mt-3 inline-flex items-center rounded-full bg-gray-100 px-3 py-1 text-[12px] font-medium leading-normal text-gray-500">
                        Pending Invite
                      </span>

                      <h3 className="mt-8 text-[16px] font-semibold leading-normal text-dark-blue-400">
                        What would you like to do next?
                      </h3>

                      <div className="mt-5 flex w-full items-center justify-center gap-3">
                        <Button
                          variant="outlined"
                          visual="gray"
                          onClick={() => setOfferSent(false)}
                        >
                          Review Your Offer
                        </Button>
                        <Button
                          onClick={() => {
                            onOpenChange(false)
                            router.push("/find-jobs")
                          }}
                        >
                          Continue Browsing
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <>
                      {!isEditMode && currentScreen === "select-schedule" ? (
                        <div className="flex items-center gap-4">
                          <Avatar
                            className={cn(
                              "size-[90px] shrink-0",
                              staticAvatarClassName
                            )}
                          >
                            <AvatarImage
                              src={profile?.avatarUrl || "/woman.jpg"}
                              alt={displayName}
                            />
                            <AvatarFallback
                              className={staticAvatarFallbackClassName}
                            >
                              {displayName.charAt(0)}
                            </AvatarFallback>
                          </Avatar>

                          <div className="min-w-0">
                            <p className="text-[14px] font-light leading-normal text-dark-blue-400">
                              Hire{" "}
                              <span className="font-semibold">
                                {displayName}
                              </span>{" "}
                              for a new contract
                            </p>
                            <p className="text-[12px] font-medium leading-normal text-dark-blue-400">
                              {jobTitle}
                            </p>
                            <p className="mt-0.5 text-[11px] font-light leading-normal text-gray-500">
                              {experienceLabel}
                            </p>
                            <div className="mt-2 inline-flex items-center gap-1.5 text-[10px] font-light leading-normal text-gray-500">
                              <MapPin className="size-3.5 text-dark-blue-400" />
                              <span>{locationLabel}</span>
                            </div>
                          </div>
                        </div>
                      ) : null}

                      {isStepTwo ? (
                        <div>
                          <h2 className="text-[14px] font-semibold leading-normal text-dark-blue-400">
                            Select From Existing Contracts
                          </h2>

                          <SearchField className="mt-4 w-full">
                            <SearchFieldInput
                              className="pr-[46px]"
                              size="lg"
                              placeholder="Search contracts"
                              value={search}
                              onChange={(event) =>
                                setSearch(event.target.value)
                              }
                            />
                            <SearchFieldButton size="lg">
                              <SearchMd className="size-4 text-gray-400" />
                            </SearchFieldButton>
                          </SearchField>

                          <div className="mt-3 space-y-2">
                            {visibleContracts.map((contract) => (
                              <button
                                key={contract.id}
                                type="button"
                                className="flex w-full items-center justify-between rounded-[8px] border border-gray-200 bg-white px-4 py-3 text-left"
                                onClick={() =>
                                  setSelectedContractId(contract.id)
                                }
                              >
                                <span className="min-w-0">
                                  <span className="block truncate text-[13px] font-semibold leading-normal text-dark-blue-400">
                                    {contract.title}
                                  </span>
                                  <span className="block text-[12px] font-light leading-normal text-gray-500">
                                    {contract.subtitle}
                                  </span>
                                </span>

                                <span className="ml-4 flex items-center gap-3">
                                  <AvatarGroup
                                    className="cursor-default"
                                    max={5}
                                    size="sm"
                                    excess
                                  >
                                    {contract.avatars.map((avatar, index) => (
                                      <Avatar
                                        key={`${contract.id}-${index}`}
                                        className={cn(
                                          "size-8 border-2 border-white",
                                          staticAvatarClassName
                                        )}
                                      >
                                        <AvatarImage
                                          src={avatar}
                                          alt={`Member ${index + 1}`}
                                        />
                                        <AvatarFallback
                                          className={
                                            staticAvatarFallbackClassName
                                          }
                                        >
                                          {index + 1}
                                        </AvatarFallback>
                                      </Avatar>
                                    ))}
                                  </AvatarGroup>
                                  {contract.extra ? (
                                    <span className="inline-flex size-6 items-center justify-center rounded-full border border-gray-300 text-[10px] font-medium leading-none text-gray-500">
                                      {contract.extra}
                                    </span>
                                  ) : null}
                                  <ArrowRight className="size-4 text-gray-400" />
                                </span>
                              </button>
                            ))}
                          </div>

                          {!search &&
                          filteredContracts.length > MAX_VISIBLE_CONTRACTS ? (
                            <Button
                              variant="link"
                              visual="gray"
                              className="mt-3 px-0 text-[12px] font-medium leading-normal text-primary-500"
                              onClick={() =>
                                setShowAllContracts((current) => !current)
                              }
                            >
                              {showAllContracts
                                ? "Show fewer contracts"
                                : "View all contracts"}
                            </Button>
                          ) : null}

                          <Button
                            variant="link"
                            visual="gray"
                            className="mx-auto mt-4 flex px-0 text-[14px] font-medium leading-normal text-dark-blue-400"
                            onClick={() => setCreatingContract(true)}
                          >
                            <Plus className="size-4" />
                            Invite me to a new contract
                          </Button>

                          <div className="mt-5 flex items-center gap-4">
                            <span className="h-px flex-1 bg-gray-200" />
                            <span className="text-[14px] font-light leading-normal text-gray-500">
                              Or
                            </span>
                            <span className="h-px flex-1 bg-gray-200" />
                          </div>
                        </div>
                      ) : null}

                      {isStepThree ? (
                        <div>
                          <button
                            type="button"
                            className="flex w-full items-center justify-between rounded-[8px] border-2 border-primary-500 bg-white px-4 py-3 text-left"
                          >
                            <span className="min-w-0">
                              <span className="block truncate text-[13px] font-semibold leading-normal text-dark-blue-400">
                                {selectedContract?.title}
                              </span>
                              <span className="block text-[12px] font-light leading-normal text-gray-500">
                                {selectedContract?.subtitle}
                              </span>
                            </span>

                            <span className="ml-4 flex items-center gap-3">
                              <AvatarGroup
                                className="cursor-default"
                                max={5}
                                size="sm"
                                excess
                              >
                                {selectedContract?.avatars.map(
                                  (avatar, index) => (
                                    <Avatar
                                      key={`${selectedContract?.id}-${index}`}
                                      className={cn(
                                        "size-8 border-2 border-white",
                                        staticAvatarClassName
                                      )}
                                    >
                                      <AvatarImage
                                        src={avatar}
                                        alt={`Member ${index + 1}`}
                                      />
                                      <AvatarFallback
                                        className={
                                          staticAvatarFallbackClassName
                                        }
                                      >
                                        {index + 1}
                                      </AvatarFallback>
                                    </Avatar>
                                  )
                                )}
                              </AvatarGroup>
                              {selectedContract?.extra ? (
                                <span className="inline-flex size-6 items-center justify-center rounded-full border border-gray-300 text-[10px] font-medium leading-none text-gray-500">
                                  {selectedContract.extra}
                                </span>
                              ) : null}
                            </span>
                          </button>

                          {!isEditMode ? (
                            <Button
                              variant="link"
                              visual="gray"
                              className="ml-auto mt-3 flex px-0 text-[12px] font-medium leading-normal text-dark-blue-400"
                              onClick={() => setSelectedContractId(null)}
                            >
                              Change Contract
                            </Button>
                          ) : null}
                        </div>
                      ) : null}

                      {isStepFour ? (
                        <div>
                          <h2 className="text-[14px] font-semibold leading-normal text-dark-blue-400">
                            Contract Title
                          </h2>
                          <Input
                            className="mt-3"
                            placeholder="Enter your contract title"
                            value={contractTitle}
                            onChange={(event) =>
                              setContractTitle(event.target.value)
                            }
                          />
                          {contractTitleError ? (
                            <ErrorMessage className="mt-2">
                              {contractTitleError}
                            </ErrorMessage>
                          ) : null}
                        </div>
                      ) : null}

                      {isStepThree || isStepFour ? (
                        <>
                          <div className="mt-7">
                            <h2 className="text-[14px] font-semibold leading-normal text-dark-blue-400">
                              Select Rate
                            </h2>

                            <RadioGroup
                              value={selectedRate}
                              onValueChange={setSelectedRate}
                              className="mt-4"
                            >
                              {offerRates.map((rate) => (
                                <RadioGroupItemSelector
                                  key={rate.value}
                                  value={rate.value}
                                  size="lg"
                                  className="min-h-[52px] justify-between rounded-[8px] px-4 py-3 hover:ring-0 focus:ring-0 data-[state=checked]:border-[2px] data-[state=checked]:ring-0 data-[state=checked]:hover:ring-0 [&>span:last-child]:min-w-0 [&>span:last-child]:flex-1"
                                >
                                  <span className="flex min-w-0 w-full items-center justify-between gap-3">
                                    <span className="min-w-0 text-[13px] font-semibold leading-normal text-dark-blue-400">
                                      {rate.label}
                                    </span>
                                    <span className="ml-auto shrink-0 text-[13px] font-semibold leading-normal text-dark-blue-400">
                                      {rate.price}
                                    </span>
                                  </span>
                                </RadioGroupItemSelector>
                              ))}
                            </RadioGroup>

                            <Button
                              variant="link"
                              visual="gray"
                              className="mt-3 ml-auto flex px-0 text-[12px] font-medium leading-normal text-dark-blue-400"
                            >
                              Custom Rate
                            </Button>
                            {selectedRateError ? (
                              <ErrorMessage className="mt-2">
                                {selectedRateError}
                              </ErrorMessage>
                            ) : null}
                          </div>

                          <div className="mt-7">
                            <h2 className="text-[14px] font-semibold leading-normal text-dark-blue-400">
                              Select Contract Duration
                            </h2>

                            <div className="mt-4 grid grid-cols-3 gap-3">
                              {durations.map((duration) => (
                                <Button
                                  key={duration}
                                  variant="outlined"
                                  visual="gray"
                                  className={
                                    duration === selectedDuration
                                      ? "border-2 border-primary-500 text-primary-500"
                                      : ""
                                  }
                                  onClick={() => setSelectedDuration(duration)}
                                >
                                  {duration}
                                </Button>
                              ))}
                            </div>

                            <Button
                              variant="link"
                              visual="gray"
                              className="mt-3 ml-auto flex px-0 text-[12px] font-medium leading-normal text-dark-blue-400"
                            >
                              Custom Duration
                            </Button>
                            {selectedDurationError ? (
                              <ErrorMessage className="mt-2">
                                {selectedDurationError}
                              </ErrorMessage>
                            ) : null}
                          </div>
                        </>
                      ) : null}

                      {currentScreen !== "select-contract" ? (
                        <div className="mt-7">
                          <h2 className="text-[14px] font-semibold leading-normal text-dark-blue-400">
                            Select Work Schedule
                          </h2>

                          <RadioGroup
                            value={schedule}
                            onValueChange={setSchedule}
                            className="mt-4 grid grid-cols-2 gap-3"
                          >
                            <RadioGroupItemSelector
                              value="part-time"
                              size="lg"
                              className="min-h-[62px] rounded-[8px] px-5 py-[15px] data-[state=checked]:border-[2px]"
                            >
                              <span className="block">
                                <span className="block text-[14px] font-semibold leading-normal text-dark-blue-400">
                                  Part Time
                                </span>
                                <span className="block text-[12px] font-medium leading-normal text-dark-blue-400">
                                  up to 30 hrs/week
                                </span>
                              </span>
                            </RadioGroupItemSelector>

                            <RadioGroupItemSelector
                              value="full-time"
                              size="lg"
                              className="min-h-[62px] rounded-[8px] px-5 py-[15px] data-[state=checked]:border-[2px]"
                            >
                              <span className="block">
                                <span className="block text-[14px] font-semibold leading-normal text-dark-blue-400">
                                  Full Time
                                </span>
                                <span className="block text-[12px] font-medium leading-normal text-dark-blue-400">
                                  over 30 hrs/week
                                </span>
                              </span>
                            </RadioGroupItemSelector>
                          </RadioGroup>

                          <Button
                            variant="link"
                            visual="gray"
                            className="mt-4 ml-auto flex px-0 text-[12px] font-medium leading-normal text-dark-blue-400"
                          >
                            Custom Work Schedule
                          </Button>
                        </div>
                      ) : null}

                      {isStepThree ? (
                        <div className="mt-7">
                          <h2 className="text-[14px] font-semibold leading-normal text-dark-blue-400">
                            Confirm Start Date
                          </h2>
                          <p className="mt-3 text-[13px] font-light leading-normal text-gray-500">
                            Based on the project scope, the anticipated start
                            date is
                            <br />
                            <span className="font-semibold text-dark-blue-400">
                              Monday, Jan 30, 2025
                            </span>
                          </p>
                          <div className="mt-4 grid grid-cols-2 gap-3">
                            <Button
                              variant="outlined"
                              visual="gray"
                              className={
                                selectedStartDateAction === "confirm"
                                  ? "border-2 border-primary-500 text-primary-500"
                                  : ""
                              }
                              onClick={() =>
                                setSelectedStartDateAction("confirm")
                              }
                            >
                              Confirm Start Date
                            </Button>
                            <Button
                              variant="outlined"
                              visual="gray"
                              className={
                                selectedStartDateAction === "change"
                                  ? "border-2 border-primary-500 text-primary-500"
                                  : ""
                              }
                              onClick={() =>
                                setSelectedStartDateAction("change")
                              }
                            >
                              Change Date
                            </Button>
                          </div>
                          {selectedStartDateActionError ? (
                            <ErrorMessage className="mt-2">
                              {selectedStartDateActionError}
                            </ErrorMessage>
                          ) : null}
                        </div>
                      ) : null}

                      {isOfferDetailsStep ? (
                        <div className="mt-7">
                          <div className="flex items-center justify-between gap-3">
                            <h2 className="text-[14px] font-semibold leading-normal text-dark-blue-400">
                              Add a Message
                            </h2>
                            <span className="text-[12px] font-light leading-normal text-gray-500">
                              Optional
                            </span>
                          </div>
                          <Textarea
                            className="mt-3 min-h-[110px]"
                            placeholder="Write your message"
                            value={message}
                            onChange={(event) => setMessage(event.target.value)}
                          />
                        </div>
                      ) : null}
                    </>
                  )}
                </motion.div>
              </AnimatePresence>
            </motion.div>
          </div>
          {isOfferDetailsStep ? (
            <div className="shrink-0 border-t border-gray-200 bg-white px-6 py-4">
              <Button
                className={cn(
                  "w-full",
                  !isOfferReady && "cursor-not-allowed opacity-50"
                )}
                aria-disabled={!isOfferReady}
                onClick={() => {
                  if (!isOfferReady) {
                    setShowValidationErrors(true)
                    return
                  }

                  setShowValidationErrors(false)
                  onSaveOffer?.({ selectedRate, schedule, selectedDuration })
                  onOpenChange(false)
                  if (!isEditMode) {
                    const nextSearchParams = new URLSearchParams()
                    nextSearchParams.set("rate", selectedRate)
                    nextSearchParams.set("schedule", schedule)
                    nextSearchParams.set("duration", selectedDuration)
                    router.push(
                      `/talent-checkout/${checkoutSlug}?${nextSearchParams.toString()}`
                    )
                  }
                }}
              >
                {isEditMode ? "Save Offer" : "Send Offer"}
              </Button>
            </div>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  )
}

export function HireMeButton({ profile, buttonProps }: HireMeButtonProps) {
  const [open, setOpen] = React.useState(false)

  return (
    <OfferDialog
      profile={profile}
      open={open}
      onOpenChange={setOpen}
      mode="create"
      trigger={
        <Button {...buttonProps}>
          <Plus className="size-[15px]" />
          Hire Me
        </Button>
      }
    />
  )
}
