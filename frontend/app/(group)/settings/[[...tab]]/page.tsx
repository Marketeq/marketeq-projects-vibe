"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useBillingExportStore } from "@/lib/billing-export"
import { useParams, useRouter, useSearchParams } from "next/navigation"
import { useDropzone } from "react-dropzone"
import Cookies from "js-cookie"
import { resolveDashboardRole, useAuth } from "@/contexts/auth"
import AuthenticatedRoute from "@/hoc/AuthenticatedRoute"
import { UserAPI, UserProfilePayload } from "@/service/http/user"
import { useRefreshUser } from "../hooks/use-refresh-user"
import { useCompanyInfo } from "../hooks/use-company-info"
import { useSecurityQuestions } from "../hooks/use-security-questions"
import { useClientIp } from "../hooks/use-client-ip"
import { useAllowedIps } from "../hooks/use-allowed-ips"
import AllowedIpsAPI from "@/service/http/allowed-ips"
import { AuthAPI } from "@/service/http/auth"
import { ClientAPI } from "@/service/http/client"
import {
  getCompanyMembers,
  updateCompanyMember,
  removeCompanyMember,
} from "@/service/http/companies"
import type { CompanyMember } from "@/types/company"
import { cn, convertToKbOrMb, getIsNotEmpty } from "@/utils/functions"
import languagesMock from "@/public/mock/languages.json"
import ActiveSessionsModal from "@/components/active-sessions-modal"
import NotificationPreferences from "@/components/notification-preferences"
import PrivacySettings from "@/components/privacy-settings"
import SecuritySettingsStepper from "@/components/security-settings"
import { SettingsTaxInfo } from "@/components/settings-tax-info"
import SettingsSidebar, {
  buildSettingsTabItems,
} from "@/components/settings-sidebar"
import {
  DisableTwoFactorModal,
  TwoFactorSetupModal,
} from "@/components/two-factor-setup"
import { PhoneNumberInput, isPhoneValid } from "@/components/phone-number-input"
import dynamic from "next/dynamic"
import { AndroidBrand, AppleBrand, MicrosoftBrand } from "@blend-metrics/icons/brands"
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  Check,
  DotsHorizontal,
  CheckCircle,
  ChevronDown,
  ArrowLeft,
  ChevronRight,
  Dot,
  Edit01,
  Eye,
  EyeOff,
  File04,
  Fingerprint01,
  LayersThree01,
  Lock01,
  Mail01,
  Smartphone,
  HelpCircle,
  Image as ImageIcon,
  InfoCircle,
  LinkExternal01,
  Phone,
  Plus,
  SearchLg,
  SearchMd,
  Save01,
  Send01,
  Settings02,
  Shield01,
  ShieldOff,
  Share06,
  Trash01,
  Trash03,
  Upload01,
  User01,
  Users01,
  Zap,
  UploadCloud02,
  X,
  X2,
  XCircle,
  FilterLines,
  ArrowRight,
} from "@blend-metrics/icons"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui"
import { useInviteWindowStore } from "@/components/invite-window"
import type { BillingTabValue } from "@/components/billing-section-header"
import {
  BillingPaymentMethodsContent,
  BillingPaymentMethodsContentHandle,
} from "@/app/(group)/payments/page"

const BillingOverviewContent = dynamic(
  () => import("@/app/(group)/billing/page").then((m) => m.BillingOverviewContent),
  { ssr: false }
)
const BillingTransactionsContent = dynamic(
  () => import("@/components/billing-transactions-content").then((m) => m.BillingTransactionsContent),
  { ssr: false }
)
const BillingInvoicesContent = dynamic(
  () => import("@/app/(group)/invoices/page").then((m) => m.BillingInvoicesContent),
  { ssr: false }
)
const BillingMyPlansContent = dynamic(
  () => import("@/app/(group)/billing/page").then((m) => m.BillingMyPlansContent),
  { ssr: false }
)
import {
  Alert,
  AlertContent,
  AlertIcon,
  AlertTitle,
  Avatar,
  AvatarFallback,
  AvatarFallbackIcon,
  AvatarImage,
  Badge,
  Button,
  Checkbox,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogOverlay,
  DialogTitle,
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
  RadioGroup,
  RadioGroupItem,
  Progress,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  useToast,
} from "@/components/ui"


// ── Integrations discover data ─────────────────────────────────────
const INTEGRATIONS = [
  { name: "Jira", description: "Track issues and manage agile projects with Jira integration.", tagline: "Track issues, boards, and sprints within Jira", color: "#2684FF", connected: true },
  { name: "Asana", description: "Organize tasks and projects with your Asana workspace.", tagline: "Organize tasks and projects with Asana", color: "#F06A6A", connected: true },
  { name: "Trello", description: "Manage boards, lists and cards from your Trello account.", tagline: "Manage boards, lists, and cards from Trello", color: "#0079BF", connected: true },
  { name: "Slack", description: "Get real-time notifications and updates in your Slack channels.", tagline: "Get notifications, tasks, and slash commands within Slack", color: "#4A154B", connected: false },
  { name: "Monday.com", description: "Sync workflows and track progress with Monday.com.", tagline: "Sync workflows and track progress with Monday.com", color: "#FF3D57", connected: false },
  { name: "Notion", description: "Connect your Notion workspace for docs and knowledge base.", tagline: "Connect your Notion workspace for docs and wikis", color: "#000000", connected: false },
  { name: "Wrike", description: "Collaborate on projects and tasks with Wrike integration.", tagline: "Collaborate on projects and tasks with Wrike", color: "#08CF65", connected: true },
  { name: "Smartsheet", description: "Automate workflows and manage projects in Smartsheet.", tagline: "Automate workflows and manage projects in Smartsheet", color: "#0073EA", connected: false },
  { name: "Airtable", description: "Connect your Airtable bases for flexible data management.", tagline: "Connect your Airtable bases for flexible data management", color: "#18BFFF", connected: false },
  { name: "Basecamp", description: "Keep your team on the same page with Basecamp projects.", tagline: "Keep your team on the same page with Basecamp", color: "#1D2D35", connected: false },
  { name: "Teamwork", description: "Manage client work and team collaboration with Teamwork.", tagline: "Manage client work and team collaboration with Teamwork", color: "#4461D7", connected: false },
  { name: "Planview", description: "Enterprise-grade portfolio and resource management.", tagline: "Enterprise-grade portfolio and resource management", color: "#002D72", connected: false },
] as const

// Cap on how many IPs one dialog can add before "Add More" greys out.
const MAX_IP_ROWS = 10

// Current session first, then most recently active — the ordering
// ActiveSessionsModal already uses. Shared so the initial load and the refetch
// after a removal cannot drift apart, which is what made the list silently
// reorder once a device was removed.
const sortDeviceSessions = <T extends { isCurrent: boolean; lastActiveAt: string }>(
  sessions: T[]
): T[] =>
  [...sessions].sort((a, b) => {
    if (a.isCurrent) return -1
    if (b.isCurrent) return 1
    return (
      new Date(b.lastActiveAt).getTime() - new Date(a.lastActiveAt).getTime()
    )
  })

// Comma-separated list column -> array. Shared so the load, the dirty check
// and the cancel handler read a stored value identically; if they disagreed the
// form would read as dirty the moment it loaded.
const splitList = (value?: string | null): string[] =>
  value
    ? value
        .split(",")
        .map((part) => part.trim())
        .filter(Boolean)
    : []

export default function SettingsPage() {
  const { user, setUser, logoutHandler } = useAuth()
  const { toast } = useToast()
  const refreshUser = useRefreshUser()
  const router = useRouter()
  const routeParams = useParams()
  const searchParams = useSearchParams()

  // /settings/<tab> is the real URL. ?tab= is still honoured so links shared
  // before this existed keep working, and bare /settings lands on the first
  // tab. The segment ids match the hrefs in settings-sidebar.tsx.
  const segments = routeParams?.tab
  const routeTab = Array.isArray(segments) ? segments[0] : segments
  const tabParam = routeTab ?? searchParams.get("tab")
  const [activeTab, setActiveTab] = useState(tabParam || "personal-info")
  const [selectedIntegration, setSelectedIntegration] = useState<(typeof INTEGRATIONS)[number] | null>(null)
  const [detailTab, setDetailTab] = useState<"overview" | "settings">("overview")
  const [uninstallDialogOpen, setUninstallDialogOpen] = useState(false)
  const [descriptionExpanded, setDescriptionExpanded] = useState(false)

  useEffect(() => {
    if (tabParam) setActiveTab(tabParam)
  }, [tabParam])

  // Selecting a tab now becomes a navigation, so each screen is linkable and
  // the back button walks between them.
  const goToTab = useCallback(
    (tab: string) => {
      setActiveTab(tab)
      router.push(`/settings/${tab}`, { scroll: false })
    },
    [router]
  )

  const {
    company,
    save: saveCompanyInfo,
  } = useCompanyInfo(activeTab === "company-info" || activeTab === "users")

  // ── Permissions flyout state (users tab) ──────────────────────
  type TeamMemberRow = {
    userId: string
    name: string
    email: string
    avatar: string
    role: string
    company: string
    status: "active" | "pending"
    permissions: string[]
  }
  const [teamMembers, setTeamMembers] = useState<TeamMemberRow[]>([])
  const [teamMembersLoaded, setTeamMembersLoaded] = useState(false)
  const [editingMemberIdx, setEditingMemberIdx] = useState<number | null>(null)
  const [permsFlyoutVisible, setPermsFlyoutVisible] = useState(false)
  const [permSearch, setPermSearch] = useState("")
  const [selectedPerms, setSelectedPerms] = useState<string[]>([])
  const [removeMemberIdx, setRemoveMemberIdx] = useState<number | null>(null)
  const [usersSortKey, setUsersSortKey] = useState<"name" | "role" | "company" | "status" | null>("name")
  const [usersSortDir, setUsersSortDir] = useState<"asc" | "desc">("asc")

  const permissionCategories = useMemo(
    () => [
      {
        title: "Contracts & Hiring",
        roles: [
          {
            id: "hiring-manager",
            label: "Hiring Manager",
            desc: "Create, edit, and end contracts. Send, negotiate, accept/decline offers. Complete checkout and approve spend.",
          },
          {
            id: "negotiator",
            label: "Negotiator",
            desc: "Manage all contracts and offers, send/accept/decline offers. Cannot end contracts, start new spend, or change settings.",
          },
          {
            id: "drafter",
            label: "Drafter",
            desc: "Draft offers and add comments. Cannot send, approve, end, or spend.",
          },
          {
            id: "observer",
            label: "Observer",
            desc: "Read-only view of contracts and offers.",
          },
        ],
      },
      {
        title: "Jobs & Talent",
        roles: [
          {
            id: "recruitment-lead",
            label: "Recruitment Lead",
            desc: "Create, edit, publish, and close jobs. Search talent, save jobs and talent to the account, send invitations, manage the candidate pipeline.",
          },
          {
            id: "recruiter",
            label: "Recruiter",
            desc: "Edit and publish jobs, search talent, save talent and jobs, suggest candidates, approve shortlists. Cannot delete postings or change settings.",
          },
          {
            id: "sourcer",
            label: "Sourcer",
            desc: "Create draft jobs, search talent, save jobs and talent to the account's shortlists, add candidate notes. Cannot publish or invite.",
          },
          {
            id: "contributor-jt",
            label: "Contributor",
            desc: "This is where the role's permissions and limitations are briefly explained.",
          },
          {
            id: "viewer-jt",
            label: "Viewer",
            desc: "This is where the role's permissions and limitations are briefly explained.",
          },
        ],
      },
      {
        title: "Finance Roles",
        roles: [
          {
            id: "super-admin",
            label: "Super Admin",
            desc: "This is where the role's permissions and limitations are briefly explained.",
          },
          {
            id: "manager-fin",
            label: "Manager",
            desc: "This is where the role's permissions and limitations are briefly explained.",
          },
          {
            id: "bookkeeper",
            label: "Bookkeeper",
            desc: "View all transactions and invoices in full detail and export them. Cannot move money or change anything.",
          },
          {
            id: "moderator",
            label: "Moderator",
            desc: "Access all team threads, triage and reassign, message talent and members. Cannot change account-wide settings.",
          },
          {
            id: "analyst",
            label: "Analyst",
            desc: "View all dashboards and reports, build and export reports, set date ranges. Cannot configure shared dashboards.",
          },
        ],
      },
    ],
    []
  )

  const filteredPermCategories = useMemo(() => {
    if (!permSearch.trim()) return permissionCategories
    const q = permSearch.toLowerCase()
    return permissionCategories
      .map((cat) => ({
        ...cat,
        roles: cat.roles.filter(
          (r) =>
            r.label.toLowerCase().includes(q) ||
            r.desc.toLowerCase().includes(q)
        ),
      }))
      .filter((cat) => cat.roles.length > 0)
  }, [permSearch, permissionCategories])

  const togglePerm = useCallback((id: string) => {
    setSelectedPerms((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    )
  }, [])

  // Build a flat lookup: role label -> role id
  const roleLabelToId = useMemo(() => {
    const map = new Map<string, string>()
    for (const cat of permissionCategories) {
      for (const r of cat.roles) {
        map.set(r.label.toLowerCase(), r.id)
      }
    }
    return map
  }, [permissionCategories])

  const roleIdToLabel = useMemo(() => {
    const map = new Map<string, string>()
    for (const cat of permissionCategories) {
      for (const r of cat.roles) {
        map.set(r.id, r.label)
      }
    }
    return map
  }, [permissionCategories])

  const openPermsFlyout = useCallback((idx: number) => {
    setEditingMemberIdx(idx)
    setPermSearch("")
    // Pre-select from the member's stored permissions array, or fall back to matching by role label
    const member = teamMembers[idx]
    if (member?.permissions?.length) {
      setSelectedPerms([...member.permissions])
    } else if (member?.role) {
      // Try matching each comma-separated role label to a permission id
      const ids = member.role
        .split(", ")
        .map((r) => roleLabelToId.get(r.trim().toLowerCase()))
        .filter(Boolean) as string[]
      setSelectedPerms(ids)
    } else {
      setSelectedPerms([])
    }
    // Mount first, then animate in on next frame
    requestAnimationFrame(() => setPermsFlyoutVisible(true))
  }, [teamMembers, roleLabelToId])

  const closePermsFlyout = useCallback(() => {
    setPermsFlyoutVisible(false)
    // Wait for slide-out transition to finish before unmounting
    setTimeout(() => {
      setEditingMemberIdx(null)
      setPermSearch("")
      setSelectedPerms([])
    }, 150)
  }, [])

  const applyPerms = useCallback(async () => {
    if (editingMemberIdx === null || selectedPerms.length === 0) return
    const member = teamMembers[editingMemberIdx]
    if (!member) return

    // Build a combined role label from selected permissions
    const labels = selectedPerms
      .map((id) => roleIdToLabel.get(id))
      .filter(Boolean) as string[]
    const newRole = labels.join(", ")

    // Persist to backend if we have a company
    if (company?.id && member.userId) {
      try {
        await updateCompanyMember(company.id, member.userId, {
          permissions: selectedPerms,
        })
        toast({ title: "Permissions updated", variant: "success" })
      } catch (err) {
        console.error("[settings/users] failed to update permissions", err)
        toast({ title: "Failed to update permissions", variant: "success" })
        return
      }
    }

    setTeamMembers((prev) =>
      prev.map((m, i) => (i === editingMemberIdx ? { ...m, role: newRole, permissions: selectedPerms } : m))
    )
    closePermsFlyout()
  }, [editingMemberIdx, selectedPerms, roleIdToLabel, closePermsFlyout, teamMembers, company, toast])

  const handleRemoveMember = useCallback(async () => {
    if (removeMemberIdx === null) return
    const member = teamMembers[removeMemberIdx]

    if (company?.id && member?.userId) {
      try {
        await removeCompanyMember(company.id, member.userId)
      } catch (err) {
        console.error("[settings/users] failed to remove member", err)
        toast({ title: "Failed to remove user", variant: "success" })
        setRemoveMemberIdx(null)
        return
      }
    }

    setTeamMembers((prev) => prev.filter((_, i) => i !== removeMemberIdx))
    setRemoveMemberIdx(null)
    toast({ title: "User removed successfully", variant: "success" })
  }, [removeMemberIdx, teamMembers, company, toast])

  const handleResendInvite = useCallback((idx: number) => {
    const member = teamMembers[idx]
    if (!member) return
    toast({ title: `Invite resent to ${member.email}`, variant: "success" })
  }, [teamMembers, toast])

  const handleCancelInvite = useCallback((idx: number) => {
    setTeamMembers((prev) => prev.filter((_, i) => i !== idx))
    toast({ title: "Invitation cancelled", variant: "success" })
  }, [toast])

  const toggleUsersSort = useCallback((key: "name" | "role" | "company" | "status") => {
    if (usersSortKey === key) {
      setUsersSortDir((d) => (d === "asc" ? "desc" : "asc"))
    } else {
      setUsersSortKey(key)
      setUsersSortDir("asc")
    }
  }, [usersSortKey])

  const sortedTeamMembers = useMemo(() => {
    if (!usersSortKey) return teamMembers
    return [...teamMembers].sort((a, b) => {
      const aVal = (a[usersSortKey] || "").toLowerCase()
      const bVal = (b[usersSortKey] || "").toLowerCase()
      const cmp = aVal.localeCompare(bVal)
      return usersSortDir === "asc" ? cmp : -cmp
    })
  }, [teamMembers, usersSortKey, usersSortDir])

  // Load company members when the Users tab is active
  useEffect(() => {
    if (activeTab !== "users" || !company?.id || teamMembersLoaded) return
    let cancelled = false
    getCompanyMembers(company.id)
      .then((members) => {
        if (cancelled) return
        setTeamMembers(
          members.map((m: CompanyMember) => ({
            userId: m.userId,
            name: m.name || "",
            email: m.email || "",
            avatar: m.avatarUrl || "",
            role: m.permissions?.length
              ? m.permissions.join(", ")
              : m.role || "",
            company: company.name,
            status: (m.role === "pending" ? "pending" : "active") as "active" | "pending",
            permissions: m.permissions || [],
          }))
        )
        setTeamMembersLoaded(true)
      })
      .catch((err) => {
        console.warn("[settings/users] could not load members", err)
        setTeamMembersLoaded(true)
      })
    return () => { cancelled = true }
  }, [activeTab, company, teamMembersLoaded])

  const { ip: currentIpAddress } = useClientIp(activeTab === "ip-restrictions")
  const {
    entries: allowedIps,
    error: allowedIpsError,
    addMany: addAllowedIps,
    updateOne: updateAllowedIp,
    removeOne: removeAllowedIpEntry,
  } = useAllowedIps(activeTab === "ip-restrictions")

  const toggleInviteWindow = useInviteWindowStore((s) => s.toggle)
  const invoiceExporters = useBillingExportStore((s) => s.exporters.invoices)
  const transactionExporters = useBillingExportStore((s) => s.exporters.transactions)
  const [isAddIpsOpen, setIsAddIpsOpen] = useState(false)
  const [ipEntryType, setIpEntryType] = useState("single")
  const [ipRows, setIpRows] = useState([
    { address: "", rangeFrom: "", rangeTo: "", description: "" },
  ])
  const [isIpDiscardOpen, setIsIpDiscardOpen] = useState(false)
  const [editingIpId, setEditingIpId] = useState<string | null>(null)
  const [ipFormBaseline, setIpFormBaseline] = useState("")
  const [isCsvOpen, setIsCsvOpen] = useState(false)
  const [csvFileName, setCsvFileName] = useState<string | null>(null)
  const [csvEntries, setCsvEntries] = useState<
    { id: string; address: string; description: string; addedAt: string }[]
  >([])
  const [isCsvPreview, setIsCsvPreview] = useState(false)
  const [csvFileSize, setCsvFileSize] = useState(0)
  const [csvProgress, setCsvProgress] = useState(0)
  const [csvStatus, setCsvStatus] = useState<"idle" | "uploading" | "done">(
    "idle"
  )
  const csvTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (csvStatus === "uploading" && csvProgress >= 100) setCsvStatus("done")
  }, [csvProgress, csvStatus])

  useEffect(
    () => () => {
      if (csvTimerRef.current) clearInterval(csvTimerRef.current)
    },
    []
  )
  // Defaults on, but null on the user record means "never touched this screen"
  // rather than "deliberately off", so the two stay distinguishable.
  const [isIpRestrictionEnabled, setIsIpRestrictionEnabled] = useState(true)
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [profileError, setProfileError] = useState<string | null>(null)
  const [companyError, setCompanyError] = useState<string | null>(null)
  const [ipSaveError, setIpSaveError] = useState<string | null>(null)
  const [profileForm, setProfileForm] = useState({
    firstName: "",
    lastName: "",
    username: "",
    phone: "",
    jobTitle: "",
    team: [] as string[],
    languages: [] as string[],
  })

  const [showAvatarModal, setShowAvatarModal] = useState(false)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [isAvatarRemoved, setIsAvatarRemoved] = useState(false)

  const avatarSrc = isAvatarRemoved
    ? ""
    : avatarPreview ?? user?.avatarUrl ?? ""

  const [avatarFile, setAvatarFile] = useState<File | null>(null)

  const onAvatarDropAccepted = useCallback((files: File[]) => {
    const file = files[0]
    if (!file) return

    setAvatarFile(file)

    const reader = new FileReader()
    reader.onloadend = () => {
      setIsAvatarRemoved(false)
      setAvatarPreview(reader.result as string)
    }
    reader.readAsDataURL(file)
  }, [])

  const onAvatarRemove = useCallback(() => {
    setAvatarFile(null)
    setAvatarPreview(null)
    setIsAvatarRemoved(true)
  }, [])

  const {
    getInputProps: getAvatarInputProps,
    open: openAvatarFilePicker,
  } = useDropzone({
    noClick: true,
    noDrag: true,
    multiple: false,
    maxFiles: 1,
    accept: { "image/*": [] },
    onDropAccepted: onAvatarDropAccepted,
  })

  const [showLogoModal, setShowLogoModal] = useState(false)
  const [logoPreview, setLogoPreview] = useState<string | null>(null)
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [isLogoRemoved, setIsLogoRemoved] = useState(false)

  const logoSrc = isLogoRemoved ? "" : logoPreview ?? company?.logoUrl ?? ""

  const onLogoDropAccepted = useCallback((files: File[]) => {
    const file = files[0]
    if (!file) return

    const reader = new FileReader()
    reader.onloadend = () => {
      setIsLogoRemoved(false)
      setLogoPreview(reader.result as string)
      setLogoFile(file)
    }
    reader.readAsDataURL(file)
  }, [])

  const onLogoRemove = useCallback(() => {
    setLogoPreview(null)
    setLogoFile(null)
    setIsLogoRemoved(true)
  }, [])

  const {
    getInputProps: getLogoInputProps,
    open: openLogoFilePicker,
  } = useDropzone({
    noClick: true,
    noDrag: true,
    multiple: false,
    maxFiles: 1,
    accept: { "image/*": [] },
    onDropAccepted: onLogoDropAccepted,
  })

  const [isSavedAlertMounted, setIsSavedAlertMounted] = useState(false)
  const [isSavedAlertVisible, setIsSavedAlertVisible] = useState(false)
  const [savedAlertMessage, setSavedAlertMessage] = useState("")

  useEffect(() => {
    if (!isSavedAlertMounted) return

    const fadeIn = requestAnimationFrame(() => setIsSavedAlertVisible(true))
    const fadeOut = setTimeout(() => setIsSavedAlertVisible(false), 3000)
    const unmount = setTimeout(() => setIsSavedAlertMounted(false), 3300)

    return () => {
      cancelAnimationFrame(fadeIn)
      clearTimeout(fadeOut)
      clearTimeout(unmount)
    }
  }, [isSavedAlertMounted])

  const [isUpdatePasswordOpen, setIsUpdatePasswordOpen] = useState(false)
  const [passwordForm, setPasswordForm] = useState({
    current: "",
    next: "",
    confirm: "",
  })
  const [visiblePasswords, setVisiblePasswords] = useState({
    current: false,
    next: false,
    confirm: false,
  })

  const passwordRequirements = [
    { label: "At least 8 characters", met: passwordForm.next.length >= 8 },
    { label: "One lowercase letter", met: /[a-z]/.test(passwordForm.next) },
    { label: "One uppercase letter", met: /[A-Z]/.test(passwordForm.next) },
    { label: "One number", met: /[0-9]/.test(passwordForm.next) },
    { label: "One symbol", met: /[^A-Za-z0-9]/.test(passwordForm.next) },
  ]

  const meetsPasswordRequirements = passwordRequirements.every((req) => req.met)

  const canSavePassword =
    meetsPasswordRequirements &&
    passwordForm.current !== "" &&
    passwordForm.confirm === passwordForm.next

  const isPasswordDirty =
    passwordForm.current !== "" ||
    passwordForm.next !== "" ||
    passwordForm.confirm !== ""

  const [isDiscardOpen, setIsDiscardOpen] = useState(false)
  const [isFingerprintOpen, setIsFingerprintOpen] = useState(false)
  const [acceptsFingerprintTerms, setAcceptsFingerprintTerms] = useState(false)

  const [isFingerprintEnabled, setIsFingerprintEnabled] = useState(false)

  const closeFingerprint = () => {
    setAcceptsFingerprintTerms(false)
    setIsFingerprintOpen(false)
  }

  const handleEnableFingerprint = () => {
    setIsFingerprintEnabled(true)
    setSavedAlertMessage("Successfully enabled fingerprint login")
    setIsSavedAlertMounted(true)
    closeFingerprint()
  }

  const closeUpdatePassword = () => {
    setPasswordForm({ current: "", next: "", confirm: "" })
    setVisiblePasswords({ current: false, next: false, confirm: false })
    setIsUpdatePasswordOpen(false)
  }

  const handlePasswordSave = () => {
    setSavedAlertMessage("Your password has been updated")
    setIsSavedAlertMounted(true)
    closeUpdatePassword()
  }

  const [showPasswordModal, setShowPasswordModal] = useState(false)
  const [showSessionsModal, setShowSessionsModal] = useState(false)
  const [twoFactorPhone, setTwoFactorPhone] = useState("")
  const isTwoFactorEnabled = user?.twoFactorEnabled ?? false
  const [addedTwoFactorNumbers, setAddedTwoFactorNumbers] = useState<string[]>(
    []
  )
  const [isAddingBackupNumber, setIsAddingBackupNumber] = useState(false)

  type DeviceSession = {
    id: string
    userAgent: string
    browserName?: string | null
    osName?: string | null
    deviceType?: string | null
    lastActiveAt: string
    createdAt: string
    ipAddress?: string | null
    osVersion?: string | null
    isCurrent: boolean
  }

  const [deviceDetail, setDeviceDetail] = useState<DeviceSession | null>(null)
  const [isRemoveDeviceOpen, setIsRemoveDeviceOpen] = useState(false)

  const [deviceSessions, setDeviceSessions] = useState<DeviceSession[]>([])
  const [isLoadingDevices, setIsLoadingDevices] = useState(false)
  const currentSessionId = Cookies.get("session_id") ?? ""

  useEffect(() => {
    if (activeTab !== "devices") return

    setIsLoadingDevices(true)
    AuthAPI.GetSessions(currentSessionId)
      .then((res) => {
        if (res?.status === 200 && Array.isArray(res.data)) {
          setDeviceSessions(sortDeviceSessions(res.data))
        }
      })
      .catch(() => {
        // Silent: the panel renders its own empty state.
      })
      .finally(() => setIsLoadingDevices(false))
  }, [activeTab, currentSessionId])

  // The backend's parsed UA columns are often null on older sessions, so fall
  // back to reading the raw userAgent. Same rules as parseUserAgent() in
  // components/active-sessions-modal.tsx — worth extracting to a shared util.
  const uaOs = (ua: string) => {
    if (!ua) return ""
    if (/Windows NT/.test(ua)) return "Windows"
    if (/Mac OS X/.test(ua)) return "macOS"
    if (/Android/.test(ua)) return "Android"
    if (/iPhone|iPad|iPod/.test(ua)) return "iOS"
    if (/Linux/.test(ua)) return "Linux"
    return ""
  }

  const uaBrowser = (ua: string) => {
    if (!ua) return ""
    if (/Edg(?:e)?\//.test(ua)) return "Edge"
    if (/OPR\/|Opera\//.test(ua)) return "Opera"
    if (/Chrome\//.test(ua) && !/Edg|Edge/i.test(ua)) return "Chrome"
    if (/Safari\//.test(ua) && !/Chrome|Edg|Edge|OPR|Opera/i.test(ua))
      return "Safari"
    if (/Firefox\//.test(ua)) return "Firefox"
    return ""
  }

  // "Mac OS X 10_15_7" -> "10.15.7"
  const uaOsVersion = (ua: string) => {
    if (!ua) return ""
    const mac = ua.match(/Mac OS X ([0-9_]+)/)
    if (mac) return mac[1].replace(/_/g, ".")
    const win = ua.match(/Windows NT ([0-9.]+)/)
    if (win) return win[1]
    const ios = ua.match(/OS ([0-9_]+) like Mac/)
    if (ios) return ios[1].replace(/_/g, ".")
    const android = ua.match(/Android ([0-9.]+)/)
    if (android) return android[1]
    return ""
  }

  const capitalise = (v: string) =>
    v ? v.charAt(0).toUpperCase() + v.slice(1) : v

  const resolvedOs = (d: DeviceSession) => d.osName || uaOs(d.userAgent)
  const resolvedBrowser = (d: DeviceSession) =>
    d.browserName || uaBrowser(d.userAgent)

  // No deviceName column exists yet, so compose the most specific label the
  // data supports: "macOS Chrome", falling back to the device type.
  const deviceLabel = (d: DeviceSession) =>
    [resolvedOs(d), resolvedBrowser(d)].filter(Boolean).join(" ") ||
    capitalise(d.deviceType ?? "") ||
    "Unknown device"

  const deviceTypeLabel = (d: DeviceSession) => {
    const os = resolvedOs(d).toLowerCase()
    if (os.includes("android")) return "Android"
    if (os.includes("ios") || os.includes("iphone")) return "iPhone"
    if (os.includes("win")) return "Windows"
    if (os.includes("mac")) return "Mac"
    return capitalise(d.deviceType ?? "") || "Unknown"
  }

  const relativeActivity = (iso: string) => {
    const then = new Date(iso).getTime()
    if (Number.isNaN(then)) return "—"
    const mins = Math.floor((Date.now() - then) / 60000)
    if (mins < 1) return "Just now"
    if (mins < 60) return `${mins} minute${mins === 1 ? "" : "s"} ago`
    const hours = Math.floor(mins / 60)
    if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`
    const days = Math.floor(hours / 24)
    if (days <= 7) return `${days} day${days === 1 ? "" : "s"} ago`
    return new Date(iso).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    })
  }

  const [selectedDevices, setSelectedDevices] = useState<string[]>([])
  const allDevicesSelected =
    deviceSessions.length > 0 &&
    selectedDevices.length === deviceSessions.length

  // Both entry points land on Device Details: the row chevron, and selecting a
  // device then pressing Remove Device. The actual revoke happens from there.
  const openDeviceDetail = (device: DeviceSession) => setDeviceDetail(device)

  const handleRemoveFromList = () => {
    const first = deviceSessions.find((d) => selectedDevices.includes(d.id))
    if (first) setDeviceDetail(first)
  }

  const handleConfirmRemoveDevice = async () => {
    if (!deviceDetail) return
    const id = deviceDetail.id
    // Revoking the session you are signed in with kills the token this page is
    // using. Captured before the optimistic removal drops the record.
    const isRemovingCurrentDevice = deviceDetail.isCurrent === true

    setIsRemoveDeviceOpen(false)

    setDeviceSessions((prev) => prev.filter((d) => d.id !== id))
    setSelectedDevices((prev) => prev.filter((i) => i !== id))
    setDeviceDetail(null)

    await AuthAPI.RevokeSession(id).catch(() => {})

    if (isRemovingCurrentDevice) {
      // Sign out rather than refetching. auth-service rejects the revoked
      // session (401) while user-service still honours the JWT (200), so
      // carrying on leaves a half-signed-out app: some calls succeed, some
      // fail, and nothing tells the user why. Signing out is also what the
      // action means — it is the "sign me out of this device" path.
      logoutHandler()
      return
    }

    AuthAPI.GetSessions(currentSessionId)
      .then((res) => {
        if (res?.status === 200 && Array.isArray(res.data)) {
          setDeviceSessions(sortDeviceSessions(res.data))
        }
      })
      .catch(() => {})

    setSavedAlertMessage("Device removed")
    setIsSavedAlertMounted(true)
  }

  const deviceTypeIcon = (type: string) => {
    if (type === "Android")
      return <AndroidBrand className="size-6 shrink-0" />
    if (type === "Windows")
      return <MicrosoftBrand className="size-6 shrink-0" />
    return <AppleBrand className="size-6 shrink-0" />
  }

  const [isSecurityQuestionsOpen, setIsSecurityQuestionsOpen] = useState(false)
  const [isSavingSecurityQuestions, setIsSavingSecurityQuestions] =
    useState(false)
  const [securityQuestionsError, setSecurityQuestionsError] = useState<
    string | null
  >(null)
  // `question` holds the catalogue id, not the prompt. The id is what the
  // answer is stored against; the prompt is display text and may be reworded.
  const [securityQuestions, setSecurityQuestions] = useState([
    { question: "", answer: "" },
    { question: "", answer: "" },
  ])

  const {
    catalog: securityQuestionOptions,
    configuredIds: savedSecurityQuestionIds,
    isConfigured: areSecurityQuestionsSaved,
    promptFor: securityQuestionPrompt,
    save: saveSecurityQuestions,
  } = useSecurityQuestions(activeTab === "account-recovery")

  /**
   * Reopens the modal on the questions the account actually answered, with the
   * answer fields blank. Blank is not an oversight: an answer is hashed on the
   * way in and there is no endpoint that returns it, so the only honest thing
   * to show is which questions are set. Saving replaces the whole set, so every
   * answer has to be retyped — which is also what stops a half-filled form from
   * silently wiping the answers it did not carry.
   */
  useEffect(() => {
    if (savedSecurityQuestionIds.length === 0) return
    setSecurityQuestions(
      savedSecurityQuestionIds.map((questionId) => ({
        question: questionId,
        answer: "",
      }))
    )
  }, [savedSecurityQuestionIds])

  const canSaveSecurityQuestions = securityQuestions.every(
    (q) => q.question !== "" && q.answer.trim() !== ""
  )

  /**
   * Persists the answers. Closes the modal and shows the saved alert only on a
   * success — the button used to do both unconditionally while storing nothing,
   * so the Enabled badge appeared for an account that had answered nothing and
   * the recovery flow had no answers to check.
   */
  const handleSaveSecurityQuestions = async () => {
    setSecurityQuestionsError(null)
    setIsSavingSecurityQuestions(true)
    try {
      await saveSecurityQuestions(
        securityQuestions.map((entry) => ({
          questionId: entry.question,
          answer: entry.answer,
        }))
      )
      setIsSecurityQuestionsOpen(false)
      setSavedAlertMessage("Successfully saved security questions")
      setIsSavedAlertMounted(true)
    } catch (error: any) {
      const message =
        error?.response?.data?.errors?.message ||
        error?.response?.data?.message ||
        error?.message ||
        "Something went wrong"
      // Reported inline rather than as a toast, matching Company Info: toasts
      // in this screen confirm successes only.
      setSecurityQuestionsError(
        message.startsWith("Please") ? message : `Please try again. ${message}`
      )
    } finally {
      setIsSavingSecurityQuestions(false)
    }
  }

  const updateSecurityQuestion = (
    index: number,
    field: "question" | "answer",
    value: string
  ) =>
    setSecurityQuestions((prev) =>
      prev.map((q, i) => (i === index ? { ...q, [field]: value } : q))
    )

  const [isPhoneVerificationOpen, setIsPhoneVerificationOpen] = useState(false)
  const [recoveryPhone, setRecoveryPhone] = useState("")
  const [isRecoveryLinkSent, setIsRecoveryLinkSent] = useState(false)
  const [isRecoveryPhoneVerified, setIsRecoveryPhoneVerified] = useState(false)
  const recoveryPhoneLast4 = recoveryPhone.replace(/\D/g, "").slice(-4)

  const closeRecoveryMagicLink = () => {
    setIsRecoveryPhoneVerified(true)
    setSavedAlertMessage("Successfully added account recovery number")
    setIsSavedAlertMounted(true)
    setIsRecoveryLinkSent(false)
  }

  const twoFactorNumbers = [
    ...(user?.twoFactorPhone ? [user.twoFactorPhone] : []),
    ...addedTwoFactorNumbers,
  ]
  const [isMagicLinkSent, setIsMagicLinkSent] = useState(false)

  // Front-end only: a real magic link is confirmed on the device, so there is
  // no in-app verification step to hang this off yet. Dismissing the modal
  // completes the add-a-number flow so the list state is demonstrable.
  const closeMagicLink = () => {
    if (isAddingBackupNumber && twoFactorPhone) {
      setAddedTwoFactorNumbers((prev) => [...prev, twoFactorPhone])
      setIsAddingBackupNumber(false)
      setTwoFactorPhone("")
    }
    setIsMagicLinkSent(false)
  }
  const twoFactorPhoneLast4 = twoFactorPhone.replace(/\D/g, "").slice(-4)
  const [show2FASetup, setShow2FASetup] = useState(false)
  const [show2FADisable, setShow2FADisable] = useState(false)

  const languageOptions = useMemo(
    () => languagesMock.map((item) => item.label),
    []
  )

  const [companyForm, setCompanyForm] = useState({
    name: "",
    website: "",
    industry: "",
    businessType: "",
    companySize: "",
    annualRevenue: "",
    phone: "",
    timeZone: "",
  })

  const handleCompanyChange = (field: string, value: string) => {
    setCompanyForm((prev) => ({ ...prev, [field]: value }))
  }

  const industryOptions = [
    "Advertising & Marketing",
    "Construction",
    "Education",
    "Finance",
    "Healthcare",
    "Hospitality",
    "Manufacturing",
    "Real Estate",
    "Retail",
    "Technology",
  ]

  const businessTypeOptions = [
    "Sole Proprietorship",
    "Partnership",
    "LLC",
    "Corporation",
    "Non-Profit",
  ]

  const companySizeOptions = [
    "1 - 10",
    "11 - 50",
    "51 - 200",
    "201 - 500",
    "501 - 1000",
    "1000+",
  ]

  const annualRevenueOptions = [
    "Under $1M",
    "$1M - $10M",
    "$10M - $50M",
    "$50M - $100M",
    "$100M+",
  ]

  const timeZoneOptions = [
    "(GMT-08:00) America/Los_Angeles",
    "(GMT-07:00) America/Denver",
    "(GMT-06:00) America/Chicago",
    "(GMT-05:00) America/New_York",
    "(GMT+00:00) Europe/London",
    "(GMT+01:00) Europe/Berlin",
  ]

  const teamOptions = [
    "Engineering",
    "Design",
    "Marketing",
    "Sales",
    "Operations",
    "Product",
    "Finance",
    "HR",
    "Legal",
    "Other",
  ]

  useEffect(() => {
    if (user) {
      const rawLang = user.language ?? ""
      setProfileForm({
        firstName: user.firstName ?? "",
        lastName: user.lastName ?? "",
        username: user.username ?? "",
        phone: user.phone ?? "",
        jobTitle: user.recentJobTitle ?? "",
        team: splitList(user.department),
        languages: rawLang ? rawLang.split(",").map((s: string) => s.trim()).filter(Boolean) : [],
      })
    }
  }, [user])

  const isAvatarDirty = avatarPreview !== null || isAvatarRemoved

  const isProfileDirty = useMemo(() => {
    if (isAvatarDirty) return true
    if (!user) return false

    const rawLang = user.language ?? ""
    const savedTeam = splitList(user.department)
    const savedLanguages = rawLang
      ? rawLang.split(",").map((s: string) => s.trim()).filter(Boolean)
      : []

    return (
      profileForm.firstName !== (user.firstName ?? "") ||
      profileForm.lastName !== (user.lastName ?? "") ||
      profileForm.username !== (user.username ?? "") ||
      profileForm.phone !== (user.phone ?? "") ||
      profileForm.jobTitle !== (user.recentJobTitle ?? "") ||
      profileForm.team.join(",") !== savedTeam.join(",") ||
      profileForm.languages.join(",") !== savedLanguages.join(",")
    )
  }, [profileForm, user, isAvatarDirty])

  const [hasJustSaved, setHasJustSaved] = useState(false)

  useEffect(() => {
    setHasJustSaved(false)
  }, [profileForm, avatarPreview, isAvatarRemoved])

  const areProfileActionsVisible = isProfileDirty && !hasJustSaved

  const isLogoDirty = logoPreview !== null || isLogoRemoved

  // Saved values for the two fields that persist. The other six have no
  // column anywhere, so their saved value is always empty.
  const savedCompanyName = company?.name ?? ""
  const savedCompanyWebsite = company?.domain ?? ""

  useEffect(() => {
    if (!company) return
    setCompanyForm({
      name: company.name ?? "",
      website: company.domain ?? "",
      industry: company.industry ?? "",
      businessType: company.businessType ?? "",
      companySize: company.companySize ?? "",
      annualRevenue: company.annualRevenue ?? "",
      phone: company.phone ?? "",
      timeZone: company.timeZone ?? "",
    })
  }, [company])

  // All eight fields persist now, so the saved baseline is simply the record.
  const savedCompanyExtras = useMemo(
    () => ({
      industry: company?.industry ?? "",
      businessType: company?.businessType ?? "",
      companySize: company?.companySize ?? "",
      annualRevenue: company?.annualRevenue ?? "",
      phone: company?.phone ?? "",
      timeZone: company?.timeZone ?? "",
    }),
    [company]
  )

  const isCompanyDirty = useMemo(() => {
    if (isLogoDirty) return true
    // Compared against what was loaded rather than against empty, or the form
    // would read as permanently dirty the moment a saved company loads.
    if (companyForm.name !== savedCompanyName) return true
    if (companyForm.website !== savedCompanyWebsite) return true
    return (
      Object.keys(savedCompanyExtras) as (keyof typeof savedCompanyExtras)[]
    ).some((key) => companyForm[key] !== savedCompanyExtras[key])
  }, [
    companyForm,
    isLogoDirty,
    savedCompanyName,
    savedCompanyWebsite,
    savedCompanyExtras,
  ])

  const [hasJustSavedCompany, setHasJustSavedCompany] = useState(false)

  useEffect(() => {
    setHasJustSavedCompany(false)
  }, [companyForm, logoPreview, isLogoRemoved])

  const areCompanyActionsVisible = isCompanyDirty && !hasJustSavedCompany

  const handleCompanySave = async () => {
    setCompanyError(null)
    try {
      await saveCompanyInfo(companyForm, logoFile)
      setLogoFile(null)
      // The upload is now the saved logo, so the pending preview retires and
      // logoSrc falls through to company.logoUrl. Leaving it set would keep
      // isLogoDirty true and the actions would never hide.
      setLogoPreview(null)
      setIsLogoRemoved(false)
      setSavedAlertMessage("Your company info has been saved")
      setIsSavedAlertMounted(true)
      setHasJustSavedCompany(true)
    } catch (error: any) {
      const message =
        error?.response?.data?.errors?.message ||
        error?.response?.data?.message ||
        error?.message ||
        "Something went wrong"
      // Toasts confirm successes only; a failed save reports itself inline,
      // matching how Personal Info reports one.
      setCompanyError(
        message.startsWith("Please") ? message : `Please try again. ${message}`
      )
    }
  }

  const handleCompanyCancel = () => {
    setCompanyError(null)
    setCompanyForm({
      // Restores what was saved rather than blanking the form. Clearing was
      // harmless while nothing persisted; with a real record behind the panel
      // it would look like Cancel had deleted the company details.
      name: savedCompanyName,
      website: savedCompanyWebsite,
      ...savedCompanyExtras,
    })
    setLogoPreview(null)
    setLogoFile(null)
    setIsLogoRemoved(false)
  }

  const paymentMethodsRef = useRef<BillingPaymentMethodsContentHandle | null>(null)
  const contentRef = useRef<HTMLDivElement>(null)

  // Deliberately removed: no scroll-to-top on tab change so the
  // sidebar position stays stable and there are no visual jumps.

  // `?add=1` opens the add-payment-method dialog on arrival, so entry points
  // elsewhere (the client dashboard "Verify Payment Method" link, the profile
  // completion step) reuse this flow instead of duplicating it.
  const addParam = searchParams.get("add")
  useEffect(() => {
    if (activeTab !== "billing-payment-methods" || addParam !== "1") return
    const timer = setTimeout(
      () => paymentMethodsRef.current?.openAddPaymentMethodDialog(),
      0
    )
    return () => clearTimeout(timer)
  }, [activeTab, addParam])

  const accountRole = useMemo(() => resolveDashboardRole(user), [user])
  const settingsTabItems = useMemo(() => buildSettingsTabItems(accountRole ?? null), [accountRole])

  const handleBillingTabChange = (value: BillingTabValue) => {
    const map: Record<BillingTabValue, string> = {
      "overview": "billing-overview",
      "transactions": "billing-transactions",
      "invoices": "billing-invoices",
      "payment-methods": "billing-payment-methods",
      "my-plans": "billing-plans",
    }
    setActiveTab(map[value])
  }

  // A range needs both ends to mean anything, so both must be filled before Save
  // turns on; a single IP only needs the one field.
  const hasAnyIpAddress = ipRows.some((row) =>
    ipEntryType === "range"
      ? row.rangeFrom.trim().length > 0 && row.rangeTo.trim().length > 0
      : row.address.trim().length > 0
  )

  const serialiseIpForm = (
    type: string,
    rows: typeof ipRows
  ) => JSON.stringify({ type, rows })

  // Measured against what the dialog opened with, so an edit that changes
  // nothing closes cleanly instead of falsely claiming unsaved work.
  const hasIpEdits = serialiseIpForm(ipEntryType, ipRows) !== ipFormBaseline

  const RANGE_SEPARATOR = " – "

  const openAddIps = () => {
    const rows = [{ address: "", rangeFrom: "", rangeTo: "", description: "" }]
    setEditingIpId(null)
    setIpEntryType("single")
    setIpRows(rows)
    setIpFormBaseline(serialiseIpForm("single", rows))
    setIsAddIpsOpen(true)
  }

  const openEditIp = (entry: {
    id: string
    address: string
    description: string
  }) => {
    const isRange = entry.address.includes(RANGE_SEPARATOR)
    const [from, to] = isRange
      ? entry.address.split(RANGE_SEPARATOR)
      : ["", ""]
    const rows = [
      {
        address: isRange ? "" : entry.address,
        rangeFrom: from ?? "",
        rangeTo: to ?? "",
        description: entry.description,
      },
    ]
    const type = isRange ? "range" : "single"
    setEditingIpId(entry.id)
    setIpEntryType(type)
    setIpRows(rows)
    setIpFormBaseline(serialiseIpForm(type, rows))
    setIsAddIpsOpen(true)
  }

  const resetIpRows = () =>
    setIpRows([{ address: "", rangeFrom: "", rangeTo: "", description: "" }])

  const handleSaveIps = async () => {
    const entries = ipRows
      .filter((row) =>
        ipEntryType === "range"
          ? row.rangeFrom.trim().length > 0 && row.rangeTo.trim().length > 0
          : row.address.trim().length > 0
      )
      .map((row) => ({
        address:
          ipEntryType === "range"
            ? `${row.rangeFrom.trim()} – ${row.rangeTo.trim()}`
            : row.address.trim(),
        description: row.description.trim(),
      }))

    if (entries.length === 0) return

    setIpSaveError(null)
    try {
      if (editingIpId) {
        // Editing acts on one entry and keeps its original Date Added.
        const [updated] = entries
        await updateAllowedIp(editingIpId, updated)
        setSavedAlertMessage("Successfully updated IP address")
      } else {
        const { added, skipped } = await addAllowedIps(entries)
        // Nothing new means every address was already on the list. Saying so
        // beats a success alert over a table that did not change.
        if (added === 0 && skipped.length > 0) {
          setIpSaveError(
            skipped.length === 1
              ? `${skipped[0]} is already on your list`
              : `All ${skipped.length} addresses are already on your list`
          )
          return
        }
        setSavedAlertMessage(
          skipped.length > 0
            ? `Added ${added}, skipped ${skipped.length} already on your list`
            : "Successfully added IP addresses"
        )
      }
    } catch (err: any) {
      setIpSaveError(
        err?.response?.data?.message ||
          err?.message ||
          "Couldn't save that IP address"
      )
      return
    }

    setEditingIpId(null)
    resetIpRows()
    setIsAddIpsOpen(false)
    setIsSavedAlertMounted(true)
  }

  // Seeded from the user record once it has loaded. Written straight through
  // rather than behind a Save button: the switch has no surrounding form, so
  // there is nothing for a pending change to belong to.
  useEffect(() => {
    if (user?.ipRestrictionEnabled != null) {
      setIsIpRestrictionEnabled(user.ipRestrictionEnabled)
    }
  }, [user?.ipRestrictionEnabled])

  const handleIpRestrictionToggle = async (next: boolean) => {
    const previous = isIpRestrictionEnabled
    setIsIpRestrictionEnabled(next)
    setIpSaveError(null)
    if (!user?.id) return
    try {
      // The dedicated route, not the generic profile update: switching this on
      // is refused server-side when the caller's own address is not covered by
      // the list, which is the check that stops someone locking themselves out.
      await AllowedIpsAPI.setEnabled(next)
      setUser((prev) => (prev ? { ...prev, ipRestrictionEnabled: next } : prev))
    } catch (err: any) {
      setIsIpRestrictionEnabled(previous)
      setIpSaveError(
        err?.response?.data?.message ||
          err?.message ||
          "Couldn't change the IP restriction setting"
      )
    }
  }

  const removeAllowedIp = (id: string) => {
    void removeAllowedIpEntry(id).catch((err: any) => {
      setIpSaveError(
        err?.response?.data?.message ||
          err?.message ||
          "Couldn't remove that IP address"
      )
    })
  }

  // Closing with edits pending routes through the discard prompt instead. Covers
  // the X, Escape and overlay clicks, since they all come through onOpenChange.
  const requestCloseAddIps = () => {
    if (hasIpEdits) {
      setIsIpDiscardOpen(true)
      return
    }
    setEditingIpId(null)
    setIsAddIpsOpen(false)
  }

  // One address per line, per the dialog copy. A second comma-separated field
  // is taken as the description so a richer export still imports cleanly.
  const parseIpCsv = (text: string) =>
    text
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line.length > 0)
      .map((line, index) => {
        const [address, ...rest] = line.split(",")
        return {
          id: `csv-${Date.now()}-${index}`,
          address: address.trim(),
          description: rest.join(",").trim(),
          addedAt: new Date().toISOString(),
        }
      })
      .filter((entry) => entry.address.length > 0)

  const onCsvDropAccepted = useCallback((files: File[]) => {
    const file = files[0]
    if (!file) return

    if (csvTimerRef.current) clearInterval(csvTimerRef.current)

    setCsvFileName(file.name)
    setCsvFileSize(file.size)
    setCsvEntries([])
    setCsvProgress(0)
    setCsvStatus("uploading")

    const reader = new FileReader()
    reader.onloadend = () =>
      setCsvEntries(parseIpCsv(String(reader.result ?? "")))
    reader.readAsText(file)

    // Reading a local file finishes instantly, so there is no real transfer to
    // report yet. This ramp stands in for upload progress until the IP backend
    // exists and can report it for real.
    csvTimerRef.current = setInterval(() => {
      setCsvProgress((prev) => {
        const next = prev + 10
        if (next >= 100 && csvTimerRef.current) {
          clearInterval(csvTimerRef.current)
          csvTimerRef.current = null
        }
        return Math.min(next, 100)
      })
    }, 150)
  }, [])

  const removeCsvEntry = (id: string) =>
    setCsvEntries((prev) => prev.filter((entry) => entry.id !== id))

  const clearCsvFile = () => {
    if (csvTimerRef.current) {
      clearInterval(csvTimerRef.current)
      csvTimerRef.current = null
    }
    setCsvFileName(null)
    setCsvFileSize(0)
    setCsvEntries([])
    setCsvProgress(0)
    setCsvStatus("idle")
    setIsCsvPreview(false)
  }

  const {
    getRootProps: getCsvRootProps,
    getInputProps: getCsvInputProps,
    isDragActive: isCsvDragActive,
  } = useDropzone({
    multiple: false,
    maxFiles: 1,
    maxSize: 800 * 1024 * 1024,
    accept: { "text/csv": [".csv"] },
    onDropAccepted: onCsvDropAccepted,
  })

  const closeCsvDialog = () => {
    setIsCsvOpen(false)
    clearCsvFile()
  }

  const handleSaveCsvIps = async () => {
    if (csvEntries.length === 0 || csvStatus !== "done") return
    setIpSaveError(null)
    try {
      const { added, skipped } = await addAllowedIps(
        csvEntries.map((entry) => ({
          address: entry.address,
          description: entry.description,
        }))
      )
      setSavedAlertMessage(
        skipped.length > 0
          ? `Added ${added}, skipped ${skipped.length} already on your list`
          : "Successfully added IP addresses"
      )
    } catch (err: any) {
      setIpSaveError(
        err?.response?.data?.message ||
          err?.message ||
          "Couldn't import that file"
      )
      return
    }
    closeCsvDialog()
    setIsSavedAlertMounted(true)
  }

  const updateIpRow = (
    index: number,
    field: "address" | "rangeFrom" | "rangeTo" | "description",
    value: string
  ) =>
    setIpRows((prev) =>
      prev.map((row, i) => (i === index ? { ...row, [field]: value } : row))
    )

  const addIpRow = () =>
    setIpRows((prev) =>
      prev.length >= MAX_IP_ROWS
        ? prev
        : [...prev, { address: "", rangeFrom: "", rangeTo: "", description: "" }]
    )

  const handleProfileChange = (field: string, value: string) => {
    setProfileForm((prev) => ({ ...prev, [field]: value }))
  }

  const handleProfileSave = async () => {
    setProfileError(null)
    setSavedAlertMessage("Your personal info has been saved")
    setIsSavedAlertMounted(true)
    setHasJustSaved(true)

    if (!user?.id) return

    setIsSaving(true)
    try {
      if (avatarFile) {
        await ClientAPI.UploadAvatar(avatarFile)
        setAvatarFile(null)
      }

      const payload: UserProfilePayload = {
        firstName: profileForm.firstName,
        lastName: profileForm.lastName,
        username: profileForm.username,
        phone: profileForm.phone,
        recentJobTitle: profileForm.jobTitle,
        language: profileForm.languages.join(", "),
        // `department`, never `teamName` — that column holds the client's
        // company name, and writing this field there would overwrite Company
        // Info.
        department: profileForm.team.join(", "),
        // Removing the photo was display-only: the flag drove the rendered
        // image and the dirty check, and the save carried nothing, so the
        // avatar came back on the next load. Empty string rather than null —
        // the DTO validates @IsString() and would reject null.
        ...(isAvatarRemoved ? { avatarUrl: "" } : {}),
      }
      const response = await UserAPI.updateProfile(user.id, payload)
      const isSuccess =
        typeof response?.status === "number" &&
        response.status >= 200 &&
        response.status < 300

      if (isSuccess) {
        setUser((prev) =>
          prev
            ? {
                ...prev,
                firstName: profileForm.firstName,
                lastName: profileForm.lastName,
                username: profileForm.username,
              }
            : prev
        )
        setIsEditing(false)
        setIsAvatarRemoved(false)
        toast({ title: "Profile updated successfully", variant: "success" })
        // The patch above only carries the three fields it names. Re-read so
        // the rest of the app sees the phone, job title, team, languages and
        // the avatar URL the upload returned.
        await refreshUser()
      } else {
        throw new Error("Failed to update profile")
      }
    } catch (error: any) {
      const errorMessage =
        error?.response?.data?.errors?.message ||
        error?.response?.data?.message ||
        error?.message ||
        "Something went wrong"
      // Toasts confirm successes only; a failed save reports itself inline.
      setProfileError(
        errorMessage.startsWith("Please")
          ? errorMessage
          : `Please try again. ${errorMessage}`
      )
    } finally {
      setIsSaving(false)
    }
  }

  const handleProfileCancel = () => {
    const rawLang = user?.language ?? ""
    setProfileForm({
      firstName: user?.firstName ?? "",
      lastName: user?.lastName ?? "",
      username: user?.username ?? "",
      phone: user?.phone ?? "",
      jobTitle: user?.recentJobTitle ?? "",
      team: splitList(user?.department),
      languages: rawLang ? rawLang.split(",").map((s: string) => s.trim()).filter(Boolean) : [],
    })
    setAvatarPreview(null)
    setIsAvatarRemoved(false)
    setIsEditing(false)
  }

  return (
    <AuthenticatedRoute>
      <div className="flex bg-gray-50 h-screen overflow-hidden">
        <SettingsSidebar activeTab={activeTab} onTabChange={goToTab} />

        <div
          ref={contentRef}
          className={cn(
          "flex-auto p-3.5 md:p-6 min-[1024px]:p-16 min-[1024px]:pl-[288px] scrollbar-thin scrollbar-thumb-transparent hover:scrollbar-thumb-gray-200 scrollbar-thumb-rounded-lg",
          activeTab === "billing-payment-methods"
            ? "flex flex-col overflow-hidden"
            : "overflow-y-auto"
        )}>
          <div className={cn(
            "flex-auto min-w-0",
            activeTab === "billing-payment-methods" && "flex flex-col min-h-0 overflow-hidden"
          )}>
            <div className="min-[1024px]:hidden mb-6">
              <h1 className="text-2xl font-semibold text-dark-blue-400">
                Settings
              </h1>
              <p className="text-sm text-gray-500 mt-1">
                Manage your account settings and preferences
              </p>
              <div className="flex gap-1 mt-4 border-b border-gray-200 overflow-x-auto">
                {settingsTabItems.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => goToTab(item.id)}
                      className={cn(
                        "flex items-center gap-1.5 px-3 pb-3 text-sm border-b-2 transition-colors whitespace-nowrap",
                        activeTab === item.id
                          ? "border-primary-500 text-primary-500"
                          : "border-transparent text-gray-500 hover:text-gray-700"
                      )}
                    >
                      <item.icon className="size-4" />
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

              {activeTab === "personal-info" && (
                <>
                  <div className="flex w-[658px] flex-col items-start gap-3">
                    <h1 className="text-[26px] leading-6 font-semibold capitalize text-dark-blue-400">
                      Personal Info
                    </h1>
                    <p className="w-full text-sm text-gray-500">
                      Manage your personal details and account information.
                    </p>
                  </div>

                  <div className="mt-6 flex items-center gap-x-6">
                    <div className="relative">
                      <Avatar className="size-24 border-4 border-white">
                        <AvatarImage
                          src={avatarSrc}
                          alt={user?.firstName ?? "User"}
                        />
                        <AvatarFallback className="text-4xl font-medium tracking-tight text-gray-300">
                          {(user?.firstName?.[0] ?? "").toUpperCase()}
                          {(user?.lastName?.[0] ?? "").toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <button
                        type="button"
                        onClick={() => setShowAvatarModal(true)}
                        className="absolute -bottom-1 -right-1 size-[30px] rounded-full bg-white border border-gray-300 shadow-[0px_1px_2px_0px_rgba(16,24,40,.05)] flex items-center justify-center hover:bg-gray-50 transition-colors"
                      >
                        <Edit01 className="size-4 text-gray-400" />
                      </button>
                    </div>
                    <div>
                      <div className="flex items-center gap-x-3">
                        <h2 className="text-2xl leading-[38px] font-medium text-gray-600 capitalize">
                          {user?.firstName} {user?.lastName}
                        </h2>
                        <Badge visual="primary" size="sm">
                          {accountRole === "ADMIN"
                            ? "Admin"
                            : accountRole?.charAt(0).toUpperCase() +
                              (accountRole?.slice(1).toLowerCase() ?? "")}
                        </Badge>
                      </div>
                      <p className="text-sm leading-5 text-gray-500">
                        {user?.email}
                      </p>
                    </div>
                  </div>

                  <Dialog
                    open={showAvatarModal}
                    onOpenChange={setShowAvatarModal}
                  >
                    <DialogContent
                      className="flex max-w-[467px] flex-col items-center gap-8 p-6 shadow-[0px_20px_24px_-4px_rgba(16,24,40,0.08),0px_8px_8px_-4px_rgba(16,24,40,0.03)]"
                      dialogOverlay={
                        <DialogOverlay className="backdrop-blur-[8px]" />
                      }
                    >
                      <input hidden {...getAvatarInputProps()} />

                      <div className="flex w-full flex-col items-center justify-center gap-5">
                        <DialogTitle className="w-full text-center text-lg leading-7 font-semibold text-gray-900">
                          Change Profile Image
                        </DialogTitle>
                        <DialogDescription className="sr-only">
                          Manage your profile image.
                        </DialogDescription>

                        <Avatar className="size-[160px] border-4 border-white">
                          <AvatarImage
                            src={avatarSrc}
                            alt={user?.firstName ?? "User"}
                          />
                          <AvatarFallback className="bg-gray-100 hover:bg-gray-100 text-[60px] leading-[44px] font-medium tracking-[-0.02em] uppercase text-gray-300">
                            {(user?.firstName?.[0] ?? "").toUpperCase()}
                            {(user?.lastName?.[0] ?? "").toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                      </div>

                      <IconButton
                        size="sm"
                        visual="gray"
                        variant="ghost"
                        className="absolute right-2.5 top-2.5"
                        onClick={() => setShowAvatarModal(false)}
                      >
                        <X className="size-4 text-gray-500" />
                      </IconButton>

                      <div className="flex w-full items-start justify-center gap-x-3">
                        <Button
                          size="sm"
                          visual="error"
                          variant="ghost"
                          className="bg-error-100"
                          onClick={onAvatarRemove}
                          leftIcon={<Trash03 className="size-[15px]" />}
                        >
                          Remove Photo
                        </Button>
                        <Button
                          size="sm"
                          visual="gray"
                          variant="outlined"
                          className="bg-white"
                          onClick={openAvatarFilePicker}
                          leftIcon={
                            <ImageIcon className="size-[15px] text-gray-500" />
                          }
                        >
                          Change Profile Image
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>

                  <div className="mt-6 max-w-[664px] grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="space-y-1.5">
                      <Label size="sm">First Name</Label>
                      <Input
                        value={profileForm.firstName}
                        onChange={(e) =>
                          handleProfileChange("firstName", e.target.value)
                        }
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label size="sm">Last Name</Label>
                      <Input
                        value={profileForm.lastName}
                        onChange={(e) =>
                          handleProfileChange("lastName", e.target.value)
                        }
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label size="sm">Email</Label>
                      <Input
                        value={user?.email ?? ""}
                        readOnly
                        className="bg-gray-50"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label size="sm">Phone Number</Label>
                      <PhoneNumberInput
                        defaultCountry="us"
                        placeholder="+1 (555) 000-0000"
                        disableDialCodePrefill
                        value={profileForm.phone}
                        onChange={(v) => handleProfileChange("phone", v)}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label size="sm">What team do you work on?</Label>
                      <Listbox
                        value={profileForm.team}
                        onChange={(values) =>
                          setProfileForm((prev) => ({
                            ...prev,
                            team: values as string[],
                          }))
                        }
                        multiple
                      >
                        <ListboxButton
                          placeholder="Select Team"
                          displayValue={(val) =>
                            Array.isArray(val) && val.length ? (
                              val.join(", ")
                            ) : (
                              <span className="text-gray-500">Select Team</span>
                            )
                          }
                        />
                        <ListboxOptions>
                          {teamOptions.map((item) => (
                            <ListboxOption key={item} value={item}>
                              {item}
                            </ListboxOption>
                          ))}
                        </ListboxOptions>
                      </Listbox>
                    </div>
                    <div className="space-y-1.5">
                      <Label size="sm">Job Title</Label>
                      <Input
                        value={profileForm.jobTitle}
                        onChange={(e) =>
                          handleProfileChange("jobTitle", e.target.value)
                        }
                        placeholder="e.g. President"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label size="sm">Language</Label>
                      <div className="flex flex-col gap-y-1.5">
                        <Listbox
                          value={profileForm.languages}
                          onChange={(values) =>
                            setProfileForm((prev) => ({
                              ...prev,
                              languages: values as string[],
                            }))
                          }
                          multiple
                        >
                          <ListboxButton
                            placeholder="Select Language"
                            displayValue={(val) =>
                              Array.isArray(val) && val.length ? (
                                val.join(", ")
                              ) : (
                                <span className="text-gray-500">
                                  Select Language
                                </span>
                              )
                            }
                          />
                          <ListboxOptions>
                            {languageOptions.map((item) => (
                              <ListboxOption key={item} value={item}>
                                {item}
                              </ListboxOption>
                            ))}
                          </ListboxOptions>
                        </Listbox>

                        {getIsNotEmpty(profileForm.languages) && (
                          <div className="flex flex-wrap gap-2">
                            {profileForm.languages.map((lang) => (
                              <Badge
                                key={lang}
                                visual="primary"
                                size="sm"
                                variant="rounded"
                              >
                                {lang}
                                <button
                                  className="focus-visible:outline-none"
                                  onClick={() =>
                                    setProfileForm((prev) => ({
                                      ...prev,
                                      languages: prev.languages.filter(
                                        (l) => l !== lang
                                      ),
                                    }))
                                  }
                                  type="button"
                                >
                                  <X2 className="h-3 w-3" />
                                </button>
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="relative mt-6 max-w-[664px] h-9">
                    {isSavedAlertMounted && (
                      <Alert
                        variant="success"
                        className={cn(
                          "absolute left-0 top-1/2 z-10 -translate-y-1/2 w-max min-w-[296px] items-center rounded-[5px] pointer-events-none transition-opacity duration-300",
                          isSavedAlertVisible ? "opacity-100" : "opacity-0"
                        )}
                      >
                        <AlertIcon>
                          <CheckCircle className="size-5 text-success-500" />
                        </AlertIcon>
                        <AlertTitle className="whitespace-nowrap text-success-600">
                          {savedAlertMessage}
                        </AlertTitle>
                      </Alert>
                    )}

                    {areProfileActionsVisible && (
                      <div className="flex justify-end gap-x-3">
                        <Button
                          variant="outlined"
                          visual="gray"
                          size="sm"
                          onClick={handleProfileCancel}
                        >
                          Cancel
                        </Button>
                        <Button
                          size="sm"
                          onClick={handleProfileSave}
                          disabled={isSaving}
                        >
                          Save Changes
                        </Button>
                      </div>
                    )}
                  </div>

                  {profileError && (
                    <p className="mt-3 text-xs font-medium text-error-500">
                      {profileError}
                    </p>
                  )}
                </>
              )}

              {activeTab === "company-info" && (
                <>
                  <div className="flex flex-col gap-3">
                    <h1 className="text-[26px] leading-6 font-semibold capitalize text-dark-blue-400">
                      Company Info
                    </h1>
                    <p className="text-sm text-gray-500">
                      Manage your company details and business information.
                    </p>
                  </div>

                  <div className="mt-6 space-y-1.5">
                    <Label size="sm">Logo</Label>
                    <div className="relative w-[228px] h-[104px] overflow-hidden rounded-[5px] border-4 border-white bg-gray-100">
                      {logoSrc && (
                        <img
                          src={logoSrc}
                          alt="Company logo"
                          className="size-full object-cover"
                        />
                      )}
                      <IconButton
                        size="sm"
                        visual="gray"
                        variant="ghost"
                        className="absolute bottom-0 right-0 size-[29px] bg-white rounded-none rounded-tl-[12px] rounded-br-[8px]"
                        onClick={() => setShowLogoModal(true)}
                      >
                        <Edit01 className="size-4 text-gray-400" />
                      </IconButton>
                    </div>
                  </div>

                  <Dialog open={showLogoModal} onOpenChange={setShowLogoModal}>
                    <DialogContent
                      className="flex max-w-[467px] flex-col items-center gap-8 p-6 shadow-[0px_20px_24px_-4px_rgba(16,24,40,0.08),0px_8px_8px_-4px_rgba(16,24,40,0.03)]"
                      dialogOverlay={
                        <DialogOverlay className="backdrop-blur-[8px]" />
                      }
                    >
                      <input hidden {...getLogoInputProps()} />

                      <div className="flex w-full flex-col items-center justify-center gap-5">
                        <DialogTitle className="w-full text-center text-lg leading-7 font-semibold text-gray-900">
                          Change Logo
                        </DialogTitle>
                        <DialogDescription className="sr-only">
                          Manage your company logo.
                        </DialogDescription>

                        <div className="w-[228px] h-[104px] overflow-hidden rounded-[5px] border-4 border-white bg-gray-100">
                          {logoSrc && (
                            <img
                              src={logoSrc}
                              alt="Company logo"
                              className="size-full object-cover"
                            />
                          )}
                        </div>
                      </div>

                      <IconButton
                        size="sm"
                        visual="gray"
                        variant="ghost"
                        className="absolute right-2.5 top-2.5"
                        onClick={() => setShowLogoModal(false)}
                      >
                        <X className="size-4 text-gray-500" />
                      </IconButton>

                      <div className="flex w-full items-start justify-center gap-x-3">
                        <Button
                          size="sm"
                          visual="error"
                          variant="ghost"
                          className="bg-error-100"
                          onClick={onLogoRemove}
                          leftIcon={<Trash03 className="size-[15px]" />}
                        >
                          Remove Logo
                        </Button>
                        <Button
                          size="sm"
                          visual="gray"
                          variant="outlined"
                          className="bg-white"
                          onClick={openLogoFilePicker}
                          leftIcon={
                            <ImageIcon className="size-[15px] text-gray-500" />
                          }
                        >
                          Change Logo
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>

                  <div className="mt-6 max-w-[664px] grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="space-y-1.5">
                      <Label size="sm">Company Name</Label>
                      <Input
                        placeholder="e.g. Acme Analytics"
                        value={companyForm.name}
                        onChange={(e) =>
                          handleCompanyChange("name", e.target.value)
                        }
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label size="sm">Company Website</Label>
                      <InputGroup>
                        <InputLeftAddon>https://</InputLeftAddon>
                        <Input
                          placeholder="www.yourwebsite.com"
                          value={companyForm.website}
                          onChange={(e) =>
                            handleCompanyChange("website", e.target.value)
                          }
                        />
                      </InputGroup>
                    </div>
                    <div className="space-y-1.5">
                      <Label size="sm">Industry</Label>
                      <Listbox
                        value={companyForm.industry}
                        onChange={(value) =>
                          handleCompanyChange("industry", value as string)
                        }
                      >
                        <ListboxButton
                          placeholder="Select Industry"
                          displayValue={(val) => (val as string) || null}
                        />
                        <ListboxOptions>
                          {industryOptions.map((item) => (
                            <ListboxOption key={item} value={item}>
                              {item}
                            </ListboxOption>
                          ))}
                        </ListboxOptions>
                      </Listbox>
                    </div>
                    <div className="space-y-1.5">
                      <Label size="sm">Business Type</Label>
                      <Listbox
                        value={companyForm.businessType}
                        onChange={(value) =>
                          handleCompanyChange("businessType", value as string)
                        }
                      >
                        <ListboxButton
                          placeholder="Select Type"
                          displayValue={(val) => (val as string) || null}
                        />
                        <ListboxOptions>
                          {businessTypeOptions.map((item) => (
                            <ListboxOption key={item} value={item}>
                              {item}
                            </ListboxOption>
                          ))}
                        </ListboxOptions>
                      </Listbox>
                    </div>
                    <div className="space-y-1.5">
                      <Label size="sm">Company Size</Label>
                      <Listbox
                        value={companyForm.companySize}
                        onChange={(value) =>
                          handleCompanyChange("companySize", value as string)
                        }
                      >
                        <ListboxButton
                          placeholder="1 - 10"
                          displayValue={(val) => (val as string) || null}
                        />
                        <ListboxOptions>
                          {companySizeOptions.map((item) => (
                            <ListboxOption key={item} value={item}>
                              {item}
                            </ListboxOption>
                          ))}
                        </ListboxOptions>
                      </Listbox>
                    </div>
                    <div className="space-y-1.5">
                      <Label size="sm">Annual Revenue</Label>
                      <Listbox
                        value={companyForm.annualRevenue}
                        onChange={(value) =>
                          handleCompanyChange("annualRevenue", value as string)
                        }
                      >
                        <ListboxButton
                          placeholder="Select Revenue"
                          displayValue={(val) => (val as string) || null}
                        />
                        <ListboxOptions>
                          {annualRevenueOptions.map((item) => (
                            <ListboxOption key={item} value={item}>
                              {item}
                            </ListboxOption>
                          ))}
                        </ListboxOptions>
                      </Listbox>
                    </div>
                    <div className="space-y-1.5">
                      <Label size="sm">Company Phone Number</Label>
                      <PhoneNumberInput
                        defaultCountry="us"
                        value={companyForm.phone}
                        onChange={(v) => handleCompanyChange("phone", v)}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label size="sm">Time Zone</Label>
                      <Listbox
                        value={companyForm.timeZone}
                        onChange={(value) =>
                          handleCompanyChange("timeZone", value as string)
                        }
                      >
                        <ListboxButton
                          placeholder="(GMT-05:00) America/New_York"
                          displayValue={(val) => (val as string) || null}
                        />
                        <ListboxOptions>
                          {timeZoneOptions.map((item) => (
                            <ListboxOption key={item} value={item}>
                              {item}
                            </ListboxOption>
                          ))}
                        </ListboxOptions>
                      </Listbox>
                    </div>
                  </div>

                  <div className="relative mt-6 max-w-[664px] h-9">
                    {isSavedAlertMounted && (
                      <Alert
                        variant="success"
                        className={cn(
                          "absolute left-0 top-1/2 z-10 -translate-y-1/2 w-max min-w-[296px] items-center rounded-[5px] pointer-events-none transition-opacity duration-300",
                          isSavedAlertVisible ? "opacity-100" : "opacity-0"
                        )}
                      >
                        <AlertIcon>
                          <CheckCircle className="size-5 text-success-500" />
                        </AlertIcon>
                        <AlertTitle className="whitespace-nowrap text-success-600">
                          {savedAlertMessage}
                        </AlertTitle>
                      </Alert>
                    )}

                    {areCompanyActionsVisible && (
                      <div className="flex justify-end gap-x-3">
                        <Button
                          variant="outlined"
                          visual="gray"
                          size="sm"
                          onClick={handleCompanyCancel}
                        >
                          Cancel
                        </Button>
                        <Button size="sm" onClick={handleCompanySave}>
                          Save Changes
                        </Button>
                      </div>
                    )}

                    {companyError && (
                      <p className="mt-3 text-xs font-medium text-error-500">
                        {companyError}
                      </p>
                    )}
                  </div>
                </>
              )}

              {activeTab === "privacy" && (
                <>
                  <div className="flex w-[658px] flex-col items-start gap-3">
                    <h1 className="text-[26px] leading-6 font-semibold capitalize text-dark-blue-400">
                      Privacy
                    </h1>
                    <p className="w-full text-sm text-gray-500">
                      Control your profile visibility, contact preferences, and data settings.
                    </p>
                  </div>
                  <div className="mt-6">
                    <PrivacySettings />
                  </div>
                </>
              )}

              {activeTab === "notifications" && (
                <>
                  <div className="flex w-[658px] flex-col items-start gap-3">
                    <h1 className="text-[26px] leading-6 font-semibold capitalize text-dark-blue-400">
                      Notifications
                    </h1>
                    <p className="w-full text-sm text-gray-500">
                      Manage how and when you receive alerts and updates.
                    </p>
                  </div>
                  <div className="mt-6">
                    <NotificationPreferences />
                  </div>
                </>
              )}

              {activeTab === "tax-info" && <SettingsTaxInfo />}

              {activeTab === "login-password" && !isUpdatePasswordOpen && (
                <>
                  <div className="flex w-[658px] flex-col items-start gap-3">
                    <h1 className="text-[26px] leading-6 font-semibold capitalize text-dark-blue-400">
                      Update Password
                    </h1>
                    <p className="w-full text-sm text-gray-500">
                      Manage your email, password, and login preferences.
                    </p>
                  </div>

                  <div className="relative mt-6 flex w-[658px] flex-col items-start gap-2.5">
                    {isSavedAlertMounted && (
                      <Alert
                        variant="success"
                        className={cn(
                          "absolute left-0 top-full z-10 mt-6 w-max min-w-[296px] items-center rounded-[5px] pointer-events-none transition-opacity duration-300",
                          isSavedAlertVisible ? "opacity-100" : "opacity-0"
                        )}
                      >
                        <AlertIcon>
                          <CheckCircle className="size-5 text-success-500" />
                        </AlertIcon>
                        <AlertTitle className="whitespace-nowrap text-success-600">
                          {savedAlertMessage}
                        </AlertTitle>
                      </Alert>
                    )}

                    <Button
                      variant="ghost"
                      visual="gray"
                      size="sm"
                      onClick={() => setIsUpdatePasswordOpen(true)}
                      className="flex h-auto w-[658px] items-center justify-between gap-x-5 rounded-lg border border-gray-200 bg-white p-3 shadow-[0px_1px_5px_rgba(16,24,40,0.02)]"
                    >
                      <span className="flex items-center gap-x-3">
                        <span className="flex size-11 items-center justify-center rounded-lg border-[1.5px] border-gray-200">
                          <Lock01 className="size-5 text-primary-500" />
                        </span>
                        <span className="text-sm font-medium leading-[17px] text-gray-900">
                          Update Password
                        </span>
                      </span>
                      <span className="flex size-8 items-center justify-center rounded-[5px]">
                        <ChevronRight className="size-5 text-gray-500" />
                      </span>
                    </Button>

                    <Button
                      variant="ghost"
                      visual="gray"
                      size="sm"
                      onClick={() => setIsFingerprintOpen(true)}
                      className="flex h-auto w-[658px] items-center justify-between gap-x-5 rounded-lg border border-gray-200 bg-white p-3 shadow-[0px_1px_5px_rgba(16,24,40,0.02)]"
                    >
                      <span className="flex items-center gap-x-3">
                        <span className="flex size-11 items-center justify-center rounded-lg border-[1.5px] border-gray-200">
                          <Fingerprint01 className="size-5 text-primary-500" />
                        </span>
                        <span className="text-sm font-medium leading-[17px] text-gray-900">
                          Fingerprint Login
                        </span>
                        {isFingerprintEnabled && (
                          <Badge visual="success" size="sm">
                            Enabled
                          </Badge>
                        )}
                      </span>
                      <span className="flex size-8 items-center justify-center rounded-[5px]">
                        <ChevronRight className="size-5 text-gray-500" />
                      </span>
                    </Button>
                  </div>

                </>
              )}

              {activeTab === "login-password" && isUpdatePasswordOpen && (
                <div className="flex w-[492px] flex-col items-start gap-6">
                  <div className="flex w-full flex-col items-start gap-3">
                    <h1 className="text-[26px] leading-6 font-semibold capitalize text-dark-blue-400">
                      Update Password
                    </h1>
                    <p className="w-full text-sm text-gray-500">
                      Marketeq recommends avoiding using personal information in
                      passwords and using a unique password for each account.{" "}
                      <a href="#" className="underline">
                        Learn more
                      </a>
                    </p>
                  </div>

                  <div className="flex w-full flex-col items-start gap-6">
                    <div className="flex w-full flex-col items-start gap-6">
                      <div className="flex w-full flex-col items-start gap-1.5">
                        <Label size="sm">Enter Your Current Password</Label>
                        <InputGroup className="w-full">
                          <Input
                            type={visiblePasswords.current ? "text" : "password"}
                            placeholder="Type your current password"
                            value={passwordForm.current}
                            onChange={(e) =>
                              setPasswordForm((prev) => ({
                                ...prev,
                                current: e.target.value,
                              }))
                            }
                          />
                          <InputRightElement>
                            <IconButton
                              variant="ghost"
                              visual="gray"
                              size="sm"
                              className="size-auto bg-transparent hover:bg-transparent"
                              onClick={() =>
                                setVisiblePasswords((prev) => ({
                                  ...prev,
                                  current: !prev.current,
                                }))
                              }
                            >
                              {visiblePasswords.current ? (
                                <Eye className="size-4 text-gray-400" />
                              ) : (
                                <EyeOff className="size-4 text-gray-400" />
                              )}
                            </IconButton>
                          </InputRightElement>
                        </InputGroup>
                      </div>

                      <div className="flex w-full flex-col items-start gap-1.5">
                        <Label size="sm">Type New Password</Label>
                        <InputGroup className="w-full">
                          <Input
                            type={visiblePasswords.next ? "text" : "password"}
                            placeholder="Type your new password"
                            value={passwordForm.next}
                            onChange={(e) =>
                              setPasswordForm((prev) => ({
                                ...prev,
                                next: e.target.value,
                              }))
                            }
                          />
                          <InputRightElement>
                            <IconButton
                              variant="ghost"
                              visual="gray"
                              size="sm"
                              className="size-auto bg-transparent hover:bg-transparent"
                              onClick={() =>
                                setVisiblePasswords((prev) => ({
                                  ...prev,
                                  next: !prev.next,
                                }))
                              }
                            >
                              {visiblePasswords.next ? (
                                <Eye className="size-4 text-gray-400" />
                              ) : (
                                <EyeOff className="size-4 text-gray-400" />
                              )}
                            </IconButton>
                          </InputRightElement>
                        </InputGroup>
                      </div>

                      <div className="flex w-full flex-col items-start gap-1.5">
                        <Label size="sm">Confirm New Password</Label>
                        <InputGroup className="w-full">
                          <Input
                            type={visiblePasswords.confirm ? "text" : "password"}
                            placeholder="Type your new password again"
                            value={passwordForm.confirm}
                            onChange={(e) =>
                              setPasswordForm((prev) => ({
                                ...prev,
                                confirm: e.target.value,
                              }))
                            }
                          />
                          <InputRightElement>
                            <IconButton
                              variant="ghost"
                              visual="gray"
                              size="sm"
                              className="size-auto bg-transparent hover:bg-transparent"
                              onClick={() =>
                                setVisiblePasswords((prev) => ({
                                  ...prev,
                                  confirm: !prev.confirm,
                                }))
                              }
                            >
                              {visiblePasswords.confirm ? (
                                <Eye className="size-4 text-gray-400" />
                              ) : (
                                <EyeOff className="size-4 text-gray-400" />
                              )}
                            </IconButton>
                          </InputRightElement>
                        </InputGroup>
                      </div>
                    </div>

                    <div className="flex w-[328px] flex-col items-start gap-3">
                      <Label size="sm">Password Requirements</Label>
                      <div className="flex w-full items-start gap-x-10">
                        <div className="flex w-[173px] flex-col items-start gap-2">
                          {passwordRequirements.slice(0, 3).map((req) => (
                            <div
                              key={req.label}
                              className="flex items-center gap-x-3"
                            >
                              <Checkbox
                                size="md"
                                variant="circular"
                                checked={req.met}
                              />
                              <span className="text-sm font-medium leading-5 text-gray-700">
                                {req.label}
                              </span>
                            </div>
                          ))}
                        </div>
                        <div className="flex w-[115px] flex-col items-start gap-2">
                          {passwordRequirements.slice(3).map((req) => (
                            <div
                              key={req.label}
                              className="flex items-center gap-x-3"
                            >
                              <Checkbox
                                size="md"
                                variant="circular"
                                checked={req.met}
                              />
                              <span className="text-sm font-medium leading-5 text-gray-700">
                                {req.label}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-start gap-x-1">
                      <span className="text-sm font-medium leading-[17px] text-gray-700">
                        Forgot your password?
                      </span>
                      <a
                        href="#"
                        className="text-sm font-medium leading-[17px] text-primary-500 underline"
                      >
                        Request a new one
                      </a>
                    </div>
                  </div>

                  <div className="flex w-full justify-end gap-x-3">
                    <Button
                      variant="outlined"
                      visual="gray"
                      size="sm"
                      onClick={() =>
                        isPasswordDirty
                          ? setIsDiscardOpen(true)
                          : closeUpdatePassword()
                      }
                    >
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      onClick={handlePasswordSave}
                      disabled={!canSavePassword}
                    >
                      Save Changes
                    </Button>
                  </div>
                </div>
              )}

              {activeTab === "login-password" && (
                <Dialog open={isDiscardOpen} onOpenChange={setIsDiscardOpen}>
                  <DialogContent
                    className="flex max-w-[512px] flex-col items-center gap-8 p-6 shadow-[0px_20px_24px_-4px_rgba(16,24,40,0.08),0px_8px_8px_-4px_rgba(16,24,40,0.03)]"
                    dialogOverlay={
                      <DialogOverlay className="backdrop-blur-[8px]" />
                    }
                  >
                    <div className="flex w-full flex-col items-start gap-10">
                      <div className="flex w-full flex-col items-start gap-5">
                        <div className="flex w-full items-start justify-between gap-5">
                          <span className="flex size-12 items-center justify-center rounded-full border-8 border-warning-50 bg-warning-100">
                            <AlertTriangle className="size-6 text-warning-500" />
                          </span>
                          <IconButton
                            variant="ghost"
                            visual="gray"
                            size="sm"
                            className="rounded-[5px]"
                            onClick={() => setIsDiscardOpen(false)}
                          >
                            <X className="size-5 text-gray-500" />
                          </IconButton>
                        </div>

                        <div className="flex w-full flex-col items-start gap-2">
                          <DialogTitle className="w-full text-lg leading-7 font-semibold text-gray-900">
                            Unsaved changes
                          </DialogTitle>
                          <DialogDescription className="w-full text-sm text-gray-500">
                            Do you want to save your password, or leave and
                            discard changes?
                          </DialogDescription>
                        </div>
                      </div>

                      <div className="flex items-start gap-x-3">
                        <Button
                          variant="outlined"
                          visual="gray"
                          size="lg"
                          onClick={() => {
                            setIsDiscardOpen(false)
                            closeUpdatePassword()
                          }}
                        >
                          Exit Without Saving
                        </Button>
                        <Button
                          size="lg"
                          onClick={() => {
                            setIsDiscardOpen(false)
                            handlePasswordSave()
                          }}
                        >
                          Save & Exit
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              )}

              {activeTab === "login-password" && (
                <Dialog
                  open={isFingerprintOpen}
                  onOpenChange={(open) =>
                    open ? setIsFingerprintOpen(true) : closeFingerprint()
                  }
                >
                  <DialogContent
                    className="flex max-w-[414px] flex-col items-center gap-[55px] p-[55px] shadow-[0px_20px_24px_-4px_rgba(16,24,40,0.08),0px_8px_8px_-4px_rgba(16,24,40,0.03)]"
                    dialogOverlay={
                      <DialogOverlay className="backdrop-blur-[8px]" />
                    }
                  >
                    <div className="flex w-full flex-col items-center gap-8">
                      <span className="flex size-20 items-center justify-center rounded-full border-[10px] border-primary-25 bg-primary-50">
                        <Fingerprint01 className="size-11 text-primary-500" />
                      </span>

                      <div className="flex w-full flex-col items-center gap-6">
                        <DialogTitle className="text-center text-lg leading-7 font-semibold text-gray-900">
                          Fingerprint Login
                        </DialogTitle>
                        <div className="flex w-full flex-col items-center gap-2">
                          <DialogDescription className="w-full text-center text-sm text-gray-500">
                            Confirm your fingerprint on your device so Marketeq
                            can verify it&apos;s you.
                          </DialogDescription>
                        </div>
                      </div>

                      <div className="flex items-center justify-center gap-x-3">
                        <Checkbox
                          size="md"
                          checked={acceptsFingerprintTerms}
                          onCheckedChange={(checked) =>
                            setAcceptsFingerprintTerms(checked === true)
                          }
                        />
                        <span className="text-sm font-medium capitalize text-gray-700">
                          Accept{" "}
                          <a href="#" className="underline">
                            Terms &amp; Conditions
                          </a>
                        </span>
                      </div>
                    </div>

                    <div className="flex w-full items-start justify-center gap-x-3">
                      <Button
                        variant="outlined"
                        visual="gray"
                        size="sm"
                        onClick={closeFingerprint}
                      >
                        Cancel
                      </Button>
                      <Button
                        size="sm"
                        disabled={!acceptsFingerprintTerms}
                        onClick={handleEnableFingerprint}
                        leftIcon={<Check className="size-[15px]" />}
                      >
                        Enable Fingerprint Login
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              )}

              {activeTab === "two-factor-auth" &&
                isTwoFactorEnabled &&
                !isAddingBackupNumber && (
                <>
                  <div className="flex items-start justify-between gap-6">
                    <div className="flex w-[658px] flex-col items-start gap-3">
                      <div className="flex items-center gap-x-3">
                        <h1 className="text-[26px] leading-6 font-semibold capitalize text-dark-blue-400">
                          Two-Factor Authentication
                        </h1>
                        <Badge
                          visual="success"
                          size="sm"
                          className="bg-success-50"
                        >
                          Enabled
                        </Badge>
                      </div>
                      <p className="w-full text-sm text-gray-500">
                        Two-factor authentication is enabled. Your account is
                        protected with an additional verification step.
                      </p>
                    </div>

                    <Button
                      size="sm"
                      onClick={() => {
                        setTwoFactorPhone("")
                        setIsAddingBackupNumber(true)
                      }}
                      leftIcon={<Plus className="size-[15px]" />}
                    >
                      Add Backup Number
                    </Button>
                  </div>

                  <div className="mt-6 flex w-[550px] flex-col items-start gap-6">
                    {twoFactorNumbers.map((number, index) => (
                      <div
                        key={`${number}-${index}`}
                        className="flex w-[550px] items-start justify-between gap-5 rounded-lg border border-gray-200 bg-white p-5 shadow-[0px_1px_5px_rgba(16,24,40,0.02)]"
                      >
                        <div className="flex flex-col justify-center gap-3">
                          <div className="flex flex-col justify-center gap-1">
                            <span className="text-sm font-medium leading-[17px] text-gray-900">
                              Phone Number
                            </span>
                            <span className="text-base text-gray-500">
                              {number}
                            </span>
                          </div>
                          <div className="flex flex-col justify-center gap-1">
                            <span className="text-sm font-medium text-success-500">
                              Verified
                            </span>
                            <span className="text-sm font-medium text-gray-900">
                              Codes are sent via text message.
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-x-3">
                          <IconButton
                            variant="ghost"
                            visual="gray"
                            size="sm"
                            className="size-8 rounded-[5px]"
                          >
                            <Edit01 className="size-5 text-gray-500" />
                          </IconButton>
                          <IconButton
                            variant="ghost"
                            visual="gray"
                            size="sm"
                            className="size-8 rounded-[5px]"
                            onClick={() =>
                              setAddedTwoFactorNumbers((prev) =>
                                prev.filter((n) => n !== number)
                              )
                            }
                          >
                            <Trash01 className="size-5 text-gray-500" />
                          </IconButton>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}

              {activeTab === "two-factor-auth" &&
                (!isTwoFactorEnabled || isAddingBackupNumber) && (
                <>
                  <div className="flex items-start justify-between gap-6">
                    <div className="flex w-[658px] flex-col items-start gap-3">
                      <h1 className="text-[26px] leading-6 font-semibold capitalize text-dark-blue-400">
                        Two-Factor Authentication
                      </h1>
                      <p className="w-full text-sm text-gray-500">
                        Enter your phone number and we&apos;ll send a magic link
                        to the number entered. This helps keep your account
                        secure.
                      </p>
                    </div>

                    {twoFactorPhone.trim() !== "" && (
                      <Button
                        size="sm"
                        disabled={!isPhoneValid(twoFactorPhone)}
                        onClick={() => setIsMagicLinkSent(true)}
                        leftIcon={<Send01 className="size-[15px]" />}
                      >
                        Send Link
                      </Button>
                    )}
                  </div>

                  <div className="mt-6 flex w-[550px] flex-col items-start gap-2.5">
                    <div className="flex w-[320px] flex-col items-start gap-1.5">
                      <Label size="sm">Phone Number</Label>
                      <PhoneNumberInput
                        defaultCountry="us"
                        placeholder="+1 (555) 000-0000"
                        disableDialCodePrefill
                        value={twoFactorPhone}
                        onChange={setTwoFactorPhone}
                      />
                    </div>
                  </div>

                  <Dialog
                    open={isMagicLinkSent}
                    onOpenChange={(open) =>
                      open ? setIsMagicLinkSent(true) : closeMagicLink()
                    }
                  >
                    <DialogContent
                      className="flex w-[508px] max-w-[calc(100vw-2rem)] flex-col items-center gap-8 px-[55px] pb-6 pt-[55px] shadow-[0px_20px_24px_-4px_rgba(16,24,40,0.08),0px_8px_8px_-4px_rgba(16,24,40,0.03)]"
                      dialogOverlay={
                        <DialogOverlay className="backdrop-blur-[8px]" />
                      }
                    >
                      <div className="flex w-full flex-col items-center gap-5">
                        <span className="flex size-12 items-center justify-center rounded-full border-8 border-primary-25 bg-primary-50">
                          <Phone className="size-6 text-primary-500" />
                        </span>

                        <div className="flex w-full flex-col items-center gap-2">
                          <DialogTitle className="w-full text-center text-lg leading-7 font-semibold text-gray-900">
                            Please check your phone
                          </DialogTitle>
                          <DialogDescription className="text-center text-sm text-gray-500">
                            We sent a magic link sent to phone number ending with{" "}
                            <span className="font-semibold text-gray-900">
                              {twoFactorPhoneLast4}
                            </span>
                            .
                          </DialogDescription>
                          <p className="w-full text-center text-sm text-gray-500">
                            The link will expire in{" "}
                            <span className="font-semibold text-gray-900">
                              24 hours
                            </span>
                            .
                          </p>
                        </div>
                      </div>

                      <Button size="sm">Resend Link</Button>

                      <p className="w-full text-center text-sm text-gray-500">
                        No longer have access to this email?{" "}
                        <a href="#" className="underline">
                          Start account recovery
                        </a>
                      </p>

                      <IconButton
                        variant="ghost"
                        visual="gray"
                        size="sm"
                        className="absolute right-2.5 top-2.5 size-[38px] rounded-[5px]"
                        onClick={closeMagicLink}
                      >
                        <X className="size-6 text-gray-500 opacity-50" />
                      </IconButton>
                    </DialogContent>
                  </Dialog>
                </>
              )}

              {activeTab === "social-login" && (
                <h1 className="text-[26px] leading-6 font-semibold capitalize text-dark-blue-400">
                  Social Login
                </h1>
              )}

              {activeTab === "account-recovery" && (
                <>
                  <div className="flex w-[658px] flex-col items-start gap-3">
                    <h1 className="text-[26px] leading-6 font-semibold capitalize text-dark-blue-400">
                      Account Recovery
                    </h1>
                    <p className="w-full text-sm text-gray-500">
                      Set up recovery options in case you lose access to your
                      account.
                    </p>
                  </div>

                  <div className="mt-6 flex w-[550px] flex-col items-start gap-2.5">
                    <Button
                      variant="ghost"
                      visual="gray"
                      size="sm"
                      onClick={() => setIsPhoneVerificationOpen(true)}
                      className="flex h-auto w-[550px] items-center justify-between gap-x-5 rounded-lg border border-gray-200 bg-white p-3 shadow-[0px_1px_5px_rgba(16,24,40,0.02)]"
                    >
                      <span className="flex items-center gap-x-3">
                        <span className="flex size-11 items-center justify-center rounded-lg border-[1.5px] border-gray-200">
                          <Phone className="size-5 text-primary-500" />
                        </span>
                        <span className="text-sm font-medium leading-[17px] text-gray-900">
                          Phone Verification
                        </span>
                        {isRecoveryPhoneVerified && (
                          <Badge
                            visual="success"
                            size="sm"
                            className="bg-success-50"
                          >
                            Enabled
                          </Badge>
                        )}
                      </span>
                      <span className="flex size-8 items-center justify-center rounded-[5px]">
                        <ChevronRight className="size-5 text-gray-500" />
                      </span>
                    </Button>

                    <Button
                      variant="ghost"
                      visual="gray"
                      size="sm"
                      onClick={() => setIsSecurityQuestionsOpen(true)}
                      className="flex h-auto w-[550px] items-center justify-between gap-x-5 rounded-lg border border-gray-200 bg-white p-3 shadow-[0px_1px_5px_rgba(16,24,40,0.02)]"
                    >
                      <span className="flex items-center gap-x-3">
                        <span className="flex size-11 items-center justify-center rounded-lg border-[1.5px] border-gray-200">
                          <HelpCircle className="size-5 text-primary-500" />
                        </span>
                        <span className="text-sm font-medium leading-[17px] text-gray-900">
                          Security Questions
                        </span>
                        {areSecurityQuestionsSaved && (
                          <Badge
                            visual="success"
                            size="sm"
                            className="bg-success-50"
                          >
                            Enabled
                          </Badge>
                        )}
                      </span>
                      <span className="flex size-8 items-center justify-center rounded-[5px]">
                        <ChevronRight className="size-5 text-gray-500" />
                      </span>
                    </Button>

                    <Button
                      variant="ghost"
                      visual="gray"
                      size="sm"
                      className="flex h-auto w-[550px] items-center justify-between gap-x-5 rounded-lg border border-gray-200 bg-white p-3 shadow-[0px_1px_5px_rgba(16,24,40,0.02)]"
                    >
                      <span className="flex items-center gap-x-3">
                        <span className="flex size-11 items-center justify-center rounded-lg border-[1.5px] border-gray-200">
                          <Mail01 className="size-5 text-primary-500" />
                        </span>
                        <span className="text-sm font-medium leading-[17px] text-gray-900">
                          Recovery Email
                        </span>
                      </span>
                      <span className="flex size-8 items-center justify-center rounded-[5px]">
                        <ChevronRight className="size-5 text-gray-500" />
                      </span>
                    </Button>

                    <Button
                      variant="ghost"
                      visual="gray"
                      size="sm"
                      className="flex h-auto w-[550px] items-center justify-between gap-x-5 rounded-lg border border-gray-200 bg-white p-3 shadow-[0px_1px_5px_rgba(16,24,40,0.02)]"
                    >
                      <span className="flex items-center gap-x-3">
                        <span className="flex size-11 items-center justify-center rounded-lg border-[1.5px] border-gray-200">
                          <Smartphone className="size-5 text-primary-500" />
                        </span>
                        <span className="text-sm font-medium leading-[17px] text-gray-900">
                          App Authenticator
                        </span>
                      </span>
                      <span className="flex size-8 items-center justify-center rounded-[5px]">
                        <ChevronRight className="size-5 text-gray-500" />
                      </span>
                    </Button>
                  </div>

                  <div className="relative mt-6 w-[550px]">
                    {isSavedAlertMounted && (
                      <Alert
                        variant="success"
                        className={cn(
                          "absolute left-0 top-0 z-10 w-max min-w-[296px] items-center rounded-[5px] pointer-events-none transition-opacity duration-300",
                          isSavedAlertVisible ? "opacity-100" : "opacity-0"
                        )}
                      >
                        <AlertIcon>
                          <CheckCircle className="size-5 text-success-500" />
                        </AlertIcon>
                        <AlertTitle className="whitespace-nowrap text-success-600">
                          {savedAlertMessage}
                        </AlertTitle>
                      </Alert>
                    )}
                  </div>

                  <Dialog
                    open={isSecurityQuestionsOpen}
                    onOpenChange={setIsSecurityQuestionsOpen}
                  >
                    <DialogContent
                      className="flex w-[556px] max-w-[calc(100vw-2rem)] flex-col items-center gap-8 p-6 shadow-[0px_20px_24px_-4px_rgba(16,24,40,0.08),0px_8px_8px_-4px_rgba(16,24,40,0.03)]"
                      dialogOverlay={
                        <DialogOverlay className="backdrop-blur-[8px]" />
                      }
                    >
                      <IconButton
                        variant="ghost"
                        visual="gray"
                        size="sm"
                        className="absolute right-2.5 top-2.5 size-[38px] rounded-[5px]"
                        onClick={() => setIsSecurityQuestionsOpen(false)}
                      >
                        <X className="size-6 text-gray-500 opacity-50" />
                      </IconButton>

                      <div className="flex w-full flex-col items-start gap-5">
                        <div className="flex w-full flex-col items-start gap-2">
                          <DialogTitle className="w-full text-lg leading-7 font-semibold text-gray-900">
                            Security Questions
                          </DialogTitle>
                          <DialogDescription className="w-full text-sm text-gray-500">
                            Torem ipsum dolor sit amet, consectetur adipiscing
                            elit. Nunc vulputate libero et velit interdum, ac
                            aliquet odio mattis.
                          </DialogDescription>
                        </div>

                        <div className="flex h-[340px] w-full flex-col items-start gap-5 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-200 scrollbar-thumb-rounded-lg">
                          {securityQuestions.map((entry, index) => (
                            <div
                              key={index}
                              className="flex w-full flex-col items-start gap-5"
                            >
                              <div className="flex w-full flex-col items-start gap-1.5">
                                <Label size="sm">
                                  Security Question {index + 1}
                                </Label>
                                <Listbox
                                  value={entry.question}
                                  onChange={(value) =>
                                    updateSecurityQuestion(
                                      index,
                                      "question",
                                      value as string
                                    )
                                  }
                                >
                                  <ListboxButton
                                    placeholder="Select a question"
                                    displayValue={(val) =>
                                      securityQuestionPrompt(val as string) ||
                                      null
                                    }
                                  />
                                  <ListboxOptions>
                                    {securityQuestionOptions.map((option) => (
                                      <ListboxOption
                                        key={option.id}
                                        value={option.id}
                                      >
                                        {option.prompt}
                                      </ListboxOption>
                                    ))}
                                  </ListboxOptions>
                                </Listbox>
                              </div>

                              <div className="flex w-full flex-col items-start gap-1.5">
                                <Label size="sm">Your Answer</Label>
                                <Input
                                  placeholder="Enter your answer"
                                  value={entry.answer}
                                  onChange={(e) =>
                                    updateSecurityQuestion(
                                      index,
                                      "answer",
                                      e.target.value
                                    )
                                  }
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {securityQuestionsError && (
                        <p className="w-full text-xs font-medium text-error-500">
                          {securityQuestionsError}
                        </p>
                      )}

                      <div className="flex w-full items-start justify-end gap-x-3">
                        <Button
                          variant="outlined"
                          visual="gray"
                          size="sm"
                          onClick={() =>
                            setSecurityQuestions((prev) => [
                              ...prev,
                              { question: "", answer: "" },
                            ])
                          }
                        >
                          Add Question
                        </Button>
                        <Button
                          size="sm"
                          disabled={
                            !canSaveSecurityQuestions ||
                            isSavingSecurityQuestions
                          }
                          onClick={() => void handleSaveSecurityQuestions()}
                          leftIcon={<Save01 className="size-[15px]" />}
                        >
                          {isSavingSecurityQuestions
                            ? "Saving..."
                            : "Save Security Questions"}
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>

                  <Dialog
                    open={isPhoneVerificationOpen}
                    onOpenChange={setIsPhoneVerificationOpen}
                  >
                    <DialogContent
                      className="flex w-[467px] max-w-[calc(100vw-2rem)] flex-col items-center gap-8 p-6 shadow-[0px_20px_24px_-4px_rgba(16,24,40,0.08),0px_8px_8px_-4px_rgba(16,24,40,0.03)]"
                      dialogOverlay={
                        <DialogOverlay className="backdrop-blur-[8px]" />
                      }
                    >
                      <IconButton
                        variant="ghost"
                        visual="gray"
                        size="sm"
                        className="absolute right-2.5 top-2.5 size-[38px] rounded-[5px]"
                        onClick={() => setIsPhoneVerificationOpen(false)}
                      >
                        <X className="size-6 text-gray-500 opacity-50" />
                      </IconButton>

                      <div className="flex w-full flex-col items-start gap-5">
                        <div className="flex w-full flex-col items-start gap-2">
                          <DialogTitle className="w-full text-lg leading-7 font-semibold text-gray-900">
                            Phone Verification
                          </DialogTitle>
                          <DialogDescription className="w-full text-sm text-gray-500">
                            Enter your phone number and we&apos;ll send a magic
                            link to the number entered. You&apos;ll be able to
                            use this number if you ever need to recover your
                            account.
                          </DialogDescription>
                        </div>

                        <div className="flex w-full flex-col items-start gap-1.5">
                          <Label size="sm">Phone Number</Label>
                          <PhoneNumberInput
                            defaultCountry="us"
                            placeholder="(555) 555-5555"
                            disableDialCodePrefill
                            value={recoveryPhone}
                            onChange={setRecoveryPhone}
                          />
                        </div>
                      </div>

                      <div className="flex w-full items-start justify-end gap-x-3">
                        <Button
                          variant="outlined"
                          visual="gray"
                          size="sm"
                          onClick={() => setIsPhoneVerificationOpen(false)}
                        >
                          Cancel
                        </Button>
                        <Button
                          size="sm"
                          disabled={!isPhoneValid(recoveryPhone)}
                          onClick={() => {
                            setIsPhoneVerificationOpen(false)
                            setIsRecoveryLinkSent(true)
                          }}
                          leftIcon={<Send01 className="size-[15px]" />}
                        >
                          Send Link
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>

                  <Dialog
                    open={isRecoveryLinkSent}
                    onOpenChange={(open) =>
                      open
                        ? setIsRecoveryLinkSent(true)
                        : closeRecoveryMagicLink()
                    }
                  >
                    <DialogContent
                      className="flex w-[508px] max-w-[calc(100vw-2rem)] flex-col items-center gap-8 px-[55px] pb-6 pt-[55px] shadow-[0px_20px_24px_-4px_rgba(16,24,40,0.08),0px_8px_8px_-4px_rgba(16,24,40,0.03)]"
                      dialogOverlay={
                        <DialogOverlay className="backdrop-blur-[8px]" />
                      }
                    >
                      <div className="flex w-full flex-col items-center gap-5">
                        <span className="flex size-12 items-center justify-center rounded-full border-8 border-primary-25 bg-primary-50">
                          <Phone className="size-6 text-primary-500" />
                        </span>

                        <div className="flex w-full flex-col items-center gap-2">
                          <DialogTitle className="w-full text-center text-lg leading-7 font-semibold text-gray-900">
                            Please check your phone
                          </DialogTitle>
                          <DialogDescription className="text-center text-sm text-gray-500">
                            We sent a magic link sent to phone number ending
                            with{" "}
                            <span className="font-semibold text-gray-900">
                              {recoveryPhoneLast4}
                            </span>
                            .
                          </DialogDescription>
                          <p className="w-full text-center text-sm text-gray-500">
                            The link will expire in{" "}
                            <span className="font-semibold text-gray-900">
                              24 hours
                            </span>
                            .
                          </p>
                        </div>
                      </div>

                      <Button size="sm">Resend Link</Button>

                      <p className="w-full text-center text-sm text-gray-500">
                        No longer have access to this email?{" "}
                        <a href="#" className="underline">
                          Start account recovery
                        </a>
                      </p>

                      <IconButton
                        variant="ghost"
                        visual="gray"
                        size="sm"
                        className="absolute right-2.5 top-2.5 size-[38px] rounded-[5px]"
                        onClick={closeRecoveryMagicLink}
                      >
                        <X className="size-6 text-gray-500 opacity-50" />
                      </IconButton>
                    </DialogContent>
                  </Dialog>
                </>
              )}

              {activeTab === "users" && (
                <>
                  <h1 className="text-[26px] leading-6 font-semibold capitalize text-dark-blue-400">
                    Users
                  </h1>

                  <div className="mt-6 w-full">
                    {sortedTeamMembers.length === 0 ? (
                      <div className="mt-6 rounded-lg border border-dashed border-gray-300 bg-white py-16 px-6 flex flex-col items-center justify-center text-center">
                        <div className="size-12 rounded-full bg-gray-100 flex items-center justify-center">
                          <Users01 className="size-6 text-gray-400" />
                        </div>
                        <h3 className="mt-4 text-base font-semibold text-dark-blue-400">
                          No team members yet
                        </h3>
                        <p className="mt-1 max-w-md text-sm text-gray-500">
                          Grow faster by bringing your team on board. Collaborate on projects, share workloads, and keep everyone aligned in one place.
                        </p>
                        <div className="mt-5">
                          <Button size="sm" leftIcon={<Plus className="size-4" />} onClick={() => toggleInviteWindow(true, "Invite Team Member")}>
                            Add Team Member
                          </Button>
                        </div>
                      </div>
                    ) : (
                    <div className="w-full overflow-x-auto rounded-lg border border-gray-200 bg-white shadow-[0px_1px_4px_0px_rgba(0,0,0,0.03)]">
                      <Table className="w-full">
                        <TableHeader>
                          <TableRow className="hover:bg-transparent">
                            <TableHead className="cursor-pointer select-none" onClick={() => toggleUsersSort("name")}>
                              <div className="inline-flex items-center gap-x-1">
                                Team Member
                                {usersSortKey === "name" && (usersSortDir === "asc" ? <ArrowUp className="size-4" /> : <ArrowDown className="size-4" />)}
                              </div>
                            </TableHead>
                            <TableHead className="cursor-pointer select-none" onClick={() => toggleUsersSort("role")}>
                              <div className="inline-flex items-center gap-x-1">
                                Role
                                {usersSortKey === "role" && (usersSortDir === "asc" ? <ArrowUp className="size-4" /> : <ArrowDown className="size-4" />)}
                              </div>
                            </TableHead>
                            <TableHead className="cursor-pointer select-none" onClick={() => toggleUsersSort("company")}>
                              <div className="inline-flex items-center gap-x-1">
                                Company
                                {usersSortKey === "company" && (usersSortDir === "asc" ? <ArrowUp className="size-4" /> : <ArrowDown className="size-4" />)}
                              </div>
                            </TableHead>
                            <TableHead className="cursor-pointer select-none" onClick={() => toggleUsersSort("status")}>
                              <div className="inline-flex items-center gap-x-1">
                                Status
                                {usersSortKey === "status" && (usersSortDir === "asc" ? <ArrowUp className="size-4" /> : <ArrowDown className="size-4" />)}
                              </div>
                            </TableHead>
                            <TableHead className="w-[75px]" />
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {sortedTeamMembers.map((member) => {
                            const originalIdx = teamMembers.indexOf(member)
                            return (
                            <TableRow key={originalIdx} className="cursor-pointer" onClick={() => openPermsFlyout(originalIdx)}>
                              <TableCell className="h-[72px] px-6 py-4">
                                <div className="flex items-center gap-x-3">
                                  {member.name ? (
                                    <Avatar size="md" className="hover:ring-0 active:ring-0">
                                      <AvatarImage src={member.avatar || undefined} alt={member.name} />
                                      <AvatarFallback>
                                        {member.name
                                          .split(" ")
                                          .map((n) => n[0])
                                          .join("")
                                          .slice(0, 2)}
                                      </AvatarFallback>
                                    </Avatar>
                                  ) : (
                                    <div className="flex size-10 shrink-0 items-center justify-center rounded-full border border-dashed border-gray-300 bg-gray-50">
                                      <User01 className="size-[15px] text-gray-400" />
                                    </div>
                                  )}
                                  <div className="flex flex-col">
                                    {member.name && (
                                      <span className="text-sm font-semibold leading-5 text-gray-900">
                                        {member.name}
                                      </span>
                                    )}
                                    <span className="text-sm leading-5 text-gray-500">
                                      {member.email}
                                    </span>
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell className="h-[72px] px-6 py-4">
                                {member.role ? (() => {
                                  const roles = member.role.split(", ").filter(Boolean)
                                  if (roles.length <= 2) {
                                    return (
                                      <span className="text-sm capitalize leading-5 text-gray-600">
                                        {member.role}
                                      </span>
                                    )
                                  }
                                  return (
                                    <span className="flex items-center gap-x-1.5 text-sm capitalize leading-5 text-gray-600">
                                      {roles[0]}
                                      <TooltipProvider delayDuration={200}>
                                        <Tooltip>
                                          <TooltipTrigger asChild>
                                            <span className="inline-flex h-5 min-w-[20px] cursor-default items-center justify-center rounded-full bg-gray-100 px-1.5 text-xs font-medium text-gray-600">
                                              +{roles.length - 1}
                                            </span>
                                          </TooltipTrigger>
                                          <TooltipContent side="top" size="sm">
                                            {roles.slice(1).map((r, i) => (
                                              <div key={i}>{r}</div>
                                            ))}
                                          </TooltipContent>
                                        </Tooltip>
                                      </TooltipProvider>
                                    </span>
                                  )
                                })() : (
                                  <span className="text-sm leading-5 text-gray-300">
                                    &mdash;
                                  </span>
                                )}
                              </TableCell>
                              <TableCell className="h-[72px] px-6 py-4" onClick={(e) => e.stopPropagation()}>
                                {member.company ? (
                                  <a
                                    href="/client-profile"
                                    className="text-sm font-semibold leading-5 text-primary-500 transition-colors hover:text-primary-700 hover:underline"
                                  >
                                    {member.company}
                                  </a>
                                ) : (
                                  <span className="text-sm leading-5 text-gray-300">
                                    &mdash;
                                  </span>
                                )}
                              </TableCell>
                              <TableCell className="h-[72px] px-6 py-4">
                                {member.status === "active" ? (
                                  <Badge visual="success" size="sm">
                                    Active
                                  </Badge>
                                ) : (
                                  <Badge visual="gray" size="sm">
                                    Invitation pending
                                  </Badge>
                                )}
                              </TableCell>
                              <TableCell className="h-[72px] w-[75px] px-6 py-4" onClick={(e) => e.stopPropagation()}>
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button
                                      className="h-6 px-1.5 py-1 text-gray-500"
                                      visual="gray"
                                      variant="ghost"
                                    >
                                      <DotsHorizontal className="size-5" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end" className="w-[165px]">
                                    <DropdownMenuItem
                                      onClick={() => openPermsFlyout(originalIdx)}
                                    >
                                      Edit Permissions
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      onClick={() => {
                                        if (member.name) {
                                          router.push("/talent-profile")
                                        }
                                      }}
                                    >
                                      View Profile
                                    </DropdownMenuItem>
                                    {member.status === "pending" && (
                                      <>
                                        <DropdownMenuItem onClick={() => handleResendInvite(originalIdx)}>
                                          Resend Invite
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => handleCancelInvite(originalIdx)}>
                                          Cancel Invite
                                        </DropdownMenuItem>
                                      </>
                                    )}
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem visual="destructive" onClick={() => setRemoveMemberIdx(originalIdx)}>
                                      Remove User
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </TableCell>
                            </TableRow>
                          )})}
                        </TableBody>
                      </Table>
                    </div>
                    )}

                  </div>

                  {/* Remove user confirmation modal */}
                  <Dialog
                    open={removeMemberIdx !== null}
                    onOpenChange={(open) => {
                      if (!open) setRemoveMemberIdx(null)
                    }}
                  >
                    <DialogContent
                      className="flex w-[534px] max-w-[calc(100vw-2rem)] flex-col items-center gap-8 p-[55px] shadow-[0px_20px_24px_-4px_rgba(16,24,40,0.08),0px_8px_8px_-4px_rgba(16,24,40,0.03)]"
                      dialogOverlay={
                        <DialogOverlay className="backdrop-blur-[8px]" />
                      }
                    >
                      <IconButton
                        variant="ghost"
                        visual="gray"
                        size="sm"
                        className="absolute right-2.5 top-2.5 size-[38px] rounded-[5px]"
                        onClick={() => setRemoveMemberIdx(null)}
                      >
                        <X className="size-6 text-gray-500 opacity-50" />
                      </IconButton>

                      <div className="flex w-full flex-col items-center gap-5">
                        <span className="flex size-12 items-center justify-center rounded-full border-8 border-error-50 bg-error-100">
                          <AlertTriangle className="size-6 text-error-500" />
                        </span>

                        <div className="flex w-full flex-col items-center gap-2">
                          <DialogTitle className="max-w-[284px] text-center text-lg leading-7 font-semibold text-gray-900">
                            Remove {removeMemberIdx !== null ? (teamMembers[removeMemberIdx]?.name || teamMembers[removeMemberIdx]?.email) : "user"}?
                          </DialogTitle>
                          <DialogDescription className="text-center text-sm text-gray-500">
                            This user will lose access to the team and all assigned
                            permissions. This action cannot be undone.
                          </DialogDescription>
                        </div>
                      </div>

                      <div className="flex w-full items-start justify-center gap-x-3">
                        <Button
                          variant="outlined"
                          visual="gray"
                          size="sm"
                          onClick={() => setRemoveMemberIdx(null)}
                        >
                          Cancel
                        </Button>
                        <Button
                          visual="error"
                          size="sm"
                          onClick={handleRemoveMember}
                          leftIcon={<Trash01 className="size-[15px]" />}
                        >
                          Yes, Remove User
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>

                  {/* Permissions flyout overlay */}
                  {editingMemberIdx !== null && (
                    <>
                      {/* Backdrop — z-[60] to cover nav (z-50) */}
                      <div
                        className={cn(
                          "fixed inset-0 z-[60] bg-black/20 transition-opacity duration-150",
                          permsFlyoutVisible ? "opacity-100" : "opacity-0"
                        )}
                        onClick={closePermsFlyout}
                      />

                      {/* Panel — slides in from right */}
                      <div
                        className={cn(
                          "fixed inset-y-0 right-0 z-[70] flex w-[380px] flex-col border-l border-gray-100 bg-white shadow-[0px_12px_16px_-4px_rgba(16,24,40,0.08)] transition-transform duration-150 ease-out",
                          permsFlyoutVisible ? "translate-x-0" : "translate-x-full"
                        )}
                      >
                        {/* Header */}
                        <div className="flex flex-col gap-6 px-6 pb-2 pt-6">
                          <div className="flex items-center justify-between">
                            <span className="text-base font-semibold capitalize text-dark-blue-400">
                              Select Permissions
                            </span>
                            <IconButton
                              variant="ghost"
                              visual="gray"
                              size="sm"
                              className="opacity-50 transition-opacity hover:opacity-100"
                              onClick={closePermsFlyout}
                            >
                              <X className="size-[18px]" />
                            </IconButton>
                          </div>

                          {/* Search */}
                          <InputGroup className="group/search w-full">
                            <InputLeftElement>
                              <SearchMd className="size-4 text-gray-400 transition-colors duration-300 group-hover/search:text-gray-500 group-focus-within/search:!text-primary-500" />
                            </InputLeftElement>
                            <Input
                              placeholder="Search"
                              className="h-9 pl-9 pr-9 transition-[border-color] duration-300 hover:border-primary-200 hover:shadow-[0px_0px_0px_4px_#E1EAFF] focus:!ring-0 focus:!shadow-[0px_0px_0px_4px_#E1EAFF]"
                              value={permSearch}
                              onChange={(e) => setPermSearch(e.target.value)}
                            />
                            {permSearch && (
                              <InputRightElement>
                                <button
                                  onMouseDown={(e) => e.preventDefault()}
                                  onClick={() => setPermSearch("")}
                                >
                                  <XCircle className="size-4 text-gray-500 opacity-50 hover:opacity-100" />
                                </button>
                              </InputRightElement>
                            )}
                          </InputGroup>
                        </div>

                        {/* Scrollable role list */}
                        <div className="flex-1 overflow-y-auto p-6 scrollbar-thin scrollbar-thumb-transparent hover:scrollbar-thumb-gray-200 scrollbar-thumb-rounded-lg">
                          <div className="flex flex-col gap-6">
                            {filteredPermCategories.map((cat, catIdx) => (
                              <div key={cat.title}>
                                {catIdx > 0 && (
                                  <hr className="mb-6 border-gray-200" />
                                )}
                                <div className="flex flex-col gap-6">
                                  <p className="text-base font-bold leading-6 tracking-[-0.3px] text-dark-blue-400">
                                    {cat.title}
                                  </p>
                                  <div className="flex flex-col gap-3.5">
                                    {cat.roles.map((role) => (
                                      <label
                                        key={role.id}
                                        className="flex cursor-pointer items-start gap-3"
                                      >
                                        <Checkbox
                                          size="sm"
                                          checked={selectedPerms.includes(role.id)}
                                          onCheckedChange={() => togglePerm(role.id)}
                                          className="mt-px"
                                        />
                                        <div className="flex flex-1 flex-col gap-1.5">
                                          <span className="text-[15px] font-semibold leading-[13.3px] text-gray-500">
                                            {role.label}
                                          </span>
                                          <span className="text-[13px] leading-[13.3px] text-gray-500">
                                            {role.desc}
                                          </span>
                                          <button className="self-start text-[10px] font-semibold leading-5 text-primary-500 transition-colors hover:text-primary-700 hover:underline">
                                            View Details
                                          </button>
                                        </div>
                                      </label>
                                    ))}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Footer */}
                        <div className="flex items-center justify-between border-t border-gray-200 py-3 pl-6 pr-3">
                          <span className="text-sm font-medium text-dark-blue-400">
                            {selectedPerms.length} role{selectedPerms.length !== 1 ? "s" : ""} selected
                          </span>
                          <Button size="sm" className="rounded-[5px] px-3.5 py-2 text-xs" disabled={selectedPerms.length === 0} onClick={applyPerms}>
                            Apply
                          </Button>
                        </div>
                      </div>
                    </>
                  )}
                </>
              )}

              {activeTab === "roles" && (
                <>
                  <h1 className="text-[26px] leading-6 font-semibold capitalize text-dark-blue-400">
                    Roles
                  </h1>

                  <div className="mt-6 flex flex-col items-center">
                    {/* Hero card */}
                    <div className="w-full rounded-lg border border-gray-200 bg-white shadow-xs overflow-hidden">
                      {/* Gradient banner */}
                      <div className="relative flex flex-col items-center bg-gradient-to-br from-primary-50 via-primary-25 to-white px-6 pb-8 pt-10">
                        <div className="flex size-16 items-center justify-center rounded-2xl border border-primary-100 bg-white shadow-xs">
                          <Zap className="size-7 text-primary-500" />
                        </div>
                        <h2 className="mt-5 text-xl font-semibold text-dark-blue-400">
                          Custom Roles
                        </h2>
                        <p className="mt-2 max-w-md text-center text-sm leading-5 text-gray-500">
                          Create tailored roles with granular permissions that match your exact team structure and workflow needs.
                        </p>
                        <Badge visual="primary" size="sm" className="mt-4">
                          Premium Feature
                        </Badge>
                      </div>

                      {/* Benefits grid */}
                      <div className="border-t border-gray-100 px-8 py-8">
                        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                          {[
                            {
                              icon: Shield01,
                              title: "Granular Access Control",
                              desc: "Define exactly what each team member can see, edit, and manage across your entire workspace.",
                            },
                            {
                              icon: Users01,
                              title: "Unlimited Custom Roles",
                              desc: "Go beyond standard roles. Create as many custom roles as your organization needs.",
                            },
                            {
                              icon: LayersThree01,
                              title: "Role Hierarchy",
                              desc: "Set up role inheritance so senior roles automatically include the permissions of junior ones.",
                            },
                            {
                              icon: Lock01,
                              title: "Sensitive Data Protection",
                              desc: "Restrict access to financial data, contracts, and confidential documents to only those who need it.",
                            },
                          ].map((benefit) => {
                            const BenefitIcon = benefit.icon
                            return (
                              <div key={benefit.title} className="flex gap-x-3">
                                <div className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-gray-200 bg-white shadow-xs">
                                  <BenefitIcon className="size-5 text-primary-500" />
                                </div>
                                <div className="flex flex-col gap-y-1">
                                  <span className="text-sm font-semibold text-dark-blue-400">
                                    {benefit.title}
                                  </span>
                                  <span className="text-sm leading-5 text-gray-500">
                                    {benefit.desc}
                                  </span>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </div>

                      {/* CTA */}
                      <div className="flex flex-col items-center border-t border-gray-100 bg-gray-25 px-8 py-8">
                        <p className="text-sm text-gray-500">
                          Upgrade your plan to unlock custom roles and take full control of your team permissions.
                        </p>
                        <Button
                          className="mt-4"
                          size="md"
                          leftIcon={<Zap className="size-4" />}
                          onClick={() => goToTab("billing-plans")}
                        >
                          Upgrade Plan
                        </Button>
                      </div>
                    </div>
                  </div>
                </>
              )}

              {activeTab === "devices" && !deviceDetail && (
                <>
                  <div className="flex items-start justify-between gap-6">
                  <div className="flex flex-col items-start gap-3">
                    <div className="flex items-center gap-x-3">
                      <h1 className="text-[26px] leading-6 font-semibold capitalize text-dark-blue-400">
                        Devices
                      </h1>
                      <Badge visual="primary" size="sm">
                        {deviceSessions.length}{" "}
                        {deviceSessions.length === 1 ? "device" : "devices"}
                      </Badge>
                    </div>
                    <p className="w-full text-sm text-gray-500">
                      View and manage the devices that have access to your
                      account.
                    </p>
                  </div>

                    {selectedDevices.length > 0 && (
                      <div className="flex items-start gap-x-3">
                        <Button
                          variant="outlined"
                          visual="gray"
                          size="sm"
                          onClick={() => setSelectedDevices([])}
                        >
                          Cancel
                        </Button>
                        <Button size="sm" onClick={handleRemoveFromList}>
                          Remove Device
                        </Button>
                      </div>
                    )}
                  </div>

                  <div className="mt-6 w-full overflow-x-auto">
                    <Table className="min-w-[1088px] border-separate border-spacing-0">
                      <TableHeader className="bg-transparent [&_tr]:border-0">
                        <TableRow className="hover:bg-transparent">
                          <TableHead>
                            <span className="flex items-center gap-x-3">
                              <Checkbox
                                size="md"
                                checked={allDevicesSelected}
                                onCheckedChange={(checked) =>
                                  setSelectedDevices(
                                    checked === true
                                      ? deviceSessions.map((d) => d.id)
                                      : []
                                  )
                                }
                              />
                              Name
                            </span>
                          </TableHead>
                          <TableHead>
                            <span className="flex items-center gap-x-1">
                              Device Type
                              <ArrowDown className="size-4" />
                            </span>
                          </TableHead>
                          <TableHead>
                            <span className="flex items-center gap-x-1">
                              Status
                              <ArrowDown className="size-4" />
                            </span>
                          </TableHead>
                          <TableHead>
                            <span className="flex items-center gap-x-1">
                              Most Recent Activity
                              <ArrowDown className="size-4" />
                            </span>
                          </TableHead>
                          <TableHead className="w-16" />
                        </TableRow>
                      </TableHeader>

                      <TableBody
                        className={cn(
                          "bg-white [&_tr]:border-0",
                          "[&_tr:first-child>td]:shadow-[0px_-1px_4px_rgba(0,0,0,0.015)]",
                          "[&_td]:border-b [&_td]:border-gray-200",
                          "[&_tr>td:first-child]:border-l [&_tr>td:last-child]:border-r",
                          "[&_tr:first-child>td]:border-t",
                          "[&_tr:first-child>td:first-child]:rounded-tl-lg",
                          "[&_tr:first-child>td:last-child]:rounded-tr-lg",
                          "[&_tr:last-child>td:first-child]:rounded-bl-lg",
                          "[&_tr:last-child>td:last-child]:rounded-br-lg"
                        )}
                      >
                        {deviceSessions.map((device) => (
                          <TableRow key={device.id} className="h-[72px]">
                            <TableCell className="py-4">
                              <span className="flex items-center gap-x-3">
                                <Checkbox
                                  size="md"
                                  checked={selectedDevices.includes(device.id)}
                                  onCheckedChange={(checked) =>
                                    setSelectedDevices((prev) =>
                                      checked === true
                                        ? [...prev, device.id]
                                        : prev.filter((i) => i !== device.id)
                                    )
                                  }
                                />
                                <span className="text-sm font-semibold text-gray-900">
                                  {deviceLabel(device)}
                                </span>
                              </span>
                            </TableCell>

                            <TableCell className="py-4">
                              <span className="flex items-center gap-x-3.5">
                                {deviceTypeIcon(deviceTypeLabel(device))}
                                {deviceTypeLabel(device)}
                              </span>
                            </TableCell>

                            <TableCell className="py-4">
                              <Badge
                                visual="success"
                                size="sm"
                                className="bg-success-50 pl-1.5"
                              >
                                <Dot className="size-2 text-success-500" />
                                Active
                              </Badge>
                            </TableCell>

                            <TableCell className="py-4">
                              {relativeActivity(device.lastActiveAt)}
                            </TableCell>

                            <TableCell className="py-4 pr-4 text-right">
                              <IconButton
                                variant="ghost"
                                visual="gray"
                                size="sm"
                                className="size-8 rounded-[5px]"
                                onClick={() => openDeviceDetail(device)}
                              >
                                <ChevronRight className="size-5 text-gray-500" />
                              </IconButton>
                            </TableCell>
                          </TableRow>
                        ))}

                        {!isLoadingDevices && deviceSessions.length === 0 && (
                          <TableRow>
                            <TableCell colSpan={5} className="py-10 text-center">
                              No devices have accessed your account yet.
                            </TableCell>
                          </TableRow>
                        )}

                        {isLoadingDevices && deviceSessions.length === 0 && (
                          <TableRow>
                            <TableCell colSpan={5} className="py-10 text-center">
                              Loading devices…
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </>
              )}

              {activeTab === "devices" && deviceDetail && (
                <>
                  <div className="flex w-full items-center justify-between gap-1">
                    <h1 className="text-[26px] leading-6 font-semibold capitalize text-dark-blue-400">
                      Device Details
                    </h1>
                    <div className="flex items-start justify-end gap-x-3">
                      <Button
                        variant="outlined"
                        visual="gray"
                        size="sm"
                        onClick={() => setDeviceDetail(null)}
                        leftIcon={<ArrowLeft className="size-[15px]" />}
                      >
                        Back
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => setIsRemoveDeviceOpen(true)}
                      >
                        Remove Device
                      </Button>
                    </div>
                  </div>

                  <div className="mt-6 w-full overflow-hidden rounded-lg border border-gray-200 bg-white shadow-[0px_1px_4px_rgba(0,0,0,0.03)]">
                    <div className="flex h-[69px] items-center px-6">
                      <h2 className="text-lg leading-7 font-semibold text-gray-900">
                        User Information
                      </h2>
                    </div>

                    <Table className="w-full min-w-[1088px] table-fixed border-t border-gray-200">
                      <TableHeader className="bg-gray-50 [&_tr]:border-0">
                        <TableRow className="hover:bg-transparent">
                          <TableHead className="w-[111px] whitespace-nowrap border-b border-gray-200 hover:text-gray-600">
                            <span className="flex items-center gap-x-1">
                              Status
                              <ArrowDown className="size-4" />
                            </span>
                          </TableHead>
                          <TableHead className="w-[188px] whitespace-nowrap border-b border-gray-200 hover:text-gray-600">
                            <span className="flex items-center gap-x-1">
                              Most Recent Activity
                              <HelpCircle className="size-4 text-gray-400" />
                            </span>
                          </TableHead>
                          <TableHead className="w-[129px] whitespace-nowrap border-b border-gray-200 hover:text-gray-600">
                            First Activity
                          </TableHead>
                          <TableHead className="whitespace-nowrap border-b border-gray-200 hover:text-gray-600">
                            Device Name
                          </TableHead>
                        </TableRow>
                      </TableHeader>

                      <TableBody className="bg-white">
                        <TableRow className="hover:bg-transparent">
                          <TableCell>
                            <Badge
                              visual="success"
                              size="sm"
                              className="bg-success-50 pl-1.5"
                            >
                              <Dot className="size-2 text-success-500" />
                              Active
                            </Badge>
                          </TableCell>
                          <TableCell className="whitespace-nowrap">
                            {relativeActivity(deviceDetail.lastActiveAt)}
                          </TableCell>
                          <TableCell className="whitespace-nowrap">
                            {new Date(deviceDetail.createdAt).toLocaleDateString(
                              "en-US",
                              { month: "short", day: "numeric", year: "numeric" }
                            )}
                          </TableCell>
                          <TableCell className="truncate">
                            {deviceLabel(deviceDetail)}
                          </TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>

                    <div className="flex h-[69px] items-center border-t border-gray-200 px-6">
                      <h2 className="text-lg leading-7 font-semibold text-gray-900">
                        Device Information
                      </h2>
                    </div>

                    <Table className="w-full min-w-[1088px] table-fixed border-t border-gray-200">
                      <TableHeader className="bg-gray-50 [&_tr]:border-0">
                        <TableRow className="hover:bg-transparent">
                          <TableHead className="w-[159px] whitespace-nowrap border-b border-gray-200 hover:text-gray-600">
                            Device Name
                          </TableHead>
                          <TableHead className="w-[154px] whitespace-nowrap border-b border-gray-200 hover:text-gray-600">
                            Device Type
                          </TableHead>
                          <TableHead className="w-[131px] whitespace-nowrap border-b border-gray-200 hover:text-gray-600">
                            Device OS
                          </TableHead>
                          <TableHead className="w-[134px] whitespace-nowrap border-b border-gray-200 hover:text-gray-600">
                            Location
                          </TableHead>
                          <TableHead className="whitespace-nowrap border-b border-gray-200 hover:text-gray-600">
                            IP Address
                          </TableHead>
                        </TableRow>
                      </TableHeader>

                      <TableBody className="bg-white">
                        <TableRow className="hover:bg-transparent">
                          <TableCell className="truncate">
                            {deviceLabel(deviceDetail)}
                          </TableCell>
                          <TableCell>
                            <span className="flex items-center gap-x-3.5">
                              {deviceTypeIcon(deviceTypeLabel(deviceDetail))}
                              {deviceTypeLabel(deviceDetail)}
                            </span>
                          </TableCell>
                          <TableCell className="whitespace-nowrap">
                            {[
                              resolvedOs(deviceDetail),
                              deviceDetail.osVersion ||
                                uaOsVersion(deviceDetail.userAgent),
                            ]
                              .filter(Boolean)
                              .join(" ") || "—"}
                          </TableCell>
                          <TableCell>—</TableCell>
                          <TableCell className="truncate">
                            {deviceDetail.ipAddress || "—"}
                          </TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </div>

                  <Dialog
                    open={isRemoveDeviceOpen}
                    onOpenChange={setIsRemoveDeviceOpen}
                  >
                    <DialogContent
                      className="flex w-[534px] max-w-[calc(100vw-2rem)] flex-col items-center gap-8 p-[55px] shadow-[0px_20px_24px_-4px_rgba(16,24,40,0.08),0px_8px_8px_-4px_rgba(16,24,40,0.03)]"
                      dialogOverlay={
                        <DialogOverlay className="backdrop-blur-[8px]" />
                      }
                    >
                      <IconButton
                        variant="ghost"
                        visual="gray"
                        size="sm"
                        className="absolute right-2.5 top-2.5 size-[38px] rounded-[5px]"
                        onClick={() => setIsRemoveDeviceOpen(false)}
                      >
                        <X className="size-6 text-gray-500 opacity-50" />
                      </IconButton>

                      <div className="flex w-full flex-col items-center gap-5">
                        <span className="flex size-12 items-center justify-center rounded-full border-8 border-warning-50 bg-warning-100">
                          <AlertTriangle className="size-6 text-warning-500" />
                        </span>

                        <div className="flex w-full flex-col items-center gap-2">
                          <DialogTitle className="max-w-[284px] text-center text-lg leading-7 font-semibold text-gray-900">
                            Are you sure you want to remove this device?
                          </DialogTitle>
                          <DialogDescription className="text-center text-sm text-gray-500">
                            This device will be signed out and will no longer
                            have access to your account.
                          </DialogDescription>
                        </div>
                      </div>

                      <div className="flex w-full items-start justify-center gap-x-3">
                        <Button
                          variant="outlined"
                          visual="gray"
                          size="sm"
                          onClick={handleConfirmRemoveDevice}
                          leftIcon={<ShieldOff className="size-[15px]" />}
                        >
                          Remove &amp; Revoke Access
                        </Button>
                        <Button
                          visual="error"
                          size="sm"
                          onClick={handleConfirmRemoveDevice}
                          leftIcon={<Trash01 className="size-[15px]" />}
                        >
                          Yes, Remove Device
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </>
              )}

              {activeTab === "ip-restrictions" && (
                <>
                  <div className="w-full">
                    <div className="flex items-start justify-between gap-6">
                      <div className="flex w-[550px] flex-col items-start gap-6">
                        <div className="flex w-full flex-col items-start gap-3">
                          <h1 className="text-[26px] leading-6 font-semibold capitalize text-dark-blue-400">
                            IP Address Restriction
                          </h1>
                          <p className="w-full text-sm text-gray-500">
                            Control which IP addresses are allowed to access
                            your account. Any device outside these addresses
                            will be blocked from signing in.{" "}
                            <a href="#" className="text-primary-500 underline">
                              Learn More
                            </a>
                            .
                          </p>
                        </div>
                        <div className="flex items-start gap-x-3">
                          <span className="text-sm font-medium text-gray-700">
                            Your current IP address is:
                          </span>
                          <span className="text-sm font-bold text-gray-700">
                            {currentIpAddress ?? "—"}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-start justify-end gap-x-3">
                        <Button
                          variant="light"
                          visual="primary"
                          size="sm"
                          className="bg-primary-500/15"
                          onClick={() => setIsCsvOpen(true)}
                          leftIcon={<Upload01 className="size-[15px]" />}
                        >
                          Upload CSV
                        </Button>
                        <Button
                          variant="filled"
                          visual="primary"
                          size="sm"
                          className="shadow-xs"
                          onClick={openAddIps}
                          leftIcon={<Plus className="size-[15px]" />}
                        >
                          Add IPs
                        </Button>
                      </div>
                    </div>

                    {/* A failed load leaves an empty table that reads as "you
                        have no allowed addresses", which is the opposite of
                        what it means. */}
                    {allowedIpsError && (
                      <p className="mt-6 text-sm text-error-500">
                        {allowedIpsError}
                      </p>
                    )}

                    {allowedIps.length > 0 && (
                      <div className="mt-6 flex items-center gap-x-3">
                        <Switch
                          checked={isIpRestrictionEnabled}
                          onCheckedChange={handleIpRestrictionToggle}
                        />
                        <span className="flex items-center gap-x-2 text-sm font-medium text-gray-700">
                          Enable IP Restriction
                          <HelpCircle className="size-3.5 text-gray-400" />
                        </span>
                      </div>
                    )}

                    {allowedIps.length === 0 ? (
                      <div className="mt-6 w-full rounded-lg border border-gray-200 bg-white shadow-[0px_1px_4px_rgba(0,0,0,0.03)]">
                        <div className="flex flex-col gap-5">
                          <div className="flex items-start gap-4 px-6 pt-5">
                            <div className="flex flex-1 flex-col justify-center gap-1">
                              <h2 className="text-lg font-semibold text-gray-black">
                                Allowed IP Addresses
                              </h2>
                            </div>
                            <div className="flex items-center gap-x-3">
                              <Button
                                variant="outlined"
                                visual="gray"
                                size="md"
                                className="bg-white shadow-xs"
                                onClick={openAddIps}
                                leftIcon={<Plus className="size-[15px]" />}
                              >
                                Add IPs
                              </Button>
                            </div>
                          </div>
                          <div className="h-px w-full bg-gray-200" />
                        </div>

                        <div className="flex flex-col items-center justify-center gap-8 px-8 pb-8 pt-10">
                          <div className="flex items-center justify-center">
                            <div className="flex w-[352px] flex-col items-center gap-6">
                              <div className="flex w-full flex-col items-center gap-4">
                                <div className="flex size-12 items-center justify-center rounded-[28px] border-8 border-gray-50 bg-gray-100">
                                  <SearchLg className="size-6 text-gray-500" />
                                </div>
                                <div className="flex w-full flex-col items-center gap-1">
                                  <p className="text-center text-base font-semibold text-gray-black">
                                    No IP&apos;s Found
                                  </p>
                                  <p className="text-center text-sm text-gray-600">
                                    You do not currently have any allowed IP
                                    addresses. Use the buttons above to add
                                    allowed IPs
                                  </p>
                                </div>
                              </div>
                            </div>
                          </div>

                          <Alert className="w-full rounded-[5px]">
                            <AlertIcon className="mt-0.5 shrink-0">
                              <InfoCircle className="size-5 text-gray-500" />
                            </AlertIcon>
                            <AlertContent className="flex items-start justify-between gap-x-3">
                              <ul className="list-disc pl-4 text-sm text-gray-500">
                                <li>
                                  Allowed IP addresses are whitelisted by you.
                                </li>
                                <li>
                                  You can add individual IP addresses or an IP
                                  range.
                                </li>
                                <li>
                                  You can use the Upload CSV button to add
                                  several IP addresses and ranges at once.
                                </li>
                              </ul>
                              <Button
                                variant="link"
                                visual="primary"
                                size="sm"
                                className="h-5 shrink-0 p-0 capitalize"
                                rightIcon={
                                  <LinkExternal01 className="size-[15px]" />
                                }
                              >
                                Learn More
                              </Button>
                            </AlertContent>
                          </Alert>
                        </div>
                      </div>
                    ) : (
                      <div className="mt-6 flex w-full flex-col items-start gap-3.5">
                        <h2 className="text-lg font-medium text-gray-900">
                          Allowed IP Addresses
                        </h2>

                        <div className="w-full overflow-hidden rounded-xl border border-gray-200 bg-white shadow-[0px_1px_3px_rgba(16,24,40,0.1),0px_1px_2px_rgba(16,24,40,0.06)]">
                          <Table>
                            <TableHeader className="bg-gray-50">
                              <TableRow className="hover:bg-transparent">
                                <TableHead>IP Address</TableHead>
                                <TableHead>Description</TableHead>
                                <TableHead>
                                  <span className="flex items-center gap-x-1">
                                    Date Added
                                    <ArrowDown className="size-4" />
                                  </span>
                                </TableHead>
                                <TableHead className="w-[148px]" />
                              </TableRow>
                            </TableHeader>
                            <TableBody className="[&_tr:last-child_td]:border-b-0">
                              {allowedIps.map((entry) => (
                                <TableRow
                                  key={entry.id}
                                  className="hover:bg-transparent"
                                >
                                  <TableCell className="text-gray-600">
                                    {entry.address}
                                  </TableCell>
                                  <TableCell className="text-gray-600">
                                    {entry.description || "n/a"}
                                  </TableCell>
                                  <TableCell className="text-gray-600">
                                    {relativeActivity(entry.addedAt)}
                                  </TableCell>
                                  <TableCell>
                                    <span className="flex items-center gap-x-1">
                                      <IconButton
                                        variant="ghost"
                                        visual="gray"
                                        size="sm"
                                        className="size-10 rounded-lg"
                                        onClick={() => openEditIp(entry)}
                                      >
                                        <Edit01 className="size-5 text-gray-600" />
                                      </IconButton>
                                      <IconButton
                                        variant="ghost"
                                        visual="gray"
                                        size="sm"
                                        className="size-10 rounded-lg"
                                        onClick={() =>
                                          removeAllowedIp(entry.id)
                                        }
                                      >
                                        <Trash01 className="size-5 text-gray-600" />
                                      </IconButton>
                                    </span>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      </div>
                    )}

                    {isSavedAlertMounted && (
                      <Alert
                        variant="success"
                        className={cn(
                          // Pinned to the scrolling content pane, not to this
                          // panel — anchoring it here made it ride the table
                          // downwards as rows were added. left offset clears
                          // the sidebar, matching the pane's own pl-[288px].
                          "pointer-events-none fixed bottom-6 left-4 z-50 w-max items-center rounded-xl shadow-[0px_1px_5px_rgba(16,24,40,0.08)] transition-opacity duration-300 min-[1024px]:left-[304px]",
                          isSavedAlertVisible ? "opacity-100" : "opacity-0"
                        )}
                      >
                        <AlertIcon>
                          <CheckCircle className="size-5 text-success-600" />
                        </AlertIcon>
                        <AlertTitle className="whitespace-nowrap text-success-700">
                          {savedAlertMessage}
                        </AlertTitle>
                      </Alert>
                    )}
                  </div>

                  <Dialog
                    open={isCsvOpen}
                    onOpenChange={(open) =>
                      open ? setIsCsvOpen(true) : closeCsvDialog()
                    }
                  >
                    <DialogContent
                      className={cn(
                        "flex max-w-[calc(100vw-2rem)] flex-col items-center gap-8 px-6 py-7 shadow-[0px_20px_24px_-4px_rgba(16,24,40,0.08),0px_8px_8px_-4px_rgba(16,24,40,0.03)]",
                        isCsvPreview ? "w-[768px]" : "w-[560px]"
                      )}
                      dialogOverlay={
                        <DialogOverlay className="backdrop-blur-[8px]" />
                      }
                    >
                      <div className="flex w-full items-start justify-between gap-8">
                        <DialogTitle className="text-2xl leading-9 font-semibold text-gray-800">
                          Add IPs
                        </DialogTitle>
                        <IconButton
                          variant="ghost"
                          visual="gray"
                          size="sm"
                          className="size-8 rounded-[5px]"
                          onClick={closeCsvDialog}
                        >
                          <X className="size-4 text-gray-500" />
                        </IconButton>
                      </div>

                      <DialogDescription className="w-full text-sm font-medium text-gray-700">
                        {isCsvPreview ? (
                          "These IP addresses are currently allowed to access your account."
                        ) : (
                          <>
                            Upload a CSV file to add multiple IP addresses at
                            once. Each address should be on its own line.{" "}
                            <a href="#" className="text-primary-500 underline">
                              Sample CSV
                            </a>
                            .
                          </>
                        )}
                      </DialogDescription>

                      {isCsvPreview ? (
                        <div className="max-h-[404px] w-full overflow-y-auto overflow-x-hidden rounded-xl border border-gray-200 bg-white shadow-[0px_1px_3px_rgba(16,24,40,0.1),0px_1px_2px_rgba(16,24,40,0.06)] scrollbar-thin scrollbar-thumb-gray-200 scrollbar-thumb-rounded-lg">
                          <Table>
                            <TableHeader className="sticky top-0 z-10 bg-gray-50 [&_th]:bg-gray-50">
                              <TableRow className="hover:bg-transparent">
                                <TableHead>IP Address</TableHead>
                                <TableHead>Description</TableHead>
                                <TableHead>
                                  <span className="flex items-center gap-x-1">
                                    Date Added
                                    <ArrowDown className="size-4" />
                                  </span>
                                </TableHead>
                                <TableHead className="w-[148px]" />
                              </TableRow>
                            </TableHeader>
                            <TableBody className="[&_tr:last-child_td]:border-b-0">
                              {csvEntries.map((entry) => (
                                <TableRow
                                  key={entry.id}
                                  className="hover:bg-transparent"
                                >
                                  <TableCell className="text-gray-600">
                                    {entry.address}
                                  </TableCell>
                                  <TableCell className="text-gray-600">
                                    {entry.description || "n/a"}
                                  </TableCell>
                                  <TableCell className="text-gray-600">
                                    {relativeActivity(entry.addedAt)}
                                  </TableCell>
                                  <TableCell>
                                    <span className="flex items-center gap-x-1">
                                      <IconButton
                                        variant="ghost"
                                        visual="gray"
                                        size="sm"
                                        className="size-10 rounded-lg"
                                      >
                                        <Edit01 className="size-5 text-gray-600" />
                                      </IconButton>
                                      <IconButton
                                        variant="ghost"
                                        visual="gray"
                                        size="sm"
                                        className="size-10 rounded-lg"
                                        onClick={() => removeCsvEntry(entry.id)}
                                      >
                                        <Trash01 className="size-5 text-gray-600" />
                                      </IconButton>
                                    </span>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      ) : csvStatus === "idle" ? (
                        <div
                          {...getCsvRootProps({
                            className: cn(
                              "flex w-full cursor-pointer flex-col items-center gap-1 rounded-xl border border-gray-200 bg-white px-6 py-4 transition-colors duration-300 hover:border-primary-300",
                              isCsvDragActive &&
                                "border-primary-500 bg-primary-25"
                            ),
                          })}
                        >
                          <input hidden {...getCsvInputProps()} />
                          <div className="flex w-full flex-col items-center gap-3">
                            <span className="flex size-10 items-center justify-center rounded-[28px] border-[6px] border-gray-50 bg-gray-100">
                              <UploadCloud02 className="size-5 text-gray-600" />
                            </span>
                            <div className="flex w-full flex-col items-center gap-1">
                              <p className="flex w-full items-start justify-center gap-1 text-sm text-gray-600">
                                <span className="font-semibold text-primary-500">
                                  Click to upload
                                </span>
                                or drag and drop
                              </p>
                              <p className="w-full text-center text-xs text-gray-600">
                                CSV (max.800 MB)
                              </p>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div
                          className={cn(
                            "relative flex w-full items-start gap-1 rounded-xl border bg-white p-4",
                            csvStatus === "done"
                              ? "border-primary-500"
                              : "border-gray-200"
                          )}
                        >
                          <div className="flex flex-1 items-start gap-4">
                            <span className="flex size-8 shrink-0 items-center justify-center rounded-[28px] border-4 border-primary-25 bg-primary-50">
                              <File04 className="size-4 text-primary-500" />
                            </span>
                            <div className="flex flex-1 flex-col items-start gap-1">
                              <div className="flex w-full flex-col items-start">
                                <p className="w-full text-sm font-medium text-gray-700">
                                  {csvFileName}
                                </p>
                                <p className="w-full text-sm text-gray-600">
                                  {convertToKbOrMb(csvFileSize)}
                                </p>
                              </div>
                              <div className="flex w-full items-center gap-x-3">
                                <Progress
                                  value={csvProgress}
                                  bubble={false}
                                  className="h-2 flex-1 bg-gray-200"
                                />
                                <span className="shrink-0 text-sm font-medium text-gray-700">
                                  {csvProgress}%
                                </span>
                              </div>
                            </div>
                          </div>

                          {csvStatus === "done" ? (
                            <span className="absolute right-4 top-4 flex size-4 items-center justify-center rounded-full bg-primary-500">
                              <Check className="size-2.5 text-white" />
                            </span>
                          ) : (
                            <IconButton
                              variant="ghost"
                              visual="gray"
                              size="sm"
                              className="absolute right-2 top-2 size-9 rounded-lg"
                              onClick={clearCsvFile}
                            >
                              <Trash01 className="size-5 text-gray-500" />
                            </IconButton>
                          )}
                        </div>
                      )}

                      <div className="flex w-full items-start justify-end gap-x-3 pt-5">
                        {csvStatus === "done" && !isCsvPreview && (
                          <Button
                            variant="light"
                            visual="primary"
                            size="sm"
                            className="bg-primary-500/15"
                            onClick={() => setIsCsvPreview(true)}
                            leftIcon={<Eye className="size-[15px]" />}
                          >
                            Preview
                          </Button>
                        )}
                        {ipSaveError && (
                          <p className="self-center text-sm text-error-500">
                            {ipSaveError}
                          </p>
                        )}
                        <Button
                          variant="filled"
                          visual="primary"
                          size="sm"
                          className="shadow-xs"
                          disabled={
                            csvStatus !== "done" || csvEntries.length === 0
                          }
                          onClick={handleSaveCsvIps}
                          leftIcon={<Save01 className="size-[15px]" />}
                        >
                          Save IPs
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>

                  <Dialog
                    open={isAddIpsOpen}
                    onOpenChange={(open) =>
                      open ? setIsAddIpsOpen(true) : requestCloseAddIps()
                    }
                  >
                    <DialogContent
                      className="flex w-[647px] max-w-[calc(100vw-2rem)] flex-col items-center gap-8 px-6 py-7 shadow-[0px_20px_24px_-4px_rgba(16,24,40,0.08),0px_8px_8px_-4px_rgba(16,24,40,0.03)]"
                      dialogOverlay={
                        <DialogOverlay className="backdrop-blur-[8px]" />
                      }
                    >
                      <div className="flex w-full items-start justify-between gap-8">
                        <DialogTitle className="text-2xl leading-9 font-semibold text-gray-800">
                          Add IPs
                        </DialogTitle>
                        <IconButton
                          variant="ghost"
                          visual="gray"
                          size="sm"
                          className="size-8 rounded-[5px]"
                          onClick={requestCloseAddIps}
                        >
                          <X className="size-4 text-gray-500" />
                        </IconButton>
                      </div>

                      <DialogDescription className="w-full text-sm font-medium text-gray-700">
                        Enter an IP address or range to allow access to your
                        account.
                      </DialogDescription>

                      <RadioGroup
                        value={ipEntryType}
                        onValueChange={setIpEntryType}
                        className="flex w-full items-start gap-12"
                      >
                        <div className="flex items-center justify-center gap-x-3">
                          <RadioGroupItem
                            id="ip-entry-single"
                            value="single"
                            size="md"
                            className="data-[state=checked]:bg-primary-100"
                          />
                          <Label
                            htmlFor="ip-entry-single"
                            className="text-sm font-medium text-gray-700"
                          >
                            Single IP
                          </Label>
                        </div>
                        <div className="flex items-center justify-center gap-x-3">
                          <RadioGroupItem
                            id="ip-entry-range"
                            value="range"
                            size="md"
                            className="data-[state=checked]:bg-primary-100"
                          />
                          <Label
                            htmlFor="ip-entry-range"
                            className="text-sm font-medium text-gray-700"
                          >
                            IP Range
                          </Label>
                        </div>
                      </RadioGroup>

                      <div
                        className={cn(
                          "flex w-full flex-col gap-8 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-200 scrollbar-thumb-rounded-lg",
                          // Two range rows or three single rows before it scrolls,
                          // so the dialog settles at the height each design shows.
                          ipEntryType === "range"
                            ? "max-h-[352px]"
                            : "max-h-[274px]"
                        )}
                      >
                        {ipRows.map((row, index) => (
                          <div
                            key={index}
                            className="flex w-full shrink-0 flex-col gap-5"
                          >
                            {ipEntryType === "range" ? (
                              <div className="flex w-full flex-col items-start gap-1.5">
                                <div className="flex items-center gap-1.5">
                                  <Label
                                    htmlFor={`ip-range-from-${index}`}
                                    className="text-sm font-medium text-gray-700"
                                  >
                                    IP Range
                                  </Label>
                                  {index === 0 && (
                                    <HelpCircle className="size-3.5 text-gray-400" />
                                  )}
                                </div>
                                <div className="flex w-full items-center gap-1.5">
                                  <Input
                                    id={`ip-range-from-${index}`}
                                    placeholder="XX.XX.XXX.XXX"
                                    className="flex-1 rounded-lg"
                                    value={row.rangeFrom}
                                    onChange={(event) =>
                                      updateIpRow(
                                        index,
                                        "rangeFrom",
                                        event.target.value
                                      )
                                    }
                                  />
                                  <span className="shrink-0 text-xs leading-5 text-gray-700">
                                    to
                                  </span>
                                  <Input
                                    aria-label="IP range end"
                                    placeholder="XX.XX.XXX.XXX"
                                    className="flex-1 rounded-lg"
                                    value={row.rangeTo}
                                    onChange={(event) =>
                                      updateIpRow(
                                        index,
                                        "rangeTo",
                                        event.target.value
                                      )
                                    }
                                  />
                                </div>
                              </div>
                            ) : null}

                            <div className="flex w-full items-start gap-5">
                              {ipEntryType === "single" && (
                                <div className="flex flex-1 flex-col items-start gap-1.5">
                                  <div className="flex items-center gap-1.5">
                                    <Label
                                      htmlFor={`ip-address-${index}`}
                                      className="text-sm font-medium text-gray-700"
                                    >
                                      IP Address
                                    </Label>
                                    {index === 0 && (
                                      <HelpCircle className="size-3.5 text-gray-400" />
                                    )}
                                  </div>
                                  <Input
                                    id={`ip-address-${index}`}
                                    placeholder="XX.XX.XXX.XXX"
                                    className="rounded-lg"
                                    value={row.address}
                                    onChange={(event) =>
                                      updateIpRow(
                                        index,
                                        "address",
                                        event.target.value
                                      )
                                    }
                                  />
                                </div>
                              )}
                              <div className="flex flex-1 flex-col items-start gap-1.5">
                                <Label
                                  htmlFor={`ip-description-${index}`}
                                  className="text-sm font-medium text-gray-700"
                                >
                                  Description (Optional)
                                </Label>
                                <Input
                                  id={`ip-description-${index}`}
                                  placeholder="Description"
                                  className="rounded-lg"
                                  value={row.description}
                                  onChange={(event) =>
                                    updateIpRow(
                                      index,
                                      "description",
                                      event.target.value
                                    )
                                  }
                                />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>

                      {ipSaveError && (
                        <p className="w-full pt-3 text-sm text-error-500">
                          {ipSaveError}
                        </p>
                      )}
                      <div className="flex w-full items-start justify-end gap-x-3 pt-5">
                        {hasAnyIpAddress && !editingIpId && (
                          <Button
                            variant="light"
                            visual="primary"
                            size="sm"
                            className="bg-primary-500/15"
                            disabled={ipRows.length >= MAX_IP_ROWS}
                            onClick={addIpRow}
                            leftIcon={<Plus className="size-[15px] text-white" />}
                          >
                            Add More
                          </Button>
                        )}
                        <Button
                          variant="filled"
                          visual="primary"
                          size="sm"
                          className="shadow-xs"
                          disabled={!hasAnyIpAddress}
                          onClick={handleSaveIps}
                          leftIcon={<Save01 className="size-[15px]" />}
                        >
                          Save IPs
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>

                  <Dialog
                    open={isIpDiscardOpen}
                    onOpenChange={setIsIpDiscardOpen}
                  >
                    <DialogContent
                      className="flex max-w-[512px] flex-col items-center gap-8 p-6 shadow-[0px_20px_24px_-4px_rgba(16,24,40,0.08),0px_8px_8px_-4px_rgba(16,24,40,0.03)]"
                      dialogOverlay={
                        <DialogOverlay className="backdrop-blur-[8px]" />
                      }
                    >
                      <div className="flex w-full flex-col items-start gap-10">
                        <div className="flex w-full flex-col items-start gap-5">
                          <div className="flex w-full items-start justify-between gap-5">
                            <span className="flex size-12 items-center justify-center rounded-full border-8 border-warning-50 bg-warning-100">
                              <AlertTriangle className="size-6 text-warning-500" />
                            </span>
                            <IconButton
                              variant="ghost"
                              visual="gray"
                              size="sm"
                              className="rounded-[5px]"
                              onClick={() => setIsIpDiscardOpen(false)}
                            >
                              <X className="size-5 text-gray-500" />
                            </IconButton>
                          </div>

                          <div className="flex w-full flex-col items-start gap-2">
                            <DialogTitle className="w-full text-lg leading-7 font-semibold text-gray-900">
                              Unsaved changes
                            </DialogTitle>
                            <p className="w-full text-sm text-gray-500">
                              We sent a magic link to{" "}
                              <span className="font-bold text-gray-700">
                                {user?.email}
                              </span>
                            </p>
                            <DialogDescription className="w-full text-sm text-gray-500">
                              Do you want to save your password or leave and
                              discard changes?
                            </DialogDescription>
                          </div>
                        </div>

                        <div className="flex items-start gap-x-3">
                          <Button
                            variant="outlined"
                            visual="gray"
                            size="lg"
                            onClick={() => {
                              setIsIpDiscardOpen(false)
                              setEditingIpId(null)
                              resetIpRows()
                              setIsAddIpsOpen(false)
                            }}
                          >
                            Exit Without Saving
                          </Button>
                          <Button
                            size="lg"
                            onClick={() => {
                              setIsIpDiscardOpen(false)
                              handleSaveIps()
                            }}
                          >
                            Save & Exit
                          </Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                </>
              )}

              {activeTab === "integrations" && !selectedIntegration && (
                <>
                  <div className="flex items-start justify-between gap-5">
                    <div className="flex flex-col gap-3">
                      <h1 className="text-[26px] leading-6 font-semibold capitalize text-dark-blue-400">
                        Discover
                      </h1>
                      <p className="text-sm text-gray-500">
                        Connect your favorite tools and apps to your account.
                      </p>
                    </div>
                    <Button
                      variant="link"
                      visual="gray"
                      className="group text-primary-500 font-semibold text-base shrink-0 gap-2"
                      onClick={() => goToTab("my-apps")}
                    >
                      My Apps ({INTEGRATIONS.filter((i) => i.connected).length})
                      <ArrowRight className="size-4 transition-transform duration-200 group-hover:translate-x-0.5" />
                    </Button>
                  </div>

                  <div className="mt-5 w-full rounded-lg border border-gray-200 overflow-hidden h-[186px] bg-gradient-to-r from-[#1a2744] via-[#2d4a7c] to-[#1a2744] flex items-center justify-center">
                    <div className="flex gap-3 items-end">
                      <div className="size-12 rounded-lg bg-[#00C2FF] opacity-80" />
                      <div className="size-16 rounded-lg bg-[#00D4AA] opacity-80" />
                      <div className="size-14 rounded-xl bg-[#FF6B35] opacity-80" />
                      <div className="size-12 rounded-lg bg-[#FFB800] opacity-80" />
                      <div className="size-10 rounded-full bg-[#00E676] opacity-80" />
                    </div>
                  </div>

                  <div className="mt-5 flex items-center justify-between gap-5">
                    <InputGroup className="group/search w-[500px]">
                      <InputLeftElement>
                        <SearchMd className="size-4 text-gray-400 transition-colors duration-300 group-hover/search:text-gray-500 group-focus-within/search:!text-primary-500" />
                      </InputLeftElement>
                      <Input
                        placeholder="Find integrations, apps, and more"
                        className="pl-9 transition-[border-color] duration-300 hover:border-primary-200 hover:shadow-[0px_0px_0px_4px_#E1EAFF] focus:!ring-0 focus:!shadow-[0px_0px_0px_4px_#E1EAFF]"
                      />
                    </InputGroup>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="outlined"
                          visual="gray"
                          size="sm"
                          className="bg-white border-gray-300 shadow-xs rounded-[5px]"
                          leftIcon={<FilterLines className="size-5" />}
                          rightIcon={<ChevronDown className="size-[15px]" />}
                        >
                          Most Popular
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem>Most Popular</DropdownMenuItem>
                        <DropdownMenuItem>Recently Added</DropdownMenuItem>
                        <DropdownMenuItem>Alphabetical</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  <div className="mt-5 grid grid-cols-4 gap-6">
                    {INTEGRATIONS.map((integration) => (
                      <div
                        key={integration.name}
                        className="rounded-lg border border-gray-200 bg-white p-5 flex flex-col gap-2.5 cursor-pointer hover:border-2 hover:border-gray-300 hover:p-[19px] transition-colors duration-200"
                        onClick={() => {
                          setSelectedIntegration(integration)
                          setDetailTab(integration.connected ? "settings" : "overview")
                          setDescriptionExpanded(false)
                        }}
                      >
                        <div className="flex items-start justify-between">
                          <div
                            className="size-10 rounded-lg flex items-center justify-center text-white font-bold text-sm shrink-0"
                            style={{ backgroundColor: integration.color }}
                          >
                            {integration.name.charAt(0)}
                          </div>
                          {integration.connected && (
                            <Badge visual="success" size="sm">
                              Connected
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm font-bold text-dark-blue-400">
                          {integration.name}
                        </p>
                        <p className="text-xs text-gray-500 leading-normal">
                          {integration.description}
                        </p>
                      </div>
                    ))}
                  </div>
                </>
              )}

              {/* ── Integration detail view ─────────────────────────── */}
              {activeTab === "integrations" && selectedIntegration && (
                <>
                  <div className="flex gap-16 items-start w-full">
                    {/* Left column */}
                    <div className="flex flex-col gap-6 flex-1 min-w-0">
                      {/* Back link */}
                      <Button
                        className="group self-start"
                        variant="link"
                        visual="gray"
                        onClick={() => {
                          setSelectedIntegration(null)
                          setDetailTab("overview")
                        }}
                      >
                        <ArrowLeft className="size-[15px] transition duration-300 group-hover:-translate-x-[4px]" />{" "}
                        Back to Discover
                      </Button>

                      {/* Logo + name + tagline */}
                      <div className="flex gap-6 items-end">
                        <div
                          className="size-[60px] rounded-lg flex items-center justify-center text-white font-bold text-xl shrink-0"
                          style={{ backgroundColor: selectedIntegration.color }}
                        >
                          {selectedIntegration.name.charAt(0)}
                        </div>
                        <div className="flex flex-col gap-3 flex-1">
                          <h1 className="text-[26px] leading-6 font-bold capitalize text-dark-blue-400">
                            {selectedIntegration.name}
                          </h1>
                          <p className="text-base text-gray-500">
                            {selectedIntegration.tagline}
                          </p>
                        </div>
                      </div>

                      {/* Screenshot placeholder */}
                      <div className="w-full h-[420px] rounded-lg bg-gray-100 border border-gray-200 flex items-center justify-center">
                        <p className="text-sm text-gray-400">App preview</p>
                      </div>

                      {/* Tabs: Overview / Settings (only when connected) */}
                      {selectedIntegration.connected ? (
                        <Tabs value={detailTab} onValueChange={(v) => setDetailTab(v as "overview" | "settings")}>
                          <TabsList className="border-b-0 px-0 justify-start">
                            <TabsTrigger value="overview">Overview</TabsTrigger>
                            <TabsTrigger value="settings">Settings</TabsTrigger>
                          </TabsList>

                          <TabsContent value="overview" className="mt-6">
                            {/* Overview content */}
                            <div className="flex flex-col gap-6">
                              {/* Description */}
                              <div className="flex flex-col gap-1.5 p-2.5">
                                <p className={`text-base text-dark-blue-400 ${!descriptionExpanded ? "line-clamp-3" : ""}`}>
                                  Connect {selectedIntegration.name} to bring Marketeq activity into your workspace. Once connected, channel messages can link to matching contacts and companies, flagged messages can become tasks or notes, and you will get notifications when contracts and payments update, all without leaving your {selectedIntegration.name} workspace.
                                </p>
                                {!descriptionExpanded && (
                                  <Button variant="link" visual="gray" className="text-sm font-medium text-dark-blue-400 p-0 h-auto justify-start" onClick={() => setDescriptionExpanded(true)}>
                                    Read more
                                  </Button>
                                )}
                                <p className="text-xs text-gray-600 mt-3 leading-normal">
                                  *Note that any information provided by a third party application provider, including pricing and payment details as possible, is subject to change and should be verified with the provider.
                                </p>
                              </div>

                              {/* Key Features */}
                              <div className="p-2.5">
                                <p className="text-base font-medium text-dark-blue-400 mb-2.5">Key Features:</p>
                                <div className="grid grid-cols-2 gap-x-6 gap-y-2.5">
                                  <ul className="list-disc ml-6 text-base text-dark-blue-400"><li>Sync channel messages to contacts &amp; companies</li></ul>
                                  <ul className="list-disc ml-6 text-base text-dark-blue-400"><li>Get notified on new payments</li></ul>
                                  <ul className="list-disc ml-6 text-base text-dark-blue-400"><li>Create tasks &amp; notes from flagged messages</li></ul>
                                  <ul className="list-disc ml-6 text-base text-dark-blue-400"><li>Manage everything from one connected workspace</li></ul>
                                  <ul className="list-disc ml-6 text-base text-dark-blue-400"><li>Get notified on contract status changes</li></ul>
                                  <ul className="list-disc ml-6 text-base text-dark-blue-400"><li>Disconnect or switch accounts anytime</li></ul>
                                </div>
                              </div>

                              {/* Synced Data */}
                              <div className="flex flex-col gap-2.5 px-2.5">
                                <p className="text-base font-semibold text-dark-blue-400">Synced Data</p>
                                <div className="flex flex-col gap-5 p-2.5">
                                  {/* Logos row */}
                                  <div className="flex items-center">
                                    <div className="flex-1 flex justify-center">
                                      <div className="size-[50px] rounded-lg border border-gray-200 bg-white flex items-center justify-center">
                                        <div className="size-6 rounded flex items-center justify-center text-white text-xs font-bold" style={{ backgroundColor: selectedIntegration.color }}>{selectedIntegration.name.charAt(0)}</div>
                                      </div>
                                    </div>
                                    <div className="w-10 flex justify-center">
                                      <ArrowRight className="size-5 text-gray-400" />
                                    </div>
                                    <div className="flex-1 flex justify-center">
                                      <div className="size-[50px] rounded-lg border border-gray-200 bg-white flex items-center justify-center">
                                        <span className="text-xs font-bold text-dark-blue-400">M</span>
                                      </div>
                                    </div>
                                  </div>
                                  {/* Channel message row */}
                                  <div className="flex items-center">
                                    <p className="flex-1 text-sm text-dark-blue-400 text-center">Channel message</p>
                                    <div className="w-10 flex justify-center">
                                      <ArrowRight className="size-4 text-gray-400" />
                                    </div>
                                    <p className="flex-1 text-sm text-dark-blue-400 text-center">Contacts, Companies, Notifications, Tasks, Notes</p>
                                  </div>
                                  {/* Direct message row */}
                                  <div className="flex items-center">
                                    <p className="flex-1 text-sm text-dark-blue-400 text-center">Direct message</p>
                                    <div className="w-10 flex justify-center">
                                      <ArrowRight className="size-4 text-gray-400" />
                                    </div>
                                    <p className="flex-1 text-sm text-dark-blue-400 text-center">Tasks and Notes</p>
                                  </div>
                                </div>
                              </div>

                              {/* Legal info */}
                              <div className="flex flex-col gap-2.5 p-2.5">
                                <p className="text-base font-semibold text-dark-blue-400">Legal info</p>
                                <p className="text-base text-dark-blue-400">
                                  You understand that when using this integration, it is up to you to comply with applicable laws and regulations, as well as Marketeq&apos;s{" "}
                                  <Button variant="link" visual="gray" className="text-primary-500 underline decoration-primary-500/30 hover:decoration-primary-500 transition-colors duration-300 p-0 h-auto text-base inline">AUP</Button>
                                  {" "}and{" "}
                                  <Button variant="link" visual="gray" className="text-primary-500 underline decoration-primary-500/30 hover:decoration-primary-500 transition-colors duration-300 p-0 h-auto text-base inline">Terms</Button>
                                </p>
                              </div>
                            </div>
                          </TabsContent>

                          <TabsContent value="settings" className="mt-3">
                            {/* Settings content */}
                            <div className="flex flex-col gap-3">
                              {/* Connected account card */}
                              <div className="rounded-lg border border-gray-200 bg-white flex items-center gap-5 px-6 py-5">
                                <div className="size-[52px] rounded-full bg-gray-200 border-4 border-white shrink-0 flex items-center justify-center">
                                  <User01 className="size-5 text-gray-400" />
                                </div>
                                <div className="flex flex-col gap-1 flex-1">
                                  <p className="text-base text-dark-blue-400">Connected Account</p>
                                  <p className="text-xs text-gray-500">user@example.com</p>
                                </div>
                                <Button
                                  variant="outlined"
                                  visual="gray"
                                  size="sm"
                                  className="bg-white border-gray-300 shadow-xs rounded-[5px]"
                                  leftIcon={<Dot className="size-2.5 text-success-500 fill-success-500" />}
                                >
                                  Connected
                                </Button>
                              </div>

                              {/* Syncing Data card */}
                              <div className="rounded-lg border border-gray-200 overflow-hidden">
                                <div className="bg-white border-b border-gray-200 flex items-center gap-4 px-6 py-5">
                                  <div className="size-10 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
                                    <ArrowRight className="size-5 text-gray-500" />
                                  </div>
                                  <div className="flex flex-col gap-2.5">
                                    <p className="text-xl font-medium text-dark-blue-400">Syncing Data</p>
                                    <p className="text-base text-gray-600">When messages happen in {selectedIntegration.name}, choose what gets created or updated in Marketeq.</p>
                                  </div>
                                </div>
                                <div className="bg-white border-b border-gray-200 flex items-center justify-between px-6 py-5">
                                  <div className="flex items-center gap-1.5">
                                    <p className="text-base text-dark-blue-400">Sync channel messages to contacts &amp; companies</p>
                                    <TooltipProvider>
                                      <Tooltip>
                                        <TooltipTrigger>
                                          <InfoCircle className="size-4 text-gray-400" />
                                        </TooltipTrigger>
                                        <TooltipContent>Automatically sync channel messages</TooltipContent>
                                      </Tooltip>
                                    </TooltipProvider>
                                  </div>
                                  <Switch defaultChecked />
                                </div>
                                <div className="bg-white border-b border-gray-200 flex items-center justify-between px-6 py-5">
                                  <div className="flex items-center gap-1.5">
                                    <p className="text-base text-dark-blue-400">Send notifications to {selectedIntegration.name}</p>
                                    <TooltipProvider>
                                      <Tooltip>
                                        <TooltipTrigger>
                                          <InfoCircle className="size-4 text-gray-400" />
                                        </TooltipTrigger>
                                        <TooltipContent>Send Marketeq notifications to {selectedIntegration.name}</TooltipContent>
                                      </Tooltip>
                                    </TooltipProvider>
                                  </div>
                                  <Switch defaultChecked />
                                </div>
                                <div className="bg-white flex items-center justify-between px-6 py-5">
                                  <div className="flex items-center gap-1.5">
                                    <p className="text-base text-dark-blue-400">Create tasks &amp; notes from channel messages</p>
                                    <TooltipProvider>
                                      <Tooltip>
                                        <TooltipTrigger>
                                          <InfoCircle className="size-4 text-gray-400" />
                                        </TooltipTrigger>
                                        <TooltipContent>Automatically create tasks from messages</TooltipContent>
                                      </Tooltip>
                                    </TooltipProvider>
                                  </div>
                                  <Switch defaultChecked />
                                </div>
                              </div>

                              {/* Notifications card */}
                              <div className="rounded-lg border border-gray-200 overflow-hidden">
                                <div className="bg-white border-b border-gray-200 flex items-center gap-4 px-6 py-5">
                                  <div className="size-10 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
                                    <Mail01 className="size-5 text-gray-500" />
                                  </div>
                                  <div className="flex flex-col gap-2.5">
                                    <p className="text-xl font-medium text-dark-blue-400">Notifications</p>
                                    <p className="text-base text-gray-600">Automatically post to {selectedIntegration.name} when things change on Marketeq.</p>
                                  </div>
                                </div>
                                <div className="bg-white border-b border-gray-200 flex items-center justify-between px-6 py-5">
                                  <div className="flex items-center gap-1.5">
                                    <p className="text-base text-dark-blue-400">Notify on contract status change</p>
                                    <TooltipProvider>
                                      <Tooltip>
                                        <TooltipTrigger>
                                          <InfoCircle className="size-4 text-gray-400" />
                                        </TooltipTrigger>
                                        <TooltipContent>Get notified when contract status changes</TooltipContent>
                                      </Tooltip>
                                    </TooltipProvider>
                                  </div>
                                  <Switch defaultChecked />
                                </div>
                                <div className="bg-white flex items-center justify-between px-6 py-5">
                                  <div className="flex items-center gap-1.5">
                                    <p className="text-base text-dark-blue-400">Notify on new payment received</p>
                                    <TooltipProvider>
                                      <Tooltip>
                                        <TooltipTrigger>
                                          <InfoCircle className="size-4 text-gray-400" />
                                        </TooltipTrigger>
                                        <TooltipContent>Get notified on new payments</TooltipContent>
                                      </Tooltip>
                                    </TooltipProvider>
                                  </div>
                                  <Switch defaultChecked />
                                </div>
                              </div>
                            </div>
                          </TabsContent>
                        </Tabs>
                      ) : (
                        /* Not connected: show overview content directly, no tabs */
                        <div className="flex flex-col gap-6 mt-6">
                          {/* Description */}
                          <div className="flex flex-col gap-1.5 p-2.5">
                            <p className={`text-base text-dark-blue-400 ${!descriptionExpanded ? "line-clamp-3" : ""}`}>
                              Connect {selectedIntegration.name} to bring Marketeq activity into your workspace. Once connected, channel messages can link to matching contacts and companies, flagged messages can become tasks or notes, and you will get notifications when contracts and payments update, all without leaving your {selectedIntegration.name} workspace.
                            </p>
                            {!descriptionExpanded && (
                              <Button variant="link" visual="gray" className="text-sm font-medium text-dark-blue-400 p-0 h-auto justify-start" onClick={() => setDescriptionExpanded(true)}>
                                Read more
                              </Button>
                            )}
                            <p className="text-xs text-gray-600 mt-3 leading-normal">
                              *Note that any information provided by a third party application provider, including pricing and payment details as possible, is subject to change and should be verified with the provider.
                            </p>
                          </div>

                          {/* Key Features */}
                          <div className="p-2.5">
                            <p className="text-base font-medium text-dark-blue-400 mb-2.5">Key Features:</p>
                            <div className="grid grid-cols-2 gap-x-6 gap-y-2.5">
                              <ul className="list-disc ml-6 text-base text-dark-blue-400"><li>Sync channel messages to contacts &amp; companies</li></ul>
                              <ul className="list-disc ml-6 text-base text-dark-blue-400"><li>Get notified on new payments</li></ul>
                              <ul className="list-disc ml-6 text-base text-dark-blue-400"><li>Create tasks &amp; notes from flagged messages</li></ul>
                              <ul className="list-disc ml-6 text-base text-dark-blue-400"><li>Manage everything from one connected workspace</li></ul>
                              <ul className="list-disc ml-6 text-base text-dark-blue-400"><li>Get notified on contract status changes</li></ul>
                              <ul className="list-disc ml-6 text-base text-dark-blue-400"><li>Disconnect or switch accounts anytime</li></ul>
                            </div>
                          </div>

                          {/* Synced Data */}
                          <div className="flex flex-col gap-2.5 px-2.5">
                            <p className="text-base font-semibold text-dark-blue-400">Synced Data</p>
                            <div className="flex flex-col gap-5 p-2.5">
                              {/* Logos row */}
                              <div className="flex items-center">
                                <div className="flex-1 flex justify-center">
                                  <div className="size-[50px] rounded-lg border border-gray-200 bg-white flex items-center justify-center">
                                    <div className="size-6 rounded flex items-center justify-center text-white text-xs font-bold" style={{ backgroundColor: selectedIntegration.color }}>{selectedIntegration.name.charAt(0)}</div>
                                  </div>
                                </div>
                                <div className="w-10 flex justify-center">
                                  <ArrowRight className="size-5 text-gray-400" />
                                </div>
                                <div className="flex-1 flex justify-center">
                                  <div className="size-[50px] rounded-lg border border-gray-200 bg-white flex items-center justify-center">
                                    <span className="text-xs font-bold text-dark-blue-400">M</span>
                                  </div>
                                </div>
                              </div>
                              {/* Channel message row */}
                              <div className="flex items-center">
                                <p className="flex-1 text-sm text-dark-blue-400 text-center">Channel message</p>
                                <div className="w-10 flex justify-center">
                                  <ArrowRight className="size-4 text-gray-400" />
                                </div>
                                <p className="flex-1 text-sm text-dark-blue-400 text-center">Contacts, Companies, Notifications, Tasks, Notes</p>
                              </div>
                              {/* Direct message row */}
                              <div className="flex items-center">
                                <p className="flex-1 text-sm text-dark-blue-400 text-center">Direct message</p>
                                <div className="w-10 flex justify-center">
                                  <ArrowRight className="size-4 text-gray-400" />
                                </div>
                                <p className="flex-1 text-sm text-dark-blue-400 text-center">Tasks and Notes</p>
                              </div>
                            </div>
                          </div>

                          {/* Legal info */}
                          <div className="flex flex-col gap-2.5 p-2.5">
                            <p className="text-base font-semibold text-dark-blue-400">Legal info</p>
                            <p className="text-base text-dark-blue-400">
                              You understand that when using this integration, it is up to you to comply with applicable laws and regulations, as well as Marketeq&apos;s{" "}
                              <Button variant="link" visual="gray" className="text-primary-500 underline decoration-primary-500/30 hover:decoration-primary-500 transition-colors duration-300 p-0 h-auto text-base inline">AUP</Button>
                              {" "}and{" "}
                              <Button variant="link" visual="gray" className="text-primary-500 underline decoration-primary-500/30 hover:decoration-primary-500 transition-colors duration-300 p-0 h-auto text-base inline">Terms</Button>
                            </p>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Right sidebar */}
                    <div className="flex flex-col gap-6 w-[300px] shrink-0 pt-5">
                      {/* Install / Uninstall button */}
                      {selectedIntegration.connected ? (
                        <Button
                          size="sm"
                          className="w-fit"
                          onClick={() => setUninstallDialogOpen(true)}
                        >
                          Uninstall
                        </Button>
                      ) : (
                        <>
                          <Button size="sm" className="w-fit">Install App</Button>
                          <Button variant="link" visual="gray" className="text-sm text-gray-500 font-semibold gap-2 p-0 h-auto justify-start">
                            Open setup guide
                            <LinkExternal01 className="size-4" />
                          </Button>
                        </>
                      )}

                      {/* Installed on (only when connected) */}
                      {selectedIntegration.connected && (
                        <div className="flex flex-col gap-2.5">
                          <p className="text-xl font-medium text-dark-blue-400">Installed on</p>
                          <p className="text-base text-gray-600">July 5, 2026</p>
                        </div>
                      )}

                      {/* Details / Price (only when not connected) */}
                      {!selectedIntegration.connected && (
                        <div className="flex flex-col gap-2.5">
                          <p className="text-xl font-medium text-dark-blue-400">Details</p>
                          <p className="text-base text-dark-blue-400">Price</p>
                          <p className="text-xl font-semibold text-dark-blue-400">Free</p>
                        </div>
                      )}

                      {/* Total Installs */}
                      <div className="flex flex-col gap-2.5">
                        <p className="text-base font-medium text-dark-blue-400">Total Installs</p>
                        <p className="text-base text-gray-600">8.1K installs</p>
                      </div>

                      {/* Works with */}
                      <div className="flex flex-col gap-2.5">
                        <p className="text-base font-medium text-dark-blue-400">Works with</p>
                        <p className="text-base text-gray-600">Maestro</p>
                      </div>

                      {/* Benefits */}
                      <div className="flex flex-col gap-2.5">
                        <p className="text-xl font-medium text-dark-blue-400">Benefits</p>
                        <div className="flex flex-col gap-4">
                          {["Popular with businesses in the US", "Use directly in Marketeq", "Works with latest themes"].map((benefit) => (
                            <div key={benefit} className="flex items-start gap-2">
                              <div className="size-5 rounded-full bg-primary-50 flex items-center justify-center shrink-0">
                                <Check className="size-2.5 text-primary-500" />
                              </div>
                              <p className="text-base text-gray-600">{benefit}</p>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Requirements */}
                      <div className="flex flex-col gap-2.5">
                        <p className="text-xl font-medium text-dark-blue-400">Requirements</p>
                        <div className="flex flex-col gap-4">
                          <p className="text-base text-gray-600">{selectedIntegration.name} Subscription</p>
                          <Button variant="link" visual="gray" className="text-sm text-primary-500 underline decoration-primary-500/30 hover:decoration-primary-500 transition-colors duration-300 p-0 h-auto justify-start">
                            Free, Standard, or Plus plans
                          </Button>
                          <p className="text-base text-gray-600">Works with latest themes</p>
                        </div>
                      </div>

                      {/* Website */}
                      <div className="flex flex-col gap-2">
                        <p className="text-xl font-medium text-dark-blue-400">Website</p>
                        <Button variant="link" visual="gray" className="text-sm text-primary-500 underline decoration-primary-500/30 hover:decoration-primary-500 transition-colors duration-300 p-0 h-auto justify-start">
                          {selectedIntegration.name} Inc.
                        </Button>
                      </div>

                      {/* Helpful Links */}
                      <div className="flex flex-col gap-2.5">
                        <p className="text-xl font-medium text-dark-blue-400">Helpful Links</p>
                        <p className="text-base text-gray-600">By using this service, you agree to our</p>
                        <Button variant="link" visual="gray" className="text-sm text-primary-500 underline decoration-primary-500/30 hover:decoration-primary-500 transition-colors duration-300 p-0 h-auto justify-start">
                          Privacy policy
                        </Button>
                        <p className="text-base text-gray-600">App support provided by {selectedIntegration.name} Inc.</p>
                        <Button variant="link" visual="gray" className="text-sm text-primary-500 underline decoration-primary-500/30 hover:decoration-primary-500 transition-colors duration-300 p-0 h-auto justify-start">
                          Get support
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* More apps like this */}
                  <div className="flex flex-col gap-5 mt-5 p-2.5">
                    <p className="text-base font-semibold text-dark-blue-400">More apps like this</p>
                    <div className="grid grid-cols-3 gap-6">
                      {INTEGRATIONS.filter((i) => i.name !== selectedIntegration.name).slice(0, 3).map((app) => (
                        <div
                          key={app.name}
                          className="bg-gray-100 rounded-lg p-2.5 flex items-center gap-2.5 cursor-pointer hover:bg-gray-200 transition-colors duration-200"
                          onClick={() => {
                            setSelectedIntegration(app)
                            setDetailTab(app.connected ? "settings" : "overview")
                            setDescriptionExpanded(false)
                            contentRef.current?.scrollTo({ top: 0 })
                          }}
                        >
                          <div className="size-10 rounded-lg bg-white flex items-center justify-center shrink-0">
                            <div className="size-6 rounded flex items-center justify-center text-white text-xs font-bold" style={{ backgroundColor: app.color }}>{app.name.charAt(0)}</div>
                          </div>
                          <div className="flex flex-col gap-1 min-w-0">
                            <p className="text-xs font-bold text-dark-blue-400 truncate">{app.name}: Project Management Tool</p>
                            <p className="text-[10px] text-dark-blue-400">104K</p>
                            <p className="text-[10px] text-dark-blue-400 truncate">{app.description}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                    <Button
                      variant="link"
                      visual="gray"
                      className="text-sm text-primary-500 underline decoration-primary-500/30 hover:decoration-primary-500 transition-colors duration-300 p-0 h-auto justify-start"
                      onClick={() => {
                        setSelectedIntegration(null)
                        setDetailTab("overview")
                      }}
                    >
                      Explore more apps
                    </Button>
                  </div>
                </>
              )}

              {/* Uninstall confirmation dialog */}
              <Dialog open={uninstallDialogOpen} onOpenChange={setUninstallDialogOpen}>
                <DialogOverlay />
                <DialogContent className="max-w-[487px] p-14 flex flex-col items-center gap-8">
                  <div className="flex flex-col items-center gap-5">
                    <div className="size-12 rounded-full bg-warning-100 border-8 border-warning-50 flex items-center justify-center">
                      <AlertTriangle className="size-6 text-warning-500" />
                    </div>
                    <div className="flex flex-col items-center gap-2 text-center">
                      <DialogTitle className="text-lg font-semibold text-gray-900">
                        Are you sure you want to Uninstall this app?
                      </DialogTitle>
                      <DialogDescription className="text-sm text-gray-500">
                        You will no longer have this application in your apps.
                      </DialogDescription>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Button
                      variant="outlined"
                      visual="gray"
                      size="sm"
                      onClick={() => setUninstallDialogOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      visual="error"
                      onClick={() => {
                        const name = selectedIntegration?.name
                        setUninstallDialogOpen(false)
                        setSelectedIntegration(null)
                        setDetailTab("overview")
                        toast({ title: `${name} has been uninstalled`, variant: "success" })
                      }}
                    >
                      Uninstall
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>

              {activeTab === "my-apps" && (
                <>
                  <div className="flex items-start justify-between gap-5">
                    <div className="flex flex-col gap-3">
                      <h1 className="text-[26px] leading-6 font-semibold capitalize text-dark-blue-400">
                        My Apps
                      </h1>
                      <p className="text-sm text-gray-500">
                        Manage the apps connected to your account.
                      </p>
                    </div>
                    <Button
                      variant="link"
                      visual="gray"
                      className="group text-primary-500 font-semibold text-base shrink-0 gap-2"
                      onClick={() => goToTab("integrations")}
                    >
                      Integrations ({INTEGRATIONS.length})
                      <ArrowRight className="size-4 transition-transform duration-200 group-hover:translate-x-0.5" />
                    </Button>
                  </div>

                  <div className="mt-5 flex items-center justify-between gap-5">
                    <InputGroup className="group/search w-[500px]">
                      <InputLeftElement>
                        <SearchMd className="size-4 text-gray-400 transition-colors duration-300 group-hover/search:text-gray-500 group-focus-within/search:!text-primary-500" />
                      </InputLeftElement>
                      <Input
                        placeholder="Find integrations, apps, and more"
                        className="pl-9 transition-[border-color] duration-300 hover:border-primary-200 hover:shadow-[0px_0px_0px_4px_#E1EAFF] focus:!ring-0 focus:!shadow-[0px_0px_0px_4px_#E1EAFF]"
                      />
                    </InputGroup>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="outlined"
                          visual="gray"
                          size="sm"
                          className="bg-white border-gray-300 shadow-xs rounded-[5px]"
                          leftIcon={<FilterLines className="size-5" />}
                          rightIcon={<ChevronDown className="size-[15px]" />}
                        >
                          Filter
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem>All Apps</DropdownMenuItem>
                        <DropdownMenuItem>Connected</DropdownMenuItem>
                        <DropdownMenuItem>Recently Added</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  <div className="mt-5 flex flex-col gap-2.5">
                    {INTEGRATIONS.filter((i) => i.connected).map((app) => (
                      <div
                        key={app.name}
                        className="rounded-lg border border-gray-200 bg-white p-3 flex items-center gap-2.5 cursor-pointer hover:border-2 hover:border-gray-300 hover:p-[11px] transition-colors duration-200"
                        onClick={() => {
                          setSelectedIntegration(app)
                          setDetailTab("settings")
                          goToTab("integrations")
                        }}
                      >
                        <div
                          className="size-10 rounded-lg flex items-center justify-center text-white font-bold text-sm shrink-0"
                          style={{ backgroundColor: app.color }}
                        >
                          {app.name.charAt(0)}
                        </div>
                        <div className="flex flex-col gap-2.5 flex-1 px-2.5">
                          <div className="flex items-center gap-2.5">
                            <p className="text-sm font-bold text-dark-blue-400">{app.name}</p>
                            <Badge visual="success" size="sm">Connected</Badge>
                          </div>
                          <p className="text-sm text-gray-600">{app.description}</p>
                        </div>
                        <IconButton
                          variant="ghost"
                          visual="gray"
                          size="sm"
                          className="rounded-full"
                          onClick={(e) => {
                            e.stopPropagation()
                          }}
                        >
                          <DotsHorizontal className="size-4" />
                        </IconButton>
                      </div>
                    ))}
                  </div>
                </>
              )}

              {activeTab === "billing-overview" && (
                <>
                  <h1 className="text-[26px] leading-6 font-semibold capitalize text-dark-blue-400 mb-5">
                    Overview
                  </h1>
                  <BillingOverviewContent onNavigateTab={handleBillingTabChange} />
                </>
              )}

              {activeTab === "billing-transactions" && (
                <>
                  <div className="flex items-start justify-between gap-x-5 mb-5">
                    <h1 className="text-[26px] leading-6 font-semibold capitalize text-dark-blue-400">
                      Transactions
                    </h1>
                    <div className="flex items-center gap-x-6">
                      <Button
                        variant="link"
                        visual="gray"
                        size="sm"
                        className="text-gray-500 underline decoration-gray-500/30 hover:decoration-gray-500 hover:text-dark-blue-500 transition-colors duration-300"
                        leftIcon={<HelpCircle className="size-[15px]" />}
                      >
                        Get Help
                      </Button>
                      <div className="flex items-center gap-x-3">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="outlined"
                              visual="gray"
                              size="sm"
                              className="bg-white border-gray-300 shadow-xs rounded-[5px]"
                              rightIcon={<ChevronDown className="size-[15px]" />}
                            >
                              Export
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent
                            align="start"
                            sideOffset={4}
                            className="w-[var(--radix-dropdown-menu-trigger-width)] min-w-[var(--radix-dropdown-menu-trigger-width)]"
                          >
                            <DropdownMenuItem
                              disabled={!transactionExporters}
                              onClick={() => transactionExporters?.exportCsv()}
                            >
                              Export CSV
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              disabled={!transactionExporters}
                              onClick={() => transactionExporters?.exportPdf()}
                            >
                              Export PDF
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                        <IconButton
                          variant="outlined"
                          visual="gray"
                          size="sm"
                          className="bg-white border-gray-300 shadow-xs rounded-[5px]"
                          onClick={() => toggleInviteWindow(true, "Share Your Transactions")}
                        >
                          <Share06 className="size-[15px]" />
                        </IconButton>
                        {/* <IconButton
                          variant="outlined"
                          visual="gray"
                          size="sm"
                          className="bg-white border-gray-300 shadow-xs rounded-[5px]"
                        >
                          <Settings02 className="size-[15px]" />
                        </IconButton> */}
                      </div>
                    </div>
                  </div>
                  <BillingTransactionsContent />

                </>
              )}

              {activeTab === "billing-invoices" && (
                <>
                  <div className="flex items-start justify-between gap-x-5 mb-5">
                    <h1 className="text-xl font-bold text-dark-blue-400">
                      Invoices
                    </h1>
                    <div className="flex items-center gap-x-6">
                      <Button
                        variant="link"
                        visual="gray"
                        size="sm"
                        className="text-gray-500 underline decoration-gray-500/30 hover:decoration-gray-500 hover:text-dark-blue-500 transition-colors duration-300"
                        leftIcon={<HelpCircle className="size-[15px]" />}
                      >
                        Get Help
                      </Button>
                      <div className="flex items-center gap-x-3">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="outlined"
                              visual="gray"
                              size="sm"
                              className="bg-white border-gray-300 shadow-xs rounded-[5px]"
                              rightIcon={<ChevronDown className="size-[15px]" />}
                            >
                              Export
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent
                            align="start"
                            sideOffset={4}
                            className="w-[var(--radix-dropdown-menu-trigger-width)] min-w-[var(--radix-dropdown-menu-trigger-width)]"
                          >
                            <DropdownMenuItem
                              disabled={!invoiceExporters}
                              onClick={() => invoiceExporters?.exportCsv()}
                            >
                              Export CSV
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              disabled={!invoiceExporters}
                              onClick={() => invoiceExporters?.exportPdf()}
                            >
                              Export PDF
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                        <IconButton
                          variant="outlined"
                          visual="gray"
                          size="sm"
                          className="bg-white border-gray-300 shadow-xs rounded-[5px]"
                          onClick={() => toggleInviteWindow(true, "Share Your Invoices")}
                        >
                          <Share06 className="size-[15px]" />
                        </IconButton>
                        {/* <IconButton
                          variant="outlined"
                          visual="gray"
                          size="sm"
                          className="bg-white border-gray-300 shadow-xs rounded-[5px]"
                        >
                          <Settings02 className="size-[15px]" />
                        </IconButton> */}
                      </div>
                    </div>
                  </div>
                  <BillingInvoicesContent />

                </>
              )}

              {activeTab === "billing-payment-methods" && (
                <>
                  <div className="shrink-0 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between mb-5">
                    <h1 className="text-[26px] leading-6 font-semibold capitalize text-dark-blue-400">
                      Payment Methods
                    </h1>
                    <div className="flex shrink-0 flex-wrap items-center gap-6">
                      <Button
                        variant="link"
                        visual="gray"
                        size="sm"
                        className="text-gray-500 underline decoration-gray-500/30 hover:decoration-gray-500 hover:text-dark-blue-500 transition-colors duration-300"
                        leftIcon={<HelpCircle className="size-[15px]" />}
                      >
                        Get Help
                      </Button>
                      <Button
                        onClick={() => paymentMethodsRef.current?.openAddPaymentMethodDialog()}
                        leftIcon={<Plus className="size-4" />}
                      >
                        Add Payment Method
                      </Button>
                    </div>
                  </div>
                  <BillingPaymentMethodsContent ref={paymentMethodsRef} embedded />
                </>
              )}

              {activeTab === "billing-plans" && (
                <>
                  <h1 className="text-[26px] leading-6 font-semibold capitalize text-dark-blue-400 mb-5">
                    Plans
                  </h1>
                  <BillingMyPlansContent />
                </>
              )}
          </div>
        </div>
      </div>

      {showPasswordModal && (
        <SecuritySettingsStepper
          onCloseModal={() => setShowPasswordModal(false)}
        />
      )}

      {show2FASetup && (
        <TwoFactorSetupModal onClose={() => setShow2FASetup(false)} />
      )}

      {show2FADisable && (
        <DisableTwoFactorModal onClose={() => setShow2FADisable(false)} />
      )}

      {showSessionsModal && (
        <ActiveSessionsModal onClose={() => setShowSessionsModal(false)} />
      )}
    </AuthenticatedRoute>
  )
}
