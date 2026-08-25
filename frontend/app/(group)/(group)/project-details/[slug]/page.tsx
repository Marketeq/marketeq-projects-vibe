"use client"

import * as React from "react"
import { useEffect, useRef, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { useAuth } from "@/contexts/auth"
import { apiFetch } from "@/src/lib/api"
import { useAblyChannel } from "@/utils/useAblyChannel"
import { useOnlineUsers } from "@/utils/useOnlineUsers"
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
import { InviteWindow, useInviteWindowStore } from "@/components/invite-window"
import { ListingCard } from "@/components/listing-card"
import { projectDetailsUrl } from "@/src/lib/listing-urls"
import { ProjectDiscoverySections } from "@/components/project-discovery-sections"
import { LightboxVideoPlayer } from "./lightbox-video-player"
import { countryOf } from "@/lib/geo"
import { cn, noop, toPxIfNumber } from "@/utils/functions"
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
import { ProjectAPI } from "@/service/http/project"
import { UserAPI } from "@/service/http/user"
import { ChatsContextProvider } from "@/components/chat"
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
import { SaveButton, SectionSearchBar } from "@/components/talent-profile-comps"
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
} from "@/components/ui"

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
  const [open, toggle] = useToggle(false)
  const router = useRouter()
  const { user, openAuthModal } = useAuth()
  const myId = user?.id ? String(user.id) : ""

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
    const tid = await ensureThread()
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
    }
  }, [textareaValue, myId, ensureThread, openAuthModal, setTextareaValue])

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
          <IconButton
            className="rounded-full text-gray-500"
            visual="gray"
            variant="ghost"
            size="lg"
          >
            <Smile className="size-[22px]" />
          </IconButton>

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
                  disabled={!Boolean(state?.length)}
                  onClick={Boolean(state?.length) ? toggle : noop}
                >
                  Send
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
}): JSX.Element | null => {
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
  const [project, setProject] = React.useState<any>(null)
  const [loading, setLoading] = React.useState(true)
  const [selected, setSelected] = React.useState<string>("Details")
  const [pendingQuestion, setPendingQuestion] = React.useState("")
  const [askErrored, setAskErrored] = React.useState(false)
  const [showAskErrorMsg, setShowAskErrorMsg] = React.useState(false)
  const [askModalOpen, setAskModalOpen] = React.useState(false)
  const [lightboxOpen, setLightboxOpen] = React.useState(false)
  const [selectedMediaIndex, setSelectedMediaIndex] = React.useState(0)
  const toggleInviteWindow = useInviteWindowStore((s) => s.toggle)
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
        openAuthModal("sign-in")
        return
      }
      if (question !== undefined) setPendingQuestion(question)
      setSelected("Live Chat")
    },
    [user?.id, openAuthModal]
  )

  const handleAsk = React.useCallback(() => {
    if (!user?.id) {
      setAskModalOpen(false)
      openAuthModal("sign-in")
      return
    }
    if (pendingQuestion.trim()) {
      setAskModalOpen(false)
      openLiveChat()
    } else {
      setAskErrored(true)
      setShowAskErrorMsg(true)
    }
  }, [user?.id, pendingQuestion, openLiveChat, openAuthModal])

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
    const isOwnerMember = (m: any) =>
      m?.role === "owner" ||
      (!!ownerId && String(m?.userId ?? m?.id ?? "") === ownerId)
    return [...base].sort(
      (a, b) => (isOwnerMember(a) ? 0 : 1) - (isOwnerMember(b) ? 0 : 1)
    )
  }, [project, user, ownerProfile, projectOwnerId])

  const [tabsRef, isSticky] = useMakeFixedBehaveSticky<HTMLDivElement>()
  const [isFavorited, setIsFavorited] = React.useState(false)
  const [selectedPeriod, setSelectedPeriod] = React.useState("week")
  const [activeAnchor, setActiveAnchor] = React.useState("Description")

  // --- Sidebar pricing (docs §01, §14) ---
  const sidebarPricing = React.useMemo(() => {
    if (!project) return null
    // Budget (docs §14.7): compute from the scope when it's populated — same
    // helper/rate-card as the edit view — so both views show the same number.
    // Fall back to a stored price only when there's no scope to price.
    const pricingCost = (Number(project.budgetUsdCents) || 0) / 100
    const computedCost = estimateScopeBudgetCents(project.scope) / 100
    const totalCost =
      pricingCost > 0
        ? pricingCost
        : computedCost > 0
          ? computedCost
          : Number(project.priceMin ?? project.budget ?? 0)

    // Derive duration + roles from scope (matches edit mode). Handles both the
    // published shape (phase.tasks / roleName) and the draft shape (phase.rows / role).
    const scopeArr = Array.isArray(project.scope) ? project.scope : []
    let memberSlots = 0
    let totalDays = 0
    for (const phase of scopeArr) {
      const rows = ((phase?.rows ?? phase?.tasks ?? []) as any[]) ?? []
      const taskDays: number[] = []
      for (const row of rows) {
        const role = row?.role ?? row?.roleName
        if (role || row?.task || row?.taskName) memberSlots++
        const dur = row?.duration
        let days = 0
        if (dur && typeof dur === "object") {
          const val = Number(dur.value) || 0
          if (val > 0) {
            days =
              dur.type === "weeks"
                ? val * 7
                : dur.type === "hours"
                  ? Math.max(1, Math.ceil(val / 24))
                  : val
          }
        }
        // No explicit duration on the task — derive it from estimatedHours at
        // 40 hrs/week (full-time), so duration reflects the actual scope.
        if (days <= 0) {
          const hrs = Number(row?.estimatedHours) || 0
          if (hrs > 0) days = Math.max(1, Math.round((hrs * 7) / 40))
        }
        if (days > 0) taskDays.push(days)
      }
      if (taskDays.length > 0) totalDays += Math.max(...taskDays)
    }

    // Fall back to the baked project.duration / durationMonths when scope has no durations.
    let durationWeeks = totalDays > 0 ? totalDays / 7 : 0
    if (durationWeeks <= 0) {
      durationWeeks = parseInt(String(project.duration ?? ""), 10) || 0
      if (durationWeeks <= 0 && Number(project.durationMonths) > 0) {
        durationWeeks = Number(project.durationMonths) * 4.33
      }
    }
    // Whole billing periods (docs: Installment Plans §04). Each installment is
    // Total_Cost ÷ ceil(duration / period); the initial payment is one
    // installment (the first week / 2 weeks / month), not an average spread
    // over a fractional number of periods.
    const effDays = totalDays > 0 ? totalDays : Math.round(durationWeeks * 7)
    const installmentCost = (periodDays: number) => {
      if (effDays <= 0 || totalCost <= 0) return 0
      const count = Math.max(1, Math.ceil(effDays / periodDays))
      return Math.ceil(totalCost / count)
    }
    const costPerWeek = installmentCost(7)
    const costPerBiweek = installmentCost(14)
    const costPerMonth = installmentCost(30)
    const costPerQuarter = effDays >= 90 ? installmentCost(90) : 0
    const costPerYear = effDays >= 360 ? installmentCost(360) : 0

    const periodOptions = [
      { label: "week", value: "week", cost: costPerWeek },
      { label: "2 weeks", value: "2 weeks", cost: costPerBiweek },
      { label: "month", value: "month", cost: costPerMonth },
      ...(costPerQuarter > 0 ? [{ label: "quarter", value: "quarter", cost: costPerQuarter }] : []),
      ...(costPerYear > 0 ? [{ label: "year", value: "year", cost: costPerYear }] : []),
    ]

    // Duration display (docs §01 L98-104): <7d → days, <4w → weeks, else → months (rounded up)
    let formattedDuration = ""
    if (effDays > 0 && effDays < 7) {
      formattedDuration = `${effDays} day`
    } else if (effDays >= 7 && effDays < 28) {
      formattedDuration = `${Math.max(1, Math.ceil(effDays / 7))} week`
    } else if (effDays >= 28) {
      formattedDuration = `${Math.max(1, Math.ceil(effDays / 30))} month`
    }

    const isServiceScope =
      project.listingType === "service" ||
      scopeArr.some(
        (p: any) =>
          p?.phaseType === "setup" ||
          p?.phaseType === "recurring" ||
          p?.phaseType === "ongoing"
      )

    return {
      totalCost,
      periodOptions,
      minTeamMembers: memberSlots,
      formattedDuration,
      isServiceScope,
    }
  }, [project])


  React.useEffect(() => {
    if (!project?.id) return
    findFavoriteByItemId(String(project.id)).then((fav) => {
      setIsFavorited(!!fav)
    })
  }, [project?.id])

  const handleFavoriteToggle = async (pressed: boolean) => {
    if (!user?.id) {
      openAuthModal("sign-in")
      return
    }
    setIsFavorited(pressed)
    const itemId = String(project.id)
    const type = project.listingType === "service" ? "service" : "project"
    if (pressed) {
      await addFavorite({ type, itemId })
    } else {
      const fav = await findFavoriteByItemId(itemId)
      if (fav) await removeFavorite(fav.id)
    }
  }

  React.useEffect(() => {
    async function fetchProject() {
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
          const r = await fetch(`${apiBase}/v1/projects/slug/${candidate}`)
          if (r.ok) {
            res = r
            slug = candidate
            break
          }
        }
        if (!res) {
          // last attempt — assign the final failing response so the fallback
          // branches below can run against the last tried slug
          res = await fetch(`${apiBase}/v1/projects/slug/${slug}`)
        }
        if (!res.ok) {
          // Try as a service. Service URLs are also generated as
          // `${slug}-${shortId}`, while the API expects the plain slug.
          let svcRes: Response | null = null
          for (const candidate of candidates) {
            const r = await fetch(`${apiBase}/v1/services/slug/${candidate}`)
            if (r.ok) {
              svcRes = r
              break
            }
          }
          if (!svcRes) {
            svcRes = await fetch(`${apiBase}/v1/services/slug/${slug}`)
          }
          if (!svcRes.ok) {
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
                  const visibleGallery = galleryUrls.filter(
                    (u) => !hiddenUrls.includes(u)
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
              }
            }
            setLoading(false)
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
      } finally {
        setLoading(false)
      }
    }

    fetchProject()
  }, [params.slug, router])

  // Track view when project loads — skip in owner preview
  React.useEffect(() => {
    if (!project?.id || isPreview) return
    const apiBase = getPublicApiUrl() || "http://localhost:4000"
    fetch(`${apiBase}/v1/recently-viewed/${project.id}`, {
      method: "POST",
      credentials: "include",
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
                <div className="w-[189px] h-[126px] relative overflow-hidden rounded-lg">
                  <NextImage
                    src={project.mediaUrls?.[0] || "/dashboard.png"}
                    alt={project.title}
                    sizes="25vw"
                    loading="eager"
                    priority
                    fill
                  />
                </div>

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
              <Carousel className="w-full">
                <CarouselContent className="-ml-3">
                  {mediaItems.length === 0
                    ? Array.from({ length: 5 }).map((_, index) => (
                        <CarouselItem key={index} className="group basis-1/3">
                          <div className="relative border border-gray-200 h-[150.6px] overflow-hidden rounded-lg">
                            <NextImage
                              className="object-cover"
                              src="/waves.png"
                              alt="Waves"
                              sizes="25vw"
                              fill
                            />
                            <div className="absolute inset-0 transition duration-300" />
                          </div>
                        </CarouselItem>
                      ))
                    : mediaItems.map((m, i) => (
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
                                        border: "2px solid #ffffff",
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
                        <SaveButton />
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
                        <h1 className="text-2xl leading-none font-semibold text-dark-blue-400">
                          {project.title}
                        </h1>

                        <div className="mt-6 border-t pt-6 border-gray-200">
                          {/*
                            project.description is HTML generated from the
                            Payload Lexical rich-text editor by the
                            listings-service ProjectSyncService. Editor
                            content is admin-authored (not user-submitted)
                            so `dangerouslySetInnerHTML` is safe here — see
                            the lexicalToHtml() helper on the service which
                            escapes text content before wrapping in tags.
                          */}
                          <div
                            className="prose prose-sm max-w-none text-dark-blue-400 prose-headings:text-dark-blue-400 prose-headings:font-semibold prose-p:font-extralight prose-p:leading-relaxed prose-strong:text-dark-blue-400 prose-li:font-extralight"
                            dangerouslySetInnerHTML={{
                              __html:
                                project.description ||
                                project.summary ||
                                "",
                            }}
                          />
                        </div>
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
                                          href="#"
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
                                <Button size="md" visual="primary">
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
                                      openAuthModal("sign-in")
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
                      {selectedPeriod === "2 weeks" ? "every" : "per"}
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

              <div className="flex flex-col items-start gap-y-3 mt-6">
                <span className="inline-block text-xs font-medium text-dark-blue-400">
                  Current Team
                </span>

                {Array.isArray(currentTeam) && currentTeam.length > 0 ? (
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
                ) : (
                  <div className="flex flex-col items-start gap-y-2">
                    <div className="flex items-center -space-x-2">
                      {[0, 1, 2].map((i) => (
                        <div
                          key={i}
                          className="size-8 rounded-full border border-dashed border-gray-300 bg-gray-100 flex items-center justify-center ring-2 ring-white"
                        >
                          <User01 className="size-3.5 text-gray-400" />
                        </div>
                      ))}
                    </div>
                    <span className="text-xs text-gray-400 font-extralight leading-none">
                      No team assigned yet
                    </span>
                  </div>
                )}
              </div>

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

              {!isOwnerViewing && (
                <Dialog>
                  <DialogTrigger asChild>
                    <Button
                      size="lg"
                      className="mt-6 w-full border-2 border-primary-500 text-primary-500 hover:bg-primary-500 hover:text-white"
                      variant="outlined"
                      onClick={(e) => {
                        if (!user?.id) {
                          e.preventDefault()
                          openAuthModal("sign-in")
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
                        onClick={() => router.push(`/checkout/${params.slug}`)}
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
                    onClick={() => toggleInviteWindow(true)}
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

            <InviteWindow />
            <div className="h-[50px] rounded-b-lg bg-gray-50 flex items-center justify-evenly">
              {project.reportButtonEnabled !== false && (
                <div
                  className="inline-flex items-center gap-x-2 cursor-pointer"
                  onClick={() => {
                    if (!user?.id) openAuthModal("sign-in")
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
                  onClick={() => toggleInviteWindow(true)}
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

    </div>
  )
}
