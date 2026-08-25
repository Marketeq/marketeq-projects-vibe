"use client"

import React, {
  type CSSProperties,
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { useAuth } from "@/contexts/auth"
import { UserAPI } from "@/service/http/user"
import { ClientAPI } from "@/service/http/client"
import {
  getCertificationBrandFromUrl,
  getCompanyBrandFromName,
} from "@/src/lib/certification-brand"
import { getCurrentUser } from "@/utils/auth"
import { getComputedStyle } from "@/utils/dom-utils"
import { capitalize, cn, toPxIfNumber } from "@/utils/functions"
import { useClickOutside } from "@/utils/hooks"
import {
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Download01,
  Briefcase,
  Check,
  CheckCircle,
  CheckVerified02,
  Stars02,
  Bank,
  Phone,
  Trash01,
  Trash2,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  Clock,
  Edit03,
  Eye,
  EyeOff,
  FileText,
  Heart,
  Image01,
  MapPin,
  MarkerPin02,
  MessageSquare01,
  MessageTextSquare01,
  Monitor,
  PackagePlus,
  Plus,
  Plus2,
  RefreshCw,
  SearchMd,
  Share,
  Share01,
  Share06,
  Share07,
  Star,
  Trash03,
  Upload,
  Upload01,
  User,
  X,
  XCircle,
} from "@blend-metrics/icons"
import * as RadixTabs from "@radix-ui/react-tabs"
import { TooltipArrow } from "@radix-ui/react-tooltip"
import { Variants, motion } from "framer-motion"
import { TbStar, TbStarHalfFilled } from "react-icons/tb"
import { useToggle } from "react-use"
import type { UserProfile } from "@/types/user"
import {
  AboutMeDialog,
  AffiliatedTeamsDialog,
  AvailabilityDialog,
  CertificationsDialog,
  EducationDialog,
  IndustryExpertiseDialog,
  LanguagesDialog,
  MoreInfoDialog,
  SkillsDialog,
  WorkExperienceDialog,
} from "@/components/edit-profile-modals"
import { StatusDialog } from "@/app/(group)/complete-profile/page"
import { HireMeButton } from "@/components/hire-me-button"
import { useInviteWindowStore } from "@/components/invite-window"
import { LikeDislike } from "@/components/like-dislike"
import { Money } from "@/components/money"
import NextImage from "@/components/next-image"
import dynamic from "next/dynamic"
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  MouseSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core"
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable"
import { restrictToVerticalAxis } from "@dnd-kit/modifiers"
import { CSS } from "@dnd-kit/utilities"
import { GripVertical2 } from "@/components/icons/grip-vertical-2"

const CaseStudyBuilder = dynamic(
  () => import("@/components/case-study-builder"),
  { ssr: false }
)

const PORTFOLIO_SAMPLE_IMG = "/Adobe-banner.png"

const getInitials = (name?: string | null): string => {
  const parts = (name ?? "").trim().split(/\s+/).filter(Boolean)
  if (!parts.length) return "?"
  const first = parts[0].charAt(0)
  const last = parts.length > 1 ? parts[parts.length - 1].charAt(0) : ""
  return (first + last).toUpperCase() || "?"
}

interface SimilarProfile {
  id: string
  name: string
  username: string | null
  avatarUrl: string | null
  jobTitle: string | null
  hourlyRate: number
  rateMin: number | null
  rateMax: number | null
  rating: number
}

type PortfolioCardState = "filled" | "hidden" | "empty"
interface PortfolioCardItem {
  id: string
  state: PortfolioCardState
  img?: string
}

const SortablePortfolioCard = ({
  card,
  onOpenBuilder,
  onToggleHide,
  onDelete,
}: {
  card: PortfolioCardItem
  onOpenBuilder: () => void
  onToggleHide: () => void
  onDelete: () => void
}) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: card.id })
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }
  const stop =
    (fn: () => void) => (e: React.MouseEvent) => {
      e.stopPropagation()
      fn()
    }
  return (
    <article
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={cn(
        "group relative h-[200px] select-none touch-none overflow-hidden rounded-lg border border-gray-200 bg-gray-100 cursor-grab active:cursor-grabbing",
        isDragging && "z-10 opacity-70 shadow-lg"
      )}
    >
      {card.state === "empty" ? (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-50">
          <Image01 className="size-10 text-gray-300" />
        </div>
      ) : (
        <img
          src={card.img}
          alt="Portfolio"
          draggable={false}
          className={cn(
            "h-full w-full object-cover",
            card.state === "hidden" && "opacity-40"
          )}
        />
      )}

      <div className="absolute inset-0 flex items-center justify-center gap-x-3 bg-black/0 opacity-0 transition-all duration-300 group-hover:bg-black/50 group-hover:opacity-100">
        {card.state === "empty" ? (
          <Button
            type="button"
            visual="gray"
            className="bg-white"
            onClick={stop(onOpenBuilder)}
          >
            <Upload className="size-[15px]" /> Add Case Study
          </Button>
        ) : (
          <>
            <IconButton
              type="button"
              variant="ghost"
              visual="gray"
              className="rounded-full bg-white/90 text-gray-700 hover:bg-white"
              onClick={stop(onOpenBuilder)}
            >
              <Edit03 className="size-4" />
            </IconButton>
            <IconButton
              type="button"
              variant="ghost"
              visual="gray"
              className="rounded-full bg-white/90 text-gray-700 hover:bg-white"
              onClick={stop(onToggleHide)}
            >
              {card.state === "hidden" ? (
                <Eye className="size-4" />
              ) : (
                <EyeOff className="size-4" />
              )}
            </IconButton>
            <IconButton
              type="button"
              variant="ghost"
              visual="gray"
              className="rounded-full bg-white/90 text-error-500 hover:bg-white"
              onClick={stop(onDelete)}
            >
              <Trash03 className="size-4" />
            </IconButton>
          </>
        )}
      </div>
      {card.state !== "empty" && (
        <div className="pointer-events-none absolute inset-x-0 top-2 flex justify-center opacity-0 transition-opacity duration-300 group-hover:opacity-100">
          <svg
            viewBox="0 0 46 6"
            className="w-11"
            fill="#ffffff"
            fillOpacity="0.65"
            aria-hidden="true"
          >
            {[1, 5].map((cy) =>
              Array.from({ length: 12 }, (_, i) => 1 + i * 4).map((cx) => (
                <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r="1.3" />
              ))
            )}
          </svg>
        </div>
      )}
    </article>
  )
}

const PortfolioAddCard = ({
  onOpenBuilder,
}: {
  onOpenBuilder: () => void
}) => (
  <article className="group relative h-[200px] overflow-hidden rounded-lg border border-gray-200 bg-gray-100">
    <div className="absolute inset-0 flex items-center justify-center bg-gray-50">
      <Image01 className="size-10 text-gray-300" />
    </div>
    <div className="absolute inset-0 flex items-center justify-center gap-x-3 bg-black/0 opacity-0 transition-all duration-300 group-hover:bg-black/50 group-hover:opacity-100">
      <Button
        type="button"
        visual="gray"
        className="bg-white"
        onClick={onOpenBuilder}
      >
        <Upload className="size-[15px]" /> Add Case Study
      </Button>
    </div>
  </article>
)

const PortfolioCards = ({
  portfolio,
  onOpenBuilder,
}: {
  portfolio?: { id: string | number; imageUrl?: string | null }[]
  onOpenBuilder: () => void
}) => {
  const [cards, setCards] = useState<PortfolioCardItem[]>(() =>
    portfolio && portfolio.length > 0
      ? portfolio.map((item) => ({
          id: String(item.id),
          state: "filled" as const,
          img: item.imageUrl ?? PORTFOLIO_SAMPLE_IMG,
        }))
      : [
          { id: "p1", state: "filled", img: PORTFOLIO_SAMPLE_IMG },
          { id: "p2", state: "hidden", img: PORTFOLIO_SAMPLE_IMG },
          { id: "p3", state: "empty" },
        ]
  )
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  )
  const onDragEnd = (e: DragEndEvent) => {
    const { active, over } = e
    if (over && active.id !== over.id) {
      setCards((prev) => {
        const movable = prev.filter((c) => c.state !== "empty")
        const fixed = prev.filter((c) => c.state === "empty")
        const oldIndex = movable.findIndex((c) => c.id === active.id)
        const newIndex = movable.findIndex((c) => c.id === over.id)
        if (oldIndex === -1 || newIndex === -1) return prev
        return [...arrayMove(movable, oldIndex, newIndex), ...fixed]
      })
    }
  }

  const sortableCards = cards.filter((c) => c.state !== "empty")
  const emptyCards = cards.filter((c) => c.state === "empty")
  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={onDragEnd}
    >
      <SortableContext
        items={sortableCards.map((c) => c.id)}
        strategy={rectSortingStrategy}
      >
        <ShowMoreLessRoot>
          {({ isShowing, setIsShowing, ref, scrollHeight }) => (
            <>
              <div
                ref={ref}
                className="grid grid-cols-3 gap-6 overflow-hidden [interpolate-size:allow-keywords] transition-[height] duration-500"
                style={{
                  height: isShowing
                    ? "auto"
                    : scrollHeight
                      ? toPxIfNumber(scrollHeight)
                      : "auto",
                }}
              >
                <ShowMoreLess max={3}>
                  {[
                    ...sortableCards.map((card) => (
                      <SortablePortfolioCard
                        key={card.id}
                        card={card}
                        onOpenBuilder={onOpenBuilder}
                        onToggleHide={() =>
                          setCards((prev) =>
                            prev.map((c) =>
                              c.id === card.id
                                ? {
                                    ...c,
                                    state:
                                      c.state === "hidden"
                                        ? "filled"
                                        : "hidden",
                                  }
                                : c
                            )
                          )
                        }
                        onDelete={() =>
                          setCards((prev) =>
                            prev.filter((c) => c.id !== card.id)
                          )
                        }
                      />
                    )),
                    ...emptyCards.map((card) => (
                      <PortfolioAddCard
                        key={card.id}
                        onOpenBuilder={onOpenBuilder}
                      />
                    )),
                  ]}
                </ShowMoreLess>
              </div>

              {cards.length > 3 && (
                <div className="my-6">
                  <div className="flex items-center gap-x-1">
                    <span className="flex-auto inline-block h-px bg-gray-200" />
                    <Button
                      variant="link"
                      visual="gray"
                      onClick={() => setIsShowing((prev) => !prev)}
                    >
                      {isShowing ? "View Less" : "View More"}
                    </Button>
                    <span className="flex-auto inline-block h-px bg-gray-200" />
                  </div>
                </div>
              )}
            </>
          )}
        </ShowMoreLessRoot>
      </SortableContext>
    </DndContext>
  )
}
import NextLink from "@/components/next-link"
import {
  ReadMoreLess,
  ReadMoreLessComp,
  ReadMoreLessRoot,
} from "@/components/read-more-less"
import { SaveTalentButton } from "@/components/save-talent-button"
import {
  ShowMoreLess,
  ShowMoreLessComp,
  ShowMoreLessRoot,
} from "@/components/show-more-less"
import {
  Avatar,
  AvatarFallback,
  AvatarGroup,
  AvatarImage,
  Badge,
  Button,
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNextTrigger,
  CarouselPreviousTrigger,
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioTrigger,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Favorite,
  FavoriteRoot,
  IconButton,
  ImageEditor,
  Input,
  InputGroup,
  InputLeftElement,
  InputRightElement,
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
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Toggle,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
  buttonVariants,
  tabsListVariants,
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
  Card,
  Textarea,
  DisclosureContent,
  ErrorMessage,
  Switch,
} from "@/components/ui"
import { ScrollBar } from "@/components/ui"
import { Checkbox } from "@/components/ui/checkbox"

const variants: Variants = {
  expanded: {
    width: 375,
    transition: {
      duration: 0.3,
    },
  },
  collapsed: {
    width: 220,
    transition: {
      duration: 0.3,
    },
  },
}

const SectionSearchBar = () => {
  const [email, setEmail] = useState("")
  const [isExpanded, setIsExpanded] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useClickOutside([ref], () => setIsExpanded(false))

  const on = () => setIsExpanded(true)

  return (
    <motion.div
      ref={ref}
      className="shrink-0 w-[220px]"
      animate={isExpanded ? "expanded" : "collapsed"}
      variants={variants}
    >
      <InputGroup className="w-full">
        <Input
          id="email"
          type="email"
          onClick={on}
          className="peer text-sm leading-5 h-10 right-3 pl-[34px]"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="Search"
        />
        <InputLeftElement className="text-gray-400 peer-focus:text-primary-500">
          <SearchMd className="size-4" />
        </InputLeftElement>
        {email ? (
          <InputRightElement>
            <button
              className="focus-visible:outline-none inline-block"
              onClick={() => setEmail("")}
            >
              <XCircle className="size-4 text-gray-500/50 hover:text-gray-500" />
            </button>
          </InputRightElement>
        ) : null}
      </InputGroup>
    </motion.div>
  )
}

const Shimmer = ({ className }: { className?: string }) => (
  <div
    className={cn("relative bg-gray-100 rounded overflow-hidden", className)}
  >
    <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-gray-100 via-white to-gray-100" />
  </div>
)

interface WizardValue {
  id: string
  q: string
  a: string
}

const SortableValueItem = ({
  id,
  value,
  index,
  onChange,
  onDelete,
}: {
  id: string
  value: { q: string; a: string }
  index: number
  onChange: (id: string, patch: Partial<{ q: string; a: string }>) => void
  onDelete: (id: string) => void
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id })

  const style: CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    position: "relative" as const,
    zIndex: isDragging ? 10 : undefined,
  }

  return (
    <AccordionItem
      ref={setNodeRef}
      style={style}
      value={id}
      className="rounded-lg border border-gray-200 bg-white"
    >
      <AccordionTrigger className="w-full p-4 flex items-center gap-3 [&[data-state=open]_.closed-icons]:hidden [&[data-state=closed]_.open-icons]:hidden [&[data-state=open]_.closed-text]:hidden [&[data-state=open]_.open-text]:inline">
        <button
          type="button"
          className="cursor-grab text-gray-400 hover:text-gray-600"
          onClick={(e) => e.stopPropagation()}
          {...attributes}
          {...listeners}
        >
          <GripVertical2 />
        </button>
        <div className="min-w-0 flex-1 text-left">
          <span className="text-sm font-bold text-dark-blue-400">
            Value {index + 1}
            <span className="closed-text">:</span>
          </span>
          <span className="closed-text"> </span>
          <span className="closed-text text-sm text-dark-blue-400">
            {value.q}
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
              onDelete(id)
            }}
          >
            <Trash2 className="size-4" />
          </IconButton>
        </div>
      </AccordionTrigger>
      <DisclosureContent className="px-4 pb-4">
        <p className="text-sm font-light text-dark-blue-400">
          Make this clear and concise, this is what customers will see first.
        </p>
        <Input
          className="mt-2"
          value={value.q}
          onChange={(e) => onChange(id, { q: e.target.value })}
        />
        <div className="mt-4">
          <h3 className="text-sm font-bold text-dark-blue-400">Answer</h3>
          <p className="mt-1 text-sm font-light text-dark-blue-400">
            Provide a detailed, helpful response that fully addresses the
            question
          </p>
        </div>
        <Textarea
          className="mt-2"
          rows={4}
          value={value.a}
          onChange={(e) => onChange(id, { a: e.target.value })}
          maxLength={300}
        />
        <div className="mt-1 flex items-center justify-between">
          <Button variant="outlined" visual="gray" size="sm">
            <Stars02 className="size-[15px]" />
            Generate With AI
          </Button>
          <span className="text-xs text-gray-500">{value.a.length}/300</span>
        </div>
      </DisclosureContent>
    </AccordionItem>
  )
}

const WorkplaceValuesEditor = ({
  values,
  setValues,
  draftProjectId,
  onRecentQuestionsChange,
  publishAttempted = false,
  moderationError = null,
}: {
  values: WizardValue[]
  setValues: React.Dispatch<React.SetStateAction<WizardValue[]>>
  draftProjectId: string | null
  onRecentQuestionsChange?: (hasQuestions: boolean) => void
  publishAttempted?: boolean
  moderationError?: string | null
}) => {
  const completedValueCount = values.filter(
    (value) => value.q.trim() && value.a.trim()
  ).length
  const showValueError =
    completedValueCount < 3 && (publishAttempted || values.length > 0)
  const [questionsTab, setQuestionsTab] = useState("Values")
  const [recentQTab, setRecentQTab] = useState("all")
  const [openValueId, setOpenValueId] = useState<string | null>(null)
  const [aiOpen, setAiOpen] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [genError, setGenError] = useState(false)
  const [suggestions, setSuggestions] = useState<
    Array<{ question: string; answer: string; added?: boolean }>
  >([])


  const remainingSlots = Math.max(0, 10 - values.length)
  const addedCount = suggestions.filter((s) => s.added).length

  const runValueGeneration = async () => {
    if (!draftProjectId) return
    setGenError(false)
    setGenerating(true)
    try {
      // TODO: swap for the real endpoint when it exists.
      const res = { data: [] as Array<{ question: string; answer: string }> }
      const data = (res?.data ?? []) as Array<{
        question: string
        answer: string
      }>
      const seen = new Set<string>()
      const deduped = data.filter((d) => {
        const key = (d?.question ?? "").trim().toLowerCase()
        if (!key || seen.has(key)) return false
        seen.add(key)
        return true
      })
      setSuggestions(deduped.map((d) => ({ ...d, added: false })))
    } catch (error) {
      console.error("Failed to generate Values", error)
      setGenError(true)
    } finally {
      setGenerating(false)
    }
  }

  const openAiValueDialog = () => {
    setAiOpen(true)
    void runValueGeneration()
  }

  const insertSuggestion = (idx: number) => {
    const s = suggestions[idx]
    if (!s || s.added || values.length >= 10) return
    setValues((items) => [
      ...items,
      { id: `value-ai-${Date.now()}-${idx}`, q: s.question, a: s.answer },
    ])
    setSuggestions((prev) =>
      prev.map((x, i) => (i === idx ? { ...x, added: true } : x))
    )
  }

  const removeSuggestion = (idx: number) => {
    const s = suggestions[idx]
    if (!s) return
    const key = s.question.trim().toLowerCase()
    setValues((items) => items.filter((f) => f.q.trim().toLowerCase() !== key))
    setSuggestions((prev) =>
      prev.map((x, i) => (i === idx ? { ...x, added: false } : x))
    )
  }

  const insertAllSuggestions = () => {
    const seen = new Set(values.map((f) => f.q.trim().toLowerCase()))
    const toAdd = suggestions
      .filter((s) => !s.added && !seen.has(s.question.trim().toLowerCase()))
      .slice(0, remainingSlots)
    if (toAdd.length === 0) return
    setValues((items) => [
      ...items,
      ...toAdd.map((s, i) => ({
        id: `value-ai-all-${Date.now()}-${i}`,
        q: s.question,
        a: s.answer,
      })),
    ])
    const addedKeys = new Set(toAdd.map((s) => s.question.trim().toLowerCase()))
    setSuggestions((prev) =>
      prev.map((x) =>
        addedKeys.has(x.question.trim().toLowerCase())
          ? { ...x, added: true }
          : x
      )
    )
  }

  const handleAddValue = () => {
    setValues((items) =>
      items.length >= 10
        ? items
        : [...items, { id: `value-${Date.now()}-${items.length}`, q: "", a: "" }]
    )
  }

  const handleValueChange = (
    id: string,
    patch: Partial<{ q: string; a: string }>
  ) => {
    setValues((items) =>
      items.map((item) => (item.id === id ? { ...item, ...patch } : item))
    )
  }

  const handleDeleteValue = (id: string) => {
    setValues((items) => items.filter((item) => item.id !== id))
  }

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 150, tolerance: 5 },
    }),
    useSensor(KeyboardSensor)
  )

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (over && active.id !== over.id) {
      setValues((items) => {
        const oldIndex = items.findIndex((i) => i.id === active.id)
        const newIndex = items.findIndex((i) => i.id === over.id)
        return arrayMove(items, oldIndex, newIndex)
      })
    }
  }

  return (
    <div className="flex flex-col">

                <div className="mt-4 flex items-center gap-3">
                  <Button
                    variant="outlined"
                    visual="gray"
                    size="sm"
                    onClick={openAiValueDialog}
                    disabled={!draftProjectId}
                  >
                    <Stars02 className="size-[15px]" />
                    Generate With AI
                  </Button>
                  <Button
                    variant="outlined"
                    visual="gray"
                    size="sm"
                    onClick={handleAddValue}
                    disabled={values.length >= 10}
                  >
                    <Plus className="size-[15px]" />
                    Add Value
                  </Button>
                </div>

                {showValueError && (
                  <ErrorMessage size="sm" className="mt-2">
                    Please add at least 3 Values before publishing.
                  </ErrorMessage>
                )}

                {moderationError && (
                  <ErrorMessage size="sm" className="mt-2">
                    {`Value content did not meet community guidelines. ${moderationError}`}
                  </ErrorMessage>
                )}

                <Dialog open={aiOpen} onOpenChange={setAiOpen}>
                  <DialogContent className="max-w-[640px] p-0 gap-0">
                    <div className="px-6 pt-6 pb-4 border-b border-gray-200 flex items-start justify-between">
                      <div className="flex items-start gap-x-2">
                        <Stars02 className="size-5 text-dark-blue-400 shrink-0 mt-0.5" />
                        <div>
                          <DialogTitle>AI Generated Workplace Values</DialogTitle>
                          <DialogDescription className="mt-1">
                            Review and adjust your AI-generated values as needed
                          </DialogDescription>
                        </div>
                      </div>
                      <Badge
                        className="rounded-full bg-success-50 text-success-600 shrink-0"
                        visual="gray"
                      >
                        {addedCount} of {suggestions.length} added
                      </Badge>
                    </div>

                    {remainingSlots <
                      suggestions.filter((s) => !s.added).length && (
                      <p className="px-6 pt-4 text-sm text-error-500">
                        You currently have {values.length} values in total, so
                        you can only add {remainingSlots} more
                      </p>
                    )}

                    <div className="px-6 py-4 max-h-[420px] overflow-y-auto space-y-3">
                      {generating ? (
                        <p className="py-8 text-center text-sm text-gray-500">
                          Generating suggestions…
                        </p>
                      ) : genError ? (
                        <div className="py-8 text-center">
                          <p className="text-sm text-error-500">
                            Suggestions couldn&apos;t be loaded. Try again.
                          </p>
                          <Button
                            variant="outlined"
                            visual="gray"
                            size="sm"
                            className="mt-3"
                            onClick={runValueGeneration}
                          >
                            <Stars02 className="size-[15px]" />
                            Retry
                          </Button>
                        </div>
                      ) : suggestions.length === 0 ? (
                        <p className="py-8 text-center text-sm text-gray-500">
                          No suggestions available.
                        </p>
                      ) : (
                        suggestions.map((s, i) => (
                          <div
                            key={i}
                            className={cn(
                              "group/svalue relative rounded-lg border p-4 transition",
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
                                  className="shrink-0 opacity-0 group-hover/svalue:opacity-100 transition"
                                  onClick={() => insertSuggestion(i)}
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
                                onClick={() => removeSuggestion(i)}
                                className="absolute bottom-3 right-3 size-9 rounded-full border border-success-300 bg-white text-success-600 hover:border-error-300 hover:text-error-500 inline-flex items-center justify-center opacity-0 group-hover/svalue:opacity-100 transition"
                              >
                                <Trash2 className="size-4" />
                              </button>
                            )}
                          </div>
                        ))
                      )}
                    </div>

                    <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
                      <Button
                        variant="outlined"
                        visual="gray"
                        onClick={runValueGeneration}
                        disabled={generating}
                      >
                        <Stars02 className="size-[15px]" />
                        Regenerate
                      </Button>
                      <Button
                        onClick={insertAllSuggestions}
                        disabled={
                          generating ||
                          remainingSlots === 0 ||
                          suggestions.every((s) => s.added)
                        }
                      >
                        Insert All ({suggestions.length})
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>

                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  modifiers={[restrictToVerticalAxis]}
                  onDragEnd={handleDragEnd}
                >
                  {values.length === 0 ? (
                    <div className="mt-4 rounded-lg border-2 border-gray-200 bg-gray-25 p-6">
                      <h3 className="text-base font-semibold text-dark-blue-400">
                        No Values Yet
                      </h3>
                      <p className="mt-1 text-sm font-light text-dark-blue-400">
                        Add a frequently asked question, or generate suggestions
                        with AI, to help visitors understand your project.
                      </p>
                    </div>
                  ) : (
                    <SortableContext
                      items={values.map((f) => f.id)}
                      strategy={verticalListSortingStrategy}
                    >
                      <Accordion
                        type="single"
                        collapsible
                        className="mt-4 space-y-3"
                        value={openValueId ?? ""}
                        onValueChange={(val) => setOpenValueId(val || null)}
                      >
                        {values.map((value, idx) => (
                          <SortableValueItem
                            key={value.id}
                            id={value.id}
                            value={value}
                            index={idx}
                            onChange={handleValueChange}
                            onDelete={handleDeleteValue}
                          />
                        ))}
                      </Accordion>
                    </SortableContext>
                  )}
                </DndContext>
    </div>
  )
}

const LazySection = ({
  children,
  minHeight = 200,
}: {
  children: React.ReactNode
  minHeight?: number
}) => {
  const [isVisible, setIsVisible] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true)
          observer.disconnect()
        }
      },
      { rootMargin: "200px" }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  if (isVisible) return <>{children}</>
  return <div ref={ref} style={{ minHeight }} />
}

const lineClampClass: Record<number, string> = {
  2: "line-clamp-2",
  3: "line-clamp-3",
  4: "line-clamp-4",
  5: "line-clamp-5",
  6: "line-clamp-6",
}

function LineClampText({
  text,
  lines,
  className,
  toggleClassName,
  expandLabel = "...Read More",
  collapseLabel = "Read Less",
  inline = false,
}: {
  text: string
  lines: number
  className?: string
  toggleClassName?: string
  expandLabel?: string
  collapseLabel?: string
  inline?: boolean
}) {
  const [expanded, setExpanded] = useState(false)
  const [clamped, setClamped] = useState(false)
  const [collapsedHeight, setCollapsedHeight] = useState<number>(0)
  const textRef = useRef<HTMLParagraphElement>(null)

  useEffect(() => {
    const el = textRef.current
    if (el) {
      setClamped(el.scrollHeight > el.clientHeight)
      if (!expanded) setCollapsedHeight(el.clientHeight)
    }
  }, [text, expanded])

  const clampCls = lineClampClass[lines] || "line-clamp-3"

  if (inline) {
    return (
      <div
        className="overflow-hidden [interpolate-size:allow-keywords] transition-[height] duration-300"
        style={{
          height: expanded
            ? "auto"
            : collapsedHeight
              ? `${collapsedHeight}px`
              : "auto",
        }}
      >
        <p ref={textRef} className={cn(className, !expanded && clampCls)}>
          {text}
          {clamped && !expanded && (
            <button
              className="inline text-sm font-semibold text-gray-700 hover:text-gray-900 ml-1"
              onClick={() => setExpanded(true)}
            >
              {expandLabel}
            </button>
          )}
          {expanded && collapseLabel && (
            <button
              className="inline text-sm font-semibold text-gray-700 hover:text-gray-900 ml-1"
              onClick={() => setExpanded(false)}
            >
              {collapseLabel}
            </button>
          )}
        </p>
      </div>
    )
  }

  return (
    <>
      <div
        className="overflow-hidden [interpolate-size:allow-keywords] transition-[height] duration-300"
        style={{
          height: expanded
            ? "auto"
            : collapsedHeight
              ? `${collapsedHeight}px`
              : "auto",
        }}
      >
        <p ref={textRef} className={cn(className, !expanded && clampCls)}>
          {text}
        </p>
      </div>
      {clamped && !expanded && (
        <Button
          className={toggleClassName}
          variant="link"
          visual="gray"
          onClick={() => setExpanded(true)}
        >
          {expandLabel}
        </Button>
      )}
      {expanded && collapseLabel && (
        <Button
          className={toggleClassName}
          variant="link"
          visual="gray"
          onClick={() => setExpanded(false)}
        >
          {collapseLabel}
        </Button>
      )}
    </>
  )
}

export default function TalentProfilePage() {
  return (
    <Suspense>
      <Default />
    </Suspense>
  )
}

function Default() {
  const { user, isLoading: isAuthLoading, openAuthModal, setPendingRedirect } = useAuth()
  const { toggle: openInviteWindow } = useInviteWindowStore()
  const router = useRouter()
  const pathname = usePathname()
  const handleShareProfile = () => {
    const base =
      typeof window !== "undefined" ? window.location.origin : ""
    const url = profile?.username
      ? `${base}/talent-profile?username=${encodeURIComponent(profile.username)}`
      : `${base}/talent-profile`
    openInviteWindow(true, "Share Profile", url)
  }
  const searchParams = useSearchParams()
  const usernameParam = searchParams.get("username")
  // Re-applying the signed-out hire prompt on top of dev-main's
  // canHire-free restructure: the Hire Me button renders for everyone now
  // (no gate to re-add — that removal was deliberate), but a signed-out
  // click must open the sign-in modal instead of the Hire Me modal itself.
  // event.preventDefault() stops Radix's DialogTrigger — HireMeButton wraps
  // its trigger Button in <DialogTrigger asChild>, which composes the
  // child's own onClick first and only opens if the event wasn't
  // defaultPrevented. pendingRedirect carries the query string (not just
  // the bare pathname AuthenticatedRoute.tsx uses) so sign-in returns to
  // this exact profile, matching auth-modal.tsx's router.push(pendingRedirect).
  const handleHireButtonClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    // isLoading defaults true until /user/me resolves — same race
    // my-listings/[slug]/page.tsx already guards with `!isAuthLoading`.
    // dev-main removed this page's own render-time gate on purpose, so
    // there's no "wait for auth" state to fall back on except this
    // handler. preventDefault here rather than falling through: a
    // signed-in user's click during this window is a one-time no-op that
    // works normally a moment later once isLoading resolves; letting the
    // click through instead would show the real Hire Me flow to a
    // visitor who may turn out to be signed out, discovered only after
    // they've filled in a rate and duration — a worse failure than one
    // inert click. Do not "simplify" this into falling through.
    if (isAuthLoading) {
      event.preventDefault()
      return
    }
    if (user?.id) return
    event.preventDefault()
    const query = searchParams.toString()
    setPendingRedirect(`${pathname}${query ? `?${query}` : ""}`)
    openAuthModal("sign-in")
  }
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [isProfileLoading, setIsProfileLoading] = useState(true)
  const [showCompleteProfile, setShowCompleteProfile] = useState(false)
  const resumeInputRef = useRef<HTMLInputElement>(null)
  const [resumeFile, setResumeFile] = useState<File | null>(null)
  const [resumeUploadedDate, setResumeUploadedDate] = useState<Date | null>(null)
  const [resumeStatus, setResumeStatus] = useState<
    "idle" | "dragging" | "uploading" | "summary" | "uploaded" | "failed" | "size-limit" | "unsupported" | "not_a_resume" | "nothing_found" | "name_mismatch"
  >("idle")
  const [resumeLoadingMessage, setResumeLoadingMessage] = useState("Reading your resume...")

  type ResumeSummaryData = {
    skills: { count: number; items: { name: string }[] }
    education: { count: number; items: { institution: string; degree: string; fieldOfStudy?: string }[] }
    workExperience: { count: number; items: { title: string; company: string; startDate?: string; endDate?: string }[] }
    certifications: { count: number; items: { name: string; issuingBody?: string }[] }
  }
  const [resumeSummary, setResumeSummary] = useState<ResumeSummaryData | null>(null)
  const [resumeSummaryScrolled, setResumeSummaryScrolled] = useState(false)
  const [resumeSkillsExpanded, setResumeSkillsExpanded] = useState(false)
  const [resumeDeleteConfirmOpen, setResumeDeleteConfirmOpen] = useState(false)

  type ResumeConflict = {
    type: "work" | "education" | "certification"
    existingId: string
    existing: { label: string; detail: string }
    incoming: { label: string; detail: string; company?: string; startDate?: string; endDate?: string; degree?: string; fieldOfStudy?: string; issuer?: string }
  }
  const [resumeConflicts, setResumeConflicts] = useState<ResumeConflict[]>([])
  const [resumeConflictOpen, setResumeConflictOpen] = useState(false)
  const [resumeConflictChecked, setResumeConflictChecked] = useState<Record<string, boolean>>({})
  const [resumeProgress, setResumeProgress] = useState(0)
  const [resumeUploadedSize, setResumeUploadedSize] = useState(0)
  const [resumeParseResultId, setResumeParseResultId] = useState<string | null>(null)

  const RESUME_MAX_SIZE = 5 * 1024 * 1024 // 5MB
  const RESUME_ACCEPTED_TYPES = [
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ]
  const RESUME_ACCEPTED_EXTENSIONS = [".pdf", ".doc", ".docx"]

  const [resumeParsedData, setResumeParsedData] = useState<{
    parseResultId?: string
    skills?: { name: string; proficiency?: string }[]
    education?: { school: string; degree: string; fieldOfStudy?: string; startYear?: number; endYear?: number }[]
    workExperience?: { title: string; company: string; location?: string; startDate?: string; endDate?: string; isCurrentRole?: boolean; description?: string }[]
    certifications?: { name: string; issuer?: string; issueDate?: string }[]
  } | null>(null)

  const processResumeFile = useCallback(async (file: File) => {
    const ext = file.name.substring(file.name.lastIndexOf(".")).toLowerCase()
    if (
      !RESUME_ACCEPTED_TYPES.includes(file.type) &&
      !RESUME_ACCEPTED_EXTENSIONS.includes(ext)
    ) {
      setResumeFile(file)
      setResumeStatus("unsupported")
      return
    }
    if (file.size > RESUME_MAX_SIZE) {
      setResumeFile(file)
      setResumeStatus("size-limit")
      return
    }

    setResumeFile(file)
    setResumeStatus("uploading")
    setResumeLoadingMessage("Reading your resume...")
    setResumeProgress(0)
    setResumeUploadedSize(0)

    try {
      const res = await UserAPI.uploadResume(file)
      const data = res.data
      setResumeProgress(100)
      setResumeUploadedSize(file.size)
      setResumeParseResultId(data.parseResultId || null)

      // Handle classification gate results
      if (data.status === "not_a_resume") {
        setResumeStatus("not_a_resume")
        return
      }
      if (data.status === "nothing_found") {
        setResumeStatus("nothing_found")
        setResumeUploadedDate(data.uploadedAt ? new Date(data.uploadedAt) : new Date())
        return
      }

      // Build parsed data for apply call
      const additions = data.additions || {}
      const skills = (additions.skills?.items || []).map((s: any) => ({ name: s.name }))
      const education = (additions.education?.items || []).map((e: any) => ({
        school: e.institution || "",
        degree: e.degree || "",
        fieldOfStudy: e.fieldOfStudy || "",
      }))
      const workExperience = (additions.workExperience?.items || []).map((w: any) => ({
        title: w.title || "",
        company: w.company || "",
        startDate: w.startDate,
        endDate: w.endDate,
        description: w.description || "",
      }))
      const certifications = (additions.certifications?.items || []).map((c: any) => ({
        name: c.name || "",
        issuer: c.issuingBody || "",
      }))
      const industries = (additions.industries?.items || []).map((i: any) => ({ name: i.name || "" }))

      setResumeParsedData({
        parseResultId: data.parseResultId,
        skills,
        education,
        workExperience,
        certifications,
      })

      // Set summary for display
      setResumeSummary(additions)

      // Name mismatch guard: if the resume belongs to someone else, block auto-apply
      if (data.nameMismatch) {
        setResumeStatus("name_mismatch")
        return
      }

      // Apply additions immediately (per docs: additive is applied on arrival)
      try {
        setResumeLoadingMessage("Updating your profile...")
        // Show category-specific messages as we apply
        if (skills.length > 0) setResumeLoadingMessage(`Adding ${skills.length} skill${skills.length !== 1 ? "s" : ""} to your profile...`)
        await UserAPI.applyResume({
          parseResultId: data.parseResultId,
          skills,
          education,
          workExperience,
          certifications,
          industries,
        })
        if (workExperience.length > 0) setResumeLoadingMessage(`Added ${workExperience.length} work experience${workExperience.length !== 1 ? "s" : ""}...`)
        // Refresh profile to reflect applied data
        if (profile?.id) {
          setResumeLoadingMessage("Finishing up...")
          const profileRes = await UserAPI.getProfile(profile.id)
          if (profileRes.data) setProfile(profileRes.data)
        }
      } catch (applyErr) {
        console.error("Failed to auto-apply resume additions:", applyErr)
      }

      setResumeUploadedDate(data.uploadedAt ? new Date(data.uploadedAt) : new Date())
      setResumeSkillsExpanded(false)
      setResumeSummaryScrolled(false)

      // Per docs §5.3: if conflicts exist, show ConflictDialog FIRST, then Summary
      if (data.conflicts?.length > 0) {
        setResumeConflicts(data.conflicts)
        const checked: Record<string, boolean> = {}
        data.conflicts.forEach((c: any) => { checked[c.existingId] = true })
        setResumeConflictChecked(checked)
        setResumeStatus("uploaded")
        setResumeConflictOpen(true)
      } else {
        // No conflicts — show summary dialog directly
        setResumeStatus("summary")
      }
    } catch (err) {
      console.error("Resume upload failed:", err)
      setResumeStatus("failed")
    }
  }, [profile?.id])

  const resetResume = useCallback(() => {
    setResumeFile(null)
    setResumeStatus("idle")
    setResumeProgress(0)
    setResumeUploadedSize(0)
    setResumeUploadedDate(null)
    setResumeParsedData(null)
    setResumeParseResultId(null)
    setResumeConflicts([])
    setResumeConflictChecked({})
    if (resumeInputRef.current) resumeInputRef.current.value = ""
  }, [])

  const handleResumeChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (file) processResumeFile(file)
    },
    [processResumeFile]
  )

  const handleResumeDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault()
      setResumeStatus("idle")
      const file = e.dataTransfer.files?.[0]
      if (file) processResumeFile(file)
    },
    [processResumeFile]
  )

  // Use auth user data immediately for hero while full profile loads
  useEffect(() => {
    if (!usernameParam && user && !profile) {
      setProfile(user as any)
      setIsProfileLoading(false)
    }
  }, [user])

  useEffect(() => {
    let isActive = true

    const loadProfile = async () => {
      if (usernameParam) {
        setIsProfileLoading(true)
        try {
          const res = await UserAPI.getByUsername(usernameParam)
          if (isActive && res?.data) {
            setProfile(res.data)
          }
          return
        } catch (err: any) {
          const status = err?.response?.status

          // Username may be stale or unavailable; fall back to the signed-in user's profile.
          if (status === 404 && user?.id) {
            try {
              const fallbackRes = await UserAPI.getProfile(user.id)
              if (isActive && fallbackRes?.data) {
                setProfile(fallbackRes.data)
              }
            } catch (fallbackErr: any) {
              console.error(
                "[profile] getProfile fallback error:",
                fallbackErr?.response?.status,
                fallbackErr?.message
              )
            }
          } else if (status !== 404) {
            console.error(
              "[profile] getByUsername error:",
              status,
              err?.message
            )
          }
        } finally {
          if (isActive) setIsProfileLoading(false)
        }
        return
      }

      if (user?.id) {
        // Load full profile in background (hero already showing from auth user)
        setIsProfileLoading(true)
        UserAPI.getProfile(user.id)
          .then((res) => {
            if (isActive && res?.data) setProfile(res.data)
          })
          .catch((err) => {
            console.error(
              "[profile] getProfile error:",
              err?.response?.status,
              err?.message
            )
          })
          .finally(() => {
            if (isActive) setIsProfileLoading(false)
          })
        return
      }

      // No user yet from auth — try /user/me directly as fallback
      setIsProfileLoading(true)
      UserAPI.me()
        .then((res) => {
          const data = res?.data?.user ?? res?.data?.data?.user ?? res?.data
          if (isActive && data && typeof data === "object" && data.id) {
            setProfile(data)
          }
        })
        .catch((err) => {
          console.error(
            "[profile] me() fallback error:",
            err?.response?.status,
            err?.message
          )
        })
        .finally(() => {
          if (isActive) setIsProfileLoading(false)
        })
    }

    void loadProfile()

    return () => {
      isActive = false
    }
  }, [user?.id, usernameParam])

  const [similarProfiles, setSimilarProfiles] = useState<SimilarProfile[]>([])

  useEffect(() => {
    let isActive = true
    if (!profile?.id) {
      setSimilarProfiles([])
      return
    }
    UserAPI.getSimilarProfiles(profile.id)
      .then((res) => {
        const data = Array.isArray(res?.data) ? res.data : []
        if (isActive) setSimilarProfiles(data)
      })
      .catch(() => {
        if (isActive) setSimilarProfiles([])
      })
    return () => {
      isActive = false
    }
  }, [profile?.id])

  const isOwnProfile = Boolean(
    user?.id && profile?.id && user.id === profile.id
  )

  const refreshProfile = useCallback(() => {
    if (!profile?.id) return
    UserAPI.getProfile(profile.id)
      .then((res) => {
        if (res?.data) setProfile(res.data)
      })
      .catch(() => {})
  }, [profile?.id])

  const handleAvatarUpload = useCallback(
    async (file: File) => {
      await ClientAPI.UploadAvatar(file)
      refreshProfile()
    },
    [refreshProfile]
  )

  const handleRemoveAvatar = useCallback(async () => {
    if (!profile?.id) return
    try {
      await UserAPI.updateProfile(profile.id, { avatarUrl: "" })
      refreshProfile()
    } catch {
      /* noop */
    }
  }, [profile?.id, refreshProfile])

  const [deleteConfirm, setDeleteConfirm] = useState<{
    type: "experience" | "education"
    id: string
    label: string
  } | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const handleDeleteWorkExperience = useCallback(
    (expId: string) => {
      const exp = profile?.experience?.find(
        (e: any) => String(e.id) === String(expId)
      )
      setDeleteError(null)
      setDeleteConfirm({
        type: "experience",
        id: expId,
        label: exp?.title || "",
      })
    },
    [profile?.experience]
  )

  const handleDeleteEducation = useCallback(
    (eduId: string) => {
      const edu = profile?.education?.find(
        (e: any) => String(e.id) === String(eduId)
      )
      setDeleteError(null)
      setDeleteConfirm({
        type: "education",
        id: eduId,
        label: edu?.school || "",
      })
    },
    [profile?.education]
  )

  const confirmDelete = useCallback(async () => {
    if (!profile?.id || !deleteConfirm) return
    setIsDeleting(true)
    setDeleteError(null)
    try {
      if (deleteConfirm.type === "experience") {
        await UserAPI.removeExperience(deleteConfirm.id)
      } else {
        await UserAPI.removeEducation(deleteConfirm.id)
      }
      refreshProfile()
      setIsDeleting(false)
      setDeleteConfirm(null)
    } catch {
      setIsDeleting(false)
      setDeleteError("Couldn't delete this entry. Please try again.")
    }
  }, [profile?.id, deleteConfirm, refreshProfile])

  const [isEditMode, setIsEditMode] = useState(true)

  // Edit modal open states
  const [availabilityOpen, setAvailabilityOpen] = useState(false)
  const [skillsOpen, setSkillsOpen] = useState(false)
  const [overviewOpen, setOverviewOpen] = useState(false)
  const [listingsModalStep, setListingsModalStep] = useState<
    "closed" | "empty" | "chooser"
  >("closed")
  const goToPublishProject = useCallback(
    (type: "project" | "service") => {
      setListingsModalStep("closed")
      router.push(`/publish-project?type=${type}`)
    },
    [router]
  )
  const [jobTitleOpen, setJobTitleOpen] = useState(false)
  const [languagesOpen, setLanguagesOpen] = useState(false)
  const [industriesOpen, setIndustriesOpen] = useState(false)
  const [certificationsOpen, setCertificationsOpen] = useState(false)
  const [workExperienceOpen, setWorkExperienceOpen] = useState(false)
  const [educationOpen, setEducationOpen] = useState(false)
  const [workExpEditIdx, setWorkExpEditIdx] = useState<string | undefined>()
  const [eduEditIdx, setEduEditIdx] = useState<string | undefined>()
  const [certEditIdx, setCertEditIdx] = useState<string | undefined>()
  const [affiliatedTeamsOpen, setAffiliatedTeamsOpen] = useState(false)
  const [caseStudyOpen, setCaseStudyOpen] = useState(false)
  const [featuredTab, setFeaturedTab] = useState("Featured Clients")
  const WORK_EXPERIENCE_LIMIT = 30
  const atWorkExperienceLimit =
    (profile?.experience?.length ?? 0) >= WORK_EXPERIENCE_LIMIT

  // Deduplicate skills by name (case-insensitive) and drop blanks before display.
  const dedupedSkills = useMemo(() => {
    const seen = new Set<string>()
    return (profile?.skills ?? [])
      .map((s: any) => (typeof s === "string" ? { id: s, name: s } : s))
      .filter((s: any) => {
        const key = (s?.name ?? "").trim().toLowerCase()
        if (!key || seen.has(key)) return false
        seen.add(key)
        return true
      })
  }, [profile?.skills])

  const cardRef = useRef<HTMLDivElement>(null)
  const tabsListRef = useRef<HTMLDivElement>(null)
  const [isCardStuck, setIsCardStuck] = useState<boolean>(false)
  // Client profile view. Everything the talent profile renders is kept in
  // place behind this flag so the modals, edit fields and existing sections
  // stay available for reuse and for edit mode.
  const isClientProfile = true
  const showProjectHistory = true

  // Sidebar state. Swap these for real profile data when the API lands:
  // logo present -> filled, absent -> empty, hasCompanyError -> error.
  const companyLogo = profile?.avatarUrl ?? ""
  const companyWebsite = "mywebsite.com"
  const companyIndustries = ["UX Design", "Marketing", "Graphic Design"]
  const hasVerifications = true
  const hasCompanyError = false
  // "filled" | "empty" | "error"
  const bioState: "filled" | "empty" | "error" = "filled"
  const [valuesOpen, setValuesOpen] = useState(false)
  const [workplaceValues, setWorkplaceValues] = useState<WizardValue[]>([
    {
      id: "value-1",
      q: "Dedication to every client's success",
      a: "",
    },
    {
      id: "value-2",
      q: "Innovation that matters - for our company and the world",
      a: "",
    },
    {
      id: "value-3",
      q: "Trust and personal responsibility in all relationships",
      a: "",
    },
    { id: "value-4", q: "Diversity and inclusion", a: "" },
  ])
  const [isTabsListStuck, setIsTabsListStuck] = useState<boolean>(false)

  // Auto-expand state for sections
  const [autoExpandPortfolio, setAutoExpandPortfolio] = useState<boolean>(false)
  const [autoExpandSkills, setAutoExpandSkills] = useState<boolean>(false)
  const [autoExpandOffers, setAutoExpandOffers] = useState<boolean>(false)
  const [autoExpandWorkExperience, setAutoExpandWorkExperience] =
    useState<boolean>(false)
  const [autoExpandEducation, setAutoExpandEducation] = useState<boolean>(false)
  const [autoExpandProjectHistory, setAutoExpandProjectHistory] =
    useState<boolean>(false)
  const [backgroundActiveTab, setBackgroundActiveTab] =
    useState<string>("Work Experience")
  const [activeTab, setActiveTab] = useState<string>(
    isClientProfile ? "About" : "Portfolio"
  )
  const [showLanguageSection, setShowLanguageSection] = useState<boolean>(true)
  const lastScrollYRef = useRef<number>(0)

  useEffect(() => {
    const element = cardRef.current

    if (element) {
      const topValue = getComputedStyle(element)["top"]
      const top = topValue.endsWith("px")
        ? parseFloat(topValue.slice(0, -2))
        : 0

      const handleScroll = () => {
        const rect = element.getBoundingClientRect()
        const isStuck = Math.ceil(top) === Math.ceil(rect.y)
        setIsCardStuck(isStuck)
      }

      window.addEventListener("scroll", handleScroll)

      return () => {
        window.removeEventListener("scroll", handleScroll)
      }
    }
  }, [])

  useEffect(() => {
    const element = tabsListRef.current

    if (element) {
      const handleScroll = () => {
        const rect = element.getBoundingClientRect()
        const isStuck = 64 >= Math.ceil(rect.y)
        setIsTabsListStuck(isStuck)
      }

      window.addEventListener("scroll", handleScroll)

      return () => {
        window.removeEventListener("scroll", handleScroll)
      }
    }
  }, [])

  // Scroll direction detection for language section visibility (client view only)
  const isClientViewRef = useRef(false)
  useEffect(() => {
    isClientViewRef.current = !(isEditMode && isOwnProfile)
    if (!isClientViewRef.current) {
      setShowLanguageSection(true)
    }
  }, [isEditMode, isOwnProfile])

  useEffect(() => {
    const handleScroll = () => {
      if (!isClientViewRef.current) return

      const currentScrollY = window.scrollY

      if (currentScrollY > lastScrollYRef.current && currentScrollY > 100) {
        setShowLanguageSection(false)
      } else if (currentScrollY < lastScrollYRef.current) {
        setShowLanguageSection(true)
      }

      lastScrollYRef.current = currentScrollY
    }

    window.addEventListener("scroll", handleScroll, { passive: true })

    return () => {
      window.removeEventListener("scroll", handleScroll)
    }
  }, [])
  // Auto-expand sections when navigated to via hash
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash

      // Reset all auto-expand states
      setAutoExpandPortfolio(false)
      setAutoExpandSkills(false)
      setAutoExpandOffers(false)
      setAutoExpandWorkExperience(false)
      setAutoExpandEducation(false)
      setAutoExpandProjectHistory(false)

      // Reset background tab to default
      setBackgroundActiveTab("Work Experience")

      // Set auto-expand for the target section
      switch (hash) {
        case "#portfolio":
          // Delay for portfolio to allow layout to settle
          setTimeout(() => {
            setActiveTab("Portfolio")
            setAutoExpandPortfolio(true)
            // Manual scroll to portfolio section
            setTimeout(() => {
              const portfolioElement = document.getElementById("portfolio")
              if (portfolioElement) {
                portfolioElement.scrollIntoView({
                  behavior: "smooth",
                  block: "start",
                })
              }
            }, 50)
          }, 150)
          break
        case "#skills":
          // Delay for skills to allow layout to settle
          setTimeout(() => {
            setActiveTab("Skills")
            setAutoExpandSkills(true)
            // Manual scroll to skills section
            setTimeout(() => {
              const skillsElement = document.getElementById("skills")
              if (skillsElement) {
                skillsElement.scrollIntoView({
                  behavior: "smooth",
                  block: "start",
                })
              }
            }, 50)
          }, 150)
          break
        case "#offers":
          setActiveTab("Offers")
          setAutoExpandOffers(true)
          break
        case "#background":
          setActiveTab("Work Experience")
          setAutoExpandWorkExperience(true)
          setAutoExpandEducation(true)
          break
        case "#education":
          setActiveTab("Education")
          setAutoExpandWorkExperience(true)
          setAutoExpandEducation(true)
          setBackgroundActiveTab("Education")
          // Prevent default scroll behavior and manually scroll to background section
          setTimeout(() => {
            const backgroundElement = document.getElementById("background")
            if (backgroundElement) {
              backgroundElement.scrollIntoView({
                behavior: "smooth",
                block: "start",
              })
            }
          }, 50)
          break
        case "#project-history":
          setActiveTab("Project History")
          setAutoExpandProjectHistory(true)
          break
        case "#overview":
          setActiveTab("Overview")
          break
      }
    }

    // Handle click events on specific links that need auto-expand or special handling
    const handleNavigationClick = (e: Event) => {
      const target = e.target as HTMLAnchorElement
      if (target.href && target.href.includes("#")) {
        const hash = target.href.split("#")[1]
        if (hash === "education") {
          e.preventDefault()
          window.history.pushState(null, "", "#education")
          handleHashChange()
        } else if (hash === "background") {
          e.preventDefault()
          window.history.pushState(null, "", "#background")
          handleHashChange()
        } else if (hash === "portfolio" || hash === "skills") {
          // Prevent default scroll and handle manually
          e.preventDefault()
          window.history.pushState(null, "", `#${hash}`)
          handleHashChange()
        }
      }
    }

    // Add click listeners to all navigation links
    document.addEventListener("click", handleNavigationClick)

    // Handle initial hash on load
    handleHashChange()

    // Listen for hash changes
    window.addEventListener("hashchange", handleHashChange)

    return () => {
      window.removeEventListener("hashchange", handleHashChange)
      document.removeEventListener("click", handleNavigationClick)
    }
  }, [])

  const isClientView = !(isEditMode && isOwnProfile)

  const hasPortfolio = (profile?.portfolio?.length ?? 0) > 0
  const hasSkills = dedupedSkills.length > 0
  const hasBio = Boolean(profile?.bio || profile?.overview)
  const hasCertifications = (profile?.certifications?.length ?? 0) > 0
  const hasIndustries = (profile?.industries?.length ?? 0) > 0
  const hasWorkExperience = (profile?.experience?.length ?? 0) > 0
  const hasEducation = (profile?.education?.length ?? 0) > 0
  const hasLanguages = (profile?.languages?.length ?? 0) > 0
  const hasTimezone = Boolean(profile?.timezone)

  const showOverviewSection =
    !isClientView || hasBio || hasCertifications || hasIndustries
  const showOverviewBio = !isClientView || hasBio
  const showOverviewFeatured =
    !isClientView || hasCertifications || hasIndustries
  const showBackgroundSection =
    !isClientView || hasWorkExperience || hasEducation
  const showLanguagesBox = !isClientView || hasLanguages || hasTimezone

  const visibleFeaturedTabs = (
    isClientView
      ? [
          hasCertifications && "Certifications",
          hasIndustries && "Industry Expertise",
        ]
      : ["Featured Clients", "Certifications", "Industry Expertise"]
  ).filter(Boolean) as string[]
  const effectiveFeaturedTab = visibleFeaturedTabs.includes(featuredTab)
    ? featuredTab
    : visibleFeaturedTabs[0]

  const visibleBackgroundTabs = (
    isClientView
      ? [
          hasWorkExperience && "Work Experience",
          hasEducation && "Education",
        ]
      : ["Work Experience", "Education"]
  ).filter(Boolean) as string[]
  const effectiveBackgroundTab = visibleBackgroundTabs.includes(
    backgroundActiveTab
  )
    ? backgroundActiveTab
    : visibleBackgroundTabs[0]

  return (
    <>
      <div className="py-[50px]">
        {/* Talent hero header — hidden on the client profile, kept for reuse */}
        {!isClientProfile && (
          <div className="max-w-[1440px] mx-auto px-[100px]">
            <div className="border border-gray-200 rounded-lg bg-white shadow-[0px_2px_5px_0px_rgba(0,0,0,.04)]">
              {isProfileLoading ? (
                /* Skeleton loading state */
                <>
                  <div className="p-10 flex items-start gap-x-10">
                    <Shimmer className="size-[318px] rounded-full shrink-0" />
                    <div className="flex-auto space-y-4 pt-2">
                      <Shimmer className="h-8 w-64" />
                      <Shimmer className="h-6 w-48" />
                      <Shimmer className="h-4 w-36" />
                      <div className="flex items-center gap-x-3 pt-2">
                        <Shimmer className="h-6 w-16 rounded-[4px]" />
                        <Shimmer className="h-4 w-20" />
                      </div>
                      <div className="space-y-3 pt-2">
                        <Shimmer className="h-4 w-52" />
                        <Shimmer className="h-4 w-60" />
                      </div>
                      <div className="flex gap-x-2 pt-4">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Shimmer key={i} className="h-7 w-24 rounded-full" />
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="py-3 px-8 border-t border-gray-200 grid grid-cols-5 divide-x divide-gray-200 bg-[#122A4B]/[.02]">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <div
                        key={i}
                        className="flex gap-x-2 justify-center items-center py-1"
                      >
                        <Shimmer className="h-4 w-16" />
                        <Shimmer className="h-5 w-12" />
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <>
                  <div className="p-10 flex items-start gap-x-10">
                    {(() => {
                      const initials =
                        `${profile?.firstName?.charAt(0) ?? ""}${
                          profile?.lastName?.charAt(0) ?? ""
                        }`.toUpperCase() || "?"
                      const renderAvatar = (
                        src: string | null,
                        style?: Record<string, string | number>
                      ) => (
                        <Avatar className="size-[318px]">
                          <AvatarImage
                            src={src ?? ""}
                            alt={profile?.firstName ?? "User"}
                            style={style}
                          />
                          <AvatarFallback>
                            <span className="flex h-full w-full items-center justify-center rounded-full bg-gray-100 text-7xl font-semibold text-gray-300">
                              {initials}
                            </span>
                          </AvatarFallback>
                        </Avatar>
                      )

                      if (!(isOwnProfile && isEditMode)) {
                        return renderAvatar(profile?.avatarUrl ?? null)
                      }

                      return (
                        <ImageEditor
                          variant="avatar"
                          editDialogTitle="Edit Profile Image"
                          defaultDataUrl={profile?.avatarUrl ?? null}
                          fallbackInitials={initials}
                          onSaveImage={handleAvatarUpload}
                          startingPoint={({ open }) => {
                            const hasImage = Boolean(profile?.avatarUrl)
                            return (
                              <div className="group relative size-[318px] shrink-0">
                                {renderAvatar(profile?.avatarUrl ?? null)}
                                <div className="absolute inset-0 rounded-full flex items-center justify-center gap-x-3 bg-black/0 opacity-0 transition-all duration-300 group-hover:bg-black/50 group-hover:opacity-100">
                                  {hasImage ? (
                                    <>
                                      <IconButton
                                        type="button"
                                        variant="filled"
                                        visual="gray"
                                        className="rounded-full bg-white text-error-500 hover:bg-error-50"
                                        onClick={() => handleRemoveAvatar()}
                                      >
                                        <Trash03 className="size-5" />
                                      </IconButton>
                                      <IconButton
                                        type="button"
                                        variant="filled"
                                        visual="gray"
                                        className="rounded-full bg-white text-dark-blue-400 hover:bg-gray-50"
                                        onClick={open}
                                      >
                                        <Edit03 className="size-5" />
                                      </IconButton>
                                    </>
                                  ) : (
                                    <Button
                                      type="button"
                                      variant="filled"
                                      visual="gray"
                                      className="rounded-full bg-white text-dark-blue-400 hover:bg-gray-50"
                                      onClick={open}
                                    >
                                      <Upload className="size-[15px]" /> Upload
                                      Image
                                    </Button>
                                  )}
                                </div>
                              </div>
                            )
                          }}
                        />
                      )
                    })()}

                    <div className="flex-auto">
                      <div className="flex items-start">
                        <div className="flex-auto">
                          <h1 className="text-[28px] leading-[34px] font-bold text-dark-blue-400">
                            {capitalize(profile?.firstName ?? "") || "Talent"}
                            {profile?.username && (
                              <span className="text-[26px] font-extralight">
                                {" "}
                                @{profile.username}
                              </span>
                            )}
                          </h1>
                          <div className="flex items-center gap-x-1 mt-1">
                            {(() => {
                              const jobTitle =
                                (profile as any)?.jobTitles?.find(
                                  (j: any) => j.saveAsDefault
                                )?.jobTitle ||
                                (profile as any)?.jobTitles?.[0]?.jobTitle ||
                                profile?.recentJobTitle
                              return (
                                <h2
                                  className={cn(
                                    "text-[22px] leading-[27px] font-medium",
                                    jobTitle
                                      ? "text-dark-blue-400"
                                      : "text-gray-600"
                                  )}
                                >
                                  {jobTitle || "Add Job Title"}
                                </h2>
                              )
                            })()}
                            {isEditMode && isOwnProfile && (
                              <IconButton
                                className="rounded-full text-gray-500 hover:text-gray-800"
                                variant="ghost"
                                visual="gray"
                                onClick={() => setJobTitleOpen(true)}
                              >
                                <Edit03 className="size-4" />
                              </IconButton>
                            )}
                          </div>

                          <p className="mt-2 text-sm leading-none text-gray-500">
                            {(() => {
                              const dates: Date[] = []
                              const endDates: Date[] = []
                              // Gather start/end dates from work experience
                              profile?.experience?.forEach((e) => {
                                if (e.startDate) dates.push(new Date(e.startDate))
                                if (e.endDate) endDates.push(new Date(e.endDate))
                                else endDates.push(new Date()) // present
                              })
                              // TODO: gather start/end dates from project history when available
                              if (dates.length === 0) return ""
                              const earliest = dates.reduce((a, b) =>
                                a < b ? a : b
                              )
                              const latest = endDates.reduce((a, b) =>
                                a > b ? a : b
                              )
                              const months =
                                (latest.getFullYear() - earliest.getFullYear()) *
                                  12 +
                                (latest.getMonth() - earliest.getMonth())
                              if (months < 12)
                                return `${Math.max(1, months)} month${months === 1 ? "" : "s"} of experience`
                              const years = Math.round(months / 12)
                              return `${years} year${years === 1 ? "" : "s"} of experience`
                            })()}
                          </p>

                          <div className="mt-6">
                            <div className="flex items-center gap-x-[9px]">
                              <MapPin className="size-4" />
                              <p className="text-sm leading-none font-medium text-dark-blue-400">
                                {profile?.location ?? "Location not set"}
                              </p>
                            </div>

                            <div className="flex items-center mt-3 gap-x-2">
                              <Clock className="size-4" />
                              <p className="text-sm leading-none font-extralight text-dark-blue-400">
                                {isEditMode && isOwnProfile
                                  ? "You are"
                                  : `${capitalize(profile?.firstName ?? "") || "Talent"} is`}{" "}
                                currently{" "}
                                <span
                                  className={cn(
                                    "font-medium",
                                    profile?.availability
                                      ? "text-success-600"
                                      : "text-gray-500"
                                  )}
                                >
                                  {profile?.availability
                                    ? "available"
                                    : "not available"}
                                </span>{" "}
                                for hire
                              </p>
                              {isEditMode && isOwnProfile && (
                                <IconButton
                                  className="rounded-full text-gray-500 hover:text-gray-800"
                                  variant="ghost"
                                  visual="gray"
                                  onClick={() => setAvailabilityOpen(true)}
                                >
                                  <Edit03 className="size-4" />
                                </IconButton>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-x-3">
                          {isOwnProfile ? (
                            <>
                              {isEditMode ? (
                                <Button
                                  variant="outlined"
                                  visual="gray"
                                  onClick={() => setIsEditMode(false)}
                                >
                                  <Eye className="size-[15px]" />
                                  View as Client
                                </Button>
                              ) : (
                                <Button
                                  variant="outlined"
                                  visual="gray"
                                  onClick={() => setIsEditMode(true)}
                                >
                                  <Edit03 className="size-[15px]" />
                                  Edit Profile
                                </Button>
                              )}
                            </>
                          ) : (
                            <>
                              <HireMeButton
                                profile={profile}
                                buttonProps={{ onClick: handleHireButtonClick }}
                              />

                              <SaveTalentButton userId={profile?.id} />
                            </>
                          )}

                          <IconButton
                            className="text-gray-500"
                            variant="outlined"
                            visual="gray"
                            size="md"
                            onClick={handleShareProfile}
                          >
                            <Share06 className="size-[20px]" />
                          </IconButton>
                        </div>
                      </div>

                      {(dedupedSkills.length > 0 ||
                        (isEditMode && isOwnProfile)) && (
                        <div className="mt-[54px]">
                          {dedupedSkills.length > 0 && (
                            <h1 className="text-sm font-bold leading-none text-dark-blue-400">
                              What I do
                            </h1>
                          )}

                          <div className="flex items-start mt-3 gap-x-3">
                            <div className="flex gap-3 flex-wrap">
                              {dedupedSkills.length > 0 ? (
                                <ShowMoreLessRoot>
                                  <ShowMoreLess
                                    trigger={(extraChildrenCount) => (
                                      <Badge
                                        className="text-gray-700 cursor-pointer"
                                        visual="gray"
                                        size="lg"
                                        onClick={() => {
                                          setActiveTab("Skills")
                                          setAutoExpandSkills(true)
                                          setTimeout(() => {
                                            const el =
                                              document.getElementById("skills")
                                            if (el)
                                              el.scrollIntoView({
                                                behavior: "smooth",
                                                block: "start",
                                              })
                                          }, 100)
                                        }}
                                      >
                                        <Plus2 className="h-3 w-3" />{" "}
                                        {extraChildrenCount} more...
                                      </Badge>
                                    )}
                                    max={5}
                                  >
                                    {dedupedSkills.map((skill) => (
                                      <Badge
                                        key={skill.id}
                                        className="text-gray-700"
                                        visual="gray"
                                        size="lg"
                                      >
                                        {skill.name}
                                      </Badge>
                                    ))}
                                  </ShowMoreLess>
                                </ShowMoreLessRoot>
                              ) : (
                                <Button
                                  variant="link"
                                  visual="gray"
                                  className="font-semibold text-dark-blue-400 hover:text-dark-blue-500"
                                  onClick={() => setSkillsOpen(true)}
                                >
                                  <Plus className="size-[15px]" /> Add Skills
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="py-3 px-8 border-t border-gray-200 flex items-center justify-between gap-x-8 bg-[#122A4B]/[.02]">
                    <div className="flex items-center gap-x-10">
                      <div className="flex gap-x-2 items-center">
                        <span className="text-sm font-extralight leading-none text-dark-blue-400">
                          Rate
                        </span>
                        <span className="text-xl font-bold leading-none text-dark-blue-400">
                          {profile?.rateMin || profile?.rateMax ? (
                            <>
                              {profile.rateMin &&
                              profile.rateMax &&
                              Math.round(profile.rateMin) !==
                                Math.round(profile.rateMax)
                                ? `$${Math.round(profile.rateMin)} - $${Math.round(profile.rateMax)}`
                                : `$${Math.round(profile?.rateMax ?? profile?.rateMin ?? 0)}`}
                              <span className="text-sm font-extralight leading-none text-dark-blue-400">
                                /hr
                              </span>
                            </>
                          ) : (
                            "Unknown"
                          )}
                        </span>
                        {isEditMode && isOwnProfile && (
                          <IconButton
                            className="rounded-full text-gray-500 hover:text-gray-800"
                            variant="ghost"
                            visual="gray"
                            onClick={() => setJobTitleOpen(true)}
                          >
                            <Edit03 className="size-4" />
                          </IconButton>
                        )}
                      </div>
                      {(profile?.totalProjectsCompleted ?? 0) >= 2 &&
                        profile?.clientSuccessRating != null && (
                          <div className="flex gap-x-2 items-center">
                            <span className="text-sm font-extralight leading-none text-dark-blue-400">
                              Client success rating
                            </span>
                            <span className="text-sm font-bold leading-none text-dark-blue-400">
                              {`${Math.round(profile.clientSuccessRating * 100)}%`}
                            </span>
                          </div>
                        )}
                      {(profile?.totalProjectsCompleted ?? 0) >= 1 && (
                        <div className="flex gap-x-2 items-center">
                          <span className="text-sm font-extralight leading-none text-dark-blue-400">
                            Total projects completed
                          </span>
                          <span className="text-sm font-bold leading-none text-dark-blue-400">
                            {(profile?.totalProjectsCompleted ?? 0).toLocaleString()}
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-x-10">
                      <div className="flex gap-x-2 items-center">
                        <span className="text-sm font-extralight leading-none text-dark-blue-400">
                          Member since
                        </span>
                        <span className="text-sm font-bold leading-none text-dark-blue-400">
                          {profile?.createdAt
                            ? new Date(profile.createdAt).toLocaleDateString(
                                "en-US",
                                {
                                  month: "long",
                                  day: "numeric",
                                  year: "numeric",
                                }
                              )
                            : "\u2014"}
                        </span>
                      </div>
                      {profile?.repeatHireRate != null && (
                        <div className="flex gap-x-2 items-center">
                          <span className="text-sm font-extralight leading-none text-dark-blue-400">
                            Repeat hire rate
                          </span>
                          <span className="text-sm font-bold leading-none text-dark-blue-400">
                            {`${profile.repeatHireRate}%`}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        <Tabs
          className={isClientProfile ? undefined : "mt-6"}
          value={activeTab}
          onValueChange={(val) => {
            setActiveTab(val)
            if (val === "Education") setBackgroundActiveTab("Education")
            if (val === "Work Experience")
              setBackgroundActiveTab("Work Experience")
          }}
        >
          <TabsList
            className="group/list p-0 bg-transparent data-[status=stuck]:border-b data-[status=stuck]:border-gray-200 z-50 transition duration-300 top-0 sticky block data-[status=stuck]:bg-white border-0"
            data-status={isTabsListStuck ? "stuck" : "unstuck"}
            ref={tabsListRef}
          >
            <div className="max-w-[1440px] mx-auto px-[100px]">
              <div
                className={cn(
                  "contents group-data-[status=stuck]/list:pt-3 group-data-[status=stuck]/list:flex items-center max-w-[1240px] mx-auto",
                  // The hidden tab row used to supply the bar's bottom
                  // spacing, so match the top padding instead.
                  isClientProfile && "group-data-[status=stuck]/list:pb-3"
                )}
              >
                <div className="flex-auto contents group-data-[status=stuck]/list:block">
                  <div className="hidden items-center gap-x-3 group-data-[status=stuck]/list:flex">
                    <Avatar
                      className="hover:ring-0 active:ring-primary-100"
                      size="lg"
                    >
                      <AvatarImage
                        src={profile?.avatarUrl ?? ""}
                        alt={profile?.firstName ?? "User"}
                      />
                      <AvatarFallback>
                        {getInitials(
                          `${profile?.firstName ?? ""} ${
                            profile?.lastName ?? ""
                          }`
                        )}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col gap-y-0.5">
                      <span className="text-lg leading-none font-bold text-dark-blue-400">
                        {isClientProfile
                          ? "Company Name"
                          : capitalize(profile?.firstName ?? "") || "User"}{" "}
                        <span className="text-base font-extralight">
                          @{profile?.username ?? ""}
                        </span>
                      </span>

                      <span className="text-sm leading-none font-medium text-dark-blue-400">
                        {isClientProfile
                          ? ""
                          : (profile as any)?.jobTitles?.find(
                          (j: any) => j.saveAsDefault
                        )?.jobTitle ||
                          (profile as any)?.jobTitles?.[0]?.jobTitle ||
                          profile?.recentJobTitle ||
                          ""}
                      </span>
                    </div>
                  </div>
                  <div
                    className={cn(
                      tabsListVariants({
                        className:
                          "bg-transparent justify-start w-full group-data-[status=stuck]/list:border-b-0 group-data-[status=stuck]/list:mt-3 inline-flex group-data-[status=unstuck]/list:hidden",
                      }),
                      // The client profile keeps its tabs in the right column,
                      // so the pinned bar never shows them.
                      isClientProfile && "hidden"
                    )}
                  >
                    {isClientProfile ? (
                      <>
                        <TabsTrigger value="About" asChild>
                          <NextLink href="#about">About</NextLink>
                        </TabsTrigger>
                        <TabsTrigger value="Culture" asChild>
                          <NextLink href="#culture">Culture</NextLink>
                        </TabsTrigger>
                        <TabsTrigger value="Team" asChild>
                          <NextLink href="#team">Team</NextLink>
                        </TabsTrigger>
                        <TabsTrigger value="Spending Insights" asChild>
                          <NextLink href="#spending-insights">
                            Spending Insights
                          </NextLink>
                        </TabsTrigger>
                      </>
                    ) : (
                      <>
                      {!isClientProfile && (!isClientView || hasPortfolio) && (
                        <TabsTrigger value="Portfolio" asChild>
                          <NextLink href="#portfolio">Portfolio</NextLink>
                        </TabsTrigger>
                      )}
                      {(!isClientView || hasSkills) && (
                        <TabsTrigger value="Skills" asChild>
                          <NextLink href="#skills">Skills</NextLink>
                        </TabsTrigger>
                      )}
                      {showOverviewSection && (
                        <TabsTrigger value="Overview" asChild>
                          <NextLink href="#overview">Overview</NextLink>
                        </TabsTrigger>
                      )}
                      {!isClientView && (
                        <TabsTrigger value="Offers" asChild>
                          <NextLink href="#offers">Offers</NextLink>
                        </TabsTrigger>
                      )}
                      {(!isClientView || hasWorkExperience) && (
                        <TabsTrigger value="Work Experience" asChild>
                          <NextLink href="#background">Work Experience</NextLink>
                        </TabsTrigger>
                      )}
                      {(!isClientView || hasEducation) && (
                        <TabsTrigger value="Education" asChild>
                          <NextLink href="#education">Education</NextLink>
                        </TabsTrigger>
                      )}
                      {!isClientView && (
                        <TabsTrigger value="Project History" asChild>
                          <NextLink href="#project-history">
                            Project History
                          </NextLink>
                        </TabsTrigger>
                      )}
                      </>
                    )}
                  </div>
                </div>

                <div className="space-y-3 group-data-[status=stuck]/list:block hidden">
                  <div className="flex items-center gap-x-3">
                    {isOwnProfile ? (
                      <>
                        {isEditMode ? (
                          <Button
                            variant="outlined"
                            visual="gray"
                            size="md"
                            onClick={() => setIsEditMode(false)}
                          >
                            <Eye className="size-[15px]" />
                            {isClientProfile ? "Preview" : "View as Client"}
                          </Button>
                        ) : (
                          <Button
                            variant="outlined"
                            visual="gray"
                            size="md"
                            onClick={() => setIsEditMode(true)}
                          >
                            <Edit03 className="size-[15px]" />
                            Edit Profile
                          </Button>
                        )}
                      </>
                    ) : (
                      <>
                        <HireMeButton
                          profile={profile}
                          buttonProps={{ onClick: handleHireButtonClick }}
                        />

                        <SaveTalentButton userId={profile?.id} />
                      </>
                    )}

                    {!isClientProfile && (
                      <IconButton
                        className="text-gray-500"
                        variant="outlined"
                        visual="gray"
                        size="md"
                        onClick={handleShareProfile}
                      >
                        <Share06 className="size-[20px]" />
                      </IconButton>
                    )}
                  </div>

                  {/* Availability — talent only */}
                  {!isClientProfile && (
                    <div className="flex items-center mt-3 gap-x-[9px]">
                      <Clock className="size-4" />
                      <p className="text-[12.09px] leading-none font-extralight text-dark-blue-400">
                        {isEditMode && isOwnProfile
                          ? "You are"
                          : `${capitalize(profile?.firstName ?? "") || "Talent"} is`}{" "}
                        currently{" "}
                        <span
                          className={cn(
                            "font-bold",
                            profile?.availability
                              ? "text-success-600"
                              : "text-gray-500"
                          )}
                        >
                          {profile?.availability ? "available" : "not available"}
                        </span>{" "}
                        for hire
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </TabsList>
          <div
            className="max-w-[1440px] mx-auto px-[100px] scroll-mt-[137.5px]"
            id="portfolio"
          >
            {/* Back to Listings — top left, above the sidebar and content */}
            {isClientProfile && (
              <Button
                className="group gap-2 text-sm font-semibold text-dark-blue-400"
                variant="link"
                visual="gray"
                onClick={() => router.push("/my-listings")}
              >
                <ArrowLeft className="size-[15px] transition duration-300 group-hover:-translate-x-[4px]" />{" "}
                Back to Listings
              </Button>
            )}
            <div className="pt-6 flex gap-x-8">
              {isClientProfile && (
                <aside className="hidden shrink-0 w-[277px] xl:block">
                  {/* Side bar — 277px, 20px padding, 20px gap. Four states:
                      default (outsider), edit mode, empty and error. */}
                  <Card className="w-full flex-col items-start gap-5 p-5">
                    <div className="flex w-full flex-col items-start gap-6">
                      {/* Header — 16px gap */}
                      <div className="flex w-full flex-col items-start gap-4">
                        {/* Avatar. In edit mode the controls only appear on hover. */}
                        <div className="group relative size-[150px] shrink-0">
                          {companyLogo ? (
                            <>
                              <Avatar className="size-[150px] border border-gray-200">
                                <AvatarImage src={companyLogo} alt="Company Name" />
                                <AvatarFallback>CT</AvatarFallback>
                              </Avatar>
                              {isEditMode && (
                                <div className="pointer-events-none absolute inset-0 flex items-center justify-center gap-2 rounded-full bg-black/75 opacity-0 transition-opacity duration-300 group-hover:pointer-events-auto group-hover:opacity-100">
                                  <IconButton
                                    className="size-[37px] rounded-full bg-error-100 text-error-500 hover:bg-error-200"
                                    variant="light"
                                    visual="error"
                                    aria-label="Remove logo"
                                  >
                                    <Trash01 className="size-[13px]" />
                                  </IconButton>
                                  <IconButton
                                    className="size-[37px] rounded-full bg-white text-gray-700 hover:bg-white"
                                    variant="light"
                                    visual="gray"
                                    aria-label="Replace logo"
                                  >
                                    <Edit03 className="size-[13px]" />
                                  </IconButton>
                                </div>
                              )}
                            </>
                          ) : (
                            <div
                              className={cn(
                                "group relative flex size-[148px] items-center justify-center rounded-full border-[3px] border-white",
                                hasCompanyError ? "bg-error-50" : "bg-gray-100"
                              )}
                            >
                              <span className="text-[55px] font-medium uppercase leading-none tracking-tight text-gray-300">
                                ct
                              </span>
                              {/* Upload only shows on hover, same as the edit controls */}
                              <Button
                                className={cn(
                                  "absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 gap-2 rounded-full px-[14px] py-2 text-xs opacity-0 shadow-xs transition-opacity duration-300 group-hover:opacity-100",
                                  hasCompanyError
                                    ? "border-error-200 bg-error-25 text-error-500"
                                    : "bg-white text-gray-800"
                                )}
                                variant="outlined"
                                visual="gray"
                              >
                                <Upload01 className="size-[15px]" /> Upload Image
                              </Button>
                            </div>
                          )}
                        </div>
                        {hasCompanyError && !companyLogo && (
                          <p className="text-xs leading-[18px] text-error-500">
                            Please upload your company logo.
                          </p>
                        )}

                        <div className="flex w-full flex-col items-start gap-0.5">
                          <div className="flex items-start gap-1">
                            <h1
                              className={cn(
                                "text-xl font-semibold leading-[30px]",
                                hasCompanyError ? "text-error-500" : "text-dark-blue-400"
                              )}
                            >
                              Company Name
                            </h1>
                            {isEditMode && (
                              <IconButton
                                className="shrink-0 rounded-full text-gray-500"
                                size="sm"
                                variant="ghost"
                                visual="gray"
                                aria-label="Edit company name"
                              >
                                <Edit03 className="size-4" />
                              </IconButton>
                            )}
                          </div>
                          {hasCompanyError && (
                            <p className="text-xs leading-[18px] text-error-500">
                              Please enter company name and location
                            </p>
                          )}

                          <div className="flex items-start gap-0.5">
                            <p
                              className={cn(
                                "text-sm leading-4",
                                hasCompanyError ? "text-error-500" : "text-dark-blue-400"
                              )}
                            >
                              City, State
                            </p>
                            {isEditMode && (
                              <IconButton
                                className="-my-[9px] shrink-0 rounded-full text-gray-500"
                                size="sm"
                                variant="ghost"
                                visual="gray"
                                aria-label="Edit location"
                              >
                                <Edit03 className="size-4" />
                              </IconButton>
                            )}
                          </div>
                          {hasCompanyError && (
                            <p className="text-xs leading-[18px] text-error-500">
                              Please add your City and State
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-col items-start">
                        <p className="text-sm font-bold leading-[17px] text-dark-blue-400">
                          3:30 PM local time
                        </p>
                        <p className="text-xs leading-[18px] text-dark-blue-400">(GMT-6)</p>
                      </div>

                      {/* Verified badges when present; otherwise the verify prompts */}
                      {hasVerifications ? (
                        <>
                          <div className="flex w-full flex-wrap items-start gap-2">
                            {["Project Excellence", "Top Rated", "Premium Member"].map(
                              (tag) => (
                                <Badge key={tag} visual="gray" className="h-[26px] px-3 py-1">
                                  {tag}
                                </Badge>
                              )
                            )}
                          </div>
                          <div className="flex flex-col items-start gap-1">
                            {["Verified Payment Method", "Verified Contact Number"].map(
                              (item) => (
                                <p
                                  key={item}
                                  className="flex h-6 items-center gap-2 text-xs font-semibold text-primary-500"
                                >
                                  <CheckVerified02 className="size-[15px] shrink-0" />
                                  {item}
                                </p>
                              )
                            )}
                          </div>
                        </>
                      ) : (
                        <div className="flex w-full flex-col items-start gap-1">
                          <Button
                            className="gap-2 text-[11px] font-semibold leading-6 text-primary-500 underline decoration-primary-500/30"
                            variant="link"
                          >
                            <Phone className="size-[15px]" /> Verify Phone Number
                          </Button>
                          <Button
                            className="gap-2 text-[11px] font-semibold leading-6 text-primary-500 underline decoration-primary-500/30"
                            variant="link"
                          >
                            <Bank className="size-[15px]" /> Verify Payment Method
                          </Button>
                        </div>
                      )}

                      {/* Owners see View Inbox; visitors see Message */}
                      {isOwnProfile ? (
                        <Button
                          className="w-full gap-2 border-2 border-primary-500 bg-white text-primary-500"
                          size="md"
                          variant="outlined"
                        >
                          <MessageSquare01 className="size-[15px]" /> View Inbox
                        </Button>
                      ) : (
                        <Button className="w-full" size="md">
                          Message
                        </Button>
                      )}

                      <div className="flex w-full flex-col items-start gap-2">
                        {companyWebsite ? (
                          <div className="flex items-center gap-[7px]">
                            <NextLink
                              className="flex h-9 items-center text-sm font-semibold leading-6 text-dark-blue-400 hover:underline"
                              href="#"
                            >
                              {companyWebsite}
                            </NextLink>
                            {isEditMode && (
                              <IconButton
                                className="shrink-0 rounded-full text-gray-500"
                                size="sm"
                                variant="ghost"
                                visual="gray"
                                aria-label="Edit website"
                              >
                                <Edit03 className="size-4" />
                              </IconButton>
                            )}
                          </div>
                        ) : (
                          <div className="flex flex-col items-start gap-1">
                            <Button
                              className={cn(
                                "gap-2 text-sm font-semibold hover:no-underline",
                                hasCompanyError ? "text-error-600" : "text-dark-blue-400"
                              )}
                              variant="link"
                              visual="gray"
                            >
                              <Plus className="size-[15px]" /> Add Website
                            </Button>
                            {hasCompanyError && (
                              <p className="text-xs leading-[18px] text-error-500">
                                Please add your website.
                              </p>
                            )}
                          </div>
                        )}
                        <p className="flex items-center gap-1.5 text-xs leading-[15px] text-dark-blue-400">
                          Member since
                          <span className="font-semibold">Sep 2024</span>
                        </p>
                      </div>
                    </div>

                    <div className="flex w-full flex-col items-start gap-6 pb-5">
                      {companyIndustries.length > 0 ? (
                        <div className="flex w-full flex-col items-start gap-3">
                          <div className="flex w-full items-center gap-3">
                            <h2 className="flex-1 text-sm font-bold leading-[17px] text-dark-blue-400">
                              Industries
                            </h2>
                            {isEditMode && (
                              <div className="flex shrink-0 items-center gap-1">
                                <IconButton
                                  className="rounded-full text-gray-500"
                                  size="sm"
                                  variant="ghost"
                                  visual="gray"
                                  aria-label="Add industry"
                                >
                                  <Plus className="size-[18px]" />
                                </IconButton>
                                <IconButton
                                  className="rounded-full text-gray-500"
                                  size="sm"
                                  variant="ghost"
                                  visual="gray"
                                  aria-label="Edit industries"
                                >
                                  <Edit03 className="size-4" />
                                </IconButton>
                              </div>
                            )}
                          </div>
                          <div className="flex w-full flex-wrap items-center gap-2">
                            {companyIndustries.map((industry) => (
                              <Badge
                                key={industry}
                                visual="gray"
                                size="md"
                                className="bg-gray-50 px-2.5 py-0.5 text-dark-blue-400"
                              >
                                {industry}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-col items-start gap-1">
                          <Button
                            className={cn(
                              "gap-2 text-sm font-semibold hover:no-underline",
                              hasCompanyError ? "text-error-600" : "text-dark-blue-400"
                            )}
                            variant="link"
                            visual="gray"
                          >
                            <Plus className="size-[15px]" /> Add Industries
                          </Button>
                          {hasCompanyError && (
                            <p className="text-xs leading-[18px] text-error-500">
                              Please add at least 1 industry.
                            </p>
                          )}
                        </div>
                      )}

                      {hasVerifications && (
                        <dl className="flex w-full flex-col items-start gap-2 pb-1.5">
                          {[
                            ["Company Size", "2-9 Employees"],
                            ["Average Pay Rate", "$11.28"],
                            ["Total Hours billed", "237"],
                            ["Total Projects", "08"],
                            ["Average response time", "5 hours"],
                          ].map(([label, value]) => (
                            <div key={label} className="flex items-start gap-3">
                              <dt className="text-xs font-bold leading-6 text-dark-blue-400">
                                {label}
                              </dt>
                              <dd className="text-xs leading-6 text-dark-blue-400">{value}</dd>
                            </div>
                          ))}
                        </dl>
                      )}
                    </div>
                  </Card>
                </aside>
              )}
              <div className="flex-auto min-w-0">
                {/* Tabs and the Edit Profile button share one row, so the
                    button never pushes the content down. */}
                {isClientProfile && (
                  <div className="mb-6 flex items-end justify-between gap-4 border-b border-gray-200">
                    <TabsList className="w-full justify-start border-b-0 bg-transparent p-0">
                      {/* Plain tabs. No anchors, no scrolling. */}
                      <TabsTrigger value="About">About</TabsTrigger>
                      <TabsTrigger value="Culture">Culture</TabsTrigger>
                      <TabsTrigger value="Team">Team</TabsTrigger>
                      <TabsTrigger value="Spending Insights">
                        Spending Insights
                      </TabsTrigger>
                    </TabsList>

                    {isOwnProfile && (
                      <Button
                        className="mb-2 shrink-0 bg-white"
                        size="md"
                        variant="outlined"
                        visual="gray"
                        onClick={() => setIsEditMode(!isEditMode)}
                      >
                        {isEditMode ? (
                          <>
                            <Eye className="size-[15px]" /> Preview
                          </>
                        ) : (
                          <>
                            <Edit03 className="size-[15px]" /> Edit Profile
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                )}

                {/* Culture / Team / Spending Insights panels. Real tabs, not anchors. */}
                {isClientProfile && (
                  <TabsContent value="Culture">
                    <Card className="mb-6 w-full flex-col items-stretch gap-6 rounded-lg p-6">
                      <div className="flex w-full items-start justify-between">
                        <p className="flex-1 text-xl font-bold text-dark-blue-400">
                          Our workplace values
                        </p>
                        <IconButton
                          className="shrink-0 rounded-full text-gray-500"
                          size="sm"
                          variant="ghost"
                          visual="gray"
                          aria-label="Edit values"
                          onClick={() => setValuesOpen(true)}
                        >
                          <Edit03 className="size-4" />
                        </IconButton>
                      </div>
                      <Accordion className="flex w-full flex-col gap-4" type="single" collapsible>
                        {[
                          "Dedication to every client's success",
                          "Innovation that matters - for our company and the world",
                          "Trust and personal responsibility in all relationships",
                          "Diversity and inclusion",
                        ].map((value, index) => (
                          <AccordionItem
                            key={value}
                            className="w-full rounded-lg border border-gray-300 bg-white"
                            value={`value-${index}`}
                          >
                            <AccordionTrigger className="flex w-full items-center gap-2 px-5 py-3 text-left text-base font-semibold leading-tight text-dark-blue-400">
                              {value}
                            </AccordionTrigger>
                            <AccordionContent className="px-5 pb-3 text-sm font-light text-dark-blue-400" />
                          </AccordionItem>
                        ))}
                      </Accordion>
                    </Card>
                  </TabsContent>
                )}

                {isClientProfile && (
                  <TabsContent value="Team">
                    <Card className="mb-6 w-full flex-col items-end gap-4 rounded-lg px-[23px] py-6">
                      <div className="flex w-full items-start justify-center gap-[75px] border-b border-gray-200 pb-4">
                        <div className="flex min-w-0 flex-1 flex-col items-start gap-1 text-dark-blue-400">
                          <p className="w-full text-lg font-semibold capitalize">
                            Team visibility
                          </p>
                          <p className="text-sm font-light">
                            Show your team on your public profile.
                          </p>
                        </div>
                        <Switch defaultChecked />
                      </div>
                      <div className="grid w-full grid-cols-3 gap-10">
                        {Array.from({ length: 6 }).map((_, index) => (
                          <div
                            key={index}
                            className="flex flex-col items-start justify-center gap-2 rounded-[7px] bg-white p-3"
                          >
                            <div className="flex w-full items-start gap-2">
                              <Avatar className="size-10 border border-gray-200">
                                <AvatarImage src="/man.jpg" alt="Chris" />
                                <AvatarFallback>C</AvatarFallback>
                              </Avatar>
                              <div className="flex min-w-0 flex-1 flex-col items-start gap-0.5 text-dark-blue-400">
                                <p className="text-sm font-bold">Chris</p>
                                <p className="w-full truncate text-xs font-medium leading-[18px]">
                                  Founder &amp; CEO
                                </p>
                              </div>
                            </div>
                            <p className="w-full text-xs font-light leading-[18px] text-dark-blue-400">
                              Chris is a seasoned UX leader with a passion for crafting
                              intuitive digital experiences.
                            </p>
                          </div>
                        ))}
                      </div>
                      <Button
                        className="text-xs font-semibold text-gray-500"
                        variant="link"
                        visual="gray"
                      >
                        See all (10)
                      </Button>
                    </Card>
                  </TabsContent>
                )}

                {isClientProfile && (
                  <TabsContent value="Spending Insights">
                    <Card className="mb-6 w-full items-start justify-between gap-6 rounded-lg p-6">
                      <div className="flex flex-col items-start justify-end gap-6">
                        <div className="flex items-center gap-1 rounded-lg border border-gray-100 bg-gray-50 p-1">
                          {["Spending Trends", "Most Hired tasks"].map((label, index) => (
                            <Button
                              key={label}
                              className={cn(
                                "rounded-md px-3 py-2 text-sm",
                                index === 1
                                  ? "bg-white text-gray-700 shadow-sm"
                                  : "text-gray-500"
                              )}
                              variant="ghost"
                              visual="gray"
                            >
                              {label}
                            </Button>
                          ))}
                        </div>
                        <div className="flex items-start gap-4">
                          <div className="size-40 shrink-0 rounded-full border-[24px] border-gray-100" />
                          <div className="flex flex-col items-start gap-3">
                            {[
                              ["Software Development", "$28.50"],
                              ["Software Development", "$28.50"],
                              ["Software Development", "$28.50"],
                              ["Software Development", "$28.50"],
                            ].map(([label, amount], index) => (
                              <div key={index} className="flex w-full flex-col items-start gap-1">
                                <div className="flex items-start gap-2">
                                  <span className="mt-0.5 h-3.5 w-2 shrink-0 rounded-full bg-gray-300" />
                                  <p className="text-xs leading-[18px] text-gray-600">{label}</p>
                                </div>
                                <p className="text-sm font-semibold leading-5 text-dark-blue-400">
                                  {amount}
                                </p>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-start gap-[31px]">
                        {[
                          [
                            ["Total spend By Client", "$63,750"],
                            ["Total Projects", "08"],
                            ["Average Pay Rate", "$28.50"],
                            ["Total Hours Billed", "123"],
                          ],
                          [
                            ["Rehire Rate", "72%"],
                            ["Completed Projects", "08"],
                            ["On-time Payments", "90%"],
                            ["Talent Satisfaction", "4.8/5"],
                          ],
                        ].map((column, columnIndex) => (
                          <div
                            key={columnIndex}
                            className="flex w-[175px] flex-col items-start gap-6"
                          >
                            {column.map(([label, value]) => (
                              <div
                                key={label}
                                className="flex w-full flex-col items-start gap-1 px-1"
                              >
                                <div className="flex w-full items-center justify-between">
                                  <p className="text-sm font-medium leading-5 text-dark-blue-400">
                                    {label}
                                  </p>
                                  <HelpCircle className="size-4 shrink-0 text-gray-400" />
                                </div>
                                <div className="flex items-center gap-6">
                                  <p className="text-xl font-semibold text-dark-blue-400">
                                    {value}
                                  </p>
                                  {label === "Rehire Rate" && (
                                    <span className="text-[13px] font-semibold text-success-500">
                                      High
                                    </span>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        ))}
                      </div>
                    </Card>
                  </TabsContent>
                )}


                {/* Company Bio — first section under the About tab. Three states. */}
                {isClientProfile && (
                  <TabsContent value="About">
                    <div className="mb-6">
                      {bioState === "filled" ? (
                        <Card className="w-full items-start gap-6 rounded-lg p-6">
                          <p className="flex-1 text-sm font-light leading-[34px] text-gray-700">
                            Empowering businesses through technology innovation since
                            2018. Trusted by 50+ global clients. At{" "}
                            <span className="font-bold">Company Name</span>, our mission
                            is to simplify business challenges with cutting-edge
                            solutions tailored for SMEs and enterprises alike. With
                            expertise spanning software development, IT consulting, and
                            digital transformation, we have successfully completed 200+
                            projects.
                          </p>
                          <Button
                            className="size-9 shrink-0 rounded-full p-0 text-gray-500"
                            variant="ghost"
                            visual="gray"
                            aria-label="Edit bio"
                          >
                            <Edit03 className="size-4" />
                          </Button>
                        </Card>
                      ) : (
                        <>
                          <div
                            className={cn(
                              "flex w-full items-start justify-center gap-[75px] rounded-lg border p-6",
                              bioState === "error"
                                ? "border-error-200 bg-error-25"
                                : "border-gray-200 bg-white"
                            )}
                          >
                            <div
                              className={cn(
                                "flex min-w-0 flex-1 flex-col items-start gap-3",
                                bioState === "error"
                                  ? "text-error-500"
                                  : "text-dark-blue-400"
                              )}
                            >
                              <p className="w-full text-lg font-semibold leading-7">
                                Company Bio
                              </p>
                              <p className="w-full text-sm font-light">
                                Build a strong overview that helps clients understand who
                                you are, what you do, and the value you bring. This is
                                your space to create a real connection and show what
                                makes you worth working with.
                              </p>
                            </div>
                            <Button
                              className={cn(
                                "shrink-0 gap-2 bg-white px-[14px] py-2 text-xs",
                                bioState === "error"
                                  ? "border-error-300 text-error-500"
                                  : "border-gray-300 text-gray-800"
                              )}
                              variant="outlined"
                              visual="gray"
                              leftIcon={<Plus className="size-[15px]" />}
                            >
                              Add Bio
                            </Button>
                          </div>
                          {bioState === "error" && (
                            <p className="mt-4 text-sm leading-5 text-error-500">
                              Please add your company bio.
                            </p>
                          )}
                        </>
                      )}
                    </div>
                  </TabsContent>
                )}
                {isEditMode &&
                  isOwnProfile &&
                  (() => {
                    const steps = [
                      {
                        label: isClientProfile
                          ? "Add Your Company Name"
                          : "Add Your Bio",
                        description: isClientProfile
                          ? "Establish your company\u2019s identity on Marketeq"
                          : "Share what drives you and let clients connect on a personal level.",
                        done: !!(profile?.bio || profile?.overview),
                        action: () => setOverviewOpen(true),
                      },
                      {
                        label: isClientProfile
                          ? "Add Your Company Logo"
                          : "Add Your Skills",
                        description: isClientProfile
                          ? "Make your company instantly recognizable."
                          : "Let clients know what you're great at.",
                        done: (profile?.skills?.length ?? 0) > 0,
                        action: () => setSkillsOpen(true),
                      },
                      {
                        label: isClientProfile
                          ? "Add Team Members"
                          : "Add Work Experience",
                        description: isClientProfile
                          ? "Showcase your team members."
                          : "Show clients your professional history.",
                        done: (profile?.experience?.length ?? 0) > 0,
                        action: () => {
                          setActiveTab("Work Experience")
                          setBackgroundActiveTab("Work Experience")
                          setWorkExperienceOpen(true)
                        },
                      },
                      {
                        label: "Add Education",
                        description: "Share your academic background.",
                        done: (profile?.education?.length ?? 0) > 0,
                        action: () => {
                          setActiveTab("Education")
                          setBackgroundActiveTab("Education")
                          setEducationOpen(true)
                        },
                      },
                      {
                        label: "Add Your Languages",
                        description: "Tell clients which languages you speak.",
                        done: (profile?.languages?.length ?? 0) > 0,
                        action: () => setLanguagesOpen(true),
                      },
                      {
                        label: "Set Your Rate",
                        description: "Help clients understand your pricing.",
                        done: !!(profile?.rateMin || profile?.rateMax),
                        action: () => setJobTitleOpen(true),
                      },
                    ]
                    const completedCount = steps.filter((s) => s.done).length
                    const completionPercent = Math.round(
                      (completedCount / steps.length) * 100
                    )
                    const nextStep = steps.find((s) => !s.done)
                    if (completionPercent === 100) return null
                    return (
                      <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6 shadow-[0px_1px_5px_0px_rgba(16,24,40,.02)]">
                        <div className="flex items-start">
                          <div className="flex-auto">
                            <h1 className="text-[20px] leading-none font-bold text-dark-blue-400">
                              {isClientProfile
                                ? "Let's get your company noticed"
                                : "Ready to Get Hired?"}
                            </h1>
                            <p className="text-base font-light mt-1 text-dark-blue-400">
                              {isClientProfile
                                ? "A complete profile gets 3x more client views."
                                : "Clients are 4x more likely to hire users with completed profiles!"}
                            </p>
                          </div>
                        </div>

                        <div className="mt-3 flex items-center gap-x-3">
                          <div className="text-sm leading-5 font-medium text-dark-blue-400">
                            {completionPercent}%
                          </div>
                          <div className="flex flex-auto items-center gap-x-1">
                            {steps.map((_, i) => (
                              <Progress
                                key={i}
                                className="flex-auto first:rounded-l-full last:rounded-r-full [&:not(:first-child)]:rounded-l-none [&:not(:last-child)]:rounded-r-none"
                                indicatorClassName={cn(
                                  i === 0 && "rounded-l-full rounded-r-none",
                                  i === steps.length - 1 &&
                                    "rounded-r-full rounded-l-none",
                                  i !== 0 &&
                                    i !== steps.length - 1 &&
                                    "rounded-none"
                                )}
                                value={i < completedCount ? 100 : 0}
                                bubble={false}
                              />
                            ))}
                          </div>
                        </div>

                        {nextStep && (
                          <div className="mt-3">
                            <div className="rounded-lg px-4 py-3 flex items-center gap-x-3 bg-white border border-gray-300 shadow-[0px_1px_4px_0px_rgba(0,0,0,.03)]">
                              <div className="rounded-full border border-gray-300 size-11 shrink-0 inline-flex items-center justify-center">
                                <User className="size-5" />
                              </div>
                              <div className="flex-auto">
                                <h1 className="text-base leading-6 font-bold text-dark-blue-400">
                                  Next up: {nextStep.label}
                                </h1>
                                <p className="text-xs leading-none text-gray-500">
                                  {nextStep.description}
                                </p>
                              </div>
                              <Button
                                className="text-xs leading-5 font-semibold text-primary-500 border border-primary-500 bg-transparent rounded-full hover:bg-primary-500 hover:text-white"
                                onClick={nextStep.action}
                              >
                                Finish This Step
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })()}

                {!isClientProfile && (!isClientView || hasPortfolio) && (
                  <PortfolioCards
                    key={profile?.portfolio?.length ? "real" : "demo"}
                    portfolio={profile?.portfolio}
                    onOpenBuilder={() => setCaseStudyOpen(true)}
                  />
                )}

                {(!isClientView || hasSkills) && (
                <LazySection minHeight={300}>
                  {/* skills — hidden on the client profile, kept for edit mode */}
                  {!isClientProfile && (
                    <div
                      className="mt-6 p-6 bg-white border border-gray-200 rounded-lg shadow-[0px_1px_5px_0px_rgba(16,24,40,.02)] scroll-mt-[137.5px]"
                      id="skills"
                    >
                      <div className="flex items-center justify-between">
                        <h1 className="text-xl leading-none font-bold text-dark-blue-400">
                          Skills
                        </h1>
                        {isEditMode &&
                          isOwnProfile &&
                          dedupedSkills.length > 0 && (
                            <IconButton
                              className="rounded-full text-gray-500 hover:text-gray-800"
                              variant="ghost"
                              visual="gray"
                              onClick={() => setSkillsOpen(true)}
                            >
                              <Edit03 className="size-4" />
                            </IconButton>
                          )}
                      </div>

                      {dedupedSkills.length > 0 ? (
                        <ShowMoreLessRoot
                          value={autoExpandSkills}
                          onValueChange={setAutoExpandSkills}
                        >
                          {({ isShowing, setIsShowing, ref, scrollHeight }) => (
                            <>
                              <div
                                ref={ref}
                                className="[interpolate-size:allow-keywords] flex gap-3 mt-6 flex-wrap overflow-hidden transition-[height] duration-300"
                                style={{
                                  height: isShowing
                                    ? "auto"
                                    : scrollHeight
                                      ? toPxIfNumber(scrollHeight)
                                      : "auto",
                                }}
                              >
                                <ShowMoreLess max={22}>
                                  {dedupedSkills.map((skill) => (
                                    <Badge
                                      key={skill.id}
                                      className="text-gray-700"
                                      visual="gray"
                                      size="lg"
                                    >
                                      {skill.name}
                                    </Badge>
                                  ))}
                                </ShowMoreLess>
                              </div>

                              {dedupedSkills.length > 22 && (
                                <div className="mt-6 flex items-center justify-center">
                                  <Button
                                    variant="link"
                                    visual="gray"
                                    onClick={() => setIsShowing((prev) => !prev)}
                                  >
                                    {isShowing ? "View Less" : "View More"}
                                  </Button>
                                </div>
                              )}
                            </>
                          )}
                        </ShowMoreLessRoot>
                      ) : (
                        <div className="mt-2 flex items-start justify-between gap-x-4">
                          <div className="flex-auto min-w-0">
                            <p className="text-sm font-light text-gray-600 leading-relaxed">
                              Showcase your expertise and the strengths that set
                              you apart. Highlight the skills that define your work
                              so the right clients can recognize your value and
                              find you faster.
                            </p>
                          </div>
                          {isEditMode && isOwnProfile && (
                            <Button
                              variant="outlined"
                              visual="gray"
                              className="shrink-0 bg-white -mt-7"
                              onClick={() => setSkillsOpen(true)}
                            >
                              <Plus className="size-[15px]" /> Add Skills
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </LazySection>
                )}

                {showOverviewSection && (
                <LazySection minHeight={300}>
                  {/* overview — hidden on the client profile, kept for edit mode */}
                  {!isClientProfile && (
                    <div className="mt-6 scroll-mt-[137.5px]" id="overview">
                      {showOverviewBio && (
                      <div
                        className={cn(
                          "p-6 bg-white border border-gray-200 space-y-6",
                          showOverviewFeatured ? "rounded-t-lg" : "rounded-lg"
                        )}
                      >
                        {(() => {
                          const bioText = profile?.bio || profile?.overview
                          const hasBio = Boolean(bioText)
                          return (
                            <>
                              <div className="flex items-center justify-between">
                                <h1 className="text-xl font-bold text-dark-blue-400 leading-none">
                                  Overview
                                </h1>
                                {isEditMode &&
                                  isOwnProfile &&
                                  (hasBio ? (
                                    <IconButton
                                      className="rounded-full text-gray-500 hover:text-gray-800"
                                      variant="ghost"
                                      visual="gray"
                                      onClick={() => setOverviewOpen(true)}
                                    >
                                      <Edit03 className="size-4" />
                                    </IconButton>
                                  ) : (
                                    <Button
                                      variant="outlined"
                                      visual="gray"
                                      onClick={() => setOverviewOpen(true)}
                                    >
                                      <Plus className="size-[15px]" /> Add Bio
                                    </Button>
                                  ))}
                              </div>

                              {hasBio ? (
                                <LineClampText
                                  text={bioText as string}
                                  lines={3}
                                  className="text-sm font-extralight text-gray-700 leading-relaxed"
                                  toggleClassName="mt-6"
                                  expandLabel="View More"
                                  collapseLabel="View Less"
                                />
                              ) : (
                                <p className="text-sm font-light text-gray-600 leading-relaxed">
                                  Build a strong &ldquo;About Me&rdquo; that helps
                                  clients understand who you are, what you do, and
                                  the value you bring. This is your space to create
                                  a real connection and show what makes you worth
                                  working with.
                                </p>
                              )}
                            </>
                          )
                        })()}
                      </div>
                      )}

                      {showOverviewFeatured && (
                      <Tabs
                        value={effectiveFeaturedTab}
                        onValueChange={setFeaturedTab}
                        className={cn(
                          "p-6 min-h-[134px] border-x border-b border-gray-200 bg-white",
                          showOverviewBio
                            ? "rounded-b-lg"
                            : "rounded-lg border-t"
                        )}
                      >
                        {(!isClientView || visibleFeaturedTabs.length > 1) && (
                        <RadixTabs.List className="flex items-center gap-x-3">
                          {!isClientView && (
                          <TabsTrigger
                            variant="unstyled"
                            showUnderline={false}
                            value="Featured Clients"
                            className="focus-visible:outline-none py-[7px] bg-white hover:bg-gray-50 hover:border-gray-400 px-3.5 border-2 border-gray-300 data-[state=active]:text-dark-blue-400 data-[state=active]:bg-white hover:data-[state=active]:bg-white data-[state=active]:border-dark-blue-400 hover:data-[state=active]:text-dark-blue-400 hover:data-[state=active]:border-dark-blue-400  text-gray-500 hover:text-gray-600 rounded-full text-sm leading-5 font-medium transition duration-300"
                          >
                            Featured Clients
                          </TabsTrigger>
                          )}
                          {(!isClientView || hasCertifications) && (
                          <TabsTrigger
                            variant="unstyled"
                            showUnderline={false}
                            value="Certifications"
                            className="focus-visible:outline-none py-[7px] bg-white hover:bg-gray-50 hover:border-gray-400 px-3.5 border-2 border-gray-300 data-[state=active]:text-dark-blue-400 data-[state=active]:bg-white hover:data-[state=active]:bg-white data-[state=active]:border-dark-blue-400 hover:data-[state=active]:text-dark-blue-400 hover:data-[state=active]:border-dark-blue-400  text-gray-500 hover:text-gray-600 rounded-full text-sm leading-5 font-medium transition duration-300"
                          >
                            Certifications
                          </TabsTrigger>
                          )}
                          {(!isClientView || hasIndustries) && (
                          <TabsTrigger
                            variant="unstyled"
                            showUnderline={false}
                            value="Industry Expertise"
                            className="focus-visible:outline-none py-[7px] bg-white hover:bg-gray-50 hover:border-gray-400 px-3.5 border-2 border-gray-300 data-[state=active]:text-dark-blue-400 data-[state=active]:bg-white hover:data-[state=active]:bg-white data-[state=active]:border-dark-blue-400 hover:data-[state=active]:text-dark-blue-400 hover:data-[state=active]:border-dark-blue-400  text-gray-500 hover:text-gray-600 rounded-full text-sm leading-5 font-medium transition duration-300"
                          >
                            Industry Expertise
                          </TabsTrigger>
                          )}
                          {isEditMode &&
                            isOwnProfile &&
                            featuredTab === "Industry Expertise" &&
                            profile?.industries &&
                            profile.industries.length > 0 && (
                              <div className="ml-auto flex items-center gap-x-1">
                                <IconButton
                                  className="rounded-full text-gray-500 hover:text-gray-800"
                                  variant="ghost"
                                  visual="gray"
                                  onClick={() => setIndustriesOpen(true)}
                                >
                                  <Plus className="size-4" />
                                </IconButton>
                                <IconButton
                                  className="rounded-full text-gray-500 hover:text-gray-800"
                                  variant="ghost"
                                  visual="gray"
                                  onClick={() => setIndustriesOpen(true)}
                                >
                                  <Edit03 className="size-4" />
                                </IconButton>
                              </div>
                            )}
                          {isEditMode &&
                            isOwnProfile &&
                            featuredTab === "Certifications" &&
                            profile?.certifications &&
                            profile.certifications.length > 0 && (
                              <Button
                                variant="outlined"
                                visual="gray"
                                className="ml-auto shrink-0 bg-white"
                                onClick={() => {
                                  setCertEditIdx(undefined)
                                  setCertificationsOpen(true)
                                }}
                              >
                                <Plus className="size-[15px]" /> Add Certification
                              </Button>
                            )}
                        </RadixTabs.List>
                        )}

                        {!isClientView && (
                        <TabsContent value="Featured Clients">
                          <div className="mt-6 p-6 rounded-lg bg-gray-25 border border-gray-200">
                            <div className="flex items-start justify-between gap-x-4">
                              <div className="flex-auto min-w-0">
                                <h2 className="text-lg font-bold text-dark-blue-400 leading-none">
                                  Featured Clients
                                </h2>
                                <p className="mt-2 text-sm font-light text-gray-600 leading-relaxed">
                                  Your featured clients will appear here as you
                                  start working on projects, services, and add
                                  work history to your profile. These clients are
                                  automatically generated based on your past
                                  projects, services, and roles, and aren&apos;t
                                  directly editable.
                                </p>
                              </div>
                              {isEditMode && isOwnProfile && (
                                <Button
                                  variant="outlined"
                                  visual="gray"
                                  className="shrink-0 bg-white"
                                  onClick={() => setWorkExperienceOpen(true)}
                                  disabled={atWorkExperienceLimit}
                                  title={
                                    atWorkExperienceLimit
                                      ? "You've reached the 30-entry limit for work experience."
                                      : undefined
                                  }
                                >
                                  <Plus className="size-[15px]" /> Add Work History
                                </Button>
                              )}
                            </div>
                          </div>
                        </TabsContent>
                        )}
                        <TabsContent value="Certifications">
                          {profile?.certifications &&
                          profile.certifications.length > 0 ? (
                            <div className="pt-6 flex items-center flex-wrap gap-x-6 gap-y-3">
                              {profile.certifications.map((cert) => {
                                const brand = getCertificationBrandFromUrl(
                                  cert.credentialUrl
                                )
                                return (
                                  <div
                                    key={cert.id}
                                    className="inline-flex text-sm leading-none font-medium text-dark-blue-400 items-center gap-x-2"
                                  >
                                    {brand?.type === "component" && (
                                      <brand.Icon className="size-6 shrink-0" />
                                    )}
                                    {brand?.type === "remote-svg" && (
                                      <img
                                        src={brand.url}
                                        alt={brand.name}
                                        width={24}
                                        height={24}
                                        className="size-6 shrink-0"
                                        loading="lazy"
                                        data-fallback="0"
                                        onError={(e) => {
                                          const el = e.currentTarget
                                          if (el.dataset.fallback === "0") {
                                            el.dataset.fallback = "1"
                                            el.src = brand.faviconUrl
                                          } else {
                                            el.style.display = "none"
                                          }
                                        }}
                                      />
                                    )}
                                    <span className="capitalize">
                                      {cert.name}
                                    </span>
                                    {isEditMode && isOwnProfile && (
                                      <IconButton
                                        className="rounded-full text-gray-400 hover:text-gray-600"
                                        variant="ghost"
                                        visual="gray"
                                        onClick={() => {
                                          setCertEditIdx(String(cert.id))
                                          setCertificationsOpen(true)
                                        }}
                                      >
                                        <Edit03 className="size-4" />
                                      </IconButton>
                                    )}
                                  </div>
                                )
                              })}
                            </div>
                          ) : (
                            <div className="mt-4 p-6 rounded-lg bg-gray-25 border border-gray-200">
                              <div className="flex items-start justify-between gap-x-4">
                                <div className="flex-auto min-w-0">
                                  <h2 className="text-lg font-bold text-dark-blue-400 leading-none">
                                    Certifications
                                  </h2>
                                  <p className="mt-2 text-sm font-light text-gray-600 leading-relaxed">
                                    Add the certifications that validate your
                                    expertise so clients can trust your
                                    qualifications.
                                  </p>
                                </div>
                                {isEditMode && isOwnProfile && (
                                  <Button
                                    variant="outlined"
                                    visual="gray"
                                    className="shrink-0 bg-white"
                                    onClick={() => {
                                      setCertEditIdx(undefined)
                                      setCertificationsOpen(true)
                                    }}
                                  >
                                    <Plus className="size-[15px]" /> Add
                                    Certification
                                  </Button>
                                )}
                              </div>
                            </div>
                          )}
                        </TabsContent>
                        <TabsContent value="Industry Expertise">
                          {profile?.industries &&
                          profile.industries.length > 0 ? (
                            <div className="pt-6 flex items-center flex-wrap gap-3">
                              {profile.industries.map((ind) => (
                                <Badge key={ind.id} size="lg" visual="gray">
                                  {ind.industry}
                                </Badge>
                              ))}
                            </div>
                          ) : (
                            <div className="mt-4 p-6 rounded-lg bg-gray-25 border border-gray-200">
                              <div className="flex items-start justify-between gap-x-4">
                                <div className="flex-auto min-w-0">
                                  <h2 className="text-lg font-bold text-dark-blue-400 leading-none">
                                    Industry Expertise
                                  </h2>
                                  <p className="mt-2 text-sm font-light text-gray-600 leading-relaxed">
                                    Highlight the industries you specialize in so
                                    clients in those spaces can find you.
                                  </p>
                                </div>
                                {isEditMode && isOwnProfile && (
                                  <Button
                                    variant="outlined"
                                    visual="gray"
                                    className="shrink-0 bg-white"
                                    onClick={() => setIndustriesOpen(true)}
                                  >
                                    <Plus className="size-[15px]" /> Add Industry
                                  </Button>
                                )}
                              </div>
                            </div>
                          )}
                        </TabsContent>
                      </Tabs>
                      )}
                    </div>
                  )}
                </LazySection>
                )}

                {!isClientView && (
                <LazySection minHeight={400}>
                  {/* offers — hidden on the client profile, kept for edit mode */}
                  {!isClientProfile && (
                    <div
                      className="mt-6 p-6 rounded-lg bg-white shadow-[0px_1px_5px_0px_rgba(16,24,40,.02)] border border-gray-200 scroll-mt-[137.5px]"
                      id="offers"
                    >
                      <h1 className="text-xl font-bold leading-none text-dark-blue-400">
                        My Offers
                      </h1>

                      <Tabs defaultValue="Projects" className="mt-6">
                        <div className="flex items-center justify-between">
                          <RadixTabs.List className="inline-flex items-center gap-x-3">
                            <TabsTrigger
                              variant="unstyled"
                              showUnderline={false}
                              value="Projects"
                              className="focus-visible:outline-none py-[7px] bg-white hover:bg-gray-50 hover:border-gray-400 px-3.5 border-2 border-gray-300 data-[state=active]:text-dark-blue-400 data-[state=active]:bg-white hover:data-[state=active]:bg-white data-[state=active]:border-dark-blue-400 hover:data-[state=active]:text-dark-blue-400 hover:data-[state=active]:border-dark-blue-400  text-gray-500 hover:text-gray-600 rounded-full text-sm leading-5 font-medium transition duration-300"
                            >
                              Projects
                            </TabsTrigger>
                            <TabsTrigger
                              variant="unstyled"
                              showUnderline={false}
                              value="Services"
                              className="focus-visible:outline-none py-[7px] bg-white hover:bg-gray-50 hover:border-gray-400 px-3.5 border-2 border-gray-300 data-[state=active]:text-dark-blue-400 data-[state=active]:bg-white hover:data-[state=active]:bg-white data-[state=active]:border-dark-blue-400 hover:data-[state=active]:text-dark-blue-400 hover:data-[state=active]:border-dark-blue-400  text-gray-500 hover:text-gray-600 rounded-full text-sm leading-5 font-medium transition duration-300"
                            >
                              Services
                            </TabsTrigger>
                          </RadixTabs.List>

                          {isEditMode && isOwnProfile && (
                            <Button
                              variant="link"
                              visual="gray"
                              onClick={() => setListingsModalStep("empty")}
                            >
                              <Edit03 className="size-[15px]" /> Edit Listings
                            </Button>
                          )}
                        </div>

                        <TabsContent value="Projects">
                          <div className="mt-6 p-6 rounded-lg bg-gray-25 border border-gray-200">
                            <div className="flex items-start justify-between gap-x-4">
                              <div className="flex-auto min-w-0">
                                <h2 className="text-lg font-bold text-dark-blue-400 leading-none">
                                  Projects
                                </h2>
                                <p className="mt-2 text-sm font-light text-gray-600 leading-relaxed">
                                  Your project offers will be displayed here as you create your own listings or join existing projects in the marketplace. These offers help you gain visibility, attract clients, and help create more opportunities.
                                </p>
                              </div>
                              {isEditMode && isOwnProfile && (
                                <Button
                                  variant="outlined"
                                  visual="gray"
                                  className="shrink-0 bg-white"
                                  onClick={() => goToPublishProject("project")}
                                >
                                  <Plus className="size-[15px]" /> Add Project
                                </Button>
                              )}
                            </div>
                          </div>
                        </TabsContent>

                        <TabsContent value="Services">
                          <div className="mt-6 p-6 rounded-lg bg-gray-25 border border-gray-200">
                            <div className="flex items-start justify-between gap-x-4">
                              <div className="flex-auto min-w-0">
                                <h2 className="text-lg font-bold text-dark-blue-400 leading-none">
                                  Services
                                </h2>
                                <p className="mt-2 text-sm font-light text-gray-600 leading-relaxed">
                                  Your service offers will be displayed here as you create your own listings or join existing services in the marketplace. These offers help you gain visibility, attract clients, and help create more opportunities.
                                </p>
                              </div>
                              {isEditMode && isOwnProfile && (
                                <Button
                                  variant="outlined"
                                  visual="gray"
                                  className="shrink-0 bg-white"
                                  onClick={() => goToPublishProject("service")}
                                >
                                  <Plus className="size-[15px]" /> Add Service
                                </Button>
                              )}
                            </div>
                          </div>
                        </TabsContent>
                      </Tabs>
                    </div>
                  )}
                </LazySection>
                )}

                {showBackgroundSection && (
                <LazySection minHeight={400}>
                  {/* background — hidden on the client profile, kept for edit mode */}
                  {!isClientProfile && (
                    <div
                      className="mt-6 p-6 rounded-lg bg-white shadow-[0px_1px_5px_0px_rgba(16,24,40,.02)] border border-gray-200 scroll-mt-[137.5px]"
                      id="background"
                    >
                      <div className="flex items-center justify-between">
                        <h1 className="text-xl leading-none font-bold text-dark-blue-400">
                          Background
                        </h1>
                        {isEditMode && isOwnProfile && (
                          <IconButton
                            className="rounded-full text-gray-500 hover:text-gray-800"
                            variant="ghost"
                            visual="gray"
                            onClick={() =>
                              backgroundActiveTab === "Education"
                                ? setEducationOpen(true)
                                : setWorkExperienceOpen(true)
                            }
                          >
                            <Edit03 className="size-4" />
                          </IconButton>
                        )}
                      </div>

                      <Tabs
                        value={effectiveBackgroundTab}
                        onValueChange={setBackgroundActiveTab}
                        className="mt-6"
                      >
                        {(!isClientView || visibleBackgroundTabs.length > 1) && (
                        <RadixTabs.List className="inline-flex items-center gap-x-3">
                          {(!isClientView || hasWorkExperience) && (
                          <TabsTrigger
                            variant="unstyled"
                            showUnderline={false}
                            value="Work Experience"
                            className="focus-visible:outline-none py-[7px] bg-white hover:bg-gray-50 hover:border-gray-400 px-3.5 border-2 border-gray-300 data-[state=active]:text-dark-blue-400 data-[state=active]:bg-white hover:data-[state=active]:bg-white data-[state=active]:border-dark-blue-400 hover:data-[state=active]:text-dark-blue-400 hover:data-[state=active]:border-dark-blue-400  text-gray-500 hover:text-gray-600 rounded-full text-sm leading-5 font-medium transition duration-300"
                          >
                            Work Experience
                          </TabsTrigger>
                          )}
                          {(!isClientView || hasEducation) && (
                          <TabsTrigger
                            variant="unstyled"
                            showUnderline={false}
                            value="Education"
                            className="focus-visible:outline-none py-[7px] bg-white hover:bg-gray-50 hover:border-gray-400 px-3.5 border-2 border-gray-300 data-[state=active]:text-dark-blue-400 data-[state=active]:bg-white hover:data-[state=active]:bg-white data-[state=active]:border-dark-blue-400 hover:data-[state=active]:text-dark-blue-400 hover:data-[state=active]:border-dark-blue-400  text-gray-500 hover:text-gray-600 rounded-full text-sm leading-5 font-medium transition duration-300"
                          >
                            Education
                          </TabsTrigger>
                          )}
                        </RadixTabs.List>
                        )}

                        <TabsContent value="Work Experience">
                          <ShowMoreLessRoot
                            value={autoExpandWorkExperience}
                            onValueChange={setAutoExpandWorkExperience}
                          >
                            {({ isShowing, setIsShowing, scrollHeight, ref }) => (
                              <>
                                <div
                                  ref={ref}
                                  className="[interpolate-size:allow-keywords] mt-6 overflow-hidden transition-[height] duration-300"
                                  style={{
                                    height: isShowing
                                      ? "auto"
                                      : scrollHeight
                                        ? toPxIfNumber(scrollHeight)
                                        : "auto",
                                  }}
                                >
                                  <ShowMoreLessComp max={4}>
                                    {profile?.experience &&
                                    profile.experience.length > 0 ? (
                                      [...profile.experience]
                                        .sort((a: any, b: any) => {
                                          const aCurrent =
                                            a.isCurrentRole || !a.endDate
                                          const bCurrent =
                                            b.isCurrentRole || !b.endDate
                                          if (aCurrent !== bCurrent)
                                            return aCurrent ? -1 : 1
                                          return (b.startDate || "").localeCompare(
                                            a.startDate || ""
                                          )
                                        })
                                        .map((exp: any, idx: number) => {
                                          const months = [
                                            "January",
                                            "February",
                                            "March",
                                            "April",
                                            "May",
                                            "June",
                                            "July",
                                            "August",
                                            "September",
                                            "October",
                                            "November",
                                            "December",
                                          ]
                                          const fmtDate = (d: string | null) => {
                                            if (!d) return "Present"
                                            const [y, m] = d.split("-")
                                            return `${months[parseInt(m, 10) - 1]} ${y}`
                                          }
                                          const toDate = (d: string) => {
                                            const [y, m, day] = d.split("-")
                                            return new Date(
                                              Number(y),
                                              Number(m) - 1,
                                              Number(day || 1)
                                            )
                                          }
                                          const calcDuration = (
                                            start: string,
                                            end: string | null
                                          ) => {
                                            const s = toDate(start)
                                            const e = end ? toDate(end) : new Date()
                                            let totalMonths =
                                              (e.getFullYear() -
                                                s.getFullYear()) *
                                                12 +
                                              (e.getMonth() - s.getMonth())
                                            const yrs = Math.floor(
                                              totalMonths / 12
                                            )
                                            const mos = totalMonths % 12
                                            const parts = []
                                            if (yrs > 0)
                                              parts.push(
                                                `${yrs} yr${yrs > 1 ? "s" : ""}`
                                              )
                                            if (mos > 0)
                                              parts.push(
                                                `${mos} mo${mos > 1 ? "s" : ""}`
                                              )
                                            return parts.join(" ") || "< 1 mo"
                                          }
                                          return (
                                            <div
                                              key={exp.id || idx}
                                              className="flex gap-x-6"
                                            >
                                              <div className="relative flex flex-col items-center">
                                                <div className="size-[55px] border border-gray-300 rounded-lg inline-flex shrink-0 justify-center items-center shadow-[0px_1px_4px_0px_rgba(0,0,0,.03)] bg-gray-50 overflow-hidden relative">
                                                  <span className="absolute inset-0 inline-flex items-center justify-center text-lg font-bold text-gray-400">
                                                    {exp.company?.charAt(0) ||
                                                      "W"}
                                                  </span>
                                                  {(() => {
                                                    if (exp.companyLogoUrl) {
                                                      return (
                                                        <NextImage
                                                          key={exp.companyLogoUrl}
                                                          src={exp.companyLogoUrl}
                                                          alt={exp.company || ""}
                                                          width={45}
                                                          height={45}
                                                          className="object-contain relative"
                                                        />
                                                      )
                                                    }
                                                    const brand =
                                                      getCompanyBrandFromName(
                                                        exp.company
                                                      )
                                                    if (
                                                      brand?.type === "component"
                                                    ) {
                                                      return (
                                                        <brand.Icon className="size-9 relative bg-gray-50" />
                                                      )
                                                    }
                                                    if (
                                                      brand?.type === "remote-svg"
                                                    ) {
                                                      return (
                                                        <img
                                                          key={brand.url}
                                                          src={brand.url}
                                                          alt={
                                                            exp.company ||
                                                            brand.name
                                                          }
                                                          width={36}
                                                          height={36}
                                                          className="object-contain size-9 relative bg-gray-50"
                                                          loading="lazy"
                                                          data-fallback="0"
                                                          onError={(e) => {
                                                            const el =
                                                              e.currentTarget
                                                            if (
                                                              el.dataset
                                                                .fallback === "0"
                                                            ) {
                                                              el.dataset.fallback =
                                                                "1"
                                                              el.src =
                                                                brand.faviconUrl
                                                            } else {
                                                              el.style.display =
                                                                "none"
                                                            }
                                                          }}
                                                        />
                                                      )
                                                    }
                                                    return null
                                                  })()}
                                                </div>

                                                {idx <
                                                  (profile.experience?.length ??
                                                    0) -
                                                    1 && (
                                                  <div className="absolute flex py-1.5 justify-center top-[55px] inset-x-0 bottom-0">
                                                    <span className="inline-block border-dashed border-[1.5px] border-gray-200" />
                                                  </div>
                                                )}
                                              </div>

                                              <div className="flex-auto min-w-0">
                                                <div className="pb-8">
                                                  <div className="flex items-center justify-between">
                                                    <h1 className="text-base font-bold text-dark-blue-400 leading-none">
                                                      {exp.title}
                                                    </h1>
                                                    {isEditMode &&
                                                      isOwnProfile && (
                                                        <div className="flex items-center">
                                                          <IconButton
                                                            variant="ghost"
                                                            visual="gray"
                                                            className="rounded-full text-gray-400 hover:text-gray-800"
                                                            type="button"
                                                            onClick={() => {
                                                              setWorkExpEditIdx(
                                                                String(exp.id)
                                                              )
                                                              setWorkExperienceOpen(
                                                                true
                                                              )
                                                            }}
                                                          >
                                                            <Edit03 className="size-4" />
                                                          </IconButton>
                                                          <IconButton
                                                            variant="ghost"
                                                            visual="gray"
                                                            className="rounded-full text-error-500 hover:bg-error-100"
                                                            type="button"
                                                            onClick={() =>
                                                              handleDeleteWorkExperience(
                                                                exp.id
                                                              )
                                                            }
                                                          >
                                                            <Trash03 className="size-4" />
                                                          </IconButton>
                                                        </div>
                                                      )}
                                                  </div>
                                                  <p className="text-[13px] mt-1.5 leading-none text-dark-blue-400">
                                                    {exp.company
                                                      ? exp.company.charAt(0).toUpperCase() +
                                                        exp.company.slice(1)
                                                      : ""}
                                                  </p>
                                                  <div className="mt-1.5 inline-flex items-center gap-x-2">
                                                    <span className="text-xs leading-none text-dark-blue-400">
                                                      {fmtDate(exp.startDate)} -{" "}
                                                      {fmtDate(exp.endDate)}
                                                    </span>
                                                    <span className="shrink-0 bg-gray-300 size-1 rounded-full inline-block" />
                                                    <span className="text-xs leading-none font-semibold text-dark-blue-400">
                                                      {calcDuration(
                                                        exp.startDate,
                                                        exp.endDate
                                                      )}
                                                    </span>
                                                  </div>

                                                  {exp.description && (
                                                    <ReadMoreLessRoot>
                                                      <ReadMoreLessComp
                                                        max={52}
                                                        text={exp.description}
                                                      >
                                                        {({
                                                          readMore,
                                                          text,
                                                          toggle,
                                                        }) => (
                                                          <>
                                                            <p className="mt-3 text-sm leading-none font-extralight text-gray-700 break-words">
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
                                                  )}
                                                  {Array.isArray(exp.skills) && exp.skills.length > 0 && (
                                                    <div className="mt-3 flex flex-wrap gap-2">
                                                      {exp.skills.map((skill: string, sIdx: number) => (
                                                        <Badge
                                                          key={`${exp.id || idx}-${sIdx}`}
                                                          className="text-gray-700"
                                                          visual="gray"
                                                          size="sm"
                                                        >
                                                          {skill}
                                                        </Badge>
                                                      ))}
                                                    </div>
                                                  )}
                                                </div>
                                              </div>
                                            </div>
                                          )
                                        })
                                    ) : (
                                      <div className="p-6 rounded-lg bg-gray-25 border border-gray-200">
                                        <div className="flex items-start justify-between gap-x-4">
                                          <div className="flex-auto min-w-0">
                                            <h2 className="text-lg font-bold text-dark-blue-400 leading-none">
                                              Work Experience
                                            </h2>
                                            <p className="mt-2 text-sm font-light text-gray-600 leading-relaxed">
                                              Add your work experience to show
                                              where you&apos;ve worked and the
                                              impact you&apos;ve made. This gives
                                              clients more context around your
                                              background and expertise.
                                            </p>
                                          </div>
                                          {isEditMode && isOwnProfile && (
                                            <Button
                                              variant="outlined"
                                              visual="gray"
                                              className="shrink-0 bg-white"
                                              onClick={() =>
                                                setWorkExperienceOpen(true)
                                              }
                                              disabled={atWorkExperienceLimit}
                                              title={
                                                atWorkExperienceLimit
                                                  ? "You've reached the 30-entry limit for work experience."
                                                  : undefined
                                              }
                                            >
                                              <Plus className="size-[15px]" /> Add
                                              Work Experience
                                            </Button>
                                          )}
                                        </div>
                                      </div>
                                    )}
                                  </ShowMoreLessComp>
                                </div>

                                {(profile?.experience?.length ?? 0) > 4 && (
                                  <div className="flex mt-6 items-center justify-center">
                                    <Button
                                      variant="link"
                                      visual="gray"
                                      onClick={() =>
                                        setIsShowing((prev) => !prev)
                                      }
                                    >
                                      {isShowing
                                        ? "View Less"
                                        : `${(profile?.experience?.length ?? 0) - 4} More...`}
                                    </Button>
                                  </div>
                                )}
                              </>
                            )}
                          </ShowMoreLessRoot>
                        </TabsContent>

                        <TabsContent value="Education">
                          <ShowMoreLessRoot
                            value={autoExpandEducation}
                            onValueChange={setAutoExpandEducation}
                          >
                            {({ isShowing, setIsShowing, scrollHeight, ref }) => (
                              <>
                                <div
                                  ref={ref}
                                  className="[interpolate-size:allow-keywords] mt-6 overflow-hidden transition-[height] duration-300"
                                  style={{
                                    height: isShowing
                                      ? "auto"
                                      : scrollHeight
                                        ? toPxIfNumber(scrollHeight)
                                        : "auto",
                                  }}
                                >
                                  <ShowMoreLessComp max={4}>
                                    {profile?.education &&
                                    profile.education.length > 0 ? (
                                      [...profile.education]
                                        .sort((a: any, b: any) => {
                                          const aCurrent =
                                            a.currentlyStudying || !a.endYear
                                          const bCurrent =
                                            b.currentlyStudying || !b.endYear
                                          if (aCurrent !== bCurrent)
                                            return aCurrent ? -1 : 1
                                          return (
                                            (b.startYear ?? 0) -
                                              (a.startYear ?? 0) ||
                                            (b.startMonth ?? 0) -
                                              (a.startMonth ?? 0)
                                          )
                                        })
                                        .map((edu: any, idx: number) => {
                                          const months = [
                                            "January",
                                            "February",
                                            "March",
                                            "April",
                                            "May",
                                            "June",
                                            "July",
                                            "August",
                                            "September",
                                            "October",
                                            "November",
                                            "December",
                                          ]
                                          const fmtYearMonth = (
                                            year?: number | null,
                                            month?: number | null
                                          ) => {
                                            if (!year) return "Present"
                                            if (!month) return String(year)
                                            return `${months[month - 1]} ${year}`
                                          }
                                          return (
                                            <div
                                              key={edu.id || idx}
                                              className="flex pb-5 items-start gap-x-6"
                                            >
                                              <div className="size-[55px] p-[5px] relative shrink-0 rounded-lg overflow-hidden border border-gray-200 bg-gray-50 flex items-center justify-center">
                                                <span className="absolute inset-0 inline-flex items-center justify-center text-lg font-bold text-gray-400">
                                                  {edu.school?.charAt(0) || "E"}
                                                </span>
                                                {(() => {
                                                  if (edu.institutionLogoUrl) {
                                                    return (
                                                      <NextImage
                                                        key={edu.institutionLogoUrl}
                                                        src={
                                                          edu.institutionLogoUrl
                                                        }
                                                        alt={edu.school || ""}
                                                        fill
                                                        sizes="55px"
                                                        className="object-contain p-1 relative"
                                                      />
                                                    )
                                                  }
                                                  const brand =
                                                    getCompanyBrandFromName(
                                                      edu.school,
                                                      { faviconTld: "edu" }
                                                    )
                                                  if (
                                                    brand?.type === "component"
                                                  ) {
                                                    return (
                                                      <brand.Icon className="size-9 relative bg-gray-50" />
                                                    )
                                                  }
                                                  if (
                                                    brand?.type === "remote-svg"
                                                  ) {
                                                    return (
                                                      <img
                                                        key={brand.url}
                                                        src={brand.url}
                                                        alt={
                                                          edu.school ||
                                                          brand.name
                                                        }
                                                        width={36}
                                                        height={36}
                                                        className="object-contain size-9 relative bg-gray-50"
                                                        loading="lazy"
                                                        data-fallback="0"
                                                        onError={(e) => {
                                                          const el =
                                                            e.currentTarget
                                                          if (
                                                            el.dataset
                                                              .fallback === "0"
                                                          ) {
                                                            el.dataset.fallback =
                                                              "1"
                                                            el.src =
                                                              brand.faviconUrl
                                                          } else {
                                                            el.style.display =
                                                              "none"
                                                          }
                                                        }}
                                                      />
                                                    )
                                                  }
                                                  return null
                                                })()}
                                              </div>

                                              <div className="flex-auto">
                                                <div className="flex items-start justify-between">
                                                  <h1 className="text-base leading-none font-bold text-dark-blue-400">
                                                    {edu.school}
                                                  </h1>
                                                  {isEditMode && isOwnProfile && (
                                                    <div className="flex items-center">
                                                      <IconButton
                                                        variant="ghost"
                                                        visual="gray"
                                                        className="rounded-full text-gray-400 hover:text-gray-800"
                                                        type="button"
                                                        onClick={() => {
                                                          setEduEditIdx(
                                                            String(edu.id)
                                                          )
                                                          setEducationOpen(true)
                                                        }}
                                                      >
                                                        <Edit03 className="size-4" />
                                                      </IconButton>
                                                      <IconButton
                                                        variant="ghost"
                                                        visual="gray"
                                                        className="rounded-full text-error-500 hover:bg-error-100"
                                                        type="button"
                                                        onClick={() =>
                                                          handleDeleteEducation(
                                                            edu.id
                                                          )
                                                        }
                                                      >
                                                        <Trash03 className="size-4" />
                                                      </IconButton>
                                                    </div>
                                                  )}
                                                </div>
                                                <div className="mt-1.5 flex items-center gap-x-2">
                                                  {edu.degree && (
                                                    <span className="text-dark-blue-400 text-xs leading-none">
                                                      {edu.degree}
                                                    </span>
                                                  )}
                                                  {edu.degree && edu.fieldOfStudy && (
                                                    <span className="shrink-0 bg-gray-300 size-1 rounded-full inline-block" />
                                                  )}
                                                  {edu.fieldOfStudy && (
                                                    <span className="text-dark-blue-400 font-semibold text-xs leading-none">
                                                      {edu.fieldOfStudy}
                                                    </span>
                                                  )}
                                                </div>
                                                <div className="mt-1.5">
                                                  <span className="text-dark-blue-400 text-xs leading-none">
                                                    {fmtYearMonth(edu.startYear, edu.startMonth)} -{" "}
                                                    {edu.currentlyStudying
                                                      ? "Present"
                                                      : fmtYearMonth(edu.endYear, edu.endMonth)}
                                                  </span>
                                                </div>
                                              </div>
                                            </div>
                                          )
                                        })
                                    ) : (
                                      <div className="p-6 rounded-lg bg-gray-25 border border-gray-200">
                                        <div className="flex items-start justify-between gap-x-4">
                                          <div className="flex-auto min-w-0">
                                            <h2 className="text-lg font-bold text-dark-blue-400 leading-none">
                                              Education
                                            </h2>
                                            <p className="mt-2 text-sm font-light text-gray-600 leading-relaxed">
                                              Add your education to highlight your
                                              academic background and the
                                              qualifications that support your
                                              expertise.
                                            </p>
                                          </div>
                                          {isEditMode && isOwnProfile && (
                                            <Button
                                              variant="outlined"
                                              visual="gray"
                                              className="shrink-0 bg-white"
                                              onClick={() =>
                                                setEducationOpen(true)
                                              }
                                            >
                                              <Plus className="size-[15px]" /> Add
                                              Education
                                            </Button>
                                          )}
                                        </div>
                                      </div>
                                    )}
                                  </ShowMoreLessComp>
                                </div>

                                <div
                                  className={cn(
                                    "flex items-center justify-start",
                                    isShowing && "justify-center"
                                  )}
                                >
                                  {(profile?.education?.length ?? 0) > 4 && (
                                    <Button
                                      size="sm"
                                      variant="link"
                                      visual="gray"
                                      onClick={() =>
                                        setIsShowing((prev) => !prev)
                                      }
                                    >
                                      {isShowing
                                        ? "View Less"
                                        : `${(profile?.education?.length ?? 0) - 4} More...`}
                                    </Button>
                                  )}
                                </div>
                              </>
                            )}
                          </ShowMoreLessRoot>
                        </TabsContent>
                      </Tabs>
                    </div>
                  )}
                </LazySection>
                )}

                {/* Project History + Reviews. The empty states inside are
                    kept for later use. */}
                {/* Always visible. The tabs control the first section only. */}
                {showProjectHistory && (
                <LazySection minHeight={400}>
                  <div
                    className="mt-6 scroll-mt-[137.5px]"
                    id="project-history"
                  >
                    <div className="border border-gray-200 rounded-t-lg bg-white shadow-[0px_1px_5px_0px_rgba(16,24,40,.02)] py-5 pl-5 pr-6">
                      <Carousel
                        opts={{
                          align: "start",
                        }}
                        className="w-full"
                      >
                        <CarouselContent>
                          {Array.from({ length: 7 }).map((_, index) => (
                            <CarouselItem
                              key={index}
                              className="basis-[20%] h-[108px]"
                            >
                              <div className="p-1 size-full bg-gray-200 relative rounded-lg overflow-hidden">
                                <NextImage
                                  src="/cpu.png"
                                  alt="CPU"
                                  fill
                                  sizes="(max-width: 768px) 40vw, 20vw"
                                />
                              </div>
                            </CarouselItem>
                          ))}
                        </CarouselContent>

                        <CarouselPreviousTrigger />
                        <CarouselNextTrigger />
                      </Carousel>

                      <div className="flex items-center justify-between mt-3">
                        <span className="text-xs leading-none font-extralight text-dark-blue-400">
                          Client project images
                        </span>

                        <Button variant="link" visual="gray">
                          View All
                        </Button>
                      </div>
                    </div>

                    <div className="p-8 border-x gap-x-[50px] border-b flex items-start rounded-b-lg border-gray-200 bg-white shadow-[0px_1px_5px_0px_rgba(16,24,40,.02)]">
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
                                        half ? <TbStarHalfFilled /> : <TbStar />
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
                            100% <span className="font-extralight">(100)</span>
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
                  </div>

                  <div className="mt-6">
                    <Tabs defaultValue="Completed">
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

                          <Listbox
                            className="shrink-0 w-max"
                            defaultValue="Most Recent"
                          >
                            <ListboxButton className="w-max text-sm h-10" />
                            <ListboxOptions className="w-[177px] right-0">
                              {[
                                "Most Recent",
                                "Oldest",
                                "Highest Rating",
                                "Lowest Rating",
                              ].map((option) => (
                                <ListboxOption
                                  className="ui-active:text-gray-700 ui-active:font-medium text-gray-500"
                                  key={option}
                                  value={option}
                                >
                                  {option}
                                </ListboxOption>
                              ))}
                            </ListboxOptions>
                          </Listbox>
                        </div>
                      </RadixTabs.List>
                      <TabsContent value="Completed">
                        <ShowMoreLessRoot
                          value={autoExpandProjectHistory}
                          onValueChange={setAutoExpandProjectHistory}
                        >
                          {({ isShowing, setIsShowing, scrollHeight, ref }) => (
                            <>
                              <div
                                ref={ref}
                                className="mt-6 overflow-hidden [interpolate-size:allow-keywords] transition-[height] duration-500"
                                style={{
                                  height: isShowing
                                    ? "auto"
                                    : scrollHeight
                                      ? toPxIfNumber(scrollHeight)
                                      : "auto",
                                }}
                              >
                                <ShowMoreLessComp max={2}>
                                  <div className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-[0px_1px_5px_0px_rgba(16,24,40,.02)]">
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
                                            <div className="flex flex-col">
                                              <div className="inline-flex items-center gap-x-1">
                                                <span className="text-base leading-6 font-semibold text-dark-blue-400">
                                                  Emily
                                                </span>
                                                <span className="text-base leading-6 text-dark-blue-400">
                                                  @emily.j
                                                </span>
                                              </div>

                                              <span className="text-[13px] leading-6 text-dark-blue-400">
                                                Product Manager
                                              </span>
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
                                      <LineClampText
                                        text="Lorem ipsum dolor sit amet consectetur adipisicing elit. Voluptate doloremque impedit eveniet harum dolores modi dolor, aspernatur saepe incidunt consequuntur et voluptatem dolorem ea sequi officia distinctio perspiciatis labore fugit eligendi architecto similique esse assumenda fugiat? Aut tempora veritatis, similique exercitationem quos consequuntur repudiandae, quaerat nesciunt ducimus beatae tempore alias repellendus id quidem pariatur blanditiis architecto quasi aperiam fugiat maiores?"
                                        lines={2}
                                        className="text-sm leading-relaxed mt-1 text-gray-700 font-extralight"
                                        expandLabel="...Read More"
                                        collapseLabel=""
                                        inline
                                      />

                                      <div className="mt-3 flex items-center justify-between">
                                        <div className="items-center inline-flex gap-x-2.5">
                                          {!isOwnProfile && (
                                            <>
                                              <span className="text-xs font-medium leading-none text-dark-blue-400">
                                                Helpful
                                              </span>
                                              <LikeDislike />
                                            </>
                                          )}
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
                                            <div className="flex flex-col">
                                              <div className="inline-flex items-center gap-x-1">
                                                <span className="text-base leading-6 font-semibold text-dark-blue-400">
                                                  Emily
                                                </span>
                                                <span className="text-base leading-6 text-dark-blue-400">
                                                  @emily.j
                                                </span>
                                              </div>

                                              <span className="text-[13px] leading-6 text-dark-blue-400">
                                                Product Manager
                                              </span>
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
                                      <LineClampText
                                        text="Lorem ipsum dolor sit amet consectetur adipisicing elit. Voluptate doloremque impedit eveniet harum dolores modi dolor, aspernatur saepe incidunt consequuntur et voluptatem dolorem ea sequi officia distinctio perspiciatis labore fugit eligendi architecto similique esse assumenda fugiat? Aut tempora veritatis, similique exercitationem quos consequuntur repudiandae, quaerat nesciunt ducimus beatae tempore alias repellendus id quidem pariatur blanditiis architecto quasi aperiam fugiat maiores?"
                                        lines={2}
                                        className="text-sm leading-relaxed mt-1 text-gray-700 font-extralight"
                                        expandLabel="...Read More"
                                        collapseLabel=""
                                        inline
                                      />

                                      <div className="mt-3 flex items-center justify-between">
                                        <div className="items-center inline-flex gap-x-2.5">
                                          {!isOwnProfile && (
                                            <>
                                              <span className="text-xs font-medium leading-none text-dark-blue-400">
                                                Helpful
                                              </span>
                                              <LikeDislike />
                                            </>
                                          )}
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
                                          <AvatarFallback>M</AvatarFallback>
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

                                          <div className="inline-flex items-center mt-[1.5px] gap-x-2">
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

                                      <LineClampText
                                        text="Lorem ipsum dolor sit amet consectetur adipisicing elit. Voluptate doloremque impedit eveniet harum dolores modi dolor, aspernatur saepe incidunt consequuntur et voluptatem dolorem ea sequi officia distinctio perspiciatis labore fugit eligendi architecto similique esse assumenda fugiat? Aut tempora veritatis, similique exercitationem quos consequuntur repudiandae, quaerat nesciunt ducimus beatae tempore alias repellendus id quidem pariatur blanditiis architecto quasi aperiam fugiat maiores?"
                                        lines={2}
                                        className="text-sm leading-relaxed mt-3 text-gray-700 font-extralight"
                                        expandLabel="...Read More"
                                        collapseLabel=""
                                        inline
                                      />

                                      <div className="mt-3 flex items-center justify-between">
                                        <div className="items-center inline-flex gap-x-2.5">
                                          {!isOwnProfile && (
                                            <>
                                              <span className="text-xs font-medium leading-none text-dark-blue-400">
                                                Helpful
                                              </span>
                                              <LikeDislike />
                                            </>
                                          )}
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
                                            <div className="flex flex-col">
                                              <div className="inline-flex items-center gap-x-1">
                                                <span className="text-base leading-6 font-semibold text-dark-blue-400">
                                                  Emily
                                                </span>
                                                <span className="text-base leading-6 text-dark-blue-400">
                                                  @emily.j
                                                </span>
                                              </div>

                                              <span className="text-[13px] leading-6 text-dark-blue-400">
                                                Product Manager
                                              </span>
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
                                      <LineClampText
                                        text="Lorem ipsum dolor sit amet consectetur adipisicing elit. Voluptate doloremque impedit eveniet harum dolores modi dolor, aspernatur saepe incidunt consequuntur et voluptatem dolorem ea sequi officia distinctio perspiciatis labore fugit eligendi architecto similique esse assumenda fugiat? Aut tempora veritatis, similique exercitationem quos consequuntur repudiandae, quaerat nesciunt ducimus beatae tempore alias repellendus id quidem pariatur blanditiis architecto quasi aperiam fugiat maiores?"
                                        lines={2}
                                        className="text-sm leading-relaxed mt-1 text-gray-700 font-extralight"
                                        expandLabel="...Read More"
                                        collapseLabel=""
                                        inline
                                      />

                                      <div className="mt-3 flex items-center justify-between">
                                        <div className="items-center inline-flex gap-x-2.5">
                                          {!isOwnProfile && (
                                            <>
                                              <span className="text-xs font-medium leading-none text-dark-blue-400">
                                                Helpful
                                              </span>
                                              <LikeDislike />
                                            </>
                                          )}
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
                                            <div className="flex flex-col">
                                              <div className="inline-flex items-center gap-x-1">
                                                <span className="text-base leading-6 font-semibold text-dark-blue-400">
                                                  Emily
                                                </span>
                                                <span className="text-base leading-6 text-dark-blue-400">
                                                  @emily.j
                                                </span>
                                              </div>

                                              <span className="text-[13px] leading-6 text-dark-blue-400">
                                                Product Manager
                                              </span>
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
                                      <LineClampText
                                        text="Lorem ipsum dolor sit amet consectetur adipisicing elit. Voluptate doloremque impedit eveniet harum dolores modi dolor, aspernatur saepe incidunt consequuntur et voluptatem dolorem ea sequi officia distinctio perspiciatis labore fugit eligendi architecto similique esse assumenda fugiat? Aut tempora veritatis, similique exercitationem quos consequuntur repudiandae, quaerat nesciunt ducimus beatae tempore alias repellendus id quidem pariatur blanditiis architecto quasi aperiam fugiat maiores?"
                                        lines={2}
                                        className="text-sm leading-relaxed mt-1 text-gray-700 font-extralight"
                                        expandLabel="...Read More"
                                        collapseLabel=""
                                        inline
                                      />

                                      <div className="mt-3 flex items-center justify-between">
                                        <div className="items-center inline-flex gap-x-2.5">
                                          {!isOwnProfile && (
                                            <>
                                              <span className="text-xs font-medium leading-none text-dark-blue-400">
                                                Helpful
                                              </span>
                                              <LikeDislike />
                                            </>
                                          )}
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
                                  className="bg-white"
                                  onClick={() => setIsShowing((prev) => !prev)}
                                >
                                  {isShowing ? (
                                    <>
                                      View Less{" "}
                                      <ChevronUp className="size-[15px]" />
                                    </>
                                  ) : (
                                    "Show More Feedback (1)"
                                  )}
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
                                    <AvatarImage src="/woman.jpg" alt="Woman" />
                                    <AvatarFallback>W</AvatarFallback>
                                  </Avatar>
                                  <Avatar className="border-2 border-white hover:ring-0 active:ring-0">
                                    <AvatarImage src="/woman.jpg" alt="Woman" />
                                    <AvatarFallback>W</AvatarFallback>
                                  </Avatar>
                                  <Avatar className="border-2 border-white hover:ring-0 active:ring-0">
                                    <AvatarImage src="/woman.jpg" alt="Woman" />
                                    <AvatarFallback>W</AvatarFallback>
                                  </Avatar>
                                  <Avatar className="border-2 border-white hover:ring-0 active:ring-0">
                                    <AvatarImage src="/woman.jpg" alt="Woman" />
                                    <AvatarFallback>W</AvatarFallback>
                                  </Avatar>
                                  <Avatar className="border-2 border-white hover:ring-0 active:ring-0">
                                    <AvatarImage src="/woman.jpg" alt="Woman" />
                                    <AvatarFallback>W</AvatarFallback>
                                  </Avatar>
                                  <Avatar className="border-2 border-white hover:ring-0 active:ring-0">
                                    <AvatarImage src="/woman.jpg" alt="Woman" />
                                    <AvatarFallback>W</AvatarFallback>
                                  </Avatar>
                                  <Avatar className="border-2 border-white hover:ring-0 active:ring-0">
                                    <AvatarImage src="/woman.jpg" alt="Woman" />
                                    <AvatarFallback>W</AvatarFallback>
                                  </Avatar>
                                  <Avatar className="border-2 border-white hover:ring-0 active:ring-0">
                                    <AvatarImage src="/woman.jpg" alt="Woman" />
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
                                    <AvatarImage src="/woman.jpg" alt="Woman" />
                                    <AvatarFallback>W</AvatarFallback>
                                  </Avatar>
                                  <Avatar className="border-2 border-white hover:ring-0 active:ring-0">
                                    <AvatarImage src="/woman.jpg" alt="Woman" />
                                    <AvatarFallback>W</AvatarFallback>
                                  </Avatar>
                                  <Avatar className="border-2 border-white hover:ring-0 active:ring-0">
                                    <AvatarImage src="/woman.jpg" alt="Woman" />
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
                  </div>
                </LazySection>
                )}
              </div>

              {/* Talent right rail — hidden on the client profile, kept for reuse */}
              {!isClientProfile && (
                <div className="shrink-0 flex flex-col gap-y-6 w-[289px] isolate">
                  <div
                    className={cn(
                      "rounded-lg z-10 transition duration-300",
                      isClientView ? "bg-white" : showLanguagesBox ? "bg-transparent" : "space-y-6 bg-transparent",
                      isClientView &&
                        "top-[145px] sticky before:content-[''] before:absolute before:w-full before:top-[-32px] before:h-[40px] before:bg-gray-50",
                      isClientView && isCardStuck &&
                        "shadow-[0px_12px_16px_-4px_rgba(16,24,40,0.08)]"
                    )}
                    ref={cardRef}
                  >
                    <div
                      className={cn(
                        "p-6 relative bg-white border border-gray-200",
                        showLanguagesBox ? "rounded-t-lg" : "rounded-lg"
                      )}
                    >
                      <div className="flex items-center gap-x-1 justify-center">
                        <span className="inline-flex text-sm leading-none text-dark-blue-400 font-bold items-center gap-x-1">
                          <span
                            className={`size-2 inline-block rounded-full ${isOwnProfile ? "bg-green-500" : "bg-gray-500"}`}
                          />{" "}
                          {isOwnProfile ? "Online" : "Offline"}
                        </span>
                        <span className="font-extralight text-sm leading-none text-dark-blue-400">
                          {(() => {
                            const tz = profile?.timezone
                            if (!tz) return ""
                            try {
                              const now = new Date()
                              const timeStr = now.toLocaleTimeString("en-US", {
                                timeZone: tz,
                                hour: "numeric",
                                minute: "2-digit",
                                hour12: true,
                              })
                              return `${timeStr} local time`
                            } catch {
                              return ""
                            }
                          })()}
                        </span>
                      </div>

                      <div className="mt-2 flex items-center justify-center">
                        <span className="text-sm leading-none font-extralight text-dark-blue-400">
                          Average response time{" "}
                          <span className="text-sm font-bold leading-none">
                            1 hour
                          </span>
                        </span>
                      </div>

                      <button
                        className="w-full mt-5 duration-300 transition focus-visible:outlin-none text-sm leading-5 font-semibold shrink-0 h-10 flex items-center justify-center gap-x-2 rounded-[5px] px-4 bg-white border-2 text-primary-500 hover:text-white hover:bg-primary-500 border-primary-500 shadow-[0px_1px_2px_0px_rgba(16,24,40,.05)]"
                        onClick={() => {
                          if (isOwnProfile) {
                            router.push("/inbox")
                            return
                          }
                          const currentUser = getCurrentUser()
                          if (
                            !currentUser?.id ||
                            !profile?.id ||
                            currentUser.id === profile.id
                          )
                            return
                          router.push(`/inbox?participantId=${profile.id}`)
                        }}
                      >
                        <MessageSquare01 className="size-[15px]" />{" "}
                        {isOwnProfile ? "View Inbox" : "Message Me"}
                      </button>
                    </div>

                    {showLanguagesBox && (
                    <div
                      className={cn(
                        "bg-white border-gray-200 transition-all duration-300 overflow-hidden",
                        "border-x rounded-b-lg border-b",
                        showLanguageSection
                          ? "p-6 max-h-[300px] opacity-100"
                          : "p-0 max-h-0 opacity-0"
                      )}
                    >
                      {showLanguageSection && (
                        <>
                          {(!isClientView || hasLanguages) && (
                            <>
                              <div className="flex items-center justify-between">
                                <span className="flex items-center text-xs leading-none font-extralight text-dark-blue-400 gap-x-[5.85px]">
                                  <MessageTextSquare01 className="size-[15px]" />
                                  Languages
                                </span>

                                {isEditMode && isOwnProfile && (
                                  <IconButton
                                    className="rounded-full text-gray-500 hover:text-gray-800 size-5"
                                    variant="ghost"
                                    visual="gray"
                                    onClick={() => setLanguagesOpen(true)}
                                  >
                                    <Edit03 className="size-4" />
                                  </IconButton>
                                )}
                              </div>

                              {hasLanguages ? (
                                <div className="mt-3 flex flex-wrap gap-2">
                                  {profile!.languages!.map((l: any) => (
                                    <Badge
                                      key={l.id ?? l.name}
                                      className="text-gray-700"
                                      visual="gray"
                                      size="lg"
                                    >
                                      {l.name}
                                    </Badge>
                                  ))}
                                </div>
                              ) : (
                                <div className="mt-3 p-4 rounded-lg border border-gray-200 bg-gray-25">
                                  <p className="text-xs font-light text-gray-500 leading-relaxed">
                                    Tell us what languages you speak, they&apos;ll
                                    show up here.
                                  </p>
                                  {isEditMode && isOwnProfile && (
                                    <Button
                                      className="mt-3 w-full bg-white"
                                      variant="outlined"
                                      visual="gray"
                                      onClick={() => setLanguagesOpen(true)}
                                    >
                                      <Plus className="size-[15px]" /> Add
                                      Languages
                                    </Button>
                                  )}
                                </div>
                              )}
                            </>
                          )}

                          {(!isClientView || hasTimezone) && (
                            <div
                              className={cn(
                                "flex items-center justify-between",
                                !isClientView || hasLanguages ? "mt-5" : ""
                              )}
                            >
                              <span className="flex items-center text-xs leading-none font-extralight text-dark-blue-400 gap-x-[5.85px]">
                                <Clock className="size-[15px]" />
                                Time Zone
                              </span>

                              <span className="text-xs leading-none font-bold text-dark-blue-400">
                                {profile?.timezone ?? "\u2014"}
                              </span>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                    )}
                  </div>

                  {!isClientView && (
                  <div className="rounded-lg border border-gray-200 bg-white">
                    <div className="p-6">
                      <h1 className="text-sm font-bold leading-none text-dark-blue-400">
                        Resume
                      </h1>
                      <p className="mt-1.5 text-xs font-light text-gray-600 leading-relaxed">
                        Add your resume to complete your profile faster.
                      </p>

                      <input
                        ref={resumeInputRef}
                        type="file"
                        accept=".pdf,.doc,.docx"
                        className="hidden"
                        onChange={handleResumeChange}
                      />

                      {/* Error states: failed, size-limit, unsupported, not_a_resume, nothing_found */}
                      {(resumeStatus === "failed" || resumeStatus === "size-limit" || resumeStatus === "unsupported" || resumeStatus === "not_a_resume" || resumeStatus === "nothing_found" || resumeStatus === "name_mismatch") && (
                        <div className="mt-4 rounded-lg border border-error-200 bg-error-25 p-6 flex flex-col items-center">
                          <div className="size-10 rounded-full bg-error-50 inline-flex items-center justify-center">
                            <AlertTriangle className="size-5 text-error-500" />
                          </div>

                          <p className="mt-3 text-xs font-medium text-error-600 text-center leading-relaxed">
                            {resumeStatus === "failed" && (
                              <>
                                Upload failed, please try again
                                <br />
                                <span className="font-normal">{resumeFile?.name}</span>
                              </>
                            )}
                            {resumeStatus === "size-limit" &&
                              "Uploaded file exceeds the size limit of 5MB. Please select a different file."}
                            {resumeStatus === "unsupported" &&
                              "Unsupported file type. Only PDF, DOC, and DOCX files are accepted."}
                            {resumeStatus === "not_a_resume" &&
                              "This doesn't look like a resume. Please upload a resume file in PDF, DOC, or DOCX format."}
                            {resumeStatus === "nothing_found" &&
                              "We couldn't pull any details out of this file. Please try uploading a different resume."}
                            {resumeStatus === "name_mismatch" &&
                              "This resume appears to belong to someone else. Please upload your own resume."}
                          </p>

                          <button
                            type="button"
                            className="mt-3 text-sm font-bold text-error-500 underline decoration-error-500/30 hover:decoration-error-500"
                            onClick={resetResume}
                          >
                            Try again
                          </button>
                        </div>
                      )}

                      {/* Uploading state */}
                      {resumeStatus === "uploading" && (
                        <div className="mt-4 rounded-lg border border-gray-200 bg-white p-4 flex items-center gap-x-3">
                          <div className="size-10 shrink-0 rounded-full bg-primary-50 inline-flex items-center justify-center">
                            <FileText className="size-5 text-primary-500" />
                          </div>
                          <div className="flex-auto min-w-0">
                            <p className="text-xs font-medium text-dark-blue-400 truncate">
                              {resumeFile?.name}
                            </p>
                            <p className="text-xs text-gray-500 mt-0.5">
                              {resumeUploadedSize >= 1024 * 1024
                                ? `${(resumeUploadedSize / (1024 * 1024)).toFixed(1)} MB`
                                : `${Math.round(resumeUploadedSize / 1024)} KB`}
                              {" \u2013 "}
                              {resumeProgress}% uploaded
                            </p>
                          </div>
                          <svg className="size-8 shrink-0 -rotate-90" viewBox="0 0 36 36">
                            <circle cx="18" cy="18" r="15" fill="none" stroke="#E5E7EB" strokeWidth="3" />
                            <circle
                              cx="18" cy="18" r="15" fill="none"
                              stroke="#3B82F6" strokeWidth="3"
                              strokeDasharray={`${(resumeProgress / 100) * 94.25} 94.25`}
                              strokeLinecap="round"
                            />
                          </svg>
                        </div>
                      )}

                      {/* Uploaded (success) state */}
                      {resumeStatus === "uploaded" && (
                        <>
                          <div className="mt-4 group/resume rounded-lg border-2 border-primary-200 bg-white p-3 flex items-center gap-x-3">
                            <div className="size-10 shrink-0 rounded-full bg-primary-50 inline-flex items-center justify-center">
                              <FileText className="size-5 text-primary-500" />
                            </div>

                            {/* Default: file name + date */}
                            <div className="flex-auto min-w-0 group-hover/resume:hidden">
                              <p className="text-xs font-bold text-dark-blue-400 truncate">
                                {resumeFile?.name}
                              </p>
                              <p className="text-xs text-gray-500 mt-0.5">
                                Added on{" "}
                                {(() => {
                                  if (!resumeUploadedDate) return ""
                                  const m = resumeUploadedDate.toLocaleString("en-US", { month: "long" })
                                  const d = resumeUploadedDate.getDate()
                                  const y = resumeUploadedDate.getFullYear()
                                  const sfx = ["th","st","nd","rd"]
                                  const v = d % 100
                                  const ord = sfx[(v - 20) % 10] || sfx[v] || sfx[0]
                                  return `${m} ${d}${ord}, ${y}`
                                })()}
                              </p>
                            </div>

                            {/* Hover: action icons */}
                            <div className="hidden group-hover/resume:flex items-center gap-x-2 ml-auto">
                              <TooltipProvider delayDuration={75}>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <button
                                      type="button"
                                      className="size-10 rounded-full inline-flex items-center justify-center text-primary-500 hover:bg-primary-50 transition-colors"
                                      onClick={() => {
                                        if (!resumeFile) return
                                        const url = URL.createObjectURL(resumeFile)
                                        const a = document.createElement("a")
                                        a.href = url
                                        a.download = resumeFile.name
                                        a.click()
                                        URL.revokeObjectURL(url)
                                      }}
                                    >
                                      <Download01 className="size-5" />
                                    </button>
                                  </TooltipTrigger>
                                  <TooltipContent side="top" visual="white" className="text-xs font-semibold text-gray-700 border border-gray-200">
                                    Download
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>

                              <TooltipProvider delayDuration={75}>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <button
                                      type="button"
                                      className="size-10 rounded-full inline-flex items-center justify-center text-primary-500 hover:bg-primary-50 transition-colors"
                                      onClick={() => resumeInputRef.current?.click()}
                                    >
                                      <RefreshCw className="size-5" />
                                    </button>
                                  </TooltipTrigger>
                                  <TooltipContent side="top" visual="white" className="text-xs font-semibold text-gray-700 border border-gray-200">
                                    Replace
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>

                              <TooltipProvider delayDuration={75}>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <button
                                      type="button"
                                      className="size-10 rounded-full inline-flex items-center justify-center text-error-500 hover:bg-error-50 transition-colors"
                                      onClick={() => setResumeDeleteConfirmOpen(true)}
                                    >
                                      <Trash03 className="size-5" />
                                    </button>
                                  </TooltipTrigger>
                                  <TooltipContent side="top" visual="white" className="text-xs font-semibold text-gray-700 border border-gray-200">
                                    Delete
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            </div>
                          </div>

                          <p className="mt-3 text-[11px] text-gray-500 leading-relaxed">
                            Your resume will remain private and will not be shared with any third parties.
                          </p>
                          <p className="mt-1 text-[11px] text-gray-500 leading-relaxed">
                            See our{" "}
                            <a href="/privacy-policy" className="text-primary-500 underline font-medium">
                              Privacy Policy
                            </a>{" "}
                            for details.
                          </p>
                        </>
                      )}

                      {/* Default & dragging states */}
                      {(resumeStatus === "idle" || resumeStatus === "dragging") && (
                        <div
                          className={cn(
                            "mt-4 rounded-lg border-2 border-dashed p-6 flex flex-col items-center transition-colors",
                            resumeStatus === "dragging"
                              ? "border-primary-500 bg-primary-25"
                              : "border-gray-200"
                          )}
                          onDragOver={(e) => {
                            e.preventDefault()
                            setResumeStatus("dragging")
                          }}
                          onDragLeave={() => setResumeStatus("idle")}
                          onDrop={handleResumeDrop}
                        >
                          <div className="size-10 rounded-full bg-primary-50 inline-flex items-center justify-center">
                            <FileText className="size-5 text-primary-500" />
                          </div>

                          <Button
                            className="mt-3"
                            size="md"
                            onClick={() => resumeInputRef.current?.click()}
                          >
                            <Upload01 className="size-4" />
                            Upload Resume
                          </Button>

                          <p className="mt-2 text-xs text-gray-500">
                            or drag and drop
                          </p>
                          <p className="mt-1 text-xs font-medium text-gray-500">
                            PDF, DOC, DOCX (max 5MB)
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                  )}

                  {(similarProfiles.length > 0 || !isClientView) && (
                  <div className="space-y-6">
                    <div className="rounded-lg border border-gray-200 bg-white">
                      <div className="p-6">
                        <h1 className="text-sm font-bold leading-none text-dark-blue-400">
                          Similar profiles
                        </h1>

                        {similarProfiles.length > 0 ? (
                          <>
                            <div className="mt-3">
                              {similarProfiles.slice(0, 5).map((sp) => {
                                const rateMin =
                                  sp.rateMin != null ? Number(sp.rateMin) : null
                                const rateMax =
                                  sp.rateMax != null ? Number(sp.rateMax) : null
                                // Ratings hidden for MVP — reintroduce with the rating system
                                // const rating = Number(sp.rating) || 0
                                const rate =
                                  rateMin != null &&
                                  rateMax != null &&
                                  rateMin !== rateMax
                                    ? `$${rateMin} - $${rateMax}`
                                    : `$${rateMin ?? (Number(sp.hourlyRate) || 0)}`
                                return (
                                  <div
                                    key={sp.id}
                                    onClick={() =>
                                      sp.username &&
                                      router.push(
                                        `/talent-profile?username=${sp.username}`
                                      )
                                    }
                                    className={cn(
                                      "py-3 flex items-start gap-x-2 border-b border-gray-200",
                                      sp.username && "cursor-pointer"
                                    )}
                                  >
                                    <Avatar
                                      className="hover:ring-0 active:ring-primary-100"
                                      size="md"
                                    >
                                      <AvatarImage
                                        src={sp.avatarUrl ?? undefined}
                                        alt={sp.name}
                                      />
                                      <AvatarFallback>
                                        {getInitials(sp.name)}
                                      </AvatarFallback>
                                    </Avatar>

                                    <div className="flex-1">
                                      <h1 className="text-sm leading-none text-dark-blue-400 font-bold">
                                        {capitalize(sp.name.split(/\s+/)[0] || sp.name)}
                                        {sp.username && (
                                          <span className="text-xs font-extralight leading-none text-gray-500">
                                            {" "}
                                            @{sp.username}
                                          </span>
                                        )}
                                      </h1>
                                      {sp.jobTitle && (
                                        <p className="mt-0.5 text-xs leading-none font-extralight text-dark-blue-400">
                                          {sp.jobTitle}
                                        </p>
                                      )}
                                      <div className="mt-1.5 flex items-center justify-between">
                                        <span className="text-[13px] leading-none font-bold text-dark-blue-400">
                                          {rate}
                                          <span className="text-xs leading-none text-dark-blue-400 font-extralight">
                                            /hr
                                          </span>
                                        </span>

                                        {/* Ratings hidden for MVP — reintroduce with the rating system
                                        {rating > 0 && (
                                          <div className="inline-flex items-center gap-x-1">
                                            <Star className="size-3 text-primary-500 fill-primary-500" />
                                            <span className="font-medium leading-none text-xs text-dark-blue-400">
                                              {rating.toFixed(1)}
                                            </span>
                                          </div>
                                        )} */}
                                      </div>
                                    </div>
                                  </div>
                                )
                              })}
                            </div>

                            <div className="mt-3 flex items-center justify-center">
                              <Button
                                size="sm"
                                variant="link"
                                visual="gray"
                                onClick={() => router.push("/talent-search")}
                              >
                                View More
                              </Button>
                            </div>
                          </>
                        ) : (
                          <div className="mt-4 p-4 rounded-lg bg-gray-25 border border-gray-200">
                            <p className="text-xs font-light text-gray-600 leading-relaxed">
                              Complete your profile to start seeing similar
                              profiles here.
                            </p>
                            {isEditMode && isOwnProfile && (
                              <Button
                                className="mt-3 w-full"
                                variant="outlined"
                                visual="gray"
                                onClick={() => setShowCompleteProfile(true)}
                              >
                                Complete My Profile
                              </Button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  )}

                  {!isClientView && (
                  <div className="rounded-lg border border-gray-200 bg-white">
                    <div className="p-6">
                      <div className="flex items-center justify-between">
                        <h1 className="text-sm font-bold leading-none text-dark-blue-400">
                          Affiliated Teams
                        </h1>
                      </div>

                      <div className="mt-4 p-4 rounded-lg bg-gray-25 border border-gray-200">
                        <p className="text-xs font-light text-gray-600 leading-relaxed">
                          If you decide to join a team, those teams will be
                          visible here.
                        </p>
                        {isEditMode && isOwnProfile && (
                          <Button
                            className="mt-3 w-full bg-white"
                            variant="outlined"
                            visual="gray"
                            onClick={() => router.push("/teams")}
                          >
                            <Plus className="size-[15px]" /> Browse Teams
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </Tabs>
      </div>

      {/* Edit Profile Modals */}
      {isOwnProfile && (
        <>
          <AvailabilityDialog
            opened={availabilityOpen}
            onOpenedChange={setAvailabilityOpen}
            profile={profile}
            onSaved={refreshProfile}
          />
          <SkillsDialog
            opened={skillsOpen}
            onOpenedChange={setSkillsOpen}
            profile={profile}
            onSaved={refreshProfile}
          />
          <AboutMeDialog
            opened={overviewOpen}
            onOpenedChange={setOverviewOpen}
            profile={profile}
            onSaved={refreshProfile}
          />
          <Dialog
            open={listingsModalStep === "empty"}
            onOpenChange={(open) =>
              !open && setListingsModalStep("closed")
            }
          >
            <DialogContent className="max-w-[420px] rounded-[12px] p-0">
              <div className="flex items-start gap-x-2 px-6 pt-5 pb-4">
                <h1 className="flex-auto text-lg leading-7 font-semibold text-dark-blue-400">
                  My Listings
                </h1>
                <DialogClose asChild>
                  <IconButton variant="ghost" visual="gray">
                    <X className="size-5" />
                  </IconButton>
                </DialogClose>
              </div>

              <div className="mx-5 mb-5 rounded-lg bg-gray-50 border border-gray-200 px-6 py-8 flex flex-col items-center text-center">
                <PackagePlus className="size-10 text-gray-400" strokeWidth={1.5} />
                <h2 className="mt-3 text-base leading-6 font-semibold text-dark-blue-400">
                  Show clients what you have to offer
                </h2>
                <p className="mt-2 text-xs font-light text-gray-500 leading-relaxed max-w-[300px]">
                  Create projects or service offers to get discovered,
                  attract clients, and start generating money. Profiles with
                  active offers can get 2-3x more visibility and
                  opportunities than profiles with no offers at all.
                </p>
                <Button
                  className="mt-5 bg-white"
                  variant="outlined"
                  visual="gray"
                  onClick={() => setListingsModalStep("chooser")}
                >
                  Create Your First Listing
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog
            open={listingsModalStep === "chooser"}
            onOpenChange={(open) =>
              !open && setListingsModalStep("closed")
            }
          >
            <DialogContent className="max-w-[560px] rounded-[12px] p-0">
              <div className="p-6">
                <div className="flex items-start gap-x-2">
                  <div className="flex-auto">
                    <h1 className="text-lg leading-7 font-semibold text-dark-blue-400">
                      Create a New Listing
                    </h1>
                    <p className="mt-1 text-sm font-light text-dark-blue-400">
                      Choose the type of listing you&apos;d like to create
                    </p>
                  </div>
                  <DialogClose asChild>
                    <IconButton variant="ghost" visual="gray">
                      <X className="size-5" />
                    </IconButton>
                  </DialogClose>
                </div>

                <div className="mt-6 grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    className="text-left p-4 rounded-lg border border-gray-200 bg-white transition-colors hover:border-gray-300 hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
                    onClick={() => goToPublishProject("project")}
                  >
                    <div className="flex items-center gap-x-2">
                      <Briefcase className="size-5 text-dark-blue-400" />
                      <span className="text-sm font-semibold text-dark-blue-400">
                        Add A Project
                      </span>
                    </div>
                    <p className="mt-2 text-xs font-light leading-relaxed text-gray-500">
                      A fixed-scope offer with defined deliverables,
                      timeline, and one-time work.
                    </p>
                  </button>
                  <button
                    type="button"
                    className="text-left p-4 rounded-lg border border-gray-200 bg-white transition-colors hover:border-gray-300 hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
                    onClick={() => goToPublishProject("service")}
                  >
                    <div className="flex items-center gap-x-2">
                      <Monitor className="size-5 text-dark-blue-400" />
                      <span className="text-sm font-semibold text-dark-blue-400">
                        Add A Service
                      </span>
                    </div>
                    <p className="mt-2 text-xs font-light leading-relaxed text-gray-500">
                      An ongoing offer with recurring work and long-term
                      client engagement.
                    </p>
                  </button>
                </div>

                <p className="mt-4 text-xs font-light text-gray-500">
                  Don&apos;t worry, you can always switch between a project
                  and a service at any time.
                </p>
              </div>
            </DialogContent>
          </Dialog>
          <MoreInfoDialog
            opened={jobTitleOpen}
            onOpenedChange={setJobTitleOpen}
            profile={profile}
            onSaved={refreshProfile}
          />
          <LanguagesDialog
            opened={languagesOpen}
            onOpenedChange={setLanguagesOpen}
            profile={profile}
            onSaved={refreshProfile}
          />
          <IndustryExpertiseDialog
            opened={industriesOpen}
            onOpenedChange={setIndustriesOpen}
            profile={profile}
            onSaved={refreshProfile}
          />
          <CertificationsDialog
            opened={certificationsOpen}
            onOpenedChange={(open) => {
              setCertificationsOpen(open)
              if (!open) setCertEditIdx(undefined)
            }}
            profile={profile}
            onSaved={refreshProfile}
            editIndex={certEditIdx}
          />
          <WorkExperienceDialog
            opened={workExperienceOpen}
            onOpenedChange={(o: boolean) => {
              setWorkExperienceOpen(o)
              if (!o) setWorkExpEditIdx(undefined)
            }}
            editIndex={workExpEditIdx}
            profile={profile}
            onSaved={refreshProfile}
          />
          <EducationDialog
            opened={educationOpen}
            onOpenedChange={(o: boolean) => {
              setEducationOpen(o)
              if (!o) setEduEditIdx(undefined)
            }}
            editIndex={eduEditIdx}
            profile={profile}
            onSaved={refreshProfile}
          />
          <AffiliatedTeamsDialog
            opened={affiliatedTeamsOpen}
            onOpenedChange={setAffiliatedTeamsOpen}
          />

          {/* Workplace Values — the copied FAQ editor, opened from the Culture pencil */}
      <Dialog open={valuesOpen} onOpenChange={setValuesOpen}>
        <DialogContent className="max-w-[740px] p-0">
          {/* Close button copied from the dialogs in edit-listing */}
          <DialogClose asChild>
            <IconButton
              className="absolute right-[11.55px] top-[11px] text-gray-400 hover:text-gray-600"
              variant="light"
              visual="gray"
            >
              <X className="size-5" />
            </IconButton>
          </DialogClose>
          <div className="flex flex-col gap-2 border-b border-gray-200 px-6 pb-4 pr-14 pt-6">
            <DialogTitle className="text-lg font-semibold leading-7 text-dark-blue-400">
              Workplace Values
            </DialogTitle>
            <p className="text-sm font-light leading-5 text-dark-blue-400">
              Add the values that define how your team works. Drag and drop to
              reorder them
            </p>
          </div>

          <div className="max-h-[60vh] overflow-y-auto px-6 pb-6">
            <WorkplaceValuesEditor
              values={workplaceValues}
              setValues={setWorkplaceValues}
              draftProjectId={null}
            />
          </div>

          <div className="flex items-center justify-between rounded-b-xl bg-gray-25 px-6 py-4">
            <Button
              variant="link"
              visual="gray"
              onClick={() => setValuesOpen(false)}
            >
              Cancel
            </Button>
            <Button size="sm" onClick={() => setValuesOpen(false)}>
              Save
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={caseStudyOpen} onOpenChange={setCaseStudyOpen}>
            <DialogContent
              variant="unanimated"
              className="inset-0 h-full z-[100] bg-white p-0 overflow-y-auto"
            >
              <DialogTitle className="sr-only">Case Study Builder</DialogTitle>
              <CaseStudyBuilder
                onClose={() => setCaseStudyOpen(false)}
                onSave={() => setCaseStudyOpen(false)}
              />
            </DialogContent>
          </Dialog>

          <Dialog
            open={!!deleteConfirm}
            onOpenChange={(open) => {
              if (!open) {
                setDeleteConfirm(null)
                setDeleteError(null)
              }
            }}
          >
            <DialogContent className="max-w-[409px] p-0">
              <div className="p-6">
                <DialogTitle className="text-dark-blue-400 text-base font-semibold">
                  Delete{" "}
                  {deleteConfirm?.type === "experience"
                    ? "Work Experience"
                    : "Education"}
                  ?
                </DialogTitle>
                <DialogDescription className="text-dark-blue-400 mt-2 text-sm font-light">
                  {deleteConfirm?.label ? (
                    <>
                      Your &ldquo;{deleteConfirm.label}&rdquo;{" "}
                      {deleteConfirm.type === "experience"
                        ? "job"
                        : "education"}{" "}
                      will be removed.
                    </>
                  ) : (
                    <>
                      Your{" "}
                      {deleteConfirm?.type === "experience"
                        ? "job"
                        : "education"}{" "}
                      will be removed.
                    </>
                  )}{" "}
                  This cannot be undone.
                </DialogDescription>

                {deleteError && (
                  <div
                    role="alert"
                    className="mt-4 rounded-lg border border-error-200 bg-error-50 px-4 py-3 text-sm font-medium text-error-700"
                  >
                    {deleteError}
                  </div>
                )}
              </div>

              <div className="border-t rounded-b-xl flex items-center justify-between border-gray-200 bg-gray-25 py-4 px-6">
                <DialogClose asChild>
                  <Button
                    variant="link"
                    visual="gray"
                    type="button"
                    disabled={isDeleting}
                  >
                    <X className="size-[15px]" />
                    Cancel
                  </Button>
                </DialogClose>
                <Button
                  variant="outlined"
                  visual="gray"
                  onClick={confirmDelete}
                  disabled={isDeleting}
                >
                  {isDeleting
                    ? "Deleting..."
                    : deleteError
                      ? "Try Again"
                      : "Yes, Delete"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </>
      )}
      {/* Resume uploading dialog */}
      <Dialog open={resumeStatus === "uploading"}>
        <DialogContent
          className="max-w-[480px] rounded-[12px] p-8"
          onPointerDownOutside={(e) => e.preventDefault()}
          onEscapeKeyDown={(e) => e.preventDefault()}
        >
          <DialogTitle className="sr-only">Updating profile from resume</DialogTitle>
          <DialogDescription className="sr-only">Processing your resume</DialogDescription>
          <div className="flex flex-col items-center text-center">
            {/* File icon with glowing circle */}
            <div className="relative size-20 flex items-center justify-center">
              <div className="absolute inset-0 rounded-full bg-primary-50" />
              <div className="absolute inset-[-6px] rounded-full bg-primary-50/40" />
              <FileText className="relative size-8 text-primary-500" />
            </div>

            {/* Animated dots */}
            <div className="mt-6 flex items-center gap-x-2">
              {[
                { size: 8, opacity: 0.5 },
                { size: 10, opacity: 0.8 },
                { size: 10, opacity: 1 },
                { size: 8, opacity: 0.3 },
              ].map((dot, i) => (
                <div
                  key={i}
                  className="rounded-full bg-primary-500 animate-pulse"
                  style={{
                    width: dot.size,
                    height: dot.size,
                    opacity: dot.opacity,
                    animationDelay: `${i * 200}ms`,
                  }}
                />
              ))}
            </div>

            {/* Status text — live progress message */}
            <p className="mt-4 text-sm text-gray-500">
              {resumeLoadingMessage}
            </p>
          </div>
        </DialogContent>
      </Dialog>

      {/* Resume upload summary dialog */}
      <Dialog open={resumeStatus === "summary"}>
        <DialogContent
          className="max-w-[620px] max-h-[80vh] rounded-[12px] p-0 flex flex-col"
          onPointerDownOutside={(e) => e.preventDefault()}
          onEscapeKeyDown={(e) => e.preventDefault()}
        >
          <DialogTitle className="sr-only">Resume Upload Complete</DialogTitle>
          <DialogDescription className="sr-only">Summary of changes from resume</DialogDescription>
          <div className={cn("px-8 pt-8 pb-4 shrink-0 transition-[border-color] duration-200 border-b", resumeSummaryScrolled ? "border-gray-200" : "border-transparent")}>
            <h2 className="text-xl font-bold text-dark-blue-400">
              Resume Upload Complete
            </h2>
            <p className="mt-1 text-sm text-gray-600">
              {resumeSummary && (resumeSummary.skills.count + resumeSummary.workExperience.count + resumeSummary.education.count + resumeSummary.certifications.count) > 0
                ? "We updated your profile with your information from your resume."
                : "Your resume was uploaded successfully. No new profile data was found to add."}
            </p>
          </div>

          <div
            className="px-8 pb-4 overflow-y-auto flex-1 min-h-0"
            onScroll={(e) => setResumeSummaryScrolled(e.currentTarget.scrollTop > 0)}
          >
            <div className="rounded-lg border border-gray-200 p-6">
              {resumeSummary && (
                <>
                  {/* Skills */}
                  {resumeSummary.skills.count > 0 && (
                    <>
                      <span className="inline-block rounded-full bg-green-50 px-3 py-1 text-xs font-semibold text-green-700">
                        Added {resumeSummary.skills.count} skill{resumeSummary.skills.count !== 1 ? "s" : ""}
                      </span>
                      <div className="mt-4 grid grid-cols-3 gap-y-4">
                        {(resumeSkillsExpanded ? resumeSummary.skills.items : resumeSummary.skills.items.slice(0, 8)).map((skill, i) => (
                          <div key={i} className="flex items-center gap-x-2">
                            <Check className="size-4 text-green-500 shrink-0" />
                            <span className="text-sm text-dark-blue-400">{skill.name}</span>
                          </div>
                        ))}
                        {!resumeSkillsExpanded && resumeSummary.skills.items.length > 8 && (
                          <button
                            type="button"
                            className="flex items-center text-left"
                            onClick={() => setResumeSkillsExpanded(true)}
                          >
                            <span className="text-sm font-bold text-dark-blue-400 hover:underline">
                              + {resumeSummary.skills.items.length - 8} more...
                            </span>
                          </button>
                        )}
                      </div>
                    </>
                  )}

                  {/* Education */}
                  {resumeSummary.education.count > 0 && (
                    <>
                      <span className="inline-block mt-6 rounded-full bg-green-50 px-3 py-1 text-xs font-semibold text-green-700">
                        Added {resumeSummary.education.count} education{resumeSummary.education.count !== 1 ? "s" : ""}
                      </span>
                      <div className="mt-4 space-y-5">
                        {resumeSummary.education.items.map((edu, i) => (
                          <div key={i} className="flex items-start gap-x-2">
                            <Check className="size-4 text-green-500 shrink-0 mt-0.5" />
                            <div>
                              <p className="text-sm font-bold text-dark-blue-400">{edu.institution}</p>
                              <p className="text-xs text-gray-500 mt-0.5">
                                {edu.degree}{edu.fieldOfStudy ? <><span className="mx-1">&middot;</span><span className="font-bold text-dark-blue-400">{edu.fieldOfStudy}</span></> : null}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </>
                  )}

                  {/* Work Experience */}
                  {resumeSummary.workExperience.count > 0 && (
                    <>
                      <span className="inline-block mt-6 rounded-full bg-green-50 px-3 py-1 text-xs font-semibold text-green-700">
                        Added {resumeSummary.workExperience.count} work experience{resumeSummary.workExperience.count !== 1 ? "s" : ""}
                      </span>
                      <div className="mt-4 space-y-5">
                        {resumeSummary.workExperience.items.map((work, i) => (
                          <div key={i} className="flex items-start gap-x-2">
                            <Check className="size-4 text-green-500 shrink-0 mt-0.5" />
                            <div>
                              <p className="text-sm font-bold text-dark-blue-400">{work.title}</p>
                              <p className="text-xs text-gray-500 mt-0.5">
                                {work.company}{work.startDate ? <><span className="mx-1">&middot;</span><span className="font-bold text-dark-blue-400">{work.startDate}{work.endDate ? ` - ${work.endDate}` : " - Present"}</span></> : null}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </>
                  )}

                  {/* Certifications */}
                  {resumeSummary.certifications.count > 0 && (
                    <>
                      <span className="inline-block mt-6 rounded-full bg-green-50 px-3 py-1 text-xs font-semibold text-green-700">
                        Added {resumeSummary.certifications.count} certification{resumeSummary.certifications.count !== 1 ? "s" : ""}
                      </span>
                      <div className="mt-4 space-y-5">
                        {resumeSummary.certifications.items.map((cert, i) => (
                          <div key={i} className="flex items-start gap-x-2">
                            <Check className="size-4 text-green-500 shrink-0 mt-0.5" />
                            <div>
                              <p className="text-sm font-bold text-dark-blue-400">{cert.name}</p>
                              {cert.issuingBody && <p className="text-xs text-gray-500 mt-0.5">{cert.issuingBody}</p>}
                            </div>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </>
              )}

              {/* Empty state: no additions */}
              {resumeSummary && (resumeSummary.skills.count + resumeSummary.workExperience.count + resumeSummary.education.count + resumeSummary.certifications.count) === 0 && (
                <p className="text-sm text-gray-500 text-center py-4">
                  No changes were made to your profile.
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 shrink-0">
            <Button
              variant="outlined"
              visual="gray"
              className="gap-x-2"
              onClick={async () => {
                if (resumeParseResultId) {
                  try {
                    await UserAPI.undoResumeImport(resumeParseResultId)
                    if (profile?.id) {
                      const res = await UserAPI.getProfile(profile.id)
                      if (res.data) setProfile(res.data)
                    }
                  } catch (err) {
                    console.error("Failed to undo resume import:", err)
                  }
                }
                resetResume()
                setResumeSummary(null)
                setResumeParseResultId(null)
              }}
            >
              <RefreshCw className="size-4" />
              Undo Changes
            </Button>
            <Button
              onClick={() => {
                // Per docs: "Looks good!" commits nothing — additions were applied on arrival
                setResumeStatus("uploaded")
                setResumeSummary(null)
              }}
            >
              Looks good!
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete resume confirmation dialog */}
      <Dialog open={resumeDeleteConfirmOpen} onOpenChange={setResumeDeleteConfirmOpen}>
        <DialogContent className="max-w-[400px] rounded-xl p-0">
          <DialogTitle className="sr-only">Delete Resume</DialogTitle>
          <DialogDescription className="sr-only">Confirm resume deletion</DialogDescription>
          <div className="px-6 pt-6 pb-5">
            <h2 className="text-lg font-semibold text-dark-blue-400">Delete Resume?</h2>
            <p className="mt-2 text-sm text-gray-500">
              Your resume will be removed. This cannot be undone.
            </p>
          </div>
          <div className="flex items-center justify-between border-t border-gray-200 px-6 py-4">
            <button
              type="button"
              className="flex items-center gap-x-1.5 text-sm text-gray-500 hover:text-gray-700"
              onClick={() => setResumeDeleteConfirmOpen(false)}
            >
              <X className="size-4" />
              Cancel
            </button>
            <Button
              variant="outlined"
              visual="gray"
              onClick={async () => {
                try {
                  await UserAPI.deleteResume()
                } catch (err) {
                  console.error("Failed to delete resume:", err)
                }
                resetResume()
                setResumeDeleteConfirmOpen(false)
              }}
            >
              Yes, Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Update current information conflict dialog */}
      <Dialog open={resumeConflictOpen} onOpenChange={setResumeConflictOpen}>
        <DialogContent
          className="max-w-[620px] max-h-[80vh] rounded-[12px] p-0 flex flex-col"
          onPointerDownOutside={(e) => e.preventDefault()}
          onEscapeKeyDown={(e) => e.preventDefault()}
        >
          <DialogTitle className="sr-only">Update Current Information</DialogTitle>
          <DialogDescription className="sr-only">Choose which entries to update with resume data</DialogDescription>
          <div className="px-8 pt-8 pb-4 shrink-0">
            <h2 className="text-xl font-bold text-dark-blue-400">
              Update Current Information?
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              We found work history and education entries that already exist in your profile. You can keep your current information or replace it with information from your resume.
            </p>
          </div>

          <div className="px-8 pb-4 overflow-y-auto flex-1 min-h-0">
            <div className="rounded-lg border border-gray-200">
              {(() => {
                let lastType = ""
                return resumeConflicts.map((conflict) => {
                  const showHeader = conflict.type !== lastType
                  lastType = conflict.type
                  return (
                    <div key={conflict.existingId} className="px-5">
                      {showHeader && (
                        <p className="pt-4 pb-2 text-xs font-semibold text-primary-500">
                          {conflict.type === "work"
                            ? "Replace this work history"
                            : conflict.type === "education"
                            ? "Replace this education"
                            : "Replace this certification"}
                        </p>
                      )}
                      <div className="flex items-center gap-x-3 py-3">
                        <RefreshCw className="size-4 text-gray-400 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-dark-blue-400">
                            {conflict.incoming.label}
                          </p>
                          <p className="text-xs text-gray-500 mt-0.5">
                            {conflict.type === "work" && (
                              <>
                                {conflict.incoming.company}
                                {conflict.incoming.startDate && (
                                  <>
                                    {" "}&middot;{" "}
                                    <span className="font-bold">
                                      {conflict.incoming.startDate} - {conflict.incoming.endDate || "Present"}
                                    </span>
                                  </>
                                )}
                              </>
                            )}
                            {conflict.type === "education" && (
                              <>
                                {conflict.incoming.degree}
                                {conflict.incoming.fieldOfStudy && (
                                  <>
                                    {" "}&middot;{" "}
                                    <span className="font-bold">{conflict.incoming.fieldOfStudy}</span>
                                  </>
                                )}
                              </>
                            )}
                            {conflict.type === "certification" && (
                              <>{conflict.incoming.issuer || conflict.incoming.detail}</>
                            )}
                          </p>
                        </div>
                        <label className="flex items-center gap-x-2 shrink-0 cursor-pointer">
                          <span className="text-sm text-gray-600">Apply Update</span>
                          <Checkbox
                            checked={resumeConflictChecked[conflict.existingId] ?? true}
                            onCheckedChange={(checked) => {
                              setResumeConflictChecked((prev) => ({
                                ...prev,
                                [conflict.existingId]: !!checked,
                              }))
                            }}
                          />
                        </label>
                      </div>
                    </div>
                  )
                })
              })()}
            </div>
          </div>

          <div className="flex items-center justify-between px-8 py-5 border-t border-gray-200 shrink-0">
            <Button
              variant="outlined"
              visual="gray"
              onClick={() => {
                setResumeConflictOpen(false)
                setResumeStatus("summary")
              }}
            >
              Keep Existing
            </Button>
            <Button
              onClick={async () => {
                try {
                  const conflictResolutions = resumeConflicts.map((c) => ({
                    entityType: c.type as "education" | "work" | "certification",
                    existingId: c.existingId,
                    applyUpdate: resumeConflictChecked[c.existingId] ?? true,
                  }))
                  await UserAPI.applyResume({
                    parseResultId: resumeParseResultId || undefined,
                    conflictResolutions,
                  })
                  if (profile?.id) {
                    const res = await UserAPI.getProfile(profile.id)
                    if (res.data) setProfile(res.data)
                  }
                } catch (err) {
                  console.error("Failed to apply conflict resolutions:", err)
                } finally {
                  setResumeConflictOpen(false)
                  setResumeStatus("summary")
                }
              }}
            >
              Yes, Update
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <StatusDialog
        open={showCompleteProfile}
        onOpenChange={setShowCompleteProfile}
      />
    </>
  )
}
