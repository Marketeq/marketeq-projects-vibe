"use client"

import { use, useEffect, useRef, useState } from "react"
import { useSearchParams } from "next/navigation"
import {
  fetchNdaPreview,
  fetchNdaStatus,
  fetchNdaAudit,
  submitNdaSign,
  generateNda,
  type LegalServiceError,
} from "@/src/lib/api/legal-service"
import { useAuth } from "@/contexts/auth"
import { useApplyGate } from "@/utils/useApplyGate"
import {
  ArrowLeft,
  Check,
  ChevronDown,
  ChevronRight,
  Edit03,
  HelpCircle,
  Home03,
  MarkerPin02,
  Share06,
  Star,
  Type02,
  UploadCloud,
  X,
} from "@blend-metrics/icons"
import NextLink from "@/components/next-link"
import { ProtectedLock } from "@/components/icons/protected-lock"
import { SaveButton } from "@/components/talent-profile-comps"
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  Accordion,
  AccordionItem,
  AccordionTrigger,
  Badge,
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  Button,
  Checkbox,
  DisclosureContent,
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
  IconButton,
  Input,
  Label,
  Progress,
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
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui"

const job = {
  title: "UX Designer",
  subtitle: "The Ultimate Mobile App Experience",
  posted: "2 days ago",
  type: "Full time job",
  category: "Mobile Application",
  workSchedule: "Full-Time 40 hrs/wk",
  duration: "6 months",
  startDate: "Jan 30th, 2025",
  offerRate: 67,
  earnings: "$6,777",
  skills: [
    "Visual Design",
    "Tailwind CSS",
    "Next.js",
    "Wireframing",
    "Figma",
    "Azure RP",
  ],
  overview: [
    "Front-end Technologies & Web Accessibility | Exploring Human Interface Design",
    "In passionate about crafting intuitive, user-friendly digital experiences with a strong focus on accessibility and human-centered design. With expertise in HTML, CSS, JavaScript, and modern frameworks, I create seamless interfaces that enhance usability for all users, including those with disabilities. I believe technology should be inclusive, aesthetically engaging, and functionally efficient.",
    "I'm always exploring the latest trends in UI/UX and human interface design to ensure that every project balances innovation with practicality. Whether it's optimizing website performance, implementing responsive design, or improving accessibility compliance, I take a detail-oriented approach to building digital products that truly connect with users. I thrive on solving complex design challenges and turning ideas into meaningful, interactive experiences.",
  ],
  responsibilities: [
    "Main Bullet Point 1: Sed ut perspiciatis unde omnis iste natus",
    "Main Bullet Point 2: error sit voluptatem accusantium doloremque laudantium, totam rem aperiam",
    "Main Bullet Point 3: eaque ipsa quae ab illo inventore veritatis et quasi architecto beatae vitae dicta sunt explicabo.",
    "Main Number Point 1: Sed ut perspiciatis unde omnis iste natus",
    "Main Number Point 2: error sit voluptatem accusantium doloremque laudantium, totam rem aperiam",
    "Main Number Point 3: eaque ipsa quae ab illo inventore veritatis et quasi architecto beatae vitae dicta sunt explicabo.",
  ],
  benefits: [
    "Sed ut perspiciatis unde omnis iste natus",
    "error sit voluptatem accusantium doloremque laudantium, totam rem aperiam",
    "eaque ipsa quae ab illo inventore veritatis et quasi architecto beatae vitae dicta sunt explicabo.",
  ],
}

type JobDetailsHeroVariant = "default" | "legal-service-nda"

const marketplaceScopePhases = [
  {
    id: "phase-1",
    phaseLabel: "Phase One",
    phaseName: "Research",
    startDay: 1,
    endDay: 8,
    tasks: Array.from({ length: 4 }, () => ({
      task: "Consumer Research",
      description:
        "Conduct research to understand consumer needs, behaviors, and preferences for product optimization.",
      assignee: "Christopher",
      handle: "@topdesigner321",
      avatar: "/man.jpg",
      duration: "40 hours",
    })),
  },
  {
    id: "phase-2",
    phaseLabel: "Phase Two",
    phaseName: "Design",
    startDay: 9,
    endDay: 24,
    tasks: Array.from({ length: 4 }, () => ({
      task: "Consumer Research",
      description:
        "Conduct research to understand consumer needs, behaviors, and preferences for product optimization.",
      assignee: "Christopher",
      handle: "@topdesigner321",
      avatar: "/man.jpg",
      duration: "40 hours",
    })),
  },
  {
    id: "phase-3",
    phaseLabel: "Phase Three",
    phaseName: "Front-End",
    startDay: 25,
    endDay: 48,
    tasks: Array.from({ length: 4 }, () => ({
      task: "Consumer Research",
      description:
        "Conduct research to understand consumer needs, behaviors, and preferences for product optimization.",
      assignee: "Christopher",
      handle: "@topdesigner321",
      avatar: "/man.jpg",
      duration: "40 hours",
    })),
  },
]

const teamMembers = [
  {
    name: "Harry Torres",
    role: "Product Lead",
    avatar: "/woman.jpg",
  },
  {
    name: "Amy Stewart",
    role: "Research",
    avatar: "/woman.jpg",
  },
  {
    name: "Jordan Miles",
    role: "Engineering",
    avatar: "/woman.jpg",
  },
]

const ndaClient = {
  name: "Bitcoin Master Devs",
  location: "Moscow, Russia",
  about:
    "Lorem ipsum dolor sit amet consectetur. Eget mauris elit morbi tellus morbi.",
  openProjects: "101",
  memberSince: "Sep 2024",
  avatar: "/money-dollar-coin.svg",
}

const marketplaceTeamRequirements = [
  {
    role: "Solutions Architect",
    level: "Senior Level",
    locations: ["🇺🇸 USA", "🇨🇴 Colombia", "2 more..."],
    applicants: "307 applications",
    status: "Open",
  },
  {
    role: "SEO Manager",
    level: "Senior Level",
    locations: ["🇺🇸 USA"],
    applicants: "55 applications",
    status: "5 spots available",
  },
  {
    role: "Cloud Services Developer",
    level: "Senior Level",
    locations: ["🇺🇸 USA", "🇨🇴 Colombia", "2 more..."],
    applicants: "23 applications",
    status: "Closed",
  },
  {
    role: "IT Coordinator",
    level: "Senior Level",
    locations: ["🇵🇰 Pakistan"],
    applicants: "153 applications",
    status: "Open",
  },
  {
    role: "Devops Manager",
    level: "Senior Level",
    locations: ["🇮🇳 India"],
    applicants: "12 applications",
    status: "1 spot available",
  },
  {
    role: "Cyber Security Analyst",
    level: "Senior Level",
    locations: ["🇺🇸 USA", "🇨🇴 Colombia", "1 more..."],
    applicants: "5 applications",
    status: "Closed",
  },
  {
    role: "Senior Systems Analyst",
    level: "Senior Level",
    locations: ["🇺🇸 USA", "🇨🇴 Colombia"],
    applicants: "24 applications",
    status: "1 spot available",
  },
]

const titleizeSlug = (value: string) =>
  value
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ")

/**
 * Test NDA document ID — generated with a real unsigned PDF in R2.
 * Created with clientUserId=33333333-3333-4333-a333-333333333333 (clientA seed user).
 * TODO: replace with real ndaDocumentId from listing payload
 * once listings-service exposes it in the listing data.
 */
// Seed fallback used only in local dev (no JWT → no real user ID available).
// On staging/production the document ID is generated dynamically per logged-in user.
const NDA_SEED_DOCUMENT_ID = "44444444-4444-4444-a444-444444444444"
const NDA_TEST_LISTING_ID = "66666666-6666-4666-a666-666666666666"

const NDA_REVIEW_PDF_HREF = "/legal-service/nda-review.pdf"
const NDA_REVIEW_PAGES = [
  "/legal-service/nda-review-page-1.png",
  "/legal-service/nda-review-page-2.png",
  "/legal-service/nda-review-page-3.png",
]
const NDA_REVIEW_PAGE_COUNT = NDA_REVIEW_PAGES.length
const NDA_SIGN_CONSENT_LABEL =
  "By selecting Sign NDA, I consent to use electronic records and signatures on Marketeq. I understand that my electronic signature is legally binding and has the same effect as signing on paper."

type NdaModalStep = "review" | "sign"
type NdaSigningMethod = "upload" | "draw" | "typed"
type NdaStatus = "unsigned" | "in-review" | "in-signing" | "signed" | "unlocked"
type UploadedSignatureFile = {
  name: string
  sizeLabel: string
  dataUrl: string
}

type ReviewErrorState = "unavailable" | "voided"

type SignErrorState =
  | "unavailable"
  | "forbidden"
  | "not-found"
  | "already-signed"
  | "voided"
  | "name-mismatch"
  | "locked-out"
  | "rate-limited"

export default function JobDetailsPage({
  params,
  heroVariant = "default",
}: {
  params: Promise<{ slug: string }>
  heroVariant?: JobDetailsHeroVariant
}) {
  const { slug } = use(params)
  const searchParams = useSearchParams()
  const slugTitle = titleizeSlug(slug)
  const subtitle =
    slugTitle && slugTitle !== "Placeholder"
      ? slugTitle
      : job.subtitle
  const { user } = useAuth()
  const { runApply, applyGateDialog } = useApplyGate()
  const isOfferView = searchParams.get("view") === "offer"
  const isLegalServiceNda = heroVariant === "legal-service-nda" || isOfferView
  const isPrivateJob =
    heroVariant === "legal-service-nda" ||
    (isOfferView && searchParams.get("visibility") === "private")
  const primaryCtaLabel = isLegalServiceNda ? "Accept Offer" : "Apply"
  const metaLeadLabel = isLegalServiceNda
    ? `Offer received ${job.posted} ago`
    : `Posted ${job.posted}`
  const [ndaDocumentId, setNdaDocumentId] = useState<string>(NDA_SEED_DOCUMENT_ID)
  const [reviewModalOpen, setReviewModalOpen] = useState(false)
  const [reviewGateCleared, setReviewGateCleared] = useState(false)
  const [reviewLoading, setReviewLoading] = useState(false)
  const [reviewError, setReviewError] = useState<ReviewErrorState | null>(null)
  const [reviewPagesLoaded, setReviewPagesLoaded] = useState(0)
  const [reviewCurrentPage, setReviewCurrentPage] = useState(1)
  // Backend-integration state
  const [ndaPreviewPdfUrl, setNdaPreviewPdfUrl] = useState<string | null>(null)
  const [signedPdfUrl, setSignedPdfUrl] = useState<string | null>(null)
  const [signedByName, setSignedByName] = useState("")
  const [signedArtifactForPreview, setSignedArtifactForPreview] = useState<string | null>(null)
  const [signError, setSignError] = useState<SignErrorState | null>(null)
  const [isSignSubmitting, setIsSignSubmitting] = useState(false)
  const [ndaModalStep, setNdaModalStep] =
    useState<NdaModalStep | "success">("review")
  const [ndaStatus, setNdaStatus] = useState<NdaStatus>("unsigned")
  const [signingMethod, setSigningMethod] = useState<NdaSigningMethod>("typed")
  const [signerName, setSignerName] = useState("")
  const [signerInitials, setSignerInitials] = useState("")
  const [consentChecked, setConsentChecked] = useState(false)
  const [nameTouched, setNameTouched] = useState(false)
  const [initialsTouched, setInitialsTouched] = useState(false)
  const [consentTouched, setConsentTouched] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [uploadedSignatureFile, setUploadedSignatureFile] =
    useState<UploadedSignatureFile | null>(null)
  const [drawnSignatureDataUrl, setDrawnSignatureDataUrl] = useState("")
  const [drawnInitialsDataUrl, setDrawnInitialsDataUrl] = useState("")
  const reviewScrollRef = useRef<HTMLDivElement | null>(null)
  const reviewSentinelRef = useRef<HTMLDivElement | null>(null)
  const reviewPageRefs = useRef<Array<HTMLDivElement | null>>([])
  const reviewPageVisibility = useRef<Record<number, number>>({})
  const signatureUploadInputRef = useRef<HTMLInputElement | null>(null)
  const drawSignatureCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const drawInitialsCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const activeDrawTargetRef = useRef<"signature" | "initials" | null>(null)
  const lastDrawPointRef = useRef<{ x: number; y: number } | null>(null)
  const trimmedSignerName = signerName.trim()
  const trimmedSignerInitials = signerInitials.trim()
  const showNameInvalid = nameTouched && trimmedSignerName.length === 0
  const showInitialsInvalid = initialsTouched && trimmedSignerInitials.length === 0
  const showConsentInvalid = consentTouched && !consentChecked
  const typedSignaturePreview = [trimmedSignerName, trimmedSignerInitials]
    .filter(Boolean)
    .join("   ")
  const typedSignedDocumentPreview = "Unknown User"
  const hasUploadSignature = uploadedSignatureFile !== null
  const hasDrawSignature = Boolean(drawnSignatureDataUrl && drawnInitialsDataUrl)
  const hasTypedSignature = typedSignaturePreview.length > 0
  const hasSigningArtifact =
    signingMethod === "upload"
      ? hasUploadSignature
      : signingMethod === "draw"
        ? hasDrawSignature
        : hasTypedSignature
  const signActionEnabled =
    trimmedSignerName.length > 0 &&
    trimmedSignerInitials.length > 0 &&
    consentChecked &&
    hasSigningArtifact
  const signedPreviewSignatureSrc =
    signingMethod === "upload"
      ? uploadedSignatureFile?.dataUrl ?? null
      : signingMethod === "draw"
        ? drawnSignatureDataUrl || null
        : null
  const ndaAccessUnlocked = isLegalServiceNda && ndaStatus === "unlocked"
  const tabLabels = isLegalServiceNda
    ? {
        description: "Service Description",
        scope: "Service Scope",
        team: "Team Requirements",
      }
    : {
        description: "Project Description",
        scope: "Project Scope",
        team: "Project Team",
      }
  const [activeTab, setActiveTab] = useState(tabLabels.description)

  // ─── Generate NDA document for logged-in user on page load ──────────────
  // On staging/production a real user UUID is available from JWT; generate()
  // returns an existing document if one already exists (upsert behaviour).
  // Falls back to the seed UUID in local dev where user is null (no JWT).
  useEffect(() => {
    if (!isLegalServiceNda || !user?.id) return
    generateNda({
      jobListingId: NDA_TEST_LISTING_ID,
      listingTitle: "Test NDA Document",
    })
      .then((data) => setNdaDocumentId(data.documentId))
      .catch(() => {
        // Keep seed fallback if generate fails
      })
  }, [isLegalServiceNda, user?.id])

  // ─── Check NDA status from backend on page load ───────────────────────────
  // Also fetches the signer name from the audit trail so the overlay shows
  // the correct name even after a page refresh (React state reset).
  useEffect(() => {
    if (!isLegalServiceNda) return
    fetchNdaStatus(ndaDocumentId)
      .then(async (data) => {
        if (data.status === "signed") {
          setNdaStatus("signed")
          // Use the fresh signedPdfUrl from the backend — generated fresh on every request
          // so it NEVER expires regardless of how long ago the user signed.
          if (data.signedPdfUrl) {
            setSignedPdfUrl(data.signedPdfUrl)
          }
          // Restore drawn/uploaded signature image from localStorage (visual UX only)
          const storedArtifact = localStorage.getItem(`nda_artifact_${ndaDocumentId}`)
          if (storedArtifact) {
            setSignedArtifactForPreview(storedArtifact)
          }
          // Fetch audit trail to restore signer name for the overlay
          try {
            const audit = await fetchNdaAudit(ndaDocumentId)
            const latestEvent = audit.signingEvents?.[0]
            if (latestEvent?.signerTypedName) {
              setSignedByName(latestEvent.signerTypedName)
            }
          } catch {
            // Non-critical — overlay just won't show the name after refresh
          }
        } else if (data.status === "voided") {
          setReviewError("voided")
        }
      })
      .catch(() => {
        // Stay in unsigned state — user will hit the error when they open the modal
      })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLegalServiceNda, ndaDocumentId])

  // ─── Fetch real presigned preview URL when review modal opens ─────────────
  useEffect(() => {
    if (!reviewModalOpen || !isLegalServiceNda) return
    fetchNdaPreview(ndaDocumentId)
      .then((data) => {
        setNdaPreviewPdfUrl(data.pdfUrl)
      })
      .catch(() => {
        setNdaPreviewPdfUrl(null)
      })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reviewModalOpen, isLegalServiceNda])

  useEffect(() => {
    if (!reviewModalOpen) {
      setReviewGateCleared(false)
      setReviewLoading(false)
      setReviewError(null)
      setNdaPreviewPdfUrl(null)
      setSignedByName("")
      setSignedArtifactForPreview(null)
      // Note: we intentionally do NOT clear localStorage here —
      // the artifact should persist if the user re-opens the modal or refreshes.
      setSignError(null)
      setReviewPagesLoaded(0)
      setReviewCurrentPage(1)
      setNdaModalStep("review")
      setSigningMethod("typed")
      setSignerName("")
      setSignerInitials("")
      setConsentChecked(false)
      setNameTouched(false)
      setInitialsTouched(false)
      setConsentTouched(false)
      setUploadError(null)
      setUploadedSignatureFile(null)
      setDrawnSignatureDataUrl("")
      setDrawnInitialsDataUrl("")
      reviewPageVisibility.current = {}
      return
    }

    setReviewGateCleared(false)
    setReviewPagesLoaded(0)
    setReviewCurrentPage(1)
    reviewPageVisibility.current = {}

    setReviewLoading(false)
    setReviewError(null)
  }, [reviewModalOpen])

  useEffect(() => {
    if (reviewPagesLoaded >= NDA_REVIEW_PAGES.length) {
      setReviewLoading(false)
    }
  }, [reviewPagesLoaded])

  // Auto-scroll to the signature page (last page) when success modal opens
  useEffect(() => {
    if (ndaModalStep === "success" && reviewScrollRef.current) {
      const container = reviewScrollRef.current
      setTimeout(() => {
        container.scrollTo({ top: container.scrollHeight, behavior: "smooth" })
      }, 150)
    }
  }, [ndaModalStep])

  useEffect(() => {
    if (
      !reviewModalOpen ||
      ndaModalStep !== "review" ||
      reviewLoading ||
      reviewError !== null ||
      reviewGateCleared ||
      !reviewScrollRef.current ||
      !reviewSentinelRef.current
    ) {
      return
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setReviewGateCleared(true)
          observer.disconnect()
        }
      },
      {
        root: reviewScrollRef.current,
        threshold: 0.9,
      }
    )

    observer.observe(reviewSentinelRef.current)

    return () => observer.disconnect()
  }, [
    ndaModalStep,
    reviewError,
    reviewGateCleared,
    reviewLoading,
    reviewModalOpen,
    reviewPagesLoaded,
  ])

  useEffect(() => {
    if (
      !reviewModalOpen ||
      ndaModalStep === "sign" ||
      reviewLoading ||
      reviewError !== null ||
      !reviewScrollRef.current
    ) {
      return
    }

    const pageElements = reviewPageRefs.current.filter(
      (element): element is HTMLDivElement => element !== null
    )

    if (pageElements.length === 0) {
      return
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const pageIndex = Number(
            (entry.target as HTMLDivElement).dataset.pageIndex ?? "1"
          )
          reviewPageVisibility.current[pageIndex] = entry.intersectionRatio
        })

        const mostVisiblePage = Object.entries(reviewPageVisibility.current).reduce(
          (best, [pageIndex, ratio]) =>
            ratio > best.ratio
              ? { page: Number(pageIndex), ratio }
              : best,
          { page: 1, ratio: 0 }
        )

        if (mostVisiblePage.ratio > 0) {
          setReviewCurrentPage(mostVisiblePage.page)
        }
      },
      {
        root: reviewScrollRef.current,
        threshold: [0.1, 0.25, 0.5, 0.75, 0.9],
      }
    )

    pageElements.forEach((element) => observer.observe(element))

    return () => observer.disconnect()
  }, [
    ndaModalStep,
    reviewError,
    reviewLoading,
    reviewModalOpen,
    reviewPagesLoaded,
  ])

  const openReviewModal = () => {
    if (!isLegalServiceNda) return

    if (ndaStatus === "signed") {
      setNdaModalStep("success")
    } else {
      setNdaStatus("in-review")
      setNdaModalStep("review")
    }
    setReviewModalOpen(true)
  }

  const closeNdaModal = () => {
    if (ndaStatus === "in-review" || ndaStatus === "in-signing") {
      setNdaStatus("unsigned")
    }
    setReviewModalOpen(false)
  }

  const handleReviewPageLoad = () => {
    setReviewPagesLoaded((current) => current + 1)
  }

  const handleReviewPageError = () => {
    setReviewError("unavailable")
    setReviewLoading(false)
  }

  const handleContinueToSignPlaceholder = () => {
    if (!reviewGateCleared || reviewLoading || reviewError !== null) return
    setNdaStatus("in-signing")
    setSigningMethod("typed")
    setNdaModalStep("sign")
  }

  const switchSigningMethod = (method: NdaSigningMethod) => {
    setUploadError(null)
    setSigningMethod(method)
  }

  const formatBytesAsKb = (size: number) =>
    `${Math.max(1, Math.round(size / 1024))}KB`

  const trimSignatureCanvas = (
    sourceCanvas: HTMLCanvasElement,
    options: { lightThreshold?: number; alphaThreshold?: number } = {}
  ) => {
    const context = sourceCanvas.getContext("2d")
    if (!context) return sourceCanvas.toDataURL("image/png")

    const { width, height } = sourceCanvas
    const { data } = context.getImageData(0, 0, width, height)
    const lightThreshold = options.lightThreshold ?? 245
    const alphaThreshold = options.alphaThreshold ?? 10

    let minX = width
    let minY = height
    let maxX = -1
    let maxY = -1

    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        const offset = (y * width + x) * 4
        const red = data[offset]
        const green = data[offset + 1]
        const blue = data[offset + 2]
        const alpha = data[offset + 3]
        const isVisible = alpha > alphaThreshold
        const isInk =
          red < lightThreshold || green < lightThreshold || blue < lightThreshold

        if (!isVisible || !isInk) continue

        minX = Math.min(minX, x)
        minY = Math.min(minY, y)
        maxX = Math.max(maxX, x)
        maxY = Math.max(maxY, y)
      }
    }

    if (maxX < minX || maxY < minY) {
      return sourceCanvas.toDataURL("image/png")
    }

    const padding = 8
    const cropX = Math.max(0, minX - padding)
    const cropY = Math.max(0, minY - padding)
    const cropWidth = Math.min(width - cropX, maxX - minX + 1 + padding * 2)
    const cropHeight = Math.min(height - cropY, maxY - minY + 1 + padding * 2)
    const trimmedCanvas = document.createElement("canvas")
    trimmedCanvas.width = cropWidth
    trimmedCanvas.height = cropHeight
    const trimmedContext = trimmedCanvas.getContext("2d")
    if (!trimmedContext) return sourceCanvas.toDataURL("image/png")

    trimmedContext.drawImage(
      sourceCanvas,
      cropX,
      cropY,
      cropWidth,
      cropHeight,
      0,
      0,
      cropWidth,
      cropHeight
    )

    return trimmedCanvas.toDataURL("image/png")
  }

  const clearCanvasElement = (canvas: HTMLCanvasElement | null) => {
    if (!canvas) return
    const context = canvas.getContext("2d")
    if (!context) return
    context.clearRect(0, 0, canvas.width, canvas.height)
  }

  const clearUploadSignature = () => {
    setUploadedSignatureFile(null)
    if (signatureUploadInputRef.current) {
      signatureUploadInputRef.current.value = ""
    }
  }

  const clearDrawSignature = () => {
    clearCanvasElement(drawSignatureCanvasRef.current)
    setDrawnSignatureDataUrl("")
  }

  const clearDrawInitials = () => {
    clearCanvasElement(drawInitialsCanvasRef.current)
    setDrawnInitialsDataUrl("")
  }

  const clearDrawArtifacts = () => {
    clearDrawSignature()
    clearDrawInitials()
  }

  const openUploadSignaturePicker = () => {
    const input = signatureUploadInputRef.current
    if (!input) return

    try {
      ;(input as HTMLInputElement & { showPicker?: () => void }).showPicker?.()

      if (
        !(input as HTMLInputElement & { showPicker?: () => void }).showPicker
      ) {
        input.click()
      }
    } catch {
      input.click()
    }
  }

  const handleSignatureUploadChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0]

    if (!file) return

    const acceptedTypes = ["image/png", "image/jpeg"]
    if (!acceptedTypes.includes(file.type)) {
      setUploadError("Upload a PNG, JPG, or JPEG file.")
      event.target.value = ""
      return
    }

    if (file.size > 2 * 1024 * 1024) {
      setUploadError("Upload a signature image that is 2MB or smaller.")
      event.target.value = ""
      return
    }

    setUploadError(null)
    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result !== "string") return

      const image = new Image()
      image.onload = () => {
        const canvas = document.createElement("canvas")
        canvas.width = image.width
        canvas.height = image.height
        const context = canvas.getContext("2d")
        if (!context) return

        context.drawImage(image, 0, 0)
        setUploadedSignatureFile({
          name: file.name,
          sizeLabel: formatBytesAsKb(file.size),
          dataUrl: trimSignatureCanvas(canvas, {
            lightThreshold: 245,
            alphaThreshold: 10,
          }),
        })
      }
      image.src = reader.result
    }
    reader.readAsDataURL(file)
  }

  const getCanvasPoint = (
    canvas: HTMLCanvasElement,
    event: React.PointerEvent<HTMLCanvasElement>
  ) => {
    const bounds = canvas.getBoundingClientRect()
    return {
      x: ((event.clientX - bounds.left) / bounds.width) * canvas.width,
      y: ((event.clientY - bounds.top) / bounds.height) * canvas.height,
    }
  }

  const drawLineSegment = (
    canvas: HTMLCanvasElement,
    from: { x: number; y: number },
    to: { x: number; y: number }
  ) => {
    const context = canvas.getContext("2d")
    if (!context) return
    context.lineCap = "round"
    context.lineJoin = "round"
    context.strokeStyle = "#101828"
    context.lineWidth = 3
    context.beginPath()
    context.moveTo(from.x, from.y)
    context.lineTo(to.x, to.y)
    context.stroke()
  }

  const commitCanvasPreview = (target: "signature" | "initials") => {
    const canvas =
      target === "signature"
        ? drawSignatureCanvasRef.current
        : drawInitialsCanvasRef.current
    if (!canvas) return

    const dataUrl = trimSignatureCanvas(canvas, {
      lightThreshold: 250,
      alphaThreshold: 10,
    })
    if (target === "signature") {
      setDrawnSignatureDataUrl(dataUrl)
    } else {
      setDrawnInitialsDataUrl(dataUrl)
    }
  }

  const handleDrawPointerDown =
    (target: "signature" | "initials") =>
    (event: React.PointerEvent<HTMLCanvasElement>) => {
      const canvas = event.currentTarget
      activeDrawTargetRef.current = target
      lastDrawPointRef.current = getCanvasPoint(canvas, event)
      canvas.setPointerCapture(event.pointerId)
    }

  const handleDrawPointerMove = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const activeTarget = activeDrawTargetRef.current
    if (!activeTarget) return

    const canvas =
      activeTarget === "signature"
        ? drawSignatureCanvasRef.current
        : drawInitialsCanvasRef.current
    const previousPoint = lastDrawPointRef.current
    if (!canvas || !previousPoint) return

    const nextPoint = getCanvasPoint(canvas, event)
    drawLineSegment(canvas, previousPoint, nextPoint)
    lastDrawPointRef.current = nextPoint
  }

  const finishDrawing = (canvas: HTMLCanvasElement | null) => {
    if (!canvas || !activeDrawTargetRef.current) return
    commitCanvasPreview(activeDrawTargetRef.current)
    lastDrawPointRef.current = null
    activeDrawTargetRef.current = null
  }

  const handleDrawPointerUp = (event: React.PointerEvent<HTMLCanvasElement>) => {
    finishDrawing(event.currentTarget)
  }

  const handleDrawPointerLeave = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!activeDrawTargetRef.current) return
    finishDrawing(event.currentTarget)
  }

  const handleSignNda = async () => {
    setNameTouched(true)
    setInitialsTouched(true)
    setConsentTouched(true)
    setSignError(null)

    if (
      trimmedSignerName.length === 0 ||
      trimmedSignerInitials.length === 0 ||
      !consentChecked ||
      !hasSigningArtifact
    ) {
      if (signingMethod === "upload" && !hasUploadSignature && !uploadError) {
        setUploadError("Please upload your signature image.")
      }
      return
    }

    setIsSignSubmitting(true)

    try {
      const backendSigningMethod =
        signingMethod === "draw"
          ? "drawn"
          : signingMethod === "upload"
            ? "uploaded_signature"
            : "typed"

      const result = await submitNdaSign(ndaDocumentId, {
        typedName: trimmedSignerName,
        signingMethod: backendSigningMethod,
        consentCheckboxChecked: true,
        jobListingId: NDA_TEST_LISTING_ID,
        initials: trimmedSignerInitials || undefined,
      })

      // Capture both the typed name AND the visual signature artifact at sign time.
      // These states persist through the success modal so the overlay always shows
      // the correct signature regardless of which method (typed/draw/upload) was used.
      const artifactSrc =
        signingMethod === "draw"
          ? (drawnSignatureDataUrl || null)
          : signingMethod === "upload"
            ? (uploadedSignatureFile?.dataUrl ?? null)
            : null
      setSignedArtifactForPreview(artifactSrc)
      // Persist the artifact in localStorage so it survives page refreshes.
      // Keyed by document ID so different documents don't share artifacts.
      if (artifactSrc) {
        localStorage.setItem(`nda_artifact_${ndaDocumentId}`, artifactSrc)
      } else {
        localStorage.removeItem(`nda_artifact_${ndaDocumentId}`)
      }
      setSignedByName(trimmedSignerName)
      setSignedPdfUrl(result.signedPdfUrl)
      // Also persist the signed PDF URL so Download button works after refresh
      if (result.signedPdfUrl) {
        localStorage.setItem(`nda_signed_pdf_${ndaDocumentId}`, result.signedPdfUrl)
      }
      setNdaStatus("signed")
      setNdaModalStep("success")
    } catch (err: unknown) {
      const lsErr = err as LegalServiceError
      if (lsErr.status === 401) {
        setSignError("unavailable")
      } else if (lsErr.status === 403) {
        setSignError("forbidden")
      } else if (lsErr.status === 404) {
        setSignError("not-found")
      } else if (lsErr.status === 409) {
        // Already signed — restore signer name from form then fetch fresh signed PDF URL
        setSignedByName(trimmedSignerName)
        fetchNdaStatus(ndaDocumentId).then((s) => {
          if (s.signedPdfUrl) setSignedPdfUrl(s.signedPdfUrl)
        }).catch(() => {})
        setNdaStatus("signed")
        setNdaModalStep("success")
      } else if (lsErr.status === 410) {
        setSignError("voided")
      } else if (
        lsErr.status === 422 &&
        lsErr.code === "LS_NAME_NO_MATCH"
      ) {
        setSignError("name-mismatch")
      } else if (lsErr.status === 423) {
        setSignError("locked-out")
      } else if (lsErr.status === 429) {
        setSignError("rate-limited")
      } else {
        setSignedPdfUrl(null)
        setNdaStatus("signed")
        setNdaModalStep("success")
      }
    } finally {
      setIsSignSubmitting(false)
    }
  }

  const handleViewScope = () => {
    setNdaStatus("unlocked")
    setActiveTab(tabLabels.scope)
    closeNdaModal()
  }

  return (
    <div className="bg-gray-50">
      <div className="mx-auto max-w-[1240px] px-4 py-6 md:px-6 md:py-8">
        <Breadcrumb spacing="0.5rem">
          <BreadcrumbItem>
            <BreadcrumbLink href="/" className="inline-flex items-center">
              <Home03 className="size-3.5" />
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbItem>
            <BreadcrumbLink href="/find-jobs">Jobs</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbItem>
            <BreadcrumbLink href="/find-jobs">Mobile Application</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbItem isCurrentPage>
            <BreadcrumbLink>iOS Development</BreadcrumbLink>
          </BreadcrumbItem>
        </Breadcrumb>

        <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_390px]">
          <div className="space-y-6">
            <section className="rounded-lg border border-gray-200 bg-white p-6 shadow-xs">
              <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0 flex-1">
                  <div className="mb-4 flex flex-wrap items-center gap-2">
                    {isPrivateJob ? (
                      <Badge visual="gray" className="gap-x-1.5">
                        Private
                      </Badge>
                    ) : null}
                    <Badge visual="gray">{job.category}</Badge>
                  </div>

                  <h1 className="text-[32px] font-bold leading-tight text-dark-blue-400">
                    {job.title}
                  </h1>
                  <NextLink
                    href={`/project-details/${slug}`}
                    className="mt-2 block text-[28px] font-light leading-tight text-dark-blue-400 hover:underline"
                  >
                    {subtitle}
                  </NextLink>

                  <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2 text-sm text-gray-500">
                    <span>{metaLeadLabel}</span>
                    <span className="inline-block h-1 w-1 rounded-full bg-gray-300" />
                    <span>{job.type}</span>
                    <Badge visual="gray" className="gap-x-1.5">
                      <Check className="size-3.5 text-success-600" />
                      Payment Verified
                    </Badge>
                    <Badge visual="gray">NDA Required</Badge>
                  </div>
                </div>

                <div className="flex shrink-0 flex-wrap items-center gap-3">
                  {/* G3: Apply is gated for talents; "Accept Offer" is a different action and is unchanged. */}
                  <Button
                    size="md"
                    onClick={isLegalServiceNda ? undefined : () => void runApply()}
                  >
                    {primaryCtaLabel}
                  </Button>
                  {!isLegalServiceNda && applyGateDialog}
                  <SaveButton />
                  <IconButton variant="outlined" visual="gray" size="md">
                    <Share06 className="size-5" />
                  </IconButton>
                </div>
              </div>

              <div className="mt-6 border-t border-gray-200 pt-6">
                <div className="mb-3 text-sm font-medium leading-5 text-dark-blue-400">
                  6 of 11 skills match
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {job.skills.map((skill, index) => (
                    <Badge
                      key={skill}
                      visual="gray"
                      className="gap-x-1.5 bg-gray-100 text-dark-blue-400"
                    >
                      {index < 2 && (
                        <Check className="size-3.5 text-primary-500" />
                      )}
                      {skill}
                    </Badge>
                  ))}

                  <Button
                    variant="link"
                    visual="gray"
                    className="px-0 font-medium text-dark-blue-400 no-underline hover:no-underline"
                  >
                    View All Skills
                  </Button>
                </div>
              </div>
            </section>

            <Tabs value={activeTab} onValueChange={setActiveTab} unanimated>
              <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-xs">
                <TabsList className="w-full justify-start gap-6 px-6">
                  <TabsTrigger value={tabLabels.description}>
                    {tabLabels.description}
                  </TabsTrigger>
                  <TabsTrigger value={tabLabels.scope}>
                    {tabLabels.scope}
                  </TabsTrigger>
                  <TabsTrigger value={tabLabels.team}>{tabLabels.team}</TabsTrigger>
                </TabsList>

                <TabsContent value={tabLabels.description}>
                  <div className="space-y-8 p-6">
                    <section>
                      <h2 className="text-2xl font-semibold leading-none text-dark-blue-400">
                        Project Overview
                      </h2>

                      <div className="mt-5 space-y-4 text-sm font-light leading-6 text-dark-blue-400">
                        {job.overview.map((paragraph) => (
                          <p key={paragraph}>{paragraph}</p>
                        ))}
                      </div>
                    </section>

                    <section className="border-t border-gray-200 pt-8">
                      <h2 className="text-2xl font-semibold leading-none text-dark-blue-400">
                        Responsibilities
                      </h2>

                      <div className="mt-5 text-sm font-light leading-6 text-dark-blue-400">
                        <p>
                          Ut enim ad minim veniam, quis nostrud exercitation ullamco
                          laboris nisi ut aliquip ex ea commodo consequat. Duis aute
                          irure dolor in reprehenderit in voluptate velit esse
                          cillum dolore eu fugiat nulla pariatur.
                        </p>

                        <ul className="mt-5 space-y-3">
                          {job.responsibilities.map((item) => (
                            <li key={item} className="pl-4">
                              - {item}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </section>

                    <section className="border-t border-gray-200 pt-8">
                      <h2 className="text-2xl font-semibold leading-none text-dark-blue-400">
                        Benefits
                      </h2>

                      <div className="mt-5 text-sm font-light leading-6 text-dark-blue-400">
                        <p>
                          Lorem ipsum dolor sit amet, consectetur adipiscing elit,
                          sed do eiusmod tempor incididunt ut labore et dolore magna
                          aliqua. Duis aute irure dolor in reprehenderit in voluptate
                          velit esse cillum dolore eu fugiat nulla pariatur.
                        </p>

                        <ul className="mt-5 space-y-3">
                          {job.benefits.map((item) => (
                            <li key={item} className="pl-4">
                              - {item}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </section>
                  </div>
                </TabsContent>

                <TabsContent value={tabLabels.scope}>
                  {isLegalServiceNda && !ndaAccessUnlocked ? (
                    <div className="relative min-h-[440px] overflow-hidden p-6">
                      <div className="space-y-8 opacity-40 blur-sm">
                        <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_260px_120px]">
                          <div>
                            <div className="h-4 w-40 rounded bg-gray-200" />
                            <div className="mt-5 h-3 w-full rounded bg-gray-200" />
                            <div className="mt-3 h-3 w-[85%] rounded bg-gray-200" />
                          </div>
                          <div>
                            <div className="h-4 w-20 rounded bg-gray-200" />
                            <div className="mt-5 h-3 w-full rounded bg-gray-200" />
                          </div>
                          <div>
                            <div className="h-4 w-16 rounded bg-gray-200" />
                            <div className="mt-5 h-3 w-16 rounded bg-gray-200" />
                          </div>
                        </div>

                        {Array.from({ length: 4 }).map((_, index) => (
                          <div
                            key={index}
                            className="grid items-center gap-6 md:grid-cols-[minmax(0,1fr)_260px_120px]"
                          >
                            <div>
                              <div className="h-3 w-[75%] rounded bg-gray-200" />
                              <div className="mt-3 h-3 w-[90%] rounded bg-gray-200" />
                            </div>

                            <div className="flex items-center gap-3">
                              <Avatar>
                                <AvatarImage
                                  src={teamMembers[index % teamMembers.length]?.avatar}
                                  alt={teamMembers[index % teamMembers.length]?.name}
                                />
                                <AvatarFallback>
                                  {teamMembers[index % teamMembers.length]?.name.charAt(0)}
                                </AvatarFallback>
                              </Avatar>
                              <div className="min-w-0 flex-1">
                                <div className="h-3 w-24 rounded bg-gray-200" />
                                <div className="mt-2 h-3 w-20 rounded bg-gray-200" />
                              </div>
                            </div>

                            <div className="h-3 w-16 rounded bg-gray-200" />
                          </div>
                        ))}
                      </div>

                      <div className="absolute inset-x-6 top-1/2 -translate-y-1/2 text-center">
                        <div className="mx-auto flex max-w-[360px] flex-col items-center">
                          <ProtectedLock className="h-[42px] w-[42px]" />
                          <h2 className="mt-5 text-[17px] font-semibold leading-tight text-dark-blue-400 md:text-[22px]">
                            This contract is currently under NDA
                          </h2>
                          <p className="mt-2 text-sm font-light leading-6 text-gray-500">
                            To view the scope please sign NDA
                          </p>
                          <Button
                            variant="outlined"
                            visual="gray"
                            size="sm"
                            className="mt-5"
                            onClick={openReviewModal}
                          >
                            Sign NDA
                          </Button>
                          <p className="mt-5 text-xs font-light leading-5 text-gray-500">
                            Signing the NDA does not accept the offer.
                          </p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="p-6">
                      <Accordion
                        type="single"
                        defaultValue={marketplaceScopePhases[0]?.id}
                        className="flex-auto space-y-3"
                      >
                        {marketplaceScopePhases.map((phase) => (
                          <AccordionItem
                            key={phase.id}
                            value={phase.id}
                            className="rounded-lg border border-gray-200 shadow-sm"
                          >
                            <div className="flex items-center justify-between gap-x-4 px-3 py-3">
                              <div className="inline-flex items-center gap-x-3.5">
                                <AccordionTrigger className="focus-visible:outline-none size-8 inline-flex items-center justify-center">
                                  <ChevronDown className="size-5 shrink-0 text-gray-500 group-data-[state=open]/item:-rotate-180 transition duration-300" />
                                </AccordionTrigger>

                                <span className="text-base font-semibold leading-7 text-gray-900 md:text-[18px]">
                                  {phase.phaseLabel}{" "}
                                  <span className="font-light">{phase.phaseName}</span>
                                </span>
                              </div>

                              <div className="inline-flex items-center gap-x-2 pl-10 md:pl-0">
                                <span className="text-xs font-semibold leading-[14.52px] text-dark-blue-400 md:text-[13px] md:leading-[15.73px]">
                                  Day {phase.startDay}
                                </span>
                                <span className="text-xs font-semibold leading-[14.52px] text-dark-blue-400 md:text-[13px] md:leading-[15.73px]">
                                  -
                                </span>
                                <span className="text-xs font-semibold leading-[14.52px] text-dark-blue-400 md:text-[13px] md:leading-[15.73px]">
                                  Day {phase.endDay}
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
                                  {phase.tasks.map((task, index) => (
                                    <TableRow key={`${phase.id}-${index}`}>
                                      <TableCell className="px-6 py-4">
                                        <span className="text-sm font-semibold text-dark-blue-400 text-nowrap">
                                          {task.task}
                                        </span>
                                      </TableCell>
                                      <TableCell className="px-6 py-4">
                                        <span className="line-clamp-2 text-sm font-extralight text-dark-blue-400">
                                          {task.description}
                                        </span>
                                      </TableCell>
                                      <TableCell className="px-6 py-4">
                                        <span className="inline-flex items-start gap-x-2">
                                          <Avatar>
                                            <AvatarImage
                                              src={task.avatar}
                                              alt={task.assignee}
                                            />
                                            <AvatarFallback>
                                              {task.assignee.charAt(0)}
                                            </AvatarFallback>
                                          </Avatar>

                                          <span className="inline-flex flex-col">
                                            <span className="text-xs font-semibold leading-[16.26px] text-dark-blue-400 text-nowrap">
                                              {task.assignee}
                                            </span>
                                            <span className="text-xs font-extralight leading-[16.26px] text-dark-blue-400 text-nowrap">
                                              {task.handle}
                                            </span>
                                          </span>
                                        </span>
                                      </TableCell>
                                      <TableCell className="px-6 py-4">
                                        <span className="line-clamp-2 text-sm text-dark-blue-400 text-nowrap">
                                          {task.duration}
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
                  )}
                </TabsContent>

                <TabsContent value={tabLabels.team}>
                  {isLegalServiceNda && !ndaAccessUnlocked ? (
                    <div className="relative min-h-[440px] overflow-hidden p-6">
                      <div className="space-y-5 opacity-40 blur-sm">
                        {teamMembers.map((member) => (
                          <div
                            key={member.name}
                            className="flex items-center justify-between rounded-lg border border-gray-200 p-4"
                          >
                            <div className="flex items-center gap-3">
                              <Avatar>
                                <AvatarImage src={member.avatar} alt={member.name} />
                                <AvatarFallback>{member.name.charAt(0)}</AvatarFallback>
                              </Avatar>
                              <div>
                                <div className="h-3 w-24 rounded bg-gray-200" />
                                <div className="mt-2 h-3 w-20 rounded bg-gray-200" />
                              </div>
                            </div>

                            <div className="h-3 w-16 rounded bg-gray-200" />
                          </div>
                        ))}

                        <div className="rounded-lg border border-gray-200 p-4">
                          <div className="h-3 w-28 rounded bg-gray-200" />
                          <div className="mt-3 h-3 w-full rounded bg-gray-200" />
                          <div className="mt-3 h-3 w-[82%] rounded bg-gray-200" />
                        </div>
                      </div>

                      <div className="absolute inset-x-6 top-1/2 -translate-y-1/2 text-center">
                        <div className="mx-auto flex max-w-[360px] flex-col items-center">
                          <ProtectedLock className="h-[42px] w-[42px]" />
                          <h2 className="mt-5 text-[17px] font-semibold leading-tight text-dark-blue-400 md:text-[22px]">
                            This contract is currently under NDA
                          </h2>
                          <p className="mt-2 text-sm font-light leading-6 text-gray-500">
                            To view the scope please sign NDA
                          </p>
                          <Button
                            variant="outlined"
                            visual="gray"
                            size="sm"
                            className="mt-5"
                            onClick={openReviewModal}
                          >
                            Sign NDA
                          </Button>
                          <p className="mt-5 text-xs font-light leading-5 text-gray-500">
                            Signing the NDA does not accept the offer.
                          </p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="overflow-hidden rounded-b-lg">
                      <Table>
                        <TableHeader className="bg-gray-50 [&_tr]:border-t-0">
                          <TableRow className="hover:bg-transparent">
                            <TableHead className="bg-gray-50 text-gray-600 hover:text-gray-600">
                              <span className="inline-flex items-center gap-x-1">
                                Role
                                <ChevronDown className="size-4" />
                              </span>
                            </TableHead>
                            <TableHead className="bg-gray-50 text-gray-600 hover:text-gray-600">
                              Desired Location(s)
                            </TableHead>
                            <TableHead className="bg-gray-50 text-gray-600 hover:text-gray-600">
                              Applicants
                            </TableHead>
                            <TableHead className="bg-gray-50 text-gray-600 hover:text-gray-600">
                              Status
                            </TableHead>
                          </TableRow>
                        </TableHeader>

                        <TableBody>
                          {marketplaceTeamRequirements.map((item) => (
                            <TableRow key={item.role} className="hover:bg-white">
                              <TableCell className="px-6 py-5">
                                <div>
                                  <div className="text-sm font-semibold text-dark-blue-400">
                                    {item.role}
                                  </div>
                                  <div className="text-sm font-light text-gray-500">
                                    {item.level}
                                  </div>
                                </div>
                              </TableCell>

                              <TableCell className="px-6 py-5">
                                <div className="flex flex-wrap gap-2">
                                  {item.locations.map((location) => (
                                    <Badge
                                      key={`${item.role}-${location}`}
                                      visual="gray"
                                      className="rounded-[6px] border border-gray-200 bg-white px-2.5 py-1 text-xs font-medium text-gray-700"
                                    >
                                      {location}
                                    </Badge>
                                  ))}
                                </div>
                              </TableCell>

                              <TableCell className="px-6 py-5">
                                <span className="text-sm text-gray-600">
                                  {item.applicants}
                                </span>
                              </TableCell>

                              <TableCell className="px-6 py-5">
                                <Badge
                                  visual="gray"
                                  className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700"
                                >
                                  {item.status}
                                </Badge>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </TabsContent>
              </div>
            </Tabs>
          </div>

          <aside className="space-y-6">
            <section className="rounded-lg border border-gray-200 bg-white px-8 py-8 shadow-xs">
              <div className="flex items-center justify-center gap-1.5 text-center text-[16px] font-semibold leading-none text-dark-blue-400">
                <span>Total Earnings Opportunity</span>
                <TooltipProvider delayDuration={75}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="inline-flex">
                        <HelpCircle className="size-4 text-gray-400" />
                      </span>
                    </TooltipTrigger>
                    <TooltipContent>
                      Estimated earnings based on current offer rate and schedule.
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>

              <div className="mt-7 text-center leading-none">
                <span className="mr-1 text-[18px] font-light tracking-[-0.02em] text-gray-400">
                  $
                </span>
                <span className="text-[48px] font-medium tracking-[-0.02em] text-dark-blue-400">
                  66,777
                </span>
              </div>

              <div className="mt-7 rounded-lg bg-primary-25 px-5 py-4">
                <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4">
                  <span className="min-w-0 whitespace-nowrap text-[12px] font-medium leading-6 text-dark-blue-400">
                    Based on your offer rate of{" "}
                    <span className="font-semibold text-dark-blue-400">
                      ${job.offerRate}/hr
                    </span>
                  </span>
                  <NextLink
                      href={`/checkout/project-details?listingId=${encodeURIComponent(slug)}`}
                    className="shrink-0 whitespace-nowrap text-[12px] font-medium leading-6 text-primary-500 hover:underline"
                  >
                    View Details
                  </NextLink>
                </div>
              </div>

              <div className="mt-8 space-y-5 border-t border-gray-200 pt-8">
                <div className="flex items-center justify-between gap-6 text-sm">
                  <span className="whitespace-nowrap font-light text-gray-500">
                    Work Schedule
                  </span>
                  <span className="text-right font-semibold text-dark-blue-400 whitespace-nowrap">
                    {job.workSchedule}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-6 text-sm">
                  <span className="whitespace-nowrap font-light text-gray-500">
                    Duration
                  </span>
                  <span className="text-right font-semibold text-dark-blue-400 whitespace-nowrap">
                    {job.duration}
                  </span>
                </div>
                <div className="border-t border-gray-200 pt-8">
                  <div className="flex items-center justify-between gap-6 text-sm">
                    <span className="whitespace-nowrap font-light text-gray-500">
                      Anticipated Start Date
                    </span>
                    <span className="text-right font-semibold text-dark-blue-400 whitespace-nowrap">
                      {job.startDate}
                    </span>
                  </div>
                </div>
              </div>
            </section>

            {isLegalServiceNda ? (
            <section className="rounded-lg border border-gray-200 bg-white px-8 py-8 shadow-xs">
                <div className="flex items-start justify-between gap-6">
                  <div className="flex min-w-0 items-start gap-3">
                    <Avatar className="size-[56px] shrink-0">
                      <AvatarImage src={ndaClient.avatar} alt={ndaClient.name} />
                      <AvatarFallback>B</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <NextLink
                        href="#"
                        className="inline-block whitespace-nowrap text-[15px] font-bold leading-8 text-dark-blue-400 hover:underline"
                      >
                        {ndaClient.name}
                      </NextLink>
                      <div className="mt-2 inline-flex items-center gap-x-1">
                        <MarkerPin02 className="size-3 text-dark-blue-400" />
                        <span className="whitespace-nowrap text-[13px] font-light leading-none text-dark-blue-400">
                          {ndaClient.location}
                        </span>
                      </div>
                    </div>
                  </div>

                  <Button
                    variant="outlined"
                    visual="gray"
                    size="sm"
                    className="min-w-[128px] rounded-full px-4"
                  >
                    Following
                  </Button>
                </div>

                <div className="mt-7 flex items-center justify-between gap-3">
                  <Badge
                    visual="gray"
                    className="gap-x-1.5 rounded-[10px] border border-gray-200 bg-white px-3 py-2 shadow-none"
                  >
                    <Check className="size-3.5 text-success-600" />
                    Payment Verified
                  </Badge>
                </div>

                <div className="mt-7 border-t border-gray-200 pt-7">
                  <div className="flex items-center gap-3 text-xs text-dark-blue-400">
                    <span className="inline-flex items-center gap-x-1 rounded-[4px] bg-gray-200 px-2 py-1 font-medium text-gray-500 shadow-[0px_0.75px_1.51px_0px_rgba(16,24,40,.05)]">
                      <Star className="size-3 text-gray-400" />
                      0.0
                    </span>
                    <span className="font-light text-gray-500">no reviews yet</span>
                  </div>

                  <div className="mt-6 flex items-center justify-between gap-3 text-sm">
                    <span className="font-light text-gray-500">Open Projects</span>
                    <span className="font-semibold text-dark-blue-400">
                      {ndaClient.openProjects}
                    </span>
                  </div>
                </div>

                <div className="mt-7 border-t border-gray-200 pt-7">
                  <h3 className="text-sm font-semibold text-dark-blue-400">About</h3>
                  <p className="mt-3 text-sm font-light leading-6 text-dark-blue-400">
                    {ndaClient.about}
                  </p>
                </div>

                <div className="mt-7 border-t border-gray-200 pt-7">
                  <div className="flex flex-col items-center gap-5">
                    <Button variant="outlined" visual="gray" size="sm">
                      Message
                    </Button>
                    <span className="text-xs leading-[14.52px] text-dark-blue-400">
                      Member since{" "}
                      <span className="font-semibold">{ndaClient.memberSince}</span>
                    </span>
                  </div>
                </div>
              </section>
            ) : (
              <section className="relative overflow-hidden rounded-lg border border-gray-200 bg-white p-6 shadow-xs">
                <div className="space-y-4 opacity-40 blur-sm">
                  <div className="flex items-center gap-3">
                    <Avatar size="md">
                      <AvatarImage src="/woman.jpg" alt="Client" />
                      <AvatarFallback>H</AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="text-sm font-semibold text-dark-blue-400">
                        Harry Torres Vibe
                      </div>
                      <div className="text-xs font-light text-gray-500">
                        Christopher Torres
                      </div>
                    </div>
                  </div>

                  <div className="rounded-lg border border-gray-200 p-4">
                    <div className="text-sm font-semibold text-dark-blue-400">
                      Marketing
                    </div>
                    <div className="mt-2 text-xs font-light leading-5 text-gray-500">
                      Building an ambitious mobile product with a small but focused
                      internal team.
                    </div>
                  </div>
                </div>

                <div className="absolute inset-x-6 top-1/2 -translate-y-1/2 rounded-lg border border-gray-200 bg-white p-5 shadow-lg">
                  <div className="flex items-start gap-3">
                    <span className="inline-flex size-8 items-center justify-center rounded-full bg-primary-25 text-primary-500">
                      <HelpCircle className="size-4" />
                    </span>
                    <div>
                      <h3 className="text-sm font-semibold leading-5 text-dark-blue-400">
                        Upgrade your account to see client info
                      </h3>
                      <p className="mt-2 text-xs font-light leading-5 text-gray-500">
                        In order to see detailed client info, you will have to
                        have a premium membership.
                      </p>
                      <Button
                        variant="link"
                        visual="gray"
                        className="mt-3 px-0 text-primary-500"
                      >
                        Upgrade Now
                        <ChevronRight className="size-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </section>
            )}
          </aside>
        </div>
      </div>

      {isLegalServiceNda ? (
        <Dialog
          open={reviewModalOpen}
          onOpenChange={(open) => {
            if (!open) {
              closeNdaModal()
              return
            }

            setReviewModalOpen(true)
          }}
        >
          <DialogContent
            variant="unanimated"
            className="pointer-events-none inset-0 flex max-w-none items-center justify-center bg-transparent p-4 shadow-none"
            accessibilityTitle={
              ndaModalStep === "review" ? "Review NDA" : "Sign NDA"
            }
            dialogOverlay={
              <div className="fixed inset-0 z-50 bg-gray-700/70 backdrop-blur-[2px]" />
            }
          >
            {ndaModalStep === "review" ? (
              <div className="pointer-events-auto flex h-[748px] w-full max-w-[640px] flex-col overflow-hidden rounded-[20px] bg-white shadow-xl">
                <div className="flex items-start justify-between border-b border-gray-200 px-6 py-5">
                  <div>
                    <DialogTitle className="text-[18px] font-semibold leading-7 text-dark-blue-400">
                      Non-Disclosure Agreement (NDA)
                    </DialogTitle>
                    <DialogDescription className="mt-1 text-sm font-light text-gray-500">
                      Review and sign to continue
                    </DialogDescription>
                  </div>

                  <DialogClose asChild>
                    <IconButton variant="ghost" visual="gray" size="md">
                      <X className="size-5" />
                    </IconButton>
                  </DialogClose>
                </div>

                <div className="relative flex-1 overflow-hidden px-6 pt-6">
                  <div
                    ref={reviewScrollRef}
                    className="h-full overflow-y-auto rounded-[14px] bg-gray-50"
                  >
                    {reviewError ? (
                      <div className="flex min-h-full flex-col items-center justify-center px-6 text-center">
                        <h3 className="text-base font-semibold text-dark-blue-400">
                          Document unavailable
                        </h3>
                        <p className="mt-2 text-sm font-light leading-6 text-gray-500">
                          Please try again later.
                        </p>
                        <Button
                          variant="outlined"
                          visual="gray"
                          size="sm"
                          className="mt-5"
                          onClick={closeNdaModal}
                        >
                          Close
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-4 pb-10">
                        {NDA_REVIEW_PAGES.map((pageSrc, index) => (
                          <div
                            key={pageSrc}
                            ref={(element) => {
                              reviewPageRefs.current[index] = element
                            }}
                            data-page-index={index + 1}
                            className="relative min-h-[707px] overflow-hidden rounded-[10px] bg-white shadow-[0px_8px_24px_rgba(16,24,40,0.08)]"
                          >
                            <div className="absolute inset-0 overflow-hidden">
                              <img
                                src={pageSrc}
                                alt={`NDA review page ${index + 1}`}
                                className="block h-full w-full scale-105 object-fill"
                                onLoad={handleReviewPageLoad}
                                onError={handleReviewPageError}
                              />
                            </div>
                          </div>
                        ))}
                        <div ref={reviewSentinelRef} className="h-1 w-full" />
                      </div>
                    )}

                    {reviewLoading ? (
                      <div className="pointer-events-none absolute inset-x-6 top-6 flex h-[calc(100%-1.5rem)] items-center justify-center rounded-[14px] bg-white/70 backdrop-blur-[1px]">
                        <div className="space-y-4">
                          <div className="h-[260px] w-[440px] rounded-[10px] bg-gray-100" />
                          <div className="h-[260px] w-[440px] rounded-[10px] bg-gray-100" />
                        </div>
                      </div>
                    ) : null}
                  </div>

                  <div className="pointer-events-none absolute bottom-3 right-10 text-[28px] font-light leading-none text-dark-blue-400">
                    {reviewCurrentPage}/{NDA_REVIEW_PAGE_COUNT}
                  </div>
                </div>

                <div className="flex items-center justify-between gap-3 border-t border-gray-200 px-6 py-5">
                  <Button
                    variant="ghost"
                    visual="gray"
                    className="px-0 text-dark-blue-400"
                    onClick={closeNdaModal}
                  >
                    Cancel
                  </Button>

                  <div className="flex items-center gap-3">
                    <Button variant="outlined" visual="gray" asChild>
                      <a
                        href={ndaPreviewPdfUrl ?? NDA_REVIEW_PDF_HREF}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Download PDF
                      </a>
                    </Button>
                    <Button
                      disabled={
                        !reviewGateCleared || reviewLoading || reviewError !== null
                      }
                      onClick={handleContinueToSignPlaceholder}
                    >
                      Continue to Sign
                    </Button>
                  </div>
                </div>
              </div>
            ) : ndaModalStep === "success" ? (
              <div className="pointer-events-auto flex h-[748px] w-full max-w-[640px] flex-col overflow-hidden rounded-[20px] bg-white shadow-xl">
                <div className="flex items-start justify-between border-b border-gray-200 px-6 py-5">
                  <div className="flex items-start gap-3">
                    <div>
                      <div className="flex flex-wrap items-center gap-3">
                        <DialogTitle className="text-[18px] font-semibold leading-7 text-dark-blue-400">
                          Non-Disclosure Agreement (NDA)
                        </DialogTitle>
                        <Badge visual="success" size="md">
                          <Check className="size-3.5 text-success-600" />
                          Signed
                        </Badge>
                      </div>
                      <DialogDescription className="mt-1 text-sm font-light text-gray-500">
                        You can now view the project scope
                      </DialogDescription>
                    </div>
                  </div>

                  <DialogClose asChild>
                    <IconButton variant="ghost" visual="gray" size="md">
                      <X className="size-5" />
                    </IconButton>
                  </DialogClose>
                </div>

                <div className="relative flex-1 overflow-hidden px-6 pt-6">
                  <div
                    ref={reviewScrollRef}
                    className="h-full overflow-y-auto rounded-[14px] bg-gray-50"
                  >
                    <div className="space-y-4 pb-10">
                      {NDA_REVIEW_PAGES.map((pageSrc, index) => (
                        <div
                          key={`${pageSrc}-signed`}
                          ref={(element) => {
                            reviewPageRefs.current[index] = element
                          }}
                          data-page-index={index + 1}
                          className="relative min-h-[707px] overflow-hidden rounded-[10px] bg-white shadow-[0px_8px_24px_rgba(16,24,40,0.08)]"
                        >
                          <div className="absolute inset-0 overflow-hidden">
                            <img
                              src={pageSrc}
                              alt={`Signed NDA page ${index + 1}`}
                              className="block h-full w-full scale-105 object-fill"
                            />
                          </div>
                          {index === NDA_REVIEW_PAGES.length - 1 ? (
                            <>
                              <div className="pointer-events-none absolute left-[10%] top-[44%] h-[18%] w-[55%] bg-white" />
                              <div className="pointer-events-none absolute left-[11%] top-[44.5%] w-[52%]">
                                {signedArtifactForPreview ? (
                                  <img
                                    src={signedArtifactForPreview}
                                    alt="Signed signature"
                                    className="max-h-[52px] w-auto max-w-full object-contain"
                                  />
                                ) : (
                                  <p className="truncate capitalize font-['Dancing_Script',_'Pacifico',_cursive] text-[26px] italic leading-snug text-dark-blue-400">
                                    {signedByName}
                                  </p>
                                )}
                                <div className="mt-1 h-px w-full bg-gray-400" />
                              </div>
                            </>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="pointer-events-none absolute bottom-3 right-10 text-[28px] font-light leading-none text-dark-blue-400">
                    {reviewCurrentPage}/{NDA_REVIEW_PAGE_COUNT}
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 border-t border-gray-200 px-6 py-5">
                  <Button variant="outlined" visual="gray" asChild>
                    <a
                      href={signedPdfUrl ?? NDA_REVIEW_PDF_HREF}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Download Signed PDF
                    </a>
                  </Button>
                  <Button onClick={handleViewScope}>View Scope</Button>
                </div>
              </div>
            ) : (
              <div className="pointer-events-auto flex h-[748px] w-full max-w-[640px] flex-col overflow-hidden rounded-[20px] bg-white shadow-xl">
                <div className="flex items-start justify-between border-b border-gray-200 px-6 py-5">
                  <div className="flex items-start gap-3">
                    <IconButton
                      variant="ghost"
                      visual="gray"
                      size="md"
                      onClick={() => setNdaModalStep("review")}
                    >
                      <ArrowLeft className="size-5" />
                    </IconButton>
                    <div>
                      <DialogTitle className="text-[18px] font-semibold leading-7 text-dark-blue-400">
                        Non-Disclosure Agreement (NDA)
                      </DialogTitle>
                      <DialogDescription className="mt-1 text-sm font-light text-gray-500">
                        Review and sign to continue
                      </DialogDescription>
                    </div>
                  </div>

                  <DialogClose asChild>
                    <IconButton variant="ghost" visual="gray" size="md">
                      <X className="size-5" />
                    </IconButton>
                  </DialogClose>
                </div>

                <div className="flex-1 overflow-y-auto px-6 py-8">
                  <>
                      <p className="text-[17px] font-light leading-8 text-dark-blue-400">
                        Confirm your name, initials and signature.
                      </p>

                      <div className="mt-7 space-y-1">
                        <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_172px]">
                          <div className="space-y-1.5">
                            <Label size="sm" htmlFor="nda-signer-name" className="font-semibold text-dark-blue-400">
                              Full Name<span className="text-error-500">*</span>
                            </Label>
                            <Input
                              id="nda-signer-name"
                              placeholder="Enter your full name"
                              value={signerName}
                              isInvalid={showNameInvalid || signError === "name-mismatch"}
                              onBlur={() => setNameTouched(true)}
                              onChange={(event) => {
                                setSignerName(event.target.value)
                                // Clear name-mismatch error as user retypes
                                if (signError === "name-mismatch") setSignError(null)
                              }}
                            />
                            {showNameInvalid ? (
                              <p className="text-sm font-light text-error-500">
                                Please enter your full name.
                              </p>
                            ) : null}
                          </div>

                        <div className="space-y-1.5">
                          <Label size="sm" htmlFor="nda-signer-initials" className="font-semibold text-dark-blue-400">
                            Initials<span className="text-error-500">*</span>
                          </Label>
                          <Input
                            id="nda-signer-initials"
                            placeholder="Enter your initials"
                            value={signerInitials}
                            isInvalid={showInitialsInvalid}
                            onBlur={() => setInitialsTouched(true)}
                            onChange={(event) =>
                              setSignerInitials(event.target.value.toUpperCase())
                            }
                          />
                          {showInitialsInvalid ? (
                            <p className="text-sm font-light text-error-500">
                              Please enter your initials.
                            </p>
                          ) : null}
                        </div>
                        </div>
                        {/* Full-width name mismatch error spans below both fields */}
                        {signError === "name-mismatch" ? (
                          <p className="mt-1.5 text-sm font-light text-error-500">
                            The name you entered doesn&apos;t match your registered name. Please type your legal name exactly as it appears in your account.
                          </p>
                        ) : null}
                      </div>

                      <div className="mt-6">
                        {signingMethod === "upload" ? (
                          <div className="relative rounded-[10px] border border-gray-200 bg-white px-6 py-10 text-center">
                        <button
                          type="button"
                          className="absolute right-3 top-3 inline-flex size-6 items-center justify-center rounded-full border border-gray-300 bg-white text-gray-400 transition duration-300 hover:text-gray-500 focus-visible:outline-none"
                          onClick={clearUploadSignature}
                        >
                          <X className="size-4" />
                        </button>
                        <input
                          id="nda-signature-upload-input"
                          ref={signatureUploadInputRef}
                          type="file"
                          accept=".png,.jpg,.jpeg"
                          className="hidden"
                          onChange={handleSignatureUploadChange}
                        />

                        {uploadedSignatureFile ? (
                          <div className="flex min-h-[166px] flex-col items-center justify-center">
                            <img
                              src={uploadedSignatureFile.dataUrl}
                              alt={uploadedSignatureFile.name}
                              className="mx-auto max-h-[96px] w-auto"
                            />
                            <p className="mt-6 text-base font-medium text-dark-blue-400">
                              {uploadedSignatureFile.name}
                              <span className="ml-2 text-xs font-light text-gray-500">
                                {uploadedSignatureFile.sizeLabel}
                              </span>
                            </p>
                          </div>
                        ) : (
                          <div className="rounded-[10px] border-2 border-dashed border-gray-300 bg-gray-50 px-6 py-10 text-center">
                            <UploadCloud className="mx-auto size-6 text-primary-500" />
                            <p className="mt-4 text-base font-medium text-dark-blue-400">
                              Upload your signature image
                            </p>
                            <p className="mt-2 text-sm font-light text-gray-500">
                              PNG, JPG, JPEG formats, up to 2MB
                            </p>
                            <div className="mt-6 flex items-center justify-center gap-3">
                              <Button
                                variant="outlined"
                                visual="gray"
                                onClick={clearUploadSignature}
                              >
                                Cancel
                              </Button>
                              <Button
                                variant="outlined"
                                visual="gray"
                                onClick={openUploadSignaturePicker}
                              >
                                Browse File
                              </Button>
                            </div>
                          </div>
                        )}
                        {uploadError ? (
                          <p className="mt-4 text-sm font-light text-error-500">
                            {uploadError}
                          </p>
                        ) : null}
                          </div>
                        ) : signingMethod === "draw" ? (
                          <div className="relative grid min-h-[188px] gap-0 overflow-hidden rounded-[10px] border border-gray-200 bg-white md:grid-cols-[minmax(0,1fr)_168px]">
                        <button
                          type="button"
                          className="absolute right-3 top-3 z-10 inline-flex size-6 items-center justify-center rounded-full border border-gray-300 bg-white text-gray-400 transition duration-300 hover:text-gray-500 focus-visible:outline-none"
                          onClick={clearDrawArtifacts}
                        >
                          <X className="size-4" />
                        </button>
                        <div className="flex flex-col items-center justify-center px-8 py-8">
                          <canvas
                            ref={drawSignatureCanvasRef}
                            width={600}
                            height={200}
                            className="h-[112px] w-full touch-none"
                            onPointerDown={handleDrawPointerDown("signature")}
                            onPointerMove={handleDrawPointerMove}
                            onPointerUp={handleDrawPointerUp}
                            onPointerLeave={handleDrawPointerLeave}
                          />
                          <div className="h-0 w-full border-t border-dashed border-gray-300" />
                          <button
                            type="button"
                            className="mt-4 text-sm font-medium text-primary-500"
                            onClick={clearDrawSignature}
                          >
                            {drawnSignatureDataUrl ? "Clear Signature" : "Draw Signature"}
                          </button>
                        </div>
                        <div className="flex flex-col items-center justify-center border-t border-gray-200 px-8 py-8 md:border-l md:border-t-0">
                          <canvas
                            ref={drawInitialsCanvasRef}
                            width={300}
                            height={200}
                            className="h-[112px] w-full touch-none"
                            onPointerDown={handleDrawPointerDown("initials")}
                            onPointerMove={handleDrawPointerMove}
                            onPointerUp={handleDrawPointerUp}
                            onPointerLeave={handleDrawPointerLeave}
                          />
                          <div className="h-0 w-full border-t border-dashed border-gray-300" />
                          <button
                            type="button"
                            className="mt-4 text-sm font-medium text-primary-500"
                            onClick={clearDrawInitials}
                          >
                            {drawnInitialsDataUrl ? "Clear Initials" : "Draw Initials"}
                          </button>
                        </div>
                          </div>
                        ) : (
                          <div className="flex min-h-[188px] items-center justify-center rounded-[10px] border border-gray-200 bg-white px-6 py-10">
                            <p className="text-[40px] font-light leading-none text-dark-blue-400">
                              {typedSignaturePreview || "Preview"}
                            </p>
                          </div>
                        )}
                      </div>

                      <div className="mt-6 grid gap-4 md:grid-cols-2">
                        {signingMethod !== "typed" ? (
                          <Button
                            variant="light"
                            visual="primary"
                            size="md"
                            leftIcon={<Type02 className="size-4" />}
                            onClick={() => switchSigningMethod("typed")}
                          >
                            Type my signature
                          </Button>
                        ) : (
                          <Button
                            variant="light"
                            visual="primary"
                            size="md"
                            leftIcon={<UploadCloud className="size-4" />}
                            onClick={() => switchSigningMethod("upload")}
                          >
                            Upload my signature
                          </Button>
                        )}

                        {signingMethod === "draw" ? (
                          <Button
                            variant="light"
                            visual="primary"
                            size="md"
                            leftIcon={<UploadCloud className="size-4" />}
                            onClick={() => switchSigningMethod("upload")}
                          >
                            Upload my signature
                          </Button>
                        ) : (
                          <Button
                            variant="light"
                            visual="primary"
                            size="md"
                            leftIcon={<Edit03 className="size-4" />}
                            onClick={() => switchSigningMethod("draw")}
                          >
                            Draw my signature
                          </Button>
                        )}
                      </div>

                      <div className="mt-6 rounded-lg border border-gray-200 bg-gray-25 p-4">
                        <label
                          htmlFor="nda-consent-checkbox"
                          className="flex items-start gap-3"
                        >
                          <Checkbox
                            id="nda-consent-checkbox"
                            size="md"
                            checked={consentChecked}
                            onBlur={() => setConsentTouched(true)}
                            onCheckedChange={(checked) =>
                              setConsentChecked(checked === true)
                            }
                          />
                          <span className="text-sm font-light leading-6 text-gray-500">
                            {NDA_SIGN_CONSENT_LABEL}
                          </span>
                        </label>
                        {showConsentInvalid ? (
                          <p className="mt-3 text-sm font-light text-error-500">
                            Please agree to the electronic signature consent to continue.
                          </p>
                        ) : null}
                      </div>
                  </>
                </div>

                <div className="flex items-center justify-end gap-3 border-t border-gray-200 px-6 py-5">
                  <Button
                    variant="ghost"
                    visual="gray"
                    className="px-0 text-dark-blue-400"
                    onClick={closeNdaModal}
                  >
                    Cancel
                  </Button>
                  <Button
                    disabled={!signActionEnabled || isSignSubmitting}
                    onClick={() => void handleSignNda()}
                  >
                    {isSignSubmitting ? "Signing…" : "Sign NDA"}
                  </Button>
                </div>

                {/* Backend sign error messages */}
                {signError === "locked-out" && (
                  <p className="mt-2 px-6 text-sm font-light text-error-500">
                    Too many failed attempts. Please contact support.
                  </p>
                )}
                {signError === "rate-limited" && (
                  <p className="mt-2 px-6 text-sm font-light text-error-500">
                    Too many signing attempts. Please wait a minute and try again.
                  </p>
                )}
                {signError === "already-signed" && (
                  <p className="mt-2 px-6 text-sm font-light text-gray-500">
                    You have already signed this NDA.
                  </p>
                )}
                {signError === "voided" && (
                  <p className="mt-2 px-6 text-sm font-light text-error-500">
                    This NDA has been cancelled and can no longer be signed.
                  </p>
                )}
                {signError === "forbidden" && (
                  <p className="mt-2 px-6 text-sm font-light text-error-500">
                    You don&apos;t have permission to sign this NDA.
                  </p>
                )}
                {signError === "unavailable" && (
                  <p className="mt-2 px-6 text-sm font-light text-error-500">
                    Service temporarily unavailable. Please try again.
                  </p>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>
      ) : null}

    </div>
  )
}
