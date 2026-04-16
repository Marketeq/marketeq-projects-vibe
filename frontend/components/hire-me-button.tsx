"use client"

import * as React from "react"
import type { UserProfile } from "@/types/user"
import { ArrowRight, ChevronLeft, MapPin, Plus, SearchMd, X } from "@blend-metrics/icons"
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
  IconButton,
  Input,
  RadioGroup,
  RadioGroupItemSelector,
  SearchField,
  SearchFieldButton,
  SearchFieldInput,
  Textarea,
} from "@/components/ui"

const getDefaultJobTitle = (profile?: UserProfile | null) => {
  const jobTitles = (profile as any)?.jobTitles
  return (
    jobTitles?.find((job: any) => job.isDefault)?.jobTitle ||
    jobTitles?.[0]?.jobTitle ||
    profile?.role ||
    "Full Stack Developer"
  )
}

const getExperienceLabel = (profile?: UserProfile | null) => {
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
  profile?: UserProfile | null
  buttonProps?: React.ComponentPropsWithoutRef<typeof Button>
}

const MAX_VISIBLE_CONTRACTS = 5

const existingContracts = [
  {
    id: "contract-1",
    title: "React Native Mobile App",
    subtitle: "Design Phase",
    avatars: ["/man.jpg", "/woman.jpg", "/tutorial-thumbnails/image-2.png", "/tutorial-thumbnails/image-3.png"],
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
    avatars: ["/man.jpg", "/tutorial-thumbnails/image-3.png", "/tutorial-thumbnails/image-2.png", "/woman.jpg"],
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
    avatars: ["/man.jpg", "/woman.jpg", "/tutorial-thumbnails/image-2.png", "/tutorial-thumbnails/image-3.png"],
  },
  {
    id: "contract-6",
    title: "React Native Mobile App",
    subtitle: "Design Phase",
    avatars: ["/woman.jpg", "/tutorial-thumbnails/image-2.png", "/tutorial-thumbnails/image-3.png"],
  },
]

const rates = [
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

export function HireMeButton({ profile, buttonProps }: HireMeButtonProps) {
  const [schedule, setSchedule] = React.useState("")
  const [search, setSearch] = React.useState("")
  const [showAllContracts, setShowAllContracts] = React.useState(false)
  const [selectedContractId, setSelectedContractId] = React.useState<string | null>(null)
  const [creatingContract, setCreatingContract] = React.useState(false)
  const [selectedRate, setSelectedRate] = React.useState("web-development")
  const [selectedDuration, setSelectedDuration] = React.useState("Ongoing")
  const [contractTitle, setContractTitle] = React.useState("")
  const [message, setMessage] = React.useState("")

  const displayName =
    profile?.username ||
    `${profile?.firstName || ""}${profile?.lastName || ""}`.trim() ||
    "CodZen21"
  const jobTitle = getDefaultJobTitle(profile)
  const experienceLabel = getExperienceLabel(profile)
  const locationLabel = profile?.location || "Jersey City, NJ, United States"
  const filteredContracts = existingContracts.filter((contract) =>
    contract.title.toLowerCase().includes(search.toLowerCase()),
  )
  const visibleContracts =
    search || showAllContracts
      ? filteredContracts
      : filteredContracts.slice(0, MAX_VISIBLE_CONTRACTS)
  const selectedContract =
    existingContracts.find((contract) => contract.id === selectedContractId) || null
  const isStepTwo = Boolean(schedule) && !selectedContract && !creatingContract
  const isStepThree = Boolean(schedule) && Boolean(selectedContract)
  const isStepFour = Boolean(schedule) && creatingContract

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button size="md" {...buttonProps}>
          <Plus className="size-[15px]" />
          Hire Me
        </Button>
      </DialogTrigger>

      <DialogContent
        accessibilityTitle="Hire Me"
        className="flex max-h-[calc(100vh-24px)] max-w-[520px] flex-col overflow-hidden rounded-[12px] p-0 shadow-[0px_32px_64px_-12px_rgba(16,24,40,.2)]"
      >
          <div className="shrink-0 flex h-[52px] items-center justify-between border-b border-gray-200 px-3 py-2 pl-3">
            {isStepThree || isStepFour ? (
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
              <IconButton variant="ghost" visual="gray" size="md">
                <X className="size-5" />
              </IconButton>
            </DialogClose>
          </div>

          <div className="overflow-y-auto px-6 pb-6 pt-5">
            <div className="flex items-center gap-4">
              <Avatar className="size-[90px] shrink-0">
                <AvatarImage
                  src={profile?.avatarUrl || "/woman.jpg"}
                  alt={displayName}
                />
                <AvatarFallback>{displayName.charAt(0)}</AvatarFallback>
              </Avatar>

              <div className="min-w-0">
                <p className="text-[14px] font-light leading-normal text-dark-blue-400">
                  Hire <span className="font-semibold">{displayName}</span> for a new contract
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

            {isStepTwo ? (
              <div className="mt-7">
                <h2 className="text-[14px] font-semibold leading-normal text-dark-blue-400">
                  Select From Existing Contracts
                </h2>

                <SearchField className="mt-4 w-full">
                  <SearchFieldInput
                    className="pr-[46px]"
                    size="md"
                    placeholder="Search contracts"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                  />
                  <SearchFieldButton size="md">
                    <SearchMd className="size-4 text-gray-400" />
                  </SearchFieldButton>
                </SearchField>

                <div className="mt-3 space-y-2">
                  {visibleContracts.map((contract) => (
                    <button
                      key={contract.id}
                      type="button"
                      className="flex w-full items-center justify-between rounded-[8px] border border-gray-200 bg-white px-4 py-3 text-left"
                      onClick={() => setSelectedContractId(contract.id)}
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
                        <AvatarGroup max={5} size="sm" excess>
                          {contract.avatars.map((avatar, index) => (
                            <Avatar
                              key={`${contract.id}-${index}`}
                              className="size-8 border-2 border-white"
                            >
                              <AvatarImage src={avatar} alt={`Member ${index + 1}`} />
                              <AvatarFallback>{index + 1}</AvatarFallback>
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

                {!search && filteredContracts.length > MAX_VISIBLE_CONTRACTS ? (
                  <Button
                    variant="link"
                    visual="gray"
                    className="mt-3 px-0 text-[12px] font-medium leading-normal text-primary-500"
                    onClick={() => setShowAllContracts((current) => !current)}
                  >
                    {showAllContracts ? "Show fewer contracts" : "View all contracts"}
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
              <div className="mt-5">
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
                    <AvatarGroup max={5} size="sm" excess>
                      {selectedContract?.avatars.map((avatar, index) => (
                        <Avatar key={`${selectedContract?.id}-${index}`} className="size-8 border-2 border-white">
                          <AvatarImage src={avatar} alt={`Member ${index + 1}`} />
                          <AvatarFallback>{index + 1}</AvatarFallback>
                        </Avatar>
                      ))}
                    </AvatarGroup>
                    {selectedContract?.extra ? (
                      <span className="inline-flex size-6 items-center justify-center rounded-full border border-gray-300 text-[10px] font-medium leading-none text-gray-500">
                        {selectedContract.extra}
                      </span>
                    ) : null}
                  </span>
                </button>

                <Button
                  variant="link"
                  visual="gray"
                  className="ml-auto mt-3 flex px-0 text-[12px] font-medium leading-normal text-dark-blue-400"
                  onClick={() => setSelectedContractId(null)}
                >
                  Change Contract
                </Button>
              </div>
            ) : null}

            {isStepFour ? (
              <div className="mt-5">
                <h2 className="text-[14px] font-semibold leading-normal text-dark-blue-400">
                  Contract Title
                </h2>
                <Input
                  className="mt-3"
                  placeholder="Enter your contract title"
                  value={contractTitle}
                  onChange={(event) => setContractTitle(event.target.value)}
                />
              </div>
            ) : null}

            {(isStepThree || isStepFour) ? (
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
                    {rates.map((rate) => (
                      <RadioGroupItemSelector
                        key={rate.value}
                        value={rate.value}
                        size="lg"
                        className="min-h-[52px] justify-between rounded-[8px] px-4 py-3 hover:ring-0 focus:ring-0 data-[state=checked]:border-[2px] data-[state=checked]:ring-0 data-[state=checked]:hover:ring-0"
                      >
                        <span className="flex min-w-0 flex-1 items-center justify-between gap-3">
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
                </div>
              </>
            ) : null}

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

            {isStepThree ? (
              <div className="mt-7">
                <h2 className="text-[14px] font-semibold leading-normal text-dark-blue-400">
                  Confirm Start Date
                </h2>
                <p className="mt-3 text-[13px] font-light leading-normal text-gray-500">
                  Based on the project scope, the anticipated start date is
                  <br />
                  <span className="font-semibold text-dark-blue-400">
                    Monday, Jan 30, 2025
                  </span>
                </p>
                <div className="mt-4 grid grid-cols-2 gap-3">
                  <Button variant="outlined" visual="gray">
                    Confirm Start Date
                  </Button>
                  <Button variant="outlined" visual="gray">
                    Change Date
                  </Button>
                </div>
              </div>
            ) : null}

            {(isStepThree || isStepFour) ? (
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
                <Button className="mt-4 w-full" disabled={!schedule}>
                  Send Offer
                </Button>
              </div>
            ) : null}
          </div>
      </DialogContent>
    </Dialog>
  )
}
