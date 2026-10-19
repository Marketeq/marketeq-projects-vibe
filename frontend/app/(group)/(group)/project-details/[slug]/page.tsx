"use client"

import * as React from "react"
import { useEffect, useRef, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { useAuth } from "@/contexts/auth"
import { claimProject, checkClaimLimit, recordClaim } from "@/src/lib/api/claim"
import {
  type JoinRequestStatus,
  cancelJoinRequest,
  getJoinRequestStatus,
  requestToJoinProject,
} from "@/src/lib/api/join-requests"
import {
  isTalentAccount,
  NoTeamAssigned,
} from "@/components/no-team-assigned"
import { ApiError, apiFetch } from "@/src/lib/api"
import { useAblyChannel } from "@/utils/useAblyChannel"
import { useOnlineUsers } from "@/utils/useOnlineUsers"
import {
  availablePeriods,
  costPerPeriod,
  formatDuration,
  PERIOD_WIDGET_LABELS,
  resolvePeriod,
  scopeDurationDays,
  type PricingPeriod,
} from "@/lib/listing-pricing"
import {
  estimateScopeBudgetCents,
  PHASE_TYPE_TITLE,
} from "@/components/scope-builder"
import {
  addFavorite,
  findFavoriteByItemId,
  removeFavorite,
} from "@/src/lib/api/favorites"
import { extractShortIdFromSlug } from "@/src/lib/urlHelpers"
import { ShareWindow, useShareWindowStore } from "@/components/share-window"
import { ReportWindow, useReportWindowStore } from "@/components/report-window"
import { ListingCard } from "@/components/listing-card"
import { projectDetailsUrl } from "@/src/lib/listing-urls"
import { ProjectDiscoverySections } from "@/components/project-discovery-sections"
import { LightboxVideoPlayer } from "./lightbox-video-player"
import { countryOf } from "@/lib/geo"
import {
  DataEmoji,
  EmojiProperties,
  cn,
  noop,
  toPxIfNumber,
} from "@/utils/functions"
import { useControllableState, useMakeFixedBehaveSticky } from "@/utils/hooks"
import {
  AlertCircle,
  ArrowLeft,
  Attachment01,
  ChartBreakoutCircle,
  Calendar,
  Check,
  CheckCircle,
  ChevronDown,
  Clock,
  FileText,
  Flag,
  RefreshCcw05,
  HelpCircle,
  Home03,
  Image03,
  Edit03,
  Info,
  MapPin,
  MessageTextCircle01,
  MessageTextSquare01,
  Rocket02,
  Send,
  Share,
  Share06,
  ShieldDollar,
  ShieldZap,
  ShoppingCart,
  Play,
  Smile,
  Star,
  Stars02,
  UploadCloud,
  User01,
  Users03,
  X,
  X2,
} from "@blend-metrics/icons"
import {
  DropboxBrand,
  GoogleDrive1Brand,
  MsOnedriveBrand,
} from "@blend-metrics/icons/brands"
import { DropdownMenuArrow } from "@radix-ui/react-dropdown-menu"
import * as RadixTabs from "@radix-ui/react-tabs"
import { TbStar, TbStarHalfFilled } from "react-icons/tb"
import { useToggle } from "react-use"
import useMeasure from "react-use-measure"
import {
  type ProjectStaticContent,
  type ProjectStaticIcon,
  buildProjectStaticContentFromGateway,
} from "@/lib/project-details/project-static-content-from-api"
import { getPublicApiUrl } from "@/lib/runtime-urls"
import { sanitizeProjectDescription } from "@/lib/sanitize-html"
import { csrfHeader } from "@/src/lib/csrf"
import { ProjectAPI } from "@/service/http/project"
import { UserAPI } from "@/service/http/user"
import { ChatsContextProvider } from "@/components/chat"
import { EmojiPicker } from "@/components/emoji-picker"
import { MessageAttachmentView } from "@/app/(group)/inbox/components/message-components"
import { EditContextProvider, useEditContext } from "@/components/inbox-comps"
import { LikeDislike } from "@/components/like-dislike"
import NextImage from "@/components/next-image"
import { Money } from "@/components/money"
import NextLink from "@/components/next-link"
import { ProjectDetailsStepsSection } from "@/components/project-details/project-details-steps-section"
import { ReadMoreLessComp, ReadMoreLessRoot } from "@/components/read-more-less"
import {
  ShowMoreLess,
  ShowMoreLessComp,
  ShowMoreLessRoot,
} from "@/components/show-more-less"
import { SectionSearchBar } from "@/components/talent-profile-comps"
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  Alert,
  AlertContent,
  AlertDescription,
  AlertIcon,
  Avatar,
  AvatarFallback,
  AvatarFallbackIcon,
  AvatarGroup,
  AvatarImage,
  Badge,
  BadgeCloseButton,
  Button,
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  CircularProgressDropzone,
  CircularProgressDropzoneState,
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DisclosureContent,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Favorite,
  FavoriteRoot,
  IconButton,
  Input,
  InputGroup,
  InputRightElement,
  Label,
  Listbox,
  ListboxButton,
  ListboxOption,
  ListboxOptions,
  Progress,
  RatingGroupContext,
  RatingGroupControl,
  RatingGroupHiddenInput,
  RatingGroupItem,
  RatingGroupItemContext,
  RatingGroupLabel,
  RatingGroupRoot,
  ScrollArea,
  ScrollBar,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Textarea,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
  useCarousel,
  useToast,
} from "@/components/ui"
import { Checkbox } from "@/components/ui/checkbox"

// ---------------------------------------------------------------------------
// JoinProjectDialog — 4-step "Apply to Join" wizard + confirmation
// Pixel-perfect per Figma nodes 13101:121597, 13101:121510, 13101:121681,
// 13101:121749, 13101:121385
// ---------------------------------------------------------------------------

type JoinStep = 1 | 2 | 3 | 4 | "confirm"

interface JoinProjectDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  projectTitle: string
  projectId: string
  scopeRoles: string[]
  scopeTaskTypes: string[]
  onSubmitted: () => void
}

function JoinProjectDialog({
  open,
  onOpenChange,
  projectTitle,
  projectId,
  scopeRoles,
  scopeTaskTypes,
  onSubmitted,
}: JoinProjectDialogProps) {
  const [step, setStep] = React.useState<JoinStep>(1)
  const [busy, setBusy] = React.useState(false)
  const didSubmitRef = React.useRef(false)

  // Step 1 — Roles (up to 3)
  const [selectedRoles, setSelectedRoles] = React.useState<string[]>([])
  const [showOtherRole, setShowOtherRole] = React.useState(false)
  const [otherRoleValue, setOtherRoleValue] = React.useState("")

  // Step 2 — Task Types (up to 3)
  const [selectedTasks, setSelectedTasks] = React.useState<string[]>([])
  const [showOtherTask, setShowOtherTask] = React.useState(false)
  const [otherTaskValue, setOtherTaskValue] = React.useState("")

  // Step 3 — Experience
  const [message, setMessage] = React.useState("")
  const [radioAnswer, setRadioAnswer] = React.useState("")
  const [selectedTags1, setSelectedTags1] = React.useState<string[]>([])
  const [selectedTags2, setSelectedTags2] = React.useState<string[]>([])

  // Step 4 — Case Studies
  const [searchQuery, setSearchQuery] = React.useState("")

  // Reset on close — fire onSubmitted if application was sent
  React.useEffect(() => {
    if (!open) {
      if (didSubmitRef.current) {
        onSubmitted()
        didSubmitRef.current = false
      }
      setTimeout(() => {
        setStep(1)
        setSelectedRoles([])
        setShowOtherRole(false)
        setOtherRoleValue("")
        setSelectedTasks([])
        setShowOtherTask(false)
        setOtherTaskValue("")
        setMessage("")
        setRadioAnswer("")
        setSelectedTags1([])
        setSelectedTags2([])
        setSearchQuery("")
        setBusy(false)
      }, 200)
    }
  }, [open, onSubmitted])

  const toggleRole = (role: string) => {
    setSelectedRoles((prev) =>
      prev.includes(role) ? prev.filter((r) => r !== role) : prev.length < 3 ? [...prev, role] : prev
    )
  }
  const removeRole = (role: string) => setSelectedRoles((prev) => prev.filter((r) => r !== role))

  const toggleTask = (task: string) => {
    setSelectedTasks((prev) =>
      prev.includes(task) ? prev.filter((t) => t !== task) : prev.length < 3 ? [...prev, task] : prev
    )
  }
  const removeTask = (task: string) => setSelectedTasks((prev) => prev.filter((t) => t !== task))

  const addOtherRole = () => {
    const v = otherRoleValue.trim()
    if (v && !selectedRoles.includes(v) && selectedRoles.length < 3) {
      setSelectedRoles((prev) => [...prev, v])
      setOtherRoleValue("")
      setShowOtherRole(false)
    }
  }

  const addOtherTask = () => {
    const v = otherTaskValue.trim()
    if (v && !selectedTasks.includes(v) && selectedTasks.length < 3) {
      setSelectedTasks((prev) => [...prev, v])
      setOtherTaskValue("")
      setShowOtherTask(false)
    }
  }

  const canContinue = (() => {
    if (step === 1) return selectedRoles.length > 0
    if (step === 2) return selectedTasks.length > 0
    if (step === 3) return true
    if (step === 4) return true
    return false
  })()

  const handleSubmit = async () => {
    if (busy) return
    setBusy(true)
    try {
      await requestToJoinProject(projectId)
    } catch {
      // Optimistic — backend may not exist yet
    }
    setBusy(false)
    didSubmitRef.current = true
    setStep("confirm")
  }

  // Step 3 radio options — per Figma
  const radioOptions = [
    "Design-first (Figma/prototype)",
    "Code-first",
    "Research-first",
    "It depends",
  ]

  // Step 3 tag groups — per Figma
  const tagGroup1Options = ["Unit Testing", "E2E", "Manual QA", "TDD", "Automated"]
  const tagGroup2Options = ["iOS", "Android", "Web"]

  // Shared modal shell for all steps
  const modalClasses =
    "left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[520px] max-w-[520px] max-h-[85vh] rounded-[12px] bg-white p-0 shadow-[0px_20px_24px_-4px_rgba(16,24,40,0.08)] flex flex-col overflow-hidden"

  // ---- Confirmation screen ----
  if (step === "confirm") {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className={modalClasses} accessibilityTitle="Request sent">
          <DialogTitle className="sr-only">Request sent</DialogTitle>
          {/* Header — close button only */}
          <div className="flex items-center justify-end pl-[20px] pr-[12px] py-[12px]">
            <IconButton
              className="size-[36px] rounded-[8px] text-[#667085] opacity-50 hover:opacity-100 hover:bg-gray-50"
              variant="ghost"
              visual="gray"
              onClick={() => onOpenChange(false)}
            >
              <X className="size-[20px]" />
            </IconButton>
          </div>

          {/* Body — gap-[42px] between header and content, gap-[24px] inside content */}
          <div className="flex flex-col items-center gap-[24px] px-[24px] pt-[18px] pb-[26px]">
            {/* Sent icon — per Figma node 13101:121392 */}
            <svg width="67" height="67" viewBox="0 0 67 67" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M29.2 61.7L6.3 46.3C4.5 45.1 3.5 43 3.5 40.8V26.2C3.5 24 4.5 21.9 6.3 20.7L29.2 5.3C31 4.1 33.3 3.7 35.4 4.3L61.5 12.1C63 12.6 64 14 64 15.5V51.5C64 53.1 63 54.4 61.5 54.9L35.4 62.7C33.3 63.3 31 62.9 29.2 61.7Z" stroke="#306CFE" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M3.5 23L33.5 42L63.5 23" stroke="#306CFE" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M33.5 42V63.5" stroke="#306CFE" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>

            {/* Message — Figma: 18px, semibold "Your request to join " + normal "title" + semibold " has been sent." */}
            <div className="text-center text-[18px] text-[#22376B]">
              <span className="font-semibold leading-[20px]">Your request to join </span>
              <span className="font-normal leading-[20px]">&ldquo;{projectTitle}&rdquo;</span>
              <span className="font-semibold leading-[20px]"> has been sent.</span>
            </div>
          </div>

          {/* Summary rows — Figma: gap-[12px], w-[475px] centered */}
          <div className="flex flex-col gap-[12px] px-[22px] pb-[26px]">
            {/* Roles row */}
            <div className="flex items-center gap-[12px] rounded-[5px] border border-[#EAECF0] px-[20px] py-[10px]">
              <span className="shrink-0 text-[12px] font-semibold leading-normal text-[#22376B]">Roles</span>
              <div className="flex flex-wrap gap-[6px]">
                {selectedRoles.map((r) => (
                  <span key={r} className="rounded-[16px] bg-[#E8EEFF] pl-[10px] pr-[8px] py-[2px] text-[14px] font-medium leading-[20px] text-[#306CFE]">
                    {r}
                  </span>
                ))}
              </div>
            </div>

            {/* Task Types row */}
            <div className="flex items-center gap-[12px] rounded-[5px] border border-[#EAECF0] px-[20px] py-[10px]">
              <span className="shrink-0 text-[12px] font-semibold leading-normal text-[#22376B]">Task Types</span>
              <div className="flex flex-wrap gap-[6px]">
                {selectedTasks.map((t) => (
                  <span key={t} className="rounded-[16px] bg-[#E8EEFF] pl-[10px] pr-[8px] py-[2px] text-[14px] font-medium leading-[20px] text-[#306CFE]">
                    {t}
                  </span>
                ))}
              </div>
            </div>

            {/* Your Message row */}
            {message.trim() && (
              <div className="flex flex-col gap-[8px] rounded-[5px] border border-[#EAECF0] p-[20px]">
                <span className="text-[12px] font-semibold leading-normal text-[#22376B]">Your Message</span>
                <p className="text-[14px] font-normal leading-normal text-[#22376B]">
                  {message.length > 120 ? `${message.slice(0, 120)}...` : message}
                </p>
              </div>
            )}

            {/* Notification row — Figma: h-[36px], 12px regular */}
            <div className="flex h-[36px] items-center rounded-[5px] border border-[#EAECF0] overflow-hidden px-[19px]">
              <span className="text-[12px] font-normal leading-normal text-[#22376B]">
                We&apos;ll notify you when the project owner reviews your application.
              </span>
            </div>
          </div>

          {/* Footer — Figma: border-t, p-[12px], justify-between */}
          <div className="flex items-center justify-between border-t border-[#EAECF0] p-[12px]">
            <Button
              variant="outlined"
              className="h-[36px] gap-[8px] rounded-[5px] border-2 border-[#306CFE] bg-white px-[14px] py-[8px] text-[14px] font-semibold capitalize leading-[20px] text-[#306CFE] shadow-[0px_1px_2px_0px_rgba(16,24,40,0.05)] hover:bg-[#306CFE] hover:text-white"
              asChild
            >
              <NextLink href="/projects">
                <svg width="15" height="15" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg" className="shrink-0 size-[15px]">
                  <path d="M10 12.5V2.5C10 2.16848 9.8683 1.85054 9.63388 1.61612C9.39946 1.3817 9.08152 1.25 8.75 1.25H6.25C5.91848 1.25 5.60054 1.3817 5.36612 1.61612C5.1317 1.85054 5 2.16848 5 2.5V12.5M2.5 3.75H12.5C13.1904 3.75 13.75 4.30964 13.75 5V11.25C13.75 11.9404 13.1904 12.5 12.5 12.5H2.5C1.80964 12.5 1.25 11.9404 1.25 11.25V5C1.25 4.30964 1.80964 3.75 2.5 3.75Z" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                Browse More Projects
              </NextLink>
            </Button>
            <Button
              variant="outlined"
              className="h-[36px] gap-[8px] rounded-[5px] border border-[#D0D5DD] bg-white px-[14px] py-[8px] text-[14px] font-semibold capitalize leading-[20px] text-[#1D2939] shadow-[0px_1px_2px_0px_rgba(16,24,40,0.05)] hover:bg-gray-50"
              onClick={() => onOpenChange(false)}
            >
              I&apos;m Done
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  // ---- Steps 1-4 ----
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={modalClasses} accessibilityTitle="Request to join project">
        <DialogTitle className="sr-only">Request to join project</DialogTitle>

        {/* Header — Figma: h-[60px], pl-[20px] pr-[12px] py-[12px] */}
        <div className="flex h-[60px] items-center justify-between pl-[20px] pr-[12px] py-[12px] shrink-0">
          <p className="truncate text-[16px] leading-[28px] text-[#22376B] w-[448px]">
            <span className="font-semibold">Request to join </span>
            <span className="font-normal">&ldquo;{projectTitle}&rdquo;</span>
          </p>
          <IconButton
            className="size-[36px] shrink-0 rounded-[8px] text-[#667085] opacity-50 hover:opacity-100 hover:bg-gray-50"
            variant="ghost"
            visual="gray"
            onClick={() => onOpenChange(false)}
          >
            <X className="size-[20px]" />
          </IconButton>
        </div>

        {/* Progress bar — Figma: 4 x w-[115px] h-[4px], gap-[6px], px-[20px] */}
        <div className="flex gap-[6px] px-[20px] shrink-0">
          {([1, 2, 3, 4] as const).map((s) => (
            <div
              key={s}
              className={cn(
                "h-[4px] w-[115px] rounded-[5px]",
                (typeof step === "number" && s <= step) ? "bg-[#5687FF]" : "bg-[#EAECF0]"
              )}
            />
          ))}
        </div>

        {/* Content — Figma: gap-[40px] from progress to content, px-[20px] */}
        <div className="flex-1 overflow-y-auto px-[20px] py-[40px]">
          {/* ---------- STEP 1: Choose Roles ---------- */}
          {step === 1 && (
            <div className="flex flex-col gap-[17px]">
              {/* Question header — Figma: gap-[8px] between question/counter, gap-[2px] title/subtitle */}
              <div className="flex flex-col gap-[8px]">
                <div className="flex gap-[8px] items-start">
                  <div className="flex flex-col gap-[2px] flex-1 min-w-0">
                    <p className="text-[14px] font-semibold leading-[20px] text-[#22376B]">
                      Which role(s) are you interested in?
                    </p>
                    <p className="text-[12px] font-normal leading-[18px] text-[#667085]">
                      Select up to 3 roles, or add your own.
                    </p>
                  </div>
                  <span className="text-[12px] font-normal leading-[18px] text-[#667085] text-right shrink-0">
                    {selectedRoles.length} of 3 selected
                  </span>
                </div>

                {/* Scrollable checklist — Figma: h-[237px], border, rounded-[5px], pl-[12px] pr-[20px] py-[10px], gap-[6px] */}
                <ScrollArea className="h-[237px] w-full rounded-[5px] border border-[#EAECF0] shadow-[0px_1px_4px_0px_rgba(0,0,0,0.03)]">
                  <div className="flex flex-col gap-[6px] px-[12px] py-[10px]">
                    {scopeRoles.map((role) => {
                      const checked = selectedRoles.includes(role)
                      const atMax = selectedRoles.length >= 3 && !checked
                      const row = (
                        <Button
                          variant="ghost"
                          key={role}
                          disabled={atMax}
                          className={cn(
                            "flex h-auto w-full items-center justify-start gap-[14px] rounded-[5px] border px-[20px] py-[12px] text-left",
                            checked
                              ? "border-[#306CFE] bg-[#E8EEFF] hover:bg-[#E8EEFF]"
                              : "border-[#EAECF0] bg-white hover:bg-gray-50",
                            atMax && "opacity-50 pointer-events-none"
                          )}
                          onClick={() => toggleRole(role)}
                        >
                          <Checkbox
                            size="md"
                            checked={checked}
                            onCheckedChange={() => toggleRole(role)}
                            className="shrink-0 pointer-events-none"
                          />
                          <span className="text-[13px] font-medium capitalize leading-[20px] text-[#344054]">{role}</span>
                        </Button>
                      )
                      if (atMax) {
                        return (
                          <TooltipProvider key={role} delayDuration={150}>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div className="cursor-not-allowed">{row}</div>
                              </TooltipTrigger>
                              <TooltipContent>You can select up to 3 roles. Remove one to choose another.</TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        )
                      }
                      return row
                    })}

                    {/* Other option */}
                    {(() => {
                      const otherAtMax = selectedRoles.length >= 3 && !showOtherRole
                      const otherBtn = (
                        <Button
                          variant="ghost"
                          disabled={otherAtMax}
                          className={cn(
                            "flex h-auto w-full items-center justify-start gap-[14px] rounded-[5px] border px-[20px] py-[12px] text-left",
                            showOtherRole
                              ? "border-[#306CFE] bg-[#E8EEFF] hover:bg-[#E8EEFF]"
                              : "border-[#EAECF0] bg-white hover:bg-gray-50",
                            otherAtMax && "opacity-50 pointer-events-none"
                          )}
                          onClick={() => setShowOtherRole(true)}
                        >
                          <Checkbox
                            size="md"
                            checked={showOtherRole}
                            onCheckedChange={() => setShowOtherRole(true)}
                            className="shrink-0 pointer-events-none"
                          />
                          <span className="text-[13px] font-medium capitalize leading-[20px] text-[#344054]">Other</span>
                        </Button>
                      )
                      if (otherAtMax) {
                        return (
                          <TooltipProvider delayDuration={150}>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div className="cursor-not-allowed">{otherBtn}</div>
                              </TooltipTrigger>
                              <TooltipContent>You can select up to 3 roles. Remove one to choose another.</TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        )
                      }
                      return otherBtn
                    })()}
                  </div>
                </ScrollArea>
              </div>

              {/* "Other" custom input — below scroll list, per Figma */}
              {showOtherRole && (
                <div className="flex flex-col gap-[12px]">
                  <div className="flex flex-col gap-[8px] w-full">
                    <div className="flex items-center justify-between">
                      <p className="text-[12px] font-normal leading-[18px] text-[#667085]">Enter your role</p>
                      <Button
                        variant="ghost"
                        className="h-auto min-w-0 p-0 text-[12px] font-medium leading-[18px] text-[#306CFE] hover:bg-transparent hover:text-[#306CFE] hover:underline"
                        onClick={() => { setShowOtherRole(false); setOtherRoleValue("") }}
                      >
                        Cancel
                      </Button>
                    </div>
                    <div className="flex h-[40px] items-center rounded-[5px] border-[1.5px] border-[#EAECF0] bg-white px-[14px] py-[10px]">
                      <Input
                        className="h-full w-full border-0 p-0 text-[14px] text-[#22376B] shadow-none focus-visible:ring-0 placeholder:text-[#667085]"
                        placeholder=""
                        value={otherRoleValue}
                        onChange={(e) => setOtherRoleValue(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault()
                            addOtherRole()
                          }
                        }}
                        autoFocus
                      />
                    </div>
                  </div>
                  {/* Selected role tags — below input, per Figma */}
                  {selectedRoles.length > 0 && (
                    <div className="flex flex-wrap gap-[8px]">
                      {selectedRoles.map((r) => (
                        <Badge key={r} visual="primary" size="sm" variant="rounded" className="pr-1.5">
                          {r}
                          <BadgeCloseButton onClick={() => removeRole(r)}>
                            <X2 className="h-3 w-3" />
                          </BadgeCloseButton>
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ---------- STEP 2: Choose Task Types ---------- */}
          {step === 2 && (
            <div className="flex flex-col gap-[17px]">
              <div className="flex flex-col gap-[8px]">
                <div className="flex gap-[8px] items-start">
                  <div className="flex flex-col gap-[2px] w-[372px]">
                    <p className="text-[14px] font-semibold leading-[20px] text-[#22376B]">
                      What types of tasks can you help with?
                    </p>
                    <p className="text-[12px] font-normal leading-[18px] text-[#667085]">
                      Select up to 3 task types, or add your own.
                    </p>
                  </div>
                  <div className="flex flex-1 min-w-0 flex-col items-end">
                    <span className="text-[12px] font-normal leading-[18px] text-[#667085] text-right">
                      {selectedTasks.length} of 3 selected
                    </span>
                  </div>
                </div>

                <ScrollArea className="h-[237px] w-full rounded-[5px] border border-[#EAECF0] shadow-[0px_1px_4px_0px_rgba(0,0,0,0.03)]">
                  <div className="flex flex-col gap-[6px] px-[12px] py-[10px]">
                    {scopeTaskTypes.map((task) => {
                      const checked = selectedTasks.includes(task)
                      const atMax = selectedTasks.length >= 3 && !checked
                      const row = (
                        <Button
                          variant="ghost"
                          key={task}
                          disabled={atMax}
                          className={cn(
                            "flex h-auto w-full items-center justify-start gap-[14px] rounded-[5px] border px-[20px] py-[12px] text-left",
                            checked
                              ? "border-[#306CFE] bg-[#E8EEFF] hover:bg-[#E8EEFF]"
                              : "border-[#EAECF0] bg-white hover:bg-gray-50",
                            atMax && "opacity-50 pointer-events-none"
                          )}
                          onClick={() => toggleTask(task)}
                        >
                          <Checkbox
                            size="md"
                            checked={checked}
                            onCheckedChange={() => toggleTask(task)}
                            className="shrink-0 pointer-events-none"
                          />
                          <span className="text-[13px] font-medium capitalize leading-[20px] text-[#344054]">{task}</span>
                        </Button>
                      )
                      if (atMax) {
                        return (
                          <TooltipProvider key={task} delayDuration={150}>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div className="cursor-not-allowed">{row}</div>
                              </TooltipTrigger>
                              <TooltipContent>You can select up to 3 task types. Remove one to choose another.</TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        )
                      }
                      return row
                    })}

                    {/* Other option */}
                    {(() => {
                      const otherAtMax = selectedTasks.length >= 3 && !showOtherTask
                      const otherBtn = (
                        <Button
                          variant="ghost"
                          disabled={otherAtMax}
                          className={cn(
                            "flex h-auto w-full items-center justify-start gap-[14px] rounded-[5px] border px-[20px] py-[12px] text-left",
                            showOtherTask
                              ? "border-[#306CFE] bg-[#E8EEFF] hover:bg-[#E8EEFF]"
                              : "border-[#EAECF0] bg-white hover:bg-gray-50",
                            otherAtMax && "opacity-50 pointer-events-none"
                          )}
                          onClick={() => setShowOtherTask(true)}
                        >
                          <Checkbox
                            size="md"
                            checked={showOtherTask}
                            onCheckedChange={() => setShowOtherTask(true)}
                            className="shrink-0 pointer-events-none"
                          />
                          <span className="text-[13px] font-medium capitalize leading-[20px] text-[#344054]">Other</span>
                        </Button>
                      )
                      if (otherAtMax) {
                        return (
                          <TooltipProvider delayDuration={150}>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div className="cursor-not-allowed">{otherBtn}</div>
                              </TooltipTrigger>
                              <TooltipContent>You can select up to 3 task types. Remove one to choose another.</TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        )
                      }
                      return otherBtn
                    })()}
                  </div>
                </ScrollArea>
              </div>

              {showOtherTask && (
                <div className="flex flex-col gap-[12px]">
                  <div className="flex flex-col gap-[8px] w-full">
                    <div className="flex items-center justify-between">
                      <p className="text-[12px] font-normal leading-[18px] text-[#667085]">Enter your task type</p>
                      <Button
                        variant="ghost"
                        className="h-auto min-w-0 p-0 text-[12px] font-medium leading-[18px] text-[#306CFE] hover:bg-transparent hover:text-[#306CFE] hover:underline"
                        onClick={() => { setShowOtherTask(false); setOtherTaskValue("") }}
                      >
                        Cancel
                      </Button>
                    </div>
                    <div className="flex h-[40px] items-center rounded-[5px] border-[1.5px] border-[#EAECF0] bg-white px-[14px] py-[10px]">
                      <Input
                        className="h-full w-full border-0 p-0 text-[14px] text-[#22376B] shadow-none focus-visible:ring-0 placeholder:text-[#667085]"
                        value={otherTaskValue}
                        onChange={(e) => setOtherTaskValue(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault()
                            addOtherTask()
                          }
                        }}
                        autoFocus
                      />
                    </div>
                  </div>
                  {selectedTasks.length > 0 && (
                    <div className="flex flex-wrap gap-[8px]">
                      {selectedTasks.map((t) => (
                        <Badge key={t} visual="primary" size="sm" variant="rounded" className="pr-1.5">
                          {t}
                          <BadgeCloseButton onClick={() => removeTask(t)}>
                            <X2 className="h-3 w-3" />
                          </BadgeCloseButton>
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ---------- STEP 3: Tell the team about you ---------- */}
          {step === 3 && (
            <div className="flex flex-col gap-[20px]">
              {/* Textarea section — Figma: gap-[10px] between label and field */}
              <div className="flex flex-col gap-[10px]">
                <div className="flex flex-col gap-[2px]">
                  <p className="text-[14px] font-semibold leading-[20px] text-[#22376B]">
                    Briefly describe a relevant project you&apos;ve worked on and your contribution.
                  </p>
                  <p className="text-[12px] font-normal leading-[18px] text-[#667085]">
                    Help the project owner evaluate your relevant experience and skills.
                  </p>
                </div>
                <div className="flex flex-col gap-[6px]">
                  <Textarea
                    className="h-[138px] w-full resize-none rounded-[5px] border-[1.5px] border-[#EAECF0] px-[12.5px] py-[12.5px] text-[14px] leading-[19px] text-[#22376B] placeholder:text-[#B8BAC2]"
                    placeholder="e.g., I led the UI redesign for a fintech app, reducing drop-off by 25%."
                    value={message}
                    onChange={(e) => {
                      if (e.target.value.length <= 400) setMessage(e.target.value)
                    }}
                  />
                  {/* Figma: "Min. 100 characters" left, "0 / 400" right, 12px regular #98A2B3 */}
                  <div className="flex items-center justify-between text-[12px] font-normal text-[#98A2B3]">
                    <span>Min. 100 characters</span>
                    <span>{message.length} / 400</span>
                  </div>
                </div>
              </div>

              {/* Radio question — Figma: gap-[10px] between title and options, gap-[6px] between options */}
              <div className="flex flex-col gap-[10px]">
                <p className="text-[14px] font-semibold leading-[20px] text-[#22376B]">
                  How do you typically start a mobile project?
                </p>
                <div className="flex flex-col gap-[6px]">
                  {radioOptions.map((opt) => (
                    <Button
                      variant="ghost"
                      key={opt}
                      className={cn(
                        "flex h-auto w-full items-center justify-start gap-[10px] rounded-[5px] border px-[12px] py-[10px] text-left",
                        radioAnswer === opt
                          ? "border-[#306CFE] bg-[#E8EEFF] hover:bg-[#E8EEFF]"
                          : "border-[#DEE3ED] bg-white hover:bg-gray-50"
                      )}
                      onClick={() => setRadioAnswer(opt)}
                    >
                      <div
                        className={cn(
                          "flex size-[20px] shrink-0 items-center justify-center rounded-full border-[1.5px]",
                          radioAnswer === opt ? "border-[#306CFE]" : "border-[#D0D5DD]"
                        )}
                      >
                        {radioAnswer === opt && (
                          <div className="size-[10px] rounded-full bg-[#306CFE]" />
                        )}
                      </div>
                      <span className="text-[13px] font-normal text-[#17213D]">{opt}</span>
                    </Button>
                  ))}
                </div>
              </div>

              {/* Tag group 1 — Figma: "Which testing approaches do you use?" + Optional badge */}
              <div className="flex flex-col gap-[10px]">
                <div>
                  <div className="flex items-start justify-between">
                    <p className="text-[14px] font-semibold leading-[20px] text-[#22376B]">
                      Which testing approaches do you use?
                    </p>
                    <span className="flex items-center justify-center rounded-[100px] bg-[#EAECF0] px-[8px] h-[20.5px] text-[11px] font-medium leading-[16.5px] text-[#344054] shrink-0">
                      Optional
                    </span>
                  </div>
                  <p className="text-[12px] font-normal leading-[18px] text-[#667085]">Select all that apply.</p>
                </div>
                <div className="flex flex-wrap gap-[8px]">
                  {tagGroup1Options.map((tag) => {
                    const sel = selectedTags1.includes(tag)
                    return (
                      <Button
                        variant="ghost"
                        key={tag}
                        className={cn(
                          "h-auto min-w-0 rounded-[16px] border px-[10px] py-[4px] text-[12px] font-medium leading-[18px]",
                          sel
                            ? "border-[#306CFE] bg-[#E8EEFF] text-[#306CFE] hover:bg-[#E8EEFF]"
                            : "border-[#D0D5DD] bg-white text-[#344054] hover:bg-gray-50"
                        )}
                        onClick={() =>
                          setSelectedTags1((prev) =>
                            sel ? prev.filter((t) => t !== tag) : [...prev, tag]
                          )
                        }
                      >
                        {tag}
                      </Button>
                    )
                  })}
                </div>
              </div>

              {/* Tag group 2 — Figma: "Which mobile platforms have you shipped products on?" */}
              <div className="flex flex-col gap-[10px]">
                <div>
                  <p className="text-[14px] font-semibold leading-[20px] text-[#22376B]">
                    Which mobile platforms have you shipped products on?
                  </p>
                  <p className="text-[12px] font-normal leading-[18px] text-[#667085]">Select all that apply.</p>
                </div>
                <div className="flex flex-wrap gap-[8px]">
                  {tagGroup2Options.map((tag) => {
                    const sel = selectedTags2.includes(tag)
                    return (
                      <Button
                        variant="ghost"
                        key={tag}
                        className={cn(
                          "h-auto min-w-0 rounded-[16px] border px-[10px] py-[4px] text-[12px] font-medium leading-[18px]",
                          sel
                            ? "border-[#306CFE] bg-[#E8EEFF] text-[#306CFE] hover:bg-[#E8EEFF]"
                            : "border-[#D0D5DD] bg-white text-[#344054] hover:bg-gray-50"
                        )}
                        onClick={() =>
                          setSelectedTags2((prev) =>
                            sel ? prev.filter((t) => t !== tag) : [...prev, tag]
                          )
                        }
                      >
                        {tag}
                      </Button>
                    )
                  })}
                </div>
              </div>
            </div>
          )}

          {/* ---------- STEP 4: Case Studies ---------- */}
          {step === 4 && (
            <div className="flex flex-col gap-[10px]">
              {/* Header — Figma: gap-[2px] between title/subtitle */}
              <div className="flex flex-col gap-[2px]">
                <div className="flex items-center justify-between">
                  <p className="text-[14px] font-semibold leading-[20px] text-[#22376B]">
                    Share case studies from your profile
                  </p>
                  <span className="flex items-center justify-center rounded-[100px] bg-[#EAECF0] px-[8px] h-[20.5px] text-[11px] font-medium leading-[16.5px] text-[#344054] shrink-0">
                    Optional
                  </span>
                </div>
                <p className="text-[12px] font-normal leading-[18px] text-[#667085]">
                  Select up to 3 relevant case studies to share with the project.
                </p>
              </div>

              {/* Search — Figma: h-[36px], border-[#D0D5DD], rounded-[5px], pl-[10px] pr-[12px], shadow-xs */}
              <div className="relative">
                <svg className="absolute left-[10px] top-1/2 -translate-y-1/2 size-[16px] text-[#667085]" width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M14 14L11.1 11.1M12.6667 7.33333C12.6667 10.2789 10.2789 12.6667 7.33333 12.6667C4.38781 12.6667 2 10.2789 2 7.33333C2 4.38781 4.38781 2 7.33333 2C10.2789 2 12.6667 4.38781 12.6667 7.33333Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <Input
                  className="h-[36px] rounded-[5px] border border-[#D0D5DD] bg-white pl-[34px] pr-[12px] py-[10px] text-[14px] leading-[20px] shadow-[0px_1px_2px_0px_rgba(16,24,40,0.05)] placeholder:text-[#667085] placeholder:opacity-50"
                  placeholder="Search case studies"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              {/* Case studies list — inline cards per Figma */}
              <div className="flex flex-col gap-[6px]">
                {/* Empty state — no case studies from profile API yet */}
                <div className="flex h-[100px] items-center justify-center rounded-[5px] border border-[#EAECF0]">
                  <p className="text-[14px] text-[#667085]">No case studies in your portfolio yet</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer — Figma: border-t, p-[12px], justify-between, pl-[12px] inside */}
        <div className="flex items-center justify-between border-t border-[#EAECF0] p-[12px] shrink-0">
          <span className="pl-[12px] text-[14px] font-medium leading-[32px] tracking-[-0.266px] text-[#22376B]">
            Step {typeof step === "number" ? step : ""} of 4
          </span>
          <div className="flex items-center gap-[12px]">
            {typeof step === "number" && step > 1 && (
              <Button
                className="h-[36px] rounded-[5px] bg-[rgba(48,108,254,0.15)] px-[14px] py-[8px] text-[14px] font-semibold capitalize leading-[20px] text-[#306CFE] hover:bg-[rgba(48,108,254,0.25)]"
                onClick={() => setStep((step - 1) as JoinStep)}
              >
                Back
              </Button>
            )}
            {typeof step === "number" && step < 4 && (
              <Button
                className={cn(
                  "h-[36px] rounded-[5px] bg-[#306CFE] px-[14px] py-[8px] text-[14px] font-semibold capitalize leading-[20px] text-white shadow-[0px_1px_2px_0px_rgba(16,24,40,0.05)] hover:bg-[#2558d4]",
                  !canContinue && "opacity-50 pointer-events-none"
                )}
                disabled={!canContinue}
                onClick={() => setStep((step + 1) as JoinStep)}
              >
                Continue
              </Button>
            )}
            {step === 4 && (
              <Button
                className={cn(
                  "h-[36px] rounded-[5px] bg-[#306CFE] px-[14px] py-[8px] text-[14px] font-semibold capitalize leading-[20px] text-white shadow-[0px_1px_2px_0px_rgba(16,24,40,0.05)] hover:bg-[#2558d4]",
                  !canContinue && "opacity-50 pointer-events-none"
                )}
                disabled={busy}
                onClick={handleSubmit}
              >
                {busy ? "Submitting..." : "Continue"}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

const CollapsibleCard = ({
  maxHeight,
  className,
  children,
}: {
  maxHeight: number
  className?: string
  children?: React.ReactNode
}) => {
  const innerRef = useRef<HTMLDivElement>(null)
  const [needsTruncation, setNeedsTruncation] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false)

  useEffect(() => {
    const el = innerRef.current
    if (!el) return
    const check = () => setNeedsTruncation(el.scrollHeight > maxHeight)
    check()
    const ro = new ResizeObserver(check)
    ro.observe(el)
    return () => ro.disconnect()
  }, [maxHeight])

  return (
    <div
      className={cn(
        "relative border border-gray-200 bg-white rounded-lg p-6 shadow-[0px_1px_5px_0px_rgba(16,24,40,.02)] transition-[height] duration-300 overflow-hidden [interpolate-size:allow-keywords]",
        className
      )}
      style={
        needsTruncation && !isExpanded ? { height: maxHeight } : undefined
      }
    >
      <div ref={innerRef}>{children}</div>

      {needsTruncation &&
        (isExpanded ? (
          <div className="flex mt-6 items-center justify-center">
            <Button
              visual="gray"
              variant="link"
              onClick={() => setIsExpanded(false)}
            >
              View Less
            </Button>
          </div>
        ) : (
          <div className="rounded-b-lg absolute inset-x-0 bottom-0 h-[136px] bg-[linear-gradient(180deg,theme(colors.white/0)_0%,theme(colors.white)_60%)] pb-[26px] flex justify-center items-end">
            <Button
              visual="gray"
              variant="link"
              onClick={() => setIsExpanded(true)}
            >
              View More
            </Button>
          </div>
        ))}
    </div>
  )
}

const Inbox = ({ children }: { children?: React.ReactNode }) => {
  const [pinnedChats, setPinnedChats] = React.useState(0)
  const [showPinnedIcon, toggleShowPinnedIcon] = useToggle(false)
  const [checkedChats, setCheckedChats] = React.useState(0)

  const onChatPinned = React.useCallback(
    (value: boolean) =>
      value
        ? setPinnedChats((prev) => prev + 1)
        : setPinnedChats((prev) => prev - 1),
    []
  )

  const onChatChecked = React.useCallback(
    (value: boolean) =>
      value
        ? setCheckedChats((prev) => prev + 1)
        : setCheckedChats((prev) => prev - 1),
    []
  )

  const value = React.useMemo(
    () => ({
      pinnedChats,
      onChatPinned,
      showPinnedIcon,
      toggleShowPinnedIcon,
      onChatChecked,
      checkedChats,
    }),
    [
      pinnedChats,
      onChatPinned,
      showPinnedIcon,
      toggleShowPinnedIcon,
      onChatChecked,
      checkedChats,
    ]
  )

  const [chat, setChat] = React.useState("")
  const [isSaved, setIsSaved] = React.useState(false)

  const onSave = React.useCallback(() => {
    setIsSaved(true)
  }, [])

  const onUnsave = React.useCallback(() => {
    setChat("")
    setIsSaved(false)
  }, [])

  const editContextValue = React.useMemo(
    () => ({
      chat,
      onChatChange: setChat,
      onSave,
      isSaved,
      onUnsave,
    }),
    [chat, setChat, onSave, isSaved, onUnsave]
  )

  return (
    <EditContextProvider value={editContextValue}>
      <ChatsContextProvider value={value}>{children}</ChatsContextProvider>
    </EditContextProvider>
  )
}

// PMCM-402/QA-221: ApiError.body is the raw response text — pull the
// Nest exception's own `message` out of it so a specific rejection (e.g.
// "Project has no team members available to chat with") reaches the user
// instead of a generic string.
const extractApiErrorMessage = (err: unknown, fallback: string): string => {
  if (err instanceof ApiError) {
    try {
      const parsed = JSON.parse(err.body)
      if (typeof parsed?.message === "string") return parsed.message
    } catch {}
  }
  return fallback
}

const Chats = ({
  projectId,
  teamMemberIds = [],
  ownerId,
  initialDraft,
}: {
  projectId?: string
  teamMemberIds?: string[]
  ownerId?: string | null
  initialDraft?: string
}) => {
  const [state, setState] = React.useState<CircularProgressDropzoneState>()
  const [sendingMedia, setSendingMedia] = React.useState(false)
  const [open, toggle] = useToggle(false)
  const router = useRouter()
  const { user, openAuthModal } = useAuth()
  const myId = user?.id ? String(user.id) : ""
  const { toast } = useToast()

  const { onChatChange, chat } = useEditContext()
  const [textareaValue, setTextareaValue] = useControllableState({
    value: chat,
    onChange: onChatChange,
  })

  const onChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    const {
      target: { value },
    } = event
    setTextareaValue(value)
  }
  const [bottomBarRef, bottomBarBounds] = useMeasure()

  const [threadId, setThreadId] = React.useState<string | null>(null)
  const [messages, setMessages] = React.useState<
    Array<{
      id: string
      senderId: string
      content?: string | null
      createdAt: string
      messageType?: string
      attachments?: Array<{
        id: string
        fileUrl: string
        fileType: string
        fileName?: string | null
        fileSize?: number | null
      }>
    }>
  >([])
  const chatBottomRef = React.useRef<HTMLDivElement | null>(null)

  const participantIds = React.useMemo(
    () =>
      Array.from(
        new Set(
          [...(teamMemberIds ?? []).map(String), ownerId ? String(ownerId) : ""].filter(
            Boolean
          )
        )
      ),
    [teamMemberIds, ownerId]
  )

  // Guard against concurrent creates (e.g. double-mount) making duplicate
  // threads — a create in flight is shared by all callers.
  const createInFlight = React.useRef<Promise<string | null> | null>(null)

  const ensureThread = React.useCallback(async () => {
    if (threadId) return threadId
    if (!projectId || !myId) return null
    if (createInFlight.current) return createInFlight.current
    const pending = (async () => {
      const t = await apiFetch<{ id: string }>(`/v1/threads/project`, {
        method: "POST",
        body: { projectId, teamMemberIds: participantIds },
      })
      setThreadId(t.id)
      return t.id
    })()
    createInFlight.current = pending
    try {
      return await pending
    } finally {
      createInFlight.current = null
    }
  }, [threadId, projectId, myId, participantIds])

  // On open, LOAD the visitor's existing thread (if any) so prior chat shows.
  // Do NOT create one from viewing — creation happens on first send.
  React.useEffect(() => {
    if (!myId || !projectId) return
    let cancelled = false
    apiFetch<Array<{ id: string }>>(`/v1/threads?projectId=${projectId}`)
      .then(async (rows) => {
        const existing = rows?.[0]
        if (!existing || cancelled) return
        setThreadId(existing.id)
        const hist = await apiFetch<{ messages: typeof messages }>(
          `/v1/messages/thread/${existing.id}?all=true`
        ).catch(() => ({ messages: [] as typeof messages }))
        if (!cancelled) setMessages(hist?.messages ?? [])
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [myId, projectId])

  const onIncoming = React.useCallback((data: any) => {
    if (!data?.id) return
    setMessages((prev) =>
      prev.some((m) => m.id === data.id) ? prev : [...prev, data]
    )
  }, [])
  useAblyChannel(threadId ?? "", onIncoming)

  React.useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ block: "end" })
  }, [messages])

  // Prefill the composer from the "Ask a Question" input once.
  const draftApplied = React.useRef(false)
  React.useEffect(() => {
    if (!draftApplied.current && initialDraft && initialDraft.trim()) {
      setTextareaValue(initialDraft)
      draftApplied.current = true
    }
  }, [initialDraft, setTextareaValue])

  const handleSend = React.useCallback(async () => {
    const text = (textareaValue ?? "").trim()
    if (!text) return
    if (!myId) {
      openAuthModal("sign-in")
      return
    }
    setTextareaValue("")
    let tid: string | null
    try {
      tid = await ensureThread()
    } catch (err) {
      // PMCM-402/QA-221: this previously propagated uncaught (e.g. the
      // "View as Client" owner-preview case, where the only other
      // "team member" is the owner themself, so the backend's
      // self-excluded team list is empty and thread creation 400s) — the
      // composer had already been cleared above, so the message just
      // silently vanished with nothing sent and no feedback at all.
      setTextareaValue(text)
      toast({
        title: extractApiErrorMessage(err, "Failed to send message. Please try again."),
        variant: "destructive",
      })
      return
    }
    if (!tid) return
    const saved = await apiFetch<{
      id: string
      senderId: string
      content?: string | null
      createdAt: string
    }>(`/v1/messages`, {
      method: "POST",
      body: { threadId: tid, content: text, messageType: "text" },
    }).catch(() => null)
    if (saved?.id) {
      setMessages((prev) =>
        prev.some((m) => m.id === saved.id) ? prev : [...prev, saved]
      )
    } else {
      setTextareaValue(text)
      toast({
        title: "Failed to send message. Please try again.",
        variant: "destructive",
      })
    }
  }, [textareaValue, myId, ensureThread, openAuthModal, setTextareaValue, toast])

  const handleEmojiSelect = React.useCallback(
    (emoji: DataEmoji) => {
      const emojiChar = String.fromCodePoint(
        ...emoji[EmojiProperties.unified]
          .split("-")
          .map((hex) => parseInt(hex, 16))
      )
      setTextareaValue((prev) => (prev || "") + emojiChar)
    },
    [setTextareaValue]
  )

  // PMCM-402/QA-221: the media dialog's Send button previously only closed
  // the dialog (`toggle`) — the picked file was never actually uploaded or
  // attached to any message, so nothing was ever sent.
  const sendAttachment = React.useCallback(
    async (file: File) => {
      if (!myId) {
        openAuthModal("sign-in")
        return false
      }
      let tid: string | null
      try {
        tid = await ensureThread()
      } catch (err) {
        toast({
          title: extractApiErrorMessage(err, "Failed to send attachment. Please try again."),
          variant: "destructive",
        })
        return false
      }
      if (!tid) return false
      const apiBase = getPublicApiUrl() || "http://localhost:4000"
      const formData = new FormData()
      formData.append("file", file)
      formData.append("threadId", tid)
      try {
        const res = await fetch(`${apiBase}/messaging/upload`, {
          method: "POST",
          credentials: "include",
          headers: csrfHeader("POST"),
          body: formData,
        })
        if (!res.ok) throw new Error(await res.text())
        const result = await res.json()
        const saved = result?.message
        if (saved?.id) {
          // The upload response returns the attachment beside the message,
          // not inside it (only the Ably copy carries `attachments`). Merge
          // it in, or the bubble renders empty and the Ably copy is then
          // dropped as a duplicate id.
          const withAttachment = {
            ...saved,
            attachments:
              saved.attachments ??
              (result.attachment ? [result.attachment] : []),
          }
          setMessages((prev) =>
            prev.some((m) => m.id === saved.id)
              ? prev
              : [...prev, withAttachment]
          )
        }
        return true
      } catch (err) {
        console.error("Failed to upload chat attachment:", err)
        toast({
          title: "Failed to send attachment. Please try again.",
          variant: "destructive",
        })
        return false
      }
    },
    [myId, ensureThread, openAuthModal, toast]
  )

  const handleSendMedia = React.useCallback(async () => {
    if (!state?.length) return
    setSendingMedia(true)
    for (const item of state) {
      await sendAttachment(item.data)
    }
    setSendingMedia(false)
    setState(undefined)
    toggle()
  }, [state, sendAttachment, toggle])

  return (
    <div
      className="relative pb-[--bottom-bar-h] h-[calc(theme(height.screen)-113px)]"
      style={{
        ...({
          "--bottom-bar-h": toPxIfNumber(bottomBarBounds.height),
        } as Record<string, string>),
      }}
    >
      <ScrollArea
        onMouseEnter={(event) => {
          const element = event.target as HTMLDivElement
          const win = element.ownerDocument.defaultView
          if (win) {
            const top = element.getBoundingClientRect().top + win.scrollY - 113
            window.scrollTo({
              top,
              behavior: "smooth",
            })
          }
        }}
        className="h-full"
        scrollBar={<ScrollBar className="w-4 p-1" />}
      >
        <div className="p-8 pb-[100px] grid gap-y-6">
          {messages.length === 0 ? (
            <p className="py-8 text-center text-sm text-gray-400">
              {myId
                ? "Start the conversation — ask the team a question about this project."
                : "Log in to ask the team a question about this project."}
            </p>
          ) : (
            (() => {
              let lastDay = ""
              return messages.map((m) => {
                const mine = String(m.senderId) === myId
                const day = formatChatDay(m.createdAt)
                const showDay = day !== lastDay
                lastDay = day
                return (
                  <React.Fragment key={m.id}>
                    {showDay && (
                      <div className="flex gap-x-3 py-6 items-center">
                        <span className="inline-block bg-gray-200 flex-auto h-px" />
                        <span className="text-xs leading-[14.52px] font-medium text-gray-500">
                          {day}
                        </span>
                        <span className="inline-block bg-gray-200 flex-auto h-px" />
                      </div>
                    )}
                    <div className={cn("flex", mine ? "justify-end" : "justify-start")}>
                      <div
                        className={cn(
                          "max-w-[70%] rounded-lg px-4 py-3",
                          mine ? "bg-primary-50" : "bg-gray-50"
                        )}
                      >
                        {m.attachments?.[0] && (
                          <MessageAttachmentView attachment={m.attachments[0]} />
                        )}
                        {m.messageType === "gif" && m.content ? (
                          <img
                            src={m.content}
                            alt="GIF"
                            className="rounded-md w-60 h-auto max-h-80"
                          />
                        ) : (
                          m.content && (
                            <p className="text-sm text-dark-blue-400">
                              {m.content}
                            </p>
                          )
                        )}
                        <p
                          className={cn(
                            "mt-1 text-xs text-gray-400",
                            mine && "text-right"
                          )}
                        >
                          Sent {formatChatTime(m.createdAt)}
                        </p>
                      </div>
                    </div>
                  </React.Fragment>
                )
              })
            })()
          )}
          <div ref={chatBottomRef} />
        </div>
      </ScrollArea>

      <div
        ref={bottomBarRef}
        className="p-3 flex min-h-[68px] bg-white items-end gap-x-3 absolute bottom-0 inset-x-0"
      >
        <div className="flex items-center gap-x-1">
          <EmojiPicker onEmojiSelect={handleEmojiSelect}>
            <IconButton
              className="rounded-full text-gray-500"
              visual="gray"
              variant="ghost"
              size="lg"
            >
              <Smile className="size-[22px]" />
            </IconButton>
          </EmojiPicker>

          <Dialog open={open} onOpenChange={toggle}>
            <DialogTrigger asChild>
              <IconButton
                className="rounded-full text-gray-500"
                visual="gray"
                variant="ghost"
                size="lg"
              >
                <Image03 className="size-[22px]" />
              </IconButton>
            </DialogTrigger>
            <DialogContent className="max-w-[467px] p-4">
              <h3 className="text-xs text-gray-900 leading-[14.52px] font-semibold">
                Upload Files
              </h3>
              <DialogClose asChild>
                <IconButton
                  className="absolute rounded-full top-[3px] right-[3px] text-gray-800/50 hover:text-gray-900"
                  visual="gray"
                  variant="ghost"
                >
                  <X className="size-4" />
                </IconButton>
              </DialogClose>

              <div className="mt-[9px]">
                <CircularProgressDropzone
                  icon
                  value={state}
                  onChange={setState}
                />
              </div>

              <div className="mt-[120px] grid grid-cols-2 gap-x-3">
                <DialogClose asChild>
                  <Button visual="gray" variant="outlined">
                    Cancel
                  </Button>
                </DialogClose>
                <Button
                  visual="primary"
                  variant="filled"
                  disabled={!Boolean(state?.length) || sendingMedia}
                  onClick={Boolean(state?.length) ? handleSendMedia : noop}
                >
                  {sendingMedia ? "Sending..." : "Send"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <IconButton
                className="rounded-full text-gray-500"
                visual="gray"
                variant="ghost"
                size="lg"
              >
                <Attachment01 className="size-[22px]" />
              </IconButton>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-[212px]">
              <DropdownMenuItem>
                <UploadCloud className="size-6" /> Upload from Desktop
              </DropdownMenuItem>
              <DropdownMenuItem>
                <DropboxBrand className="size-6" /> Upload via Dropbox
              </DropdownMenuItem>
              <DropdownMenuItem>
                <GoogleDrive1Brand className="size-6" /> Upload via Google Drive
              </DropdownMenuItem>

              <DropdownMenuItem>
                <MsOnedriveBrand className="size-6" /> Upload via OneDrive
              </DropdownMenuItem>

              <DropdownMenuArrow className="fill-white" />
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <InputGroup className="flex-auto w-[calc(theme(size.full)-164px)]">
          <Textarea
            placeholder="Send message..."
            className="[field-sizing:content] h-auto pr-11 w-full"
            value={textareaValue}
            onChange={onChange}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault()
                if (textareaValue) handleSend()
              }
            }}
          />
          <InputRightElement className="items-end pb-[13px]">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger
                  className="focus-visible:outline-none text-gray-500 hover:disabled:text-gray-500/50 hover:text-primary-500 disabled:text-gray-500/50"
                  onClick={() => textareaValue && handleSend()}
                  disabled={!textareaValue}
                >
                  <Send className="size-[18px]" />
                </TooltipTrigger>

                <TooltipContent>
                  {textareaValue ? "Send" : "Edit"}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </InputRightElement>
        </InputGroup>
      </div>
    </div>
  )
}

const formatChatDay = (iso?: string) =>
  iso
    ? new Date(iso).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : ""

const formatChatTime = (iso?: string) =>
  iso
    ? new Date(iso).toLocaleTimeString(undefined, {
        hour: "numeric",
        minute: "2-digit",
      })
    : ""

const US_STATE_CODES = new Set([
  "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA", "HI", "ID", "IL",
  "IN", "IA", "KS", "KY", "LA", "ME", "MD", "MA", "MI", "MN", "MS", "MO", "MT",
  "NE", "NV", "NH", "NJ", "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI",
  "SC", "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY", "DC",
])
const COUNTRY_LABELS: Record<string, string> = {
  "united states": "United States",
  usa: "United States",
  "united kingdom": "United Kingdom",
  uk: "United Kingdom",
  canada: "Canada",
  vietnam: "Vietnam",
  india: "India",
  pakistan: "Pakistan",
  australia: "Australia",
  germany: "Germany",
  france: "France",
  spain: "Spain",
  netherlands: "Netherlands",
  brazil: "Brazil",
}
const formatMemberLocation = (loc?: string | null): string | null => {
  if (!loc) return null
  const raw = String(loc).trim()
  if (!raw) return null
  const stateMatch = raw.match(/,\s*([A-Za-z]{2})\.?$/)
  if (stateMatch && US_STATE_CODES.has(stateMatch[1].toUpperCase())) {
    return "United States"
  }
  const lower = raw.toLowerCase()
  for (const [name, label] of Object.entries(COUNTRY_LABELS)) {
    if (lower === name || lower.includes(name)) return label
  }
  return raw
}

const toVideoThumb = (raw?: string | null): string => {
  if (!raw) return ""
  const yt = raw.match(
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)([\w-]{11})/
  )
  if (yt) return `https://img.youtube.com/vi/${yt[1]}/hqdefault.jpg`
  return ""
}

const isDirectVideoFile = (raw?: string | null): boolean =>
  !!raw && /\.(mp4|webm|ogg|ogv|mov|m4v)(\?|#|$)/i.test(raw)

const DEFAULT_SUGGESTED_QUESTIONS = [
  "Can I see your portfolio?",
  "What is your typical turnaround time?",
  "Do you offer revisions?",
  "How do we communicate during the project?",
]

const VideoThumb = ({
  url,
  alt,
}: {
  url?: string | null
  alt: string
}): React.JSX.Element | null => {
  const yt = toVideoThumb(url)
  if (yt) {
    return (
      <img
        src={yt}
        alt={alt}
        className="absolute inset-0 h-full w-full object-cover"
      />
    )
  }
  if (isDirectVideoFile(url)) {
    return (
      <video
        src={url ?? undefined}
        muted
        playsInline
        preload="metadata"
        className="absolute inset-0 h-full w-full object-cover"
      />
    )
  }
  return null
}

// Derive a readable name from an R2 media URL, whose filenames follow
// "{OriginalName}_{timestamp}-{uuid}.{ext}". Falls back to the given value.
const mediaName = (raw?: string | null, fallback = ""): string => {
  if (!raw) return fallback
  try {
    const file = decodeURIComponent(raw.split("?")[0].split("/").pop() ?? "")
    let base = file.replace(/\.[a-z0-9]+$/i, "")
    base = base.replace(/_\d{13}.*$/, "")
    base = base.replace(
      /[-_][0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
      ""
    )
    const name = base.replace(/[-_]+/g, " ").trim()
    return name || fallback
  } catch {
    return fallback
  }
}

function LocationList({ locations }: { locations: string[] }) {
  const [expanded, setExpanded] = React.useState(false)
  const countries = React.useMemo(
    () => Array.from(new Set(locations.map(countryOf).filter(Boolean))),
    [locations]
  )
  const visible = expanded ? countries : countries.slice(0, 3)
  const extra = countries.length - visible.length
  return (
    <div className="flex items-center gap-1 overflow-hidden">
      {visible.map((c, i) => (
        <NextLink
          key={c}
          href={`/talent?location=${encodeURIComponent(c)}`}
          className="shrink-0 focus-visible:outline-none duration-300 transition hover:underline text-sm leading-6 font-semibold text-dark-blue-400"
        >
          {c}
          {i < visible.length - 1 || extra > 0 ? "," : ""}
        </NextLink>
      ))}
      {extra > 0 && (
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="shrink-0 text-sm leading-6 font-semibold text-primary-500 hover:underline focus-visible:outline-none"
        >
          and {extra} more
        </button>
      )}
    </div>
  )
}

const CarouselPreviousTrigger = () => {
  const { canScrollPrev } = useCarousel()
  return canScrollPrev ? (
    <CarouselPrevious
      className="border-gray-300 bg-white shadow-[0px_1px_4px_0px_rgba(0,0,0,.03)] size-8 hover:ring-1 hover:ring-dark-blue-400 hover:text-dark-blue-400 text-gray-500 disabled:opacity-50 transition duration-300 -left-[13.75px]"
      indicatorClassName="size-5"
    />
  ) : null
}

const CarouselNextTrigger = () => {
  const { canScrollNext } = useCarousel()
  return canScrollNext ? (
    <CarouselNext
      className="border-gray-300 bg-white shadow-[0px_1px_4px_0px_rgba(0,0,0,.03)] size-8 hover:ring-1 hover:ring-dark-blue-400 hover:text-dark-blue-400 text-gray-500 disabled:opacity-50 transition duration-300 -right-[13.75px]"
      indicatorClassName="size-5"
    />
  ) : null
}

const renderProjectStaticIcon = (
  icon: ProjectStaticIcon,
  className: string
) => {
  switch (icon) {
    case "rocket":
      return <Rocket02 className={className} />
    case "shield-dollar":
      return <ShieldDollar className={className} />
    case "shield-zap":
    default:
      return <ShieldZap className={className} />
  }
}

const Shimmer = ({ className }: { className?: string }) => (
  <div
    className={cn("relative bg-gray-100 rounded overflow-hidden", className)}
  >
    <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-gray-100 via-white to-gray-100" />
  </div>
)

const listingCollaborators = (item: any): string[] => {
  const candidates =
    item?.teamAvatars ??
    item?.teamMembers ??
    item?.collaborators ??
    item?.assignedUsers ??
    item?.providers ??
    []
  if (!Array.isArray(candidates)) return []
  return candidates
    .map((member: any) =>
      typeof member === "string"
        ? member
        : member?.avatarUrl ??
          member?.avatar_url ??
          member?.avatar ??
          member?.photo ??
          member?.image ??
          member?.profileImageUrl
    )
    .filter((avatarUrl: any): avatarUrl is string => Boolean(avatarUrl))
    .slice(0, 4)
}

export default function ProjectDetails({
  isPreview = false,
  onEdit,
}: {
  isPreview?: boolean
  onEdit?: () => void
} = {}) {
  const params = useParams()
  const router = useRouter()
  const { user, openAuthModal } = useAuth()
  const { toast } = useToast()
  // PMCM-402/QA-190: openAuthModal() only opens the modal — it doesn't
  // expose a callback/promise for "and then do X on success". The signal
  // it does expose, without touching its internals, is `user` itself: it
  // flips from falsy to a real object the moment a login (any method)
  // succeeds. Remembering the action here and firing it on that flip is
  // what makes Start Project / Ask a Question / Save resume instead of
  // stranding the visitor on the listing after they log in.
  const pendingActionRef = React.useRef<(() => void) | null>(null)
  const promptSignIn = React.useCallback(
    (action: () => void) => {
      pendingActionRef.current = action
      openAuthModal("sign-in")
    },
    [openAuthModal]
  )
  React.useEffect(() => {
    if (user?.id && pendingActionRef.current) {
      const action = pendingActionRef.current
      pendingActionRef.current = null
      action()
    }
  }, [user?.id])
  const [project, setProject] = React.useState<any>(null)
  const [loading, setLoading] = React.useState(true)
  // PMCM-259/E1: a real 404 (nothing matched) keeps the existing "Project
  // not found" state below; this is only set on a network/5xx failure, so
  // Retry (bumping refetchKey) shows a distinct full-page error instead.
  const [loadError, setLoadError] = React.useState(false)
  const [refetchKey, setRefetchKey] = React.useState(0)
  const [claimed, setClaimed] = React.useState(false)
  const [claimStep, setClaimStep] = React.useState<"closed" | "confirm" | "done" | "blocked">("closed")
  const [claimBusy, setClaimBusy] = React.useState(false)
  const [claimError, setClaimError] = React.useState<string | null>(null)
  const [claimBlockedReason, setClaimBlockedReason] = React.useState("")

  // Join-request state (talent accounts only)
  const [joinStatus, setJoinStatus] = React.useState<JoinRequestStatus>("none")
  const [joinBusy, setJoinBusy] = React.useState(false)
  const [joinDialogOpen, setJoinDialogOpen] = React.useState(false)

  // Derive unique roles and task titles from project scope for the join dialog
  const scopeRoles = React.useMemo(() => {
    const scopeArr = Array.isArray((project as any)?.scope) ? (project as any).scope : []
    const roles = new Set<string>()
    for (const phase of scopeArr) {
      const rows = ((phase?.rows ?? phase?.tasks ?? []) as any[]) ?? []
      for (const row of rows) {
        const role = (row?.role ?? row?.roleName ?? "").trim()
        if (role) roles.add(role)
      }
    }
    return Array.from(roles)
  }, [project])

  const scopeTaskTypes = React.useMemo(() => {
    const scopeArr = Array.isArray((project as any)?.scope) ? (project as any).scope : []
    const tasks = new Set<string>()
    for (const phase of scopeArr) {
      const rows = ((phase?.rows ?? phase?.tasks ?? []) as any[]) ?? []
      for (const row of rows) {
        const raw = (row?.task ?? row?.taskName ?? row?.title ?? "").trim()
        if (raw) tasks.add(raw.split(/\s+/).slice(0, 2).join(" "))
      }
    }
    return Array.from(tasks)
  }, [project])

  const openClaimDialog = React.useCallback(() => {
    const check = checkClaimLimit()
    if (!check.allowed) {
      setClaimBlockedReason(check.reason)
      setClaimStep("blocked")
      return
    }
    openClaimDialog()
  }, [])

  const handlePageClaim = React.useCallback(async () => {
    if (!project?.id) return
    setClaimBusy(true)
    setClaimError(null)
    try {
      await claimProject(String(project.id))
      recordClaim(String(project.id))
      setClaimed(true)
      setRefetchKey((k) => k + 1)
      setClaimStep("done")
    } catch (e: any) {
      setClaimError(e?.message ?? "Could not claim this project right now")
    } finally {
      setClaimBusy(false)
    }
  }, [project?.id])
  const [selected, setSelected] = React.useState<string>("Details")
  const [pendingQuestion, setPendingQuestion] = React.useState("")
  const [askErrored, setAskErrored] = React.useState(false)
  const [showAskErrorMsg, setShowAskErrorMsg] = React.useState(false)
  const [askModalOpen, setAskModalOpen] = React.useState(false)
  const [startProjectDialogOpen, setStartProjectDialogOpen] =
    React.useState(false)
  const [lightboxOpen, setLightboxOpen] = React.useState(false)
  const [selectedMediaIndex, setSelectedMediaIndex] = React.useState(0)
  const toggleShareWindow = useShareWindowStore((s) => s.toggle)
  const toggleReportWindow = useReportWindowStore((s) => s.toggle)
  const { isOnline } = useOnlineUsers()

  // Real online presence for the team (PL-CV-10 / doc 12): green indicator when
  // ≥1 assigned team member is online; their names are surfaced.
  const onlineTeam = React.useMemo(
    () =>
      ((project as any)?.team ?? []).filter((m: any) =>
        isOnline(String(m.userId ?? m.id ?? ""))
      ),
    [project, isOnline]
  )

  const mediaItems = React.useMemo(() => {
    const items: { type: "video" | "image"; url: string }[] = []
    const video =
      ((project as any)?.videoUrl as string | undefined) ||
      ((project as any)?.featuredVideo as string | undefined)
    if (video) items.push({ type: "video", url: video })
    const gallery =
      ((project as any)?.mediaUrls as string[] | undefined)?.slice(1) ?? []
    gallery.forEach((url) => items.push({ type: "image", url }))
    return items
  }, [project])

  const openLiveChat = React.useCallback(
    (question?: string) => {
      if (!user?.id) {
        promptSignIn(() => openLiveChat(question))
        return
      }
      if (question !== undefined) setPendingQuestion(question)
      setSelected("Live Chat")
    },
    [user?.id, promptSignIn]
  )

  const handleAsk = React.useCallback(() => {
    if (!user?.id) {
      setAskModalOpen(false)
      promptSignIn(() => handleAsk())
      return
    }
    if (pendingQuestion.trim()) {
      setAskModalOpen(false)
      openLiveChat()
    } else {
      setAskErrored(true)
      setShowAskErrorMsg(true)
    }
  }, [user?.id, pendingQuestion, openLiveChat, promptSignIn])

  const [suggestedQuestions, setSuggestedQuestions] = React.useState<string[]>(
    DEFAULT_SUGGESTED_QUESTIONS
  )
  React.useEffect(() => {
    const pid = project?.id ? String(project.id) : ""
    if (!pid) return
    let cancelled = false
    ProjectAPI.GetSuggestedQuestions(pid)
      .then((res) => {
        if (cancelled) return
        const data = Array.isArray(res?.data) ? res.data : []
        if (data.length) setSuggestedQuestions(data)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [project?.id])

  // Owner viewing their own listing shouldn't be able to ask questions on it
  // (Chris: "hide that for your own"). True in view-as-client preview, or when
  // the logged-in user is the project owner.
  const isOwnerViewing =
    isPreview ||
    (!!user?.id &&
      String((project as any)?.ownerId ?? (project as any)?.userId ?? "") ===
        String(user.id))
  const projectOwnerId = String(
    (project as any)?.ownerId ?? (project as any)?.userId ?? ""
  )

  const [ownerProfile, setOwnerProfile] = React.useState<any>(null)

  React.useEffect(() => {
    if (!projectOwnerId) {
      setOwnerProfile(null)
      return
    }
    let cancelled = false
    UserAPI.getProfile(projectOwnerId)
      .then((res) => {
        if (cancelled) return
        setOwnerProfile(res?.data ?? null)
      })
      .catch(() => {
        if (!cancelled) setOwnerProfile(null)
      })
    return () => {
      cancelled = true
    }
  }, [projectOwnerId])

  const currentTeam = React.useMemo(() => {
    const base = Array.isArray((project as any)?.team)
      ? [...(project as any).team]
      : []
    const ownerId = projectOwnerId
    const hasOwner = base.some((m: any) => {
      const mid = String(m?.userId ?? m?.id ?? "")
      return m?.role === "owner" || (!!ownerId && mid === ownerId)
    })
    const viewerIsOwner = !!user?.id && !!ownerId && String(user.id) === ownerId
    const src =
      ownerProfile ?? (viewerIsOwner ? user : null)
    if (!hasOwner && src) {
      const skills = Array.isArray((src as any).skills)
        ? (src as any).skills.map((s: any) => s?.name ?? s).filter(Boolean)
        : []
      const languages = Array.isArray((src as any).languages)
        ? (src as any).languages.map((l: any) => l?.name ?? l).filter(Boolean)
        : []
      base.unshift({
        id: (src as any).id ?? ownerId,
        userId: (src as any).id ?? ownerId,
        firstName:
          (src as any).firstName ?? (src as any).username ?? "Owner",
        username: (src as any).username ?? "",
        avatarUrl: (src as any).avatarUrl ?? null,
        location:
          (src as any).location ?? (src as any).country ?? null,
        languages,
        skills,
        role: "owner",
        isLead: true,
        isOnline: true,
      })
    }
    // Optimistic: if the user just claimed but the re-fetch hasn't arrived,
    // inject them so the claim UI disappears immediately.
    if (claimed && base.length === 0 && user?.id) {
      base.push({
        id: String(user.id),
        userId: String(user.id),
        firstName:
          (user as any).firstName || (user as any).username || "You",
        username: (user as any).username || "",
        avatarUrl: (user as any).avatarUrl ?? null,
        location: (user as any).location ?? null,
        languages: [],
        skills: [],
        role: "owner",
        isLead: true,
        isOnline: true,
      })
    }
    const isOwnerMember = (m: any) =>
      m?.role === "owner" ||
      (!!ownerId && String(m?.userId ?? m?.id ?? "") === ownerId)
    return [...base].sort(
      (a, b) => (isOwnerMember(a) ? 0 : 1) - (isOwnerMember(b) ? 0 : 1)
    )
  }, [project, user, ownerProfile, projectOwnerId, claimed])

  const [tabsRef, isSticky] = useMakeFixedBehaveSticky<HTMLDivElement>()
  const [isFavorited, setIsFavorited] = React.useState(false)
  // PMCM-259/E2: guards against a stale response winning when the user
  // toggles again before the first request settles — only the latest
  // request's outcome is allowed to revert/toast.
  const favoriteRequestIdRef = React.useRef(0)
  // PMCM-258/AC5: default is "biweekly" per spec; the stored
  // project.pricingPeriod (the seller's choice) wins when present and still
  // valid for this listing's duration. The toggle itself stays local/
  // real-time (N2) — nothing here saves back from the buyer side.
  const [selectedPeriod, setSelectedPeriod] =
    React.useState<PricingPeriod>("biweek")
  const pricingPeriodHydratedRef = React.useRef<string | null>(null)
  const [activeAnchor, setActiveAnchor] = React.useState("Description")

  // --- Sidebar pricing (docs §01, §14) ---
  // PMCM-258: duration day-counting and the per-period cost math now come
  // from the shared frontend/lib/listing-pricing.ts module instead of this
  // page's own copy. That copy never handled a "months" task duration
  // (treated it as raw days) and used Math.round instead of the shared
  // module's Math.ceil, and gated Quarter/Year behind 90/360-day
  // thresholds instead of the spec's "quarter always available, year at
  // >=364 days" rule — see the PMCM-258 report for the full before/after.
  const sidebarPricing = React.useMemo(() => {
    if (!project) return null
    // Budget (docs §14.7): compute from the scope when it's populated — same
    // helper/rate-card as the edit view — so both views show the same number.
    // Fall back to a stored price only when there's no scope to price.
    const pricingCostCents = Number(project.budgetUsdCents) || 0
    const computedCents = estimateScopeBudgetCents(project.scope)
    const totalCostCents =
      pricingCostCents > 0
        ? pricingCostCents
        : computedCents > 0
          ? computedCents
          : Math.round(Number(project.priceMin ?? project.budget ?? 0) * 100)
    const totalCost = totalCostCents / 100

    // Derive duration + roles from scope (matches edit mode). Handles both the
    // published shape (phase.tasks / roleName) and the draft shape (phase.rows / role).
    const scopeArr = Array.isArray(project.scope) ? project.scope : []
    let memberSlots = 0
    for (const phase of scopeArr) {
      const rows = ((phase?.rows ?? phase?.tasks ?? []) as any[]) ?? []
      for (const row of rows) {
        const role = row?.role ?? row?.roleName
        if (role || row?.task || row?.taskName) memberSlots++
      }
    }
    const totalDays = scopeDurationDays(scopeArr as any)

    // Fall back to the baked project.duration / durationMonths when scope has no durations.
    let effDays = totalDays
    if (effDays <= 0) {
      const durationWeeks = parseInt(String(project.duration ?? ""), 10) || 0
      if (durationWeeks > 0) {
        effDays = Math.round(durationWeeks * 7)
      } else if (Number(project.durationMonths) > 0) {
        effDays = Math.round(Number(project.durationMonths) * 30)
      }
    }

    const isServiceScope =
      project.listingType === "service" ||
      scopeArr.some(
        (p: any) =>
          p?.phaseType === "setup" ||
          p?.phaseType === "recurring" ||
          p?.phaseType === "ongoing"
      )

    const periodOptions = availablePeriods(effDays, isServiceScope).map(
      (period) => ({
        label: PERIOD_WIDGET_LABELS[period],
        value: period,
        cost: costPerPeriod(totalCostCents, effDays, period),
      })
    )

    const formattedDuration = formatDuration(effDays)

    return {
      totalCost,
      periodOptions,
      minTeamMembers: memberSlots,
      formattedDuration,
      isServiceScope,
      effDays,
    }
  }, [project])

  // PMCM-258/AC5: hydrate the period toggle from the stored
  // project.pricingPeriod once sidebarPricing (and therefore effDays/
  // isServiceScope) is known; falls back to biweek per spec when unset or
  // no longer valid for this listing's duration.
  React.useEffect(() => {
    if (!project || !sidebarPricing) return
    const projectKey = String((project as any)?.id ?? "")
    if (pricingPeriodHydratedRef.current === projectKey) return
    pricingPeriodHydratedRef.current = projectKey
    const stored = (project as any)?.pricingPeriod
    setSelectedPeriod(
      resolvePeriod(
        stored ?? null,
        sidebarPricing.effDays,
        sidebarPricing.isServiceScope,
        "biweek"
      )
    )
  }, [project, sidebarPricing])

  React.useEffect(() => {
    // PMCM-259/E2: anonymous visitors can never have a saved favorite —
    // skip the call entirely instead of firing a request that always
    // 401s (no visible noise either way, since findFavoriteByItemId
    // already swallows a non-ok response, but there's no reason to ask).
    if (!project?.id || !user?.id) {
      setIsFavorited(false)
      return
    }
    findFavoriteByItemId(String(project.id)).then((fav) => {
      setIsFavorited(!!fav)
    })
  }, [project?.id, user?.id])

  const handleFavoriteToggle = async (pressed: boolean) => {
    if (!user?.id) {
      promptSignIn(() => handleFavoriteToggle(pressed))
      return
    }
    const previous = isFavorited
    setIsFavorited(pressed)
    const requestId = ++favoriteRequestIdRef.current
    const itemId = String(project.id)
    const type = project.listingType === "service" ? "service" : "project"
    let succeeded = false
    try {
      if (pressed) {
        succeeded = !!(await addFavorite({ type, itemId }))
      } else {
        const fav = await findFavoriteByItemId(itemId)
        succeeded = fav ? await removeFavorite(fav.id) : true
      }
    } catch {
      succeeded = false
    }
    // A later toggle has already superseded this request — its own
    // result (not this stale one) owns the UI state, so do nothing.
    if (favoriteRequestIdRef.current !== requestId) return
    if (!succeeded) {
      setIsFavorited(previous)
      toast({
        variant: "destructive",
        title: "Unable to save this listing. Please try again.",
      })
    }
  }

  React.useEffect(() => {
    async function fetchProject() {
      setLoading(true)
      setLoadError(false)
      let sawServerError = false
      try {
        const rawSlug = params.slug as string
        // URLs are generated as `${slug}-${shortId}` but the shortId may be
        // a short numeric CMS id (e.g. "55") or an 8-char hex UUID prefix.
        // Try the full URL slug first, then fall back to stripping the
        // trailing id segment.
        const parts = rawSlug.split("-")
        const stripped =
          parts.length > 1 ? parts.slice(0, -1).join("-") : rawSlug
        const candidates = Array.from(new Set([rawSlug, stripped]))

        // Try fetching from listings-service via gateway
        const apiBase = getPublicApiUrl() || "http://localhost:4000"
        let res: Response | null = null
        let slug = rawSlug
        for (const candidate of candidates) {
          const r = await fetch(`${apiBase}/v1/projects/slug/${candidate}`, { cache: 'no-store', credentials: 'include' })
          if (r.ok) {
            res = r
            slug = candidate
            break
          }
        }
        if (!res) {
          // last attempt — assign the final failing response so the fallback
          // branches below can run against the last tried slug
          res = await fetch(`${apiBase}/v1/projects/slug/${slug}`, { cache: 'no-store', credentials: 'include' })
        }
        if (!res.ok) {
          if (res.status !== 404) sawServerError = true
          // Try as a service. Service URLs are also generated as
          // `${slug}-${shortId}`, while the API expects the plain slug.
          let svcRes: Response | null = null
          for (const candidate of candidates) {
            const r = await fetch(`${apiBase}/v1/services/slug/${candidate}`, { credentials: 'include' })
            if (r.ok) {
              svcRes = r
              break
            }
          }
          if (!svcRes) {
            svcRes = await fetch(`${apiBase}/v1/services/slug/${slug}`, { credentials: 'include' })
          }
          if (!svcRes.ok) {
            if (svcRes.status !== 404) sawServerError = true
            // If rawSlug looks like a UUID, try the publish/draft endpoint
            // so "View as Client" works for unpublished drafts
            const isUuid =
              /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
                rawSlug
              )
            if (isUuid) {
              try {
                const draftRes = await ProjectAPI.GetProjectDraft(rawSlug)
                if (draftRes?.data) {
                  const d = draftRes.data
                  let featuredImage: string | null = null
                  let featuredVideo: string | null = null
                  const galleryUrls: string[] = []
                  const hiddenUrls: string[] = []
                  if (d.media) {
                    const mediaObj = Array.isArray(d.media)
                      ? d.media[0]
                      : d.media
                    if (mediaObj?.featuredImage)
                      featuredImage = mediaObj.featuredImage
                    if (mediaObj?.featuredVideo)
                      featuredVideo = mediaObj.featuredVideo
                    if (Array.isArray(mediaObj?.additionalImages))
                      galleryUrls.push(...mediaObj.additionalImages)
                    if (Array.isArray(mediaObj?.hiddenImages))
                      hiddenUrls.push(...mediaObj.hiddenImages)
                  }
                  // PMCM-256 follow-up: gallery slots now persist "" in
                  // place of a removed image (so other slots don't shift
                  // in the editor) — a buyer-facing page must never render
                  // one of those as an empty gallery tile.
                  const visibleGallery = galleryUrls.filter(
                    (u) => u && !hiddenUrls.includes(u)
                  )
                  const composedMediaUrls = featuredImage
                    ? [featuredImage, ...visibleGallery]
                    : Array.isArray(d.mediaUrls)
                      ? d.mediaUrls
                      : visibleGallery
                  const composedSubcategories = Array.isArray(d.subcategories)
                    ? d.subcategories
                    : Array.isArray(d.subCategories)
                      ? d.subCategories
                      : Array.isArray(d.categorySelections)
                        ? d.categorySelections.flatMap(
                            (c: any) => c?.subCategories ?? []
                          )
                        : []
                  const durToDays = (dur: any): number => {
                    if (!dur) return 0
                    if (typeof dur === "object") {
                      const v = Number(dur.value) || 0
                      return dur.type === "weeks"
                        ? v * 7
                        : dur.type === "months"
                          ? v * 30
                          : dur.type === "hours"
                            ? Math.max(1, Math.ceil(v / 24))
                            : v
                    }
                    const [rv, ru] = String(dur).trim().split(/\s+/)
                    const v = Number(rv) || 0
                    const u = (ru || "days").toLowerCase()
                    return u.startsWith("week")
                      ? v * 7
                      : u.startsWith("month")
                        ? v * 30
                        : u.startsWith("hour")
                          ? Math.max(1, Math.ceil(v / 24))
                          : v
                  }
                  // The draft endpoint loads tasks from the relational table,
                  // which stores `duration` (e.g. "2 weeks") but no
                  // estimatedHours. Derive hours from duration (40 hrs/week,
                  // 8 hrs/day) so the scope viewer shows real hours, not 0.
                  const durHours = (dur: any): number => {
                    if (!dur) return 0
                    if (typeof dur === "object") {
                      const v = Number(dur.value) || 0
                      if (v <= 0) return 0
                      return dur.type === "weeks"
                        ? v * 40
                        : dur.type === "months"
                          ? v * 160
                          : dur.type === "hours"
                            ? v
                            : v * 8
                    }
                    const [rv, ru] = String(dur).trim().split(/\s+/)
                    const v = Number(rv) || 0
                    const u = (ru || "days").toLowerCase()
                    return u.startsWith("week")
                      ? v * 40
                      : u.startsWith("month")
                        ? v * 160
                        : u.startsWith("hour")
                          ? v
                          : v * 8
                  }
                  const draftPhases: any[] = Array.isArray(d.scope)
                    ? d.scope
                    : []
                  const normalizedScope = draftPhases.map(
                    (ph: any, i: number) => ({
                      phaseName:
                        ph.phaseName ??
                        ph.name ??
                        ph.stageName ??
                        `Phase ${i + 1}`,
                      order: ph.order ?? i,
                      phaseType: ph.phaseType ?? undefined,
                      recurrenceSchedule: ph.recurrenceSchedule ?? undefined,
                      recurrenceCount: ph.recurrenceCount ?? undefined,
                      tasks: (ph.tasks ?? ph.task ?? []).map((t: any) => ({
                        title: t.title ?? t.taskName ?? "",
                        roleName: t.roleName ?? t.role ?? "",
                        location: Array.isArray(t.location)
                          ? t.location
                          : t.location
                            ? [t.location]
                            : [],
                        experienceLevel:
                          t.experienceLevel ??
                          (Array.isArray(t.experience)
                            ? t.experience[0]
                            : t.experience) ??
                          "Medior",
                        estimatedHours:
                          Number(t.estimatedHours) || durHours(t.duration),
                        duration:
                          typeof t.duration === "string"
                            ? t.duration
                            : undefined,
                      })),
                    })
                  )
                  let draftTotalDays = 0
                  for (const ph of draftPhases) {
                    let phaseDays = 0
                    for (const t of ph.tasks ?? ph.task ?? [])
                      phaseDays = Math.max(phaseDays, durToDays(t.duration))
                    draftTotalDays += phaseDays
                  }
                  const draftWeeks =
                    draftTotalDays > 0
                      ? Math.max(1, Math.ceil(draftTotalDays / 7))
                      : 0
                  setProject({
                    ...d,
                    scope: normalizedScope.length ? normalizedScope : d.scope,
                    duration:
                      d.duration ??
                      (draftWeeks > 0 ? String(draftWeeks) : undefined),
                    role:
                      d.category || d.categories?.[0] || "Software Development",
                    summary: d.shortDescription || d.fullDescription || "",
                    description: d.fullDescription || "",
                    featuredImage: featuredImage || d.featuredImage || null,
                    featuredVideo:
                      featuredVideo || d.featuredVideo || d.videoUrl || null,
                    mediaUrls: composedMediaUrls,
                    subcategories: composedSubcategories,
                    programmingLanguages:
                      Array.isArray(d.skills) && d.skills.length > 0
                        ? d.skills
                        : d.programmingLanguages,
                    developmentTech:
                      Array.isArray(d.industries) && d.industries.length > 0
                        ? d.industries
                        : d.developmentTech,
                    listingType: d.listingType || "project",
                  })
                  setLoading(false)
                  return
                }
              } catch {
                // draft fetch failed — fall through
                sawServerError = true
              }
            }
            setLoading(false)
            setLoadError(sawServerError)
            return
          }
          const svcData = await svcRes.json()
          setProject({
            ...svcData,
            role: svcData.category || "Service",
            summary: svcData.shortDescription || svcData.description,
            rating: 4.9,
            reviewCount: 14,
            listingType: "service",
          })
          setLoading(false)
          return
        }
        const data = await res.json()
        setProject({
          ...data,
          role: data.category || "Software Development",
          summary: data.shortDescription || data.description,
          // UI mapping: reuse existing arrays so the "Project Details" panel
          // stays populated even when the backend doesn't provide separate
          // programmingLanguages/developmentTech lists.
          programmingLanguages:
            Array.isArray(data.skills) && data.skills.length > 0
              ? data.skills
              : data.programmingLanguages,
          developmentTech:
            Array.isArray(data.industries) && data.industries.length > 0
              ? data.industries
              : data.developmentTech,
          rating: 4.9,
          reviewCount: 14,
          listingType: "project",
        })
      } catch (err) {
        console.error(err)
        // A thrown fetch (offline, DNS failure, connection refused, etc.)
        // never even reached a status code — always a server/network
        // problem, never a legitimate 404.
        setLoadError(true)
      } finally {
        setLoading(false)
      }
    }

    fetchProject()
  }, [params.slug, router, refetchKey])

  // Fetch join-request status for talent viewing someone else's project
  React.useEffect(() => {
    if (!project?.id || !user?.id || isOwnerViewing || !isTalentAccount(user)) return
    // If talent is already on the team, show "Joined" immediately
    const onTeam = Array.isArray((project as any)?.team) &&
      (project as any).team.some(
        (m: any) => String(m?.userId ?? m?.id ?? "") === String(user.id)
      )
    if (onTeam) {
      setJoinStatus("accepted")
      return
    }
    getJoinRequestStatus(project.id).then(setJoinStatus).catch(() => {})
  }, [project?.id, user?.id, isOwnerViewing])

  const handleRequestToJoin = React.useCallback(async () => {
    if (!project?.id || joinBusy) return
    setJoinBusy(true)
    try {
      const res = await requestToJoinProject(project.id)
      setJoinStatus(res.status === "accepted" ? "accepted" : "pending")
    } catch {
      // If the endpoint isn't built yet, optimistically show pending
      setJoinStatus("pending")
    } finally {
      setJoinBusy(false)
    }
  }, [project?.id, joinBusy])

  const handleCancelJoinRequest = React.useCallback(async () => {
    if (!project?.id || joinBusy) return
    setJoinBusy(true)
    try {
      await cancelJoinRequest(project.id)
      setJoinStatus("none")
    } catch {
      setJoinStatus("none")
    } finally {
      setJoinBusy(false)
    }
  }, [project?.id, joinBusy])

  // Track view when project loads — skip in owner preview
  React.useEffect(() => {
    if (!project?.id || isPreview) return
    const apiBase = getPublicApiUrl() || "http://localhost:4000"
    fetch(`${apiBase}/v1/recently-viewed/${project.id}`, {
      method: "POST",
      credentials: "include",
      headers: csrfHeader("POST"),
    }).catch(() => {})
  }, [project?.id, isPreview])

  // Scroll to top when page loads
  React.useEffect(() => {
    window.scrollTo(0, 0)
  }, [])

  const projectStaticContent = React.useMemo<ProjectStaticContent>(() => {
    return buildProjectStaticContentFromGateway(project?.projectStaticContent)
  }, [project?.projectStaticContent])

  if (loading) {
    return (
      <div className="min-h-screen bg-white px-5 md:px-10 lg:px-[100px] py-10">
        <div className="max-w-[1240px] w-full mx-auto">
          {/* breadcrumb */}
          <div className="flex items-center gap-x-3">
            <Shimmer className="h-3 w-3 rounded-full" />
            <Shimmer className="h-3 w-16" />
            <Shimmer className="h-3 w-24" />
            <Shimmer className="h-3 w-32" />
          </div>
          <div className="flex items-start gap-x-8 mt-8">
            <div className="flex-auto min-w-0 space-y-6">
              {/* title + categories */}
              <div className="space-y-3">
                <Shimmer className="h-8 w-2/3" />
                <div className="flex items-center gap-x-3">
                  <Shimmer className="h-4 w-24" />
                  <Shimmer className="h-4 w-28" />
                </div>
              </div>
              {/* hero media */}
              <Shimmer className="h-[460px] w-full rounded-lg" />
              {/* tabs */}
              <div className="flex gap-x-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Shimmer key={i} className="h-8 w-20 rounded-full" />
                ))}
              </div>
              {/* body paragraphs */}
              <div className="space-y-3">
                <Shimmer className="h-4 w-full" />
                <Shimmer className="h-4 w-11/12" />
                <Shimmer className="h-4 w-10/12" />
                <Shimmer className="h-4 w-9/12" />
              </div>
              {/* deliverables section */}
              <div className="space-y-4">
                <Shimmer className="h-6 w-40" />
                <div className="grid grid-cols-3 gap-4">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <Shimmer key={i} className="h-10 rounded-lg" />
                  ))}
                </div>
              </div>
              {/* more paragraphs */}
              <div className="space-y-3">
                <Shimmer className="h-4 w-full" />
                <Shimmer className="h-4 w-11/12" />
                <Shimmer className="h-4 w-8/12" />
              </div>
            </div>
            {/* sidebar card */}
            <div className="w-[360px] shrink-0 rounded-lg border border-gray-200 p-6 space-y-4">
              <Shimmer className="h-6 w-32" />
              <Shimmer className="h-10 w-full" />
              <Shimmer className="h-10 w-full" />
              <Shimmer className="h-10 w-full" />
              <div className="h-px w-full bg-gray-200" />
              <Shimmer className="h-10 w-full" />
              <Shimmer className="h-10 w-full" />
            </div>
          </div>
        </div>
      </div>
    )
  }

  // PMCM-259/E1: a network/5xx failure gets a distinct full-page error
  // with Retry, separate from the "Project not found" state below (a real
  // 404). Retry just bumps refetchKey to re-run the same fetch in place —
  // no page reload, same pattern used by the owner-preview "View as
  // Client" retry below and by verify-withdrawal/page.tsx's error state.
  if (loadError) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center px-6">
        <div className="max-w-md text-center">
          <div className="mx-auto mb-4 size-12 rounded-full bg-gray-100 flex items-center justify-center">
            <AlertCircle className="size-6 text-gray-400" />
          </div>
          <h1 className="text-xl font-semibold text-dark-blue-400">
            Something went wrong
          </h1>
          <p className="mt-2 text-sm text-gray-500">
            We couldn&apos;t load this listing. Please check your connection
            and try again.
          </p>
          <div className="mt-6">
            <Button onClick={() => setRefetchKey((k) => k + 1)}>
              Retry
            </Button>
          </div>
        </div>
      </div>
    )
  }

  if (!project) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center px-6">
        <div className="max-w-md text-center">
          <div className="mx-auto mb-4 size-12 rounded-full bg-gray-100 flex items-center justify-center">
            <AlertCircle className="size-6 text-gray-400" />
          </div>
          <h1 className="text-xl font-semibold text-dark-blue-400">
            Project not found
          </h1>
          <p className="mt-2 text-sm text-gray-500">
            We couldn&apos;t find the project you&apos;re looking for. It may
            have been removed or the link is broken.
          </p>
          <div className="mt-6">
            {isPreview && onEdit ? (
              <Button variant="outlined" visual="gray" onClick={onEdit}>
                Edit My Listing
              </Button>
            ) : (
              <Button onClick={() => router.push("/projects")}>
                Browse projects
              </Button>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="px-5 md:px-10 lg:px-[100px] relative bg-white">
      <div className="max-w-[1240px] w-full mx-auto flex items-start gap-x-8">
        <div className="flex-auto min-w-0">
          <div className="after:content-[''] after:absolute after:inset-x-0 after:border-b after:border-gray-200">
            <div className="relative pt-6 pb-[50px]">
              <div className="absolute top-0 bottom-px bg-gray-50 w-screen left-[min(-100px,calc(620px-50vw))]" />

              <div className="flex items-center gap-x-2 relative">
                <NextLink href="/">
                  <Home03 className="size-[18px] text-gray-500/50 cursor-pointer hover:text-gray-500" />
                </NextLink>

                {(() => {
                  const cats = project.categories || []
                  const l1 =
                    cats[0] || project.category || "Software Development"
                  const l1Slug = l1
                    .toLowerCase()
                    .replace(/\s+/g, "-")
                    .replace(/[^a-z0-9-]/g, "")
                    .replace(/&/g, "and")
                  const l2 = cats[1]
                  const l2Slug = l2
                    ? l2
                        .toLowerCase()
                        .replace(/\s+/g, "-")
                        .replace(/[^a-z0-9-]/g, "")
                        .replace(/&/g, "and")
                    : null
                  return (
                    <>
                      <div className="inline-flex items-center gap-x-2">
                        <span className="text-xs leading-6 text-gray-500/50 font-semibold">
                          /
                        </span>
                        <NextLink
                          href={`/c/${l1Slug}`}
                          className="text-xs leading-6 text-gray-500/50 hover:text-gray-500 font-semibold hover:underline cursor-pointer transition duration-300"
                        >
                          {l1}
                        </NextLink>
                      </div>
                      {l2 && (
                        <div className="inline-flex items-center gap-x-2">
                          <span className="text-xs leading-6 text-gray-500/50 font-semibold">
                            /
                          </span>
                          <NextLink
                            href={`/c/${l1Slug}/${l2Slug}`}
                            className="text-xs leading-6 text-gray-500/50 hover:text-gray-500 font-semibold hover:underline cursor-pointer transition duration-300"
                          >
                            {l2}
                          </NextLink>
                        </div>
                      )}
                      <div className="inline-flex items-center gap-x-2">
                        <span className="text-xs leading-6 text-gray-500/50 font-semibold">
                          /
                        </span>
                        <NextLink
                          href={`/c/${l1Slug}/${l2Slug || (project.listingType === "service" ? "services" : "projects")}`}
                          className="text-xs leading-6 text-gray-500/50 hover:text-gray-500 font-semibold hover:underline cursor-pointer transition duration-300"
                        >
                          {project.listingType === "service"
                            ? "Services"
                            : "Projects"}
                        </NextLink>
                      </div>
                      <div className="inline-flex items-center gap-x-2">
                        <span className="text-xs leading-6 text-gray-500/50 font-semibold">
                          /
                        </span>
                        <span className="text-xs leading-6 text-gray-500 font-semibold">
                          {project.title}
                        </span>
                      </div>
                    </>
                  )
                })()}
              </div>

              <div className="flex gap-x-[13px] items-start mt-8 relative">
                {project.mediaUrls?.[0] && (
                  <div className="w-[189px] h-[126px] relative overflow-hidden rounded-lg">
                    <NextImage
                      src={project.mediaUrls[0]}
                      alt={project.title}
                      sizes="25vw"
                      loading="eager"
                      priority
                      fill
                    />
                  </div>
                )}

                <div className="flex flex-col items-start gap-y-3">
                  <Badge className="rounded-[5px]" visual="gray">
                    {project.projectType
                      ?? (project.categories?.[0])
                      ?? (project.listingType === "service" ? "Service" : "Project")}
                  </Badge>
                  <h1 className="text-[28px] leading-none font-bold text-dark-blue-400">
                    {project.title}
                  </h1>

                  {/* MVP: ratings, reviews, and sales hidden until review system is implemented
                  <div className="flex items-center gap-x-2">
                    <div className="inline-flex items-center gap-x-1.5">
                      <div className="inline-flex items-center gap-x-0.5">
                        <Star className="shrink-0 size-4 text-primary-500 fill-primary-500" />
                        <Star className="shrink-0 size-4 text-primary-500 fill-primary-500" />
                        <Star className="shrink-0 size-4 text-primary-500 fill-primary-500" />
                        <Star className="shrink-0 size-4 text-primary-500 fill-primary-500" />
                        <Star className="shrink-0 size-4 text-primary-500" />
                      </div>
                      <span className="text-sm leading-none font-semibold text-dark-blue-400">
                        {project.rating || "4.9"}{" "}
                        <span className="font-medium">
                          ({project.reviewCount || 14} ratings)
                        </span>
                      </span>
                    </div>

                    <span className="size-1 shrink-0 rounded-full bg-dark-blue-400" />

                    <div className="inline-flex items-center gap-x-1.5">
                      <ShoppingCart className="size-[18px] shrink-0" />
                      <span className="text-sm leading-none font-semibold text-dark-blue-400">
                        31 sales
                      </span>
                    </div>

                    {project.isTopRated && (
                      <>
                        <span className="size-1 shrink-0 rounded-full bg-dark-blue-400" />
                        <div className="inline-flex items-center gap-x-1.5">
                          <ChartBreakoutCircle className="size-[18px] shrink-0" />
                          <span className="text-sm leading-none font-semibold text-dark-blue-400">
                            Top Rated
                          </span>
                        </div>
                      </>
                    )}
                  </div>
                  */}

                  <div className="flex items-center gap-x-3">
                    {(project.categories || []).map(
                      (cat: string, idx: number) => {
                        const catSlug = cat
                          .toLowerCase()
                          .replace(/&/g, "and")
                          .replace(/\s+/g, "-")
                          .replace(/[^a-z0-9-]/g, "")
                        const cats = project.categories || []
                        const l1Slug = (cats[0] || "")
                          .toLowerCase()
                          .replace(/&/g, "and")
                          .replace(/\s+/g, "-")
                          .replace(/[^a-z0-9-]/g, "")
                        // L1 → /c/l1, L2 → /c/l1/l2, L3 → /c/l1/l2/l3
                        let href = `/c/${l1Slug}`
                        if (idx === 1) href = `/c/${l1Slug}/${catSlug}`
                        if (idx === 2) {
                          const l2Slug = (cats[1] || "")
                            .toLowerCase()
                            .replace(/&/g, "and")
                            .replace(/\s+/g, "-")
                            .replace(/[^a-z0-9-]/g, "")
                          href = `/c/${l1Slug}/${l2Slug}/${catSlug}`
                        }
                        return (
                          <NextLink
                            key={cat}
                            href={href}
                            className="text-sm font-semibold text-gray-500 hover:text-dark-blue-400 hover:underline transition duration-300"
                          >
                            {cat}
                          </NextLink>
                        )
                      }
                    )}
                  </div>
                </div>
              </div>

              <div className="mt-3 relative">
                <p
                  style={{ whiteSpace: "pre-line" }}
                  className="text-sm font-extralight break-words line-clamp-3 text-dark-blue-400"
                >
                  {project.summary}
                </p>
              </div>
            </div>
          </div>

          <Tabs value={selected} onValueChange={setSelected}>
            <RadixTabs.TabsList
              className={cn(
                "h-12 flex items-center justify-between border-b border-gray-200 bg-white",
                selected === "Live Chat" && "sticky top-[65px] z-10"
              )}
            >
              <div className="flex-1 flex justify-start">
                <Button className="group" variant="link" visual="gray">
                  <ArrowLeft className="size-[15px] transition duration-300 group-hover:-translate-x-[4px]" />{" "}
                  Back To Search
                </Button>
              </div>

              <Button
                variant="link"
                className="!text-primary-500 shrink-0"
                onClick={() => {
                  if (selected === "Live Chat") setSelected("Details")
                  else openLiveChat()
                }}
              >
                <MessageTextCircle01 className="size-5" />
                {selected === "Live Chat" ? "Close Chat" : "Live Chat"}
              </Button>

              <div className="flex-1 flex justify-end">
                <Button
                  className="group"
                  variant="link"
                  visual="gray"
                  data-state={selected === "View Project Scope" ? "active" : "inactive"}
                  onClick={() =>
                    setSelected(
                      selected === "View Project Scope"
                        ? "Details"
                        : "View Project Scope"
                    )
                  }
                >
                  {selected === "View Project Scope"
                    ? "Close Scope"
                    : project?.listingType === "service"
                      ? "View Service Scope"
                      : "View Project Scope"}
                  <ChevronDown className="group-data-[state=active]:-rotate-180 transition duration-300 size-[15px]" />
                </Button>
              </div>
            </RadixTabs.TabsList>
            <TabsContent value="Live Chat">
              <Inbox>
                <Chats
                  projectId={project?.id ? String(project.id) : undefined}
                  teamMemberIds={(project?.team ?? [])
                    .map((m: any) => String(m.userId ?? m.id ?? ""))
                    .filter(Boolean)}
                  ownerId={project?.ownerId ?? project?.userId ?? null}
                  initialDraft={pendingQuestion}
                />
              </Inbox>
            </TabsContent>

            <TabsContent
              className="pt-6"
              value="Details"
              style={{ willChange: "auto" }}
            >
              {/*
                Project gallery carousel — spec:
                  docs/md/.../Strapi Collection Type... Project Listings:42
                  "Gallery Images — Media (Multiple), Optional, Cloudflare R2"

                Source: project.mediaUrls. The listings-service sync
                concatenates [thumbnail, ...gallery[].image] into a single
                `mediaUrls` text[] column, so index 0 is always the
                thumbnail (already rendered in the project header strip
                above) and .slice(1) is the authored gallery.

                When the project has no authored gallery we keep the
                static /waves.png placeholder carousel so the design
                density stays intact (saved "no-empty-swap" memory rule).
              */}
              {mediaItems.length > 0 && (
              <Carousel className="w-full">
                <CarouselContent className="-ml-3">
                  {mediaItems.map((m, i) => (
                        <CarouselItem
                          key={`${m.url}-${i}`}
                          className="group basis-1/3"
                        >
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedMediaIndex(i)
                              setLightboxOpen(true)
                            }}
                            className={cn(
                              "relative block w-full border border-gray-200 h-[150.6px] overflow-hidden rounded-lg focus-visible:outline-none",
                              m.type === "video" ? "bg-black" : "bg-gray-50"
                            )}
                          >
                            {m.type === "video" ? (
                              <>
                                <VideoThumb url={m.url} alt="Project video" />
                                <span className="absolute inset-0 flex items-center justify-center">
                                  <span
                                    className="flex items-center justify-center rounded-full bg-white/90 shadow"
                                    style={{
                                      width: 48,
                                      height: 48,
                                    }}
                                  >
                                    <svg
                                      viewBox="0 0 24 24"
                                      aria-hidden="true"
                                      className="text-gray-800"
                                      style={{
                                        width: 29,
                                        height: 29,
                                        fill: "currentColor",
                                        marginLeft: 2,
                                      }}
                                    >
                                      <path d="M8 5v14l11-7z" />
                                    </svg>
                                  </span>
                                </span>
                              </>
                            ) : (
                              <NextImage
                                className="object-cover"
                                src={m.url}
                                alt={`${project.title} — media ${i + 1}`}
                                sizes="25vw"
                                fill
                              />
                            )}
                          </button>
                        </CarouselItem>
                      ))}
                </CarouselContent>

                <CarouselPreviousTrigger />
                <CarouselNextTrigger />
              </Carousel>
              )}

              <Dialog open={lightboxOpen} onOpenChange={setLightboxOpen}>
                <DialogContent
                  className="p-0 bg-transparent border-0 shadow-none"
                  style={{ maxWidth: 760, width: "100%" }}
                >
                  <DialogClose
                    className="absolute z-10 flex items-center justify-center rounded-full bg-white text-gray-500 shadow-md transition-colors hover:bg-gray-900 hover:text-white focus-visible:outline-none"
                    style={{ width: 32, height: 32, top: -16, right: -16 }}
                  >
                    <X style={{ width: 16, height: 16 }} />
                  </DialogClose>
                  {(() => {
                    const m = mediaItems[selectedMediaIndex]
                    if (!m) return null
                    return (
                      <>
                        <div
                          style={{
                            position: "relative",
                            width: "100%",
                            aspectRatio: "16 / 9",
                            maxHeight: "80vh",
                            backgroundColor: "#fff",
                            borderRadius: 8,
                            overflow: "hidden",
                          }}
                        >
                          {m.type === "video" ? (
                            <LightboxVideoPlayer
                              url={m.url}
                              active={lightboxOpen}
                            />
                          ) : (
                            <>
                              <img
                                src={m.url}
                                alt={project.title}
                                style={{
                                  position: "absolute",
                                  inset: 0,
                                  width: "100%",
                                  height: "100%",
                                  objectFit: "contain",
                                }}
                              />
                              <span
                                className="absolute text-sm font-semibold text-white"
                                style={{
                                  left: 16,
                                  bottom: 16,
                                  textShadow: "0 1px 3px rgba(0,0,0,0.6)",
                                }}
                              >
                                {mediaName(m.url, project.title)}
                              </span>
                            </>
                          )}
                        </div>
                        {mediaItems.length > 1 && (
                          <div
                            className="flex gap-x-3 pt-4"
                            style={{ overflowX: "auto" }}
                          >
                            {mediaItems.map((mm, i) => {
                              const active = i === selectedMediaIndex
                              return (
                                <button
                                  key={`lb-${mm.url}-${i}`}
                                  type="button"
                                  onClick={() => setSelectedMediaIndex(i)}
                                  className={cn(
                                    "relative shrink-0 overflow-hidden rounded-lg focus-visible:outline-none",
                                    mm.type === "video" ? "bg-black" : "bg-gray-50"
                                  )}
                                  style={{
                                    width: 84,
                                    height: 60,
                                  }}
                                >
                                  {mm.type === "video" ? (
                                    <>
                                      <VideoThumb url={mm.url} alt="Video" />
                                      <span className="absolute inset-0 flex items-center justify-center">
                                        <span
                                          className="flex items-center justify-center rounded-full"
                                          style={{
                                            width: 22,
                                            height: 22,
                                            backgroundColor:
                                              "rgba(255,255,255,0.45)",
                                          }}
                                        >
                                          <svg
                                            viewBox="0 0 24 24"
                                            aria-hidden="true"
                                            className="text-gray-800"
                                            style={{
                                              width: 10,
                                              height: 10,
                                              fill: "currentColor",
                                              marginLeft: 1,
                                            }}
                                          >
                                            <path d="M8 5v14l11-7z" />
                                          </svg>
                                        </span>
                                      </span>
                                    </>
                                  ) : (
                                    <img
                                      src={mm.url}
                                      alt={`${project.title} — media ${i + 1}`}
                                      className="absolute inset-0 h-full w-full object-cover"
                                    />
                                  )}
                                  {active && (
                                    <span
                                      className="pointer-events-none absolute inset-0"
                                      style={{
                                        border: "2px solid #22376B",
                                        borderRadius: 8,
                                      }}
                                    />
                                  )}
                                </button>
                              )
                            })}
                          </div>
                        )}
                      </>
                    )
                  })()}
                </DialogContent>
              </Dialog>

              <div className="mt-6">
                <Tabs
                  className="group/tabs"
                  value={activeAnchor}
                  ref={tabsRef}
                  data-position={isSticky ? "sticky" : "default"}
                >
                  <div className="fixed top-0 z-50 inset-x-0 bg-white border border-gray-200 drop-shadow-[0px_2px_5px_0px_rgba(0,0,0,.04)] px-5 md:px-10 lg:px-[100px] group-data-[position=default]/tabs:contents">
                    <div className="max-w-[1240px] w-full mx-auto flex items-center group-data-[position=default]/tabs:contents">
                      <div className="pt-[12px] flex-auto group-data-[position=default]/tabs:contents">
                        <div className="pb-2 inline-flex items-center gap-x-3 group-data-[position=default]/tabs:hidden">
                          <div className="h-12 relative w-[66px] overflow-hidden rounded-[5px] bg-[#FBFBFB] border-b border-black/15">
                            <NextImage
                              className="object-cover"
                              src="/artificial-intelligence.jpeg"
                              sizes="15vw"
                              fill
                            />
                          </div>

                          <div className="flex flex-col items-start gap-y-0.5">
                            <Badge visual="gray">{project.role}</Badge>
                            <h3 className="text-lg leading-none font-bold text-dark-blue-400">
                              {project.title}
                            </h3>
                          </div>
                        </div>
                        <TabsList className="w-full justify-start flex-auto group-data-[position=sticky]/tabs:px-0">
                          {([
                            ["Description", "section-description"],
                            ["Deliverables", "section-deliverables"],
                            ["Project Details", "section-project-details"],
                            ["How it Works", "section-how-it-works"],
                            ["Questions", "section-questions"],
                          ] as const).map(([label, id]) => (
                            <TabsTrigger
                              key={label}
                              value={label}
                              onClick={(e) => {
                                e.preventDefault()
                                setActiveAnchor(label)
                                document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" })
                              }}
                            >
                              {label}
                            </TabsTrigger>
                          ))}
                        </TabsList>
                      </div>
                      <div className="flex items-center gap-x-3 group-data-[position=default]/tabs:hidden">
                        <Button size="md">Star Project</Button>
                        {/* PMCM-259/AC3: talent-profile-comps' <SaveButton />
                            is an uncontrolled, self-contained toggle with no
                            props — it never reflected this project's real
                            favorited state and never called add/removeFavorite.
                            Swapped for the same FavoriteRoot/Favorite pair
                            already wired correctly in the sidebar below. */}
                        <FavoriteRoot
                          value={isFavorited}
                          onValueChange={handleFavoriteToggle}
                        >
                          {({ pressed }) => (
                            <TooltipProvider delayDuration={75}>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <span className="inline-block">
                                    <Favorite />
                                  </span>
                                </TooltipTrigger>
                                <TooltipContent>
                                  {pressed ? (
                                    <span className="inline-flex items-center gap-x-1">
                                      <Check className="size-[15px] shrink-0 text-green-500" />
                                      Saved
                                    </span>
                                  ) : (
                                    "Save to favorites"
                                  )}
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          )}
                        </FavoriteRoot>
                        <IconButton
                          className="text-gray-500"
                          variant="outlined"
                          visual="gray"
                          size="md"
                        >
                          <Share className="size-[20px]" />
                        </IconButton>
                      </div>
                    </div>
                  </div>

                  <div>
                    <div id="section-description" className="pt-6">
                      <CollapsibleCard maxHeight={599}>
                        {/*
                          PMCM-255: project.description is seller-authored
                          HTML from the RichTextEditor component (talent's
                          own My Listings / wizard Description editor),
                          saved directly via publish.service.ts's
                          createProjectDraft/updateProjectDraft — it is
                          NOT the Payload/Lexical admin-authored content
                          this comment previously (incorrectly) described.
                          That assumption no longer holds for self-serve
                          listings, so this renders through an allow-list
                          sanitizer rather than raw dangerouslySetInnerHTML.
                        */}
                        {/*
                          PMCM-255 (follow-up): rich-text-content is the
                          same class the frozen RichTextEditor applies to
                          its own editable surface (components/rich-text-editor.tsx)
                          — globals.css's heading-size and image
                          alignment/wrap rules ([data-font-size=...],
                          img[data-align=...]) are scoped under that class
                          only. Without it here, the client-view render had
                          none of that styling even though the sanitizer
                          preserves the markup. Tailwind typography's own
                          `prose` img/heading rules are wrapped in :where()
                          (near-zero specificity), so rich-text-content's
                          plain class+attribute selectors win without
                          needing !important or new arbitrary values.
                        */}
                        <div
                          className="prose prose-sm rich-text-content max-w-none text-dark-blue-400 prose-headings:text-dark-blue-400 prose-headings:font-semibold prose-p:font-extralight prose-p:leading-relaxed prose-strong:text-dark-blue-400 prose-li:font-extralight"
                          dangerouslySetInnerHTML={{
                            __html: sanitizeProjectDescription(
                              project.description || project.summary || ""
                            ),
                          }}
                        />
                      </CollapsibleCard>

                      <CollapsibleCard maxHeight={456} className="mt-6">
                            <h2 id="section-deliverables" className="text-xl leading-none text-dark-blue-400 font-semibold scroll-mt-[120px]">
                              Deliverables
                            </h2>

                            {/*
                              Deliverables come back from listings-service as a
                              grouped phase array:
                                [{ phaseLabel, phaseName, items: string[] }]
                              rendered as a Figma-matching stack of phase blocks
                              with a 3-column checkmark grid per phase, separated
                              by horizontal rules. Empty state: "Deliverables coming soon".
                            */}
                            {Array.isArray(project.deliverables) &&
                            project.deliverables.length > 0 ? (
                              <div className="mt-6 flex flex-col">
                                {typeof project.deliverables[0] === "string" ? (
                                  /* Legacy flat string[] from seed data */
                                  <div className="grid grid-cols-3 gap-y-3 gap-x-6">
                                    {(project.deliverables as string[]).map((item, i) => (
                                      <div
                                        key={`${item}-${i}`}
                                        className="flex items-center gap-x-3"
                                      >
                                        <span className="inline-flex size-3 items-center justify-center shrink-0 rounded-full bg-primary-500 text-white">
                                          <Check className="size-2" />
                                        </span>
                                        <p className="text-sm font-extralight leading-tight text-dark-blue-400">
                                          {item}
                                        </p>
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  /* Grouped DeliverableGroup[] from sync pipeline (3-6 per phase) */
                                  (
                                    project.deliverables as Array<{
                                      phaseLabel: string
                                      phaseName: string
                                      items: string[]
                                    }>
                                  ).map((phase, pi) => (
                                    <div
                                      key={`${phase.phaseLabel}-${pi}`}
                                      className={cn(
                                        pi > 0 &&
                                          "mt-6 pt-6 border-t border-gray-200"
                                      )}
                                    >
                                      <p className="text-sm text-dark-blue-400">
                                        <span className="font-extralight">
                                          {phase.phaseLabel}
                                        </span>{" "}
                                        <span className="font-semibold">
                                          {phase.phaseName}
                                        </span>
                                      </p>
                                      <div className="mt-3 grid grid-cols-3 gap-y-3 gap-x-6">
                                        {(phase.items ?? []).map((item, i) => (
                                          <div
                                            key={`${item}-${i}`}
                                            className="flex items-center gap-x-3"
                                          >
                                            <span className="inline-flex size-3 items-center justify-center shrink-0 rounded-full bg-primary-500 text-white">
                                              <Check className="size-2" />
                                            </span>
                                            <p className="text-sm font-extralight leading-tight text-dark-blue-400">
                                              {item}
                                            </p>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  ))
                                )}
                              </div>
                            ) : (
                              <p className="mt-6 text-sm font-extralight text-gray-500">
                                Deliverables coming soon.
                              </p>
                            )}

                            <Alert className="mt-6">
                              <AlertIcon>
                                <AlertCircle className="h-5 w-5" />
                              </AlertIcon>
                              <AlertContent>
                                <AlertDescription>
                                  The above list of deliverables is based on the
                                  current project scope and tasks. Deliverables
                                  are subject to change with any changes to the
                                  project scope or tasks.
                                </AlertDescription>
                              </AlertContent>
                            </Alert>
                      </CollapsibleCard>

                      <div id="section-project-details" className="mt-6 border gap-x-[50px] rounded-lg border-gray-200 bg-white shadow-[0px_1px_5px_0px_rgba(16,24,40,.02)] scroll-mt-[120px]">
                        <div className="p-6 border-b border-gray-200">
                          <h2 className="text-xl leading-none font-bold text-dark-blue-400">
                            Project Details
                          </h2>

                          <div className="mt-6">
                            <div className="grid gap-x-6 grid-cols-2">
                              {project.programmingLanguages?.length > 0 && (
                                <div className="space-y-3">
                                  <h3 className="text-sm leading-none font-medium text-dark-blue-400">
                                    Skills
                                  </h3>
                                  <div className="flex items-center flex-wrap gap-1">
                                    {project.programmingLanguages.map(
                                      (lang: string, i: number) => (
                                        <NextLink
                                          key={lang + i}
                                          href="#"
                                          className="focus-visible:outline-none hover:underline transition duration-300 inline-block text-sm leading-6 font-semibold text-dark-blue-400"
                                        >
                                          {lang}
                                          {i <
                                          project.programmingLanguages.length -
                                            1
                                            ? ","
                                            : ""}
                                        </NextLink>
                                      )
                                    )}
                                  </div>
                                </div>
                              )}

                              {project.developmentTech?.length > 0 && (
                                <div className="space-y-3">
                                  <h3 className="text-sm leading-none font-medium text-dark-blue-400">
                                    Industries
                                  </h3>
                                  <div className="flex items-center flex-wrap gap-1">
                                    {project.developmentTech.map(
                                      (tech: string, i: number) => (
                                        <NextLink
                                          key={tech + i}
                                          href={`/search?industry=${encodeURIComponent(tech)}`}
                                          className="focus-visible:outline-none hover:underline transition duration-300 inline-block text-sm leading-6 font-semibold text-dark-blue-400"
                                        >
                                          {tech}
                                          {i <
                                          project.developmentTech.length - 1
                                            ? ","
                                            : ""}
                                        </NextLink>
                                      )
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>

                            <div className="grid gap-x-6 grid-cols-2 mt-10">
                              {project.subcategories?.length > 0 && (
                                <div className="space-y-3">
                                  <h3 className="text-sm leading-none font-medium text-dark-blue-400">
                                    Subcategories
                                  </h3>
                                  <div className="gap-2 flex items-center flex-wrap">
                                    {project.subcategories.map(
                                      (sc: string, i: number) => (
                                        <Badge
                                          key={sc + i}
                                          visual="gray"
                                          size="md"
                                        >
                                          {sc}
                                        </Badge>
                                      )
                                    )}
                                  </div>
                                </div>
                              )}

                              {project.tags?.length > 0 && (
                                <div className="space-y-3">
                                  <h3 className="text-sm leading-none font-medium text-dark-blue-400">
                                    Tags
                                  </h3>
                                  <div className="gap-2 flex items-center flex-wrap">
                                    {project.tags.map(
                                      (tag: string, i: number) => (
                                        <Badge
                                          key={tag + i}
                                          visual="gray"
                                          size="md"
                                        >
                                          {tag}
                                        </Badge>
                                      )
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>

                            <div className="mt-10">
                              <h3 className="text-sm leading-none font-medium text-dark-blue-400">
                                Date Published
                              </h3>
                              <p className="mt-3 text-base leading-none text-gray-500">
                                {(() => {
                                  const d =
                                    project.updatedAt || project.createdAt
                                  if (!d) return "—"
                                  return new Date(d).toLocaleDateString(
                                    "en-US",
                                    {
                                      month: "short",
                                      day: "numeric",
                                      year: "numeric",
                                    }
                                  )
                                })()}
                              </p>
                            </div>
                          </div>
                        </div>

                        {/*
                          About the Team — hydrated from user-service via
                          project.team[] (Step 2 of the hybrid team model).
                          Falls back to the static design when team is empty.
                        */}
                        {Array.isArray(currentTeam) &&
                        currentTeam.length > 0 ? (
                          (() => {
                            type TeamMember = {
                              firstName: string
                              username: string
                              avatarUrl: string | null
                              location: string | null
                              languages: string[]
                              skills: string[]
                              role: string
                              isLead: boolean
                              isOnline: boolean
                            }
                            const members = currentTeam as TeamMember[]
                            const lead =
                              members.find((m) => m.isLead) ?? members[0]
                            const allLocations = Array.from(
                              new Set(
                                members
                                  .map((m) => formatMemberLocation(m.location))
                                  .filter((l): l is string => !!l)
                              )
                            )
                            const allLanguages = Array.from(
                              new Set(members.flatMap((m) => m.languages))
                            )
                            const allSkills = Array.from(
                              new Set(members.flatMap((m) => m.skills))
                            )
                            const visibleSkills = allSkills.slice(0, 5)
                            const extraSkillCount =
                              allSkills.length - visibleSkills.length
                            const headerLabel = "Current Team"
                            return (
                              <div className="p-6">
                                <h3 className="text-base leading-none font-semibold text-dark-blue-400">
                                  {headerLabel}
                                </h3>
                                <div className="grid grid-cols-2 gap-x-6 mt-6">
                                  <div className="flex items-start gap-x-3">
                                    <Avatar size="lg">
                                      {lead.avatarUrl ? (
                                        <AvatarImage
                                          src={lead.avatarUrl}
                                          alt={lead.firstName}
                                        />
                                      ) : null}
                                      <AvatarFallback>
                                        {lead.firstName.charAt(0).toUpperCase()}
                                      </AvatarFallback>
                                    </Avatar>
                                    <div className="space-y-1.5">
                                      <Badge
                                        className="rounded-[4px] bg-primary-50"
                                        visual="primary"
                                      >
                                        {lead.isLead
                                          ? "Project Lead"
                                          : "Team Member"}
                                      </Badge>
                                      <div className="flex flex-col gap-y-0.5">
                                        <NextLink
                                          href={`/talent/${encodeURIComponent(lead.username)}`}
                                          className="block text-sm leading-none text-gray-500 font-extralight hover:underline"
                                        >
                                          <span className="text-base font-bold text-dark-blue-400">
                                            {lead.firstName}
                                          </span>{" "}
                                          @{lead.username}
                                        </NextLink>
                                        {lead.role ? (
                                          <span className="text-sm leading-none font-extralight text-dark-blue-400">
                                            {lead.role}
                                          </span>
                                        ) : null}
                                      </div>
                                    </div>
                                  </div>
                                  {allLocations.length > 0 && (
                                    <div className="space-y-3">
                                      <h3 className="flex items-center gap-x-[5.85px] text-sm leading-none font-extralight text-dark-blue-400">
                                        <MapPin className="size-[18px]" />{" "}
                                        Locations
                                      </h3>
                                      <LocationList locations={allLocations} />
                                    </div>
                                  )}
                                </div>
                                {(allLanguages.length > 0 ||
                                  visibleSkills.length > 0) && (
                                  <div className="mt-6 grid grid-cols-2 gap-x-6">
                                    {allLanguages.length > 0 && (
                                      <div className="space-y-3">
                                        <h3 className="flex items-center gap-x-[5.85px] text-sm leading-none font-extralight text-dark-blue-400">
                                          <MessageTextSquare01 className="size-[18px]" />{" "}
                                          Languages
                                        </h3>
                                        <div className="gap-1 flex items-center flex-wrap">
                                          {allLanguages.map((lang, i) => (
                                            <NextLink
                                              key={lang}
                                              href={`/talent?language=${encodeURIComponent(lang)}`}
                                              className="focus-visible:outline-none duration-300 transition hover:underline inline-block text-sm leading-6 font-semibold text-dark-blue-400"
                                            >
                                              {lang}
                                              {i < allLanguages.length - 1
                                                ? ","
                                                : ""}
                                            </NextLink>
                                          ))}
                                        </div>
                                      </div>
                                    )}
                                    {visibleSkills.length > 0 && (
                                      <div className="space-y-3">
                                        <h3 className="flex items-center gap-x-[5.85px] text-sm leading-none font-extralight text-dark-blue-400">
                                          <Stars02 className="size-[18px]" />{" "}
                                          Skills & Expertise
                                        </h3>
                                        <div className="gap-1 flex items-center flex-wrap">
                                          {visibleSkills.map((skill, i) => (
                                            <NextLink
                                              key={skill}
                                              href={`/talent?skills=${encodeURIComponent(skill)}`}
                                              className="focus-visible:outline-none hover:underline transition duration-300 inline-block text-sm leading-6 font-semibold text-dark-blue-400"
                                            >
                                              {skill}
                                              {i < visibleSkills.length - 1 ||
                                              extraSkillCount > 0
                                                ? ","
                                                : ""}
                                            </NextLink>
                                          ))}
                                          {extraSkillCount > 0 && (
                                            <span className="text-sm leading-6 font-semibold text-dark-blue-400">
                                              and {extraSkillCount} more...
                                            </span>
                                          )}
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            )
                          })()
                        ) : (
                          <div className="p-6">
                            <h3 className="text-base leading-none font-semibold text-dark-blue-400">
                              About the Team
                            </h3>

                            <div className="mt-6 rounded-lg border border-dashed border-gray-300 bg-white py-16 px-6 flex flex-col items-center justify-center text-center">
                              <div className="size-12 rounded-full bg-gray-100 flex items-center justify-center">
                                <Users03 className="size-6 text-gray-400" />
                              </div>

                              <h4 className="mt-4 text-base font-semibold text-dark-blue-400">
                                No team assigned yet
                              </h4>
                              <p className="mt-1 max-w-[260px] text-sm text-gray-500">
                                Be the first to claim this project and lead a
                                team to deliver it.
                              </p>

                              <div className="mt-5">
                                <Button
                                  size="md"
                                  visual="primary"
                                  onClick={() => {
                                    if (!user?.id) {
                                      openAuthModal("sign-in")
                                      return
                                    }
                                    openClaimDialog()
                                  }}
                                >
                                  Claim this Project
                                </Button>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>

                      <div id="section-how-it-works" className="scroll-mt-[120px]" />
                      <ProjectDetailsStepsSection
                        steps={projectStaticContent.howItWorks.steps}
                      />

                      <div id="section-questions" className="relative p-6 mt-6 border gap-x-[50px] rounded-lg border-gray-200 bg-white shadow-[0px_1px_5px_0px_rgba(16,24,40,.02)] scroll-mt-[120px]">
                        <h1 className="text-xl font-bold leading-none text-dark-blue-400">
                          Questions
                        </h1>

                        {!isOwnerViewing && (
                        <div className="relative mt-6 p-6 rounded-lg border border-gray-200 bg-gray-50">
                          {!isPreview && onlineTeam.length > 0 && (
                          <div
                            style={{
                              top: onlineTeam.length === 1 ? -20 : -52,
                              right: 24,
                            }}
                            className="absolute pr-5 p-3 rounded-lg flex items-start gap-x-2.5 bg-white border border-gray-200 shadow-[0px_12px_16px_-4px_rgba(16,24,40,.08)]"
                          >
                            {onlineTeam.length === 1 ? (
                              <>
                                <Avatar size="md">
                                  <AvatarImage
                                    src={onlineTeam[0].avatarUrl || "/man.jpg"}
                                    alt={onlineTeam[0].firstName || "Team member"}
                                  />
                                  <AvatarFallback>
                                    {(onlineTeam[0].firstName ?? "T").charAt(0)}
                                  </AvatarFallback>
                                </Avatar>

                                <div className="flex flex-col items-start gap-y-2">
                                  <span className="text-[13px] leading-none font-semibold text-dark-blue-400">
                                    {onlineTeam[0].firstName ||
                                      onlineTeam[0].username}{" "}
                                    {onlineTeam[0].username && (
                                      <span className="text-xs leading-none text-extralight text-gray-500">
                                        @{onlineTeam[0].username}
                                      </span>
                                    )}
                                  </span>

                                  <div className="flex items-center gap-x-1">
                                    <span className="size-[10.52px] rounded-full shrink-0 bg-[#19BD1F]" />
                                    <span className="text-xs leading-none text-dark-blue-400">
                                      Online
                                    </span>
                                  </div>
                                </div>
                              </>
                            ) : (
                              <div className="flex flex-col items-center gap-y-2">
                                <span className="text-[13px] leading-none font-semibold text-dark-blue-400">
                                  Live Chat
                                </span>

                                <AvatarGroup size="sm" max={3} excess>
                                  {onlineTeam.map((m: any, i: number) => (
                                    <Avatar
                                      key={m.username ?? i}
                                      className="border-2 border-white hover:ring-0 active:ring-0"
                                      size="sm"
                                    >
                                      {m.avatarUrl ? (
                                        <AvatarImage
                                          src={m.avatarUrl}
                                          alt={m.firstName}
                                        />
                                      ) : null}
                                      <AvatarFallback>
                                        {(m.firstName || "?")
                                          .charAt(0)
                                          .toUpperCase()}
                                      </AvatarFallback>
                                    </Avatar>
                                  ))}
                                </AvatarGroup>

                                <div className="flex items-center gap-x-1">
                                  <span className="size-[10.52px] rounded-full shrink-0 bg-[#19BD1F]" />
                                  <span className="text-xs leading-none text-dark-blue-400">
                                    {onlineTeam.length} team members online
                                  </span>
                                </div>
                              </div>
                            )}
                          </div>
                          )}
                          <Label
                            className="font-semibold inline-flex items-center gap-x-2"
                            size="md"
                          >
                            <HelpCircle className="size-[18px] text-primary-500" />
                            Have a specific question in mind?
                          </Label>

                          <div className="mt-3 flex gap-x-2 items-center">
                            <Input
                              className={cn(
                                "flex-auto",
                                showAskErrorMsg &&
                                  "border-error-300 focus:border-error-300 focus:ring-error-100"
                              )}
                              placeholder="Type your question..."
                              value={pendingQuestion}
                              onFocus={() => setShowAskErrorMsg(false)}
                              onChange={(e) => {
                                const v = e.target.value
                                setPendingQuestion(v)
                                if (v.trim()) {
                                  setAskErrored(false)
                                  setShowAskErrorMsg(false)
                                }
                              }}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") handleAsk()
                              }}
                            />
                            <Button
                              className="text-xs leading-none"
                              size="lg"
                              disabled={askErrored && !pendingQuestion.trim()}
                              onClick={handleAsk}
                            >
                              Ask Question
                            </Button>
                          </div>

                          <div className="mt-2 flex items-center justify-between">
                            <span
                              className={cn(
                                "text-xs leading-none",
                                showAskErrorMsg
                                  ? "font-medium text-error-500"
                                  : "text-dark-blue-400"
                              )}
                            >
                              {showAskErrorMsg
                                ? "Please enter your question above"
                                : "A team member will reach out to you as soon as possible."}
                            </span>

                            <span className="text-xs text-dark-blue-400 leading-none">
                              Avg. response time: 20 mins
                            </span>
                          </div>

                          {suggestedQuestions.length > 0 && (
                            <div className="mt-6 flex items-start gap-3 flex-wrap">
                              {suggestedQuestions.map((q, idx) => (
                                <Badge
                                  key={`sq-${idx}`}
                                  className="transition duration-300 bg-white border-[1.5px] border-gray-300 hover:border-dark-blue-400 hover:text-dark-blue-400 cursor-pointer hover:ring-1 hover:ring-dark-blue-400 text-left"
                                  size="lg"
                                  visual="gray"
                                  onClick={() => openLiveChat(q)}
                                  style={{
                                    maxWidth: "100%",
                                    height: "auto",
                                    whiteSpace: "normal",
                                  }}
                                >
                                  {q}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>
                        )}

                        <div className="mt-8">
                          <Tabs defaultValue="FAQs">
                            <RadixTabs.List className="flex items-center justify-between">
                              <div className="flex items-center gap-x-3">
                                <TabsTrigger
                                  variant="unstyled"
                                  showUnderline={false}
                                  value="FAQs"
                                  className="focus-visible:outline-none py-[7px] bg-white hover:bg-gray-50 hover:border-gray-400 px-3.5 border-2 border-gray-300 data-[state=active]:text-dark-blue-400 data-[state=active]:bg-white hover:data-[state=active]:bg-white data-[state=active]:border-dark-blue-400 hover:data-[state=active]:text-dark-blue-400 hover:data-[state=active]:border-dark-blue-400  text-gray-500 hover:text-gray-600 rounded-full text-sm leading-5 font-medium transition duration-300"
                                >
                                  FAQ&apos;s
                                </TabsTrigger>
                                <TabsTrigger
                                  variant="unstyled"
                                  showUnderline={false}
                                  value="Recently Asked Questions"
                                  className="focus-visible:outline-none py-[7px] bg-white hover:bg-gray-50 hover:border-gray-400 px-3.5 border-2 border-gray-300 data-[state=active]:text-dark-blue-400 data-[state=active]:bg-white hover:data-[state=active]:bg-white data-[state=active]:border-dark-blue-400 hover:data-[state=active]:text-dark-blue-400 hover:data-[state=active]:border-dark-blue-400  text-gray-500 hover:text-gray-600 rounded-full text-sm leading-5 font-medium transition duration-300"
                                >
                                  Recently Asked Questions
                                </TabsTrigger>
                              </div>
                            </RadixTabs.List>

                            <TabsContent value="FAQs">
                              {!project.faqs || project.faqs.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-10 text-center">
                                  <div className="mx-auto mb-3 size-10 rounded-full bg-gray-100 flex items-center justify-center">
                                    <HelpCircle className="size-5 text-gray-400" />
                                  </div>
                                  <h3 className="text-sm font-semibold text-dark-blue-400">
                                    No FAQ&apos;s yet
                                  </h3>
                                  <p className="mt-1 text-xs text-gray-500 max-w-[280px]">
                                    Frequently asked questions will appear here
                                    once the project owner adds them.
                                  </p>
                                </div>
                              ) : (
                                <ShowMoreLessRoot>
                                  {({
                                    isShowing,
                                    setIsShowing,
                                    scrollHeight,
                                    ref,
                                  }) => (
                                    <>
                                      <Accordion
                                        ref={ref}
                                        type="single"
                                        className={cn(
                                          "pt-6 space-y-[15px] overflow-hidden [interpolate-size:allow-keywords] transition-[height] duration-300"
                                        )}
                                        style={{
                                          height: isShowing
                                            ? "auto"
                                            : scrollHeight
                                              ? toPxIfNumber(scrollHeight)
                                              : "auto",
                                        }}
                                        defaultValue="faq-0"
                                      >
                                        <ShowMoreLessComp max={5}>
                                          {(
                                            project.faqs as Array<{
                                              question: string
                                              answer: string
                                            }>
                                          ).map((faq, idx) => (
                                            <AccordionItem
                                              key={`faq-${idx}`}
                                              className="rounded-lg bg-white border border-gray-300"
                                              value={`faq-${idx}`}
                                            >
                                              <AccordionTrigger className="w-full px-5 py-3 flex items-center gap-x-2 text-base leading-[1.3] font-semibold flex-auto text-dark-blue-400">
                                                <span className="flex-auto text-left inline-block">
                                                  {faq.question}
                                                </span>
                                                <ChevronDown className="size-6 shrink-0 group-data-[state=open]/item:-rotate-180 transition duration-300" />
                                              </AccordionTrigger>
                                              {/*
                                                faq.answer is HTML pre-rendered
                                                by listings-service (Lexical
                                                → HTML via lexicalToHtml).
                                                Content is admin-authored +
                                                moderation-gated per spec, so
                                                dangerouslySetInnerHTML is
                                                safe here — same pattern used
                                                for the fullDescription block.
                                                DisclosureContent always
                                                forwards children, so we wrap
                                                the HTML in an inner div to
                                                avoid the React "children vs
                                                dangerouslySetInnerHTML" clash.
                                              */}
                                              <DisclosureContent className="text-base px-5 pb-5 leading-[1.5] text-dark-blue-400 font-light">
                                                <div
                                                  className="prose prose-sm max-w-none"
                                                  dangerouslySetInnerHTML={{
                                                    __html: faq.answer,
                                                  }}
                                                />
                                              </DisclosureContent>
                                            </AccordionItem>
                                          ))}
                                        </ShowMoreLessComp>
                                      </Accordion>
                                      <div className="flex items-center justify-end mt-6">
                                        <Button
                                          size="md"
                                          visual="gray"
                                          variant="outlined"
                                          className="group bg-white"
                                          onClick={() =>
                                            setIsShowing((prev) => !prev)
                                          }
                                          data-state={
                                            isShowing ? "active" : "inactive"
                                          }
                                        >
                                          {isShowing
                                            ? "View Less"
                                            : "View More"}
                                          <ChevronDown className="size-[15px] transition duration-300 group-data-[state=active]:-rotate-180" />
                                        </Button>
                                      </div>
                                    </>
                                  )}
                                </ShowMoreLessRoot>
                              )}
                            </TabsContent>

                            <TabsContent value="Recently Asked Questions">
                              {(() => {
                                const visibleQuestions = (
                                  (project.recentQuestions as Array<{
                                    question: string
                                    answer?: string | null
                                    hidden?: boolean
                                    moderationFailed?: boolean
                                  }>) ?? []
                                ).filter(
                                  (q) =>
                                    q &&
                                    q.answer &&
                                    !q.hidden &&
                                    !q.moderationFailed
                                )
                                return visibleQuestions.length === 0 ? (
                                  <div className="flex flex-col items-center justify-center py-10 text-center">
                                    <div className="mx-auto mb-3 size-10 rounded-full bg-gray-100 flex items-center justify-center">
                                      <HelpCircle className="size-5 text-gray-400" />
                                    </div>
                                    <h3 className="text-sm font-semibold text-dark-blue-400">
                                      No questions yet
                                    </h3>
                                    <p className="mt-1 text-xs text-gray-500 max-w-[280px]">
                                      When people ask questions on this listing,
                                      they&apos;ll show up here.
                                    </p>
                                  </div>
                                ) : (
                                  <Accordion
                                    type="single"
                                    className="pt-6 space-y-[15px]"
                                    defaultValue="rq-0"
                                  >
                                    {visibleQuestions.map((q, idx) => (
                                      <AccordionItem
                                        key={`rq-${idx}`}
                                        className="rounded-lg bg-white border border-gray-300"
                                        value={`rq-${idx}`}
                                      >
                                        <AccordionTrigger className="w-full px-5 py-3 flex items-center gap-x-2 text-base leading-[1.3] font-semibold flex-auto text-dark-blue-400">
                                          <span className="flex-auto text-left inline-block">
                                            {q.question}
                                          </span>
                                          <ChevronDown className="size-6 shrink-0 group-data-[state=open]/item:-rotate-180 transition duration-300" />
                                        </AccordionTrigger>
                                        <DisclosureContent className="text-base px-5 pb-5 leading-[1.5] text-dark-blue-400 font-light">
                                          {q.answer}
                                        </DisclosureContent>
                                      </AccordionItem>
                                    ))}
                                  </Accordion>
                                )
                              })()}
                            </TabsContent>
                          </Tabs>

                          {!isOwnerViewing && (
                            <div className="py-8 px-6 bg-gray-50 border mt-8 border-gray-200 rounded-lg">
                              <h1 className="text-base font-semibold text-dark-blue-400 text-center">
                                Can’t find what you’re looking for?
                              </h1>

                              <div className="flex items-center justify-center mt-5">
                                <Button
                                  variant="outlined"
                                  visual="gray"
                                  onClick={() => {
                                    if (!user?.id) {
                                      promptSignIn(() => setAskModalOpen(true))
                                      return
                                    }
                                    setAskModalOpen(true)
                                  }}
                                >
                                  Ask a question
                                </Button>
                              </div>
                            </div>
                          )}

                          <Dialog
                            open={askModalOpen}
                            onOpenChange={setAskModalOpen}
                          >
                            <DialogContent className="max-w-[480px] p-6">
                              <DialogTitle className="text-lg font-semibold text-dark-blue-400">
                                Ask Question
                              </DialogTitle>

                              <div className="mt-5">
                                <Label size="sm" className="text-dark-blue-400">
                                  Type your question
                                </Label>
                                <Textarea
                                  autoFocus
                                  isInvalid={showAskErrorMsg}
                                  className="mt-1.5"
                                  placeholder="Enter a description..."
                                  value={pendingQuestion}
                                  onFocus={() => setShowAskErrorMsg(false)}
                                  onChange={(e) => {
                                    const v = e.target.value
                                    setPendingQuestion(v)
                                    if (v.trim()) {
                                      setAskErrored(false)
                                      setShowAskErrorMsg(false)
                                    }
                                  }}
                                />
                                {showAskErrorMsg && (
                                  <span className="mt-1.5 block text-xs font-medium text-error-500">
                                    Please enter your question
                                  </span>
                                )}
                              </div>

                              <div className="mt-6 flex items-center justify-between">
                                <DialogClose asChild>
                                  <Button variant="link" visual="gray">
                                    Cancel
                                  </Button>
                                </DialogClose>
                                <Button onClick={handleAsk}>
                                  Submit Question
                                </Button>
                              </div>
                            </DialogContent>
                          </Dialog>
                        </div>
                      </div>

                      {/* MVP: Project History and reviews hidden until review system is implemented */}
                      {false && <><div className="p-6 mt-6 border gap-x-[50px] flex items-start rounded-lg border-gray-200 bg-white shadow-[0px_1px_5px_0px_rgba(16,24,40,.02)]">
                        <div className="flex flex-col flex-1 gap-y-1.5 basis-[147px]">
                          <h1 className="text-xl leading-none text-nowrap font-bold text-dark-blue-400">
                            Project History
                          </h1>

                          <RatingGroupRoot
                            className="flex-row gap-x-1.5 mt-1.5"
                            allowHalf
                            count={5}
                            defaultValue={4}
                            disabled
                          >
                            <RatingGroupLabel size="sm">4.9</RatingGroupLabel>
                            <RatingGroupControl>
                              <RatingGroupContext>
                                {({ items }) =>
                                  items.map((item) => (
                                    <RatingGroupItem key={item} index={item}>
                                      <RatingGroupItemContext>
                                        {({ half }) =>
                                          half ? (
                                            <TbStarHalfFilled />
                                          ) : (
                                            <TbStar />
                                          )
                                        }
                                      </RatingGroupItemContext>
                                    </RatingGroupItem>
                                  ))
                                }
                              </RatingGroupContext>
                              <RatingGroupHiddenInput />
                            </RatingGroupControl>
                          </RatingGroupRoot>

                          <NextLink
                            href="#"
                            className="focus-visible:outline-none text-xs leading-6 transition duration-300 hover:underline text-dark-blue-400"
                          >
                            23 ratings
                          </NextLink>
                        </div>

                        <div className="flex flex-col flex-1 gap-y-1 basis-[304px]">
                          <div className="flex items-center gap-x-2">
                            <NextLink
                              href="#"
                              className="hover:underline focus-visible:outline-none text-xs font-semibold text-dark-blue-400"
                            >
                              5
                            </NextLink>
                            <Progress className="flex-auto" value={100} />
                            <NextLink
                              href="#"
                              className="hover:underline focus-visible:outline-none text-xs font-semibold leading-[21px] inline-flex items-center gap-x-1 text-dark-blue-400"
                            >
                              100%{" "}
                              <span className="font-extralight">(100)</span>
                            </NextLink>
                          </div>
                          <div className="flex items-center gap-x-2">
                            <NextLink
                              href="#"
                              className="hover:underline focus-visible:outline-none text-xs font-semibold text-dark-blue-400"
                            >
                              4
                            </NextLink>
                            <Progress className="flex-auto" value={75} />
                            <NextLink
                              href="#"
                              className="hover:underline focus-visible:outline-none text-xs font-semibold leading-[21px] inline-flex items-center gap-x-1 text-dark-blue-400"
                            >
                              75% <span className="font-extralight">(75)</span>
                            </NextLink>
                          </div>
                          <div className="flex items-center gap-x-2">
                            <NextLink
                              href="#"
                              className="hover:underline focus-visible:outline-none text-xs font-semibold text-dark-blue-400"
                            >
                              3
                            </NextLink>
                            <Progress className="flex-auto" value={50} />
                            <NextLink
                              href="#"
                              className="hover:underline focus-visible:outline-none text-xs font-semibold leading-[21px] inline-flex items-center gap-x-1 text-dark-blue-400"
                            >
                              50% <span className="font-extralight">(50)</span>
                            </NextLink>
                          </div>
                          <div className="flex items-center gap-x-2">
                            <NextLink
                              href="#"
                              className="hover:underline focus-visible:outline-none text-xs font-semibold text-dark-blue-400"
                            >
                              2
                            </NextLink>
                            <Progress className="flex-auto" value={25} />
                            <NextLink
                              href="#"
                              className="hover:underline focus-visible:outline-none text-xs font-semibold leading-[21px] inline-flex items-center gap-x-1 text-dark-blue-400"
                            >
                              25% <span className="font-extralight">(25)</span>
                            </NextLink>
                          </div>
                          <div className="flex items-center gap-x-2">
                            <NextLink
                              href="#"
                              className="hover:underline focus-visible:outline-none text-xs font-semibold text-dark-blue-400"
                            >
                              1
                            </NextLink>
                            <Progress className="flex-auto" value={0} />
                            <NextLink
                              href="#"
                              className="hover:underline focus-visible:outline-none text-xs font-semibold leading-[21px] inline-flex items-center gap-x-1 text-dark-blue-400"
                            >
                              0% <span className="font-extralight">(0)</span>
                            </NextLink>
                          </div>
                        </div>

                        <div className="flex flex-1 flex-col basis-[304px]">
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <NextLink
                                href="#"
                                className="focus-visible:outline-none text-xs leading-5 font-semibold underline text-gray-500 hover:text-gray-600"
                              >
                                Communication Level
                              </NextLink>

                              <div className="flex items-center gap-x-1">
                                <Star className="size-3.5 text-primary-500 fill-primary-500" />
                                <span className="text-[13px] leading-none font-medium">
                                  4.3
                                </span>
                              </div>
                            </div>

                            <div className="flex items-center justify-between">
                              <NextLink
                                href="#"
                                className="focus-visible:outline-none text-xs leading-5 font-semibold underline text-gray-500 hover:text-gray-600"
                              >
                                Responsiveness
                              </NextLink>

                              <div className="flex items-center gap-x-1">
                                <Star className="size-3.5 text-primary-500 fill-primary-500" />
                                <span className="text-[13px] leading-none font-medium">
                                  4.3
                                </span>
                              </div>
                            </div>

                            <div className="flex items-center justify-between">
                              <NextLink
                                href="#"
                                className="focus-visible:outline-none text-xs leading-5 font-semibold underline text-gray-500 hover:text-gray-600"
                              >
                                Quality of Delivery
                              </NextLink>

                              <div className="flex items-center gap-x-1">
                                <Star className="size-3.5 text-primary-500 fill-primary-500" />
                                <span className="text-[13px] leading-none font-medium">
                                  4.3
                                </span>
                              </div>
                            </div>

                            <div className="flex items-center justify-between">
                              <NextLink
                                href="#"
                                className="focus-visible:outline-none text-xs leading-5 font-semibold underline text-gray-500 hover:text-gray-600"
                              >
                                Value of Delivery
                              </NextLink>

                              <div className="flex items-center gap-x-1">
                                <Star className="size-3.5 text-primary-500 fill-primary-500" />
                                <span className="text-[13px] leading-none font-medium">
                                  4.3
                                </span>
                              </div>
                            </div>

                            <div className="flex items-center justify-between">
                              <NextLink
                                href="#"
                                className="focus-visible:outline-none text-xs leading-5 font-semibold underline text-gray-500 hover:text-gray-600"
                              >
                                Value of Delivery
                              </NextLink>

                              <div className="flex items-center gap-x-1">
                                <Star className="size-3.5 text-primary-500 fill-primary-500" />
                                <span className="text-[13px] leading-none font-medium">
                                  4.9
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      <Tabs className="mt-6" defaultValue="Completed">
                        <RadixTabs.List className="flex items-center justify-between">
                          <div className="flex items-center gap-x-3">
                            <TabsTrigger
                              variant="unstyled"
                              showUnderline={false}
                              value="Completed"
                              className="focus-visible:outline-none py-[7px] bg-white hover:bg-gray-50 hover:border-gray-400 px-3.5 border-2 border-gray-300 data-[state=active]:text-dark-blue-400 data-[state=active]:bg-white hover:data-[state=active]:bg-white data-[state=active]:border-dark-blue-400 hover:data-[state=active]:text-dark-blue-400 hover:data-[state=active]:border-dark-blue-400  text-gray-500 hover:text-gray-600 rounded-full text-sm leading-5 font-medium transition duration-300"
                            >
                              Completed (24)
                            </TabsTrigger>
                            <TabsTrigger
                              variant="unstyled"
                              showUnderline={false}
                              value="Ongoing"
                              className="focus-visible:outline-none py-[7px] bg-white hover:bg-gray-50 hover:border-gray-400 px-3.5 border-2 border-gray-300 data-[state=active]:text-dark-blue-400 data-[state=active]:bg-white hover:data-[state=active]:bg-white data-[state=active]:border-dark-blue-400 hover:data-[state=active]:text-dark-blue-400 hover:data-[state=active]:border-dark-blue-400  text-gray-500 hover:text-gray-600 rounded-full text-sm leading-5 font-medium transition duration-300"
                            >
                              Ongoing (7)
                            </TabsTrigger>
                          </div>

                          <div className="inline-flex items-center gap-x-3">
                            <SectionSearchBar />
                          </div>
                        </RadixTabs.List>

                        <TabsContent value="Completed">
                          <ShowMoreLessRoot>
                            {({
                              isShowing,
                              setIsShowing,
                              ref,
                              scrollHeight,
                            }) => (
                              <>
                                <div
                                  className="[interpolate-size:allow-keywords] overflow-hidden transition-[height] duration-500"
                                  ref={ref}
                                  style={{
                                    height: isShowing
                                      ? "auto"
                                      : scrollHeight
                                        ? toPxIfNumber(scrollHeight)
                                        : "auto",
                                  }}
                                >
                                  <ShowMoreLessComp>
                                    <div className="mt-6 bg-white border border-gray-200 rounded-lg overflow-hidden shadow-[0px_1px_5px_0px_rgba(16,24,40,.02)]">
                                      <div className="flex items-center pt-6 px-6">
                                        <div className="flex-1 w-[394px] space-y-3">
                                          <div className="flex items-start gap-x-3">
                                            <Avatar size="md">
                                              <AvatarImage
                                                src="/man.jpg"
                                                alt="Man"
                                              />
                                              <AvatarFallback>M</AvatarFallback>
                                            </Avatar>

                                            <div className="space-y-3">
                                              <div className="flex flex-col gap-y-1.5">
                                                <div className="inline-flex items-center gap-x-1">
                                                  <span className="text-base leading-6 font-semibold text-dark-blue-400">
                                                    Emily
                                                  </span>
                                                  <span className="text-base leading-6 text-dark-blue-400">
                                                    @emily.j
                                                  </span>
                                                </div>

                                                <div className="mt-1.5">
                                                  <span className="text-[13px] leading-6 text-dark-blue-400">
                                                    Product Manager
                                                  </span>
                                                </div>
                                              </div>

                                              <div className="inline-flex items-center gap-x-2">
                                                <span className="text-xs leading-none text-dark-blue-400">
                                                  December 2020 - Present
                                                </span>
                                                <span className="shrink-0 size-1 rounded-full bg-gray-300 inline-block" />
                                                <span className="text-xs leading-none text-dark-blue-400">
                                                  5 yrs 2 mos
                                                </span>
                                              </div>
                                            </div>
                                          </div>

                                          <div className="flex items-center gap-x-2">
                                            <div className="inline-flex items-center gap-x-[2.35px]">
                                              <Favorite
                                                defaultPressed
                                                className="size-[15px]"
                                              />
                                              <Favorite
                                                defaultPressed
                                                className="size-[15px]"
                                              />
                                              <Favorite
                                                defaultPressed
                                                className="size-[15px]"
                                              />
                                              <Favorite
                                                defaultPressed
                                                className="size-[15px]"
                                              />
                                              <Favorite
                                                defaultPressed
                                                className="size-[15px]"
                                              />
                                            </div>

                                            <span className="text-base leading-[28.16px] font-bold text-dark-blue-400">
                                              4.8
                                            </span>

                                            <span className="text-[11px] leading-6 font-extralight text-dark-blue-400">
                                              Posted a week ago
                                            </span>
                                          </div>
                                        </div>

                                        <div className="flex-1 w-[477px] inline-grid grid-cols-2 gap-y-4 gap-x-[50px] pb-3">
                                          <div className="flex items-center gap-x-[6.4px]">
                                            <CheckCircle className="size-[18px] text-success-500" />
                                            <span className="text-sm text-dark-blue-400 leading-none font-medium">
                                              Would Recommend
                                            </span>
                                          </div>
                                          <div className="flex items-center gap-x-[6.4px]">
                                            <CheckCircle className="size-[18px] text-success-500" />
                                            <span className="text-sm text-dark-blue-400 leading-none font-medium">
                                              Would Recommend
                                            </span>
                                          </div>
                                          <div className="flex items-center gap-x-[6.4px]">
                                            <CheckCircle className="size-[18px] text-success-500" />
                                            <span className="text-sm text-dark-blue-400 leading-none font-medium">
                                              Would Recommend
                                            </span>
                                          </div>
                                          <div className="flex items-center gap-x-[6.4px]">
                                            <CheckCircle className="size-[18px] text-success-500" />
                                            <span className="text-sm text-dark-blue-400 leading-none font-medium">
                                              Would Recommend
                                            </span>
                                          </div>
                                        </div>
                                      </div>

                                      <div className="mt-3 px-6">
                                        <h1 className="text-sm leading-6 font-semibold text-dark-blue-400">
                                          Best Experience with a Backend
                                          Engineer!!!!
                                        </h1>
                                        <ReadMoreLessRoot>
                                          <ReadMoreLessComp
                                            max={32}
                                            text="Lorem ipsum dolor sit amet consectetur adipisicing elit. Voluptate doloremque impedit eveniet harum dolores modi dolor, aspernatur saepe incidunt consequuntur et voluptatem dolorem ea sequi officia distinctio perspiciatis labore fugit eligendi architecto similique esse assumenda fugiat? Aut tempora veritatis, similique exercitationem quos consequuntur repudiandae, quaerat nesciunt ducimus beatae tempore alias repellendus id quidem pariatur blanditiis architecto quasi aperiam fugiat maiores?"
                                          >
                                            {({ readMore, text, toggle }) => (
                                              <>
                                                <p className="text-sm leading-none mt-1 text-gray-700 font-extralight">
                                                  {text}{" "}
                                                  <Button
                                                    className="text-gray-700 hover:no-underline hover:text-gray-900 font-semibold"
                                                    size="sm"
                                                    variant="link"
                                                    visual="gray"
                                                    onClick={toggle}
                                                  >
                                                    {readMore
                                                      ? null
                                                      : "...Read More"}
                                                  </Button>
                                                </p>
                                              </>
                                            )}
                                          </ReadMoreLessComp>
                                        </ReadMoreLessRoot>

                                        <div className="mt-3 flex items-center justify-between">
                                          <div className="items-center inline-flex gap-x-2.5">
                                            <span className="text-xs font-medium leading-none text-dark-blue-400">
                                              Helpful
                                            </span>
                                            <LikeDislike></LikeDislike>
                                          </div>
                                        </div>
                                      </div>

                                      <div className="mt-6 flex items-center gap-x-3 px-6 pb-6">
                                        <div className="border border-black/10 w-[153px] relative rounded-lg overflow-hidden h-[98px]">
                                          <NextImage
                                            className="object-cover"
                                            src="/dashboard.png"
                                            alt="Dashboard"
                                            fill
                                            sizes="25vw"
                                          />
                                        </div>

                                        <div className="flex-auto space-y-3">
                                          <h1 className="text-sm font-bold leading-6 text-dark-blue-400">
                                            Seniority Mobile App
                                          </h1>

                                          <div className="flex gap-x-8 items-center">
                                            <div className="inline-flex items-center gap-x-3">
                                              <span className="text-sm text-dark-blue-400 leading-6">
                                                Project Cost
                                              </span>
                                              <span className="text-sm font-bold text-dark-blue-400 leading-6">
                                                Project Cost
                                              </span>
                                            </div>
                                            <div className="inline-flex items-center gap-x-3">
                                              <span className="text-sm text-dark-blue-400 leading-6">
                                                Project Cost
                                              </span>
                                              <span className="text-sm font-bold text-dark-blue-400 leading-6">
                                                Project Cost
                                              </span>
                                            </div>
                                            <div className="inline-flex items-center gap-x-3">
                                              <span className="text-sm text-dark-blue-400 leading-6">
                                                Project Cost
                                              </span>
                                              <span className="text-sm font-bold text-dark-blue-400 leading-6">
                                                Project Cost
                                              </span>
                                            </div>
                                          </div>

                                          <div className="flex items-center gap-x-2">
                                            <Badge size="sm" visual="gray">
                                              Team player
                                            </Badge>
                                            <Badge size="sm" visual="gray">
                                              Team player
                                            </Badge>
                                            <Badge size="sm" visual="gray">
                                              Team player
                                            </Badge>
                                            <Badge size="sm" visual="gray">
                                              Team player
                                            </Badge>
                                          </div>
                                        </div>
                                      </div>
                                    </div>

                                    <div className="mt-6 bg-white border border-gray-200 rounded-lg overflow-hidden shadow-[0px_1px_5px_0px_rgba(16,24,40,.02)]">
                                      <div className="flex items-center pt-6 px-6">
                                        <div className="flex-1 w-[394px] space-y-3">
                                          <div className="flex items-start gap-x-3">
                                            <Avatar size="md">
                                              <AvatarImage
                                                src="/man.jpg"
                                                alt="Man"
                                              />
                                              <AvatarFallback>M</AvatarFallback>
                                            </Avatar>

                                            <div className="space-y-3">
                                              <div className="flex flex-col gap-y-1.5">
                                                <div className="inline-flex items-center gap-x-1">
                                                  <span className="text-base leading-6 font-semibold text-dark-blue-400">
                                                    Emily
                                                  </span>
                                                  <span className="text-base leading-6 text-dark-blue-400">
                                                    @emily.j
                                                  </span>
                                                </div>

                                                <div className="mt-1.5">
                                                  <span className="text-[13px] leading-6 text-dark-blue-400">
                                                    Product Manager
                                                  </span>
                                                </div>
                                              </div>

                                              <div className="inline-flex items-center gap-x-2">
                                                <span className="text-xs leading-none text-dark-blue-400">
                                                  December 2020 - Present
                                                </span>
                                                <span className="shrink-0 size-1 rounded-full bg-gray-300 inline-block" />
                                                <span className="text-xs leading-none text-dark-blue-400">
                                                  5 yrs 2 mos
                                                </span>
                                              </div>
                                            </div>
                                          </div>

                                          <div className="flex items-center gap-x-2">
                                            <div className="inline-flex items-center gap-x-[2.35px]">
                                              <Favorite
                                                defaultPressed
                                                className="size-[15px]"
                                              />
                                              <Favorite
                                                defaultPressed
                                                className="size-[15px]"
                                              />
                                              <Favorite
                                                defaultPressed
                                                className="size-[15px]"
                                              />
                                              <Favorite
                                                defaultPressed
                                                className="size-[15px]"
                                              />
                                              <Favorite
                                                defaultPressed
                                                className="size-[15px]"
                                              />
                                            </div>

                                            <span className="text-base leading-[28.16px] font-bold text-dark-blue-400">
                                              4.8
                                            </span>

                                            <span className="text-[11px] leading-6 font-extralight text-dark-blue-400">
                                              Posted a week ago
                                            </span>
                                          </div>
                                        </div>

                                        <div className="flex-1 w-[477px] inline-grid grid-cols-2 gap-y-4 gap-x-[50px] pb-3">
                                          <div className="flex items-center gap-x-[6.4px]">
                                            <CheckCircle className="size-[18px] text-success-500" />
                                            <span className="text-sm text-dark-blue-400 leading-none font-medium">
                                              Would Recommend
                                            </span>
                                          </div>
                                          <div className="flex items-center gap-x-[6.4px]">
                                            <CheckCircle className="size-[18px] text-success-500" />
                                            <span className="text-sm text-dark-blue-400 leading-none font-medium">
                                              Would Recommend
                                            </span>
                                          </div>
                                          <div className="flex items-center gap-x-[6.4px]">
                                            <CheckCircle className="size-[18px] text-success-500" />
                                            <span className="text-sm text-dark-blue-400 leading-none font-medium">
                                              Would Recommend
                                            </span>
                                          </div>
                                          <div className="flex items-center gap-x-[6.4px]">
                                            <CheckCircle className="size-[18px] text-success-500" />
                                            <span className="text-sm text-dark-blue-400 leading-none font-medium">
                                              Would Recommend
                                            </span>
                                          </div>
                                        </div>
                                      </div>

                                      <div className="mt-3 px-6">
                                        <h1 className="text-sm leading-6 font-semibold text-dark-blue-400">
                                          Best Experience with a Backend
                                          Engineer!!!!
                                        </h1>
                                        <ReadMoreLessRoot>
                                          <ReadMoreLessComp
                                            max={32}
                                            text="Lorem ipsum dolor sit amet consectetur adipisicing elit. Voluptate doloremque impedit eveniet harum dolores modi dolor, aspernatur saepe incidunt consequuntur et voluptatem dolorem ea sequi officia distinctio perspiciatis labore fugit eligendi architecto similique esse assumenda fugiat? Aut tempora veritatis, similique exercitationem quos consequuntur repudiandae, quaerat nesciunt ducimus beatae tempore alias repellendus id quidem pariatur blanditiis architecto quasi aperiam fugiat maiores?"
                                          >
                                            {({ readMore, text, toggle }) => (
                                              <>
                                                <p className="text-sm leading-none mt-1 text-gray-700 font-extralight">
                                                  {text}{" "}
                                                  <Button
                                                    className="text-gray-700 hover:no-underline hover:text-gray-900 font-semibold"
                                                    size="sm"
                                                    variant="link"
                                                    visual="gray"
                                                    onClick={toggle}
                                                  >
                                                    {readMore
                                                      ? null
                                                      : "...Read More"}
                                                  </Button>
                                                </p>
                                              </>
                                            )}
                                          </ReadMoreLessComp>
                                        </ReadMoreLessRoot>

                                        <div className="mt-3 flex items-center justify-between">
                                          <div className="items-center inline-flex gap-x-2.5">
                                            <span className="text-xs font-medium leading-none text-dark-blue-400">
                                              Helpful
                                            </span>

                                            <LikeDislike></LikeDislike>
                                          </div>
                                        </div>
                                      </div>

                                      <div className="mt-6 flex items-center gap-x-3 px-6 pb-6">
                                        <div className="border border-black/10 w-[153px] relative rounded-lg overflow-hidden h-[98px]">
                                          <NextImage
                                            className="object-cover"
                                            src="/dashboard.png"
                                            alt="Dashboard"
                                            fill
                                            sizes="25vw"
                                          />
                                        </div>

                                        <div className="flex-auto space-y-3">
                                          <h1 className="text-sm font-bold leading-6 text-dark-blue-400">
                                            Seniority Mobile App
                                          </h1>

                                          <div className="flex gap-x-8 items-center">
                                            <div className="inline-flex items-center gap-x-3">
                                              <span className="text-sm text-dark-blue-400 leading-6">
                                                Project Cost
                                              </span>
                                              <span className="text-sm font-bold text-dark-blue-400 leading-6">
                                                Project Cost
                                              </span>
                                            </div>
                                            <div className="inline-flex items-center gap-x-3">
                                              <span className="text-sm text-dark-blue-400 leading-6">
                                                Project Cost
                                              </span>
                                              <span className="text-sm font-bold text-dark-blue-400 leading-6">
                                                Project Cost
                                              </span>
                                            </div>
                                            <div className="inline-flex items-center gap-x-3">
                                              <span className="text-sm text-dark-blue-400 leading-6">
                                                Project Cost
                                              </span>
                                              <span className="text-sm font-bold text-dark-blue-400 leading-6">
                                                Project Cost
                                              </span>
                                            </div>
                                          </div>

                                          <div className="flex items-center gap-x-2">
                                            <Badge size="sm" visual="gray">
                                              Team player
                                            </Badge>
                                            <Badge size="sm" visual="gray">
                                              Team player
                                            </Badge>
                                            <Badge size="sm" visual="gray">
                                              Team player
                                            </Badge>
                                            <Badge size="sm" visual="gray">
                                              Team player
                                            </Badge>
                                          </div>
                                        </div>
                                      </div>

                                      <div className="p-6 bg-white border-gray-200 shadow-[0px_1px_5px_0px_rgba(16,24,40,.02)] border-t">
                                        <div className="flex items-center gap-x-3">
                                          <Avatar
                                            className="hover:ring-0 active:ring-primary-100"
                                            size="md"
                                          >
                                            <AvatarImage
                                              src="/man.jpg"
                                              alt="Man"
                                            />
                                            <AvatarFallbackIcon />
                                          </Avatar>

                                          <div className="flex flex-col flex-1">
                                            <div className="inline-flex items-center gap-x-1">
                                              <span className="text-sm leading-6 font-bold text-dark-blue-400">
                                                Company Response
                                              </span>
                                              <span className="text-sm leading-6 text-dark-blue-400">
                                                @Acme Inc.
                                              </span>
                                            </div>

                                            <div className="inline-flex items-center gap-x-2">
                                              <span className="text-xs leading-none text-dark-blue-400">
                                                90 days project
                                              </span>
                                              <span className="shrink-0 size-1 rounded-full bg-gray-300 inline-block" />
                                              <span className="text-xs leading-none text-dark-blue-400">
                                                March 2023
                                              </span>
                                            </div>
                                          </div>
                                        </div>

                                        <ReadMoreLessRoot>
                                          <ReadMoreLessComp
                                            max={32}
                                            text="Lorem ipsum dolor sit amet consectetur adipisicing elit. Voluptate doloremque impedit eveniet harum dolores modi dolor, aspernatur saepe incidunt consequuntur et voluptatem dolorem ea sequi officia distinctio perspiciatis labore fugit eligendi architecto similique esse assumenda fugiat? Aut tempora veritatis, similique exercitationem quos consequuntur repudiandae, quaerat nesciunt ducimus beatae tempore alias repellendus id quidem pariatur blanditiis architecto quasi aperiam fugiat maiores?"
                                          >
                                            {({ readMore, text, toggle }) => (
                                              <>
                                                <p className="text-sm leading-none mt-1 text-gray-700 font-extralight">
                                                  {text}{" "}
                                                  <Button
                                                    className="text-gray-700 hover:no-underline hover:text-gray-900 font-semibold"
                                                    size="sm"
                                                    variant="link"
                                                    visual="gray"
                                                    onClick={toggle}
                                                  >
                                                    {readMore
                                                      ? null
                                                      : "...Read More"}
                                                  </Button>
                                                </p>
                                              </>
                                            )}
                                          </ReadMoreLessComp>
                                        </ReadMoreLessRoot>

                                        <div className="mt-3 flex items-center justify-between">
                                          <div className="items-center inline-flex gap-x-2.5">
                                            <span className="text-xs font-medium leading-none text-dark-blue-400">
                                              Helpful
                                            </span>
                                            <LikeDislike></LikeDislike>
                                          </div>
                                        </div>
                                      </div>
                                    </div>

                                    <div className="mt-6 bg-white border border-gray-200 rounded-lg overflow-hidden shadow-[0px_1px_5px_0px_rgba(16,24,40,.02)]">
                                      <div className="flex items-center pt-6 px-6">
                                        <div className="flex-1 w-[394px] space-y-3">
                                          <div className="flex items-start gap-x-3">
                                            <Avatar size="md">
                                              <AvatarImage
                                                src="/man.jpg"
                                                alt="Man"
                                              />
                                              <AvatarFallback>M</AvatarFallback>
                                            </Avatar>

                                            <div className="space-y-3">
                                              <div className="flex flex-col gap-y-1.5">
                                                <div className="inline-flex items-center gap-x-1">
                                                  <span className="text-base leading-6 font-semibold text-dark-blue-400">
                                                    Emily
                                                  </span>
                                                  <span className="text-base leading-6 text-dark-blue-400">
                                                    @emily.j
                                                  </span>
                                                </div>

                                                <div className="mt-1.5">
                                                  <span className="text-[13px] leading-6 text-dark-blue-400">
                                                    Product Manager
                                                  </span>
                                                </div>
                                              </div>

                                              <div className="inline-flex items-center gap-x-2">
                                                <span className="text-xs leading-none text-dark-blue-400">
                                                  December 2020 - Present
                                                </span>
                                                <span className="shrink-0 size-1 rounded-full bg-gray-300 inline-block" />
                                                <span className="text-xs leading-none text-dark-blue-400">
                                                  5 yrs 2 mos
                                                </span>
                                              </div>
                                            </div>
                                          </div>

                                          <div className="flex items-center gap-x-2">
                                            <div className="inline-flex items-center gap-x-[2.35px]">
                                              <Favorite
                                                defaultPressed
                                                className="size-[15px]"
                                              />
                                              <Favorite
                                                defaultPressed
                                                className="size-[15px]"
                                              />
                                              <Favorite
                                                defaultPressed
                                                className="size-[15px]"
                                              />
                                              <Favorite
                                                defaultPressed
                                                className="size-[15px]"
                                              />
                                              <Favorite
                                                defaultPressed
                                                className="size-[15px]"
                                              />
                                            </div>

                                            <span className="text-base leading-[28.16px] font-bold text-dark-blue-400">
                                              4.8
                                            </span>

                                            <span className="text-[11px] leading-6 font-extralight text-dark-blue-400">
                                              Posted a week ago
                                            </span>
                                          </div>
                                        </div>

                                        <div className="flex-1 w-[477px] inline-grid grid-cols-2 gap-y-4 gap-x-[50px] pb-3">
                                          <div className="flex items-center gap-x-[6.4px]">
                                            <CheckCircle className="size-[18px] text-success-500" />
                                            <span className="text-sm text-dark-blue-400 leading-none font-medium">
                                              Would Recommend
                                            </span>
                                          </div>
                                          <div className="flex items-center gap-x-[6.4px]">
                                            <CheckCircle className="size-[18px] text-success-500" />
                                            <span className="text-sm text-dark-blue-400 leading-none font-medium">
                                              Would Recommend
                                            </span>
                                          </div>
                                          <div className="flex items-center gap-x-[6.4px]">
                                            <CheckCircle className="size-[18px] text-success-500" />
                                            <span className="text-sm text-dark-blue-400 leading-none font-medium">
                                              Would Recommend
                                            </span>
                                          </div>
                                          <div className="flex items-center gap-x-[6.4px]">
                                            <CheckCircle className="size-[18px] text-success-500" />
                                            <span className="text-sm text-dark-blue-400 leading-none font-medium">
                                              Would Recommend
                                            </span>
                                          </div>
                                        </div>
                                      </div>

                                      <div className="mt-3 px-6">
                                        <h1 className="text-sm leading-6 font-semibold text-dark-blue-400">
                                          Best Experience with a Backend
                                          Engineer!!!!
                                        </h1>
                                        <ReadMoreLessRoot>
                                          <ReadMoreLessComp
                                            max={32}
                                            text="Lorem ipsum dolor sit amet consectetur adipisicing elit. Voluptate doloremque impedit eveniet harum dolores modi dolor, aspernatur saepe incidunt consequuntur et voluptatem dolorem ea sequi officia distinctio perspiciatis labore fugit eligendi architecto similique esse assumenda fugiat? Aut tempora veritatis, similique exercitationem quos consequuntur repudiandae, quaerat nesciunt ducimus beatae tempore alias repellendus id quidem pariatur blanditiis architecto quasi aperiam fugiat maiores?"
                                          >
                                            {({ readMore, text, toggle }) => (
                                              <>
                                                <p className="text-sm leading-none mt-1 text-gray-700 font-extralight">
                                                  {text}{" "}
                                                  <Button
                                                    className="text-gray-700 hover:no-underline hover:text-gray-900 font-semibold"
                                                    size="sm"
                                                    variant="link"
                                                    visual="gray"
                                                    onClick={toggle}
                                                  >
                                                    {readMore
                                                      ? null
                                                      : "...Read More"}
                                                  </Button>
                                                </p>
                                              </>
                                            )}
                                          </ReadMoreLessComp>
                                        </ReadMoreLessRoot>

                                        <div className="mt-3 flex items-center justify-between">
                                          <div className="items-center inline-flex gap-x-2.5">
                                            <span className="text-xs font-medium leading-none text-dark-blue-400">
                                              Helpful
                                            </span>

                                            <LikeDislike></LikeDislike>
                                          </div>
                                        </div>
                                      </div>

                                      <div className="mt-6 flex items-center gap-x-3 px-6 pb-6">
                                        <div className="border border-black/10 w-[153px] relative rounded-lg overflow-hidden h-[98px]">
                                          <NextImage
                                            className="object-cover"
                                            src="/dashboard.png"
                                            alt="Dashboard"
                                            fill
                                            sizes="25vw"
                                          />
                                        </div>

                                        <div className="flex-auto space-y-3">
                                          <h1 className="text-sm font-bold leading-6 text-dark-blue-400">
                                            Seniority Mobile App
                                          </h1>

                                          <div className="flex gap-x-8 items-center">
                                            <div className="inline-flex items-center gap-x-3">
                                              <span className="text-sm text-dark-blue-400 leading-6">
                                                Project Cost
                                              </span>
                                              <span className="text-sm font-bold text-dark-blue-400 leading-6">
                                                Project Cost
                                              </span>
                                            </div>
                                            <div className="inline-flex items-center gap-x-3">
                                              <span className="text-sm text-dark-blue-400 leading-6">
                                                Project Cost
                                              </span>
                                              <span className="text-sm font-bold text-dark-blue-400 leading-6">
                                                Project Cost
                                              </span>
                                            </div>
                                            <div className="inline-flex items-center gap-x-3">
                                              <span className="text-sm text-dark-blue-400 leading-6">
                                                Project Cost
                                              </span>
                                              <span className="text-sm font-bold text-dark-blue-400 leading-6">
                                                Project Cost
                                              </span>
                                            </div>
                                          </div>

                                          <div className="flex items-center gap-x-2">
                                            <Badge size="sm" visual="gray">
                                              Team player
                                            </Badge>
                                            <Badge size="sm" visual="gray">
                                              Team player
                                            </Badge>
                                            <Badge size="sm" visual="gray">
                                              Team player
                                            </Badge>
                                            <Badge size="sm" visual="gray">
                                              Team player
                                            </Badge>
                                          </div>
                                        </div>
                                      </div>
                                    </div>

                                    <div className="mt-6 bg-white border border-gray-200 rounded-lg overflow-hidden shadow-[0px_1px_5px_0px_rgba(16,24,40,.02)]">
                                      <div className="flex items-center pt-6 px-6">
                                        <div className="flex-1 w-[394px] space-y-3">
                                          <div className="flex items-start gap-x-3">
                                            <Avatar size="md">
                                              <AvatarImage
                                                src="/man.jpg"
                                                alt="Man"
                                              />
                                              <AvatarFallback>M</AvatarFallback>
                                            </Avatar>

                                            <div className="space-y-3">
                                              <div className="flex flex-col gap-y-1.5">
                                                <div className="inline-flex items-center gap-x-1">
                                                  <span className="text-base leading-6 font-semibold text-dark-blue-400">
                                                    Emily
                                                  </span>
                                                  <span className="text-base leading-6 text-dark-blue-400">
                                                    @emily.j
                                                  </span>
                                                </div>

                                                <div className="mt-1.5">
                                                  <span className="text-[13px] leading-6 text-dark-blue-400">
                                                    Product Manager
                                                  </span>
                                                </div>
                                              </div>

                                              <div className="inline-flex items-center gap-x-2">
                                                <span className="text-xs leading-none text-dark-blue-400">
                                                  December 2020 - Present
                                                </span>
                                                <span className="shrink-0 size-1 rounded-full bg-gray-300 inline-block" />
                                                <span className="text-xs leading-none text-dark-blue-400">
                                                  5 yrs 2 mos
                                                </span>
                                              </div>
                                            </div>
                                          </div>

                                          <div className="flex items-center gap-x-2">
                                            <div className="inline-flex items-center gap-x-[2.35px]">
                                              <Favorite
                                                defaultPressed
                                                className="size-[15px]"
                                              />
                                              <Favorite
                                                defaultPressed
                                                className="size-[15px]"
                                              />
                                              <Favorite
                                                defaultPressed
                                                className="size-[15px]"
                                              />
                                              <Favorite
                                                defaultPressed
                                                className="size-[15px]"
                                              />
                                              <Favorite
                                                defaultPressed
                                                className="size-[15px]"
                                              />
                                            </div>

                                            <span className="text-base leading-[28.16px] font-bold text-dark-blue-400">
                                              4.8
                                            </span>

                                            <span className="text-[11px] leading-6 font-extralight text-dark-blue-400">
                                              Posted a week ago
                                            </span>
                                          </div>
                                        </div>

                                        <div className="flex-1 w-[477px] inline-grid grid-cols-2 gap-y-4 gap-x-[50px] pb-3">
                                          <div className="flex items-center gap-x-[6.4px]">
                                            <CheckCircle className="size-[18px] text-success-500" />
                                            <span className="text-sm text-dark-blue-400 leading-none font-medium">
                                              Would Recommend
                                            </span>
                                          </div>
                                          <div className="flex items-center gap-x-[6.4px]">
                                            <CheckCircle className="size-[18px] text-success-500" />
                                            <span className="text-sm text-dark-blue-400 leading-none font-medium">
                                              Would Recommend
                                            </span>
                                          </div>
                                          <div className="flex items-center gap-x-[6.4px]">
                                            <CheckCircle className="size-[18px] text-success-500" />
                                            <span className="text-sm text-dark-blue-400 leading-none font-medium">
                                              Would Recommend
                                            </span>
                                          </div>
                                          <div className="flex items-center gap-x-[6.4px]">
                                            <CheckCircle className="size-[18px] text-success-500" />
                                            <span className="text-sm text-dark-blue-400 leading-none font-medium">
                                              Would Recommend
                                            </span>
                                          </div>
                                        </div>
                                      </div>

                                      <div className="mt-3 px-6">
                                        <h1 className="text-sm leading-6 font-semibold text-dark-blue-400">
                                          Best Experience with a Backend
                                          Engineer!!!!
                                        </h1>
                                        <ReadMoreLessRoot>
                                          <ReadMoreLessComp
                                            max={32}
                                            text="Lorem ipsum dolor sit amet consectetur adipisicing elit. Voluptate doloremque impedit eveniet harum dolores modi dolor, aspernatur saepe incidunt consequuntur et voluptatem dolorem ea sequi officia distinctio perspiciatis labore fugit eligendi architecto similique esse assumenda fugiat? Aut tempora veritatis, similique exercitationem quos consequuntur repudiandae, quaerat nesciunt ducimus beatae tempore alias repellendus id quidem pariatur blanditiis architecto quasi aperiam fugiat maiores?"
                                          >
                                            {({ readMore, text, toggle }) => (
                                              <>
                                                <p className="text-sm leading-none mt-1 text-gray-700 font-extralight">
                                                  {text}{" "}
                                                  <Button
                                                    className="text-gray-700 hover:no-underline hover:text-gray-900 font-semibold"
                                                    size="sm"
                                                    variant="link"
                                                    visual="gray"
                                                    onClick={toggle}
                                                  >
                                                    {readMore
                                                      ? null
                                                      : "...Read More"}
                                                  </Button>
                                                </p>
                                              </>
                                            )}
                                          </ReadMoreLessComp>
                                        </ReadMoreLessRoot>

                                        <div className="mt-3 flex items-center justify-between">
                                          <div className="items-center inline-flex gap-x-2.5">
                                            <span className="text-xs font-medium leading-none text-dark-blue-400">
                                              Helpful
                                            </span>

                                            <LikeDislike></LikeDislike>
                                          </div>
                                        </div>
                                      </div>

                                      <div className="mt-6 flex items-center gap-x-3 px-6 pb-6">
                                        <div className="border border-black/10 w-[153px] relative rounded-lg overflow-hidden h-[98px]">
                                          <NextImage
                                            className="object-cover"
                                            src="/dashboard.png"
                                            alt="Dashboard"
                                            fill
                                            sizes="25vw"
                                          />
                                        </div>

                                        <div className="flex-auto space-y-3">
                                          <h1 className="text-sm font-bold leading-6 text-dark-blue-400">
                                            Seniority Mobile App
                                          </h1>

                                          <div className="flex gap-x-8 items-center">
                                            <div className="inline-flex items-center gap-x-3">
                                              <span className="text-sm text-dark-blue-400 leading-6">
                                                Project Cost
                                              </span>
                                              <span className="text-sm font-bold text-dark-blue-400 leading-6">
                                                Project Cost
                                              </span>
                                            </div>
                                            <div className="inline-flex items-center gap-x-3">
                                              <span className="text-sm text-dark-blue-400 leading-6">
                                                Project Cost
                                              </span>
                                              <span className="text-sm font-bold text-dark-blue-400 leading-6">
                                                Project Cost
                                              </span>
                                            </div>
                                            <div className="inline-flex items-center gap-x-3">
                                              <span className="text-sm text-dark-blue-400 leading-6">
                                                Project Cost
                                              </span>
                                              <span className="text-sm font-bold text-dark-blue-400 leading-6">
                                                Project Cost
                                              </span>
                                            </div>
                                          </div>

                                          <div className="flex items-center gap-x-2">
                                            <Badge size="sm" visual="gray">
                                              Team player
                                            </Badge>
                                            <Badge size="sm" visual="gray">
                                              Team player
                                            </Badge>
                                            <Badge size="sm" visual="gray">
                                              Team player
                                            </Badge>
                                            <Badge size="sm" visual="gray">
                                              Team player
                                            </Badge>
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  </ShowMoreLessComp>
                                </div>

                                <div className="flex items-center justify-end mt-6">
                                  <Button
                                    size="md"
                                    visual="gray"
                                    variant="outlined"
                                    className="group bg-white"
                                    onClick={() =>
                                      setIsShowing((prev) => !prev)
                                    }
                                    data-state={
                                      isShowing ? "active" : "inactive"
                                    }
                                  >
                                    {isShowing
                                      ? "View Less"
                                      : "Show More Feedback (6)"}
                                    <ChevronDown className="size-[15px] transition duration-300 group-data-[state=active]:-rotate-180" />
                                  </Button>
                                </div>
                              </>
                            )}
                          </ShowMoreLessRoot>
                        </TabsContent>

                        <TabsContent value="Ongoing">
                          <div className="mt-6 space-y-6">
                            <article className="border p-6 rounded-lg bg-white border-gray-200 shadow-[0px_1px_5px_0px_rgba(16,24,40,.02)]">
                              <div className="flex items-start gap-x-4">
                                <div className="relative overflow-hidden rounded-md shrink-0 w-[134px] h-[86px]">
                                  <NextImage
                                    src="/dashboard.png"
                                    alt="Dashboard"
                                    fill
                                    sizes="25vw"
                                  />
                                </div>

                                <div className="space-y-2">
                                  <div className="flex items-center gap-x-2">
                                    <h1 className="text-sm font-bold text-dark-blue-400">
                                      Seniority Mobile App
                                    </h1>
                                    <Badge
                                      className="border rounded-[3.15px] bg-white border-gray-300"
                                      visual="gray"
                                      variant="rounded"
                                    >
                                      <FileText className="size-[9.46px] text-primary-500" />{" "}
                                      Under NDA
                                    </Badge>
                                  </div>

                                  <div className="mt-2 flex items-center gap-x-6">
                                    <div className="flex gap-x-3">
                                      <span className="text-xs leading-6 text-dark-blue-400">
                                        Estimated Project Cost
                                      </span>
                                      <span className="font-bold text-sm leading-6 text-dark-blue-400">
                                        $25,000
                                      </span>
                                    </div>
                                    <div className="flex gap-x-3">
                                      <span className="text-xs leading-6 text-dark-blue-400">
                                        Project Type
                                      </span>
                                      <span className="font-bold text-sm leading-6 text-dark-blue-400">
                                        Cloud Software
                                      </span>
                                    </div>
                                    <div className="flex gap-x-3">
                                      <span className="text-xs leading-6 text-dark-blue-400">
                                        Current Phase
                                      </span>
                                      <span className="font-bold text-sm leading-6 text-dark-blue-400">
                                        Development
                                      </span>
                                    </div>
                                  </div>

                                  <div className="mt-2 flex items-center gap-x-2">
                                    <Badge>API-Driven</Badge>
                                    <Badge>Agile Workflow</Badge>
                                    <Badge>Cross-Platform</Badge>
                                    <Badge>Cloud-Based</Badge>
                                    <Badge>Mobile-Optimized</Badge>
                                    <Badge>FinTech</Badge>
                                    <Badge>SaaS</Badge>
                                  </div>
                                </div>
                              </div>

                              <div className="flex items-center gap-x-3 mt-3">
                                <div className="flex items-center gap-x-4">
                                  <AvatarGroup
                                    excessClassName="border-gray-300 text-gray-500"
                                    excess
                                  >
                                    <Avatar className="border-2 border-white hover:ring-0 active:ring-0">
                                      <AvatarImage
                                        src="/woman.jpg"
                                        alt="Woman"
                                      />
                                      <AvatarFallback>W</AvatarFallback>
                                    </Avatar>
                                    <Avatar className="border-2 border-white hover:ring-0 active:ring-0">
                                      <AvatarImage
                                        src="/woman.jpg"
                                        alt="Woman"
                                      />
                                      <AvatarFallback>W</AvatarFallback>
                                    </Avatar>
                                    <Avatar className="border-2 border-white hover:ring-0 active:ring-0">
                                      <AvatarImage
                                        src="/woman.jpg"
                                        alt="Woman"
                                      />
                                      <AvatarFallback>W</AvatarFallback>
                                    </Avatar>
                                    <Avatar className="border-2 border-white hover:ring-0 active:ring-0">
                                      <AvatarImage
                                        src="/woman.jpg"
                                        alt="Woman"
                                      />
                                      <AvatarFallback>W</AvatarFallback>
                                    </Avatar>
                                    <Avatar className="border-2 border-white hover:ring-0 active:ring-0">
                                      <AvatarImage
                                        src="/woman.jpg"
                                        alt="Woman"
                                      />
                                      <AvatarFallback>W</AvatarFallback>
                                    </Avatar>
                                    <Avatar className="border-2 border-white hover:ring-0 active:ring-0">
                                      <AvatarImage
                                        src="/woman.jpg"
                                        alt="Woman"
                                      />
                                      <AvatarFallback>W</AvatarFallback>
                                    </Avatar>
                                    <Avatar className="border-2 border-white hover:ring-0 active:ring-0">
                                      <AvatarImage
                                        src="/woman.jpg"
                                        alt="Woman"
                                      />
                                      <AvatarFallback>W</AvatarFallback>
                                    </Avatar>
                                    <Avatar className="border-2 border-white hover:ring-0 active:ring-0">
                                      <AvatarImage
                                        src="/woman.jpg"
                                        alt="Woman"
                                      />
                                      <AvatarFallback>W</AvatarFallback>
                                    </Avatar>
                                  </AvatarGroup>

                                  <span className="text-xs text-dark-blue-400">
                                    Senior Front-End Developer
                                  </span>
                                </div>

                                <span className="shrink-0 size-1 bg-gray-300 rounded-full" />

                                <div className="flex items-center gap-x-2">
                                  <span className="text-xs text-dark-blue-400">
                                    January 2025 - Present
                                  </span>

                                  <Badge
                                    variant="rounded"
                                    className="bg-primary-50 text-primary-500 px-1.5 rounded-[3.15px]"
                                    visual="primary"
                                  >
                                    2 Months
                                  </Badge>
                                </div>
                              </div>
                            </article>

                            <article className="border p-6 rounded-lg bg-white border-gray-200 shadow-[0px_1px_5px_0px_rgba(16,24,40,.02)]">
                              <div className="flex items-start gap-x-4">
                                <div className="relative overflow-hidden rounded-md shrink-0 w-[134px] h-[86px]">
                                  <NextImage
                                    src="/dashboard.png"
                                    alt="Dashboard"
                                    fill
                                    sizes="25vw"
                                  />
                                </div>

                                <div className="space-y-2">
                                  <div className="flex items-center gap-x-2">
                                    <h1 className="text-sm font-bold text-dark-blue-400">
                                      Seniority Mobile App
                                    </h1>
                                    <Badge
                                      className="border rounded-[3.15px] bg-white border-gray-300"
                                      visual="gray"
                                      variant="rounded"
                                    >
                                      <FileText className="size-[9.46px] text-primary-500" />{" "}
                                      Under NDA
                                    </Badge>
                                  </div>

                                  <div className="mt-2 flex items-center gap-x-6">
                                    <div className="flex gap-x-3">
                                      <span className="text-xs leading-6 text-dark-blue-400">
                                        Estimated Project Cost
                                      </span>
                                      <span className="font-bold text-sm leading-6 text-dark-blue-400">
                                        $25,000
                                      </span>
                                    </div>
                                    <div className="flex gap-x-3">
                                      <span className="text-xs leading-6 text-dark-blue-400">
                                        Project Type
                                      </span>
                                      <span className="font-bold text-sm leading-6 text-dark-blue-400">
                                        Cloud Software
                                      </span>
                                    </div>
                                    <div className="flex gap-x-3">
                                      <span className="text-xs leading-6 text-dark-blue-400">
                                        Current Phase
                                      </span>
                                      <span className="font-bold text-sm leading-6 text-dark-blue-400">
                                        Development
                                      </span>
                                    </div>
                                  </div>

                                  <div className="mt-2 flex items-center gap-x-2">
                                    <Badge>API-Driven</Badge>
                                    <Badge>Agile Workflow</Badge>
                                    <Badge>Cross-Platform</Badge>
                                    <Badge>Cloud-Based</Badge>
                                    <Badge>Mobile-Optimized</Badge>
                                    <Badge>FinTech</Badge>
                                    <Badge>SaaS</Badge>
                                  </div>
                                </div>
                              </div>

                              <div className="flex items-center gap-x-3 mt-3">
                                <div className="flex items-center gap-x-4">
                                  <AvatarGroup
                                    excessClassName="border-gray-300 text-gray-500"
                                    excess
                                  >
                                    <Avatar className="border-2 border-white hover:ring-0 active:ring-0">
                                      <AvatarImage
                                        src="/woman.jpg"
                                        alt="Woman"
                                      />
                                      <AvatarFallback>W</AvatarFallback>
                                    </Avatar>
                                    <Avatar className="border-2 border-white hover:ring-0 active:ring-0">
                                      <AvatarImage
                                        src="/woman.jpg"
                                        alt="Woman"
                                      />
                                      <AvatarFallback>W</AvatarFallback>
                                    </Avatar>
                                    <Avatar className="border-2 border-white hover:ring-0 active:ring-0">
                                      <AvatarImage
                                        src="/woman.jpg"
                                        alt="Woman"
                                      />
                                      <AvatarFallback>W</AvatarFallback>
                                    </Avatar>
                                  </AvatarGroup>

                                  <span className="text-xs text-dark-blue-400">
                                    Senior Front-End Developer
                                  </span>
                                </div>

                                <span className="shrink-0 size-1 bg-gray-300 rounded-full" />

                                <div className="flex items-center gap-x-2">
                                  <span className="text-xs text-dark-blue-400">
                                    January 2025 - Present
                                  </span>

                                  <Badge
                                    variant="rounded"
                                    className="bg-primary-50 text-primary-500 px-1.5 rounded-[3.15px]"
                                    visual="primary"
                                  >
                                    2 Months
                                  </Badge>
                                </div>
                              </div>
                            </article>
                          </div>
                        </TabsContent>
                      </Tabs>
                      </>}
                    </div>
                  </div>
                </Tabs>
              </div>
            </TabsContent>

            <TabsContent value="View Project Scope">
              {/*
                Project Scope viewer — spec refs:
                  docs/md/.../creation/Strapi Integration:124-149  (Scope Builder)
                  docs/md/.../details/08 - DTO and Schema Validation:42-84 (Phase/Task DTOs)
                  docs/md/.../details/01:209-227 (duration/pricing derivation)

                Data source: project.scope — an ordered array of phases,
                each with a tasks[] array. Tasks carry title, roleName,
                experienceLevel, estimatedHours. Duration labels ("Day 1
                - Day 8") are derived on the fly from accumulated task
                hours assuming an 8-hour workday, since the spec
                explicitly forbids authoring duration fields directly
                ("⛔ Do NOT add editable fields for duration, weeks…").

                Empty-scope fallback keeps the original hardcoded 3-phase
                block below (no-empty-swap memory rule).
              */}
              {Array.isArray(project.scope) && project.scope.length > 0 ? (
                (() => {
                  const locationToFlag = (
                    location: string | null | undefined
                  ): string => {
                    const v = (typeof location === "string" ? location : String(location ?? "")).trim().toLowerCase()
                    if (!v) return ""
                    // Minimal mapping for current seed/demo data + common markets.
                    if (v === "united states" || v === "usa" || v === "us")
                      return "🇺🇸"
                    if (v === "united kingdom" || v === "uk" || v === "u.k.")
                      return "🇬🇧"
                    if (v === "brazil") return "🇧🇷"
                    if (v === "canada") return "🇨🇦"
                    if (v === "australia") return "🇦🇺"
                    if (v === "india") return "🇮🇳"
                    if (v === "germany") return "🇩🇪"
                    if (v === "france") return "🇫🇷"
                    if (v === "spain") return "🇪🇸"
                    if (v === "netherlands") return "🇳🇱"
                    return ""
                  }

                  type ScopeTask = {
                    title: string
                    roleName: string
                    location?: string | null
                    experienceLevel: string
                    estimatedHours: number
                    duration?: string
                  }
                  type ScopePhase = {
                    phaseName: string
                    order: number
                    phaseType?: "setup" | "recurring" | "ongoing"
                    recurrenceSchedule?: "weekly" | "monthly" | "quarterly"
                    recurrenceCount?: number
                    tasks: ScopeTask[]
                  }
                  const phases = (project.scope as ScopePhase[])
                    .slice()
                    .sort((a, b) => a.order - b.order)
                  const phaseLabels = [
                    "Phase One",
                    "Phase Two",
                    "Phase Three",
                    "Phase Four",
                    "Phase Five",
                    "Phase Six",
                    "Phase Seven",
                    "Phase Eight",
                  ]
                  const recurLabelMap: Record<string, string> = {
                    weekly: "Weekly",
                    monthly: "Monthly",
                    quarterly: "Quarterly",
                  }
                  // Accumulate day ranges across phases so later phases
                  // start on day (prev end + 1).
                  // Per-task days from hours (40 hrs/week). Tasks in a phase run
                  // in parallel → take the MAX (matches the my-listings owner
                  // view); phases are sequential → accumulate.
                  const taskDays = (t: ScopeTask) => {
                    const h = Number(t.estimatedHours) || 0
                    return h > 0 ? Math.max(1, Math.round((h * 7) / 40)) : 0
                  }
                  const durationLabel = (h: number) => {
                    if (h <= 0) return "—"
                    const weeks = h / 40
                    if (Number.isInteger(weeks))
                      return `${weeks} week${weeks > 1 ? "s" : ""}`
                    const days = Math.max(1, Math.round(h / 8))
                    return `${days} day${days > 1 ? "s" : ""}`
                  }
                  // Show the duration in the UNIT the seller chose (weeks →
                  // weeks, hours → hours, days → days). Only fall back to the
                  // hours→weeks estimate when no explicit duration was set.
                  const taskDurationLabel = (task: ScopeTask) => {
                    const raw = task.duration?.trim()
                    const m = raw?.match(/^([\d.]+)\s*([a-zA-Z]+)/)
                    if (m) {
                      const val = Number(m[1])
                      const unit = m[2].toLowerCase().replace(/s$/, "")
                      if (Number.isFinite(val) && val > 0)
                        return `${val} ${unit}${val === 1 ? "" : "s"}`
                    }
                    if (raw) return raw
                    return durationLabel(task.estimatedHours)
                  }
                  let cursor = 1
                  const withDays = phases.map((phase) => {
                    const days = Math.max(
                      1,
                      ...(phase.tasks ?? []).map(taskDays)
                    )
                    const start = cursor
                    const end = cursor + days - 1
                    cursor = end + 1
                    return { phase, start, end }
                  })
                  return (
                    <div className="mt-6">
                      <Accordion
                        type="single"
                        defaultValue="scope-0"
                        className="flex-auto space-y-3"
                      >
                        {withDays.map(({ phase, start, end }, pi) => (
                          <AccordionItem
                            key={`scope-${pi}`}
                            value={`scope-${pi}`}
                            className="rounded-lg border border-gray-200 shadow-sm"
                          >
                            <AccordionTrigger className="focus-visible:outline-none w-full cursor-pointer">
                              <div className="flex items-center justify-between gap-x-4 px-3 py-3">
                                <div className="inline-flex items-center gap-x-3.5">
                                  <div className="size-8 inline-flex items-center justify-center">
                                    <ChevronDown className="size-5 shrink-0 text-gray-500 group-data-[state=open]/item:-rotate-180 transition duration-300" />
                                  </div>

                                  <span className="text-base md:text-[18px] font-semibold leading-7 text-dark-blue-400">
                                    {phase.phaseType
                                      ? PHASE_TYPE_TITLE[phase.phaseType]
                                      : (phaseLabels[pi] ?? `Phase ${pi + 1}`)}{" "}
                                    <span className="font-light">
                                      {phase.phaseName}
                                    </span>
                                  </span>
                                </div>

                                <div className="inline-flex items-center gap-x-2 md:pl-0 pl-10">
                                  {phase.phaseType === "ongoing" ? (
                                    <span className="inline-flex items-center gap-x-1.5 whitespace-nowrap text-[13px] font-semibold text-dark-blue-400">
                                      <svg
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth={2}
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        className="size-4 shrink-0"
                                        style={{ color: "#12B76A" }}
                                        aria-hidden="true"
                                      >
                                        <path d="M18.178 8c5.096 0 5.096 8 0 8-5.095 0-7.133-8-12.739-8-4.585 0-4.585 8 0 8 5.606 0 7.644-8 12.74-8z" />
                                      </svg>
                                      Ongoing
                                    </span>
                                  ) : phase.phaseType === "recurring" ? (
                                    <span className="inline-flex items-center gap-x-1.5 whitespace-nowrap text-[13px] font-semibold text-dark-blue-400">
                                      <RefreshCcw05
                                        className="size-3.5 shrink-0"
                                        style={{ color: "#12B76A" }}
                                      />
                                      Recurs:{" "}
                                      {
                                        recurLabelMap[
                                          phase.recurrenceSchedule ?? "monthly"
                                        ]
                                      }
                                      , {phase.recurrenceCount ?? 1} time
                                      {(phase.recurrenceCount ?? 1) > 1
                                        ? "s"
                                        : ""}
                                    </span>
                                  ) : phase.phaseType === "setup" ? (
                                    <span className="inline-flex items-center gap-x-1.5 whitespace-nowrap text-xs leading-[14.52px] md:text-[13px] md:leading-[15.73px] font-semibold text-dark-blue-400">
                                      <Calendar
                                        className="size-3.5 shrink-0"
                                        style={{ color: "#12B76A" }}
                                      />
                                      Day {start} - Day {end}
                                    </span>
                                  ) : (
                                    <>
                                      <span className="text-xs leading-[14.52px] md:text-[13px] md:leading-[15.73px] text-dark-blue-400 font-semibold">
                                        Day {start}
                                      </span>
                                      <span className="text-xs leading-[14.52px] md:text-[13px] md:leading-[15.73px] text-dark-blue-400 font-semibold">
                                        -
                                      </span>
                                      <span className="text-xs leading-[14.52px] md:text-[13px] md:leading-[15.73px] text-dark-blue-400 font-semibold">
                                        Day {end}
                                      </span>
                                    </>
                                  )}
                                </div>
                              </div>
                            </AccordionTrigger>

                            <DisclosureContent>
                              <Table className="w-full table-fixed">
                                <TableHeader className="bg-gray-50">
                                  <TableRow className="hover:bg-transparent">
                                    <TableHead className="w-[45%]">Task</TableHead>
                                    <TableHead className="w-[25%]">Role</TableHead>
                                    <TableHead className="w-[15%]">Experience</TableHead>
                                    <TableHead className="w-[15%] text-right">Duration</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {(phase.tasks ?? []).map((task, ti) => (
                                    <TableRow key={`task-${pi}-${ti}`}>
                                      <TableCell className="py-4 px-6">
                                        <TooltipProvider delayDuration={200}>
                                          <Tooltip>
                                            <TooltipTrigger asChild>
                                              <span className="text-sm font-semibold text-dark-blue-400 truncate block cursor-default">
                                                {task.title}
                                              </span>
                                            </TooltipTrigger>
                                            <TooltipContent visual="white">
                                              {task.title}
                                            </TooltipContent>
                                          </Tooltip>
                                        </TooltipProvider>
                                      </TableCell>
                                      <TableCell className="py-4 px-6 whitespace-nowrap max-w-[200px]">
                                        <TooltipProvider delayDuration={200}>
                                          <Tooltip>
                                            <TooltipTrigger asChild>
                                              <span className="text-sm font-extralight text-dark-blue-400 truncate block cursor-default">
                                                {task.roleName}
                                              </span>
                                            </TooltipTrigger>
                                            <TooltipContent visual="white">
                                              {task.roleName}
                                            </TooltipContent>
                                          </Tooltip>
                                        </TooltipProvider>
                                      </TableCell>
                                      <TableCell className="py-4 px-6">
                                        <Badge
                                          className="rounded-[4px] bg-primary-50"
                                          visual="primary"
                                        >
                                          {task.experienceLevel}
                                        </Badge>
                                      </TableCell>
                                      <TableCell className="py-4 px-6 text-right">
                                        <span className="text-sm text-nowrap text-dark-blue-400">
                                          {taskDurationLabel(task)}
                                        </span>
                                      </TableCell>
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
                            </DisclosureContent>
                          </AccordionItem>
                        ))}
                      </Accordion>
                    </div>
                  )
                })()
              ) : (
                <div className="mt-6">
                  <Accordion
                    type="single"
                    defaultValue="item-1"
                    className="flex-auto space-y-3"
                  >
                    <AccordionItem
                      value="item-1"
                      className="rounded-lg border border-gray-200 shadow-sm"
                    >
                      <div className="flex items-center justify-between gap-x-4 px-3 py-3">
                        <div className="inline-flex items-center gap-x-3.5">
                          <AccordionTrigger className="focus-visible:outline-none size-8 inline-flex items-center justify-center">
                            <ChevronDown className="size-5 shrink-0 text-gray-500 group-data-[state=open]/item:-rotate-180 transition duration-300" />
                          </AccordionTrigger>

                          <span className="text-base md:text-[18px] font-semibold leading-7 text-gray-900">
                            Phase One{" "}
                            <span className="font-light">Research</span>
                          </span>
                        </div>

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
                      </div>

                      <DisclosureContent>
                        <Table>
                          <TableHeader className="bg-gray-50">
                            <TableRow className="hover:bg-transparent">
                              <TableHead>Task</TableHead>
                              <TableHead>Description</TableHead>
                              <TableHead>Assignee</TableHead>
                              <TableHead>Duration</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            <TableRow>
                              <TableCell className="py-4 px-6">
                                <span className="text-sm text-nowrap font-semibold text-dark-blue-400">
                                  Consumer Research
                                </span>
                              </TableCell>
                              <TableCell className="py-4 px-6">
                                <span className="text-sm font-extralight line-clamp-2 text-dark-blue-400">
                                  Conduct research to understand consumer needs,
                                  behaviors, and preferences for product
                                  optimization.
                                </span>
                              </TableCell>
                              <TableCell className="py-4 px-6">
                                <span className="inline-flex items-start gap-x-2">
                                  <Avatar>
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
                                <span className="text-sm text-nowrap line-clamp-2 text-dark-blue-400">
                                  40 hours
                                </span>
                              </TableCell>
                            </TableRow>
                            <TableRow>
                              <TableCell className="py-4 px-6">
                                <span className="text-sm text-nowrap font-semibold text-dark-blue-400">
                                  Consumer Research
                                </span>
                              </TableCell>
                              <TableCell className="py-4 px-6">
                                <span className="text-sm font-extralight line-clamp-2 text-dark-blue-400">
                                  Conduct research to understand consumer needs,
                                  behaviors, and preferences for product
                                  optimization.
                                </span>
                              </TableCell>
                              <TableCell className="py-4 px-6">
                                <span className="inline-flex items-start gap-x-2">
                                  <Avatar>
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
                                <span className="text-sm text-nowrap line-clamp-2 text-dark-blue-400">
                                  40 hours
                                </span>
                              </TableCell>
                            </TableRow>
                            <TableRow>
                              <TableCell className="py-4 px-6">
                                <span className="text-sm text-nowrap font-semibold text-dark-blue-400">
                                  Consumer Research
                                </span>
                              </TableCell>
                              <TableCell className="py-4 px-6">
                                <span className="text-sm font-extralight line-clamp-2 text-dark-blue-400">
                                  Conduct research to understand consumer needs,
                                  behaviors, and preferences for product
                                  optimization.
                                </span>
                              </TableCell>
                              <TableCell className="py-4 px-6">
                                <span className="inline-flex items-start gap-x-2">
                                  <Avatar>
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
                                <span className="text-sm text-nowrap line-clamp-2 text-dark-blue-400">
                                  40 hours
                                </span>
                              </TableCell>
                            </TableRow>
                            <TableRow>
                              <TableCell className="py-4 px-6">
                                <span className="text-sm text-nowrap font-semibold text-dark-blue-400">
                                  Consumer Research
                                </span>
                              </TableCell>
                              <TableCell className="py-4 px-6">
                                <span className="text-sm font-extralight line-clamp-2 text-dark-blue-400">
                                  Conduct research to understand consumer needs,
                                  behaviors, and preferences for product
                                  optimization.
                                </span>
                              </TableCell>
                              <TableCell className="py-4 px-6">
                                <span className="inline-flex items-start gap-x-2">
                                  <Avatar>
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
                      className="rounded-lg border border-gray-200 shadow-sm"
                    >
                      <div className="flex items-center justify-between gap-x-4 px-3 py-3">
                        <div className="inline-flex items-center gap-x-3.5">
                          <AccordionTrigger className="focus-visible:outline-none size-8 inline-flex items-center justify-center">
                            <ChevronDown className="size-5 shrink-0 text-gray-500 group-data-[state=open]/item:-rotate-180 transition duration-300" />
                          </AccordionTrigger>

                          <span className="text-base md:text-[18px] font-semibold leading-7 text-gray-900">
                            Phase One{" "}
                            <span className="font-light">Research</span>
                          </span>
                        </div>

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
                      </div>

                      <DisclosureContent>
                        <Table>
                          <TableHeader className="bg-gray-50">
                            <TableRow className="hover:bg-transparent">
                              <TableHead>Task</TableHead>
                              <TableHead>Description</TableHead>
                              <TableHead>Assignee</TableHead>
                              <TableHead>Duration</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            <TableRow>
                              <TableCell className="py-4 px-6">
                                <span className="text-sm text-nowrap font-semibold text-dark-blue-400">
                                  Consumer Research
                                </span>
                              </TableCell>
                              <TableCell className="py-4 px-6">
                                <span className="text-sm font-extralight line-clamp-2 text-dark-blue-400">
                                  Conduct research to understand consumer needs,
                                  behaviors, and preferences for product
                                  optimization.
                                </span>
                              </TableCell>
                              <TableCell className="py-4 px-6">
                                <span className="inline-flex items-start gap-x-2">
                                  <Avatar>
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
                                <span className="text-sm text-nowrap line-clamp-2 text-dark-blue-400">
                                  40 hours
                                </span>
                              </TableCell>
                            </TableRow>
                            <TableRow>
                              <TableCell className="py-4 px-6">
                                <span className="text-sm text-nowrap font-semibold text-dark-blue-400">
                                  Consumer Research
                                </span>
                              </TableCell>
                              <TableCell className="py-4 px-6">
                                <span className="text-sm font-extralight line-clamp-2 text-dark-blue-400">
                                  Conduct research to understand consumer needs,
                                  behaviors, and preferences for product
                                  optimization.
                                </span>
                              </TableCell>
                              <TableCell className="py-4 px-6">
                                <span className="inline-flex items-start gap-x-2">
                                  <Avatar>
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
                                <span className="text-sm text-nowrap line-clamp-2 text-dark-blue-400">
                                  40 hours
                                </span>
                              </TableCell>
                            </TableRow>
                            <TableRow>
                              <TableCell className="py-4 px-6">
                                <span className="text-sm text-nowrap font-semibold text-dark-blue-400">
                                  Consumer Research
                                </span>
                              </TableCell>
                              <TableCell className="py-4 px-6">
                                <span className="text-sm font-extralight line-clamp-2 text-dark-blue-400">
                                  Conduct research to understand consumer needs,
                                  behaviors, and preferences for product
                                  optimization.
                                </span>
                              </TableCell>
                              <TableCell className="py-4 px-6">
                                <span className="inline-flex items-start gap-x-2">
                                  <Avatar>
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
                                <span className="text-sm text-nowrap line-clamp-2 text-dark-blue-400">
                                  40 hours
                                </span>
                              </TableCell>
                            </TableRow>
                            <TableRow>
                              <TableCell className="py-4 px-6">
                                <span className="text-sm text-nowrap font-semibold text-dark-blue-400">
                                  Consumer Research
                                </span>
                              </TableCell>
                              <TableCell className="py-4 px-6">
                                <span className="text-sm font-extralight line-clamp-2 text-dark-blue-400">
                                  Conduct research to understand consumer needs,
                                  behaviors, and preferences for product
                                  optimization.
                                </span>
                              </TableCell>
                              <TableCell className="py-4 px-6">
                                <span className="inline-flex items-start gap-x-2">
                                  <Avatar>
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
                      className="rounded-lg border border-gray-200 shadow-sm"
                    >
                      <div className="flex items-center justify-between gap-x-4 px-3 py-3">
                        <div className="inline-flex items-center gap-x-3.5">
                          <AccordionTrigger className="focus-visible:outline-none size-8 inline-flex items-center justify-center">
                            <ChevronDown className="size-5 shrink-0 text-gray-500 group-data-[state=open]/item:-rotate-180 transition duration-300" />
                          </AccordionTrigger>

                          <span className="text-base md:text-[18px] font-semibold leading-7 text-gray-900">
                            Phase One{" "}
                            <span className="font-light">Research</span>
                          </span>
                        </div>

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
                      </div>

                      <DisclosureContent>
                        <Table>
                          <TableHeader className="bg-gray-50">
                            <TableRow className="hover:bg-transparent">
                              <TableHead>Task</TableHead>
                              <TableHead>Description</TableHead>
                              <TableHead>Assignee</TableHead>
                              <TableHead>Duration</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            <TableRow>
                              <TableCell className="py-4 px-6">
                                <span className="text-sm text-nowrap font-semibold text-dark-blue-400">
                                  Consumer Research
                                </span>
                              </TableCell>
                              <TableCell className="py-4 px-6">
                                <span className="text-sm font-extralight line-clamp-2 text-dark-blue-400">
                                  Conduct research to understand consumer needs,
                                  behaviors, and preferences for product
                                  optimization.
                                </span>
                              </TableCell>
                              <TableCell className="py-4 px-6">
                                <span className="inline-flex items-start gap-x-2">
                                  <Avatar>
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
                                <span className="text-sm text-nowrap line-clamp-2 text-dark-blue-400">
                                  40 hours
                                </span>
                              </TableCell>
                            </TableRow>
                            <TableRow>
                              <TableCell className="py-4 px-6">
                                <span className="text-sm text-nowrap font-semibold text-dark-blue-400">
                                  Consumer Research
                                </span>
                              </TableCell>
                              <TableCell className="py-4 px-6">
                                <span className="text-sm font-extralight line-clamp-2 text-dark-blue-400">
                                  Conduct research to understand consumer needs,
                                  behaviors, and preferences for product
                                  optimization.
                                </span>
                              </TableCell>
                              <TableCell className="py-4 px-6">
                                <span className="inline-flex items-start gap-x-2">
                                  <Avatar>
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
                                <span className="text-sm text-nowrap line-clamp-2 text-dark-blue-400">
                                  40 hours
                                </span>
                              </TableCell>
                            </TableRow>
                            <TableRow>
                              <TableCell className="py-4 px-6">
                                <span className="text-sm text-nowrap font-semibold text-dark-blue-400">
                                  Consumer Research
                                </span>
                              </TableCell>
                              <TableCell className="py-4 px-6">
                                <span className="text-sm font-extralight line-clamp-2 text-dark-blue-400">
                                  Conduct research to understand consumer needs,
                                  behaviors, and preferences for product
                                  optimization.
                                </span>
                              </TableCell>
                              <TableCell className="py-4 px-6">
                                <span className="inline-flex items-start gap-x-2">
                                  <Avatar>
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
                                <span className="text-sm text-nowrap line-clamp-2 text-dark-blue-400">
                                  40 hours
                                </span>
                              </TableCell>
                            </TableRow>
                            <TableRow>
                              <TableCell className="py-4 px-6">
                                <span className="text-sm text-nowrap font-semibold text-dark-blue-400">
                                  Consumer Research
                                </span>
                              </TableCell>
                              <TableCell className="py-4 px-6">
                                <span className="text-sm font-extralight line-clamp-2 text-dark-blue-400">
                                  Conduct research to understand consumer needs,
                                  behaviors, and preferences for product
                                  optimization.
                                </span>
                              </TableCell>
                              <TableCell className="py-4 px-6">
                                <span className="inline-flex items-start gap-x-2">
                                  <Avatar>
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
              )}
            </TabsContent>
          </Tabs>
        </div>

        <div className="pt-[51px] sticky top-[65px] pb-8 w-[390px] shrink-0 z-10">
          <div className="bg-white shadow-[0px_1px_5px_0px_rgba(16,24,40,.02)] rounded-lg border border-gray-200">
            <div className="relative border-b p-6 border-gray-200">
              <div className="flex items-start justify-between">
                <div className="flex items-center">
                  <Badge className="rounded-[5px]" visual="gray">
                    Starting At
                  </Badge>
                  <div className="inline-flex items-center gap-x-1.5 ml-2 whitespace-nowrap">
                    <span className="text-2xl leading-none font-bold text-dark-blue-400">
                      {(() => {
                        const active = sidebarPricing?.periodOptions.find(
                          (p) => p.value === selectedPeriod
                        ) ?? sidebarPricing?.periodOptions[0]
                        const price = active?.cost ?? sidebarPricing?.totalCost ?? 0
                        return price > 0 ? `$${price.toLocaleString()}` : "—"
                      })()}
                    </span>
                    <span className="text-sm font-medium leading-none text-dark-blue-400">
                      {selectedPeriod === "biweek" ? "every" : "per"}
                    </span>
                  </div>

                  <div className="ml-1.5">
                    <Listbox value={selectedPeriod} onChange={setSelectedPeriod}>
                      <ListboxButton
                        className="text-sm lowercase py-[5px] px-[7px] h-max w-auto whitespace-nowrap"
                        iconClassName="ml-1"
                        placeholder="Select"
                      />
                      <ListboxOptions className="w-[153px]">
                        {(sidebarPricing?.periodOptions ?? []).map((opt) => (
                          <ListboxOption key={opt.value} value={opt.value}>
                            {opt.label}
                          </ListboxOption>
                        ))}
                      </ListboxOptions>
                    </Listbox>
                  </div>
                </div>

                <FavoriteRoot
                  value={isFavorited}
                  onValueChange={handleFavoriteToggle}
                >
                  {({ pressed }) => (
                    <TooltipProvider delayDuration={75}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="inline-block">
                            <Favorite />
                          </span>
                        </TooltipTrigger>
                        <TooltipContent>
                          {pressed ? (
                            <span className="inline-flex items-center gap-x-1">
                              <Check className="size-[15px] shrink-0 text-green-500" />
                              Saved
                            </span>
                          ) : (
                            "Save to favorites"
                          )}
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}
                </FavoriteRoot>
              </div>

              {(() => {
                const activePeriod = sidebarPricing?.periodOptions.find(
                  (p) => p.value === selectedPeriod
                ) ?? sidebarPricing?.periodOptions[0]
                return activePeriod?.cost ? (
                  <div className="mt-3">
                    <span className="text-sm leading-none font-light text-dark-blue-400">
                      with an initial payment of ${activePeriod.cost.toLocaleString()} to kickoff
                    </span>
                  </div>
                ) : null
              })()}

              {(Array.isArray(currentTeam) && currentTeam.length > 0) ||
              isTalentAccount(user) ? (
              <div className="flex flex-col items-start gap-y-3 mt-6">
                <span className="inline-block text-xs font-medium text-dark-blue-400">
                  Current Team
                </span>

                {Array.isArray(currentTeam) && currentTeam.length > 0 ? (
                  currentTeam.length === 1 ? (
                    <div className="flex items-center gap-x-2 min-w-0">
                      <Avatar
                        size="sm"
                        className="shrink-0 border-2 border-white hover:ring-0 active:ring-0"
                      >
                        {currentTeam[0].avatarUrl ? (
                          <AvatarImage
                            src={currentTeam[0].avatarUrl}
                            alt={currentTeam[0].firstName}
                          />
                        ) : null}
                        <AvatarFallback>
                          {(currentTeam[0].firstName || currentTeam[0].username || "?").charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col min-w-0">
                        <span className="text-xs text-dark-blue-400 font-medium leading-none truncate">
                          {currentTeam[0].firstName || currentTeam[0].username}
                          {currentTeam[0].username && currentTeam[0].firstName ? (
                            <span className="font-extralight text-gray-400"> @{currentTeam[0].username}</span>
                          ) : null}
                        </span>
                        {(currentTeam[0].role && currentTeam[0].role !== "owner") ? (
                          <span className="mt-1 text-[11px] text-gray-400 font-extralight leading-none truncate">
                            {currentTeam[0].role}
                          </span>
                        ) : null}
                      </div>
                    </div>
                  ) : (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <AvatarGroup size="sm" excess reverse={false}>
                          {currentTeam.map((m: any, i: number) => (
                            <Avatar
                              key={m.username ?? i}
                              className="border-2 border-white hover:ring-0 active:ring-0"
                              size="sm"
                            >
                              {m.avatarUrl ? (
                                <AvatarImage
                                  src={m.avatarUrl}
                                  alt={m.firstName}
                                />
                              ) : null}
                              <AvatarFallback>
                                {(m.firstName || "?").charAt(0).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                          ))}
                        </AvatarGroup>
                      </TooltipTrigger>
                      <TooltipContent className="p-0" size="md">
                        <ScrollArea
                          className="h-[192px] p-3 pr-4"
                          scrollBar={
                            <ScrollBar
                              className="w-4 p-1"
                              thumbClassName="bg-white/20"
                            />
                          }
                        >
                          <div className="space-y-3 pr-5">
                            {currentTeam.map((m: any, i: number) => (
                              <div
                                key={m.username ?? i}
                                className="flex items-center gap-x-[18px]"
                              >
                                <div className="flex items-center gap-x-2 flex-auto">
                                  <Avatar>
                                    {m.avatarUrl ? (
                                      <AvatarImage
                                        src={m.avatarUrl}
                                        alt={m.firstName}
                                      />
                                    ) : null}
                                    <AvatarFallback>
                                      {(m.firstName || "?")
                                        .charAt(0)
                                        .toUpperCase()}
                                    </AvatarFallback>
                                  </Avatar>
                                  <div className="flex flex-col flex-auto">
                                    <div className="flex items-center gap-x-0.5">
                                      <span className="text-xs leading-5 font-semibold text-white">
                                        {m.firstName}
                                      </span>
                                      <span className="text-[10px] leading-none font-light text-white">
                                        @{m.username}
                                      </span>
                                    </div>
                                    <span className="text-[10px] font-light text-white">
                                      {formatMemberLocation(m.location) ||
                                        m.skills?.[0] ||
                                        "Team Member"}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </ScrollArea>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                  )
                ) : (
                  <NoTeamAssigned
                    kind="project"
                    onClaim={
                      project?.id
                        ? async () => {
                            await claimProject(String(project.id))
                            setClaimed(true)
                            setRefetchKey((k) => k + 1)
                          }
                        : undefined
                    }
                    editHref={
                      project?.id ? `/my-listings/${project.id}` : undefined
                    }
                  />
                )}
              </div>
              ) : null}

              <div className="mt-6 space-y-3">
                <div className="flex items-center gap-x-[6.4px]">
                  <Clock className="size-[18px] text-primary-500" />
                  <span className="text-sm leading-none font-medium text-dark-blue-400">
                    {sidebarPricing?.isServiceScope
                      ? "Ongoing duration"
                      : sidebarPricing?.formattedDuration
                        ? `Starting from a ${sidebarPricing.formattedDuration} duration`
                        : "Duration: TBD"}
                  </span>
                </div>
                {(sidebarPricing?.minTeamMembers ?? 0) > 0 && (
                  <div className="flex items-center gap-x-[6.4px]">
                    <Users03 className="size-[18px] text-primary-500" />
                    <span className="text-sm leading-none font-medium text-dark-blue-400">
                      Minimum {sidebarPricing!.minTeamMembers} team member{sidebarPricing!.minTeamMembers !== 1 ? "s" : ""}
                    </span>
                  </div>
                )}
              </div>

              {!isOwnerViewing && isTalentAccount(user) && (() => {
                const teamArr = Array.isArray((project as any)?.team) ? (project as any).team : []
                const hasTeam = teamArr.length > 0
                const isClaim = !hasTeam && !claimed

                // Shared button styles per Figma: h-52px, border-2 #306CFE, rounded-5px, 18px semibold
                const btnBase = "mt-6 w-full h-[52px] rounded-[5px] border-2 border-[#306CFE] bg-white px-[20px] text-[18px] font-semibold leading-[24px] text-[#306CFE] shadow-[0px_1px_2px_0px_rgba(16,24,40,0.05)] hover:bg-[#306CFE] hover:text-white"

                // Claim this Project (zero team members)
                if (isClaim) {
                  return (
                    <Button
                      size="lg"
                      className={btnBase}
                      variant="outlined"
                      disabled={claimBusy}
                      onClick={(e) => {
                        if (!user?.id) {
                          e.preventDefault()
                          promptSignIn(() => openClaimDialog())
                          return
                        }
                        openClaimDialog()
                      }}
                    >
                      Claim this Project
                    </Button>
                  )
                }

                // Requested — clickable, opens dropdown with View/Cancel
                if (joinStatus === "pending") {
                  return (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          size="lg"
                          className={cn(btnBase, "gap-[8px]")}
                          variant="outlined"
                        >
                          <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg" className="shrink-0">
                            <path d="M17.0249 10.1248L15.5254 8.62483L14.0249 10.1248M15.75 8.99983C15.75 12.7278 12.7279 15.7498 8.99995 15.7498C5.27203 15.7498 2.24995 12.7278 2.24995 8.99983C2.24995 5.27191 5.27203 2.24983 8.99995 2.24983C11.4764 2.24983 13.6413 3.58343 14.8158 5.57165M8.99995 5.24983V8.99983L11.25 10.4998" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                          Requested
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent
                        align="center"
                        sideOffset={4}
                        className="w-[var(--radix-dropdown-menu-trigger-width)] rounded-[8px] border-[#F2F4F7] py-[4px] shadow-none drop-shadow-[0px_12px_16px_rgba(16,24,40,0.08)]"
                      >
                        <DropdownMenuItem
                          className="gap-x-[8px] px-[12px] py-[10px]"
                          onClick={() => {
                            // View My Request — placeholder for navigation
                          }}
                        >
                          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" className="shrink-0 size-[16px]">
                            <path d="M0.666667 8C0.666667 8 3.33333 2.66667 8 2.66667C12.6667 2.66667 15.3333 8 15.3333 8C15.3333 8 12.6667 13.3333 8 13.3333C3.33333 13.3333 0.666667 8 0.666667 8Z" stroke="#667085" strokeWidth="1.31486" strokeLinecap="round" strokeLinejoin="round"/>
                            <path d="M8 10C9.10457 10 10 9.10457 10 8C10 6.89543 9.10457 6 8 6C6.89543 6 6 6.89543 6 8C6 9.10457 6.89543 10 8 10Z" stroke="#667085" strokeWidth="1.31486" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                          <span className="text-[13px] font-medium capitalize leading-[13.3px]">
                            View My Request
                          </span>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          visual="destructive"
                          className="gap-x-[8px] px-[12px] py-[10px]"
                          onClick={handleCancelJoinRequest}
                        >
                          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" className="shrink-0 size-[16px]">
                            <path d="M12 4L4 12M4 4L12 12" stroke="#F04438" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                          <span className="text-[13px] font-medium capitalize leading-[13.3px]">
                            Cancel Request
                          </span>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )
                }

                // Joined — non-interactive
                if (joinStatus === "accepted") {
                  return (
                    <Button
                      size="lg"
                      className={cn(btnBase, "gap-[8px] pointer-events-none")}
                      variant="outlined"
                    >
                      <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg" className="shrink-0">
                        <path d="M12 13.5L13.5 15L16.5 12M9.00001 11.25H6.00001C4.60218 11.25 3.90327 11.25 3.35196 11.4784C2.61687 11.7829 2.03285 12.3669 1.72837 13.102C1.50001 13.6533 1.50001 14.3522 1.50001 15.75M11.625 2.46808C12.7244 2.91312 13.5 3.991 13.5 5.25001C13.5 6.50903 12.7244 7.5869 11.625 8.03195M10.125 5.25001C10.125 6.90687 8.78186 8.25001 7.12501 8.25001C5.46815 8.25001 4.12501 6.90687 4.12501 5.25001C4.12501 3.59316 5.46815 2.25001 7.12501 2.25001C8.78186 2.25001 10.125 3.59316 10.125 5.25001Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                      Joined
                    </Button>
                  )
                }

                // Default — Request to Join
                return (
                  <Button
                    size="lg"
                    className={btnBase}
                    variant="outlined"
                    disabled={joinBusy}
                    onClick={(e) => {
                      if (!user?.id) {
                        e.preventDefault()
                        promptSignIn(() => setJoinDialogOpen(true))
                        return
                      }
                      setJoinDialogOpen(true)
                    }}
                  >
                    Request to Join
                  </Button>
                )
              })()}

              {/* Join dialog — rendered outside the IIFE so it stays mounted through confirmation */}
              {!isOwnerViewing && isTalentAccount(user) && (
                <JoinProjectDialog
                  open={joinDialogOpen}
                  onOpenChange={setJoinDialogOpen}
                  projectTitle={project?.title ?? ""}
                  projectId={String(project?.id ?? "")}
                  scopeRoles={scopeRoles}
                  scopeTaskTypes={scopeTaskTypes}
                  onSubmitted={() => setJoinStatus("pending")}
                />
              )}

              {!isOwnerViewing && !isTalentAccount(user) && (
                <Dialog
                  open={startProjectDialogOpen}
                  onOpenChange={setStartProjectDialogOpen}
                >
                  <DialogTrigger asChild>
                    <Button
                      size="lg"
                      className="mt-6 w-full border-2 border-primary-500 text-primary-500 hover:bg-primary-500 hover:text-white"
                      variant="outlined"
                      onClick={(e) => {
                        if (!user?.id) {
                          e.preventDefault()
                          promptSignIn(() => setStartProjectDialogOpen(true))
                        }
                      }}
                    >
                      Start Project
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>
                        Would you like to customize the project scope before
                        checkout?
                      </DialogTitle>
                    </DialogHeader>
                    <DialogFooter className="mt-8">
                      <DialogClose asChild>
                        <Button variant="outlined" visual="gray">
                          Edit Scope
                        </Button>
                      </DialogClose>
                      <Button
                        onClick={() => {
                          // PMCM-259/AC2: pass the buyer's selected Budget
                          // Calculator period + the amount they saw for it
                          // along to checkout (which had no existing
                          // mechanism to receive this) — mirrors the
                          // existing per-period cost lookup used for the
                          // sidebar display above.
                          const activePeriod =
                            sidebarPricing?.periodOptions.find(
                              (p) => p.value === selectedPeriod
                            ) ?? sidebarPricing?.periodOptions[0]
                          const amount =
                            activePeriod?.cost ?? sidebarPricing?.totalCost
                          const qs = new URLSearchParams()
                          qs.set("period", selectedPeriod)
                          if (amount != null && amount > 0) {
                            qs.set("periodAmount", String(Math.round(amount)))
                          }
                          router.push(
                            `/checkout/${params.slug}?${qs.toString()}`
                          )
                        }}
                      >
                        Continue to Checkout
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              )}

              {isPreview && onEdit && (
                <div className="mt-6 flex items-center gap-x-3">
                  <Button
                    size="lg"
                    variant="outlined"
                    visual="gray"
                    className="flex-auto"
                    onClick={onEdit}
                  >
                    <Edit03 className="size-[15px]" />
                    Edit My Project
                  </Button>
                  <IconButton
                    size="lg"
                    variant="outlined"
                    visual="gray"
                    onClick={() => toggleShareWindow(true, project.title)}
                  >
                    <Share06 className="size-5" />
                  </IconButton>
                </div>
              )}

              {isOwnerViewing && !isPreview && project?.id && (
                <div className="mt-6 flex items-center gap-x-3">
                  <Button
                    size="lg"
                    variant="outlined"
                    visual="gray"
                    className="flex-auto"
                    asChild
                  >
                    <NextLink href={`/my-listings/${project.id}`}>
                      <Edit03 className="size-[15px]" />
                      Edit My Project
                    </NextLink>
                  </Button>
                  <IconButton
                    size="lg"
                    variant="outlined"
                    visual="gray"
                    onClick={() => toggleShareWindow(true, project.title)}
                  >
                    <Share06 className="size-5" />
                  </IconButton>
                </div>
              )}

              <div className="mt-6 flex items-center gap-x-2">
                <span className="text-sm font-medium leading-none text-dark-blue-400 whitespace-nowrap">
                  Additional payment plans available with
                </span>

                <div className="flex items-center gap-x-2">
                  <span
                    className="inline-flex items-center rounded-[6px] px-2 py-1 text-xs font-bold leading-none text-dark-blue-400"
                    style={{ backgroundColor: "#FFB3C7" }}
                  >
                    Klarna
                  </span>

                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger className="focus-visible:outline-none text-gray-500">
                        <Info className="size-[17px]" />
                      </TooltipTrigger>

                      <TooltipContent className="max-w-[286px]" visual="gray">
                        Select Klarna at checkout to split your purchase into
                        smaller payments over time. Klarna makes it easy to buy
                        now and pay later, with no impact on your credit score.
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              </div>
            </div>

            <ShareWindow />
            <ReportWindow />
            <div className="h-[50px] rounded-b-lg bg-gray-50 flex items-center justify-evenly">
              {project.reportButtonEnabled !== false && (
                <div
                  className="inline-flex items-center gap-x-2 cursor-pointer"
                  onClick={() => {
                    if (!user?.id) {
                      openAuthModal("sign-in")
                      return
                    }
                    toggleReportWindow(true, project.id, project.title)
                  }}
                >
                  <Flag className="size-[15px] text-gray-500" />
                  <span className="text-sm font-extralight leading-5 text-gray-500 hover:underline cursor-pointer">
                    Report
                  </span>
                </div>
              )}

              <div className="inline-flex items-center gap-x-2">
                <HelpCircle className="size-[15px] text-gray-500" />
                <span className="text-sm font-extralight leading-5 text-gray-500 hover:underline cursor-pointer">
                  Help
                </span>
              </div>

              {project.shareButtonEnabled !== false && (
                <div
                  className="inline-flex items-center gap-x-2 cursor-pointer"
                  onClick={() => toggleShareWindow(true, project.title)}
                >
                  <Share06 className="size-[15px] text-gray-500" />
                  <span className="text-sm font-extralight leading-5 text-gray-500 hover:underline cursor-pointer">
                    Share
                  </span>
                </div>
              )}
            </div>
          </div>

          <div className="mt-3 p-6">
            <h1 className="text-base leading-none font-semibold text-dark-blue-400">
              {projectStaticContent.heading}
            </h1>

            <div className="mt-5 space-y-5">
              {projectStaticContent.guaranteeItems.map((item, idx) => (
                <article
                  key={`${item.title}-${idx}`}
                  className="flex items-start gap-x-2"
                >
                  {renderProjectStaticIcon(
                    item.icon,
                    "size-[18px] text-dark-blue-400"
                  )}
                  <div className="flex-auto space-y-1">
                    <h1 className="text-xs leading-none font-semibold text-dark-blue-400">
                      {item.title}
                    </h1>
                    <p className="text-xs leading-none font-extralight text-dark-blue-400">
                      {item.description}
                    </p>
                  </div>
                </article>
              ))}
            </div>

            <article className="flex items-start gap-x-2 p-3 mt-3 rounded-lg bg-primary-50">
              {renderProjectStaticIcon(
                projectStaticContent.highlightedNotice.icon,
                "size-[18px] text-primary-500"
              )}
              <div className="flex-auto">
                <p className="text-xs leading-none font-extralight text-dark-blue-400">
                  {projectStaticContent.highlightedNotice.description}
                </p>
              </div>
            </article>

            <div className="mt-3">
              <span className="text-xs text-dark-blue-400">
                {projectStaticContent.policy.prefixText}{" "}
                <Button
                  className="text-xs p-0 h-auto"
                  variant="link"
                  onClick={() => {
                    const href = projectStaticContent.policy.linkHref?.trim()
                    if (!href) return
                    if (/^https?:\/\//i.test(href)) {
                      window.open(href, "_self")
                      return
                    }
                    if (href.startsWith("/")) {
                      router.push(href)
                    }
                  }}
                >
                  {projectStaticContent.policy.linkLabel}
                </Button>
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="pb-[100px]" />

      <ProjectDiscoverySections project={project} />

      {/* Ready to Work CTA — only for unauthenticated users */}
      {!user && (
      <div className="-mx-5 px-5 md:-mx-10 md:px-10 lg:-mx-[100px] lg:px-[100px] py-[70px] bg-gray-50">
        <div className="relative">
          <h1 className="text-[30px] font-bold text-center leading-none text-dark-blue-400">
            Ready to Work With Premium Quality Talent?
          </h1>

          <p className="text-lg font-extralight leading-none mt-6 text-center text-dark-blue-400">
            Click below to create your free account
          </p>

          <div className="flex items-center justify-center mt-[50px]">
            <Button size="2xl">Create My Account</Button>
          </div>

          <svg
            className="absolute left-0 top-1/2 -translate-y-1/2 -scale-x-100"
            width={272}
            height={229}
            viewBox="0 0 272 229"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              stroke="#1661F6"
              strokeOpacity={0.2}
              strokeWidth={2}
              d="m160.177 12.936-10.808 10.83-10.83-10.807 10.807-10.831z"
            />
            <path
              transform="rotate(134.94 89.48 164.252)skewX(-.12)"
              stroke="#1661F6"
              strokeOpacity={0.2}
              strokeWidth={2}
              d="M-1.413 0h15.302v15.302H-1.413z"
            />
            <path
              stroke="#1661F6"
              strokeOpacity={0.2}
              strokeWidth={2}
              d="m1.882 146.37 6.954-6.968 6.969 6.954-6.954 6.969z"
            />
          </svg>

          <svg
            className="absolute right-0 top-1/2 -translate-y-1/2"
            width={272}
            height={229}
            viewBox="0 0 272 229"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              stroke="#1661F6"
              strokeOpacity={0.2}
              strokeWidth={2}
              d="m160.177 12.936-10.808 10.83-10.83-10.807 10.807-10.831z"
            />
            <path
              transform="rotate(134.94 89.48 164.252)skewX(-.12)"
              stroke="#1661F6"
              strokeOpacity={0.2}
              strokeWidth={2}
              d="M-1.413 0h15.302v15.302H-1.413z"
            />
            <path
              stroke="#1661F6"
              strokeOpacity={0.2}
              strokeWidth={2}
              d="m1.882 146.37 6.954-6.968 6.969 6.954-6.954 6.969z"
            />
          </svg>
        </div>
      </div>
      )}

      {/* Page-level claim confirmation dialog (triggered by main content button) */}
      <Dialog
        open={claimStep !== "closed"}
        onOpenChange={(next) => {
          if (!next) {
            setClaimStep("closed")
            setClaimError(null)
          }
        }}
      >
        <DialogContent className="w-[440px] max-w-[440px] p-6">
          {claimStep === "confirm" ? (
            <>
              <DialogTitle className="text-lg font-semibold leading-7 text-dark-blue-400">
                Claim this Project?
              </DialogTitle>
              <p className="mt-2 text-sm font-light leading-[1.5] text-gray-500">
                You will become the owner of this project. That means building
                it out properly, assembling the team and leading it to delivery,
                so it looks credible to the client. Only claim what you intend
                to run.
              </p>
              {claimError && (
                <p className="mt-3 text-sm font-medium leading-[1.5] text-error-500">
                  {claimError}
                </p>
              )}
              <div className="mt-6 flex items-center justify-end gap-x-3">
                <Button
                  variant="outlined"
                  visual="gray"
                  onClick={() => {
                    setClaimStep("closed")
                    setClaimError(null)
                  }}
                >
                  Cancel
                </Button>
                <Button
                  visual="primary"
                  disabled={claimBusy}
                  onClick={handlePageClaim}
                >
                  {claimBusy ? "Claiming\u2026" : "Yes, Claim It"}
                </Button>
              </div>
            </>
          ) : claimStep === "blocked" ? (
            <>
              <div className="flex size-12 items-center justify-center rounded-full bg-error-50">
                <AlertCircle className="size-6 text-error-500" />
              </div>
              <DialogTitle className="mt-4 text-lg font-semibold leading-7 text-dark-blue-400">
                Claim limit reached
              </DialogTitle>
              <p className="mt-2 text-sm font-light leading-[1.5] text-gray-500">
                {claimBlockedReason}
              </p>
              <div className="mt-6 flex items-center justify-end">
                <Button
                  visual="primary"
                  onClick={() => {
                    setClaimStep("closed")
                    setClaimBlockedReason("")
                  }}
                >
                  Got it
                </Button>
              </div>
            </>
          ) : (
            <>
              <div className="flex size-12 items-center justify-center rounded-full bg-success-50">
                <CheckCircle className="size-6 text-success-500" />
              </div>
              <DialogTitle className="mt-4 text-lg font-semibold leading-7 text-dark-blue-400">
                This project is yours
              </DialogTitle>
              <p className="mt-2 text-sm font-light leading-[1.5] text-gray-500">
                Make it yours. Swap the stock images for your own, then shape
                the description and scope around your expertise. Invite your
                team once it is ready.
              </p>
              <div className="mt-6 flex items-center justify-end gap-x-3">
                <Button
                  variant="outlined"
                  visual="gray"
                  onClick={() => {
                    setClaimStep("closed")
                    setClaimError(null)
                  }}
                >
                  Close
                </Button>
                {project?.id && (
                  <Button visual="primary" asChild>
                    <NextLink href={`/my-listings/${project.id}`}>
                      Edit My Project
                    </NextLink>
                  </Button>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
