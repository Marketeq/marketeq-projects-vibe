"use client"

import React, { useState, useRef, useCallback } from "react"
import { jsPDF } from "jspdf"
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  Badge,
  Button,
  DoubleCalendar,
  Dialog,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogTitle,
  IconButton,
  Input,
  InputGroup,
  InputLeftElement,
  InputRightElement,
  Popover,
  PopoverContent,
  PopoverTrigger,
  ScrollArea,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
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
} from "@/components/ui"
import { cn } from "@/utils/functions"
import {
  ArrowDown,
  ArrowUp,
  Bank,
  Calendar,
  ChevronDown,
  ChevronRight,
  Check1,
  Copy03,
  Download,
  File02,
  Printer,
  Search,
  SearchMd,
  Share06,
  XCircle,
  XClose,
} from "@blend-metrics/icons"

type TransactionStatus =
  | "Paid"
  | "Processing"

type Transaction = {
  id: string
  date: string
  description: string
  subtitle: string
  referenceId?: string
  amount: string
  status?: TransactionStatus
  paymentMethod: string
  paymentDetail: string
  type: string
  contractId?: string
}

const statusStyles: Record<TransactionStatus, string> = {
  Paid: "bg-success-50 text-success-500",
  Processing: "bg-primary-50 text-primary-500",
}

const transactions: Transaction[] = [
  {
    id: "1",
    date: "April 2, 2025",
    description: 'Milestone payment for "Website Redesign"',
    subtitle: "Milestone 3 of 5",
    referenceId: "Invoice #34567",
    amount: "- $515.00",
    status: "Processing",
    paymentMethod: "Chase Bank",
    paymentDetail: "...4553",
    type: "project-payments",
    contractId: "1",
  },
  {
    id: "2",
    date: "April 1, 2025",
    description: 'Weekly team payment for "Design Team"',
    subtitle: "40 hours",
    referenceId: "Invoice #34568",
    amount: "- $515.00",
    status: "Paid",
    paymentMethod: "American Express",
    paymentDetail: "...8287",
    type: "team-payments",
    contractId: "3",
  },
  {
    id: "3",
    date: "April 1, 2025",
    description: 'Refund for canceled project "Mobile App MVP"',
    subtitle: "Partial refund",
    referenceId: "Transaction ID: 23344578990",
    amount: "+ $515.00",
    paymentMethod: "Chase Bank",
    paymentDetail: "...4553",
    type: "refunds",
    contractId: "1",
  },
  {
    id: "4",
    date: "April 1, 2025",
    description: 'Monthly retainer for "SEO Management"',
    subtitle: "March 2025",
    referenceId: "Invoice #34569",
    amount: "- $1,545.00",
    status: "Processing",
    paymentMethod: "Klarna",
    paymentDetail: "...123@email.com",
    type: "service-payments",
    contractId: "2",
  },
  {
    id: "5",
    date: "Mar 31, 2025",
    description: 'Bi-weekly team payment for "Engineering Squad"',
    subtitle: "80 hours",
    referenceId: "Invoice #34570",
    amount: "- $515.00",
    status: "Paid",
    paymentMethod: "Google Pay",
    paymentDetail: "...123@email.com",
    type: "team-payments",
    contractId: "3",
  },
  {
    id: "6",
    date: "Mar 31, 2025",
    description: 'Billing correction for "Design Team"',
    subtitle: "Rate adjustment",
    referenceId: "Invoice #34571",
    amount: "- $25.00",
    status: "Processing",
    paymentMethod: "American Express",
    paymentDetail: "...8287",
    type: "adjustments",
    contractId: "4",
  },
  {
    id: "7",
    date: "Mar 31, 2025",
    description: 'Final team payment for "QA Testers"',
    subtitle: "12 hours",
    referenceId: "Invoice #34572",
    amount: "- $515.00",
    status: "Paid",
    paymentMethod: "Apple Pay",
    paymentDetail: "...123@email.com",
    type: "team-payments",
    contractId: "7",
  },
  {
    id: "8",
    date: "Mar 30, 2025",
    description: 'Dispute credit for "Website Redesign"',
    subtitle: "Overcharge correction",
    referenceId: "Transaction ID: 23344578991",
    amount: "+ $100.00",
    paymentMethod: "Chase Bank",
    paymentDetail: "...4553",
    type: "credit-issued",
    contractId: "1",
  },
  {
    id: "9",
    date: "Mar 30, 2025",
    description: 'Annual subscription for "Cloud Hosting Service"',
    subtitle: "2025-2026",
    referenceId: "Invoice #34573",
    amount: "- $299.00",
    status: "Paid",
    paymentMethod: "American Express",
    paymentDetail: "...8287",
    type: "service-payments",
    contractId: "5",
  },
  {
    id: "10",
    date: "Mar 29, 2025",
    description: "Wallet top-up",
    subtitle: "",
    referenceId: "Invoice #34574",
    amount: "- $1,000.00",
    status: "Processing",
    paymentMethod: "Chase Bank",
    paymentDetail: "...4553",
    type: "funds-added",
  },
  {
    id: "11",
    date: "Mar 29, 2025",
    description: "Purchase of 50 invite credits",
    subtitle: "",
    referenceId: "Invoice #34575",
    amount: "- $49.99",
    status: "Paid",
    paymentMethod: "Klarna",
    paymentDetail: "...123@email.com",
    type: "invite-credits",
  },
  {
    id: "12",
    date: "Mar 28, 2025",
    description: 'Tax recalculation for "SEO Management"',
    subtitle: "Q4 2024 correction",
    referenceId: "Invoice #34576",
    amount: "+ $32.50",
    status: "Paid",
    paymentMethod: "American Express",
    paymentDetail: "...8287",
    type: "adjustments",
    contractId: "6",
  },
  // Generate additional transactions for pagination testing
  ...Array.from({ length: 88 }, (_, i) => {
    const idx = i + 13
    const typeDescPairs = [
      // Project Payments - project-based contracts (fixed scope, milestones, deliverables)
      { type: "project-payments", descs: [
        'Milestone payment for "Website Redesign"',
        'Final deliverable for "Brand Identity Project"',
        'Phase 2 payment for "Mobile App MVP"',
        'Progress payment for "E-commerce Build"',
      ]},
      // Service Payments - service-based contracts (retainers, subscriptions, ongoing services)
      { type: "service-payments", descs: [
        'Monthly retainer for "SEO Management"',
        'Quarterly payment for "Content Strategy"',
        'Annual subscription for "Cloud Hosting Service"',
        'Monthly fee for "Social Media Management"',
      ]},
      // Team Payments - team-based contracts (hourly teams, squads, staff augmentation)
      { type: "team-payments", descs: [
        'Weekly team payment for "Design Team"',
        'Bi-weekly payment for "Engineering Squad"',
        'Monthly team payment for "QA Testers"',
        'Hourly payment for "DevOps Team"',
      ]},
      // Refunds
      { type: "refunds", descs: [
        'Refund for canceled project "Mobile App MVP"',
        'Partial refund for "Brand Identity Project"',
        'Overpayment refund for "SEO Management"',
        'Service cancellation refund for "Content Strategy"',
      ]},
      // Credit Issued - credits applied to account
      { type: "credit-issued", descs: [
        'Dispute credit for "Website Redesign"',
        'Promotional credit applied',
        'Loyalty credit for account anniversary',
        'Referral bonus credit applied',
      ]},
      // Funds Added - wallet/account deposits
      { type: "funds-added", descs: [
        "Wallet top-up",
        "Account balance deposit",
        "Pre-funded escrow deposit",
        "Budget allocation deposit",
      ]},
      // Adjustments - corrections to previously recorded transactions
      { type: "adjustments", descs: [
        'Billing correction for "Website Redesign"',
        'Tax recalculation for "SEO Management"',
        'Proration adjustment for plan upgrade',
        'Rate correction for "Engineering Squad"',
      ]},
      // Invite Credits
      { type: "invite-credits", descs: [
        "Purchase of 50 invite credits",
        "Purchase of 100 invite credits",
        "Purchase of 25 invite credits",
        "Purchase of 200 invite credits",
      ]},
    ] as const
    const methods = [
      { name: "Chase Bank", detail: "...4553" },
      { name: "American Express", detail: "...8287" },
      { name: "Klarna", detail: "...123@email.com" },
      { name: "Google Pay", detail: "...123@email.com" },
      { name: "Apple Pay", detail: "...123@email.com" },
    ]
    const subtitles: Record<string, string[]> = {
      "project-payments": ["Milestone 1 of 4", "Milestone 2 of 4", "Milestone 3 of 5", "Final delivery"],
      "service-payments": ["March 2025", "Q1 2025", "2025-2026", "February 2025"],
      "team-payments": ["40 hours", "80 hours", "120 hours", "24 hours"],
      "refunds": ["Full refund", "Partial refund", "Overpayment", "Service credit"],
      "credit-issued": ["Account credit", "Promotional", "Loyalty reward", "Referral bonus"],
      "funds-added": ["", "", "", ""],
      "adjustments": ["March 2025", "Billing adjustment", "Q1 2025", "February 2025"],
      "invite-credits": ["", "", "", ""],
    }
    const day = 28 - (i % 28)
    const month = i < 28 ? "Mar" : i < 56 ? "Feb" : "Jan"
    const pm = methods[i % methods.length]
    const pair = typeDescPairs[i % typeDescPairs.length]
    const descIdx = Math.floor(i / typeDescPairs.length) % pair.descs.length
    const subtitle = subtitles[pair.type]?.[descIdx] || ""
    const amount = (100 + (i * 37) % 900).toFixed(2)
    const noContract = pair.type === "invite-credits" || pair.type === "funds-added" || pair.type === "credit-issued"
    return {
      id: String(idx),
      date: `${month} ${day}, 2025`,
      description: pair.descs[descIdx],
      subtitle,
      referenceId: pair.type === "refunds" || pair.type === "credit-issued"
        ? `Transaction ID: ${23344578992 + i}`
        : `Invoice #${34577 + i}`,
      amount: pair.type === "refunds" || pair.type === "credit-issued" ? `+ $${amount}` : `- $${amount}`,
      status: (i % 3 === 0 ? "Processing" : "Paid") as TransactionStatus,
      paymentMethod: pm.name,
      paymentDetail: pm.detail,
      type: pair.type,
      contractId: noContract ? undefined : String((i % 7) + 1),
    } satisfies Transaction
  }),
]

const LOGO_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="256" height="38" viewBox="0 0 147 22" fill="none"><path fill="#306CFE" d="M33.073 21.724c-1.368 0-2.578-.714-3.905-1.587a5.045 5.045 0 0 0-5.479-.048c-1.344.794-2.672 1.667-4.229 1.667h-.49a4.826 4.826 0 0 1-3.138-1.199 4.864 4.864 0 0 1-1.605-2.96l-.024-.683a5.057 5.057 0 0 1 .633-2.382l1.897-3.334 1.186 2.088-1.344 2.286a2.747 2.747 0 0 0 1.017 3.715c.412.239.879.364 1.354.366h.561c2.032-.04 3.336-2.382 6.886-2.382 3.415 0 4.743 2.421 6.64 2.421a2.364 2.364 0 0 0 2.109-1.158 2.388 2.388 0 0 0 .017-2.414L28.117 3.697a2.749 2.749 0 0 0-2.372-1.37 2.734 2.734 0 0 0-2.371 1.37l-2.846 4.93-1.186-2.08 2.198-3.874a4.818 4.818 0 0 1 1.76-1.776 4.79 4.79 0 0 1 6.58 1.776l7.043 12.391a4.467 4.467 0 0 1-1.638 6.066 4.42 4.42 0 0 1-2.211.594Z"/><path fill="#306CFE" d="M22.939 15.469c-.134-.318-7.186-12.702-7.233-12.773A4.816 4.816 0 0 0 13.946.92a4.791 4.791 0 0 0-6.58 1.776L.607 14.532A4.819 4.819 0 0 0 .655 19.3 4.792 4.792 0 0 0 2.4 21.038c.722.417 1.54.637 2.373.638h.498c1.581 0 2.885-.865 4.23-1.667a5.15 5.15 0 0 1 3.952-.58 6.173 6.173 0 0 1-.553-2.206 7.263 7.263 0 0 0-4.396.96c-6.031 3.51-7.114-.857-6.134-2.659L9.12 3.617a2.749 2.749 0 0 1 2.372-1.37 2.734 2.734 0 0 1 2.372 1.37l4.743 8.311.727 1.286c1.415 2.524 1.898 3.112 1.898 3.85.027.169.027.34 0 .508a12.14 12.14 0 0 1 2.039-1.08 4.435 4.435 0 0 0-.332-1.023Z" opacity=".5"/><path fill="#22376B" d="M69.174 9.084a.559.559 0 0 1 .356-.756c.529-.149 1.123-.27 1.78-.364a18.42 18.42 0 0 1 2.868-.216c.864 0 1.587.085 2.168.255.582.157 1.039.386 1.371.687.35.3.59.66.723 1.079.15.418.225.89.225 1.412 0 .576-.025 1.158-.075 1.747a30.01 30.01 0 0 0-.1 1.707c0 .563.025 1.112.075 1.648.02.22.055.436.103.647.092.41-.196.845-.618.845H76.7a.589.589 0 0 1-.549-.377l-.351-.909a.108.108 0 0 0-.184-.03c-.33.39-.785.73-1.364 1.021-.581.288-1.337.432-2.268.432a5.804 5.804 0 0 1-1.57-.196 3.905 3.905 0 0 1-1.197-.59 2.887 2.887 0 0 1-.773-.902 2.523 2.523 0 0 1-.274-1.177c0-.602.166-1.105.498-1.51.35-.42.84-.753 1.471-1.002.648-.261 1.413-.438 2.294-.53a19.853 19.853 0 0 1 2.991-.098c.116-.732.05-1.255-.2-1.57-.249-.326-.806-.49-1.67-.49-.648 0-1.338.053-2.069.157-.46.068-.87.149-1.227.244a.635.635 0 0 1-.756-.358l-.328-.806Zm3.882 6.728c.648 0 1.163-.11 1.545-.333.383-.236.665-.484.848-.746v-1.275a11.49 11.49 0 0 0-1.496-.02c-.465.026-.88.085-1.246.177-.366.091-.657.222-.873.392a.79.79 0 0 0-.324.648c0 .366.133.654.4.863.282.196.664.294 1.146.294ZM88.378 9.699c-.061.342-.403.554-.746.494a4.454 4.454 0 0 0-.764-.071c-.581 0-1.072.124-1.47.373-.35.216-.596.492-.737.829a.5.5 0 0 0-.036.193v5.65a.589.589 0 0 1-.589.588h-2.063a.589.589 0 0 1-.589-.589V8.533c0-.326.264-.59.589-.59h1.486c.263 0 .493.174.566.426l.25.87c.283-.484.765-.857 1.247-1.119.482-.261 1.047-.392 1.695-.392.288 0 .602.032.942.096a.558.558 0 0 1 .435.654l-.216 1.22ZM94.413 13.929a.588.588 0 0 0-.47-.236h-.578v3.473a.589.589 0 0 1-.59.589h-2.063a.589.589 0 0 1-.588-.589V5.562c0-.251.159-.474.396-.557l2.063-.715a.589.589 0 0 1 .782.557v7.276c.487-.179.91-.498 1.216-.918l2.24-3.078a.445.445 0 0 1 .36-.183h2.11c.495 0 .769.572.46.957l-2.822 3.517.698.765 2.675 3.634a.588.588 0 0 1-.474.938h-2.255a.589.589 0 0 1-.471-.236l-2.689-3.59ZM111.727 16.411c.177.276.095.644-.202.782-.421.196-.928.37-1.521.523-.848.209-1.753.313-2.717.313-2.011 0-3.482-.457-4.413-1.373-.93-.929-1.396-2.198-1.396-3.807 0-1.726.524-3.021 1.571-3.885 1.047-.863 2.518-1.295 4.412-1.295.632 0 1.247.066 1.845.196.598.131 1.13.347 1.595.648.466.3.84.706 1.122 1.216.283.51.424 1.145.424 1.904 0 .275-.025.569-.075.883-.061.582-.586.98-1.172.98h-6.481c.05.825.316 1.446.798 1.865.498.419 1.296.628 2.393.628.681 0 1.288-.079 1.82-.236.279-.086.523-.172.733-.259.295-.121.65-.038.822.23l.442.687Zm-4.316-6.701c-.847 0-1.479.203-1.894.608-.399.393-.64.922-.723 1.59h4.101c.304 0 .566-.233.544-.536-.033-.451-.177-.816-.432-1.093-.333-.38-.864-.57-1.596-.57ZM113.439 8.533c0-.326.264-.59.589-.59h1.132V6.529c0-.255.164-.482.407-.56l2.064-.667c.38-.123.769.16.769.56v2.083h2.453c.325 0 .588.263.588.589v.98a.588.588 0 0 1-.588.59H118.4v3.767c0 .68.083 1.17.249 1.471.183.288.516.432.998.432a3.912 3.912 0 0 0 1.077-.132c.327-.084.672.09.767.413l.246.845a.555.555 0 0 1-.363.696c-.321.097-.672.183-1.054.258a9.412 9.412 0 0 1-1.82.176c-1.147 0-1.994-.228-2.543-.686-.532-.471-.797-1.236-.797-2.296v-4.945h-1.132a.589.589 0 0 1-.589-.588v-.981ZM132.955 16.411c.177.276.095.644-.201.782-.421.196-.929.37-1.522.523a11.3 11.3 0 0 1-2.717.313c-2.011 0-3.482-.457-4.412-1.373-.931-.929-1.396-2.198-1.396-3.807 0-1.726.523-3.021 1.57-3.885 1.047-.863 2.518-1.295 4.412-1.295.632 0 1.247.066 1.845.196.598.131 1.13.347 1.596.648.465.3.839.706 1.121 1.216.283.51.424 1.145.424 1.904 0 .275-.025.569-.075.883-.061.582-.586.98-1.171.98h-6.482c.05.825.316 1.446.798 1.865.499.419 1.296.628 2.393.628.681 0 1.288-.079 1.82-.236.279-.086.523-.172.733-.259.295-.121.65-.038.822.23l.442.687ZM128.64 9.71c-.848 0-1.48.203-1.895.608-.399.393-.64.922-.723 1.59h4.101c.304 0 .567-.233.544-.536-.033-.451-.177-.816-.432-1.093-.332-.38-.864-.57-1.595-.57ZM146.387 20.277c0 .26-.171.49-.421.565l-2.064.613a.589.589 0 0 1-.756-.565v-3.979c-.282.34-.764.615-1.246.824-.482.196-1.105.294-1.87.294-1.545 0-2.734-.412-3.565-1.236-.814-.824-1.221-2.073-1.221-3.747 0-1.753.557-3.081 1.67-3.984 1.13-.902 2.742-1.354 4.836-1.354.449 0 .898.02 1.346.06.449.025.873.071 1.272.137.415.052.797.117 1.146.196.159.03.305.06.44.089a.56.56 0 0 1 .433.553v11.534Zm-5.484-4.406c.631 0 1.113-.111 1.445-.333.321-.205.571-.503.752-.895a.533.533 0 0 0 .046-.222v-4.3a2.772 2.772 0 0 0-.847-.195 8.776 8.776 0 0 0-1.072-.06c-.881 0-1.546.263-1.995.786-.432.523-.648 1.288-.648 2.296 0 .954.2 1.68.599 2.178.398.497.972.745 1.72.745ZM62.739 8.867l-4.434 6.114a.589.589 0 0 1-.477.243h-.501a.589.589 0 0 1-.472-.237l-4.454-5.96-.006 8.14a.589.589 0 0 1-.588.588h-2.064a.589.589 0 0 1-.589-.589V4.608c0-.325.264-.588.589-.588h2.236c.183 0 .357.085.468.232l5.278 6.936a.098.098 0 0 0 .159-.003l4.954-6.92a.589.589 0 0 1 .479-.245h2.2c.325 0 .589.263.589.588v12.558a.589.589 0 0 1-.589.589h-2.235a.589.589 0 0 1-.588-.592l.045-8.296Z"/></svg>`

function svgToDataUrl(): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement("canvas")
      canvas.width = img.width
      canvas.height = img.height
      const ctx = canvas.getContext("2d")!
      ctx.drawImage(img, 0, 0)
      resolve(canvas.toDataURL("image/png"))
    }
    img.src = "data:image/svg+xml;base64," + btoa(LOGO_SVG)
  })
}

let cachedLogoDataUrl: string | null = null

const FILTER_CHIP_CLASS =
  "h-9 gap-x-2 bg-white text-sm font-medium text-gray-800 hover:bg-white"

const FILTER_SELECT_CHIP_CLASS =
  "h-9 w-auto bg-white px-3.5 py-0 text-sm font-medium text-gray-800 data-[placeholder]:text-gray-800 [&>span]:text-sm [&>span]:font-medium [&>span]:text-gray-800 [&>svg]:size-4 [&>svg]:text-gray-800"

const TYPE_LABELS: Record<string, string> = {
  "project-payments": "Project Payments",
  "service-payments": "Service Payments",
  "team-payments": "Team Payments",
  "refunds": "Refunds",
  "credit-issued": "Credit Issued",
  "funds-added": "Funds Added",
  "adjustments": "Adjustments",
  "withdrawals": "Withdrawals",
  "invite-credits": "Invite Credits",
}

// All contract options (would come from API in production)
const allContractOptions = [
  { id: "1", name: "Bitcoin Masters", handle: "@bitcoinmasters321", avatar: "/man.jpg" },
  { id: "2", name: "Referrizer", handle: "@referrizerllc", avatar: "" },
  { id: "3", name: "Chris", handle: "@christheclient234", avatar: "/man.jpg" },
  { id: "4", name: "Referrizer", handle: "@referrizerllc", avatar: "" },
  { id: "5", name: "Bitcoin Masters", handle: "@bitcoinmasters321", avatar: "/man.jpg" },
  { id: "6", name: "Referrizer", handle: "@referrizerllc", avatar: "" },
  { id: "7", name: "Chris", handle: "@christheclient234", avatar: "/man.jpg" },
  { id: "8", name: "Referrizer", handle: "@referrizerllc", avatar: "" },
]

// Derive dynamic filter options from transaction data
const typeOptions = (() => {
  const types = new Set(transactions.map((t) => t.type))
  return Array.from(types)
    .map((t) => ({ value: t, label: TYPE_LABELS[t] || t }))
    .sort((a, b) => a.label.localeCompare(b.label))
})()

const contractOptions = (() => {
  const ids = new Set(transactions.map((t) => t.contractId).filter(Boolean))
  return allContractOptions.filter((c) => ids.has(c.id))
})()

const paymentMethodOptions = (() => {
  const seen = new Map<string, { name: string; detail: string }>()
  for (const t of transactions) {
    const key = `${t.paymentMethod}-${t.paymentDetail}`
    if (!seen.has(key)) {
      seen.set(key, { name: t.paymentMethod, detail: t.paymentDetail })
    }
  }
  return Array.from(seen.entries()).map(([key, val]) => ({
    id: key.toLowerCase().replace(/\s+/g, "-").replace(/\.\.\./g, ""),
    ...val,
  }))
})()

const PER_PAGE = 10

export function BillingTransactionsContent() {
  const [currentPage, setCurrentPage] = useState(1)
  const [searchValue, setSearchValue] = useState("")

  const [datePreset, setDatePreset] = useState("all time")
  const [dateRange, setDateRange] = useState<{ start: Date; end: Date }>()
  const [dateOpen, setDateOpen] = useState(false)
  const dateSnapshotRef = useRef<{ preset: string; range?: { start: Date; end: Date } }>({ preset: "all time" })

  const [selectedType, setSelectedType] = useState("all-types")
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState("")
  const [paymentMethodOpen, setPaymentMethodOpen] = useState(false)
  const [contractId, setContractId] = useState("")
  const [contractOpen, setContractOpen] = useState(false)
  const [contractQuery, setContractQuery] = useState("")
  const contractInputRef = useRef<HTMLInputElement>(null)
  const [selectedTxn, setSelectedTxn] = useState<Transaction | null>(null)
  const [copied, setCopied] = useState(false)
  const [sortColumn, setSortColumn] = useState<"date" | "amount" | null>(null)
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc")

  const handleSort = useCallback((column: "date" | "amount") => {
    if (sortColumn === column) {
      if (sortDirection === "asc") {
        setSortDirection("desc")
      } else {
        setSortColumn(null)
        setSortDirection("asc")
      }
    } else {
      setSortColumn(column)
      setSortDirection("asc")
    }
  }, [sortColumn, sortDirection])

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText("1234567890")
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [])

  const buildReceiptHtml = useCallback((txn: Transaction) => {
    const sign = txn.amount.startsWith("-") ? "-" : txn.amount.startsWith("+") ? "+" : ""
    const amountNum = txn.amount.split("$")[1] || "0.00"
    const txnType = TYPE_LABELS[txn.type] || txn.type

    return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Transaction Receipt</title>
<style>
  @page { size: letter; margin: 40px 48px; }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #1a1a2e; background: #fff; padding: 48px; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 32px; }
  .logo { display: flex; align-items: center; }
  .receipt-label { font-size: 11px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px; }
  .divider { height: 1px; background: #e5e7eb; margin: 24px 0; }
  .account-row { display: flex; justify-content: space-between; align-items: flex-start; }
  .account-label { font-size: 11px; color: #6b7280; }
  .account-value { font-size: 14px; font-weight: 600; color: #1a1a2e; }
  .txn-id-label { font-size: 12px; color: #6b7280; }
  .txn-id-value { font-size: 14px; font-weight: 600; color: #1a1a2e; }
  .paid-date { font-size: 12px; color: #1a1a2e; text-align: right; margin-top: 4px; }
  .amount-section { margin: 8px 0; }
  .amount { font-size: 34px; font-weight: 600; color: #1a1a2e; }
  .amount-sign { font-weight: 400; }
  .amount-type { font-size: 13px; color: #6b7280; margin-top: 4px; text-transform: capitalize; }
  .details-card { border: 1px solid #e5e7eb; border-radius: 8px; padding: 24px; margin-top: 16px; }
  .detail-group { margin-bottom: 20px; }
  .detail-group:last-child { margin-bottom: 0; }
  .detail-label { font-size: 12px; font-weight: 700; color: #1a1a2e; margin-bottom: 4px; }
  .detail-value { font-size: 14px; color: #6b7280; line-height: 1.5; }
  .reference { font-size: 12px; font-weight: 600; color: #6b7280; text-decoration: underline; }
  .disclaimer { font-size: 11px; color: #1a1a2e; font-weight: 300; line-height: 1.4; margin-top: 20px; }
  @media print { body { padding: 0; } }
</style></head><body>
  <div class="header">
    <div class="logo"><svg xmlns="http://www.w3.org/2000/svg" width="128" height="19" viewBox="0 0 147 22" fill="none"><path fill="#306CFE" d="M33.073 21.724c-1.368 0-2.578-.714-3.905-1.587a5.045 5.045 0 0 0-5.479-.048c-1.344.794-2.672 1.667-4.229 1.667h-.49a4.826 4.826 0 0 1-3.138-1.199 4.864 4.864 0 0 1-1.605-2.96l-.024-.683a5.057 5.057 0 0 1 .633-2.382l1.897-3.334 1.186 2.088-1.344 2.286a2.747 2.747 0 0 0 1.017 3.715c.412.239.879.364 1.354.366h.561c2.032-.04 3.336-2.382 6.886-2.382 3.415 0 4.743 2.421 6.64 2.421a2.364 2.364 0 0 0 2.109-1.158 2.388 2.388 0 0 0 .017-2.414L28.117 3.697a2.749 2.749 0 0 0-2.372-1.37 2.734 2.734 0 0 0-2.371 1.37l-2.846 4.93-1.186-2.08 2.198-3.874a4.818 4.818 0 0 1 1.76-1.776 4.79 4.79 0 0 1 6.58 1.776l7.043 12.391a4.467 4.467 0 0 1-1.638 6.066 4.42 4.42 0 0 1-2.211.594Z"/><path fill="#306CFE" d="M22.939 15.469c-.134-.318-7.186-12.702-7.233-12.773A4.816 4.816 0 0 0 13.946.92a4.791 4.791 0 0 0-6.58 1.776L.607 14.532A4.819 4.819 0 0 0 .655 19.3 4.792 4.792 0 0 0 2.4 21.038c.722.417 1.54.637 2.373.638h.498c1.581 0 2.885-.865 4.23-1.667a5.15 5.15 0 0 1 3.952-.58 6.173 6.173 0 0 1-.553-2.206 7.263 7.263 0 0 0-4.396.96c-6.031 3.51-7.114-.857-6.134-2.659L9.12 3.617a2.749 2.749 0 0 1 2.372-1.37 2.734 2.734 0 0 1 2.372 1.37l4.743 8.311.727 1.286c1.415 2.524 1.898 3.112 1.898 3.85.027.169.027.34 0 .508a12.14 12.14 0 0 1 2.039-1.08 4.435 4.435 0 0 0-.332-1.023Z" opacity=".5"/><path fill="#22376B" d="M69.174 9.084a.559.559 0 0 1 .356-.756c.529-.149 1.123-.27 1.78-.364a18.42 18.42 0 0 1 2.868-.216c.864 0 1.587.085 2.168.255.582.157 1.039.386 1.371.687.35.3.59.66.723 1.079.15.418.225.89.225 1.412 0 .576-.025 1.158-.075 1.747a30.01 30.01 0 0 0-.1 1.707c0 .563.025 1.112.075 1.648.02.22.055.436.103.647.092.41-.196.845-.618.845H76.7a.589.589 0 0 1-.549-.377l-.351-.909a.108.108 0 0 0-.184-.03c-.33.39-.785.73-1.364 1.021-.581.288-1.337.432-2.268.432a5.804 5.804 0 0 1-1.57-.196 3.905 3.905 0 0 1-1.197-.59 2.887 2.887 0 0 1-.773-.902 2.523 2.523 0 0 1-.274-1.177c0-.602.166-1.105.498-1.51.35-.42.84-.753 1.471-1.002.648-.261 1.413-.438 2.294-.53a19.853 19.853 0 0 1 2.991-.098c.116-.732.05-1.255-.2-1.57-.249-.326-.806-.49-1.67-.49-.648 0-1.338.053-2.069.157-.46.068-.87.149-1.227.244a.635.635 0 0 1-.756-.358l-.328-.806Zm3.882 6.728c.648 0 1.163-.11 1.545-.333.383-.236.665-.484.848-.746v-1.275a11.49 11.49 0 0 0-1.496-.02c-.465.026-.88.085-1.246.177-.366.091-.657.222-.873.392a.79.79 0 0 0-.324.648c0 .366.133.654.4.863.282.196.664.294 1.146.294ZM88.378 9.699c-.061.342-.403.554-.746.494a4.454 4.454 0 0 0-.764-.071c-.581 0-1.072.124-1.47.373-.35.216-.596.492-.737.829a.5.5 0 0 0-.036.193v5.65a.589.589 0 0 1-.589.588h-2.063a.589.589 0 0 1-.589-.589V8.533c0-.326.264-.59.589-.59h1.486c.263 0 .493.174.566.426l.25.87c.283-.484.765-.857 1.247-1.119.482-.261 1.047-.392 1.695-.392.288 0 .602.032.942.096a.558.558 0 0 1 .435.654l-.216 1.22ZM94.413 13.929a.588.588 0 0 0-.47-.236h-.578v3.473a.589.589 0 0 1-.59.589h-2.063a.589.589 0 0 1-.588-.589V5.562c0-.251.159-.474.396-.557l2.063-.715a.589.589 0 0 1 .782.557v7.276c.487-.179.91-.498 1.216-.918l2.24-3.078a.445.445 0 0 1 .36-.183h2.11c.495 0 .769.572.46.957l-2.822 3.517.698.765 2.675 3.634a.588.588 0 0 1-.474.938h-2.255a.589.589 0 0 1-.471-.236l-2.689-3.59ZM111.727 16.411c.177.276.095.644-.202.782-.421.196-.928.37-1.521.523-.848.209-1.753.313-2.717.313-2.011 0-3.482-.457-4.413-1.373-.93-.929-1.396-2.198-1.396-3.807 0-1.726.524-3.021 1.571-3.885 1.047-.863 2.518-1.295 4.412-1.295.632 0 1.247.066 1.845.196.598.131 1.13.347 1.595.648.466.3.84.706 1.122 1.216.283.51.424 1.145.424 1.904 0 .275-.025.569-.075.883-.061.582-.586.98-1.172.98h-6.481c.05.825.316 1.446.798 1.865.498.419 1.296.628 2.393.628.681 0 1.288-.079 1.82-.236.279-.086.523-.172.733-.259.295-.121.65-.038.822.23l.442.687Zm-4.316-6.701c-.847 0-1.479.203-1.894.608-.399.393-.64.922-.723 1.59h4.101c.304 0 .566-.233.544-.536-.033-.451-.177-.816-.432-1.093-.333-.38-.864-.57-1.596-.57ZM113.439 8.533c0-.326.264-.59.589-.59h1.132V6.529c0-.255.164-.482.407-.56l2.064-.667c.38-.123.769.16.769.56v2.083h2.453c.325 0 .588.263.588.589v.98a.588.588 0 0 1-.588.59H118.4v3.767c0 .68.083 1.17.249 1.471.183.288.516.432.998.432a3.912 3.912 0 0 0 1.077-.132c.327-.084.672.09.767.413l.246.845a.555.555 0 0 1-.363.696c-.321.097-.672.183-1.054.258a9.412 9.412 0 0 1-1.82.176c-1.147 0-1.994-.228-2.543-.686-.532-.471-.797-1.236-.797-2.296v-4.945h-1.132a.589.589 0 0 1-.589-.588v-.981ZM132.955 16.411c.177.276.095.644-.201.782-.421.196-.929.37-1.522.523a11.3 11.3 0 0 1-2.717.313c-2.011 0-3.482-.457-4.412-1.373-.931-.929-1.396-2.198-1.396-3.807 0-1.726.523-3.021 1.57-3.885 1.047-.863 2.518-1.295 4.412-1.295.632 0 1.247.066 1.845.196.598.131 1.13.347 1.596.648.465.3.839.706 1.121 1.216.283.51.424 1.145.424 1.904 0 .275-.025.569-.075.883-.061.582-.586.98-1.171.98h-6.482c.05.825.316 1.446.798 1.865.499.419 1.296.628 2.393.628.681 0 1.288-.079 1.82-.236.279-.086.523-.172.733-.259.295-.121.65-.038.822.23l.442.687ZM128.64 9.71c-.848 0-1.48.203-1.895.608-.399.393-.64.922-.723 1.59h4.101c.304 0 .567-.233.544-.536-.033-.451-.177-.816-.432-1.093-.332-.38-.864-.57-1.595-.57ZM146.387 20.277c0 .26-.171.49-.421.565l-2.064.613a.589.589 0 0 1-.756-.565v-3.979c-.282.34-.764.615-1.246.824-.482.196-1.105.294-1.87.294-1.545 0-2.734-.412-3.565-1.236-.814-.824-1.221-2.073-1.221-3.747 0-1.753.557-3.081 1.67-3.984 1.13-.902 2.742-1.354 4.836-1.354.449 0 .898.02 1.346.06.449.025.873.071 1.272.137.415.052.797.117 1.146.196.159.03.305.06.44.089a.56.56 0 0 1 .433.553v11.534Zm-5.484-4.406c.631 0 1.113-.111 1.445-.333.321-.205.571-.503.752-.895a.533.533 0 0 0 .046-.222v-4.3a2.772 2.772 0 0 0-.847-.195 8.776 8.776 0 0 0-1.072-.06c-.881 0-1.546.263-1.995.786-.432.523-.648 1.288-.648 2.296 0 .954.2 1.68.599 2.178.398.497.972.745 1.72.745ZM62.739 8.867l-4.434 6.114a.589.589 0 0 1-.477.243h-.501a.589.589 0 0 1-.472-.237l-4.454-5.96-.006 8.14a.589.589 0 0 1-.588.588h-2.064a.589.589 0 0 1-.589-.589V4.608c0-.325.264-.588.589-.588h2.236c.183 0 .357.085.468.232l5.278 6.936a.098.098 0 0 0 .159-.003l4.954-6.92a.589.589 0 0 1 .479-.245h2.2c.325 0 .589.263.589.588v12.558a.589.589 0 0 1-.589.589h-2.235a.589.589 0 0 1-.588-.592l.045-8.296Z"/></svg></div>
    <div class="receipt-label">Transaction Receipt</div>
  </div>
  <div class="divider"></div>
  <div class="account-row">
    <div>
      <div class="account-label">Account</div>
      <div class="account-value">${txn.paymentMethod} ${txn.paymentDetail}</div>
    </div>
    <div style="text-align:right">
      <div><span class="txn-id-label">Transaction ID </span><span class="txn-id-value">1234567890</span></div>
      <div class="paid-date">${txn.status === "Paid" ? "Paid on July 20th, 2026 at 10:30 AM" : "Processing"}</div>
    </div>
  </div>
  <div class="divider"></div>
  <div class="amount-section">
    <div class="amount"><span class="amount-sign">${sign}</span> $${amountNum}</div>
    <div class="amount-type">${txnType}</div>
  </div>
  <div class="details-card">
    <div class="detail-group">
      <div class="detail-label">Transaction Type</div>
      <div class="detail-value">${txnType}</div>
    </div>
    <div class="detail-group">
      <div class="detail-label">Description</div>
      <div class="detail-value">${txn.description}${txn.subtitle ? "<br/>" + txn.subtitle : ""}</div>
    </div>${txn.referenceId ? `
    <div class="detail-group">
      <div class="reference">${txn.referenceId}</div>
    </div>` : ""}${txn.status ? `
    <div class="detail-group">
      <div class="detail-label">Status</div>
      <div class="detail-value">${txn.status}</div>
    </div>` : ""}
  </div>
  <div class="disclaimer">Transaction details are provided for reference and may be preliminary or incomplete. They may not exactly match the final records shown on your official bank or account statements.</div>
</body></html>`
  }, [])

  const handleDownload = useCallback(async (txn: Transaction) => {
    if (!cachedLogoDataUrl) cachedLogoDataUrl = await svgToDataUrl()

    const sign = txn.amount.startsWith("-") ? "-" : txn.amount.startsWith("+") ? "+" : ""
    const amountNum = txn.amount.split("$")[1] || "0.00"
    const txnType = TYPE_LABELS[txn.type] || txn.type
    const paidLine = txn.status === "Paid" ? "Paid on July 20th, 2026 at 10:30 AM" : "Processing"

    const doc = new jsPDF({ unit: "pt", format: "letter" })
    const pw = doc.internal.pageSize.getWidth()
    const mx = 48
    let y = 48

    // Header - full color logo
    doc.addImage(cachedLogoDataUrl, "PNG", mx, y - 4, 128, 19)
    doc.setFontSize(9).setFont("helvetica", "normal").setTextColor(107, 114, 128)
    doc.text("TRANSACTION RECEIPT", pw - mx, y + 10, { align: "right" })

    // Divider
    y += 32
    doc.setDrawColor(229, 231, 235).setLineWidth(0.5).line(mx, y, pw - mx, y)

    // Account row
    y += 20
    doc.setFontSize(9).setTextColor(107, 114, 128)
    doc.text("Account", mx, y)
    y += 14
    doc.setFontSize(12).setFont("helvetica", "bold").setTextColor(26, 26, 46)
    doc.text(`${txn.paymentMethod} ${txn.paymentDetail}`, mx, y)

    // Transaction ID (right side)
    const txnIdValue = "1234567890"
    doc.setFontSize(10).setFont("helvetica", "bold").setTextColor(26, 26, 46)
    const idWidth = doc.getTextWidth(txnIdValue)
    doc.text(txnIdValue, pw - mx, y - 14, { align: "right" })
    doc.setFont("helvetica", "normal").setTextColor(107, 114, 128)
    doc.text("Transaction ID  ", pw - mx - idWidth, y - 14, { align: "right" })

    // Paid date
    doc.setFontSize(10).setFont("helvetica", "normal").setTextColor(26, 26, 46)
    doc.text(paidLine, pw - mx, y, { align: "right" })

    // Divider
    y += 20
    doc.setDrawColor(229, 231, 235).line(mx, y, pw - mx, y)

    // Amount
    y += 36
    doc.setFontSize(28).setFont("helvetica", "normal").setTextColor(26, 26, 46)
    const signWidth = sign ? doc.getTextWidth(`${sign} `) : 0
    if (sign) doc.text(`${sign} `, mx, y)
    doc.setFont("helvetica", "bold")
    doc.text(`$${amountNum}`, mx + signWidth, y)

    y += 18
    doc.setFontSize(11).setFont("helvetica", "normal").setTextColor(107, 114, 128)
    doc.text(txnType, mx, y)

    // Details card
    y += 24
    const cardX = mx
    const cardW = pw - mx * 2
    const cardTop = y
    let cardY = y + 20

    // Transaction Type
    doc.setFontSize(10).setFont("helvetica", "bold").setTextColor(26, 26, 46)
    doc.text("Transaction Type", cardX + 16, cardY)
    cardY += 14
    doc.setFont("helvetica", "normal").setTextColor(107, 114, 128)
    doc.text(txnType, cardX + 16, cardY)
    cardY += 24

    // Description
    doc.setFont("helvetica", "bold").setTextColor(26, 26, 46)
    doc.text("Description", cardX + 16, cardY)
    cardY += 14
    doc.setFont("helvetica", "normal").setTextColor(107, 114, 128)
    const descLines = doc.splitTextToSize(txn.description, cardW - 32)
    doc.text(descLines, cardX + 16, cardY)
    cardY += descLines.length * 14
    if (txn.subtitle) {
      doc.text(txn.subtitle, cardX + 16, cardY)
      cardY += 14
    }
    cardY += 10

    // Reference ID
    if (txn.referenceId) {
      doc.setFontSize(10).setFont("helvetica", "bold").setTextColor(107, 114, 128)
      doc.text(txn.referenceId, cardX + 16, cardY)
      cardY += 24
    }

    // Status
    if (txn.status) {
      doc.setFont("helvetica", "bold").setTextColor(26, 26, 46)
      doc.text("Status", cardX + 16, cardY)
      cardY += 14
      doc.setFont("helvetica", "normal").setTextColor(107, 114, 128)
      doc.text(txn.status, cardX + 16, cardY)
      cardY += 14
    }

    const cardBottom = cardY + 8
    doc.setDrawColor(229, 231, 235).setLineWidth(0.5)
    doc.roundedRect(cardX, cardTop, cardW, cardBottom - cardTop, 6, 6)

    // Disclaimer
    y = cardBottom + 16
    doc.setFontSize(9).setFont("helvetica", "normal").setTextColor(26, 26, 46)
    const disclaimerLines = doc.splitTextToSize(
      "Transaction details are provided for reference and may be preliminary or incomplete. They may not exactly match the final records shown on your official bank or account statements.",
      cardW
    )
    doc.text(disclaimerLines, mx, y)

    doc.save(`transaction-${txn.id}.pdf`)
  }, [])

  const handlePrint = useCallback((txn: Transaction) => {
    const html = buildReceiptHtml(txn)
    const iframe = document.createElement("iframe")
    iframe.style.position = "fixed"
    iframe.style.right = "0"
    iframe.style.bottom = "0"
    iframe.style.width = "0"
    iframe.style.height = "0"
    iframe.style.border = "none"
    document.body.appendChild(iframe)

    let printed = false
    const doPrint = () => {
      if (printed) return
      printed = true
      iframe.contentWindow?.focus()
      iframe.contentWindow?.print()
      setTimeout(() => {
        try { document.body.removeChild(iframe) } catch { /* already removed */ }
      }, 1000)
    }

    const doc = iframe.contentDocument || iframe.contentWindow?.document
    if (doc) {
      doc.open()
      doc.write(html)
      doc.close()
      iframe.onload = doPrint
      setTimeout(doPrint, 500)
    }
  }, [buildReceiptHtml])

  const selectedContract = contractOptions.find((c) => c.id === contractId)
  const filteredContracts = contractQuery.trim()
    ? contractOptions.filter(
        (c) =>
          c.name.toLowerCase().includes(contractQuery.toLowerCase()) ||
          c.handle.toLowerCase().includes(contractQuery.toLowerCase())
      )
    : contractOptions

  const dateLabel = datePreset
    .split(" ")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ")

  const hasActiveFilter =
    datePreset !== "all time" ||
    selectedType !== "all-types" ||
    !!selectedPaymentMethod ||
    !!contractId

  const clearAllFilters = () => {
    setDatePreset("all time")
    setDateRange(undefined)
    setSelectedType("all-types")
    setSelectedPaymentMethod("")
    setContractId("")
  }

  const sortedTransactions = React.useMemo(() => {
    let filtered = transactions

    // Date filter
    if (dateRange) {
      filtered = filtered.filter((txn) => {
        const txnDate = new Date(txn.date)
        return txnDate >= dateRange.start && txnDate <= dateRange.end
      })
    }

    // Type filter
    if (selectedType !== "all-types") {
      filtered = filtered.filter((txn) => txn.type === selectedType)
    }

    // Contract filter
    if (contractId) {
      filtered = filtered.filter((txn) => txn.contractId === contractId)
    }

    // Payment method filter
    if (selectedPaymentMethod) {
      const pm = paymentMethodOptions.find((p) => p.id === selectedPaymentMethod)
      if (pm) {
        filtered = filtered.filter((txn) => txn.paymentMethod === pm.name)
      }
    }

    // Search filter
    if (searchValue.trim()) {
      const q = searchValue.trim().toLowerCase()
      filtered = filtered.filter(
        (txn) =>
          txn.description.toLowerCase().includes(q) ||
          txn.amount.toLowerCase().includes(q) ||
          txn.date.toLowerCase().includes(q) ||
          txn.paymentMethod.toLowerCase().includes(q) ||
          (txn.referenceId && txn.referenceId.toLowerCase().includes(q)) ||
          (txn.status && txn.status.toLowerCase().includes(q))
      )
    }

    if (!sortColumn) return filtered
    const sorted = [...filtered].sort((a, b) => {
      if (sortColumn === "date") {
        return new Date(a.date).getTime() - new Date(b.date).getTime()
      }
      const amountA = parseFloat(a.amount.replace(/[^0-9.-]/g, ""))
      const amountB = parseFloat(b.amount.replace(/[^0-9.-]/g, ""))
      return amountA - amountB
    })
    return sortDirection === "desc" ? sorted.reverse() : sorted
  }, [sortColumn, sortDirection, searchValue, dateRange, selectedType, contractId, selectedPaymentMethod])

  const totalPages = Math.ceil(sortedTransactions.length / PER_PAGE)
  const paginatedTransactions = sortedTransactions.slice(
    (currentPage - 1) * PER_PAGE,
    currentPage * PER_PAGE
  )

  // Reset to page 1 when filters change and current page is out of bounds
  React.useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) setCurrentPage(1)
  }, [totalPages, currentPage])

  // Fixed layout: first 3 ... last 3 (matching Figma design)
  const pageNumbers = React.useMemo(() => {
    if (totalPages <= 6) return Array.from({ length: totalPages }, (_, i) => i + 1)
    const first3 = [1, 2, 3]
    const last3 = [totalPages - 2, totalPages - 1, totalPages]
    return [...first3, "..." as const, ...last3]
  }, [totalPages])

  return (
    <div className="space-y-5">
      <style>{`@keyframes fadeSlideIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }`}</style>
      {/* Filters + Search */}
      <div className="flex items-center justify-between gap-x-4">
        <div className="flex items-center gap-x-6">
          <div className="flex items-center gap-x-3">
            {/* All Time - Date Range Picker */}
            <Popover
              open={dateOpen}
              onOpenChange={(next) => {
                if (next) {
                  dateSnapshotRef.current = { preset: datePreset, range: dateRange }
                }
                setDateOpen(next)
              }}
            >
              <PopoverTrigger asChild>
                <Button
                  variant="outlined"
                  visual="gray"
                  size="sm"
                  className={FILTER_CHIP_CLASS}
                >
                  <Calendar className="size-4 text-gray-800" />
                  {dateLabel}
                </Button>
              </PopoverTrigger>
              <PopoverContent
                align="start"
                sideOffset={4}
                className="z-[80] w-auto border-0 bg-transparent p-0 shadow-none"
              >
                <DoubleCalendar
                  value={dateRange}
                  onValueChange={setDateRange}
                  preset={datePreset}
                  onPresetChange={setDatePreset}
                  onCancel={() => {
                    setDatePreset(dateSnapshotRef.current.preset)
                    setDateRange(dateSnapshotRef.current.range)
                    setDateOpen(false)
                  }}
                  onApply={(range, preset) => {
                    if (range) setDateRange(range)
                    setDatePreset(preset)
                    setDateOpen(false)
                  }}
                />
              </PopoverContent>
            </Popover>

            {/* All Types */}
            <Select value={selectedType} onValueChange={setSelectedType}>
              <SelectTrigger className={cn(FILTER_SELECT_CHIP_CLASS, "min-w-[100px]")}>
                <SelectValue placeholder="All Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all-types">All Types</SelectItem>
                {typeOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* All Contracts - with search */}
            <Popover
              open={contractOpen}
              onOpenChange={(next) => {
                setContractOpen(next)
                if (!next) setContractQuery("")
              }}
            >
              <PopoverTrigger asChild>
                <Button
                  variant="outlined"
                  visual="gray"
                  size="sm"
                  className={FILTER_CHIP_CLASS}
                >
                  {selectedContract?.name ?? "All Contracts"}
                  <ChevronDown className="size-4 text-gray-800" />
                </Button>
              </PopoverTrigger>
              <PopoverContent
                align="start"
                sideOffset={4}
                onOpenAutoFocus={(e) => {
                  e.preventDefault()
                  contractInputRef.current?.focus()
                }}
                className="z-[80] w-[200px] overflow-hidden rounded-lg border border-gray-100 bg-white p-0 shadow-[0px_12px_16px_-4px_rgba(16,24,40,0.08)]"
              >
                <div className="flex items-center gap-2 border-b border-gray-200 px-2.5 py-2 h-9">
                  <Search className="size-4 shrink-0 text-gray-400" />
                  <input
                    ref={contractInputRef}
                    className="m-0 h-5 w-full border-none bg-transparent p-0 text-sm text-gray-500/50 shadow-none outline-none ring-0 placeholder:text-gray-500/50 focus:text-gray-900 focus:border-transparent focus:outline-none focus:ring-0 focus:shadow-none"
                    placeholder="Find contracts"
                    value={contractQuery}
                    onChange={(e) => setContractQuery(e.target.value)}
                  />
                </div>
                <ScrollArea viewportClassName="max-h-[236px]">
                  <div className="py-1 flex flex-col gap-1">
                    {filteredContracts.length === 0 ? (
                      <p className="px-2.5 py-4 text-sm text-gray-400">No matches</p>
                    ) : (
                      filteredContracts.map((contract) => (
                        <button
                          key={contract.id}
                          type="button"
                          className={cn(
                            "flex w-full items-center gap-2 py-2.5 pl-2.5 pr-6 text-left hover:bg-gray-50",
                            contract.id === contractId && "bg-gray-50"
                          )}
                          onClick={() => {
                            setContractId(contract.id === contractId ? "" : contract.id)
                            setContractOpen(false)
                          }}
                        >
                          <Avatar className="size-8 border border-gray-200 shrink-0">
                            {contract.avatar ? (
                              <AvatarImage src={contract.avatar} alt={contract.name} />
                            ) : null}
                            <AvatarFallback className="text-xs">{contract.name[0]}</AvatarFallback>
                          </Avatar>
                          <div className="flex flex-col">
                            <span className="text-[13px] font-medium leading-[13px] text-gray-900">{contract.name}</span>
                            <span className="text-xs leading-5 text-gray-500">{contract.handle}</span>
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                </ScrollArea>
              </PopoverContent>
            </Popover>

            {/* All Payment Methods */}
            <Popover open={paymentMethodOpen} onOpenChange={setPaymentMethodOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outlined"
                  visual="gray"
                  size="sm"
                  className={FILTER_CHIP_CLASS}
                >
                  {paymentMethodOptions.find((p) => p.id === selectedPaymentMethod)?.name ?? "All Payment Methods"}
                  <ChevronDown className="size-4 text-gray-800" />
                </Button>
              </PopoverTrigger>
              <PopoverContent
                align="start"
                sideOffset={4}
                className="z-[80] w-[210px] rounded-lg border border-gray-100 bg-white p-0 shadow-[0px_12px_16px_-4px_rgba(16,24,40,0.08)]"
              >
                <div className="flex flex-col gap-1 py-1">
                  <button
                    type="button"
                    className="flex items-center justify-between gap-2 px-3 py-2.5 text-left hover:bg-gray-50"
                    onClick={() => {
                      setSelectedPaymentMethod("")
                      setPaymentMethodOpen(false)
                    }}
                  >
                    <span className="text-xs font-medium leading-[14px] text-gray-900 truncate">All Payment Methods</span>
                    {!selectedPaymentMethod && <Check1 className="size-4 text-primary-500" />}
                  </button>
                  {paymentMethodOptions.map((pm) => (
                    <button
                      key={pm.id}
                      type="button"
                      className="flex items-center justify-between gap-2 px-3 py-2.5 text-left hover:bg-gray-50"
                      onClick={() => {
                        setSelectedPaymentMethod(pm.id === selectedPaymentMethod ? "" : pm.id)
                        setPaymentMethodOpen(false)
                      }}
                    >
                      <span className="flex items-center gap-1 min-w-0 truncate">
                        <span className="text-xs font-medium leading-[14px] text-gray-900 shrink-0">{pm.name}</span>
                        <span className="text-xs font-normal leading-[14px] text-gray-500 truncate">{pm.detail}</span>
                      </span>
                      {pm.id === selectedPaymentMethod && <Check1 className="size-4 text-primary-500" />}
                    </button>
                  ))}
                </div>
              </PopoverContent>
            </Popover>
          </div>
          {hasActiveFilter && (
            <Button
              variant="link"
              size="sm"
              className="text-primary-500 font-semibold"
              onClick={clearAllFilters}
            >
              Clear All
            </Button>
          )}
        </div>

        <InputGroup className="group/search w-[220px] transition-all duration-300 focus-within:w-[375px]">
          <InputLeftElement>
            <SearchMd className="size-4 text-gray-400 transition-colors duration-300 group-hover/search:text-gray-500 group-focus-within/search:!text-primary-500" />
          </InputLeftElement>
          <Input
            placeholder="Find transactions"
            className="pl-9 pr-9 transition-[border-color,width] duration-300 hover:border-primary-200 hover:shadow-[0px_0px_0px_4px_#E1EAFF] focus:!ring-0 focus:!shadow-[0px_0px_0px_4px_#E1EAFF]"
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
          />
          {searchValue && (
            <InputRightElement>
              <button
                type="button"
                className="focus-visible:outline-none"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => setSearchValue("")}
              >
                <XCircle className="size-4 text-gray-500 opacity-50 hover:opacity-100" />
              </button>
            </InputRightElement>
          )}
        </InputGroup>
      </div>

      {sortedTransactions.length === 0 && (searchValue.trim() || hasActiveFilter) ? (
        <div key="empty" className="flex flex-col items-center px-6 py-[100px] gap-8 self-stretch" style={{ animation: "fadeSlideIn 300ms ease-out" }}>
          <div className="flex flex-col items-center gap-2 px-12 self-stretch">
            <h2 className="text-lg font-semibold leading-[22px] text-dark-blue-400 text-center self-stretch">
              0 Results{searchValue.trim() ? <> for &ldquo;{searchValue.trim()}&rdquo;</> : ""}
            </h2>
            <p className="text-sm font-normal leading-[150%] text-gray-500 text-center">
              We couldn&apos;t find any results for your {searchValue.trim() ? "search" : "selected filters"}.
              <br />
              Try adjusting your {searchValue.trim() ? "keywords or clearing your search" : "filters or clearing your selection"}.
            </p>
          </div>
          <button
            type="button"
            className="inline-flex items-center justify-center gap-2 px-3.5 py-2 bg-gray-200 rounded-[5px] text-sm font-semibold leading-5 text-dark-blue-400 transition-colors duration-300 hover:bg-gray-300"
            onClick={() => {
              setSearchValue("")
              clearAllFilters()
            }}
          >
            {searchValue.trim() ? "Clear Search" : "Clear Filters"}
          </button>
        </div>
      ) : (
      <div key="table" style={{ animation: "fadeSlideIn 300ms ease-out" }}>
      {/* Table */}
      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-xs">
      <Table>
        <TableHeader className="[&_tr]:border-t-0">
          <TableRow className="hover:bg-transparent">
            <TableHead
              className="w-[135px] cursor-pointer select-none group/sort"
              onClick={() => handleSort("date")}
            >
              <div className="inline-flex items-center gap-x-1">
                Date
                {sortColumn === "date" ? (
                  sortDirection === "asc" ? (
                    <ArrowUp className="h-4 w-4" />
                  ) : (
                    <ArrowDown className="h-4 w-4" />
                  )
                ) : (
                  <ArrowDown className="h-4 w-4 opacity-0 group-hover/sort:opacity-50 transition-opacity duration-300" />
                )}
              </div>
            </TableHead>
            <TableHead>Description</TableHead>
            <TableHead
              className="w-[230px] cursor-pointer select-none group/sort"
              onClick={() => handleSort("amount")}
            >
              <div className="inline-flex items-center gap-x-1">
                Amount
                {sortColumn === "amount" ? (
                  sortDirection === "asc" ? (
                    <ArrowUp className="h-4 w-4" />
                  ) : (
                    <ArrowDown className="h-4 w-4" />
                  )
                ) : (
                  <ArrowDown className="h-4 w-4 opacity-0 group-hover/sort:opacity-50 transition-opacity duration-300" />
                )}
              </div>
            </TableHead>
            <TableHead className="w-[75px]">Actions</TableHead>
            <TableHead className="w-[75px]" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {paginatedTransactions.map((txn) => (
            <TableRow key={txn.id} className="cursor-pointer" onClick={() => setSelectedTxn(txn)}>
              <TableCell className="h-[70px] py-0 align-middle">
                <span className="text-sm text-gray-600">{txn.date}</span>
              </TableCell>
              <TableCell className="h-[70px] py-0 align-middle">
                <p className="text-sm text-gray-600">{txn.description}</p>
                {(txn.subtitle || txn.referenceId) && (
                  <p className="text-sm text-gray-500">
                    {txn.subtitle}
                    {txn.subtitle && txn.referenceId && " - "}
                    {txn.referenceId && (
                      <span className="text-xs font-semibold leading-5 underline decoration-gray-500/30 text-gray-500 hover:decoration-gray-500 hover:text-gray-600 transition-colors duration-300 cursor-pointer">
                        {txn.referenceId}
                      </span>
                    )}
                  </p>
                )}
              </TableCell>
              <TableCell className="h-[70px] py-0 align-middle">
                <div className="flex items-center gap-x-3">
                  <span className="text-sm text-gray-600">{txn.amount}</span>
                  {txn.status && (
                    <Badge className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusStyles[txn.status]}`}>
                      {txn.status}
                    </Badge>
                  )}
                </div>
                <div className="mt-1 flex items-center gap-x-1">
                  <span className="text-xs font-medium text-dark-blue-400">
                    {txn.paymentMethod}
                  </span>
                  <span className="text-xs text-gray-400">
                    {txn.paymentDetail}
                  </span>
                </div>
              </TableCell>
              <TableCell className="h-[70px] w-[75px] py-0 align-middle text-center">
                <TooltipProvider delayDuration={200}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <IconButton variant="ghost" visual="gray" size="sm" className="group/icon rounded-full hover:bg-gray-200 transition-colors duration-300">
                        <File02 className="size-4 text-gray-400 group-hover/icon:text-gray-900 transition-colors duration-300" />
                      </IconButton>
                    </TooltipTrigger>
                    <TooltipContent visual="white">Invoice</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </TableCell>
              <TableCell className="h-[70px] w-[75px] py-0 align-middle text-center">
                <TooltipProvider delayDuration={200}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <IconButton
                        variant="ghost"
                        visual="gray"
                        size="sm"
                        className="group/icon rounded-full hover:bg-gray-200 transition-colors duration-300"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDownload(txn)
                        }}
                      >
                        <Download className="size-4 text-gray-400 group-hover/icon:text-gray-900 transition-colors duration-300" />
                      </IconButton>
                    </TooltipTrigger>
                    <TooltipContent visual="white">Download</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      </div>

      {/* Pagination - only show when more than 1 page */}
      {totalPages > 1 && (
      <div className="flex items-center justify-end gap-1 pt-5">
        {pageNumbers.map((page, i) =>
          page === "..." ? (
            <span key={`ellipsis-${i}`} className="size-10 flex items-center justify-center text-sm font-medium text-gray-600">
              ...
            </span>
          ) : (
            <Button
              key={page}
              variant={page === currentPage ? "outlined" : "ghost"}
              visual="gray"
              size="sm"
              className={
                page === currentPage
                  ? "size-10 min-w-10 rounded-lg bg-white border-gray-300 text-sm font-medium text-black"
                  : "size-10 min-w-10 rounded-lg text-sm font-medium text-gray-800"
              }
              onClick={() => setCurrentPage(page)}
            >
              {page}
            </Button>
          )
        )}
        <IconButton
          variant="outlined"
          visual="gray"
          size="sm"
          disabled={currentPage === totalPages}
          className={cn(
            "size-9 rounded-full border-gray-300 shadow-xs transition-colors duration-300",
            currentPage === totalPages
              ? "opacity-40 cursor-not-allowed"
              : "hover:bg-white hover:border-gray-400"
          )}
          onClick={() =>
            setCurrentPage((p) => Math.min(p + 1, totalPages))
          }
        >
          <ChevronRight className="size-5 text-gray-700" />
        </IconButton>
      </div>
      )}
      </div>
      )}

      {/* Transaction Details Dialog */}
      <Dialog open={!!selectedTxn} onOpenChange={(open) => !open && setSelectedTxn(null)}>
        <DialogContent className="w-[580px] max-w-[580px] p-0">
          <DialogHeader className="relative flex flex-row items-start px-6 py-6 border-b border-gray-200">
            <DialogTitle className="text-lg font-semibold leading-7 text-dark-blue-400">
              Transaction Details
            </DialogTitle>
            <DialogClose className="absolute right-2.5 top-2.5 flex size-9 items-center justify-center rounded-lg hover:bg-gray-100 focus:outline-none transition-colors duration-300">
              <XClose className="size-5 text-gray-500" />
            </DialogClose>
          </DialogHeader>

          {selectedTxn && (
            <div className="flex flex-col gap-3 overflow-y-auto p-6">
              {/* Account + Transaction ID */}
              <div className="flex items-center justify-between gap-6">
                <div className="flex items-center gap-3">
                  <div className="shrink-0">
                    <Bank className="size-10 text-dark-blue-400" strokeWidth={2.4} />
                  </div>
                  <div className="flex flex-col -space-y-1.5">
                    <span className="text-xs font-light leading-6 text-dark-blue-400">Account</span>
                    <div className="flex items-start gap-2">
                      <span className="text-sm font-bold leading-6 text-dark-blue-400">{selectedTxn.paymentMethod}</span>
                      <span className="text-sm font-bold leading-6 text-dark-blue-400">{selectedTxn.paymentDetail}</span>
                    </div>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-light leading-6 text-dark-blue-400">Transaction ID</span>
                      <span className="text-sm font-bold leading-6 text-dark-blue-400">1234567890</span>
                    </div>
                    <TooltipProvider delayDuration={200}>
                      <Tooltip open={copied || undefined}>
                        <TooltipTrigger asChild>
                          <button type="button" className="focus-visible:outline-none" onClick={handleCopy}>
                            <span className="relative block size-5">
                              <Copy03 className={cn("absolute inset-0 size-5 text-dark-blue-400 transition-opacity duration-300", copied ? "opacity-0" : "opacity-100")} strokeWidth={1.2} />
                              <Check1 className={cn("absolute inset-0 size-5 text-success-500 transition-opacity duration-300", copied ? "opacity-100" : "opacity-0")} strokeWidth={1.2} />
                            </span>
                          </button>
                        </TooltipTrigger>
                        <TooltipContent visual="white">{copied ? "Copied" : "Copy"}</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                  <p className="text-[13px] leading-4 text-dark-blue-400">
                    {selectedTxn.status === "Paid"
                      ? "Paid on July 20th, 2026 at 10:30 AM"
                      : "Processing"}
                  </p>
                </div>
              </div>

              {/* Divider */}
              <div className="h-px w-full bg-gray-200" />

              {/* Amount + Actions */}
              <div className="flex items-center justify-between gap-1">
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-[2.89px]">
                    <span className="text-[34px] font-normal leading-[41px] text-dark-blue-400">
                      {selectedTxn.amount.startsWith("-") ? "-" : selectedTxn.amount.startsWith("+") ? "+" : ""}
                    </span>
                    <span className="text-[34px] font-semibold leading-[41px] text-dark-blue-400">
                      ${selectedTxn.amount.split("$")[1] || "0.00"}
                    </span>
                  </div>
                  <span className="text-[13px] font-normal leading-4 text-gray-500">
                    {TYPE_LABELS[selectedTxn.type] || selectedTxn.type}
                  </span>
                </div>
                <TooltipProvider delayDuration={200}>
                  <div className="flex items-center gap-2">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <IconButton
                          variant="outlined"
                          visual="gray"
                          className="size-[38px] rounded-full border-gray-200"
                          onClick={() => selectedTxn && handlePrint(selectedTxn)}
                        >
                          <Printer className="size-[18px] text-gray-500" />
                        </IconButton>
                      </TooltipTrigger>
                      <TooltipContent visual="white">Print</TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <IconButton
                          variant="outlined"
                          visual="gray"
                          className="size-10 rounded-full border-gray-200"
                          onClick={() => selectedTxn && handleDownload(selectedTxn)}
                        >
                          <Download className="size-[18px] text-gray-500" />
                        </IconButton>
                      </TooltipTrigger>
                      <TooltipContent visual="white">Download</TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <IconButton variant="outlined" visual="gray" className="size-10 rounded-full border-gray-200">
                          <Share06 className="size-[18px] text-gray-500" />
                        </IconButton>
                      </TooltipTrigger>
                      <TooltipContent visual="white">Share</TooltipContent>
                    </Tooltip>
                  </div>
                </TooltipProvider>
              </div>

              {/* Details Card */}
              <div className="rounded-lg border border-gray-200 bg-white p-6 space-y-6">
                <div className="flex flex-col gap-1">
                  <p className="text-xs font-bold leading-[15px] text-dark-blue-400">Transaction Type</p>
                  <p className="text-sm font-normal leading-5 text-gray-500">
                    {TYPE_LABELS[selectedTxn.type] || selectedTxn.type}
                  </p>
                </div>
                <div className="flex flex-col gap-1">
                  <p className="text-xs font-bold leading-[15px] text-dark-blue-400">Description</p>
                  <div className="flex flex-col">
                    <p className="text-sm font-normal leading-5 text-gray-500">
                      {selectedTxn.description}
                    </p>
                    {selectedTxn.subtitle && (
                      <p className="text-sm font-normal leading-5 text-gray-500">
                        {selectedTxn.subtitle}
                      </p>
                    )}
                  </div>
                </div>
                {selectedTxn.referenceId && (
                  <button type="button" className="text-xs font-semibold leading-5 text-gray-500 text-left underline decoration-gray-500/30 hover:decoration-gray-500 hover:text-gray-600 transition-colors duration-300">
                    {selectedTxn.referenceId}
                  </button>
                )}
              </div>

              {/* Disclaimer + Report */}
              <div className="flex flex-col items-center gap-3">
                <p className="text-xs font-light leading-[15px] text-dark-blue-400">
                  Transaction details are provided for reference and may be preliminary or incomplete. They may not exactly match the final records shown on your official bank or account statements.
                </p>
                <Button
                  variant="outlined"
                  visual="gray"
                  size="sm"
                  className="w-full rounded-[5px] border-gray-300 px-3.5 py-2 text-sm font-semibold text-gray-800 shadow-xs"
                >
                  Report a Problem
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
