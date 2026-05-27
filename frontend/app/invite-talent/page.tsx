"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import {
  Check,
  ChevronDown,
  FilterLines,
  HelpCircle,
  Send01,
  X,
} from "@blend-metrics/icons"
import StepIndicator from "@/components/ui/step-indicator/step-indicator"
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  Badge,
  Button,
  Card,
  Checkbox,
  CircularProgress,
  HeadlessRadioGroupItem,
  IconButton,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Progress,
  RadioGroup,
  ScrollArea,
  SearchField,
  SearchFieldButton,
  SearchFieldInput,
  Switch,
} from "@/components/ui"

const candidates = [
  {
    id: "dheeraj-1",
    name: "Dheeraj",
    handle: "@dheerajnagdali",
    title: "Full Stack Developer",
    experience: "10 years of experience",
    location: "USA",
    level: "Senior",
    hourlyRate: "$85",
    skillsMatch: "12 matching skills",
    availability: "Available 40 hrs/week",
    avatar: "/man.jpg",
    skills: [
      "Visual Design",
      "Tailwind CSS",
      "Next.js",
      "Blockchain",
      "Blockchain",
      "Blockchain",
    ],
  },
  {
    id: "dheeraj-2",
    name: "Dheeraj",
    handle: "@dheerajnagdali",
    title: "Full Stack Developer",
    experience: "10 years of experience",
    location: "USA",
    level: "Senior",
    hourlyRate: "$85",
    skillsMatch: "12 matching skills",
    availability: "Available 40 hrs/week",
    avatar: "/man.jpg",
    skills: [
      "Visual Design",
      "Tailwind CSS",
      "Next.js",
      "Blockchain",
      "Blockchain",
      "Blockchain",
    ],
  },
  {
    id: "dheeraj-3",
    name: "Dheeraj",
    handle: "@dheerajnagdali",
    title: "Full Stack Developer",
    experience: "10 years of experience",
    location: "USA",
    level: "Senior",
    hourlyRate: "$85",
    skillsMatch: "12 matching skills",
    availability: "Available 40 hrs/week",
    avatar: "/man.jpg",
    skills: [
      "Visual Design",
      "Tailwind CSS",
      "Next.js",
      "Blockchain",
      "Blockchain",
      "Blockchain",
    ],
  },
  {
    id: "dheeraj-4",
    name: "Dheeraj",
    handle: "@dheerajnagdali",
    title: "Full Stack Developer",
    experience: "10 years of experience",
    location: "USA",
    level: "Senior",
    hourlyRate: "$85",
    skillsMatch: "12 matching skills",
    availability: "Available 40 hrs/week",
    avatar: "/man.jpg",
    skills: [
      "Visual Design",
      "Tailwind CSS",
      "Next.js",
      "Blockchain",
      "Blockchain",
      "Blockchain",
    ],
  },
]

const teamRoles = [
  {
    id: "product-designer",
    label: "Product Designer",
    state: "Unfiltered",
    completed: true,
  },
  {
    id: "full-stack-developer",
    label: "Full-stack Developer",
    state: "Unfiltered",
    completed: true,
  },
  {
    id: "qa-engineer",
    label: "Q/A Engineer",
    state: "Unfiltered",
    completed: false,
  },
]

const locationOptions = [
  "Austria",
  "Arab Emirates",
  "Afghanistan",
  "Algeria",
  "Australia",
]

const experienceOptions = [
  "Student (0 - 2 years)",
  "Junior (2 - 3 years)",
  "Medior (3 - 5 years)",
  "Senior (5 - 10 years)",
  "Guru (10+ years)",
]

const workScheduleOptions = ["Full-time", "Part-time", "Custom"]

const rateOptions = [
  "Up to $20/hr",
  "$20–30/hr",
  "$30–50/hr",
  "$30–50/hr",
  "$50–70/hr",
]

export default function InviteTalentPage() {
  const router = useRouter()
  const [showFilters, setShowFilters] = useState(true)
  const [roleFilter, setRoleFilter] = useState("Product Designer")
  const [isRoleOpen, setIsRoleOpen] = useState(false)
  const [isLocationOpen, setIsLocationOpen] = useState(false)
  const [isExperienceOpen, setIsExperienceOpen] = useState(false)
  const [isScheduleOpen, setIsScheduleOpen] = useState(false)
  const [isRateOpen, setIsRateOpen] = useState(false)
  const [locationSearch, setLocationSearch] = useState("")
  const [selectedLocations, setSelectedLocations] = useState<string[]>([])
  const [selectedExperiences, setSelectedExperiences] = useState<string[]>([])
  const [selectedSchedules, setSelectedSchedules] = useState<string[]>([])
  const [selectedRate, setSelectedRate] = useState("")
  const [rankedCandidates] = useState(() => {
    // Randomize match once per page load, then sort highest -> lowest.
    const randomized = candidates.map((candidate) => ({
      ...candidate,
      match: Math.floor(Math.random() * (98 - 62 + 1)) + 62, // 62..98
    }))
    randomized.sort((a, b) => b.match - a.match)
    return randomized
  })

  const filteredRoleCount = useMemo(
    () => teamRoles.filter((role) => role.completed).length,
    []
  )
  const filteredLocations = useMemo(
    () =>
      locationOptions.filter((option) =>
        option.toLowerCase().includes(locationSearch.toLowerCase())
      ),
    [locationSearch]
  )

  const toggleMultiValue = (
    value: string,
    current: string[],
    setter: React.Dispatch<React.SetStateAction<string[]>>
  ) => {
    setter((prev) =>
      prev.includes(value)
        ? prev.filter((item) => item !== value)
        : [...prev, value]
    )
  }

  return (
    <div className="h-screen bg-gray-25">
      <div className="flex h-screen flex-col bg-gray-25">
        <div className="shrink-0 border-b border-gray-200 bg-white">
          <div className="flex w-full items-start justify-between pl-[32px] pr-[17px] py-[15px]">
            <div>
              <h1 className="text-[24px] font-bold leading-none text-dark-blue-400">
                Invite Talent
              </h1>
              <p className="mt-3 text-[14px] font-light leading-normal text-gray-500">
                Send up to 30 invites to fill your open roles. The more invites
                you send out now, the faster you can start your project.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <IconButton variant="outlined" visual="gray" size="md">
                <HelpCircle className="size-[18px]" />
              </IconButton>
              <IconButton
                variant="ghost"
                visual="gray"
                size="md"
                onClick={() => router.back()}
              >
                <X className="size-[18px]" />
              </IconButton>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="w-full px-[75px] py-[50px]">
            <div className="flex items-center justify-between gap-4 border-b border-gray-200 pb-6">
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[14px] leading-normal">
                <span className="font-medium text-dark-blue-400">
                  We found 30 available profiles that match your project
                  requirements
                </span>
                <button
                  type="button"
                  className="font-semibold text-primary-500 hover:underline"
                >
                  How it works?
                </button>
              </div>

              <Button
                variant="outlined"
                visual="gray"
                size="md"
                className="shrink-0"
                onClick={() => setShowFilters((current) => !current)}
              >
                <FilterLines className="size-4" />
                {showFilters ? "Hide Filters" : "Show Filters"}
              </Button>
            </div>

            <div className="mt-4 grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px] xl:gap-10">
              <div className="min-w-0">
                {showFilters ? (
                  <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
                    <div className="flex flex-wrap items-center gap-3">
                      <div className="inline-flex items-center gap-2 rounded-[8px] bg-gray-100 px-3 py-2">
                        <span className="text-[14px] font-medium leading-normal text-dark-blue-400">
                          Selected Role:
                        </span>
                        <Popover open={isRoleOpen} onOpenChange={setIsRoleOpen}>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outlined"
                              visual="gray"
                              size="sm"
                              className="h-7 rounded-[6px] border-gray-200 bg-gray-100 px-[5px] py-[6px]"
                            >
                              {roleFilter}
                              <ChevronDown className="ml-[6px] size-4" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="isolate z-[100] w-[180px] rounded-[8px] border-gray-200 bg-white p-2 shadow-[0px_12px_16px_-4px_rgba(16,24,40,.08)]">
                            <div className="space-y-1">
                              {[
                                "Product Designer",
                                "Full Stack Developer",
                                "Backend Engineer",
                              ].map((role) => (
                                <button
                                  key={role}
                                  type="button"
                                  className="flex w-full rounded-[6px] px-2 py-2 text-left text-[14px] font-medium text-dark-blue-400 hover:bg-gray-50"
                                  onClick={() => {
                                    setRoleFilter(role)
                                    setIsRoleOpen(false)
                                  }}
                                >
                                  {role}
                                </button>
                              ))}
                            </div>
                          </PopoverContent>
                        </Popover>
                      </div>

                      <Popover
                        open={isLocationOpen}
                        onOpenChange={setIsLocationOpen}
                      >
                        <PopoverTrigger asChild>
                          <Button
                            variant="outlined"
                            visual="gray"
                            size="sm"
                            className="h-9 rounded-[6px] border-gray-200 bg-white px-[14px] py-[8px]"
                          >
                            Location
                            <ChevronDown className="ml-2 size-4" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="isolate z-[100] w-[240px] rounded-[8px] border-gray-200 bg-white p-0 shadow-[0px_24px_48px_-12px_rgba(16,24,40,.18)]">
                          <div className="border-b border-gray-200 p-3">
                            <SearchField className="w-full">
                              <SearchFieldInput
                                className="pr-[42px]"
                                placeholder="Search"
                                value={locationSearch}
                                onChange={(event) =>
                                  setLocationSearch(event.target.value)
                                }
                              />
                              <SearchFieldButton>
                                <FilterLines className="size-4 text-gray-400" />
                              </SearchFieldButton>
                            </SearchField>
                          </div>
                          <ScrollArea className="h-[220px] px-3 py-2">
                            <div className="space-y-1">
                              {filteredLocations.map((option) => (
                                <label
                                  key={option}
                                  className="flex items-center gap-3 rounded-[6px] py-2"
                                >
                                  <Checkbox
                                    checked={selectedLocations.includes(option)}
                                    onCheckedChange={() => {
                                      toggleMultiValue(
                                        option,
                                        selectedLocations,
                                        setSelectedLocations
                                      )
                                      setIsLocationOpen(false)
                                    }}
                                  />
                                  <span className="text-[14px] font-medium text-gray-500">
                                    {option}
                                  </span>
                                </label>
                              ))}
                            </div>
                          </ScrollArea>
                          <div className="flex items-center justify-between border-t border-gray-200 p-3">
                            <Button
                              variant="link"
                              visual="gray"
                              className="px-0 text-[14px] font-semibold text-gray-500"
                              onClick={() => setSelectedLocations([])}
                            >
                              Clear
                            </Button>
                            <Button
                              size="sm"
                              disabled={selectedLocations.length === 0}
                              onClick={() => setIsLocationOpen(false)}
                            >
                              Apply
                            </Button>
                          </div>
                        </PopoverContent>
                      </Popover>

                      <Popover
                        open={isExperienceOpen}
                        onOpenChange={setIsExperienceOpen}
                      >
                        <PopoverTrigger asChild>
                          <Button
                            variant="outlined"
                            visual="gray"
                            size="sm"
                            className="h-9 rounded-[6px] border-gray-200 bg-white px-[14px] py-[8px]"
                          >
                            Experience
                            <ChevronDown className="ml-2 size-4" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="isolate z-[100] w-[278px] rounded-[8px] border-gray-200 bg-white p-0 shadow-[0px_24px_48px_-12px_rgba(16,24,40,.18)]">
                          <div className="px-3 py-2">
                            {experienceOptions.map((option) => (
                              <label
                                key={option}
                                className="flex items-center gap-3 rounded-[6px] py-3"
                              >
                                <Checkbox
                                  checked={selectedExperiences.includes(option)}
                                  onCheckedChange={() => {
                                    toggleMultiValue(
                                      option,
                                      selectedExperiences,
                                      setSelectedExperiences
                                    )
                                    setIsExperienceOpen(false)
                                  }}
                                />
                                <span className="text-[14px] font-medium text-gray-500">
                                  {option}
                                </span>
                              </label>
                            ))}
                          </div>
                          <div className="flex items-center justify-between border-t border-gray-200 p-3">
                            <Button
                              variant="link"
                              visual="gray"
                              className="px-0 text-[14px] font-semibold text-gray-500"
                              onClick={() => setSelectedExperiences([])}
                            >
                              Clear
                            </Button>
                            <Button
                              size="sm"
                              disabled={selectedExperiences.length === 0}
                              onClick={() => setIsExperienceOpen(false)}
                            >
                              Apply
                            </Button>
                          </div>
                        </PopoverContent>
                      </Popover>

                      <Popover
                        open={isScheduleOpen}
                        onOpenChange={setIsScheduleOpen}
                      >
                        <PopoverTrigger asChild>
                          <Button
                            variant="outlined"
                            visual="gray"
                            size="sm"
                            className="h-9 rounded-[6px] border-gray-200 bg-white px-[14px] py-[8px]"
                          >
                            Work Schedule
                            <ChevronDown className="ml-2 size-4" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="isolate z-[100] w-[240px] rounded-[8px] border-gray-200 bg-white p-0 shadow-[0px_24px_48px_-12px_rgba(16,24,40,.18)]">
                          <div className="px-3 py-2">
                            {workScheduleOptions.map((option) => (
                              <label
                                key={option}
                                className="flex items-center gap-3 rounded-[6px] py-3"
                              >
                                <Checkbox
                                  checked={selectedSchedules.includes(option)}
                                  onCheckedChange={() => {
                                    toggleMultiValue(
                                      option,
                                      selectedSchedules,
                                      setSelectedSchedules
                                    )
                                    setIsScheduleOpen(false)
                                  }}
                                />
                                <span className="text-[14px] font-medium text-gray-500">
                                  {option}
                                </span>
                              </label>
                            ))}
                          </div>
                          <div className="flex items-center justify-between border-t border-gray-200 p-3">
                            <Button
                              variant="link"
                              visual="gray"
                              className="px-0 text-[14px] font-semibold text-gray-500"
                              onClick={() => setSelectedSchedules([])}
                            >
                              Clear
                            </Button>
                            <Button
                              size="sm"
                              disabled={selectedSchedules.length === 0}
                              onClick={() => setIsScheduleOpen(false)}
                            >
                              Apply
                            </Button>
                          </div>
                        </PopoverContent>
                      </Popover>

                      <Popover open={isRateOpen} onOpenChange={setIsRateOpen}>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outlined"
                            visual="gray"
                            size="sm"
                            className="h-9 rounded-[6px] border-gray-200 bg-white px-[14px] py-[8px]"
                          >
                            Rate
                            <ChevronDown className="ml-2 size-4" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="isolate z-[100] w-[240px] rounded-[8px] border-gray-200 bg-white p-0 shadow-[0px_24px_48px_-12px_rgba(16,24,40,.18)]">
                          <ScrollArea className="h-[220px] px-3 py-2">
                            <RadioGroup
                              value={selectedRate}
                              onValueChange={(value) => {
                                setSelectedRate(value)
                                setIsRateOpen(false)
                              }}
                              className="gap-y-0"
                            >
                              {rateOptions.map((option) => (
                                <label
                                  key={option}
                                  className="flex items-center gap-3 rounded-[6px] py-3"
                                >
                                  <HeadlessRadioGroupItem
                                    value={option}
                                    className="inline-flex h-5 w-5 shrink-0 rounded-full border-[1.5px] border-gray-300 data-[state=checked]:border-gray-400"
                                  >
                                    <span className="m-auto hidden h-2 w-2 rounded-full bg-gray-400 data-[state=checked]:block" />
                                  </HeadlessRadioGroupItem>
                                  <span className="text-[14px] font-medium text-gray-500">
                                    {option}
                                  </span>
                                </label>
                              ))}
                            </RadioGroup>
                          </ScrollArea>
                          <div className="flex items-center justify-between border-t border-gray-200 p-3">
                            <Button
                              variant="link"
                              visual="gray"
                              className="px-0 text-[14px] font-semibold text-gray-500"
                              onClick={() => setSelectedRate("")}
                            >
                              Clear
                            </Button>
                            <Button
                              size="sm"
                              disabled={!selectedRate}
                              onClick={() => setIsRateOpen(false)}
                            >
                              Apply
                            </Button>
                          </div>
                        </PopoverContent>
                      </Popover>
                    </div>

                    <label className="inline-flex items-center gap-3">
                      <Switch visual="blue" />
                      <span className="text-[14px] font-semibold leading-normal text-gray-500">
                        Apply to All Roles
                      </span>
                    </label>
                  </div>
                ) : null}

                {rankedCandidates.map((candidate) => (
                  <div
                    key={candidate.id}
                    className="border-b border-gray-200 py-5 first:pt-0"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex min-w-0 gap-4">
                        <div className="flex w-[96px] shrink-0 flex-col items-center justify-center">
                          <div className="relative h-[86px] w-[86px]">
                            <CircularProgress
                              size={86}
                              strokeWidth={5}
                              value={candidate.match}
                              className="absolute inset-0 text-primary-500"
                              trackClassName="stroke-transparent"
                            />
                            <Avatar
                              containerClassName="absolute inset-0 grid place-items-center"
                              className="size-[66px] hover:ring-0 active:ring-0"
                            >
                              <AvatarImage
                                src={candidate.avatar}
                                alt={candidate.name}
                              />
                              <AvatarFallback>
                                {candidate.name.charAt(0)}
                              </AvatarFallback>
                            </Avatar>
                          </div>

                          <span className="mt-2 text-[11px] font-medium leading-normal text-dark-blue-400">
                            {candidate.match}% match
                          </span>
                          <span className="mt-1 inline-flex items-end gap-0.5 text-dark-blue-400">
                            <span className="text-[20px] font-bold leading-none">
                              {candidate.hourlyRate}
                            </span>
                            <span className="text-[14px] font-light leading-none">
                              /hr
                            </span>
                          </span>
                        </div>

                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-x-1 gap-y-1">
                            <span className="text-[16px] font-bold leading-none text-dark-blue-400">
                              {candidate.name}
                            </span>
                            <span className="text-[16px] font-light leading-none text-gray-500">
                              {candidate.handle}
                            </span>
                          </div>

                          <div className="mt-2 text-[14px] font-semibold leading-normal text-dark-blue-400">
                            {candidate.title}
                          </div>
                          <div className="mt-1 text-[14px] font-light leading-normal text-gray-500">
                            {candidate.experience}
                          </div>

                          <div className="mt-4 flex flex-wrap gap-2">
                            <Badge
                              visual="gray"
                              className="rounded-[5px] border border-gray-200 bg-white px-2 py-[5px]"
                            >
                              Top Match
                            </Badge>
                            <Badge
                              visual="gray"
                              className="rounded-[5px] border border-gray-200 bg-white px-2 py-[5px]"
                            >
                              {candidate.availability}
                            </Badge>
                          </div>
                        </div>
                      </div>

                      <div className="flex shrink-0 items-center gap-2 pt-1">
                        <Badge
                          visual="gray"
                          className="border border-gray-200 bg-white"
                        >
                          <span className="text-[14px]">🇺🇸</span>
                          {candidate.location}
                        </Badge>
                        <Badge
                          visual="gray"
                          className="border border-gray-200 bg-white"
                        >
                          {candidate.level}
                        </Badge>
                      </div>
                    </div>

                    <div className="mt-2 flex">
                      {/* 96px left column + 16px gutter to align with main text column */}
                      <div className="w-[112px] shrink-0" />
                      <div className="min-w-0 flex flex-nowrap items-center gap-2 overflow-hidden">
                        <span className="mr-1 shrink-0 text-[14px] font-semibold leading-normal text-dark-blue-400 whitespace-nowrap">
                          {candidate.skillsMatch}
                        </span>
                        {candidate.skills.map((skill, index) => (
                          <Badge
                            key={`${candidate.id}-${skill}-${index}`}
                            visual="gray"
                            className="shrink-0 whitespace-nowrap bg-gray-100 text-dark-blue-400"
                          >
                            <Check className="size-3.5 text-primary-500" />
                            {skill}
                          </Badge>
                        ))}
                        <span className="shrink-0 whitespace-nowrap text-[14px] font-semibold leading-normal text-dark-blue-400">
                          + 9 more...
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <Card className="relative z-0 h-fit w-full max-w-[294px] self-start flex-col items-stretch justify-start rounded-[8px] border border-gray-200 bg-white p-5 shadow-none transition-none hover:border-gray-200 hover:ring-0">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-[16px] font-semibold leading-none text-dark-blue-400">
                      Apply Filters to Your Team
                    </h2>
                    <p className="mt-3 text-[14px] font-light leading-[1.45] text-gray-500">
                      Customize filters for better match for each role, or
                      invite without them.
                    </p>
                  </div>
                  <HelpCircle className="mt-0.5 size-4 shrink-0 text-gray-400" />
                </div>

                <div className="mt-6">
                  <div className="text-[14px] font-medium leading-normal text-gray-500">
                    {filteredRoleCount}/{teamRoles.length} Roles have been
                    filtered
                  </div>
                  <Progress
                    className="mt-3 h-2 bg-transparent"
                    value={(filteredRoleCount / teamRoles.length) * 100}
                  />
                </div>

                <div className="mt-7">
                  {teamRoles.map((role) => (
                    <div
                      key={role.id}
                      className="flex items-center justify-between gap-3 border-t border-gray-200 py-4 first:border-t-0 first:pt-0 last:pb-0"
                    >
                      <span className="min-w-0">
                        <span className="block text-[16px] font-semibold leading-normal text-dark-blue-400">
                          {role.label}
                        </span>
                        <span className="mt-1 block text-[14px] font-light leading-normal text-gray-500">
                          {role.state}
                        </span>
                      </span>
                      {role.completed ? (
                        <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary-500 text-white pointer-events-none">
                          <Check className="size-3.5" />
                        </span>
                      ) : (
                        <span className="inline-flex h-6 w-6 shrink-0 rounded-full border-[1.5px] border-gray-300 bg-white pointer-events-none" />
                      )}
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          </div>
        </div>

        <div className="shrink-0 border-t border-gray-200 bg-white">
          <div className="flex w-full flex-col gap-4 pl-[32px] pr-[17px] py-[15px] lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-2 text-[14px] font-medium leading-normal text-gray-500">
              <HelpCircle className="size-4" />
              Invitations will be sent after checkout
            </div>

            <div className="flex items-center justify-center gap-3 self-center">
              <StepIndicator index={0} />
              <span className="text-[16px] font-semibold leading-none text-dark-blue-400">
                Invitation
              </span>
              <span className="w-[48px] border-t-2 border-dashed border-gray-300" />
              <StepIndicator index={1} disabled />
              <span className="text-[16px] font-semibold leading-none text-gray-300">
                Checkout
              </span>
            </div>

            <div className="flex items-center justify-end gap-3 self-end lg:self-auto">
              <Button
                variant="ghost"
                visual="gray"
                onClick={() => router.push("/checkout/demo")}
              >
                Skip & Continue
              </Button>
              <Button onClick={() => router.push("/checkout/demo")}>
                Send 30 invites
                <Send01 className="size-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
