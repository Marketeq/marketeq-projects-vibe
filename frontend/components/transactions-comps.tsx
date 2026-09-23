"use client"

import * as React from "react"
import { SVGProps, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/auth"
import {
  type BalanceResponse,
  type EarningDetail,
  type EarningsListResponse,
  type EarningsRow,
  type EarningsSummary,
  getBalance,
  getEarningDetail,
  getEarnings,
  getEarningsFilterOptions,
  getEarningsSummary,
} from "@/service/http/earnings"
import { UserAPI } from "@/service/http/user"
import { cn } from "@/utils/functions"
import { useEarningsChannel, EarningsRealtimeEvent } from "@/utils/useEarningsChannel"
import { DashboardAmount } from "@/components/dashboard-amount"
import {
  AlertCircle,
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  BankNote02,
  BarChartSquare02,
  Briefcase,
  Calendar,
  Check,
  CheckCircle,
  ChevronDown,
  ArrowLeft,
  ChevronLeft,
  Zap,
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
  RefreshCcw01,
  Search,
  SearchMd,
  Settings02,
  SlashCircle01,
  Trash01,
  UserCircle,
  X,
  XCircle,
} from "@blend-metrics/icons"
import {
  PayoneerDefault,
  StripeDefault,
} from "@blend-metrics/icons/payment-methods"
import { type Stripe as StripeJSInstance, loadStripe } from "@stripe/stripe-js"
import {
  format as formatDate,
  formatDistanceToNowStrict,
  parseISO,
} from "date-fns"
import { QRCodeSVG } from "qrcode.react"
import { getPublicApiUrl } from "@/lib/runtime-urls"
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  DisclosureContent,
} from "@/components/ui/accordion"
import { Label } from "@/components/ui/label/label"
import { ToggleGroupItem, ToggleGroupRoot } from "@/components/ui/toggle-group"
import { Logo3 } from "@/components/icons"
import { FilterEntityAvatar } from "@/components/icons/filter-entity-avatar"
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
  Combobox,
  ComboboxButton,
  ComboboxInput,
  ComboboxLabel,
  ComboboxOption,
  ComboboxOptions,
  ComboboxTrigger,
  DatePicker,
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
  DualCalendar,
  IconButton,
  Input,
  InputGroup,
  InputLeftElement,
  InputRightElement,
  Listbox,
  ListboxButton,
  ListboxOption,
  ListboxOptions,
  NumberInput,
  HeadlessRadioGroupItem,
  Popover,
  PopoverContent,
  PopoverTrigger,
  RadioGroup,
  ScaleOutIn,
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
import { WithdrawFundsDialog } from "@/components/withdraw-funds-dialog"

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

// Real Wise "W" glyph — bare path only (the source asset's own rx=4 green
// rect is dropped since WiseIcon draws its own circular badge below.
const WiseGlyph = ({ className }: { className?: string }) => (
  <svg
    viewBox="0 0 20 20"
    className={cn("shrink-0", className)}
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M6.85689 7.40538L3.16553 11.7387H9.77252L10.5215 9.70579H7.6861L9.42479 7.69962V7.64612L8.30133 5.7202H13.3569L9.42479 16.5H12.0997L16.8343 3.50003H4.60997L6.85689 7.40538Z"
      fill="#163300"
    />
  </svg>
)

const WiseIcon = ({ className }: { className?: string }) => (
  <div
    className={cn(
      "size-10 rounded-full bg-[#9FE870] flex items-center justify-center overflow-hidden shrink-0",
      className
    )}
  >
    <WiseGlyph className="w-1/2 h-1/2" />
  </div>
)

// Updated Wise "W" glyph — scoped to the Add Deposit Method flow and
// Connected Accounts only (per design update); other Wise usages (schedule
// dialog method picker, etc.) intentionally keep the original WiseGlyph/Icon.
const WiseGlyphV2 = ({ className }: { className?: string }) => (
  <svg
    viewBox="0 0 68 68"
    className={cn("shrink-0", className)}
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M23.3138 25.1781L10.7632 39.9114H33.227L35.7735 32.9995H26.1332L32.0447 26.1785V25.9966L28.2249 19.4485H45.4138L32.0447 56.0999H41.1393L57.2369 11.8999H15.6743L23.3138 25.1781Z"
      fill="#163300"
    />
  </svg>
)

const WiseIconV2 = ({ className }: { className?: string }) => (
  <div
    className={cn(
      "size-10 rounded-full bg-[#9FE870] flex items-center justify-center overflow-hidden shrink-0",
      className
    )}
  >
    <WiseGlyphV2 className="w-1/2 h-1/2" />
  </div>
)

const PayoneerIcon = ({ className }: { className?: string }) => (
  <PayoneerDefault className={cn("shrink-0", className)} />
)

// Bare glyph paths lifted directly from PayoneerDefault, minus the two rects
// (fill card + stroke border) it draws around them — used only where a
// circular badge is needed (Add Deposit Method list), same pattern as
// WiseIcon's own circular badge.

const PayoneerGlyph = ({ className }: { className?: string }) => (
  <svg
    viewBox="0 0 34 24"
    className={cn("shrink-0", className)}
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      fill="#000"
      fillRule="evenodd"
      clipRule="evenodd"
      d="m4 14.406.049-.271c.024-.137.047-.269.074-.401l.341-1.794.342-1.793c.016-.076.038-.126.113-.139.589-.088 1.18-.151 1.77-.003.512.126.871.49.93.916.124.849-.37 1.528-1.104 1.77-.387.127-.78.159-1.18.12-.095-.009-.123.017-.139.108-.085.464-.173.925-.264 1.386-.007.038-.041.098-.063.098-.214.005-.425.004-.643.004H4Zm1.354-2.346c.061 0 .12.002.179.004.123.003.24.006.352-.007.328-.034.59-.183.737-.495.167-.354.047-.73-.268-.84-.223-.08-.453-.063-.683-.032-.028.003-.066.048-.072.076l-.134.704v.001l-.111.59ZM9.58 13.8c-.05.052-.097.104-.142.155-.099.11-.192.216-.302.3-.33.255-.708.312-1.09.135-.377-.173-.531-.511-.547-.909-.034-.836.258-1.528.96-2.008.441-.303.948-.395 1.473-.366.174.01.347.04.52.07.093.017.186.033.28.047.107.015.123.075.104.167l-.076.396c-.096.492-.191.983-.27 1.476a8.889 8.889 0 0 0-.082.858l-.01.15c-.006.1-.031.141-.135.138a9.07 9.07 0 0 0-.586 0c-.1.003-.135-.034-.125-.132.009-.108.014-.22.02-.335l.008-.142Zm.22-1.951c-.305-.085-.56-.025-.774.155a1.505 1.505 0 0 0-.551 1.31c.01.16.072.316.242.385.17.07.325.019.457-.095.079-.07.154-.148.21-.237.223-.34.283-.723.345-1.112.021-.135.043-.271.071-.406Zm4.46 1.768c.174.556.649.865 1.483.865.573-.016 1.143-.341 1.498-1.01.19-.36.258-.745.233-1.15-.022-.388-.176-.716-.49-.95-.331-.246-.709-.297-1.112-.252-1.347.151-1.898 1.581-1.611 2.497Zm.897-.464v-.048c.01-.363.098-.7.315-1a.66.66 0 0 1 .384-.272c.334-.076.608.117.64.48a1.67 1.67 0 0 1-.35 1.212.597.597 0 0 1-.415.24c-.312.029-.548-.183-.573-.514a1.125 1.125 0 0 1-.001-.098Zm3.066-1.967h.8c-.013.17-.025.335-.04.502l.084-.08c.059-.057.115-.11.173-.16.312-.272.668-.392 1.08-.325.34.057.576.306.614.656.04.365-.027.719-.095 1.072l-.015.078-.082.428v.002c-.06.314-.12.628-.183.94-.01.04-.057.1-.088.104-.27.006-.542.003-.812 0-.01 0-.018-.005-.032-.012a.549.549 0 0 0-.018-.01 59.911 59.911 0 0 0 .352-2.011.682.682 0 0 0-.003-.212c-.025-.243-.205-.353-.438-.28-.226.072-.362.249-.472.444-.163.288-.22.607-.277.926l-.042.236c-.048.27-.096.54-.15.812-.01.04-.056.104-.088.107-.22.008-.443.007-.68.007h-.186c.208-1.087.403-2.15.598-3.224Zm4.54 2.56c-.334-.04-.558-.274-.536-.603l.208.002c.137.003.272.005.406-.002.324-.019.642-.072.938-.22.378-.19.554-.503.526-.91-.029-.414-.252-.713-.652-.833-.598-.18-1.149-.054-1.618.347-.57.486-.783 1.13-.702 1.866.057.52.34.893.857 1.026.554.142 1.098.066 1.624-.149.038-.015.082-.075.078-.113a8.988 8.988 0 0 0-.038-.462l-.012-.116h-.024c-.008-.002-.013-.002-.017 0-.034.013-.07.025-.1.038a1.942 1.942 0 0 1-.939.13Zm.487-1.398c-.192.1-.689.16-.931.11.05-.42.494-.748.868-.656.126.031.218.097.24.233.022.133-.044.243-.177.313Zm2.122.808c-.028.31.192.546.529.59.314.038.617-.01.913-.116l.082-.032.081-.032.02.197c.014.134.027.264.034.394.003.038-.041.098-.076.114-.535.22-1.086.296-1.65.141-.506-.138-.77-.508-.833-1.013-.079-.647.088-1.231.538-1.711.485-.515 1.08-.698 1.766-.508.418.116.642.42.667.846.025.416-.164.729-.557.912-.397.183-.818.212-1.247.221-.085-.003-.173-.003-.267-.003Zm.26-.682c.14-.007.274-.014.407-.032.126-.015.252-.053.365-.107.123-.054.183-.167.164-.306-.019-.133-.107-.196-.23-.227-.371-.101-.834.24-.875.681l.17-.009Zm1.984 1.272c-.04.215-.079.427-.12.66h.187c.242.001.473.002.704-.006.022 0 .057-.06.063-.098.032-.158.062-.316.092-.475.055-.292.11-.583.179-.87.154-.638.415-.859 1.036-.94.025-.004.066-.032.072-.054.04-.182.075-.365.112-.554L30 11.11c-.598-.063-.932.284-1.221.71l.004-.061.046-.583h-.193c-.186 0-.365-.001-.543.004-.026.003-.073.06-.076.094-.067.812-.226 1.605-.385 2.398l-.015.074Z"
    />
    <path
      fill="#FC461E"
      fillRule="evenodd"
      clipRule="evenodd"
      d="m19.284 7.377-.096-.024c-.098 0-.195 0-.3.003a6.169 6.169 0 0 0-.106.023l-.132.028a5.177 5.177 0 0 0-1.373.48 10.526 10.526 0 0 0-2.559 1.837c-.507.486-.998.995-1.473 1.515a14.058 14.058 0 0 0-2.118 3.028c-.293.572-.558 1.156-.677 1.79-.022.117.016.253.053.37.016.047.104.082.164.1.016.007.063-.072.085-.116l.024-.053c.137-.299.322-.704.482-.972.34-.568.608-1.008.99-1.548a19.19 19.19 0 0 1 2.072-2.472c.709-.71 1.418-1.345 2.309-1.825.409-.218.828-.433 1.256-.61a9.703 9.703 0 0 1 2.304-.63c.085-.014.198-.08.227-.15.025-.062-.035-.182-.095-.242-.242-.25-.526-.44-.878-.496a1.48 1.48 0 0 1-.16-.036Zm-7.207 4.308c.151-.41.227-.837.236-1.279l-.01-.142c-.008-.095-.015-.19-.027-.284-.085-.733-.4-1.355-.9-1.888a.6.6 0 0 0-.224-.136c-.082-.032-.135.016-.13.11l.001.006c.006.08.013.164.028.244l.066.379c.078.449.157.9.243 1.348.085.451.179.9.28 1.345.034.142.091.284.16.417.054.1.13.091.199 0 .031-.038.063-.076.078-.12Z"
    />
  </svg>
)

const PayoneerCircleIcon = ({ className }: { className?: string }) => (
  <div
    className={cn(
      "size-9 rounded-full border border-gray-200 bg-white flex items-center justify-center shrink-0",
      className
    )}
  >
    <PayoneerGlyph className="size-6" />
  </div>
)

// ─── Crypto wallet provider display metadata (US-09/PS-11). Fee/token text
// is cosmetic marketing copy (mirrors the existing hardcoded "Transfer in
// 1-3 business days" pattern above), matching Figma exactly — not derived
// from the backend registry, which only carries the technical network/token
// support matrix.
const CRYPTO_PROVIDER_META: Record<
  string,
  { tokensText: string; feeText: string }
> = {
  RAMP: { tokensText: "BTC, ETH, USDC", feeText: "0.49–2.9% + network fee" },
  TRANSAK: {
    tokensText: "100+ tokens supported",
    feeText: "0.5–1.5% + network fee",
  },
  CRYPTO_COM: {
    tokensText: "100+ tokens supported",
    feeText: "0.5–1.5% + network fee",
  },
  COINBASE: { tokensText: "BTC, ETH, USDC", feeText: "1.49% + network fee" },
  METAMASK: { tokensText: "BTC, ETH, USDC", feeText: "1.49% + network fee" },
  LEDGER: { tokensText: "BTC, ETH, USDC", feeText: "1.49% + network fee" },
  TREZOR: { tokensText: "BTC, ETH, USDC", feeText: "1.49% + network fee" },
  KRAKEN: { tokensText: "BTC, ETH", feeText: "0.9% + network fee" },
  BINANCE: { tokensText: "BTC, ETH, USDT", feeText: "0–0.1% + P2P margin" },
}

// Real brand logos, paths lifted verbatim from the Figma export — each
// svg's viewBox is set to that icon's exact source coordinate box (no
// coordinate math), so the path data below is pasted unchanged.
const RampProviderIcon = ({ className }: { className?: string }) => (
  <svg
    viewBox="26.5 32.3379 32 20.3243"
    className={cn("shrink-0", className)}
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M48.2803 44.2155L44.4605 48.0497C44.1434 48.3812 44.1434 48.9002 44.4605 49.2317L47.3722 52.1578C47.8623 52.6479 48.6839 52.6479 49.174 52.1578L58.1109 43.3362C58.601 42.8461 58.601 42.0389 58.1109 41.5488L49.174 32.7416C48.6839 32.2515 47.8623 32.2515 47.3722 32.7416L44.4605 35.6677C44.1434 35.9848 44.1434 36.5182 44.4605 36.8497L48.2803 40.6839C49.2749 41.6209 49.2749 43.2353 48.2803 44.2155Z"
      fill="#0A6E5C"
    />
    <path
      d="M36.8061 44.2155L40.6259 48.0497C40.943 48.3812 40.943 48.9002 40.6259 49.2317L37.7142 52.1578C37.2241 52.6479 36.4025 52.6479 35.9124 52.1578L26.9755 43.3362C26.4854 42.8461 26.4854 42.0389 26.9755 41.5488L35.9124 32.7416C36.4025 32.2515 37.2241 32.2515 37.7142 32.7416L40.6259 35.6677C40.943 35.9848 40.943 36.5182 40.6259 36.8497L36.8061 40.6839C35.8115 41.6209 35.8115 43.2353 36.8061 44.2155Z"
      fill="#21BF73"
    />
    <path
      d="M37.8152 43.1632C37.4116 42.7596 37.4116 42.111 37.8152 41.7074L41.8224 37.7002C42.226 37.2966 42.8746 37.2966 43.2782 37.7002L47.2854 41.7074C47.689 42.111 47.689 42.7596 47.2854 43.1632L43.2782 47.1704C42.8746 47.574 42.226 47.574 41.8224 47.1704L37.8152 43.1632Z"
      fill="#21BF73"
    />
  </svg>
)

const TransakProviderIcon = ({ className }: { className?: string }) => (
  <svg
    viewBox="91.5 26.5 32 32"
    className={cn("shrink-0", className)}
    xmlns="http://www.w3.org/2000/svg"
  >
    <defs>
      <linearGradient
        id="transakGrad"
        x1="93.6404"
        y1="34.4985"
        x2="121.354"
        y2="50.493"
        gradientUnits="userSpaceOnUse"
      >
        <stop offset="0.13" stopColor="#348BED" />
        <stop offset="0.31" stopColor="#2B80E8" />
        <stop offset="0.64" stopColor="#1461DB" />
        <stop offset="0.72" stopColor="#0E57D7" />
      </linearGradient>
    </defs>
    <path
      d="M107.495 58.5C116.329 58.5 123.49 51.3366 123.49 42.5C123.49 33.6634 116.329 26.5 107.495 26.5C98.6611 26.5 91.5 33.6634 91.5 42.5C91.5 51.3366 98.6611 58.5 107.495 58.5Z"
      fill="url(#transakGrad)"
    />
    <path
      d="M117.595 41.5223L113.077 37.0031L113.069 36.9949L113.051 36.9792C113.022 36.9528 112.991 36.9279 112.959 36.9047C112.937 36.8868 112.915 36.8697 112.891 36.854C112.88 36.8465 112.87 36.8406 112.859 36.8339C112.601 36.6651 112.289 36.5994 111.986 36.6498C111.682 36.7003 111.408 36.8631 111.219 37.106L104.193 44.1353V37.8731C104.193 37.5439 104.062 37.2282 103.829 36.9954C103.597 36.7626 103.281 36.6318 102.952 36.6318C102.623 36.6318 102.307 36.7626 102.074 36.9954C101.842 37.2282 101.711 37.5439 101.711 37.8731V44.1353L99.1458 41.5693C98.9113 41.3457 98.5987 41.2226 98.2747 41.2265C97.9507 41.2303 97.6411 41.3608 97.412 41.5899C97.1829 41.8191 97.0525 42.1288 97.0487 42.4529C97.0448 42.7769 97.1678 43.0897 97.3914 43.3242L102.075 48.009C102.104 48.0388 102.135 48.0669 102.168 48.0932C102.199 48.1186 102.232 48.1432 102.265 48.1678C102.434 48.2774 102.627 48.3442 102.828 48.3623H102.833C102.874 48.3661 102.914 48.3683 102.954 48.3683H102.973C103.006 48.3683 103.04 48.3668 103.073 48.3638H103.098C103.13 48.3601 103.162 48.3564 103.193 48.3497H103.207C103.242 48.3422 103.278 48.334 103.312 48.3236H103.318C103.355 48.3123 103.392 48.2991 103.428 48.2841C103.479 48.2628 103.529 48.2379 103.577 48.2095L103.605 48.1931C103.652 48.1644 103.697 48.1326 103.74 48.0977L103.752 48.0865C103.778 48.0641 103.804 48.0418 103.827 48.0164L110.951 40.8849V47.1278C110.951 47.457 111.082 47.7727 111.315 48.0055C111.548 48.2383 111.863 48.369 112.192 48.369C112.521 48.369 112.837 48.2383 113.07 48.0055C113.302 47.7727 113.433 47.457 113.433 47.1278V40.8656L115.84 43.278C116.074 43.5062 116.388 43.633 116.715 43.631C117.041 43.629 117.354 43.4983 117.585 43.2673C117.816 43.0363 117.946 42.7235 117.948 42.3969C117.95 42.0702 117.823 41.756 117.595 41.5223Z"
      fill="white"
    />
  </svg>
)

const CoinbaseProviderIcon = ({ className }: { className?: string }) => (
  <svg
    viewBox="156.5 91.5 32 32"
    className={cn("shrink-0", className)}
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M172.5 91.5C181.337 91.5 188.5 98.6625 188.5 107.5C188.5 116.337 181.337 123.5 172.5 123.5C163.663 123.5 156.5 116.337 156.5 107.5C156.5 98.6625 163.663 91.5 172.5 91.5Z"
      fill="#0052FF"
    />
    <path
      d="M172.503 113.125C169.397 113.125 166.878 110.609 166.878 107.5C166.878 104.391 169.397 101.875 172.503 101.875C175.288 101.875 177.6 103.906 178.044 106.562H183.709C183.231 100.787 178.397 96.25 172.5 96.25C166.288 96.25 161.25 101.287 161.25 107.5C161.25 113.712 166.288 118.75 172.5 118.75C178.397 118.75 183.231 114.212 183.709 108.438H178.041C177.594 111.094 175.288 113.125 172.503 113.125Z"
      fill="white"
    />
  </svg>
)

const MetamaskProviderIcon = ({ className }: { className?: string }) => (
  <svg
    viewBox="26.5 157.077 32 30.8457"
    className={cn("shrink-0", className)}
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M56.4002 186.867L49.5082 184.815L44.3109 187.922L40.6846 187.92L35.4841 184.815L28.5953 186.867L26.5 179.793L28.5955 171.942L26.5 165.304L28.5955 157.077L39.3597 163.508H45.6358L56.4002 157.077L58.4957 165.304L56.4002 171.942L58.4957 179.793L56.4002 186.867Z"
      fill="#FF5C16"
    />
    <path
      d="M28.5969 157.077L39.3613 163.513L38.9334 167.929L28.5969 157.077ZM35.4859 179.796L40.2222 183.404L35.4859 184.815V179.796ZM39.8436 173.831L38.9334 167.933L33.1067 171.944L33.1035 171.942V171.945L33.1215 176.074L35.4844 173.831L39.8436 173.831ZM56.4002 157.077L45.6358 163.513L46.0624 167.929L56.4002 157.077ZM49.5114 179.796L44.775 183.404L49.5114 184.815V179.796ZM51.8922 171.945V171.942L51.8909 171.943L46.064 167.933L45.1538 173.831H49.5112L51.8756 176.073L51.8922 171.945Z"
      fill="#FF5C16"
    />
    <path
      d="M35.4843 184.814L28.5955 186.866L26.5 179.796H35.4843V184.814ZM39.842 173.829L41.1578 182.356L39.334 177.615L33.1186 176.073L35.4828 173.829L39.842 173.829ZM49.5112 184.814L56.4002 186.866L58.4957 179.795H49.5112C49.5112 179.796 49.5112 184.814 49.5112 184.814ZM45.1537 173.829L43.8379 182.356L45.6615 177.615L51.8774 176.073L49.5116 173.829L45.1537 173.829Z"
      fill="#E34807"
    />
    <path
      d="M26.5 179.793L28.5955 171.942H33.1019L33.1184 176.072L39.3345 177.614L41.158 182.355L40.2206 183.399L35.4843 179.791H26.5V179.793ZM58.4957 179.793L56.4002 171.942H51.8936L51.8771 176.072L45.6615 177.614L43.8377 182.355L44.7749 183.399L49.5114 179.791H58.4957V179.793ZM45.6358 163.508H39.3597L38.9336 167.925L41.1583 182.35H43.8379L46.0639 167.925L45.6358 163.508Z"
      fill="#FF8D5D"
    />
    <path
      d="M28.5955 157.077L26.5 165.304L28.5955 171.942H33.1019L38.9318 167.93L28.5955 157.077ZM38.5397 175.542H36.4982L35.3868 176.632L39.3358 177.611L38.5397 175.54V175.542ZM56.4002 157.077L58.4957 165.304L56.4002 171.942H51.8936L46.0639 167.93L56.4002 157.077ZM46.459 175.542H48.5034L49.6148 176.633L45.6612 177.614L46.459 175.54V175.542ZM44.3094 185.108L44.7752 183.402L43.8377 182.358H41.156L40.2188 183.402L40.6843 185.108"
      fill="#661800"
    />
    <path
      d="M44.3094 185.107V187.923H40.6848V185.107H44.3094Z"
      fill="#C0C4CD"
    />
    <path
      d="M35.4858 184.812L40.6876 187.922V185.106L40.2218 183.401L35.4858 184.812ZM49.5113 184.812L44.3093 187.922V185.106L44.7751 183.401L49.5113 184.812Z"
      fill="#E7EBF6"
    />
  </svg>
)

const LedgerProviderIcon = ({ className }: { className?: string }) => (
  <svg
    viewBox="91.5 158.562 32 27.8756"
    className={cn("shrink-0", className)}
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M91.5 178.519V186.428H103.537V184.674H93.2538V178.519H91.5ZM121.746 178.519V184.674H111.463V186.428H123.5V178.519H121.746ZM103.554 166.482V178.518H111.463V176.936H105.308V166.482H103.554ZM91.5 158.572V166.482H93.2538V160.326H103.537V158.572H91.5ZM111.463 158.572V160.326H121.746V166.482H123.5V158.572H111.463Z"
      fill="black"
    />
  </svg>
)

const TrezorProviderIcon = ({ className }: { className?: string }) => (
  <svg
    viewBox="156.5 24.3667 32 36.2667"
    className={cn("shrink-0", className)}
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M172.414 24.3667L156.507 33.4334V51.5667L172.414 60.6334L188.322 51.5667V33.4334L172.414 24.3667ZM172.414 24.3667L156.507 33.4334V51.5667L172.414 60.6334L188.322 51.5667V33.4334L172.414 24.3667Z"
      fill="white"
    />
    <path
      d="M178.695 53.5497H176.43L173.72 51.0945V49.8348L176.526 47.1904V43.0033L180.192 40.6421L184.368 43.7597L178.695 53.5497ZM169.322 46.9393L169.737 43.0033L168.365 39.4775H176.463L175.124 43.0033L175.506 46.9393H172.382H169.322ZM171.171 51.0945L168.461 53.5817H166.165L160.46 43.7597L164.667 40.6741L168.365 43.0033V47.1904L171.171 49.8348V51.0945ZM166.134 32.2047H178.663L180.161 38.502H164.668L166.134 32.2047ZM172.414 24.3667L156.507 33.4334V51.5667L172.414 60.6334L188.322 51.5667V33.4334L172.414 24.3667Z"
      fill="#03316C"
    />
  </svg>
)

const KrakenProviderIcon = ({ className }: { className?: string }) => (
  <svg
    viewBox="91.5 91.5 32 32"
    className={cn("shrink-0", className)}
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M107.5 123.5C116.337 123.5 123.5 116.337 123.5 107.5C123.5 98.6634 116.337 91.5 107.5 91.5C98.6634 91.5 91.5 98.6634 91.5 107.5C91.5 116.337 98.6634 123.5 107.5 123.5Z"
      fill="#5741D9"
    />
    <path
      d="M99.5045 109.763C99.5045 109.458 99.5099 109.154 99.5027 108.849C99.4884 108.261 99.531 107.673 99.6299 107.093C99.7986 106.12 100.105 105.201 100.606 104.351C101.447 102.924 102.632 101.875 104.125 101.171C104.784 100.856 105.486 100.639 106.209 100.527C106.586 100.47 106.966 100.423 107.35 100.426C108.985 100.439 110.507 100.842 111.882 101.744C113.229 102.628 114.24 103.798 114.848 105.3C115.128 106.006 115.314 106.745 115.401 107.5C115.504 108.334 115.509 109.171 115.495 110.01C115.486 110.462 115.488 110.916 115.481 111.367C115.478 111.564 115.471 111.761 115.419 111.954C115.215 112.704 114.359 113.045 113.731 112.629C113.45 112.445 113.312 112.173 113.262 111.848C113.228 111.63 113.21 111.411 113.21 111.19V108.459C113.21 108.102 113.099 107.786 112.855 107.522C112.429 107.064 111.774 107.046 111.295 107.47C111.027 107.708 110.905 108.011 110.88 108.359C110.869 108.49 110.865 108.62 110.865 108.751C110.864 109.755 110.867 110.757 110.86 111.762C110.855 112.331 110.423 112.766 109.842 112.806C109.575 112.826 109.31 112.746 109.098 112.581C108.887 112.415 108.745 112.178 108.7 111.913C108.676 111.761 108.664 111.608 108.665 111.454C108.665 110.444 108.667 109.435 108.665 108.425C108.67 108.093 108.543 107.773 108.312 107.534C107.833 107.031 107.113 107.046 106.648 107.564C106.42 107.816 106.321 108.11 106.321 108.446C106.321 109.444 106.319 110.443 106.321 111.44C106.321 111.697 106.29 111.95 106.183 112.186C106.098 112.384 105.955 112.55 105.773 112.664C105.59 112.777 105.378 112.833 105.163 112.822C104.737 112.808 104.376 112.541 104.213 112.111C104.15 111.943 104.118 111.764 104.119 111.584C104.121 110.618 104.12 109.652 104.117 108.686C104.117 108.472 104.109 108.256 104.044 108.049C103.898 107.573 103.581 107.271 103.092 107.191C102.594 107.109 102.225 107.344 101.949 107.744C101.816 107.936 101.773 108.15 101.773 108.379C101.773 109.296 101.773 110.213 101.775 111.129C101.775 111.399 101.78 111.669 101.719 111.935C101.618 112.377 101.193 112.86 100.551 112.812C100.109 112.779 99.6842 112.414 99.5608 111.946C99.5191 111.78 99.4987 111.61 99.5002 111.439C99.5055 110.876 99.5055 110.32 99.5036 109.763L99.5045 109.763Z"
      fill="white"
    />
  </svg>
)

const BinanceProviderIcon = ({ className }: { className?: string }) => (
  <svg
    viewBox="26.5 91.5 32 32"
    className={cn("shrink-0", className)}
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M36.1472 104.947L42.3617 98.7325L48.5794 104.95L52.1954 101.334L42.3617 91.5L32.5312 101.331L36.1472 104.947Z"
      fill="#F3BA2F"
    />
    <path
      d="M33.5937 107.5L29.9778 103.884L26.3617 107.5L29.9776 111.116L33.5937 107.5Z"
      fill="#F3BA2F"
    />
    <path
      d="M36.1477 110.053L42.3621 116.268L48.5796 110.05L52.1976 113.664L52.1958 113.666L42.3621 123.5L32.5314 113.67L32.5264 113.665L36.1477 110.053Z"
      fill="#F3BA2F"
    />
    <path
      d="M54.746 111.118L58.3621 107.501L54.7461 103.886L51.13 107.502L54.746 111.118Z"
      fill="#F3BA2F"
    />
    <path
      d="M46.0298 107.498H46.0313L42.362 103.829L39.6503 106.54H39.6501L39.3387 106.852L38.696 107.495L38.6909 107.5L38.696 107.505L42.362 111.171L46.0313 107.502L46.0331 107.5L46.0298 107.498Z"
      fill="#F3BA2F"
    />
  </svg>
)

const CryptoComProviderIcon = ({ className }: { className?: string }) => (
  <svg
    viewBox="161.476 156.5 22.0485 32"
    className={cn("shrink-0", className)}
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M180.308 163.926C180.308 159.867 176.786 156.5 172.499 156.5C168.211 156.5 164.689 159.869 164.689 163.926V166.3H161.476V183.374L172.499 188.5L183.524 183.37V166.373H180.311L180.308 163.926ZM168.671 163.926C168.671 162.013 170.355 160.481 172.499 160.481C174.643 160.481 176.327 162.013 176.327 163.926V166.3H168.671V163.926ZM179.083 180.617L172.499 183.68L165.915 180.617V170.358H179.083V180.617Z"
      fill="black"
    />
  </svg>
)

// Bare "generic wallet" glyph — used only when a deposit method's crypto
// provider can't be resolved (the deposit-methods LIST endpoint doesn't
// return cryptoProvider, only displayLabel).
const CryptoWalletIcon = ({ className }: { className?: string }) => (
  <svg
    viewBox="0 0 24 24"
    className={cn("size-5", className)}
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M12 2v4M12 18v4M2 12h4M18 12h4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"
      stroke="#6B7280"
      strokeWidth="2"
      strokeLinecap="round"
    />
    <circle cx="12" cy="12" r="2" fill="#6B7280" />
  </svg>
)

const CRYPTO_PROVIDER_ICON: Record<
  string,
  React.ComponentType<{ className?: string }>
> = {
  RAMP: RampProviderIcon,
  TRANSAK: TransakProviderIcon,
  CRYPTO_COM: CryptoComProviderIcon,
  COINBASE: CoinbaseProviderIcon,
  METAMASK: MetamaskProviderIcon,
  LEDGER: LedgerProviderIcon,
  TREZOR: TrezorProviderIcon,
  KRAKEN: KrakenProviderIcon,
  BINANCE: BinanceProviderIcon,
}

export const CryptoProviderIcon = ({
  provider,
  className,
}: {
  provider: string
  className?: string
}) => {
  const Icon = CRYPTO_PROVIDER_ICON[provider]
  if (!Icon)
    return (
      <div
        className={cn(
          "size-10 rounded-lg bg-gray-100 flex items-center justify-center shrink-0",
          className
        )}
      >
        <CryptoWalletIcon />
      </div>
    )
  return (
    <div
      className={cn("size-10 rounded-full overflow-hidden shrink-0", className)}
    >
      <Icon className="w-full h-full" />
    </div>
  )
}

const BANK_LOGOS: Record<string, string> = {
  chase: "/bank-logos/chase.png",
  "bank of america": "/bank-logos/bofa.png",
  bofa: "/bank-logos/bofa.png",
  "wells fargo": "/bank-logos/wellsfargo.png",
  citibank: "/bank-logos/citibank.png",
  citi: "/bank-logos/citibank.png",
  usaa: "/bank-logos/usaa.png",
  "td bank": "/bank-logos/tdbank.png",
  regions: "/bank-logos/regions.png",
  "capital one": "/bank-logos/capitalone.png",
}

// US-103/US-104: display-level earnings amounts render as whole numbers, no
// decimals — the one carved-out exception is the fee-breakdown sections
// (US-27's inline expand + the Entry Detail drawer), which keep 2 decimals
// since those show the precise raw billing figures. This only rounds for
// display; it never touches the underlying amount used in calculations.
function formatWholeAmount(amount: string | number | null | undefined): string {
  if (amount == null) return "—"
  const n = typeof amount === "number" ? amount : parseFloat(amount)
  if (!Number.isFinite(n)) return "—"
  return Math.round(Math.abs(n)).toLocaleString("en-US")
}
// Every call site renders the currency symbol as its own styled span
// (different font size/weight than the digits), so the "-" for a negative
// amount (refunds/adjustments) has to be placed before that span, not baked
// into formatWholeAmount's return value — "-$46", never "$-46".
function amountSign(amount: string | number | null | undefined): string {
  const n = typeof amount === "number" ? amount : parseFloat(amount ?? "")
  return Number.isFinite(n) && n < 0 ? "-" : ""
}
// Formats an amount as "1,234.56" for callers that split whole/cents themselves
// (FigmaAmount). Do not render this string as a single styled text node — Figma
// sizes the cents smaller and top-aligns them to the whole digits.
function formatAmountWithCents(
  amount: string | number | null | undefined
): string {
  if (amount == null) return "—"
  const n = typeof amount === "number" ? amount : parseFloat(amount)
  if (!Number.isFinite(n)) return "—"
  return Math.abs(n).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

// Figma Next Payout aside: "Tuesday, Aug 20th"
function formatPayoutCardDate(iso: string): string {
  const d = new Date(iso)
  if (!Number.isFinite(d.getTime())) return "—"
  const weekday = d.toLocaleDateString("en-US", {
    weekday: "long",
    timeZone: "UTC",
  })
  const month = d.toLocaleDateString("en-US", {
    month: "short",
    timeZone: "UTC",
  })
  const day = d.getUTCDate()
  const ord =
    day % 10 === 1 && day !== 11
      ? "st"
      : day % 10 === 2 && day !== 12
        ? "nd"
        : day % 10 === 3 && day !== 13
          ? "rd"
          : "th"
  return `${weekday}, ${month} ${day}${ord}`
}

// Figma bank mask uses "..." not bullet characters from displayLabel.
function formatPayoutMethodMask(label: string): string {
  return label.replace(/•{2,}|·{2,}|\u2022{2,}/g, "...").replace(/\s+/g, " ").trim()
}

// ES-06: resolves a real currency symbol ("€", "₹", "$"...) from an ISO 4217
// code instead of a hardcoded "$" — the balance display is now data-driven,
// so a non-USD displayCurrency must render its own symbol, not USD's.
const currencySymbolCache = new Map<string, string>()
function currencySymbol(code: string): string {
  const key = code || "USD"
  const cached = currencySymbolCache.get(key)
  if (cached) return cached
  let symbol = key
  try {
    const part = new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: key,
    })
      .formatToParts(0)
      .find((p) => p.type === "currency")
    if (part) symbol = part.value
  } catch {
    /* unsupported/unknown code — fall back to the raw code itself */
  }
  currencySymbolCache.set(key, symbol)
  return symbol
}

function BankLogo({
  bankName,
  size = 48,
}: {
  bankName: string
  size?: number
}) {
  const name = (bankName || "").toLowerCase()
  const match = Object.entries(BANK_LOGOS).find(([key]) => name.includes(key))

  if (match) {
    return (
      <div
        style={{
          width: size,
          height: size,
          borderRadius: 8,
          background: "white",
          border: "1px solid #E5E7EB",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          overflow: "hidden",
          flexShrink: 0,
        }}
      >
        <img
          src={match[1]}
          alt={bankName}
          style={{
            width:
              size *
              (name.includes("bank of america") || name.includes("bofa")
                ? 3
                : 2),
            height:
              size *
              (name.includes("bank of america") || name.includes("bofa")
                ? 3
                : 2),
            objectFit: "contain",
          }}
        />
      </div>
    )
  }

  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: 8,
        background: "white",
        border: "1px solid #E5E7EB",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
      }}
    >
      <BankIcon
        className="text-gray-800"
        style={{ width: size * 0.5, height: size * 0.5 }}
      />
    </div>
  )
}
// ─── Micro-deposit lock countdown (US-05 / AC-05.06, EC-12) ─────────────────
// Countdown is derived from the server-provided lockedUntil timestamp on every
// tick — never a client-calculated 24h duration — so client clock skew can't
// produce a premature "unlocked" state.
function LockedVerificationStep({
  methodId,
  lockedUntil,
  onClose,
  onUnlockedRetry,
}: {
  methodId: string
  lockedUntil?: string
  onClose: () => void
  onUnlockedRetry: () => void
}) {
  const [now, setNow] = React.useState(() => Date.now())
  const [serverLockedUntil, setServerLockedUntil] = React.useState(lockedUntil)
  const [confirming, setConfirming] = React.useState(false)
  const [almostThere, setAlmostThere] = React.useState(false)
  React.useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30_000)
    return () => clearInterval(id)
  }, [])
  const msRemaining = serverLockedUntil
    ? new Date(serverLockedUntil).getTime() - now
    : 0
  const countdownElapsed = msRemaining <= 0
  const hrs = Math.floor(msRemaining / 3_600_000)
  const mins = Math.floor((msRemaining % 3_600_000) / 60_000)

  // EC-15: the client-side countdown reaching zero is only a hint — the lock is
  // enforced by the server's clock, not this device's. Refetch session status
  // before ever showing the form; if the server still says locked (clock skew,
  // or the countdown was slightly ahead), stay locked and adopt its fresh timestamp.
  const confirmUnlock = React.useCallback(async () => {
    setConfirming(true)
    setAlmostThere(false)
    try {
      const res = await payoutFetch(
        `/deposit-methods/${methodId}/verification-status`
      )
      if (res.ok) {
        const d = await res.json()
        if (d.verificationStatus !== "locked") {
          onUnlockedRetry()
          return
        }
        if (d.lockedUntil) setServerLockedUntil(d.lockedUntil)
        setAlmostThere(true)
      }
    } finally {
      setConfirming(false)
    }
  }, [methodId, onUnlockedRetry])

  React.useEffect(() => {
    if (countdownElapsed) confirmUnlock()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [countdownElapsed])

  return (
    <div className="p-6 text-center space-y-4">
      <div className="size-12 mx-auto flex items-center justify-center rounded-full bg-red-50">
        <span className="text-red-600 text-2xl">🔒</span>
      </div>
      <h4 className="text-base font-semibold text-dark-blue-400">
        Too Many Attempts
      </h4>
      {confirming ? (
        <p className="text-sm text-gray-500">Checking…</p>
      ) : almostThere ? (
        <p className="text-sm text-gray-500">
          Almost there — please wait a moment and try again.
        </p>
      ) : (
        <p className="text-sm text-gray-500">
          Too many incorrect attempts. You can try again in{" "}
          <strong>
            {hrs} hr {mins} min
          </strong>
          . Check your bank statement to find the exact deposit amounts.
        </p>
      )}
      <Button
        variant="outlined"
        visual="gray"
        size="sm"
        className="w-full"
        disabled={confirming}
        onClick={countdownElapsed ? confirmUnlock : onClose}
      >
        {countdownElapsed ? "Check Again" : "Back to Deposit Methods"}
      </Button>
    </div>
  )
}

// ─── Stripe Financial Connections (US-03 / AC-03.01) ────────────────────────
// Same publishable-key validation pattern as app/checkout/[slug]/payment/page.tsx.
const stripePublishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
const isStripePublishableKeyConfigured = Boolean(
  stripePublishableKey &&
  /^pk_(test|live)_/.test(stripePublishableKey) &&
  !stripePublishableKey.includes("YOUR") &&
  !stripePublishableKey.endsWith("...")
)
let stripeJsPromise: Promise<StripeJSInstance | null> | null = null
const getStripeJs = () => {
  if (!isStripePublishableKeyConfigured || !stripePublishableKey)
    return Promise.resolve(null)
  if (!stripeJsPromise) stripeJsPromise = loadStripe(stripePublishableKey)
  return stripeJsPromise
}

// ─── Global bank (US-04) — country drives required fields & currency ────────
// Mirrors backend/apps/payout-service/src/methods/bank-validation.service.ts's
// per-region field requirements (AC-04.02/04.03) and format checks (AC-04.04/04.05).
// Every country below maps to a real backend-validated region — nothing here
// is selectable without matching server-side support.
const SEPA_COUNTRIES = new Set([
  "AT",
  "BE",
  "BG",
  "HR",
  "CY",
  "CZ",
  "DK",
  "EE",
  "FI",
  "FR",
  "DE",
  "GR",
  "HU",
  "IE",
  "IT",
  "LV",
  "LT",
  "LU",
  "MT",
  "NL",
  "PL",
  "PT",
  "RO",
  "SK",
  "SI",
  "ES",
  "SE",
  "IS",
  "LI",
  "NO",
  "CH",
  "MC",
  "SM",
  "AD",
  "VA",
])
const UK_COUNTRIES = new Set(["GB", "GG", "JE", "IM"])
const GCC_COUNTRIES = new Set(["AE", "SA", "QA", "BH", "KW", "OM"])
const BACS_COUNTRIES = new Set([
  "BR",
  "MX",
  "ZA",
  "NG",
  "KE",
  "PK",
  "BD",
  "PH",
  "ID",
  "VN",
  "TH",
  "MY",
])
const OFAC_BLOCKED_COUNTRIES = new Set(["CU", "IR", "KP", "SD", "SY"])
const SEPA_CURRENCY_MAP: Record<string, string> = {
  BG: "BGN",
  CZ: "CZK",
  DK: "DKK",
  HU: "HUF",
  PL: "PLN",
  RO: "RON",
  SE: "SEK",
  IS: "ISK",
  NO: "NOK",
  CH: "CHF",
  LI: "CHF",
}
const GCC_CURRENCY_MAP: Record<string, string> = {
  AE: "AED",
  SA: "SAR",
  QA: "QAR",
  BH: "BHD",
  KW: "KWD",
  OM: "OMR",
}

type BankRegion =
  | "US"
  | "GB"
  | "IN"
  | "AU"
  | "JP"
  | "CA"
  | "CN"
  | "RU"
  | "MX"
  | "SEPA"
  | "GCC"
  | "BACS"
  | "SWIFT"
function detectBankRegion(country: string): BankRegion {
  const c = (country || "").toUpperCase()
  if (c === "US") return "US"
  if (c === "IN") return "IN"
  if (c === "AU") return "AU"
  if (c === "JP") return "JP"
  if (c === "CA") return "CA"
  if (c === "CN") return "CN"
  if (c === "RU") return "RU"
  if (c === "MX") return "MX"
  if (UK_COUNTRIES.has(c)) return "GB"
  if (SEPA_COUNTRIES.has(c)) return "SEPA"
  if (GCC_COUNTRIES.has(c)) return "GCC"
  if (BACS_COUNTRIES.has(c)) return "BACS"
  return "SWIFT"
}
function bankCountryCurrency(country: string): string {
  const region = detectBankRegion(country)
  const c = (country || "").toUpperCase()
  switch (region) {
    case "US":
      return "USD"
    case "GB":
      return "GBP"
    case "IN":
      return "INR"
    case "AU":
      return "AUD"
    case "JP":
      return "JPY"
    case "CA":
      return "CAD"
    case "CN":
      return "CNY"
    case "RU":
      return "RUB"
    case "MX":
      return "MXN"
    case "SEPA":
      return SEPA_CURRENCY_MAP[c] ?? "EUR"
    case "GCC":
      return GCC_CURRENCY_MAP[c] ?? "USD"
    default:
      return "USD"
  }
}
// Full ISO 3166-1 country list, alphabetized to match Figma. OFAC-sanctioned
// countries are still listed (so the picker isn't mysteriously missing them)
// but selecting one surfaces ERR_DEPOSIT_COUNTRY_RESTRICTED from the backend,
// same as bank-validation.service.ts's own OFAC check.
const ALL_COUNTRIES: { code: string; name: string; flag: string }[] = [
  { code: "AF", name: "Afghanistan", flag: "🇦🇫" },
  { code: "AL", name: "Albania", flag: "🇦🇱" },
  { code: "DZ", name: "Algeria", flag: "🇩🇿" },
  { code: "AD", name: "Andorra", flag: "🇦🇩" },
  { code: "AO", name: "Angola", flag: "🇦🇴" },
  { code: "AG", name: "Antigua and Barbuda", flag: "🇦🇬" },
  { code: "AR", name: "Argentina", flag: "🇦🇷" },
  { code: "AM", name: "Armenia", flag: "🇦🇲" },
  { code: "AU", name: "Australia", flag: "🇦🇺" },
  { code: "AT", name: "Austria", flag: "🇦🇹" },
  { code: "AZ", name: "Azerbaijan", flag: "🇦🇿" },
  { code: "BS", name: "Bahamas", flag: "🇧🇸" },
  { code: "BH", name: "Bahrain", flag: "🇧🇭" },
  { code: "BD", name: "Bangladesh", flag: "🇧🇩" },
  { code: "BB", name: "Barbados", flag: "🇧🇧" },
  { code: "BY", name: "Belarus", flag: "🇧🇾" },
  { code: "BE", name: "Belgium", flag: "🇧🇪" },
  { code: "BZ", name: "Belize", flag: "🇧🇿" },
  { code: "BJ", name: "Benin", flag: "🇧🇯" },
  { code: "BT", name: "Bhutan", flag: "🇧🇹" },
  { code: "BO", name: "Bolivia", flag: "🇧🇴" },
  { code: "BA", name: "Bosnia and Herzegovina", flag: "🇧🇦" },
  { code: "BW", name: "Botswana", flag: "🇧🇼" },
  { code: "BR", name: "Brazil", flag: "🇧🇷" },
  { code: "BN", name: "Brunei", flag: "🇧🇳" },
  { code: "BG", name: "Bulgaria", flag: "🇧🇬" },
  { code: "BF", name: "Burkina Faso", flag: "🇧🇫" },
  { code: "BI", name: "Burundi", flag: "🇧🇮" },
  { code: "KH", name: "Cambodia", flag: "🇰🇭" },
  { code: "CM", name: "Cameroon", flag: "🇨🇲" },
  { code: "CA", name: "Canada", flag: "🇨🇦" },
  { code: "CV", name: "Cape Verde", flag: "🇨🇻" },
  { code: "CF", name: "Central African Republic", flag: "🇨🇫" },
  { code: "TD", name: "Chad", flag: "🇹🇩" },
  { code: "CL", name: "Chile", flag: "🇨🇱" },
  { code: "CN", name: "China", flag: "🇨🇳" },
  { code: "CO", name: "Colombia", flag: "🇨🇴" },
  { code: "KM", name: "Comoros", flag: "🇰🇲" },
  { code: "CG", name: "Congo", flag: "🇨🇬" },
  { code: "CR", name: "Costa Rica", flag: "🇨🇷" },
  { code: "HR", name: "Croatia", flag: "🇭🇷" },
  { code: "CU", name: "Cuba", flag: "🇨🇺" },
  { code: "CY", name: "Cyprus", flag: "🇨🇾" },
  { code: "CZ", name: "Czech Republic", flag: "🇨🇿" },
  { code: "DK", name: "Denmark", flag: "🇩🇰" },
  { code: "DJ", name: "Djibouti", flag: "🇩🇯" },
  { code: "DM", name: "Dominica", flag: "🇩🇲" },
  { code: "DO", name: "Dominican Republic", flag: "🇩🇴" },
  { code: "EC", name: "Ecuador", flag: "🇪🇨" },
  { code: "EG", name: "Egypt", flag: "🇪🇬" },
  { code: "SV", name: "El Salvador", flag: "🇸🇻" },
  { code: "EE", name: "Estonia", flag: "🇪🇪" },
  { code: "SZ", name: "Eswatini", flag: "🇸🇿" },
  { code: "ET", name: "Ethiopia", flag: "🇪🇹" },
  { code: "FJ", name: "Fiji", flag: "🇫🇯" },
  { code: "FI", name: "Finland", flag: "🇫🇮" },
  { code: "FR", name: "France", flag: "🇫🇷" },
  { code: "GA", name: "Gabon", flag: "🇬🇦" },
  { code: "GM", name: "Gambia", flag: "🇬🇲" },
  { code: "GE", name: "Georgia", flag: "🇬🇪" },
  { code: "DE", name: "Germany", flag: "🇩🇪" },
  { code: "GH", name: "Ghana", flag: "🇬🇭" },
  { code: "GR", name: "Greece", flag: "🇬🇷" },
  { code: "GD", name: "Grenada", flag: "🇬🇩" },
  { code: "GT", name: "Guatemala", flag: "🇬🇹" },
  { code: "GN", name: "Guinea", flag: "🇬🇳" },
  { code: "GY", name: "Guyana", flag: "🇬🇾" },
  { code: "HT", name: "Haiti", flag: "🇭🇹" },
  { code: "HN", name: "Honduras", flag: "🇭🇳" },
  { code: "HU", name: "Hungary", flag: "🇭🇺" },
  { code: "IS", name: "Iceland", flag: "🇮🇸" },
  { code: "IN", name: "India", flag: "🇮🇳" },
  { code: "ID", name: "Indonesia", flag: "🇮🇩" },
  { code: "IR", name: "Iran", flag: "🇮🇷" },
  { code: "IQ", name: "Iraq", flag: "🇮🇶" },
  { code: "IE", name: "Ireland", flag: "🇮🇪" },
  { code: "IL", name: "Israel", flag: "🇮🇱" },
  { code: "IT", name: "Italy", flag: "🇮🇹" },
  { code: "JM", name: "Jamaica", flag: "🇯🇲" },
  { code: "JP", name: "Japan", flag: "🇯🇵" },
  { code: "JO", name: "Jordan", flag: "🇯🇴" },
  { code: "KZ", name: "Kazakhstan", flag: "🇰🇿" },
  { code: "KE", name: "Kenya", flag: "🇰🇪" },
  { code: "KW", name: "Kuwait", flag: "🇰🇼" },
  { code: "KG", name: "Kyrgyzstan", flag: "🇰🇬" },
  { code: "LA", name: "Laos", flag: "🇱🇦" },
  { code: "LV", name: "Latvia", flag: "🇱🇻" },
  { code: "LB", name: "Lebanon", flag: "🇱🇧" },
  { code: "LS", name: "Lesotho", flag: "🇱🇸" },
  { code: "LR", name: "Liberia", flag: "🇱🇷" },
  { code: "LY", name: "Libya", flag: "🇱🇾" },
  { code: "LI", name: "Liechtenstein", flag: "🇱🇮" },
  { code: "LT", name: "Lithuania", flag: "🇱🇹" },
  { code: "LU", name: "Luxembourg", flag: "🇱🇺" },
  { code: "MG", name: "Madagascar", flag: "🇲🇬" },
  { code: "MW", name: "Malawi", flag: "🇲🇼" },
  { code: "MY", name: "Malaysia", flag: "🇲🇾" },
  { code: "MV", name: "Maldives", flag: "🇲🇻" },
  { code: "ML", name: "Mali", flag: "🇲🇱" },
  { code: "MT", name: "Malta", flag: "🇲🇹" },
  { code: "MR", name: "Mauritania", flag: "🇲🇷" },
  { code: "MU", name: "Mauritius", flag: "🇲🇺" },
  { code: "MX", name: "Mexico", flag: "🇲🇽" },
  { code: "MD", name: "Moldova", flag: "🇲🇩" },
  { code: "MC", name: "Monaco", flag: "🇲🇨" },
  { code: "MN", name: "Mongolia", flag: "🇲🇳" },
  { code: "ME", name: "Montenegro", flag: "🇲🇪" },
  { code: "MA", name: "Morocco", flag: "🇲🇦" },
  { code: "MZ", name: "Mozambique", flag: "🇲🇿" },
  { code: "MM", name: "Myanmar", flag: "🇲🇲" },
  { code: "NA", name: "Namibia", flag: "🇳🇦" },
  { code: "NP", name: "Nepal", flag: "🇳🇵" },
  { code: "NL", name: "Netherlands", flag: "🇳🇱" },
  { code: "NZ", name: "New Zealand", flag: "🇳🇿" },
  { code: "NI", name: "Nicaragua", flag: "🇳🇮" },
  { code: "NE", name: "Niger", flag: "🇳🇪" },
  { code: "NG", name: "Nigeria", flag: "🇳🇬" },
  { code: "MK", name: "North Macedonia", flag: "🇲🇰" },
  { code: "NO", name: "Norway", flag: "🇳🇴" },
  { code: "OM", name: "Oman", flag: "🇴🇲" },
  { code: "PK", name: "Pakistan", flag: "🇵🇰" },
  { code: "PA", name: "Panama", flag: "🇵🇦" },
  { code: "PG", name: "Papua New Guinea", flag: "🇵🇬" },
  { code: "PY", name: "Paraguay", flag: "🇵🇾" },
  { code: "PE", name: "Peru", flag: "🇵🇪" },
  { code: "PH", name: "Philippines", flag: "🇵🇭" },
  { code: "PL", name: "Poland", flag: "🇵🇱" },
  { code: "PT", name: "Portugal", flag: "🇵🇹" },
  { code: "QA", name: "Qatar", flag: "🇶🇦" },
  { code: "RO", name: "Romania", flag: "🇷🇴" },
  { code: "RU", name: "Russia", flag: "🇷🇺" },
  { code: "RW", name: "Rwanda", flag: "🇷🇼" },
  { code: "WS", name: "Samoa", flag: "🇼🇸" },
  { code: "SM", name: "San Marino", flag: "🇸🇲" },
  { code: "SA", name: "Saudi Arabia", flag: "🇸🇦" },
  { code: "SN", name: "Senegal", flag: "🇸🇳" },
  { code: "RS", name: "Serbia", flag: "🇷🇸" },
  { code: "SC", name: "Seychelles", flag: "🇸🇨" },
  { code: "SL", name: "Sierra Leone", flag: "🇸🇱" },
  { code: "SG", name: "Singapore", flag: "🇸🇬" },
  { code: "SK", name: "Slovakia", flag: "🇸🇰" },
  { code: "SI", name: "Slovenia", flag: "🇸🇮" },
  { code: "SO", name: "Somalia", flag: "🇸🇴" },
  { code: "ZA", name: "South Africa", flag: "🇿🇦" },
  { code: "KR", name: "South Korea", flag: "🇰🇷" },
  { code: "SS", name: "South Sudan", flag: "🇸🇸" },
  { code: "ES", name: "Spain", flag: "🇪🇸" },
  { code: "LK", name: "Sri Lanka", flag: "🇱🇰" },
  { code: "SD", name: "Sudan", flag: "🇸🇩" },
  { code: "SR", name: "Suriname", flag: "🇸🇷" },
  { code: "SE", name: "Sweden", flag: "🇸🇪" },
  { code: "CH", name: "Switzerland", flag: "🇨🇭" },
  { code: "SY", name: "Syria", flag: "🇸🇾" },
  { code: "TW", name: "Taiwan", flag: "🇹🇼" },
  { code: "TJ", name: "Tajikistan", flag: "🇹🇯" },
  { code: "TZ", name: "Tanzania", flag: "🇹🇿" },
  { code: "TH", name: "Thailand", flag: "🇹🇭" },
  { code: "TG", name: "Togo", flag: "🇹🇬" },
  { code: "TO", name: "Tonga", flag: "🇹🇴" },
  { code: "TT", name: "Trinidad and Tobago", flag: "🇹🇹" },
  { code: "TN", name: "Tunisia", flag: "🇹🇳" },
  { code: "TR", name: "Turkey", flag: "🇹🇷" },
  { code: "TM", name: "Turkmenistan", flag: "🇹🇲" },
  { code: "UG", name: "Uganda", flag: "🇺🇬" },
  { code: "UA", name: "Ukraine", flag: "🇺🇦" },
  { code: "AE", name: "United Arab Emirates", flag: "🇦🇪" },
  { code: "GB", name: "United Kingdom", flag: "🇬🇧" },
  { code: "US", name: "United States", flag: "🇺🇸" },
  { code: "UY", name: "Uruguay", flag: "🇺🇾" },
  { code: "UZ", name: "Uzbekistan", flag: "🇺🇿" },
  { code: "VU", name: "Vanuatu", flag: "🇻🇺" },
  { code: "VA", name: "Vatican City", flag: "🇻🇦" },
  { code: "VE", name: "Venezuela", flag: "🇻🇪" },
  { code: "VN", name: "Vietnam", flag: "🇻🇳" },
  { code: "YE", name: "Yemen", flag: "🇾🇪" },
  { code: "ZM", name: "Zambia", flag: "🇿🇲" },
  { code: "ZW", name: "Zimbabwe", flag: "🇿🇼" },
]
// Figma "Edit Bank Info" — seven country/region states. Asia uses the Swiss
// flag as drawn in the design file.
const EDIT_BANK_COUNTRIES: { code: string; name: string; flag: string }[] = [
  { code: "US", name: "United States", flag: "🇺🇸" },
  { code: "DE", name: "Europe", flag: "🇪🇺" },
  { code: "IN", name: "India", flag: "🇮🇳" },
  { code: "AU", name: "Australia", flag: "🇦🇺" },
  { code: "GB", name: "United Kingdom", flag: "🇬🇧" },
  { code: "JP", name: "Japan", flag: "🇯🇵" },
  { code: "SG", name: "Asia", flag: "🌏" },
]
function editBankRegion(country: string): BankRegion {
  return country ? detectBankRegion(country) : "US"
}
function editBankNamePlaceholder(country: string): string {
  switch (editBankRegion(country)) {
    case "SEPA":
      return "e.g. Bank of Europe"
    case "IN":
      return "e.g. ICICI Bank"
    case "AU":
      return "e.g. Westpac"
    case "GB":
      return "e.g. Bank of London"
    case "JP":
      return "e.g. 三井住友銀行 (Mitsui Sumitomo)"
    case "SWIFT":
      return "e.g. DBS Bank"
    default:
      return "e.g. Bank of America"
  }
}
function editBankAccountPlaceholder(country: string): string {
  switch (editBankRegion(country)) {
    case "IN":
      return "Enter valid Account Number (9-18 digits) here"
    case "AU":
      return "Enter 6-10 digit Account Number"
    case "GB":
      return "Enter 8 digit Account Number here"
    case "JP":
      return "Enter 7 digit Account Number"
    case "SWIFT":
      return "Enter your full Account Number"
    default:
      return "Up to 17 digits"
  }
}
function createBlankEditBankForm(bankCountry = "") {
  return {
    bankAccountName: "",
    bankAccountNumber: "",
    bankAccountNumberConfirm: "",
    bankRoutingNumber: "",
    bankSortCode: "",
    bankIfscCode: "",
    bankBsbNumber: "",
    bankInstitutionNumber: "",
    bankTransitNumber: "",
    bankIban: "",
    bankSwiftBic: "",
    bankCode: "",
    bankBranchCode: "",
    bankCountry,
  }
}
const isValidAbaRouting = (routing: string) => {
  if (!/^\d{9}$/.test(routing)) return false
  const d = routing.split("").map(Number)
  return (
    (3 * (d[0] + d[3] + d[6]) +
      7 * (d[1] + d[4] + d[7]) +
      1 * (d[2] + d[5] + d[8])) %
      10 ===
    0
  )
}
const isValidSortCode = (v: string) => /^\d{6}$/.test(v.replace(/-/g, ""))
const isValidIfsc = (v: string) =>
  /^[A-Z]{4}0[A-Z0-9]{6}$/.test(v.toUpperCase())
const isValidBsb = (v: string) => /^\d{6}$/.test(v.replace(/-/g, ""))
const isValidCaInstitution = (v: string) => /^\d{3}$/.test(v)
const isValidCaTransit = (v: string) => /^\d{5}$/.test(v)
const isValidJpBankCode = (v: string) => /^\d{4}$/.test(v)
const isValidJpBranchCode = (v: string) => /^\d{3}$/.test(v)
const isValidSwiftBic = (v: string) =>
  /^[A-Z]{4}[A-Z]{2}[A-Z0-9]{2}([A-Z0-9]{3})?$/.test(v.toUpperCase())
const isValidIban = (iban: string) => {
  const clean = iban.replace(/\s/g, "").toUpperCase()
  if (!/^[A-Z]{2}\d{2}[A-Z0-9]{11,30}$/.test(clean)) return false
  const rearranged = clean.slice(4) + clean.slice(0, 4)
  const numeric = rearranged
    .split("")
    .map((c) => (isNaN(Number(c)) ? (c.charCodeAt(0) - 55).toString() : c))
    .join("")
  let remainder = BigInt(0)
  for (const chunk of numeric.match(/.{1,9}/g) ?? [])
    remainder = BigInt(remainder.toString() + chunk) % BigInt(97)
  return remainder === BigInt(1)
}
const isValidClabe = (clabe: string) => {
  if (!/^\d{18}$/.test(clabe)) return false
  const d = clabe.split("").map(Number)
  const weights = [3, 7, 1, 3, 7, 1, 3, 7, 1, 3, 7, 1, 3, 7, 1, 3, 7]
  const sum = weights.reduce((acc, w, i) => acc + ((w * d[i]) % 10), 0)
  return (10 - (sum % 10)) % 10 === d[17]
}
const isValidCnaps = (v: string) => /^\d{12}$/.test(v)
const isValidCnAccountNumber = (v: string) => /^\d{16,19}$/.test(v)
const isValidBik = (v: string) => /^\d{9}$/.test(v)
const isValidRuAccountNumber = (v: string) => /^\d{20}$/.test(v)
function isEditBankInfoComplete(form: ReturnType<typeof createBlankEditBankForm>) {
  const region = editBankRegion(form.bankCountry)
  if (!form.bankAccountName.trim()) return false
  if (
    region !== "SEPA" &&
    form.bankAccountNumberConfirm !== form.bankAccountNumber
  )
    return false
  switch (region) {
    case "US":
      return (
        !!form.bankAccountNumber.trim() &&
        isValidAbaRouting(form.bankRoutingNumber.replace(/\D/g, ""))
      )
    case "SEPA":
      return isValidIban(form.bankIban) && isValidSwiftBic(form.bankSwiftBic)
    case "IN":
      return (
        /^\d{9,18}$/.test(form.bankAccountNumber) &&
        isValidIfsc(form.bankIfscCode)
      )
    case "AU":
      return (
        /^\d{6,10}$/.test(form.bankAccountNumber) &&
        isValidBsb(form.bankBsbNumber)
      )
    case "GB":
      return (
        /^\d{8}$/.test(form.bankAccountNumber) &&
        isValidSortCode(form.bankSortCode)
      )
    case "JP":
      return (
        isValidJpBankCode(form.bankCode) &&
        isValidJpBranchCode(form.bankBranchCode) &&
        /^\d{7}$/.test(form.bankAccountNumber)
      )
    case "SWIFT":
      return (
        !!form.bankAccountNumber.trim() && isValidSwiftBic(form.bankSwiftBic)
      )
    default:
      return (
        !!form.bankAccountNumber.trim() && isValidSwiftBic(form.bankSwiftBic)
      )
  }
}

// US-63: bank-validation.service.ts throws these exact ERR_BANK_* codes as
// errorCode — mapped here to a friendly, field-specific checklist instead of
// showing the raw code or a generic "invalid details" message.
const BANK_FIELD_ERROR_MESSAGES: Record<string, string> = {
  ERR_BANK_ACCOUNT_NAME_INVALID:
    "Account holder name is required (max 100 characters).",
  ERR_BANK_REGION_FIELD_MISMATCH: "Select a country before continuing.",
  ERR_BANK_ROUTING_INVALID:
    "Routing number must be a valid 9-digit ABA number.",
  ERR_BANK_ACCOUNT_NUMBER_INVALID:
    "Account number format is invalid for the selected country.",
  ERR_BANK_CURRENCY_MISMATCH:
    "Currency does not match what’s expected for this country.",
  ERR_BANK_IBAN_INVALID: "IBAN is invalid — double-check for typos.",
  ERR_BANK_SWIFT_INVALID: "SWIFT/BIC code is invalid.",
  ERR_BANK_SORT_CODE_INVALID: "Sort code must be 6 digits.",
  ERR_BANK_IFSC_INVALID:
    "IFSC code is invalid — format is 4 letters, 0, then 6 characters.",
  ERR_BANK_BSB_INVALID: "BSB number must be 6 digits.",
  ERR_BANK_CODE_INVALID: "Bank code must be 4 digits.",
  ERR_BANK_BRANCH_CODE_INVALID: "Branch code must be 3 digits.",
  ERR_BANK_INSTITUTION_INVALID: "Institution number must be 3 digits.",
  ERR_BANK_TRANSIT_INVALID: "Transit number must be 5 digits.",
  ERR_BANK_CLABE_INVALID: "CLABE must be 18 digits.",
  ERR_BANK_CNAPS_INVALID: "CNAPS code must be 12 digits.",
  ERR_BANK_BIK_INVALID: "BIK must be 9 digits.",
  ERR_DEPOSIT_COUNTRY_RESTRICTED:
    "Payouts to this country are not currently supported.",
  ERR_DEPOSIT_METHOD_DUPLICATE: "This account is already linked.",
  ERR_DEPOSIT_METHOD_VERIFIED_LOCKED:
    "A verified account can’t be edited — remove it and add a new one instead.",
  ERR_DEPOSIT_METHOD_NOT_EDITABLE:
    "Bank details can only be edited for manually-added bank accounts.",
}
const bankErrorMessage = (data: any): string =>
  BANK_FIELD_ERROR_MESSAGES[data?.errorCode] ??
  data?.message ??
  "Please check your details and try again."

// ─── Shared payout-service helpers (US-22–26) ────────────────────────────────
// Routed through api-gateway, not payout-service directly: access_token is an
// HttpOnly cookie (invisible to JS), so a manually-read "Bearer <token>" header
// was always empty. The gateway reads the httpOnly cookie server-side and
// forwards it as a real Authorization header — credentials:'include' is what
// gets the cookie there in the first place (cross-port fetch, so it's not
// automatic without it).
const PAYOUT_SERVICE_BASE = `${getPublicApiUrl()}/v1`
async function payoutFetch(
  path: string,
  init: RequestInit = {}
): Promise<Response> {
  return fetch(`${PAYOUT_SERVICE_BASE}${path}`, {
    ...init,
    credentials: "include",
  })
}
interface DepositMethodOption {
  id: string
  methodType: string
  displayLabel: string | null
  nickname: string | null
  isDefault: boolean
  verificationStatus: string
  reauthRequired?: boolean
}

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
  /** Inline secondary next to the label (e.g. "Tuesday, Aug 20th" on Next Payout). */
  aside?: React.ReactNode
  amount: string
  // US-102: defaults to "$" since every existing caller besides the Earnings
  // tab's own summary cards is genuinely USD-denominated payout-service data
  // (field names like totalPaidOutUsd) — only that caller passes a resolved
  // currencySymbol() for its region-currency amount.
  symbol?: string
  // Negative amounts (refunds/adjustments) render "-$X", not "$-X" — the
  // sign has to sit before the symbol span, not get swallowed into `amount`.
  negative?: boolean
  change?: { value: string; direction: "up" | "down"; label: string }
  extra?: React.ReactNode
  status?: string
  /** Right-bottom gray meta (e.g. "Since Jun 24, 2021"). */
  meta?: React.ReactNode
  /** muted = Earnings gray labels; emphasis = Payouts navy labels. */
  visual?: "muted" | "emphasis"
}

// Earnings amounts in Figma: gray "$" + large navy whole + smaller cents
// top-aligned to the whole digits (not baseline, not uniform text).
function splitAmountParts(
  amount: string | number | null | undefined
): { whole: string; cents: string } | null {
  const formatted = formatAmountWithCents(amount)
  if (formatted === "—") return null
  const [whole, cents = "00"] = formatted.split(".")
  return { whole, cents }
}

function FigmaAmountDisplay({
  whole,
  cents,
  symbol = "$",
  sign = "",
  size = "md",
  // Available for Withdrawal: cents match the gray "$". Everywhere else: navy.
  centsMuted = false,
  // Previous Payout: whole amount + cents are gray (#667085).
  muted = false,
}: {
  whole: string
  cents?: string | null
  symbol?: string
  sign?: string
  /** lg/md = Overview; sm = compact; dashboard = talent-dashboard My Earnings */
  size?: "lg" | "md" | "sm" | "dashboard"
  centsMuted?: boolean
  muted?: boolean
}) {
  // Talent-dashboard /earnings cards: same markup as My Earnings on
  // /talent-dashboard (DashboardAmount).
  if (size === "dashboard") {
    return (
      <DashboardAmount
        whole={whole}
        cents={cents}
        symbol={symbol}
        sign={sign}
        muted={muted}
      />
    )
  }

  // Whole large; cents medium; "$" smallest — all same baseline.
  // Overview lg/md share one $ size so Today matches Week/Month/Direct Deposit;
  // only the digit scale differs.
  const wholeClass =
    size === "lg"
      ? "text-[38px] leading-none"
      : size === "md"
        ? "text-[32px] leading-none"
        : "text-[28px] leading-none"
  const symbolClass =
    size === "sm" ? "text-[16px] leading-none" : "text-[18px] leading-none"
  const centsClass =
    size === "lg"
      ? "text-[22px] leading-none"
      : size === "md"
        ? "text-[18px] leading-none"
        : "text-[16px] leading-none"
  const amountColor = muted ? "text-[#667085]" : "text-[#22376B]"
  const centsColor = muted
    ? "font-semibold text-[#667085]"
    : centsMuted
      ? "font-normal text-[#98A2B3]"
      : "font-semibold text-[#22376B]"

  return (
    <span
      className={cn(
        "inline-flex items-baseline whitespace-nowrap font-semibold tabular-nums",
        amountColor
      )}
    >
      {sign ? <span className={wholeClass}>{sign}</span> : null}
      <span className={cn("mr-1 font-normal text-[#98A2B3]", symbolClass)}>
        {symbol}
      </span>
      <span className={wholeClass}>{whole}</span>
      {cents != null && cents !== "" && (
        <span className={cn(centsColor, centsClass)}>.{cents}</span>
      )}
    </span>
  )
}

function FigmaAmount({
  amount,
  symbol = "$",
  size = "md",
  centsMuted = false,
  muted = false,
}: {
  amount: string | number | null | undefined
  symbol?: string
  size?: "lg" | "md" | "sm" | "dashboard"
  centsMuted?: boolean
  muted?: boolean
}) {
  const parts = splitAmountParts(amount)
  if (!parts) {
    return (
      <span
        className={cn(
          "font-semibold",
          muted ? "text-[#667085]" : "text-[#22376B]"
        )}
      >
        —
      </span>
    )
  }
  return (
    <FigmaAmountDisplay
      whole={parts.whole}
      cents={parts.cents}
      symbol={symbol}
      sign={amountSign(amount)}
      size={size}
      centsMuted={centsMuted}
      muted={muted}
    />
  )
}

// StatCard amounts arrive already formatted ("2,460.00") — split only, never
// re-parse, or locale commas break parseFloat ("2,460.00" → 2).
function StatCardAmount({
  symbol,
  amount,
  negative,
}: {
  symbol: string
  amount: string
  negative?: boolean
}) {
  if (amount === "—" || amount === "-") {
    return <span className="font-semibold text-[#22376B]">—</span>
  }
  const dot = amount.lastIndexOf(".")
  const whole = dot >= 0 ? amount.slice(0, dot) : amount
  const cents = dot >= 0 ? amount.slice(dot + 1) : null
  return (
    <FigmaAmountDisplay
      whole={whole}
      cents={cents}
      symbol={symbol}
      sign={negative ? "-" : ""}
      // Same $ / whole / cents scale as My Earnings on /talent-dashboard.
      size="dashboard"
    />
  )
}

/** Figma deposit-method confirms: title + body + italic note + footer (✕ Cancel | outlined CTA). */
function DepositMethodConfirmDialog({
  open,
  onOpenChange,
  title,
  body,
  note,
  confirmLabel,
  onConfirm,
  confirmDisabled = false,
  confirming = false,
  children,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  body: string
  note?: string
  confirmLabel: string
  onConfirm: () => void | Promise<void>
  confirmDisabled?: boolean
  confirming?: boolean
  children?: React.ReactNode
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[420px] p-0 gap-0 overflow-hidden">
        <div className="px-6 pt-6 pb-5">
          <DialogTitle className="text-lg font-bold text-dark-blue-400 leading-tight">
            {title}
          </DialogTitle>
          <p className="mt-2 text-sm text-gray-500">{body}</p>
          {note ? (
            <p className="mt-2 text-sm italic text-gray-500">{note}</p>
          ) : null}
          {children}
        </div>
        <div className="flex items-center justify-between gap-3 border-t border-gray-200 px-6 py-4">
          <button
            type="button"
            className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-600 disabled:opacity-50"
            disabled={confirming}
            onClick={() => onOpenChange(false)}
          >
            <X className="size-4" />
            Cancel
          </button>
          <Button
            variant="outlined"
            visual="gray"
            size="sm"
            className="font-semibold text-dark-blue-400 border-gray-300 hover:bg-gray-50"
            disabled={confirmDisabled || confirming}
            onClick={() => void onConfirm()}
          >
            {confirmLabel}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

const StatCard = ({
  label,
  sublabel,
  aside,
  amount,
  symbol = "$",
  negative,
  change,
  extra,
  status,
  meta,
  visual = "muted",
}: StatCardProps) => {
  const hasBottomLeft = !!extra
  const hasBottomRight = !!(status || change || meta)
  const hasBottom = hasBottomLeft || hasBottomRight

  return (
    // Figma: exact 2×2 corners — top row items-center (label ↔ amount),
    // bottom row items-center (extra ↔ status/trend/meta), equal card heights.
    <div className="flex-1 h-full min-w-0 rounded-lg border border-gray-200 bg-white p-6 shadow-[0px_1px_4px_0px_rgba(0,0,0,.03)] flex flex-col gap-3">
      <div className="flex items-center justify-between gap-4 min-w-0">
        <div className="min-w-0 flex-1">
          {/* Figma "Frame 1948757701": label + aside share one fixed row,
              never wrapping to a second line — flex-wrap here let a long
              date (e.g. "Sunday, Sep 27th") drop onto its own row, making
              this card's top section taller than its two siblings even
              though all three share the same h-full/items-stretch height. */}
          <div className="flex items-baseline gap-x-2 min-w-0">
            <p
              className={cn(
                "text-sm whitespace-nowrap shrink-0",
                visual === "emphasis"
                  ? "font-semibold text-[#22376B]"
                  : "font-medium text-[#667085]"
              )}
            >
              {label}
            </p>
            {aside ? (
              <span className="text-sm text-[#667085] truncate">{aside}</span>
            ) : null}
          </div>
          {sublabel && !aside ? (
            <p className="text-xs text-[#98A2B3] mt-0.5 truncate">{sublabel}</p>
          ) : null}
        </div>
        <div className="shrink-0">
          <StatCardAmount symbol={symbol} amount={amount} negative={negative} />
        </div>
      </div>

      {hasBottom ? (
        <div className="mt-auto flex items-center justify-between gap-4 min-w-0">
          <div className="min-w-0 flex-1 text-sm text-[#667085] truncate">
            {extra ?? null}
          </div>
          <div className="shrink-0 flex items-center justify-end gap-1 text-sm">
            {status ? (
              <p className="font-medium text-primary-500 whitespace-nowrap">
                {status}
              </p>
            ) : null}
            {change ? (
              <div className="inline-flex items-center gap-1 whitespace-nowrap">
                <span
                  className={cn(
                    "inline-flex items-center gap-0.5 font-semibold",
                    change.direction === "up"
                      ? "text-success-500"
                      : "text-[#FF3B30]"
                  )}
                >
                  {change.direction === "up" ? (
                    <ArrowUp className="size-3.5" />
                  ) : (
                    <ArrowDown className="size-3.5" />
                  )}
                  {change.value}
                </span>
                {change.label ? (
                  <span className="font-normal text-[#667085]">
                    {change.label}
                  </span>
                ) : null}
              </div>
            ) : null}
            {meta ? (
              <p className="text-[#667085] whitespace-nowrap">{meta}</p>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  )
}

// Figma promo-banner carousel — static placeholder copy only. None of these
// offers exist as real features in this codebase yet (no Marketeq Visa Card
// product, no cashback program, no referral program, no TurboTax
// integration); this is UI shell for when those features ship, not live data.
const PROMO_BANNERS: { id: string; emoji: string; content: React.ReactNode }[] =
  [
    {
      id: "visa-card",
      emoji: "💳",
      content: (
        <>
          Get faster payouts and cashback with your{" "}
          <span className="font-semibold text-success-600">
            Marketeq Visa Card
          </span>
          . Activate today!
        </>
      ),
    },
    {
      id: "cashback",
      emoji: "☕",
      content: (
        <>
          Earn{" "}
          <span className="font-semibold text-success-600">
            5% Cashback on Starbucks
          </span>{" "}
          purchases with your Marketeq Card.
        </>
      ),
    },
    {
      id: "referral",
      emoji: "🎉",
      content: (
        <>
          <span className="font-semibold text-success-600">
            Refer 2 more friends
          </span>{" "}
          to unlock a $15 gift card.
        </>
      ),
    },
    {
      id: "turbotax",
      emoji: "🧾",
      content: (
        <>
          <span className="font-semibold text-success-600">Get 15% off</span>{" "}
          TurboTax for freelancers, ends this month!
        </>
      ),
    },
  ]

// "first...last" masking for plain IDs (no @) — used for Wise/Payoneer
// account identifiers, the same masking style bank account numbers use
// elsewhere in this list (e.g. "...4553").
const maskId = (value: string): string =>
  value.length > 6 ? `${value.slice(0, 1)}...${value.slice(-3)}` : value

// The deposit-methods LIST endpoint doesn't return the per-provider raw
// fields (wiseAccountId/payoneerPayeeId/cryptoAddress) — only
// displayLabel (e.g. "Wise (customer123@example.com)" for OAuth methods,
// "TRANSAK ETH ••••1111" for crypto). Fall back to parsing that when the
// raw field is missing, so the sub-label isn't just blank.
const emailFromDisplayLabel = (
  displayLabel?: string | null
): string | undefined => displayLabel?.match(/\(([^)]+@[^)]+)\)/)?.[1]

// Shared "Name masked-detail" formatter for method dropdowns/rows outside
// OverviewTab (e.g. PayoutScheduleDialog) that don't have getMethodLabel's
// full {name, sub} split — same masking rules, single display string.
export const formatMethodOptionLabel = (m: any): string => {
  if (m.methodType === "WISE") {
    const id = m.wiseAccountId ?? emailFromDisplayLabel(m.displayLabel)
    return [m.nickname || "Wise", id ? maskId(id) : ""]
      .filter(Boolean)
      .join(" ")
  }
  if (m.methodType === "PAYONEER") {
    const id = m.payoneerPayeeId ?? emailFromDisplayLabel(m.displayLabel)
    return [m.nickname || "Payoneer", id ? maskId(id) : ""]
      .filter(Boolean)
      .join(" ")
  }
  if (m.methodType === "CRYPTO") {
    const address = m.cryptoAddress
      ? m.cryptoAddress.slice(0, 6) + "..." + m.cryptoAddress.slice(-4)
      : (m.displayLabel ?? "")
    return [m.nickname || m.cryptoProvider || "Crypto Wallet", address]
      .filter(Boolean)
      .join(" ")
  }
  // Bank methods (and anything else without a dedicated branch above): a
  // nickname must not swallow the masked account number — combine them,
  // same as splitMethodLabel() below does for this exact case.
  if (m.nickname) {
    return `${m.nickname} ${m.displayLabel?.replace("Bank ", "") || ""}`.trim()
  }
  return m.displayLabel || m.methodType
}

function splitMethodLabel(m: {
  methodType?: string
  nickname?: string | null
  displayLabel?: string | null
  wiseAccountId?: string | null
  payoneerPayeeId?: string | null
  cryptoAddress?: string | null
  cryptoProvider?: string | null
}): { name: string; sub: string } {
  if (m.methodType === "WISE") {
    const id = m.wiseAccountId ?? emailFromDisplayLabel(m.displayLabel)
    return { name: m.nickname || "Wise", sub: id ? maskId(id) : "" }
  }
  if (m.methodType === "PAYONEER") {
    const id = m.payoneerPayeeId ?? emailFromDisplayLabel(m.displayLabel)
    return { name: m.nickname || "Payoneer", sub: id ? maskId(id) : "" }
  }
  if (m.methodType === "CRYPTO") {
    const address = m.cryptoAddress
      ? m.cryptoAddress.slice(0, 6) + "..." + m.cryptoAddress.slice(-4)
      : (m.displayLabel ?? "")
    return {
      name: m.nickname || m.cryptoProvider || "Crypto Wallet",
      sub: address,
    }
  }
  const label = m.nickname
    ? `${m.nickname} ${m.displayLabel?.replace("Bank ", "") || ""}`.trim()
    : m.displayLabel || "Bank Account"
  const maskMatch = label.match(/^(.*?)\s*(••••\d+|\.{3,4}\d+)$/)
  if (maskMatch) {
    return {
      name: maskMatch[1].trim(),
      sub: maskMatch[2].replace(/•+/g, "..."),
    }
  }
  return { name: label, sub: "" }
}

function FilterMethodIcon({
  method,
}: {
  method: { methodType?: string; nickname?: string | null; displayLabel?: string | null; cryptoProvider?: string | null }
}) {
  const wrap = (child: React.ReactNode) => (
    <span className="flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-gray-200 bg-white">
      {child}
    </span>
  )
  if (method.methodType === "WISE")
    return wrap(<WiseGlyphV2 className="size-5" />)
  if (method.methodType === "CRYPTO")
    return (
      <CryptoProviderIcon
        provider={method.cryptoProvider || ""}
        className="size-8"
      />
    )
  if (
    method.methodType === "MARKETEQ_DEBIT_CARD" ||
    method.methodType === "TEQ_COIN"
  ) {
    return wrap(<BankIcon className="size-5 text-primary-600" />)
  }
  const bankName = method.nickname || method.displayLabel || ""
  return <BankLogo bankName={bankName} size={32} />
}

// ─── Overview Tab ───────────────────────────────────────────────────────

export const OverviewTab = ({
  onNavigateTab,
  onEditPayoutSchedule,
  onOpenHelp,
  openAddMethodSignal,
}: {
  onNavigateTab?: (tab: string) => void
  onEditPayoutSchedule?: () => void
  onOpenHelp?: () => void
  openAddMethodSignal?: number
}) => {
  const router = useRouter()
  const { toast } = useToast()
  const { user } = useAuth()
  // Figma's promo-banner carousel (Visa Card, cashback, referral, TurboTax) —
  // no backing features exist yet for any of these (no card product, cashback
  // program, referral program, or TurboTax integration in this codebase), so
  // this is UI shell only: static placeholder copy, not wired to any real
  // offer/eligibility data. Swap in real content once those features exist.
  const [withdrawOpen, setWithdrawOpen] = React.useState(false)
  const [summary, setSummary] = React.useState<EarningsSummary | null>(null)
  // US-12/US-13/US-14: this endpoint returns all four cards (Today/This Week/
  // This Month/All Time) in one response, not four independent requests as the
  // spec assumes — so a single shared error + retry is the honest equivalent
  // of the spec's "per-card retry", not four separately-failing cards.
  const [summaryError, setSummaryError] = React.useState(false)
  const [balance, setBalance] = React.useState<BalanceResponse | null>(null)
  // US-05/US-06: a genuine load failure (500/503) must render a distinct error
  // state with retry — never conflated with a real $0 balance, and never left
  // stuck on the loading placeholder forever with only a console.error.
  const [balanceError, setBalanceError] = React.useState(false)
  // Doc07 Domain 7: next_payout_date is derived server-side (schedule + day + current
  // date) — never computed client-side. No projected amount exists server-side either
  // (the schedule doesn't precompute a future payout total), so only the date is shown.
  const [scheduleNextRunAt, setScheduleNextRunAt] = React.useState<
    string | null
  >(null)
  const [scheduleLoading, setScheduleLoading] = React.useState(true)
  // US-100/US-101: previously a fetch failure here silently left
  // scheduleNextRunAt at its initial null and only logged to console — a
  // real load failure rendered identically to "No payout scheduled" (a
  // legitimate empty state), with no way to retry.
  const [scheduleError, setScheduleError] = React.useState(false)
  // Figma "Available for Withdrawal" tooltip claims this amount excludes the
  // reserve balance — it didn't (was showing raw availableBalanceDisplay) and
  // the copy hardcoded a literal "$150" regardless of the contractor's actual
  // configured reserve. Both fixed below using the real reserveUsd.
  const [reserveUsd, setReserveUsd] = React.useState(0)
  // Sourced from the real payout history (GET /v1/payouts?status=completed) — the most
  // recently settled payout, not a static mock value.
  const [previousPayout, setPreviousPayout] = React.useState<{
    amountUsd: string
    methodLabel: string | null
    settledAt: string
  } | null>(null)
  const [previousPayoutLoading, setPreviousPayoutLoading] = React.useState(true)
  // US-100/US-101: same conflation risk as scheduleError above — a failed
  // fetch previously rendered identically to "No previous payouts yet".
  const [previousPayoutError, setPreviousPayoutError] = React.useState(false)
  // "Recent Activity" has no dedicated activity-feed endpoint in payout-service — this
  // derives real entries from the same payout history list rather than showing mock data.
  const [recentActivity, setRecentActivity] = React.useState<
    {
      id: string
      title: string
      description: string
      time: string
      kind: "scheduled" | "sent" | "processing" | "failed" | "cancelled"
    }[]
  >([])
  const [recentActivityLoading, setRecentActivityLoading] = React.useState(true)
  // US-100/US-101: same conflation risk — a failed fetch previously rendered
  // identically to a genuinely empty activity feed.
  const [recentActivityError, setRecentActivityError] = React.useState(false)

  // Recent Earnings has no visible UI in the Overview tab anymore — this data
  // is still fetched/polled purely as the source for the US-92 reversal-toast
  // detection effect below (diffs entry.status across polls).
  const [recentEarnings, setRecentEarnings] = React.useState<EarningsRow[]>([])

  const loadRecentEarnings = React.useCallback(() => {
    // EarningsQueryDto only accepts limit values of 10/25/50/100 — 5 400s.
    // Request the minimum valid page size and slice to the first 5.
    getEarnings({
      view: "daily",
      limit: 10,
      sortBy: "workStartAt",
      sortOrder: "desc",
    })
      .then((res) => setRecentEarnings(res.data.slice(0, 5)))
      .catch((e) => console.error("Recent earnings fetch failed:", e))
  }, [])

  // Sourced from real payout history — no dedicated activity-feed endpoint
  // exists in payout-service; see toActivityItem().
  const loadRecentActivity = React.useCallback(async () => {
    setRecentActivityError(false)
    try {
      const res = await payoutFetch(`/payouts?page=1&pageSize=8`)
      if (!res.ok) {
        setRecentActivityError(true)
        return
      }
      const d = await res.json()
      setRecentActivity((d.payouts ?? []).map((p: any) => toActivityItem(p)))
    } catch (e) {
      console.error("Failed to fetch recent activity", e)
      setRecentActivityError(true)
    } finally {
      setRecentActivityLoading(false)
    }
  }, [])

  // US-93 persistent failure banner — queried directly by status rather than
  // derived from the 8-item recentActivity feed above. A failed withdrawal
  // older than the 8 most-recent payouts (e.g. several cancelled test payouts
  // pushed it out) was silently never surfacing even though it was real and
  // still unresolved.
  const [failedPayout, setFailedPayout] = React.useState<{
    id: string
    title: string
  } | null>(null)
  const loadFailedPayout = React.useCallback(async () => {
    try {
      const res = await payoutFetch(`/payouts?status=failed&page=1&pageSize=1`)
      if (!res.ok) return
      const d = await res.json()
      const latest = (d.payouts ?? [])[0]
      setFailedPayout(latest ? toActivityItem(latest) : null)
    } catch (e) {
      console.error("Failed to fetch failed-payout banner state", e)
    }
  }, [])

  // ── Deposit Methods state ──────────────────────────────────────
  const [methods, setMethods] = React.useState<any[]>([])
  const [methodsLoading, setMethodsLoading] = React.useState(true)
  // US-100/US-101: same conflation risk — a failed fetch previously rendered
  // identically to a genuinely empty deposit-methods list.
  const [methodsError, setMethodsError] = React.useState(false)
  const [showAddMethod, setShowAddMethod] = React.useState(false)
  const [canAddMore, setCanAddMore] = React.useState(true)
  // "Add New Deposit Method" clicked from inside PayoutScheduleDialog (a
  // sibling component) bumps openAddMethodSignal — open the modal in response,
  // but not on initial mount. A "have I seen this value before" ref (rather
  // than a one-shot "isFirst" boolean) so this stays correct under React
  // StrictMode's double-invoked mount effects in dev: both invocations compare
  // against the same stored value and agree, instead of the first invocation
  // flipping a flag that makes the second one misfire.
  const lastAddMethodSignal = React.useRef(openAddMethodSignal)
  React.useEffect(() => {
    if (openAddMethodSignal === lastAddMethodSignal.current) return
    lastAddMethodSignal.current = openAddMethodSignal
    setVerifyState(null)
    setShowAddMethod(true)
  }, [openAddMethodSignal])
  // SCR-20: feature-flag state fetched from the server (GET /deposit-methods/config),
  // never read from a frontend build-time env var — a stale build could otherwise
  // show/hide options the backend disagrees with.
  const [debitCardEnabled, setDebitCardEnabled] = React.useState(false)
  // SCR-01/SCR-18: KYC gate must block Add Method too, not just withdrawal —
  // reuses the same fail-closed gate-check endpoint the withdrawal flow uses.
  const [methodGateBlocked, setMethodGateBlocked] = React.useState(false)
  const [editingMethod, setEditingMethod] = React.useState<any | null>(null)
  // US-59: raw bank details are never returned by the backend (security —
  // see methods.service.ts toDetailItem), so editing means full re-entry,
  // not a diff against hidden values. Starts blank whenever Edit opens on
  // an eligible (BANK_MANUAL, not-yet-verified) method.
  const [editBankForm, setEditBankForm] = React.useState(createBlankEditBankForm)
  const [editBankError, setEditBankError] = React.useState("")
  // Dedicated "Bank Details Updated" / "Unable To Update Bank Info" screens
  // (Figma) for edits that actually touch bank fields — nickname-only edits
  // keep the plain toast, since nothing about the bank account changed.
  const [editBankSaveState, setEditBankSaveState] = React.useState<
    "success" | "error" | null
  >(null)
  // AC-11.01: destructive removal requires an explicit confirmation step — holds
  // the method pending confirmation, not yet deleted.
  const [confirmRemove, setConfirmRemove] = React.useState<any | null>(null)
  const [removing, setRemoving] = React.useState(false)
  // AC-11.05/11.06: the warning (and required acknowledgment) must reflect whether
  // this specific method is actually the schedule's primary or an active split
  // secondary — not a static disclaimer shown for every removal regardless of use.
  const [removeImpact, setRemoveImpact] = React.useState<{
    isPrimary: boolean
    isActiveSecondary: boolean
  } | null>(null)
  const [removeAck, setRemoveAck] = React.useState(false)
  const [removeError, setRemoveError] = React.useState("")
  const [addForm, setAddForm] = React.useState({
    methodType: "PICK",
    bankAccountName: "",
    bankAccountNumber: "",
    bankAccountNumberConfirm: "",
    bankRoutingNumber: "",
    bankSortCode: "",
    bankIfscCode: "",
    bankBsbNumber: "",
    bankInstitutionNumber: "",
    bankTransitNumber: "",
    bankIban: "",
    bankSwiftBic: "",
    bankCode: "",
    bankBranchCode: "",
    bankClabe: "",
    bankCnapsCode: "",
    bankBik: "",
    bankCountry: "US",
    bankCountrySearch: "",
    bankCountryOpen: false,
    bankCurrency: "USD",
    accountType: "CHECKING",
    nickname: "",
    bankConsent: false,
  })
  // source distinguishes the Stripe-connect flow from the manual/micro-deposit
  // flow — Figma specs different copy for each ("securely linked"/"Connection
  // Failed" for Stripe vs "has been verified"/"Verification Failed" for manual).
  const [verifyState, setVerifyState] = React.useState<{
    methodId: string
    displayLabel: string
    bankName: string
    step:
      | "instructions"
      | "amounts"
      | "verifying"
      | "success"
      | "failed"
      | "locked"
      | "expired"
    source: "stripe" | "manual"
    attemptsLeft?: number
    lockedUntil?: string
    errorMessage?: string
  } | null>(null)
  const [microAmounts, setMicroAmounts] = React.useState({
    amount1: "",
    amount2: "",
  })

  // ─── Crypto wallet (US-09) — provider/network/currency driven by the real
  // backend registry (GET /deposit-methods/crypto/providers), not a hardcoded list.
  const [cryptoProviders, setCryptoProviders] = React.useState<any[]>([])
  const [cryptoProvidersLoading, setCryptoProvidersLoading] =
    React.useState(false)
  // US-64: dedicated connecting/success/failure screens, not just a button
  // label + toast + silent close. 'qr' and 'paste' are the two WalletConnect
  // presentations of the same session (PS-10) offered alongside manual
  // address entry — 'connecting' covers both the manual-submit spinner and
  // the brief moment after a WalletConnect session reports 'connected'.
  const [cryptoStep, setCryptoStep] = React.useState<
    "provider" | "details" | "qr" | "paste" | "connecting" | "success" | "error"
  >("provider")
  const [cryptoForm, setCryptoForm] = React.useState({
    provider: "",
    network: "",
    currency: "",
    address: "",
  })
  const [cryptoSubmitting, setCryptoSubmitting] = React.useState(false)
  const [cryptoError, setCryptoError] = React.useState("")
  const [cryptoResult, setCryptoResult] = React.useState<{
    walletAddressLast6?: string
    network?: string
    token?: string
    conversionDisplay?: string
  } | null>(null)
  const [cryptoWcSession, setCryptoWcSession] = React.useState<{
    sessionId: string
    wcUri: string
    expiresAt: string
  } | null>(null)
  const [cryptoWcConsent, setCryptoWcConsent] = React.useState(false)
  const selectedCryptoProvider = cryptoProviders.find(
    (p) => p.provider === cryptoForm.provider
  )
  const selectedCryptoNetwork = selectedCryptoProvider?.networks?.find(
    (n: any) => n.network === cryptoForm.network
  )

  const fetchCryptoProviders = React.useCallback(async () => {
    if (cryptoProviders.length) return
    setCryptoProvidersLoading(true)
    try {
      const res = await payoutFetch(`/deposit-methods/crypto/providers`)
      if (res.ok) {
        const d = await res.json()
        setCryptoProviders(d.providers ?? [])
      }
    } catch (e) {
      console.error("Failed to fetch crypto providers", e)
    } finally {
      setCryptoProvidersLoading(false)
    }
  }, [cryptoProviders.length])

  // ─── WalletConnect session (PS-10/PS-11) — shared by the QR-scan and
  // paste-link screens, since they're two presentations of the same
  // underlying session, not two separate connection mechanisms.
  const startWalletConnectSession = React.useCallback(async () => {
    setCryptoError("")
    try {
      const res = await payoutFetch(
        `/deposit-methods/crypto/walletconnect-session`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            cryptoProvider: cryptoForm.provider,
            network: cryptoForm.network,
          }),
        }
      )
      const data = await res.json()
      if (res.ok) {
        setCryptoWcSession({
          sessionId: data.sessionId,
          wcUri: data.wcUri,
          expiresAt: data.expiresAt,
        })
      } else {
        setCryptoError(data.message ?? "Unable to start wallet connection.")
        setCryptoStep("error")
      }
    } catch {
      setCryptoError("Unable to start wallet connection.")
      setCryptoStep("error")
    }
  }, [cryptoForm.provider, cryptoForm.network])

  React.useEffect(() => {
    if ((cryptoStep === "qr" || cryptoStep === "paste") && !cryptoWcSession) {
      startWalletConnectSession()
    }
  }, [cryptoStep, cryptoWcSession, startWalletConnectSession])

  React.useEffect(() => {
    if ((cryptoStep !== "qr" && cryptoStep !== "paste") || !cryptoWcSession)
      return
    const poll = async () => {
      try {
        const res = await payoutFetch(
          `/deposit-methods/crypto/walletconnect-session/${cryptoWcSession.sessionId}`
        )
        const data = await res.json()
        if (data.status === "connected") {
          setCryptoResult({
            walletAddressLast6: data.walletAddressLast6,
            network: cryptoForm.network,
            token: cryptoForm.currency,
            conversionDisplay: data.conversionDisplay,
          })
          setCryptoWcSession(null)
          fetchMethods()
          setCryptoStep("success")
        } else if (data.status === "rejected") {
          setCryptoError(
            "The connection request was declined in your wallet app."
          )
          setCryptoWcSession(null)
          setCryptoStep("error")
        } else if (data.status === "expired") {
          setCryptoError(
            "This connection link expired before a wallet approved it. Please try again."
          )
          setCryptoWcSession(null)
          setCryptoStep("error")
        }
      } catch {
        /* transient network error — next poll retries */
      }
    }
    const interval = setInterval(poll, 3000)
    return () => clearInterval(interval)
  }, [cryptoStep, cryptoWcSession, cryptoForm.network, cryptoForm.currency])

  const handleAddCryptoWallet = async () => {
    setCryptoSubmitting(true)
    setCryptoError("")
    setCryptoStep("connecting")
    try {
      const res = await payoutFetch(`/deposit-methods`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          methodType: "CRYPTO",
          cryptoProvider: cryptoForm.provider,
          cryptoNetwork: cryptoForm.network,
          cryptoCurrency: cryptoForm.currency,
          cryptoAddress: cryptoForm.address,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setCryptoError(
          data.message ??
            "Unable to add this wallet — please check the address and try again."
        )
        setCryptoStep("error")
        return
      }
      setCryptoResult({
        walletAddressLast6: data.walletAddressLast6,
        network: data.network,
        token: data.token,
        conversionDisplay: data.conversionDisplay,
      })
      setCryptoStep("success")
      fetchMethods()
    } catch {
      setCryptoError("Unable to add this wallet — please try again.")
      setCryptoStep("error")
    } finally {
      setCryptoSubmitting(false)
    }
  }

  const fetchMethods = React.useCallback(async () => {
    setMethodsLoading(true)
    setMethodsError(false)
    try {
      const res = await payoutFetch(`/deposit-methods`)
      // AC-01.02/01.05/01.06: every saved method must remain visible regardless of
      // verification status — pending/locked methods are surfaced via a status badge,
      // not hidden. Only the withdrawal method-selector (US-14) restricts to verified.
      if (!res.ok) {
        setMethodsError(true)
        return
      }
      const d = await res.json()
      setMethods(d.methods ?? [])
      setCanAddMore(d.canAddMore ?? true)
    } catch (e) {
      console.error("Failed to fetch deposit methods", e)
      setMethodsError(true)
    } finally {
      setMethodsLoading(false)
    }
  }, [])

  const handleAddMethod = async () => {
    try {
      const payload: any = { methodType: addForm.methodType }
      if (addForm.methodType === "BANK_MANUAL") {
        // AC-04.01: "account holder name" is the field the backend validates
        // (bank-validation.service.ts ERR_BANK_ACCOUNT_NAME_INVALID) — that's the
        // "Account Holder Name" input (addForm.nickname), not the bank's own name.
        payload.bankAccountName = addForm.nickname
        payload.bankAccountNumber = addForm.bankAccountNumber
        payload.bankCountry = addForm.bankCountry
        payload.bankCurrency = bankCountryCurrency(addForm.bankCountry)
        // AC-04.02/04.03: routing field adapts by region — only the field(s) relevant
        // to the selected country's region are sent, mirroring bank-validation.service.ts.
        switch (detectBankRegion(addForm.bankCountry)) {
          case "US":
            payload.bankRoutingNumber = addForm.bankRoutingNumber
            break
          case "GB":
            payload.bankSortCode = addForm.bankSortCode
            break
          case "IN":
            payload.bankIfscCode = addForm.bankIfscCode
            break
          case "AU":
            payload.bankBsbNumber = addForm.bankBsbNumber
            break
          case "CA":
            payload.bankInstitutionNumber = addForm.bankInstitutionNumber
            payload.bankTransitNumber = addForm.bankTransitNumber
            break
          case "JP":
            payload.bankCode = addForm.bankCode
            payload.bankBranchCode = addForm.bankBranchCode
            break
          case "MX":
            payload.bankClabe = addForm.bankClabe
            delete payload.bankAccountNumber
            break
          case "CN":
            payload.bankCnapsCode = addForm.bankCnapsCode
            break
          case "RU":
            payload.bankBik = addForm.bankBik
            break
          case "SEPA":
            payload.bankIban = addForm.bankIban
            delete payload.bankAccountNumber
            if (addForm.bankSwiftBic)
              payload.bankSwiftBic = addForm.bankSwiftBic
            break
          case "GCC":
            payload.bankIban = addForm.bankIban
            payload.bankSwiftBic = addForm.bankSwiftBic
            delete payload.bankAccountNumber
            break
          case "BACS":
            payload.bankSwiftBic = addForm.bankSwiftBic
            break
          case "SWIFT":
            payload.bankSwiftBic = addForm.bankSwiftBic
            break
        }
        // "Bank Name" (e.g. "Chase") is cosmetic only — not a backend-validated field.
        if (addForm.bankAccountName) payload.nickname = addForm.bankAccountName
      } else if (addForm.nickname) {
        payload.nickname = addForm.nickname
      }
      const res = await payoutFetch(`/deposit-methods`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (res.ok) {
        if (data.duplicate) {
          toast({
            title: "Account already linked",
            description: "This account is already connected.",
          })
        } else {
          const identifier =
            addForm.bankAccountNumber || addForm.bankClabe || addForm.bankIban
          const last4 = identifier.slice(-4)
          const displayLabel = data.displayLabel ?? "••••" + last4
          const bankName = addForm.bankAccountName || ""
          setShowAddMethod(false)
          // Stripe can resolve a us_bank_account SetupIntent straight to
          // "succeeded" with no real micro-deposits ever queued (see
          // stripe.provider.ts's createMicrodepositSetupIntent) — showing
          // the "we sent two deposits, check back in 2 days" screen here
          // would be false: nothing was sent, the account is already
          // verified. Mirrors the Stripe FC instant path's verifying ->
          // success sequence instead of the microdeposit "instructions" step.
          if (data.verification?.type === "instant") {
            setVerifyState({
              methodId: data.depositMethodId,
              displayLabel,
              bankName,
              step: "verifying",
              source: "manual",
            })
            await new Promise((r) => setTimeout(r, 1500))
            setVerifyState({
              methodId: data.depositMethodId,
              displayLabel,
              bankName,
              step: "success",
              source: "manual",
            })
            fetchMethods()
          } else {
            setMicroAmounts({ amount1: "", amount2: "" })
            setVerifyState({
              methodId: data.depositMethodId,
              displayLabel,
              bankName,
              step: "instructions",
              source: "manual",
            })
          }
        }
      } else {
        toast({
          title: "Error adding account",
          description: bankErrorMessage(data),
          variant: "destructive",
        })
      }
    } catch (e) {
      toast({
        title: "Error",
        description: "Failed to add account",
        variant: "destructive",
      })
    }
  }

  // AC-03.01/03.02: launches the real Stripe Financial Connections hosted flow when
  // a real publishable key is configured. Falls back to the existing dev-mock
  // sign-in screen only when payout-service itself is running in Stripe stub mode
  // (no STRIPE_SECRET_KEY configured server-side, signalled by `mode: 'mock'`).
  const handleConnectStripe = async (bankName: string) => {
    setAddForm((f) => ({ ...f, _stripeConnecting: true }) as any)
    try {
      const initRes = await payoutFetch(`/deposit-methods/stripe/restart`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      })
      const initData = await initRes.json()
      if (!initRes.ok) throw new Error("Failed to start Stripe session")
      const { sessionId, clientSecret, mode } = initData

      if (mode !== "mock") {
        const stripe = await getStripeJs()
        if (!stripe) throw new Error("Stripe.js failed to load")
        // Payout-scoped SetupIntent (flow_directions: ['outbound']) now backs
        // this session instead of a standalone FC session — collectBankAccountForSetup
        // + confirmUsBankAccountSetup is the Stripe.js pair for that, replacing
        // collectFinancialConnectionsAccounts(). The account the backend links
        // is derived server-side from this confirmed SetupIntent, not sent by the client.
        // Stripe requires billing_details.name — it can't be undefined. Falls
        // back to the email's local part, then a generic label, since
        // user.firstName/lastName may not have loaded yet this early in the
        // flow (this now fires on the very first click, with no intermediate
        // screens giving useAuth() time to populate).
        const name =
          [user?.firstName, user?.lastName].filter(Boolean).join(" ") ||
          user?.email?.split("@")[0] ||
          "Marketeq Contractor"
        const collectResult = await stripe.collectBankAccountForSetup({
          clientSecret,
          params: {
            payment_method_type: "us_bank_account",
            payment_method_data: {
              billing_details: { name, email: user?.email },
            },
          },
        })
        if (collectResult.error) throw new Error(collectResult.error.message)
        // collectBankAccountForSetup resolves without .error even when the
        // contractor closes/cancels Stripe's modal without picking a bank —
        // it just leaves the SetupIntent with no payment method attached.
        // Calling confirmUsBankAccountSetup anyway surfaces Stripe's raw
        // internal error ("SetupIntent does not have a payment method...");
        // catch it here with a message that actually explains what happened.
        if (!collectResult.setupIntent?.payment_method) {
          throw new Error("No bank account was selected. Please try again.")
        }
        const confirmResult =
          await stripe.confirmUsBankAccountSetup(clientSecret)
        if (confirmResult.error) throw new Error(confirmResult.error.message)
      }

      const finalRes = await payoutFetch(`/deposit-methods/stripe/finalise`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId }),
      })
      const method = await finalRes.json()
      // Backend distinguishes real failure reasons (e.g. "This account is
      // already linked" for ERR_DEPOSIT_METHOD_DUPLICATE) from a generic
      // connection problem — surface the actual message instead of masking
      // every failure behind the same "temporary network issue" copy.
      if (!finalRes.ok) throw new Error(method?.message || "Finalise failed")
      setAddForm(
        (f) =>
          ({
            ...f,
            methodType: "PICK",
            _selectedBank: "",
            _stripeConnecting: false,
            _stripeUser: "",
            _stripePass: "",
            _bankSearch: "",
          }) as any
      )
      setShowAddMethod(false)
      const displayLabel =
        method.displayLabel ??
        `${bankName} ••••${method.bankAccountLast4 ?? "4242"}`
      setVerifyState({
        methodId: method.id,
        displayLabel,
        bankName,
        step: "verifying",
        source: "stripe",
      })
      await new Promise((r) => setTimeout(r, 2500))
      setVerifyState({
        methodId: method.id,
        displayLabel,
        bankName,
        step: "success",
        source: "stripe",
      })
      fetchMethods()
    } catch (e) {
      setAddForm((f) => ({ ...f, _stripeConnecting: false }) as any)
      const errorMessage =
        e instanceof Error && e.message !== "Finalise failed"
          ? e.message
          : undefined
      setVerifyState({
        methodId: "",
        displayLabel: "",
        bankName,
        step: "failed",
        source: "stripe",
        errorMessage,
      })
      setShowAddMethod(false)
    }
  }

  // AC-07.03/07.04, AC-08.03/08.04: real OAuth redirect for Wise/Payoneer — POSTs
  // to create the pending method (payout-service returns a real provider oauthUrl
  // via oauth.service.ts's provider config), then navigates the browser there.
  // The provider redirects back to GET /v1/oauth/:provider/callback, which lands
  // the contractor back on this page with ?oauth=success|error (handled by the
  // effect below, mirroring how OverviewTab already reacts to other async state).
  const [oauthConnecting, setOauthConnecting] = React.useState(false)
  const handleConnectOAuth = async (methodType: "WISE" | "PAYONEER") => {
    setOauthConnecting(true)
    try {
      const res = await payoutFetch(`/deposit-methods`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ methodType }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message ?? "Failed to start connection")
      const oauthUrl = data.verification?.oauthUrl
      if (!oauthUrl) throw new Error("No authorization URL returned")
      // The provider callback (oauth.controller.ts) redirects back with only
      // ?oauth=success&methodId=... or ?oauth=error&code=... — no provider
      // name on the error path (nothing was created yet to read it off of).
      // Stash it client-side across the full-page redirect so the returning
      // "Wise/Payoneer Connected" / "Couldn't Connect" screen knows
      // which provider it's reporting on.
      sessionStorage.setItem("oauth_pending_provider", methodType)
      window.location.href = oauthUrl
    } catch (e: any) {
      setOauthConnecting(false)
      toast({
        title: "Connection failed",
        description: e?.message ?? "Please try again.",
        variant: "destructive",
      })
    }
  }

  // Reconnect an OAuth-linked method whose provider token was revoked/expired
  // (reauthRequired=true on the method — see oauth.service.ts's
  // applyReauthRequired). Same shape as handleConnectOAuth: POST for a fresh
  // authorization URL, stash the provider so the returning ?oauth=success|error
  // screen (handled by the effect below) knows which provider it's reporting
  // on, then hand the browser off to it.
  const [reauthorizingId, setReauthorizingId] = React.useState<string | null>(
    null
  )
  const handleReauthorize = async (method: DepositMethodOption) => {
    setReauthorizingId(method.id)
    try {
      const res = await payoutFetch(
        `/deposit-methods/${method.id}/reauthorize`,
        { method: "POST" }
      )
      const data = await res.json()
      if (!res.ok)
        throw new Error(data.message ?? "Failed to start reconnection")
      const redirectUrl = data.redirectUrl
      if (!redirectUrl) throw new Error("No authorization URL returned")
      sessionStorage.setItem("oauth_pending_provider", method.methodType)
      window.location.href = redirectUrl
    } catch (e: any) {
      setReauthorizingId(null)
      toast({
        title: "Reconnection failed",
        description: e?.message ?? "Please try again.",
        variant: "destructive",
      })
    }
  }

  // AC-06.06/07.04/08.04: handle the ?oauth=success|error redirect back from the
  // provider callback — mapped by the actual errorCode oauth.service.ts throws
  // (oauth.controller.ts:26 passes it through as ?code=), not a single generic message.
  const OAUTH_ERROR_MESSAGES: Record<string, string> = {
    ERR_OAUTH_STATE_INVALID:
      "That connection link expired before it was completed. Please try connecting again.",
    ERR_DEPOSIT_METHOD_NOT_FOUND:
      "We could not find the connection request. Please try again.",
    ERR_OAUTH_UNSUPPORTED: "This provider is not currently supported.",
    ERR_DEPOSIT_METHOD_DUPLICATE:
      "This account is already linked to your profile.",
  }
  // Figma: a dedicated "X Connected" / "Couldn't Connect to X" screen, not
  // just a toast — the toast alone gave no confirmation of *which* account
  // got linked or a way to set it default/retry in place.
  const [oauthResult, setOauthResult] = React.useState<{
    provider: "WISE" | "PAYONEER"
    status: "success" | "error"
    method?: any
    errorMessage?: string
  } | null>(null)

  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const result = params.get("oauth")
    if (!result) return
    const provider =
      (sessionStorage.getItem("oauth_pending_provider") as
        | "WISE"
        | "PAYONEER"
        | null) ?? "WISE"
    sessionStorage.removeItem("oauth_pending_provider")
    if (result === "success") {
      const methodId = params.get("methodId")
      fetchMethods()
      if (methodId) {
        payoutFetch(`/deposit-methods/${methodId}`)
          .then((r) => (r.ok ? r.json() : null))
          .then((method) =>
            setOauthResult({ provider, status: "success", method })
          )
          .catch(() => setOauthResult({ provider, status: "success" }))
      } else {
        setOauthResult({ provider, status: "success" })
      }
    } else {
      const code = params.get("code") ?? undefined
      setOauthResult({
        provider,
        status: "error",
        errorMessage: code ? OAUTH_ERROR_MESSAGES[code] : undefined,
      })
    }
    params.delete("oauth")
    params.delete("methodId")
    params.delete("code")
    const qs = params.toString()
    window.history.replaceState(
      {},
      "",
      window.location.pathname + (qs ? `?${qs}` : "")
    )
  }, [fetchMethods])

  // AC-09.01: fetch the 9 supported providers from server config when the crypto
  // step is entered — never hardcode the provider list client-side.
  React.useEffect(() => {
    if (addForm.methodType === "CRYPTO") fetchCryptoProviders()
  }, [addForm.methodType, fetchCryptoProviders])

  // AC-11.05/11.06: determine whether the method pending removal is actually the
  // schedule's primary or an active split secondary, so the dialog can show the
  // correct specific warning instead of a static one shown for every removal.
  React.useEffect(() => {
    if (!confirmRemove) {
      setRemoveImpact(null)
      setRemoveAck(false)
      setRemoveError("")
      return
    }
    ;(async () => {
      try {
        const res = await payoutFetch(`/payouts/schedule`)
        if (!res.ok) {
          setRemoveImpact({ isPrimary: false, isActiveSecondary: false })
          return
        }
        const s = await res.json()
        setRemoveImpact({
          isPrimary: s.primaryMethod?.id === confirmRemove.id,
          isActiveSecondary:
            !!s.splitEnabled && s.secondaryMethod?.id === confirmRemove.id,
        })
      } catch {
        setRemoveImpact({ isPrimary: false, isActiveSecondary: false })
      }
    })()
  }, [confirmRemove])

  // Returns whether the delete actually succeeded, so callers can decide whether
  // it's safe to close/dismiss their UI (SCR-06: dialog must stay open on error).
  const handleDeleteMethod = async (
    id: string
  ): Promise<{ ok: boolean; message?: string }> => {
    try {
      const res = await payoutFetch(`/deposit-methods/${id}`, {
        method: "DELETE",
      })
      if (res.ok) {
        toast({ title: "Account removed successfully" })
        fetchMethods()
        return { ok: true }
      }
      const e = await res.json().catch(() => ({}) as any)
      return {
        ok: false,
        message: e.message ?? "Unable to remove — please try again.",
      }
    } catch {
      return { ok: false, message: "Unable to remove — please try again." }
    }
  }

  // AC-11.01/11.02/11.03/SCR-06: only the confirmation dialog's Remove button
  // actually deletes, and the dialog stays open with the specific error message
  // on failure (e.g. "only method" / "primary with active split") instead of
  // silently closing as if the removal had succeeded.
  const confirmDeleteMethod = async () => {
    if (!confirmRemove) return
    setRemoving(true)
    setRemoveError("")
    const result = await handleDeleteMethod(confirmRemove.id)
    setRemoving(false)
    if (result.ok) {
      setConfirmRemove(null)
    } else {
      setRemoveError(result.message ?? "Unable to remove — please try again.")
    }
  }

  const handleSetDefault = async (id: string) => {
    try {
      const res = await payoutFetch(`/deposit-methods/${id}/set-default`, {
        method: "POST",
      })
      if (res.ok) {
        // Figma: names the method and, when split payout is active, states the
        // actual live percentages rather than a generic "Default updated".
        const target = methods.find((m: any) => m.id === id)
        const label = target ? getMethodLabel(target).name : "This method"
        try {
          const scheduleRes = await payoutFetch(`/payouts/schedule`)
          if (scheduleRes.ok) {
            const s = await scheduleRes.json()
            if (s.splitEnabled && s.secondaryMethod) {
              const secondaryLabel =
                s.secondaryMethod.displayLabel ?? s.secondaryMethod.methodType
              const primaryPct =
                Math.round((s.primarySplitPercent ?? 100) * 100) / 100
              const secondaryPct = Math.round((100 - primaryPct) * 100) / 100
              toast({
                title: `${label} is now your default deposit method.`,
                description: `This will be used for all scheduled deposits. Split logic is on: ${primaryPct}% to ${label}, ${secondaryPct}% to ${secondaryLabel}.`,
              })
              fetchMethods()
              return
            }
          }
        } catch {
          /* fall through to the plain toast below */
        }
        toast({ title: `${label} is now your default deposit method.` })
        fetchMethods()
      } else {
        const e = await res.json()
        toast({
          title: "Error",
          description: e.message,
          variant: "destructive",
        })
      }
    } catch (e) {
      toast({
        title: "Error",
        description: "Failed to update default",
        variant: "destructive",
      })
    }
  }

  // SCR-07: confirm before replacing the existing default deposit method
  // (Figma "Make this your default deposit method?").
  const [confirmSetDefault, setConfirmSetDefault] = React.useState<any | null>(
    null
  )
  const requestSetDefault = (method: any) => setConfirmSetDefault(method)
  // Figma "Edit Deposit Method?" — confirm before PATCH, after the edit form.
  const [confirmEditSave, setConfirmEditSave] = React.useState(false)

  // US-59/62/63: full bank-detail replacement, only offered for BANK_MANUAL
  // methods that haven't completed verification yet — see updateMethod() in
  // methods.service.ts for why VERIFIED methods stay nickname-only.
  const editingBankDetails =
    editingMethod?.methodType === "BANK_MANUAL" &&
    editingMethod?.verificationStatus !== "verified"

  const handleUpdateMethod = async () => {
    if (!editingMethod) return
    setEditBankError("")
    try {
      const resolvedCountry = editBankForm.bankCountry || "US"
      const editRegion = detectBankRegion(resolvedCountry)
      const submittingBankDetails =
        editingBankDetails &&
        (editBankForm.bankAccountNumber.trim() || editBankForm.bankIban.trim())
      const payload: any = { nickname: editingMethod.nickname ?? "" }
      if (submittingBankDetails) {
        payload.bankAccountName = editBankForm.bankAccountName
        payload.bankCountry = resolvedCountry
        payload.bankCurrency = bankCountryCurrency(resolvedCountry)
        if (editRegion !== "SEPA")
          payload.bankAccountNumber = editBankForm.bankAccountNumber
        switch (editRegion) {
          case "US":
            payload.bankRoutingNumber = editBankForm.bankRoutingNumber.replace(
              /\D/g,
              ""
            )
            break
          case "GB":
            payload.bankSortCode = editBankForm.bankSortCode
            break
          case "IN":
            payload.bankIfscCode = editBankForm.bankIfscCode
            break
          case "AU":
            payload.bankBsbNumber = editBankForm.bankBsbNumber
            break
          case "CA":
            payload.bankInstitutionNumber = editBankForm.bankInstitutionNumber
            payload.bankTransitNumber = editBankForm.bankTransitNumber
            break
          case "JP":
            payload.bankCode = editBankForm.bankCode
            payload.bankBranchCode = editBankForm.bankBranchCode
            break
          case "SEPA":
            payload.bankIban = editBankForm.bankIban
            if (editBankForm.bankSwiftBic)
              payload.bankSwiftBic = editBankForm.bankSwiftBic
            break
          case "SWIFT":
            payload.bankSwiftBic = editBankForm.bankSwiftBic
            break
        }
      }
      const res = await payoutFetch(`/deposit-methods/${editingMethod.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (res.ok) {
        if (data.verification?.type === "micro_deposit") {
          // US-62: bank details changed, so verification restarted from
          // scratch — same "up to 2 business days" copy as adding a new
          // account, since that's exactly what happened underneath.
          setMicroAmounts({ amount1: "", amount2: "" })
          setVerifyState({
            methodId: editingMethod.id,
            displayLabel: data.displayLabel ?? editingMethod.displayLabel,
            bankName: editBankForm.bankAccountName || "",
            step: "instructions",
            source: "manual",
          })
          setEditingMethod(null)
        } else if (submittingBankDetails) {
          setEditBankSaveState("success")
        } else {
          toast({ title: "Account updated" })
          setEditingMethod(null)
        }
        fetchMethods()
      } else if (submittingBankDetails) {
        setEditBankError(bankErrorMessage(data))
        setEditBankSaveState("error")
      } else {
        setEditBankError(bankErrorMessage(data))
      }
    } catch (e) {
      setEditBankError("Failed to update account. Please try again.")
      if (editingBankDetails) setEditBankSaveState("error")
    }
  }

  // AC-05.04/05.05/05.06/05.08: wrong amounts decrement an attempt counter and, on the
  // 3rd failure, lock for 24h — the method is never deleted just because a verification
  // attempt failed. Backend errorCode drives which of amounts/locked/expired renders.
  const handleVerifyMicroDeposits = async () => {
    if (!verifyState) return
    const methodId = verifyState.methodId
    setVerifyState((s) => (s ? { ...s, step: "verifying" } : null))
    try {
      const [res] = await Promise.all([
        payoutFetch(`/deposit-methods/${methodId}/verify-micro-deposits`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            amount1Cents: parseInt(microAmounts.amount1),
            amount2Cents: parseInt(microAmounts.amount2),
          }),
        }),
        new Promise((r) => setTimeout(r, 1200)),
      ])
      setMicroAmounts({ amount1: "", amount2: "" })
      if (res.ok) {
        setVerifyState((s) => (s ? { ...s, step: "success" } : null))
        fetchMethods()
        return
      }
      const body = await res.json().catch(() => ({}) as any)
      if (body.errorCode === "ERR_VERIFICATION_LOCKED") {
        setVerifyState((s) =>
          s ? { ...s, step: "locked", lockedUntil: body.lockedUntil } : null
        )
      } else if (body.errorCode === "ERR_VERIFICATION_EXPIRED") {
        setVerifyState((s) => (s ? { ...s, step: "expired" } : null))
      } else if (body.errorCode === "ERR_VERIFICATION_AMOUNTS_INCORRECT") {
        setVerifyState((s) =>
          s ? { ...s, step: "amounts", attemptsLeft: body.attemptsLeft } : null
        )
      } else {
        setVerifyState((s) => (s ? { ...s, step: "failed" } : null))
      }
      fetchMethods()
    } catch {
      setVerifyState((s) => (s ? { ...s, step: "failed" } : null))
    }
  }

  const deleteMethod = React.useCallback(async (methodId: string) => {
    try {
      await payoutFetch(`/deposit-methods/${methodId}`, { method: "DELETE" })
    } catch {}
  }, [])

  // Figma shows every Connected Accounts row icon inside the same
  // ~44px bordered chip, regardless of provider — BankLogo and
  // CryptoProviderIcon already draw their own box (resized here, not
  // re-wrapped, to avoid the double-box seam).
  const getMethodIcon = (m: any) => {
    const type = typeof m === "string" ? m : m?.methodType
    if (type === "WISE")
      return (
        <div className="size-11 rounded-lg border border-gray-200 bg-white flex items-center justify-center shrink-0">
          <WiseGlyphV2 className="w-1/2 h-1/2" />
        </div>
      )
    // Real per-provider icon (Ramp/Transak/Coinbase/MetaMask/etc.), not a
    // hardcoded "BTC" label shown regardless of the actual connected
    // provider or currency.
    if (type === "CRYPTO")
      return (
        <CryptoProviderIcon
          provider={typeof m === "object" ? m?.cryptoProvider : ""}
          className="size-11"
        />
      )
    const bankName = typeof m === "object" ? m?.nickname || "" : ""
    if (bankName) return <BankLogo bankName={bankName} size={44} />
    return (
      <div className="size-11 rounded-lg border border-gray-200 bg-gray-50 flex items-center justify-center shrink-0">
        <BankIcon className="size-5 text-gray-500" />
      </div>
    )
  }

  const getMethodLabel = (m: any) => {
    if (m.methodType === "CRYPTO") {
      const address = m.cryptoAddress
        ? m.cryptoAddress.slice(0, 6) + "..." + m.cryptoAddress.slice(-4)
        : (m.displayLabel ?? "")
      return {
        name: m.nickname || m.cryptoProvider || "Crypto Wallet",
        sub: address,
      }
    }
    if (m.methodType === "WISE") {
      const id = m.wiseAccountId ?? emailFromDisplayLabel(m.displayLabel)
      return { name: m.nickname || "Wise", sub: id ? maskId(id) : "" }
    }
    if (m.methodType === "PAYONEER") {
      const id = m.payoneerPayeeId ?? emailFromDisplayLabel(m.displayLabel)
      return { name: m.nickname || "Payoneer", sub: id ? maskId(id) : "" }
    }
    // BANK_MANUAL / BANK_STRIPE — show nickname if set, else displayLabel.
    // displayLabel is "${bankName} ••••${last4}" (see the fallback built at
    // stripe-connect time) — split it so the masked suffix renders as its
    // own `sub`, matching every other method type's name/sub split, instead
    // of dumping the whole string into `name` with no separate `sub`.
    const label = m.nickname
      ? `${m.nickname} ${m.displayLabel?.replace("Bank ", "") || ""}`.trim()
      : m.displayLabel || "Bank Account"
    const maskMatch = label.match(/^(.*?)\s*(••••\d+|\.{3,4}\d+)$/)
    if (maskMatch) {
      return { name: maskMatch[1].trim(), sub: maskMatch[2] }
    }
    return { name: label, sub: "" }
  }

  // AC-01.03/01.05/01.06: status badge shown on every method card.
  const getMethodStatusBadge = (
    m: any
  ): { visual: "success" | "warning" | "error" | "gray"; label: string } => {
    // Checked ahead of verificationStatus — an OAuth-linked method (Wise/
    // Payoneer) can be "verified" from its original link yet still need the
    // contractor to re-authorize (e.g. a revoked/expired provider token).
    // That's a distinct, actionable state from any verificationStatus value,
    // so it takes over the badge entirely rather than being layered on top.
    if (m.reauthRequired) {
      return { visual: "warning", label: "Needs Reauthorization" }
    }
    switch (m.verificationStatus) {
      case "verified":
        return { visual: "success", label: "Verified" }
      case "locked":
        return { visual: "error", label: formatLockedBadge(m.lockedUntil) }
      case "expired":
        return { visual: "gray", label: "Expired" }
      case "failed":
        return { visual: "gray", label: "Failed" }
      default:
        return { visual: "warning", label: "Pending Verification" }
    }
  }

  // AC-01.06: "Locked — try again in 18 hr 42 min" style countdown from server timestamp.
  const formatLockedBadge = (lockedUntil: string | null | undefined) => {
    if (!lockedUntil) return "Locked"
    const msRemaining = new Date(lockedUntil).getTime() - Date.now()
    if (msRemaining <= 0) return "Locked"
    const hrs = Math.floor(msRemaining / 3_600_000)
    const mins = Math.floor((msRemaining % 3_600_000) / 60_000)
    return `Locked — ${hrs} hr ${mins} min`
  }

  const defaultMethod = methods.find((m) => m.isDefault)
  const defaultMethodLabel = defaultMethod
    ? getMethodLabel(defaultMethod)
    : null
  // Direct Deposit card only — Figma masks bank last-4 as "...4553" (not "••••4553").
  const defaultMethodMask = defaultMethodLabel?.sub.replace(/^•{4}/, "...") ?? ""

  const loadBalance = React.useCallback(() => {
    setBalanceError(false)
    getBalance()
      .then(setBalance)
      .catch((e) => {
        console.error("Balance fetch failed:", e)
        setBalanceError(true)
      })
  }, [])

  const loadSummary = React.useCallback(() => {
    setSummaryError(false)
    getEarningsSummary()
      .then(setSummary)
      .catch((e) => {
        console.error("Earnings summary fetch failed:", e)
        setSummaryError(true)
      })
  }, [])

  // US-91–94: live balance/earnings push over Ably, replacing the old
  // always-on 60s poll as the primary path. isLive gates the polling
  // effects below (fallback-only now).
  const { isLive } = useEarningsChannel({
    // US-91: balance card + all four summary cards re-fetch immediately.
    // payout_completed is folded into this generic event (see
    // EarningsEventsPublisher.eventNameFor on the backend — only reversal
    // and payout_failed get their own named events) — Recent Activity needs
    // its own re-fetch here too, or a completed payout only ever updates
    // the balance card while staying "Processing" in the activity list
    // until the next 60s poll.
    onBalanceUpdated: React.useCallback((evt: EarningsRealtimeEvent) => {
      loadBalance()
      loadSummary()
      if (evt.mutationType === "payout_completed") {
        loadRecentActivity()
      }
    }, [loadBalance, loadSummary, loadRecentActivity]),
    // US-92: re-fetch Recent Earnings immediately — the status-diff effect
    // below (which owns the exact toast copy) fires as soon as it sees the
    // entry flip to "failed", now within ~200ms instead of up to 60s.
    onTransactionReversed: React.useCallback(() => {
      loadRecentEarnings()
    }, [loadRecentEarnings]),
    // US-93: persistent failure banner — re-fetch immediately.
    onPayoutFailed: React.useCallback(() => {
      loadRecentActivity()
      loadFailedPayout()
    }, [loadRecentActivity, loadFailedPayout]),
    // US-94.05: on reconnect, one immediate re-fetch across the board — the
    // polling effects below stop on their own the same render (isLive is
    // already true by the time this fires).
    onReconnected: React.useCallback(() => {
      loadBalance()
      loadSummary()
      loadRecentEarnings()
      loadRecentActivity()
      loadFailedPayout()
    }, [
      loadBalance,
      loadSummary,
      loadRecentEarnings,
      loadRecentActivity,
      loadFailedPayout,
    ]),
  })

  // US-94: polling now runs only as a fallback while the Ably channel is
  // disconnected — stops the instant isLive flips true.
  React.useEffect(() => {
    if (isLive) return
    const id = setInterval(() => {
      if (!document.hidden) loadBalance()
    }, 60_000)
    return () => clearInterval(id)
  }, [isLive, loadBalance])

  React.useEffect(() => {
    if (isLive) return
    const id = setInterval(() => {
      if (!document.hidden) loadRecentEarnings()
    }, 60_000)
    return () => clearInterval(id)
  }, [isLive, loadRecentEarnings])

  // US-92: reversal detection stays diff-based regardless of transport —
  // it re-fetches Recent Earnings (either from the Ably handler above, or
  // from the polling fallback) and diffs entry.status against what was last
  // seen; an entry that flips to "failed" (this codebase's reversed-entry
  // status, see EarningsRow.status) since the previous fetch gets a toast.
  // Never toasts on first load (nothing to diff against yet) or for entries
  // already known to be failed.
  const knownEntryStatusRef = React.useRef<Map<string, string>>(new Map())
  React.useEffect(() => {
    const seen = knownEntryStatusRef.current
    let reversed = false
    for (const row of recentEarnings) {
      const prevStatus = seen.get(row.id)
      if (prevStatus && prevStatus !== "failed" && row.status === "failed")
        reversed = true
      seen.set(row.id, row.status)
    }
    if (reversed) {
      // US-92.01: balance, history, and summary cards all re-fetch together —
      // not just the recentEarnings poll that happened to notice the reversal.
      // US-92.02/92.03: exact copy, treated as a correction (default/neutral
      // toast styling), not an error.
      toast({
        title: "Transaction reversed",
        description:
          "A transaction has been reversed. Your balance has been updated.",
      })
      loadBalance()
      loadSummary()
    }
  }, [recentEarnings, toast, loadBalance, loadSummary])

  // US-100/US-101: extracted to a callback (not an inline mount-effect IIFE)
  // so the error state below has something to retry against.
  const loadSchedule = React.useCallback(async () => {
    setScheduleLoading(true)
    setScheduleError(false)
    try {
      const res = await payoutFetch(`/payouts/schedule`)
      if (!res.ok) {
        setScheduleError(true)
        return
      }
      const d = await res.json()
      setScheduleNextRunAt(d.nextRunAt ?? null)
      setReserveUsd(d.reserveUsd ? parseFloat(d.reserveUsd) : 0)
    } catch (e) {
      console.error("Failed to fetch payout schedule", e)
      setScheduleError(true)
    } finally {
      setScheduleLoading(false)
    }
  }, [])

  const loadPreviousPayout = React.useCallback(async () => {
    setPreviousPayoutLoading(true)
    setPreviousPayoutError(false)
    try {
      const res = await payoutFetch(
        `/payouts?status=completed&page=1&pageSize=1`
      )
      if (!res.ok) {
        setPreviousPayoutError(true)
        return
      }
      const d = await res.json()
      const latest = d.payouts?.[0]
      setPreviousPayout(
        latest
          ? {
              amountUsd: latest.netAmountUsd ?? latest.amountUsd,
              methodLabel: latest.methodLabel,
              settledAt: latest.settledAt,
            }
          : null
      )
    } catch (e) {
      console.error("Failed to fetch previous payout", e)
      setPreviousPayoutError(true)
    } finally {
      setPreviousPayoutLoading(false)
    }
  }, [])

  useEffect(() => {
    loadSummary()
    loadBalance()
    loadRecentEarnings()
    fetchMethods()
    ;(async () => {
      try {
        const res = await payoutFetch(`/deposit-methods/config`)
        if (res.ok) {
          const d = await res.json()
          setDebitCardEnabled(!!d.featureFlags?.debitCardEnabled)
        }
      } catch (e) {
        console.error("Failed to fetch method config", e)
      }
    })()
    ;(async () => {
      // AC-30.04: any failure to confirm the gate is treated as blocked, not allowed.
      try {
        const res = await payoutFetch(`/payouts/gate-check`)
        if (!res.ok) {
          setMethodGateBlocked(true)
          return
        }
        const d = await res.json()
        // AC-31.01/31.06: the first-payout hold only gates the withdrawal screen and
        // scheduled payout runs — it has nothing to do with adding a payout method,
        // so it must not block this action the way a real KYC block should.
        setMethodGateBlocked(!d.allowed && d.blockedBy !== "FIRST_PAYOUT_HOLD")
      } catch {
        setMethodGateBlocked(true)
      }
    })()
    loadSchedule()
    loadPreviousPayout()
    loadRecentActivity()
    loadFailedPayout()
  }, [
    fetchMethods,
    loadBalance,
    loadSummary,
    loadRecentEarnings,
    loadRecentActivity,
    loadSchedule,
    loadPreviousPayout,
    loadFailedPayout,
  ])

  // US-93.01: the persistent failure banner must be able to appear live, not
  // only on page load — recentActivity (its data source) previously fetched
  // once on mount only. Now driven primarily by the onPayoutFailed Ably
  // handler above; this interval is the polling fallback, gated the same
  // way as the balance/recentEarnings polls (US-94).
  React.useEffect(() => {
    if (isLive) return
    const id = setInterval(() => {
      if (!document.hidden) {
        loadRecentActivity()
        loadFailedPayout()
      }
    }, 60_000)
    return () => clearInterval(id)
  }, [isLive, loadRecentActivity, loadFailedPayout])

  // Congrats + promo banners share one carousel slot, picked at random exactly
  // once per page load — not re-randomized on every poll/re-render, and once
  // dismissed it stays gone for the rest of the session. Persisted to
  // sessionStorage (not component state) because switching Overview/Earnings/
  // Payouts tabs unmounts this component entirely (Radix TabsContent doesn't
  // keep inactive panels mounted) — plain useState was silently resetting on
  // every tab switch, which isn't "dismissed for the session" at all.
  const readSS = (key: string) =>
    typeof window === "undefined" ? null : window.sessionStorage.getItem(key)
  const writeSS = (key: string, value: string) => {
    if (typeof window !== "undefined") window.sessionStorage.setItem(key, value)
  }
  const [failedBannerDismissed, setFailedBannerDismissedState] = React.useState(
    () => readSS("overview_failed_banner_dismissed") === "1"
  )
  const setFailedBannerDismissed = (v: boolean) => {
    setFailedBannerDismissedState(v)
    writeSS("overview_failed_banner_dismissed", v ? "1" : "0")
  }
  const carouselBanners = [
    ...(balance && parseFloat(balance.totalEarnedUsd) > 0
      ? [
          {
            id: "congrats",
            emoji: "\u{1F929}",
            content: (
              <>
                You&apos;ve earned{" "}
                <span className="font-semibold text-success-600">
                  {amountSign(balance.totalEarnedUsd)}$
                  {formatWholeAmount(balance.totalEarnedUsd)}
                </span>{" "}
                total &mdash; {summary?.allTime?.hoursLabel ?? "..."} logged
              </>
            ),
          },
        ]
      : []),
    ...PROMO_BANNERS,
  ]
  const [selectedBannerId, setSelectedBannerIdState] = React.useState<
    string | null
  >(() => readSS("overview_banner_id"))
  const [bannerPicked, setBannerPicked] = React.useState(
    () => readSS("overview_banner_id") !== null
  )
  const [bannerDismissed, setBannerDismissedState] = React.useState(
    () => readSS("overview_banner_dismissed") === "1"
  )
  const setBannerDismissed = (v: boolean) => {
    setBannerDismissedState(v)
    writeSS("overview_banner_dismissed", v ? "1" : "0")
  }
  React.useEffect(() => {
    // Wait for the balance fetch to resolve (success or error) before picking,
    // so "congrats" gets a fair chance to be in the draw instead of the pick
    // always happening before it's known to be eligible.
    if (bannerPicked || (!balance && !balanceError)) return
    const pick =
      carouselBanners[Math.floor(Math.random() * carouselBanners.length)].id
    setSelectedBannerIdState(pick)
    writeSS("overview_banner_id", pick)
    setBannerPicked(true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bannerPicked, balance, balanceError])
  const currentBanner = bannerDismissed
    ? null
    : (carouselBanners.find((b) => b.id === selectedBannerId) ?? null)

  return (
    <>
      <div className="flex gap-6">
        {/* Main Content */}
        <div className="flex-1 space-y-5 min-w-0">
          {/* Dismissible for the session — closing it doesn't resolve the
            underlying failed withdrawal, just stops repeating the nudge
            once the contractor has seen it. */}
          {failedPayout && !failedBannerDismissed && (
            <div className="flex items-center justify-between rounded-lg border border-red-200 bg-red-50 px-4 py-3">
              <p className="text-sm text-red-700">
                <span className="mr-2">⚠️</span>A withdrawal could not be
                completed — {failedPayout.title}.
              </p>
              <div className="flex items-center gap-1">
                <Button
                  variant="link"
                  visual="gray"
                  size="sm"
                  onClick={() => onNavigateTab?.("payouts")}
                >
                  View Details
                </Button>
                <IconButton
                  size="sm"
                  variant="ghost"
                  visual="gray"
                  onClick={() => setFailedBannerDismissed(true)}
                >
                  <X className="size-4" />
                </IconButton>
              </div>
            </div>
          )}

          {/* Congrats + promo banners share one carousel slot, randomly picked
            (see carouselBanners/selectedBannerId above) — one at a time,
            not stacked, and not always leading with the same one. */}
          {currentBanner && (
            <div className="flex items-center justify-between rounded-lg border border-success-500 bg-success-25 px-4 py-3">
              <p className="text-sm text-dark-blue-400">
                <span className="mr-2">{currentBanner.emoji}</span>
                {currentBanner.content}
              </p>
              <IconButton
                size="sm"
                variant="ghost"
                visual="gray"
                onClick={() => setBannerDismissed(true)}
              >
                <X className="size-4" />
              </IconButton>
            </div>
          )}

          {/* Earnings Summary */}
          <div className="rounded-lg border border-gray-200 bg-white p-8 shadow-[0px_2px_5px_0px_rgba(0,0,0,.04)]">
            <div className="flex items-center gap-1.5 mb-6">
              <h3 className="text-lg font-semibold text-[#22376B]">
                Earnings Summary
              </h3>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <HelpCircle className="size-4 text-[#98A2B3]" />
                  </TooltipTrigger>
                  <TooltipContent visual="white" size="md">
                    <p>
                      Total time logged earnings after any reserve is held. You
                      can update reserve settings under your{" "}
                      <button
                        type="button"
                        className="text-primary-600 underline hover:text-primary-700"
                        onClick={() => onEditPayoutSchedule?.()}
                      >
                        Payout Preferences
                      </button>
                      .
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>

            {summaryError && (
              <p className="text-xs text-red-600 -mt-3 mb-3">
                We couldn't load your earnings summary.{" "}
                <button className="underline font-medium" onClick={loadSummary}>
                  Refresh
                </button>
              </p>
            )}

            <div className="rounded-lg border border-gray-200 bg-gray-25 p-8 grid grid-cols-1 md:grid-cols-2 md:divide-x md:divide-gray-200 gap-8 md:gap-0">
              {/* Today — flex column so the CTA sits at the bottom with the
                large vertical gap Figma shows between "Logged" and the button. */}
              <div className="flex flex-col md:pr-10">
                <div className="flex items-center gap-1.5 mb-3">
                  <span className="text-base font-medium text-[#22376B]">
                    Today
                  </span>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger>
                        <HelpCircle className="size-4 text-[#98A2B3]" />
                      </TooltipTrigger>
                      <TooltipContent visual="white" size="md">
                        {summary?.today.dateRangeLabel && (
                          <p className="font-semibold text-[#22376B]">
                            {summary.today.dateRangeLabel}
                          </p>
                        )}
                        <p>Earnings logged since 12:00 AM local time today.</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <FigmaAmount
                  amount={summary?.today.amount}
                  symbol={currencySymbol(
                    summary?.today.displayCurrency || "USD"
                  )}
                  size="lg"
                />
                {summary?.today.changeLabel && (
                  <div className="flex items-center gap-1 mt-2 whitespace-nowrap">
                    <span
                      className={cn(
                        "inline-flex items-center gap-1 text-[13px] font-semibold",
                        summary.today.changeDirection === "up"
                          ? "text-success-500"
                          : summary.today.changeDirection === "down"
                            ? "text-[#FF3B30]"
                            : "text-[#98A2B3]"
                      )}
                    >
                      {summary.today.changeDirection === "up" ? (
                        <ArrowUp className="size-3.5" />
                      ) : summary.today.changeDirection === "down" ? (
                        <ArrowDown className="size-3.5" />
                      ) : null}
                      {summary.today.changePercent != null
                        ? Math.abs(summary.today.changePercent) + "%"
                        : ""}
                    </span>
                    <span className="text-[13px] font-normal text-[#22376B]">
                      {summary.today.changeLabel?.replace(/^[\d.]+%\s*/, "")}
                    </span>
                  </div>
                )}
                <p className="text-sm mt-3">
                  <span className="font-bold text-[#22376B]">
                    {summary?.today.hoursLabel ?? "—"}
                  </span>{" "}
                  <span className="text-[#667085]">Logged</span>
                </p>
                <div className="mt-auto pt-8">
                  <Button
                    variant="outlined"
                    visual="gray"
                    size="sm"
                    className="font-semibold text-[#22376B]"
                    onClick={() => onNavigateTab?.("earnings")}
                  >
                    View All Earnings
                  </Button>
                </div>
              </div>

              {/* This Week + This Month */}
              <div className="divide-y divide-gray-200 [&>*+*]:pt-6 [&>*:not(:last-child)]:pb-6 md:pl-10">
                <div>
                  <div className="flex items-center gap-1.5 mb-3">
                    <span className="text-base font-medium text-[#22376B]">
                      This Week
                    </span>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger>
                          <HelpCircle className="size-4 text-[#98A2B3]" />
                        </TooltipTrigger>
                        <TooltipContent visual="white" size="md">
                          {summary?.thisWeek.dateRangeLabel && (
                            <p className="font-semibold text-[#22376B]">
                              {summary.thisWeek.dateRangeLabel}
                            </p>
                          )}
                          <p>Earnings logged for the current week.</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                  <FigmaAmount
                    amount={summary?.thisWeek.amount}
                    symbol={currencySymbol(
                      summary?.thisWeek.displayCurrency || "USD"
                    )}
                    size="md"
                  />
                  <div className="flex items-center justify-between gap-3 mt-2 min-h-[20px]">
                    {summary?.thisWeek.changeLabel ? (
                      <div className="flex items-center gap-1 min-w-0 whitespace-nowrap">
                        <span
                          className={cn(
                            "inline-flex items-center gap-1 text-[13px] font-semibold",
                            summary.thisWeek.changeDirection === "up"
                              ? "text-success-500"
                              : "text-[#FF3B30]"
                          )}
                        >
                          {summary.thisWeek.changeDirection === "up" ? (
                            <ArrowUp className="size-3.5" />
                          ) : (
                            <ArrowDown className="size-3.5" />
                          )}
                          {summary.thisWeek.changePercent != null
                            ? Math.abs(summary.thisWeek.changePercent) + "%"
                            : ""}
                        </span>
                        <span className="text-[13px] font-normal text-[#22376B]">
                          {summary.thisWeek.changeLabel?.replace(
                            /^[\d.]+%\s*/,
                            ""
                          )}
                        </span>
                      </div>
                    ) : (
                      <span />
                    )}
                    <span className="text-sm whitespace-nowrap shrink-0">
                      <span className="font-bold text-[#22376B]">
                        {summary?.thisWeek.hoursLabel ?? "—"}
                      </span>{" "}
                      <span className="text-[#667085]">Logged</span>
                    </span>
                  </div>
                </div>

                <div>
                  <div className="flex items-center gap-1.5 mb-3">
                    <span className="text-base font-medium text-[#22376B]">
                      This Month
                    </span>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger>
                          <HelpCircle className="size-4 text-[#98A2B3]" />
                        </TooltipTrigger>
                        <TooltipContent visual="white" size="md">
                          {summary?.thisMonth.dateRangeLabel && (
                            <p className="font-semibold text-[#22376B]">
                              {summary.thisMonth.dateRangeLabel}
                            </p>
                          )}
                          <p>Earnings logged for the current month.</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                  <FigmaAmount
                    amount={summary?.thisMonth.amount}
                    symbol={currencySymbol(
                      summary?.thisMonth.displayCurrency || "USD"
                    )}
                    size="md"
                  />
                  <div className="flex items-center justify-between gap-3 mt-2 min-h-[20px]">
                    {summary?.thisMonth.changeLabel ? (
                      <div className="flex items-center gap-1 min-w-0 whitespace-nowrap">
                        <span
                          className={cn(
                            "inline-flex items-center gap-1 text-[13px] font-semibold",
                            summary.thisMonth.changeDirection === "up"
                              ? "text-success-500"
                              : "text-[#FF3B30]"
                          )}
                        >
                          {summary.thisMonth.changeDirection === "up" ? (
                            <ArrowUp className="size-3.5" />
                          ) : (
                            <ArrowDown className="size-3.5" />
                          )}
                          {summary.thisMonth.changePercent != null
                            ? Math.abs(summary.thisMonth.changePercent) + "%"
                            : ""}
                        </span>
                        <span className="text-[13px] font-normal text-[#22376B]">
                          {summary.thisMonth.changeLabel?.replace(
                            /^[\d.]+%\s*/,
                            ""
                          )}
                        </span>
                      </div>
                    ) : (
                      <span />
                    )}
                    <span className="text-sm whitespace-nowrap shrink-0">
                      <span className="font-bold text-[#22376B]">
                        {summary?.thisMonth.hoursLabel ?? "—"}
                      </span>{" "}
                      <span className="text-[#667085]">Logged</span>
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Direct Deposit */}
          <div className="rounded-lg border border-gray-200 bg-white shadow-[0px_2px_5px_0px_rgba(0,0,0,.04)] overflow-hidden">
            <div className="flex items-center justify-between p-8 pb-6">
              <h3 className="text-lg font-semibold text-[#22376B]">
                Direct Deposit
              </h3>
              <Button
                variant="link"
                visual="gray"
                size="sm"
                className="font-semibold text-[#22376B] underline underline-offset-4"
                onClick={() => onNavigateTab?.("payouts")}
              >
                View All Payouts
              </Button>
            </div>

            <div className="mx-8 rounded-lg border border-gray-200 bg-gray-25 p-8 grid grid-cols-1 md:grid-cols-2 md:divide-x md:divide-gray-200 gap-8 md:gap-0">
              {/* Upcoming Payout — nextRunAt is server-derived (schedule + day + current
                date); payout-service has no precomputed future-payout amount, so the
                dollar figure shown is the current available balance, explicitly
                labelled as an estimate rather than a guaranteed total (Doc07). */}
              <div className="md:pr-10">
                <p className="text-base font-medium text-[#22376B] mb-4">
                  Upcoming Payout
                </p>
                {scheduleLoading ? (
                  <div className="h-9 w-28 bg-gray-100 rounded animate-pulse" />
                ) : scheduleError ? (
                  <div>
                    <p className="text-sm text-red-600">Unavailable.</p>
                    <button
                      className="text-sm text-primary-600 underline mt-1"
                      onClick={loadSchedule}
                    >
                      Retry
                    </button>
                  </div>
                ) : scheduleNextRunAt ? (
                  <FigmaAmount
                    amount={balance?.availableBalance}
                    symbol="$"
                    size="md"
                  />
                ) : (
                  <p className="text-sm text-gray-400">No payout scheduled</p>
                )}
                {scheduleNextRunAt && (
                  <div className="flex items-center gap-1.5 mt-3">
                    <span className="text-sm text-[#667085]">
                      {/* nextRunAt is a UTC-midnight calendar date (schedule.service.ts builds it via
                        Date.UTC), not a moment in time — formatting it in the viewer's local zone
                        would silently shift the displayed date back a day for anyone west of UTC. */}
                      Scheduled for{" "}
                      {new Date(scheduleNextRunAt).toLocaleDateString("en-US", {
                        month: "long",
                        day: "numeric",
                        year: "numeric",
                        timeZone: "UTC",
                      })}
                    </span>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger>
                          <HelpCircle className="size-4 text-[#98A2B3]" />
                        </TooltipTrigger>
                        <TooltipContent visual="white" size="md">
                          <p>Estimated arrival in 2-3 business days.</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                )}
                <Button
                  variant="outlined"
                  visual="gray"
                  size="sm"
                  className="mt-6 font-semibold text-[#22376B]"
                  onClick={() => onEditPayoutSchedule?.()}
                >
                  Edit Payout Schedule
                </Button>
              </div>

              {/* Deposit Method */}
              <div className="md:pl-10">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-1.5">
                    <span className="text-base font-medium text-[#22376B]">
                      Deposit Method
                    </span>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger>
                          <HelpCircle className="size-4 text-[#98A2B3]" />
                        </TooltipTrigger>
                        <TooltipContent visual="white" size="md">
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
                    className="font-semibold text-[#22376B] underline underline-offset-4"
                    onClick={() => {
                      if (defaultMethod) {
                        setEditingMethod({ ...defaultMethod })
                        setEditBankForm(createBlankEditBankForm())
                        setEditBankError("")
                        setEditBankSaveState(null)
                      }
                    }}
                  >
                    Edit
                  </Button>
                </div>
                {methodsLoading ? (
                  <div className="h-10 bg-gray-100 rounded animate-pulse" />
                ) : methodsError ? (
                  <div className="text-sm">
                    <span className="text-red-600">Unavailable.</span>{" "}
                    <button
                      className="text-primary-600 underline"
                      onClick={fetchMethods}
                    >
                      Retry
                    </button>
                  </div>
                ) : defaultMethod && defaultMethodLabel ? (
                  <div className="flex items-center gap-3 rounded-lg border border-gray-200 px-4 py-3">
                    {/* Figma: plain bank glyph in a bordered square for this card,
                      not a per-institution BankLogo. */}
                    <div className="size-10 rounded-lg border border-gray-200 bg-white flex items-center justify-center shrink-0">
                      <BankIcon className="size-5 text-[#667085]" />
                    </div>
                    <div className="flex items-baseline gap-1.5 min-w-0 flex-1">
                      <span className="text-sm font-semibold text-[#22376B] truncate">
                        {defaultMethodLabel.name}
                      </span>
                      {defaultMethodMask && (
                        <span className="text-sm text-[#98A2B3] whitespace-nowrap shrink-0">
                          {defaultMethodMask}
                        </span>
                      )}
                    </div>
                    <Badge
                      visual="primary"
                      size="sm"
                      className="shrink-0 bg-primary-50 text-primary-600"
                    >
                      Default
                    </Badge>
                  </div>
                ) : (
                  <div className="text-sm text-gray-400 text-center py-2">
                    No deposit method set
                  </div>
                )}
              </div>
            </div>

            <div className="h-8" />

            {/* Previous Payout — sourced from the real payout history (most recent
              completed record), a historical snapshot per Doc07 Domain 8. */}
            <div className="flex items-center justify-between bg-gray-25 border-t border-gray-200 px-8 py-6">
              {previousPayoutLoading ? (
                <div className="h-9 w-full bg-gray-100 rounded animate-pulse" />
              ) : previousPayoutError ? (
                <div className="text-sm">
                  <span className="text-red-600">
                    Previous payout unavailable.
                  </span>{" "}
                  <button
                    className="text-primary-600 underline"
                    onClick={loadPreviousPayout}
                  >
                    Retry
                  </button>
                </div>
              ) : previousPayout ? (
                <>
                  <div>
                    <p className="text-base font-medium text-[#22376B]">
                      Previous Payout
                    </p>
                    <p className="text-sm text-[#667085] mt-2">
                      Deposited on{" "}
                      {new Date(previousPayout.settledAt).toLocaleDateString(
                        "en-US",
                        { month: "long", day: "numeric", year: "numeric" }
                      )}{" "}
                      to{" "}
                      <BankIcon className="size-3.5 inline text-[#98A2B3]" />{" "}
                      {previousPayout.methodLabel ?? "Method unavailable"}
                    </p>
                  </div>
                  <FigmaAmount
                    amount={previousPayout.amountUsd}
                    symbol={currencySymbol(
                      summary?.thisMonth.displayCurrency || "USD"
                    )}
                    size="md"
                    muted
                  />
                </>
              ) : (
                <p className="text-sm text-gray-400">No previous payouts yet</p>
              )}
            </div>
          </div>

          {/* Connected Accounts */}
          <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-[0px_2px_5px_0px_rgba(0,0,0,.04)]">
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
                    <TooltipContent visual="white" size="md">
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
                onClick={() => {
                  setVerifyState(null)
                  setShowAddMethod(true)
                }}
                disabled={!canAddMore || methodGateBlocked}
              >
                Add Deposit Method
              </Button>
            </div>

            {/* SCR-01/SCR-18: KYC gate banner — fail-closed, blocks adding a method */}
            {methodGateBlocked && (
              <div className="mb-4 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-600">
                Identity verification is required before you can add a payout
                method.
              </div>
            )}

            <div className="space-y-3">
              {methodsLoading ? (
                [...Array(2)].map((_, i) => (
                  <div
                    key={i}
                    className="h-14 bg-gray-100 rounded-lg animate-pulse"
                  />
                ))
              ) : methodsError ? (
                <div className="text-center py-6">
                  <p className="text-sm text-red-600">
                    We couldn't load your connected accounts.
                  </p>
                  <button
                    className="text-sm text-primary-600 underline mt-1"
                    onClick={fetchMethods}
                  >
                    Retry
                  </button>
                </div>
              ) : methods.length === 0 ? (
                <div className="text-sm text-gray-400 text-center py-6">
                  No connected accounts yet. Add one to receive payouts.
                </div>
              ) : (
                methods.map((m) => {
                  const { name, sub } = getMethodLabel(m)
                  const statusBadge = getMethodStatusBadge(m)
                  return (
                    <div
                      key={m.id}
                      className="flex items-center gap-3 rounded-lg border border-gray-200 px-4 py-3"
                    >
                      {getMethodIcon(m)}
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <span className="text-sm font-medium text-dark-blue-400">
                          {name}
                        </span>
                        {sub && (
                          <span className="text-sm text-gray-400">{sub}</span>
                        )}
                      </div>
                      {(m.reauthRequired ||
                        m.verificationStatus !== "verified") && (
                        <Badge visual={statusBadge.visual} size="sm">
                          {statusBadge.label}
                        </Badge>
                      )}
                      {m.reauthRequired && (
                        <Button
                          variant="outlined"
                          visual="primary"
                          size="sm"
                          className="mr-2"
                          disabled={reauthorizingId === m.id}
                          onClick={() => handleReauthorize(m)}
                        >
                          {reauthorizingId === m.id
                            ? "Reconnecting…"
                            : "Reconnect"}
                        </Button>
                      )}
                      {m.isDefault ? (
                        <Badge
                          visual="primary"
                          size="sm"
                          className="mr-2 bg-primary-50 text-primary-600"
                        >
                          Default
                        </Badge>
                      ) : m.verificationStatus === "verified" ? (
                        <Button
                          variant="link"
                          visual="gray"
                          size="sm"
                          className="mr-2 font-semibold text-gray-500 underline underline-offset-4 hover:text-[#22376B]"
                          onClick={() => requestSetDefault(m)}
                        >
                          Make Default
                        </Button>
                      ) : null}
                      <IconButton
                        size="sm"
                        variant="ghost"
                        visual="gray"
                        onClick={() => {
                          setEditingMethod({ ...m })
                          setEditBankForm(createBlankEditBankForm())
                          setEditBankError("")
                          setEditBankSaveState(null)
                        }}
                      >
                        <Edit03 className="size-4" />
                      </IconButton>
                      <IconButton
                        size="sm"
                        variant="ghost"
                        visual="gray"
                        onClick={() => setConfirmRemove(m)}
                      >
                        <Trash01 className="size-4" />
                      </IconButton>
                    </div>
                  )
                })
              )}
            </div>

            {/* Verification Dialog */}
            {verifyState && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
                <div
                  className={cn(
                    "bg-white rounded-xl w-full shadow-xl overflow-hidden",
                    verifyState.step === "instructions" ||
                      verifyState.step === "amounts"
                      ? "max-w-[700px]"
                      : "max-w-md"
                  )}
                >
                  {verifyState.step === "instructions" && (
                    <div className="flex flex-col">
                      <div className="relative flex items-center gap-2 px-6 py-6 border-b border-gray-200">
                        <IconButton
                          size="sm"
                          variant="ghost"
                          visual="gray"
                          className="text-dark-blue-400"
                          onClick={() => {
                            if (verifyState?.methodId)
                              deleteMethod(verifyState.methodId)
                            setVerifyState(null)
                            setShowAddMethod(true)
                            setAddForm((f) => ({
                              ...f,
                              methodType: "BANK_MANUAL",
                            }))
                          }}
                        >
                          <ArrowLeft className="size-4" />
                        </IconButton>
                        <h3 className="text-lg font-semibold text-dark-blue-400">
                          Add your bank account manually
                        </h3>
                        <IconButton
                          size="sm"
                          variant="ghost"
                          visual="gray"
                          className="absolute right-2.5 top-2.5"
                          onClick={() => {
                            if (verifyState?.methodId)
                              deleteMethod(verifyState.methodId)
                            setVerifyState(null)
                            setShowAddMethod(false)
                            fetchMethods()
                          }}
                        >
                          <X className="size-4" />
                        </IconButton>
                      </div>
                      <div className="flex flex-col items-center gap-5 px-10 py-[50px] text-center max-h-[282px] overflow-y-auto">
                        <h4 className="text-lg font-semibold text-dark-blue-400">
                          Please verify your bank account
                        </h4>
                        <p className="text-sm text-dark-blue-400">
                          We sent two deposits (between $0.01 and $0.99) to your
                          account ending in{" "}
                          <strong>{verifyState.displayLabel}</strong>. It can
                          take up to two (2) business days for these deposits to
                          arrive. Please log into your account to check the
                          amounts sent from "Marketeq" and then click the
                          "Verify Account" button below to enter the amounts
                          received.
                        </p>
                        <p className="text-xs text-gray-400">
                          If you have any questions or concerns, please reach us
                          at <strong>support@marketeqdigital.com</strong> or
                          call <strong>800-529-7465</strong>
                        </p>
                      </div>
                      <div className="flex items-center justify-between px-6 py-3 border-t border-gray-200">
                        <button
                          className="text-xs font-semibold text-primary-500 flex items-center gap-2"
                          onClick={() =>
                            toast({
                              title: "Use Instant Verification",
                              description: "Instant verification coming soon.",
                            })
                          }
                        >
                          <Zap className="size-3.5" />
                          Use Instant Verification
                        </button>
                        <div className="flex gap-3">
                          <Button
                            variant="outlined"
                            visual="gray"
                            size="sm"
                            onClick={() => {
                              if (verifyState?.methodId)
                                deleteMethod(verifyState.methodId)
                              setVerifyState(null)
                              setShowAddMethod(true)
                              setAddForm((f) => ({
                                ...f,
                                methodType: "BANK_MANUAL",
                              }))
                            }}
                          >
                            Back
                          </Button>
                          <Button
                            variant="filled"
                            visual="primary"
                            size="sm"
                            onClick={() =>
                              setVerifyState((s) =>
                                s ? { ...s, step: "amounts" } : null
                              )
                            }
                          >
                            Verify Account
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}
                  {verifyState.step === "amounts" && (
                    <div className="flex flex-col">
                      <div className="relative flex items-center gap-2 px-6 py-6 border-b border-gray-200">
                        <IconButton
                          size="sm"
                          variant="ghost"
                          visual="gray"
                          className="text-dark-blue-400"
                          onClick={() =>
                            setVerifyState((s) =>
                              s ? { ...s, step: "instructions" } : null
                            )
                          }
                        >
                          <ArrowLeft className="size-4" />
                        </IconButton>
                        <h3 className="text-lg font-semibold text-dark-blue-400">
                          Add your bank account manually
                        </h3>
                        <IconButton
                          size="sm"
                          variant="ghost"
                          visual="gray"
                          className="absolute right-2.5 top-2.5"
                          onClick={() => setVerifyState(null)}
                        >
                          <X className="size-4" />
                        </IconButton>
                      </div>
                      <div className="flex flex-col gap-8 px-[50px] py-[50px] max-h-[278px] overflow-y-auto">
                        <div className="flex flex-col items-center gap-5 px-[90px] text-center">
                          <h4 className="text-lg font-semibold text-dark-blue-400">
                            Please verify your bank account
                          </h4>
                          <p className="text-sm text-dark-blue-400">
                            Enter the two micro deposit amounts we sent to your
                            account ending in{" "}
                            <strong>{verifyState.displayLabel}</strong>. The
                            deposits are sent from "Marketeq".
                          </p>
                        </div>
                        {/* AC-05.04/05.05: hidden on first visit, shown after a failed attempt (EC-09) */}
                        {typeof verifyState.attemptsLeft === "number" && (
                          <p
                            className={cn(
                              "text-xs text-center font-medium rounded px-2 py-1",
                              verifyState.attemptsLeft <= 1
                                ? "text-red-600 bg-red-50"
                                : "text-warning-600 bg-warning-50"
                            )}
                          >
                            The amounts you entered don't match — check your
                            bank statement and try again.{" "}
                            {verifyState.attemptsLeft} attempt
                            {verifyState.attemptsLeft === 1 ? "" : "s"}{" "}
                            remaining.
                          </p>
                        )}
                        <div className="flex items-start gap-3">
                          <div className="flex-1">
                            <label className="text-sm font-medium text-dark-blue-400 mb-1.5 block">
                              1st Deposit
                            </label>
                            <input
                              className="w-full border border-gray-300 rounded-[5px] px-3.5 py-2.5 text-base shadow-xs"
                              placeholder="e.g. 7 (cents)"
                              value={microAmounts.amount1}
                              onChange={(e) =>
                                setMicroAmounts((a) => ({
                                  ...a,
                                  amount1: e.target.value,
                                }))
                              }
                            />
                          </div>
                          <div className="flex-1">
                            <label className="text-sm font-medium text-dark-blue-400 mb-1.5 block">
                              2nd Deposit
                            </label>
                            <input
                              className="w-full border border-gray-300 rounded-[5px] px-3.5 py-2.5 text-base shadow-xs"
                              placeholder="e.g. 39 (cents)"
                              value={microAmounts.amount2}
                              onChange={(e) =>
                                setMicroAmounts((a) => ({
                                  ...a,
                                  amount2: e.target.value,
                                }))
                              }
                            />
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center justify-end gap-3 px-6 py-3 border-t border-gray-200">
                        <Button
                          variant="outlined"
                          visual="gray"
                          size="sm"
                          onClick={() => setVerifyState(null)}
                        >
                          Cancel
                        </Button>
                        <Button
                          variant="filled"
                          visual="primary"
                          size="sm"
                          onClick={handleVerifyMicroDeposits}
                          disabled={
                            !microAmounts.amount1.trim() ||
                            !microAmounts.amount2.trim()
                          }
                        >
                          Submit
                        </Button>
                      </div>
                    </div>
                  )}
                  {verifyState.step === "verifying" && (
                    <div className="p-8 text-center space-y-4">
                      <div className="flex flex-col items-center gap-1">
                        <BankLogo bankName={verifyState.bankName} size={80} />
                        <span className="text-sm font-medium text-dark-blue-400">
                          {verifyState.bankName || "Your Bank"}
                        </span>
                      </div>
                      <h4 className="text-base font-semibold text-dark-blue-400">
                        Verifying Your Account...
                      </h4>
                      <div className="flex justify-center">
                        <div className="size-14 border-[3px] border-primary-100 border-t-primary-600 rounded-full animate-spin" />
                      </div>
                      <p className="text-sm text-dark-blue-400">
                        We're verifying your bank account. This may take up to
                        30 seconds.
                      </p>
                    </div>
                  )}
                  {verifyState.step === "success" && (
                    <div className="p-6 space-y-4 relative">
                      <IconButton
                        size="sm"
                        variant="ghost"
                        visual="gray"
                        className="absolute right-2.5 top-2.5"
                        onClick={() => {
                          setVerifyState(null)
                          setShowAddMethod(false)
                          fetchMethods()
                        }}
                      >
                        <X className="size-4" />
                      </IconButton>
                      <div className="text-center py-4 space-y-3">
                        <div className="flex flex-col items-center gap-1">
                          <BankLogo bankName={verifyState.bankName} size={80} />
                          <span className="text-sm font-medium text-dark-blue-400">
                            {verifyState.bankName || "Your Bank"}
                          </span>
                        </div>
                        <h4 className="text-base font-semibold text-dark-blue-400">
                          {verifyState.source === "stripe"
                            ? "Your bank account has been securely linked."
                            : "Your bank account has been verified."}
                        </h4>
                        <div className="flex items-center gap-2 rounded-lg border border-gray-200 px-4 py-3">
                          <BankIcon className="size-5 text-gray-500" />
                          <div className="flex flex-col items-start">
                            <span className="text-sm font-medium text-dark-blue-400">
                              {verifyState.displayLabel}
                            </span>
                            <span className="text-xs text-gray-400">
                              {addForm?.accountType
                                ? addForm.accountType.charAt(0).toUpperCase() +
                                  addForm.accountType.slice(1) +
                                  " Account"
                                : "Checking Account"}
                            </span>
                          </div>
                          <Badge visual="success" size="sm" className="ml-auto">
                            Verified
                          </Badge>
                        </div>
                      </div>
                      <Button
                        variant="light"
                        visual="primary"
                        size="sm"
                        className="w-full"
                        onClick={async () => {
                          await handleSetDefault(verifyState.methodId)
                          setVerifyState(null)
                        }}
                      >
                        Set As Default Deposit Method
                      </Button>
                      {/* showAddMethod is already false by this point (handleConnectStripe
                        closes it before showing this screen) — just nulling verifyState
                        landed on the dashboard instead of the deposit-method picker, so
                        this reopens it explicitly. */}
                      <Button
                        variant="outlined"
                        visual="gray"
                        size="sm"
                        className="w-full"
                        leftIcon={<ArrowLeft className="size-4" />}
                        onClick={() => {
                          setVerifyState(null)
                          setShowAddMethod(true)
                          setAddForm((f) => ({ ...f, methodType: "PICK" }))
                          fetchMethods()
                        }}
                      >
                        Back to Deposit Methods
                      </Button>
                    </div>
                  )}
                  {verifyState.step === "failed" && (
                    <div className="p-6 text-center space-y-4">
                      <div className="size-12 mx-auto flex items-center justify-center rounded-full bg-warning-50">
                        <AlertTriangle className="size-6 text-warning-600" />
                      </div>
                      <h4 className="text-base font-semibold text-dark-blue-400">
                        {verifyState.source === "stripe"
                          ? "Connection Failed"
                          : "Verification Failed"}
                      </h4>
                      <p className="text-sm text-dark-blue-400">
                        {verifyState.source === "stripe"
                          ? verifyState.errorMessage ||
                            "We couldn't verify your bank at this time. This may be due to a temporary network issue or incorrect information."
                          : "We couldn't verify your bank at this time. Please check your deposit amounts and try again."}
                      </p>
                      <div className="flex items-center justify-between">
                        {/* Same fix as the success screen above — reopen the picker
                          instead of just closing everything. */}
                        <Button
                          variant="link"
                          visual="gray"
                          size="sm"
                          onClick={() => {
                            setVerifyState(null)
                            setShowAddMethod(true)
                            setAddForm((f) => ({ ...f, methodType: "PICK" }))
                            fetchMethods()
                          }}
                        >
                          Back to Deposit Methods
                        </Button>
                        <Button
                          variant="outlined"
                          visual="gray"
                          size="sm"
                          leftIcon={<RefreshCcw01 className="size-4" />}
                          onClick={() => {
                            if (verifyState.source === "stripe") {
                              const bankName = verifyState.bankName
                              setVerifyState(null)
                              handleConnectStripe(bankName)
                            } else
                              setVerifyState((s) =>
                                s ? { ...s, step: "amounts" } : null
                              )
                          }}
                        >
                          Retry
                        </Button>
                      </div>
                    </div>
                  )}
                  {/* AC-05.06/ERR-22: 3 failed attempts → 24h lock, no retry available */}
                  {verifyState.step === "locked" && (
                    <LockedVerificationStep
                      methodId={verifyState.methodId}
                      lockedUntil={verifyState.lockedUntil}
                      onClose={() => {
                        setVerifyState(null)
                        fetchMethods()
                      }}
                      onUnlockedRetry={() =>
                        setVerifyState((s) =>
                          s
                            ? { ...s, step: "amounts", attemptsLeft: undefined }
                            : null
                        )
                      }
                    />
                  )}
                  {/* AC-05.08/ERR-44: 10-day window elapsed — must re-add the account */}
                  {verifyState.step === "expired" && (
                    <div className="p-6 text-center space-y-4">
                      <div className="size-12 mx-auto flex items-center justify-center rounded-full bg-gray-100">
                        <span className="text-gray-500 text-2xl">⏱</span>
                      </div>
                      <h4 className="text-base font-semibold text-dark-blue-400">
                        Verification Window Expired
                      </h4>
                      <p className="text-sm text-gray-500">
                        Your verification window has expired. Please remove this
                        account and add it again to restart verification.
                      </p>
                      <Button
                        variant="filled"
                        visual="primary"
                        size="sm"
                        className="w-full"
                        onClick={async () => {
                          await deleteMethod(verifyState.methodId)
                          setVerifyState(null)
                          setShowAddMethod(true)
                          setAddForm((f) => ({
                            ...f,
                            methodType: "BANK_MANUAL",
                          }))
                        }}
                      >
                        Start Over
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Wise/Payoneer OAuth return — dedicated "X Connected" /
              "Couldn't Connect to X" screens (Figma), replacing what used to be
              a toast-only confirmation with no way to set default or retry in place. */}
            {oauthResult && (
              <div
                className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
                onClick={() => setOauthResult(null)}
              >
                <div
                  className="bg-white rounded-xl w-full max-w-md shadow-xl p-6 relative"
                  onClick={(e) => e.stopPropagation()}
                >
                  <IconButton
                    size="sm"
                    variant="ghost"
                    visual="gray"
                    className="absolute top-4 right-4"
                    onClick={() => setOauthResult(null)}
                  >
                    <X className="size-4" />
                  </IconButton>
                  {oauthResult.status === "success" ? (
                    <div className="text-center py-2 space-y-4">
                      <div className="flex flex-col items-center gap-1">
                        {oauthResult.provider === "WISE" ? (
                          <WiseIconV2 className="size-12" />
                        ) : (
                          <PayoneerDefault className="size-10" />
                        )}
                      </div>
                      <h4 className="text-base font-semibold text-dark-blue-400">
                        {oauthResult.provider === "WISE" ? "Wise" : "Payoneer"}{" "}
                        Connected
                      </h4>
                      <div className="flex items-center gap-2 rounded-lg border border-gray-200 px-4 py-3 text-left">
                        {oauthResult.provider === "WISE" ? (
                          <WiseIconV2 className="size-5 rounded-full" />
                        ) : (
                          <PayoneerDefault className="size-5" />
                        )}
                        <div className="flex flex-col items-start min-w-0">
                          <span className="text-sm font-medium text-dark-blue-400">
                            {oauthResult.provider === "WISE"
                              ? "Wise Account"
                              : "Payoneer Account"}
                          </span>
                          <span className="text-xs text-gray-400 truncate">
                            {oauthResult.method?.displayLabel ??
                              oauthResult.method?.nickname ??
                              "—"}
                          </span>
                        </div>
                        <Badge
                          visual="success"
                          size="sm"
                          className="ml-auto shrink-0"
                        >
                          Verified
                        </Badge>
                      </div>
                      <Button
                        variant="light"
                        visual="primary"
                        size="sm"
                        className="w-full"
                        onClick={async () => {
                          if (oauthResult.method?.id)
                            await handleSetDefault(oauthResult.method.id)
                          setOauthResult(null)
                        }}
                      >
                        Set As Default Deposit Method
                      </Button>
                      <Button
                        variant="outlined"
                        visual="gray"
                        size="sm"
                        className="w-full"
                        leftIcon={<ChevronLeft className="size-4" />}
                        onClick={() => setOauthResult(null)}
                      >
                        Back to Deposit Methods
                      </Button>
                    </div>
                  ) : (
                    <div className="text-center py-2 space-y-4">
                      <div className="size-12 mx-auto flex items-center justify-center rounded-full bg-warning-50">
                        <AlertTriangle className="size-6 text-warning-600" />
                      </div>
                      <h4 className="text-base font-semibold text-dark-blue-400">
                        Couldn't Connect to{" "}
                        {oauthResult.provider === "WISE" ? "Wise" : "Payoneer"}
                      </h4>
                      <p className="text-sm text-gray-500">
                        {oauthResult.errorMessage ??
                          `We were unable to link your ${oauthResult.provider === "WISE" ? "Wise" : "Payoneer"} account. You may have canceled the login or encountered a connection issue.`}
                      </p>
                      <div className="flex flex-col gap-2">
                        <Button
                          variant="outlined"
                          visual="gray"
                          size="sm"
                          className="w-full"
                          leftIcon={<RefreshCcw01 className="size-4" />}
                          onClick={() => {
                            const provider = oauthResult.provider
                            setOauthResult(null)
                            handleConnectOAuth(provider)
                          }}
                        >
                          Retry
                        </Button>
                        <Button
                          variant="link"
                          visual="gray"
                          size="sm"
                          className="w-full"
                          leftIcon={<ChevronLeft className="size-4" />}
                          onClick={() => setOauthResult(null)}
                        >
                          Back to Deposit Methods
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Add Method Dialog — multi-step */}
            {showAddMethod && (
              <div
                className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
                onClick={() => {
                  setShowAddMethod(false)
                  setAddForm({
                    methodType: "PICK",
                    bankAccountName: "",
                    bankAccountNumber: "",
                    bankAccountNumberConfirm: "",
                    bankRoutingNumber: "",
                    bankSortCode: "",
                    bankIfscCode: "",
                    bankBsbNumber: "",
                    bankInstitutionNumber: "",
                    bankTransitNumber: "",
                    bankIban: "",
                    bankSwiftBic: "",
                    bankCode: "",
                    bankBranchCode: "",
                    bankClabe: "",
                    bankCnapsCode: "",
                    bankBik: "",
                    bankCountry: "US",
                    bankCountrySearch: "",
                    bankCountryOpen: false,
                    bankCurrency: "USD",
                    accountType: "CHECKING",
                    nickname: "",
                    bankConsent: false,
                  })
                  setCryptoStep("provider")
                  setCryptoForm({
                    provider: "",
                    network: "",
                    currency: "",
                    address: "",
                  })
                  setCryptoError("")
                  setCryptoResult(null)
                  setCryptoWcSession(null)
                  setCryptoWcConsent(false)
                }}
              >
                <div
                  className="bg-white rounded-xl w-full max-w-lg shadow-xl overflow-hidden relative max-h-[90vh] flex flex-col"
                  onClick={(e) => e.stopPropagation()}
                >
                  {/* Step 1: Pick method */}
                  {!addForm.methodType || addForm.methodType === "PICK" ? (
                    <>
                      <div className="px-6 pt-6 pb-4 shrink-0">
                        <div className="flex items-center justify-between">
                          <h3 className="text-lg font-semibold text-dark-blue-400">
                            Add Deposit Method
                          </h3>
                          <IconButton
                            size="sm"
                            variant="ghost"
                            visual="gray"
                            onClick={() => setShowAddMethod(false)}
                          >
                            <X className="size-4" />
                          </IconButton>
                        </div>
                        <p className="mt-1 text-sm text-gray-500 leading-relaxed">
                          Securely connect your payout account to receive
                          earnings.
                          <br />
                          For all account types, setup may take 1–3 business
                          days.
                        </p>
                      </div>
                      <div className="border-t border-gray-200 shrink-0" />
                      <ScrollArea
                        type="always"
                        className="bg-gray-50 flex-1 min-h-0 flex flex-col"
                        viewportClassName="flex-1 min-h-0 [&>div]:!h-auto"
                      >
                        <div className="p-5 space-y-3">
                          {[
                            {
                              type: "BANK_CONNECT",
                              label: "Direct Deposit to U.S. Bank",
                              sub: [
                                "Transfer reflects in 1–2 business days",
                                "Charges $0–$1 per transaction",
                              ],
                              icon: (
                                <BankIcon className="size-5 text-gray-500" />
                              ),
                            },
                            // PayoneerCircleIcon uses the bare glyph paths (no
                            // card/border baked in, unlike PayoneerIcon) inside its
                            // own circular badge — matches WiseIcon's own circular badge below.
                            {
                              type: "WISE",
                              label: "Wise",
                              // Now settles over the same Stripe ACH rail as
                              // Direct Deposit (see BANK_CONNECT above) —
                              // Wise is only used to OAuth-link the banking
                              // details, not to move the money itself.
                              sub: [
                                "Transfer reflects in 1–2 business days",
                                "Charges $0–$1 per transaction",
                              ],
                              // Same bare-glyph-in-square-chip treatment as
                              // Connected Accounts' getMethodIcon WISE case —
                              // not the circular green badge (WiseIconV2 on
                              // its own here double-wraps inside the default
                              // circular wrapper below).
                              icon: (
                                <div className="size-9 rounded-lg border border-gray-200 bg-white flex items-center justify-center shrink-0">
                                  <WiseGlyphV2 className="w-1/2 h-1/2" />
                                </div>
                              ),
                              selfContained: true,
                            },
                            {
                              type: "PAYONEER",
                              label: "Payoneer",
                              // Now settles over the same Stripe ACH rail as
                              // Direct Deposit (see BANK_CONNECT above) —
                              // Payoneer is only used to OAuth-link the
                              // banking details, not to move the money itself.
                              sub: [
                                "Transfer reflects in 1–2 business days",
                                "Charges $0–$1 per transaction",
                              ],
                              icon: <PayoneerCircleIcon />,
                              selfContained: true,
                            },
                            {
                              type: "CRYPTO",
                              label: "Crypto Wallet",
                              sub: [
                                "Transfer time varies (blockchain dependent)",
                                "Network gas fees may apply",
                              ],
                              icon: <CryptoWalletIcon />,
                            },
                            {
                              type: "MARKETEQ_DEBIT_CARD",
                              label: "Marketeq Debit Card",
                              sub: ["Instant transfer", "No processing fee"],
                              icon: (
                                <svg
                                  xmlns="http://www.w3.org/2000/svg"
                                  viewBox="0 0 38 22"
                                  className="w-5 h-3"
                                >
                                  <path
                                    fill="#306CFE"
                                    d="M33.073 21.724c-1.368 0-2.578-.714-3.905-1.587a5.045 5.045 0 0 0-5.479-.048c-1.344.794-2.672 1.667-4.229 1.667h-.49a4.826 4.826 0 0 1-3.138-1.199 4.864 4.864 0 0 1-1.605-2.96l-.024-.683a5.057 5.057 0 0 1 .633-2.382l1.897-3.334 1.186 2.088-1.344 2.286a2.747 2.747 0 0 0 1.017 3.715c.412.239.879.364 1.354.366h.561c2.032-.04 3.336-2.382 6.886-2.382 3.415 0 4.743 2.421 6.64 2.421a2.364 2.364 0 0 0 2.109-1.158 2.388 2.388 0 0 0 .017-2.414L28.117 3.697a2.749 2.749 0 0 0-2.372-1.37 2.734 2.734 0 0 0-2.371 1.37l-2.846 4.93-1.186-2.08 2.198-3.874a4.818 4.818 0 0 1 1.76-1.776 4.79 4.79 0 0 1 6.58 1.776l7.043 12.391a4.467 4.467 0 0 1-1.638 6.066 4.42 4.42 0 0 1-2.211.594Z"
                                  />
                                  <path
                                    fill="#306CFE"
                                    d="M22.939 15.469c-.134-.318-7.186-12.702-7.233-12.773A4.816 4.816 0 0 0 13.946.92a4.791 4.791 0 0 0-6.58 1.776L.607 14.532A4.819 4.819 0 0 0 .655 19.3 4.792 4.792 0 0 0 2.4 21.038c.722.417 1.54.637 2.373.638h.498c1.581 0 2.885-.865 4.23-1.667a5.15 5.15 0 0 1 3.952-.58 6.173 6.173 0 0 1-.553-2.206 7.263 7.263 0 0 0-4.396.96c-6.031 3.51-7.114-.857-6.134-2.659L9.12 3.617a2.749 2.749 0 0 1 2.372-1.37 2.734 2.734 0 0 1 2.372 1.37l4.743 8.311.727 1.286c1.415 2.524 1.898 3.112 1.898 3.85.027.169.027.34 0 .508a12.14 12.14 0 0 1 2.039-1.08 4.435 4.435 0 0 0-.332-1.023Z"
                                    opacity="0.5"
                                  />
                                </svg>
                              ),
                            },
                            // AC-02.10: Marketeq Debit Card must not appear while FEATURE_DEBIT_CARD_ENABLED is off (default MVP state).
                            // TEQ Coin has no entry above at all, satisfying AC-02.09 by omission.
                          ]
                            .filter(
                              (opt) =>
                                opt.type !== "MARKETEQ_DEBIT_CARD" ||
                                debitCardEnabled
                            )
                            .map((opt) => {
                              // BANK_CONNECT skips our own redundant bank-logo picker (Stripe
                              // re-asks for the institution inside its own hosted modal
                              // regardless of what's picked here) but still shows a one-step
                              // consent/disclosure screen before handing off to Stripe —
                              // see the 'BANK_CONNECT_CONFIRM' branch below.
                              const onSelect =
                                opt.type === "BANK_CONNECT"
                                  ? () =>
                                      setAddForm(
                                        (f) =>
                                          ({
                                            ...f,
                                            methodType: "BANK_CONNECT_CONFIRM",
                                          }) as any
                                      )
                                  : () =>
                                      setAddForm((f) => ({
                                        ...f,
                                        methodType: opt.type,
                                      }))
                              return (
                                <Card
                                  key={opt.type}
                                  className="items-center gap-3 px-4 py-3 rounded-lg cursor-pointer"
                                  onClick={onSelect}
                                >
                                  {(opt as any).selfContained ? (
                                    opt.icon
                                  ) : (
                                    <div className="size-9 rounded-full border border-gray-200 bg-white flex items-center justify-center shrink-0">
                                      {opt.icon}
                                    </div>
                                  )}
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-semibold text-dark-blue-400">
                                      {opt.label}
                                    </p>
                                    <p className="text-xs text-gray-500">
                                      {opt.sub[0]}
                                    </p>
                                    <p className="text-xs text-gray-500">
                                      {opt.sub[1]}
                                    </p>
                                  </div>
                                  <Button
                                    variant="outlined"
                                    visual="gray"
                                    size="sm"
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      onSelect()
                                    }}
                                  >
                                    Setup
                                  </Button>
                                </Card>
                              )
                            })}
                        </div>
                      </ScrollArea>
                    </>
                  ) : addForm.methodType === "BANK_CONNECT_CONFIRM" ? (
                    // Consent/disclosure step kept from the old flow (Stripe.js requires
                    // nothing here — this is purely so the contractor sees the "your
                    // credentials are never shared with Marketeq" disclosure before we
                    // hand off to Stripe's hosted modal, matching the consent step every
                    // other provider — Wise/Payoneer — already has).
                    <div className="p-6 relative">
                      <div className="absolute top-4 right-4">
                        <IconButton
                          size="sm"
                          variant="ghost"
                          visual="gray"
                          onClick={() => {
                            setShowAddMethod(false)
                            setAddForm((f) => ({ ...f, methodType: "PICK" }))
                          }}
                        >
                          <X className="size-4" />
                        </IconButton>
                      </div>
                      <div className="py-10 space-y-5">
                        <div className="flex items-center gap-4">
                          <BankIcon className="size-14 shrink-0 text-dark-blue-400" />
                          <h3 className="text-base font-semibold text-dark-blue-400">
                            Securely connect your bank account.
                          </h3>
                        </div>
                        <p className="text-xs text-gray-400">
                          Your banking credentials are never shared with
                          Marketeq.
                        </p>
                        <Button
                          variant="outlined"
                          visual="gray"
                          size="sm"
                          className="w-full py-3 text-base gap-x-3 active:ring-4 active:ring-gray-100"
                          leftIcon={<StripeDefault />}
                          disabled={!!(addForm as any)._stripeConnecting}
                          onClick={() => handleConnectStripe("")}
                        >
                          {(addForm as any)._stripeConnecting
                            ? "Connecting…"
                            : "Continue with Stripe"}
                        </Button>
                        <div className="flex items-center gap-3">
                          <div className="h-px flex-1 bg-gray-200" />
                          <span className="text-xs text-gray-400">or</span>
                          <div className="h-px flex-1 bg-gray-200" />
                        </div>
                        {/* Was previously reachable only via the now-disabled bank-grid
                          page's "Add my bank account manually" link — that was the
                          sole entry point into BANK_MANUAL, so it has to live
                          somewhere reachable now that page is gone. Styled to match
                          "Continue with Stripe" so both options read as equally valid. */}
                        <Button
                          variant="outlined"
                          visual="gray"
                          size="sm"
                          className="w-full py-3 text-base gap-x-3 active:ring-4 active:ring-gray-100"
                          leftIcon={<BankIcon className="size-5" />}
                          onClick={() =>
                            setAddForm(
                              (f) =>
                                ({
                                  ...f,
                                  methodType: "BANK_MANUAL",
                                  bankAccountName: "",
                                  bankAccountNumber: "",
                                  bankAccountNumberConfirm: "",
                                  bankRoutingNumber: "",
                                  bankSortCode: "",
                                  bankIfscCode: "",
                                  bankBsbNumber: "",
                                  bankInstitutionNumber: "",
                                  bankTransitNumber: "",
                                  bankCountry: "US",
                                  bankCurrency: "USD",
                                  nickname: "",
                                  accountType: "CHECKING",
                                  bankConsent: false,
                                  _selectedBank: "",
                                  _stripeConnecting: false,
                                }) as any
                            )
                          }
                        >
                          Add my bank account manually
                        </Button>
                        <Button
                          variant="link"
                          visual="gray"
                          size="sm"
                          className="w-full"
                          leftIcon={<ChevronLeft className="size-4" />}
                          onClick={() =>
                            setAddForm((f) => ({ ...f, methodType: "PICK" }))
                          }
                        >
                          Back to Deposit Methods
                        </Button>
                      </div>
                    </div>
                  ) : false && addForm.methodType === "BANK_CONNECT" ? (
                    // Disabled, not deleted: this screen (our own bank-logo grid) was
                    // purely redundant — Stripe's own hosted Financial Connections modal
                    // re-asks for the institution regardless of what's picked here.
                    // Selecting "Direct Deposit to U.S. Bank" now goes to the
                    // 'BANK_CONNECT_CONFIRM' consent screen above instead. The two "back
                    // to bank connect" links elsewhere were repointed to 'PICK'
                    // accordingly. Flip `false &&` back on to re-enable.
                    /* Step 2: Connect your bank account — bank picker grid */
                    <div className="p-6">
                      {!(addForm as any)._selectedBank && (
                        <>
                          <div className="flex items-center gap-2 mb-2">
                            <IconButton
                              size="sm"
                              variant="ghost"
                              visual="gray"
                              onClick={() =>
                                setAddForm((f) => ({
                                  ...f,
                                  methodType: "PICK",
                                  _selectedBank: "",
                                }))
                              }
                            >
                              <ChevronLeft className="size-4" />
                            </IconButton>
                            <h3 className="text-base font-semibold text-dark-blue-400">
                              Connect your bank account
                            </h3>
                            <IconButton
                              size="sm"
                              variant="ghost"
                              visual="gray"
                              className="ml-auto"
                              onClick={() => {
                                setShowAddMethod(false)
                                setAddForm((f) => ({
                                  ...f,
                                  methodType: "PICK",
                                  _selectedBank: "",
                                }))
                              }}
                            >
                              <X className="size-4" />
                            </IconButton>
                          </div>
                          <p className="text-xs text-gray-400 mb-4">
                            Securely link your bank with Stripe connect. For all
                            account types, it may take up to 3 days to activate
                          </p>
                        </>
                      )}
                      {!!(addForm as any)._selectedBank && (
                        <div className="absolute top-4 right-4">
                          <IconButton
                            size="sm"
                            variant="ghost"
                            visual="gray"
                            onClick={() => {
                              setShowAddMethod(false)
                              setAddForm((f) => ({
                                ...f,
                                methodType: "PICK",
                                _selectedBank: "",
                              }))
                            }}
                          >
                            <X className="size-4" />
                          </IconButton>
                        </div>
                      )}

                      {!(addForm as any)._selectedBank ? (
                        <>
                          {/* Search */}
                          <div className="relative mb-4">
                            <svg
                              className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                              strokeWidth={2}
                            >
                              <circle cx="11" cy="11" r="8" />
                              <path d="m21 21-4.35-4.35" />
                            </svg>
                            <input
                              className="w-full border border-gray-200 rounded-lg pl-9 pr-3 py-2.5 text-sm"
                              placeholder="Find your bank"
                              value={(addForm as any)._bankSearch || ""}
                              onChange={(e) =>
                                setAddForm(
                                  (f) =>
                                    ({
                                      ...f,
                                      _bankSearch: e.target.value,
                                    }) as any
                                )
                              }
                            />
                          </div>

                          {/* Bank grid */}
                          <div className="grid grid-cols-4 gap-2 mb-4">
                            {[
                              { name: "Chase", logo: "/bank-logos/chase.png" },
                              {
                                name: "Bank of America",
                                logo: "/bank-logos/bofa.png",
                              },
                              {
                                name: "Wells Fargo",
                                logo: "/bank-logos/wellsfargo.png",
                              },
                              {
                                name: "Citibank",
                                logo: "/bank-logos/citibank.png",
                              },
                              { name: "USAA", logo: "/bank-logos/usaa.png" },
                              {
                                name: "TD Bank",
                                logo: "/bank-logos/tdbank.png",
                              },
                              {
                                name: "Regions",
                                logo: "/bank-logos/regions.png",
                              },
                              {
                                name: "Capital One",
                                logo: "/bank-logos/capitalone.png",
                              },
                            ]
                              .filter(
                                (b) =>
                                  !(addForm as any)._bankSearch ||
                                  b.name
                                    .toLowerCase()
                                    .includes(
                                      (
                                        (addForm as any)._bankSearch || ""
                                      ).toLowerCase()
                                    )
                              )
                              .map((bank) => (
                                <div
                                  key={bank.name}
                                  className={`flex items-center justify-center border rounded-lg cursor-pointer hover:border-primary-400 transition-all ${(addForm as any)._stripePickedBank === bank.name ? "border-primary-500 ring-2 ring-primary-200" : "border-gray-200"}`}
                                  style={{ height: "100px", padding: "16px" }}
                                  onClick={() =>
                                    setAddForm(
                                      (f) =>
                                        ({
                                          ...f,
                                          _stripePickedBank: bank.name,
                                        }) as any
                                    )
                                  }
                                >
                                  <img
                                    src={bank.logo}
                                    alt={bank.name}
                                    style={{
                                      width: "100%",
                                      height: "100%",
                                      objectFit: "contain",
                                    }}
                                  />
                                </div>
                              ))}
                          </div>

                          {/* Bottom actions */}
                          <div className="flex items-center justify-between mt-4">
                            <button
                              className="flex items-center gap-1.5 text-sm text-primary-600 hover:text-primary-700 whitespace-nowrap"
                              onClick={() =>
                                setAddForm(
                                  (f) =>
                                    ({
                                      ...f,
                                      methodType: "BANK_MANUAL",
                                      bankAccountName: "",
                                      bankAccountNumber: "",
                                      bankAccountNumberConfirm: "",
                                      bankRoutingNumber: "",
                                      bankSortCode: "",
                                      bankIfscCode: "",
                                      bankBsbNumber: "",
                                      bankInstitutionNumber: "",
                                      bankTransitNumber: "",
                                      bankCountry: "US",
                                      bankCurrency: "USD",
                                      nickname: "",
                                      accountType: "CHECKING",
                                      bankConsent: false,
                                      _selectedBank: "",
                                      _stripeConnecting: false,
                                    }) as any
                                )
                              }
                            >
                              <BankIcon className="size-4 shrink-0" /> Add my
                              bank account manually
                            </button>
                            <div className="flex gap-2">
                              <Button
                                variant="outlined"
                                visual="gray"
                                size="sm"
                                onClick={() =>
                                  setAddForm((f) => ({
                                    ...f,
                                    methodType: "PICK",
                                  }))
                                }
                              >
                                Cancel
                              </Button>
                              <Button
                                variant="filled"
                                visual="primary"
                                size="sm"
                                disabled={!(addForm as any)._stripePickedBank}
                                onClick={() =>
                                  setAddForm(
                                    (f) =>
                                      ({
                                        ...f,
                                        _selectedBank: (f as any)
                                          ._stripePickedBank,
                                        bankAccountName: (f as any)
                                          ._stripePickedBank,
                                      }) as any
                                  )
                                }
                              >
                                Verify Account
                              </Button>
                            </div>
                          </div>
                        </>
                      ) : isStripePublishableKeyConfigured ? (
                        <>
                          {/* AC-03.01: real Stripe Financial Connections — launches Stripe's own
                            hosted account-selection modal via collectFinancialConnectionsAccounts.
                            There is no custom login UI here by design: Stripe hosts it. */}
                          <div className="py-10 text-center space-y-5">
                            <div className="mx-auto size-12 rounded-full bg-primary-50 flex items-center justify-center">
                              <BankIcon className="size-6 text-primary-600" />
                            </div>
                            <p className="text-sm text-gray-500 px-4">
                              You'll be securely connected to{" "}
                              <strong>{(addForm as any)._selectedBank}</strong>{" "}
                              through Stripe. Your banking credentials are never
                              shared with Marketeq.
                            </p>
                            {/* Storybook Buttons/Button > GoogleOutlined pattern — outlined/
                              gray with a leftIcon brand mark, matching the other provider
                              connect buttons (Wise/Payoneer) and GoogleLoginButton.tsx. */}
                            <Button
                              variant="outlined"
                              visual="gray"
                              size="sm"
                              className="w-full py-3 text-base gap-x-3 active:ring-4 active:ring-gray-100"
                              leftIcon={<StripeDefault />}
                              disabled={!!(addForm as any)._stripeConnecting}
                              onClick={() =>
                                handleConnectStripe(
                                  (addForm as any)._selectedBank
                                )
                              }
                            >
                              {(addForm as any)._stripeConnecting
                                ? "Connecting…"
                                : "Continue with Stripe"}
                            </Button>
                            <Button
                              variant="link"
                              visual="gray"
                              size="sm"
                              className="w-full"
                              leftIcon={<ChevronLeft className="size-4" />}
                              onClick={() =>
                                setAddForm(
                                  (f) =>
                                    ({
                                      ...f,
                                      methodType: "PICK",
                                      _selectedBank: "",
                                    }) as any
                                )
                              }
                            >
                              Back to Deposit Methods
                            </Button>
                          </div>
                        </>
                      ) : (
                        <>
                          {/* Dev-mode fallback only: shown when payout-service has no STRIPE_SECRET_KEY
                            configured (stripe/restart responds with mode: 'mock'). Never rendered
                            when a real Stripe publishable key is present — see branch above. */}
                          <div className="py-8 space-y-6">
                            <div className="text-center mb-2">
                              <span className="text-xs text-gray-400 bg-gray-100 rounded px-2 py-0.5">
                                [Dev mock — replaced by Stripe hosted UI in
                                production]
                              </span>
                            </div>
                            <div>
                              <input
                                className="w-full border-0 border-b border-gray-300 px-0 py-3 text-sm bg-transparent focus:outline-none focus:border-primary-500 placeholder-gray-400"
                                placeholder="Username"
                                value={(addForm as any)._stripeUser || ""}
                                onChange={(e) =>
                                  setAddForm(
                                    (f) =>
                                      ({
                                        ...f,
                                        _stripeUser: e.target.value,
                                      }) as any
                                  )
                                }
                              />
                            </div>
                            <div>
                              <input
                                type="password"
                                className="w-full border-0 border-b border-gray-300 px-0 py-3 text-sm bg-transparent focus:outline-none focus:border-primary-500 placeholder-gray-400"
                                placeholder="Password"
                                value={(addForm as any)._stripePass || ""}
                                onChange={(e) =>
                                  setAddForm(
                                    (f) =>
                                      ({
                                        ...f,
                                        _stripePass: e.target.value,
                                      }) as any
                                  )
                                }
                              />
                            </div>
                            <div className="flex items-center gap-8 text-sm text-gray-400">
                              <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                  type="checkbox"
                                  className="accent-primary-600"
                                />{" "}
                                Remember me
                              </label>
                              <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                  type="checkbox"
                                  className="accent-primary-600"
                                />{" "}
                                Use token
                              </label>
                            </div>
                            <Button
                              variant="filled"
                              visual="primary"
                              size="sm"
                              className="w-full py-3 text-base"
                              disabled={
                                !!(addForm as any)._stripeConnecting ||
                                !(addForm as any)._stripeUser?.trim() ||
                                !(addForm as any)._stripePass?.trim()
                              }
                              onClick={() =>
                                handleConnectStripe(
                                  (addForm as any)._selectedBank
                                )
                              }
                            >
                              {(addForm as any)._stripeConnecting
                                ? "Connecting…"
                                : "Sign in"}
                            </Button>
                            <div className="space-y-1">
                              <button className="text-sm text-primary-600 hover:text-primary-700 block">
                                Forgot username/password? ›
                              </button>
                              <button className="text-sm text-primary-600 hover:text-primary-700 block">
                                Not Enrolled? Sign Up Now. ›
                              </button>
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  ) : addForm.methodType === "BANK_MANUAL" ? (
                    /* Step 2a: Bank manual form — fields adapt by country/region
                     (AC-04.02/04.03), mirroring bank-validation.service.ts's full
                     region set (US/GB/IN/AU/JP/CA/CN/RU/MX/SEPA/GCC/BACS/SWIFT),
                     not just the 5-country subset this form used to expose. */
                    (() => {
                      const region = detectBankRegion(addForm.bankCountry)
                      const selectedCountry = ALL_COUNTRIES.find(
                        (c) => c.code === addForm.bankCountry
                      )
                      const filteredCountries = addForm.bankCountrySearch
                        ? ALL_COUNTRIES.filter((c) =>
                            c.name
                              .toLowerCase()
                              .includes(addForm.bankCountrySearch.toLowerCase())
                          )
                        : ALL_COUNTRIES
                      const selectCountry = (code: string) =>
                        setAddForm((f) => ({
                          ...f,
                          bankCountry: code,
                          bankCountrySearch: "",
                          bankCountryOpen: false,
                          bankCurrency: bankCountryCurrency(code),
                          // Region change: clear every region-specific field so a stale
                          // sort code / IFSC / BSB / IBAN can't be silently submitted.
                          bankRoutingNumber: "",
                          bankSortCode: "",
                          bankIfscCode: "",
                          bankBsbNumber: "",
                          bankInstitutionNumber: "",
                          bankTransitNumber: "",
                          bankIban: "",
                          bankSwiftBic: "",
                          bankCode: "",
                          bankBranchCode: "",
                          bankClabe: "",
                          bankCnapsCode: "",
                          bankBik: "",
                        }))
                      const saveDisabled =
                        !addForm.nickname.trim() ||
                        !addForm.bankConsent ||
                        OFAC_BLOCKED_COUNTRIES.has(
                          addForm.bankCountry.toUpperCase()
                        ) ||
                        (region !== "MX" &&
                          region !== "SEPA" &&
                          region !== "GCC" &&
                          (!addForm.bankAccountNumber.trim() ||
                            addForm.bankAccountNumberConfirm !==
                              addForm.bankAccountNumber)) ||
                        (region === "US" &&
                          !isValidAbaRouting(addForm.bankRoutingNumber)) ||
                        (region === "GB" &&
                          !isValidSortCode(addForm.bankSortCode)) ||
                        (region === "IN" &&
                          !isValidIfsc(addForm.bankIfscCode)) ||
                        (region === "AU" &&
                          !isValidBsb(addForm.bankBsbNumber)) ||
                        (region === "CA" &&
                          (!isValidCaInstitution(
                            addForm.bankInstitutionNumber
                          ) ||
                            !isValidCaTransit(addForm.bankTransitNumber))) ||
                        (region === "JP" &&
                          (!isValidJpBankCode(addForm.bankCode) ||
                            !isValidJpBranchCode(addForm.bankBranchCode) ||
                            !/^\d{7}$/.test(addForm.bankAccountNumber))) ||
                        (region === "MX" && !isValidClabe(addForm.bankClabe)) ||
                        (region === "CN" &&
                          (!isValidCnaps(addForm.bankCnapsCode) ||
                            !isValidCnAccountNumber(
                              addForm.bankAccountNumber
                            ))) ||
                        (region === "RU" &&
                          (!isValidBik(addForm.bankBik) ||
                            !isValidRuAccountNumber(
                              addForm.bankAccountNumber
                            ))) ||
                        (region === "SEPA" && !isValidIban(addForm.bankIban)) ||
                        (region === "GCC" &&
                          (!isValidIban(addForm.bankIban) ||
                            !isValidSwiftBic(addForm.bankSwiftBic))) ||
                        (region === "BACS" &&
                          (!isValidSwiftBic(addForm.bankSwiftBic) ||
                            !addForm.bankAccountNumber.trim())) ||
                        (region === "SWIFT" &&
                          (!isValidSwiftBic(addForm.bankSwiftBic) ||
                            !addForm.bankAccountNumber.trim()))

                      return (
                        <div className="p-6 overflow-y-auto flex-1 min-h-0">
                          <div className="flex items-center gap-2 mb-4">
                            <IconButton
                              size="sm"
                              variant="ghost"
                              visual="gray"
                              onClick={() =>
                                setAddForm((f) => ({
                                  ...f,
                                  methodType: "BANK_CONNECT_CONFIRM",
                                }))
                              }
                            >
                              <ChevronLeft className="size-4" />
                            </IconButton>
                            <h3 className="text-base font-semibold text-dark-blue-400">
                              Add your bank account manually
                            </h3>
                            <IconButton
                              size="sm"
                              variant="ghost"
                              visual="gray"
                              className="ml-auto"
                              onClick={() => setShowAddMethod(false)}
                            >
                              <X className="size-4" />
                            </IconButton>
                          </div>
                          <div className="space-y-3">
                            <Combobox
                              className="w-full"
                              value={selectedCountry ?? null}
                              onChange={(country) => {
                                if (country) selectCountry(country.code)
                              }}
                            >
                              <ComboboxLabel size="xs" className="text-gray-500">
                                Country
                              </ComboboxLabel>
                              <ComboboxTrigger className="mt-1">
                                <ComboboxInput
                                  className="pl-3 pr-8 py-2 text-sm"
                                  placeholder="Select country"
                                  displayValue={(c: typeof selectedCountry) =>
                                    c ? `${c.flag} ${c.name}` : ""
                                  }
                                  onFocus={() =>
                                    setAddForm((f) => ({
                                      ...f,
                                      bankCountryOpen: true,
                                      bankCountrySearch: "",
                                    }))
                                  }
                                  onBlur={() =>
                                    setTimeout(
                                      () =>
                                        setAddForm((f) => ({
                                          ...f,
                                          bankCountryOpen: false,
                                        })),
                                      150
                                    )
                                  }
                                  onChange={(e) =>
                                    setAddForm((f) => ({
                                      ...f,
                                      bankCountrySearch: e.target.value,
                                    }))
                                  }
                                />
                                <ComboboxButton align="right">
                                  <Search className="size-3.5 text-gray-400" />
                                </ComboboxButton>
                              </ComboboxTrigger>
                              <ScaleOutIn show={addForm.bankCountryOpen}>
                                <ComboboxOptions>
                                  <ScrollArea viewportClassName="max-h-56">
                                    {filteredCountries.length === 0 ? (
                                      <p className="text-xs text-gray-400 text-center py-4">
                                        No countries found
                                      </p>
                                    ) : (
                                      filteredCountries.map((c) => (
                                        <ComboboxOption key={c.code} value={c}>
                                          <span>{c.flag}</span>{" "}
                                          <span className="text-dark-blue-400">
                                            {c.name}
                                          </span>
                                        </ComboboxOption>
                                      ))
                                    )}
                                  </ScrollArea>
                                </ComboboxOptions>
                              </ScaleOutIn>
                            </Combobox>
                            {OFAC_BLOCKED_COUNTRIES.has(
                              addForm.bankCountry.toUpperCase()
                            ) && (
                              <p className="text-xs text-red-500">
                                Payouts to this country are not currently
                                supported.
                              </p>
                            )}
                            <div>
                              <Label size="xs" className="text-gray-500 mb-1 block">
                                Bank Name
                              </Label>
                              <Input
                                className="w-full px-3 py-2 text-sm"
                                placeholder="e.g. Bank of America"
                                value={addForm.bankAccountName}
                                onChange={(e) =>
                                  setAddForm((f) => ({
                                    ...f,
                                    bankAccountName: e.target.value,
                                  }))
                                }
                              />
                            </div>
                            <div>
                              <Label size="xs" className="text-gray-500 mb-1 block">
                                Account Holder Name
                              </Label>
                              <Input
                                className="w-full px-3 py-2 text-sm"
                                placeholder="John Doe"
                                value={addForm.nickname}
                                onChange={(e) =>
                                  setAddForm((f) => ({
                                    ...f,
                                    nickname: e.target.value,
                                  }))
                                }
                              />
                            </div>
                            {region === "US" && (
                              <div>
                                <Label size="xs" className="text-gray-500 mb-1 block">
                                  Account Type
                                </Label>
                                <Select
                                  value={addForm.accountType}
                                  onValueChange={(accountType) =>
                                    setAddForm((f) => ({
                                      ...f,
                                      accountType,
                                    }))
                                  }
                                >
                                  <SelectTrigger className="w-full">
                                    <SelectValue placeholder="Select" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="CHECKING">Checking</SelectItem>
                                    <SelectItem value="SAVINGS">Savings</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            )}

                            {/* Account number — every region except MX (CLABE only)/SEPA/GCC
                          (IBAN only) uses a plain account number field. */}
                            {region !== "MX" &&
                              region !== "SEPA" &&
                              region !== "GCC" && (
                                <>
                                  <div>
                                    <Label size="xs" className="text-gray-500 mb-1 block">
                                      Account Number
                                    </Label>
                                    <Input
                                      className="w-full px-3 py-2 text-sm"
                                      placeholder="Up to 17 digits"
                                      value={addForm.bankAccountNumber}
                                      onChange={(e) =>
                                        setAddForm((f) => ({
                                          ...f,
                                          bankAccountNumber: e.target.value,
                                        }))
                                      }
                                    />
                                  </div>
                                  <div>
                                    {/* SCR-02: anti-typo protection — a mistyped account number sends
                                funds nowhere recoverable, so it must be entered twice. */}
                                    <Label size="xs" className="text-gray-500 mb-1 block">
                                      Confirm Account Number
                                    </Label>
                                    <Input
                                      className="w-full px-3 py-2 text-sm"
                                      placeholder="Re-enter account number"
                                      value={addForm.bankAccountNumberConfirm}
                                      onChange={(e) =>
                                        setAddForm((f) => ({
                                          ...f,
                                          bankAccountNumberConfirm:
                                            e.target.value,
                                        }))
                                      }
                                    />
                                    {addForm.bankAccountNumberConfirm.length >
                                      0 &&
                                      addForm.bankAccountNumberConfirm !==
                                        addForm.bankAccountNumber && (
                                        <p className="text-xs text-red-500 mt-1">
                                          Account numbers do not match
                                        </p>
                                      )}
                                  </div>
                                </>
                              )}

                            {region === "US" && (
                              <div>
                                <Label size="xs" className="text-gray-500 mb-1 block">
                                  Bank Routing Number
                                </Label>
                                <Input
                                  className="w-full px-3 py-2 text-sm"
                                  placeholder="9-digit ABA routing number"
                                  value={addForm.bankRoutingNumber}
                                  onChange={(e) =>
                                    setAddForm((f) => ({
                                      ...f,
                                      bankRoutingNumber: e.target.value,
                                    }))
                                  }
                                />
                                {addForm.bankRoutingNumber.length > 0 &&
                                  !isValidAbaRouting(
                                    addForm.bankRoutingNumber
                                  ) && (
                                    <p className="text-xs text-red-500 mt-1">
                                      Enter a valid 9-digit routing number
                                    </p>
                                  )}
                              </div>
                            )}
                            {region === "GB" && (
                              <div>
                                <Label size="xs" className="text-gray-500 mb-1 block">
                                  Sort Code
                                </Label>
                                <Input
                                  className="w-full px-3 py-2 text-sm"
                                  placeholder="6 digits, e.g. 12-34-56"
                                  value={addForm.bankSortCode}
                                  onChange={(e) =>
                                    setAddForm((f) => ({
                                      ...f,
                                      bankSortCode: e.target.value,
                                    }))
                                  }
                                />
                                {addForm.bankSortCode.length > 0 &&
                                  !isValidSortCode(addForm.bankSortCode) && (
                                    <p className="text-xs text-red-500 mt-1">
                                      Enter a valid 6-digit sort code
                                    </p>
                                  )}
                              </div>
                            )}
                            {region === "IN" && (
                              <div>
                                <Label size="xs" className="text-gray-500 mb-1 block">
                                  IFSC Code
                                </Label>
                                <Input
                                  className="w-full px-3 py-2 text-sm uppercase"
                                  placeholder="e.g. HDFC0001234"
                                  value={addForm.bankIfscCode}
                                  onChange={(e) =>
                                    setAddForm((f) => ({
                                      ...f,
                                      bankIfscCode: e.target.value,
                                    }))
                                  }
                                />
                                {addForm.bankIfscCode.length > 0 &&
                                  !isValidIfsc(addForm.bankIfscCode) && (
                                    <p className="text-xs text-red-500 mt-1">
                                      Enter a valid IFSC code (e.g. HDFC0001234)
                                    </p>
                                  )}
                              </div>
                            )}
                            {region === "AU" && (
                              <div>
                                <Label size="xs" className="text-gray-500 mb-1 block">
                                  BSB Number
                                </Label>
                                <Input
                                  className="w-full px-3 py-2 text-sm"
                                  placeholder="6 digits, e.g. 123-456"
                                  value={addForm.bankBsbNumber}
                                  onChange={(e) =>
                                    setAddForm((f) => ({
                                      ...f,
                                      bankBsbNumber: e.target.value,
                                    }))
                                  }
                                />
                                {addForm.bankBsbNumber.length > 0 &&
                                  !isValidBsb(addForm.bankBsbNumber) && (
                                    <p className="text-xs text-red-500 mt-1">
                                      Enter a valid 6-digit BSB number
                                    </p>
                                  )}
                              </div>
                            )}
                            {region === "CA" && (
                              <div className="grid grid-cols-2 gap-3">
                                <div>
                                  <Label size="xs" className="text-gray-500 mb-1 block">
                                    Institution Number
                                  </Label>
                                  <Input
                                    className="w-full px-3 py-2 text-sm"
                                    placeholder="3 digits"
                                    value={addForm.bankInstitutionNumber}
                                    onChange={(e) =>
                                      setAddForm((f) => ({
                                        ...f,
                                        bankInstitutionNumber: e.target.value,
                                      }))
                                    }
                                  />
                                  {addForm.bankInstitutionNumber.length > 0 &&
                                    !isValidCaInstitution(
                                      addForm.bankInstitutionNumber
                                    ) && (
                                      <p className="text-xs text-red-500 mt-1">
                                        3 digits required
                                      </p>
                                    )}
                                </div>
                                <div>
                                  <Label size="xs" className="text-gray-500 mb-1 block">
                                    Transit Number
                                  </Label>
                                  <Input
                                    className="w-full px-3 py-2 text-sm"
                                    placeholder="5 digits"
                                    value={addForm.bankTransitNumber}
                                    onChange={(e) =>
                                      setAddForm((f) => ({
                                        ...f,
                                        bankTransitNumber: e.target.value,
                                      }))
                                    }
                                  />
                                  {addForm.bankTransitNumber.length > 0 &&
                                    !isValidCaTransit(
                                      addForm.bankTransitNumber
                                    ) && (
                                      <p className="text-xs text-red-500 mt-1">
                                        5 digits required
                                      </p>
                                    )}
                                </div>
                              </div>
                            )}
                            {region === "JP" && (
                              <div className="grid grid-cols-2 gap-3">
                                <div>
                                  <Label size="xs" className="text-gray-500 mb-1 block">
                                    Bank Code
                                  </Label>
                                  <Input
                                    className="w-full px-3 py-2 text-sm"
                                    placeholder="4 digits"
                                    value={addForm.bankCode}
                                    onChange={(e) =>
                                      setAddForm((f) => ({
                                        ...f,
                                        bankCode: e.target.value,
                                      }))
                                    }
                                  />
                                  {addForm.bankCode.length > 0 &&
                                    !isValidJpBankCode(addForm.bankCode) && (
                                      <p className="text-xs text-red-500 mt-1">
                                        4 digits required
                                      </p>
                                    )}
                                </div>
                                <div>
                                  <Label size="xs" className="text-gray-500 mb-1 block">
                                    Branch Code
                                  </Label>
                                  <Input
                                    className="w-full px-3 py-2 text-sm"
                                    placeholder="3 digits"
                                    value={addForm.bankBranchCode}
                                    onChange={(e) =>
                                      setAddForm((f) => ({
                                        ...f,
                                        bankBranchCode: e.target.value,
                                      }))
                                    }
                                  />
                                  {addForm.bankBranchCode.length > 0 &&
                                    !isValidJpBranchCode(
                                      addForm.bankBranchCode
                                    ) && (
                                      <p className="text-xs text-red-500 mt-1">
                                        3 digits required
                                      </p>
                                    )}
                                </div>
                              </div>
                            )}
                            {region === "MX" && (
                              <div>
                                <Label size="xs" className="text-gray-500 mb-1 block">
                                  CLABE
                                </Label>
                                <Input
                                  className="w-full px-3 py-2 text-sm"
                                  placeholder="18-digit CLABE"
                                  value={addForm.bankClabe}
                                  onChange={(e) =>
                                    setAddForm((f) => ({
                                      ...f,
                                      bankClabe: e.target.value,
                                    }))
                                  }
                                />
                                {addForm.bankClabe.length > 0 &&
                                  !isValidClabe(addForm.bankClabe) && (
                                    <p className="text-xs text-red-500 mt-1">
                                      Enter a valid 18-digit CLABE
                                    </p>
                                  )}
                              </div>
                            )}
                            {region === "CN" && (
                              <div>
                                <Label size="xs" className="text-gray-500 mb-1 block">
                                  CNAPS Code
                                </Label>
                                <Input
                                  className="w-full px-3 py-2 text-sm"
                                  placeholder="12 digits"
                                  value={addForm.bankCnapsCode}
                                  onChange={(e) =>
                                    setAddForm((f) => ({
                                      ...f,
                                      bankCnapsCode: e.target.value,
                                    }))
                                  }
                                />
                                {addForm.bankCnapsCode.length > 0 &&
                                  !isValidCnaps(addForm.bankCnapsCode) && (
                                    <p className="text-xs text-red-500 mt-1">
                                      12 digits required
                                    </p>
                                  )}
                              </div>
                            )}
                            {region === "RU" && (
                              <div>
                                <Label size="xs" className="text-gray-500 mb-1 block">
                                  BIK
                                </Label>
                                <Input
                                  className="w-full px-3 py-2 text-sm"
                                  placeholder="9 digits"
                                  value={addForm.bankBik}
                                  onChange={(e) =>
                                    setAddForm((f) => ({
                                      ...f,
                                      bankBik: e.target.value,
                                    }))
                                  }
                                />
                                {addForm.bankBik.length > 0 &&
                                  !isValidBik(addForm.bankBik) && (
                                    <p className="text-xs text-red-500 mt-1">
                                      9 digits required
                                    </p>
                                  )}
                              </div>
                            )}
                            {(region === "SEPA" || region === "GCC") && (
                              <div>
                                <Label size="xs" className="text-gray-500 mb-1 block">
                                  IBAN
                                </Label>
                                <Input
                                  className="w-full px-3 py-2 text-sm uppercase"
                                  placeholder="e.g. DE89370400440532013000"
                                  value={addForm.bankIban}
                                  onChange={(e) =>
                                    setAddForm((f) => ({
                                      ...f,
                                      bankIban: e.target.value,
                                    }))
                                  }
                                />
                                {addForm.bankIban.length > 0 &&
                                  !isValidIban(addForm.bankIban) && (
                                    <p className="text-xs text-red-500 mt-1">
                                      Enter a valid IBAN
                                    </p>
                                  )}
                              </div>
                            )}
                            {(region === "GCC" ||
                              region === "BACS" ||
                              region === "SWIFT") && (
                              <div>
                                <Label size="xs" className="text-gray-500 mb-1 block">
                                  SWIFT/BIC Code
                                </Label>
                                <Input
                                  className="w-full px-3 py-2 text-sm uppercase"
                                  placeholder="e.g. DEUTDEFF"
                                  value={addForm.bankSwiftBic}
                                  onChange={(e) =>
                                    setAddForm((f) => ({
                                      ...f,
                                      bankSwiftBic: e.target.value,
                                    }))
                                  }
                                />
                                {addForm.bankSwiftBic.length > 0 &&
                                  !isValidSwiftBic(addForm.bankSwiftBic) && (
                                    <p className="text-xs text-red-500 mt-1">
                                      Enter a valid SWIFT/BIC code
                                    </p>
                                  )}
                              </div>
                            )}
                            {region === "SEPA" && (
                              <div>
                                <Label size="xs" className="text-gray-500 mb-1 block">
                                  SWIFT/BIC Code (optional)
                                </Label>
                                <Input
                                  className="w-full px-3 py-2 text-sm uppercase"
                                  placeholder="e.g. DEUTDEFF"
                                  value={addForm.bankSwiftBic}
                                  onChange={(e) =>
                                    setAddForm((f) => ({
                                      ...f,
                                      bankSwiftBic: e.target.value,
                                    }))
                                  }
                                />
                                {addForm.bankSwiftBic.length > 0 &&
                                  !isValidSwiftBic(addForm.bankSwiftBic) && (
                                    <p className="text-xs text-red-500 mt-1">
                                      Enter a valid SWIFT/BIC code
                                    </p>
                                  )}
                              </div>
                            )}

                            <div className="flex items-start gap-2">
                              <Checkbox
                                className="mt-0.5"
                                checked={addForm.bankConsent}
                                onCheckedChange={(checked) =>
                                  setAddForm((f) => ({
                                    ...f,
                                    bankConsent: checked as boolean,
                                  }))
                                }
                              />
                              <span className="text-xs text-gray-400">
                                By linking your bank account, you authorize
                                Marketeq to initiate direct deposit payments to
                                your account. You acknowledge that all transfers
                                will comply with applicable local laws and
                                banking regulations.
                              </span>
                            </div>
                          </div>
                          <div className="flex gap-2 mt-5">
                            <Button
                              variant="outlined"
                              visual="gray"
                              size="sm"
                              className="flex-1"
                              onClick={() =>
                                setAddForm((f) => ({
                                  ...f,
                                  methodType: "PICK",
                                }))
                              }
                            >
                              Cancel
                            </Button>
                            <Button
                              variant="filled"
                              visual="primary"
                              size="sm"
                              className="flex-1"
                              onClick={handleAddMethod}
                              disabled={saveDisabled}
                            >
                              Save
                            </Button>
                          </div>
                        </div>
                      )
                    })()
                  ) : addForm.methodType === "WISE" ||
                    addForm.methodType === "PAYONEER" ? (
                    /* Step 2b/2c: Wise / Payoneer — real OAuth redirect
                     (AC-07.01/07.04, AC-08.01/08.04). One shared
                     screen: same backend call (handleConnectOAuth -> POST
                     /deposit-methods -> verification.oauthUrl -> redirect) and
                     the same Figma layout for both providers — centered
                     icon, no title bar, single X close in the corner. Figma places
                     the provider icon to the left of the heading, side by side —
                     not centered above it. */
                    <div className="p-8 relative flex flex-col">
                      <IconButton
                        size="sm"
                        variant="ghost"
                        visual="gray"
                        className="absolute top-4 right-4"
                        onClick={() => setShowAddMethod(false)}
                      >
                        <X className="size-4" />
                      </IconButton>
                      <div className="flex items-center pt-6 pb-3 gap-4">
                        {addForm.methodType === "WISE" ? (
                          <WiseIconV2 className="size-14 shrink-0" />
                        ) : (
                          <PayoneerDefault className="size-14 shrink-0" />
                        )}
                        <h3 className="text-base font-semibold text-dark-blue-400">
                          You'll be redirected to{" "}
                          {addForm.methodType === "WISE" ? "Wise" : "Payoneer"}{" "}
                          to securely connect your account.
                        </h3>
                      </div>
                      <p className="text-xs text-gray-400 pb-2">
                        Securely handle your information through a trusted third
                        party.
                      </p>
                      {/* Storybook Buttons/Button pattern, adapted: Figma shows this
                        specific CTA as a solid dark/black button rather than the
                        outlined "GoogleOutlined" style used elsewhere — no
                        filled+gray compound variant exists in button.tsx, so the
                        dark styling is layered on via className on top of the
                        shared Button component (still gets its focus/disabled/
                        sizing behavior from the component, not a raw <button>). */}
                      <Button
                        variant="filled"
                        visual="gray"
                        size="sm"
                        className="w-full mt-6 bg-gray-900 hover:bg-gray-800 text-white active:ring-4 active:ring-gray-300"
                        disabled={!addForm.bankConsent || oauthConnecting}
                        onClick={() =>
                          handleConnectOAuth(
                            addForm.methodType as "WISE" | "PAYONEER"
                          )
                        }
                      >
                        {oauthConnecting
                          ? "Connecting…"
                          : `Continue To ${addForm.methodType === "WISE" ? "Wise" : "Payoneer"}`}
                      </Button>
                      <Button
                        variant="link"
                        visual="gray"
                        size="sm"
                        className="w-full mt-2"
                        leftIcon={<ChevronLeft className="size-4" />}
                        onClick={() =>
                          setAddForm((f) => ({ ...f, methodType: "PICK" }))
                        }
                      >
                        Back to Deposit Methods
                      </Button>
                      <label className="flex items-start gap-2 cursor-pointer mt-6">
                        <input
                          type="checkbox"
                          className="mt-0.5 accent-primary-600"
                          checked={addForm.bankConsent}
                          onChange={(e) =>
                            setAddForm((f) => ({
                              ...f,
                              bankConsent: e.target.checked,
                            }))
                          }
                        />
                        <span className="text-xs text-gray-400">
                          By connecting your account, you authorize Marketeq to
                          send deposits to your linked{" "}
                          {addForm.methodType === "WISE" ? "Wise" : "Payoneer"}{" "}
                          account. You agree to abide by{" "}
                          {addForm.methodType === "WISE"
                            ? "Wise's"
                            : "Payoneer's"}{" "}
                          terms and conditions for receiving business payments.
                        </span>
                      </label>
                    </div>
                  ) : addForm.methodType === "CRYPTO" &&
                    cryptoStep === "provider" ? (
                    /* Step 2d.1: Crypto — "Connect Your Wallet" provider list (AC-09.01) */
                    <div className="p-6">
                      <div className="flex items-center gap-2 mb-1">
                        <IconButton
                          size="sm"
                          variant="ghost"
                          visual="gray"
                          onClick={() =>
                            setAddForm((f) => ({ ...f, methodType: "PICK" }))
                          }
                        >
                          <ChevronLeft className="size-4" />
                        </IconButton>
                        <h3 className="text-base font-semibold text-dark-blue-400">
                          Connect Your Wallet
                        </h3>
                        <IconButton
                          size="sm"
                          variant="ghost"
                          visual="gray"
                          className="ml-auto"
                          onClick={() => setShowAddMethod(false)}
                        >
                          <X className="size-4" />
                        </IconButton>
                      </div>
                      <p className="text-xs text-gray-400 mb-4">
                        Select your preferred wallet to securely receive crypto
                        payouts.
                      </p>
                      {cryptoProvidersLoading ? (
                        <div className="space-y-2">
                          {[...Array(4)].map((_, i) => (
                            <div
                              key={i}
                              className="h-16 bg-gray-100 rounded-lg animate-pulse"
                            />
                          ))}
                        </div>
                      ) : cryptoProviders.length === 0 ? (
                        <div className="text-sm text-gray-400 text-center py-6">
                          Provider list unavailable — please try again.
                        </div>
                      ) : (
                        <div className="space-y-2 max-h-96 overflow-y-auto">
                          {cryptoProviders.map((p: any) => {
                            const meta = CRYPTO_PROVIDER_META[p.provider]
                            return (
                              <div
                                key={p.provider}
                                className="flex items-center gap-3 px-3 py-3 rounded-lg border border-gray-200"
                              >
                                <CryptoProviderIcon provider={p.provider} />
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-semibold text-dark-blue-400">
                                    {p.displayName}
                                  </p>
                                  <p className="text-xs text-gray-400">
                                    {meta?.tokensText ??
                                      p.networks
                                        ?.map((n: any) => n.network)
                                        .join(", ")}
                                  </p>
                                  {meta?.feeText && (
                                    <p className="text-xs text-gray-400">
                                      {meta.feeText}
                                    </p>
                                  )}
                                </div>
                                <Button
                                  variant="outlined"
                                  visual="gray"
                                  size="sm"
                                  onClick={() => {
                                    setCryptoForm({
                                      provider: p.provider,
                                      network:
                                        p.defaultNetwork ??
                                        p.networks?.[0]?.network ??
                                        "",
                                      currency:
                                        p.defaultToken ??
                                        p.networks?.[0]?.tokens?.[0] ??
                                        "",
                                      address: "",
                                    })
                                    setCryptoWcSession(null)
                                    setCryptoWcConsent(false)
                                    setCryptoError("")
                                    setCryptoStep("details")
                                  }}
                                >
                                  Connect
                                </Button>
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  ) : addForm.methodType === "CRYPTO" &&
                    cryptoStep === "details" ? (
                    /* Step 2d.2: Crypto — "Enter your wallet address" (AC-09.02/09.03/09.04).
                     WalletConnect-capable providers also offer the QR-scan and
                     paste-link presentations of the same session as alternatives. */
                    <div className="p-6 relative">
                      <IconButton
                        size="sm"
                        variant="ghost"
                        visual="gray"
                        onClick={() => {
                          setCryptoStep("provider")
                          setCryptoError("")
                        }}
                      >
                        <ChevronLeft className="size-4" />
                      </IconButton>
                      <IconButton
                        size="sm"
                        variant="ghost"
                        visual="gray"
                        className="absolute top-4 right-4"
                        onClick={() => setShowAddMethod(false)}
                      >
                        <X className="size-4" />
                      </IconButton>
                      <div className="flex flex-col items-center gap-2 -mt-6">
                        <CryptoProviderIcon
                          provider={cryptoForm.provider}
                          className="size-12"
                        />
                        <h3 className="text-sm font-semibold text-dark-blue-400">
                          {selectedCryptoProvider?.displayName ??
                            "Crypto Wallet"}
                        </h3>
                      </div>
                      <div className="space-y-3 mt-5">
                        <div>
                          <label className="text-xs text-gray-500 mb-1 block">
                            Network
                          </label>
                          <Select
                            value={cryptoForm.network}
                            onValueChange={(network) => {
                              const net =
                                selectedCryptoProvider?.networks?.find(
                                  (n: any) => n.network === network
                                )
                              setCryptoForm((f) => ({
                                ...f,
                                network,
                                currency: net?.tokens?.[0] ?? "",
                              }))
                              setCryptoWcSession(null)
                            }}
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Select a network" />
                            </SelectTrigger>
                            <SelectContent>
                              {/* AC-09.02: only networks this provider actually supports */}
                              {selectedCryptoProvider?.networks?.map(
                                (n: any) => (
                                  <SelectItem key={n.network} value={n.network}>
                                    {n.network}
                                  </SelectItem>
                                )
                              )}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <label className="text-xs text-gray-500 mb-1 block">
                            Currency
                          </label>
                          <Select
                            value={cryptoForm.currency}
                            onValueChange={(currency) =>
                              setCryptoForm((f) => ({ ...f, currency }))
                            }
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Select a currency" />
                            </SelectTrigger>
                            <SelectContent>
                              {/* AC-09.03: only tokens supported on the selected network */}
                              {selectedCryptoNetwork?.tokens?.map(
                                (t: string) => (
                                  <SelectItem key={t} value={t}>
                                    {t}
                                  </SelectItem>
                                )
                              )}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <label className="text-xs text-gray-500 mb-1 block">
                            Enter your wallet address
                          </label>
                          <input
                            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm font-mono"
                            placeholder="0xF23C...9u5M"
                            value={cryptoForm.address}
                            onChange={(e) => {
                              setCryptoForm((f) => ({
                                ...f,
                                address: e.target.value,
                              }))
                              setCryptoError("")
                            }}
                          />
                          <p className="text-xs text-gray-400 mt-1">
                            Your connection is private and secure. Wallet
                            credentials are not stored or shared.
                          </p>
                          {cryptoForm.address.length > 0 &&
                            cryptoForm.address.trim().length < 10 && (
                              <p className="text-xs text-red-500 mt-1">
                                Enter a valid wallet address
                              </p>
                            )}
                        </div>
                        {cryptoError && (
                          <p className="text-xs text-red-500">{cryptoError}</p>
                        )}
                      </div>
                      <div className="flex gap-2 mt-4">
                        <Button
                          variant="filled"
                          visual="gray"
                          size="sm"
                          className="flex-1 bg-gray-900 hover:bg-gray-800 text-white active:ring-4 active:ring-gray-300"
                          onClick={handleAddCryptoWallet}
                          disabled={
                            cryptoSubmitting ||
                            cryptoForm.address.trim().length < 10 ||
                            !cryptoForm.network ||
                            !cryptoForm.currency
                          }
                        >
                          Connect Wallet
                        </Button>
                        <Button
                          variant="outlined"
                          visual="gray"
                          size="sm"
                          className="flex-1"
                          onClick={() => setCryptoStep("provider")}
                        >
                          Cancel
                        </Button>
                      </div>
                      {selectedCryptoProvider?.supportsWalletConnect && (
                        <div className="mt-5">
                          <p className="text-xs font-semibold text-dark-blue-400 mb-2">
                            Other ways to connect
                          </p>
                          <div className="space-y-2">
                            <button
                              className="flex items-center gap-1.5 text-sm text-primary-600 hover:text-primary-700"
                              onClick={() => setCryptoStep("qr")}
                            >
                              <Search className="size-3.5" /> Scan QR code from
                              your wallet App
                            </button>
                            <button
                              className="flex items-center gap-1.5 text-sm text-primary-600 hover:text-primary-700"
                              onClick={() => setCryptoStep("paste")}
                            >
                              <ExternalLink className="size-3.5" /> Paste
                              connection link instead
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : addForm.methodType === "CRYPTO" &&
                    (cryptoStep === "qr" || cryptoStep === "paste") ? (
                    /* Step 2d.3: WalletConnect — QR-scan and paste-link are two
                     presentations of the same session (PS-10). */
                    <div className="p-6 relative">
                      <IconButton
                        size="sm"
                        variant="ghost"
                        visual="gray"
                        className="absolute top-4 left-4"
                        onClick={() => setCryptoStep("details")}
                      >
                        <ChevronLeft className="size-4" />
                      </IconButton>
                      <IconButton
                        size="sm"
                        variant="ghost"
                        visual="gray"
                        className="absolute top-4 right-4"
                        onClick={() => setShowAddMethod(false)}
                      >
                        <X className="size-4" />
                      </IconButton>
                      <div className="pt-7">
                        <h3 className="text-sm font-semibold text-dark-blue-400 flex items-center gap-1.5">
                          {cryptoStep === "qr"
                            ? "Scan this code in your wallet app"
                            : "Paste Wallet connection link"}
                        </h3>
                        <p className="text-xs text-gray-400 mt-0.5">
                          {cryptoStep === "qr"
                            ? "Accept the connection request in your wallet"
                            : `Paste the connection link generated for ${selectedCryptoProvider?.displayName ?? "your wallet"}`}
                        </p>
                      </div>
                      {!cryptoWcSession ? (
                        <div className="h-48 flex items-center justify-center">
                          <div className="size-8 rounded-full border-2 border-gray-200 border-t-primary-500 animate-spin" />
                        </div>
                      ) : cryptoStep === "qr" ? (
                        <div className="flex justify-center py-6">
                          <QRCodeSVG value={cryptoWcSession.wcUri} size={180} />
                        </div>
                      ) : (
                        <div className="py-6">
                          <label className="text-xs text-gray-500 mb-1 block">
                            Connection link
                          </label>
                          <input
                            readOnly
                            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm font-mono truncate"
                            value={cryptoWcSession.wcUri}
                            onClick={(e) =>
                              (e.target as HTMLInputElement).select()
                            }
                          />
                        </div>
                      )}
                      <div className="mt-5 text-center">
                        <p className="text-xs font-semibold text-dark-blue-400 mb-2">
                          Other ways to connect
                        </p>
                        <div className="space-y-2 flex flex-col items-center">
                          <button
                            className="flex items-center gap-1.5 text-sm text-primary-600 hover:text-primary-700"
                            onClick={() => setCryptoStep("details")}
                          >
                            <Search className="size-3.5" /> Enter your wallet
                            address
                          </button>
                          <button
                            className="flex items-center gap-1.5 text-sm text-primary-600 hover:text-primary-700"
                            onClick={() =>
                              setCryptoStep(
                                cryptoStep === "qr" ? "paste" : "qr"
                              )
                            }
                          >
                            <ExternalLink className="size-3.5" />{" "}
                            {cryptoStep === "qr"
                              ? "Paste connection link instead"
                              : "Scan QR code from your wallet App"}
                          </button>
                        </div>
                      </div>
                      {cryptoWcSession && (
                        <div className="flex justify-center mt-4">
                          <Button
                            variant="outlined"
                            visual="gray"
                            size="sm"
                            leftIcon={<RefreshCcw01 className="size-4" />}
                            onClick={() => setCryptoWcSession(null)}
                          >
                            Try Again
                          </Button>
                        </div>
                      )}
                      <label className="flex items-start gap-2 cursor-pointer mt-4">
                        <input
                          type="checkbox"
                          className="mt-0.5 accent-primary-600"
                          checked={cryptoWcConsent}
                          onChange={(e) => setCryptoWcConsent(e.target.checked)}
                        />
                        <span className="text-xs text-gray-400">
                          By providing your wallet address, you authorize
                          Marketeq to send crypto payouts to this wallet. You
                          confirm that you own the wallet and accept
                          responsibility for ensuring its accuracy.
                        </span>
                      </label>
                    </div>
                  ) : addForm.methodType === "CRYPTO" &&
                    cryptoStep === "connecting" ? (
                    /* US-64: "Connecting to Wallet..." transitional screen. */
                    <div className="p-10 text-center">
                      <CryptoProviderIcon
                        provider={cryptoForm.provider}
                        className="size-12 mx-auto"
                      />
                      <p className="text-sm font-semibold text-dark-blue-400 mt-2">
                        {selectedCryptoProvider?.displayName ?? "Crypto Wallet"}
                      </p>
                      <div className="mx-auto mt-6 size-10 rounded-full border-2 border-gray-200 border-t-primary-500 animate-spin" />
                      <h3 className="text-base font-semibold text-dark-blue-400 mt-4">
                        Connecting to Wallet...
                      </h3>
                      <p className="text-xs text-gray-400 mt-1">
                        We're verifying and connecting to your wallet. This may
                        take up to 30 seconds.
                      </p>
                    </div>
                  ) : addForm.methodType === "CRYPTO" &&
                    cryptoStep === "success" ? (
                    /* US-64: dedicated success screen with wallet address + current value. */
                    <div className="p-8 text-center relative">
                      <IconButton
                        size="sm"
                        variant="ghost"
                        visual="gray"
                        className="absolute top-4 right-4"
                        onClick={() => {
                          setShowAddMethod(false)
                          setCryptoStep("provider")
                          setCryptoForm({
                            provider: "",
                            network: "",
                            currency: "",
                            address: "",
                          })
                          setCryptoResult(null)
                        }}
                      >
                        <X className="size-4" />
                      </IconButton>
                      <div className="mx-auto size-10 rounded-full bg-primary-50 flex items-center justify-center mb-3">
                        <Check className="size-5 text-primary-600" />
                      </div>
                      <h3 className="text-base font-semibold text-dark-blue-400">
                        Wallet Connected Successfully
                      </h3>
                      <div className="mt-5 rounded-lg border border-gray-200 flex divide-x divide-gray-200 text-left">
                        <div className="flex-1 px-4 py-3">
                          <p className="text-xs text-gray-400">
                            Wallet Address
                          </p>
                          <p className="text-sm font-semibold text-dark-blue-400 font-mono">
                            ••••
                            {cryptoResult?.walletAddressLast6 ??
                              cryptoForm.address.slice(-6)}
                          </p>
                        </div>
                        <div className="flex-1 px-4 py-3">
                          <p className="text-xs text-gray-400">
                            Current Conversion Value
                          </p>
                          <p className="text-sm font-semibold text-dark-blue-400">
                            {cryptoResult?.conversionDisplay ?? "—"}
                          </p>
                        </div>
                      </div>
                    </div>
                  ) : addForm.methodType === "CRYPTO" &&
                    cryptoStep === "error" ? (
                    /* US-64: dedicated failure screen — retry same details, or pick a
                      different provider entirely, rather than a dead-end toast. */
                    <div className="p-8 text-center relative">
                      <IconButton
                        size="sm"
                        variant="ghost"
                        visual="gray"
                        className="absolute top-4 right-4"
                        onClick={() => setShowAddMethod(false)}
                      >
                        <X className="size-4" />
                      </IconButton>
                      <div className="mx-auto size-10 rounded-full bg-red-50 flex items-center justify-center mb-3">
                        <AlertTriangle className="size-5 text-red-600" />
                      </div>
                      <h3 className="text-base font-semibold text-dark-blue-400">
                        Wallet Connected Failed
                      </h3>
                      <p className="mt-2 text-sm text-gray-500">
                        {cryptoError ||
                          "We couldn't connect to your selected wallet. Please check your connection and try again."}
                      </p>
                      <p className="mt-2 text-xs text-gray-400 italic">
                        If the issue persists, consider selecting a different
                        wallet provider.
                      </p>
                      <div className="flex items-center justify-center gap-4 mt-6">
                        <button
                          className="text-sm text-gray-500 hover:text-gray-700"
                          onClick={() => {
                            setCryptoStep("provider")
                            setCryptoForm({
                              provider: "",
                              network: "",
                              currency: "",
                              address: "",
                            })
                            setCryptoWcSession(null)
                            setCryptoError("")
                          }}
                        >
                          Pick Another Wallet
                        </button>
                        <Button
                          variant="outlined"
                          visual="gray"
                          size="sm"
                          leftIcon={<RefreshCcw01 className="size-4" />}
                          onClick={() => {
                            setCryptoWcSession(null)
                            setCryptoError("")
                            setCryptoStep("details")
                          }}
                        >
                          Retry
                        </Button>
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>
            )}

            {/* Set Default Confirmation Dialog (SCR-07 / Figma). setDefault() in
              methods.service.ts only flips isDefault flags on deposit
              methods — it never touches payout_schedules.primaryMethodId
              (that's only ever set explicitly via PATCH /payouts/schedule),
              so changing the default does not disable split payout. */}
            <DepositMethodConfirmDialog
              open={!!confirmSetDefault}
              onOpenChange={(open) => {
                if (!open) setConfirmSetDefault(null)
              }}
              title="Make this your default deposit method?"
              body="This method will become your primary destination for all payouts, unless you have split logic activated."
              note="Your existing default method will be replaced."
              confirmLabel="Yes, make default"
              onConfirm={async () => {
                const id = confirmSetDefault?.id
                setConfirmSetDefault(null)
                if (id) await handleSetDefault(id)
              }}
            />

            {/* Remove Method Confirmation Dialog (AC-11.01/11.02/11.03 + Figma) */}
            <DepositMethodConfirmDialog
              open={!!confirmRemove}
              onOpenChange={(open) => {
                if (!open && !removing) setConfirmRemove(null)
              }}
              title="Remove Deposit Method?"
              body="Are you sure you want to remove this payout method?"
              note="Once removed, funds will no longer be routed to this account."
              confirmLabel={removing ? "Removing…" : "Remove Deposit Method"}
              confirming={removing}
              confirmDisabled={
                removing ||
                !removeImpact ||
                ((removeImpact.isPrimary || removeImpact.isActiveSecondary) &&
                  !removeAck)
              }
              onConfirm={confirmDeleteMethod}
            >
              {confirmRemove && (
                <div className="mt-4 space-y-3">
                  <div className="flex items-center gap-3 rounded-lg border border-gray-200 px-4 py-3">
                    {getMethodIcon(confirmRemove)}
                    <span className="text-sm font-medium text-dark-blue-400">
                      {getMethodLabel(confirmRemove).name}
                    </span>
                    <span className="text-sm text-gray-400">
                      {getMethodLabel(confirmRemove).sub}
                    </span>
                    <Badge
                      visual={getMethodStatusBadge(confirmRemove).visual}
                      size="sm"
                      className="ml-auto"
                    >
                      {getMethodStatusBadge(confirmRemove).label}
                    </Badge>
                  </div>

                  {!removeImpact ? (
                    <div className="h-10 bg-gray-100 rounded-lg animate-pulse" />
                  ) : removeImpact.isPrimary ||
                    removeImpact.isActiveSecondary ? (
                    <label className="flex items-start gap-2 cursor-pointer rounded-lg border border-amber-200 bg-warning-50 p-3">
                      <input
                        type="checkbox"
                        className="mt-0.5 accent-primary-600"
                        checked={removeAck}
                        onChange={(e) => setRemoveAck(e.target.checked)}
                      />
                      <span className="text-xs text-dark-blue-400">
                        {removeImpact.isActiveSecondary
                          ? "This method is the secondary account in your active split payout. Removing it will disable split payout and route all future payouts to your primary method."
                          : "This method is the primary account on your active payout schedule. Removing it will pause your schedule until you choose a new primary method."}{" "}
                        I understand and want to proceed.
                      </span>
                    </label>
                  ) : null}

                  {/* SCR-06: dialog stays open with the specific error — never silently
                    closes as if the removal had succeeded. */}
                  {removeError && (
                    <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                      {removeError}
                    </div>
                  )}
                </div>
              )}
            </DepositMethodConfirmDialog>

            {/* Figma "Edit Deposit Method?" — confirm before applying the form PATCH. */}
            <DepositMethodConfirmDialog
              open={confirmEditSave}
              onOpenChange={setConfirmEditSave}
              title="Edit Deposit Method?"
              body="You're about to update details for this deposit method."
              note="Please ensure all information is accurate. Changes may take up to 3 days to reflect for bank accounts."
              confirmLabel="Save Changes"
              onConfirm={async () => {
                setConfirmEditSave(false)
                await handleUpdateMethod()
              }}
            />

            {/* Edit Method Dialog */}
            {editingMethod && (
              <div
                className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
                onClick={() => {
                  setEditingMethod(null)
                  setEditBankSaveState(null)
                  setConfirmEditSave(false)
                }}
              >
                <div
                  className="bg-white rounded-xl w-full max-w-md shadow-xl relative"
                  onClick={(e) => e.stopPropagation()}
                >
                  {editBankSaveState === "success" ? (
                    /* Figma "Bank Details Updated" */
                    <div className="text-center p-6">
                      <IconButton
                        size="sm"
                        variant="ghost"
                        visual="gray"
                        className="absolute top-4 right-4"
                        onClick={() => {
                          setEditingMethod(null)
                          setEditBankSaveState(null)
                        }}
                      >
                        <X className="size-4" />
                      </IconButton>
                      <div className="mx-auto size-10 rounded-full bg-primary-50 flex items-center justify-center mb-3">
                        <Check className="size-5 text-primary-600" />
                      </div>
                      <h3 className="text-base font-semibold text-dark-blue-400">
                        Bank Details Updated
                      </h3>
                      <p className="mt-2 text-sm text-gray-500">
                        You updated your bank account information successfully.
                      </p>
                      <p className="mt-1 text-xs text-gray-400">
                        Changes may take up to 3 days to reflect.
                      </p>
                    </div>
                  ) : editBankSaveState === "error" ? (
                    /* Figma "Unable To Update Bank Info" */
                    <div className="text-center p-6">
                      <IconButton
                        size="sm"
                        variant="ghost"
                        visual="gray"
                        className="absolute top-4 right-4"
                        onClick={() => {
                          setEditingMethod(null)
                          setEditBankSaveState(null)
                        }}
                      >
                        <X className="size-4" />
                      </IconButton>
                      <div className="mx-auto size-10 rounded-full bg-red-50 flex items-center justify-center mb-3">
                        <AlertTriangle className="size-5 text-red-600" />
                      </div>
                      <h3 className="text-base font-semibold text-dark-blue-400">
                        Unable To Update Bank Info
                      </h3>
                      <p className="mt-1 text-sm text-gray-500">
                        Please check your details and try again.
                      </p>
                      <div className="mt-4 text-left rounded-lg border border-gray-200 bg-gray-50 p-3">
                        <p className="text-xs font-semibold text-dark-blue-400 mb-1.5">
                          Please check that:
                        </p>
                        <ul className="text-xs text-gray-500 space-y-1 list-disc list-inside">
                          <li>All fields are filled correctly</li>
                          <li>
                            Account and routing numbers follow the correct
                            format
                          </li>
                          <li>
                            Bank codes like SWIFT, IBAN, or IFSC are valid
                          </li>
                          <li>The country selected matches the format used</li>
                          <li>No special characters are used in bank name</li>
                        </ul>
                      </div>
                      {editBankError && (
                        <p className="mt-3 text-sm text-red-600">
                          {editBankError}
                        </p>
                      )}
                      <div className="flex gap-2 mt-5">
                        <Button
                          variant="outlined"
                          visual="gray"
                          size="sm"
                          className="flex-1"
                          onClick={() => {
                            setEditingMethod(null)
                            setEditBankSaveState(null)
                          }}
                        >
                          Cancel
                        </Button>
                        <Button
                          variant="filled"
                          visual="primary"
                          size="sm"
                          className="flex-1"
                          leftIcon={<RefreshCcw01 className="size-4" />}
                          onClick={() => {
                            setEditBankSaveState(null)
                            setEditBankError("")
                          }}
                        >
                          Retry
                        </Button>
                      </div>
                    </div>
                  ) : editingBankDetails ? (
                    <>
                      <div className="flex items-center justify-between border-b border-gray-200 p-3">
                        <div className="flex items-center gap-x-3">
                          <IconButton
                            variant="ghost"
                            visual="gray"
                            size="md"
                            className="text-dark-blue-400"
                            onClick={() => {
                              setEditingMethod(null)
                              setEditBankSaveState(null)
                            }}
                          >
                            <ArrowLeft className="size-5" />
                          </IconButton>
                          <h2 className="text-lg font-semibold leading-7 text-dark-blue-400">
                            Edit Bank Info
                          </h2>
                        </div>
                        <IconButton
                          className="text-gray-500"
                          variant="ghost"
                          visual="gray"
                          size="md"
                          onClick={() => {
                            setEditingMethod(null)
                            setEditBankSaveState(null)
                          }}
                        >
                          <X className="size-5" />
                        </IconButton>
                      </div>
                      <div className="p-6">
                        <div className="space-y-3">
                          <div className="space-y-1.5">
                            <Label size="sm" htmlFor="edit-bank-country">
                              Country
                            </Label>
                            <Listbox
                              value={editBankForm.bankCountry}
                              onChange={(code: string) =>
                                setEditBankForm(createBlankEditBankForm(code))
                              }
                            >
                              <ListboxButton placeholder="Select country">
                                {({ value }) => {
                                  const selected = EDIT_BANK_COUNTRIES.find(
                                    (c) => c.code === value
                                  )
                                  return selected ? (
                                    <span className="flex items-center gap-2">
                                      <span>{selected.flag}</span>
                                      <span>{selected.name}</span>
                                    </span>
                                  ) : null
                                }}
                              </ListboxButton>
                              <ListboxOptions>
                                {EDIT_BANK_COUNTRIES.map((country) => (
                                  <ListboxOption
                                    key={country.code}
                                    value={country.code}
                                  >
                                    <span>{country.flag}</span>
                                    <span>{country.name}</span>
                                  </ListboxOption>
                                ))}
                              </ListboxOptions>
                            </Listbox>
                          </div>
                          <div className="space-y-1.5">
                            <Label size="sm" htmlFor="edit-bank-name">
                              Bank Name
                            </Label>
                            <Input
                              id="edit-bank-name"
                              type="text"
                              placeholder={editBankNamePlaceholder(
                                editBankForm.bankCountry
                              )}
                              value={editBankForm.bankAccountName}
                              onChange={(e) =>
                                setEditBankForm((f) => ({
                                  ...f,
                                  bankAccountName: e.target.value,
                                }))
                              }
                            />
                          </div>
                          {editBankRegion(editBankForm.bankCountry) ===
                            "US" && (
                            <>
                              <div className="space-y-1.5">
                                <Label
                                  size="sm"
                                  htmlFor="edit-bank-account-number"
                                >
                                  Account Number
                                </Label>
                                <Input
                                  id="edit-bank-account-number"
                                  type="text"
                                  placeholder={editBankAccountPlaceholder(
                                    editBankForm.bankCountry
                                  )}
                                  value={editBankForm.bankAccountNumber}
                                  onChange={(e) =>
                                    setEditBankForm((f) => ({
                                      ...f,
                                      bankAccountNumber: e.target.value,
                                    }))
                                  }
                                />
                              </div>
                              <div className="space-y-1.5">
                                <Label
                                  size="sm"
                                  htmlFor="edit-bank-routing-number"
                                >
                                  Bank Routing Number
                                </Label>
                                <Input
                                  id="edit-bank-routing-number"
                                  type="text"
                                  placeholder="xxxx-xxxx-x"
                                  value={editBankForm.bankRoutingNumber}
                                  onChange={(e) =>
                                    setEditBankForm((f) => ({
                                      ...f,
                                      bankRoutingNumber: e.target.value,
                                    }))
                                  }
                                />
                                {editBankForm.bankRoutingNumber.length > 0 &&
                                  !isValidAbaRouting(
                                    editBankForm.bankRoutingNumber.replace(
                                      /\D/g,
                                      ""
                                    )
                                  ) && (
                                    <p className="text-xs text-red-500">
                                      Invalid routing number.
                                    </p>
                                  )}
                              </div>
                            </>
                          )}
                          {editBankRegion(editBankForm.bankCountry) ===
                            "SEPA" && (
                            <>
                              <div className="space-y-1.5">
                                <Label size="sm" htmlFor="edit-bank-iban">
                                  IBAN Number
                                </Label>
                                <Input
                                  id="edit-bank-iban"
                                  type="text"
                                  placeholder="Enter your full IBAN (starts with country code, e.g., DE...)"
                                  value={editBankForm.bankIban}
                                  onChange={(e) =>
                                    setEditBankForm((f) => ({
                                      ...f,
                                      bankIban: e.target.value,
                                    }))
                                  }
                                />
                                {editBankForm.bankIban.length > 0 &&
                                  !isValidIban(editBankForm.bankIban) && (
                                    <p className="text-xs text-red-500">
                                      Invalid IBAN.
                                    </p>
                                  )}
                              </div>
                              <div className="space-y-1.5">
                                <Label size="sm" htmlFor="edit-bank-swift">
                                  SWIFT / BIC Number
                                </Label>
                                <Input
                                  id="edit-bank-swift"
                                  type="text"
                                  placeholder="Enter 8 or 11 character SWIFT / BIC Code"
                                  value={editBankForm.bankSwiftBic}
                                  onChange={(e) =>
                                    setEditBankForm((f) => ({
                                      ...f,
                                      bankSwiftBic: e.target.value,
                                    }))
                                  }
                                />
                                {editBankForm.bankSwiftBic.length > 0 &&
                                  !isValidSwiftBic(
                                    editBankForm.bankSwiftBic
                                  ) && (
                                    <p className="text-xs text-red-500">
                                      Invalid SWIFT / BIC code.
                                    </p>
                                  )}
                              </div>
                            </>
                          )}
                          {editBankRegion(editBankForm.bankCountry) ===
                            "IN" && (
                            <>
                              <div className="space-y-1.5">
                                <Label
                                  size="sm"
                                  htmlFor="edit-bank-account-number-in"
                                >
                                  Account Number
                                </Label>
                                <Input
                                  id="edit-bank-account-number-in"
                                  type="text"
                                  placeholder={editBankAccountPlaceholder("IN")}
                                  value={editBankForm.bankAccountNumber}
                                  onChange={(e) =>
                                    setEditBankForm((f) => ({
                                      ...f,
                                      bankAccountNumber: e.target.value,
                                    }))
                                  }
                                />
                              </div>
                              <div className="space-y-1.5">
                                <Label size="sm" htmlFor="edit-bank-ifsc">
                                  IFSC Code
                                </Label>
                                <Input
                                  id="edit-bank-ifsc"
                                  type="text"
                                  placeholder="Enter 11 character IFSC Code (e.g. ICIC0001234)"
                                  value={editBankForm.bankIfscCode}
                                  onChange={(e) =>
                                    setEditBankForm((f) => ({
                                      ...f,
                                      bankIfscCode: e.target.value,
                                    }))
                                  }
                                />
                                {editBankForm.bankIfscCode.length > 0 &&
                                  !isValidIfsc(editBankForm.bankIfscCode) && (
                                    <p className="text-xs text-red-500">
                                      Invalid IFSC code.
                                    </p>
                                  )}
                              </div>
                            </>
                          )}
                          {editBankRegion(editBankForm.bankCountry) ===
                            "AU" && (
                            <>
                              <div className="space-y-1.5">
                                <Label
                                  size="sm"
                                  htmlFor="edit-bank-account-number-au"
                                >
                                  Account Number
                                </Label>
                                <Input
                                  id="edit-bank-account-number-au"
                                  type="text"
                                  placeholder={editBankAccountPlaceholder("AU")}
                                  value={editBankForm.bankAccountNumber}
                                  onChange={(e) =>
                                    setEditBankForm((f) => ({
                                      ...f,
                                      bankAccountNumber: e.target.value,
                                    }))
                                  }
                                />
                              </div>
                              <div className="space-y-1.5">
                                <Label size="sm" htmlFor="edit-bank-bsb">
                                  BSB Code
                                </Label>
                                <Input
                                  id="edit-bank-bsb"
                                  type="text"
                                  placeholder="Enter 6 digit BSB Code (e.g. 062-000)"
                                  value={editBankForm.bankBsbNumber}
                                  onChange={(e) =>
                                    setEditBankForm((f) => ({
                                      ...f,
                                      bankBsbNumber: e.target.value,
                                    }))
                                  }
                                />
                                {editBankForm.bankBsbNumber.length > 0 &&
                                  !isValidBsb(editBankForm.bankBsbNumber) && (
                                    <p className="text-xs text-red-500">
                                      Invalid BSB code.
                                    </p>
                                  )}
                              </div>
                            </>
                          )}
                          {editBankRegion(editBankForm.bankCountry) ===
                            "GB" && (
                            <>
                              <div className="space-y-1.5">
                                <Label
                                  size="sm"
                                  htmlFor="edit-bank-account-number-gb"
                                >
                                  Account Number
                                </Label>
                                <Input
                                  id="edit-bank-account-number-gb"
                                  type="text"
                                  placeholder={editBankAccountPlaceholder("GB")}
                                  value={editBankForm.bankAccountNumber}
                                  onChange={(e) =>
                                    setEditBankForm((f) => ({
                                      ...f,
                                      bankAccountNumber: e.target.value,
                                    }))
                                  }
                                />
                              </div>
                              <div className="space-y-1.5">
                                <Label size="sm" htmlFor="edit-bank-sort-code">
                                  Sort Code
                                </Label>
                                <Input
                                  id="edit-bank-sort-code"
                                  type="text"
                                  placeholder="Enter 6 digit Sort Code here (e.g. 20-00-00)"
                                  value={editBankForm.bankSortCode}
                                  onChange={(e) =>
                                    setEditBankForm((f) => ({
                                      ...f,
                                      bankSortCode: e.target.value,
                                    }))
                                  }
                                />
                                {editBankForm.bankSortCode.length > 0 &&
                                  !isValidSortCode(
                                    editBankForm.bankSortCode
                                  ) && (
                                    <p className="text-xs text-red-500">
                                      Sort code must be 6 digits.
                                    </p>
                                  )}
                              </div>
                            </>
                          )}
                          {editBankRegion(editBankForm.bankCountry) ===
                            "JP" && (
                            <>
                              <div className="space-y-1.5">
                                <Label
                                  size="sm"
                                  htmlFor="edit-bank-code-jp"
                                >
                                  Bank Code
                                </Label>
                                <Input
                                  id="edit-bank-code-jp"
                                  type="text"
                                  placeholder="Enter 4 digit Bank Code here"
                                  value={editBankForm.bankCode}
                                  onChange={(e) =>
                                    setEditBankForm((f) => ({
                                      ...f,
                                      bankCode: e.target.value,
                                    }))
                                  }
                                />
                                {editBankForm.bankCode.length > 0 &&
                                  !isValidJpBankCode(editBankForm.bankCode) && (
                                    <p className="text-xs text-red-500">
                                      Bank code must be 4 digits.
                                    </p>
                                  )}
                              </div>
                              <div className="space-y-1.5">
                                <Label
                                  size="sm"
                                  htmlFor="edit-bank-branch-code-jp"
                                >
                                  Branch Code
                                </Label>
                                <Input
                                  id="edit-bank-branch-code-jp"
                                  type="text"
                                  placeholder="Enter 3 digit Branch Code here"
                                  value={editBankForm.bankBranchCode}
                                  onChange={(e) =>
                                    setEditBankForm((f) => ({
                                      ...f,
                                      bankBranchCode: e.target.value,
                                    }))
                                  }
                                />
                                {editBankForm.bankBranchCode.length > 0 &&
                                  !isValidJpBranchCode(
                                    editBankForm.bankBranchCode
                                  ) && (
                                    <p className="text-xs text-red-500">
                                      Branch code must be 3 digits.
                                    </p>
                                  )}
                              </div>
                              <div className="space-y-1.5">
                                <Label
                                  size="sm"
                                  htmlFor="edit-bank-account-number-jp"
                                >
                                  Account Number
                                </Label>
                                <Input
                                  id="edit-bank-account-number-jp"
                                  type="text"
                                  placeholder={editBankAccountPlaceholder("JP")}
                                  value={editBankForm.bankAccountNumber}
                                  onChange={(e) =>
                                    setEditBankForm((f) => ({
                                      ...f,
                                      bankAccountNumber: e.target.value,
                                    }))
                                  }
                                />
                                {editBankForm.bankAccountNumber.length > 0 &&
                                  !/^\d{7}$/.test(
                                    editBankForm.bankAccountNumber
                                  ) && (
                                    <p className="text-xs text-red-500">
                                      Account number must be 7 digits.
                                    </p>
                                  )}
                              </div>
                            </>
                          )}
                          {editBankRegion(editBankForm.bankCountry) ===
                            "SWIFT" && (
                            <>
                              <div className="space-y-1.5">
                                <Label
                                  size="sm"
                                  htmlFor="edit-bank-account-number-asia"
                                >
                                  Account Number
                                </Label>
                                <Input
                                  id="edit-bank-account-number-asia"
                                  type="text"
                                  placeholder={editBankAccountPlaceholder("SG")}
                                  value={editBankForm.bankAccountNumber}
                                  onChange={(e) =>
                                    setEditBankForm((f) => ({
                                      ...f,
                                      bankAccountNumber: e.target.value,
                                    }))
                                  }
                                />
                              </div>
                              <div className="space-y-1.5">
                                <Label size="sm" htmlFor="edit-bank-swift-asia">
                                  Swift Code
                                </Label>
                                <Input
                                  id="edit-bank-swift-asia"
                                  type="text"
                                  placeholder="Enter 8 or 11 character SWIFT/BIC Code"
                                  value={editBankForm.bankSwiftBic}
                                  onChange={(e) =>
                                    setEditBankForm((f) => ({
                                      ...f,
                                      bankSwiftBic: e.target.value,
                                    }))
                                  }
                                />
                                {editBankForm.bankSwiftBic.length > 0 &&
                                  !isValidSwiftBic(
                                    editBankForm.bankSwiftBic
                                  ) && (
                                    <p className="text-xs text-red-500">
                                      Invalid SWIFT / BIC code.
                                    </p>
                                  )}
                              </div>
                            </>
                          )}
                          {editBankRegion(editBankForm.bankCountry) !==
                            "SEPA" && (
                            <div className="space-y-1.5">
                              <Label
                                size="sm"
                                htmlFor="edit-bank-account-number-confirm"
                              >
                                Confirm Account Number
                              </Label>
                              <Input
                                id="edit-bank-account-number-confirm"
                                type="text"
                                placeholder="Re-enter account number"
                                value={editBankForm.bankAccountNumberConfirm}
                                onChange={(e) =>
                                  setEditBankForm((f) => ({
                                    ...f,
                                    bankAccountNumberConfirm: e.target.value,
                                  }))
                                }
                              />
                              {editBankForm.bankAccountNumberConfirm.length >
                                0 &&
                                editBankForm.bankAccountNumberConfirm !==
                                  editBankForm.bankAccountNumber && (
                                  <p className="text-xs text-red-500">
                                    Account numbers do not match.
                                  </p>
                                )}
                            </div>
                          )}
                        </div>
                        <div className="mt-12 flex items-center justify-end gap-x-2">
                          <Button
                            type="button"
                            variant="outlined"
                            visual="gray"
                            onClick={() => setEditingMethod(null)}
                          >
                            Cancel
                          </Button>
                          <Button
                            type="button"
                            disabled={!isEditBankInfoComplete(editBankForm)}
                            onClick={() => setConfirmEditSave(true)}
                          >
                            Save
                          </Button>
                        </div>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="p-6">
                        <h3 className="text-base font-semibold text-dark-blue-400 mb-4">
                          Edit Account
                        </h3>
                        <div className="space-y-3">
                          <div>
                            <Label size="sm">Account</Label>
                            <p className="text-sm font-medium text-dark-blue-400">
                              {editingMethod.displayLabel}
                            </p>
                          </div>
                          <div className="space-y-1.5">
                            <Label size="sm" htmlFor="edit-account-nickname">
                              Nickname (optional)
                            </Label>
                            <Input
                              id="edit-account-nickname"
                              type="text"
                              placeholder="e.g. My Chase Savings"
                              value={editingMethod.nickname ?? ""}
                              onChange={(e) =>
                                setEditingMethod((m: any) => ({
                                  ...m,
                                  nickname: e.target.value,
                                }))
                              }
                            />
                          </div>
                          {editingMethod.methodType === "BANK_MANUAL" &&
                          editingMethod.verificationStatus === "verified" ? (
                            <p className="text-xs text-gray-400 pt-2 border-t border-gray-200">
                              This account is verified and its bank details
                              can&apos;t be changed here — remove it and add a
                              new one instead.
                            </p>
                          ) : null}
                          {editBankError && (
                            <p className="text-sm text-red-600">
                              {editBankError}
                            </p>
                          )}
                        </div>
                        <div className="mt-12 flex items-center justify-end gap-x-2">
                          <Button
                            type="button"
                            variant="outlined"
                            visual="gray"
                            onClick={() => setEditingMethod(null)}
                          >
                            Cancel
                          </Button>
                          <Button
                            type="button"
                            onClick={() => setConfirmEditSave(true)}
                          >
                            Save
                          </Button>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Sidebar */}
        <div className="w-[372px] shrink-0 space-y-5 hidden min-[1440px]:block">
          {/* Available for Withdrawal */}
          <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-[0px_1px_4px_0px_rgba(0,0,0,.03)]">
            <div className="flex items-center gap-1.5 mb-4">
              <h3 className="text-base font-semibold text-[#22376B]">
                Available for Withdrawal
              </h3>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <HelpCircle className="size-4 text-[#98A2B3]" />
                  </TooltipTrigger>
                  <TooltipContent visual="white" size="md">
                    <p>
                      Earnings currently eligible for manual withdrawal.{" "}
                      {reserveUsd > 0
                        ? `This amount excludes your $${reserveUsd.toFixed(2)} reserve balance and any pending transactions.`
                        : "This amount excludes any pending transactions."}{" "}
                      You can update these preferences under{" "}
                      <button
                        type="button"
                        className="text-primary-600 underline hover:text-primary-700"
                        onClick={() => onEditPayoutSchedule?.()}
                      >
                        Payout Settings
                      </button>
                      .
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            {/* US-05/US-06: a genuine load failure is never conflated with a real $0
              balance — distinct copy, no amount shown, retry inline in the card
              (no toast, matching the per-component-error pattern used elsewhere
              in this epic). */}
            {balanceError ? (
              <div className="py-2">
                <p className="text-sm text-red-600">Balance unavailable.</p>
                <button
                  className="text-sm text-primary-600 underline mt-1"
                  onClick={loadBalance}
                >
                  Retry
                </button>
              </div>
            ) : balance && parseFloat(balance.totalEarnedUsd) === 0 ? (
              // US-04: "genuinely zero" means never earned anything at all — distinct
              // from a contractor who has earned before but has $0 available right now
              // (e.g. already withdrawn everything). totalEarnedUsd is the reliable
              // signal for that distinction; availableBalance alone can't tell them apart.
              <div className="py-2 space-y-2">
                <p className="text-sm text-gray-500">
                  You haven't earned anything yet. Once you log billable time,
                  your available balance will show up here.
                </p>
                {/* US-99: takes the contractor straight to Help & Support (billing
                  section expanded by default) rather than a toast that dead-ends. */}
                <button
                  className="text-sm text-primary-600 underline"
                  onClick={() => onOpenHelp?.()}
                >
                  How does billing work?
                </button>
              </div>
            ) : (
              (() => {
                // reserveUsd is in USD (payout-service's schedule) while
                // availableBalanceDisplay may be FX-converted — apply the same
                // implicit rate the backend already computed rather than mixing
                // currencies.
                const grossUsd = balance
                  ? parseFloat(balance.availableBalance)
                  : 0
                const grossDisplay = balance
                  ? parseFloat(balance.availableBalanceDisplay)
                  : 0
                const rate = grossUsd > 0 ? grossDisplay / grossUsd : 1
                const netDisplay = balance
                  ? Math.max(0, grossDisplay - reserveUsd * rate)
                  : 0
                const withdrawalMethodLabel = defaultMethod
                  ? getMethodLabel(defaultMethod)
                  : null
                const withdrawalMethodMask =
                  withdrawalMethodLabel?.sub.replace(/^•{4}/, "...") ?? ""
                return (
                  <>
                    <div className="flex items-baseline gap-3 mb-5 flex-wrap">
                      <div className="inline-flex items-baseline">
                        <FigmaAmount
                          amount={balance ? netDisplay : null}
                          symbol={currencySymbol(
                            summary?.thisMonth.displayCurrency || "USD"
                          )}
                          size="sm"
                        />
                        {/* US-08: never conditionally hidden, even though the balance
                          might look "off" from what the contractor expects. */}
                        {balance?.stale && (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span className="ml-0.5 text-lg text-amber-500 cursor-help align-super">
                                  *
                                </span>
                              </TooltipTrigger>
                              <TooltipContent visual="white" size="md">
                                <p>Exchange rate may be delayed.</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        )}
                      </div>
                      {withdrawalMethodLabel && (
                        <div className="flex items-center gap-1.5 text-sm text-[#98A2B3]">
                          <BankIcon className="size-4 shrink-0" />
                          <span className="truncate">
                            {withdrawalMethodLabel.name}
                            {withdrawalMethodMask
                              ? ` ${withdrawalMethodMask}`
                              : ""}
                          </span>
                        </div>
                      )}
                    </div>
                    {/* US-07: secondary local-currency amount, shown only when it
                  actually differs from the display currency. */}
                    {balance &&
                      balance.localCurrency !== balance.displayCurrency && (
                        <p className="text-xs text-[#98A2B3] mb-3">
                          {balance.availableBalanceLocal}{" "}
                          {balance.localCurrency}
                        </p>
                      )}
                    {/* US-11: pre-empt a withdrawal that would just fail server-side (payout.service.ts
                  payoutMinimum, $50 default) — the /transfer-funds page still enforces this itself,
                  this is only a client-side UX guard against an obviously-doomed flow. */}
                    {(() => {
                      const withdrawableUsd = balance ? netDisplay : null
                      const belowMinimum =
                        withdrawableUsd !== null && withdrawableUsd < 50
                      const isLoading = withdrawableUsd === null
                      return (
                        <div className="flex items-center gap-4">
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span>
                                  <Button
                                    variant="outlined"
                                    visual="gray"
                                    size="sm"
                                    className="font-semibold text-[#22376B]"
                                    disabled={belowMinimum || isLoading}
                                    onClick={() => setWithdrawOpen(true)}
                                  >
                                    Withdraw Funds
                                  </Button>
                                </span>
                              </TooltipTrigger>
                              {belowMinimum && (
                                <TooltipContent>
                                  <p>
                                    You don&apos;t have any earnings to withdraw
                                    yet.
                                  </p>
                                </TooltipContent>
                              )}
                            </Tooltip>
                          </TooltipProvider>
                          <button
                            type="button"
                            className="text-sm font-semibold text-[#22376B] underline underline-offset-4"
                            onClick={() => router.push("/settings?tab=billing-overview")}
                          >
                            Manage
                          </button>
                        </div>
                      )
                    })()}
                  </>
                )
              })()
            )}
          </div>

          {/* Recent Activity — derived from real payout history (no dedicated
            activity-feed endpoint exists in payout-service; see toActivityItem). */}
          <div className="rounded-lg border border-gray-200 bg-white p-5">
            <h3 className="text-sm font-semibold text-dark-blue-400 mb-4">
              Recent Activity
            </h3>
            <div className="space-y-4">
              {recentActivityLoading ? (
                [...Array(4)].map((_, i) => (
                  <div
                    key={i}
                    className="h-9 bg-gray-100 rounded-lg animate-pulse"
                  />
                ))
              ) : recentActivityError ? (
                <div className="text-center py-6">
                  <p className="text-sm text-red-600">
                    We couldn't load your recent activity.
                  </p>
                  <button
                    className="text-sm text-primary-600 underline mt-1"
                    onClick={loadRecentActivity}
                  >
                    Retry
                  </button>
                </div>
              ) : recentActivity.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-6">
                  No activity yet
                </p>
              ) : (
                recentActivity.map((item) => (
                  <div key={item.id} className="flex items-start gap-3">
                    <div className="size-11 rounded-lg border border-gray-200 flex items-center justify-center shrink-0">
                      {ACTIVITY_ICON[item.kind].icon}
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
                ))
              )}
            </div>
          </div>
        </div>
      </div>
      <WithdrawFundsDialog
        open={withdrawOpen}
        onOpenChange={setWithdrawOpen}
        onVerified={() => {
          loadBalance()
          loadSummary()
          loadRecentActivity()
          loadFailedPayout()
        }}
      />
    </>
  )
}

// ─── Payout Schedule Dialog ──────────────────────────────────────────────

// ─── Deposit Method Options ─────────────────────────────────────────────

const DAYS_OF_WEEK = [
  { key: "S1", label: "S", fullName: "Sunday" },
  { key: "M", label: "M", fullName: "Monday" },
  { key: "T1", label: "T", fullName: "Tuesday" },
  { key: "W", label: "W", fullName: "Wednesday" },
  { key: "T2", label: "T", fullName: "Thursday" },
  { key: "F", label: "F", fullName: "Friday" },
  { key: "S2", label: "S", fullName: "Saturday" },
]

const THRESHOLD_PRESETS = [50, 100, 250, 500, 1000]

// AC-33.03/16.03-style error mapping — user-friendly text, never raw errorCode/status.
const SCHEDULE_ERROR_MESSAGES: Record<string, string> = {
  ERR_SCHEDULE_THRESHOLD_BELOW_MINIMUM: "Minimum payout threshold is $50.",
  ERR_SCHEDULE_RESERVE_EXCEEDS_MAX: "Reserve must be between $0 and $250.",
  ERR_SCHEDULE_METHOD_NOT_FOUND:
    "The selected primary method is not verified or no longer exists.",
  ERR_SPLIT_NO_SECONDARY_METHOD:
    "Select a secondary method to enable split payouts.",
  ERR_SPLIT_SAME_METHOD:
    "Secondary method must be different from your primary method.",
  ERR_SPLIT_METHOD_NOT_VERIFIED:
    "The selected secondary method must be verified.",
  ERR_SPLIT_NOT_ENABLED: "Enable split payout before setting a percentage.",
  ERR_SCHEDULE_NOT_FOUND: "Save your schedule before configuring split payout.",
  ERR_SCHEDULE_END_DATE_BEFORE_START: "End date must be after start date.",
  ERR_SCHEDULE_INVALID_FREQUENCY:
    "Daily payouts are only available for bank transfer methods.",
}

// F-13 Help & Support Tab (US-95–99). Facts below are pulled from the actual
// backend constants rather than invented: 20% default platform fee (see
// earnings.service.ts getRecentFeePercent fallback), 5-business-day
// first-payout KYC hold (kyc-gate.service.ts), $600 USD annual tax
// threshold (transaction-created.consumer.ts / earnings.service.ts).
export const HelpSupportDialog = ({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) => (
  <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="sm:max-w-lg p-0 gap-0">
      <div className="flex items-center justify-between px-6 py-5 border-b border-gray-200">
        <DialogTitle className="text-base font-semibold text-dark-blue-400">
          Help & Support
        </DialogTitle>
        <DialogClose asChild>
          <IconButton size="sm" variant="ghost" visual="gray">
            <X className="size-4" />
          </IconButton>
        </DialogClose>
      </div>
      <div className="p-6 max-h-[70vh] overflow-y-auto">
        <Accordion
          type="multiple"
          className="space-y-3"
          defaultValue={["billing"]}
        >
          {/* US-95 */}
          <AccordionItem
            className="rounded-lg border border-gray-200"
            value="billing"
          >
            <AccordionTrigger className="w-full px-4 py-3 flex items-center gap-x-2 text-sm font-semibold text-dark-blue-400">
              <span className="flex-auto text-left">
                How does billing work?
              </span>
              <ChevronDown className="size-4 shrink-0 group-data-[state=open]/item:-rotate-180 transition duration-300" />
            </AccordionTrigger>
            <DisclosureContent className="px-4 pb-4 text-sm text-gray-500 leading-relaxed">
              Marketeq deducts a service fee — 20% by default — from each
              confirmed work session before it's added to your available
              balance. Your gross earnings (time logged × your rate) minus this
              fee equals your net balance. The exact fee percent for each entry
              is shown in that entry's Fee Breakdown.
            </DisclosureContent>
          </AccordionItem>

          {/* US-96 */}
          <AccordionItem
            className="rounded-lg border border-gray-200"
            value="kyc"
          >
            <AccordionTrigger className="w-full px-4 py-3 flex items-center gap-x-2 text-sm font-semibold text-dark-blue-400">
              <span className="flex-auto text-left">
                Why is my first payout on hold?
              </span>
              <ChevronDown className="size-4 shrink-0 group-data-[state=open]/item:-rotate-180 transition duration-300" />
            </AccordionTrigger>
            <DisclosureContent className="px-4 pb-4 text-sm text-gray-500 leading-relaxed">
              For your security, your first withdrawal from Marketeq is held for
              5 business days before being released. This is a one-time step —
              after your first successful payout, future withdrawals are not
              subject to this hold.
            </DisclosureContent>
          </AccordionItem>

          {/* US-97 */}
          <AccordionItem
            className="rounded-lg border border-gray-200"
            value="fx"
          >
            <AccordionTrigger className="w-full px-4 py-3 flex items-center gap-x-2 text-sm font-semibold text-dark-blue-400">
              <span className="flex-auto text-left">
                How are exchange rates applied?
              </span>
              <ChevronDown className="size-4 shrink-0 group-data-[state=open]/item:-rotate-180 transition duration-300" />
            </AccordionTrigger>
            <DisclosureContent className="px-4 pb-4 text-sm text-gray-500 leading-relaxed">
              Your contract rate is locked in the currency it was created in —
              that locked amount is what you're actually paid. Your display
              currency is for reference only, converted at a live rate each time
              you view it, so amounts shown may differ slightly from what was
              billed.
            </DisclosureContent>
          </AccordionItem>

          {/* US-98 */}
          <AccordionItem
            className="rounded-lg border border-gray-200"
            value="tax"
          >
            <AccordionTrigger className="w-full px-4 py-3 flex items-center gap-x-2 text-sm font-semibold text-dark-blue-400">
              <span className="flex-auto text-left">
                What are my tax reporting obligations?
              </span>
              <ChevronDown className="size-4 shrink-0 group-data-[state=open]/item:-rotate-180 transition duration-300" />
            </AccordionTrigger>
            <DisclosureContent className="px-4 pb-4 text-sm text-gray-500 leading-relaxed">
              Once your earnings on Marketeq reach $600 USD in a calendar year,
              we're required to collect a completed W-9 (U.S. contractors) or
              W-8BEN (non-U.S. contractors) from you for tax reporting purposes.
              We'll notify you when you approach this threshold so you can
              prepare.
            </DisclosureContent>
          </AccordionItem>
        </Accordion>
        <p className="text-xs text-gray-400 mt-4">
          Still have questions? Contact us at{" "}
          <a
            href="mailto:support@marketeqdigital.com"
            className="text-primary-600 underline"
          >
            support@marketeqdigital.com
          </a>
          .
        </p>
      </div>
    </DialogContent>
  </Dialog>
)

// Split-payout row icon (Figma). A smaller, local counterpart to
// OverviewTab's getMethodIcon — that one isn't reachable from here since
// it's a closure inside a different component.
const renderScheduleMethodIcon = (m: any) => {
  if (m.methodType === "WISE") return <WiseIcon className="size-5" />
  if (m.methodType === "PAYONEER") return <PayoneerIcon className="size-5" />
  if (m.methodType === "CRYPTO")
    return <CryptoProviderIcon provider={m.cryptoProvider} className="size-5" />
  // Figma: every bank row (regardless of institution) uses the same plain
  // bank glyph here, not a per-bank branded logo like BankLogo draws elsewhere.
  return <BankIcon className="size-5 text-dark-blue-400" />
}

export const PayoutScheduleDialog = ({
  open,
  onOpenChange,
  onSaved,
  onAddNewMethod,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSaved?: () => void
  onAddNewMethod?: () => void
}) => {
  const { toast } = useToast()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState("")

  // AC-14.02/22.02: only verified methods are selectable as primary/secondary.
  const [methods, setMethods] = useState<DepositMethodOption[]>([])

  // Primary method + split (US-22/23)
  const [primaryMethodId, setPrimaryMethodId] = useState("")
  const [splitEnabled, setSplitEnabled] = useState(false)
  const [secondaryMethodId, setSecondaryMethodId] = useState("")
  const [primarySplitPercent, setPrimarySplitPercent] = useState(50)
  // Snapshot of what's persisted server-side, to know what actually changed on Save.
  const [initial, setInitial] = useState({
    splitEnabled: false,
    secondaryMethodId: "",
    primarySplitPercent: 50,
  })
  // SCR-14: disabling an already-saved split configuration requires a confirmation
  // prompt — an in-progress, unsaved toggle-on doesn't need one (nothing to lose yet).
  const [confirmDisableSplit, setConfirmDisableSplit] = useState(false)

  // Schedule cadence (US-24/25/26)
  const [isActive, setIsActive] = useState(true)
  const [frequency, setFrequency] = useState("weekly")
  const [dayOfWeek, setDayOfWeek] = useState(1)
  const [dayOfMonth, setDayOfMonth] = useState(1)
  // Figma "Repeat Every [N] [Days/Weeks/Months]" — customIntervalDays is the
  // only column the backend stores, so weeks/months are converted to days
  // before saving (weeks*7, months*30) and back when hydrating from a saved
  // schedule. customIntervalCount is the number shown in the unit the user
  // picked, not the raw day count.
  const [customIntervalUnit, setCustomIntervalUnit] = useState<
    "days" | "weeks" | "months"
  >("days")
  const [customIntervalCount, setCustomIntervalCount] = useState(7)
  // US-72: optional window for a custom schedule, e.g. pause payouts during
  // a planned absence without disabling the schedule outright. yyyy-mm-dd
  // strings for <input type="date">; empty string = unset. Figma gates the
  // end date behind a "Stop Deposits On" toggle rather than showing it bare.
  const [scheduleStartDate, setScheduleStartDate] = useState("")
  const [scheduleEndDate, setScheduleEndDate] = useState("")
  const [stopDepositsEnabled, setStopDepositsEnabled] = useState(false)
  const [nextRunAt, setNextRunAt] = useState<string | null>(null)
  const [scheduleUpdatedAt, setScheduleUpdatedAt] = useState<string | null>(
    null
  )
  // Figma: "Set Custom Schedule" is its own popup modal, not an inline
  // expansion. The snapshot lets the modal's Cancel button discard in-progress
  // edits and restore exactly what was there before the modal opened.
  const [customModalOpen, setCustomModalOpen] = useState(false)
  const [customDraftSnapshot, setCustomDraftSnapshot] = useState<{
    scheduleStartDate: string
    scheduleEndDate: string
    stopDepositsEnabled: boolean
    customIntervalUnit: "days" | "weeks" | "months"
    customIntervalCount: number
    dayOfWeek: number
  } | null>(null)

  // Minimum payout + reserve. Figma shows preset buttons ($25/$50/$100/$150/
  // $250) plus a Custom amount input, not a plain on/off toggle — backend
  // (schedule.service.ts) enforces 0 <= reserveUsd <= 250 regardless of
  // which UI sets it, so presets are fully within that range already.
  const [thresholdUsd, setThresholdUsd] = useState("50")
  const [reserveUsd, setReserveUsd] = useState("0")
  const RESERVE_PRESETS = [25, 50, 100, 150, 250]
  const [reserveCustomOpen, setReserveCustomOpen] = useState(false)
  const [reserveCustomValue, setReserveCustomValue] = useState("")

  // Split payout — there's no backend auto-balance algorithm
  // (primarySplitPercent is the only stored value, secondarySplitPercent is
  // just its complement). "Auto Split" only sets the starting point: turning
  // it on snaps the split back to 50/50, but the percent field stays
  // editable in both states — QA-confirmed bug: it used to also lock the
  // field while Auto Split was on, which shouldn't gate editability at all.
  const [autoSplit, setAutoSplit] = useState(true)

  // Authorization
  const [authorized, setAuthorized] = useState(false)

  const selectedDayFull = DAYS_OF_WEEK[dayOfWeek]?.fullName ?? "Monday"

  // ERR_SCHEDULE_INVALID_FREQUENCY: daily payouts only settle over the ACH
  // rail (BANK_STRIPE/BANK_MANUAL) — Wise/Payoneer/Crypto still route through
  // an OAuth-linked or on-chain transfer that can't clear same-day, every day.
  // Mirror that server-side rule client-side so the option is disabled (with
  // a reason) before the contractor ever submits and hits the error.
  const ACH_METHOD_TYPES = ["BANK_STRIPE", "BANK_MANUAL"]
  const isNonAchMethod = (methodId: string) => {
    if (!methodId) return false
    const method = methods.find((m) => m.id === methodId)
    return !!method && !ACH_METHOD_TYPES.includes(method.methodType)
  }
  const dailyDisabled =
    isNonAchMethod(primaryMethodId) ||
    (splitEnabled && isNonAchMethod(secondaryMethodId))

  // If a non-ACH method gets picked as primary/secondary while "Daily" is
  // already selected (e.g. switching primary method after choosing Daily),
  // fall back to Weekly rather than leaving an invalid frequency selected.
  React.useEffect(() => {
    if (dailyDisabled && frequency === "daily") setFrequency("weekly")
  }, [dailyDisabled, frequency])

  const getScheduleLabel = () => {
    if (frequency === "weekly") return `Weekly (every ${selectedDayFull})`
    if (frequency === "bi_weekly")
      return `Bi-Weekly (every other ${selectedDayFull})`
    if (frequency === "monthly")
      return `Monthly (on the ${dayOfMonth}${dayOfMonth === 1 ? "st" : dayOfMonth === 2 ? "nd" : dayOfMonth === 3 ? "rd" : "th"})`
    if (frequency === "daily") return "Daily (every day)"
    if (frequency === "custom")
      return `Every ${customIntervalCount} ${customIntervalCount === 1 ? customIntervalUnit.slice(0, -1) : customIntervalUnit}`
    return "Select schedule"
  }

  const loadSchedule = React.useCallback(async () => {
    setLoading(true)
    setFormError("")
    try {
      const [methodsRes, scheduleRes] = await Promise.all([
        payoutFetch(`/deposit-methods`),
        payoutFetch(`/payouts/schedule`),
      ])
      const methodsData = await methodsRes.json()
      const verified: DepositMethodOption[] = (
        methodsData.methods ?? []
      ).filter((m: any) => m.verificationStatus === "verified")
      setMethods(verified)

      if (scheduleRes.ok) {
        const s = await scheduleRes.json()
        setPrimaryMethodId(
          s.primaryMethod?.id ?? verified.find((m) => m.isDefault)?.id ?? ""
        )
        setSplitEnabled(!!s.splitEnabled)
        setSecondaryMethodId(s.secondaryMethod?.id ?? "")
        setPrimarySplitPercent(s.primarySplitPercent ?? 50)
        setAutoSplit((s.primarySplitPercent ?? 50) === 50)
        setInitial({
          splitEnabled: !!s.splitEnabled,
          secondaryMethodId: s.secondaryMethod?.id ?? "",
          primarySplitPercent: s.primarySplitPercent ?? 50,
        })
        setIsActive(s.isActive ?? true)
        setFrequency(s.frequency ?? "weekly")
        setDayOfWeek(s.dayOfWeek ?? 1)
        setDayOfMonth(s.dayOfMonth ?? 1)
        const loadedIntervalDays = s.customIntervalDays ?? 7
        if (loadedIntervalDays >= 30 && loadedIntervalDays % 30 === 0) {
          setCustomIntervalUnit("months")
          setCustomIntervalCount(loadedIntervalDays / 30)
        } else if (loadedIntervalDays % 7 === 0) {
          setCustomIntervalUnit("weeks")
          setCustomIntervalCount(loadedIntervalDays / 7)
        } else {
          setCustomIntervalUnit("days")
          setCustomIntervalCount(loadedIntervalDays)
        }
        setScheduleStartDate(s.startDate ? s.startDate.slice(0, 10) : "")
        setScheduleEndDate(s.endDate ? s.endDate.slice(0, 10) : "")
        setStopDepositsEnabled(!!s.endDate)
        setThresholdUsd(
          s.thresholdUsd ? String(Math.round(parseFloat(s.thresholdUsd))) : "50"
        )
        const loadedReserve = s.reserveUsd
          ? Math.round(parseFloat(s.reserveUsd))
          : 0
        setReserveUsd(String(loadedReserve))
        if (loadedReserve > 0 && !RESERVE_PRESETS.includes(loadedReserve)) {
          setReserveCustomOpen(true)
          setReserveCustomValue(String(loadedReserve))
        } else {
          setReserveCustomOpen(false)
          setReserveCustomValue("")
        }
        // AC-25.03: next run date is always the server-computed value, never derived client-side.
        setNextRunAt(s.nextRunAt ?? null)
        setScheduleUpdatedAt(s.updatedAt ?? null)
      }
    } catch {
      setFormError("We couldn't load your payout schedule. Please try again.")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (open) loadSchedule()
  }, [open, loadSchedule])

  const handleSave = async () => {
    if (!primaryMethodId) {
      setFormError("Select a primary payout method.")
      return
    }
    setSaving(true)
    setFormError("")
    try {
      const headers = { "Content-Type": "application/json" }

      const schedulePayload: any = {
        isActive,
        frequency,
        thresholdUsd,
        reserveUsd,
        primaryMethodId,
      }
      if (frequency === "weekly" || frequency === "bi_weekly")
        schedulePayload.dayOfWeek = dayOfWeek
      if (frequency === "monthly") schedulePayload.dayOfMonth = dayOfMonth
      if (frequency === "custom") {
        // customIntervalDays is the only interval column the backend stores —
        // weeks/months are converted to days before saving (weeks*7, months*30).
        const unitMultiplier =
          customIntervalUnit === "months"
            ? 30
            : customIntervalUnit === "weeks"
              ? 7
              : 1
        schedulePayload.customIntervalDays =
          customIntervalCount * unitMultiplier
        schedulePayload.dayOfWeek = dayOfWeek
        // Explicit null (not omitted) clears a previously-set date server-side.
        schedulePayload.startDate = scheduleStartDate
          ? new Date(scheduleStartDate).toISOString()
          : null
        schedulePayload.endDate =
          stopDepositsEnabled && scheduleEndDate
            ? new Date(scheduleEndDate).toISOString()
            : null
      }

      const scheduleRes = await payoutFetch(`/payouts/schedule`, {
        method: "PUT",
        headers,
        body: JSON.stringify(schedulePayload),
      })
      const scheduleData = await scheduleRes.json()
      if (!scheduleRes.ok) {
        setFormError(
          SCHEDULE_ERROR_MESSAGES[scheduleData.errorCode] ??
            scheduleData.message ??
            "Unable to save schedule."
        )
        return
      }
      setNextRunAt(scheduleData.nextRunAt ?? null)
      setScheduleUpdatedAt(scheduleData.updatedAt ?? null)

      // AC-22.x/23.x: split is a separate resource — only PATCH what actually changed.
      if (splitEnabled !== initial.splitEnabled) {
        const splitRes = await payoutFetch(`/payouts/schedule/split`, {
          method: "PATCH",
          headers,
          body: JSON.stringify(
            splitEnabled
              ? { splitEnabled: true, secondaryMethodId }
              : { splitEnabled: false }
          ),
        })
        const splitData = await splitRes.json()
        if (!splitRes.ok) {
          setFormError(
            SCHEDULE_ERROR_MESSAGES[splitData.errorCode] ??
              splitData.message ??
              "Unable to save split payout."
          )
          return
        }
      } else if (
        splitEnabled &&
        (primarySplitPercent !== initial.primarySplitPercent ||
          secondaryMethodId !== initial.secondaryMethodId)
      ) {
        const splitRes = await payoutFetch(`/payouts/schedule/split`, {
          method: "PATCH",
          headers,
          body: JSON.stringify({ primarySplitPercent, secondaryMethodId }),
        })
        const splitData = await splitRes.json()
        if (!splitRes.ok) {
          setFormError(
            SCHEDULE_ERROR_MESSAGES[splitData.errorCode] ??
              splitData.message ??
              "Unable to save split payout."
          )
          return
        }
      }

      onOpenChange(false)
      onSaved?.()
      // Figma: split on/off gets its own specific toast naming the actual
      // methods/percentages involved, not the generic schedule-updated one.
      if (splitEnabled && !initial.splitEnabled) {
        const primaryMethodObj = methods.find((m) => m.id === primaryMethodId)
        const secondaryMethodObj = methods.find(
          (m) => m.id === secondaryMethodId
        )
        const primaryLabel = primaryMethodObj
          ? formatMethodOptionLabel(primaryMethodObj)
          : "your primary method"
        const secondaryLabel = secondaryMethodObj
          ? formatMethodOptionLabel(secondaryMethodObj)
          : "your secondary method"
        const secondaryPct = Math.round((100 - primarySplitPercent) * 100) / 100
        toast({
          title: "Split Deposits activated.",
          description: `Funds will be distributed: ${primarySplitPercent}% to ${primaryLabel}, ${secondaryPct}% to ${secondaryLabel}.`,
        })
      } else if (!splitEnabled && initial.splitEnabled) {
        const defaultMethodObj = methods.find((m) => m.id === primaryMethodId)
        const defaultLabel = defaultMethodObj
          ? formatMethodOptionLabel(defaultMethodObj)
          : "your default method"
        toast({
          title: "Split Deposits turned off.",
          description: `You turned off split Deposits. All deposits will go to your default method: ${defaultLabel}.`,
        })
      } else {
        toast({
          title: "Payout schedule updated",
          description: getScheduleLabel(),
        })
      }
    } catch {
      setFormError("Unable to save — please try again.")
    } finally {
      setSaving(false)
    }
  }

  const otherMethods = (excludeId: string) =>
    methods.filter((m) => m.id !== excludeId)

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[540px] max-h-[90vh] p-0 gap-0 flex flex-col">
          <DialogHeader className="px-6 pt-6 pb-4 shrink-0 relative">
            <DialogClose asChild>
              <IconButton
                size="sm"
                variant="ghost"
                visual="gray"
                className="absolute top-4 right-4"
              >
                <X className="size-4" />
              </IconButton>
            </DialogClose>
            <DialogTitle className="text-lg font-semibold text-dark-blue-400">
              Setup Your Direct Deposit Schedule
            </DialogTitle>
            {scheduleUpdatedAt && (
              <p className="text-sm text-gray-500">
                Last updated on{" "}
                {new Date(scheduleUpdatedAt).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </p>
            )}
          </DialogHeader>
          <div className="border-t border-gray-200 shrink-0" />

          {/* flex-1 min-h-0 (not max-h-*) gives this a real resolvable height inside
            the flex column. Percentage heights (`h-full`, the shared component's
            default Viewport sizing) don't reliably resolve on a nested child of a
            flex item across browsers, so the Viewport reported its natural content
            height instead of the container's — clipping content with no scrollbar.
            Making the Viewport itself `flex-1 min-h-0` propagates the same
            flex-grow-based (not percentage-based) sizing all the way down, which is
            what actually gives Radix a definite height to detect overflow against.
            Scoped via viewportClassName so the shared component (used in ~30+ other
            places) isn't touched. */}
          <ScrollArea
            type="always"
            className="flex-1 min-h-0 flex flex-col"
            viewportClassName="flex-1 min-h-0 [&>div]:!h-auto"
          >
            <div className="px-6 py-5 space-y-6">
              {loading ? (
                <div className="space-y-3">
                  {[...Array(4)].map((_, i) => (
                    <div
                      key={i}
                      className="h-10 bg-gray-100 rounded-lg animate-pulse"
                    />
                  ))}
                </div>
              ) : (
                <>
                  {/* ── Primary Method (US-22/23) — Figma keeps this section's
                    label as "Preferred Deposit Method" always; the split
                    config below is a second, separate section. ── */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-semibold text-dark-blue-400">
                        Preferred Deposit Method
                      </label>
                      <button
                        type="button"
                        className="text-xs font-medium text-primary-500 hover:text-primary-600 flex items-center gap-1 disabled:opacity-40 disabled:cursor-not-allowed"
                        disabled={!splitEnabled && methods.length < 2}
                        onClick={() => setSplitEnabled(true)}
                      >
                        Split Payout
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <HelpCircle className="size-3.5" />
                            </TooltipTrigger>
                            <TooltipContent>
                              {methods.length < 2 && !splitEnabled
                                ? "Add a second verified payout method to enable split payout"
                                : "Split earnings across two verified accounts"}
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </button>
                    </div>
                    <p className="text-xs text-gray-500">
                      Choose where your earnings should be deposited.
                    </p>

                    <Select
                      value={primaryMethodId}
                      onValueChange={setPrimaryMethodId}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select a payout method" />
                      </SelectTrigger>
                      <SelectContent>
                        {methods.map((m) => (
                          <SelectItem key={m.id} value={m.id}>
                            <span className="flex items-center gap-2">
                              <span className="shrink-0">
                                {renderScheduleMethodIcon(m)}
                              </span>
                              {formatMethodOptionLabel(m)}
                            </span>
                          </SelectItem>
                        ))}
                        <div className="border-t border-gray-100 mt-1 pt-1">
                          <button
                            type="button"
                            className="flex items-center gap-2 w-full px-2 py-2 text-sm font-semibold text-dark-blue-400 hover:bg-gray-50 rounded"
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => {
                              onOpenChange(false)
                              onAddNewMethod?.()
                            }}
                          >
                            <Plus className="size-4" /> Add New Deposit Method
                          </button>
                        </div>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* ── Split Payout (US-22/23) — separate section, only once
                    enabled. Both rows are full method pickers (Figma), not a
                    static primary + a secondary-only dropdown. ── */}
                  {splitEnabled && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-sm font-semibold text-dark-blue-400">
                          Preferred Payout Method
                        </label>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-medium text-gray-500">
                            Auto Split
                          </span>
                          <Switch
                            checked={autoSplit}
                            onCheckedChange={(c) => {
                              setAutoSplit(c as boolean)
                              if (c) setPrimarySplitPercent(50)
                            }}
                            size="sm"
                          />
                        </div>
                      </div>
                      <p className="text-xs text-gray-500">
                        Choose where your earnings should be deposited.
                      </p>

                      {/* Per-method rows (Figma): icon + method select + percent + remove.
                        Removing either side has the same effect — there's no backend
                        concept of a 2-method split with one side gone — so both route
                        through the existing disable-split confirm. */}
                      {(
                        [
                          {
                            id: primaryMethodId,
                            setId: setPrimaryMethodId,
                            options: otherMethods(secondaryMethodId),
                            pct: primarySplitPercent,
                            isPrimary: true,
                            placeholder: "Select a payout method",
                          },
                          {
                            id: secondaryMethodId,
                            setId: setSecondaryMethodId,
                            options: otherMethods(primaryMethodId),
                            pct:
                              Math.round((100 - primarySplitPercent) * 100) /
                              100,
                            isPrimary: false,
                            placeholder: "Select a secondary method",
                          },
                        ] as const
                      ).map((row, i) => {
                        return (
                          <div key={i} className="flex items-center gap-2">
                            <Select value={row.id} onValueChange={row.setId}>
                              <SelectTrigger className="flex-1 min-w-0">
                                <SelectValue placeholder={row.placeholder} />
                              </SelectTrigger>
                              <SelectContent>
                                {row.options.map((opt) => (
                                  <SelectItem key={opt.id} value={opt.id}>
                                    <span className="flex items-center gap-2">
                                      <span className="shrink-0">
                                        {renderScheduleMethodIcon(opt)}
                                      </span>
                                      {formatMethodOptionLabel(opt)}
                                    </span>
                                  </SelectItem>
                                ))}
                                <div className="border-t border-gray-100 mt-1 pt-1">
                                  <button
                                    type="button"
                                    className="flex items-center gap-2 w-full px-2 py-2 text-sm font-semibold text-dark-blue-400 hover:bg-gray-50 rounded"
                                    onMouseDown={(e) => e.preventDefault()}
                                    onClick={() => {
                                      onOpenChange(false)
                                      onAddNewMethod?.()
                                    }}
                                  >
                                    <Plus className="size-4" /> Add New Deposit
                                    Method
                                  </button>
                                </div>
                              </SelectContent>
                            </Select>
                            {/* Figma: percent + "%" sit inside the same bordered
                              box, centered together as a unit (e.g. "60%"),
                              not the input plus a separate label span. */}
                            <div className="relative w-16 h-11 shrink-0">
                              <Input
                                type="number"
                                min={0}
                                max={100}
                                className="w-full h-full text-center pl-2 pr-5 text-base"
                                disabled={!row.isPrimary}
                                value={row.pct}
                                // AC-23.03/23.04: accept the raw value (including 0/100) so the
                                // inline error below can actually be seen — clamping silently
                                // would make those values impossible to type in the first place.
                                onChange={(e) =>
                                  setPrimarySplitPercent(
                                    Math.min(
                                      100,
                                      Math.max(0, parseInt(e.target.value) || 0)
                                    )
                                  )
                                }
                              />
                              <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-base text-gray-400 pointer-events-none">
                                %
                              </span>
                            </div>
                            <IconButton
                              size="sm"
                              variant="outlined"
                              visual="gray"
                              className="rounded-full hover:border-error-300 hover:bg-error-50 hover:text-error-500"
                              onClick={() => {
                                if (initial.splitEnabled) {
                                  setConfirmDisableSplit(true)
                                } else {
                                  setSplitEnabled(false)
                                }
                              }}
                            >
                              <Trash01 className="size-4" />
                            </IconButton>
                          </div>
                        )
                      })}
                      {(primarySplitPercent <= 0 ||
                        primarySplitPercent >= 100) && (
                        <p className="text-xs text-red-500">
                          Each method must receive between 1% and 99% — 0% or
                          100% is not a valid split.
                        </p>
                      )}
                    </div>
                  )}

                  {/* ── Deposit Schedule (US-24) ── */}
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-dark-blue-400">
                      Set your Deposit Schedule
                    </label>
                    <p className="text-xs text-gray-500">
                      Deposits run on your schedule when minimum balance is met.
                    </p>

                    <Select
                      value={frequency}
                      onValueChange={(v) => {
                        if (v === "custom") {
                          // Figma: "Set Custom Schedule" opens its own modal rather
                          // than expanding inline — snapshot the current custom
                          // fields so Cancel inside that modal can restore them.
                          setCustomDraftSnapshot({
                            scheduleStartDate,
                            scheduleEndDate,
                            stopDepositsEnabled,
                            customIntervalUnit,
                            customIntervalCount,
                            dayOfWeek,
                          })
                          setCustomModalOpen(true)
                          return
                        }
                        setFrequency(v)
                      }}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue>{getScheduleLabel()}</SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="weekly">
                          Weekly (every {selectedDayFull})
                        </SelectItem>
                        <SelectItem value="bi_weekly">
                          Bi-Weekly (every other {selectedDayFull})
                        </SelectItem>
                        <SelectItem value="monthly">
                          Monthly (on the {dayOfMonth})
                        </SelectItem>
                        <SelectItem value="daily" disabled={dailyDisabled}>
                          Daily (every day)
                        </SelectItem>
                        <SelectItem value="custom">
                          Set Custom Schedule
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    {dailyDisabled && (
                      <p className="text-xs text-gray-500">
                        Daily payouts are only available for bank transfer
                        methods.
                      </p>
                    )}
                  </div>

                  {/* ── Select Deposit Day ── (custom schedules pick their day
                    inside the "Set Custom Schedule" modal instead) */}
                  {(frequency === "weekly" || frequency === "bi_weekly") && (
                    <div className="space-y-2">
                      <Label
                        size="sm"
                        className="font-semibold text-dark-blue-400"
                      >
                        Select Deposit Day
                      </Label>
                      <ToggleGroupRoot
                        className="!bg-transparent !border-0 !p-0 gap-2"
                        value={[String(dayOfWeek)]}
                        onValueChange={(details) => {
                          if (details.value.length > 0)
                            setDayOfWeek(parseInt(details.value[0]))
                        }}
                      >
                        {DAYS_OF_WEEK.map((day, idx) => (
                          <ToggleGroupItem
                            key={day.key}
                            value={String(idx)}
                            className={cn(
                              "size-9 rounded-full text-sm font-medium transition-colors flex items-center justify-center border shrink-0 p-0",
                              dayOfWeek === idx
                                ? "border-primary-500 text-primary-600 bg-white shadow-none data-[state=on]:bg-white"
                                : "border-gray-200 text-gray-600 hover:border-primary-300 hover:text-primary-500 bg-white shadow-none"
                            )}
                          >
                            {day.label}
                          </ToggleGroupItem>
                        ))}
                      </ToggleGroupRoot>
                    </div>
                  )}

                  {frequency === "monthly" && (
                    <div>
                      <label className="text-sm font-semibold text-dark-blue-400 mb-1 block">
                        Day of month
                      </label>
                      <Select
                        value={String(dayOfMonth)}
                        onValueChange={(v) => setDayOfMonth(parseInt(v))}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        {/* 28 items is tall enough that, without collision padding,
                          Radix's collision avoidance flips it to hug the very top
                          of the viewport (0px margin) instead of leaving a gap —
                          reads as the list being "cut off". */}
                        <SelectContent collisionPadding={16}>
                          {/* Capped at 28 to avoid non-existent dates in shorter months */}
                          {Array.from({ length: 28 }, (_, i) => i + 1).map(
                            (d) => (
                              <SelectItem key={d} value={String(d)}>
                                {d}
                              </SelectItem>
                            )
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {/* AC-25.03: server-computed next run date, never calculated client-side.
                    timeZone: "UTC" is required here too — nextRunAt is a UTC-midnight
                    calendar date, and formatting it in the viewer's local zone shifts
                    the displayed weekday/date back a day for anyone west of UTC. */}
                  {nextRunAt && (
                    <div className="rounded-lg border border-primary-200 bg-primary-50 px-4 py-3 flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                      <span className="text-sm font-medium text-primary-600">
                        Next Deposit (based on your schedule)
                      </span>
                      <span className="text-sm font-bold text-primary-600">
                        {new Date(nextRunAt).toLocaleDateString("en-US", {
                          weekday: "long",
                          month: "long",
                          day: "numeric",
                          year: "numeric",
                          timeZone: "UTC",
                        })}
                      </span>
                    </div>
                  )}

                  {/* ── Pause / Resume (US-26) ── */}
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-sm font-semibold text-dark-blue-400">
                        Schedule Active
                      </label>
                      <p className="text-xs text-gray-500 mt-0.5">
                        Pause to stop automatic payouts without losing your
                        configuration.
                      </p>
                    </div>
                    <Switch
                      checked={isActive}
                      onCheckedChange={(c) => setIsActive(c as boolean)}
                      size="sm"
                    />
                  </div>

                  {/* ── Minimum Payout (US-33) ── */}
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-dark-blue-400">
                      Minimum Payout
                    </label>
                    <p className="text-xs text-gray-500">
                      Scheduled deposits are made only if your balance meets
                      this amount at run time. Platform minimum is $50.
                    </p>
                    <Select
                      value={thresholdUsd}
                      onValueChange={setThresholdUsd}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue>${thresholdUsd} or more</SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {THRESHOLD_PRESETS.map((amt) => (
                          <SelectItem key={amt} value={String(amt)}>
                            ${amt} or more
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* ── Reserve Balance ── Figma: preset amount buttons + Custom,
                    gated behind an on/off toggle. schedule.service.ts enforces
                    0 <= reserveUsd <= 250 regardless of which button set it. */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <label className="text-sm font-semibold text-dark-blue-400">
                          Reserve Balance{" "}
                          <span className="font-normal text-gray-400">
                            (optional)
                          </span>
                        </label>
                        <p className="text-xs text-gray-500 mt-0.5">
                          Keep up to $250 in your account after each payout to
                          automatically cover subscription or platform fees
                          without disruption.
                        </p>
                      </div>
                      <Switch
                        checked={Number(reserveUsd) > 0}
                        onCheckedChange={(c) => {
                          if (c) {
                            setReserveUsd(String(RESERVE_PRESETS[0]))
                          } else {
                            setReserveUsd("0")
                            setReserveCustomOpen(false)
                            setReserveCustomValue("")
                          }
                        }}
                        size="sm"
                      />
                    </div>
                    {Number(reserveUsd) > 0 && (
                      <div className="space-y-2">
                        <div className="grid grid-cols-3 gap-2">
                          {RESERVE_PRESETS.map((amt) => (
                            <button
                              key={amt}
                              type="button"
                              className={cn(
                                "rounded-lg border px-3 py-2 text-sm font-medium text-center",
                                !reserveCustomOpen && Number(reserveUsd) === amt
                                  ? "border-primary-500 text-primary-600 bg-primary-25"
                                  : "border-gray-200 text-dark-blue-400 hover:border-primary-300"
                              )}
                              onClick={() => {
                                setReserveUsd(String(amt))
                                setReserveCustomOpen(false)
                                setReserveCustomValue("")
                              }}
                            >
                              Reserve ${amt}
                            </button>
                          ))}
                          <button
                            type="button"
                            className={cn(
                              "rounded-lg border px-3 py-2 text-sm font-medium text-center",
                              reserveCustomOpen
                                ? "border-primary-500 text-primary-600 bg-primary-25"
                                : "border-gray-200 text-dark-blue-400 hover:border-primary-300"
                            )}
                            onClick={() => {
                              setReserveCustomOpen(true)
                              setReserveCustomValue(
                                RESERVE_PRESETS.includes(Number(reserveUsd))
                                  ? ""
                                  : reserveUsd
                              )
                            }}
                          >
                            Custom
                          </button>
                        </div>
                        {reserveCustomOpen && (
                          <div className="flex items-center gap-2">
                            <div className="relative flex-1">
                              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">
                                $
                              </span>
                              <Input
                                type="number"
                                min={1}
                                max={250}
                                placeholder="Enter custom amount"
                                className="pl-6"
                                value={reserveCustomValue}
                                onChange={(e) => {
                                  const v = e.target.value
                                  if (v === "") {
                                    setReserveCustomValue("")
                                    return
                                  }
                                  const n = parseInt(v)
                                  if (isNaN(n)) return
                                  // Backend caps reserveUsd at $250 inclusive
                                  // (schedule.service.ts: reserve > 250 →
                                  // ERR_SCHEDULE_RESERVE_EXCEEDS_MAX). Clamp
                                  // the displayed value too, not just what
                                  // gets submitted — otherwise the box can
                                  // show e.g. "500" while $250 is silently
                                  // saved instead.
                                  const clamped = String(
                                    Math.max(0, Math.min(250, n))
                                  )
                                  setReserveCustomValue(clamped)
                                  setReserveUsd(clamped)
                                }}
                              />
                            </div>
                            <button
                              type="button"
                              className="text-sm text-gray-500 hover:text-gray-700"
                              onClick={() => {
                                setReserveCustomOpen(false)
                                setReserveCustomValue("")
                                setReserveUsd(String(RESERVE_PRESETS[0]))
                              }}
                            >
                              Cancel
                            </button>
                          </div>
                        )}
                        {reserveCustomOpen && (
                          <p className="text-xs text-gray-400">
                            Custom amount can be up to $250.
                          </p>
                        )}
                      </div>
                    )}
                  </div>

                  {/* ── Authorization ── */}
                  <div className="flex gap-3 items-start">
                    <Checkbox
                      checked={authorized}
                      onCheckedChange={(checked) =>
                        setAuthorized(checked as boolean)
                      }
                      className="mt-0.5"
                    />
                    <div className="text-xs text-gray-600 leading-relaxed">
                      <p className="font-semibold text-dark-blue-400">
                        I authorize Marketeq to deposit my earnings into the
                        account(s) listed above.
                      </p>
                      <p className="mt-1 text-gray-500">
                        I understand that any changes to my payout preferences
                        may take up to 3 business days to process. I certify
                        that I am an authorized user of the account(s) provided
                        and that all information entered is accurate.
                      </p>
                    </div>
                  </div>

                  {formError && (
                    <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                      {formError}
                    </div>
                  )}
                </>
              )}
            </div>
          </ScrollArea>

          {/* ── Footer ── */}
          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 shrink-0">
            <DialogClose asChild>
              <Button variant="outlined" visual="gray">
                Cancel
              </Button>
            </DialogClose>
            <Button
              disabled={
                !authorized ||
                saving ||
                loading ||
                methods.length === 0 ||
                (splitEnabled &&
                  (primarySplitPercent <= 0 || primarySplitPercent >= 100)) ||
                (frequency === "custom" &&
                  stopDepositsEnabled &&
                  !!scheduleStartDate &&
                  !!scheduleEndDate &&
                  scheduleEndDate <= scheduleStartDate)
              }
              onClick={handleSave}
            >
              {saving ? "Saving…" : "Save"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* SCR-14: confirm before disabling an already-saved split configuration.
        This must be a real nested Dialog (Radix Portal), not a hand-rolled fixed
        div — a plain fixed/z-[60] div here rendered inside the same component tree
        as the parent PayoutScheduleDialog, which is itself Portal-rendered to the
        end of <body>. Whatever ancestor wrapper this component mounts under traps
        the plain div in a lower stacking context, so its z-index never actually
        wins against the parent Dialog's Portal-rendered overlay — clicks landed on
        the (invisible-but-still-on-top) split-config panel behind it instead of
        the button, which is exactly the "Disable Split button not working" bug. */}
      <Dialog open={confirmDisableSplit} onOpenChange={setConfirmDisableSplit}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold text-dark-blue-400">
              Disable Split Payout?
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-500">
            All future payouts will go entirely to your primary method instead
            of being split.
          </p>
          <div className="flex gap-2 mt-2">
            <Button
              variant="outlined"
              visual="gray"
              size="sm"
              className="flex-1"
              onClick={() => setConfirmDisableSplit(false)}
            >
              Cancel
            </Button>
            <Button
              variant="filled"
              visual="error"
              size="sm"
              className="flex-1"
              onClick={() => {
                setSplitEnabled(false)
                setConfirmDisableSplit(false)
              }}
            >
              Disable Split
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* "Set Custom Schedule" — its own popup (Figma), not an inline expansion
        of the main dialog. Same nested-Dialog-must-be-a-real-Portal reasoning
        as confirmDisableSplit above. */}
      <Dialog
        open={customModalOpen}
        onOpenChange={(o) => {
          if (!o && customDraftSnapshot) {
            // Closed via the overlay/Esc, not the explicit Cancel button below —
            // treat it the same as Cancel so a stray click can't silently keep edits.
            setScheduleStartDate(customDraftSnapshot.scheduleStartDate)
            setScheduleEndDate(customDraftSnapshot.scheduleEndDate)
            setStopDepositsEnabled(customDraftSnapshot.stopDepositsEnabled)
            setCustomIntervalUnit(customDraftSnapshot.customIntervalUnit)
            setCustomIntervalCount(customDraftSnapshot.customIntervalCount)
            setDayOfWeek(customDraftSnapshot.dayOfWeek)
          }
          setCustomModalOpen(o)
        }}
      >
        <DialogContent className="sm:max-w-md p-0 gap-0">
          <DialogHeader className="relative px-6 pt-6 pb-4">
            <DialogClose asChild>
              <IconButton
                size="sm"
                variant="ghost"
                visual="gray"
                className="absolute top-4 right-4"
              >
                <X className="size-4" />
              </IconButton>
            </DialogClose>
            <DialogTitle className="text-lg font-semibold text-dark-blue-400">
              Set Custom Deposit Schedule
            </DialogTitle>
          </DialogHeader>
          <div className="border-t border-gray-200" />
          <div className="px-6 py-6 space-y-6">
            <div>
              <label className="text-sm font-semibold text-dark-blue-400 mb-1 block">
                Start Deposits On
              </label>
              <DatePicker
                value={
                  scheduleStartDate
                    ? new Date(`${scheduleStartDate}T00:00:00`)
                    : undefined
                }
                onValueChange={(d) =>
                  setScheduleStartDate(formatDate(d, "yyyy-MM-dd"))
                }
                placeholder="Select Date"
                inputClassName="w-full justify-between"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <NumberInput
                  header={(props) => (
                    <label
                      {...props}
                      className="text-sm font-semibold text-dark-blue-400 mb-1 block"
                    >
                      Repeat Every
                    </label>
                  )}
                  min={1}
                  max={
                    customIntervalUnit === "days"
                      ? 365
                      : customIntervalUnit === "weeks"
                        ? 52
                        : 12
                  }
                  value={customIntervalCount}
                  onValueChange={(v) =>
                    setCustomIntervalCount(Math.max(1, Number.isNaN(v) ? 1 : v))
                  }
                />
              </div>
              <div>
                <label className="text-sm font-semibold text-dark-blue-400 mb-1 block">
                  &nbsp;
                </label>
                <Select
                  value={customIntervalUnit}
                  onValueChange={(v) =>
                    setCustomIntervalUnit(v as "days" | "weeks" | "months")
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="days">Days</SelectItem>
                    <SelectItem value="weeks">Weeks</SelectItem>
                    <SelectItem value="months">Months</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label size="sm" className="font-semibold text-dark-blue-400">
                Select Deposit Day
              </Label>
              <ToggleGroupRoot
                className="!bg-transparent !border-0 !p-0 gap-2"
                value={[String(dayOfWeek)]}
                onValueChange={(details) => {
                  if (details.value.length > 0)
                    setDayOfWeek(parseInt(details.value[0]))
                }}
              >
                {DAYS_OF_WEEK.map((day, idx) => (
                  <ToggleGroupItem
                    key={day.key}
                    value={String(idx)}
                    className={cn(
                      "size-9 rounded-full text-sm font-medium transition-colors flex items-center justify-center border shrink-0 p-0",
                      dayOfWeek === idx
                        ? "border-primary-500 text-primary-600 bg-white shadow-none data-[state=on]:bg-white"
                        : "border-gray-200 text-gray-600 hover:border-primary-300 hover:text-primary-500 bg-white shadow-none"
                    )}
                  >
                    {day.label}
                  </ToggleGroupItem>
                ))}
              </ToggleGroupRoot>
            </div>

            {/* US-72: optional window — e.g. pause payouts during a planned
              absence without disabling the schedule outright. */}
            <div className="flex items-center justify-between gap-4">
              <div>
                <label className="text-sm font-semibold text-dark-blue-400">
                  Stop Deposits On{" "}
                  <span className="font-normal text-gray-400">(optional)</span>
                </label>
                <p className="text-xs text-gray-500 mt-0.5">
                  Select a date when you want deposits to stop.
                </p>
              </div>
              <Switch
                checked={stopDepositsEnabled}
                onCheckedChange={(c) => setStopDepositsEnabled(c as boolean)}
                size="sm"
              />
            </div>
            {stopDepositsEnabled && (
              <DatePicker
                value={
                  scheduleEndDate
                    ? new Date(`${scheduleEndDate}T00:00:00`)
                    : undefined
                }
                onValueChange={(d) =>
                  setScheduleEndDate(formatDate(d, "yyyy-MM-dd"))
                }
                placeholder="Select Date"
                inputClassName="w-full justify-between"
              />
            )}
            {stopDepositsEnabled &&
              scheduleStartDate &&
              scheduleEndDate &&
              scheduleEndDate <= scheduleStartDate && (
                <p className="text-xs text-red-500">
                  Stop date must be after the start date.
                </p>
              )}
          </div>
          <div className="border-t border-gray-200" />
          <div className="flex justify-end gap-2 px-6 py-4">
            <Button
              variant="outlined"
              visual="gray"
              size="sm"
              onClick={() => {
                if (customDraftSnapshot) {
                  setScheduleStartDate(customDraftSnapshot.scheduleStartDate)
                  setScheduleEndDate(customDraftSnapshot.scheduleEndDate)
                  setStopDepositsEnabled(
                    customDraftSnapshot.stopDepositsEnabled
                  )
                  setCustomIntervalUnit(customDraftSnapshot.customIntervalUnit)
                  setCustomIntervalCount(
                    customDraftSnapshot.customIntervalCount
                  )
                  setDayOfWeek(customDraftSnapshot.dayOfWeek)
                }
                setCustomModalOpen(false)
              }}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={
                stopDepositsEnabled &&
                !!scheduleStartDate &&
                !!scheduleEndDate &&
                scheduleEndDate <= scheduleStartDate
              }
              onClick={() => {
                setFrequency("custom")
                setCustomModalOpen(false)
              }}
            >
              Save
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

// Recent Activity — payout-service has no dedicated activity-feed endpoint, so this
// derives real entries from the payout history list (GET /v1/payouts) rather than
// showing fabricated data. Each payout request's current status becomes one entry.
function toActivityItem(p: {
  id: string
  status: string
  amountUsd: string
  methodLabel: string | null
  createdAt: string
  settledAt: string | null
}) {
  const time = formatDistanceToNowStrict(new Date(p.settledAt ?? p.createdAt), {
    addSuffix: true,
  })
  const method = p.methodLabel ?? "your payout method"
  const amount = parseFloat(p.amountUsd).toFixed(2)
  switch (p.status) {
    case "completed":
      return {
        id: p.id,
        title: "Payout Completed",
        description: `$${amount} to ${method}`,
        time,
        kind: "sent" as const,
      }
    case "processing":
      return {
        id: p.id,
        title: "Payout Processing",
        description: `$${amount} to ${method}`,
        time,
        kind: "processing" as const,
      }
    case "queued":
      return {
        id: p.id,
        title: "Payout Queued",
        description: `$${amount} to ${method}`,
        time,
        kind: "processing" as const,
      }
    case "failed":
      return {
        id: p.id,
        title: "Payout Failed",
        description: `$${amount} to ${method}`,
        time,
        kind: "failed" as const,
      }
    case "cancelled":
      return {
        id: p.id,
        title: "Payout Cancelled",
        description: `$${amount} to ${method}`,
        time,
        kind: "cancelled" as const,
      }
    default:
      return {
        id: p.id,
        title: "Payout Scheduled",
        description: `$${amount} to ${method}`,
        time,
        kind: "scheduled" as const,
      }
  }
}

// Figma's "Payout Scheduled" icon is a composite — a plain calendar with a
// separate circular checkmark badge overlapping its bottom-right corner, not
// a single-path icon. @blend-metrics/icons only has CalendarCheck01/02,
// which draw the checkmark inline inside the calendar body — visually
// different. Built from the library's own Calendar + CheckCircle instead of
// hand-drawing new paths.
const ScheduledIcon = ({ className }: { className?: string }) => (
  <div className={cn("relative shrink-0", className)}>
    <Calendar className="w-full h-full" />
    <span className="absolute -bottom-0.5 -right-0.5 rounded-full bg-white">
      <CheckCircle className="size-2.5" />
    </span>
  </div>
)

const ACTIVITY_ICON: Record<string, { icon: React.ReactNode }> = {
  // Figma "Recent Activity": bordered square chip (no fill), outline icon —
  // calendar-check for scheduled, banknote for a completed/sent payout,
  // clock for still-processing, circle-x for a definite failure, slash-circle
  // for a cancellation (distinct from failed). Color still carries status
  // meaning (red = failed, gray = neutral/pending) — only the chip shape and
  // fill changed to match Figma, not the semantic color-coding.
  scheduled: { icon: <ScheduledIcon className="size-5 text-primary-500" /> },
  sent: { icon: <BankNote02 className="size-5 text-primary-500" /> },
  // Figma's own "Deposit Initiated" reference uses this exact clock icon in blue.
  processing: { icon: <Clock className="size-5 text-primary-500" /> },
  failed: { icon: <XCircle className="size-5 text-error-500" /> },
  cancelled: { icon: <SlashCircle01 className="size-5 text-gray-400" /> },
}

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

// US-28 / Storybook pagination: numbered pages with ellipsis; prev hidden on
// first page, next hidden on last; active page is bordered (not filled).
function getPaginationItems(
  current: number,
  total: number
): (number | "ellipsis")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)

  // Storybook pattern: first 3 + last 3 with ellipsis, plus current ±1 when mid-range.
  const pages = new Set<number>([1, 2, 3, total - 2, total - 1, total, current])
  if (current - 1 >= 1) pages.add(current - 1)
  if (current + 1 <= total) pages.add(current + 1)

  const sorted = [...pages].filter((p) => p >= 1 && p <= total).sort((a, b) => a - b)
  const items: (number | "ellipsis")[] = []
  for (let i = 0; i < sorted.length; i++) {
    if (i > 0 && sorted[i] - sorted[i - 1] > 1) items.push("ellipsis")
    items.push(sorted[i])
  }
  return items
}

function TablePagination({
  currentPage,
  totalPages,
  onPageChange,
}: {
  currentPage: number
  totalPages: number
  onPageChange: (page: number) => void
}) {
  if (totalPages <= 1) return null

  return (
    <nav className="flex items-center gap-0.5" aria-label="Pagination">
      {currentPage > 1 && (
        <button
          type="button"
          aria-label="Previous page"
          className="size-10 mr-0.5 rounded-full border border-gray-300 text-gray-500 hover:border-gray-400 hover:text-gray-700 inline-flex items-center justify-center transition-colors"
          onClick={() => onPageChange(currentPage - 1)}
        >
          <ChevronLeft className="size-5" />
        </button>
      )}
      {getPaginationItems(currentPage, totalPages).map((item, i) =>
        item === "ellipsis" ? (
          <span
            key={`e-${i}`}
            className="size-10 inline-flex items-center justify-center text-sm font-medium text-gray-500"
          >
            …
          </span>
        ) : (
          <button
            key={item}
            type="button"
            aria-label={`Page ${item}`}
            aria-current={item === currentPage ? "page" : undefined}
            className={cn(
              "size-10 rounded-md text-sm font-medium inline-flex items-center justify-center transition-colors",
              item === currentPage
                ? "border border-gray-300 bg-white text-gray-800"
                : "text-gray-500 hover:bg-gray-50"
            )}
            onClick={() => onPageChange(item)}
          >
            {item}
          </button>
        )
      )}
      {currentPage < totalPages && (
        <button
          type="button"
          aria-label="Next page"
          className="size-10 ml-0.5 rounded-full border border-gray-300 text-gray-500 hover:border-gray-400 hover:text-gray-700 inline-flex items-center justify-center transition-colors"
          onClick={() => onPageChange(currentPage + 1)}
        >
          <ChevronRight className="size-5" />
        </button>
      )}
    </nav>
  )
}

// US-23: chip labels must match the date-range picker copy verbatim.
const EARNINGS_DATE_RANGE_LABELS: Record<string, string> = {
  all_time: "All Time",
  today: "Today",
  yesterday: "Yesterday",
  this_week: "This Week",
  last_week: "Last Week",
  this_month: "This Month",
  last_month: "Last Month",
  this_year: "This Year",
  last_year: "Last Year",
  custom: "Custom range",
}

const DATE_PRESET_TO_API: Record<string, string> = {
  "all time": "all_time",
  today: "today",
  yesterday: "yesterday",
  "this week": "this_week",
  "last week": "last_week",
  "this month": "this_month",
  "last month": "last_month",
  "this year": "this_year",
  "last year": "last_year",
  "custom range": "custom",
}

const DATE_API_TO_PRESET: Record<string, string> = {
  all_time: "all time",
  today: "today",
  yesterday: "yesterday",
  this_week: "this week",
  last_week: "last week",
  this_month: "this month",
  last_month: "last month",
  this_year: "this year",
  last_year: "last year",
  custom: "custom range",
}

// Read-only design system rule (CLAUDE.md): components/ui/calendar/calendar.tsx
// is Storybook source, never edited. DualCalendar's own Sidebar preset buttons
// only scroll the visible month (no "select this preset's actual date range"
// behavior) — so the preset list and the "Custom range" option live here
// instead, composed from DualCalendar's own onCancel/onApply/value props
// (all present, unmodified, in the exported component) rather than by adding
// new props to the read-only file. Non-custom presets commit immediately
// (see DateRangeFilterPopoverContent) so DualCalendar never needs a
// preset-derived starting range.

const DATE_PRESET_RADIO_ITEMS = [
  "today", "yesterday", "this week", "last week", "this month",
  "last month", "this year", "last year", "all time", "custom range",
]

function DateRangeSidebar({
  preset,
  onPresetChange,
}: {
  preset: string
  onPresetChange: (preset: string) => void
}) {
  return (
    <RadioGroup
      value={preset}
      onValueChange={onPresetChange}
      className="flex flex-col items-start gap-1 w-[192px] py-3 px-4 border-r border-gray-200"
    >
      {DATE_PRESET_RADIO_ITEMS.map((item) => (
        // Figma "_Date picker list item": plain text row, no visible radio
        // circle — @/components/ui's styled RadioGroupItem always discards
        // its children (renders only a bare indicator dot), so this uses the
        // unstyled HeadlessRadioGroupItem primitive instead, styled to match
        // the spec directly (10px/16px padding, 14px medium, #F9FAFB when
        // checked).
        <HeadlessRadioGroupItem
          key={item}
          value={item}
          className="w-full text-left rounded-md flex items-center h-10 py-2.5 px-4 text-sm font-medium text-gray-700 capitalize data-[state=checked]:bg-gray-50 hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-100"
        >
          {item}
        </HeadlessRadioGroupItem>
      ))}
    </RadioGroup>
  )
}

// Composed entirely from DualCalendar's own existing, unmodified props
// (value/onCancel/onApply). Non-custom presets commit immediately without
// ever touching DualCalendar, so it only mounts for "custom range" — and
// stays mounted for the life of the popover (no key-forced remount). An
// earlier version remounted DualCalendar on every preset click via
// key={preset}, which raced Radix RadioGroup's roving-focus management on
// the sidebar underneath it and caused a "Maximum update depth exceeded"
// loop.
function DateRangeFilterPopoverContent({
  dateRange,
  dateFrom,
  dateTo,
  defaultPreset,
  onCommit,
  onCancel,
}: {
  dateRange: string
  dateFrom: string
  dateTo: string
  defaultPreset: string
  onCommit: (apiDateRange: string, from: string, to: string) => void
  onCancel: () => void
}) {
  const initialPreset = DATE_API_TO_PRESET[dateRange] ?? defaultPreset
  const [preset, setPreset] = React.useState(initialPreset)

  const handlePresetChange = React.useCallback((next: string) => {
    setPreset(next)
    if (next === "custom range") return
    onCommit(DATE_PRESET_TO_API[next] ?? "all_time", "", "")
  }, [onCommit])

  // DualCalendar re-renders on its own internal state (e.g. every date
  // click), which re-invokes the left() render-prop below. Memoizing the
  // sidebar element keeps that a no-op reconciliation instead of handing
  // Radix's RadioGroup a brand-new element/child tree on every keystroke —
  // the latter was the actual cause of the "Maximum update depth exceeded"
  // crash (Radix's roving-focus bookkeeping re-firing in a loop).
  const sidebar = React.useMemo(
    () => <DateRangeSidebar preset={preset} onPresetChange={handlePresetChange} />,
    [preset, handlePresetChange]
  )

  if (preset !== "custom range") {
    return (
      <div className="bg-white rounded-lg border border-gray-200 shadow-xl">
        {sidebar}
      </div>
    )
  }

  return (
    <DualCalendar
      value={
        dateFrom && dateTo
          ? { start: parseISO(dateFrom), end: parseISO(dateTo) }
          : undefined
      }
      onCancel={onCancel}
      onApply={(applied) => {
        if (!applied) return
        onCommit("custom", formatDate(applied.start, "yyyy-MM-dd"), formatDate(applied.end, "yyyy-MM-dd"))
      }}
      left={() => sidebar}
    />
  )
}

export interface EarningsFilters {
  dateRange: string
  startDate?: string
  endDate?: string
  entryType: string
  statusFilter: string
  search: string
  projectId: string
  clientId: string
}

const FILTER_CHIP_CLASS =
  "h-9 gap-x-2 bg-white text-sm font-medium text-gray-800 hover:bg-white"

const FILTER_SELECT_CHIP_CLASS =
  "h-9 w-auto bg-white px-3.5 py-0 text-sm font-medium text-gray-800 data-[placeholder]:text-gray-800 [&>span]:text-sm [&>span]:font-medium [&>span]:text-gray-800 [&>svg]:size-4 [&>svg]:text-gray-800"

function toAtHandle(value?: string | null) {
  if (!value) return ""
  const trimmed = value.trim()
  if (!trimmed) return ""
  if (trimmed.startsWith("@")) return trimmed
  return "@" + trimmed.toLowerCase().replace(/[^a-z0-9]+/g, "")
}

function FilterSearchMenu({
  label,
  searchPlaceholder,
  value,
  onValueChange,
  items,
  layout = "stacked",
}: {
  label: string
  searchPlaceholder: string
  value: string
  onValueChange: (id: string) => void
  items: {
    id: string
    title: string
    handle?: string | null
    avatarUrl?: string | null
    icon?: React.ReactNode
  }[]
  layout?: "stacked" | "inline"
}) {
  const [open, setOpen] = React.useState(false)
  const [query, setQuery] = React.useState("")
  const inputRef = React.useRef<HTMLInputElement>(null)
  const selected = items.find((item) => item.id === value)
  const q = query.trim().toLowerCase()
  const filtered =
    q === ""
      ? items
      : items.filter((item) => {
          const extra = item.handle ?? ""
          return (
            item.title.toLowerCase().includes(q) ||
            extra.toLowerCase().includes(q)
          )
        })

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (!next) setQuery("")
      }}
    >
      <PopoverTrigger asChild>
        <Button
          variant="outlined"
          visual="gray"
          size="sm"
          className={FILTER_CHIP_CLASS}
        >
          {selected?.title ?? label}
          <ChevronDown className="size-4 text-gray-800" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        onOpenAutoFocus={(e) => {
          e.preventDefault()
          inputRef.current?.focus()
        }}
        className="z-[80] w-[300px] overflow-hidden rounded-xl border border-gray-200 bg-white p-0 shadow-[0px_12px_16px_-4px_rgba(16,24,40,.08)]"
      >
        <div className="flex items-center gap-2 border-b border-gray-200 px-3.5 py-2.5">
          <Search className="size-4 shrink-0 text-gray-400" />
          <input
            ref={inputRef}
            className="m-0 h-5 w-full border-none bg-transparent p-0 text-sm text-gray-900 shadow-none outline-none ring-0 placeholder:text-gray-400 focus:border-transparent focus:outline-none focus:ring-0 focus:shadow-none"
            placeholder={searchPlaceholder}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <ScrollArea viewportClassName="max-h-[280px]">
          <div className="py-1">
            {filtered.length === 0 ? (
              <p className="px-3 py-4 text-sm text-gray-400">No matches</p>
            ) : (
              filtered.map((item) => {
                const subtitle =
                  layout === "inline"
                    ? (item.handle ?? "")
                    : toAtHandle(item.handle) || toAtHandle(item.title)
                return (
                  <button
                    key={item.id}
                    type="button"
                    className={cn(
                      "flex w-full items-center gap-3 px-3.5 py-2 text-left hover:bg-gray-50",
                      item.id === value && "bg-gray-50"
                    )}
                    onClick={() => {
                      onValueChange(item.id === value ? "" : item.id)
                      setOpen(false)
                    }}
                  >
                    {item.icon ? (
                      item.icon
                    ) : item.avatarUrl ? (
                      <Avatar className="size-8 shrink-0">
                        <AvatarImage src={item.avatarUrl} alt={item.title} />
                        <AvatarFallback className="bg-transparent p-0">
                          <FilterEntityAvatar />
                        </AvatarFallback>
                      </Avatar>
                    ) : (
                      <FilterEntityAvatar />
                    )}
                    {layout === "inline" ? (
                      <span className="min-w-0 truncate text-sm">
                        <span className="font-medium text-gray-800">
                          {item.title}
                        </span>
                        {subtitle ? (
                          <span className="font-normal text-gray-500">
                            {" "}
                            {subtitle}
                          </span>
                        ) : null}
                      </span>
                    ) : (
                      <span className="min-w-0 leading-[1.2]">
                        <span className="block truncate text-sm font-semibold text-gray-900">
                          {item.title}
                        </span>
                        {subtitle ? (
                          <span className="block truncate text-xs font-normal text-gray-400">
                            {subtitle}
                          </span>
                        ) : null}
                      </span>
                    )}
                  </button>
                )
              })
            )}
          </div>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  )
}

export const EarningsTab = ({
  onFiltersChange,
}: { onFiltersChange?: (filters: EarningsFilters) => void } = {}) => {
  const [viewMode, setViewMode] = useState("daily")
  const [searchQuery, setSearchQuery] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const [earningsSummary, setEarningsSummary] =
    React.useState<EarningsSummary | null>(null)
  // Doc07/08 "Error ≠ Empty": a fetch failure must render a distinct ERROR state
  // with Retry, not just leave the UI stuck on its loading copy indefinitely — that
  // was the bug here: catch(console.error) never set anything the UI could branch on.
  const [earningsSummaryError, setEarningsSummaryError] = React.useState(false)
  const [earningsResult, setEarningsResult] =
    React.useState<EarningsListResponse | null>(null)
  const [earningsLoading, setEarningsLoading] = React.useState(true)
  const [earningsError, setEarningsError] = React.useState(false)
  // US-24.02 QA spec: default/reset date range is "this_month", not "all_time".
  const [dateRange, setDateRange] = React.useState("this_month")
  const [dateFrom, setDateFrom] = React.useState("")
  const [dateTo, setDateTo] = React.useState("")
  const [datePickerOpen, setDatePickerOpen] = React.useState(false)
  const [entryType, setEntryType] = React.useState("")
  const [statusFilter, setStatusFilter] = React.useState("")
  const [projectId, setProjectId] = React.useState("")
  const [clientId, setClientId] = React.useState("")
  const [dateSortOrder, setDateSortOrder] = React.useState<"asc" | "desc">(
    "desc"
  )
  // Figma "All Projects"/"All Clients" — options fetched from
  // GET /earnings/filters (see the useEffect below), covering the
  // contractor's full contract history.
  const [projectOptions, setProjectOptions] = React.useState<
    { id: string; name: string; handle?: string | null }[]
  >([])
  const [clientOptions, setClientOptions] = React.useState<
    { id: string; label: string; handle?: string | null }[]
  >([])

  // US-30 (F-05 Entry Detail Drawer), opened from history rows here too — a
  // second, self-contained instance mirroring OverviewTab's, since the two
  // tabs are separate components with no shared state/context to lift into.
  const [detailEntryId, setDetailEntryId] = React.useState<string | null>(null)
  const [detailData, setDetailData] = React.useState<EarningDetail | null>(null)
  const [detailLoading, setDetailLoading] = React.useState(false)
  const [detailError, setDetailError] = React.useState<
    "not-found" | "error" | null
  >(null)

  const openEntryDetail = React.useCallback((id: string) => {
    setDetailEntryId(id)
    setDetailData(null)
    setDetailError(null)
    setDetailLoading(true)
    getEarningDetail(id)
      .then(setDetailData)
      .catch((e) =>
        setDetailError(e?.response?.status === 404 ? "not-found" : "error")
      )
      .finally(() => setDetailLoading(false))
  }, [])

  const closeEntryDetail = React.useCallback(() => {
    setDetailEntryId(null)
    setDetailData(null)
    setDetailError(null)
  }, [])

  const loadSummary = React.useCallback(() => {
    setEarningsSummaryError(false)
    getEarningsSummary()
      .then(setEarningsSummary)
      .catch((e) => {
        console.error(e)
        setEarningsSummaryError(true)
      })
  }, [])

  useEffect(() => {
    loadSummary()
  }, [loadSummary])

  const loadEarnings = React.useCallback(() => {
    setEarningsLoading(true)
    setEarningsError(false)
    const q: any = {
      view: viewMode,
      dateRange,
      page: currentPage,
      limit: 10,
      sortBy: "workStartAt",
      sortOrder: dateSortOrder,
    }
    if (dateRange === "custom" && dateFrom && dateTo) {
      q.dateRange = "custom"
      q.startDate = dateFrom
      q.endDate = dateTo
    }
    if (entryType) q.entryType = entryType
    if (statusFilter) q.status = statusFilter
    if (projectId) q.projectId = projectId
    if (clientId) q.clientId = clientId
    if (searchQuery.length >= 1) q.search = searchQuery
    getEarnings(q)
      .then(setEarningsResult)
      .catch((e) => {
        console.error(e)
        setEarningsError(true)
      })
      .finally(() => setEarningsLoading(false))
  }, [
    viewMode,
    dateRange,
    dateFrom,
    dateTo,
    currentPage,
    entryType,
    statusFilter,
    projectId,
    clientId,
    searchQuery,
    dateSortOrder,
  ])

  useEffect(() => {
    loadEarnings()
  }, [loadEarnings])

  // All Projects / All Clients option lists — fetched once from the
  // contractor's full contract history (GET /earnings/filters), not derived
  // from whichever earnings rows the current date-range filter happens to
  // return. The old row-derived approach meant the dropdown was empty
  // whenever the active filters returned zero rows (e.g. default "This
  // Month" filter on an account with no earnings this month), even though
  // the contractor has real project/client history outside that window.
  useEffect(() => {
    getEarningsFilterOptions()
      .then((opts) => {
        setProjectOptions(opts.projects)
        setClientOptions(opts.clients)
      })
      .catch((e) => console.error("Failed to load project/client filter options:", e))
  }, [])

  // US-23/US-24: chips + Clear All. dateRange excluded — "this_month" is the
  // default and isn't a contractor-applied filter to display as a chip.
  const activeFilterChips: {
    key: string
    label: string
    onRemove: () => void
  }[] = [
    ...(dateRange !== "this_month"
      ? [
          {
            key: "dateRange",
            label:
              dateRange === "custom" && dateFrom && dateTo
                ? `${formatDate(parseISO(dateFrom), "LLL d, yyyy")} – ${formatDate(parseISO(dateTo), "LLL d, yyyy")}`
                : (EARNINGS_DATE_RANGE_LABELS[dateRange] ?? dateRange),
            onRemove: () => {
              setDateRange("this_month")
              setDateFrom("")
              setDateTo("")
              setCurrentPage(1)
            },
          },
        ]
      : []),
    ...(projectId
      ? [
          {
            key: "projectId",
            label:
              projectOptions.find((p) => p.id === projectId)?.name ?? "Project",
            onRemove: () => {
              setProjectId("")
              setCurrentPage(1)
            },
          },
        ]
      : []),
    ...(clientId
      ? [
          {
            key: "clientId",
            label:
              clientOptions.find((c) => c.id === clientId)?.label ?? "Client",
            onRemove: () => {
              setClientId("")
              setCurrentPage(1)
            },
          },
        ]
      : []),
    ...(entryType
      ? [
          {
            key: "entryType",
            label: entryType === "manual" ? "Manual" : "Automated",
            onRemove: () => {
              setEntryType("")
              setCurrentPage(1)
            },
          },
        ]
      : []),
    ...(statusFilter
      ? [
          {
            key: "statusFilter",
            label: statusFilter === "paid" ? "Paid" : "Reversed",
            onRemove: () => {
              setStatusFilter("")
              setCurrentPage(1)
            },
          },
        ]
      : []),
    ...(searchQuery.length >= 1
      ? [
          {
            key: "search",
            label: `"${searchQuery}"`,
            onRemove: () => {
              setSearchQuery("")
              setCurrentPage(1)
            },
          },
        ]
      : []),
  ]
  const hasActiveFilters = activeFilterChips.length > 0
  const clearAllFilters = React.useCallback(() => {
    setDateRange("this_month")
    setDateFrom("")
    setDateTo("")
    setEntryType("")
    setStatusFilter("")
    setProjectId("")
    setClientId("")
    setSearchQuery("")
    setCurrentPage(1)
  }, [])

  // Export (parent-level Export button) reuses whatever filters are currently
  // applied to this table rather than always exporting the unfiltered dataset.
  useEffect(() => {
    onFiltersChange?.({
      dateRange,
      startDate: dateFrom,
      endDate: dateTo,
      entryType,
      statusFilter,
      search: searchQuery.length >= 1 ? searchQuery : "",
      projectId,
      clientId,
    })
  }, [
    onFiltersChange,
    dateRange,
    dateFrom,
    dateTo,
    entryType,
    statusFilter,
    searchQuery,
    projectId,
    clientId,
  ])

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="flex gap-4 items-stretch">
        <StatCard
          label="Today"
          amount={
            earningsSummary
              ? formatAmountWithCents(earningsSummary.today.amount)
              : "0.00"
          }
          symbol={currencySymbol(
            earningsSummary?.today.displayCurrency || "USD"
          )}
          negative={
            !!earningsSummary &&
            amountSign(earningsSummary.today.amount) === "-"
          }
          extra={
            <span>
              <span className="font-semibold text-[#22376B]">
                {earningsSummary?.today.hoursLabel ?? "0h 00m"}
              </span>{" "}
              <span className="text-[#667085]">Logged</span>
            </span>
          }
          change={
            earningsSummary?.today.changePercent != null
              ? {
                  value: Math.abs(earningsSummary.today.changePercent) + "%",
                  direction:
                    earningsSummary.today.changeDirection === "up"
                      ? "up"
                      : "down",
                  label:
                    earningsSummary.today.changeLabel?.replace(
                      /^[\d.]+%\s*/,
                      ""
                    ) ?? "",
                }
              : undefined
          }
        />
        <StatCard
          label="This Week"
          amount={
            earningsSummary
              ? formatAmountWithCents(earningsSummary.thisWeek.amount)
              : "0.00"
          }
          symbol={currencySymbol(
            earningsSummary?.thisWeek.displayCurrency || "USD"
          )}
          negative={
            !!earningsSummary &&
            amountSign(earningsSummary.thisWeek.amount) === "-"
          }
          extra={
            <span>
              <span className="font-semibold text-[#22376B]">
                {earningsSummary?.thisWeek.hoursLabel ?? "0h 00m"}
              </span>{" "}
              <span className="text-[#667085]">Logged</span>
            </span>
          }
          change={
            earningsSummary?.thisWeek.changePercent != null
              ? {
                  value: Math.abs(earningsSummary.thisWeek.changePercent) + "%",
                  direction:
                    earningsSummary.thisWeek.changeDirection === "up"
                      ? "up"
                      : "down",
                  label:
                    earningsSummary.thisWeek.changeLabel?.replace(
                      /^[\d.]+%\s*/,
                      ""
                    ) ?? "",
                }
              : undefined
          }
        />
        <StatCard
          label="This Month"
          amount={
            earningsSummary
              ? formatAmountWithCents(earningsSummary.thisMonth.amount)
              : "0.00"
          }
          symbol={currencySymbol(
            earningsSummary?.thisMonth.displayCurrency || "USD"
          )}
          negative={
            !!earningsSummary &&
            amountSign(earningsSummary.thisMonth.amount) === "-"
          }
          extra={
            <span>
              <span className="font-semibold text-[#22376B]">
                {earningsSummary?.thisMonth.hoursLabel ?? "0h 00m"}
              </span>{" "}
              <span className="text-[#667085]">Logged</span>
            </span>
          }
          change={
            earningsSummary?.thisMonth.changePercent != null
              ? {
                  value:
                    Math.abs(earningsSummary.thisMonth.changePercent) + "%",
                  direction:
                    earningsSummary.thisMonth.changeDirection === "up"
                      ? "up"
                      : "down",
                  label:
                    earningsSummary.thisMonth.changeLabel?.replace(
                      /^[\d.]+%\s*/,
                      ""
                    ) ?? "",
                }
              : undefined
          }
        />
      </div>
      {earningsSummaryError && (
        <p className="text-xs text-red-600 -mt-3">
          We couldn't load your earnings summary.{" "}
          <button className="underline font-medium" onClick={loadSummary}>
            Retry
          </button>
        </p>
      )}

      {/* Filters Row — Figma "Frame 1948757692" (Dev Mode CSS, pasted by
        @manu042k): outer row gap 24px between the toggle group and
        everything else; toggle group is flex:none (fixed 197px); the rest
        ("Frame 1948757699") is flex-grow:1 and itself splits into the 5
        fixed-width filter dropdowns (flex:none, 12px gaps, "Frame
        1000002822") and the search field ("Component 987"), which is the
        one flex-grow:1 in that inner group — Figma's actual mechanism for
        keeping search on the row is the search field GROWING to fill
        leftover space, not the fixed-width-+ ml-auto this used to be.
        overflow-x-auto stays as a fallback for viewports narrower than
        Figma's 1152px reference frame — Figma doesn't model that, but a
        real browser needs somewhere to put the overflow instead of
        wrapping (the original bug) or squishing chip labels. */}
      <div className="flex items-center gap-6 flex-nowrap overflow-x-auto">
        <div className="shrink-0">
          <ToggleGroupRoot
            value={[viewMode]}
            onValueChange={(details) => {
              // US-29: pagination resets whenever the result set underneath it changes.
              if (details.value.length > 0) {
                setViewMode(details.value[0])
                setCurrentPage(1)
              }
            }}
          >
            <ToggleGroupItem value="daily">Daily</ToggleGroupItem>
            <ToggleGroupItem value="weekly">Weekly</ToggleGroupItem>
            <ToggleGroupItem value="monthly">Monthly</ToggleGroupItem>
          </ToggleGroupRoot>
        </div>

        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="flex items-center gap-3 shrink-0">
            <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outlined"
                  visual="gray"
                  size="sm"
                  className={FILTER_CHIP_CLASS}
                >
                  <Calendar className="size-4 text-gray-800" />
                  {dateRange === "custom" && dateFrom && dateTo
                    ? `${formatDate(parseISO(dateFrom), "LLL d, yyyy")} – ${formatDate(parseISO(dateTo), "LLL d, yyyy")}`
                    : (EARNINGS_DATE_RANGE_LABELS[dateRange] ?? "This Month")}
                  <ChevronDown className="size-4 text-gray-800" />
                </Button>
              </PopoverTrigger>
              <PopoverContent
                className="w-auto border-0 bg-transparent p-0 shadow-none"
                align="start"
                collisionPadding={16}
              >
                {datePickerOpen ? (
                  <DateRangeFilterPopoverContent
                    dateRange={dateRange}
                    dateFrom={dateFrom}
                    dateTo={dateTo}
                    defaultPreset="this month"
                    onCancel={() => setDatePickerOpen(false)}
                    onCommit={(next, from, to) => {
                      setDateRange(next)
                      setDateFrom(from)
                      setDateTo(to)
                      setCurrentPage(1)
                      setDatePickerOpen(false)
                    }}
                  />
                ) : null}
              </PopoverContent>
            </Popover>

            <FilterSearchMenu
              label="All Projects"
              searchPlaceholder="Find projects"
              value={projectId}
              onValueChange={(id) => {
                setProjectId(id)
                setCurrentPage(1)
              }}
              items={projectOptions.map((p) => ({
                id: p.id,
                title: p.name,
                handle: p.handle,
              }))}
            />

            <FilterSearchMenu
              label="All Clients"
              searchPlaceholder="Find clients"
              value={clientId}
              onValueChange={(id) => {
                setClientId(id)
                setCurrentPage(1)
              }}
              items={clientOptions.map((c) => ({
                id: c.id,
                title: c.label,
                handle: c.handle,
              }))}
            />

            <Select
              value={entryType || "all-entry-types"}
              onValueChange={(v) => {
                setEntryType(v === "all-entry-types" ? "" : v)
                setCurrentPage(1)
              }}
            >
              <SelectTrigger className={cn(FILTER_SELECT_CHIP_CLASS, "min-w-[130px]")}>
                <SelectValue placeholder="All Entry Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all-entry-types">All Entry Types</SelectItem>
                <SelectItem value="automated">Automated</SelectItem>
                <SelectItem value="manual">Manual</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={statusFilter || "all-statuses"}
              onValueChange={(v) => {
                setStatusFilter(v === "all-statuses" ? "" : v)
                setCurrentPage(1)
              }}
            >
              <SelectTrigger className={cn(FILTER_SELECT_CHIP_CLASS, "min-w-[110px]")}>
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all-statuses">All Statuses</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
                <SelectItem value="failed">Reversed</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Figma "Component 987" is flex-grow:1 at a 233px reference
            width, but on real (narrower) browser windows honoring 233px
            as a hard floor is what forces the whole row into
            overflow-x-auto's horizontal scrollbar. 150px keeps
            "Find transactions" fully legible while letting the field
            shrink enough to keep the row on one line, scrollbar-free,
            at common widths (verified at 1470px). SearchField itself
            hardcodes w-[224px] internally (components/ui/search-field),
            so w-full is required here to let it actually fill this
            wrapper instead of staying rigid. */}
          <div className="flex-1 min-w-[150px]">
            <SearchField className="w-full">
              <SearchFieldButton>
                <Search className="size-4" />
              </SearchFieldButton>
              <SearchFieldInput
                className={searchQuery ? "pr-9" : undefined}
                placeholder="Find transactions"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value)
                  setCurrentPage(1)
                }}
              />
              {searchQuery && (
                <button
                  type="button"
                  aria-label="Clear search"
                  className="absolute right-2.5 inset-y-0 my-auto text-gray-400 hover:text-gray-600"
                  onClick={() => {
                    setSearchQuery("")
                    setCurrentPage(1)
                  }}
                >
                  <XCircle className="size-4" />
                </button>
              )}
            </SearchField>
          </div>
        </div>
      </div>


      {/* Table — a zero-result search replaces the whole card (header included),
          same as Settings → Billing → Transactions (billing-transactions-content.tsx),
          not just an empty row inside the table. */}
      {earningsResult?.data.length === 0 && searchQuery.length >= 1 ? (
        <div className="flex flex-col items-center py-14 gap-4">
          <p className="text-base font-semibold text-dark-blue-400">
            0 Results for &ldquo;{searchQuery.trim()}&rdquo;
          </p>
          <p className="text-sm text-gray-500 -mt-2 max-w-[380px] mx-auto text-center">
            We couldn&apos;t find any results for your search. Try adjusting
            your keywords or clearing your search.
          </p>
          <button
            type="button"
            className="inline-flex items-center justify-center gap-2 px-3.5 py-2 bg-gray-200 rounded-[5px] text-sm font-semibold leading-5 text-dark-blue-400 transition-colors duration-300 hover:bg-gray-300"
            onClick={() => {
              setSearchQuery("")
              setCurrentPage(1)
            }}
          >
            Clear Search
          </button>
        </div>
      ) : (
      <div className="rounded-xl border border-gray-200 bg-white overflow-hidden shadow-[0px_1px_4px_0px_rgba(0,0,0,.03)]">
        <Table>
          <TableHeader className="bg-white [&_tr]:border-gray-200">
            <TableRow>
              <TableHead
                className="cursor-pointer select-none text-xs font-medium text-gray-500"
                onClick={() => {
                  setDateSortOrder((o) => (o === "desc" ? "asc" : "desc"))
                  setCurrentPage(1)
                }}
              >
                {viewMode === "weekly"
                  ? "Week Range"
                  : viewMode === "monthly"
                    ? "Month"
                    : "Date"}{" "}
                {dateSortOrder === "desc" ? (
                  <ArrowDown className="size-3 inline ml-0.5 text-gray-400" />
                ) : (
                  <ArrowUp className="size-3 inline ml-0.5 text-gray-400" />
                )}
              </TableHead>
              <TableHead className="text-xs font-medium text-gray-500">
                Project
              </TableHead>
              {viewMode === "daily" && (
                <TableHead className="text-xs font-medium text-gray-500">
                  Task
                </TableHead>
              )}
              {viewMode === "daily" && (
                <TableHead className="text-xs font-medium text-gray-500 whitespace-nowrap">
                  Start Time
                </TableHead>
              )}
              {viewMode === "daily" && (
                <TableHead className="text-xs font-medium text-gray-500 whitespace-nowrap">
                  End Time
                </TableHead>
              )}
              {viewMode === "daily" && (
                <TableHead className="text-xs font-medium text-gray-500">
                  Duration
                </TableHead>
              )}
              {viewMode === "weekly" && (
                <TableHead className="text-xs font-medium text-gray-500">
                  Weekly Hours
                </TableHead>
              )}
              {viewMode === "monthly" && (
                <TableHead className="text-xs font-medium text-gray-500">
                  Total Hours
                </TableHead>
              )}
              <TableHead className="text-xs font-medium text-gray-500">
                {viewMode === "weekly"
                  ? "Weekly Earnings"
                  : viewMode === "monthly"
                    ? "Total Earnings"
                    : "Earnings"}
              </TableHead>
              {viewMode === "weekly" && (
                <TableHead className="text-xs font-medium text-gray-500">
                  Budget
                </TableHead>
              )}
              <TableHead className="w-10"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {earningsLoading ? (
              [...Array(5)].map((_, i) => (
                <TableRow key={i}>
                  <TableCell colSpan={8} className="py-3">
                    <div className="h-4 bg-gray-100 rounded animate-pulse" />
                  </TableCell>
                </TableRow>
              ))
            ) : earningsError ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-10">
                  <p className="text-sm text-red-600">
                    We couldn't load your earnings. Please try again.
                  </p>
                  <button
                    className="text-sm text-primary-600 underline mt-1"
                    onClick={loadEarnings}
                  >
                    Retry
                  </button>
                </TableCell>
              </TableRow>
            ) : earningsResult?.data.length === 0 ? (
              <TableRow>
                {/* US-25: filtered-empty vs no-data-at-all are visually distinct —
                    the filtered case keeps a Clear All CTA, the no-data case doesn't
                    imply anything is filterable. hasActiveFilters is defined below. */}
                <TableCell
                  colSpan={8}
                  className="text-center text-sm text-gray-400 py-10"
                >
                  {hasActiveFilters ? (
                    <>
                      No earnings match your current filters.
                      <button
                        className="text-primary-600 underline ml-1"
                        onClick={clearAllFilters}
                      >
                        Clear All
                      </button>
                    </>
                  ) : (
                    "No earnings found for this period."
                  )}
                </TableCell>
              </TableRow>
            ) : (
              earningsResult?.data.map((row) => (
                <React.Fragment key={row.id}>
                  <TableRow
                    className="cursor-pointer hover:bg-gray-25"
                    onClick={() => openEntryDetail(row.id)}
                  >
                    <TableCell className="text-sm text-gray-500 whitespace-nowrap">
                      {row.date ?? row.weekRange ?? row.month ?? "—"}
                    </TableCell>
                    <TableCell>
                      {row.project ? (
                        <div className="flex items-center gap-2.5">
                          <Avatar className="size-8">
                            <AvatarFallback>
                              {row.project.clientHandle?.[1]?.toUpperCase() ??
                                "C"}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="text-sm font-semibold text-dark-blue-400">
                              {row.project.name}
                            </p>
                            <p className="text-xs text-gray-400">
                              {row.project.clientHandle}
                            </p>
                          </div>
                        </div>
                      ) : (
                        <span className="text-sm text-gray-400">—</span>
                      )}
                    </TableCell>
                    {viewMode === "daily" && (
                      <TableCell className="text-sm text-gray-500">
                        {row.task?.name ?? "—"}
                      </TableCell>
                    )}
                    {viewMode === "daily" && (
                      <TableCell className="text-sm text-gray-500 whitespace-nowrap">
                        {row.startTime ?? "—"}
                      </TableCell>
                    )}
                    {viewMode === "daily" && (
                      <TableCell className="text-sm text-gray-500 whitespace-nowrap">
                        {row.endTime ?? "—"}
                      </TableCell>
                    )}
                    {viewMode === "daily" && (
                      <TableCell className="text-sm text-gray-500">
                        <div>{row.durationLabel}</div>
                      </TableCell>
                    )}
                    {viewMode === "weekly" && (
                      <TableCell className="text-sm text-gray-500">
                        {row.weeklyHours ?? "—"}
                      </TableCell>
                    )}
                    {viewMode === "monthly" && (
                      <TableCell className="text-sm text-gray-500">
                        {row.totalHours ?? "—"}
                      </TableCell>
                    )}
                    <TableCell>
                          <div className="flex items-center gap-2">
                        {(() => {
                          const rowAmount =
                            viewMode === "weekly"
                              ? row.weeklyEarnings
                              : viewMode === "monthly"
                                ? row.totalEarnings
                                : (row.netAmountDisplay ?? row.netAmount)
                          // Whole dollars only ("$1,800"), gray, no cents.
                          return (
                            <span className="text-sm font-semibold text-gray-500 whitespace-nowrap">
                              {amountSign(rowAmount)}
                              {currencySymbol(row.displayCurrency || "USD")}
                              {formatWholeAmount(rowAmount)}
                            </span>
                          )
                        })()}
                        {row.status === "paid" && (
                          <Badge visual="success" size="sm">
                            Paid
                          </Badge>
                        )}
                        {row.status === "failed" && (
                          <Badge visual="error" size="sm">
                            Reversed
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    {viewMode === "weekly" && (
                      <TableCell className="text-sm text-gray-500">
                        {row.budget ?? "—"}
                      </TableCell>
                    )}
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center gap-1">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <IconButton size="sm" variant="ghost" visual="gray">
                              <MoreHorizontal className="size-4" />
                            </IconButton>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => openEntryDetail(row.id)}
                            >
                              View Details
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </TableCell>
                  </TableRow>
                </React.Fragment>
              ))
            )}
          </TableBody>
        </Table>
      </div>
      )}

      {/* Figma: footer sits on the grey page bg, outside the white table card */}
      {!(earningsResult?.data.length === 0 && searchQuery.length >= 1) && (
      <div className="flex items-center justify-between px-1 pt-3">
        <p className="text-xs text-[#22376B]">
          {earningsResult
            ? earningsResult.manualTimeLabel
            : earningsLoading
              ? "Loading earnings..."
              : "Unavailable"}{" "}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                <HelpCircle className="size-3.5 inline text-[#98A2B3]" />
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

        <TablePagination
          currentPage={currentPage}
          totalPages={earningsResult?.totalPages ?? 1}
          onPageChange={setCurrentPage}
        />
      </div>
      )}

      {/* F-05 Entry Detail Drawer — second, self-contained instance mirroring
          OverviewTab's (US-30), since the two tabs are separate components
          with no shared state/context to lift into. */}
      <Dialog
        open={!!detailEntryId}
        onOpenChange={(open) => {
          if (!open) closeEntryDetail()
        }}
      >
        <DialogContent
          variant="unanimated"
          onInteractOutside={(e) => e.preventDefault()}
          className="fixed right-0 top-0 h-full w-full sm:max-w-md bg-white shadow-xl overflow-y-auto p-0 gap-0 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right duration-300"
        >
          <div className="flex items-center justify-between px-6 py-5 border-b border-gray-200 sticky top-0 bg-white z-10">
            <DialogTitle className="text-base font-semibold text-dark-blue-400">
              Entry Details
            </DialogTitle>
            <DialogClose asChild>
              <IconButton size="sm" variant="ghost" visual="gray">
                <X className="size-4" />
              </IconButton>
            </DialogClose>
          </div>

          {detailLoading ? (
            <div className="p-6 space-y-4">
              {[...Array(5)].map((_, i) => (
                <div
                  key={i}
                  className="h-6 bg-gray-100 rounded animate-pulse"
                />
              ))}
            </div>
          ) : detailError === "not-found" ? (
            <div className="p-6 text-center space-y-4">
              <p className="text-sm text-gray-500">
                This entry could not be found.
              </p>
              <DialogClose asChild>
                <Button variant="outlined" visual="gray" size="sm">
                  Close
                </Button>
              </DialogClose>
            </div>
          ) : detailError === "error" ? (
            <div className="p-6 text-center space-y-4">
              <p className="text-sm text-red-600">
                We couldn't load this entry. Please try again.
              </p>
              <Button
                variant="outlined"
                visual="gray"
                size="sm"
                onClick={() => detailEntryId && openEntryDetail(detailEntryId)}
              >
                Retry
              </Button>
            </div>
          ) : detailData ? (
            <div className="p-6 space-y-6">
              <div className="space-y-2">
                <p className="text-sm font-semibold text-dark-blue-400">
                  {new Date(detailData.workStartAt).toLocaleDateString(
                    "en-US",
                    {
                      weekday: "long",
                      month: "long",
                      day: "numeric",
                      year: "numeric",
                    }
                  )}
                </p>
                <div className="flex items-center gap-2">
                  <Badge
                    visual={
                      detailData.entryType === "automated"
                        ? "primary"
                        : "warning"
                    }
                    size="sm"
                  >
                    {detailData.entryType === "automated"
                      ? "Automated"
                      : "Manual"}
                  </Badge>
                  <Badge
                    visual={
                      detailData.status === "paid"
                        ? "success"
                        : detailData.status === "failed"
                          ? "error"
                          : "primary"
                    }
                    size="sm"
                  >
                    {detailData.status === "paid"
                      ? "Paid"
                      : detailData.status === "failed"
                        ? "Reversed"
                        : "Confirmed"}
                  </Badge>
                </div>
              </div>

              <div>
                <p className="text-sm font-semibold text-dark-blue-400">
                  {detailData.project?.name ?? "Untitled project"}
                </p>
                {detailData.project?.clientName && (
                  <p className="text-xs text-gray-400">
                    {detailData.project.clientName}
                  </p>
                )}
                {detailData.contract?.title && (
                  <p className="text-xs text-gray-400 mt-0.5">
                    {detailData.contract.title}
                  </p>
                )}
              </div>

              <div className="space-y-1">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                  Time Block
                </p>
                <p className="text-sm text-dark-blue-400">
                  {new Date(detailData.workStartAt).toLocaleTimeString(
                    "en-US",
                    { hour: "numeric", minute: "2-digit" }
                  )}
                  {" – "}
                  {new Date(detailData.workEndAt).toLocaleTimeString("en-US", {
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                </p>
                <p className="text-xs text-gray-500">
                  {detailData.durationLabel}
                </p>
              </div>

              {detailData.entryType === "automated" &&
                (detailData.avgKeyboardPct != null ||
                  detailData.avgMousePct != null) && (
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                      Activity
                    </p>
                    <div className="flex gap-4 text-sm text-dark-blue-400">
                      {detailData.avgKeyboardPct != null && (
                        <span>⌨ {detailData.avgKeyboardPct}% keyboard</span>
                      )}
                      {detailData.avgMousePct != null && (
                        <span>🖱 {detailData.avgMousePct}% mouse</span>
                      )}
                    </div>
                  </div>
                )}

              <div className="space-y-1">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                  Fee Breakdown
                </p>
                <div className="rounded-lg border border-gray-200 divide-y divide-gray-200">
                  {detailData.feeSection.lineItems.map((item, i) => (
                    <div
                      key={i}
                      className={cn(
                        "flex items-center justify-between px-4 py-2.5",
                        item.isTotal && "bg-gray-25"
                      )}
                    >
                      <span
                        className={cn(
                          "text-sm",
                          item.isTotal
                            ? "font-semibold text-dark-blue-400"
                            : "text-gray-500"
                        )}
                      >
                        {item.label}
                      </span>
                      <span
                        className={cn(
                          "text-sm",
                          item.isTotal
                            ? "font-semibold text-dark-blue-400"
                            : "text-gray-500"
                        )}
                      >
                        {item.amount} {item.currency}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-1">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                  Exchange Rate
                </p>
                <p className="text-sm text-gray-500">
                  {detailData.feeSection.fxRateLabel}
                  {detailData.feeSection.billingCurrency !==
                    detailData.feeSection.displayCurrency && (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="ml-1 text-amber-500 cursor-help align-super">
                            *
                          </span>
                        </TooltipTrigger>
                        <TooltipContent visual="white" size="md">
                          <p>
                            This entry was billed in{" "}
                            {detailData.feeSection.billingCurrency}. Amounts
                            shown in {detailData.feeSection.displayCurrency} use
                            a live rate that may differ slightly from the rate
                            locked at the time this entry was logged.
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}
                </p>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ─── Payouts Tab ────────────────────────────────────────────────────────

// AC-27.04: exact status → label mapping. Never invent alternate labels.
export const PAYOUT_STATUS_LABELS: Record<string, string> = {
  pending_verification: "Awaiting Confirmation",
  awaiting_edd: "Awaiting Review",
  queued: "Processing",
  processing: "Processing",
  completed: "Completed",
  failed: "Failed",
  cancelled: "Cancelled",
}
const getPayoutStatusBadge = (
  status: string
): {
  visual: "success" | "warning" | "error" | "gray" | "primary"
  label: string
} => {
  switch (status) {
    case "completed":
      return { visual: "success", label: PAYOUT_STATUS_LABELS[status] }
    case "failed":
      return { visual: "error", label: PAYOUT_STATUS_LABELS[status] }
    case "cancelled":
      return { visual: "gray", label: PAYOUT_STATUS_LABELS[status] }
    case "queued":
    case "processing":
      return { visual: "primary", label: PAYOUT_STATUS_LABELS[status] }
    default:
      return {
        visual: "warning",
        label: PAYOUT_STATUS_LABELS[status] ?? "Awaiting Confirmation",
      }
  }
}
const formatPayoutDate = (iso: string | null) =>
  iso
    ? new Date(iso).toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      })
    : "—"

interface PayoutHistoryItem {
  id: string
  amountUsd: string
  feeUsd: string
  netAmountUsd: string
  currency: string
  status: string
  trigger: string
  failureReason: string | null
  methodType: string | null
  methodLabel: string | null
  createdAt: string
  settledAt: string | null
  estimatedArrivalAt: string | null
}

// US-28: read-only detail dialog — no retry/cancel actions at MVP (AC-28.06).
const PayoutDetailDialog = ({
  payoutId,
  onOpenChange,
}: {
  payoutId: string | null
  onOpenChange: (open: boolean) => void
}) => {
  const router = useRouter()
  const [detail, setDetail] = useState<any | null>(null)
  const [loading, setLoading] = useState(false)
  // EC-52: a failed/404 fetch must render a distinct "not found" state, not an
  // infinite skeleton (which is what `loading || !detail` alone produces on error).
  const [detailError, setDetailError] = useState("")

  const NON_TERMINAL = new Set([
    "pending_verification",
    "awaiting_edd",
    "queued",
    "processing",
  ])

  const fetchDetail = React.useCallback(
    async (silent = false) => {
      if (!payoutId) return
      if (!silent) {
        setLoading(true)
        setDetailError("")
      }
      try {
        const res = await payoutFetch(`/payouts/${payoutId}`)
        if (res.ok) {
          setDetail(await res.json())
        } else if (!silent) {
          setDetailError(
            res.status === 404
              ? "Transaction not found."
              : "We couldn't load this transaction. Please try again."
          )
        }
      } catch {
        if (!silent)
          setDetailError("We couldn't load this transaction. Please try again.")
      } finally {
        if (!silent) setLoading(false)
      }
    },
    [payoutId]
  )

  useEffect(() => {
    if (!payoutId) {
      setDetail(null)
      setDetailError("")
      return
    }
    setDetail(null)
    fetchDetail()
  }, [payoutId, fetchDetail])

  // Deliberately no separate useEarningsChannel subscription here — this
  // dialog is always mounted inside PayoutsTab (visibility toggled via the
  // Dialog's `open` prop, not conditional rendering), which now holds its
  // own live channel connection (see PayoutsTab above). A second
  // subscription here would just be a second simultaneous Ably connection
  // for the same contractor. Kept on the 15s poll for the (less common)
  // open-detail-view case; the list view behind it already updates live.
  useEffect(() => {
    if (!payoutId || !detail || !NON_TERMINAL.has(detail.status)) return
    const id = setInterval(() => fetchDetail(true), 15_000)
    return () => clearInterval(id)
  }, [payoutId, detail, fetchDetail])

  return (
    <Dialog open={!!payoutId} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold text-dark-blue-400">
            Payout Details
          </DialogTitle>
        </DialogHeader>
        <IconButton
          size="sm"
          variant="ghost"
          visual="gray"
          className="absolute top-4 right-4"
          onClick={() => onOpenChange(false)}
        >
          <X className="size-4" />
        </IconButton>
        {detailError ? (
          <div className="text-center py-8">
            <p className="text-sm text-gray-500">{detailError}</p>
            <button
              className="text-sm text-primary-600 underline mt-2"
              onClick={() => fetchDetail()}
            >
              Retry
            </button>
          </div>
        ) : loading || !detail ? (
          <div className="space-y-2 py-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-5 bg-gray-100 rounded animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="space-y-3 py-2">
            {[
              [
                "Amount",
                `$${parseFloat(detail.amountUsd).toFixed(2)} ${detail.currency}`,
              ],
              ["Fee", `$${parseFloat(detail.feeUsd).toFixed(2)}`],
              [
                "Net Transfer",
                `$${parseFloat(detail.netAmountUsd).toFixed(2)}`,
              ],
              ["Method", detail.methodLabel ?? detail.methodType ?? "—"],
              ["Status", getPayoutStatusBadge(detail.status).label],
              [
                "Source",
                detail.trigger === "scheduled" ? "Scheduled" : "Manual",
              ],
              // AC-28.03/28.04: shown with a "Pending" value until the provider callback arrives — never hidden.
              ["Provider Reference", detail.providerReference ?? "Pending"],
              ["Idempotency Key", detail.idempotencyKey],
              ["Initiated", formatPayoutDate(detail.timeline?.initiatedAt)],
              ["Settled", formatPayoutDate(detail.timeline?.completedAt)],
            ].map(([label, value]) => (
              <div
                key={label}
                className="flex items-center justify-between text-sm"
              >
                <span className="text-gray-500">{label}</span>
                <span className="font-medium text-dark-blue-400 text-right max-w-[60%] truncate">
                  {value}
                </span>
              </div>
            ))}
            {/* US-50: a specific failed state with next steps, not just a status
                badge — payout.service.ts's own cancel() error explicitly tells
                contractors to "start a new request" for a failed payout (there's
                no resume-same-payout endpoint), so Retry starts a fresh
                withdrawal rather than attempting to resurrect this one. */}
            {detail.status === "failed" && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {detail.failureReason ??
                  "This payout could not be processed. Please contact support if the issue persists."}
                <div className="text-xs text-red-500 mt-1">
                  Retry attempts: {detail.retryCount ?? 0}
                </div>
                <div className="flex gap-2 mt-3">
                  <Button
                    variant="filled"
                    visual="primary"
                    size="sm"
                    onClick={() => router.push("/transfer-funds")}
                  >
                    Retry Withdrawal
                  </Button>
                  <Button
                    variant="outlined"
                    visual="gray"
                    size="sm"
                    onClick={() =>
                      window.open(
                        "mailto:support@marketeqdigital.com",
                        "_blank"
                      )
                    }
                  >
                    Contact Support
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

const PAYOUT_STATUS_FILTER_OPTIONS: { value: string; label: string }[] = [
  { value: "pending_verification", label: "Awaiting Confirmation" },
  { value: "queued", label: "Queued" },
  { value: "processing", label: "Processing" },
  { value: "completed", label: "Completed" },
  { value: "failed", label: "Failed" },
  { value: "cancelled", label: "Cancelled" },
]

export interface PayoutDepositStatus {
  status: string | null
  estimatedArrivalAt: string | null
  amountUsd: string | null
}

export interface PayoutsFilters {
  dateRange: string
  dateFrom?: string
  dateTo?: string
  statusFilter: string
  depositMethodId: string
  search: string
}

const PAYOUT_DATE_RANGE_LABELS = EARNINGS_DATE_RANGE_LABELS

export const PayoutsTab = ({
  onDepositStatusChange,
  onFiltersChange,
}: {
  onDepositStatusChange?: (status: PayoutDepositStatus) => void
  onFiltersChange?: (filters: PayoutsFilters) => void
} = {}) => {
  const [searchQuery, setSearchQuery] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  // SCR-16: real, server-side status filter — replaces the previously cosmetic
  // "All Statuses"/"All Accounts" selectors that had no effect on the fetch.
  const [statusFilter, setStatusFilter] = useState("")
  // Figma "All Time" / "All Accounts" — now real, server-side filters (see
  // resolvePayoutDateRange/depositMethodId in payout.service.ts) instead of
  // the previously-removed inert selectors.
  const [dateRange, setDateRange] = useState("all_time")
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")
  const [datePickerOpen, setDatePickerOpen] = useState(false)
  const [depositMethodId, setDepositMethodId] = useState("")
  const [accountOptions, setAccountOptions] = useState<DepositMethodOption[]>(
    []
  )
  const pageSize = 10

  const [payouts, setPayouts] = useState<PayoutHistoryItem[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState("")
  const [detailId, setDetailId] = useState<string | null>(null)

  // Stat cards — sourced from real data, not the Figma mock's static "$832.00 /
  // Tuesday, Aug 20th / Chase Bank ...4553" etc.
  const [monthlySummary, setMonthlySummary] = useState<{
    thisMonthTotalUsd: string
    changePercent: number | null
    changeDirection: "up" | "down" | "unchanged"
    sinceDate: string | null
    nextPayoutStatus: string | null
    nextPayoutEstimatedArrival: string | null
    nextPayoutAmountUsd: string | null
  } | null>(null)
  const [monthlySummaryError, setMonthlySummaryError] = useState(false)
  const loadMonthlySummary = React.useCallback(() => {
    setMonthlySummaryError(false)
    payoutFetch(`/payouts/summary`)
      .then(async (res) => {
        if (!res.ok) {
          setMonthlySummaryError(true)
          return null
        }
        return res.json()
      })
      .then((data) => { if (data) setMonthlySummary(data) })
      .catch(() => {
        setMonthlySummaryError(true)
      })
  }, [])

  // Surfaces the real in-flight payout's status/ETA to the page header's
  // "Where Is My Deposit?" trigger — replaces a static "2-3 business days" toast.
  useEffect(() => {
    if (!monthlySummary) return
    onDepositStatusChange?.({
      status: monthlySummary.nextPayoutStatus,
      estimatedArrivalAt: monthlySummary.nextPayoutEstimatedArrival,
      amountUsd: monthlySummary.nextPayoutAmountUsd,
    })
  }, [monthlySummary, onDepositStatusChange])

  const [nextRunAt, setNextRunAt] = useState<string | null>(null)
  const [scheduleLoading, setScheduleLoading] = useState(true)
  // US-100/US-101: same conflation risk as balanceError below — a failed
  // fetch previously left nextRunAt at null, rendering identically to "No
  // schedule set" (a legitimate empty state) with no way to retry.
  const [scheduleError, setScheduleError] = useState(false)
  const [defaultMethodLabel, setDefaultMethodLabel] = useState<string | null>(
    null
  )
  const [balance, setBalance] = useState<BalanceResponse | null>(null)
  const [completedCount, setCompletedCount] = useState<number | null>(null)
  // US-101: a failed balance fetch must be retryable in place — previously
  // this just logged to console and left the stat cards stuck on "-"
  // forever, indistinguishable from a legitimate $0 state (Doc07 Error ≠
  // Empty).
  const [balanceError, setBalanceError] = useState(false)
  const loadPayoutsBalance = React.useCallback(() => {
    setBalanceError(false)
    getBalance()
      .then(setBalance)
      .catch((e) => {
        console.error("Balance fetch failed:", e)
        setBalanceError(true)
      })
  }, [])

  const loadPayoutsSchedule = React.useCallback(async () => {
    setScheduleLoading(true)
    setScheduleError(false)
    try {
      const res = await payoutFetch(`/payouts/schedule`)
      if (!res.ok) {
        setScheduleError(true)
        return
      }
      const d = await res.json()
      setNextRunAt(d.nextRunAt ?? null)
      setDefaultMethodLabel(d.primaryMethod?.displayLabel ?? null)
    } catch (e) {
      console.error("Failed to fetch schedule", e)
      setScheduleError(true)
    } finally {
      setScheduleLoading(false)
    }
  }, [])

  useEffect(() => {
    loadPayoutsSchedule()
    loadPayoutsBalance()
    loadMonthlySummary()
    ;(async () => {
      try {
        const res = await payoutFetch(
          `/payouts?status=completed&page=1&pageSize=1`
        )
        if (res.ok) {
          const d = await res.json()
          setCompletedCount(d.totalCount ?? 0)
        }
      } catch (e) {
        console.error("Failed to fetch completed payout count", e)
      }
    })()
    ;(async () => {
      try {
        const res = await payoutFetch(`/deposit-methods`)
        if (res.ok) {
          const d = await res.json()
          setAccountOptions(d.methods ?? [])
        }
      } catch (e) {
        console.error("Failed to fetch deposit methods for account filter", e)
      }
    })()
  }, [loadPayoutsBalance, loadPayoutsSchedule, loadMonthlySummary])

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize))
  const hasActiveFilters =
    !!statusFilter ||
    searchQuery.length >= 1 ||
    dateRange !== "all_time" ||
    !!depositMethodId

  const loadPayouts = React.useCallback(
    async (silent = false) => {
      if (!silent) {
        setLoading(true)
        setLoadError("")
      }
      try {
        const qs = new URLSearchParams({
          page: String(currentPage),
          pageSize: String(pageSize),
        })
        if (statusFilter) qs.set("status", statusFilter)
        if (searchQuery.trim().length >= 1) qs.set("search", searchQuery.trim())
        if (dateRange === "custom" && dateFrom && dateTo) {
          qs.set("dateRange", "custom")
          qs.set("from", dateFrom)
          qs.set("to", dateTo)
        } else if (dateRange !== "all_time") {
          qs.set("dateRange", dateRange)
        }
        if (depositMethodId) qs.set("depositMethodId", depositMethodId)
        const res = await payoutFetch(`/payouts?${qs.toString()}`)
        const data = await res.json()
        if (!res.ok) throw new Error(data.message ?? "Failed to load")
        setPayouts(data.payouts ?? [])
        setTotalCount(data.totalCount ?? 0)
      } catch {
        // AC-29.03: a failed background poll must not disrupt an already-rendered list.
        if (!silent)
          setLoadError(
            "We couldn't load your transaction history. Please try again."
          )
      } finally {
        if (!silent) setLoading(false)
      }
    },
    [currentPage, statusFilter, searchQuery, dateRange, dateFrom, dateTo, depositMethodId]
  )

  useEffect(() => {
    loadPayouts()
  }, [loadPayouts])

  // Export reuses whatever the contractor currently has the Payouts table
  // filtered to, same pattern as EarningsTab's onFiltersChange.
  useEffect(() => {
    onFiltersChange?.({
      dateRange,
      dateFrom,
      dateTo,
      statusFilter,
      depositMethodId,
      search: searchQuery.trim().length >= 1 ? searchQuery.trim() : "",
    })
  }, [onFiltersChange, dateRange, dateFrom, dateTo, statusFilter, depositMethodId, searchQuery])

  // US-91–94: live push over Ably — same balance.updated/payout_completed
  // event the Overview tab's Recent Activity widget already consumes (see
  // that hook call further up this file). This table used to rely solely
  // on the 15s poll below and never subscribed to the channel at all, so a
  // payout that completed between polls stayed stuck on "Processing" for
  // up to 15s, or indefinitely if the contractor didn't have another
  // non-terminal row keeping the poll alive — only a manual refresh or a
  // new withdrawal (which re-mounts/re-triggers loadPayouts) would show it.
  const { isLive } = useEarningsChannel({
    onBalanceUpdated: React.useCallback((evt: EarningsRealtimeEvent) => {
      if (evt.mutationType === "payout_completed") {
        loadPayouts(true)
      }
    }, [loadPayouts]),
    onPayoutFailed: React.useCallback(() => {
      loadPayouts(true)
    }, [loadPayouts]),
    onReconnected: React.useCallback(() => {
      loadPayouts(true)
    }, [loadPayouts]),
  })

  // AC-29.01/29.02/29.03: 15s poll as a fallback for while the Ably channel
  // is disconnected (isLive false) — mirrors the gating pattern already
  // used by useEarningsChannel's other consumers. Still scoped to pages
  // with a non-terminal row, same as before.
  const NON_TERMINAL_STATUSES = new Set([
    "pending_verification",
    "awaiting_edd",
    "queued",
    "processing",
  ])
  const hasInFlight = payouts.some((p) => NON_TERMINAL_STATUSES.has(p.status))
  useEffect(() => {
    if (!hasInFlight || isLive) return
    const id = setInterval(() => loadPayouts(true), 15_000)
    return () => clearInterval(id)
  }, [hasInFlight, isLive, loadPayouts])

  return (
    <div className="space-y-5">
      {/* Stats Cards — Figma: navy labels, 2×2 rows, bottom-aligned meta,
          equal flex-grow so all three cards stay the same width (Figma
          "Frame 1948757691": gap 20px, each card flex-grow:1). */}
      <div className="flex gap-5 items-stretch">
        <StatCard
          visual="emphasis"
          label="Next Payout"
          aside={
            scheduleLoading
              ? "Loading..."
              : scheduleError
                ? "Unavailable"
                : nextRunAt
                  ? formatPayoutCardDate(nextRunAt)
                  : "No schedule set"
          }
          amount={
            scheduleLoading
              ? "-"
              : balance
                ? formatAmountWithCents(balance.availableBalance)
                : "-"
          }
          status={
            monthlySummary?.nextPayoutStatus
              ? `${PAYOUT_STATUS_LABELS[monthlySummary.nextPayoutStatus] ?? monthlySummary.nextPayoutStatus}...`
              : undefined
          }
          extra={
            scheduleError ? (
              <button
                className="text-red-600 underline"
                onClick={loadPayoutsSchedule}
              >
                Unavailable — Retry
              </button>
            ) : balanceError ? (
              <button
                className="text-red-600 underline"
                onClick={loadPayoutsBalance}
              >
                Unavailable — Retry
              </button>
            ) : defaultMethodLabel ? (
              <span className="inline-flex items-center gap-1.5">
                <BankIcon className="size-3.5 text-[#98A2B3]" />
                {formatPayoutMethodMask(defaultMethodLabel)}
              </span>
            ) : scheduleLoading ? undefined : (
              // Keeps this card's bottom row present (same as Total Payouts
              // This Month / Lifetime Payouts) so all three stay equal height —
              // an absent `extra` collapses the row and shrinks the card.
              "No deposit method"
            )
          }
        />
        <StatCard
          visual="emphasis"
          label="Total Payouts This Month"
          amount={
            monthlySummary
              ? formatAmountWithCents(monthlySummary.thisMonthTotalUsd)
              : "-"
          }
          change={
            monthlySummaryError
              ? undefined
              : monthlySummary?.changePercent != null &&
                  monthlySummary.changeDirection !== "unchanged"
                ? {
                    value: `${Math.abs(monthlySummary.changePercent)}%`,
                    direction: monthlySummary.changeDirection,
                    label: "from last month",
                  }
                : undefined
          }
          extra={
            monthlySummaryError ? (
              <button
                className="text-red-600 underline"
                onClick={loadMonthlySummary}
              >
                Unavailable — Retry
              </button>
            ) : (
              `Earnings in ${new Date().toLocaleDateString("en-US", { month: "long" })}`
            )
          }
        />
        <StatCard
          visual="emphasis"
          label="Lifetime Payouts"
          amount={
            balance
              ? formatAmountWithCents(balance.totalPaidOutUsd)
              : "-"
          }
          extra={
            balanceError ? (
              <button
                className="text-red-600 underline"
                onClick={loadPayoutsBalance}
              >
                Unavailable — Retry
              </button>
            ) : completedCount != null ? (
              `${completedCount} Completed Project${completedCount === 1 ? "" : "s"}`
            ) : undefined
          }
          meta={
            monthlySummary?.sinceDate
              ? `Since ${new Date(monthlySummary.sinceDate).toLocaleDateString(
                  "en-US",
                  { month: "short", day: "numeric", year: "numeric" }
                )}`
              : undefined
          }
        />
      </div>

      {/* Filters Row — Status, Date Range, and Account are all real, server-side
          filters wired to the fetch (see payout.service.ts listPayouts). */}
      <div className="flex items-center gap-3 flex-wrap">
        <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outlined"
              visual="gray"
              size="sm"
              className={FILTER_CHIP_CLASS}
            >
              <Calendar className="size-4 text-gray-800" />
              {dateRange === "custom" && dateFrom && dateTo
                ? `${formatDate(parseISO(dateFrom), "LLL d, yyyy")} – ${formatDate(parseISO(dateTo), "LLL d, yyyy")}`
                : (PAYOUT_DATE_RANGE_LABELS[dateRange] ?? "All Time")}
              <ChevronDown className="size-4 text-gray-800" />
            </Button>
          </PopoverTrigger>
          <PopoverContent
            className="w-auto border-0 bg-transparent p-0 shadow-none"
            align="start"
            collisionPadding={16}
          >
            {datePickerOpen ? (
            <DateRangeFilterPopoverContent
              dateRange={dateRange}
              dateFrom={dateFrom}
              dateTo={dateTo}
              defaultPreset="all time"
              onCancel={() => setDatePickerOpen(false)}
              onCommit={(next, from, to) => {
                setDateRange(next)
                setDateFrom(from)
                setDateTo(to)
                setCurrentPage(1)
                setDatePickerOpen(false)
              }}
            />
            ) : null}
          </PopoverContent>
        </Popover>

        <FilterSearchMenu
          label="All Accounts"
          searchPlaceholder="Find accounts"
          layout="inline"
          value={depositMethodId}
          onValueChange={(id) => {
            setDepositMethodId(id)
            setCurrentPage(1)
          }}
          items={accountOptions.map((m) => {
            const { name, sub } = splitMethodLabel(m)
            return {
              id: m.id,
              title: name,
              handle: sub,
              icon: <FilterMethodIcon method={m} />,
            }
          })}
        />

        <Select
          value={statusFilter || "all-statuses"}
          onValueChange={(v) => {
            setStatusFilter(v === "all-statuses" ? "" : v)
            setCurrentPage(1)
          }}
        >
          <SelectTrigger className={cn(FILTER_SELECT_CHIP_CLASS, "min-w-[160px]")}>
            <SelectValue placeholder="All Statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all-statuses">All Statuses</SelectItem>
            {PAYOUT_STATUS_FILTER_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {(statusFilter ||
          searchQuery ||
          dateRange !== "all_time" ||
          depositMethodId) && (
          <Button
            variant="link"
            size="sm"
            className="shrink-0 font-semibold text-primary-600"
            onClick={() => {
              setStatusFilter("")
              setSearchQuery("")
              setDateRange("all_time")
              setDateFrom("")
              setDateTo("")
              setDepositMethodId("")
              setCurrentPage(1)
            }}
          >
            Clear All
          </Button>
        )}

        <div className="ml-auto">
          {/* Same "Find transactions" search component as Settings → Billing →
            Transactions (billing-transactions-content.tsx), copied here per
            request — InputGroup with hover-expand width, not SearchField. */}
          <InputGroup className="group/search w-[220px] transition-all duration-300 focus-within:w-[375px]">
            <InputLeftElement>
              <SearchMd className="size-4 text-gray-400 transition-colors duration-300 group-hover/search:text-gray-500 group-focus-within/search:!text-primary-500" />
            </InputLeftElement>
            <Input
              placeholder="Find transactions"
              className="pl-9 pr-9 transition-[border-color,width] duration-300 hover:border-primary-200 hover:shadow-[0px_0px_0px_4px_#E1EAFF] focus:!ring-0 focus:!shadow-[0px_0px_0px_4px_#E1EAFF]"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value)
                setCurrentPage(1)
              }}
            />
            {searchQuery && (
              <InputRightElement>
                <button
                  type="button"
                  className="focus-visible:outline-none"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    setSearchQuery("")
                    setCurrentPage(1)
                  }}
                >
                  <XCircle className="size-4 text-gray-500 opacity-50 hover:opacity-100" />
                </button>
              </InputRightElement>
            )}
          </InputGroup>
        </div>
      </div>

      {/* Table — a zero-result search replaces the whole card (header included),
          same as Settings → Billing → Transactions (billing-transactions-content.tsx),
          not just an empty row inside the table. */}
      {payouts.length === 0 && searchQuery.trim().length >= 1 ? (
        <div className="flex flex-col items-center py-14 gap-4">
          <p className="text-base font-semibold text-dark-blue-400">
            0 Results for &ldquo;{searchQuery.trim()}&rdquo;
          </p>
          <p className="text-sm text-gray-500 -mt-2 max-w-[380px] mx-auto text-center">
            We couldn&apos;t find any results for your search. Try adjusting
            your keywords or clearing your search.
          </p>
          <button
            type="button"
            className="inline-flex items-center justify-center gap-2 px-3.5 py-2 bg-gray-200 rounded-[5px] text-sm font-semibold leading-5 text-dark-blue-400 transition-colors duration-300 hover:bg-gray-300"
            onClick={() => {
              setSearchQuery("")
              setCurrentPage(1)
            }}
          >
            Clear Search
          </button>
        </div>
      ) : (
      <div className="rounded-lg border border-gray-200 bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Amount</TableHead>
              <TableHead>External Account</TableHead>
              <TableHead>Initiated on</TableHead>
              <TableHead>Est. Arrival</TableHead>
              <TableHead className="w-10"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              [...Array(5)].map((_, i) => (
                <TableRow key={i}>
                  <TableCell colSpan={5}>
                    <div className="h-5 bg-gray-100 rounded animate-pulse" />
                  </TableCell>
                </TableRow>
              ))
            ) : loadError ? (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="text-center py-6 text-sm text-red-600"
                >
                  {loadError}{" "}
                  <button
                    className="underline font-medium ml-1"
                    onClick={() => loadPayouts()}
                  >
                    Retry
                  </button>
                </TableCell>
              </TableRow>
            ) : payouts.length === 0 && hasActiveFilters ? (
              // EC-51: "no results for this filter" is distinct from "no history at all"
              <TableRow>
                <TableCell colSpan={5} className="text-center py-10">
                  <p className="text-sm text-gray-500">
                    No results for this filter.
                  </p>
                  <button
                    className="text-sm text-primary-600 underline mt-1"
                    onClick={() => {
                      setStatusFilter("")
                      setDateRange("all_time")
                      setDateFrom("")
                      setDateTo("")
                      setDepositMethodId("")
                      setCurrentPage(1)
                    }}
                  >
                    Clear filters
                  </button>
                </TableCell>
              </TableRow>
            ) : payouts.length === 0 ? (
              // AC-27.01: empty state distinct from an error state
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="text-center py-10 text-sm text-gray-400"
                >
                  No payouts yet. Your completed payouts will appear here.
                </TableCell>
              </TableRow>
            ) : (
              payouts.map((row) => {
                return (
                  <TableRow
                    key={row.id}
                    className="cursor-pointer"
                    onClick={() => setDetailId(row.id)}
                  >
                    <TableCell className="text-sm font-medium text-dark-blue-400">
                      ${parseFloat(row.amountUsd).toFixed(2)} {row.currency}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {row.methodType === "CRYPTO" ? (
                          // methodLabel is built server-side as
                          // `${cryptoProvider} ${token} ••••${last6}`
                          // (crypto-connection.service.ts) — the first word
                          // is always the exact CRYPTO_PROVIDER_ICON key
                          // (METAMASK, COINBASE, etc.), so this never
                          // guesses at the label format.
                          <CryptoProviderIcon
                            provider={row.methodLabel?.split(" ")[0] ?? ""}
                            className="size-4"
                          />
                        ) : (
                          <BankIcon className="size-4 text-gray-400" />
                        )}
                        <span className="text-sm text-gray-500">
                          {row.methodLabel ?? row.methodType ?? "—"}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-gray-500">
                      {formatPayoutDate(row.createdAt)}
                    </TableCell>
                    <TableCell className="text-sm text-gray-500">
                      {row.status === "completed"
                        ? formatPayoutDate(row.settledAt)
                        : row.estimatedArrivalAt
                          ? `Est. ${formatPayoutDate(row.estimatedArrivalAt)}`
                          : "—"}
                    </TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <IconButton size="sm" variant="ghost" visual="gray">
                            <MoreHorizontal className="size-4" />
                          </IconButton>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => setDetailId(row.id)}>
                            View Details
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>
      )}

      {/* Figma: pagination on grey page bg, outside the white table card */}
      {!loading && !loadError && payouts.length > 0 && (
        <div className="flex items-center justify-end px-1 pt-3">
          <TablePagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
          />
        </div>
      )}

      <PayoutDetailDialog
        payoutId={detailId}
        onOpenChange={(open) => !open && setDetailId(null)}
      />
    </div>
  )
}
