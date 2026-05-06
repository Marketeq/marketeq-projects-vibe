"use client"

import * as React from "react"
import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { ensureDevAuth } from "@/src/lib/api/dev-login"
import {
  addFavorite,
  findFavoriteByItemId,
  removeFavorite,
} from "@/src/lib/api/favorites"
import {
  AutocompleteAPI,
  type AutocompleteCategorySuggestion,
} from "@/service/http/autocomplete"
import { CategoryAPI, type CategoryTreeNode } from "@/service/http/category"
import { extractShortIdFromSlug } from "@/src/lib/urlHelpers"
import { TagsInputHiddenInput } from "@ark-ui/react"
import { ProjectDetailsStepsSection } from "@/components/project-details/project-details-steps-section"
import {
  buildProjectStaticContentFromGateway,
  type ProjectStaticContent,
  type ProjectStaticIcon,
} from "@/lib/project-details/project-static-content-from-api"
import { getPublicApiUrl } from "@/lib/runtime-urls"
import { cn, getIsNotEmpty, noop, toPxIfNumber } from "@/utils/functions"
import { useControllableState, useMakeFixedBehaveSticky } from "@/utils/hooks"
import {
  AlertCircle,
  ArrowLeft,
  Attachment01,
  ChartBreakoutCircle,
  Check,
  CheckCircle,
  ChevronDown,
  ChevronsDown,
  ChevronsUp,
  Clock,
  Edit03,
  Expand06,
  Eye,
  FileText,
  Flag,
  HelpCircle,
  Home03,
  Image03,
  Info,
  MapPin,
  MessageTextCircle01,
  MoreHorizontal,
  MessageTextSquare01,
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
  UploadCloud,
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
import { ChatsContextProvider } from "@/components/chat"
import { EditContextProvider, useEditContext } from "@/components/inbox-comps"
import { LikeDislike } from "@/components/like-dislike"
import NextImage from "@/components/next-image"
import NextLink from "@/components/next-link"
import { ReadMoreLessComp, ReadMoreLessRoot } from "@/components/read-more-less"
import {
  ShowMoreLess,
  ShowMoreLessComp,
  ShowMoreLessRoot,
} from "@/components/show-more-less"
import {
  Combobox,
  ComboboxInput,
  ComboboxTrigger,
  ComboboxButton,
  ComboboxOptions,
  ComboboxOption,
} from "@/components/ui/combobox/combobox"
import { ScaleOutIn } from "@/components/ui/transitions/transitions"
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover/popover"
import { GripVertical2 } from "@/components/icons/grip-vertical-2"
import { ScopeBuilder } from "@/components/scope-builder"
import { useInviteWindowStore } from "@/components/invite-window"
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
  DisclosureTrigger,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  Favorite,
  FavoriteRoot,
  IconButton,
  Input,
  InputGroup,
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
  TagsInputContext,
  TagsInputControl,
  TagsInputInput,
  TagsInputItem,
  TagsInputItemDeleteTrigger,
  TagsInputItemInput,
  TagsInputItemPreview,
  TagsInputItemText,
  TagsInputRoot,
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

const PROJECT_TYPE_OPTIONS = [
  "Website",
  "Mobile App",
  "Desktop App",
  "API / Backend",
  "Plugin / Extension",
  "SaaS Platform",
  "Other",
]

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

export default function ProjectDetails() {
  const params = useParams()
  const router = useRouter()
  const [project, setProject] = React.useState<any>({
    id: "draft",
    title: "Enter Project Title",
    slug: "draft",
    listingType: "project",
    role: "Software Development",
    category: "Software Development",
    categories: ["Software Development", "Mobile Applications", "iOS Development"],
    summary: "",
    description: "",
    rating: 0,
    reviewCount: 0,
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
  const [loading, setLoading] = React.useState(false)
  const [selected, setSelected] = React.useState<string>("Details")
  const [descDialogOpen, setDescDialogOpen] = React.useState(false)
  const [descDraft, setDescDraft] = React.useState("")
  const [projectInfoOpen, setProjectInfoOpen] = React.useState(false)
  const [infoTitle, setInfoTitle] = React.useState("")
  const [isTitleEditing, setIsTitleEditing] = React.useState(false)
  const [isTitleHovered, setIsTitleHovered] = React.useState(false)
  const [titleError, setTitleError] = React.useState<string | null>(null)
  const titleInputRef = React.useRef<HTMLInputElement>(null)
  const [projectTypeOpen, setProjectTypeOpen] = React.useState(false)
  const [projectTypeQuery, setProjectTypeQuery] = React.useState("")
  const filteredProjectTypes = projectTypeQuery === ""
    ? PROJECT_TYPE_OPTIONS
    : PROJECT_TYPE_OPTIONS.filter((opt) =>
        opt.toLowerCase().includes(projectTypeQuery.toLowerCase())
      )
  const [infoSummary, setInfoSummary] = React.useState("")
  const [infoProjectType, setInfoProjectType] = React.useState("Website")
  const [infoTab, setInfoTab] = React.useState("Basic Info")
  const [categoryTree, setCategoryTree] = React.useState<CategoryTreeNode[]>([])
  const [categoryOptions, setCategoryOptions] = React.useState<string[]>(FALLBACK_CATEGORY_OPTIONS)
  const [subCategoryOptions, setSubCategoryOptions] = React.useState<string[]>([])
  const [activeCategoryIndex, setActiveCategoryIndex] = React.useState(0)
  const [suggested, setSuggested] = React.useState<SuggestedCategoryOption[]>(DEFAULT_SUGGESTED_CATEGORIES)
  const [infoCategories, setInfoCategories] = React.useState<CategoryRow[]>([
    { category: "", subCategories: [] },
    { category: "", subCategories: [] },
    { category: "", subCategories: [] },
  ])
  const [infoCatErrors, setInfoCatErrors] = React.useState<(string | null)[]>([null, null, null])
  const [detailsDialogOpen, setDetailsDialogOpen] = React.useState(false)
  const [teamDialogOpen, setTeamDialogOpen] = React.useState(false)
  const [questionsDialogOpen, setQuestionsDialogOpen] = React.useState(false)
  const [questionsTab, setQuestionsTab] = React.useState("FAQs")
  const [recentQTab, setRecentQTab] = React.useState("all")
  const [openFaqIndex, setOpenFaqIndex] = React.useState<number | null>(null)
  const [teamTab, setTeamTab] = React.useState("Team Lead")
  const inviteWindow = useInviteWindowStore()
  const [detailsLangs, setDetailsLangs] = React.useState<string[]>([])
  const [detailsTech, setDetailsTech] = React.useState<string[]>([])
  const [detailsIndustry, setDetailsIndustry] = React.useState<string[]>([])
  const [detailsTags, setDetailsTags] = React.useState<string[]>([])
  const [detailsSkills, setDetailsSkills] = React.useState<string[]>([])
  const [detailsTools, setDetailsTools] = React.useState<string[]>([])
  const categoryRequestRef = React.useRef(0)
  const categoryDebounceTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null)

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
        const nextSuggested = selectableCategories
          .map((node) => {
            const subCategory = findSuggestedSubCategory(node)
            return subCategory ? { category: node.name, subCategory } : null
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
      const sourceNodes = activeNode ? collectCategoryDescendants(activeNode) : []
      return getUniqueOptions(
        sourceNodes
          .map((node) => node.name)
          .filter((name) =>
            normalizedQuery ? name.toLowerCase().includes(normalizedQuery) : true
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
      const fallbackOptions = getSubCategoryOptionsForCategory(activeCategoryName)

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
          const values: AutocompleteCategorySuggestion[] = Array.isArray(response?.data)
            ? response.data
            : []
          const scopedSubCategoryOptions = getSubCategoryOptionsForCategory(activeCategoryName)
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
              : getSubCategoryOptionsForCategory(activeCategoryName, trimmedQuery)
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
        (cat) => cat === infoCategories[index]?.category || !selected.includes(cat)
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

  const suggestedForDisplay = React.useMemo(
    () =>
      suggested
        .filter(
          ({ category, subCategory }) =>
            !selectedCategoryNames.has(category) &&
            !selectedSuggestedPairs.has(`${category}::${subCategory}`)
        )
        .slice(0, 3),
    [selectedCategoryNames, selectedSuggestedPairs, suggested]
  )

  const [tabsRef, isSticky] = useMakeFixedBehaveSticky<HTMLDivElement>()
  const [isFavorited, setIsFavorited] = React.useState(false)

  // Check if this item is already favorited (ensure dev auth first)
  React.useEffect(() => {
    if (!project?.id) return
    ensureDevAuth().then(() =>
      findFavoriteByItemId(String(project.id)).then((fav) => {
        setIsFavorited(!!fav)
      })
    )
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
        const apiBase =
          getPublicApiUrl() || "http://localhost:4000"
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
          // Try as a service
          const svcRes = await fetch(`${apiBase}/v1/services/slug/${slug}`)
          if (!svcRes.ok) {
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

  // Scroll to top when page loads
  React.useEffect(() => {
    window.scrollTo(0, 0)
  }, [])

  const projectStaticContent = React.useMemo<ProjectStaticContent>(() => {
    return buildProjectStaticContentFromGateway(project?.projectStaticContent)
  }, [project?.projectStaticContent])

  if (loading) {
    return (
      <div className="min-h-screen bg-white px-[100px] py-10">
        <div className="max-w-[1240px] animate-pulse">
          {/* breadcrumb */}
          <div className="flex items-center gap-x-3">
            <div className="h-3 w-3 rounded-full bg-gray-200" />
            <div className="h-3 w-16 rounded bg-gray-200" />
            <div className="h-3 w-24 rounded bg-gray-200" />
            <div className="h-3 w-32 rounded bg-gray-200" />
          </div>
          <div className="flex items-start gap-x-8 mt-8">
            <div className="max-w-[818px] flex-auto space-y-6">
              {/* title + meta */}
              <div className="space-y-3">
                <div className="h-8 w-2/3 rounded bg-gray-200" />
                <div className="h-4 w-1/3 rounded bg-gray-200" />
              </div>
              {/* hero media */}
              <div className="h-[460px] w-full rounded-lg bg-gray-200" />
              {/* tabs */}
              <div className="flex gap-x-4">
                {["Details", "Phases", "Reviews", "Q&A"].map((t) => (
                  <div key={t} className="h-8 w-20 rounded-full bg-gray-200" />
                ))}
              </div>
              {/* body paragraphs */}
              <div className="space-y-3">
                <div className="h-4 w-full rounded bg-gray-200" />
                <div className="h-4 w-11/12 rounded bg-gray-200" />
                <div className="h-4 w-10/12 rounded bg-gray-200" />
                <div className="h-4 w-9/12 rounded bg-gray-200" />
              </div>
              <div className="space-y-3">
                <div className="h-4 w-full rounded bg-gray-200" />
                <div className="h-4 w-11/12 rounded bg-gray-200" />
                <div className="h-4 w-8/12 rounded bg-gray-200" />
              </div>
            </div>
            {/* sidebar card */}
            <div className="w-[360px] shrink-0 rounded-lg border border-gray-200 p-6 space-y-4">
              <div className="h-6 w-32 rounded bg-gray-200" />
              <div className="h-10 w-full rounded bg-gray-200" />
              <div className="h-10 w-full rounded bg-gray-200" />
              <div className="h-10 w-full rounded bg-gray-200" />
              <div className="h-px w-full bg-gray-200" />
              <div className="h-10 w-full rounded bg-gray-200" />
              <div className="h-10 w-full rounded bg-gray-200" />
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
            <Button onClick={() => router.push("/projects")}>
              Browse projects
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="px-[100px] pb-[100px] relative bg-white">
      <div className="max-w-[1240px] flex items-start gap-x-8">
        <div className="max-w-[818px] flex-auto">
          <div className="after:content-[''] after:absolute after:inset-x-0 after:border-b after:border-gray-200">
            <div className="relative pt-6 pb-[50px]">
              <div className="absolute w-screen -translate-x-[100px] top-0 bottom-px bg-gray-50" />

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

              <div className="flex gap-x-[13px] items-start mt-8 relative">
                <div className="w-[189px] h-[126px] relative overflow-hidden rounded-lg bg-gray-100 border border-gray-200 flex items-center justify-center">
                  {project.mediaUrls?.[0] ? (
                    <NextImage
                      src={project.mediaUrls[0]}
                      alt={project.title}
                      sizes="25vw"
                      loading="eager"
                      priority
                      fill
                    />
                  ) : (
                    <img src="/placeholder-img.svg" alt="" className="w-[54px] h-[49px]" />
                  )}
                </div>

                <div className="flex flex-col items-start gap-y-3 flex-1">
                  <Popover open={projectTypeOpen} onOpenChange={(open) => {
                    setProjectTypeOpen(open)
                    if (!open) setProjectTypeQuery("")
                  }}>
                    <PopoverTrigger asChild>
                      <button type="button">
                        <Badge className="rounded-[5px] bg-gray-100 cursor-pointer" visual="gray">
                          {infoProjectType || "Select Project Type"}
                        </Badge>
                      </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[224px] rounded-xl bg-white shadow-2xl p-0 border-0">
                      <Combobox
                        value={infoProjectType}
                        onChange={(val: string) => {
                          setInfoProjectType(val)
                          setProject((prev: any) => ({ ...prev, listingType: val }))
                          setProjectTypeQuery("")
                          setProjectTypeOpen(false)
                        }}
                        className="w-full"
                      >
                        <ComboboxTrigger>
                          <ComboboxButton>
                            <SearchMd className="size-4" />
                          </ComboboxButton>
                          <ComboboxInput
                            placeholder="Search"
                            onChange={(e) => setProjectTypeQuery(e.target.value)}
                            className="border-0 border-b border-gray-200 rounded-none focus:ring-0 focus:border-gray-200 hover:ring-0 hover:border-gray-200"
                          />
                        </ComboboxTrigger>
                        <ComboboxOptions className="relative mt-0 shadow-none">
                          <ScrollArea className="h-[304px]">
                            {filteredProjectTypes.map((opt) => (
                              <ComboboxOption key={opt} value={opt}>
                                {opt}
                              </ComboboxOption>
                            ))}
                          </ScrollArea>
                        </ComboboxOptions>
                      </Combobox>
                    </PopoverContent>
                  </Popover>

                  <div
                    className="flex items-center gap-1.5 w-full cursor-pointer"
                    onMouseEnter={() => setIsTitleHovered(true)}
                    onMouseLeave={() => setIsTitleHovered(false)}
                    onClick={() => {
                      if (!isTitleEditing) {
                        setInfoTitle(project.title === "Enter Project Title" ? "" : project.title || "")
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
                                setProject((prev: any) => ({ ...prev, title: infoTitle }))
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
                                setInfoTitle(project.title === "Enter Project Title" ? "" : project.title || "")
                              }
                              const currentLen = infoTitle.length
                              const selLen = (e.currentTarget.selectionEnd ?? 0) - (e.currentTarget.selectionStart ?? 0)
                              if (
                                !e.ctrlKey && !e.metaKey && !e.altKey &&
                                e.key.length === 1 &&
                                currentLen - selLen >= 120
                              ) {
                                e.preventDefault()
                                setTitleError("Please do not enter more than 120 character(s)")
                              }
                            }}
                            onPaste={(e) => {
                              const pastedText = e.clipboardData.getData("text")
                              const currentLen = infoTitle.length
                              const selLen = (e.currentTarget.selectionEnd ?? 0) - (e.currentTarget.selectionStart ?? 0)
                              if (currentLen - selLen + pastedText.length > 120) {
                                e.preventDefault()
                                setTitleError("Please do not enter more than 120 character(s)")
                              }
                            }}
                          />
                          {titleError && (
                            <span className="text-xs text-red-500 mt-1">{titleError}</span>
                          )}
                        </>
                      ) : (
                        <span className="text-[22px] leading-[30px] font-semibold text-dark-blue-400">
                          {project.title || "Enter Project Title"}
                        </span>
                      )}
                    </div>
                    <Edit03
                      className={cn(
                        "size-4 text-gray-400 shrink-0 transition-opacity duration-200",
                        isTitleHovered || isTitleEditing ? "opacity-100" : "opacity-0"
                      )}
                    />
                  </div>

                  <button
                    className="inline-flex items-center gap-x-1.5 text-sm font-semibold text-dark-blue-400 hover:underline transition duration-300"
                    onClick={() => {
                      setInfoTitle(project.title === "Enter Project Title" ? "" : project.title || "")
                      setInfoSummary(project.summary || "")
                      setInfoTab("Categories")
                      setProjectInfoOpen(true)
                    }}
                  >
                    <Plus className="size-4" />
                    Add Categories
                  </button>
                </div>

                <IconButton
                  className="rounded-full text-gray-500 hover:text-gray-800"
                  variant="ghost"
                  visual="gray"
                  onClick={() => {
                    setInfoTitle(project.title === "Enter Project Title" ? "" : project.title || "")
                    setInfoSummary(project.summary || "")
                    setInfoTab("Basic Info")
                    setProjectInfoOpen(true)
                  }}
                >
                  <Edit03 className="size-4" />
                </IconButton>
              </div>

              <div className="mt-6 relative">
                <p className="text-sm font-light text-dark-blue-400">
                  {project.summary || "Add a short description here to explain your project features and benefits. This will help visitors quickly see the difference between your project and similar projects in the marketplace..."}
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
              <NextLink href="/my-listings">
                <Button className="group" variant="link" visual="gray">
                  <ArrowLeft className="size-[15px] transition duration-300 group-hover:-translate-x-[4px]" />{" "}
                  Back To Listings
                </Button>
              </NextLink>

              <DisclosureTrigger
                value={
                  selected === "Details" || selected === "View Project Scope"
                    ? "Live Chat"
                    : "Details"
                }
                asChild
              >
                <Button variant="link">
                  <MessageTextCircle01 className="size-5" />
                  Live Chat
                </Button>
              </DisclosureTrigger>

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
                data-state={selected === "View Project Scope" ? "active" : "inactive"}
              >
                {selected === "View Project Scope"
                  ? "Close Scope"
                  : project?.listingType === "service"
                    ? "View Service Scope"
                    : "View Project Scope"}
                <ChevronDown className="group-data-[state=active]:-rotate-180 transition duration-300 size-[15px]" />
              </Button>
            </RadixTabs.TabsList>
            <TabsContent value="Live Chat">
              <Inbox>
                <Chats />
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
              <Carousel className="max-w-[818px] w-full">
                <CarouselContent className="-ml-3">
                  {(() => {
                    const gallery =
                      (project.mediaUrls as string[] | undefined)?.slice(1) ??
                      []
                    if (gallery.length === 0) {
                      return Array.from({ length: 5 }).map((_, index) => (
                        <CarouselItem key={index} className="group basis-1/3">
                          <div className="relative border border-gray-200 h-[150.6px] overflow-hidden rounded-lg bg-gray-100 flex items-center justify-center">
                            <img src="/placeholder-img.svg" alt="" className="w-[54px] h-[49px]" />
                          </div>
                        </CarouselItem>
                      ))
                    }
                    return gallery.map((url, index) => (
                      <CarouselItem
                        key={`${url}-${index}`}
                        className="group basis-1/3"
                      >
                        <div className="relative border border-gray-200 h-[150.6px] overflow-hidden rounded-lg">
                          <NextImage
                            className="object-cover"
                            src={url}
                            alt={`${project.title} — gallery image ${index + 1}`}
                            sizes="25vw"
                            fill
                          />
                          <div className="absolute inset-0 transition duration-300" />
                        </div>
                      </CarouselItem>
                    ))
                  })()}
                </CarouselContent>

                <CarouselPreviousTrigger />
                <CarouselNextTrigger />
              </Carousel>

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
                          <TabsTrigger value="Description">
                            Description
                          </TabsTrigger>
                          <TabsTrigger value="Delierables">
                            Delierables
                          </TabsTrigger>
                          <TabsTrigger value="Project Details">
                            Project Details
                          </TabsTrigger>
                          <TabsTrigger value="How it Works">
                            How it Works
                          </TabsTrigger>
                          <TabsTrigger value="Questions">Questions</TabsTrigger>
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

                  <TabsContent value="Description">
                    <div className="pt-6">
                      {!project.description && !project.summary && (
                      <Alert variant="primary" className="mb-6 items-center">
                        <AlertIcon>
                          <Stars02 className="size-5" />
                        </AlertIcon>
                        <AlertContent className="flex-1">
                          <AlertTitle>Make Your Project Stand Out</AlertTitle>
                          <AlertDescription className="mt-0">
                            A great project description includes rich text elements and beautiful imagery that...
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
                      {project.description || project.summary ? (
                      <ShowMoreLessRoot>
                        {({ isShowing, setIsShowing }) => (
                          <div
                            className={cn(
                              "relative border border-gray-200 bg-white rounded-lg p-6 shadow-[0px_1px_5px_0px_rgba(16,24,40,.02)] h-[506px] transition-[height] duration-300 overflow-hidden [interpolate-size:allow-keywords]",
                              isShowing && "h-auto"
                            )}
                          >
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

                            {isShowing ? (
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
                              <div className="rounded-b-lg absolute inset-x-0 bottom-0 h-[136px] bg-[linear-gradient(174.9deg,theme(colors.white/0)_7.46%,theme(colors.white)_62.15%)] pb-[26px] flex justify-center items-end">
                                <Button
                                  visual="gray"
                                  variant="link"
                                  onClick={() => setIsShowing(true)}
                                >
                                  View More
                                </Button>
                              </div>
                            )}
                          </div>
                        )}
                      </ShowMoreLessRoot>
                      ) : (
                      <div className="border-2 border-gray-200 bg-gray-25 rounded-lg p-6 flex items-start justify-between">
                        <div>
                          <h1 className="text-lg font-semibold text-dark-blue-400">
                            Project Description
                          </h1>
                          <p className="mt-1 text-sm font-light text-dark-blue-400">
                            Describe your project in a meaningful way that will attract top clients. You can even add images using our rich text editor to make your project stand out.
                          </p>
                        </div>
                        <Button variant="outlined" visual="gray" className="shrink-0 ml-[75px]" onClick={() => { setDescDraft(project.description || ""); setDescDialogOpen(true) }}>
                          <Plus className="size-[15px]" />
                          Add Description
                        </Button>
                      </div>
                      )}

                      <Dialog open={descDialogOpen} onOpenChange={setDescDialogOpen}>
                        <DialogContent className="max-w-[680px] p-0 rounded-xl">
                          <div className="flex items-center justify-between px-6 pt-6">
                            <DialogTitle className="text-lg font-bold text-dark-blue-400">
                              Project Description
                            </DialogTitle>
                            <div className="flex items-center gap-x-2">
                              <button className="text-gray-400 hover:text-gray-600 focus-visible:outline-none">
                                <Expand06 className="size-5" />
                              </button>
                              <DialogClose className="text-gray-400 hover:text-gray-600 focus-visible:outline-none">
                                <X className="size-5" />
                              </DialogClose>
                            </div>
                          </div>

                          <div className="px-6 pt-6 pb-6">
                            <div className="flex items-baseline justify-between mb-2">
                              <span className="text-sm font-light text-dark-blue-400">
                                Provide a comprehensive description of this project, including its purpose and features.
                              </span>
                              <span className="text-sm font-light text-gray-400 shrink-0 ml-4">
                                {descDraft.length}/2,000
                              </span>
                            </div>
                            <Textarea
                              className="min-h-[140px] resize-none"
                              placeholder="Enter a description..."
                              value={descDraft}
                              onChange={(e) =>
                                setDescDraft(e.target.value.slice(0, 2000))
                              }
                            />
                          </div>

                          <div className="flex items-center justify-between border-t border-gray-200 px-6 py-4">
                            <DialogClose asChild>
                              <Button variant="link" visual="gray">
                                <X className="size-4" />
                                Cancel
                              </Button>
                            </DialogClose>
                            <Button
                              onClick={() => {
                                setProject((prev: any) => ({ ...prev, description: descDraft }))
                                setDescDialogOpen(false)
                              }}
                            >
                              Save
                            </Button>
                          </div>
                        </DialogContent>
                      </Dialog>

                      {/* Project Info Modal */}
                      <Dialog open={projectInfoOpen} onOpenChange={setProjectInfoOpen}>
                        <DialogContent className="max-w-[700px] rounded-[12px] p-0">
                          <form
                            onSubmit={(e) => {
                              e.preventDefault()
                              setProject((prev: any) => ({
                                ...prev,
                                title: infoTitle || prev.title,
                                summary: infoSummary || prev.summary,
                                listingType: infoProjectType,
                                categories: infoCategories
                                  .filter((r) => r.category)
                                  .map((r) => r.category),
                              }))
                              setProjectInfoOpen(false)
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
                                      Create a connection and let clients feel like they already know you!
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
                                <TabsList className="border-b border-gray-200 px-6">
                                  <TabsTrigger value="Basic Info">
                                    Basic Info
                                  </TabsTrigger>
                                  <TabsTrigger value="Categories">
                                    Categories
                                  </TabsTrigger>
                                </TabsList>

                                <TabsContent value="Basic Info" className="pt-6 px-6 pb-6 space-y-5">
                                  <div className="space-y-1.5">
                                    <div className="flex items-center justify-between">
                                      <Label size="sm" className="font-medium">
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
                                        setInfoTitle(e.target.value.slice(0, 120))
                                      }
                                    />
                                  </div>

                                  <div className="space-y-1.5">
                                    <div className="flex items-center justify-between">
                                      <Label size="sm" className="font-medium">
                                        Short Description
                                      </Label>
                                      <span className="text-xs text-gray-400">
                                        {infoSummary.length}/300
                                      </span>
                                    </div>
                                    <Textarea
                                      className="min-h-[100px] resize-none"
                                      placeholder="Enter a short description..."
                                      value={infoSummary}
                                      onChange={(e) =>
                                        setInfoSummary(e.target.value.slice(0, 300))
                                      }
                                    />
                                  </div>

                                  <div className="space-y-1.5">
                                    <Label size="sm" className="font-medium">
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
                                          <ListboxOption key={opt} value={opt}>
                                            {opt}
                                          </ListboxOption>
                                        ))}
                                      </ListboxOptions>
                                    </Listbox>
                                  </div>
                                </TabsContent>

                                <TabsContent value="Categories" className="pt-6 px-6 pb-6">
                                  <p className="text-sm font-light text-dark-blue-400 mb-6">
                                    Select categories that best fit your project scope for easier discovery.
                                  </p>

                                  <div className="space-y-5">
                                    {[0, 1, 2].map((index) => (
                                      <div key={index} className="flex items-start gap-x-1.5">
                                        <div className="size-11 shrink-0 inline-flex items-center justify-between text-xl leading-[30px] text-gray-900 font-semibold">
                                          {index + 1}
                                        </div>

                                        <div className="flex flex-col flex-auto gap-y-2.5">
                                          <div className="max-w-[202px]">
                                            <Listbox
                                              value={infoCategories[index].category}
                                              onChange={(val) =>
                                                handleInfoCategoryChange(index, val)
                                              }
                                            >
                                              <ListboxButton
                                                placeholder="Add Category"
                                                className="w-full max-w-[202px] h-[44px] px-[14px] py-[10px] flex items-center justify-start border border-gray-300 rounded-[5px]"
                                                onFocus={() => setActiveCategoryIndex(index)}
                                              >
                                                {({ value }) => (
                                                  <span className="truncate block">
                                                    {value || "Add Category"}
                                                  </span>
                                                )}
                                              </ListboxButton>
                                              <ListboxOptions>
                                                {getAvailableCategoriesForIndex(index).map(
                                                  (category) => (
                                                    <ListboxOption
                                                      key={category}
                                                      value={category}
                                                    >
                                                      {category}
                                                    </ListboxOption>
                                                  )
                                                )}
                                              </ListboxOptions>
                                            </Listbox>
                                          </div>

                                          <TagsInputRoot
                                            value={infoCategories[index].subCategories}
                                            onValueChange={(details) =>
                                              handleInfoSubCategoryChange(
                                                index,
                                                details.value
                                              )
                                            }
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
                                                    placeholder={
                                                      tagsInput.value.length
                                                        ? ""
                                                        : "Add Sub-Category(s)"
                                                    }
                                                    options={
                                                      activeCategoryIndex === index
                                                        ? subCategoryOptions
                                                        : getSubCategoryOptionsForCategory(
                                                            infoCategories[index].category
                                                          )
                                                    }
                                                    allowCreateOption
                                                    className="flex-1 min-w-[100px]"
                                                    onInputValueChange={(value) => {
                                                      fetchCategoriesAutocomplete(index as 0 | 1 | 2, value)
                                                    }}
                                                    onFocus={() => {
                                                      setActiveCategoryIndex(index)
                                                      setSubCategoryOptions(
                                                        getSubCategoryOptionsForCategory(
                                                          infoCategories[index].category
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
                                        {suggestedForDisplay.map(({ category, subCategory }) => (
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
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                </TabsContent>
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


                      {Array.isArray(project.deliverables) && project.deliverables.length > 0 ? (
                      <ShowMoreLessRoot>
                        {({ isShowing, setIsShowing }) => (
                          <div
                            className={cn(
                              "relative border border-gray-200 bg-white rounded-lg p-6 shadow-[0px_1px_5px_0px_rgba(16,24,40,.02)] mt-6 h-[456px] transition-[height] duration-300 overflow-hidden [interpolate-size:allow-keywords]",
                              isShowing && "h-auto"
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
                                    {phase.items.map((item, i) => (
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
                              ))}
                            </div>

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

                            {isShowing ? (
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
                              <div className="rounded-b-lg absolute inset-x-0 bottom-0 h-[136px] bg-[linear-gradient(174.9deg,theme(colors.white/0)_7.46%,theme(colors.white)_62.15%)] pb-[26px] flex justify-center items-end">
                                <Button
                                  visual="gray"
                                  variant="link"
                                  onClick={() => setIsShowing(true)}
                                >
                                  View More
                                </Button>
                              </div>
                            )}
                          </div>
                        )}
                      </ShowMoreLessRoot>
                      ) : (
                      <div className="border-2 border-gray-200 bg-gray-25 rounded-lg p-6 mt-6 flex items-start justify-between">
                        <div>
                          <h1 className="text-lg font-semibold text-dark-blue-400">
                            Deliverables
                          </h1>
                          <p className="mt-1 text-sm font-light text-dark-blue-400">
                            Your project deliverables will be displayed here once you add a scope to your offer. These deliverables are automatically generated based on the details in your scope and tasks, they&apos;re not directly editable.
                          </p>
                        </div>
                        <Button variant="outlined" visual="gray" className="shrink-0 ml-[75px]" onClick={() => { setSelected("View Project Scope"); window.scrollTo({ top: 0, behavior: "smooth" }) }}>
                          <Plus className="size-[15px]" />
                          Add Scope
                        </Button>
                      </div>
                      )}

                      {project.programmingLanguages?.length > 0 || project.developmentTech?.length > 0 || project.subcategories?.length > 0 || project.tags?.length > 0 ? (
                      <div className="mt-6 border gap-x-[50px] rounded-lg border-gray-200 bg-white shadow-[0px_1px_5px_0px_rgba(16,24,40,.02)]">
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
                        {Array.isArray(project.team) &&
                        project.team.length > 0 ? (
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
                            const members = project.team as TeamMember[]
                            const lead =
                              members.find((m) => m.isLead) ?? members[0]
                            const allLocations = Array.from(
                              new Set(
                                members
                                  .map((m) => m.location)
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
                                  <MapPin className="size-[18px]" /> Locations
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
                                  <Stars02 className="size-[18px]" /> Skills &
                                  Expertise
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
                      <div className="mt-6 border-2 border-gray-200 bg-gray-25 rounded-lg">
                        <div className="p-6 border-b border-gray-200 flex items-start justify-between">
                          <div>
                            <h1 className="text-lg font-semibold text-dark-blue-400">
                              Project Details
                            </h1>
                            <p className="mt-1 text-sm font-light text-dark-blue-400">
                              Your project deliverables will be displayed here once you add a scope to your offer. These deliverables are automatically generated based on the details in your scope and tasks, they&apos;re not directly editable.
                            </p>
                          </div>
                          <Button variant="outlined" visual="gray" className="shrink-0 ml-[75px]" onClick={() => setDetailsDialogOpen(true)}>
                            <Plus className="size-[15px]" />
                            Add Details
                          </Button>
                        </div>

                        {/* About the Team — static fallback */}
                        <div className="p-6 bg-white rounded-b-lg">
                          <div className="flex items-center justify-between">
                            <h3 className="text-base leading-none font-semibold text-dark-blue-400">
                              About the Team
                            </h3>
                            <IconButton className="rounded-full text-gray-500 hover:text-gray-800" variant="ghost" visual="gray" onClick={() => { setTeamTab("Team Lead"); setTeamDialogOpen(true) }}>
                              <Edit03 className="size-4" />
                            </IconButton>
                          </div>

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
                                    <span className="text-base font-bold text-dark-blue-400">
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
                                <MapPin className="size-[18px]" /> Locations
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
                                <Stars02 className="size-[18px]" /> Skills &
                                Expertise
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
                      </div>
                      )}

                      {/* Project Details Dialog */}
                      <Dialog open={detailsDialogOpen} onOpenChange={setDetailsDialogOpen}>
                        <DialogContent className="max-w-[748px] p-0 gap-0">
                          <div className="px-6 pt-6 pb-4">
                            <div className="flex items-start justify-between">
                              <div>
                                <h2 className="text-lg font-bold text-dark-blue-400">Project Details</h2>
                                <p className="mt-1 text-sm font-light text-dark-blue-400">
                                  Create a connection and let clients feel like they already know you!
                                </p>
                              </div>
                              <DialogClose asChild>
                                <IconButton variant="ghost" visual="gray" size="sm">
                                  <X className="size-5" />
                                </IconButton>
                              </DialogClose>
                            </div>
                          </div>

                          <div className="border-t border-gray-200 px-6 py-6 space-y-6 max-h-[60vh] overflow-y-auto">
                            {[
                              { label: "Programming Languages", desc: "Add up to 10 tags that best describe your template. Use relevant keywords to highlight its features and make it easier to find.", max: 10, value: detailsLangs, onChange: setDetailsLangs, placeholder: "Add Programming Languages" },
                              { label: "Development Tech", desc: "Add up to 10 technologies that will be used in this project", max: 10, value: detailsTech, onChange: setDetailsTech, placeholder: "Add Technologies" },
                              { label: "Industry", desc: "Add up to 5 industries that align with your project scope for targeted visibility.", max: 5, value: detailsIndustry, onChange: setDetailsIndustry, placeholder: "Add Industries" },
                              { label: "Tags", desc: "Add up to 10 tags that align with your project scope for targeted visibility.", max: 10, value: detailsTags, onChange: setDetailsTags, placeholder: "Add Tags" },
                              { label: "Skills", desc: "List up to 10 key skills or proficiencies required to implement this template effectively.", max: 10, value: detailsSkills, onChange: setDetailsSkills, placeholder: "Add Skills" },
                              { label: "Tools", desc: "Add up to 10 tools that align with your project scope for targeted visibility.", max: 10, value: detailsTools, onChange: setDetailsTools, placeholder: "Add Tools" },
                            ].map((field) => (
                              <div key={field.label}>
                                <div className="flex items-start justify-between">
                                  <div>
                                    <h3 className="text-sm font-bold text-dark-blue-400">{field.label}</h3>
                                    <p className="mt-0.5 text-xs font-light text-dark-blue-400">{field.desc}</p>
                                  </div>
                                  <span className="text-xs text-gray-500 shrink-0 ml-4">{field.value.length}/{field.max}</span>
                                </div>
                                <TagsInputRoot
                                  className="mt-2 space-y-1.5"
                                  value={field.value}
                                  onValueChange={(d) => field.onChange(d.value.slice(0, field.max))}
                                >
                                  <TagsInputContext>
                                    {(tagsInput) => (
                                      <TagsInputControl className="relative pr-[28px] flex flex-wrap !justify-start !items-start !text-left w-full h-auto rounded-[5px] border border-gray-300 focus-within:border-primary-500 focus-within:ring-1 focus-within:ring-primary-500 px-[14px] py-[10px] m-0">
                                        {tagsInput.value.map((value, vi) => (
                                          <TagsInputItem key={vi} index={vi} value={value}>
                                            <TagsInputItemPreview
                                              visual="primary"
                                              size="md"
                                              className="pr-2 text-primary-500 bg-primary-50 animate-in fade-in-0 zoom-in-95 duration-200"
                                            >
                                              <TagsInputItemText>{value}</TagsInputItemText>
                                              <TagsInputItemDeleteTrigger className="opacity-50 hover:opacity-100">
                                                <X2 className="size-3" />
                                              </TagsInputItemDeleteTrigger>
                                            </TagsInputItemPreview>
                                            <TagsInputItemInput />
                                          </TagsInputItem>
                                        ))}
                                        <TagsInputInput
                                          placeholder={tagsInput.value.length ? "" : field.placeholder}
                                          allowCreateOption
                                          className="flex-1 min-w-[100px]"
                                        />
                                      </TagsInputControl>
                                    )}
                                  </TagsInputContext>
                                  <TagsInputHiddenInput />
                                </TagsInputRoot>
                              </div>
                            ))}

                            {/* Sub-Categories */}
                            <div className="rounded-lg bg-primary-50 p-4">
                              <div className="flex items-start justify-between">
                                <div>
                                  <h3 className="text-sm font-bold text-dark-blue-400">Sub-Categories</h3>
                                  <p className="mt-0.5 text-xs font-light text-dark-blue-400">
                                    Here are your current subcategories. Click on &quot;Edit Categories&quot; to update them on the Project Info page.
                                  </p>
                                </div>
                                <Button variant="outlined" visual="gray" className="shrink-0 ml-4 bg-white" onClick={() => { setDetailsDialogOpen(false); setProjectInfoOpen(true); setInfoTab("Categories") }}>
                                  <Edit03 className="size-[15px]" />
                                  Edit Categories
                                </Button>
                              </div>
                              {infoCategories.some((c) => c.subCategories.length > 0) && (
                                <div className="mt-3 flex flex-wrap gap-1.5">
                                  {infoCategories.flatMap((c) => c.subCategories).slice(0, 4).map((sc, i) => (
                                    <Badge key={`${sc}-${i}`} visual="primary" className="rounded-[4px] bg-primary-100">
                                      {sc}
                                    </Badge>
                                  ))}
                                  {infoCategories.flatMap((c) => c.subCategories).length > 4 && (
                                    <span className="text-sm font-medium text-dark-blue-400">
                                      + {infoCategories.flatMap((c) => c.subCategories).length - 4} more
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>

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
                              disabled={detailsLangs.length === 0 && detailsTech.length === 0 && detailsIndustry.length === 0 && detailsTags.length === 0 && detailsSkills.length === 0 && detailsTools.length === 0}
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
                            }}>Save</Button>
                          </div>
                        </DialogContent>
                      </Dialog>

                      {/* About The Team Dialog */}
                      <Dialog open={teamDialogOpen} onOpenChange={setTeamDialogOpen}>
                        <DialogContent className="max-w-[748px] p-0 gap-0">
                          <div className="px-6 pt-6">
                            <div className="flex items-start justify-between">
                              <h2 className="text-lg font-bold text-dark-blue-400">About The Team</h2>
                              <DialogClose asChild>
                                <IconButton variant="ghost" visual="gray" size="sm">
                                  <X className="size-5" />
                                </IconButton>
                              </DialogClose>
                            </div>

                            <Tabs value={teamTab} onValueChange={setTeamTab} className="mt-4">
                              <TabsList className="border-b border-gray-200 w-full justify-start">
                                <TabsTrigger value="Team Lead">Team Lead</TabsTrigger>
                                <TabsTrigger value="Team Members">Team Members</TabsTrigger>
                              </TabsList>

                              <TabsContent value="Team Lead" className="pt-6 pb-6">
                                <div>
                                  <span className="text-sm font-semibold text-dark-blue-400">Current Team Lead</span>
                                  <div className="mt-3 flex items-center justify-between">
                                    <div className="flex items-center gap-x-3">
                                      <Avatar size="md">
                                        <AvatarImage src="/man.jpg" alt="Chris" />
                                        <AvatarFallback>C</AvatarFallback>
                                      </Avatar>
                                      <div>
                                        <span className="text-sm font-bold text-dark-blue-400">Chris</span>
                                        <span className="text-sm font-light text-gray-500"> @ux23isee</span>
                                        <p className="text-xs font-light text-dark-blue-400">Full Stack Designer</p>
                                      </div>
                                    </div>
                                    <Badge visual="primary" className="rounded-[4px] bg-primary-50">
                                      Account Manager
                                    </Badge>
                                  </div>
                                </div>

                                <div className="mt-8 grid grid-cols-2 gap-x-6">
                                  <div>
                                    <span className="text-sm font-semibold text-dark-blue-400">Assign Project Lead</span>
                                    <InputGroup className="mt-2">
                                      <Input placeholder="Search team members" />
                                      <InputLeftElement>
                                        <SearchMd className="text-gray-500 h-4 w-4" />
                                      </InputLeftElement>
                                    </InputGroup>
                                  </div>
                                  <div>
                                    <span className="text-sm font-semibold text-dark-blue-400 inline-flex items-center gap-x-1">
                                      Select Label
                                      <TooltipProvider>
                                        <Tooltip>
                                          <TooltipTrigger asChild>
                                            <HelpCircle className="size-3.5 text-gray-400 cursor-help" />
                                          </TooltipTrigger>
                                          <TooltipContent>Assign a role label to the team lead</TooltipContent>
                                        </Tooltip>
                                      </TooltipProvider>
                                    </span>
                                    <Listbox defaultValue="">
                                      <ListboxButton className="mt-2 w-full" placeholder="None selected" />
                                      <ListboxOptions>
                                        <ListboxOption value="Project Lead">Project Lead</ListboxOption>
                                        <ListboxOption value="Account Manager">Account Manager</ListboxOption>
                                        <ListboxOption value="Technical Lead">Technical Lead</ListboxOption>
                                        <ListboxOption value="Design Lead">Design Lead</ListboxOption>
                                      </ListboxOptions>
                                    </Listbox>
                                  </div>
                                </div>
                              </TabsContent>

                              <TabsContent value="Team Members" className="pt-6 pb-6">
                                <div className="flex items-start justify-between">
                                  <div>
                                    <h3 className="text-sm font-semibold text-dark-blue-400">All assignees (10)</h3>
                                    <p className="mt-1 text-xs font-light text-dark-blue-400">
                                      View and manage all users currently assigned to this project below.
                                    </p>
                                  </div>
                                  <Button variant="outlined" visual="gray" onClick={() => inviteWindow.toggle(true, "Invite Team Members")}>
                                    <Plus className="size-[15px]" />
                                    Add Team Member
                                  </Button>
                                </div>

                                <div className="mt-6 max-h-[40vh] overflow-y-auto">
                                  <Table>
                                    <TableHeader>
                                      <TableRow className="hover:bg-transparent">
                                        <TableHead className="text-xs font-medium text-gray-500">Name</TableHead>
                                        <TableHead className="text-xs font-medium text-gray-500">Project Role</TableHead>
                                        <TableHead className="text-xs font-medium text-gray-500">Status</TableHead>
                                        <TableHead className="w-[40px]" />
                                      </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                      {[
                                        { name: "Chris", username: "ux23isee", role: "Owner", status: "Active", you: true, avatar: "/man.jpg" },
                                        { name: "Sarah", username: "ux23isee", role: "Manager", status: "Active", avatar: "/woman.jpg" },
                                        { name: "Laura", username: "ux23isee", role: "Contributor", status: "Active", avatar: "/woman.jpg" },
                                        { name: "Tina", username: "ux23isee", role: "Contributor", status: "Inactive", avatar: "/woman.jpg" },
                                        { name: "Shelly", username: "ux23isee", role: "Contributor", status: "Inactive", avatar: "/woman.jpg" },
                                      ].map((member, mi) => (
                                        <TableRow key={mi}>
                                          <TableCell className="py-4">
                                            <div className="flex items-center gap-x-3">
                                              <Avatar size="sm">
                                                <AvatarImage src={member.avatar} alt={member.name} />
                                                <AvatarFallback>{member.name.charAt(0)}</AvatarFallback>
                                              </Avatar>
                                              <div>
                                                <span className="text-sm font-semibold text-dark-blue-400">
                                                  {member.name}
                                                </span>
                                                <span className="text-sm font-light text-gray-500">
                                                  {" "}@{member.username}
                                                </span>
                                                {member.you && (
                                                  <span className="text-sm font-semibold text-dark-blue-400"> (You)</span>
                                                )}
                                                <p className="text-xs font-light text-dark-blue-400">Full Stack Designer</p>
                                              </div>
                                            </div>
                                          </TableCell>
                                          <TableCell className="py-4">
                                            <Listbox defaultValue={member.role}>
                                              <ListboxButton className="h-[36px] w-[140px] text-sm" placeholder="Select role" />
                                              <ListboxOptions>
                                                <ListboxOption value="Owner">Owner</ListboxOption>
                                                <ListboxOption value="Manager">Manager</ListboxOption>
                                                <ListboxOption value="Contributor">Contributor</ListboxOption>
                                              </ListboxOptions>
                                            </Listbox>
                                          </TableCell>
                                          <TableCell className="py-4">
                                            <span className={cn(
                                              "text-sm font-semibold",
                                              member.status === "Active" ? "text-success-500" : "text-gray-500"
                                            )}>
                                              {member.status}
                                            </span>
                                          </TableCell>
                                          <TableCell className="py-4">
                                            <DropdownMenu>
                                              <DropdownMenuTrigger asChild>
                                                <IconButton variant="ghost" visual="gray" size="sm">
                                                  <MoreHorizontal className="size-4" />
                                                </IconButton>
                                              </DropdownMenuTrigger>
                                              <DropdownMenuContent align="end">
                                                <DropdownMenuItem>View Profile</DropdownMenuItem>
                                                <DropdownMenuItem>Remove</DropdownMenuItem>
                                              </DropdownMenuContent>
                                            </DropdownMenu>
                                          </TableCell>
                                        </TableRow>
                                      ))}
                                    </TableBody>
                                  </Table>
                                </div>
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
                            <Button onClick={() => setTeamDialogOpen(false)}>Save</Button>
                          </div>
                        </DialogContent>
                      </Dialog>

{/* How It Works section hidden in edit mode */}

                      <div className="relative p-6 mt-6 border gap-x-[50px] rounded-lg border-gray-200 bg-white shadow-[0px_1px_5px_0px_rgba(16,24,40,.02)]">
                        <div className="flex items-center justify-between">
                          <h1 className="text-xl font-bold leading-none text-dark-blue-400">
                            Questions
                          </h1>
                          <IconButton className="rounded-full text-gray-500 hover:text-gray-800" variant="ghost" visual="gray" onClick={() => setQuestionsDialogOpen(true)}>
                            <Edit03 className="size-4" />
                          </IconButton>
                        </div>

                        {(project.faqs?.length > 0 || project.recentQuestions?.length > 0) && (
                        <>
                        <div className="absolute right-12 top-11 pr-5 p-3 rounded-lg flex items-start gap-x-2.5 bg-white border border-gray-200 shadow-[0px_12px_16px_-4px_rgba(16,24,40,.08)]">
                          <Avatar size="md">
                            <AvatarImage src="/man.jpg" alt="Man" />
                            <AvatarFallback>M</AvatarFallback>
                          </Avatar>

                          <div className="flex flex-col items-start gap-y-2">
                            <span className="text-[13px] leading-none font-semibold text-dark-blue-400">
                              Kevin{" "}
                              <span className="text-xs leading-none text-extralight text-gray-500">
                                @username
                              </span>
                            </span>

                            <div className="flex items-center gap-x-1">
                              <span className="size-[10.52px] rounded-full shrink-0 bg-[#19BD1F]" />
                              <span className="text-xs leading-none text-dark-blue-400">
                                Online
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="mt-6 p-6 rounded-lg border border-gray-200 bg-gray-50">
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
                            <Button className="text-xs leading-none" size="lg">
                              Ask Question
                            </Button>
                          </div>

                          <div className="mt-2 flex items-center justify-between">
                            <span className="text-xs text-dark-blue-400 leading-none">
                              A team member will reach out to you as soon as
                              possible.
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
                        </>
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
                                <div className="border-2 border-gray-200 bg-gray-25 rounded-lg p-6 mt-6 flex items-start justify-between">
                                  <div>
                                    <h1 className="text-lg font-semibold text-dark-blue-400">
                                      FAQ&apos;s
                                    </h1>
                                    <p className="mt-1 text-sm font-light text-dark-blue-400">
                                      Your project deliverables will be displayed here once you add a scope to your offer. These deliverables are automatically generated based on the details in your scope and tasks, they&apos;re not directly editable.
                                    </p>
                                  </div>
                                  <Button variant="outlined" visual="gray" className="shrink-0 ml-[75px]" onClick={() => { setQuestionsTab("FAQs"); setQuestionsDialogOpen(true) }}>
                                    <Plus className="size-[15px]" />
                                    Add FAQ&apos;s
                                  </Button>
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
                              {!project.recentQuestions ||
                              project.recentQuestions.length === 0 ? (
                                <div className="border-2 border-gray-200 bg-gray-25 rounded-lg p-6 mt-6">
                                  <h1 className="text-lg font-semibold text-dark-blue-400">
                                    No Recent Questions
                                  </h1>
                                  <p className="mt-1 text-sm font-light text-dark-blue-400">
                                    You will see recent questions here once your project is live in the marketplace and visitors engage in chat with you and your team.
                                  </p>
                                </div>
                              ) : (
                                <Accordion
                                  type="single"
                                  className="pt-6 space-y-[15px]"
                                  defaultValue="rq-0"
                                >
                                  {(project.recentQuestions as string[]).map(
                                    (q, idx) => (
                                      <AccordionItem
                                        key={`rq-${idx}`}
                                        className="rounded-lg bg-white border border-gray-300"
                                        value={`rq-${idx}`}
                                      >
                                        <AccordionTrigger className="w-full px-5 py-3 flex items-center gap-x-2 text-base leading-[1.3] font-semibold flex-auto text-dark-blue-400">
                                          <span className="flex-auto text-left inline-block">
                                            {q}
                                          </span>
                                          <ChevronDown className="size-6 shrink-0 group-data-[state=open]/item:-rotate-180 transition duration-300" />
                                        </AccordionTrigger>
                                      </AccordionItem>
                                    )
                                  )}
                                </Accordion>
                              )}
                            </TabsContent>
                          </Tabs>

                          {(project.faqs?.length > 0 || project.recentQuestions?.length > 0) && (
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
                      <Dialog open={questionsDialogOpen} onOpenChange={setQuestionsDialogOpen}>
                        <DialogContent className="max-w-[748px] p-0 gap-0">
                          <RadixTabs.Root value={questionsTab} onValueChange={setQuestionsTab}>
                          <div className="px-6 pt-6 pb-4">
                            <div className="flex items-start justify-between">
                              <div>
                                <h2 className="text-lg font-bold text-dark-blue-400">Questions</h2>
                                <p className="mt-1 text-sm font-light text-dark-blue-400">
                                  Manage your FAQ&apos;s and recently asked questions.
                                </p>
                              </div>
                              <DialogClose asChild>
                                <IconButton variant="ghost" visual="gray" size="sm">
                                  <X className="size-5" />
                                </IconButton>
                              </DialogClose>
                            </div>

                            <RadixTabs.List className="flex items-center gap-x-3 pt-4">
                              <RadixTabs.Trigger value="FAQs" className="focus-visible:outline-none py-[7px] bg-white hover:bg-gray-50 hover:border-gray-400 px-3.5 border-2 border-gray-300 data-[state=active]:text-dark-blue-400 data-[state=active]:bg-white hover:data-[state=active]:bg-white data-[state=active]:border-dark-blue-400 hover:data-[state=active]:text-dark-blue-400 hover:data-[state=active]:border-dark-blue-400 text-gray-500 hover:text-gray-600 rounded-full text-sm leading-5 font-medium transition duration-300">FAQ&apos;s</RadixTabs.Trigger>
                              <RadixTabs.Trigger value="RecentlyAsked" className="focus-visible:outline-none py-[7px] bg-white hover:bg-gray-50 hover:border-gray-400 px-3.5 border-2 border-gray-300 data-[state=active]:text-dark-blue-400 data-[state=active]:bg-white hover:data-[state=active]:bg-white data-[state=active]:border-dark-blue-400 hover:data-[state=active]:text-dark-blue-400 hover:data-[state=active]:border-dark-blue-400 text-gray-500 hover:text-gray-600 rounded-full text-sm leading-5 font-medium transition duration-300">Recently Asked Questions</RadixTabs.Trigger>
                            </RadixTabs.List>
                          </div>

                          <div className="border-t border-gray-200 px-6 py-6 max-h-[60vh] overflow-y-auto">
                              <RadixTabs.Content value="FAQs" className="focus-visible:outline-none">
                                <p className="text-sm font-light text-dark-blue-400">
                                  Write a response for each of the question added to this project. Drag and drop FAQ items to reorder them. The order you set here will be reflected on your project&apos;s public FAQ section.
                                </p>

                                <div className="mt-4 flex items-center gap-3">
                                  <Button variant="outlined" visual="gray" size="sm">
                                    <Stars02 className="size-[15px]" />
                                    Generate With AI
                                  </Button>
                                  <Button variant="outlined" visual="gray" size="sm">
                                    <Plus className="size-[15px]" />
                                    Add Question
                                  </Button>
                                </div>

                                <Accordion
                                  type="single"
                                  collapsible
                                  className="mt-4 space-y-3"
                                  value={openFaqIndex !== null ? `faq-${openFaqIndex}` : ""}
                                  onValueChange={(val) => setOpenFaqIndex(val ? Number(val.replace("faq-", "")) : null)}
                                >
                                  {[
                                    { q: "How will you involve me in the process?", a: "We offer a comprehensive range of IT consulting services, including IT strategy development, software development, network infrastructure design and implementation, cybersecurity assessment and solutions, cloud computing solutions, and IT project management." },
                                    { q: "Can I request changes after the project starts?", a: "" },
                                    { q: "How do you handle communication during the project?", a: "" },
                                    { q: "What tools and technologies do you use?", a: "" },
                                  ].map((faq, idx) => (
                                    <AccordionItem key={idx} value={`faq-${idx}`} className="rounded-lg border border-gray-200 bg-white">
                                      <AccordionTrigger className="w-full p-4 flex items-center gap-3 [&[data-state=open]_.closed-icons]:hidden [&[data-state=closed]_.open-icons]:hidden [&[data-state=open]_.closed-text]:hidden [&[data-state=open]_.open-text]:inline">
                                        <button type="button" className="cursor-grab text-gray-400 hover:text-gray-600" onClick={(e) => e.stopPropagation()}>
                                          <GripVertical2 />
                                        </button>
                                        <div className="min-w-0 flex-1 text-left">
                                          <span className="text-sm font-bold text-dark-blue-400">Question {idx + 1}<span className="closed-text">:</span></span>
                                          <span className="closed-text"> </span>
                                          <span className="closed-text text-sm text-dark-blue-400">{faq.q}</span>
                                        </div>
                                        <div className="flex items-center gap-1">
                                          <span className="open-icons">
                                            <IconButton asChild variant="ghost" visual="gray" size="sm" className="rounded-full text-gray-500 hover:text-gray-800">
                                              <span><Check className="size-4" /></span>
                                            </IconButton>
                                          </span>
                                          <span className="closed-icons">
                                            <IconButton asChild variant="ghost" visual="gray" size="sm" className="rounded-full text-gray-500 hover:text-gray-800">
                                              <span><Edit03 className="size-4" /></span>
                                            </IconButton>
                                          </span>
                                          <IconButton variant="ghost" visual="gray" size="sm" className="rounded-full text-gray-500 hover:text-gray-800" onClick={(e) => e.stopPropagation()}>
                                            <Trash2 className="size-4" />
                                          </IconButton>
                                        </div>
                                      </AccordionTrigger>
                                      <DisclosureContent className="px-4 pb-4">
                                        <p className="text-sm font-light text-dark-blue-400">
                                          Make this clear and concise, this is what your visitors will see first.
                                        </p>
                                        <Input className="mt-2" defaultValue={faq.q} />
                                        <div className="mt-4 flex items-center justify-between">
                                          <div>
                                            <h3 className="text-sm font-bold text-dark-blue-400">Answer</h3>
                                            <p className="mt-1 text-sm font-light text-dark-blue-400">
                                              Provide a detailed, helpful response that fully addresses the question
                                            </p>
                                          </div>
                                          <Button variant="outlined" visual="gray" size="sm">
                                            <Stars02 className="size-[15px]" />
                                            Answer With AI
                                          </Button>
                                        </div>
                                        <Textarea className="mt-2" rows={4} defaultValue={faq.a} maxLength={300} />
                                        <p className="mt-1 text-right text-xs text-gray-500">{faq.a.length}/300</p>
                                      </DisclosureContent>
                                    </AccordionItem>
                                  ))}
                                </Accordion>
                              </RadixTabs.Content>

                              <RadixTabs.Content value="RecentlyAsked" className="focus-visible:outline-none">
                                <Tabs value={recentQTab} onValueChange={setRecentQTab} unanimated>
                                  <TabsList className="justify-start border-b-0 px-0 pt-0 mb-4">
                                    <TabsTrigger value="all">
                                      All
                                      <Badge visual="gray" className="ml-1.5 bg-gray-100 text-[10px] text-gray-500">8</Badge>
                                    </TabsTrigger>
                                    <TabsTrigger value="awaiting">
                                      Awaiting Response
                                      <Badge visual="gray" className="ml-1.5 bg-gray-100 text-[10px] text-gray-500">5</Badge>
                                    </TabsTrigger>
                                    <TabsTrigger value="answered">
                                      Answered
                                      <Badge visual="gray" className="ml-1.5 bg-gray-100 text-[10px] text-gray-500">3</Badge>
                                    </TabsTrigger>
                                  </TabsList>

                                  <TabsContent value="all">
                                    <div className="space-y-3">
                                      <div className="rounded-lg border border-gray-200 bg-white p-4">
                                        <div className="flex items-start justify-between gap-3">
                                          <div className="flex items-start gap-2 min-w-0">
                                            <Check className="size-4 mt-0.5 shrink-0 text-success-500" />
                                            <p className="text-sm font-medium text-dark-blue-400">
                                              What is the expected timeline for this project?
                                            </p>
                                          </div>
                                        </div>
                                        <p className="mt-2 ml-6 text-xs text-gray-500">
                                          Asked by Kevin <span className="text-gray-400">@usernamehere</span> 3 weeks ago
                                        </p>
                                        <div className="mt-3 ml-6 flex items-start gap-2">
                                          <Avatar size="xs">
                                            <AvatarImage src="/man.jpg" alt="Chris" />
                                            <AvatarFallback>C</AvatarFallback>
                                          </Avatar>
                                          <div className="min-w-0">
                                            <p className="text-xs font-medium text-dark-blue-400">
                                              Chris <span className="text-gray-400">@ux23isee</span>
                                            </p>
                                            <p className="mt-1 text-sm font-light text-dark-blue-400">
                                              We typically complete projects within 4-6 weeks depending on scope. We&apos;ll provide a detailed timeline after our initial consultation.
                                            </p>
                                          </div>
                                        </div>
                                        <div className="mt-3 ml-6 flex items-center justify-between">
                                          <div className="flex items-center gap-2">
                                            <span className="text-xs text-gray-500">Hide this question</span>
                                            <Switch />
                                          </div>
                                        </div>
                                      </div>

                                      <div className="rounded-lg border border-gray-200 bg-white p-4">
                                        <div className="flex items-start justify-between gap-3">
                                          <div className="flex items-start gap-2 min-w-0">
                                            <p className="text-sm font-medium text-dark-blue-400">
                                              Can I request changes after the project starts?
                                            </p>
                                          </div>
                                          <IconButton variant="ghost" visual="gray" size="sm" className="rounded-full text-gray-500 hover:text-gray-800">
                                            <Edit03 className="size-4" />
                                          </IconButton>
                                        </div>
                                        <p className="mt-2 text-xs text-gray-500">
                                          Asked by Sarah <span className="text-gray-400">@sarahdesigns</span> 2 weeks ago
                                        </p>
                                      </div>

                                      <div className="rounded-lg border border-gray-200 bg-white p-4">
                                        <div className="flex items-start justify-between gap-3">
                                          <div className="flex items-start gap-2 min-w-0">
                                            <Check className="size-4 mt-0.5 shrink-0 text-success-500" />
                                            <p className="text-sm font-medium text-dark-blue-400">
                                              How do you handle communication during the project?
                                            </p>
                                          </div>
                                        </div>
                                        <p className="mt-2 ml-6 text-xs text-gray-500">
                                          Asked by Alex <span className="text-gray-400">@alexdev</span> 1 week ago
                                        </p>
                                        <div className="mt-3 ml-6 flex items-start gap-2">
                                          <Avatar size="xs">
                                            <AvatarImage src="/man.jpg" alt="Chris" />
                                            <AvatarFallback>C</AvatarFallback>
                                          </Avatar>
                                          <div className="min-w-0">
                                            <p className="text-xs font-medium text-dark-blue-400">
                                              Chris <span className="text-gray-400">@ux23isee</span>
                                            </p>
                                            <p className="mt-1 text-sm font-light text-dark-blue-400">
                                              We use Slack for daily updates and have weekly video calls to review progress. You&apos;ll always know where things stand.
                                            </p>
                                          </div>
                                        </div>
                                        <div className="mt-3 ml-6 flex items-center justify-between">
                                          <div className="flex items-center gap-2">
                                            <span className="text-xs text-gray-500">Hide this question</span>
                                            <Switch />
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  </TabsContent>

                                  <TabsContent value="awaiting">
                                    <div className="space-y-3">
                                      <div className="rounded-lg border border-gray-200 bg-white p-4">
                                        <div className="flex items-start justify-between gap-3">
                                          <p className="text-sm font-medium text-dark-blue-400">
                                            Can I request changes after the project starts?
                                          </p>
                                          <IconButton variant="ghost" visual="gray" size="sm" className="rounded-full text-gray-500 hover:text-gray-800">
                                            <Edit03 className="size-4" />
                                          </IconButton>
                                        </div>
                                        <p className="mt-2 text-xs text-gray-500">
                                          Asked by Sarah <span className="text-gray-400">@sarahdesigns</span> 2 weeks ago
                                        </p>
                                      </div>
                                    </div>
                                  </TabsContent>

                                  <TabsContent value="answered">
                                    <div className="space-y-3">
                                      <div className="rounded-lg border border-gray-200 bg-white p-4">
                                        <div className="flex items-start justify-between gap-3">
                                          <div className="flex items-start gap-2 min-w-0">
                                            <Check className="size-4 mt-0.5 shrink-0 text-success-500" />
                                            <p className="text-sm font-medium text-dark-blue-400">
                                              What is the expected timeline for this project?
                                            </p>
                                          </div>
                                        </div>
                                        <p className="mt-2 ml-6 text-xs text-gray-500">
                                          Asked by Kevin <span className="text-gray-400">@usernamehere</span> 3 weeks ago
                                        </p>
                                        <div className="mt-3 ml-6 flex items-start gap-2">
                                          <Avatar size="xs">
                                            <AvatarImage src="/man.jpg" alt="Chris" />
                                            <AvatarFallback>C</AvatarFallback>
                                          </Avatar>
                                          <div className="min-w-0">
                                            <p className="text-xs font-medium text-dark-blue-400">
                                              Chris <span className="text-gray-400">@ux23isee</span>
                                            </p>
                                            <p className="mt-1 text-sm font-light text-dark-blue-400">
                                              We typically complete projects within 4-6 weeks depending on scope.
                                            </p>
                                          </div>
                                        </div>
                                        <div className="mt-3 ml-6 flex items-center justify-between">
                                          <div className="flex items-center gap-2">
                                            <span className="text-xs text-gray-500">Hide this question</span>
                                            <Switch />
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  </TabsContent>
                                </Tabs>
                              </RadixTabs.Content>
                          </div>

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
                            <Button onClick={() => setQuestionsDialogOpen(false)}>Save</Button>
                          </div>
                          </RadixTabs.Root>
                        </DialogContent>
                      </Dialog>

                      {project.reviewCount > 0 && (
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
                            <TooltipContent>Calculated from your scope tasks</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </span>
                      <div className="mt-2 flex items-baseline gap-x-1.5">
                        <span className="text-[28px] leading-none font-bold text-dark-blue-400">$0</span>
                        <span className="text-sm text-dark-blue-400">per</span>
                        <Badge visual="gray" className="rounded-[5px]">week</Badge>
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
                            <TooltipContent>Total duration based on tasks</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </span>
                      <div className="mt-2">
                        <span className="text-[28px] leading-none font-bold text-dark-blue-400">1 Day</span>
                      </div>
                    </div>
                    <ChartBreakoutCircle className="size-10 text-primary-500" />
                  </div>
                </div>

                <ScopeBuilder embedded />
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
                      $0
                    </span>
                    <span className="text-sm font-medium leading-none text-dark-blue-400">
                      per
                    </span>
                  </div>

                  <div className="ml-1.5">
                    <Listbox defaultValue="week">
                      <ListboxButton
                        className="text-sm lowercase py-[5px] px-[7px] h-max w-auto"
                        iconClassName="ml-1"
                        placeholder="Select"
                      />
                      <ListboxOptions className="w-[153px]">
                        {["week", "2-week", "month", "quarter", "year"].map(
                          (timeline) => (
                            <ListboxOption key={timeline} value={timeline}>
                              {timeline}
                            </ListboxOption>
                          )
                        )}
                      </ListboxOptions>
                    </Listbox>
                  </div>
                </div>

                <IconButton variant="ghost" visual="gray" size="sm" onClick={() => router.push(`/edit-listing/${params.slug}`)}>
                  <Edit03 className="size-4" />
                </IconButton>
              </div>

              <div className="mt-3">
                <span className="inline-block text-sm leading-none font-medium text-dark-blue-400">
                  with an initial payment of $0 to kickoff
                </span>
              </div>

              <div className="flex flex-col items-start gap-y-3 mt-6">
                <span className="inline-block text-xs font-medium text-dark-blue-400">
                  Current Team
                </span>

                <Avatar size="sm" className="border-2 border-white">
                  <AvatarImage src="/woman.jpg" alt="You" />
                  <AvatarFallback>Y</AvatarFallback>
                </Avatar>
              </div>

              <div className="mt-6 space-y-3">
                <div className="flex items-center gap-x-[6.4px]">
                  <Clock className="size-[18px] text-gray-400" />
                  <span className="text-sm leading-none font-medium text-gray-500">
                    Add a scope to see duration
                  </span>
                </div>
                <div className="flex items-center gap-x-[6.4px]">
                  <Users03 className="size-[18px] text-gray-400" />
                  <span className="text-sm leading-none font-medium text-gray-500">
                    Add a scope to see team members
                  </span>
                </div>
              </div>

              <div className="mt-6 flex items-center gap-x-3">
                <Button size="md">
                  Publish
                </Button>
                <Button variant="outlined" visual="gray" size="md" className="flex-auto">
                  <Eye className="size-[15px]" />
                  View as Client
                </Button>
                <IconButton variant="outlined" visual="gray" size="md">
                  <Share06 className="size-[15px]" />
                </IconButton>
              </div>
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
                    title: "Crafting Job Descriptions That Attract Top Talent",
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
    </div>
  )
}
