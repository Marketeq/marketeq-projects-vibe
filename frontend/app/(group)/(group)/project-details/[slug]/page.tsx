"use client"

import * as React from "react"
import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import {
  addFavorite,
  findFavoriteByItemId,
  removeFavorite,
} from "@/src/lib/api/favorites"
import { extractShortIdFromSlug } from "@/src/lib/urlHelpers"
import { cn, noop, toPxIfNumber } from "@/utils/functions"
import { useControllableState, useMakeFixedBehaveSticky } from "@/utils/hooks"
import {
  AlertCircle,
  ArrowLeft,
  Attachment01,
  ChartBreakoutCircle,
  Check,
  CheckCircle,
  ChevronDown,
  Clock,
  FileText,
  Flag,
  HelpCircle,
  Home03,
  Image03,
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
  Smile,
  Star,
  Stars02,
  UploadCloud,
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
import { ChatsContextProvider } from "@/components/chat"
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

export default function ProjectDetails() {
  const params = useParams()
  const router = useRouter()
  const [project, setProject] = React.useState<any>(null)
  const [loading, setLoading] = React.useState(true)
  const [selected, setSelected] = React.useState<string>("Details")
  const [tabsRef, isSticky] = useMakeFixedBehaveSticky<HTMLDivElement>()
  const [isFavorited, setIsFavorited] = React.useState(false)
  const [selectedPeriod, setSelectedPeriod] = React.useState("week")
  const [activeAnchor, setActiveAnchor] = React.useState("Description")
  const [relatedSearches, setRelatedSearches] = React.useState<string[]>([])
  const [recommendedProjects, setRecommendedProjects] = React.useState<any[]>([])
  const [recentlyViewed, setRecentlyViewed] = React.useState<any[]>([])

  // --- Sidebar pricing (docs §01, §14) ---
  const sidebarPricing = React.useMemo(() => {
    if (!project) return null
    const totalCost = Number(project.priceMin ?? project.budget ?? 0)
    const durationStr = (project.duration ?? "") as string
    const durationWeeks = parseInt(durationStr, 10) || 0
    const durationMonths = durationWeeks > 0 ? durationWeeks / 4.33 : 0

    // Cost_Per_Period = Total_Cost ÷ Number_of_Periods
    const costPerWeek = durationWeeks > 0 ? Math.round(totalCost / durationWeeks) : 0
    const costPerBiweek = durationWeeks > 0 ? Math.round(totalCost / (durationWeeks / 2)) : 0
    const costPerMonth = durationMonths > 0 ? Math.round(totalCost / durationMonths) : 0
    const costPerQuarter = durationMonths >= 3 ? Math.round(totalCost / (durationMonths / 3)) : 0
    const costPerYear = durationMonths >= 12 ? Math.round(totalCost / (durationMonths / 12)) : 0

    const periodOptions = [
      { label: "week", value: "week", cost: costPerWeek },
      { label: "2 weeks", value: "2 weeks", cost: costPerBiweek },
      { label: "month", value: "month", cost: costPerMonth },
      ...(costPerQuarter > 0 ? [{ label: "quarter", value: "quarter", cost: costPerQuarter }] : []),
      ...(costPerYear > 0 ? [{ label: "year", value: "year", cost: costPerYear }] : []),
    ]

    // Minimum team members = unique roles from scope (docs §01 L88-91)
    const scopeArr = Array.isArray(project.scope) ? project.scope : []
    const uniqueRoles = new Set(
      scopeArr.flatMap((phase: any) =>
        (phase.tasks ?? []).map((t: any) => t.roleName).filter(Boolean)
      )
    )

    // Duration display (docs §01 L98-104): <7d → days, <4w → weeks, else → months (rounded up)
    const durationDays = durationWeeks * 7
    let formattedDuration = ""
    if (durationDays > 0 && durationDays < 7) {
      formattedDuration = `${durationDays} day`
    } else if (durationWeeks > 0 && durationWeeks < 4) {
      formattedDuration = `${durationWeeks} week`
    } else if (durationWeeks >= 4) {
      const months = Math.ceil(durationWeeks / 4.33)
      formattedDuration = `${months} month`
    }

    return { totalCost, periodOptions, minTeamMembers: uniqueRoles.size, formattedDuration }
  }, [project])


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
          // Try as a service
          const svcRes = await fetch(`${apiBase}/v1/services/slug/${slug}`)
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
                  if (d.media) {
                    const mediaObj = Array.isArray(d.media)
                      ? d.media[0]
                      : d.media
                    if (mediaObj?.featuredImage)
                      featuredImage = mediaObj.featuredImage
                  }
                  setProject({
                    ...d,
                    role:
                      d.category || d.categories?.[0] || "Software Development",
                    summary: d.shortDescription || d.fullDescription || "",
                    description: d.fullDescription || "",
                    featuredImage: featuredImage || d.featuredImage || null,
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

  // Fetch related data + track view when project loads
  React.useEffect(() => {
    if (!project?.id) return
    const apiBase = getPublicApiUrl() || "http://localhost:4000"

    // Related searches from project metadata
    fetch(`${apiBase}/v1/projects/${project.id}/related-searches`)
      .then((r) => r.ok ? r.json() : [])
      .then(setRelatedSearches)
      .catch(() => {})

    // Recommended projects (JWT required — best effort)
    fetch(`${apiBase}/v1/recently-viewed/recommended`, { credentials: "include" })
      .then((r) => r.ok ? r.json() : [])
      .then(setRecommendedProjects)
      .catch(() => {})

    // Recently viewed (JWT required — best effort)
    fetch(`${apiBase}/v1/recently-viewed`, { credentials: "include" })
      .then((r) => r.ok ? r.json() : [])
      .then(setRecentlyViewed)
      .catch(() => {})

    // Track this view (fire and forget)
    fetch(`${apiBase}/v1/recently-viewed/${project.id}`, {
      method: "POST",
      credentials: "include",
    }).catch(() => {})
  }, [project?.id])

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
        <div className="max-w-[1240px]">
          {/* breadcrumb */}
          <div className="flex items-center gap-x-3">
            <Shimmer className="h-3 w-3 rounded-full" />
            <Shimmer className="h-3 w-16" />
            <Shimmer className="h-3 w-24" />
            <Shimmer className="h-3 w-32" />
          </div>
          <div className="flex items-start gap-x-8 mt-8">
            <div className="max-w-[818px] flex-auto space-y-6">
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
            <Button onClick={() => router.push("/projects")}>
              Browse projects
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="px-[100px] relative bg-white">
      <div className="max-w-[1240px] flex items-start gap-x-8">
        <div className="max-w-[818px] flex-auto">
          <div className="after:content-[''] after:absolute after:inset-x-0 after:border-b after:border-gray-200">
            <div className="relative pt-6 pb-[50px]">
              <div className="absolute w-screen -translate-x-[100px] top-0 bottom-px bg-gray-50" />

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
                <p className="text-sm font-extralight text-dark-blue-400">
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
                    const video =
                      (project.videoUrl as string | undefined) ||
                      (project.featuredVideo as string | undefined)
                    const gallery =
                      (project.mediaUrls as string[] | undefined)?.slice(1) ??
                      []
                    if (!video && gallery.length === 0) {
                      return Array.from({ length: 5 }).map((_, index) => (
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
                    }
                    const items: React.ReactNode[] = []
                    if (video) {
                      items.push(
                        <CarouselItem key="video" className="group basis-1/3">
                          <div className="relative border border-gray-200 h-[150.6px] overflow-hidden rounded-lg bg-black">
                            <iframe
                              src={toEmbedUrl(video)}
                              className="absolute inset-0 h-full w-full"
                              allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
                              allowFullScreen
                              title="Project video"
                            />
                          </div>
                        </CarouselItem>
                      )
                    }
                    gallery.forEach((url, index) => {
                      items.push(
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
                      )
                    })
                    return items
                  })()}
                </CarouselContent>

                <CarouselPreviousTrigger />
                <CarouselNextTrigger />
              </Carousel>

              <div className="mt-6">
                <Tabs
                  className="group/tabs"
                  value={activeAnchor}
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
                      <ShowMoreLessRoot>
                        {({ isShowing, setIsShowing, scrollHeight }) => (
                          <div
                            className={cn(
                              "relative border border-gray-200 bg-white rounded-lg p-6 shadow-[0px_1px_5px_0px_rgba(16,24,40,.02)] transition-[height] duration-300 overflow-hidden [interpolate-size:allow-keywords]",
                              scrollHeight > 506 && !isShowing ? "h-[506px]" : "h-auto"
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

                            {scrollHeight > 506 && (
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
                        )}
                      </ShowMoreLessRoot>

                      <ShowMoreLessRoot>
                        {({ isShowing, setIsShowing, scrollHeight }) => (
                          <div
                            className={cn(
                              "relative border border-gray-200 bg-white rounded-lg p-6 shadow-[0px_1px_5px_0px_rgba(16,24,40,.02)] mt-6 transition-[height] duration-300 overflow-hidden [interpolate-size:allow-keywords]",
                              scrollHeight > 456 && !isShowing ? "h-[456px]" : "h-auto"
                            )}
                          >
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

                            {scrollHeight > 456 && (
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
                        )}
                      </ShowMoreLessRoot>

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

                      <div id="section-how-it-works" className="scroll-mt-[120px]" />
                      <ProjectDetailsStepsSection
                        steps={projectStaticContent.howItWorks.steps}
                      />

                      <div id="section-questions" className="relative p-6 mt-6 border gap-x-[50px] rounded-lg border-gray-200 bg-white shadow-[0px_1px_5px_0px_rgba(16,24,40,.02)] scroll-mt-[120px]">
                        <h1 className="text-xl font-bold leading-none text-dark-blue-400">
                          Questions
                        </h1>

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
                              {!project.recentQuestions ||
                              project.recentQuestions.length === 0 ? (
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

                          <div className="py-8 px-6 bg-gray-50 border mt-8 border-gray-200 rounded-lg">
                            <h1 className="text-base font-semibold text-dark-blue-400 text-center">
                              Can’t find what you’re looking for?
                            </h1>

                            <div className="flex items-center justify-center mt-5">
                              <Button variant="outlined" visual="gray">
                                Ask a question
                              </Button>
                            </div>
                          </div>
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
                  }
                  type ScopePhase = {
                    phaseName: string
                    order: number
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
                  // Accumulate day ranges across phases so later phases
                  // start on day (prev end + 1).
                  let cursor = 1
                  const withDays = phases.map((phase) => {
                    const phaseHours = (phase.tasks ?? []).reduce(
                      (sum, t) => sum + (t.estimatedHours || 0),
                      0
                    )
                    const days = Math.max(1, Math.ceil(phaseHours / 8))
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
                            <div className="flex items-center justify-between gap-x-4 px-3 py-3">
                              <div className="inline-flex items-center gap-x-3.5">
                                <AccordionTrigger className="focus-visible:outline-none size-8 inline-flex items-center justify-center">
                                  <ChevronDown className="size-5 shrink-0 text-gray-500 group-data-[state=open]/item:-rotate-180 transition duration-300" />
                                </AccordionTrigger>

                                <span className="text-base md:text-[18px] font-semibold leading-7 text-gray-900">
                                  {phaseLabels[pi] ?? `Phase ${pi + 1}`}{" "}
                                  <span className="font-light">
                                    {phase.phaseName}
                                  </span>
                                </span>
                              </div>

                              <div className="inline-flex items-center gap-x-2 md:pl-0 pl-10">
                                <span className="text-xs leading-[14.52px] md:text-[13px] md:leading-[15.73px] text-dark-blue-400 font-semibold">
                                  Day {start}
                                </span>
                                <span className="text-xs leading-[14.52px] md:text-[13px] md:leading-[15.73px] text-dark-blue-400 font-semibold">
                                  -
                                </span>
                                <span className="text-xs leading-[14.52px] md:text-[13px] md:leading-[15.73px] text-dark-blue-400 font-semibold">
                                  Day {end}
                                </span>
                              </div>
                            </div>

                            <DisclosureContent>
                              <Table>
                                <TableHeader className="bg-gray-50">
                                  <TableRow className="hover:bg-transparent">
                                    <TableHead>Task</TableHead>
                                    <TableHead>Role</TableHead>
                                    <TableHead>Location</TableHead>
                                    <TableHead>Experience</TableHead>
                                    <TableHead>Duration</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {(phase.tasks ?? []).map((task, ti) => (
                                    <TableRow key={`task-${pi}-${ti}`}>
                                      <TableCell className="py-4 px-6">
                                        <span className="text-sm text-nowrap font-semibold text-dark-blue-400">
                                          {task.title}
                                        </span>
                                      </TableCell>
                                      <TableCell className="py-4 px-6">
                                        <span className="text-sm font-extralight line-clamp-2 text-dark-blue-400">
                                          {task.roleName}
                                        </span>
                                      </TableCell>
                                      <TableCell className="py-4 px-6">
                                        <span className="text-sm font-extralight text-dark-blue-400">
                                          {task.location ? (
                                            <span className="inline-flex items-center gap-x-2">
                                              {locationToFlag(task.location) ? (
                                                <span aria-hidden="true">
                                                  {locationToFlag(
                                                    task.location
                                                  )}
                                                </span>
                                              ) : null}
                                              <span>{task.location}</span>
                                            </span>
                                          ) : (
                                            "-"
                                          )}
                                        </span>
                                      </TableCell>
                                      <TableCell className="py-4 px-6">
                                        <Badge
                                          className="rounded-[4px] bg-primary-50"
                                          visual="primary"
                                        >
                                          {task.experienceLevel}
                                        </Badge>
                                      </TableCell>
                                      <TableCell className="py-4 px-6">
                                        <span className="text-sm text-nowrap line-clamp-2 text-dark-blue-400">
                                          {task.estimatedHours} hours
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

                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <AvatarGroup size="sm" excess>
                        {(Array.isArray(project.team) && project.team.length > 0
                          ? project.team
                          : [
                              { firstName: "T", avatarUrl: "/woman.jpg" },
                              { firstName: "T", avatarUrl: "/woman.jpg" },
                              { firstName: "T", avatarUrl: "/woman.jpg" },
                            ]
                        ).map((m: any, i: number) => (
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
                          {(Array.isArray(project.team) &&
                          project.team.length > 0
                            ? project.team
                            : [
                                {
                                  firstName: "Sevil",
                                  username: "designsuperstar23",
                                  location: null,
                                  skills: ["Full-stack Developer"],
                                },
                                {
                                  firstName: "Sevil",
                                  username: "designsuperstar23",
                                  location: null,
                                  skills: ["Full-stack Developer"],
                                },
                              ]
                          ).map((m: any, i: number) => (
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
                                    {m.location ||
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
              </div>

              <div className="mt-6 space-y-3">
                <div className="flex items-center gap-x-[6.4px]">
                  <Clock className="size-[18px] text-primary-500" />
                  <span className="text-sm leading-none font-medium text-dark-blue-400">
                    {sidebarPricing?.formattedDuration
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

              <Dialog>
                <DialogTrigger asChild>
                  <Button
                    size="lg"
                    className="mt-6 w-full border-2 border-primary-500 text-primary-500 hover:bg-primary-500 hover:text-white"
                    variant="outlined"
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

            <div className="h-[50px] rounded-b-lg bg-gray-50 flex items-center justify-evenly">
              {project.reportButtonEnabled !== false && (
                <div className="inline-flex items-center gap-x-2">
                  <Flag className="size-[15px] text-gray-500" />
                  <span className="text-sm font-extralight leading-5 text-gray-500 hover:underline cursor-pointer">
                    Report
                  </span>
                </div>
              )}

              {project.helpButtonEnabled === true && (
                <div className="inline-flex items-center gap-x-2">
                  <HelpCircle className="size-[15px] text-gray-500" />
                  <span className="text-sm font-extralight leading-5 text-gray-500 hover:underline cursor-pointer">
                    Help
                  </span>
                </div>
              )}

              {project.shareButtonEnabled !== false && (
                <div className="inline-flex items-center gap-x-2">
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

      {/* Similar Projects — full-width section */}
      <div className="-mx-[100px] px-[100px] pt-[100px] pb-[50px] bg-gray-50 border-t border-gray-200">
        <div>
          <div className="space-y-6">
            <div className="flex items-end justify-between">
              <div className="space-y-2">
                <h1 className="text-[28px] leading-none text-dark-blue-400 font-bold">
                  Similar Projects
                </h1>

                <p className="text-lg font-light text-dark-blue-400 leading-none">
                  Users who have viewed this project have also expressed
                  interest in these as well
                </p>
              </div>

              <Button
                variant="link"
                visual="gray"
                size="lg"
                className="underline"
              >
                View More
              </Button>
            </div>

            <div className="gap-5 grid grid-cols-4">
              {(project?.similarProjects ?? []).slice(0, 4).map((sp: any) => (
                <article
                  key={sp.id}
                  className="p-5 bg-white border rounded-lg border-gray-200 shadow-[0px_1px_5px_0px_rgba(16,24,40,.02)]"
                >
                  <div className="h-[169px] rounded-[6px] overflow-hidden bg-white relative group border border-black/15">
                    <NextLink href={`/project-details/${sp.slug}`}>
                      <NextImage
                        className="object-cover group-hover:scale-150 transition [transition-duration:3000ms]"
                        src={sp.thumbnail || "/dashboard.png"}
                        alt={sp.title}
                        fill
                        sizes="33vw"
                      />
                    </NextLink>
                  </div>

                  <div className="mt-3 flex items-start gap-x-3">
                    <NextLink
                      href={`/project-details/${sp.slug}`}
                      className="focus-visible:outline-none font-bold flex-auto text-base leading-none text-dark-blue-400 hover:underline"
                    >
                      {sp.title}
                    </NextLink>

                    <div className="inline-flex items-center gap-x-1">
                      <Star className="size-[15px] text-primary-500 fill-primary-500" />
                      <span className="inline-flex items-center gap-x-1 text-sm leading-none text-dark-blue-400 font-medium">
                        4.9 <span className="font-extralight">(5)</span>
                      </span>
                    </div>
                  </div>

                  <p className="mt-3 text-sm leading-none font-extralight text-dark-blue-400">
                    Brief Description of the project. Lorem ipsum dolor sit
                    amet, consectetur adipiscing elit, sed do eiusmod tempor
                    incididunt.
                  </p>

                  <div className="mt-[14.5px] flex flex-col gap-y-3">
                    <div className="flex items-center gap-x-[6.4px]">
                      <Clock className="size-[18px] shrink-0 text-primary-500" />

                      <span className="font-medium text-sm leading-none text-dark-blue-400">
                        Starting from 12 weeks
                      </span>
                    </div>

                    <div className="flex items-center gap-x-[6.4px]">
                      <Money className="size-[18px] shrink-0 text-primary-500" />

                      <span className="font-medium text-sm leading-none text-dark-blue-400">
                        $50,000 budget
                      </span>
                    </div>
                  </div>

                  <div className="mt-5 flex items-end justify-between">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <AvatarGroup
                            max={5}
                            size="sm"
                            excess
                            excessClassName="border-gray-300 text-gray-500"
                          >
                            {Array.from({ length: 6 }).map((_, i) => (
                              <Avatar
                                key={i}
                                size="sm"
                                className="border-2 border-white hover:ring-0 active:ring-0"
                              >
                                <AvatarImage src="/woman.jpg" alt="Woman" />
                                <AvatarFallback>W</AvatarFallback>
                              </Avatar>
                            ))}
                          </AvatarGroup>
                        </TooltipTrigger>

                        <TooltipContent
                          className="p-0 max-w-[262px]"
                          size="md"
                        >
                          <ScrollArea
                            className="h-[192px] p-3"
                            scrollBar={
                              <ScrollBar
                                className="w-4 p-1"
                                thumbClassName="bg-white/20"
                              />
                            }
                          >
                            <div className="space-y-3 pr-5">
                              {Array.from({ length: 4 }).map((_, i) => (
                                <div key={i} className="flex items-center gap-x-[18px]">
                                  <div className="flex items-center gap-x-2 flex-auto">
                                    <Avatar>
                                      <AvatarImage
                                        src="/woman.jpg"
                                        alt="Woman"
                                      />
                                      <AvatarFallback>W</AvatarFallback>
                                    </Avatar>

                                    <div className="flex flex-col flex-auto">
                                      <div className="flex items-center gap-x-0.5">
                                        <span className="text-xs leading-5 font-semibold text-white">
                                          Sevil
                                        </span>
                                        <span className="text-[10px] leading-none font-light text-white">
                                          @designsuperstar23
                                        </span>
                                      </div>
                                      <span className="text-[10px] font-light text-white">
                                        Full-stack Developer
                                      </span>
                                    </div>
                                  </div>

                                  <span className="text-sm font-semibold text-white leading-5">
                                    $75{" "}
                                    <span className="text-[10px] font-light leading-5">
                                      /hr
                                    </span>
                                  </span>
                                </div>
                              ))}
                            </div>
                          </ScrollArea>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>

                    <FavoriteRoot>
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
                </article>
              ))}
            </div>
          </div>

          {/* Recommended Projects */}
          <div className="space-y-6 mt-[50px]">
            <div className="flex items-end justify-between">
              <div className="space-y-2">
                <h1 className="text-[28px] leading-none text-dark-blue-400 font-bold">
                  Recommended Projects
                </h1>

                <p className="text-lg font-light text-dark-blue-400 leading-none">
                  These projects are recommended based on your recent searches
                  and browsing history
                </p>
              </div>

              <Button
                variant="link"
                visual="gray"
                size="lg"
                className="underline"
              >
                View More
              </Button>
            </div>

            <div className="gap-5 grid grid-cols-4">
              {recommendedProjects.slice(0, 4).map((rp: any) => (
                <article
                  key={rp.id}
                  className="p-5 bg-white border rounded-lg border-gray-200 shadow-[0px_1px_5px_0px_rgba(16,24,40,.02)]"
                >
                  <div className="h-[169px] rounded-[6px] overflow-hidden bg-white relative group border border-black/15">
                    <NextLink href={`/project-details/${rp.slug}`}>
                      <NextImage
                        className="object-cover group-hover:scale-150 transition [transition-duration:3000ms]"
                        src={rp.thumbnail || "/dashboard.png"}
                        alt={rp.title}
                        fill
                        sizes="33vw"
                      />
                    </NextLink>
                  </div>

                  <div className="mt-3 flex items-start gap-x-3">
                    <NextLink
                      href={`/project-details/${rp.slug}`}
                      className="focus-visible:outline-none font-bold flex-auto text-base leading-none text-dark-blue-400 hover:underline"
                    >
                      {rp.title}
                    </NextLink>

                    <div className="inline-flex items-center gap-x-1">
                      <Star className="size-[15px] text-primary-500 fill-primary-500" />
                      <span className="inline-flex items-center gap-x-1 text-sm leading-none text-dark-blue-400 font-medium">
                        4.9 <span className="font-extralight">(5)</span>
                      </span>
                    </div>
                  </div>

                  <p className="mt-3 text-sm leading-none font-extralight text-dark-blue-400">
                    Brief Description of the project. Lorem ipsum dolor sit
                    amet, consectetur adipiscing elit, sed do eiusmod tempor
                    incididunt.
                  </p>

                  <div className="mt-[14.5px] flex flex-col gap-y-3">
                    <div className="flex items-center gap-x-[6.4px]">
                      <Clock className="size-[18px] shrink-0 text-primary-500" />

                      <span className="font-medium text-sm leading-none text-dark-blue-400">
                        Starting from 12 weeks
                      </span>
                    </div>

                    <div className="flex items-center gap-x-[6.4px]">
                      <Money className="size-[18px] shrink-0 text-primary-500" />

                      <span className="font-medium text-sm leading-none text-dark-blue-400">
                        $50,000 budget
                      </span>
                    </div>
                  </div>

                  <div className="mt-5 flex items-end justify-between">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <AvatarGroup
                            max={5}
                            size="sm"
                            excess
                            excessClassName="border-gray-300 text-gray-500"
                          >
                            {Array.from({ length: 6 }).map((_, i) => (
                              <Avatar
                                key={i}
                                size="sm"
                                className="border-2 border-white hover:ring-0 active:ring-0"
                              >
                                <AvatarImage src="/woman.jpg" alt="Woman" />
                                <AvatarFallback>W</AvatarFallback>
                              </Avatar>
                            ))}
                          </AvatarGroup>
                        </TooltipTrigger>

                        <TooltipContent
                          className="p-0 max-w-[262px]"
                          size="md"
                        >
                          <ScrollArea
                            className="h-[192px] p-3"
                            scrollBar={
                              <ScrollBar
                                className="w-4 p-1"
                                thumbClassName="bg-white/20"
                              />
                            }
                          >
                            <div className="space-y-3 pr-5">
                              {Array.from({ length: 4 }).map((_, i) => (
                                <div key={i} className="flex items-center gap-x-[18px]">
                                  <div className="flex items-center gap-x-2 flex-auto">
                                    <Avatar>
                                      <AvatarImage
                                        src="/woman.jpg"
                                        alt="Woman"
                                      />
                                      <AvatarFallback>W</AvatarFallback>
                                    </Avatar>

                                    <div className="flex flex-col flex-auto">
                                      <div className="flex items-center gap-x-0.5">
                                        <span className="text-xs leading-5 font-semibold text-white">
                                          Sevil
                                        </span>
                                        <span className="text-[10px] leading-none font-light text-white">
                                          @designsuperstar23
                                        </span>
                                      </div>
                                      <span className="text-[10px] font-light text-white">
                                        Full-stack Developer
                                      </span>
                                    </div>
                                  </div>

                                  <span className="text-sm font-semibold text-white leading-5">
                                    $75{" "}
                                    <span className="text-[10px] font-light leading-5">
                                      /hr
                                    </span>
                                  </span>
                                </div>
                              ))}
                            </div>
                          </ScrollArea>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>

                    <FavoriteRoot>
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
                </article>
              ))}
            </div>
          </div>

          {/* More Ways to Explore */}
          <div className="mt-[50px]">
            <h1 className="text-[28px] font-bold leading-none text-dark-blue-400">
              More Ways to Explore
            </h1>

            <Tabs className="mt-5" defaultValue="Related Categories">
              <RadixTabs.List className="flex items-center gap-x-3">
                <TabsTrigger
                  variant="unstyled"
                  className="focus-visible:outline-none py-[7px] bg-white hover:bg-gray-50 hover:border-gray-400 px-3.5 border-2 border-gray-300 data-[state=active]:text-dark-blue-400 data-[state=active]:bg-white hover:data-[state=active]:bg-white data-[state=active]:border-dark-blue-400 hover:data-[state=active]:text-dark-blue-400 hover:data-[state=active]:border-dark-blue-400  text-gray-500 hover:text-gray-600 rounded-full text-sm leading-5 font-medium transition duration-300"
                  value="Related Categories"
                  showUnderline={false}
                >
                  Related Categories
                </TabsTrigger>
                <TabsTrigger
                  variant="unstyled"
                  className="focus-visible:outline-none py-[7px] bg-white hover:bg-gray-50 hover:border-gray-400 px-3.5 border-2 border-gray-300 data-[state=active]:text-dark-blue-400 data-[state=active]:bg-white hover:data-[state=active]:bg-white data-[state=active]:border-dark-blue-400 hover:data-[state=active]:text-dark-blue-400 hover:data-[state=active]:border-dark-blue-400  text-gray-500 hover:text-gray-600 rounded-full text-sm leading-5 font-medium transition duration-300"
                  value="Related Skills"
                  showUnderline={false}
                >
                  Related Skills
                </TabsTrigger>
              </RadixTabs.List>

              <TabsContent value="Related Categories">
                <div className="mt-5 py-5 flex items-start justify-between">
                  {(() => {
                    const cats = project?.relatedCategories ?? []
                    const allCats = [...(project?.categories ?? []), ...cats]
                    const unique = Array.from(new Set(allCats)).filter(Boolean)
                    // Split into 4 columns
                    const colSize = Math.max(Math.ceil(unique.length / 4), 2)
                    const columns = [0, 1, 2, 3].map(i => unique.slice(i * colSize, (i + 1) * colSize))
                    const headers = [
                      project?.category ?? "Categories",
                      ...(project?.subcategories?.slice(0, 3) ?? ["Subcategories", "Related", "More"])
                    ]
                    return columns.map((col, ci) => (
                      <div key={ci} className="flex flex-col gap-y-3 items-start">
                        <h2 className="text-lg leading-none font-bold text-dark-blue-400">
                          {headers[ci] ?? "Categories"}
                        </h2>
                        {col.map((cat: string, i: number) => (
                          <Button key={i} variant="link" className="text-dark-blue-400">
                            {cat}
                          </Button>
                        ))}
                      </div>
                    ))
                  })()}
                </div>
              </TabsContent>

              <TabsContent value="Related Skills">
                <div className="mt-5 py-5 flex items-start justify-between">
                  {(() => {
                    const skills = project?.relatedSkills ?? []
                    const allSkills = [
                      ...(project?.skills ?? []),
                      ...(project?.programmingLanguages ?? []),
                      ...(project?.developmentTech ?? []),
                      ...skills,
                    ]
                    const unique = Array.from(new Set(allSkills)).filter(Boolean)
                    const colSize = Math.max(Math.ceil(unique.length / 4), 2)
                    const columns = [0, 1, 2, 3].map(i => unique.slice(i * colSize, (i + 1) * colSize))
                    const headers = ["Skills", "Technologies", "Tools", "More"]
                    return columns.map((col, ci) => (
                      <div key={ci} className="flex flex-col gap-y-3 items-start">
                        <h2 className="text-lg leading-none font-bold text-dark-blue-400">
                          {headers[ci]}
                        </h2>
                        {col.map((skill: string, i: number) => (
                          <Button key={i} variant="link" className="text-dark-blue-400">
                            {skill}
                          </Button>
                        ))}
                      </div>
                    ))
                  })()}
                </div>
              </TabsContent>
            </Tabs>
          </div>

          {/* Related Searches */}
          <div className="mt-[50px]">
            <h1 className="text-[28px] leading-none font-bold text-dark-blue-400">
              Related Searches
            </h1>

            <div className="mt-6 flex flex-wrap gap-3">
              {relatedSearches.map((label, i) => (
                <Badge
                  key={i}
                  className="h-auto py-[4.6px] px-[13.81px] border-[1.5px] border-gray-300"
                  visual="gray"
                  size="lg"
                >
                  {label}
                </Badge>
              ))}
            </div>
          </div>
        </div>

        {/* Recently Viewed — show only when grid is full (9 items) */}
        {recentlyViewed.length >= 9 && (
        <div className="max-w-[1240px] mx-auto py-[35px]">
          <div className="flex items-center justify-between">
            <h1 className="text-[24px] leading-none text-dark-blue-400 font-bold">
              Recently Viewed
            </h1>

            <Button variant="link" visual="gray">
              View All
            </Button>
          </div>

          <div className="mt-[29px] grid grid-cols-3 gap-x-[42px] gap-y-10">
            {recentlyViewed.map((rv: any) => (
              <NextLink key={rv.id} href={`/project-details/${rv.slug}`}>
                <article className="flex items-start gap-x-6">
                  <div className="relative size-[100px] overflow-hidden rounded-lg shrink-0">
                    <NextImage
                      className="object-cover"
                      src={rv.thumbnail || "/dashboard.png"}
                      alt={rv.title}
                      sizes="25vw"
                      fill
                    />
                  </div>

                  <div className="pr-[45.54px]">
                    <h1 className="cursor-pointer hover:underline transition duration-300 text-base font-bold leading-none line-clamp-2 text-dark-blue-400">
                      {rv.title}
                    </h1>

                    {rv.shortDescription && (
                    <p className="mt-2 text-sm font-light text-dark-blue-400 line-clamp-2">
                      {rv.shortDescription}
                    </p>
                    )}

                    <div className="mt-3 flex items-center gap-x-3">
                      {rv.budget != null && (
                      <span className="text-sm font-medium leading-none text-dark-blue-400">
                        Starting at ${Number(rv.budget).toLocaleString()}
                      </span>
                      )}

                      {rv.budget != null && rv.duration && (
                      <span className="inline-block shrink-0 rounded-full size-1 bg-gray-300" />
                      )}

                      {rv.duration && (
                      <span className="text-sm font-medium leading-none text-dark-blue-400">
                        {rv.duration}
                      </span>
                      )}
                    </div>
                  </div>
                </article>
              </NextLink>
            ))}
          </div>
        </div>
        )}

      </div>

      {/* Ready to Work CTA */}
      <div className="-mx-[100px] px-[100px] py-[70px] bg-gray-50">
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

    </div>
  )
}
