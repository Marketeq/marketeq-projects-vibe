"use client"

import * as React from "react"
import { useCallback, useEffect, useRef, useState } from "react"
import dynamic from "next/dynamic"
import { useParams, usePathname, useRouter } from "next/navigation"
import { ProjectChatPanel } from "./project-chat-panel"
import { RecentQuestionsManager } from "./recent-questions-manager"

const ClientListingView = dynamic(
  () => import("@/app/(group)/(group)/project-details/[slug]/page"),
  { ssr: false }
)
import {
  AutocompleteAPI,
  type AutocompleteCategorySuggestion,
  type AutocompleteTypeSuggestion,
} from "@/service/http/autocomplete"
import { CategoryAPI, type CategoryTreeNode } from "@/service/http/category"
import { ProjectAPI } from "@/service/http/project"
import { TeamsAPI } from "@/service/http/teams"
import {
  PROJECT_TYPE_OPTIONS,
  TEAM_SEED_LISTINGS,
} from "@/src/lib/my-listings"
import {
  addFavorite,
  findFavoriteByItemId,
  removeFavorite,
} from "@/src/lib/api/favorites"
import { extractShortIdFromSlug } from "@/src/lib/urlHelpers"
import { useAuth } from "@/contexts/auth"
import AuthenticatedRoute from "@/hoc/AuthenticatedRoute"
import { useOnlineUsers } from "@/utils/useOnlineUsers"
import { cn, getIsNotEmpty, noop, toPxIfNumber } from "@/utils/functions"
import { useControllableState, useMakeFixedBehaveSticky } from "@/utils/hooks"
import { TagsInputHiddenInput } from "@ark-ui/react"
import {
  AlertCircle,
  ArrowLeft,
  Attachment01,
  ChartBreakoutCircle,
  Check,
  XCircle,
  CheckCircle,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronsDown,
  ChevronsUp,
  Clock,
  Edit03,
  Expand06,
  Eye,
  EyeOff,
  FileText,
  Flag,
  HelpCircle,
  Home03,
  Image03,
  Info,
  MapPin,
  MessageTextCircle01,
  MessageTextSquare01,
  MoreHorizontal,
  Play,
  Plus,
  Plus2,
  Rocket02,
  SearchMd,
  Send,
  Share,
  Share06,
  ShieldDollar,
  ShieldZap,
  ShoppingCart,
  Smile,
  Star,
  Stars02,
  Trash2,
  Upload01,
  Upload04,
  UploadCloud,
  Users03,
  VideoRecorder,
  X,
  X2,
} from "@blend-metrics/icons"
import {
  DropboxBrand,
  GoogleDrive1Brand,
  MsOnedriveBrand,
} from "@blend-metrics/icons/brands"
import {
  DndContext,
  type DragEndEvent,
  MouseSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
} from "@dnd-kit/core"
import { restrictToHorizontalAxis } from "@dnd-kit/modifiers"
import {
  SortableContext,
  arrayMove,
  horizontalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
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
import {
  Combobox,
  ComboboxButton,
  ComboboxInput,
  ComboboxOption,
  ComboboxPrimitive,
  ComboboxTrigger,
} from "@/components/ui/combobox/combobox"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover/popover"
import { Spinner } from "@/components/ui/spinner/spinner"
import { ScaleOutIn } from "@/components/ui/transitions/transitions"
import { ChatsContextProvider } from "@/components/chat"
import { GripVertical2 } from "@/components/icons/grip-vertical-2"
import { EditContextProvider, useEditContext } from "@/components/inbox-comps"
import { useInviteWindowStore } from "@/components/invite-window"
import { LikeDislike } from "@/components/like-dislike"
import { MarketplaceFooter } from "@/components/marketplace-footer"
import NextImage from "@/components/next-image"
import { countryOf } from "@/lib/geo"
import NextLink from "@/components/next-link"
import { ProjectDetailsStepsSection } from "@/components/project-details/project-details-steps-section"
import { ReadMoreLessComp, ReadMoreLessRoot } from "@/components/read-more-less"
import { RichTextEditor } from "@/components/rich-text-editor"
import { ScopeBuilder, estimateScopeBudgetCents } from "@/components/scope-builder"
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
  AlertTitle,
  Avatar,
  AvatarFallback,
  AvatarFallbackIcon,
  AvatarGroup,
  AvatarImage,
  Badge,
  Button,
  Card,
  CircularProgressDropzone,
  CircularProgressDropzoneState,
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DisclosureContent,
  DisclosureTrigger,
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
  InputLeftAddon,
  InputLeftElement,
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
  TabsTrigger,
  TagsInputContext,
  TagsInputControl,
  TagsInputInput,
  TagsInputItem,
  TagsInputItemDeleteTrigger,
  TagsInputItemInput,
  TagsInputItemPreview,
  TagsInputItemText,
  TagsInputRoot,
  Textarea,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
  useToast,
} from "@/components/ui"

const Shimmer = ({ className }: { className?: string }) => (
  <div
    className={cn("relative bg-gray-100 rounded overflow-hidden", className)}
  >
    <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-gray-100 via-white to-gray-100" />
  </div>
)

const DESC_MAX_HEIGHT = 530

const DescriptionCard = ({
  descHtml,
  onEdit,
}: {
  descHtml: string
  onEdit: () => void
}) => {
  const innerRef = useRef<HTMLDivElement>(null)
  const [needsTruncation, setNeedsTruncation] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false)

  useEffect(() => {
    const el = innerRef.current
    if (!el) return
    const check = () => setNeedsTruncation(el.scrollHeight > DESC_MAX_HEIGHT)
    check()
    const ro = new ResizeObserver(check)
    ro.observe(el)
    return () => ro.disconnect()
  }, [descHtml])

  return (
    <div
      className={cn(
        "relative border border-gray-200 bg-white rounded-lg p-6 shadow-[0px_1px_5px_0px_rgba(16,24,40,.02)] transition-[height] duration-300 overflow-hidden [interpolate-size:allow-keywords]",
        needsTruncation && !isExpanded && "h-[530px]"
      )}
    >
      <IconButton
        className="absolute top-6 right-6 rounded-full bg-white text-gray-500 hover:text-gray-800 shrink-0 z-10 shadow-sm"
        variant="ghost"
        visual="gray"
        onClick={onEdit}
      >
        <Edit03 className="size-4" />
      </IconButton>

      <div ref={innerRef}>
        <div
          className="prose prose-sm max-w-none text-dark-blue-400 prose-headings:text-dark-blue-400 prose-headings:font-semibold prose-p:font-extralight prose-p:leading-relaxed prose-strong:text-dark-blue-400 prose-li:font-extralight"
          dangerouslySetInnerHTML={{ __html: descHtml }}
        />
      </div>

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

const formatDeliverable = (text: string) => {
  const cleaned = text
    .replace(/[^a-zA-Z0-9\s&]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .replace(/\bAnd\b/g, "&")
  const words = cleaned.split(" ")
  return words.length > 3 ? words.slice(0, 3).join(" ") : cleaned
}

const FALLBACK_CATEGORY_OPTIONS = [
  "Web Development",
  "Mobile Development",
  "UI/UX Design",
  "Graphic Design",
  "Software Engineering",
  "Product Design",
  "Frontend Development",
  "Backend Development",
  "Data Science",
  "Artificial Intelligence",
  "Cloud Computing",
  "Cybersecurity",
]

const MAX_SUBCATEGORIES_PER_CATEGORY = 5

const SHORT_DESCRIPTION_MIN_LENGTH = 350
const SHORT_DESCRIPTION_MAX_LENGTH = 450
const FULL_DESCRIPTION_MIN_LENGTH = 100
const FULL_DESCRIPTION_MAX_LENGTH = 5000
// Demo-toggle: publish-attempt validation (red inline hints + blocked publish).
// Set to false to hide all publish validation.
const SHOW_PUBLISH_VALIDATION = true

const plainTextFromRichTextHtml = (value: string) => {
  if (!value) return ""
  if (typeof window !== "undefined") {
    const container = window.document.createElement("div")
    container.innerHTML = value
    return (container.textContent ?? container.innerText ?? "")
      .replace(/\u00a0/g, " ")
      .replace(/\s+/g, " ")
      .trim()
  }
  return value
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<\/(p|div|li|h[1-6])>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/\s+/g, " ")
    .trim()
}

const getRichTextCharacterCount = (value: string) =>
  plainTextFromRichTextHtml(value).length

const toEmbedUrl = (raw?: string | null): string => {
  if (!raw) return ""
  const url = raw.trim()
  const yt = url.match(
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)([\w-]{11})/
  )
  if (yt) return `https://www.youtube.com/embed/${yt[1]}`
  const vimeo = url.match(/vimeo\.com\/(?:video\/)?(\d+)/)
  if (vimeo) return `https://player.vimeo.com/video/${vimeo[1]}`
  return url
}

const toVideoThumb = (raw?: string | null): string => {
  if (!raw) return ""
  const yt = raw.match(
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)([\w-]{11})/
  )
  if (yt) return `https://img.youtube.com/vi/${yt[1]}/hqdefault.jpg`
  return ""
}

const backendErrorMessage = (err: any): string => {
  const raw = err?.response?.data?.message
  if (Array.isArray(raw)) return raw.join(" ")
  if (typeof raw === "string") return raw
  return ""
}

const isModerationRejection = (err: any): boolean =>
  err?.response?.status === 400 &&
  /moderation|rejected|violat/i.test(backendErrorMessage(err))

const moderationFieldLabel = (field?: string | null): string | null => {
  switch (field) {
    case "title":
      return "project title"
    case "shortDescription":
      return "short description"
    case "fullDescription":
      return "project description"
    case "faqs":
      return "FAQ's"
    default:
      return null
  }
}

const generateFaqSuggestions = (
  project: any
): Array<{ question: string; answer: string }> => {
  const isService = project?.listingType === "service"
  const kind = isService ? "service" : "project"
  const title =
    project?.title && project.title !== "Enter Project Title"
      ? project.title
      : `this ${kind}`
  const cats: string[] = project?.categories ?? []
  const tech = [
    ...new Set([
      ...(project?.programmingLanguages ?? project?.skills ?? []),
      ...(project?.tags ?? []),
    ]),
  ]
    .filter(Boolean)
    .slice(0, 6)
  const summary: string = project?.summary || ""
  const duration = project?.durationMonths

  const out: Array<{ question: string; answer: string }> = []

  out.push({
    question: `What's included in ${title}?`,
    answer:
      summary ||
      `This ${kind} covers everything defined in the scope and deliverables, with each phase broken down into clear tasks so you know exactly what you're getting.`,
  })
  if (tech.length) {
    const last = tech[tech.length - 1]
    const techList =
      tech.length > 1 ? `${tech.slice(0, -1).join(", ")} and ${last}` : last
    out.push({
      question: `What technologies and skills are used?`,
      answer: `This ${kind} is delivered using ${techList}.`,
    })
  }
  out.push({
    question: `How long does ${title} take to complete?`,
    answer: duration
      ? `The estimated timeline is around ${duration} ${
          duration === 1 ? "month" : "months"
        }, depending on the final scope and feedback cycles.`
      : `Timelines depend on the final scope. Once the scope is set, the estimated duration is shown in the budget breakdown.`,
  })
  out.push({
    question: `How is pricing determined?`,
    answer: `Pricing is calculated from the scope — the tasks, estimated hours, and assigned roles — and starts from the total shown at the top of the listing.`,
  })
  if (cats.length) {
    out.push({
      question: `Is this a good fit for ${cats[0]} work?`,
      answer: `Yes — this ${kind} focuses on ${cats
        .slice(0, 3)
        .join(", ")} and is built for that kind of work.`,
    })
  }
  out.push({
    question: `Can the scope be customized?`,
    answer: `Yes. Reach out before starting and the phases, tasks, and deliverables can be adjusted to fit your specific needs.`,
  })
  return out
}

const generateFaqAnswer = (project: any, question: string): string => {
  const match = generateFaqSuggestions(project).find(
    (s) => s.question.trim().toLowerCase() === (question || "").trim().toLowerCase()
  )
  if (match) return match.answer
  const kind = project?.listingType === "service" ? "service" : "project"
  return (
    project?.summary ||
    `This ${kind} is designed to address exactly that — see the description and scope for the full details.`
  )
}

const isActiveCategoryNode = (node: CategoryTreeNode) => node.approved

const collectCategoryDescendants = (
  node?: CategoryTreeNode
): CategoryTreeNode[] => {
  if (!node?.children?.length) return []
  return node.children.flatMap((child) => {
    const descendants = collectCategoryDescendants(child)
    return isActiveCategoryNode(child) ? [child, ...descendants] : descendants
  })
}

const collectSelectableCategories = (nodes: CategoryTreeNode[]) => {
  const secondLevelNodes = nodes.flatMap((node) =>
    (node.children ?? []).filter(isActiveCategoryNode)
  )
  return secondLevelNodes.length > 0
    ? secondLevelNodes
    : nodes.filter(isActiveCategoryNode)
}

const indexCategoryTreeByName = (nodes: CategoryTreeNode[]) => {
  const index = new Map<string, CategoryTreeNode>()
  const visit = (entries: CategoryTreeNode[]) => {
    entries.forEach((entry) => {
      if (isActiveCategoryNode(entry)) index.set(entry.name, entry)
      if (entry.children?.length) visit(entry.children)
    })
  }
  visit(nodes)
  return index
}

const findSuggestedSubCategory = (node?: CategoryTreeNode): string | null => {
  const [firstDescendant] = collectCategoryDescendants(node)
  return firstDescendant?.name ?? null
}

const getUniqueOptions = (values: string[]) =>
  Array.from(
    new Set(values.map((value) => value.trim()).filter((value) => value.length))
  )

type SuggestedCategoryOption = {
  category: string
  subCategory: string
}

const DEFAULT_SUGGESTED_CATEGORIES: SuggestedCategoryOption[] = [
  { category: "Design", subCategory: "UI/UX Design" },
  { category: "Development", subCategory: "Mobile App" },
  { category: "Data Science", subCategory: "Machine Learning" },
]

const SUGGESTION_STOPWORDS = new Set([
  "the", "and", "for", "with", "your", "our", "that", "this", "from", "into",
  "over", "you", "are", "was", "will", "can", "get", "all", "new", "use",
  "per", "via",
])

const tokenizeForSuggestion = (text: string): string[] =>
  text
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((token) => token.length >= 3 && !SUGGESTION_STOPWORDS.has(token))

const scoreCandidateAgainstTitle = (
  titleTokens: string[],
  candidateText: string
): number => {
  const candidateTokens = tokenizeForSuggestion(candidateText)
  let score = 0
  for (const candidateToken of candidateTokens) {
    for (const titleToken of titleTokens) {
      if (candidateToken === titleToken) {
        score += 2
        break
      }
      if (
        candidateToken.length >= 4 &&
        titleToken.length >= 4 &&
        (candidateToken.includes(titleToken) ||
          titleToken.includes(candidateToken))
      ) {
        score += 1
        break
      }
    }
  }
  return score
}

const suggestionsFromText = (
  text: string,
  nodes: CategoryTreeNode[]
): SuggestedCategoryOption[] => {
  const tokens = tokenizeForSuggestion(text)
  if (!tokens.length || !nodes.length) return []

  const scored: Array<SuggestedCategoryOption & { score: number }> = []
  for (const categoryNode of nodes) {
    if (!isActiveCategoryNode(categoryNode) || !categoryNode.name) continue
    const subs = (categoryNode.children ?? []).filter(isActiveCategoryNode)
    for (const sub of subs) {
      if (!sub.name || sub.name === categoryNode.name) continue
      const score = scoreCandidateAgainstTitle(
        tokens,
        `${categoryNode.name} ${sub.name}`
      )
      if (score > 0) {
        scored.push({
          category: categoryNode.name,
          subCategory: sub.name,
          score,
        })
      }
    }
  }

  scored.sort((a, b) => b.score - a.score)
  const seenCategories = new Set<string>()
  const result: SuggestedCategoryOption[] = []
  for (const item of scored) {
    if (seenCategories.has(item.category)) continue
    seenCategories.add(item.category)
    result.push({ category: item.category, subCategory: item.subCategory })
  }
  return result
}

type CategoryRow = {
  category: string
  subCategories: string[]
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

const Chats = () => {
  const [state, setState] = React.useState<CircularProgressDropzoneState>()
  const [open, toggle] = useToggle(false)

  const { onChatChange, onSave, chat } = useEditContext()
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
          <div className="flex gap-x-3 py-6 items-center">
            <span className="inline-block bg-gray-200 flex-auto h-px" />
            <span className="text-xs leading-[14.52px] font-medium text-gray-500">
              Jun 14, 2024
            </span>
            <span className="inline-block bg-gray-200 flex-auto h-px" />
          </div>

          <div className="flex justify-start">
            {/* FIXME: a type error as the message prop's type has been changed */}
            {/*<YourBubble message="Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua." />*/}
          </div>

          <div className="flex justify-end">
            {/* FIXME: a type error as the message prop's type has been changed */}
            {/*<Bubble message="Lorem ipsum dolor sit amet, consectetur adipiscing elit." />*/}
          </div>

          <div className="flex justify-start">
            {/* FIXME: a type error as the message prop's type has been changed */}
            {/*<YourBubble message="Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua." />*/}
          </div>

          <div className="flex gap-x-3 py-6 items-center">
            <span className="inline-block bg-gray-200 flex-auto h-px" />
            <span className="text-xs leading-[14.52px] font-medium text-gray-500">
              Jun 14, 2024
            </span>
            <span className="inline-block bg-gray-200 flex-auto h-px" />
          </div>

          <div className="flex justify-end">
            {/* FIXME: a type error as the message prop's type has been changed */}
            {/*<Bubble message="Lorem ipsum dolor sit amet, consectetur adipiscing elit." />*/}
          </div>

          <div className="flex justify-start">
            {/* FIXME: a type error as the message prop's type has been changed */}
            {/*<YourBubble message="Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua." />*/}
          </div>

          <div className="flex gap-x-3 py-6 items-center">
            <span className="inline-block bg-gray-200 flex-auto h-px" />
            <span className="text-xs leading-[14.52px] font-medium text-gray-500">
              Jun 14, 2024
            </span>
            <span className="inline-block bg-gray-200 flex-auto h-px" />
          </div>

          <div className="flex justify-end">
            {/* FIXME: a type error as the message prop's type has been changed */}
            {/*<Bubble message="Lorem ipsum dolor sit amet, consectetur adipiscing elit." />*/}
          </div>
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
          />
          <InputRightElement className="items-end pb-[13px]">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger
                  className="focus-visible:outline-none text-gray-500 hover:disabled:text-gray-500/50 hover:text-primary-500 disabled:text-gray-500/50"
                  onClick={() => textareaValue && onSave()}
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

// Profiles may deliver languages/skills/location as objects
// ({ name, fluency, ... }) rather than plain strings; coerce to a display
// string so they never get rendered as a raw object.
const coerceName = (x: any): string =>
  typeof x === "string" ? x : (x?.name ?? x?.label ?? x?.title ?? "")

const jobTitlesOf = (m: any): string[] =>
  Array.isArray(m?.jobTitles)
    ? m.jobTitles
        .map((j: any) =>
          typeof j === "string" ? j : (j?.jobTitle ?? j?.headline ?? "")
        )
        .filter(Boolean)
    : []

const jobTitleOf = (m: any): string =>
  coerceName(m?.recentJobTitle) ||
  jobTitlesOf(m)[0] ||
  coerceName(m?.jobTitle) ||
  ""

// Seed team data used until real team data comes from the API
const SEED_TEAM_MEMBERS = [
  {
    id: "seed-1",
    firstName: "Chris",
    username: "uxdesignma",
    avatarUrl: "/man.jpg",
    role: "Product Manager",
    jobTitles: ["Product Manager", "Full Stack Designer"],
    hourlyRate: 95,
    workSchedule: "full_time",
    customHoursPerWeek: null,
    location: "United States",
    experience: "Senior",
  },
  {
    id: "seed-2",
    firstName: "Sarah",
    username: "sarahdev",
    avatarUrl: "/woman.jpg",
    role: "Frontend Developer",
    jobTitles: ["Frontend Developer", "UI/UX Designer"],
    hourlyRate: 85,
    workSchedule: "full_time",
    customHoursPerWeek: null,
    location: "United Kingdom",
    experience: "Medior",
  },
  {
    id: "seed-3",
    firstName: "Laura",
    username: "lauraops",
    avatarUrl: "/woman.jpg",
    role: "DevOps Engineer",
    jobTitles: ["DevOps Engineer", "Cloud Engineer"],
    hourlyRate: 110,
    workSchedule: "full_time",
    customHoursPerWeek: null,
    location: "Germany",
    experience: "Senior",
  },
  {
    id: "seed-4",
    firstName: "Tina",
    username: "tinaqa",
    avatarUrl: "/woman.jpg",
    role: "QA Engineer",
    jobTitles: ["QA Engineer"],
    hourlyRate: 70,
    workSchedule: "part_time",
    customHoursPerWeek: null,
    location: "India",
    experience: "Junior",
  },
  {
    id: "seed-5",
    firstName: "Shelly",
    username: "shellyux",
    avatarUrl: "/woman.jpg",
    role: "UI/UX Designer",
    jobTitles: ["UI/UX Designer", "Product Designer"],
    hourlyRate: 90,
    workSchedule: "full_time",
    customHoursPerWeek: null,
    location: "Canada",
    experience: "Medior",
  },
]

function UploadProgressRing({
  uploading,
  onComplete,
}: {
  uploading: boolean
  onComplete?: () => void
}) {
  const progressRef = React.useRef(0)
  const [offset, setOffset] = React.useState(97.4)
  const rafRef = React.useRef<number>(0)
  const startRef = React.useRef(performance.now())
  const phaseRef = React.useRef<"filling" | "completing" | "done">("filling")
  const completeStartRef = React.useRef(0)
  const completeFromRef = React.useRef(0)
  const onCompleteRef = React.useRef(onComplete)
  onCompleteRef.current = onComplete

  const circumference = 97.4 // 2π × 15.5

  React.useEffect(() => {
    if (uploading) {
      progressRef.current = 0
      startRef.current = performance.now()
      phaseRef.current = "filling"
    }
  }, [uploading])

  // When uploading stops, switch to completing phase
  React.useEffect(() => {
    if (!uploading && phaseRef.current === "filling") {
      phaseRef.current = "completing"
      completeFromRef.current = progressRef.current
      completeStartRef.current = performance.now()
    }
  }, [uploading])

  React.useEffect(() => {
    const tick = () => {
      if (phaseRef.current === "done") return

      if (phaseRef.current === "filling") {
        const elapsed = performance.now() - startRef.current
        // Fast curve — reaches ~50% at 500ms, ~70% at 1s, ~80% at 1.5s
        progressRef.current = 85 * (1 - Math.exp(-elapsed / 800))
      } else if (phaseRef.current === "completing") {
        const elapsed = performance.now() - completeStartRef.current
        const from = completeFromRef.current
        // Duration scales with how far we need to go (min 200ms, max 500ms)
        const distance = 100 - from
        const duration = Math.max(200, Math.min(500, distance * 6))
        const t = Math.min(elapsed / duration, 1)
        const eased = 1 - (1 - t) * (1 - t) // ease-out quad
        progressRef.current = from + distance * eased

        if (t >= 1) {
          phaseRef.current = "done"
          setOffset(0)
          onCompleteRef.current?.()
          return
        }
      }

      setOffset(circumference - (progressRef.current / 100) * circumference)
      rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafRef.current)
  }, [uploading])

  return (
    <div className="relative size-9">
      <svg className="size-9 -rotate-90" viewBox="0 0 36 36">
        <circle
          cx="18"
          cy="18"
          r="15.5"
          fill="none"
          stroke="#E5E7EB"
          strokeWidth="2.5"
        />
        <circle
          cx="18"
          cy="18"
          r="15.5"
          fill="none"
          stroke="#354764"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
      </svg>
      <UploadCloud className="size-4 text-gray-600 absolute inset-0 m-auto" />
    </div>
  )
}

function SortableGalleryItem({
  index,
  url,
  isHidden,
  isUploading,
  isCompleting,
  onUpload,
  onDelete,
  onToggleHidden,
  onUploadComplete,
  showError,
}: {
  index: number
  url: string | undefined
  isHidden: boolean
  isUploading: boolean
  isCompleting: boolean
  onUpload: (files: FileList | null, replaceIndex?: number) => void
  onDelete: (index: number) => void
  onToggleHidden: (index: number) => void
  onUploadComplete: () => void
  showError?: boolean
}) {
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false)
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: `gallery-${index}`, disabled: !url })

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : undefined,
    boxShadow: isDragging
      ? "0 12px 28px rgba(0,0,0,0.2), 0 4px 10px rgba(0,0,0,0.1)"
      : undefined,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="group/slide shrink-0 w-[calc(33.333%-8px)]"
    >
      <div
        className={cn(
          "relative border h-[150.6px] overflow-hidden rounded-lg",
          showError && !url ? "border-error-300" : "border-gray-200"
        )}
      >
        {url ? (
          <>
            <NextImage
              className={cn(
                "object-cover transition-all duration-300",
                isHidden && "opacity-40 blur-[1px]"
              )}
              src={url}
              alt={`Gallery image ${index + 1}`}
              sizes="25vw"
              fill
            />
            {(isUploading || isCompleting) && (
              <div className="absolute inset-0 bg-gray-100/80 flex items-center justify-center z-20">
                <UploadProgressRing
                  uploading={isUploading}
                  onComplete={onUploadComplete}
                />
              </div>
            )}
            {isHidden && !isUploading && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-100 group-hover/slide:opacity-0 transition-opacity duration-300">
                <div className="flex items-center gap-1.5 bg-white/80 rounded-md px-2.5 py-1.5">
                  <EyeOff className="size-3.5 text-gray-500" />
                  <span className="text-xs font-medium text-gray-600">
                    Hidden
                  </span>
                </div>
              </div>
            )}
            {/* Hover overlay */}
            <div
              className={cn(
                "absolute inset-0 bg-black/40 opacity-0 group-hover/slide:opacity-100 transition-opacity duration-200",
                (isUploading || isCompleting) &&
                  "pointer-events-none !opacity-0"
              )}
            >
              {/* Drag handle */}
              <TooltipProvider delayDuration={300}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div
                      className="absolute top-0 left-1/2 -translate-x-1/2 p-2.5 cursor-grab active:cursor-grabbing group/drag z-20"
                      {...attributes}
                      {...listeners}
                    >
                      <img
                        src="/drag-icon.svg"
                        alt=""
                        className="w-[50px] h-2 opacity-50 group-hover/drag:opacity-100 transition-opacity"
                        draggable={false}
                      />
                    </div>
                  </TooltipTrigger>
                  <TooltipContent
                    side="bottom"
                    visual="white"
                    className="text-xs"
                  >
                    Drag to reorder
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              {/* Action buttons */}
              <div className="absolute inset-0 flex items-center justify-center gap-x-2 z-10">
                <TooltipProvider delayDuration={200}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        className="size-9 rounded-full bg-white/20 hover:bg-white/40 inline-flex items-center justify-center transition"
                        onClick={() => {
                          const input = document.createElement("input")
                          input.type = "file"
                          input.accept = "image/*"
                          input.onchange = (e) => {
                            const files = (e.target as HTMLInputElement).files
                            onUpload(files, index)
                          }
                          input.click()
                        }}
                      >
                        <Edit03 className="size-4 text-white" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent
                      side="bottom"
                      visual="white"
                      className="text-xs"
                    >
                      Replace image
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                <TooltipProvider delayDuration={200}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        className="size-9 rounded-full bg-white/20 hover:bg-white/40 inline-flex items-center justify-center transition"
                        onClick={() => onToggleHidden(index)}
                      >
                        {isHidden ? (
                          <Eye className="size-4 text-white" />
                        ) : (
                          <EyeOff className="size-4 text-white" />
                        )}
                      </button>
                    </TooltipTrigger>
                    <TooltipContent
                      side="bottom"
                      visual="white"
                      className="text-xs"
                    >
                      {isHidden ? "Show image" : "Hide image"}
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                <TooltipProvider delayDuration={200}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        className="size-9 rounded-full bg-white/20 hover:bg-red-500/80 inline-flex items-center justify-center transition"
                        onClick={() => setDeleteDialogOpen(true)}
                      >
                        <Trash2 className="size-4 text-white" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent
                      side="bottom"
                      visual="white"
                      className="text-xs"
                    >
                      Delete image
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </div>
            {/* Delete confirmation dialog */}
            <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
              <DialogContent className="max-w-[409px] p-0">
                <div className="p-6 border-b border-gray-200">
                  <DialogTitle>Delete this image?</DialogTitle>
                  <DialogDescription className="mt-2">
                    Your image will be removed permanently.
                  </DialogDescription>
                </div>
                <div className="py-4 flex rounded-b-xl bg-gray-25 items-center justify-between px-6">
                  <DialogClose asChild>
                    <Button
                      className="opacity-50 hover:opacity-100"
                      visual="gray"
                      variant="link"
                    >
                      <X className="size-[15px]" />
                      Cancel
                    </Button>
                  </DialogClose>
                  <Button
                    variant="outlined"
                    visual="gray"
                    onClick={() => {
                      onDelete(index)
                      setDeleteDialogOpen(false)
                    }}
                  >
                    Yes, Delete
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </>
        ) : isUploading || isCompleting ? (
          <div className="absolute inset-0 bg-gray-100 flex items-center justify-center">
            <UploadProgressRing
              uploading={isUploading}
              onComplete={onUploadComplete}
            />
          </div>
        ) : (
          <>
            <div
              className={cn(
                "absolute inset-0 flex items-center justify-center",
                showError ? "bg-error-25" : "bg-gray-50"
              )}
            >
              {showError ? (
                <span
                              className="size-[54px] bg-error-300"
                              style={{
                                WebkitMaskImage: "url(/placeholder-img.svg)",
                                maskImage: "url(/placeholder-img.svg)",
                                WebkitMaskRepeat: "no-repeat",
                                maskRepeat: "no-repeat",
                                WebkitMaskSize: "contain",
                                maskSize: "contain",
                                WebkitMaskPosition: "center",
                                maskPosition: "center",
                              }}
                            />
              ) : (
                <img src="/placeholder-img.svg" alt="" className="size-[54px]" />
              )}
            </div>
            <div className="absolute inset-0 bg-gray-500/80 opacity-0 group-hover/slide:opacity-100 transition-opacity duration-200 flex items-center justify-center">
              <button
                type="button"
                className="inline-flex items-center gap-x-1.5 px-3 py-1.5 rounded-md bg-white text-sm font-medium text-gray-800 hover:bg-gray-50 transition shadow-sm"
                onClick={() => {
                  const input = document.createElement("input")
                  input.type = "file"
                  input.accept = "image/*"
                  input.onchange = (e) => {
                    const files = (e.target as HTMLInputElement).files
                    onUpload(files, index)
                  }
                  input.click()
                }}
              >
                <UploadCloud className="size-4" />
                Add Image
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

// PMCM-402/QA-190: this used to redirect an unauthenticated visitor to the
// full /sign-in page, which bypasses the on-page auth modal SOP §1.4.1
// requires everywhere on listing pages. The default export below wraps this
// in AuthenticatedRoute instead, matching every other gated route (spinner,
// then the modal, then the page — no full-page redirect).
function ProjectDetailsInner() {
  const params = useParams()
  const router = useRouter()
  const pathname = usePathname()
  const { user } = useAuth()
  const [project, setProject] = React.useState<any>({
    id: "draft",
    title: "Enter Project Title",
    slug: "draft",
    listingType: "project",
    role: "Software Development",
    category: "Software Development",
    categories: [
      "Software Development",
      "Mobile Applications",
      "iOS Development",
    ],
    summary: "",
    description: "",
    rating: 0,
    reviewCount: 0,
    featuredImage: null,
    featuredVideo: null as string | null,
    mediaUrls: [],
    programmingLanguages: [],
    developmentTech: [],
    subcategories: [],
    tags: [],
    team: [],
    deliverables: [],
    faqs: [],
    recentQuestions: [],
    scope: [],
  })
  const [loading, setLoading] = React.useState(true)
  // QA-196/PMCM-402: set when the backend 403s the draft fetch — the
  // listing exists but this account isn't its owner or a team member on it.
  const [accessDenied, setAccessDenied] = React.useState(false)
  const [hasChanges, setHasChanges] = React.useState(false)

  // Warn on browser tab close/refresh with unsaved changes
  React.useEffect(() => {
    if (!hasChanges) return
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault()
    }
    window.addEventListener("beforeunload", handler)
    return () => window.removeEventListener("beforeunload", handler)
  }, [hasChanges])

  // Intercept browser back button with unsaved changes
  const backGuardPushedRef = React.useRef(false)
  const pushBackGuard = React.useCallback(() => {
    if (!backGuardPushedRef.current) {
      window.history.pushState({ unsavedGuard: true }, "")
      backGuardPushedRef.current = true
    }
  }, [])
  React.useEffect(() => {
    if (!hasChanges) {
      backGuardPushedRef.current = false
      return
    }
    pushBackGuard()
    const handler = () => {
      backGuardPushedRef.current = false
      setPendingNavUrl(null) // null = go back
      setUnsavedNavOpen(true)
    }
    window.addEventListener("popstate", handler)
    return () => window.removeEventListener("popstate", handler)
  }, [hasChanges, pushBackGuard])

  const [selected, setSelected] = React.useState<string>("Details")
  const [descFullscreenOpen, setDescFullscreenOpen] = React.useState(false)
  const [descDraft, setDescDraft] = React.useState("")
  const descDraftTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(
    null
  )
  const [projectInfoOpen, setProjectInfoOpen] = React.useState(false)
  const toTitleCase = (str: string) =>
    str.replace(/\b\w/g, (char) => char.toUpperCase())
  const [infoTitle, setInfoTitleRaw] = React.useState("")
  const setInfoTitle = (val: string) => setInfoTitleRaw(toTitleCase(val))
  const [isTitleEditing, setIsTitleEditing] = React.useState(false)
  const [isTitleHovered, setIsTitleHovered] = React.useState(false)
  const [titleError, setTitleError] = React.useState<string | null>(null)
  const titleInputRef = React.useRef<HTMLInputElement>(null)
  const [projectTypeOpen, setProjectTypeOpen] = React.useState(false)
  const [projectTypeQuery, setProjectTypeQuery] = React.useState("")
  const filteredProjectTypes =
    projectTypeQuery === ""
      ? PROJECT_TYPE_OPTIONS
      : PROJECT_TYPE_OPTIONS.filter((opt) =>
          opt.toLowerCase().includes(projectTypeQuery.toLowerCase())
        )
  const [infoSummary, setInfoSummary] = React.useState("")
  const [infoProjectType, setInfoProjectType] = React.useState("Website")
  const [infoTab, setInfoTab] = React.useState("Basic Info")
  const summaryTextareaRef = React.useRef<HTMLTextAreaElement>(null)
  const [focusSummaryOnOpen, setFocusSummaryOnOpen] = React.useState(false)
  React.useEffect(() => {
    if (focusSummaryOnOpen && projectInfoOpen) {
      const timer = setTimeout(() => {
        summaryTextareaRef.current?.focus()
        setFocusSummaryOnOpen(false)
      }, 300)
      return () => clearTimeout(timer)
    }
  }, [focusSummaryOnOpen, projectInfoOpen])
  const [categoryTree, setCategoryTree] = React.useState<CategoryTreeNode[]>([])
  const [categoryOptions, setCategoryOptions] = React.useState<string[]>(
    FALLBACK_CATEGORY_OPTIONS
  )
  const [subCategoryOptions, setSubCategoryOptions] = React.useState<string[]>(
    []
  )
  const [activeCategoryIndex, setActiveCategoryIndex] = React.useState(0)
  const [suggested, setSuggested] = React.useState<SuggestedCategoryOption[]>(
    DEFAULT_SUGGESTED_CATEGORIES
  )
  const [infoCategories, setInfoCategories] = React.useState<CategoryRow[]>([
    { category: "", subCategories: [] },
    { category: "", subCategories: [] },
    { category: "", subCategories: [] },
  ])
  const [infoCatErrors, setInfoCatErrors] = React.useState<(string | null)[]>([
    null,
    null,
    null,
  ])
  const [hiddenImages, setHiddenImages] = React.useState<Set<number>>(new Set())
  const [videoHidden, setVideoHidden] = React.useState(false)
  const galleryInputRef = React.useRef<HTMLInputElement>(null)
  const galleryScrollRef = React.useRef<HTMLDivElement>(null)
  const [canScrollGalleryPrev, setCanScrollGalleryPrev] = React.useState(false)
  const [canScrollGalleryNext, setCanScrollGalleryNext] = React.useState(false)
  const [uploadingSlots, setUploadingSlots] = React.useState<Set<number>>(
    new Set()
  )
  const [completingSlots, setCompletingSlots] = React.useState<Set<number>>(
    new Set()
  )
  const galleryUrlsRef = React.useRef<string[]>([])
  const galleryReservedRef = React.useRef<Set<number>>(new Set())
  const galleryPersistTimerRef = React.useRef<ReturnType<
    typeof setTimeout
  > | null>(null)
  const [featuredUploading, setFeaturedUploading] = React.useState(false)
  const [featuredCompleting, setFeaturedCompleting] = React.useState(false)

  React.useEffect(() => {
    galleryUrlsRef.current = project.mediaUrls ?? []
  }, [project.mediaUrls])
  const [featuredDeleteOpen, setFeaturedDeleteOpen] = React.useState(false)
  const [unsavedNavOpen, setUnsavedNavOpen] = React.useState(false)
  const [pendingNavUrl, setPendingNavUrl] = React.useState<string | null>(null)
  const [isClientView, setIsClientView] = React.useState(false)
  const [publishDialogOpen, setPublishDialogOpen] = React.useState(false)
  const [isPublishing, setIsPublishing] = React.useState(false)
  const [publishAttempted, setPublishAttempted] = React.useState(false)
  const [publishError, setPublishError] = React.useState<string | null>(null)
  const [publishErrorField, setPublishErrorField] = React.useState<
    string | null
  >(null)
  const [videoDialogOpen, setVideoDialogOpen] = React.useState(false)

  const publishImageCount =
    (project.mediaUrls ?? []).filter(
      (u: string) => !!u && u.trim() !== "" && !u.startsWith("blob:")
    ).length + (project.featuredVideo ? 1 : 0)

  const hasPublishBlockingErrors = SHOW_PUBLISH_VALIDATION
    ? [
        !project.featuredImage &&
          !project.mediaUrls?.[0] &&
          !project.featuredVideo,
        publishImageCount < 3,
        !PROJECT_TYPE_OPTIONS.includes(infoProjectType),
        !project.title || project.title === "Enter Project Title",
        (project.categories || []).length < 3,
        (project.summary?.trim().length ?? 0) < SHORT_DESCRIPTION_MIN_LENGTH,
        getRichTextCharacterCount(project.description || "") === 0,
        !(
          Array.isArray(project.deliverables) &&
          project.deliverables.length > 0
        ),
        !(
          project.programmingLanguages?.length > 0 ||
          project.developmentTech?.length > 0 ||
          project.subcategories?.length > 0 ||
          project.tags?.length > 0
        ),
        (project.tags || []).length < 3,
        Math.max(
          project.skills?.length ?? 0,
          project.programmingLanguages?.length ?? 0
        ) < 3,
        (project.industries || []).length < 1,
        !project.faqs || project.faqs.length === 0,
      ].some(Boolean)
    : false

  const missingPublishFields = SHOW_PUBLISH_VALIDATION
    ? ([
        !PROJECT_TYPE_OPTIONS.includes(infoProjectType) && "a project type",
        (!project.title || project.title === "Enter Project Title") &&
          "project title",
        (project.categories || []).length < 3 && "categories",
        (project.summary?.trim().length ?? 0) < SHORT_DESCRIPTION_MIN_LENGTH &&
          "short description",
        getRichTextCharacterCount(project.description || "") === 0 &&
          "project description",
        !(
          project.programmingLanguages?.length > 0 ||
          project.developmentTech?.length > 0 ||
          project.subcategories?.length > 0 ||
          project.tags?.length > 0
        ) && "project details",
        (project.tags || []).length < 3 && "at least 3 tags",
        Math.max(
          project.skills?.length ?? 0,
          project.programmingLanguages?.length ?? 0
        ) < 3 && "at least 3 skills",
        (project.industries || []).length < 1 && "at least 1 industry",
        !(
          Array.isArray(project.deliverables) &&
          project.deliverables.length > 0
        ) && "scope",
        (!project.faqs || project.faqs.length === 0) && "FAQ's",
      ].filter(Boolean) as string[])
    : []

  const projectDetailsHasError =
    SHOW_PUBLISH_VALIDATION &&
    ((project.tags || []).length < 3 ||
      Math.max(
        project.skills?.length ?? 0,
        project.programmingLanguages?.length ?? 0
      ) < 3 ||
      (project.industries || []).length < 1 ||
      !(
        project.programmingLanguages?.length > 0 ||
        project.developmentTech?.length > 0 ||
        project.subcategories?.length > 0 ||
        project.tags?.length > 0
      ))

  const missingPublishImages =
    SHOW_PUBLISH_VALIDATION &&
    (publishImageCount < 3 ||
      (!project.featuredImage &&
        !project.mediaUrls?.[0] &&
        !project.featuredVideo))

  const joinWithAnd = (arr: string[]) =>
    arr.length <= 1
      ? arr[0] ?? ""
      : `${arr.slice(0, -1).join(", ")} and ${arr[arr.length - 1]}`
  const [videoUrlInput, setVideoUrlInput] = React.useState("")
  const { toast } = useToast()

  const updateGalleryScrollState = React.useCallback(() => {
    const el = galleryScrollRef.current
    if (!el) return
    setCanScrollGalleryPrev(el.scrollLeft > 0)
    setCanScrollGalleryNext(el.scrollLeft + el.clientWidth < el.scrollWidth - 1)
  }, [])

  React.useEffect(() => {
    updateGalleryScrollState()
  }, [project.mediaUrls, project.featuredVideo, updateGalleryScrollState])

  const scrollGallery = React.useCallback((direction: "prev" | "next") => {
    const el = galleryScrollRef.current
    if (!el) return
    const scrollAmount = el.clientWidth * 0.8
    el.scrollBy({
      left: direction === "next" ? scrollAmount : -scrollAmount,
      behavior: "smooth",
    })
  }, [])

  const handleGalleryUpload = React.useCallback(
    async (files: FileList | null, replaceIndex?: number) => {
      if (!files || files.length === 0) return
      if (!project.id || !isRealBackendId(project.id)) {
        console.error(
          "Cannot upload images — project has no backend ID yet. Save the project first."
        )
        return
      }
      setHasChanges(true)

      // Reserve the next free slot so concurrent uploads never collide.
      const reserveSlot = () => {
        let i = galleryUrlsRef.current.length
        while (galleryReservedRef.current.has(i) || galleryUrlsRef.current[i])
          i++
        galleryReservedRef.current.add(i)
        return i
      }

      // Place a result at its reserved slot via a functional update, so
      // parallel uploads accumulate instead of overwriting one another.
      const placeUrl = (index: number, url: string) => {
        setProject((prev: any) => {
          const arr = [...(prev.mediaUrls ?? [])]
          while (arr.length <= index) arr.push("")
          arr[index] = url
          galleryUrlsRef.current = arr
          return { ...prev, mediaUrls: arr }
        })
      }

      // Debounce persistence so a burst of concurrent uploads writes once,
      // with the final full list (avoids last-write-wins races).
      const schedulePersist = () => {
        if (galleryPersistTimerRef.current)
          clearTimeout(galleryPersistTimerRef.current)
        galleryPersistTimerRef.current = setTimeout(async () => {
          try {
            await ProjectAPI.UpdateGalleryImages(
              project.id,
              galleryUrlsRef.current.filter(
                (u: string) => u && !u.startsWith("blob:")
              )
            )
          } catch (err) {
            console.error("Failed to save gallery images:", err)
          }
        }, 500)
      }

      await Promise.all(
        Array.from(files).map(async (file) => {
          const targetIndex =
            replaceIndex !== undefined ? replaceIndex : reserveSlot()
          setUploadingSlots((prev) => new Set(prev).add(targetIndex))

          const formData = new FormData()
          formData.append("featuredImage", file)
          formData.append("target", "additional")
          formData.append("projectId", project.id)

          let finalUrl: string | undefined
          try {
            const res = await ProjectAPI.UploadMedia(formData)
            finalUrl = res?.data?.url || res?.data?.featuredImage
          } catch (err: any) {
            if (isModerationRejection(err)) {
              toast({
                title: backendErrorMessage(err),
                variant: "destructive",
              })
            } else {
              finalUrl = URL.createObjectURL(file)
              toast({
                title:
                  err?.response?.status === 503
                    ? "Image moderation service unavailable. Showing local preview."
                    : "Failed to upload image. Showing local preview.",
                variant: "destructive",
              })
            }
          }

          if (finalUrl) {
            placeUrl(targetIndex, finalUrl)
            schedulePersist()
          }

          if (replaceIndex === undefined)
            galleryReservedRef.current.delete(targetIndex)
          setUploadingSlots((prev) => {
            const next = new Set(prev)
            next.delete(targetIndex)
            return next
          })
          setCompletingSlots((prev) => new Set(prev).add(targetIndex))
        })
      )
    },
    [project.id, toast]
  )

  const handleGalleryDelete = React.useCallback(
    async (index: number) => {
      const currentUrls: string[] = project.mediaUrls ?? []
      // First 3 slots: clear in place so visible grid doesn't shift
      // Beyond slot 2: remove and shift remaining images forward
      const newUrls =
        index < 3
          ? currentUrls.map((url: string, i: number) =>
              i === index ? "" : url
            )
          : currentUrls.filter((_: string, i: number) => i !== index)
      setProject((prev: any) => ({ ...prev, mediaUrls: newUrls }))
      setHasChanges(true)
      setHiddenImages((prev) => {
        const next = new Set(prev)
        next.delete(index)
        return next
      })
      // Persist updated gallery to backend
      if (project.id && isRealBackendId(project.id)) {
        try {
          await ProjectAPI.UpdateGalleryImages(
            project.id,
            newUrls.filter((u: string) => u && !u.startsWith("blob:"))
          )
        } catch (err) {
          console.error("Failed to save gallery after delete:", err)
        }
      }
    },
    [project.id, project.mediaUrls]
  )

  const handleGalleryToggleHidden = React.useCallback(
    (index: number) => {
      const next = new Set(hiddenImages)
      if (next.has(index)) next.delete(index)
      else next.add(index)
      setHiddenImages(next)

      if (project.id && isRealBackendId(project.id)) {
        const urls: string[] = project.mediaUrls ?? []
        const additional = urls.filter(
          (u: string) => u && !u.startsWith("blob:")
        )
        const hidden = Array.from(next)
          .map((i) => urls[i])
          .filter((u): u is string => Boolean(u && !u.startsWith("blob:")))
        ProjectAPI.UpdateGalleryImages(project.id, additional, hidden).catch(
          (err: any) => console.error("Failed to save hidden images:", err)
        )
      }
    },
    [hiddenImages, project.id, project.mediaUrls]
  )

  const gallerySensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 150, tolerance: 5 },
    })
  )

  const handleGalleryDragEnd = React.useCallback((event: DragEndEvent) => {
    const { active, over } = event
    if (!active || !over || active.id === over.id) return

    const oldIndex = Number(String(active.id).replace("gallery-", ""))
    const newIndex = Number(String(over.id).replace("gallery-", ""))

    // Remap hidden-image indexes
    setHiddenImages((prev) => {
      const next = new Set<number>()
      for (const hiddenIdx of prev) {
        if (hiddenIdx === oldIndex) {
          next.add(newIndex)
        } else if (oldIndex < newIndex) {
          next.add(
            hiddenIdx > oldIndex && hiddenIdx <= newIndex
              ? hiddenIdx - 1
              : hiddenIdx
          )
        } else {
          next.add(
            hiddenIdx >= newIndex && hiddenIdx < oldIndex
              ? hiddenIdx + 1
              : hiddenIdx
          )
        }
      }
      return next
    })

    // Use functional updater to always read latest mediaUrls
    setProject((prev: any) => {
      const currentUrls: string[] = prev.mediaUrls ?? []
      const reordered = arrayMove(currentUrls, oldIndex, newIndex)

      // Persist in background
      if (prev.id && isRealBackendId(prev.id)) {
        ProjectAPI.UpdateGalleryImages(
          prev.id,
          reordered.filter((u: string) => u && !u.startsWith("blob:"))
        ).catch((err: any) =>
          console.error("Failed to save gallery reorder:", err)
        )
      }

      return { ...prev, mediaUrls: reordered }
    })
    setHasChanges(true)
  }, [])

  const handleFeaturedImageUpload = React.useCallback(
    async (file: File) => {
      setHasChanges(true)
      setFeaturedUploading(true)
      if (!project.id || !isRealBackendId(project.id)) {
        const localUrl = URL.createObjectURL(file)
        setProject((prev: any) => ({ ...prev, featuredImage: localUrl }))
        setFeaturedUploading(false)
        return
      }
      const formData = new FormData()
      formData.append("featuredImage", file)
      formData.append("projectId", project.id)
      try {
        const res = await ProjectAPI.UploadMedia(formData)
        const url = res?.data?.featuredImage || res?.data?.url
        if (url) {
          setProject((prev: any) => ({ ...prev, featuredImage: url }))
        }
      } catch (err: any) {
        console.error("Failed to upload featured image:", err)
        if (isModerationRejection(err)) {
          toast({ title: backendErrorMessage(err), variant: "destructive" })
        } else {
          const localUrl = URL.createObjectURL(file)
          setProject((prev: any) => ({ ...prev, featuredImage: localUrl }))
          toast({
            title:
              err?.response?.status === 503
                ? "Image moderation service unavailable. Showing local preview."
                : "Failed to upload featured image. Showing local preview.",
            variant: "destructive",
          })
        }
      } finally {
        setFeaturedUploading(false)
        setFeaturedCompleting(true)
      }
    },
    [project.id, toast]
  )

  const handlePublish = React.useCallback(async () => {
    if (!project?.id || !isRealBackendId(project.id)) return
    setIsPublishing(true)
    setPublishError(null)
    setPublishErrorField(null)
    try {
      await ProjectAPI.PublishProject(project.id)
      setProject((prev: any) => ({ ...prev, status: "published" }))
      setHasChanges(false)
      setPublishDialogOpen(false)
      const label = project.listingType === "service" ? "service" : "project"
      toast({ title: `Your ${label} is live`, variant: "success" })
    } catch (err: any) {
      console.error("Failed to publish:", err)
      const message =
        backendErrorMessage(err) || "Failed to publish. Please try again."
      const field = err?.response?.data?.field
      setPublishError(message)
      setPublishErrorField(typeof field === "string" ? field : null)
      setPublishDialogOpen(false)
      toast({ title: message, variant: "destructive" })
    } finally {
      setIsPublishing(false)
    }
  }, [project?.id, project?.listingType, toast])

  const handleUnpublish = React.useCallback(async () => {
    if (!project?.id || !isRealBackendId(project.id)) return
    setIsPublishing(true)
    try {
      await ProjectAPI.UnpublishProject(project.id)
      setProject((prev: any) => ({ ...prev, status: "draft" }))
      setHasChanges(false)
      const label = project.listingType === "service" ? "service" : "project"
      toast({ title: `Your ${label} is now a draft`, variant: "success" })
    } catch (err) {
      console.error("Failed to unpublish:", err)
      toast({
        title: "Failed to unpublish. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsPublishing(false)
    }
  }, [project?.id, project?.listingType, toast])

  const isPublished = project?.status === "published"

  const [detailsDialogOpen, setDetailsDialogOpen] = React.useState(false)
  const [teamDialogOpen, setTeamDialogOpen] = React.useState(false)
  const [questionsDialogOpen, setQuestionsDialogOpen] = React.useState(false)
  const [questionsTab, setQuestionsTab] = React.useState("dialog-faqs")
  const [questionsSectionTab, setQuestionsSectionTab] =
    React.useState("section-faqs")
  const [recentQTab, setRecentQTab] = React.useState("all")
  const [openFaqIndex, setOpenFaqIndex] = React.useState<number | null>(null)
  const [teamTab, setTeamTab] = React.useState("Team Lead")
  const inviteWindow = useInviteWindowStore()
  const [memberRoles, setMemberRoles] = React.useState<Record<string, string>>(
    {}
  )
  const [memberStatus, setMemberStatus] = React.useState<
    Record<string, string>
  >({})
  const [teamLeadId, setTeamLeadId] = React.useState<string | null>(null)
  // The persisted lead at load, so we can show "Current" vs a pending "New" lead.
  const [originalLeadId, setOriginalLeadId] = React.useState<string | null>(null)
  const [teamLeadLabel, setTeamLeadLabel] = React.useState<string>("")
  const [removeTarget, setRemoveTarget] = React.useState<any | null>(null)
  const [leadSearch, setLeadSearch] = React.useState("")

  const ownerId = String(
    (project as any)?.userId ??
      (project as any)?.ownerId ??
      (user as any)?.id ??
      ""
  )

  const isOwnerViewing =
    !(user as any)?.id ||
    !ownerId ||
    ownerId === String((user as any).id)

  const { isOnline } = useOnlineUsers()
  const onlineTeam = React.useMemo(
    () =>
      ((project as any)?.team ?? []).filter((m: any) =>
        isOnline(String(m.userId ?? m.id ?? ""))
      ),
    [project, isOnline]
  )

  const isOwnerMember = (m: any) =>
    m?.role === "owner" ||
    (!!ownerId && String(m?.id ?? m?.userId ?? "") === ownerId)

  const projectAssignees = React.useMemo(() => {
    const team = Array.isArray((project as any)?.team) ? (project as any).team : []
    const ids = Array.isArray((project as any)?.teamMemberIds)
      ? (project as any).teamMemberIds.map(String)
      : []
    return team
      .filter((m: any) => {
        const mid = String(m.id || m.userId || "")
        return m.role === "owner" || mid === ownerId || ids.includes(mid)
      })
      .sort((a: any, b: any) => (isOwnerMember(a) ? 0 : 1) - (isOwnerMember(b) ? 0 : 1))
      .map((m: any) => ({
        id: String(m.id || m.userId || ""),
        firstName: m.firstName || m.name || "User",
        username: m.username || m.email?.split("@")[0] || "",
        avatarUrl: m.avatarUrl || null,
        jobTitle: jobTitleOf(m),
      }))
  }, [project, ownerId])

  const currentTeam = React.useMemo(() => {
    const team = Array.isArray((project as any)?.team) ? (project as any).team : []
    const ids = Array.isArray((project as any)?.teamMemberIds)
      ? (project as any).teamMemberIds.map(String)
      : []
    return team
      .filter((m: any) => {
        const mid = String(m.id || m.userId || "")
        return m.role === "owner" || mid === ownerId || ids.includes(mid)
      })
      .sort((a: any, b: any) => (isOwnerMember(a) ? 0 : 1) - (isOwnerMember(b) ? 0 : 1))
  }, [project, ownerId])

  const confirmRemoveMember = async (deactivateInstead: boolean) => {
    const target = removeTarget
    if (!target) return
    if (deactivateInstead) {
      setMemberStatus((s) => ({ ...s, [target.id]: "Inactive" }))
      setRemoveTarget(null)
      toast({
        title: `${target.firstName} has been deactivated`,
        variant: "success",
      })
      return
    }
    const nextIds = (
      Array.isArray((project as any)?.teamMemberIds)
        ? (project as any).teamMemberIds
        : []
    )
      .map(String)
      .filter((id: string) => id !== target.id)
    // Un-assign them from any scope tasks (persists via the scope autosave).
    const currentScope = Array.isArray((project as any)?.scope)
      ? (project as any).scope
      : []
    handleScopeChange(
      currentScope.map((phase: any) => ({
        ...phase,
        rows: Array.isArray(phase.rows)
          ? phase.rows.map((row: any) =>
              String(row.assigneeUserId ?? row.assignedMember?.id ?? "") ===
              String(target.id)
                ? { ...row, assigneeUserId: null, assignedMember: null }
                : row
            )
          : phase.rows,
      }))
    )
    const removedWasLead = teamLeadId === target.id
    const nextLeadId = removedWasLead ? null : teamLeadId
    if (removedWasLead) setTeamLeadId(null)
    const memberPayload = projectAssignees
      .filter((m: any) => m.id !== target.id)
      .map((m: any, i: number) => {
        const isLead = nextLeadId
          ? m.id === nextLeadId
          : ownerId
            ? m.id === ownerId
            : i === 0
        return {
          userId: m.id,
          projectRole:
            ownerId && m.id === ownerId
              ? "Owner"
              : (memberRoles[m.id] ?? "Contributor"),
          status: memberStatus[m.id] ?? "Active",
          isLead,
          leadLabel: isLead ? teamLeadLabel || null : null,
        }
      })
    setProject((prev: any) => ({ ...prev, teamMemberIds: nextIds }))
    try {
      if ((project as any)?.id) {
        await ProjectAPI.UpdateProjectDraft((project as any).id, {
          teamMemberIds: nextIds,
        } as any)
        await ProjectAPI.SaveProjectMembers((project as any).id, memberPayload)
      }
    } catch {
      // non-blocking
    }
    setRemoveTarget(null)
    toast({
      title: `${target.firstName} has been removed`,
      variant: "success",
    })
  }

  const addableMembers = React.useMemo(() => {
    const team = Array.isArray((project as any)?.team)
      ? (project as any).team
      : []
    const ids = new Set(
      (Array.isArray((project as any)?.teamMemberIds)
        ? (project as any).teamMemberIds
        : []
      ).map(String)
    )
    return team
      .map((m: any) => ({
        id: String(m.id || m.userId || ""),
        firstName: m.firstName || m.name || "User",
        username: m.username || m.email?.split("@")[0] || "",
        avatarUrl: m.avatarUrl || null,
      }))
      .filter((m: any) => m.id && !ids.has(m.id))
  }, [project])

  const addMemberToProject = async (userId: string) => {
    const ids = (
      Array.isArray((project as any)?.teamMemberIds)
        ? (project as any).teamMemberIds
        : []
    ).map(String)
    if (ids.includes(String(userId))) return
    const nextIds = [...ids, String(userId)]
    setProject((prev: any) => ({ ...prev, teamMemberIds: nextIds }))
    try {
      if ((project as any)?.id)
        await ProjectAPI.UpdateProjectDraft((project as any).id, {
          teamMemberIds: nextIds,
        } as any)
    } catch {
      // non-blocking
    }
    toast({ title: "Team member added to project", variant: "success" })
  }

  const saveTeamSettings = async () => {
    const members = projectAssignees.map((m: any, i: number) => {
      const isLead = teamLeadId
        ? m.id === teamLeadId
        : ownerId
          ? m.id === ownerId
          : i === 0
      return {
        userId: m.id,
        projectRole:
          ownerId && m.id === ownerId
            ? "Owner"
            : (memberRoles[m.id] ?? "Contributor"),
        status: memberStatus[m.id] ?? "Active",
        isLead,
        leadLabel: isLead ? teamLeadLabel || null : null,
      }
    })
    try {
      if ((project as any)?.id)
        await ProjectAPI.SaveProjectMembers((project as any).id, members)
      toast({ title: "Team settings saved", variant: "success" })
    } catch {
      toast({
        title: "Failed to save team settings",
        variant: "destructive",
      })
    }
    setTeamDialogOpen(false)
  }

  const hydratedMembersRef = React.useRef<string | null>(null)
  React.useEffect(() => {
    const pid = (project as any)?.id
    const pm = (project as any)?.projectMembers
    if (!pid || hydratedMembersRef.current === pid) return
    if (!Array.isArray(pm) || pm.length === 0) return
    hydratedMembersRef.current = pid
    const roles: Record<string, string> = {}
    const statuses: Record<string, string> = {}
    let leadId: string | null = null
    let leadLabel = ""
    for (const m of pm) {
      const uid = String(m.userId)
      if (m.projectRole && m.projectRole !== "Owner") roles[uid] = m.projectRole
      if (m.status) statuses[uid] = m.status
      if (m.isLead) {
        leadId = uid
        leadLabel = m.leadLabel || ""
      }
    }
    setMemberRoles(roles)
    setMemberStatus(statuses)
    setOriginalLeadId(leadId)
    if (leadId) setTeamLeadId(leadId)
    if (leadLabel) setTeamLeadLabel(leadLabel)
  }, [project])
  const [detailsLangs, setDetailsLangs] = React.useState<string[]>([])
  const [detailsTech, setDetailsTech] = React.useState<string[]>([])
  const [detailsIndustry, setDetailsIndustry] = React.useState<string[]>([])
  const [detailsTags, setDetailsTags] = React.useState<string[]>([])
  const [detailsSkills, setDetailsSkills] = React.useState<string[]>([])
  const [detailsTools, setDetailsTools] = React.useState<string[]>([])

  // Autocomplete options for details fields
  const [langOptions, setLangOptions] = React.useState<string[]>([
    "JavaScript",
    "TypeScript",
    "Python",
    "Java",
    "C#",
    "Go",
    "Ruby",
    "PHP",
    "Swift",
    "Kotlin",
  ])
  const [techOptions, setTechOptions] = React.useState<string[]>([
    "React",
    "Next.js",
    "Node.js",
    "Vue.js",
    "Angular",
    "Django",
    "Express",
    "PostgreSQL",
    "MongoDB",
    "Docker",
  ])
  const [industryOptions, setIndustryOptions] = React.useState<string[]>([
    "Technology",
    "Healthcare",
    "Finance",
    "Education",
    "Retail",
    "Manufacturing",
    "Media",
    "Real Estate",
    "Energy",
    "Transportation",
  ])
  const [tagOptions, setTagOptions] = React.useState<string[]>([
    "Web App",
    "Mobile App",
    "AI",
    "SaaS",
    "API",
    "Dashboard",
    "Marketplace",
    "CRM",
    "E-commerce",
    "Automation",
  ])
  const [skillOptions, setSkillOptions] = React.useState<string[]>([
    "Node.js",
    "JavaScript",
    "Wireframing",
    "TypeScript",
    "React",
    "Figma",
    "Python",
    "UI Design",
    "Data Analysis",
    "API Integration",
  ])
  const [toolOptions, setToolOptions] = React.useState<string[]>([
    "Figma",
    "VS Code",
    "GitHub",
    "Jira",
    "Slack",
    "Docker",
    "AWS",
    "Postman",
    "Notion",
    "Linear",
  ])
  const typeDebounceTimerRef = React.useRef<ReturnType<
    typeof setTimeout
  > | null>(null)
  const typeRequestRef = React.useRef(0)

  const fetchTypeAutocomplete = React.useCallback(
    (type: string, query: string, onSuccess: (options: string[]) => void) => {
      const trimmedQuery = query.trim()
      if (!trimmedQuery) return
      if (typeDebounceTimerRef.current) {
        clearTimeout(typeDebounceTimerRef.current)
      }
      typeDebounceTimerRef.current = setTimeout(async () => {
        const currentRequestId = ++typeRequestRef.current
        try {
          const response = await AutocompleteAPI.getByType(type, trimmedQuery)
          if (currentRequestId !== typeRequestRef.current) return
          const values: AutocompleteTypeSuggestion[] = Array.isArray(
            response?.data
          )
            ? response.data
            : []
          const normalizedOptions = Array.from(
            new Set(
              values
                .map((item) => {
                  if ("value" in item && typeof item.value === "string")
                    return item.value
                  if ("label" in item && typeof item.label === "string")
                    return item.label
                  return ""
                })
                .filter((v) => v.length)
            )
          )
          if (normalizedOptions.length > 0) {
            onSuccess(normalizedOptions)
          }
        } catch {
          // Keep fallback options
        }
      }, 250)
    },
    []
  )

  const categoryRequestRef = React.useRef(0)
  const categoryDebounceTimerRef = React.useRef<ReturnType<
    typeof setTimeout
  > | null>(null)

  // Load category tree on mount
  React.useEffect(() => {
    const loadCategoryTree = async () => {
      try {
        const response = await CategoryAPI.getTree()
        const nodes: CategoryTreeNode[] = Array.isArray(response?.data)
          ? response.data
          : []
        const selectableCategories = collectSelectableCategories(nodes)
        const nextCategoryOptions = getUniqueOptions(
          selectableCategories.map((node) => node.name)
        )
        const nextSuggested = nodes
          .filter(isActiveCategoryNode)
          .map((node) => {
            const sub = (node.children ?? []).filter(isActiveCategoryNode)[0]
            return sub?.name && node.name
              ? { category: node.name, subCategory: sub.name }
              : null
          })
          .filter((value): value is SuggestedCategoryOption => value !== null)

        setCategoryTree(nodes)
        if (getIsNotEmpty(nextCategoryOptions)) {
          setCategoryOptions(nextCategoryOptions)
        }
        if (getIsNotEmpty(nextSuggested)) {
          setSuggested(nextSuggested)
        }
      } catch {
        // Keep fallback options when category-service is unavailable.
      }
    }
    void loadCategoryTree()
    return () => {
      if (categoryDebounceTimerRef.current) {
        clearTimeout(categoryDebounceTimerRef.current)
      }
    }
  }, [])

  const categoryNodesByName = React.useMemo(
    () => indexCategoryTreeByName(categoryTree),
    [categoryTree]
  )

  const getSubCategoryOptionsForCategory = React.useCallback(
    (categoryName?: string, query = "") => {
      if (!categoryName) return []
      const normalizedQuery = query.trim().toLowerCase()
      const activeNode = categoryNodesByName.get(categoryName)
      const sourceNodes = activeNode
        ? collectCategoryDescendants(activeNode)
        : []
      return getUniqueOptions(
        sourceNodes
          .map((node) => node.name)
          .filter((name) =>
            normalizedQuery
              ? name.toLowerCase().includes(normalizedQuery)
              : true
          )
      )
    },
    [categoryNodesByName, categoryTree]
  )

  // Keep subCategoryOptions in sync when active category index changes
  React.useEffect(() => {
    const activeCategoryName = infoCategories[activeCategoryIndex]?.category
    setSubCategoryOptions(getSubCategoryOptionsForCategory(activeCategoryName))
  }, [activeCategoryIndex, infoCategories, getSubCategoryOptionsForCategory])

  const fetchCategoriesAutocomplete = React.useCallback(
    (index: 0 | 1 | 2, query: string) => {
      const trimmedQuery = query.trim()
      setActiveCategoryIndex(index)
      const activeCategoryName = infoCategories[index]?.category
      const fallbackOptions =
        getSubCategoryOptionsForCategory(activeCategoryName)

      if (!activeCategoryName) {
        setSubCategoryOptions([])
        return
      }
      if (!trimmedQuery) {
        setSubCategoryOptions(fallbackOptions)
        return
      }
      if (categoryDebounceTimerRef.current) {
        clearTimeout(categoryDebounceTimerRef.current)
      }
      categoryDebounceTimerRef.current = setTimeout(async () => {
        const currentRequestId = ++categoryRequestRef.current
        try {
          const response = await AutocompleteAPI.getCategories(trimmedQuery)
          if (currentRequestId !== categoryRequestRef.current) return
          const values: AutocompleteCategorySuggestion[] = Array.isArray(
            response?.data
          )
            ? response.data
            : []
          const scopedSubCategoryOptions =
            getSubCategoryOptionsForCategory(activeCategoryName)
          const allowedSubCategories = new Set(
            scopedSubCategoryOptions.map((value) => value.toLowerCase())
          )
          const hasScopedSubCategories = allowedSubCategories.size > 0
          const matchingSubCategories = getUniqueOptions(
            values
              .filter((item) => item.type === "subcategory")
              .map((item) => item.value.trim())
              .filter((value) =>
                activeCategoryName && hasScopedSubCategories
                  ? allowedSubCategories.has(value.toLowerCase())
                  : true
              )
          )
          setSubCategoryOptions(
            getIsNotEmpty(matchingSubCategories)
              ? matchingSubCategories
              : getSubCategoryOptionsForCategory(
                  activeCategoryName,
                  trimmedQuery
                )
          )
        } catch {
          setSubCategoryOptions(
            getSubCategoryOptionsForCategory(activeCategoryName, trimmedQuery)
          )
        }
      }, 250)
    },
    [infoCategories, getSubCategoryOptionsForCategory]
  )

  const getAvailableCategoriesForIndex = React.useCallback(
    (index: number) => {
      const selected = infoCategories
        .map((row, i) => (i === index ? null : row.category.trim()))
        .filter((c): c is string => !!c && c.length > 0)
      return categoryOptions.filter(
        (cat) =>
          cat === infoCategories[index]?.category || !selected.includes(cat)
      )
    },
    [categoryOptions, infoCategories]
  )

  const handleInfoCategoryChange = React.useCallback(
    (index: number, categoryName: string) => {
      setInfoCategories((prev) => {
        const next = [...prev]
        const availableSubs = getSubCategoryOptionsForCategory(categoryName)
        const keptSubs = next[index].subCategories.filter((s) =>
          availableSubs.includes(s)
        )
        next[index] = { category: categoryName, subCategories: keptSubs }
        return next
      })
      setActiveCategoryIndex(index)
      setSubCategoryOptions(getSubCategoryOptionsForCategory(categoryName))
      setInfoCatErrors((prev) => {
        const next = [...prev]
        next[index] = null
        return next
      })
    },
    [getSubCategoryOptionsForCategory]
  )

  const handleInfoSubCategoryChange = React.useCallback(
    (index: number, values: string[]) => {
      if (values.length > MAX_SUBCATEGORIES_PER_CATEGORY) {
        setInfoCatErrors((prev) => {
          const next = [...prev]
          next[index] = "You can add a maximum of five (5) sub categories"
          return next
        })
        return
      }
      setInfoCatErrors((prev) => {
        const next = [...prev]
        next[index] = null
        return next
      })
      setInfoCategories((prev) => {
        const next = [...prev]
        next[index] = { ...next[index], subCategories: values }
        return next
      })
    },
    []
  )

  const handleSuggestedCategoryClick = React.useCallback(
    (category: string, subCategory: string) => {
      const indexToUpdate = activeCategoryIndex
      setInfoCategories((prev) => {
        const next = [...prev]
        next[indexToUpdate] = { category, subCategories: [subCategory] }
        return next
      })
    },
    [activeCategoryIndex]
  )

  const selectedSuggestedPairs = React.useMemo(
    () =>
      new Set(
        infoCategories.flatMap((item) =>
          item.category && item.subCategories.length
            ? item.subCategories.map((sub) => `${item.category}::${sub}`)
            : []
        )
      ),
    [infoCategories]
  )

  const selectedCategoryNames = React.useMemo(
    () =>
      new Set(
        infoCategories
          .map((item) => item.category.trim())
          .filter((c) => c.length > 0)
      ),
    [infoCategories]
  )

  const derivedSuggestions = React.useMemo(() => {
    const enteredNames = infoCategories
      .map((c) => c.category?.trim())
      .filter((name): name is string => Boolean(name))
      .join(" ")
    return suggestionsFromText(
      `${infoProjectType} ${enteredNames}`.trim(),
      categoryTree
    )
  }, [infoProjectType, infoCategories, categoryTree])

  const suggestedForDisplay = React.useMemo(() => {
    const seenCategories = new Set(selectedCategoryNames)
    const result: SuggestedCategoryOption[] = []
    for (const item of [...derivedSuggestions, ...suggested]) {
      if (item.category === item.subCategory) continue
      if (seenCategories.has(item.category)) continue
      if (selectedSuggestedPairs.has(`${item.category}::${item.subCategory}`))
        continue
      seenCategories.add(item.category)
      result.push(item)
      if (result.length >= 3) break
    }
    return result
  }, [
    derivedSuggestions,
    suggested,
    selectedCategoryNames,
    selectedSuggestedPairs,
  ])

  // Persist a partial update to the backend so edits are saved to the DB.
  // If no backend draft exists yet, create one first, get the real UUID,
  // update local state + URL so future saves and reloads work.
  const isRealBackendId = (id: string) =>
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)

  const saveProjectFields = React.useCallback(
    async (fields: Record<string, any>) => {
      if (!project?.id) return
      setHasChanges(true)

      // If the project has a real backend UUID, just update it
      if (isRealBackendId(project.id)) {
        try {
          await ProjectAPI.UpdateProjectDraft(project.id, fields)
        } catch (err: any) {
          console.error("Failed to save project fields:", err)
        }
        return
      }

      // No backend draft yet — create one with all current data + the new fields
      try {
        const draftRes = await ProjectAPI.CreateProjectDraft({
          title:
            project.title === "Enter Project Title" ? "" : project.title || "",
          shortDescription: project.summary || "",
          fullDescription: project.description || "",
          categories: project.categories || [],
          subCategories: project.subcategories || [],
          industries: project.industries || [],
          tags: project.tags || [],
          skills: project.programmingLanguages || project.skills || [],
          listingType: project.listingType || "project",
          ...fields,
        })
        if (draftRes?.data?.id) {
          const newId = draftRes.data.id
          setProject((prev: any) => ({ ...prev, id: newId }))
          // Update the URL so reloads fetch the real draft
          router.replace(`/my-listings/${newId}`, { scroll: false })
        }
      } catch (createErr) {
        console.error("Failed to create project draft:", createErr)
      }
    },
    [
      project?.id,
      project?.title,
      project?.summary,
      project?.description,
      project?.categories,
      project?.subcategories,
      project?.industries,
      project?.tags,
      project?.programmingLanguages,
      project?.skills,
      project?.listingType,
      router,
    ]
  )

  const faqSaveTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(
    null
  )

  const persistFaqs = React.useCallback(
    (faqs: Array<{ question: string; answer: string }>) => {
      if (faqSaveTimerRef.current) clearTimeout(faqSaveTimerRef.current)
      faqSaveTimerRef.current = setTimeout(() => {
        saveProjectFields({ faqs })
      }, 400)
    },
    [saveProjectFields]
  )

  const handleAddFaq = () => {
    if ((project.faqs?.length ?? 0) >= 10) return
    const next = [...(project.faqs ?? []), { question: "", answer: "" }]
    setProject((prev: any) => ({ ...prev, faqs: next }))
    setOpenFaqIndex(next.length - 1)
    saveProjectFields({ faqs: next })
  }

  const handleFaqChange = (
    idx: number,
    field: "question" | "answer",
    value: string
  ) => {
    const next = (project.faqs ?? []).map((f: any, i: number) =>
      i === idx ? { ...f, [field]: value } : f
    )
    setProject((prev: any) => ({ ...prev, faqs: next }))
    persistFaqs(next)
  }

  const handleDeleteFaq = (idx: number) => {
    const next = (project.faqs ?? []).filter((_: any, i: number) => i !== idx)
    setProject((prev: any) => ({ ...prev, faqs: next }))
    setOpenFaqIndex(null)
    saveProjectFields({ faqs: next })
  }

  const [faqSuggestions, setFaqSuggestions] = React.useState<
    Array<{ question: string; answer: string; added?: boolean }>
  >([])
  const [aiFaqDialogOpen, setAiFaqDialogOpen] = React.useState(false)
  const [faqGenLoading, setFaqGenLoading] = React.useState(false)
  const [faqGenError, setFaqGenError] = React.useState(false)

  const faqRemainingSlots = Math.max(0, 10 - (project.faqs?.length ?? 0))
  const faqAddedCount = faqSuggestions.filter((s) => s.added).length

  const dedupeFaqSuggestions = (
    list: Array<{ question: string; answer: string }>
  ) => {
    const existing = new Set(
      (project.faqs ?? []).map((f: any) =>
        (f.question || "").trim().toLowerCase()
      )
    )
    return list
      .filter(
        (s) => s?.question && !existing.has(s.question.trim().toLowerCase())
      )
      .map((s) => ({ question: s.question, answer: s.answer, added: false }))
  }

  const runFaqGeneration = async () => {
    setFaqGenError(false)
    // No backend draft yet — use the local heuristic directly.
    if (!project?.id || !isRealBackendId(project.id)) {
      setFaqSuggestions(dedupeFaqSuggestions(generateFaqSuggestions(project)))
      return
    }
    setFaqGenLoading(true)
    try {
      const res = await ProjectAPI.SuggestFaqs(project.id)
      const data = (res?.data ?? []) as Array<{
        question: string
        answer: string
      }>
      setFaqSuggestions(dedupeFaqSuggestions(data))
    } catch {
      setFaqGenError(true)
    } finally {
      setFaqGenLoading(false)
    }
  }

  const openAiFaqDialog = () => {
    setAiFaqDialogOpen(true)
    runFaqGeneration()
  }

  const insertFaqSuggestion = (idx: number) => {
    const s = faqSuggestions[idx]
    if (!s || s.added || (project.faqs?.length ?? 0) >= 10) return
    const next = [
      ...(project.faqs ?? []),
      { question: s.question, answer: s.answer, is_ai_generated: true },
    ]
    setProject((prev: any) => ({ ...prev, faqs: next }))
    saveProjectFields({ faqs: next })
    setFaqSuggestions((prev) =>
      prev.map((x, i) => (i === idx ? { ...x, added: true } : x))
    )
  }

  const removeFaqSuggestion = (idx: number) => {
    const s = faqSuggestions[idx]
    if (!s) return
    const q = s.question.trim().toLowerCase()
    const next = (project.faqs ?? []).filter(
      (f: any) => (f.question || "").trim().toLowerCase() !== q
    )
    setProject((prev: any) => ({ ...prev, faqs: next }))
    saveProjectFields({ faqs: next })
    setFaqSuggestions((prev) =>
      prev.map((x, i) => (i === idx ? { ...x, added: false } : x))
    )
  }

  const insertAllFaqSuggestions = () => {
    const slots = Math.max(0, 10 - (project.faqs?.length ?? 0))
    const toAdd = faqSuggestions.filter((s) => !s.added).slice(0, slots)
    if (toAdd.length === 0) return
    const next = [
      ...(project.faqs ?? []),
      ...toAdd.map((s) => ({
        question: s.question,
        answer: s.answer,
        is_ai_generated: true,
      })),
    ]
    setProject((prev: any) => ({ ...prev, faqs: next }))
    saveProjectFields({ faqs: next })
    const addedSet = new Set(toAdd.map((s) => s.question))
    setFaqSuggestions((prev) =>
      prev.map((x) => (addedSet.has(x.question) ? { ...x, added: true } : x))
    )
  }

  // Persist team member assignments in localStorage (until backend supports assignedMemberId)
  const assignmentsKey = `scope-assignments-${project?.id || "draft"}`
  const saveAssignments = React.useCallback(
    (phases: any[]) => {
      try {
        const map: Record<string, string> = {}
        for (let pi = 0; pi < phases.length; pi++) {
          for (const row of phases[pi].rows ?? []) {
            if (row.assignedMember?.id) {
              const taskKey = `${pi}:${row.task || row.taskName || ""}`
              map[taskKey] = row.assignedMember.id
            }
          }
        }
        localStorage.setItem(assignmentsKey, JSON.stringify(map))
      } catch {
        /* ignore */
      }
    },
    [assignmentsKey]
  )

  // Debounced autosave for scope changes
  const scopeSaveTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(
    null
  )
  const handleScopeChange = React.useCallback(
    (phases: any[]) => {
      setProject((prev: any) => ({ ...prev, scope: phases }))
      saveAssignments(phases)
      setHasChanges(true)
      if (!project?.id || !isRealBackendId(project.id)) return

      // Debounce: wait 1.5s after last change before saving
      if (scopeSaveTimerRef.current) clearTimeout(scopeSaveTimerRef.current)
      scopeSaveTimerRef.current = setTimeout(async () => {
        try {
          const scopePayload = (phases || []).map(
            (phase: any, idx: number) => ({
              name: phase.phaseName || `Phase ${idx + 1}`,
              stageName: phase.phaseName || `Phase ${idx + 1}`,
              startDay: 1,
              endDay: 30,
              order: idx,
              phaseType: phase.phaseType ?? undefined,
              recurrenceSchedule: phase.recurrenceSchedule ?? undefined,
              recurrenceCount: phase.recurrenceCount ?? undefined,
              projectId: project.id,
              tasks: (phase.rows || []).map((row: any) => ({
                taskName: row.task || "",
                role: row.role || "",
                location: Array.isArray(row.location)
                  ? row.location
                  : [row.location || ""].filter(Boolean),
                experience: Array.isArray(row.experience)
                  ? row.experience
                  : [row.experience || ""].filter(Boolean),
                experienceLevel:
                  row.experienceLevel || row.experience || "Medior",
                duration:
                  typeof row.duration === "object" && row.duration !== null
                    ? `${row.duration.value} ${row.duration.type}`
                    : row.duration || "1 days",
                estimatedHours: row.estimatedHours || undefined,
                assigneeUserId: row.assignedMember?.id || null,
                phaseId: "",
              })),
            })
          )
          const scopeRes = await ProjectAPI.ReplaceProjectScope(
            project.id,
            scopePayload
          )
          const nextBudget = Number((scopeRes as any)?.data?.budgetUsdCents)
          if (Number.isFinite(nextBudget) && nextBudget > 0) {
            setProject((prev: any) => ({ ...prev, budgetUsdCents: nextBudget }))
          }

          // Re-fetch to get updated deliverables from backend
          try {
            const res = await ProjectAPI.GetProjectDraft(project.id)
            const d = res?.data
            if (d?.deliverables) {
              setProject((prev: any) => ({
                ...prev,
                deliverables: d.deliverables,
              }))
            }
          } catch {
            // Non-critical — deliverables will update on next page load
          }
        } catch (err) {
          console.error("Failed to autosave scope:", err)
        }
      }, 1500)
    },
    [project?.id, saveProjectFields]
  )

  // Cleanup scope save timer on unmount
  React.useEffect(() => {
    return () => {
      if (scopeSaveTimerRef.current) clearTimeout(scopeSaveTimerRef.current)
    }
  }, [])

  // ── Budget & Duration computed from scope ──────────────────────────────────
  const [budgetPeriod, setBudgetPeriod] = React.useState("week")

  const isServiceListing =
    project?.listingType === "service" ||
    (Array.isArray(project?.scope) &&
      project.scope.some(
        (p: any) =>
          p?.phaseType === "setup" ||
          p?.phaseType === "recurring" ||
          p?.phaseType === "ongoing"
      ))

  const { budgetTotalCents, durationLabel, durationValue, durationUnit, durationDays } =
    React.useMemo(() => {
      const phases = project.scope ?? []

      // Duration: tasks within a phase run in parallel (take max), phases are sequential (sum).
      // Matches the scope builder's getPhaseDurationInDays logic.
      let totalDays = 0
      for (const phase of phases) {
        const taskDurations = ((phase.rows ?? phase.tasks ?? []) as any[])
          .map((row: any) => {
            const dur = row.duration
            // Object form { value, type }
            if (dur && typeof dur === "object") {
              const val = Number(dur.value) || 0
              if (val > 0) {
                if (dur.type === "weeks") return val * 7
                if (dur.type === "months") return val * 30
                if (dur.type === "hours") return Math.max(1, Math.ceil(val / 24))
                return val // days
              }
            }
            // String form, e.g. "2 weeks" (relational scope stores it this way)
            if (typeof dur === "string" && dur.trim()) {
              const [rv, ru] = dur.trim().split(/\s+/)
              const v = Number(rv) || 0
              const u = (ru || "days").toLowerCase()
              if (v > 0) {
                if (u.startsWith("week")) return v * 7
                if (u.startsWith("month")) return v * 30
                if (u.startsWith("hour")) return Math.max(1, Math.ceil(v / 24))
                return v
              }
            }
            // Fall back to estimatedHours at 40 hrs/week.
            const hrs = Number(row.estimatedHours) || 0
            return hrs > 0 ? Math.max(1, Math.round((hrs * 7) / 40)) : 0
          })
          .filter((d: number) => d > 0)
        if (taskDurations.length > 0) {
          totalDays += Math.max(...taskDurations)
        }
      }

      // Display rules from docs:
      // < 7 days → show days | < 4 weeks (28 days) → show weeks | otherwise → show months
      let durationLabel = "—"
      let durationValue = 0
      let durationUnit = ""
      if (totalDays > 0) {
        if (totalDays < 7) {
          durationValue = totalDays
          durationUnit = "day"
          durationLabel = `${totalDays} Day${totalDays !== 1 ? "s" : ""}`
        } else if (totalDays < 28) {
          const weeks = Math.max(1, Math.ceil(totalDays / 7))
          durationValue = weeks
          durationUnit = "week"
          durationLabel = `${weeks} Week${weeks !== 1 ? "s" : ""}`
        } else {
          const months = Math.max(1, Math.ceil(totalDays / 30))
          durationValue = months
          durationUnit = "month"
          durationLabel = `${months} Month${months !== 1 ? "s" : ""}`
        }
      }

      // Budget (docs §14.7 startingPriceTotal): compute from the scope when
      // it's populated — Σ (hours × HOURLY_RATE_BY_LEVEL) — mirroring the
      // backend stand-in rate card. Fall back to a stored budget otherwise.
      const storedCents =
        Number(project.budgetAmountUsdCents) ||
        Math.round((Number(project.budget) || 0) * 100)
      const pricingCents = Number(project.budgetUsdCents) || 0
      const computedCents = estimateScopeBudgetCents(phases)
      // QA-178/PMCM-397: pricingCents only updates ~1.5s after a change,
      // via handleScopeChange's debounced ReplaceProjectScope round-trip —
      // so preferring it over computedCents (the old order) masked every
      // edit made before that round-trip landed, or made again inside that
      // window. This is what made phase deletion look broken while task
      // deletion looked fine: both mutate scope through the identical
      // onPhasesChange -> handleScopeChange path and land in this same
      // memo, but by the time a *later* edit (e.g. a phase delete) ran, an
      // *earlier* edit's round-trip had already primed a stale positive
      // pricingCents that outranked anything computed live afterward —
      // including the AC's "reset to zero when every phase is deleted"
      // case. Once scope has actually been loaded (project.scope is a real
      // array, even an empty one), the live computation is authoritative;
      // storedCents/pricingCents only apply before scope has loaded at all.
      const hasScope = Array.isArray(project.scope)
      const budgetTotalCents = hasScope
        ? computedCents
        : pricingCents > 0
          ? pricingCents
          : storedCents

      return { budgetTotalCents, durationLabel, durationValue, durationUnit, durationDays: totalDays }
    }, [
      project.scope,
      project.budgetUsdCents,
      project.budgetAmountUsdCents,
      project.budget,
    ])

  // Format budget: Cost_Per_Period = Total_Cost / Number_of_Periods
  const formatBudget = React.useCallback(
    (cents: number, period: string) => {
      if (cents <= 0) return "$0"
      const total = cents / 100
      // Number of periods in the project duration
      const periodDays: Record<string, number> = {
        week: 7,
        "2-week": 14,
        month: 30,
        quarter: 90,
        year: 365,
      }
      const daysPerPeriod = periodDays[period] ?? 7
      const numPeriods = Math.max(1, Math.ceil(durationDays / daysPerPeriod))
      const perPeriod = Math.round(total / numPeriods)
      return `$${perPeriod.toLocaleString()}`
    },
    [durationDays]
  )

  const [tabsRef, isSticky] = useMakeFixedBehaveSticky<HTMLDivElement>()
  const [sectionTab, setSectionTab] = React.useState("Description")
  const isScrollingToSection = React.useRef(false)

  const scrollToSection = React.useCallback((sectionId: string) => {
    const el = document.getElementById(`section-${sectionId}`)
    if (!el) return
    isScrollingToSection.current = true
    setSectionTab(sectionId)
    const offset = 80 // sticky header height
    const top = el.getBoundingClientRect().top + window.scrollY - offset
    window.scrollTo({ top, behavior: "smooth" })
    setTimeout(() => {
      isScrollingToSection.current = false
    }, 800)
  }, [])

  // Track active section on scroll via IntersectionObserver
  React.useEffect(() => {
    const sectionIds = [
      "Description",
      "Deliverables",
      "Project Details",
      "How it Works",
      "Questions",
    ]
    const elements = sectionIds
      .map((id) => document.getElementById(`section-${id}`))
      .filter(Boolean) as HTMLElement[]
    if (!elements.length) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (isScrollingToSection.current) return
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const id = entry.target.id.replace("section-", "")
            setSectionTab(id)
            break
          }
        }
      },
      { rootMargin: "-100px 0px -60% 0px", threshold: 0 }
    )
    elements.forEach((el) => observer.observe(el))
    return () => observer.disconnect()
  }, [loading])

  const [isFavorited, setIsFavorited] = React.useState(false)


  React.useEffect(() => {
    if (!project?.id) return
    findFavoriteByItemId(String(project.id)).then((fav) => {
      setIsFavorited(!!fav)
    })
  }, [project?.id])

  const handleFavoriteToggle = async (pressed: boolean) => {
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
      const rawSlug = params.slug as string
      try {
        // The URL param is typically a UUID (draft ID), not a slug.
        // e.g. /my-listings/abc123-def456-...
        const isUuid =
          /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
            rawSlug
          )

        // Helper to hydrate project state from publish draft data
        const hydrateFromDraft = (d: any) => {
          let featuredImage: string | null = null
          let featuredVideo: string | null = null
          const galleryUrls: string[] = []
          const hiddenUrls: string[] = []
          if (d.media) {
            const mediaObj = Array.isArray(d.media) ? d.media[0] : d.media
            if (mediaObj?.featuredImage) featuredImage = mediaObj.featuredImage
            if (mediaObj?.featuredVideo) featuredVideo = mediaObj.featuredVideo
            if (Array.isArray(mediaObj?.additionalImages)) {
              galleryUrls.push(...mediaObj.additionalImages)
            }
            if (Array.isArray(mediaObj?.hiddenImages)) {
              hiddenUrls.push(...mediaObj.hiddenImages)
            }
          }
          const finalGallery =
            galleryUrls.length > 0 ? galleryUrls : (d.mediaUrls ?? [])
          const hiddenIndices = new Set<number>()
          for (const u of hiddenUrls) {
            const idx = finalGallery.indexOf(u)
            if (idx >= 0) hiddenIndices.add(idx)
          }
          setHiddenImages(hiddenIndices)
          setProject({
            ...d,
            role: d.category || d.categories?.[0] || "Software Development",
            summary: d.shortDescription || d.fullDescription || "",
            description: d.fullDescription || "",
            featuredImage: featuredImage || d.featuredImage || null,
            featuredVideo:
              featuredVideo || d.featuredVideo || d.videoUrl || null,
            mediaUrls: finalGallery,
            programmingLanguages:
              Array.isArray(d.skills) && d.skills.length > 0
                ? d.skills
                : (d.programmingLanguages ?? []),
            developmentTech:
              Array.isArray(d.industries) && d.industries.length > 0
                ? d.industries
                : (d.developmentTech ?? []),
            categories: d.categories ?? [],
            subcategories: d.subCategories ?? d.subcategories ?? [],
            tags: d.tags ?? [],
            faqs: d.faqs ?? [],
            recentQuestions: d.recentQuestions ?? [],
            team: d.team ?? [],
            assignedTeam: Array.isArray(d.team) ? d.team : [],
            deliverables: d.deliverables ?? [],
            scope: (() => {
              // Build team member lookup for rehydrating assignedMember
              const teamList = d.team ?? []
              const allTeam = teamList.length > 0 ? teamList : SEED_TEAM_MEMBERS
              const teamById = new Map<string, any>()
              for (const m of allTeam) {
                const id = m.id || m.userId
                if (id) teamById.set(id, m)
              }
              // Restore assignments from localStorage (until backend supports assignedMemberId)
              let savedAssignments: Record<string, string> = {}
              try {
                const raw = localStorage.getItem(
                  `scope-assignments-${d.id || "draft"}`
                )
                if (raw) savedAssignments = JSON.parse(raw)
              } catch {
                /* ignore */
              }
              return (d.scope ?? []).map((phase: any, phaseIdx: number) => {
                const rawTasks = phase.rows || phase.task || []
                return {
                  phaseName:
                    phase.phaseName || phase.name || phase.stageName || "",
                  phaseType: phase.phaseType ?? undefined,
                  recurrenceSchedule: phase.recurrenceSchedule ?? undefined,
                  recurrenceCount: phase.recurrenceCount ?? undefined,
                  ...(rawTasks.length > 0
                    ? {
                        rows: rawTasks.map((t: any) => {
                          const taskName = t.task || t.taskName || ""
                          const taskKey = `${phaseIdx}:${taskName}`
                          const memberId =
                            t.assigneeUserId ||
                            t.assignedMemberId ||
                            t.assignedMember?.id ||
                            savedAssignments[taskKey] ||
                            null
                          const teamMate = memberId
                            ? teamById.get(memberId)
                            : null
                          const assignedMember = teamMate
                            ? {
                                id: teamMate.id || teamMate.userId || memberId,
                                firstName:
                                  teamMate.firstName || teamMate.name || "User",
                                username:
                                  teamMate.username ||
                                  teamMate.email?.split("@")[0] ||
                                  "",
                                avatarUrl: teamMate.avatarUrl || null,
                                role: jobTitleOf(teamMate),
                                jobTitles: jobTitlesOf(teamMate),
                                hourlyRate:
                                  teamMate.hourlyRate ??
                                  teamMate.rateMax ??
                                  null,
                                workSchedule:
                                  teamMate.workSchedule ??
                                  teamMate.availability ??
                                  null,
                                customHoursPerWeek:
                                  teamMate.customHoursPerWeek ?? null,
                                location:
                                  teamMate.location ?? teamMate.country ?? null,
                                experience:
                                  teamMate.experience ??
                                  teamMate.experienceLevel ??
                                  null,
                              }
                            : null
                          return {
                            id: t.id || crypto.randomUUID(),
                            task: t.task || t.taskName || "",
                            role: t.role || "",
                            location: Array.isArray(t.location)
                              ? t.location[0] || ""
                              : t.location || "",
                            experience: Array.isArray(t.experience)
                              ? t.experience[0] || "Medior"
                              : t.experience || "Medior",
                            duration:
                              typeof t.duration === "object" &&
                              t.duration !== null
                                ? t.duration
                                : (() => {
                                    const raw = String(t.duration || "1 days")
                                    const parts = raw.match(/^(\d+)\s*(.*)$/)
                                    const value = parts ? Number(parts[1]) : 1
                                    const unit =
                                      parts?.[2]?.toLowerCase() || "days"
                                    const type = unit.startsWith("week")
                                      ? "weeks"
                                      : unit.startsWith("hour")
                                        ? "hours"
                                        : "days"
                                    return { value, type }
                                  })(),
                            ...(assignedMember ? { assignedMember } : {}),
                          }
                        }),
                      }
                    : {}),
                }
              })
            })(),
            rating: 4.9,
            reviewCount: 14,
            listingType: d.listingType || "project",
          })
          if (d.projectType || d.listingType)
            setInfoProjectType(d.projectType || d.listingType)
          if (d.shortDescription) setInfoSummary(d.shortDescription)
          if (d.title && d.title !== "Enter Project Title")
            setInfoTitle(d.title)

          // Hydrate category rows for the Project Info dialog
          if (
            Array.isArray(d.categorySelections) &&
            d.categorySelections.length > 0
          ) {
            const rows: CategoryRow[] = d.categorySelections.map((cs: any) => ({
              category: cs.category || "",
              subCategories: Array.isArray(cs.subCategories)
                ? cs.subCategories
                : [],
            }))
            while (rows.length < 3)
              rows.push({ category: "", subCategories: [] })
            setInfoCategories(rows.slice(0, 3))
          } else if (Array.isArray(d.categories) && d.categories.length > 0) {
            const subs = d.subCategories ?? d.subcategories ?? []
            const rows: CategoryRow[] = d.categories.map(
              (cat: string, i: number) => ({
                category: cat,
                subCategories: i === 0 && Array.isArray(subs) ? subs : [],
              })
            )
            while (rows.length < 3)
              rows.push({ category: "", subCategories: [] })
            setInfoCategories(rows.slice(0, 3))
          }

          // Hydrate details dialog state
          if (Array.isArray(d.skills) && d.skills.length > 0)
            setDetailsSkills(d.skills)
          if (Array.isArray(d.industries) && d.industries.length > 0)
            setDetailsIndustry(d.industries)
          if (Array.isArray(d.tags) && d.tags.length > 0) setDetailsTags(d.tags)
        }

        // Fetch the current user's team from the backend and populate project.team
        const fetchTeamData = async () => {
          try {
            const teamRes = await TeamsAPI.getMyTeam()
            const teamData = teamRes?.data?.data ?? teamRes?.data
            const members = Array.isArray(teamData?.members)
              ? teamData.members
              : []
            if (members.length === 0) return
            // Hydrate team members with profile data
            const hydratedMembers = await Promise.all(
              members.map(async (m: any) => {
                let profile: any = null
                if (m.username) {
                  try {
                    const profileRes =
                      await TeamsAPI.getTalentUserByUsername(m.username)
                    profile = profileRes?.data
                  } catch {
                    /* profile not found */
                  }
                }
                return {
                  id: m.userId || m.id,
                  firstName:
                    profile?.firstName || m.firstName || m.username || "User",
                  username: m.username || profile?.username || "",
                  avatarUrl: profile?.avatarUrl || m.avatarUrl || null,
                  role: m.role || profile?.jobTitle || "",
                  jobTitles: profile?.jobTitles ?? [],
                  hourlyRate: profile?.hourlyRate ?? null,
                  workSchedule: profile?.workSchedule ?? null,
                  customHoursPerWeek: profile?.customHoursPerWeek ?? null,
                  location:
                    profile?.location || profile?.country || m.location || null,
                  languages: (profile?.languages ?? []).map(coerceName),
                  skills: (profile?.skills ?? []).map(coerceName),
                  experience: coerceName(profile?.experienceLevel) || null,
                  isLead: m.role === "owner" || m.role === "lead",
                  isOnline: false,
                }
              })
            )
            setProject((prev: any) => {
              const byId = new Map<string, any>()
              for (const m of prev.team ?? []) byId.set(m.id || m.userId, m)
              for (const m of hydratedMembers) byId.set(m.id || m.userId, m)
              return { ...prev, team: Array.from(byId.values()) }
            })
          } catch {
            // team fetch failed — leave as seed/empty
          }
        }

        // 1. If the param is a UUID, fetch the draft directly by ID
        if (isUuid) {
          try {
            const draftRes = await ProjectAPI.GetProjectDraft(rawSlug)
            if (draftRes?.data) {
              hydrateFromDraft(draftRes.data)
              fetchTeamData() // non-blocking — updates team when ready
              setLoading(false)
              return
            }
          } catch (err: any) {
            // QA-196/PMCM-402: a 403 means this listing exists but the
            // signed-in account isn't its owner or a team member on it —
            // stop here instead of falling through to auto-creating an
            // unrelated blank draft under this URL.
            if (err?.response?.status === 403) {
              setAccessDenied(true)
              setLoading(false)
              return
            }
            // draft not found by ID — fall through
          }
        }

        // 2. Try the authenticated publish endpoint by slug
        const parts = rawSlug.split("-")
        const stripped =
          parts.length > 1 ? parts.slice(0, -1).join("-") : rawSlug
        const candidates = Array.from(new Set([rawSlug, stripped]))

        for (const candidate of candidates) {
          try {
            const publishRes = await ProjectAPI.GetProjectBySlug(candidate)
            if (publishRes?.data) {
              hydrateFromDraft(publishRes.data)
              fetchTeamData()
              setLoading(false)
              return
            }
          } catch (err: any) {
            if (err?.response?.status === 403) {
              setAccessDenied(true)
              setLoading(false)
              return
            }
            // not found — try next candidate
          }
        }

        // 3. Fallback: try the public read endpoint (for published CMS projects)
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
          res = await fetch(`${apiBase}/v1/projects/slug/${slug}`)
        }
        if (!res.ok) {
          const svcRes = await fetch(`${apiBase}/v1/services/slug/${slug}`)
          if (!svcRes.ok) {
            // Not found anywhere — fall through to step 4 (auto-create draft)
            throw new Error("not-found")
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
          listingType: data.listingType || "project",
        })
        if (data.projectType || data.listingType)
          setInfoProjectType(data.projectType || data.listingType)
        if (data.shortDescription) setInfoSummary(data.shortDescription)
        setLoading(false)
        return
      } catch (err) {
        console.error(err)
      }

      // 4. Nothing found anywhere — create a new backend draft so edits persist
      //    If the slug matches a seed listing, use its title/description
      const seedListing = TEAM_SEED_LISTINGS.find((s) => s.id === rawSlug)
      try {
        const draftRes = await ProjectAPI.CreateProjectDraft({
          title: seedListing?.title || "",
          shortDescription: seedListing?.description || "",
          fullDescription: seedListing?.description || "",
          listingType: seedListing?.projectType || "Website",
        })
        if (draftRes?.data?.id) {
          const newId = draftRes.data.id
          const seedTitle = seedListing?.title || ""
          setProject((prev: any) => ({
            ...prev,
            id: newId,
            title: seedTitle || prev.title,
          }))
          if (seedTitle) setInfoTitle(seedTitle)
          // Replace URL with the real backend UUID so reloads work
          router.replace(`/my-listings/${newId}`, { scroll: false })
        }
      } catch (createErr) {
        console.error("Failed to create initial draft:", createErr)
      } finally {
        setLoading(false)
      }
    }

    fetchProject()
  }, [params.slug, router])

  // Scroll to top when page loads
  React.useEffect(() => {
    window.scrollTo(0, 0)
  }, [])

  const projectStaticContent = React.useMemo<ProjectStaticContent>(() => {
    return buildProjectStaticContentFromGateway(project?.projectStaticContent)
  }, [project?.projectStaticContent])

  if (loading) {
    return (
      <div className="px-[100px] pb-[100px] relative bg-white">
        <div className="max-w-[1240px] w-full mx-auto flex items-start gap-x-8">
          <div className="max-w-[818px] flex-auto">
            {/* gray header area */}
            <div className="after:content-[''] after:absolute after:inset-x-0 after:border-b after:border-gray-200">
              <div className="relative pt-6 pb-[50px]">
                <div className="absolute w-screen left-[min(-100px,calc(620px-50vw))] top-0 bottom-0 bg-gray-50" />
                {/* breadcrumb */}
                <div className="flex items-center gap-x-2 relative">
                  <Shimmer className="size-[18px] rounded" />
                  <span className="text-xs text-gray-300">/</span>
                  <Shimmer className="h-3 w-16" />
                  <span className="text-xs text-gray-300">/</span>
                  <Shimmer className="h-3 w-32" />
                </div>
                {/* hero: thumbnail + title */}
                <div className="flex gap-x-[13px] items-start mt-8 relative z-[5]">
                  <Shimmer className="w-[189px] h-[126px] rounded-lg shrink-0" />
                  <div className="flex flex-col gap-y-3 flex-1">
                    <Shimmer className="h-5 w-24 rounded" />
                    <Shimmer className="h-7 w-3/4" />
                    <div className="flex gap-x-3">
                      <Shimmer className="h-4 w-24" />
                      <Shimmer className="h-4 w-20" />
                      <Shimmer className="h-4 w-20" />
                    </div>
                  </div>
                  <Shimmer className="size-5 rounded shrink-0" />
                </div>
                {/* short description */}
                <div className="mt-5 space-y-2 relative">
                  <Shimmer className="h-4 w-full" />
                  <Shimmer className="h-4 w-11/12" />
                  <Shimmer className="h-4 w-4/5" />
                </div>
              </div>
            </div>

            {/* action bar */}
            <div className="flex items-center justify-between py-4">
              <Shimmer className="h-5 w-28" />
              <Shimmer className="h-5 w-20" />
              <Shimmer className="h-5 w-32" />
            </div>

            {/* gallery thumbnails */}
            <div className="flex gap-x-4 mt-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <Shimmer key={i} className="h-[140px] flex-1 rounded-lg" />
              ))}
            </div>
            <div className="mt-3">
              <Shimmer className="h-4 w-24" />
            </div>

            {/* tabs */}
            <div className="flex gap-x-6 mt-6 border-b border-gray-200 pb-2.5">
              <Shimmer className="h-4 w-20" />
              <Shimmer className="h-4 w-20" />
              <Shimmer className="h-4 w-24" />
              <Shimmer className="h-4 w-20" />
              <Shimmer className="h-4 w-20" />
            </div>

            {/* description content */}
            <div className="mt-6 space-y-6">
              <div className="rounded-lg border border-gray-200 p-6 space-y-4">
                <Shimmer className="h-6 w-2/3" />
                <div className="space-y-2">
                  <Shimmer className="h-4 w-full" />
                  <Shimmer className="h-4 w-full" />
                  <Shimmer className="h-4 w-11/12" />
                  <Shimmer className="h-4 w-10/12" />
                  <Shimmer className="h-4 w-9/12" />
                </div>
              </div>

              {/* deliverables */}
              <div className="rounded-lg border border-gray-200 p-6 space-y-4">
                <Shimmer className="h-6 w-28" />
                <div className="grid grid-cols-3 gap-3">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <Shimmer key={i} className="h-9 rounded-md" />
                  ))}
                </div>
              </div>

              {/* project details */}
              <div className="rounded-lg border border-gray-200 p-6 space-y-4">
                <Shimmer className="h-6 w-32" />
                <div className="space-y-3">
                  <Shimmer className="h-4 w-full" />
                  <Shimmer className="h-4 w-3/4" />
                </div>
              </div>
            </div>
          </div>

          {/* sidebar */}
          <div className="w-[360px] shrink-0 pt-6 space-y-6">
            {/* pricing card */}
            <div className="rounded-lg border border-gray-200 p-6 space-y-4">
              <div className="flex items-center gap-x-2">
                <Shimmer className="h-4 w-20" />
                <Shimmer className="h-8 w-12" />
                <Shimmer className="h-4 w-10" />
                <Shimmer className="h-8 w-16 rounded-md" />
              </div>
              <Shimmer className="h-4 w-full" />
              <div className="h-px bg-gray-200" />
              <Shimmer className="h-4 w-24" />
              <Shimmer className="size-9 rounded-full" />
              <div className="space-y-2">
                <Shimmer className="h-4 w-48" />
                <Shimmer className="h-4 w-52" />
              </div>
              <div className="flex gap-x-3 mt-2">
                <Shimmer className="h-10 w-20 rounded-lg" />
                <Shimmer className="h-10 flex-1 rounded-lg" />
                <Shimmer className="size-10 rounded-lg" />
              </div>
            </div>
            {/* tutorials card */}
            <div className="rounded-lg border border-gray-200 p-6 space-y-4">
              <Shimmer className="h-5 w-52" />
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex gap-x-3 items-center">
                  <Shimmer className="w-[100px] h-[65px] rounded-lg shrink-0" />
                  <div className="flex-1 space-y-2">
                    <Shimmer className="h-4 w-full" />
                    <Shimmer className="h-3 w-20" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (accessDenied) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center px-6">
        <div className="max-w-md text-center">
          <div className="mx-auto mb-4 size-12 rounded-full bg-gray-100 flex items-center justify-center">
            <AlertCircle className="size-6 text-gray-400" />
          </div>
          <h1 className="text-xl font-semibold text-dark-blue-400">
            Unauthorized access
          </h1>
          <p className="mt-2 text-sm text-gray-500">
            You don&apos;t have access to this project&apos;s editor. Ask
            the listing owner to add you to the team if you should be able
            to edit it.
          </p>
          <div className="mt-6">
            <Button onClick={() => router.push("/my-listings")}>
              Go to My Listings
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
            <Button onClick={() => router.push("/projects")}>
              Browse projects
            </Button>
          </div>
        </div>
      </div>
    )
  }

  if (isClientView) {
    return (
      <ClientListingView isPreview onEdit={() => setIsClientView(false)} />
    )
  }

  return (
    <>
      <div className="px-[100px] pb-[100px] relative bg-white">
        <div className="max-w-[1240px] w-full mx-auto flex items-start gap-x-8">
          <div className="max-w-[818px] flex-auto">
            <div className="after:content-[''] after:absolute after:inset-x-0 after:border-b after:border-gray-200">
              <div className="relative pt-6 pb-[50px]">
                <div className="absolute w-screen left-[min(-100px,calc(620px-50vw))] top-0 bottom-0 bg-gray-50" />

                <div className="flex items-center gap-x-2 relative">
                  <NextLink href="/">
                    <Home03 className="size-[18px] text-gray-500/50 cursor-pointer hover:text-gray-500" />
                  </NextLink>

                  <div className="inline-flex items-center gap-x-2">
                    <span className="text-xs leading-6 text-gray-500/50 font-semibold">
                      /
                    </span>
                    <NextLink
                      href="/my-listings"
                      className="text-xs leading-6 text-gray-500/50 hover:text-gray-500 font-semibold hover:underline cursor-pointer transition duration-300"
                    >
                      My Listings
                    </NextLink>
                  </div>
                  <div className="inline-flex items-center gap-x-2">
                    <span className="text-xs leading-6 text-gray-500/50 font-semibold">
                      /
                    </span>
                    <span className="text-xs leading-6 text-gray-500 font-semibold">
                      {project.title === "Enter Project Title"
                        ? `draft-${project.id}`
                        : project.title}
                    </span>
                  </div>
                </div>

                <div className="flex gap-x-[13px] items-start mt-8 relative z-[5]">
                  <div className="flex flex-col gap-y-1.5">
                  <div
                    className={cn(
                      "group/thumb w-[189px] h-[126px] relative overflow-hidden rounded-lg border",
                      SHOW_PUBLISH_VALIDATION &&
                        publishAttempted &&
                        !project.featuredImage &&
                        !project.mediaUrls?.[0] &&
                        !project.featuredVideo
                        ? "bg-error-25 border-error-300"
                        : "bg-gray-50 border-gray-200"
                    )}
                  >
                    {(featuredUploading || featuredCompleting) &&
                    !project.featuredImage ? (
                      <div className="absolute inset-0 bg-gray-100 flex items-center justify-center">
                        <UploadProgressRing
                          uploading={featuredUploading}
                          onComplete={() => setFeaturedCompleting(false)}
                        />
                      </div>
                    ) : project.featuredImage ? (
                      <>
                        <NextImage
                          className="object-cover"
                          src={project.featuredImage}
                          alt={project.title}
                          sizes="25vw"
                          loading="eager"
                          priority
                          fill
                        />
                        {(featuredUploading || featuredCompleting) && (
                          <div className="absolute inset-0 bg-gray-100/80 flex items-center justify-center z-20">
                            <UploadProgressRing
                              uploading={featuredUploading}
                              onComplete={() => setFeaturedCompleting(false)}
                            />
                          </div>
                        )}
                        <div
                          className={cn(
                            "absolute inset-0 bg-black/40 opacity-0 group-hover/thumb:opacity-100 transition-opacity duration-200 flex items-center justify-center gap-x-2",
                            (featuredUploading || featuredCompleting) &&
                              "pointer-events-none !opacity-0"
                          )}
                        >
                          <button
                            type="button"
                            className="size-8 rounded-full bg-white/20 hover:bg-white/40 inline-flex items-center justify-center transition"
                            onClick={() => {
                              const input = document.createElement("input")
                              input.type = "file"
                              input.accept = "image/*"
                              input.onchange = (e) => {
                                const files = (e.target as HTMLInputElement)
                                  .files
                                if (files?.[0]) {
                                  handleFeaturedImageUpload(files[0])
                                }
                              }
                              input.click()
                            }}
                          >
                            <Edit03 className="size-3.5 text-white" />
                          </button>
                          <button
                            type="button"
                            className="size-8 rounded-full bg-white/20 hover:bg-red-500/80 inline-flex items-center justify-center transition"
                            onClick={() => setFeaturedDeleteOpen(true)}
                          >
                            <Trash2 className="size-3.5 text-white" />
                          </button>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="absolute inset-0 flex items-center justify-center">
                          {SHOW_PUBLISH_VALIDATION &&
                          publishAttempted &&
                          !project.mediaUrls?.[0] &&
                          !project.featuredVideo ? (
                            <span
                              className="size-[54px] bg-error-300"
                              style={{
                                WebkitMaskImage: "url(/placeholder-img.svg)",
                                maskImage: "url(/placeholder-img.svg)",
                                WebkitMaskRepeat: "no-repeat",
                                maskRepeat: "no-repeat",
                                WebkitMaskSize: "contain",
                                maskSize: "contain",
                                WebkitMaskPosition: "center",
                                maskPosition: "center",
                              }}
                            />
                          ) : (
                            <img
                              src="/placeholder-img.svg"
                              alt=""
                              className="size-[54px]"
                            />
                          )}
                        </div>
                        <div className="absolute inset-0 bg-gray-500/80 opacity-0 group-hover/thumb:opacity-100 transition-opacity duration-200 flex items-center justify-center">
                          <button
                            type="button"
                            className="inline-flex items-center gap-x-1.5 px-2.5 py-1 rounded-md bg-white text-xs font-medium text-gray-800 hover:bg-gray-50 transition shadow-sm"
                            onClick={() => {
                              const input = document.createElement("input")
                              input.type = "file"
                              input.accept = "image/*"
                              input.onchange = (e) => {
                                const files = (e.target as HTMLInputElement)
                                  .files
                                if (files?.[0]) {
                                  handleFeaturedImageUpload(files[0])
                                }
                              }
                              input.click()
                            }}
                          >
                            <UploadCloud className="size-3.5" />
                            Add Image
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                  {SHOW_PUBLISH_VALIDATION &&
                    publishAttempted &&
                    !project.featuredImage &&
                    !project.mediaUrls?.[0] &&
                    !project.featuredVideo && (
                      <p className="text-sm text-error-500">
                        Please add a featured image
                      </p>
                    )}
                  </div>

                  {/* Featured image delete confirmation */}
                  {/* QA-176/PMCM-396: a Published listing can't be left with
                  no featured image — deleting it here is a pure clear with
                  no replacement in the same action (unlike the Edit/replace
                  button above, which uploads the new image before the old
                  one is gone). Draft listings stay unrestricted. */}
                  <Dialog
                    open={featuredDeleteOpen}
                    onOpenChange={setFeaturedDeleteOpen}
                  >
                    <DialogContent className="max-w-[409px] p-0">
                      <div className="p-6 border-b border-gray-200">
                        <DialogTitle>Delete featured image?</DialogTitle>
                        <DialogDescription className="mt-2">
                          {isPublished
                            ? "This listing is published. A replacement image must be uploaded first."
                            : "Your image will be removed permanently."}
                        </DialogDescription>
                      </div>
                      <div className="py-4 flex rounded-b-xl bg-gray-25 items-center justify-between px-6">
                        <DialogClose asChild>
                          <Button
                            className="opacity-50 hover:opacity-100"
                            visual="gray"
                            variant="link"
                          >
                            <X className="size-[15px]" />
                            Cancel
                          </Button>
                        </DialogClose>
                        <Button
                          variant="outlined"
                          visual="gray"
                          disabled={isPublished}
                          onClick={() => {
                            setProject((prev: any) => ({
                              ...prev,
                              featuredImage: null,
                            }))
                            setFeaturedDeleteOpen(false)
                          }}
                        >
                          Yes, Delete
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>

                  <div className="flex flex-col items-start gap-y-3 flex-1">
                    <Popover
                      open={projectTypeOpen}
                      onOpenChange={(open) => {
                        setProjectTypeOpen(open)
                        if (!open) setProjectTypeQuery("")
                      }}
                    >
                      <PopoverTrigger asChild>
                        <button type="button">
                          <Badge
                            className={cn(
                              "rounded-[5px] cursor-pointer",
                              SHOW_PUBLISH_VALIDATION &&
                                publishAttempted &&
                                !PROJECT_TYPE_OPTIONS.includes(infoProjectType)
                                ? "bg-error-50 text-error-500"
                                : "bg-gray-100"
                            )}
                            visual="gray"
                          >
                            {PROJECT_TYPE_OPTIONS.includes(infoProjectType)
                              ? infoProjectType
                              : "Select Project Type"}
                          </Badge>
                        </button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[224px] rounded-xl bg-white shadow-2xl p-0 border-0">
                        <Combobox
                          value={infoProjectType}
                          onChange={(val: string) => {
                            setInfoProjectType(val)
                            setProject((prev: any) => ({
                              ...prev,
                              projectType: val,
                            }))
                            setProjectTypeQuery("")
                            setProjectTypeOpen(false)
                            saveProjectFields({ projectType: val })
                          }}
                          className="w-full"
                        >
                          <ComboboxTrigger>
                            <ComboboxButton>
                              <SearchMd className="size-4" />
                            </ComboboxButton>
                            <ComboboxInput
                              placeholder="Search"
                              onChange={(e) =>
                                setProjectTypeQuery(e.target.value)
                              }
                              className="border-0 border-b border-gray-200 rounded-none focus:ring-0 focus:border-gray-200 hover:ring-0 hover:border-gray-200"
                            />
                          </ComboboxTrigger>
                          <ComboboxPrimitive.Options
                            static
                            className="space-y-1 px-1"
                          >
                            <ScrollArea className="h-[304px]">
                              {filteredProjectTypes.map((opt) => (
                                <ComboboxOption key={opt} value={opt}>
                                  {opt}
                                </ComboboxOption>
                              ))}
                            </ScrollArea>
                          </ComboboxPrimitive.Options>
                        </Combobox>
                      </PopoverContent>
                    </Popover>

                    {SHOW_PUBLISH_VALIDATION &&
                      publishAttempted &&
                      !PROJECT_TYPE_OPTIONS.includes(infoProjectType) && (
                        <p className="text-sm text-error-500">
                          Please select your project type
                        </p>
                      )}

                    <div
                      className="flex items-center gap-1.5 w-full cursor-pointer"
                      onMouseEnter={() => setIsTitleHovered(true)}
                      onMouseLeave={() => setIsTitleHovered(false)}
                      onClick={() => {
                        if (!isTitleEditing) {
                          setInfoTitle(
                            project.title === "Enter Project Title"
                              ? ""
                              : project.title || ""
                          )
                          setIsTitleEditing(true)
                          setTitleError(null)
                          setTimeout(() => titleInputRef.current?.focus(), 0)
                        }
                      }}
                    >
                      <div className="flex flex-col flex-1 min-w-0">
                        {isTitleEditing ? (
                          <>
                            <input
                              ref={titleInputRef}
                              type="text"
                              className="w-full text-[22px] leading-[30px] font-semibold text-dark-blue-400 bg-transparent border-0 border-b border-gray-300 outline-none p-0 m-0 placeholder:text-gray-400 placeholder:font-semibold"
                              value={infoTitle}
                              placeholder="Enter Project Title"
                              maxLength={120}
                              onChange={(e) => {
                                const val = e.target.value.slice(0, 120)
                                setInfoTitle(val)
                                if (titleError) setTitleError(null)
                              }}
                              onBlur={() => {
                                setIsTitleEditing(false)
                                if (infoTitle.trim()) {
                                  setProject((prev: any) => ({
                                    ...prev,
                                    title: infoTitle,
                                  }))
                                  saveProjectFields({ title: infoTitle })
                                }
                              }}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  e.preventDefault()
                                  ;(e.target as HTMLInputElement).blur()
                                }
                                if (e.key === "Escape") {
                                  setIsTitleEditing(false)
                                  setTitleError(null)
                                  setInfoTitle(
                                    project.title === "Enter Project Title"
                                      ? ""
                                      : project.title || ""
                                  )
                                }
                                const currentLen = infoTitle.length
                                const selLen =
                                  (e.currentTarget.selectionEnd ?? 0) -
                                  (e.currentTarget.selectionStart ?? 0)
                                if (
                                  !e.ctrlKey &&
                                  !e.metaKey &&
                                  !e.altKey &&
                                  e.key.length === 1 &&
                                  currentLen - selLen >= 120
                                ) {
                                  e.preventDefault()
                                  setTitleError(
                                    "Please do not enter more than 120 character(s)"
                                  )
                                }
                              }}
                              onPaste={(e) => {
                                const pastedText =
                                  e.clipboardData.getData("text")
                                const currentLen = infoTitle.length
                                const selLen =
                                  (e.currentTarget.selectionEnd ?? 0) -
                                  (e.currentTarget.selectionStart ?? 0)
                                if (
                                  currentLen - selLen + pastedText.length >
                                  120
                                ) {
                                  e.preventDefault()
                                  setTitleError(
                                    "Please do not enter more than 120 character(s)"
                                  )
                                }
                              }}
                            />
                            {titleError && (
                              <span className="text-xs text-red-500 mt-1">
                                {titleError}
                              </span>
                            )}
                          </>
                        ) : (
                          <span
                            className={cn(
                              "text-[22px] leading-[30px] font-semibold break-words min-w-0",
                              SHOW_PUBLISH_VALIDATION &&
                                publishAttempted &&
                                (!project.title ||
                                  project.title === "Enter Project Title")
                                ? "text-error-500"
                                : "text-dark-blue-400"
                            )}
                          >
                            {project.title || "Enter Project Title"}
                          </span>
                        )}
                      </div>
                      <Edit03
                        className={cn(
                          "size-4 text-gray-400 shrink-0 transition-opacity duration-200",
                          isTitleHovered || isTitleEditing
                            ? "opacity-100"
                            : "opacity-0"
                        )}
                      />
                    </div>

                    {SHOW_PUBLISH_VALIDATION &&
                      publishAttempted &&
                      (!project.title ||
                        project.title === "Enter Project Title") && (
                        <p className="text-sm text-error-500">
                          Please enter your project title
                        </p>
                      )}

                    {(project.categories || []).length > 0 ? (
                      <div className="flex items-center gap-x-3">
                        {(project.categories || []).map((cat: string) => {
                          const catSlug = cat
                            .toLowerCase()
                            .replace(/&/g, "and")
                            .replace(/\s+/g, "-")
                            .replace(/[^a-z0-9-]/g, "")
                          return (
                            <NextLink
                              key={cat}
                              href={`/c/${catSlug}`}
                              className="text-sm font-semibold text-gray-500 hover:text-dark-blue-400 hover:underline transition duration-300"
                            >
                              {cat}
                            </NextLink>
                          )
                        })}
                      </div>
                    ) : (
                      <button
                        className={cn(
                          "inline-flex items-center gap-x-1.5 text-sm font-semibold hover:underline transition duration-300",
                          SHOW_PUBLISH_VALIDATION && publishAttempted
                            ? "text-error-500"
                            : "text-dark-blue-400"
                        )}
                        onClick={() => {
                          setInfoTitle(
                            project.title === "Enter Project Title"
                              ? ""
                              : project.title || ""
                          )
                          setInfoSummary(project.summary || "")
                          setInfoTab("Categories")
                          setSelected("Details")
                          setProjectInfoOpen(true)
                        }}
                      >
                        <Plus className="size-4" />
                        Add Categories
                      </button>
                    )}

                    {SHOW_PUBLISH_VALIDATION &&
                      publishAttempted &&
                      (project.categories || []).length < 3 && (
                        <p className="text-sm text-error-500">
                          Please add at least 3 categories
                        </p>
                      )}
                  </div>

                  <IconButton
                    className="rounded-full text-gray-500 hover:text-gray-800"
                    variant="ghost"
                    visual="gray"
                    onClick={() => {
                      setInfoTitle(
                        project.title === "Enter Project Title"
                          ? ""
                          : project.title || ""
                      )
                      setInfoSummary(project.summary || "")
                      setInfoTab("Basic Info")
                      setSelected("Details")
                      setProjectInfoOpen(true)
                    }}
                  >
                    <Edit03 className="size-4" />
                  </IconButton>
                </div>

                <div
                  className="mt-6 relative cursor-pointer hover:bg-gray-50 rounded-md transition -mx-2 px-2 py-1"
                  onClick={() => {
                    setInfoTab("Basic Info")
                    setFocusSummaryOnOpen(true)
                    setSelected("Details")
                    setProjectInfoOpen(true)
                  }}
                >
                  <p
                    style={{ whiteSpace: "pre-line" }}
                    className={cn(
                      "text-sm font-light break-words line-clamp-3",
                      SHOW_PUBLISH_VALIDATION &&
                        publishAttempted &&
                        !project.summary
                        ? "text-error-500"
                        : "text-dark-blue-400"
                    )}
                  >
                    {project.summary ||
                      "Add a short description here to explain your project features and benefits. This will help visitors quickly see the difference between your project and similar projects in the marketplace..."}
                  </p>
                  {SHOW_PUBLISH_VALIDATION &&
                    publishAttempted &&
                    !project.summary && (
                      <p className="mt-2 text-sm text-error-500">
                        Please add a short description
                      </p>
                    )}
                  {publishError && publishErrorField === "shortDescription" && (
                    <p className="mt-2 text-sm text-error-500">{publishError}</p>
                  )}
                </div>
              </div>
            </div>

            <Tabs value={selected} onValueChange={setSelected}>
              <RadixTabs.TabsList
                className={cn(
                  "h-12 flex items-center justify-between border-b border-gray-200",
                  selected === "Live Chat" && "sticky top-[65px] z-10"
                )}
              >
                <div className="flex-1 flex justify-start">
                  <Button
                    className="group"
                    variant="link"
                    visual="gray"
                    onClick={() => {
                      if (hasChanges) {
                        setPendingNavUrl("/my-listings")
                        setUnsavedNavOpen(true)
                      } else {
                        router.push("/my-listings")
                      }
                    }}
                  >
                    <ArrowLeft className="size-[15px] transition duration-300 group-hover:-translate-x-[4px]" />{" "}
                    Back To Listings
                  </Button>
                </div>

                <Button
                  variant="link"
                  className="!text-primary-500 shrink-0"
                  onClick={() =>
                    setSelected(
                      selected === "Live Chat" ? "Details" : "Live Chat"
                    )
                  }
                >
                  <MessageTextCircle01 className="size-5" />
                  {selected === "Live Chat" ? "Close Chat" : "Live Chat"}
                </Button>

                <div className="flex-1 flex justify-end">
                  <Button
                    className="group"
                    variant="link"
                    visual="gray"
                    onClick={() =>
                      setSelected(
                        selected === "View Project Scope"
                          ? "Details"
                          : "View Project Scope"
                      )
                    }
                    data-state={
                      selected === "View Project Scope" ? "active" : "inactive"
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
                {project?.id && isRealBackendId(String(project.id)) ? (
                  <ProjectChatPanel projectId={String(project.id)} />
                ) : (
                  <div className="flex flex-col items-center justify-center py-16 gap-4">
                    <div className="relative w-[72px] h-[56px]">
                      <svg
                        viewBox="0 0 72 56"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                        className="w-full h-full"
                      >
                        <rect x="0" y="8" width="40" height="32" rx="8" fill="#E5E7EB" />
                        <rect x="14" y="2" width="40" height="32" rx="8" fill="#D1D5DB" />
                        <rect x="28" y="14" width="40" height="32" rx="8" fill="#354764" />
                      </svg>
                    </div>
                    <div className="flex flex-col items-center gap-1.5 text-center">
                      <h3 className="text-base font-semibold text-dark-blue-400">
                        You Have No Recent Chats
                      </h3>
                      <p className="text-sm text-dark-blue-400 max-w-[320px]">
                        Once your project is live, chat threads will be visible
                        here when visitors message you.
                      </p>
                    </div>
                  </div>
                )}
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
                <input
                  ref={galleryInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={(e) => {
                    handleGalleryUpload(e.target.files)
                    e.target.value = ""
                  }}
                />
                <DndContext
                  collisionDetection={closestCenter}
                  modifiers={[restrictToHorizontalAxis]}
                  onDragEnd={handleGalleryDragEnd}
                  sensors={gallerySensors}
                >
                  <div className="relative max-w-[818px] w-full">
                    {canScrollGalleryPrev && (
                      <button
                        type="button"
                        className="absolute -left-[13.75px] top-1/2 -translate-y-1/2 z-30 border border-gray-300 bg-white shadow-[0px_1px_4px_0px_rgba(0,0,0,.03)] size-8 rounded-full hover:ring-1 hover:ring-dark-blue-400 hover:text-dark-blue-400 text-gray-500 transition duration-300 inline-flex items-center justify-center"
                        onClick={() => scrollGallery("prev")}
                      >
                        <ChevronLeft className="size-5" />
                      </button>
                    )}
                    {canScrollGalleryNext && (
                      <button
                        type="button"
                        className="absolute -right-[13.75px] top-1/2 -translate-y-1/2 z-30 border border-gray-300 bg-white shadow-[0px_1px_4px_0px_rgba(0,0,0,.03)] size-8 rounded-full hover:ring-1 hover:ring-dark-blue-400 hover:text-dark-blue-400 text-gray-500 transition duration-300 inline-flex items-center justify-center"
                        onClick={() => scrollGallery("next")}
                      >
                        <ChevronRight className="size-5" />
                      </button>
                    )}
                    <div
                      ref={galleryScrollRef}
                      className="w-full overflow-x-auto scrollbar-hide"
                      style={{
                        scrollbarWidth: "none",
                        msOverflowStyle: "none",
                        WebkitOverflowScrolling: "touch",
                      }}
                      onScroll={updateGalleryScrollState}
                    >
                      <div
                        className="flex gap-3"
                        style={{ minWidth: "min-content" }}
                      >
                        {/* Featured video — first slot when present */}
                        {project.featuredVideo && (
                          <div className="group/slide shrink-0 w-[calc(33.333%-8px)]">
                            <div className="relative border border-gray-200 h-[150.6px] overflow-hidden rounded-lg bg-black">
                              {toVideoThumb(project.featuredVideo) ? (
                                <img
                                  src={toVideoThumb(project.featuredVideo)}
                                  alt="Featured video"
                                  className={cn(
                                    "absolute inset-0 w-full h-full object-cover pointer-events-none transition-all duration-300",
                                    videoHidden && "opacity-40 blur-[1px]"
                                  )}
                                />
                              ) : (
                                <iframe
                                  src={toEmbedUrl(project.featuredVideo)}
                                  className={cn(
                                    "absolute inset-0 w-full h-full pointer-events-none transition-all duration-300",
                                    videoHidden && "opacity-40 blur-[1px]"
                                  )}
                                  allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                  tabIndex={-1}
                                  title="Featured video"
                                />
                              )}
                              <div
                                className={cn(
                                  "absolute inset-0 flex items-center justify-center pointer-events-none group-hover/slide:opacity-0 transition-opacity duration-200",
                                  videoHidden && "opacity-70"
                                )}
                              >
                                <div className="size-10 rounded-full bg-white/90 flex items-center justify-center shadow">
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
                                </div>
                              </div>
                              {videoHidden && (
                                <div className="absolute top-1.5 left-1.5">
                                  <div className="border border-dashed border-gray-400 rounded px-1.5 py-0.5">
                                    <EyeOff className="size-3 text-gray-400" />
                                  </div>
                                </div>
                              )}
                              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/slide:opacity-100 transition-opacity duration-200 flex items-center justify-center gap-x-2">
                                <button
                                  type="button"
                                  className="size-9 rounded-full bg-white/20 hover:bg-white/40 inline-flex items-center justify-center transition"
                                  onClick={() => {
                                    setVideoUrlInput(
                                      project.featuredVideo || ""
                                    )
                                    setVideoDialogOpen(true)
                                  }}
                                >
                                  <Edit03 className="size-4 text-white" />
                                </button>
                                <button
                                  type="button"
                                  className="size-9 rounded-full bg-white/20 hover:bg-white/40 inline-flex items-center justify-center transition"
                                  onClick={() =>
                                    setVideoHidden((prev) => !prev)
                                  }
                                >
                                  {videoHidden ? (
                                    <Eye className="size-4 text-white" />
                                  ) : (
                                    <EyeOff className="size-4 text-white" />
                                  )}
                                </button>
                                <button
                                  type="button"
                                  className="size-9 rounded-full bg-white/20 hover:bg-red-500/80 inline-flex items-center justify-center transition"
                                  onClick={() => {
                                    setProject((prev: any) => ({
                                      ...prev,
                                      featuredVideo: null,
                                    }))
                                    setVideoHidden(false)
                                    saveProjectFields({ videoUrl: "" })
                                  }}
                                >
                                  <Trash2 className="size-4 text-white" />
                                </button>
                              </div>
                            </div>
                          </div>
                        )}
                        {(() => {
                          const allUrls: string[] =
                            (project.mediaUrls as string[] | undefined) ?? []
                          const videoOffset = project.featuredVideo ? 1 : 0
                          const emptySlots = 3 - videoOffset
                          const totalSlots = Math.max(
                            emptySlots,
                            allUrls.length,
                            ...Array.from(uploadingSlots).map((i) => i + 1),
                            ...Array.from(completingSlots).map((i) => i + 1)
                          )
                          const sortableIds = Array.from(
                            { length: totalSlots },
                            (_, i) => `gallery-${i}`
                          )

                          return (
                            <SortableContext
                              items={sortableIds}
                              strategy={horizontalListSortingStrategy}
                            >
                              {sortableIds.map((id, index) => (
                                <SortableGalleryItem
                                  key={id}
                                  index={index}
                                  url={allUrls[index]}
                                  showError={
                                    SHOW_PUBLISH_VALIDATION &&
                                    publishAttempted &&
                                    allUrls.length +
                                      (project.featuredVideo ? 1 : 0) <
                                      3
                                  }
                                  isHidden={hiddenImages.has(index)}
                                  isUploading={uploadingSlots.has(index)}
                                  isCompleting={completingSlots.has(index)}
                                  onUpload={handleGalleryUpload}
                                  onDelete={handleGalleryDelete}
                                  onToggleHidden={handleGalleryToggleHidden}
                                  onUploadComplete={() => {
                                    setCompletingSlots((prev) => {
                                      const next = new Set(prev)
                                      next.delete(index)
                                      return next
                                    })
                                  }}
                                />
                              ))}
                            </SortableContext>
                          )
                        })()}
                      </div>
                    </div>
                  </div>
                </DndContext>

                {SHOW_PUBLISH_VALIDATION &&
                  publishAttempted &&
                  publishImageCount < 3 && (
                    <p className="mt-2 text-sm text-error-500">
                      Please add at least 3 images to your project
                    </p>
                  )}

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      type="button"
                      className="mt-3 inline-flex items-center gap-x-1.5 text-sm font-medium text-gray-500 hover:text-gray-700 hover:underline transition"
                    >
                      <Plus className="size-4" />
                      Add Media
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-[160px]">
                    <DropdownMenuItem
                      onSelect={() => galleryInputRef.current?.click()}
                    >
                      <Upload04 className="size-4 mr-2" />
                      Add Image
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onSelect={() => {
                        setVideoUrlInput(project.featuredVideo || "")
                        setVideoDialogOpen(true)
                      }}
                    >
                      <VideoRecorder className="size-4 mr-2" />
                      Add Video
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                <div className="mt-6">
                  <Tabs
                    className="group/tabs"
                    defaultValue="Description"
                    ref={tabsRef}
                    data-position={isSticky ? "sticky" : "default"}
                  >
                    <div className="fixed top-0 z-50 inset-x-0 bg-white border border-gray-200 drop-shadow-[0px_2px_5px_0px_rgba(0,0,0,.04)] px-[100px] group-data-[position=default]/tabs:contents">
                      <div className="max-w-[1240px] mx-auto flex items-center group-data-[position=default]/tabs:contents">
                        <div className="pt-[12px] flex-auto group-data-[position=default]/tabs:contents">
                          <div className="pb-2 inline-flex items-center gap-x-3 group-data-[position=default]/tabs:hidden">
                            <div className="h-12 relative w-[66px] overflow-hidden rounded-[5px] bg-[#FBFBFB] border-b border-black/15">
                              {project.featuredImage ? (
                                <NextImage
                                  className="object-cover"
                                  src={project.featuredImage}
                                  sizes="15vw"
                                  fill
                                />
                              ) : (
                                <div className="absolute inset-0 flex items-center justify-center">
                                  <img
                                    src="/placeholder-img.svg"
                                    alt=""
                                    className="size-8"
                                  />
                                </div>
                              )}
                            </div>

                            <div className="flex flex-col items-start gap-y-0.5">
                              <Badge visual="gray">{project.role}</Badge>
                              <h3 className="text-lg leading-none font-bold text-dark-blue-400">
                                {project.title}
                              </h3>
                            </div>
                          </div>
                          <div className="inline-flex items-end overflow-x-auto scrollbar-none justify-start gap-4 border-b border-b-gray-200 w-full group-data-[position=sticky]/tabs:px-0">
                            {[
                              "Description",
                              "Deliverables",
                              "Project Details",
                              "How it Works",
                              "Questions",
                            ].map((section) => (
                              <button
                                key={section}
                                type="button"
                                onClick={() => scrollToSection(section)}
                                className={cn(
                                  "relative inline-flex items-center justify-center whitespace-nowrap px-1 pb-2 pt-px text-sm font-semibold transition-colors focus-visible:outline-none",
                                  sectionTab === section
                                    ? "text-primary-500"
                                    : "text-gray-500"
                                )}
                              >
                                {section}
                                {sectionTab === section && (
                                  <span className="absolute bottom-0 inset-x-0 bg-primary-500 h-0.5" />
                                )}
                              </button>
                            ))}
                          </div>
                        </div>
                        <div className="flex items-center gap-x-3 group-data-[position=default]/tabs:hidden">
                          <Button size="md">Star Project</Button>
                          <SaveButton />
                          <IconButton
                            className="text-gray-500"
                            variant="outlined"
                            visual="gray"
                            size="md"
                            onClick={() =>
                              inviteWindow.toggle(true, "Share Your Project")
                            }
                          >
                            <Share className="size-[20px]" />
                          </IconButton>
                        </div>
                      </div>
                    </div>

                    <TabsContent value="Description">
                      <div id="section-Description" className="pt-6">
                        {getRichTextCharacterCount(project.description || "") === 0 && (
                          <Alert
                            variant="primary"
                            className="mb-6 items-center"
                          >
                            <AlertIcon>
                              <Stars02 className="size-5" />
                            </AlertIcon>
                            <AlertContent className="flex-1">
                              <AlertTitle>
                                Make Your Project Stand Out
                              </AlertTitle>
                              <AlertDescription className="mt-0">
                                A great project description includes rich text
                                elements and beautiful imagery that...
                              </AlertDescription>
                            </AlertContent>
                            <NextLink
                              href="#"
                              className="shrink-0 inline-flex items-center gap-x-1.5 text-sm font-semibold text-primary-500 hover:text-primary-600 transition duration-300"
                            >
                              <Share06 className="size-4" />
                              Learn More
                            </NextLink>
                          </Alert>
                        )}
                        {getRichTextCharacterCount(project.description || "") > 0 ? (
                          <DescriptionCard
                            descHtml={project.description}
                            onEdit={() => {
                              setDescDraft(project.description || "")
                              setDescFullscreenOpen(true)
                            }}
                          />
                        ) : (
                          <>
                            <div
                              className={cn(
                                "border-2 rounded-lg p-6 flex items-start justify-between",
                                SHOW_PUBLISH_VALIDATION && publishAttempted
                                  ? "border-error-300 bg-error-50"
                                  : "border-gray-200 bg-gray-25"
                              )}
                            >
                              <div>
                                <h1
                                  className={cn(
                                    "text-lg font-semibold",
                                    SHOW_PUBLISH_VALIDATION && publishAttempted
                                      ? "text-error-500"
                                      : "text-dark-blue-400"
                                  )}
                                >
                                  Project Description
                                </h1>
                                <p
                                  className={cn(
                                    "mt-1 text-sm font-light",
                                    SHOW_PUBLISH_VALIDATION && publishAttempted
                                      ? "text-error-500"
                                      : "text-dark-blue-400"
                                  )}
                                >
                                  Describe your project in a meaningful way that
                                  will attract top clients. You can even add
                                  images using our rich text editor to make your
                                  project stand out.
                                </p>
                              </div>
                              <Button
                                variant="outlined"
                                visual="gray"
                                className={cn(
                                  "shrink-0 ml-[75px]",
                                  SHOW_PUBLISH_VALIDATION &&
                                    publishAttempted &&
                                    "text-error-500 border-error-300"
                                )}
                                onClick={() => {
                                  setDescDraft(project.description || "")
                                  setDescFullscreenOpen(true)
                                }}
                              >
                                <Plus className="size-[15px]" />
                                Add Description
                              </Button>
                            </div>
                            {SHOW_PUBLISH_VALIDATION && publishAttempted && (
                              <p className="mt-2 text-sm text-error-500">
                                Please add a project description
                              </p>
                            )}
                          </>
                        )}

                        {publishError &&
                          publishErrorField === "fullDescription" && (
                            <p className="mt-2 text-sm text-error-500">
                              {publishError}
                            </p>
                          )}

                        {descFullscreenOpen && (
                          <RichTextEditor
                            defaultValue={descDraft}
                            placeholder="<p class='text-gray-400'>Enter a full description</p>"
                            allowFullscreen
                            fullscreenOpen={descFullscreenOpen}
                            onFullscreenOpenChange={(open) => {
                              if (!open) {
                                // Auto-save on close
                                const savedDesc =
                                  getRichTextCharacterCount(descDraft) === 0
                                    ? ""
                                    : descDraft
                                setProject((prev: any) => ({
                                  ...prev,
                                  description: savedDesc,
                                }))
                                saveProjectFields({
                                  fullDescription: savedDesc,
                                })
                              }
                              setDescFullscreenOpen(open)
                            }}
                            fullscreenHelperText="Provide a comprehensive description of this project, including its purpose and features."
                            fullscreenCharacterCount={getRichTextCharacterCount(descDraft)}
                            fullscreenMaxCharacterCount={FULL_DESCRIPTION_MAX_LENGTH}
                            className="hidden"
                            onUpdate={(html) => {
                              if (descDraftTimerRef.current)
                                clearTimeout(descDraftTimerRef.current)
                              descDraftTimerRef.current = setTimeout(
                                () => setDescDraft(html),
                                250
                              )
                            }}
                          />
                        )}

                        {/* Project Info Modal */}
                        <Dialog
                          open={projectInfoOpen}
                          onOpenChange={setProjectInfoOpen}
                        >
                          <DialogContent className="max-w-[700px] rounded-[12px] p-0">
                            <form
                              onSubmit={(e) => {
                                e.preventDefault()
                                if (
                                  infoSummary.length > 0 &&
                                  infoSummary.length <
                                    SHORT_DESCRIPTION_MIN_LENGTH
                                )
                                  return
                                const updatedCategories = infoCategories
                                  .filter((r) => r.category)
                                  .map((r) => r.category)
                                const updatedSubCategories = infoCategories
                                  .filter((r) => r.category)
                                  .flatMap((r) => r.subCategories || [])
                                  .filter(Boolean)
                                const categorySelections = infoCategories
                                  .filter((r) => r.category)
                                  .map((r) => ({
                                    category: r.category,
                                    subCategories: (
                                      r.subCategories || []
                                    ).filter(Boolean),
                                  }))
                                setProject((prev: any) => ({
                                  ...prev,
                                  title: infoTitle || prev.title,
                                  summary: infoSummary || prev.summary,
                                  projectType: infoProjectType,
                                  categories: updatedCategories,
                                  subcategories: updatedSubCategories,
                                  categorySelections,
                                }))
                                setProjectInfoOpen(false)
                                saveProjectFields({
                                  title: infoTitle || undefined,
                                  shortDescription: infoSummary || undefined,
                                  projectType: infoProjectType || undefined,
                                  categories: updatedCategories,
                                  subCategories: updatedSubCategories,
                                  categorySelections,
                                })
                              }}
                            >
                              <div>
                                <div className="px-6 pt-6">
                                  <div className="flex items-start gap-x-2">
                                    <div className="flex-auto">
                                      <h1 className="text-lg text-dark-blue-400 leading-7 font-semibold">
                                        Project Info
                                      </h1>
                                      <p className="text-sm font-light text-dark-blue-400">
                                        Create a connection and let clients feel
                                        like they already know you!
                                      </p>
                                    </div>
                                    <IconButton
                                      type="button"
                                      variant="ghost"
                                      visual="gray"
                                      onClick={() => setProjectInfoOpen(false)}
                                    >
                                      <X className="size-5" />
                                    </IconButton>
                                  </div>
                                </div>

                                <Tabs
                                  value={infoTab}
                                  onValueChange={setInfoTab}
                                  className="mt-6"
                                >
                                  <TabsList className="w-full justify-start border-b border-gray-200 px-6">
                                    <TabsTrigger value="Basic Info">
                                      Basic Info
                                    </TabsTrigger>
                                    <TabsTrigger value="Categories">
                                      Categories
                                    </TabsTrigger>
                                  </TabsList>

                                  {infoTab === "Basic Info" && (
                                    <div className="pt-6 px-6 pb-6 space-y-5">
                                      <div className="space-y-1.5">
                                        <div className="flex items-center justify-between">
                                          <Label
                                            size="sm"
                                            className="font-medium cursor-default"
                                          >
                                            Title
                                          </Label>
                                          <span className="text-xs text-gray-400">
                                            {infoTitle.length}/120
                                          </span>
                                        </div>
                                        <Input
                                          placeholder="Enter project title"
                                          value={infoTitle}
                                          onChange={(e) =>
                                            setInfoTitle(
                                              e.target.value.slice(0, 120)
                                            )
                                          }
                                        />
                                      </div>

                                      <div className="space-y-1.5">
                                        <div className="flex items-center justify-between">
                                          <Label
                                            size="sm"
                                            className="font-medium cursor-default"
                                          >
                                            Short Description
                                          </Label>
                                          <span
                                            className={cn(
                                              "text-xs",
                                              infoSummary.length >
                                                SHORT_DESCRIPTION_MAX_LENGTH
                                                ? "text-error-500"
                                                : "text-gray-400"
                                            )}
                                          >
                                            {infoSummary.length}/
                                            {SHORT_DESCRIPTION_MAX_LENGTH}
                                          </span>
                                        </div>
                                        <Textarea
                                          ref={summaryTextareaRef}
                                          className="min-h-[100px] resize-none"
                                          placeholder="Enter a short description..."
                                          value={infoSummary}
                                          isInvalid={
                                            infoSummary.length > 0 &&
                                            (infoSummary.length <
                                              SHORT_DESCRIPTION_MIN_LENGTH ||
                                              infoSummary.length >
                                                SHORT_DESCRIPTION_MAX_LENGTH)
                                          }
                                          onChange={(e) =>
                                            setInfoSummary(
                                              e.target.value.slice(
                                                0,
                                                SHORT_DESCRIPTION_MAX_LENGTH
                                              )
                                            )
                                          }
                                        />
                                        {infoSummary.length > 0 &&
                                          infoSummary.length <
                                            SHORT_DESCRIPTION_MIN_LENGTH && (
                                            <p className="text-xs text-error-500">
                                              Please enter at least{" "}
                                              {SHORT_DESCRIPTION_MIN_LENGTH}{" "}
                                              character(s)
                                            </p>
                                          )}
                                      </div>

                                      <div className="space-y-1.5">
                                        <Label
                                          size="sm"
                                          className="font-medium cursor-default"
                                        >
                                          Project Type
                                        </Label>
                                        <Listbox
                                          value={infoProjectType}
                                          onChange={setInfoProjectType}
                                        >
                                          <ListboxButton
                                            placeholder="Select type"
                                            className="h-[44px] px-[14px] py-[10px] flex items-center justify-start border border-gray-300 rounded-[5px]"
                                          >
                                            {({ value }) => (
                                              <span className="truncate block">
                                                {value || "Select type"}
                                              </span>
                                            )}
                                          </ListboxButton>
                                          <ListboxOptions>
                                            {PROJECT_TYPE_OPTIONS.map((opt) => (
                                              <ListboxOption
                                                key={opt}
                                                value={opt}
                                              >
                                                {opt}
                                              </ListboxOption>
                                            ))}
                                          </ListboxOptions>
                                        </Listbox>
                                      </div>
                                    </div>
                                  )}

                                  {infoTab === "Categories" && (
                                    <div className="pt-6 px-6 pb-6">
                                      <p className="text-sm font-light text-dark-blue-400 mb-6">
                                        Select categories that best fit your
                                        project scope for easier discovery.
                                      </p>

                                      <div className="space-y-5">
                                        {[0, 1, 2].map((index) => (
                                          <div
                                            key={index}
                                            className="flex items-start gap-x-1.5"
                                          >
                                            <div className="size-11 shrink-0 inline-flex items-center justify-between text-xl leading-[30px] text-gray-900 font-semibold">
                                              {index + 1}
                                            </div>

                                            <div className="flex flex-col flex-auto gap-y-2.5">
                                              <div className="max-w-[202px]">
                                                <Listbox
                                                  value={
                                                    infoCategories[index]
                                                      .category
                                                  }
                                                  onChange={(val) =>
                                                    handleInfoCategoryChange(
                                                      index,
                                                      val
                                                    )
                                                  }
                                                >
                                                  <ListboxButton
                                                    placeholder="Add Category"
                                                    className="w-full max-w-[202px] h-[44px] px-[14px] py-[10px] flex items-center justify-start border border-gray-300 rounded-[5px]"
                                                    onFocus={() =>
                                                      setActiveCategoryIndex(
                                                        index
                                                      )
                                                    }
                                                  >
                                                    {({ value }) => (
                                                      <span className="truncate block">
                                                        {value ||
                                                          "Add Category"}
                                                      </span>
                                                    )}
                                                  </ListboxButton>
                                                  <ListboxOptions>
                                                    {getAvailableCategoriesForIndex(
                                                      index
                                                    ).map((category) => (
                                                      <ListboxOption
                                                        key={category}
                                                        value={category}
                                                      >
                                                        {category}
                                                      </ListboxOption>
                                                    ))}
                                                  </ListboxOptions>
                                                </Listbox>
                                              </div>

                                              <TagsInputRoot
                                                value={
                                                  infoCategories[index]
                                                    .subCategories
                                                }
                                                onValueChange={(details) => {
                                                  const opts =
                                                    activeCategoryIndex ===
                                                    index
                                                      ? subCategoryOptions
                                                      : getSubCategoryOptionsForCategory(
                                                          infoCategories[index]
                                                            .category
                                                        )
                                                  const optsLower = new Set(
                                                    opts.map((o) =>
                                                      o.toLowerCase()
                                                    )
                                                  )
                                                  const sanitized =
                                                    details.value
                                                      .map((v) => {
                                                        if (
                                                          optsLower.has(
                                                            v.toLowerCase()
                                                          )
                                                        )
                                                          return v
                                                        return v
                                                          .replace(
                                                            /[^a-zA-Z0-9 ]/g,
                                                            ""
                                                          )
                                                          .trim()
                                                          .toLowerCase()
                                                          .replace(
                                                            /\b\w/g,
                                                            (c) =>
                                                              c.toUpperCase()
                                                          )
                                                      })
                                                      .filter(
                                                        (v) => v.length > 0
                                                      )
                                                  handleInfoSubCategoryChange(
                                                    index,
                                                    sanitized
                                                  )
                                                }}
                                                className="space-y-1.5"
                                              >
                                                <TagsInputContext>
                                                  {(tagsInput) => (
                                                    <TagsInputControl className="relative pr-[28px] flex flex-wrap !justify-start !items-start !text-left w-full max-w-[679px] h-auto rounded-[5px] border border-gray-300 px-[14px] py-[10px] m-0">
                                                      {tagsInput.value.map(
                                                        (value, vi) => (
                                                          <TagsInputItem
                                                            key={vi}
                                                            index={vi}
                                                            value={value}
                                                          >
                                                            <TagsInputItemPreview
                                                              visual="primary"
                                                              size="md"
                                                              className="pr-2 text-primary-500 bg-primary-50 animate-in fade-in-0 zoom-in-95 duration-200"
                                                            >
                                                              <TagsInputItemText>
                                                                {value}
                                                              </TagsInputItemText>
                                                              <TagsInputItemDeleteTrigger className="opacity-50 hover:opacity-100">
                                                                <X2 className="size-3" />
                                                              </TagsInputItemDeleteTrigger>
                                                            </TagsInputItemPreview>
                                                            <TagsInputItemInput />
                                                          </TagsInputItem>
                                                        )
                                                      )}
                                                      <TagsInputInput
                                                        portalDropdown
                                                        placeholder={
                                                          tagsInput.value.length
                                                            ? ""
                                                            : "Add Sub-Category(s)"
                                                        }
                                                        options={
                                                          activeCategoryIndex ===
                                                          index
                                                            ? subCategoryOptions
                                                            : getSubCategoryOptionsForCategory(
                                                                infoCategories[
                                                                  index
                                                                ].category
                                                              )
                                                        }
                                                        allowCreateOption
                                                        className="flex-1 min-w-[100px]"
                                                        onInputValueChange={(
                                                          value
                                                        ) => {
                                                          fetchCategoriesAutocomplete(
                                                            index as 0 | 1 | 2,
                                                            value
                                                          )
                                                        }}
                                                        onFocus={() => {
                                                          setActiveCategoryIndex(
                                                            index
                                                          )
                                                          setSubCategoryOptions(
                                                            getSubCategoryOptionsForCategory(
                                                              infoCategories[
                                                                index
                                                              ].category
                                                            )
                                                          )
                                                        }}
                                                      />
                                                      <SearchMd className="size-4 shrink-0 absolute inset-y-0 right-3 my-auto text-gray-400" />
                                                    </TagsInputControl>
                                                  )}
                                                </TagsInputContext>
                                                <TagsInputHiddenInput />
                                              </TagsInputRoot>

                                              {infoCatErrors[index] && (
                                                <p className="text-xs text-red-500">
                                                  {infoCatErrors[index]}
                                                </p>
                                              )}
                                            </div>
                                          </div>
                                        ))}
                                      </div>

                                      {suggestedForDisplay.length > 0 && (
                                        <div className="mt-6 space-y-1.5">
                                          <span className="block text-xs leading-5 text-dark-blue-400">
                                            Suggested Categories
                                          </span>
                                          <div className="flex flex-wrap items-center gap-x-3 gap-y-2 max-w-full">
                                            {suggestedForDisplay.map(
                                              ({ category, subCategory }) => (
                                                <Badge
                                                  size="md"
                                                  className="pr-2 focus-visible:outline-none text-primary-500 bg-primary-50"
                                                  visual="primary"
                                                  asChild
                                                  key={category}
                                                >
                                                  <button
                                                    type="button"
                                                    onClick={() =>
                                                      handleSuggestedCategoryClick(
                                                        category,
                                                        subCategory
                                                      )
                                                    }
                                                  >
                                                    {category} / {subCategory}
                                                    <Plus2 className="size-3 opacity-50 hover:opacity-100" />
                                                  </button>
                                                </Badge>
                                              )
                                            )}
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </Tabs>
                              </div>

                              <div className="border-t border-gray-200 py-4 px-6 flex items-center justify-between">
                                <Button
                                  type="button"
                                  variant="link"
                                  visual="gray"
                                  onClick={() => setProjectInfoOpen(false)}
                                >
                                  <X className="size-[15px]" />
                                  Cancel
                                </Button>
                                <Button type="submit">Save</Button>
                              </div>
                            </form>
                          </DialogContent>
                        </Dialog>

                        <div id="section-Deliverables">
                          {Array.isArray(project.deliverables) &&
                          project.deliverables.length > 0 ? (
                            <ShowMoreLessRoot>
                              {({ isShowing, setIsShowing, scrollHeight }) => {
                                const needsOverflow = scrollHeight > 456
                                return (
                                <div
                                  className={cn(
                                    "relative border border-gray-200 bg-white rounded-lg p-6 shadow-[0px_1px_5px_0px_rgba(16,24,40,.02)] mt-6 transition-[height] duration-300 overflow-hidden [interpolate-size:allow-keywords]",
                                    needsOverflow && !isShowing && "h-[456px]",
                                    (isShowing || !needsOverflow) && "h-auto"
                                  )}
                                >
                                  <h2 className="text-xl leading-none text-dark-blue-400 font-semibold">
                                    Deliverables
                                  </h2>

                                  <div className="mt-6 flex flex-col">
                                    {(
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
                                          {(phase.items ?? [])
                                            .slice(0, 6)
                                            .map((item, i) => (
                                              <div
                                                key={`${item}-${i}`}
                                                className="flex items-center gap-x-3"
                                              >
                                                <span className="inline-flex size-3 items-center justify-center shrink-0 rounded-full bg-primary-500 text-white">
                                                  <Check className="size-2" />
                                                </span>
                                                <p className="text-sm font-extralight leading-tight text-dark-blue-400">
                                                  {formatDeliverable(item)}
                                                </p>
                                              </div>
                                            ))}
                                        </div>
                                      </div>
                                    ))}
                                  </div>

                                  <Alert className="mt-6">
                                    <AlertIcon>
                                      <AlertCircle className="h-5 w-5" />
                                    </AlertIcon>
                                    <AlertContent>
                                      <AlertDescription>
                                        The above list of deliverables is based
                                        on the current project scope and tasks.
                                        Deliverables are subject to change with
                                        any changes to the project scope or
                                        tasks.
                                      </AlertDescription>
                                    </AlertContent>
                                  </Alert>

                                  {needsOverflow && (
                                    isShowing ? (
                                      <div className="flex mt-6 items-center justify-center">
                                        <Button
                                          visual="gray"
                                          variant="link"
                                          onClick={() => setIsShowing(false)}
                                        >
                                          View Less
                                        </Button>
                                      </div>
                                    ) : (
                                      <div className="rounded-b-lg absolute inset-x-0 bottom-0 h-[136px] bg-[linear-gradient(180deg,theme(colors.white/0)_0%,theme(colors.white)_60%)] pb-[26px] flex justify-center items-end">
                                        <Button
                                          visual="gray"
                                          variant="link"
                                          onClick={() => setIsShowing(true)}
                                        >
                                          View More
                                        </Button>
                                      </div>
                                    )
                                  )}
                                </div>
                                )
                              }}
                            </ShowMoreLessRoot>
                          ) : (
                            <>
                              <div
                                className={cn(
                                  "border-2 rounded-lg p-6 mt-6 flex items-start justify-between",
                                  SHOW_PUBLISH_VALIDATION && publishAttempted
                                    ? "border-error-300 bg-error-50"
                                    : "border-gray-200 bg-gray-25"
                                )}
                              >
                                <div>
                                  <h1
                                    className={cn(
                                      "text-lg font-semibold",
                                      SHOW_PUBLISH_VALIDATION && publishAttempted
                                        ? "text-error-500"
                                        : "text-dark-blue-400"
                                    )}
                                  >
                                    Deliverables
                                  </h1>
                                  <p
                                    className={cn(
                                      "mt-1 text-sm font-light",
                                      SHOW_PUBLISH_VALIDATION && publishAttempted
                                        ? "text-error-500"
                                        : "text-dark-blue-400"
                                    )}
                                  >
                                    Your project deliverables will be displayed
                                    here once you add a scope to your offer. These
                                    deliverables are automatically generated based
                                    on the details in your scope and tasks,
                                    they&apos;re not directly editable.
                                  </p>
                                </div>
                                <Button
                                  variant="outlined"
                                  visual="gray"
                                  className={cn(
                                    "shrink-0 ml-[75px]",
                                    SHOW_PUBLISH_VALIDATION &&
                                      publishAttempted &&
                                      "text-error-500 border-error-300"
                                  )}
                                  onClick={() => {
                                    setSelected("View Project Scope")
                                    window.scrollTo({
                                      top: 0,
                                      behavior: "smooth",
                                    })
                                  }}
                                >
                                  <Plus className="size-[15px]" />
                                  Add Scope
                                </Button>
                              </div>
                              {SHOW_PUBLISH_VALIDATION && publishAttempted && (
                                <p className="mt-2 text-sm text-error-500">
                                  Please add a scope to your project
                                </p>
                              )}
                            </>
                          )}
                        </div>

                        <div id="section-Project Details">
                          {project.programmingLanguages?.length > 0 ||
                          project.developmentTech?.length > 0 ||
                          project.subcategories?.length > 0 ||
                          project.tags?.length > 0 ? (
                            <div
                              className={cn(
                                "mt-6 border gap-x-[50px] rounded-lg shadow-[0px_1px_5px_0px_rgba(16,24,40,.02)]",
                                publishAttempted && projectDetailsHasError
                                  ? "border-error-300 bg-error-25"
                                  : "border-gray-200 bg-white"
                              )}
                            >
                              <div className="p-6 border-b border-gray-200">
                                <div className="flex items-start justify-between">
                                  <h2 className="text-xl leading-none font-bold text-dark-blue-400">
                                    Project Details
                                  </h2>
                                  <IconButton
                                    className="rounded-full text-gray-500 hover:text-gray-800 shrink-0"
                                    variant="ghost"
                                    visual="gray"
                                    onClick={() => {
                                      setDetailsLangs(
                                        project.programmingLanguages ?? []
                                      )
                                      setDetailsTech(
                                        project.developmentTech ?? []
                                      )
                                      setDetailsIndustry(
                                        project.industries ?? []
                                      )
                                      setDetailsTags(project.tags ?? [])
                                      setDetailsSkills(project.skills ?? [])
                                      setDetailsTools(project.tools ?? [])
                                      setDetailsDialogOpen(true)
                                    }}
                                  >
                                    <Edit03 className="size-4" />
                                  </IconButton>
                                </div>

                                <div className="mt-6">
                                  <div className="grid gap-x-6 grid-cols-2">
                                    {project.programmingLanguages?.length >
                                      0 && (
                                      <div className="space-y-3">
                                        <h3 className="text-sm leading-none font-medium text-dark-blue-400">
                                          Programming Languages
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
                                                project.programmingLanguages
                                                  .length -
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
                                          Development Tech
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
                                                project.developmentTech.length -
                                                  1
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
                                          {(() => {
                                            const visible =
                                              project.subcategories.slice(0, 5)
                                            const remaining =
                                              project.subcategories.length -
                                              visible.length
                                            return (
                                              <>
                                                {visible.map(
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
                                                {remaining > 0 && (
                                                  <span className="text-sm text-gray-500">
                                                    + {remaining} more
                                                  </span>
                                                )}
                                              </>
                                            )
                                          })()}
                                        </div>
                                      </div>
                                    )}

                                    {project.tags?.length > 0 && (
                                      <div className="space-y-3">
                                        <h3 className="text-sm leading-none font-medium text-dark-blue-400">
                                          Tags
                                        </h3>
                                        <div className="gap-2 flex items-center flex-wrap">
                                          {(() => {
                                            const visible = project.tags.slice(
                                              0,
                                              5
                                            )
                                            const remaining =
                                              project.tags.length -
                                              visible.length
                                            return (
                                              <>
                                                {visible.map(
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
                                                {remaining > 0 && (
                                                  <span className="text-sm text-gray-500">
                                                    + {remaining} more
                                                  </span>
                                                )}
                                              </>
                                            )
                                          })()}
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
                                    isLead: boolean
                                    isOnline: boolean
                                  }
                                  const members = currentTeam as TeamMember[]
                                  // Profiles may deliver languages/skills/location
                                  // as objects ({ name, fluency, ... }); coerce to
                                  // display strings before rendering.
                                  const toName = (x: any): string =>
                                    typeof x === "string"
                                      ? x
                                      : (x?.name ?? x?.label ?? x?.title ?? "")
                                  const leadUserId = (
                                    (project as any).projectMembers ?? []
                                  ).find((pm: any) => pm.isLead)?.userId
                                  const foundLead =
                                    leadUserId != null
                                      ? members.find(
                                          (m: any) =>
                                            String(
                                              (m as any).userId ??
                                                (m as any).id ??
                                                ""
                                            ) === String(leadUserId)
                                        )
                                      : undefined
                                  const lead =
                                    foundLead ??
                                    members.find((m) => m.isLead) ??
                                    members[0]
                                  const showLeadBadge =
                                    !!foundLead || !!lead?.isLead
                                  const allLocations = Array.from(
                                    new Set(
                                      members
                                        .map((m) =>
                                          countryOf(toName(m.location))
                                        )
                                        .filter(Boolean)
                                    )
                                  )
                                  const allLanguages = Array.from(
                                    new Set(
                                      members.flatMap((m) =>
                                        (m.languages ?? []).map(toName)
                                      )
                                    )
                                  ).filter(Boolean)
                                  const allSkills = Array.from(
                                    new Set(
                                      members.flatMap((m) =>
                                        (m.skills ?? []).map(toName)
                                      )
                                    )
                                  ).filter(Boolean)
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
                                              {lead.firstName
                                                .charAt(0)
                                                .toUpperCase()}
                                            </AvatarFallback>
                                          </Avatar>
                                          <div className="space-y-1.5">
                                            <Badge
                                              className="rounded-[4px] bg-primary-50"
                                              visual="primary"
                                            >
                                              {showLeadBadge
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
                                              {lead.skills[0] ? (
                                                <span className="text-sm leading-none font-extralight text-dark-blue-400">
                                                  {lead.skills
                                                    .slice(0, 2)
                                                    .join(" · ")}
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
                                            <div className="gap-1 flex items-center flex-wrap">
                                              {allLocations.map((loc, i) => (
                                                <NextLink
                                                  key={loc}
                                                  href={`/talent?location=${encodeURIComponent(loc)}`}
                                                  className="focus-visible:outline-none duration-300 transition hover:underline inline-block text-sm leading-6 font-semibold text-dark-blue-400"
                                                >
                                                  {loc}
                                                  {i < allLocations.length - 1
                                                    ? ","
                                                    : ""}
                                                </NextLink>
                                              ))}
                                            </div>
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
                                                {visibleSkills.map(
                                                  (skill, i) => (
                                                    <NextLink
                                                      key={skill}
                                                      href={`/talent?skills=${encodeURIComponent(skill)}`}
                                                      className="focus-visible:outline-none hover:underline transition duration-300 inline-block text-sm leading-6 font-semibold text-dark-blue-400"
                                                    >
                                                      {skill}
                                                      {i <
                                                        visibleSkills.length -
                                                          1 ||
                                                      extraSkillCount > 0
                                                        ? ","
                                                        : ""}
                                                    </NextLink>
                                                  )
                                                )}
                                                {extraSkillCount > 0 && (
                                                  <span className="text-sm leading-6 font-semibold text-dark-blue-400">
                                                    and {extraSkillCount}{" "}
                                                    more...
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

                                  <div className="grid grid-cols-2 gap-x-6 mt-6">
                                    <div className="flex items-start gap-x-3">
                                      <Avatar size="lg">
                                        <AvatarImage src="/man.jpg" alt="Man" />
                                        <AvatarFallback>M</AvatarFallback>
                                      </Avatar>

                                      <div className="space-y-1.5">
                                        <Badge
                                          className="rounded-[4px] bg-primary-50"
                                          visual="primary"
                                        >
                                          Project Lead
                                        </Badge>

                                        <div className="flex flex-col gap-y-0.5">
                                          <span className="block text-sm leading-none text-gray-500 font-extralight">
                                            <span className="text-base font-bold text-dark-blue-400 ">
                                              Chris
                                            </span>{" "}
                                            @ux23isee
                                          </span>

                                          <span className="text-sm leading-none font-extralight text-dark-blue-400">
                                            Full Stack Designer
                                          </span>
                                        </div>
                                      </div>
                                    </div>

                                    <div className="space-y-3">
                                      <h3 className="flex items-center gap-x-[5.85px] text-sm leading-none font-extralight text-dark-blue-400">
                                        <MapPin className="size-[18px]" />{" "}
                                        Locations
                                      </h3>

                                      <div className="gap-1 flex items-center flex-wrap">
                                        <NextLink
                                          href="#"
                                          className="focus-visible:outline-none duration-300 transition hover:underline inline-block text-sm leading-6 font-semibold text-dark-blue-400"
                                        >
                                          USA,
                                        </NextLink>
                                        <NextLink
                                          href="#"
                                          className="focus-visible:outline-none duration-300 transition hover:underline inline-block text-sm leading-6 font-semibold text-dark-blue-400"
                                        >
                                          UK,
                                        </NextLink>
                                        <NextLink
                                          href="#"
                                          className="focus-visible:outline-none duration-300 transition hover:underline inline-block text-sm leading-6 font-semibold text-dark-blue-400"
                                        >
                                          Brazil,
                                        </NextLink>
                                        <NextLink
                                          href="#"
                                          className="focus-visible:outline-none duration-300 transition hover:underline inline-block text-sm leading-6 font-semibold text-dark-blue-400"
                                        >
                                          and 1 more...
                                        </NextLink>
                                      </div>
                                    </div>
                                  </div>

                                  <div className="mt-6 grid grid-cols-2 gap-x-6">
                                    <div className="space-y-3">
                                      <h3 className="flex items-center gap-x-[5.85px] text-sm leading-none font-extralight text-dark-blue-400">
                                        <MessageTextSquare01 className="size-[18px]" />{" "}
                                        Languages
                                      </h3>

                                      <div className="gap-1 flex items-center flex-wrap">
                                        <NextLink
                                          href="#"
                                          className="focus-visible:outline-none duration-300 transition hover:underline inline-block text-sm leading-6 font-semibold text-dark-blue-400"
                                        >
                                          English,
                                        </NextLink>
                                        <NextLink
                                          href="#"
                                          className="focus-visible:outline-none duration-300 transition hover:underline inline-block text-sm leading-6 font-semibold text-dark-blue-400"
                                        >
                                          Spanish,
                                        </NextLink>
                                        <NextLink
                                          href="#"
                                          className="focus-visible:outline-none duration-300 transition hover:underline inline-block text-sm leading-6 font-semibold text-dark-blue-400"
                                        >
                                          French
                                        </NextLink>
                                      </div>
                                    </div>

                                    <div className="space-y-3">
                                      <h3 className="flex items-center gap-x-[5.85px] text-sm leading-none font-extralight text-dark-blue-400">
                                        <Stars02 className="size-[18px]" />{" "}
                                        Skills & Expertise
                                      </h3>

                                      <div className="gap-1 flex items-center flex-wrap">
                                        <NextLink
                                          href="#"
                                          className="focus-visible:outline-none hover:underline transition duration-300 inline-block text-sm leading-6 font-semibold text-dark-blue-400"
                                        >
                                          Performance,
                                        </NextLink>
                                        <NextLink
                                          href="#"
                                          className="focus-visible:outline-none hover:underline transition duration-300 inline-block text-sm leading-6 font-semibold text-dark-blue-400"
                                        >
                                          Security,
                                        </NextLink>
                                        <NextLink
                                          href="#"
                                          className="focus-visible:outline-none hover:underline transition duration-300 inline-block text-sm leading-6 font-semibold text-dark-blue-400"
                                        >
                                          Operating Systems,
                                        </NextLink>
                                        <NextLink
                                          href="#"
                                          className="focus-visible:outline-none hover:underline transition duration-300 inline-block text-sm leading-6 font-semibold text-dark-blue-400"
                                        >
                                          Design,
                                        </NextLink>
                                        <NextLink
                                          href="#"
                                          className="focus-visible:outline-none hover:underline transition duration-300 inline-block text-sm leading-6 font-semibold text-dark-blue-400"
                                        >
                                          Databases,
                                        </NextLink>
                                        <NextLink
                                          href="#"
                                          className="focus-visible:outline-none hover:underline transition duration-300 inline-block text-sm leading-6 font-semibold text-dark-blue-400"
                                        >
                                          and 1 more...
                                        </NextLink>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                          ) : (
                            <>
                            <div
                              className={cn(
                                "mt-6 p-6 border-2 rounded-lg flex items-start justify-between",
                                  SHOW_PUBLISH_VALIDATION && publishAttempted
                                    ? "border-error-300 bg-error-50"
                                    : "border-gray-200 bg-gray-25"
                                )}
                              >
                                <div>
                                  <h1
                                    className={cn(
                                      "text-lg font-semibold",
                                      SHOW_PUBLISH_VALIDATION && publishAttempted
                                        ? "text-error-500"
                                        : "text-dark-blue-400"
                                    )}
                                  >
                                    Project Details
                                  </h1>
                                  <p
                                    className={cn(
                                      "mt-1 text-sm font-light",
                                      SHOW_PUBLISH_VALIDATION && publishAttempted
                                        ? "text-error-500"
                                        : "text-dark-blue-400"
                                    )}
                                  >
                                    Your project deliverables will be displayed
                                    here once you add a scope to your offer.
                                    These deliverables are automatically
                                    generated based on the details in your scope
                                    and tasks, they&apos;re not directly
                                    editable.
                                  </p>
                                </div>
                                <Button
                                  variant="outlined"
                                  visual="gray"
                                  className={cn(
                                    "shrink-0 ml-[75px]",
                                    SHOW_PUBLISH_VALIDATION &&
                                      publishAttempted &&
                                      "text-error-500 border-error-300"
                                  )}
                                  onClick={() => {
                                    setDetailsLangs(
                                      project.programmingLanguages ?? []
                                    )
                                    setDetailsTech(
                                      project.developmentTech ?? []
                                    )
                                    setDetailsIndustry(project.industries ?? [])
                                    setDetailsTags(project.tags ?? [])
                                    setDetailsSkills(project.skills ?? [])
                                    setDetailsTools(project.tools ?? [])
                                    setDetailsDialogOpen(true)
                                  }}
                                >
                                  <Plus className="size-[15px]" />
                                  Add Details
                                </Button>
                              </div>
                              {SHOW_PUBLISH_VALIDATION && publishAttempted && (
                                <p className="mt-2 text-sm text-error-500">
                                  Please add your project details
                                </p>
                              )}

                              {/* About the Team — empty state */}
                              <div className="mt-6 p-6 bg-white rounded-lg border border-gray-200">
                                <div className="flex items-center justify-between">
                                  <h3 className="text-base leading-none font-semibold text-dark-blue-400">
                                    About the Team
                                  </h3>
                                  <IconButton
                                    className="rounded-full text-gray-500 hover:text-gray-800"
                                    variant="ghost"
                                    visual="gray"
                                    onClick={() => {
                                      setTeamTab("Team Lead")
                                      setTeamDialogOpen(true)
                                    }}
                                  >
                                    <Edit03 className="size-4" />
                                  </IconButton>
                                </div>

                                <p className="mt-2 text-sm font-light text-dark-blue-400">
                                  Your team members will be displayed here once
                                  you add them to your project. Click the edit
                                  button to manage your team.
                                </p>
                              </div>
                            </>
                          )}

                          {/* Project Details Dialog */}
                          <Dialog
                            open={detailsDialogOpen}
                            onOpenChange={setDetailsDialogOpen}
                          >
                            <DialogContent className="max-w-[748px] p-0 gap-0">
                              <div className="px-6 pt-6 pb-4">
                                <div className="flex items-start justify-between">
                                  <div>
                                    <h2 className="text-lg font-bold text-dark-blue-400">
                                      Project Details
                                    </h2>
                                    <p className="mt-1 text-sm font-light text-dark-blue-400">
                                      Create a connection and let clients feel
                                      like they already know you!
                                    </p>
                                  </div>
                                  <DialogClose asChild>
                                    <IconButton
                                      variant="ghost"
                                      visual="gray"
                                      size="sm"
                                    >
                                      <X className="size-5" />
                                    </IconButton>
                                  </DialogClose>
                                </div>
                              </div>

                              <ScrollArea
                                className="max-h-[60vh] border-t border-gray-200"
                                viewportClassName="!h-auto !max-h-[60vh] [&>div]:!h-auto"
                                scrollBar={<ScrollBar className="w-4 p-1" />}
                              >
                                <div className="px-6 py-6 space-y-6">
                                {[
                                  {
                                    label: "Programming Languages",
                                    desc: "Add up to 10 programming languages that will be used in this project.",
                                    max: 10,
                                    value: detailsLangs,
                                    onChange: setDetailsLangs,
                                    placeholder: "Add Programming Languages",
                                    acType: "skills",
                                    options: langOptions,
                                    setOptions: setLangOptions,
                                  },
                                  {
                                    label: "Development Tech",
                                    desc: "Add up to 10 technologies that will be used in this project",
                                    max: 10,
                                    value: detailsTech,
                                    onChange: setDetailsTech,
                                    placeholder: "Add Technologies",
                                    acType: "skills",
                                    options: techOptions,
                                    setOptions: setTechOptions,
                                  },
                                  {
                                    label: "Industry",
                                    desc: "Add up to 5 industries that align with your project scope for targeted visibility.",
                                    max: 5,
                                    min: 1,
                                    value: detailsIndustry,
                                    onChange: setDetailsIndustry,
                                    placeholder: "Add Industries",
                                    acType: "industries",
                                    options: industryOptions,
                                    setOptions: setIndustryOptions,
                                  },
                                  {
                                    label: "Tags",
                                    desc: "Add up to 10 tags that align with your project scope for targeted visibility.",
                                    max: 10,
                                    min: 3,
                                    value: detailsTags,
                                    onChange: setDetailsTags,
                                    placeholder: "Add Tags",
                                    acType: "search_keywords",
                                    options: tagOptions,
                                    setOptions: setTagOptions,
                                  },
                                  {
                                    label: "Skills",
                                    desc: "List up to 10 key skills or proficiencies required to implement this template effectively.",
                                    max: 10,
                                    min: 3,
                                    value: detailsSkills,
                                    onChange: setDetailsSkills,
                                    placeholder: "Add Skills",
                                    acType: "skills",
                                    options: skillOptions,
                                    setOptions: setSkillOptions,
                                  },
                                  {
                                    label: "Tools",
                                    desc: "Add up to 10 tools that align with your project scope for targeted visibility.",
                                    max: 10,
                                    value: detailsTools,
                                    onChange: setDetailsTools,
                                    placeholder: "Add Tools",
                                    acType: "skills",
                                    options: toolOptions,
                                    setOptions: setToolOptions,
                                  },
                                ].map((field) => (
                                  <div key={field.label}>
                                    <div className="flex items-start justify-between">
                                      <div>
                                        <h3 className="text-sm font-bold text-dark-blue-400">
                                          {field.label}
                                        </h3>
                                        <p className="mt-0.5 text-xs font-light text-dark-blue-400">
                                          {field.desc}
                                        </p>
                                      </div>
                                      <span className="text-xs text-gray-500 shrink-0 ml-4">
                                        {field.value.length}/{field.max}
                                      </span>
                                    </div>
                                    <TagsInputRoot
                                      className="mt-2 space-y-1.5"
                                      value={field.value}
                                      onValueChange={(d) => {
                                        const optionsLower = new Set(
                                          field.options.map((o) =>
                                            o.toLowerCase()
                                          )
                                        )
                                        const sanitized = d.value
                                          .map((v) => {
                                            if (
                                              optionsLower.has(v.toLowerCase())
                                            )
                                              return v
                                            return v
                                              .replace(/[^a-zA-Z0-9 ]/g, "")
                                              .trim()
                                              .toLowerCase()
                                              .replace(/\b\w/g, (c) =>
                                                c.toUpperCase()
                                              )
                                          })
                                          .filter((v) => v.length > 0)
                                        field.onChange(
                                          sanitized.slice(0, field.max)
                                        )
                                      }}
                                    >
                                      <TagsInputContext>
                                        {(tagsInput) => (
                                          <>
                                            <TagsInputControl className="relative pr-[28px]">
                                              {tagsInput.value.map(
                                                (value, vi) => (
                                                  <TagsInputItem
                                                    key={vi}
                                                    index={vi}
                                                    value={value}
                                                  >
                                                    <TagsInputItemPreview
                                                      visual="primary"
                                                      size="md"
                                                      className="pr-2 text-primary-500 bg-primary-50 animate-in fade-in-0 zoom-in-95 duration-200"
                                                    >
                                                      <TagsInputItemText>
                                                        {value}
                                                      </TagsInputItemText>
                                                      <TagsInputItemDeleteTrigger className="opacity-50 hover:opacity-100">
                                                        <X2 className="size-3" />
                                                      </TagsInputItemDeleteTrigger>
                                                    </TagsInputItemPreview>
                                                    <TagsInputItemInput />
                                                  </TagsInputItem>
                                                )
                                              )}
                                              <TagsInputInput
                                                portalDropdown
                                                options={field.options}
                                                placeholder={
                                                  tagsInput.value.length
                                                    ? ""
                                                    : field.placeholder
                                                }
                                                allowCreateOption
                                                onInputValueChange={(value) => {
                                                  fetchTypeAutocomplete(
                                                    field.acType,
                                                    value,
                                                    field.setOptions
                                                  )
                                                }}
                                              />
                                              <SearchMd className="size-4 shrink-0 absolute inset-y-0 right-3 my-auto text-gray-400" />
                                            </TagsInputControl>
                                          </>
                                        )}
                                      </TagsInputContext>
                                      <TagsInputHiddenInput />
                                    </TagsInputRoot>
                                    {field.min != null &&
                                      field.value.length < field.min && (
                                        <p className="mt-1.5 text-xs text-error-500">
                                          Please add at least {field.min}{" "}
                                          {field.label.toLowerCase()}
                                        </p>
                                      )}
                                  </div>
                                ))}

                                {/* Sub-Categories */}
                                <div className="rounded-lg bg-primary-50 p-4">
                                  <div className="flex items-start justify-between">
                                    <div>
                                      <h3 className="text-sm font-bold text-dark-blue-400">
                                        Sub-Categories
                                      </h3>
                                      <p className="mt-0.5 text-xs font-light text-dark-blue-400">
                                        Here are your current subcategories.
                                        Click on &quot;Edit Categories&quot; to
                                        update them on the Project Info page.
                                      </p>
                                    </div>
                                    <Button
                                      variant="outlined"
                                      visual="gray"
                                      className="shrink-0 ml-4 bg-white"
                                      onClick={() => {
                                        setDetailsDialogOpen(false)
                                        setProjectInfoOpen(true)
                                        setInfoTab("Categories")
                                      }}
                                    >
                                      <Edit03 className="size-[15px]" />
                                      Edit Categories
                                    </Button>
                                  </div>
                                  {infoCategories.some(
                                    (c) => c.subCategories.length > 0
                                  ) && (
                                    <div className="mt-3 flex flex-wrap gap-1.5">
                                      {infoCategories
                                        .flatMap((c) => c.subCategories)
                                        .slice(0, 4)
                                        .map((sc, i) => (
                                          <Badge
                                            key={`${sc}-${i}`}
                                            visual="primary"
                                            className="rounded-[4px] bg-primary-100"
                                          >
                                            {sc}
                                          </Badge>
                                        ))}
                                      {infoCategories.flatMap(
                                        (c) => c.subCategories
                                      ).length > 4 && (
                                        <span className="text-sm font-medium text-dark-blue-400">
                                          +{" "}
                                          {infoCategories.flatMap(
                                            (c) => c.subCategories
                                          ).length - 4}{" "}
                                          more
                                        </span>
                                      )}
                                    </div>
                                  )}
                                </div>
                              </div>
                              </ScrollArea>

                              <div className="border-t border-gray-200 py-4 px-6 flex items-center justify-between">
                                <Button
                                  type="button"
                                  variant="link"
                                  visual="gray"
                                  onClick={() => setDetailsDialogOpen(false)}
                                >
                                  <X className="size-[15px]" />
                                  Cancel
                                </Button>
                                <Button
                                  disabled={
                                    detailsLangs.length === 0 &&
                                    detailsTech.length === 0 &&
                                    detailsIndustry.length === 0 &&
                                    detailsTags.length === 0 &&
                                    detailsSkills.length === 0 &&
                                    detailsTools.length === 0
                                  }
                                  onClick={() => {
                                    setProject((prev: any) => ({
                                      ...prev,
                                      programmingLanguages: detailsLangs,
                                      developmentTech: detailsTech,
                                      industries: detailsIndustry,
                                      tags: detailsTags,
                                      skills: detailsSkills,
                                      tools: detailsTools,
                                    }))
                                    setDetailsDialogOpen(false)
                                    saveProjectFields({
                                      programmingLanguages: detailsLangs,
                                      developmentTech: detailsTech,
                                      industries: detailsIndustry,
                                      tags: detailsTags,
                                      skills: detailsSkills,
                                      tools: detailsTools,
                                    })
                                  }}
                                >
                                  Save
                                </Button>
                              </div>
                            </DialogContent>
                          </Dialog>

                          {/* About The Team Dialog */}
                          <Dialog
                            open={teamDialogOpen}
                            onOpenChange={setTeamDialogOpen}
                          >
                            <DialogContent className="max-w-[748px] p-0 gap-0">
                              <div className="px-6 pt-6">
                                <div className="flex items-start justify-between">
                                  <h2 className="text-lg font-bold text-dark-blue-400">
                                    About The Team
                                  </h2>
                                  <DialogClose asChild>
                                    <IconButton
                                      variant="ghost"
                                      visual="gray"
                                      size="sm"
                                    >
                                      <X className="size-5" />
                                    </IconButton>
                                  </DialogClose>
                                </div>

                                <Tabs
                                  value={teamTab}
                                  onValueChange={setTeamTab}
                                  className="mt-4"
                                >
                                  <TabsList className="border-b border-gray-200 w-full justify-start">
                                    <TabsTrigger value="Team Lead">
                                      Team Lead
                                    </TabsTrigger>
                                    <TabsTrigger value="Team Members">
                                      Team Members
                                    </TabsTrigger>
                                  </TabsList>

                                  <TabsContent
                                    value="Team Lead"
                                    className="pt-6 pb-6"
                                  >
                                    {(() => {
                                      const effectiveLeadId =
                                        originalLeadId || ownerId
                                      const currentLead =
                                        projectAssignees.find(
                                          (m: any) => m.id === effectiveLeadId
                                        ) ?? projectAssignees[0]
                                      const pendingLead =
                                        teamLeadId &&
                                        teamLeadId !== currentLead?.id
                                          ? projectAssignees.find(
                                              (m: any) => m.id === teamLeadId
                                            )
                                          : null
                                      const q = leadSearch.trim().toLowerCase()
                                      const candidates =
                                        projectAssignees.filter(
                                          (m: any) =>
                                            m.id !== currentLead?.id &&
                                            (!q ||
                                              m.firstName
                                                ?.toLowerCase()
                                                .includes(q) ||
                                              m.username
                                                ?.toLowerCase()
                                                .includes(q))
                                        )
                                      return (
                                        <>
                                          <div>
                                            <span className="text-sm font-semibold text-dark-blue-400">
                                              Current Team Lead
                                            </span>
                                            <div className="mt-3 flex items-center justify-between">
                                              <div className="flex items-center gap-x-3">
                                                <Avatar size="md">
                                                  <AvatarImage
                                                    src={
                                                      currentLead?.avatarUrl ||
                                                      undefined
                                                    }
                                                    alt={currentLead?.firstName}
                                                  />
                                                  <AvatarFallback>
                                                    {currentLead?.firstName?.charAt(
                                                      0
                                                    ) || "U"}
                                                  </AvatarFallback>
                                                </Avatar>
                                                <div>
                                                  <span className="text-sm font-bold text-dark-blue-400">
                                                    {currentLead?.firstName ||
                                                      "—"}
                                                  </span>
                                                  {currentLead?.username && (
                                                    <span className="text-sm font-light text-gray-500">
                                                      {" "}
                                                      @{currentLead.username}
                                                    </span>
                                                  )}
                                                  {currentLead?.jobTitle && (
                                                    <p className="text-xs font-light text-dark-blue-400">
                                                      {currentLead.jobTitle}
                                                    </p>
                                                  )}
                                                </div>
                                              </div>
                                              {teamLeadLabel && (
                                                <Badge
                                                  visual="primary"
                                                  className="rounded-[4px] bg-primary-50"
                                                >
                                                  {teamLeadLabel}
                                                </Badge>
                                              )}
                                            </div>
                                          </div>

                                          <div className="mt-8 grid grid-cols-2 gap-x-6">
                                            <div>
                                              {pendingLead ? (
                                                <>
                                                  <span className="text-sm font-semibold text-dark-blue-400">
                                                    New Team Lead
                                                  </span>
                                                  <div className="mt-3 flex items-center justify-between">
                                                    <div className="flex items-center gap-x-3">
                                                      <Avatar size="md">
                                                        <AvatarImage
                                                          src={
                                                            pendingLead.avatarUrl ||
                                                            undefined
                                                          }
                                                          alt={
                                                            pendingLead.firstName
                                                          }
                                                        />
                                                        <AvatarFallback>
                                                          {pendingLead.firstName?.charAt(
                                                            0
                                                          ) || "U"}
                                                        </AvatarFallback>
                                                      </Avatar>
                                                      <div>
                                                        <span className="text-sm font-bold text-dark-blue-400">
                                                          {pendingLead.firstName}
                                                        </span>
                                                        {pendingLead.jobTitle && (
                                                          <p className="text-xs font-light text-dark-blue-400">
                                                            {
                                                              pendingLead.jobTitle
                                                            }
                                                          </p>
                                                        )}
                                                      </div>
                                                    </div>
                                                    <button
                                                      type="button"
                                                      className="text-sm font-semibold text-gray-700 hover:text-dark-blue-400 focus-visible:outline-none"
                                                      onClick={() =>
                                                        setTeamLeadId(null)
                                                      }
                                                    >
                                                      Remove
                                                    </button>
                                                  </div>
                                                </>
                                              ) : (
                                                <>
                                                  <span className="text-sm font-semibold text-dark-blue-400">
                                                    Assign Project Lead
                                                  </span>
                                                  <InputGroup className="mt-2">
                                                    <Input
                                                      placeholder="Search team members"
                                                      value={leadSearch}
                                                      onChange={(e) =>
                                                        setLeadSearch(
                                                          e.target.value
                                                        )
                                                      }
                                                    />
                                                    <InputLeftElement>
                                                      <SearchMd className="text-gray-500 h-4 w-4" />
                                                    </InputLeftElement>
                                                  </InputGroup>
                                                  {leadSearch && (
                                                    <ScrollArea
                                                      className="mt-1 rounded-lg border border-gray-100 bg-white shadow-lg"
                                                      scrollBar={<ScrollBar className="w-4 p-1" />}
                                                      viewportClassName="max-h-[240px]"
                                                    >
                                                      {candidates.length > 0 ? (
                                                        candidates.map(
                                                          (m: any) => (
                                                            <button
                                                              key={m.id}
                                                              type="button"
                                                              className="w-full flex items-center gap-x-2 px-3 py-2 text-left hover:bg-gray-50"
                                                              onClick={() => {
                                                                setTeamLeadId(
                                                                  m.id
                                                                )
                                                                setLeadSearch("")
                                                              }}
                                                            >
                                                              <Avatar size="sm">
                                                                <AvatarImage
                                                                  src={
                                                                    m.avatarUrl ||
                                                                    undefined
                                                                  }
                                                                  alt={
                                                                    m.firstName
                                                                  }
                                                                />
                                                                <AvatarFallback>
                                                                  {m.firstName?.charAt(
                                                                    0
                                                                  ) || "U"}
                                                                </AvatarFallback>
                                                              </Avatar>
                                                              <div>
                                                                <span className="text-sm font-semibold text-dark-blue-400">
                                                                  {m.firstName}
                                                                </span>
                                                                {m.username && (
                                                                  <span className="text-sm font-light text-gray-500">
                                                                    {" "}
                                                                    @{m.username}
                                                                  </span>
                                                                )}
                                                                {m.jobTitle && (
                                                                  <p className="text-xs font-light text-dark-blue-400">
                                                                    {m.jobTitle}
                                                                  </p>
                                                                )}
                                                              </div>
                                                            </button>
                                                          )
                                                        )
                                                      ) : (
                                                        <div className="px-3 py-2 text-sm font-light text-gray-500">
                                                          No matching members.
                                                        </div>
                                                      )}
                                                    </ScrollArea>
                                                  )}
                                                </>
                                              )}
                                            </div>
                                            <div>
                                              <span className="text-sm font-semibold text-dark-blue-400 inline-flex items-center gap-x-1">
                                                Select Label
                                                <TooltipProvider>
                                                  <Tooltip>
                                                    <TooltipTrigger asChild>
                                                      <HelpCircle className="size-3.5 text-gray-400 cursor-help" />
                                                    </TooltipTrigger>
                                                    <TooltipContent>
                                                      Assign a role label to the
                                                      team lead
                                                    </TooltipContent>
                                                  </Tooltip>
                                                </TooltipProvider>
                                              </span>
                                              <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                  <button
                                                    type="button"
                                                    className="mt-2 inline-flex h-[44px] w-full items-center justify-between rounded-lg border border-gray-200 bg-gray-50 px-3 text-sm hover:border-gray-300 focus-visible:outline-none"
                                                  >
                                                    <span
                                                      className={
                                                        teamLeadLabel
                                                          ? "text-dark-blue-400"
                                                          : "text-gray-500"
                                                      }
                                                    >
                                                      {teamLeadLabel ||
                                                        "None selected"}
                                                    </span>
                                                    <ChevronDown className="size-4 text-gray-500" />
                                                  </button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent
                                                  align="start"
                                                  style={{
                                                    width:
                                                      "var(--radix-dropdown-menu-trigger-width)",
                                                  }}
                                                >
                                                  {[
                                                    "Account Manager",
                                                    "Project Manager",
                                                    "Client Relations Manager",
                                                    "Team Manager",
                                                  ].map((l) => (
                                                    <DropdownMenuItem
                                                      key={l}
                                                      onClick={() =>
                                                        setTeamLeadLabel(l)
                                                      }
                                                    >
                                                      {l}
                                                    </DropdownMenuItem>
                                                  ))}
                                                  <DropdownMenuSeparator />
                                                  <DropdownMenuItem
                                                    onClick={() =>
                                                      setTeamLeadLabel(
                                                        "Use Profile Job Title"
                                                      )
                                                    }
                                                  >
                                                    Use Profile Job Title
                                                  </DropdownMenuItem>
                                                  <DropdownMenuItem
                                                    onClick={() =>
                                                      setTeamLeadLabel(
                                                        "Create Custom Label"
                                                      )
                                                    }
                                                  >
                                                    Create Custom Label
                                                  </DropdownMenuItem>
                                                </DropdownMenuContent>
                                              </DropdownMenu>
                                            </div>
                                          </div>
                                        </>
                                      )
                                    })()}
                                  </TabsContent>

                                  <TabsContent
                                    value="Team Members"
                                    className="pt-6 pb-6"
                                  >
                                    <div className="flex items-start justify-between">
                                      <div>
                                        <h3 className="text-sm font-semibold text-dark-blue-400">
                                          All assignees ({projectAssignees.length})
                                        </h3>
                                        <p className="mt-1 text-xs font-light text-dark-blue-400">
                                          View and manage all users currently
                                          assigned to this project below.
                                        </p>
                                      </div>
                                      <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                          <Button
                                            variant="outlined"
                                            visual="gray"
                                          >
                                            <Plus className="size-[15px]" />
                                            Add Team Member
                                          </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent
                                          align="end"
                                          className="w-[260px]"
                                        >
                                          {addableMembers.length > 0 ? (
                                            addableMembers.map((m: any) => (
                                              <DropdownMenuItem
                                                key={m.id}
                                                onClick={() =>
                                                  addMemberToProject(m.id)
                                                }
                                              >
                                                <div className="flex items-center gap-x-2">
                                                  <Avatar size="sm">
                                                    <AvatarImage
                                                      src={
                                                        m.avatarUrl || undefined
                                                      }
                                                      alt={m.firstName}
                                                    />
                                                    <AvatarFallback>
                                                      {m.firstName?.charAt(0) ||
                                                        "U"}
                                                    </AvatarFallback>
                                                  </Avatar>
                                                  <div>
                                                    <span className="text-sm font-medium text-dark-blue-400">
                                                      {m.firstName}
                                                    </span>
                                                    {m.username && (
                                                      <span className="text-xs font-light text-gray-500">
                                                        {" "}
                                                        @{m.username}
                                                      </span>
                                                    )}
                                                  </div>
                                                </div>
                                              </DropdownMenuItem>
                                            ))
                                          ) : (
                                            <DropdownMenuItem
                                              disabled
                                              className="text-gray-500"
                                            >
                                              Everyone on your team is already
                                              added
                                            </DropdownMenuItem>
                                          )}
                                          <DropdownMenuItem
                                            onClick={() =>
                                              inviteWindow.toggle(
                                                true,
                                                "Invite Team Members"
                                              )
                                            }
                                          >
                                            <Plus className="size-3.5" />
                                            Invite new member…
                                          </DropdownMenuItem>
                                        </DropdownMenuContent>
                                      </DropdownMenu>
                                    </div>

                                    <ScrollArea
                                      className="mt-6"
                                      scrollBar={<ScrollBar className="w-4 p-1" />}
                                      viewportClassName="max-h-[40vh]"
                                    >
                                      <Table>
                                        <TableHeader>
                                          <TableRow className="hover:bg-transparent">
                                            <TableHead className="text-xs font-medium text-gray-500">
                                              Name
                                            </TableHead>
                                            <TableHead className="text-xs font-medium text-gray-500">
                                              Project Role
                                            </TableHead>
                                            <TableHead className="text-xs font-medium text-gray-500">
                                              Status
                                            </TableHead>
                                            <TableHead className="w-[40px]" />
                                          </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                          {projectAssignees.map(
                                            (member: any, mi: number) => {
                                              const isOwner = ownerId
                                                ? String(member.id) === ownerId
                                                : mi === 0
                                              const isYou =
                                                !!user &&
                                                (String(member.id) ===
                                                  String((user as any).id) ||
                                                  (!!member.username &&
                                                    member.username ===
                                                      (user as any).username))
                                              const role = isOwner
                                                ? "Owner"
                                                : memberRoles[member.id] ??
                                                  "Contributor"
                                              const status =
                                                memberStatus[member.id] ??
                                                "Active"
                                              return (
                                                <TableRow key={member.id || mi}>
                                                  <TableCell className="py-4">
                                                    <div className="flex items-center gap-x-3">
                                                      <Avatar size="sm">
                                                        <AvatarImage
                                                          src={
                                                            member.avatarUrl ||
                                                            undefined
                                                          }
                                                          alt={member.firstName}
                                                        />
                                                        <AvatarFallback>
                                                          {member.firstName?.charAt(
                                                            0
                                                          ) || "U"}
                                                        </AvatarFallback>
                                                      </Avatar>
                                                      <div>
                                                        <span className="text-sm font-semibold text-dark-blue-400">
                                                          {member.firstName}
                                                        </span>
                                                        {member.username && (
                                                          <span className="text-sm font-light text-gray-500">
                                                            {" "}
                                                            @{member.username}
                                                          </span>
                                                        )}
                                                        {isYou && (
                                                          <span className="text-sm font-semibold text-dark-blue-400">
                                                            {" "}
                                                            (You)
                                                          </span>
                                                        )}
                                                        {member.jobTitle && (
                                                          <p className="text-xs font-light text-dark-blue-400">
                                                            {member.jobTitle}
                                                          </p>
                                                        )}
                                                      </div>
                                                    </div>
                                                  </TableCell>
                                                  <TableCell className="py-4">
                                                    {isOwner ? (
                                                      <div className="inline-flex h-[36px] w-[150px] items-center justify-between rounded-lg border border-gray-200 bg-gray-50 px-3 text-sm text-gray-500">
                                                        Owner
                                                        <ChevronDown className="size-4 opacity-50" />
                                                      </div>
                                                    ) : (
                                                      <DropdownMenu>
                                                        <DropdownMenuTrigger
                                                          asChild
                                                        >
                                                          <button
                                                            type="button"
                                                            className="inline-flex h-[36px] w-[150px] items-center justify-between rounded-lg border border-gray-200 bg-white px-3 text-sm text-dark-blue-400 hover:border-gray-300 focus-visible:outline-none"
                                                          >
                                                            {role}
                                                            <ChevronDown className="size-4 text-gray-500" />
                                                          </button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent
                                                          align="start"
                                                          className="w-[288px]"
                                                        >
                                                          {[
                                                            "Manager",
                                                            "Contributor",
                                                            "Viewer",
                                                          ].map((r) => (
                                                            <DropdownMenuItem
                                                              key={r}
                                                              className="flex flex-col items-start gap-0.5 py-2"
                                                              onClick={() =>
                                                                setMemberRoles(
                                                                  (mr) => ({
                                                                    ...mr,
                                                                    [member.id]:
                                                                      r,
                                                                  })
                                                                )
                                                              }
                                                            >
                                                              <span className="flex items-center gap-x-2 text-sm font-semibold text-dark-blue-400">
                                                                {role === r ? (
                                                                  <Check className="size-4 text-primary-500" />
                                                                ) : (
                                                                  <span className="size-4" />
                                                                )}
                                                                {r}
                                                              </span>
                                                              <span className="pl-6 text-xs font-light text-gray-500">
                                                                This is where the
                                                                role&apos;s
                                                                permissions and
                                                                limitations are
                                                                briefly
                                                                explained.
                                                              </span>
                                                            </DropdownMenuItem>
                                                          ))}
                                                          <DropdownMenuSeparator />
                                                          <DropdownMenuItem
                                                            className="text-error-600 focus:text-error-600"
                                                            onClick={() =>
                                                              setRemoveTarget(
                                                                member
                                                              )
                                                            }
                                                          >
                                                            <XCircle className="size-4" />
                                                            Remove from project
                                                          </DropdownMenuItem>
                                                        </DropdownMenuContent>
                                                      </DropdownMenu>
                                                    )}
                                                  </TableCell>
                                                  <TableCell className="py-4">
                                                    <span
                                                      className={cn(
                                                        "text-sm font-semibold",
                                                        status === "Active"
                                                          ? "text-success-500"
                                                          : "text-gray-500"
                                                      )}
                                                    >
                                                      {status}
                                                    </span>
                                                  </TableCell>
                                                  <TableCell className="py-4">
                                                    <DropdownMenu>
                                                      <DropdownMenuTrigger
                                                        asChild
                                                      >
                                                        <IconButton
                                                          variant="ghost"
                                                          visual="gray"
                                                          size="sm"
                                                        >
                                                          <MoreHorizontal className="size-4" />
                                                        </IconButton>
                                                      </DropdownMenuTrigger>
                                                      <DropdownMenuContent
                                                        align="end"
                                                        className="w-[200px]"
                                                      >
                                                        <DropdownMenuItem>
                                                          Manage User
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem
                                                          onClick={() => {
                                                            setTeamLeadId(
                                                              member.id
                                                            )
                                                            setTeamTab(
                                                              "Team Lead"
                                                            )
                                                            toast({
                                                              title: `Project lead role assigned to ${member.firstName}`,
                                                              variant:
                                                                "success",
                                                            })
                                                          }}
                                                        >
                                                          Assign Team Lead
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem>
                                                          Transfer Ownership
                                                        </DropdownMenuItem>
                                                        {status === "Inactive" && (
                                                          <DropdownMenuItem
                                                            onClick={() => {
                                                              setMemberStatus(
                                                                (s) => ({
                                                                  ...s,
                                                                  [member.id]:
                                                                    "Active",
                                                                })
                                                              )
                                                              toast({
                                                                title: `${member.firstName} has been activated`,
                                                                variant:
                                                                  "success",
                                                              })
                                                            }}
                                                          >
                                                            Activate User
                                                          </DropdownMenuItem>
                                                        )}
                                                        {!isOwner && (
                                                          <>
                                                            <DropdownMenuSeparator />
                                                            <DropdownMenuItem
                                                              className="text-error-600 focus:text-error-600"
                                                              onClick={() =>
                                                                setRemoveTarget(
                                                                  member
                                                                )
                                                              }
                                                            >
                                                              <XCircle className="size-4" />
                                                              Remove from project
                                                            </DropdownMenuItem>
                                                          </>
                                                        )}
                                                      </DropdownMenuContent>
                                                    </DropdownMenu>
                                                  </TableCell>
                                                </TableRow>
                                              )
                                            }
                                          )}
                                        </TableBody>
                                      </Table>
                                    </ScrollArea>
                                  </TabsContent>
                                </Tabs>
                              </div>

                              <div className="border-t border-gray-200 py-4 px-6 flex items-center justify-between">
                                <Button
                                  type="button"
                                  variant="link"
                                  visual="gray"
                                  onClick={() => setTeamDialogOpen(false)}
                                >
                                  <X className="size-[15px]" />
                                  Cancel
                                </Button>
                                <Button onClick={saveTeamSettings}>
                                  Save
                                </Button>
                              </div>
                            </DialogContent>
                          </Dialog>

                          <Dialog
                            open={!!removeTarget}
                            onOpenChange={(o) => !o && setRemoveTarget(null)}
                          >
                            <DialogContent className="max-w-[540px] p-0">
                              <div className="p-6">
                                <h3 className="text-lg font-semibold text-dark-blue-400">
                                  Remove this user?
                                </h3>
                                <p className="mt-2 text-sm font-light text-gray-500">
                                  <span className="font-semibold text-dark-blue-400">
                                    {removeTarget?.firstName}
                                  </span>{" "}
                                  will no longer have access to this project,
                                  including any tasks, files, or chat threads
                                  previously assigned. This will not delete any
                                  tasks, files, or comments.
                                </p>
                              </div>
                              <div className="border-t border-gray-200 py-4 px-6 flex items-center justify-between">
                                <Button
                                  type="button"
                                  variant="link"
                                  visual="gray"
                                  onClick={() => setRemoveTarget(null)}
                                >
                                  <X className="size-[15px]" />
                                  Cancel
                                </Button>
                                <div className="flex items-center gap-x-3">
                                  <Button
                                    variant="outlined"
                                    visual="gray"
                                    className="text-error-600"
                                    onClick={() => confirmRemoveMember(true)}
                                  >
                                    Deactivate Instead
                                  </Button>
                                  <Button
                                    variant="outlined"
                                    visual="gray"
                                    onClick={() => confirmRemoveMember(false)}
                                  >
                                    Yes, Remove
                                  </Button>
                                </div>
                              </div>
                            </DialogContent>
                          </Dialog>
                        </div>

                        <div id="section-How it Works">
                          {/* How It Works section hidden in edit mode */}
                        </div>

                        <div
                          id="section-Questions"
                          className="relative p-6 mt-6 border gap-x-[50px] rounded-lg border-gray-200 bg-white shadow-[0px_1px_5px_0px_rgba(16,24,40,.02)]"
                        >
                          <div className="flex items-center justify-between">
                            <h1 className="text-xl font-bold leading-none text-dark-blue-400">
                              Questions
                            </h1>
                            <IconButton
                              className="rounded-full text-gray-500 hover:text-gray-800"
                              variant="ghost"
                              visual="gray"
                              onClick={() => {
                                setQuestionsTab(
                                  questionsSectionTab === "section-recent"
                                    ? "dialog-recent"
                                    : "dialog-faqs"
                                )
                                setQuestionsDialogOpen(true)
                              }}
                            >
                              <Edit03 className="size-4" />
                            </IconButton>
                          </div>

                          {(project.faqs?.length > 0 ||
                            project.recentQuestions?.length > 0) && (
                            <>
                              {!isOwnerViewing && (
                              <div className="relative mt-6 p-6 rounded-lg border border-gray-200 bg-gray-50">
                                {onlineTeam.length > 0 && (
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
                                          alt={
                                            onlineTeam[0].firstName || "Team member"
                                          }
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
                                    className="flex-auto"
                                    placeholder="Type your question..."
                                  />
                                  <Button
                                    className="text-xs leading-none"
                                    size="lg"
                                  >
                                    Ask Question
                                  </Button>
                                </div>

                                <div className="mt-2 flex items-center justify-between">
                                  <span className="text-xs text-dark-blue-400 leading-none">
                                    A team member will reach out to you as soon
                                    as possible.
                                  </span>

                                  <span className="text-xs text-dark-blue-400 leading-none">
                                    Avg. response time: 20 mins
                                  </span>
                                </div>

                                <div className="mt-6 flex items-center gap-3 flex-wrap">
                                  <Badge
                                    className="transition duration-300 bg-white border-[1.5px] border-gray-300 hover:border-dark-blue-400 hover:text-dark-blue-400 cursor-pointer hover:ring-1 hover:ring-dark-blue-400"
                                    size="lg"
                                    visual="gray"
                                  >
                                    Can I see your portfolio?
                                  </Badge>
                                  <Badge
                                    className="transition duration-300 bg-white border-[1.5px] border-gray-300 hover:border-dark-blue-400 hover:text-dark-blue-400 cursor-pointer hover:ring-1 hover:ring-dark-blue-400"
                                    size="lg"
                                    visual="gray"
                                  >
                                    Can I see your work?
                                  </Badge>
                                  <Badge
                                    className="transition duration-300 bg-white border-[1.5px] border-gray-300 hover:border-dark-blue-400 hover:text-dark-blue-400 cursor-pointer hover:ring-1 hover:ring-dark-blue-400"
                                    size="lg"
                                    visual="gray"
                                  >
                                    Can I see your work?
                                  </Badge>
                                  <Badge
                                    className="transition duration-300 bg-white border-[1.5px] border-gray-300 hover:border-dark-blue-400 hover:text-dark-blue-400 cursor-pointer hover:ring-1 hover:ring-dark-blue-400"
                                    size="lg"
                                    visual="gray"
                                  >
                                    Can I see your work?
                                  </Badge>
                                  <Badge
                                    className="transition duration-300 bg-white border-[1.5px] border-gray-300 hover:border-dark-blue-400 hover:text-dark-blue-400 cursor-pointer hover:ring-1 hover:ring-dark-blue-400"
                                    size="lg"
                                    visual="gray"
                                  >
                                    Can I see your work?
                                  </Badge>
                                  <Badge
                                    className="transition duration-300 bg-white border-[1.5px] border-gray-300 hover:border-dark-blue-400 hover:text-dark-blue-400 cursor-pointer hover:ring-1 hover:ring-dark-blue-400"
                                    size="lg"
                                    visual="gray"
                                  >
                                    Can I see your work?
                                  </Badge>
                                  <Badge
                                    className="transition duration-300 bg-white border-[1.5px] border-gray-300 hover:border-dark-blue-400 hover:text-dark-blue-400 cursor-pointer hover:ring-1 hover:ring-dark-blue-400"
                                    size="lg"
                                    visual="gray"
                                  >
                                    Can I see your work?
                                  </Badge>
                                  <Badge
                                    className="transition duration-300 bg-white border-[1.5px] border-gray-300 hover:border-dark-blue-400 hover:text-dark-blue-400 cursor-pointer hover:ring-1 hover:ring-dark-blue-400"
                                    size="lg"
                                    visual="gray"
                                  >
                                    Can I see your work?
                                  </Badge>
                                  <Badge
                                    className="transition duration-300 bg-white border-[1.5px] border-gray-300 hover:border-dark-blue-400 hover:text-dark-blue-400 cursor-pointer hover:ring-1 hover:ring-dark-blue-400"
                                    size="lg"
                                    visual="gray"
                                  >
                                    Can I see your work?
                                  </Badge>
                                  <Badge
                                    className="transition duration-300 bg-white border-[1.5px] border-gray-300 hover:border-dark-blue-400 hover:text-dark-blue-400 cursor-pointer hover:ring-1 hover:ring-dark-blue-400"
                                    size="lg"
                                    visual="gray"
                                  >
                                    Can I see your work?
                                  </Badge>
                                </div>
                              </div>
                              )}
                            </>
                          )}

                          <div className="mt-8">
                            {publishError && publishErrorField === "faqs" && (
                              <p className="mb-3 text-sm text-error-500">
                                {publishError}
                              </p>
                            )}
                            <Tabs
                              value={questionsSectionTab}
                              onValueChange={setQuestionsSectionTab}
                            >
                              <RadixTabs.List className="flex items-center justify-between">
                                <div className="flex items-center gap-x-3">
                                  <TabsTrigger
                                    variant="unstyled"
                                    showUnderline={false}
                                    value="section-faqs"
                                    className={cn(
                                      "focus-visible:outline-none py-[7px] bg-white hover:bg-gray-50 hover:border-gray-400 px-3.5 border-2 border-gray-300 data-[state=active]:text-dark-blue-400 data-[state=active]:bg-white hover:data-[state=active]:bg-white data-[state=active]:border-dark-blue-400 hover:data-[state=active]:text-dark-blue-400 hover:data-[state=active]:border-dark-blue-400  text-gray-500 hover:text-gray-600 rounded-full text-sm leading-5 font-medium transition duration-300",
                                      SHOW_PUBLISH_VALIDATION &&
                                        publishAttempted &&
                                        (!project.faqs ||
                                          project.faqs.length === 0) &&
                                        "border-error-300 text-error-500 data-[state=active]:border-error-300 data-[state=active]:text-error-500 hover:data-[state=active]:border-error-300 hover:data-[state=active]:text-error-500"
                                    )}
                                  >
                                    FAQ&apos;s
                                  </TabsTrigger>
                                  <TabsTrigger
                                    variant="unstyled"
                                    showUnderline={false}
                                    value="section-recent"
                                    className="focus-visible:outline-none py-[7px] bg-white hover:bg-gray-50 hover:border-gray-400 px-3.5 border-2 border-gray-300 data-[state=active]:text-dark-blue-400 data-[state=active]:bg-white hover:data-[state=active]:bg-white data-[state=active]:border-dark-blue-400 hover:data-[state=active]:text-dark-blue-400 hover:data-[state=active]:border-dark-blue-400  text-gray-500 hover:text-gray-600 rounded-full text-sm leading-5 font-medium transition duration-300"
                                  >
                                    Recently Asked Questions
                                  </TabsTrigger>
                                </div>
                              </RadixTabs.List>

                              <TabsContent value="section-faqs">
                                {!project.faqs || project.faqs.length === 0 ? (
                                  <>
                                  <div
                                    className={cn(
                                      "border-2 rounded-lg p-6 mt-6 flex items-start justify-between",
                                      SHOW_PUBLISH_VALIDATION && publishAttempted
                                        ? "border-error-300 bg-error-50"
                                        : "border-gray-200 bg-gray-25"
                                    )}
                                  >
                                    <div>
                                      <h1
                                        className={cn(
                                          "text-lg font-semibold",
                                          SHOW_PUBLISH_VALIDATION &&
                                            publishAttempted
                                            ? "text-error-500"
                                            : "text-dark-blue-400"
                                        )}
                                      >
                                        FAQ&apos;s
                                      </h1>
                                      <p
                                        className={cn(
                                          "mt-1 text-sm font-light",
                                          SHOW_PUBLISH_VALIDATION &&
                                            publishAttempted
                                            ? "text-error-500"
                                            : "text-dark-blue-400"
                                        )}
                                      >
                                        Your project deliverables will be
                                        displayed here once you add a scope to
                                        your offer. These deliverables are
                                        automatically generated based on the
                                        details in your scope and tasks,
                                        they&apos;re not directly editable.
                                      </p>
                                    </div>
                                    <Button
                                      variant="outlined"
                                      visual="gray"
                                      className={cn(
                                        "shrink-0 ml-[75px]",
                                        SHOW_PUBLISH_VALIDATION &&
                                          publishAttempted &&
                                          "text-error-500 border-error-300"
                                      )}
                                      onClick={() => {
                                        setQuestionsTab("dialog-faqs")
                                        setQuestionsDialogOpen(true)
                                      }}
                                    >
                                      <Plus className="size-[15px]" />
                                      Add FAQ&apos;s
                                    </Button>
                                  </div>
                                  {SHOW_PUBLISH_VALIDATION && publishAttempted && (
                                    <p className="mt-2 text-sm text-error-500">
                                      Please add at least 5 FAQ&apos;s
                                    </p>
                                  )}
                                  </>
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

                              <TabsContent value="section-recent">
                                {(() => {
                                  const publicQuestions = (
                                    (project.recentQuestions as Array<{
                                      question: string
                                      answer?: string | null
                                      answeredByName?: string | null
                                      answeredByRole?: string | null
                                      hidden?: boolean
                                    }>) ?? []
                                  ).filter((q) => q && !q.hidden)
                                  return publicQuestions.length === 0 ? (
                                    <div className="border-2 border-gray-200 bg-gray-25 rounded-lg p-6 mt-6">
                                      <h1 className="text-lg font-semibold text-dark-blue-400">
                                        No Recent Questions
                                      </h1>
                                      <p className="mt-1 text-sm font-light text-dark-blue-400">
                                        You will see recent questions here once
                                        your project is live in the marketplace
                                        and visitors engage in chat with you and
                                        your team.
                                      </p>
                                    </div>
                                  ) : (
                                    <Accordion
                                      type="single"
                                      className="pt-6 space-y-[15px]"
                                      defaultValue="rq-0"
                                    >
                                      {publicQuestions.map((q, idx) => (
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
                                          {q.answer && q.answer.trim() && (
                                            <DisclosureContent className="px-5 pb-5">
                                              <div className="flex items-center gap-2">
                                                <Avatar size="xs">
                                                  <AvatarImage
                                                    src="/man.jpg"
                                                    alt=""
                                                  />
                                                  <AvatarFallback>
                                                    {(
                                                      q.answeredByName ?? "T"
                                                    ).slice(0, 1)}
                                                  </AvatarFallback>
                                                </Avatar>
                                                <Badge
                                                  visual="primary"
                                                  className="rounded-[4px] bg-primary-50 text-[10px]"
                                                >
                                                  {q.answeredByRole ??
                                                    "Project Lead"}
                                                </Badge>
                                                <span className="text-sm font-semibold text-dark-blue-400">
                                                  {q.answeredByName ?? "Team"}
                                                </span>
                                              </div>
                                              <p
                                                className="mt-2 text-base leading-[1.5] font-light text-dark-blue-400 break-words"
                                                style={{
                                                  whiteSpace: "pre-line",
                                                }}
                                              >
                                                {q.answer}
                                              </p>
                                              <button
                                                type="button"
                                                className="mt-3 text-sm font-medium text-gray-500 hover:text-dark-blue-400"
                                              >
                                                Report Answer
                                              </button>
                                            </DisclosureContent>
                                          )}
                                        </AccordionItem>
                                      ))}
                                    </Accordion>
                                  )
                                })()}
                              </TabsContent>
                            </Tabs>

                            {!isOwnerViewing &&
                              (project.faqs?.length > 0 ||
                                project.recentQuestions?.length > 0) && (
                              <div className="py-8 px-6 bg-gray-50 border mt-8 border-gray-200 rounded-lg">
                                <h1 className="text-base font-semibold text-dark-blue-400 text-center">
                                  Can&apos;t find what you&apos;re looking for?
                                </h1>

                                <div className="flex items-center justify-center mt-5">
                                  <Button variant="outlined" visual="gray">
                                    Ask a question
                                  </Button>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Questions Dialog */}
                        <Dialog
                          open={questionsDialogOpen}
                          onOpenChange={(open) => {
                            setQuestionsDialogOpen(open)
                            if (open) {
                              setRecentQTab("all")
                              setOpenFaqIndex(null)
                            }
                          }}
                        >
                          <DialogContent className="max-w-[748px] p-0 gap-0">
                            <Tabs
                              value={questionsTab}
                              onValueChange={(val) => {
                                setQuestionsTab(val)
                                if (val === "dialog-faqs") setRecentQTab("all")
                                if (val === "dialog-recent")
                                  setOpenFaqIndex(null)
                              }}
                            >
                              <div className="px-6 pt-6 pb-0">
                                <div className="flex items-start justify-between">
                                  <div>
                                    <h2 className="text-lg font-bold text-dark-blue-400">
                                      Questions
                                    </h2>
                                    <p className="mt-1 text-sm font-light text-dark-blue-400">
                                      Manage your FAQ&apos;s and recently asked
                                      questions.
                                    </p>
                                  </div>
                                  <DialogClose asChild>
                                    <IconButton
                                      variant="ghost"
                                      visual="gray"
                                      size="sm"
                                    >
                                      <X className="size-5" />
                                    </IconButton>
                                  </DialogClose>
                                </div>

                                <TabsList className="w-full px-0 pt-4 justify-start">
                                  <TabsTrigger value="dialog-faqs">
                                    FAQ&apos;s
                                  </TabsTrigger>
                                  <TabsTrigger value="dialog-recent">
                                    Recently Asked Questions
                                  </TabsTrigger>
                                </TabsList>
                              </div>

                              <ScrollArea
                                scrollBar={<ScrollBar className="w-4 p-1" />}
                                viewportClassName="max-h-[60vh]"
                              >
                              <div className="px-6 py-6">
                                {questionsTab === "dialog-faqs" && (
                                  <>
                                    <p className="text-sm font-light text-dark-blue-400">
                                      Write a response for each of the question
                                      added to this project. Drag and drop FAQ
                                      items to reorder them. The order you set
                                      here will be reflected on your
                                      project&apos;s public FAQ section.
                                    </p>

                                    <div className="mt-4 flex items-center gap-3">
                                      <Button
                                        variant="outlined"
                                        visual="gray"
                                        size="sm"
                                        onClick={openAiFaqDialog}
                                      >
                                        <Stars02 className="size-[15px]" />
                                        Generate With AI
                                      </Button>
                                      <Button
                                        variant="outlined"
                                        visual="gray"
                                        size="sm"
                                        onClick={handleAddFaq}
                                      >
                                        <Plus className="size-[15px]" />
                                        Add Question
                                      </Button>
                                    </div>

                                    {(project.faqs?.length ?? 0) >= 10 && (
                                      <p className="mt-2 text-sm text-error-500">
                                        You can add a maximum of 10 questions.
                                      </p>
                                    )}

                                    <Dialog
                                      open={aiFaqDialogOpen}
                                      onOpenChange={setAiFaqDialogOpen}
                                    >
                                      <DialogContent className="max-w-[640px] p-0 gap-0">
                                        <div className="px-6 pt-6 pb-4 border-b border-gray-200 flex items-start justify-between">
                                          <div className="flex items-start gap-x-2">
                                            <Stars02 className="size-5 text-dark-blue-400 shrink-0 mt-0.5" />
                                            <div>
                                              <DialogTitle>
                                                AI Generated FAQ&apos;s
                                              </DialogTitle>
                                              <DialogDescription className="mt-1">
                                                Review and adjust your
                                                AI-generated FAQ&apos;s as needed
                                              </DialogDescription>
                                            </div>
                                          </div>
                                          <Badge
                                            className="rounded-full bg-success-50 text-success-600 shrink-0"
                                            visual="gray"
                                          >
                                            {faqAddedCount} of{" "}
                                            {faqSuggestions.length} added
                                          </Badge>
                                        </div>

                                        {faqRemainingSlots <
                                          faqSuggestions.filter((s) => !s.added)
                                            .length && (
                                          <p className="px-6 pt-4 text-sm text-error-500">
                                            You currently have{" "}
                                            {project.faqs?.length ?? 0} FAQ&apos;s
                                            in total, so you can only add{" "}
                                            {faqRemainingSlots} more
                                          </p>
                                        )}

                                        <ScrollArea
                                          scrollBar={
                                            <ScrollBar className="w-4 p-1" />
                                          }
                                          viewportClassName="max-h-[420px]"
                                        >
                                        <div className="px-6 py-4 space-y-3">
                                          {faqGenLoading ? (
                                            <div className="flex flex-col items-center justify-center gap-3 py-12">
                                              <Spinner
                                                size={32}
                                                strokeWidth={4}
                                              />
                                              <p className="text-sm text-gray-500">
                                                Generating suggestions…
                                              </p>
                                            </div>
                                          ) : faqGenError ? (
                                            <div className="py-8 text-center">
                                              <p className="text-sm text-error-500">
                                                Suggestions couldn&apos;t be
                                                loaded. Try again.
                                              </p>
                                              <Button
                                                variant="outlined"
                                                visual="gray"
                                                size="sm"
                                                className="mt-3"
                                                onClick={runFaqGeneration}
                                              >
                                                <Stars02 className="size-[15px]" />
                                                Retry
                                              </Button>
                                            </div>
                                          ) : (
                                            faqSuggestions.map((s, i) => (
                                              <div
                                                key={i}
                                                className={cn(
                                                  "group/sfaq relative rounded-lg border p-4 transition",
                                                  s.added
                                                    ? "border-success-300 bg-success-25"
                                                    : "border-gray-200 bg-white hover:bg-gray-50"
                                                )}
                                              >
                                                <div className="flex items-start justify-between gap-x-3">
                                                  <h3
                                                    className={cn(
                                                      "text-sm font-bold",
                                                      s.added
                                                        ? "text-success-700"
                                                        : "text-dark-blue-400"
                                                    )}
                                                  >
                                                    {s.question}
                                                  </h3>
                                                  {s.added ? (
                                                    <span className="shrink-0 inline-flex items-center gap-x-1 text-sm font-medium text-success-600">
                                                      <Check className="size-4" />
                                                      Added
                                                    </span>
                                                  ) : (
                                                    <Button
                                                      variant="outlined"
                                                      visual="gray"
                                                      size="sm"
                                                      className="shrink-0 opacity-0 group-hover/sfaq:opacity-100 transition"
                                                      onClick={() =>
                                                        insertFaqSuggestion(i)
                                                      }
                                                    >
                                                      <Upload01 className="size-[15px]" />
                                                      Insert
                                                    </Button>
                                                  )}
                                                </div>
                                                <p
                                                  className={cn(
                                                    "mt-1 text-sm font-light",
                                                    s.added
                                                      ? "text-success-700"
                                                      : "text-dark-blue-400"
                                                  )}
                                                >
                                                  {s.answer}
                                                </p>
                                                {s.added && (
                                                  <button
                                                    type="button"
                                                    onClick={() =>
                                                      removeFaqSuggestion(i)
                                                    }
                                                    className="absolute bottom-3 right-3 size-9 rounded-full border border-success-300 bg-white text-success-600 hover:border-error-300 hover:text-error-500 inline-flex items-center justify-center opacity-0 group-hover/sfaq:opacity-100 transition"
                                                  >
                                                    <Trash2 className="size-4" />
                                                  </button>
                                                )}
                                              </div>
                                            ))
                                          )}
                                        </div>
                                        </ScrollArea>

                                        <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
                                          <Button
                                            variant="outlined"
                                            visual="gray"
                                            onClick={runFaqGeneration}
                                            disabled={faqGenLoading}
                                          >
                                            <Stars02 className="size-[15px]" />
                                            Regenerate
                                          </Button>
                                          <Button
                                            onClick={insertAllFaqSuggestions}
                                            disabled={
                                              faqGenLoading ||
                                              faqRemainingSlots === 0 ||
                                              faqSuggestions.every((s) => s.added)
                                            }
                                          >
                                            Insert All ({faqSuggestions.length})
                                          </Button>
                                        </div>
                                      </DialogContent>
                                    </Dialog>

                                    {!project.faqs ||
                                    project.faqs.length === 0 ? (
                                      <div className="mt-6 flex flex-col items-center justify-center py-10 text-center">
                                        <div className="mx-auto mb-3 size-10 rounded-full bg-gray-100 flex items-center justify-center">
                                          <HelpCircle className="size-5 text-gray-400" />
                                        </div>
                                        <h3 className="text-sm font-semibold text-dark-blue-400">
                                          No FAQ&apos;s yet
                                        </h3>
                                        <p className="mt-1 text-xs text-gray-500 max-w-[280px]">
                                          Add questions that clients commonly
                                          ask about your project, or generate
                                          them with AI.
                                        </p>
                                      </div>
                                    ) : (
                                      <Accordion
                                        type="single"
                                        collapsible
                                        className="mt-4 space-y-3"
                                        value={
                                          openFaqIndex !== null
                                            ? `faq-${openFaqIndex}`
                                            : ""
                                        }
                                        onValueChange={(val) =>
                                          setOpenFaqIndex(
                                            val
                                              ? Number(val.replace("faq-", ""))
                                              : null
                                          )
                                        }
                                      >
                                        {(
                                          project.faqs as Array<{
                                            question: string
                                            answer: string
                                          }>
                                        ).map((faq, idx) => (
                                          <AccordionItem
                                            key={idx}
                                            value={`faq-${idx}`}
                                            className="rounded-lg border border-gray-200 bg-white"
                                          >
                                            <AccordionTrigger className="w-full p-4 flex items-center gap-3 [&[data-state=open]_.closed-icons]:hidden [&[data-state=closed]_.open-icons]:hidden [&[data-state=open]_.closed-text]:hidden [&[data-state=open]_.open-text]:inline">
                                              <button
                                                type="button"
                                                className="cursor-grab text-gray-400 hover:text-gray-600"
                                                onClick={(e) =>
                                                  e.stopPropagation()
                                                }
                                              >
                                                <GripVertical2 />
                                              </button>
                                              <div className="min-w-0 flex-1 text-left">
                                                <span className="text-sm font-bold text-dark-blue-400">
                                                  Question {idx + 1}
                                                  <span className="closed-text">
                                                    :
                                                  </span>
                                                </span>
                                                <span className="closed-text">
                                                  {" "}
                                                </span>
                                                <span className="closed-text text-sm text-dark-blue-400">
                                                  {faq.question}
                                                </span>
                                              </div>
                                              <div className="flex items-center gap-1">
                                                <span className="open-icons">
                                                  <IconButton
                                                    asChild
                                                    variant="ghost"
                                                    visual="gray"
                                                    size="sm"
                                                    className="rounded-full text-gray-500 hover:text-gray-800"
                                                  >
                                                    <span>
                                                      <Check className="size-4" />
                                                    </span>
                                                  </IconButton>
                                                </span>
                                                <span className="closed-icons">
                                                  <IconButton
                                                    asChild
                                                    variant="ghost"
                                                    visual="gray"
                                                    size="sm"
                                                    className="rounded-full text-gray-500 hover:text-gray-800"
                                                  >
                                                    <span>
                                                      <Edit03 className="size-4" />
                                                    </span>
                                                  </IconButton>
                                                </span>
                                                <IconButton
                                                  variant="ghost"
                                                  visual="gray"
                                                  size="sm"
                                                  className="rounded-full text-gray-500 hover:text-gray-800"
                                                  onClick={(e) => {
                                                    e.stopPropagation()
                                                    handleDeleteFaq(idx)
                                                  }}
                                                >
                                                  <Trash2 className="size-4" />
                                                </IconButton>
                                              </div>
                                            </AccordionTrigger>
                                            <DisclosureContent className="px-4 pb-4">
                                              <p className="text-sm font-light text-dark-blue-400">
                                                Make this clear and concise,
                                                this is what your visitors will
                                                see first.
                                              </p>
                                              <Input
                                                className="mt-2"
                                                value={faq.question}
                                                onChange={(e) =>
                                                  handleFaqChange(
                                                    idx,
                                                    "question",
                                                    e.target.value
                                                  )
                                                }
                                              />
                                              <div className="mt-4 flex items-center justify-between">
                                                <div>
                                                  <h3 className="text-sm font-bold text-dark-blue-400">
                                                    Answer
                                                  </h3>
                                                  <p className="mt-1 text-sm font-light text-dark-blue-400">
                                                    Provide a detailed, helpful
                                                    response that fully
                                                    addresses the question
                                                  </p>
                                                </div>
                                                <Button
                                                  variant="outlined"
                                                  visual="gray"
                                                  size="sm"
                                                  onClick={async () => {
                                                    if (
                                                      !project?.id ||
                                                      !isRealBackendId(
                                                        project.id
                                                      )
                                                    ) {
                                                      handleFaqChange(
                                                        idx,
                                                        "answer",
                                                        generateFaqAnswer(
                                                          project,
                                                          faq.question
                                                        )
                                                      )
                                                      return
                                                    }
                                                    try {
                                                      const res =
                                                        await ProjectAPI.SuggestFaqAnswer(
                                                          project.id,
                                                          faq.question
                                                        )
                                                      handleFaqChange(
                                                        idx,
                                                        "answer",
                                                        res?.data?.answer ||
                                                          generateFaqAnswer(
                                                            project,
                                                            faq.question
                                                          )
                                                      )
                                                    } catch {
                                                      handleFaqChange(
                                                        idx,
                                                        "answer",
                                                        generateFaqAnswer(
                                                          project,
                                                          faq.question
                                                        )
                                                      )
                                                    }
                                                  }}
                                                >
                                                  <Stars02 className="size-[15px]" />
                                                  Answer With AI
                                                </Button>
                                              </div>
                                              <Textarea
                                                className="mt-2"
                                                rows={4}
                                                value={faq.answer}
                                                onChange={(e) =>
                                                  handleFaqChange(
                                                    idx,
                                                    "answer",
                                                    e.target.value.slice(0, 300)
                                                  )
                                                }
                                                maxLength={300}
                                              />
                                              <p className="mt-1 text-right text-xs text-gray-500">
                                                {(faq.answer || "").length}/300
                                              </p>
                                            </DisclosureContent>
                                          </AccordionItem>
                                        ))}
                                      </Accordion>
                                    )}

                                  </>
                                )}

                                {questionsTab === "dialog-recent" && (
                                  <RecentQuestionsManager projectId={String(project.id)} />
                                )}
                              </div>
                              </ScrollArea>
                            </Tabs>

                            <div className="border-t border-gray-200 py-4 px-6 flex items-center justify-between">
                              <Button
                                type="button"
                                variant="link"
                                visual="gray"
                                onClick={() => setQuestionsDialogOpen(false)}
                              >
                                <X className="size-[15px]" />
                                Cancel
                              </Button>
                              <Button
                                onClick={() => setQuestionsDialogOpen(false)}
                              >
                                Save
                              </Button>
                            </div>
                          </DialogContent>
                        </Dialog>

                        {(project.completedContracts?.length > 0 ||
                          project.ongoingContracts?.length > 0) && (
                          <>
                            <div className="p-6 mt-6 border gap-x-[50px] flex items-start rounded-lg border-gray-200 bg-white shadow-[0px_1px_5px_0px_rgba(16,24,40,.02)]">
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
                                  <RatingGroupLabel size="sm">
                                    4.9
                                  </RatingGroupLabel>
                                  <RatingGroupControl>
                                    <RatingGroupContext>
                                      {({ items }) =>
                                        items.map((item) => (
                                          <RatingGroupItem
                                            key={item}
                                            index={item}
                                          >
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
                                    <span className="font-extralight">
                                      (100)
                                    </span>
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
                                    75%{" "}
                                    <span className="font-extralight">
                                      (75)
                                    </span>
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
                                    50%{" "}
                                    <span className="font-extralight">
                                      (50)
                                    </span>
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
                                    25%{" "}
                                    <span className="font-extralight">
                                      (25)
                                    </span>
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
                                    0%{" "}
                                    <span className="font-extralight">(0)</span>
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
                                                    <AvatarFallback>
                                                      M
                                                    </AvatarFallback>
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
                                                  {({
                                                    readMore,
                                                    text,
                                                    toggle,
                                                  }) => (
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
                                                  <Badge
                                                    size="sm"
                                                    visual="gray"
                                                  >
                                                    Team player
                                                  </Badge>
                                                  <Badge
                                                    size="sm"
                                                    visual="gray"
                                                  >
                                                    Team player
                                                  </Badge>
                                                  <Badge
                                                    size="sm"
                                                    visual="gray"
                                                  >
                                                    Team player
                                                  </Badge>
                                                  <Badge
                                                    size="sm"
                                                    visual="gray"
                                                  >
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
                                                    <AvatarFallback>
                                                      M
                                                    </AvatarFallback>
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
                                                  {({
                                                    readMore,
                                                    text,
                                                    toggle,
                                                  }) => (
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
                                                  <Badge
                                                    size="sm"
                                                    visual="gray"
                                                  >
                                                    Team player
                                                  </Badge>
                                                  <Badge
                                                    size="sm"
                                                    visual="gray"
                                                  >
                                                    Team player
                                                  </Badge>
                                                  <Badge
                                                    size="sm"
                                                    visual="gray"
                                                  >
                                                    Team player
                                                  </Badge>
                                                  <Badge
                                                    size="sm"
                                                    visual="gray"
                                                  >
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
                                                  {({
                                                    readMore,
                                                    text,
                                                    toggle,
                                                  }) => (
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
                                                    <AvatarFallback>
                                                      M
                                                    </AvatarFallback>
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
                                                  {({
                                                    readMore,
                                                    text,
                                                    toggle,
                                                  }) => (
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
                                                  <Badge
                                                    size="sm"
                                                    visual="gray"
                                                  >
                                                    Team player
                                                  </Badge>
                                                  <Badge
                                                    size="sm"
                                                    visual="gray"
                                                  >
                                                    Team player
                                                  </Badge>
                                                  <Badge
                                                    size="sm"
                                                    visual="gray"
                                                  >
                                                    Team player
                                                  </Badge>
                                                  <Badge
                                                    size="sm"
                                                    visual="gray"
                                                  >
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
                                                    <AvatarFallback>
                                                      M
                                                    </AvatarFallback>
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
                                                  {({
                                                    readMore,
                                                    text,
                                                    toggle,
                                                  }) => (
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
                                                  <Badge
                                                    size="sm"
                                                    visual="gray"
                                                  >
                                                    Team player
                                                  </Badge>
                                                  <Badge
                                                    size="sm"
                                                    visual="gray"
                                                  >
                                                    Team player
                                                  </Badge>
                                                  <Badge
                                                    size="sm"
                                                    visual="gray"
                                                  >
                                                    Team player
                                                  </Badge>
                                                  <Badge
                                                    size="sm"
                                                    visual="gray"
                                                  >
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
                          </>
                        )}
                      </div>
                    </TabsContent>
                  </Tabs>
                </div>
              </TabsContent>

              <TabsContent value="View Project Scope">
                <div className="mt-6 space-y-6">
                  {/* Budget Calculator & Duration cards */}
                  <div className="grid grid-cols-2 gap-x-4">
                    <div className="border border-gray-200 rounded-lg p-6 flex items-start justify-between">
                      <div>
                        <span className="text-sm font-semibold text-primary-500 inline-flex items-center gap-x-1.5">
                          Budget Calculator
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Info className="size-3.5 text-gray-400 cursor-help" />
                              </TooltipTrigger>
                              <TooltipContent>
                                Calculated from your scope tasks
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </span>
                        <div className="mt-2 flex items-baseline gap-x-1.5">
                          <span className="text-[28px] leading-none font-bold text-dark-blue-400">
                            {formatBudget(budgetTotalCents, "week")}
                          </span>
                          <span className="text-sm text-dark-blue-400">
                            per
                          </span>
                          <Badge visual="gray" className="rounded-[5px]">
                            week
                          </Badge>
                        </div>
                      </div>
                      <ShieldDollar className="size-10 text-primary-500" />
                    </div>

                    <div className="border border-gray-200 rounded-lg p-6 flex items-start justify-between">
                      <div>
                        <span className="text-sm font-semibold text-primary-500 inline-flex items-center gap-x-1.5">
                          Duration
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Info className="size-3.5 text-gray-400 cursor-help" />
                              </TooltipTrigger>
                              <TooltipContent>
                                Total duration based on tasks
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </span>
                        <div className="mt-2">
                          <span className="text-[28px] leading-none font-bold text-dark-blue-400">
                            {isServiceListing ? "Ongoing" : durationLabel}
                          </span>
                        </div>
                      </div>
                      <ChartBreakoutCircle className="size-10 text-primary-500" />
                    </div>
                  </div>

                  <ScopeBuilder
                    embedded
                    scopeType={
                      project?.listingType === "service"
                        ? "service"
                        : "project"
                    }
                    onScopeTypeChange={(type) => {
                      setProject((prev: any) => ({
                        ...prev,
                        listingType: type,
                      }))
                      setHasChanges(true)
                      ProjectAPI.UpdateProjectDraft(project.id, {
                        listingType: type,
                      } as any).catch(() => {})
                    }}
                    phases={
                      project.scope?.length > 0 ? project.scope : undefined
                    }
                    onPhasesChange={handleScopeChange}
                    teamMembers={(() => {
                      const apiTeam = (project.team ?? []).map((m: any) => {
                        return {
                          id: m.id || m.userId || crypto.randomUUID(),
                          firstName: m.firstName || m.name || "User",
                          username: m.username || m.email?.split("@")[0] || "",
                          avatarUrl: m.avatarUrl || null,
                          role: jobTitleOf(m),
                          jobTitles: jobTitlesOf(m),
                          hourlyRate: m.hourlyRate ?? m.rateMax ?? null,
                          workSchedule:
                            m.workSchedule ?? m.availability ?? null,
                          customHoursPerWeek: m.customHoursPerWeek ?? null,
                          location:
                            coerceName(m.location) ||
                            coerceName(m.country) ||
                            null,
                          experience:
                            coerceName(m.experience) ||
                            coerceName(m.experienceLevel) ||
                            null,
                        }
                      })
                      // Scope assignees must be members ON this project
                      // (Chris 07-28) — the owner (self) plus added members —
                      // never the whole roster or seed members.
                      const ids = Array.isArray(project.teamMemberIds)
                        ? project.teamMemberIds.map(String)
                        : []
                      return apiTeam.filter(
                        (m: any) =>
                          ids.includes(String(m.id)) ||
                          String(m.id) === ownerId
                      )
                    })()}
                  />
                </div>
              </TabsContent>
            </Tabs>
          </div>

          <div className="pt-[51px] sticky top-[65px] pb-8 w-[390px] shrink-0 z-10 space-y-6">
            <div className="bg-white shadow-[0px_1px_5px_0px_rgba(16,24,40,.02)] rounded-lg border border-gray-200">
              <div className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-center">
                    <Badge className="rounded-[5px]" visual="gray">
                      Starting At
                    </Badge>
                    <div className="inline-flex items-center gap-x-1.5 ml-2">
                      <span className="text-2xl leading-none font-bold text-dark-blue-400">
                        {formatBudget(budgetTotalCents, budgetPeriod)}
                      </span>
                      <span className="text-sm font-medium leading-none text-dark-blue-400">
                        per
                      </span>
                    </div>

                    <div className="ml-1.5">
                      <Listbox value={budgetPeriod} onChange={setBudgetPeriod}>
                        <ListboxButton
                          className="text-sm lowercase py-[5px] px-[7px] h-max w-auto"
                          iconClassName="ml-1"
                          placeholder="Select"
                        />
                        <ListboxOptions className="w-[153px]">
                          {[
                            "week",
                            "2-week",
                            "month",
                            "quarter",
                            ...(durationDays >= 365 ? ["year"] : []),
                          ].map((timeline) => (
                            <ListboxOption key={timeline} value={timeline}>
                              {timeline}
                            </ListboxOption>
                          ))}
                        </ListboxOptions>
                      </Listbox>
                    </div>
                  </div>

                  <IconButton
                    variant="ghost"
                    visual="gray"
                    size="sm"
                    onClick={() => router.push(`/edit-listing/${params.slug}`)}
                  >
                    <Edit03 className="size-4" />
                  </IconButton>
                </div>

                <div className="mt-3">
                  <span className="inline-block text-sm leading-none font-medium text-dark-blue-400">
                    {budgetTotalCents > 0
                      ? `with an initial payment of ${formatBudget(budgetTotalCents, budgetPeriod)} to kickoff`
                      : "with an initial payment of $0 to kickoff"}
                  </span>
                </div>

                <div className="flex flex-col items-start gap-y-3 mt-6">
                  <span className="inline-block text-xs font-medium text-dark-blue-400">
                    Current Team
                  </span>

                  {Array.isArray(currentTeam) &&
                  currentTeam.length > 0 ? (
                    <div className="group relative w-fit">
                      <div className="flex items-center -space-x-2">
                      {currentTeam
                        .slice(0, 5)
                        .map((m: any, i: number) => (
                          <Avatar
                            key={m.userId ?? m.username ?? i}
                            size="sm"
                            className="border-2 border-white hover:ring-0 active:ring-0"
                          >
                            {m.avatarUrl && (
                              <AvatarImage
                                src={m.avatarUrl}
                                alt={m.firstName || "Member"}
                              />
                            )}
                            <AvatarFallback>
                              {(m.firstName || "?").charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                        ))}
                      {currentTeam.length > 5 && (
                        <span className="pl-3 text-xs font-medium text-dark-blue-400">
                          +{currentTeam.length - 5}
                        </span>
                      )}
                      </div>
                      <div className="pointer-events-none absolute left-0 top-full z-20 pt-2 w-[300px] opacity-0 transition-opacity duration-150 group-hover:pointer-events-auto group-hover:opacity-100">
                        <div className="rounded-lg border border-gray-100 bg-white p-4 shadow-[0px_12px_16px_-4px_rgba(16,24,40,.08)]">
                          <div className="flex items-center gap-x-2 text-sm font-light text-dark-blue-400">
                            <Users03 className="size-4 shrink-0 text-primary-500" />
                            <span>
                              Your project currently has{" "}
                              <span className="font-bold">
                                {currentTeam.length} team members
                              </span>
                            </span>
                          </div>
                          <button
                            type="button"
                            className="mt-2 inline-flex items-center gap-x-1 text-sm font-semibold text-primary-500 hover:text-primary-600 focus-visible:outline-none"
                            onClick={() => {
                              // The team dialog lives in the "Details" tab, which
                              // unmounts on other tabs — switch to it so the
                              // dialog is mounted, then open it.
                              setSelected("Details")
                              setTeamTab("Team Members")
                              setTeamDialogOpen(true)
                            }}
                          >
                            Manage Team <span aria-hidden>→</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="group relative w-fit">
                      <Avatar size="sm" className="border-2 border-white hover:ring-0 active:ring-0">
                        {user?.avatarUrl && (
                          <AvatarImage
                            src={user.avatarUrl}
                            alt={user.firstName || "Owner"}
                          />
                        )}
                        <AvatarFallback>
                          {user?.firstName?.[0]?.toUpperCase() || "O"}
                        </AvatarFallback>
                      </Avatar>
                      <div className="pointer-events-none absolute left-0 top-full z-20 pt-2 w-[300px] opacity-0 transition-opacity duration-150 group-hover:pointer-events-auto group-hover:opacity-100">
                        <div className="rounded-lg border border-gray-100 bg-white p-4 shadow-[0px_12px_16px_-4px_rgba(16,24,40,.08)]">
                          <div className="flex items-center gap-x-2 text-sm font-light text-dark-blue-400">
                            <Users03 className="size-4 shrink-0 text-primary-500" />
                            <span>
                              No team members yet — just you as owner.
                            </span>
                          </div>
                          <button
                            type="button"
                            className="mt-2 inline-flex items-center gap-x-1 text-sm font-semibold text-primary-500 hover:text-primary-600 focus-visible:outline-none"
                            onClick={() => {
                              // The team dialog lives in the "Details" tab, which
                              // unmounts on other tabs — switch to it so the
                              // dialog is mounted, then open it.
                              setSelected("Details")
                              setTeamTab("Team Members")
                              setTeamDialogOpen(true)
                            }}
                          >
                            Manage Team <span aria-hidden>→</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="mt-6 space-y-3">
                  <div className="flex items-center gap-x-[6.4px]">
                    <Clock className="size-[18px] text-primary-500" />
                    <span className="text-sm leading-none font-medium text-dark-blue-400">
                      {isServiceListing
                        ? "Ongoing duration"
                        : durationDays > 0
                          ? `Starting from a ${durationValue} ${durationUnit} duration`
                          : "Add a scope to see duration"}
                    </span>
                  </div>
                  <div className="flex items-center gap-x-[6.4px]">
                    <Users03 className="size-[18px] text-primary-500" />
                    <span className="text-sm leading-none font-medium text-dark-blue-400">
                      {(() => {
                        let memberSlots = 0
                        for (const phase of project.scope ?? []) {
                          for (const row of phase.rows ?? []) {
                            if (row.role || row.task) memberSlots++
                          }
                        }
                        return memberSlots > 0
                          ? `Minimum ${memberSlots} team member${memberSlots !== 1 ? "s" : ""}`
                          : "Add a scope to see team members"
                      })()}
                    </span>
                  </div>
                </div>

                <div className="mt-6 flex items-center gap-x-3">
                  {hasChanges ? (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            size="md"
                            onClick={() => {
                              if (hasPublishBlockingErrors) {
                                setPublishAttempted(true)
                                return
                              }
                              setPublishDialogOpen(true)
                            }}
                            disabled={isPublishing}
                            aria-disabled={hasPublishBlockingErrors}
                            className={cn(
                              hasPublishBlockingErrors &&
                                (publishAttempted
                                  ? "bg-error-500 hover:bg-error-600 border-error-500"
                                  : "opacity-40 hover:opacity-40")
                            )}
                          >
                            Publish
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent
                          side="top"
                          visual="white"
                          className="max-w-[200px] text-center"
                        >
                          Publish your changes to the marketplace
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  ) : isPublished ? (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="outlined"
                                visual="gray"
                                size="md"
                                className="gap-x-1.5"
                              >
                                <span className="size-2 rounded-full bg-success-500" />
                                Live
                                <ChevronDown className="size-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="start">
                              <DropdownMenuItem
                                onSelect={handleUnpublish}
                                disabled={isPublishing}
                              >
                                <EyeOff className="size-4 mr-2" />
                                Unpublish
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TooltipTrigger>
                        <TooltipContent
                          side="top"
                          visual="white"
                          className="max-w-[200px] text-center"
                        >
                          Your listing is live and visible on the marketplace
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  ) : (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="outlined"
                                visual="gray"
                                size="md"
                                className="gap-x-1.5"
                              >
                                <span className="size-2 rounded-full bg-gray-400" />
                                Draft
                                <ChevronDown className="size-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="start">
                              <DropdownMenuItem
                                onSelect={() => {
                                  if (hasPublishBlockingErrors) {
                                    setPublishAttempted(true)
                                    return
                                  }
                                  setPublishDialogOpen(true)
                                }}
                                disabled={isPublishing}
                              >
                                <Eye className="size-4 mr-2" />
                                Publish
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TooltipTrigger>
                        <TooltipContent
                          side="top"
                          visual="white"
                          className="max-w-[200px] text-center"
                        >
                          Saved as draft, not yet visible on the marketplace
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="outlined"
                          visual="gray"
                          size="md"
                          className="flex-auto"
                          onClick={() => setIsClientView(true)}
                        >
                          <Eye className="size-[15px]" />
                          View as Client
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent
                        side="top"
                        visual="white"
                        className="max-w-[200px] text-center"
                      >
                        Preview as a client
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <IconButton
                          variant="outlined"
                          visual="gray"
                          size="md"
                          onClick={() =>
                            inviteWindow.toggle(true, "Share Your Project")
                          }
                        >
                          <Share06 className="size-[15px]" />
                        </IconButton>
                      </TooltipTrigger>
                      <TooltipContent
                        side="top"
                        visual="white"
                        className="max-w-[200px] text-center"
                      >
                        Share listing
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>

                {publishAttempted &&
                  (missingPublishFields.length > 0 || missingPublishImages) && (
                    <div className="mt-2">
                      {missingPublishFields.length > 0 && (
                        <p className="text-sm text-error-500">
                          Please add {joinWithAnd(missingPublishFields)}
                        </p>
                      )}
                      {missingPublishImages && (
                        <p className="mt-3 text-sm text-error-500">
                          Please add at least 3 images to your project
                        </p>
                      )}
                    </div>
                  )}

                {publishError &&
                  !["faqs", "shortDescription", "fullDescription"].includes(
                    publishErrorField ?? ""
                  ) && (
                    <div className="mt-2">
                      <p className="text-sm text-error-500">
                        {moderationFieldLabel(publishErrorField)
                          ? `Check your ${moderationFieldLabel(
                              publishErrorField
                            )} — ${publishError}`
                          : publishError}
                      </p>
                    </div>
                  )}

                {/* Publish confirmation dialog */}
                <Dialog
                  open={publishDialogOpen}
                  onOpenChange={setPublishDialogOpen}
                >
                  <DialogContent className="p-0" style={{ maxWidth: 416 }}>
                    <div className="p-6">
                      <DialogTitle>
                        Publish this{" "}
                        {project.listingType === "service"
                          ? "service"
                          : "project"}
                        ?
                      </DialogTitle>
                      <DialogDescription className="mt-2">
                        Your{" "}
                        {project.listingType === "service"
                          ? "service"
                          : "project"}{" "}
                        will be visible live in the marketplace.
                      </DialogDescription>
                    </div>

                    <div className="border-t border-gray-200 py-4 px-6 flex items-center justify-between">
                      <DialogClose asChild>
                        <Button variant="link" visual="gray">
                          <X className="size-[15px]" />
                          Cancel
                        </Button>
                      </DialogClose>
                      <Button
                        variant="outlined"
                        visual="gray"
                        onClick={handlePublish}
                        disabled={isPublishing}
                      >
                        {isPublishing ? "Publishing..." : "Yes, Publish"}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>

                {/* Add a Featured Video dialog */}
                <Dialog
                  open={videoDialogOpen}
                  onOpenChange={setVideoDialogOpen}
                >
                  <DialogContent className="max-w-[480px] p-0">
                    <div className="border-b border-gray-200 p-6">
                      <div className="flex items-start justify-between">
                        <div>
                          <DialogTitle>Add a Featured Video</DialogTitle>
                          <DialogDescription className="mt-2">
                            Grab attention with a compelling video that
                            showcases your vision.
                          </DialogDescription>
                        </div>
                        <IconButton
                          type="button"
                          onClick={() => setVideoDialogOpen(false)}
                          variant="ghost"
                          visual="gray"
                        >
                          <X className="size-5" />
                        </IconButton>
                      </div>

                      <div className="mt-6">
                        <InputGroup>
                          <InputLeftAddon>http://</InputLeftAddon>
                          <Input
                            placeholder="www.video.com"
                            value={videoUrlInput}
                            onChange={(e) => setVideoUrlInput(e.target.value)}
                          />
                        </InputGroup>
                      </div>
                    </div>

                    <div className="py-4 px-6 flex items-center justify-between">
                      <DialogClose asChild>
                        <Button variant="link" visual="gray">
                          <X className="size-[15px]" />
                          Cancel
                        </Button>
                      </DialogClose>
                      <Button
                        onClick={() => {
                          const url = videoUrlInput.trim()
                          if (url) {
                            const fullUrl = url.startsWith("http")
                              ? url
                              : `https://${url}`
                            setProject((prev: any) => ({
                              ...prev,
                              featuredVideo: fullUrl,
                            }))
                            setHasChanges(true)
                            saveProjectFields({ videoUrl: fullUrl })
                          }
                          setVideoDialogOpen(false)
                        }}
                        disabled={!videoUrlInput.trim()}
                      >
                        Save
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </div>

            <Card className="w-full hover:border-gray-200 hover:ring-0">
              <div className="w-full p-6">
                <div className="flex items-center justify-between gap-3">
                  <h2 className="text-base font-semibold text-dark-blue-400">
                    Level Up Your Project Listing Skills
                  </h2>
                  <HelpCircle className="size-4 text-gray-400" />
                </div>

                <div className="mt-6 space-y-3">
                  {[
                    {
                      title:
                        "Crafting Job Descriptions That Attract Top Talent",
                      rating: "4.9",
                      level: "Beginner",
                      image: "/tutorial-thumbnails/image.png",
                      ratingIcon: "/tutorial-icons/star.svg",
                      levelIcon: "/tutorial-icons/level-beginner.svg",
                      isNew: true,
                    },
                    {
                      title: "Mastering Behavioral Interview Questions",
                      rating: "4.7",
                      level: "Beginner",
                      image: "/tutorial-thumbnails/image-1.png",
                      ratingIcon: "/tutorial-icons/star.svg",
                      levelIcon: "/tutorial-icons/level-beginner-2.svg",
                    },
                    {
                      title: "How to Spot Red Flags in Candidate Interviews",
                      rating: "4.5",
                      level: "Advanced",
                      image: "/tutorial-thumbnails/image-2.png",
                      ratingIcon: "/tutorial-icons/star.svg",
                      levelIcon: "/tutorial-icons/level-advanced.svg",
                    },
                    {
                      title: "Building an Inclusive and Diverse Hiring Process",
                      rating: "4.1",
                      level: "Intermediate",
                      image: "/tutorial-thumbnails/image-3.png",
                      ratingIcon: "/tutorial-icons/star.svg",
                      levelIcon: "/tutorial-icons/level-intermediate.svg",
                    },
                  ].map((tutorial, index) => (
                    <div
                      key={`${tutorial.title}-${index}`}
                      className="flex items-start gap-3 border-b border-gray-200 pb-3 last:border-b-0 last:pb-0"
                    >
                      <div className="relative h-16 w-[104px] shrink-0 overflow-hidden rounded-[8px]">
                        <NextImage
                          src={tutorial.image}
                          alt={tutorial.title}
                          fill
                          className="object-cover"
                        />
                        {tutorial.isNew ? (
                          <span className="absolute left-1 top-1 rounded-[3px] bg-success-500 p-[3px] text-[8px] font-bold leading-none text-white">
                            NEW
                          </span>
                        ) : null}
                        <span className="absolute bottom-1 right-1 rounded-[3px] bg-black/50 p-[3px] text-[8px] font-bold leading-none text-white">
                          01:20
                        </span>
                      </div>
                      <div className="min-w-0">
                        <NextLink
                          href="#"
                          className="line-clamp-2 text-xs font-semibold leading-normal text-dark-blue-400 hover:underline"
                        >
                          {tutorial.title}
                        </NextLink>
                        <div className="mt-2 flex items-center justify-between gap-3">
                          <div className="inline-flex items-center gap-1">
                            <NextImage
                              src={tutorial.ratingIcon}
                              alt=""
                              width={13}
                              height={13}
                              aria-hidden="true"
                            />
                            <span className="text-xs font-medium leading-4 text-dark-blue-400">
                              {tutorial.rating}
                            </span>
                          </div>
                          <div className="ml-auto inline-flex items-center gap-1">
                            <NextImage
                              src={tutorial.levelIcon}
                              alt=""
                              width={16}
                              height={16}
                              aria-hidden="true"
                            />
                            <span className="text-xs font-medium leading-4 text-gray-500">
                              {tutorial.level}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <Button
                  variant="outlined"
                  visual="gray"
                  className="mt-6 w-full text-sm font-semibold text-dark-blue-400"
                >
                  View More Tutorials
                </Button>
              </div>
            </Card>
          </div>
        </div>

        <div className="pb-[100px]" />
      </div>

      <MarketplaceFooter />

      {/* Unsaved changes navigation warning */}
      <Dialog open={unsavedNavOpen} onOpenChange={setUnsavedNavOpen}>
        <DialogContent className="max-w-[409px] p-0">
          <div className="p-6 border-b border-gray-200">
            <DialogTitle>You have unpublished changes</DialogTitle>
            <DialogDescription className="mt-2">
              Your changes haven&apos;t been published yet. What would you like
              to do?
            </DialogDescription>
          </div>
          <div className="py-4 flex rounded-b-xl bg-gray-25 items-center justify-between px-6">
            <Button
              className="opacity-50 hover:opacity-100"
              visual="gray"
              variant="link"
              onClick={() => {
                setHasChanges(false)
                setUnsavedNavOpen(false)
                if (pendingNavUrl) {
                  router.push(pendingNavUrl)
                } else {
                  router.back()
                }
                setPendingNavUrl(null)
              }}
            >
              Discard Changes
            </Button>
            <div className="flex items-center gap-2">
              <DialogClose asChild>
                <Button
                  variant="outlined"
                  visual="gray"
                  onClick={pushBackGuard}
                >
                  Keep Editing
                </Button>
              </DialogClose>
              <Button
                onClick={() => {
                  setUnsavedNavOpen(false)
                  setPendingNavUrl(null)
                  if (hasPublishBlockingErrors) {
                    setPublishAttempted(true)
                    return
                  }
                  setPublishDialogOpen(true)
                }}
              >
                Publish
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

export default function ProjectDetails() {
  return (
    <AuthenticatedRoute>
      <ProjectDetailsInner />
    </AuthenticatedRoute>
  )
}
