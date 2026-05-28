"use client"

import * as React from "react"
import { SVGProps, useState } from "react"
import { useRouter } from "next/navigation"
import { cn } from "@/utils/functions"
import {
  AlertCircle,
  ArrowDown,
  ArrowUp,
  BarChartSquare02,
  Briefcase,
  Calendar,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock,
  Copy,
  Download,
  Edit03,
  ExternalLink,
  Eye,
  HelpCircle,
  Home03,
  Mail01,
  MoreHorizontal,
  Plus,
  Search,
  Settings02,
  Trash01,
  UserCircle,
  X,
} from "@blend-metrics/icons"
import { ToggleGroupItem, ToggleGroupRoot } from "@/components/ui/toggle-group"
import NextImage from "@/components/next-image"
import NextLink from "@/components/next-link"
import { useToast } from "@/components/ui"
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  Badge,
  Button,
  Card,
  Checkbox,
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  IconButton,
  Input,
  InputGroup,
  InputLeftElement,
  ScrollArea,
  SearchField,
  SearchFieldButton,
  SearchFieldInput,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
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
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui"

// ─── SVG Icons (inline, from designs) ───────────────────────────────────

const BankIcon = ({ className, ...props }: SVGProps<SVGSVGElement>) => (
  <svg
    className={cn("size-5", className)}
    viewBox="0 0 20 20"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <path
      d="M10 1.5L1.5 6.5V8H18.5V6.5L10 1.5Z"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinejoin="round"
    />
    <path
      d="M3 8V15M7 8V15M13 8V15M17 8V15"
      stroke="currentColor"
      strokeWidth="1.5"
    />
    <path
      d="M1 15H19V17.5H1V15Z"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinejoin="round"
    />
  </svg>
)

const DollarSignIcon = ({ className, ...props }: SVGProps<SVGSVGElement>) => (
  <svg
    className={cn("size-5", className)}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <path
      d="M12 2V22M17 5H9.5C8.57174 5 7.6815 5.36875 7.02513 6.02513C6.36875 6.6815 6 7.57174 6 8.5C6 9.42826 6.36875 10.3185 7.02513 10.9749C7.6815 11.6313 8.57174 12 9.5 12H14.5C15.4283 12 16.3185 12.3687 16.9749 13.0251C17.6313 13.6815 18 14.5717 18 15.5C18 16.4283 17.6313 17.3185 16.9749 17.9749C16.3185 18.6313 15.4283 19 14.5 19H6"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
)

const PaypalIcon = ({ className, ...props }: SVGProps<SVGSVGElement>) => (
  <svg
    className={cn("size-6", className)}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <path
      d="M7.076 21.337H2.47a.641.641 0 01-.633-.74L4.944.901C5.026.382 5.474 0 5.998 0h7.46c2.57 0 4.578.543 5.69 1.81 1.01 1.15 1.304 2.42 1.012 4.287-.023.143-.047.288-.077.437-.983 5.05-4.349 6.797-8.647 6.797H9.283c-.521 0-.963.38-1.045.9l-.848 5.36-.303 1.916a.553.553 0 01-.546.471l.535-.64z"
      fill="#253B80"
    />
    <path
      d="M23.048 7.667C22.07 13.158 18.37 15.33 13.437 15.33h-1.19c-.56 0-1.036.41-1.123.967l-1.212 7.682a.467.467 0 00.462.54h3.24c.49 0 .908-.355.985-.838l.04-.212.782-4.955.05-.272a.998.998 0 01.985-.838h.622c4.018 0 7.163-1.632 8.082-6.354.384-1.973.185-3.617-.83-4.774a3.961 3.961 0 00-1.134-.86z"
      fill="#179BD7"
    />
    <path
      d="M21.754 7.151a8.267 8.267 0 00-1.022-.231 12.94 12.94 0 00-2.058-.151h-6.23a.998.998 0 00-.985.838l-1.327 8.408-.038.247a1.13 1.13 0 011.123-.967h2.34c4.594 0 8.192-1.866 9.245-7.263.031-.16.058-.316.082-.467a5.357 5.357 0 00-1.13-.414z"
      fill="#222D65"
    />
  </svg>
)

// ─── Left Sidebar (reused from talent-dashboard, with Transactions active) ──

export const TransactionsLeftSidebar = () => {
  return (
    <div className="w-[224px] shrink-0 bg-gray-50 min-[1024px]:block fixed z-40 top-[62px] lg:top-[65px] left-0 bottom-0 hidden border-r space-y-6 border-gray-200 p-[15px]">
      <div className="flex flex-col gap-y-2">
        <span className="inline-block text-xs leading-5 font-medium text-dark-blue-400">
          Work
        </span>
        <div className="flex flex-col gap-y-1">
          <NextLink
            className="flex w-full items-center font-semibold text-sm leading-6 text-dark-blue-400 gap-x-3 rounded-[5px] h-10 flex-none hover:bg-gray-100 px-3"
            href="/talent-dashboard"
          >
            <Home03 className="size-[18px] text-dark-blue-400/50" />
            Home
          </NextLink>
          <NextLink
            className="flex w-full items-center font-semibold text-sm leading-6 text-dark-blue-400 gap-x-3 rounded-[5px] h-10 flex-none hover:bg-gray-100 px-3"
            href="/find-jobs"
          >
            <Search className="size-[18px] text-dark-blue-400/50" />
            Find Jobs
          </NextLink>
          <NextLink
            className="flex w-full items-center font-semibold text-sm leading-6 text-dark-blue-400 gap-x-3 rounded-[5px] h-10 flex-none hover:bg-gray-100 px-3"
            href="/my-listings"
          >
            <Briefcase className="size-[18px] text-dark-blue-400/50" />
            My Projects
          </NextLink>
          <NextLink
            className="flex w-full items-center font-semibold text-sm leading-6 text-dark-blue-400 gap-x-3 rounded-[5px] h-10 flex-none hover:bg-gray-100 px-3"
            href="/publish-project"
          >
            <Plus className="size-[18px] text-dark-blue-400/50" />
            Create a Project
          </NextLink>
          <NextLink
            className="flex w-full items-center font-semibold text-sm leading-6 text-dark-blue-400 gap-x-3 rounded-[5px] h-10 flex-none bg-gray-100 px-3"
            href="/transactions"
          >
            <DollarSignIcon className="size-[18px] text-dark-blue-400/50" />
            Transactions
          </NextLink>
          <NextLink
            className="flex w-full items-center font-semibold text-sm leading-6 text-dark-blue-400 gap-x-3 rounded-[5px] h-10 flex-none hover:bg-gray-100 px-3"
            href="/stats"
          >
            <BarChartSquare02 className="size-[18px] text-dark-blue-400/50" />
            Stats & Trends
          </NextLink>
        </div>
      </div>

      <div className="flex flex-col gap-y-2">
        <span className="inline-block text-xs leading-5 font-medium text-dark-blue-400">
          Account
        </span>
        <div className="flex flex-col gap-y-1">
          <NextLink
            className="flex w-full items-center font-semibold text-sm leading-6 text-dark-blue-400 gap-x-3 rounded-[5px] h-10 flex-none hover:bg-gray-100 px-3"
            href="/talent-profile"
          >
            <UserCircle className="size-[18px] text-dark-blue-400/50" />
            Profile
          </NextLink>
          <NextLink
            className="flex w-full items-center font-semibold text-sm leading-6 text-dark-blue-400 gap-x-3 rounded-[5px] h-10 flex-none hover:bg-gray-100 px-3"
            href="/inbox"
          >
            <Mail01 className="size-[18px] text-dark-blue-400/50" />
            Inbox
            <Badge className="rounded-full ml-auto" size="md" visual="error">
              3
            </Badge>
          </NextLink>
          <NextLink
            className="flex w-full items-center font-semibold text-sm leading-6 text-dark-blue-400 gap-x-3 rounded-[5px] h-10 flex-none hover:bg-gray-100 px-3"
            href="/notifications"
          >
            <AlertCircle className="size-[18px] text-dark-blue-400/50" />
            Notifications
            <Badge className="rounded-full ml-auto" size="md" visual="error">
              2
            </Badge>
          </NextLink>
          <NextLink
            className="flex w-full items-center font-semibold text-sm leading-6 text-dark-blue-400 gap-x-3 rounded-[5px] h-10 flex-none hover:bg-gray-100 px-3"
            href="/settings"
          >
            <Settings02 className="size-[18px] text-dark-blue-400/50" />
            Settings
          </NextLink>
        </div>
      </div>
    </div>
  )
}

// ─── Stats Cards (shared across tabs) ───────────────────────────────────

interface StatCardProps {
  label: string
  sublabel?: string
  amount: string
  change?: { value: string; direction: "up" | "down"; label: string }
  extra?: string
  status?: string
}

const StatCard = ({
  label,
  sublabel,
  amount,
  change,
  extra,
  status,
}: StatCardProps) => (
  <div className="flex-1 rounded-lg border border-gray-200 bg-white p-4 min-w-0">
    <div className="flex items-start justify-between gap-2">
      <div className="min-w-0">
        <p className="text-sm font-medium text-gray-500 truncate">{label}</p>
        {sublabel && <p className="text-xs text-gray-400 mt-0.5">{sublabel}</p>}
      </div>
      <div className="text-right shrink-0">
        <p className="text-2xl font-bold text-dark-blue-400">
          <span className="text-sm font-medium align-top">$</span>
          {amount}
        </p>
        {status && (
          <p className="text-xs font-medium text-primary-500 mt-0.5">
            {status}
          </p>
        )}
      </div>
    </div>
    {(change || extra) && (
      <div className="flex items-center gap-2 mt-2">
        {change && (
          <span
            className={cn(
              "inline-flex items-center gap-0.5 text-xs font-medium",
              change.direction === "up" ? "text-success-500" : "text-error-500"
            )}
          >
            {change.direction === "up" ? (
              <ArrowUp className="size-3" />
            ) : (
              <ArrowDown className="size-3" />
            )}
            {change.value}
          </span>
        )}
        {change && (
          <span className="text-xs text-gray-400">{change.label}</span>
        )}
        {extra && <span className="text-xs text-gray-500">{extra}</span>}
      </div>
    )}
  </div>
)

// ─── Overview Tab ───────────────────────────────────────────────────────

export const OverviewTab = ({
  onNavigateTab,
  onEditPayoutSchedule,
}: {
  onNavigateTab?: (tab: string) => void
  onEditPayoutSchedule?: () => void
}) => {
  const router = useRouter()
  const { toast } = useToast()
  const [showBanner, setShowBanner] = useState(true)
  const comingSoon = (feature: string) =>
    toast({ title: feature, description: "This feature is coming soon." })

  return (
    <div className="flex gap-6">
      {/* Main Content */}
      <div className="flex-1 space-y-5 min-w-0">
        {/* Congratulations Banner */}
        {showBanner && (
          <div className="flex items-center justify-between rounded-lg border border-primary-200 bg-primary-50 px-4 py-3">
            <p className="text-sm text-dark-blue-400">
              <span className="mr-2">&#x1F929;</span>
              You&apos;ve earned over{" "}
              <span className="font-semibold text-success-600">
                $5,000
              </span>{" "}
              this year, that&apos;s{" "}
              <span className="font-semibold text-success-600">22%</span> more
              than last year!
            </p>
            <IconButton
              size="sm"
              variant="ghost"
              visual="gray"
              onClick={() => setShowBanner(false)}
            >
              <X className="size-4" />
            </IconButton>
          </div>
        )}

        {/* Earnings Summary */}
        <div className="rounded-lg border border-gray-200 bg-white p-5">
          <div className="flex items-center gap-2 mb-4">
            <h3 className="text-base font-semibold text-dark-blue-400">
              Earnings Summary
            </h3>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <HelpCircle className="size-4 text-gray-400" />
                </TooltipTrigger>
                <TooltipContent>
                  <p>Total time logged earnings after any reserve is held.</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Today */}
            <div>
              <div className="flex items-center gap-1.5 mb-1">
                <span className="text-sm text-gray-500">Today</span>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger>
                      <HelpCircle className="size-3.5 text-gray-400" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Earnings logged since 12:00 AM local time today.</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <p className="text-3xl font-bold text-dark-blue-400">
                <span className="text-base align-top">$</span>520
                <span className="text-lg">.00</span>
              </p>
              <div className="flex items-center gap-1.5 mt-1">
                <span className="inline-flex items-center gap-0.5 text-xs font-medium text-error-500">
                  <ArrowDown className="size-3" />
                  5.2%
                </span>
                <span className="text-xs text-gray-400">since yesterday</span>
              </div>
              <p className="text-sm text-gray-500 mt-1">
                <span className="font-semibold">4h 30m</span> Logged
              </p>
            </div>

            {/* This Week + This Month */}
            <div className="space-y-4">
              <div>
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="text-sm text-gray-500">This Week</span>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger>
                        <HelpCircle className="size-3.5 text-gray-400" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Earnings logged for the current week.</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <div className="flex items-center gap-3">
                  <p className="text-2xl font-bold text-dark-blue-400">
                    <span className="text-sm align-top">$</span>2,460
                    <span className="text-base">.00</span>
                  </p>
                  <span className="inline-flex items-center gap-0.5 text-xs font-medium text-success-500">
                    <ArrowUp className="size-3" />
                    5.2%
                  </span>
                  <span className="text-xs text-gray-400">since last week</span>
                  <span className="text-sm text-gray-500 ml-auto">
                    <span className="font-semibold">19h 15m</span> Logged
                  </span>
                </div>
              </div>

              <div>
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="text-sm text-gray-500">This Month</span>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger>
                        <HelpCircle className="size-3.5 text-gray-400" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Earnings logged for the current month.</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <div className="flex items-center gap-3">
                  <p className="text-2xl font-bold text-dark-blue-400">
                    <span className="text-sm align-top">$</span>13,870
                    <span className="text-base">.00</span>
                  </p>
                  <span className="inline-flex items-center gap-0.5 text-xs font-medium text-error-500">
                    <ArrowDown className="size-3" />
                    2.7%
                  </span>
                  <span className="text-xs text-gray-400">
                    since last month
                  </span>
                  <span className="text-sm text-gray-500 ml-auto">
                    <span className="font-semibold">52h 45m</span> Logged
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-4">
            <Button
              variant="outlined"
              visual="gray"
              size="sm"
              onClick={() => onNavigateTab?.("earnings")}
            >
              View All Earnings
            </Button>
          </div>
        </div>

        {/* Direct Deposit */}
        <div className="rounded-lg border border-gray-200 bg-white p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-semibold text-dark-blue-400">
              Direct Deposit
            </h3>
            <Button
              variant="link"
              visual="gray"
              size="sm"
              onClick={() => onNavigateTab?.("payouts")}
            >
              View All Payouts
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Upcoming Payout */}
            <div className="rounded-lg border border-gray-200 p-4">
              <p className="text-sm font-medium text-gray-500 mb-1">
                Upcoming Payout
              </p>
              <p className="text-3xl font-bold text-dark-blue-400">
                <span className="text-base align-top">$</span>2,460
                <span className="text-lg">.00</span>
              </p>
              <div className="flex items-center gap-1.5 mt-1">
                <span className="text-xs text-gray-400">
                  Scheduled for June 3, 2025
                </span>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger>
                      <HelpCircle className="size-3.5 text-gray-400" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Estimated arrival in 2-3 business days.</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <Button
                variant="outlined"
                visual="gray"
                size="sm"
                className="mt-3"
                onClick={() => onEditPayoutSchedule?.()}
              >
                Edit Payout Schedule
              </Button>
            </div>

            {/* Deposit Method */}
            <div className="rounded-lg border border-gray-200 p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-medium text-gray-500">
                    Deposit Method
                  </span>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger>
                        <HelpCircle className="size-3.5 text-gray-400" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>
                          The account where your payouts are sent by default.
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <Button
                  variant="link"
                  visual="gray"
                  size="sm"
                  onClick={() => comingSoon("Edit Deposit Method")}
                >
                  Edit
                </Button>
              </div>
              <div className="flex items-center gap-3 rounded-lg border border-gray-200 px-3 py-2.5">
                <BankIcon className="size-5 text-gray-500" />
                <span className="text-sm font-medium text-dark-blue-400">
                  Chase Bank
                </span>
                <span className="text-sm text-gray-400">...4553</span>
                <Badge visual="primary" size="sm" className="ml-auto">
                  Default
                </Badge>
              </div>
            </div>
          </div>

          {/* Previous Payout */}
          <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-200">
            <div>
              <p className="text-sm font-medium text-gray-500">
                Previous Payout
              </p>
              <p className="text-xs text-gray-400 mt-0.5">
                Deposited on May 28, 2025 to{" "}
                <BankIcon className="size-3.5 inline" /> Chase Bank ...4553
              </p>
            </div>
            <p className="text-2xl font-bold text-dark-blue-400">
              <span className="text-sm align-top">$</span>2,460
              <span className="text-base">.00</span>
            </p>
          </div>
        </div>

        {/* Connected Accounts */}
        <div className="rounded-lg border border-gray-200 bg-white p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-1.5">
              <h3 className="text-base font-semibold text-dark-blue-400">
                Connected Accounts
              </h3>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <HelpCircle className="size-4 text-gray-400" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>
                      Linked bank and wallet accounts available for receiving
                      deposits.
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <Button
              variant="outlined"
              visual="gray"
              size="sm"
              leftIcon={<Plus className="size-4" />}
              onClick={() => comingSoon("Add Deposit Method")}
            >
              Add Deposit Method
            </Button>
          </div>

          <div className="space-y-3">
            {/* Chase Bank */}
            <div className="flex items-center gap-3 rounded-lg border border-gray-200 px-4 py-3">
              <BankIcon className="size-5 text-gray-500" />
              <span className="text-sm font-medium text-dark-blue-400">
                Chase Bank
              </span>
              <span className="text-sm text-gray-400">...4553</span>
              <Badge visual="primary" size="sm" className="ml-auto mr-2">
                Default
              </Badge>
              <IconButton
                size="sm"
                variant="ghost"
                visual="gray"
                onClick={() => comingSoon("Edit Account")}
              >
                <Edit03 className="size-4" />
              </IconButton>
              <IconButton
                size="sm"
                variant="ghost"
                visual="gray"
                onClick={() => comingSoon("Remove Account")}
              >
                <Trash01 className="size-4" />
              </IconButton>
            </div>

            {/* PayPal */}
            <div className="flex items-center gap-3 rounded-lg border border-gray-200 px-4 py-3">
              <PaypalIcon className="size-5" />
              <span className="text-sm font-medium text-dark-blue-400">
                Paypal
              </span>
              <span className="text-sm text-gray-400">C...123@e..m</span>
              <Button
                variant="link"
                visual="gray"
                size="sm"
                className="ml-auto mr-2"
                onClick={() => comingSoon("Make Default")}
              >
                Make Default
              </Button>
              <IconButton
                size="sm"
                variant="ghost"
                visual="gray"
                onClick={() => comingSoon("Edit Account")}
              >
                <Edit03 className="size-4" />
              </IconButton>
              <IconButton
                size="sm"
                variant="ghost"
                visual="gray"
                onClick={() => comingSoon("Remove Account")}
              >
                <Trash01 className="size-4" />
              </IconButton>
            </div>
          </div>
        </div>
      </div>

      {/* Right Sidebar */}
      <div className="w-[300px] shrink-0 space-y-5 hidden min-[1440px]:block">
        {/* Available for Withdrawal */}
        <div className="rounded-lg border border-gray-200 bg-white p-5">
          <div className="flex items-center gap-1.5 mb-3">
            <h3 className="text-sm font-semibold text-dark-blue-400">
              Available for Withdrawal
            </h3>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <HelpCircle className="size-4 text-gray-400" />
                </TooltipTrigger>
                <TooltipContent>
                  <p>
                    Earnings currently eligible for manual withdrawal. This
                    amount excludes your $150 reserve balance and any pending
                    transactions.
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <div className="flex items-center gap-2 mb-4">
            <p className="text-3xl font-bold text-dark-blue-400">
              <span className="text-base align-top">$</span>567
              <span className="text-lg">.00</span>
            </p>
            <div className="flex items-center gap-1.5 text-xs text-gray-400">
              <BankIcon className="size-3.5" />
              Chase Bank ...4553
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outlined"
              visual="gray"
              size="sm"
              onClick={() => comingSoon("Withdraw Funds")}
            >
              Withdraw Funds
            </Button>
            <Button
              variant="outlined"
              visual="gray"
              size="sm"
              onClick={() => router.push("/billing")}
            >
              Manage
            </Button>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="rounded-lg border border-gray-200 bg-white p-5">
          <h3 className="text-sm font-semibold text-dark-blue-400 mb-4">
            Recent Activity
          </h3>
          <div className="space-y-4">
            {RECENT_ACTIVITY.map((item, i) => (
              <div key={i} className="flex items-start gap-3">
                <div
                  className={cn(
                    "size-9 rounded-full flex items-center justify-center shrink-0",
                    item.iconBg
                  )}
                >
                  {item.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-dark-blue-400">
                    {item.title}
                  </p>
                  <p className="text-xs text-gray-400 truncate">
                    {item.description}
                  </p>
                </div>
                <span className="text-xs text-gray-400 shrink-0">
                  {item.time}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Payout Schedule Dialog ──────────────────────────────────────────────

// ─── Deposit Method Options ─────────────────────────────────────────────
const DEPOSIT_METHODS = [
  { value: "chase", label: "Chase Bank ...4553", icon: "🏦" },
  { value: "wellsfargo", label: "Wells Fargo Bank ...3472", icon: "🏦" },
  { value: "paypal", label: "PayPal email@example.com", icon: "P" },
  { value: "wise", label: "Wise email@example.com", icon: "W" },
  { value: "binance", label: "BinancePay email@example.com", icon: "B" },
  { value: "marketeq-debit", label: "Marketeq Debit Card ...9824", icon: "M" },
  { value: "teq-coin", label: "TEQ Coin ...9824", icon: "T" },
]

const DAYS_OF_WEEK = [
  { key: "S1", label: "S", fullName: "Sunday" },
  { key: "M", label: "M", fullName: "Monday" },
  { key: "T1", label: "T", fullName: "Tuesday" },
  { key: "W", label: "W", fullName: "Wednesday" },
  { key: "T2", label: "T", fullName: "Thursday" },
  { key: "F", label: "F", fullName: "Friday" },
  { key: "S2", label: "S", fullName: "Saturday" },
]

const RESERVE_PRESETS = [25, 50, 100, 150, 250]

export const PayoutScheduleDialog = ({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) => {
  const { toast } = useToast()

  // Deposit method state
  const [splitMode, setSplitMode] = useState(false)
  const [primaryMethod, setPrimaryMethod] = useState("chase")
  const [splitMethods, setSplitMethods] = useState([
    { method: "chase", percentage: 60 },
    { method: "paypal", percentage: 40 },
  ])
  const [autoSplit, setAutoSplit] = useState(true)

  // Schedule state
  const [schedule, setSchedule] = useState("weekly")
  const [customSchedule, setCustomSchedule] = useState("")
  const [selectedDay, setSelectedDay] = useState("W") // Wednesday

  // Minimum payout
  const [minimumPayout, setMinimumPayout] = useState("1000")

  // Reserve balance
  const [reserveEnabled, setReserveEnabled] = useState(false)
  const [reserveAmount, setReserveAmount] = useState<number | null>(null)
  const [showCustomReserve, setShowCustomReserve] = useState(false)
  const [customReserveInput, setCustomReserveInput] = useState("")

  // Authorization
  const [authorized, setAuthorized] = useState(false)

  const selectedDayFull =
    DAYS_OF_WEEK.find((d) => d.key === selectedDay)?.fullName ?? "Wednesday"

  const getNextDepositDate = () => {
    const dayIndex = DAYS_OF_WEEK.findIndex((d) => d.key === selectedDay)
    const today = new Date()
    const currentDay = today.getDay()
    let daysUntil = dayIndex - currentDay
    if (daysUntil <= 0) daysUntil += 7
    if (schedule === "biweekly") daysUntil += 7
    const nextDate = new Date(today)
    nextDate.setDate(today.getDate() + daysUntil)
    return nextDate.toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    })
  }

  const getScheduleLabel = () => {
    if (schedule === "weekly") return `Weekly (every ${selectedDayFull})`
    if (schedule === "biweekly")
      return `Bi-Weekly (every other ${selectedDayFull})`
    if (schedule === "monthly") return "Monthly (1st of each month)"
    if (schedule === "daily") return "Daily (every day)"
    if (schedule === "custom" && customSchedule) return customSchedule
    return "Select schedule"
  }

  const handleSplitPercentageChange = (index: number, value: string) => {
    const num = parseInt(value) || 0
    setSplitMethods((prev) => {
      const updated = [...prev]
      updated[index] = { ...updated[index], percentage: num }
      return updated
    })
  }

  const handleRemoveSplitMethod = (index: number) => {
    if (splitMethods.length <= 2) return
    setSplitMethods((prev) => prev.filter((_, i) => i !== index))
  }

  const handleAddSplitMethod = () => {
    const usedMethods = splitMethods.map((m) => m.method)
    const available = DEPOSIT_METHODS.find(
      (m) => !usedMethods.includes(m.value)
    )
    if (available) {
      setSplitMethods((prev) => [
        ...prev,
        { method: available.value, percentage: 0 },
      ])
    }
  }

  const handleSave = () => {
    onOpenChange(false)
    toast({
      title: "Payout schedule updated",
      description: `${getScheduleLabel()} — deposits to ${splitMode ? `${splitMethods.length} accounts` : DEPOSIT_METHODS.find((m) => m.value === primaryMethod)?.label}`,
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[540px] max-h-[90vh] p-0 gap-0">
        <DialogHeader className="px-6 pt-6 pb-0">
          <DialogTitle className="text-lg font-semibold text-dark-blue-400">
            Setup Your Direct Deposit Schedule
          </DialogTitle>
          <p className="text-xs text-gray-400 mt-0.5">
            Last updated on Feb 21, 2025
          </p>
        </DialogHeader>

        <ScrollArea className="max-h-[calc(90vh-140px)]">
          <div className="px-6 py-5 space-y-6">
            {/* ── Preferred Deposit Method ── */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-semibold text-dark-blue-400">
                  {splitMode
                    ? "Preferred Payout Method"
                    : "Preferred Deposit Method"}
                </label>
                <button
                  type="button"
                  className="text-xs font-medium text-primary-500 hover:text-primary-600 flex items-center gap-1"
                  onClick={() => setSplitMode(!splitMode)}
                >
                  {splitMode ? (
                    <>
                      Auto Split
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <HelpCircle className="size-3.5" />
                          </TooltipTrigger>
                          <TooltipContent>
                            Split earnings across multiple accounts
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </>
                  ) : (
                    <>
                      Split Payout
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <HelpCircle className="size-3.5" />
                          </TooltipTrigger>
                          <TooltipContent>
                            Split earnings across multiple accounts
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </>
                  )}
                </button>
              </div>
              <p className="text-xs text-gray-500">
                Choose where your earnings should be deposited.
              </p>

              {!splitMode ? (
                /* Single deposit method */
                <Select value={primaryMethod} onValueChange={setPrimaryMethod}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DEPOSIT_METHODS.map((m) => (
                      <SelectItem key={m.value} value={m.value}>
                        {m.label}
                      </SelectItem>
                    ))}
                    <button
                      type="button"
                      className="relative flex w-full cursor-pointer select-none items-center rounded-sm py-1.5 px-2 text-sm text-primary-500 hover:bg-gray-50"
                      onClick={() =>
                        toast({
                          title: "Add Deposit Method",
                          description:
                            "Connect a new account in Settings → Payment Methods.",
                        })
                      }
                    >
                      <Plus className="size-4 mr-2" />
                      Add New Deposit Method
                    </button>
                  </SelectContent>
                </Select>
              ) : (
                /* Split payout mode */
                <div className="space-y-3">
                  {splitMethods.map((item, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <Select
                        value={item.method}
                        onValueChange={(val) => {
                          setSplitMethods((prev) => {
                            const updated = [...prev]
                            updated[index] = { ...updated[index], method: val }
                            return updated
                          })
                        }}
                      >
                        <SelectTrigger className="flex-auto">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {DEPOSIT_METHODS.map((m) => (
                            <SelectItem key={m.value} value={m.value}>
                              {m.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <div className="flex items-center gap-1 flex-none">
                        <Input
                          className="w-16 text-center text-sm"
                          value={item.percentage}
                          onChange={(e) =>
                            handleSplitPercentageChange(index, e.target.value)
                          }
                        />
                        <span className="text-sm text-gray-500">%</span>
                      </div>
                      <IconButton
                        variant="ghost"
                        visual="gray"
                        size="sm"
                        className="flex-none"
                        onClick={() => handleRemoveSplitMethod(index)}
                        disabled={splitMethods.length <= 2}
                      >
                        <Trash01 className="size-4" />
                      </IconButton>
                    </div>
                  ))}
                  <button
                    type="button"
                    className="text-xs font-medium text-primary-500 hover:text-primary-600 flex items-center gap-1"
                    onClick={handleAddSplitMethod}
                  >
                    <Plus className="size-3.5" />
                    Add New Deposit Method
                  </button>
                </div>
              )}
            </div>

            {/* ── Deposit Schedule ── */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-dark-blue-400">
                Set your Deposit Schedule
              </label>
              <p className="text-xs text-gray-500">
                Deposits run on your schedule when minimum balance is met.
              </p>

              <Select
                value={schedule}
                onValueChange={(val) => {
                  setSchedule(val)
                  if (val === "custom") setCustomSchedule("")
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue>{getScheduleLabel()}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="weekly">
                    Weekly (every {selectedDayFull})
                  </SelectItem>
                  <SelectItem value="biweekly">
                    Bi-Weekly (every other {selectedDayFull})
                  </SelectItem>
                  <SelectItem value="monthly">
                    Monthly (1st of each month)
                  </SelectItem>
                  <SelectItem value="daily">Daily (every day)</SelectItem>
                  <SelectItem value="custom">Set Custom Schedule</SelectItem>
                </SelectContent>
              </Select>

              {schedule === "custom" && (
                <Select
                  value={customSchedule}
                  onValueChange={setCustomSchedule}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Choose custom schedule" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Daily (every 2 days)">
                      Daily (every 2 days)
                    </SelectItem>
                    <SelectItem
                      value={`Weekly (every week on ${selectedDayFull})`}
                    >
                      Weekly (every week on {selectedDayFull})
                    </SelectItem>
                    <SelectItem
                      value={`Bi-Weekly (every 2 weeks on ${selectedDayFull})`}
                    >
                      Bi-Weekly (every 2 weeks on {selectedDayFull})
                    </SelectItem>
                    <SelectItem value="Monthly (every month on the 14th)">
                      Monthly (every month on the 14th)
                    </SelectItem>
                    <SelectItem value="Monthly (every 2 months on the 14th)">
                      Monthly (every 2 months on the 14th)
                    </SelectItem>
                  </SelectContent>
                </Select>
              )}
            </div>

            {/* ── Select Deposit Day ── */}
            {(schedule === "weekly" ||
              schedule === "biweekly" ||
              schedule === "custom") && (
              <div className="space-y-2">
                <label className="text-sm font-semibold text-dark-blue-400">
                  Select Deposit Day
                </label>
                <div className="flex gap-2">
                  {DAYS_OF_WEEK.map((day) => (
                    <button
                      key={day.key}
                      type="button"
                      className={cn(
                        "size-9 rounded-full text-sm font-medium transition-colors flex items-center justify-center",
                        selectedDay === day.key
                          ? "bg-primary-500 text-white"
                          : "border border-gray-200 text-gray-600 hover:border-primary-300 hover:text-primary-500"
                      )}
                      onClick={() => setSelectedDay(day.key)}
                    >
                      {day.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* ── Next Deposit ── */}
            <div className="flex items-center gap-2">
              <Badge visual="primary" className="text-xs">
                Next Deposit (based on your schedule)
              </Badge>
              <span className="text-xs font-medium text-primary-500">
                {getNextDepositDate()}
              </span>
            </div>

            {/* ── Minimum Payout ── */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-dark-blue-400">
                Minimum Payout
              </label>
              <p className="text-xs text-gray-500">
                Scheduled deposits are made only if your balance exceeds this
                amount. Setting a minimum helps avoid frequent small payouts and
                lowers processing fees.
              </p>
              <Select value={minimumPayout} onValueChange={setMinimumPayout}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="50">$50 or more</SelectItem>
                  <SelectItem value="100">$100 or more</SelectItem>
                  <SelectItem value="250">$250 or more</SelectItem>
                  <SelectItem value="500">$500 or more</SelectItem>
                  <SelectItem value="1000">$1000 or more</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* ── Reserve Balance ── */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-semibold text-dark-blue-400">
                    Reserve Balance{" "}
                    <span className="font-normal text-gray-400">
                      (optional)
                    </span>
                  </label>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Keep up to $250 in your account after each payout to
                    automatically cover subscription or platform fees without
                    disruption.
                  </p>
                </div>
                <Switch
                  checked={reserveEnabled}
                  onCheckedChange={(checked) => {
                    setReserveEnabled(checked as boolean)
                    if (!checked) {
                      setReserveAmount(null)
                      setShowCustomReserve(false)
                      setCustomReserveInput("")
                    }
                  }}
                  size="sm"
                />
              </div>

              {reserveEnabled && (
                <div className="space-y-3">
                  <div className="flex flex-wrap gap-2">
                    {RESERVE_PRESETS.map((amt) => (
                      <button
                        key={amt}
                        type="button"
                        className={cn(
                          "px-3 py-1.5 rounded-lg border text-sm font-medium transition-colors",
                          reserveAmount === amt && !showCustomReserve
                            ? "border-primary-500 bg-primary-50 text-primary-600"
                            : "border-gray-200 text-gray-600 hover:border-primary-300"
                        )}
                        onClick={() => {
                          setReserveAmount(amt)
                          setShowCustomReserve(false)
                          setCustomReserveInput("")
                        }}
                      >
                        Reserve ${amt}
                      </button>
                    ))}
                    <button
                      type="button"
                      className={cn(
                        "px-3 py-1.5 rounded-lg border text-sm font-medium transition-colors",
                        showCustomReserve
                          ? "border-primary-500 bg-primary-50 text-primary-600"
                          : "border-gray-200 text-gray-600 hover:border-primary-300"
                      )}
                      onClick={() => setShowCustomReserve(true)}
                    >
                      Custom
                    </button>
                  </div>

                  {showCustomReserve && (
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2">
                        <InputGroup className="flex-auto">
                          <InputLeftElement className="text-gray-500">
                            $
                          </InputLeftElement>
                          <Input
                            placeholder="Enter custom amount"
                            value={customReserveInput}
                            onChange={(e) =>
                              setCustomReserveInput(e.target.value)
                            }
                          />
                        </InputGroup>
                        <Button
                          variant="ghost"
                          visual="gray"
                          size="sm"
                          onClick={() => {
                            setShowCustomReserve(false)
                            setCustomReserveInput("")
                          }}
                        >
                          Cancel
                        </Button>
                      </div>
                      <p className="text-xs text-gray-400">
                        Custom amount needs to be under $250
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* ── Authorization ── */}
            <div className="flex gap-3 items-start">
              <Checkbox
                checked={authorized}
                onCheckedChange={(checked) => setAuthorized(checked as boolean)}
                className="mt-0.5"
              />
              <div className="text-xs text-gray-600 leading-relaxed">
                <p className="font-semibold text-dark-blue-400">
                  I authorize Marketeq to deposit my earnings into the
                  account(s) listed above.
                </p>
                <p className="mt-1 text-gray-500">
                  I understand that any changes to my payout preferences may
                  take up to 3 business days to process. I certify that I am an
                  authorized user of the account(s) provided and that all
                  information entered is accurate.
                </p>
              </div>
            </div>
          </div>
        </ScrollArea>

        {/* ── Footer ── */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200">
          <DialogClose asChild>
            <Button variant="outlined" visual="gray">
              Cancel
            </Button>
          </DialogClose>
          <Button disabled={!authorized} onClick={handleSave}>
            Save
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

const RECENT_ACTIVITY = [
  {
    title: "Payout Scheduled",
    description: "Chase Bank ...4553",
    time: "Just now",
    icon: <Calendar className="size-4 text-primary-500" />,
    iconBg: "bg-primary-50",
  },
  {
    title: "Deposit Sent",
    description: "$250 to Bank of America ...9876",
    time: "2hrs ago",
    icon: <ArrowUp className="size-4 text-success-500" />,
    iconBg: "bg-success-50",
  },
  {
    title: "Deposit Received",
    description: "$120 to Visa Card ...1122",
    time: "2hrs ago",
    icon: <ArrowDown className="size-4 text-primary-500" />,
    iconBg: "bg-primary-50",
  },
  {
    title: "Deposit Initiated",
    description: "Instant deposit triggered",
    time: "2hrs ago",
    icon: <Clock className="size-4 text-gray-500" />,
    iconBg: "bg-gray-100",
  },
  {
    title: "Deposit Settings Changed",
    description: "Chase 70% \u2022 PayPal 30%",
    time: "2hrs ago",
    icon: <Settings02 className="size-4 text-gray-500" />,
    iconBg: "bg-gray-100",
  },
  {
    title: "Payout Scheduled",
    description: "Chase Bank ...4553",
    time: "2hrs ago",
    icon: <Calendar className="size-4 text-primary-500" />,
    iconBg: "bg-primary-50",
  },
  {
    title: "Deposit Sent",
    description: "$250 to Bank of America ...9876",
    time: "2hrs ago",
    icon: <ArrowUp className="size-4 text-success-500" />,
    iconBg: "bg-success-50",
  },
  {
    title: "Deposit Received",
    description: "$120 to Visa Card ...1122",
    time: "2hrs ago",
    icon: <ArrowDown className="size-4 text-primary-500" />,
    iconBg: "bg-primary-50",
  },
]

// ─── Earnings Tab ───────────────────────────────────────────────────────

const EARNINGS_DATA = [
  {
    date: "April 2, 2025",
    project: "Website Redesign",
    client: "@referrizerllc",
    clientImg: "/images/avatar-1.png",
    task: "UX Wireframing",
    startTime: "9:14 AM",
    endTime: "2:14 AM",
    duration: "2h 0m",
    earnings: "$1,800",
    status: "",
  },
  {
    date: "April 1, 2025",
    project: "Website Redesign",
    client: "@referrizerllc",
    clientImg: "/images/avatar-1.png",
    task: "UX Wireframing",
    startTime: "2:20 PM",
    endTime: "5:20 PM",
    duration: "1h 0m",
    earnings: "$1,800",
    status: "",
  },
  {
    date: "April 1, 2025",
    project: "Website Redesign",
    client: "@referrizerllc",
    clientImg: "/images/avatar-1.png",
    task: "UX Wireframing",
    startTime: "9:14 AM",
    endTime: "3:14 AM",
    duration: "1h 0m",
    earnings: "$1,800",
    status: "",
  },
  {
    date: "April 1, 2025",
    project: "Website Redesign",
    client: "@christheclient234",
    clientImg: "/images/avatar-2.png",
    task: "UX Research",
    startTime: "2:20 PM",
    endTime: "4:20 PM",
    duration: "2h 0m",
    earnings: "$1,800",
    status: "",
  },
  {
    date: "Mar 31, 2025",
    project: "Website Redesign",
    client: "@referrizerllc",
    clientImg: "/images/avatar-1.png",
    task: "UX Research",
    startTime: "9:14 AM",
    endTime: "11:14 AM",
    duration: "1h 0m",
    earnings: "$1,800",
    status: "Paid",
  },
  {
    date: "Mar 31, 2025",
    project: "Website Redesign",
    client: "@referrizerllc",
    clientImg: "/images/avatar-1.png",
    task: "UX Research",
    startTime: "12:20 PM",
    endTime: "1:20 PM",
    duration: "1h 0m",
    earnings: "$1,800",
    status: "Paid",
  },
  {
    date: "Mar 31, 2025",
    project: "Website Redesign",
    client: "@christheclient234",
    clientImg: "/images/avatar-2.png",
    task: "UX Research",
    startTime: "4:20 PM",
    endTime: "7:20 PM",
    duration: "2h 0m",
    earnings: "$1,800",
    status: "Paid",
  },
]

export const EarningsTab = () => {
  const { toast } = useToast()
  const [viewMode, setViewMode] = useState("daily")
  const [searchQuery, setSearchQuery] = useState("")
  const [currentPage, setCurrentPage] = useState(1)

  return (
    <div className="space-y-5">
      {/* Stats Cards */}
      <div className="flex gap-4">
        <StatCard
          label="Today"
          amount="520.00"
          extra="4h 30m Logged"
          change={{
            value: "5.2%",
            direction: "down",
            label: "since yesterday",
          }}
        />
        <StatCard
          label="This Week"
          amount="2,460.00"
          extra="4h 30m Logged"
          change={{ value: "5.2%", direction: "up", label: "from last month" }}
        />
        <StatCard
          label="This Month"
          amount="13,870.00"
          extra="4h 30m Logged"
          change={{
            value: "2.7%",
            direction: "down",
            label: "since last month",
          }}
        />
      </div>

      {/* Filters Row */}
      <div className="flex items-center gap-3 flex-wrap">
        <ToggleGroupRoot
          value={[viewMode]}
          onValueChange={(details) => {
            if (details.value.length > 0) setViewMode(details.value[0])
          }}
        >
          <ToggleGroupItem value="daily">Daily</ToggleGroupItem>
          <ToggleGroupItem value="weekly">Weekly</ToggleGroupItem>
          <ToggleGroupItem value="monthly">Monthly</ToggleGroupItem>
        </ToggleGroupRoot>

        <Button
          variant="outlined"
          visual="gray"
          size="sm"
          leftIcon={<Calendar className="size-4" />}
        >
          All Time
        </Button>

        <Select defaultValue="all-projects">
          <SelectTrigger className="h-9 w-auto min-w-[120px]">
            <SelectValue placeholder="All Projects" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all-projects">All Projects</SelectItem>
          </SelectContent>
        </Select>

        <Select defaultValue="all-clients">
          <SelectTrigger className="h-9 w-auto min-w-[110px]">
            <SelectValue placeholder="All Clients" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all-clients">All Clients</SelectItem>
          </SelectContent>
        </Select>

        <Select defaultValue="all-entry-types">
          <SelectTrigger className="h-9 w-auto min-w-[130px]">
            <SelectValue placeholder="All Entry Types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all-entry-types">All Entry Types</SelectItem>
          </SelectContent>
        </Select>

        <Select defaultValue="all-statuses">
          <SelectTrigger className="h-9 w-auto min-w-[110px]">
            <SelectValue placeholder="All Statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all-statuses">All Statuses</SelectItem>
          </SelectContent>
        </Select>

        <div className="ml-auto">
          <SearchField>
            <SearchFieldButton>
              <Search className="size-4" />
            </SearchFieldButton>
            <SearchFieldInput
              placeholder="Find transactions"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </SearchField>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-lg border border-gray-200 bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="cursor-pointer">
                Date <ArrowDown className="size-3 inline ml-1" />
              </TableHead>
              <TableHead>Project</TableHead>
              <TableHead>Task</TableHead>
              <TableHead>Start Time</TableHead>
              <TableHead>End Time</TableHead>
              <TableHead>Duration</TableHead>
              <TableHead>Earnings</TableHead>
              <TableHead className="w-10"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {EARNINGS_DATA.map((row, i) => (
              <TableRow key={i}>
                <TableCell className="text-sm text-gray-500 whitespace-nowrap">
                  {row.date}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2.5">
                    <Avatar className="size-8">
                      <AvatarImage src={row.clientImg} alt={row.client} />
                      <AvatarFallback>
                        {row.client[1]?.toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm font-semibold text-dark-blue-400">
                        {row.project}
                      </p>
                      <p className="text-xs text-gray-400">{row.client}</p>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="text-sm text-gray-500">
                  {row.task}
                </TableCell>
                <TableCell className="text-sm text-gray-500">
                  {row.startTime}
                </TableCell>
                <TableCell className="text-sm text-gray-500">
                  {row.endTime}
                </TableCell>
                <TableCell className="text-sm text-gray-500">
                  {row.duration}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-500">
                      {row.earnings}
                    </span>
                    {row.status && (
                      <Badge visual="success" size="sm">
                        {row.status}
                      </Badge>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <IconButton size="sm" variant="ghost" visual="gray">
                        <MoreHorizontal className="size-4" />
                      </IconButton>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={() =>
                          toast({
                            title: "Transaction Details",
                            description: `${row.project} — ${row.task} (${row.duration})`,
                          })
                        }
                      >
                        View Details
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() =>
                          toast({
                            title: "Download",
                            description: "Receipt download started.",
                          })
                        }
                      >
                        Download
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-3 border-t border-gray-200">
          <p className="text-xs text-primary-500">
            This timesheet includes 2h 20m of manual time{" "}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <HelpCircle className="size-3.5 inline text-gray-400" />
                </TooltipTrigger>
                <TooltipContent>
                  <p>
                    Time manually entered by you (not tracked by the desktop
                    app).
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </p>

          {/* Pagination */}
          <div className="flex items-center gap-1">
            {[1, 2, 3, "...", 8, 9, 10].map((page, i) => (
              <button
                key={i}
                className={cn(
                  "size-8 rounded-md text-sm font-medium flex items-center justify-center",
                  page === currentPage
                    ? "border border-gray-300 text-dark-blue-400 bg-white"
                    : "text-gray-500 hover:bg-gray-100"
                )}
                onClick={() => typeof page === "number" && setCurrentPage(page)}
              >
                {page}
              </button>
            ))}
            <button
              className="size-8 rounded-md text-sm font-medium flex items-center justify-center text-gray-500 hover:bg-gray-100"
              onClick={() => setCurrentPage((p) => Math.min(p + 1, 10))}
            >
              <ChevronRight className="size-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Payouts Tab ────────────────────────────────────────────────────────

const PAYOUTS_DATA = [
  {
    amount: "$1,800.00 USD",
    account: "Chase Bank",
    accountNum: "...4553",
    initiatedOn: "April 2, 2025",
    estArrival: "April 2, 2025",
  },
  {
    amount: "$1,800.00 USD",
    account: "Chase Bank",
    accountNum: "...4553",
    initiatedOn: "April 1, 2025",
    estArrival: "April 1, 2025",
  },
  {
    amount: "$1,800.00 USD",
    account: "Chase Bank",
    accountNum: "...4553",
    initiatedOn: "April 1, 2025",
    estArrival: "April 1, 2025",
  },
  {
    amount: "$1,800.00 USD",
    account: "Chase Bank",
    accountNum: "...4553",
    initiatedOn: "April 1, 2025",
    estArrival: "April 1, 2025",
  },
  {
    amount: "$1,800.00 USD",
    account: "Chase Bank",
    accountNum: "...4553",
    initiatedOn: "Mar 31, 2025",
    estArrival: "Mar 31, 2025",
  },
  {
    amount: "$1,800.00 USD",
    account: "Chase Bank",
    accountNum: "...4553",
    initiatedOn: "Mar 31, 2025",
    estArrival: "Mar 31, 2025",
  },
  {
    amount: "$1,800.00 USD",
    account: "Chase Bank",
    accountNum: "...4553",
    initiatedOn: "Mar 31, 2025",
    estArrival: "Mar 31, 2025",
  },
]

export const PayoutsTab = () => {
  const { toast } = useToast()
  const [searchQuery, setSearchQuery] = useState("")
  const [currentPage, setCurrentPage] = useState(1)

  return (
    <div className="space-y-5">
      {/* Stats Cards */}
      <div className="flex gap-4">
        <StatCard
          label="Next Payout"
          sublabel="Tuesday, Aug 20th"
          amount="832.00"
          status="Processing..."
          extra={"\uD83C\uDFE6 Chase Bank ...4553"}
        />
        <StatCard
          label="Total Payouts This Month"
          amount="4,566.00"
          extra="Earnings in August"
          change={{ value: "5.2%", direction: "up", label: "from last month" }}
        />
        <StatCard
          label="Lifetime Payouts"
          amount="66,7777.00"
          extra="127 Completed Projects"
          sublabel="Since Jun 24, 2021"
        />
      </div>

      {/* Filters Row */}
      <div className="flex items-center gap-3 flex-wrap">
        <Button
          variant="outlined"
          visual="gray"
          size="sm"
          leftIcon={<Calendar className="size-4" />}
        >
          All Time
        </Button>

        <Select defaultValue="all-accounts">
          <SelectTrigger className="h-9 w-auto min-w-[120px]">
            <SelectValue placeholder="All Accounts" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all-accounts">All Accounts</SelectItem>
          </SelectContent>
        </Select>

        <Select defaultValue="all-statuses">
          <SelectTrigger className="h-9 w-auto min-w-[110px]">
            <SelectValue placeholder="All Statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all-statuses">All Statuses</SelectItem>
          </SelectContent>
        </Select>

        <Button
          variant="link"
          visual="gray"
          size="sm"
          onClick={() => setSearchQuery("")}
        >
          Clear All
        </Button>

        <div className="ml-auto">
          <SearchField>
            <SearchFieldButton>
              <Search className="size-4" />
            </SearchFieldButton>
            <SearchFieldInput
              placeholder="Find transactions"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </SearchField>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-lg border border-gray-200 bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="cursor-pointer">
                Amount <ArrowDown className="size-3 inline ml-1" />
              </TableHead>
              <TableHead>External Account</TableHead>
              <TableHead>Initiated on</TableHead>
              <TableHead>Est. Arrival</TableHead>
              <TableHead className="w-10"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {PAYOUTS_DATA.map((row, i) => (
              <TableRow key={i}>
                <TableCell className="text-sm font-medium text-dark-blue-400">
                  {row.amount}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <BankIcon className="size-4 text-gray-400" />
                    <span className="text-sm text-gray-500">{row.account}</span>
                    <span className="text-sm text-gray-400">
                      {row.accountNum}
                    </span>
                  </div>
                </TableCell>
                <TableCell className="text-sm text-gray-500">
                  {row.initiatedOn}
                </TableCell>
                <TableCell className="text-sm text-gray-500">
                  {row.estArrival}
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <IconButton size="sm" variant="ghost" visual="gray">
                        <MoreHorizontal className="size-4" />
                      </IconButton>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={() =>
                          toast({
                            title: "Payout Details",
                            description: `${row.amount} to ${row.account} ${row.accountNum}`,
                          })
                        }
                      >
                        View Details
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() =>
                          toast({
                            title: "Download Receipt",
                            description: "Receipt download started.",
                          })
                        }
                      >
                        Download Receipt
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        {/* Pagination */}
        <div className="flex items-center justify-end px-6 py-3 border-t border-gray-200">
          <div className="flex items-center gap-1">
            {[1, 2, 3, "...", 8, 9, 10].map((page, i) => (
              <button
                key={i}
                className={cn(
                  "size-8 rounded-md text-sm font-medium flex items-center justify-center",
                  page === currentPage
                    ? "border border-gray-300 text-dark-blue-400 bg-white"
                    : "text-gray-500 hover:bg-gray-100"
                )}
                onClick={() => typeof page === "number" && setCurrentPage(page)}
              >
                {page}
              </button>
            ))}
            <button
              className="size-8 rounded-md text-sm font-medium flex items-center justify-center text-gray-500 hover:bg-gray-100"
              onClick={() => setCurrentPage((p) => Math.min(p + 1, 10))}
            >
              <ChevronRight className="size-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
