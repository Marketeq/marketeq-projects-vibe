"use client"

import React, { useLayoutEffect, useRef, useState } from "react"
import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { apiFetch } from "@/src/lib/api"
import { createOffer } from "@/service/http/offers"
import type { ContractType, WorkScheduleResponse } from "@/types/offer"
import { getCurrentUser } from "@/utils/auth"
import { useOnlineUsers } from "@/utils/useOnlineUsers"
import {
  AlertTriangle,
  Archive,
  ArrowLeft,
  Attachment01,
  ChevronDown,
  ChevronRight,
  Edit05,
  Image03,
  Info,
  Mail05,
  MapPin,
  MoreHorizontal,
  Pin02,
  Plus,
  SearchMd,
  Send,
  Smile,
  Star,
  Trash2,
  UploadCloud,
  X,
} from "@blend-metrics/icons"
import {
  DropboxBrand,
  GoogleDrive1Brand,
  MsOnedriveBrand,
} from "@blend-metrics/icons/brands"
import { DropdownMenuArrow } from "@radix-ui/react-dropdown-menu"
import { useMeasure, useToggle } from "react-use"
import { Conversation } from "@/types/conversation"
import { Message } from "@/types/message"
import { UserProfile } from "@/types/user"
import { User } from "@/types/user"
import { ToggleGroupItem, ToggleGroupRoot } from "@/components/ui/toggle-group"
import { Chat, ChatsContextProvider, useChatsContext } from "@/components/chat"
import { HireMeButton } from "@/components/hire-me-button"
import { SaveTalentButton } from "@/components/save-talent-button"
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  Badge,
  Button,
  Calendar,
  CircularProgressDropzone,
  CircularProgressDropzoneState,
  Dialog,
  DialogClose,
  DialogContent,
  DialogTitle,
  DialogTrigger,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioTrigger,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  IconButton,
  Input,
  InputGroup,
  InputLeftElement,
  InputRightElement,
  Popover,
  PopoverContent,
  PopoverTrigger,
  ScrollArea,
  ScrollBar,
  Textarea,
  Toggle,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
  buttonVariants,
} from "@/components/ui"

interface RightSidebarProps {
  selectedConversation: Conversation | null
  jwtToken: string
}

type ResendOfferContext = {
  offerId: string
  offerTitle: string
  jobListingId: string
  talentId: string
  contractType: string
  startDate: string
}

const SaveButton = () => {
  const [isOpen, toggleIsOpen] = useToggle(false)
  const [value, setValue] = useState("")

  return (
    <div className="flex items-center">
      <Toggle
        className={buttonVariants({
          className:
            "group border-r-0 xs:max-lg:gap-x-[5.1px] xs:max-lg:leading-[12.75px] xs:max-lg:text-[8.93px] xs:max-lg:h-[25.75px] rounded-r-none",
          variant: "outlined",
          visual: "gray",
          size: "md",
        })}
      >
        <Star className="size-[12.75px] lg:size-5 text-gray-300 transition duration-300 group-hover:text-gray-500 group-hover:group-data-[state=on]:text-primary-500 group-data-[state=on]:text-primary-500  group-data-[state=on]:fill-primary-500" />
        <span className="group-data-[state=off]:inline-block hidden">Save</span>
        <span className="hidden group-data-[state=on]:inline-block">Saved</span>
      </Toggle>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <IconButton
            className="group rounded-l-none xs:max-lg:size-[25.5px] text-gray-500"
            variant="outlined"
            visual="gray"
            size="md"
          >
            <ChevronDown className="duration transition group-data-[state=open]:-rotate-180 size-[12.75px] lg:size-5" />
          </IconButton>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" side="bottom">
          <DropdownMenuRadioGroup value={value} onValueChange={setValue}>
            <DropdownMenuRadioTrigger value="Digital Marketing">
              Digital Marketing
            </DropdownMenuRadioTrigger>
            <DropdownMenuRadioTrigger value="Customer Service">
              Customer Service
            </DropdownMenuRadioTrigger>
            <DropdownMenuRadioTrigger value="Email Marketing">
              Email Marketing
            </DropdownMenuRadioTrigger>
          </DropdownMenuRadioGroup>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => toggleIsOpen()}
            className="text-primary-500"
          >
            <Plus className="size-4" /> Create New List
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={isOpen} onOpenChange={toggleIsOpen}>
        <DialogContent>
          <DialogTitle className="sr-only">Save to List</DialogTitle>
          <form className="flex items-center gap-x-3">
            <Input placeholder="Enter List Name" className="flex-auto" />
            <Button size="lg">Save</Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
const SKILLS_MAX_ROWS = 5

const SkillsRow = ({
  skills,
  username,
}: {
  skills: { id: string; name: string }[]
  username: string
}) => {
  const ref = useRef<HTMLDivElement>(null)
  const [visibleCount, setVisibleCount] = useState(skills.length)

  useLayoutEffect(() => {
    setVisibleCount(skills.length)
  }, [skills])

  useLayoutEffect(() => {
    const children = [...(ref.current?.children ?? [])] as HTMLElement[]
    const rows = new Set(children.map((el) => el.offsetTop)).size

    if (rows > SKILLS_MAX_ROWS) {
      setVisibleCount((count) => Math.max(0, count - 1))
    }
  }, [visibleCount, skills])

  const hiddenCount = skills.length - visibleCount

  return (
    <div ref={ref} className="mt-3 flex flex-wrap gap-2">
      {skills.slice(0, visibleCount).map((skill) => (
        <Badge key={skill.id} visual="gray">
          {skill.name}
        </Badge>
      ))}

      {hiddenCount > 0 &&
        (username ? (
          <Badge
            asChild
            visual="gray"
            className="transition-colors duration-150 hover:bg-gray-200"
          >
            <a
              href={`/talent-profile?username=${encodeURIComponent(username)}#skills`}
            >
              {hiddenCount} more...
            </a>
          </Badge>
        ) : (
          // username is "" for users without one — linking anyway would produce
          // /talent-profile?username=#skills, so show the count without a link.
          <Badge visual="gray">{hiddenCount} more...</Badge>
        ))}
    </div>
  )
}
const RightSidebar = ({
  selectedConversation,
  jwtToken,
}: RightSidebarProps) => {
  const [user, setUser] = useState<UserProfile | null>(null)
  const [profileError, setProfileError] = useState<string | null>(null)
  const [retryToken, setRetryToken] = useState(0)
  const currentUser = getCurrentUser()
  const router = useRouter()
  const { isOnline } = useOnlineUsers()
  const hireDialogTriggerRef = useRef<HTMLSpanElement>(null)
  const [resendOfferOpen, setResendOfferOpen] = useState(false)
  const [resendRate, setResendRate] = useState("")
  const [resendDuration, setResendDuration] = useState("")
  const [resendSchedule, setResendSchedule] = useState("")
  const [resendStartDateConfirmed, setResendStartDateConfirmed] =
    useState(false)
  const [resendDate, setResendDate] = useState<Date | undefined>()
  const [resendDateOpen, setResendDateOpen] = useState(false)
  const [resendCustomStartDateOpen, setResendCustomStartDateOpen] =
    useState(false)
  const [resendCustomRateOpen, setResendCustomRateOpen] = useState(false)
  const [resendCustomDurationOpen, setResendCustomDurationOpen] =
    useState(false)
  const [resendCustomScheduleOpen, setResendCustomScheduleOpen] =
    useState(false)
  const [resendProjectSelected, setResendProjectSelected] = useState(true)
  const [resendMessage, setResendMessage] = useState("")
  const [resendSubmitting, setResendSubmitting] = useState(false)
  const [resendSubmitError, setResendSubmitError] = useState<string | null>(null)
  const [resendOfferContext, setResendOfferContext] =
    useState<ResendOfferContext | null>(null)

  useEffect(() => {
    const handleOpenResendOffer = (event: Event) => {
      const detail = (event as CustomEvent<ResendOfferContext>).detail
      setResendOfferContext(detail)
      setResendRate("")
      setResendDuration("")
      setResendSchedule("")
      setResendStartDateConfirmed(false)
      const requestedStartDate = new Date(detail.startDate)
      setResendDate(
        Number.isNaN(requestedStartDate.getTime())
          ? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
          : requestedStartDate
      )
      setResendDateOpen(false)
      setResendCustomStartDateOpen(false)
      setResendCustomRateOpen(false)
      setResendCustomDurationOpen(false)
      setResendCustomScheduleOpen(false)
      setResendProjectSelected(true)
      setResendMessage("")
      setResendSubmitting(false)
      setResendSubmitError(null)
      setResendOfferOpen(true)
    }

    window.addEventListener("inbox:open-resend-offer", handleOpenResendOffer)
    return () =>
      window.removeEventListener(
        "inbox:open-resend-offer",
        handleOpenResendOffer
      )
  }, [])

  const otherId =
    selectedConversation && currentUser
      ? (selectedConversation.participantIds?.find(
          (id) => id !== currentUser.id
        ) ?? null)
      : null

  useEffect(() => {
    setUser(null)
    setProfileError(null)
    if (!otherId) return

    apiFetch<UserProfile>(`/users/${otherId}`, {
      method: "GET",
      headers: jwtToken ? { Authorization: `Bearer ${jwtToken}` } : {},
    })
      .then((profile) => {
        setUser(profile)
        setProfileError(null)
      })
      .catch((err) => {
        console.error("Profile fetch failed", err)
        setProfileError("Couldn't load profile.")
      })
  }, [otherId, jwtToken, retryToken])

  if (!selectedConversation) {
    return (
      <div className="w-[300px] bg-white flex flex-col shrink-0 pt-10 pb-6 px-5 border-l border-gray-200 items-center justify-center text-gray-400">
        <p className="text-sm">Select a conversation</p>
      </div>
    )
  }

  if (profileError) {
    return (
      <div className="w-[300px] bg-white flex flex-col shrink-0 pt-10 pb-6 px-5 border-l border-gray-200 items-center justify-center gap-y-3">
        <p className="text-sm text-error-500 text-center">{profileError}</p>
        <Button
          visual="gray"
          variant="outlined"
          onClick={() => setRetryToken((t) => t + 1)}
        >
          Retry
        </Button>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="w-[300px] bg-white flex flex-col shrink-0 pt-10 pb-6 px-5 border-l border-gray-200 items-center justify-center text-gray-400">
        <p className="text-sm">Loading profile...</p>
      </div>
    )
  }

  const fullName = user.firstName?.trim() || user.username || "Unknown"
  const username = user.username || ""
  const avatarUrl = user.avatarUrl
  const initials = fullName.charAt(0).toUpperCase()
  const rate =
    user.rateMin && user.rateMax ? `$${user.rateMin} - $${user.rateMax}` : null
  const availability = user.availability
  const memberSince = user.createdAt
    ? new Date(user.createdAt).toLocaleDateString("en-US", {
        month: "short",
        year: "numeric",
      })
    : null

  const submitResentOffer = async () => {
    if (
      resendSubmitting ||
      !resendOfferContext ||
      !resendRate ||
      !resendDuration ||
      !resendSchedule ||
      !resendStartDateConfirmed ||
      !resendDate
    ) {
      return
    }

    const listedRates: Record<string, number> = {
      "Logo Design": 45,
      "Web Development": 70,
      "UX/UI Design": 85,
    }
    const parsedRate =
      listedRates[resendRate] ??
      Number(resendRate.replace(/[^\d]/g, ""))
    const listedDurations: Record<string, number> = {
      "3 Months": 3,
      "6 Months": 6,
      "1 Year": 12,
      "18 Months": 18,
      "2 Years": 24,
      Ongoing: 12,
    }
    const durationMonths =
      listedDurations[resendDuration] ??
      Number(resendDuration.match(/\d+/)?.[0] ?? 0)
    const customHoursPerDay = Number(
      resendSchedule.match(/\d+/)?.[0] ?? 0
    )
    const workSchedule: WorkScheduleResponse = resendSchedule === "Full Time"
      ? { type: "FULL_TIME" }
      : resendSchedule === "Part Time"
        ? { type: "PART_TIME" }
        : { type: "CUSTOM", hoursPerWeek: customHoursPerDay * 5 }
    const normalizedContractType =
      resendOfferContext.contractType.toUpperCase() as ContractType
    const contractType: ContractType = [
      "PROJECT",
      "SERVICE",
      "TEAM",
      "CONTRACT",
    ].includes(normalizedContractType)
      ? normalizedContractType
      : "PROJECT"

    setResendSubmitting(true)
    setResendSubmitError(null)
    try {
      const offer = await createOffer({
        talentId: resendOfferContext.talentId || otherId || user.id,
        jobListingId: resendOfferContext.jobListingId,
        contractType,
        contractTitle:
          contractType === "PROJECT"
            ? undefined
            : resendOfferContext.offerTitle,
        rate: parsedRate,
        currencyCode: "USD",
        durationMonths,
        workSchedule,
        startDate: `${resendDate.getFullYear()}-${String(
          resendDate.getMonth() + 1
        ).padStart(2, "0")}-${String(resendDate.getDate()).padStart(2, "0")}`,
        message: resendMessage.trim() || undefined,
      })
      window.dispatchEvent(
        new CustomEvent("inbox:offer-created", { detail: offer })
      )
      setResendOfferOpen(false)
    } catch (error) {
      console.error("Offer creation failed", error)
      setResendSubmitError(
        "The offer could not be sent. Review the terms and try again."
      )
    } finally {
      setResendSubmitting(false)
    }
  }

  return (
    <div className="flex w-[300px] shrink-0 flex-col justify-between border-l border-gray-200 bg-white px-5 pb-6 pt-10">
      <div className="flex w-[260px] flex-col items-start gap-5">
        <div className="flex w-full flex-col items-center border-b border-gray-200 pb-5">
          <Avatar size="3xl" isOnline={isOnline(user?.id)}>
            <AvatarImage src={avatarUrl || undefined} alt={fullName} />
            <AvatarFallback delayMs={0}>{initials}</AvatarFallback>
          </Avatar>

          <div className="mt-2 flex w-full flex-col gap-y-0.5">
            <h3 className="text-base leading-[19.36px] text-center font-bold text-dark-blue-400">
              {fullName}
            </h3>
            {username && (
              <p className="text-center text-sm leading-[17px] text-gray-700">
                @{username}
              </p>
            )}
          </div>

          <div className="mt-5 flex h-9 w-full items-end justify-center gap-x-2">
            <SaveTalentButton userId={user?.id} />
            <Button
              size="sm"
              className="h-9 w-[73px] rounded-[5px] px-3.5 text-xs font-semibold leading-5 shadow-xs"
              onClick={() =>
                hireDialogTriggerRef.current
                  ?.querySelector<HTMLButtonElement>("button")
                  ?.click()
              }
            >
              Hire Me
            </Button>
            <span
              ref={hireDialogTriggerRef}
              className="hidden"
              data-inbox-hire-offer-trigger
            >
              <HireMeButton profile={user} />
            </span>
          </div>
        </div>

        <div className="flex w-full flex-col gap-y-3 border-b border-gray-200 pb-5">
          {rate && (
            <div className="flex items-center gap-x-2">
              <span className="text-[13px] leading-[15.73px] text-[#122A4B] font-light">
                Rate
              </span>
              <span className="text-[13px] leading-[15.73px] text-[#122A4B] font-light">
                <span className="font-bold">{rate}</span> /hr
              </span>
            </div>
          )}
          {availability && (
            <div className="flex h-4 w-[189px] items-center gap-x-2">
              <span className="flex h-4 w-[114px] items-end text-[13px] font-light leading-4 text-dark-blue-400">
                Current Availability
              </span>
              <span className="flex h-4 w-[67px] items-center gap-x-0.5 text-[13px] leading-4 text-dark-blue-400">
                <span className="flex h-4 items-end font-bold">
                  {availability.replace(/\s*\/wk\s*$/i, "")}
                </span>
                {availability.toLowerCase().includes("/wk") ? (
                  <span className="flex h-4 items-end font-light tracking-[0.02em]">
                    /wk
                  </span>
                ) : null}
              </span>
            </div>
          )}
          {/* Only surfaced once there are enough completed projects for the
            rating to mean anything — same threshold talent-profile uses, so a
            talent with no history shows nothing here rather than a bare or
            zeroed score. */}
          {(user?.totalProjectsCompleted ?? 0) >= 2 &&
            user?.clientSuccessRating != null && (
              <div className="flex items-center gap-x-2">
                <span className="inline-flex text-dark-blue-400 items-center text-xs leading-[14.52px] font-medium gap-x-1 py-1 px-2 bg-primary-50 rounded">
                  <Star className="size-3 fill-dark-blue-400" />{" "}
                  {user.clientSuccessRating}
                </span>
                {user.totalProjectsCompleted != null && (
                  <span className="text-xs leading-[15px] text-dark-blue-400">
                    {user.totalProjectsCompleted} reviews
                  </span>
                )}
              </div>
            )}
        </div>

        {user?.skills && user.skills.length > 0 && (
          <div className="w-full">
            <h3 className="font-bold text-sm text-dark-blue-400">Skills</h3>
            <SkillsRow skills={user.skills} username={username} />
          </div>
        )}
      </div>

      <div className="flex w-[260px] flex-col gap-y-6">
        <Button
          visual="gray"
          variant="outlined"
          disabled={!user?.username}
          onClick={() => {
            if (!user?.username) return
            router.push(
              `/talent-profile?username=${encodeURIComponent(user.username)}`
            )
          }}
        >
          View Full Profile
        </Button>

        {memberSince && (
          <span className="text-center text-xs leading-[14.52px] text-dark-blue-400">
            Member since <span className="font-semibold">{memberSince}</span>
          </span>
        )}
      </div>

      <Dialog open={resendOfferOpen} onOpenChange={setResendOfferOpen}>
        <DialogContent className="flex h-[calc(100dvh-24px)] max-h-[1136px] w-[480px] max-w-[calc(100vw-24px)] flex-col overflow-hidden rounded-xl p-0">
          <div className="flex h-[60px] shrink-0 items-center justify-between border-b border-gray-200 px-4 py-3">
            <Button
              variant="link"
              visual="gray"
              size="sm"
              className="h-9 gap-2 p-0 text-xs text-dark-blue-400"
              leftIcon={<ArrowLeft className="size-4" />}
              onClick={() => setResendOfferOpen(false)}
            >
              Back
            </Button>
            <DialogTitle className="sr-only">Resend offer</DialogTitle>
            <DialogClose asChild>
              <IconButton variant="ghost" visual="gray" size="sm">
                <X className="size-5" />
              </IconButton>
            </DialogClose>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-6 py-6 scrollbar-none">
            <div className="flex items-center gap-3">
              <Avatar className="size-12 shrink-0">
                <AvatarImage src={avatarUrl || undefined} alt={fullName} />
                <AvatarFallback>{initials}</AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1 text-dark-blue-400">
                <p className="text-xs leading-[18px]">
                  Hire <span className="font-semibold">{fullName}</span> for a Full-time contract
                </p>
                <p className="text-sm font-semibold leading-[18px]">{user.recentJobTitle || "Full Stack Developer"}</p>
                <p className="mt-1 text-xs text-gray-400">10 years of experience</p>
                <p className="mt-2 flex items-center gap-1 text-[10px] text-gray-500">
                  <MapPin className="size-3" /> Jersey City, NJ, United States
                </p>
              </div>
            </div>

            <div className="mt-6 flex flex-col items-end gap-2">
              {!resendProjectSelected ? (
                <button type="button" className="flex h-[58px] w-full items-center rounded-lg border border-gray-300 bg-white px-5 text-left" onClick={() => setResendProjectSelected(true)}>
                  <span><span className="block text-xs font-semibold text-dark-blue-400">React Native Mobile App</span><span className="block text-xs text-gray-500">Design Phase</span></span>
                </button>
              ) : (
              <div className="flex h-[58px] w-full items-center justify-between rounded-lg border-2 border-primary-500 bg-white px-5 py-3">
                <div>
                  <p className="text-xs font-semibold leading-[18px] text-dark-blue-400">React Native Mobile App</p>
                  <p className="text-xs leading-[18px] text-dark-blue-400">Design Phase</p>
                </div>
                <div className="flex items-center -space-x-2">
                  {["/avatars/alexpetrov.png", "/avatars/amarachen.png", "/avatars/jamesokafor.png", "/avatars/kevinpark.fe.png"].map((src) => (
                    <Avatar key={src} className="size-6 border-2 border-white">
                      <AvatarImage src={src} alt="Project member" />
                      <AvatarFallback>M</AvatarFallback>
                    </Avatar>
                  ))}
                  <span className="relative z-10 inline-flex size-8 items-center justify-center rounded-full border-2 border-gray-500 bg-white text-xs font-medium text-gray-500">+5</span>
                </div>
              </div>
              )}
              <Button variant="link" visual="gray" size="sm" className="h-[18px] p-0 text-xs text-dark-blue-400" onClick={() => setResendProjectSelected(false)}>{resendProjectSelected ? "Change Project" : "Select Project"}</Button>
            </div>

            <div className="mt-5">
              <h3 className="text-sm font-semibold text-dark-blue-400">Select Rate</h3>
              <div className="mt-3 space-y-2">
                {[
                  ["Logo Design", "$45/hr"],
                  ["Web Development", "$70/hr"],
                  ["UX/UI Design", "$85/hr"],
                ].map(([label, price]) => (
                  <button key={label} type="button" onClick={() => setResendRate(label)} className="flex h-10 w-full items-center justify-between rounded-[5px] border border-gray-200 px-4 text-xs text-dark-blue-400">
                    <span className="flex items-center gap-3"><span className={`size-5 rounded-full border ${resendRate === label ? "border-[6px] border-primary-500" : "border-gray-300"}`} />{label}</span>
                    <span className="font-semibold">{price}</span>
                  </button>
                ))}
              </div>
              {resendCustomRateOpen ? (
                <Input className="mt-2" type="number" min={1} placeholder="Enter hourly rate" onChange={(event) => setResendRate(event.target.value ? `$${event.target.value}/hr` : "")} />
              ) : null}
              <Button variant="link" visual="gray" size="sm" className="ml-auto mt-2 flex h-[18px] p-0 text-xs text-dark-blue-400" onClick={() => { setResendCustomRateOpen((open) => !open); setResendRate("") }}>Custom Rate</Button>
            </div>

            <div className="mt-5">
              <h3 className="text-sm font-semibold text-dark-blue-400">Select Contract Duration</h3>
              <div className="mt-3 grid grid-cols-3 gap-2">
                {["3 Months", "6 Months", "1 Year", "18 Months", "2 Years", "Ongoing"].map((duration) => (
                  <Button key={duration} type="button" variant={resendDuration === duration ? "light" : "outlined"} visual={resendDuration === duration ? "primary" : "gray"} size="sm" className="h-10 text-xs" onClick={() => setResendDuration(duration)}>{duration}</Button>
                ))}
              </div>
              {resendCustomDurationOpen ? (
                <Input className="mt-2" type="number" min={1} placeholder="Enter duration in months" onChange={(event) => setResendDuration(event.target.value ? `${event.target.value} Months` : "")} />
              ) : null}
              <Button variant="link" visual="gray" size="sm" className="ml-auto mt-2 flex h-[18px] p-0 text-xs text-dark-blue-400" onClick={() => { setResendCustomDurationOpen((open) => !open); setResendDuration("") }}>Custom Duration</Button>
            </div>

            <div className="mt-5">
              <h3 className="text-sm font-semibold text-dark-blue-400">Select Work Schedule</h3>
              <div className="mt-3 grid grid-cols-2 gap-3">
                {[["Part Time", "up to 30 hrs/week"], ["Full Time", "over 30 hrs/week"]].map(([label, detail]) => (
                  <button key={label} type="button" onClick={() => setResendSchedule(label)} className="flex h-[58px] items-center gap-3 rounded-[5px] border border-gray-200 px-4 text-left text-xs text-dark-blue-400">
                    <span className={`size-5 rounded-full border ${resendSchedule === label ? "border-[6px] border-primary-500" : "border-gray-300"}`} />
                    <span><span className="block font-medium">{label}</span><span className="text-[10px]">{detail}</span></span>
                  </button>
                ))}
              </div>
              {resendCustomScheduleOpen ? (
                <Input className="mt-2" type="number" min={1} max={24} placeholder="Hours per day (max 24)" onChange={(event) => { const hours = Math.min(24, Number(event.target.value)); setResendSchedule(hours > 0 ? `${hours} hours per day` : "") }} />
              ) : null}
              <Button variant="link" visual="gray" size="sm" className="ml-auto mt-2 flex h-[18px] p-0 text-xs text-dark-blue-400" onClick={() => { setResendCustomScheduleOpen((open) => !open); setResendSchedule("") }}>Custom Work Schedule</Button>
            </div>

            <div className="mt-5">
              {resendCustomStartDateOpen ? (
                <>
                  <h3 className="text-sm font-semibold text-dark-blue-400">Select A Start Date</h3>
                  <Popover open={resendDateOpen} onOpenChange={setResendDateOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outlined"
                    visual="gray"
                    className="mt-3 w-full justify-between text-xs font-normal text-gray-500"
                    rightIcon={<ChevronDown className={`size-4 transition-transform ${resendDateOpen ? "rotate-180" : ""}`} />}
                  >
                    {resendDate?.toLocaleDateString("en-US", {
                      weekday: "long",
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    }) || "Select a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent side="bottom" align="start" avoidCollisions={false} className="relative w-[432px] max-w-[calc(100vw-48px)] rounded-lg border border-gray-100 bg-white p-0 shadow-lg">
                  <div className="pointer-events-none absolute left-6 top-6 z-10 flex items-center gap-1 text-sm font-semibold leading-[22px] text-dark-blue-400">
                    <span>{resendDate?.getFullYear() || 2025}</span>
                    <ChevronRight className="size-4 text-primary-500" />
                  </div>
                  <div className="pointer-events-none absolute left-3 right-3 top-16 z-10 grid grid-cols-7 text-center text-xs font-semibold uppercase leading-[18px] text-gray-300">
                    <span>SUN</span><span>MON</span><span>TUE</span><span>WED</span><span>THU</span><span>FRI</span><span>SAT</span>
                  </div>
                  <Calendar
                    value={resendDate}
                    onValueChange={(value) => {
                      setResendDate(value)
                      setResendStartDateConfirmed(Boolean(value))
                      setResendDateOpen(false)
                    }}
                    className="w-[432px] max-w-full rounded-lg border-0 bg-white p-3 shadow-none [&>div]:hidden [&>header]:h-10 [&>header>h2]:order-1 [&>header>h2]:mr-auto [&>header>h2]:invisible [&>header>button:first-child]:order-2 [&>header>button:last-child]:order-3 [&_[role=grid]]:w-full [&_[role=grid]]:border-separate [&_[role=grid]]:border-spacing-y-0 [&_thead]:invisible [&_thead]:h-5 [&_thead_tr]:h-5 [&_thead_th]:h-5 [&_tbody_tr]:h-10 [&_td]:h-10 [&_td]:text-center [&_[role=gridcell]]:size-10 [&_[data-outside-month]]:invisible [&_[data-today][data-today]]:bg-transparent [&_[data-today][data-today]]:text-primary-500 [&_[data-selected]]:bg-primary-50 [&_[data-selected]]:text-primary-500"
                  />
                </PopoverContent>
                  </Popover>
                  <Button
                    variant="link"
                    visual="gray"
                    size="sm"
                    className="ml-auto mt-2 flex h-[18px] p-0 text-xs text-dark-blue-400"
                    onClick={() => {
                      setResendCustomStartDateOpen(false)
                      setResendDateOpen(false)
                      setResendStartDateConfirmed(true)
                    }}
                  >
                    Use Anticipated Date
                  </Button>
                </>
              ) : (
                <>
                  <h3 className="text-sm font-semibold text-dark-blue-400">Confirm Start Date</h3>
                  <p className="mt-3 text-xs text-gray-500">Based on the project scope, the anticipated start date is</p>
                  <p className="text-sm text-dark-blue-400">
                    {resendDate?.toLocaleDateString("en-US", {
                      weekday: "long",
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </p>
                  <div className="mt-3 grid grid-cols-2 gap-3">
                    <Button
                      variant="outlined"
                      visual="gray"
                      size="sm"
                      onClick={() => {
                        setResendStartDateConfirmed(true)
                      }}
                    >
                      Confirm Start Date
                    </Button>
                    <Button
                      variant="outlined"
                      visual="gray"
                      size="sm"
                      onClick={() => {
                        setResendCustomStartDateOpen(true)
                        setResendStartDateConfirmed(false)
                        requestAnimationFrame(() => setResendDateOpen(true))
                      }}
                    >
                      Change Date
                    </Button>
                  </div>
                </>
              )}
            </div>

            <div className="mt-5">
              <div className="flex items-center justify-between"><h3 className="text-sm font-semibold text-dark-blue-400">Add a Message</h3><span className="text-xs text-gray-400">Optional</span></div>
              <Textarea className="mt-3 h-[128px] resize-none" placeholder="Write your message" maxLength={500} value={resendMessage} onChange={(event) => setResendMessage(event.target.value)} />
            </div>
          </div>

          <div className="shrink-0 px-6 pb-6">
            {resendSubmitError ? (
              <p className="mb-2 text-xs text-error-500">
                {resendSubmitError}
              </p>
            ) : null}
            <Button
              className="w-full"
              size="sm"
              disabled={
                !resendRate ||
                !resendDuration ||
                !resendSchedule ||
                !resendStartDateConfirmed ||
                !resendProjectSelected ||
                !resendOfferContext?.jobListingId ||
                !(resendOfferContext?.talentId || otherId || user.id) ||
                resendSubmitting
              }
              onClick={submitResentOffer}
            >
              {resendSubmitting ? "Sending..." : "Send Offer"} {!resendSubmitting ? <Send className="size-3.5" /> : null}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default React.memo(RightSidebar)
