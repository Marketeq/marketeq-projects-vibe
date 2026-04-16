"use client"

import { useState } from "react"
import { cn } from "@/utils/functions"
import AuthenticatedRoute from "@/hoc/AuthenticatedRoute"
import { LeftSidebar } from "@/components/talent-dashboard-comps"
import {
  ArrowDown,
  Bank,
  Calendar,
  ChevronDown,
  ChevronRight,
  Copy,
  Download,
  HelpCircle,
  Printer,
  Search,
  Settings02,
  Share06,
  X,
  XCircle,
} from "@blend-metrics/icons"
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  Badge,
  Button,
  Dialog,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DoubleCalendar,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  IconButton,
  Input,
  InputGroup,
  InputLeftElement,
  Popover,
  PopoverContent,
  PopoverTrigger,
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
} from "@/components/ui"

// ─── Types ─────────────────────────────────────────────────────────────

type TransactionStatus =
  | "Paid"
  | "Processing"
  | "Scheduled"
  | "Payment Pending"
  | "Failed"
  | "Overdue"

type TransactionType =
  | "Daily installment"
  | "Refund issued"
  | "Credit applied"
  | "Deposit"
  | "Final Payment"
  | "Paid-In-Full"
  | "Wire Transfer Fee"
  | "Purchase"
  | "Basic Membership"
  | "Ledger Correction"
  | "Hourly Payment"

type InvoiceStatus =
  | "Paid"
  | "Processing"
  | "Scheduled"
  | "Payment Pending"
  | "Failed"
  | "Overdue"

interface Transaction {
  date: string
  type: TransactionType
  description: string
  descriptionSub: string
  invoiceId: string | null
  transactionId: string
  amount: string
  status: TransactionStatus | null
  method: string
  methodNum: string
  paidDate: string
  contract: string
}

interface Invoice {
  dateIssued: string
  invoiceId: string
  description: string
  dueDate: string
  status: InvoiceStatus
  amount: string
  contract: string
}

// ─── Mock Data ──────────────────────────────────────────────────────────

const TRANSACTIONS_DATA: Transaction[] = [
  {
    date: "April 2, 2025",
    type: "Daily installment",
    description: 'Monthly installment for "UX Audit Project"',
    descriptionSub: "November 2025",
    invoiceId: "#34567",
    transactionId: "1234567890",
    amount: "- $515.00",
    status: "Processing",
    method: "Chase Bank",
    methodNum: "...4553",
    paidDate: "July 20th, 2026 at 10:30 AM",
    contract: "Project",
  },
  {
    date: "April 1, 2025",
    type: "Hourly Payment",
    description: 'Hourly Payment for "Chris @uxdesign_231"',
    descriptionSub: "40 hours",
    invoiceId: "#34567",
    transactionId: "1234567891",
    amount: "- $515.00",
    status: "Paid",
    method: "American Express",
    methodNum: "...8287",
    paidDate: "July 19th, 2026 at 2:15 PM",
    contract: "Chris @uxdesign_231",
  },
  {
    date: "April 1, 2025",
    type: "Refund issued",
    description: 'Refund issued for "UX Audit Project"',
    descriptionSub: "November 2025",
    invoiceId: null,
    transactionId: "1234567892",
    amount: "+ $515.00",
    status: null,
    method: "Chase Bank",
    methodNum: "...4553",
    paidDate: "July 19th, 2026 at 11:00 AM",
    contract: "Project",
  },
  {
    date: "April 1, 2025",
    type: "Daily installment",
    description: 'Monthly installment for "UX Audit Project"',
    descriptionSub: "November 2025",
    invoiceId: "#34567",
    transactionId: "1234567893",
    amount: "- $515.00",
    status: "Paid",
    method: "Chase Bank",
    methodNum: "...4553",
    paidDate: "July 18th, 2026 at 9:45 AM",
    contract: "Project",
  },
  {
    date: "Mar 31, 2025",
    type: "Paid-In-Full",
    description: 'Paid-In-Full for "Chris @uxdesign_231"',
    descriptionSub: "6 months",
    invoiceId: "#34567",
    transactionId: "1234567894",
    amount: "- $515.00",
    status: "Paid",
    method: "Chase Bank",
    methodNum: "...4553",
    paidDate: "July 17th, 2026 at 3:30 PM",
    contract: "Chris @uxdesign_231",
  },
  {
    date: "Mar 31, 2025",
    type: "Wire Transfer Fee",
    description: 'Wire Transfer Fee for "UX Audit Project"',
    descriptionSub: "November 2025",
    invoiceId: "#34567",
    transactionId: "1234567895",
    amount: "- $515.00",
    status: "Paid",
    method: "American Express",
    methodNum: "...8287",
    paidDate: "July 16th, 2026 at 1:00 PM",
    contract: "Project",
  },
  {
    date: "Mar 31, 2025",
    type: "Final Payment",
    description: 'Final Payment for "Chris @uxdesign_231"',
    descriptionSub: "12 hours",
    invoiceId: "#34567",
    transactionId: "1234567896",
    amount: "- $515.00",
    status: "Paid",
    method: "American Express",
    methodNum: "...8287",
    paidDate: "July 15th, 2026 at 10:00 AM",
    contract: "Chris @uxdesign_231",
  },
]

const INVOICES_DATA: Invoice[] = [
  {
    dateIssued: "April 2, 2025",
    invoiceId: "INV-2023-001",
    description: 'Monthly installment for "UX Audit Project" November 2025',
    dueDate: "Jan 9th, 2025",
    status: "Processing",
    amount: "$55,000",
    contract: "Project",
  },
  {
    dateIssued: "April 1, 2025",
    invoiceId: "INV-2023-002",
    description: 'Monthly installment for "UX Audit Project" November 2025',
    dueDate: "Jan 9th, 2025",
    status: "Paid",
    amount: "$55,000",
    contract: "Project",
  },
  {
    dateIssued: "April 1, 2025",
    invoiceId: "INV-2023-003",
    description: 'Monthly installment for "UX Audit Project" November 2025',
    dueDate: "Jan 9th, 2025",
    status: "Paid",
    amount: "$55,000",
    contract: "Project",
  },
  {
    dateIssued: "April 1, 2025",
    invoiceId: "INV-2023-004",
    description: 'Monthly installment for "UX Audit Project" November 2025',
    dueDate: "Jan 9th, 2025",
    status: "Payment Pending",
    amount: "$55,000",
    contract: "Service",
  },
  {
    dateIssued: "Mar 31, 2025",
    invoiceId: "INV-2023-005",
    description: 'Monthly installment for "UX Audit Project" November 2025',
    dueDate: "Jan 9th, 2025",
    status: "Paid",
    amount: "$55,000",
    contract: "Team",
  },
  {
    dateIssued: "Mar 31, 2025",
    invoiceId: "INV-2023-006",
    description: 'Monthly installment for "UX Audit Project" November 2025',
    dueDate: "Jan 9th, 2025",
    status: "Overdue",
    amount: "$55,000",
    contract: "Project",
  },
  {
    dateIssued: "Mar 31, 2025",
    invoiceId: "INV-2023-007",
    description: 'Monthly installment for "UX Audit Project" November 2025',
    dueDate: "Jan 9th, 2025",
    status: "Paid",
    amount: "$55,000",
    contract: "Project",
  },
]

const CONTRACTS_DATA = [
  { name: "Bitcoin Masters", handle: "@bitcoinmasters321", avatar: "" },
  { name: "Referrizer", handle: "@referrizerllc", avatar: "" },
  { name: "Chris", handle: "@christheclient234", avatar: "" },
  { name: "Referrizer", handle: "@referrizerllc", avatar: "" },
]

const PAYMENT_METHODS = [
  "Chase Bank  ...4553",
  "American Express  ...8287",
  "Klarna  ...123@email.com",
  "Google Pay  ...123@email.com",
  "Apple Pay  ...123@email.com",
]

const TRANSACTION_TYPES = [
  "All Types",
  "Project Payments",
  "Service Payments",
  "Team Payments",
  "Refunds",
  "Credit Issued",
  "Funds Added",
  "Adjustments",
  "Withdrawals",
]

const INVOICE_STATUSES = [
  "All Statuses",
  "Paid",
  "Processing",
  "Scheduled",
  "Payment Pending",
  "Failed",
  "Overdue",
]

// ─── Pagination ─────────────────────────────────────────────────────────

const Pagination = ({
  currentPage,
  onPageChange,
}: {
  currentPage: number
  onPageChange: (page: number) => void
}) => (
  <div className="flex items-center justify-end gap-1 py-5">
    {[1, 2, 3, "...", 8, 9, 10].map((page, i) => (
      <button
        key={i}
        className={cn(
          "size-8 rounded-md text-sm font-medium flex items-center justify-center",
          page === currentPage
            ? "border border-gray-300 text-dark-blue-400 bg-white"
            : "text-gray-500 hover:bg-gray-100"
        )}
        onClick={() => typeof page === "number" && onPageChange(page)}
      >
        {page}
      </button>
    ))}
    <button
      className="size-8 rounded-md text-sm font-medium flex items-center justify-center text-gray-500 hover:bg-gray-100"
      onClick={() => onPageChange(Math.min(currentPage + 1, 10))}
    >
      <ChevronRight className="size-4" />
    </button>
  </div>
)

// ─── Status Badge ───────────────────────────────────────────────────────

const STATUS_VISUAL: Record<string, "success" | "primary" | "error" | "warning" | "orange" | "gray"> = {
  Paid: "success",
  Processing: "primary",
  Failed: "error",
  Overdue: "error",
  "Payment Pending": "warning",
  Scheduled: "gray",
}

const StatusBadge = ({ status }: { status: string }) => (
  <Badge
    className="rounded-full font-medium"
    visual={STATUS_VISUAL[status] ?? "gray"}
    size="sm"
  >
    {status}
  </Badge>
)

// ─── Filter Dropdown ────────────────────────────────────────────────────

const FilterDropdown = ({
  icon,
  label,
  items,
  value,
  onSelect,
}: {
  icon?: React.ReactNode
  label: string
  items: string[]
  value: string
  onSelect: (val: string) => void
}) => (
  <DropdownMenu>
    <DropdownMenuTrigger asChild>
      <button className="inline-flex items-center gap-x-2 rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-dark-blue-400 hover:bg-gray-50">
        {icon}
        {value || label}
        <ChevronDown className="size-3.5 text-gray-400" />
      </button>
    </DropdownMenuTrigger>
    <DropdownMenuContent align="start" className="min-w-[180px]">
      {items.map((item) => (
        <DropdownMenuItem key={item} onClick={() => onSelect(item)}>
          {item}
        </DropdownMenuItem>
      ))}
    </DropdownMenuContent>
  </DropdownMenu>
)

// ─── Contracts Filter ───────────────────────────────────────────────────

const ContractsFilter = ({
  value,
  onSelect,
}: {
  value: string
  onSelect: (val: string) => void
}) => {
  const [contractSearch, setContractSearch] = useState("")

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button className="inline-flex items-center gap-x-2 rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-dark-blue-400 hover:bg-gray-50">
          {value || "All Contracts"}
          <ChevronDown className="size-3.5 text-gray-400" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[260px] rounded-lg border border-gray-100 bg-white p-0 shadow-lg"
        align="start"
      >
        <div className="border-b border-gray-100 p-2">
          <InputGroup className="w-full">
            <InputLeftElement>
              <Search className="size-4 text-gray-400" />
            </InputLeftElement>
            <Input
              placeholder="Find contracts"
              className="pl-9 h-9 text-sm border-0 shadow-none focus:ring-0"
              value={contractSearch}
              onChange={(e) => setContractSearch(e.target.value)}
            />
          </InputGroup>
        </div>
        <div className="max-h-[240px] overflow-y-auto p-1">
          <button
            className="flex w-full items-center gap-x-3 rounded-md px-3 py-2 text-sm text-dark-blue-400 hover:bg-gray-50"
            onClick={() => {
              onSelect("All Contracts")
              setContractSearch("")
            }}
          >
            All Contracts
          </button>
          {CONTRACTS_DATA.filter(
            (c) =>
              !contractSearch ||
              c.name.toLowerCase().includes(contractSearch.toLowerCase()) ||
              c.handle.toLowerCase().includes(contractSearch.toLowerCase())
          ).map((contract, i) => (
            <button
              key={i}
              className="flex w-full items-center gap-x-3 rounded-md px-3 py-2 hover:bg-gray-50"
              onClick={() => {
                onSelect(contract.name)
                setContractSearch("")
              }}
            >
              <Avatar size="sm">
                <AvatarImage src={contract.avatar} />
                <AvatarFallback>
                  {contract.name.charAt(0)}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col items-start">
                <span className="text-sm font-medium text-dark-blue-400">
                  {contract.name}
                </span>
                <span className="text-xs text-gray-500">
                  {contract.handle}
                </span>
              </div>
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  )
}

// ─── Date Range Filter ──────────────────────────────────────────────────

const DateRangeFilter = () => (
  <Popover>
    <PopoverTrigger asChild>
      <button className="inline-flex items-center gap-x-2 rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-dark-blue-400 hover:bg-gray-50">
        <Calendar className="size-4 text-gray-500" />
        All Time
        <ChevronDown className="size-3.5 text-gray-400" />
      </button>
    </PopoverTrigger>
    <PopoverContent
      className="w-auto p-0 border-0 shadow-none"
      align="start"
    >
      <DoubleCalendar />
    </PopoverContent>
  </Popover>
)

// ─── Payment Methods Filter ─────────────────────────────────────────────

const PaymentMethodsFilter = ({
  value,
  onSelect,
}: {
  value: string
  onSelect: (val: string) => void
}) => (
  <DropdownMenu>
    <DropdownMenuTrigger asChild>
      <button className="inline-flex items-center gap-x-2 rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-dark-blue-400 hover:bg-gray-50">
        {value || "All Payment Methods"}
        <ChevronDown className="size-3.5 text-gray-400" />
      </button>
    </DropdownMenuTrigger>
    <DropdownMenuContent align="start" className="min-w-[220px]">
      <DropdownMenuItem onClick={() => onSelect("All Payment Methods")}>
        All Payment Methods
      </DropdownMenuItem>
      {PAYMENT_METHODS.map((method) => (
        <DropdownMenuItem key={method} onClick={() => onSelect(method)}>
          {method}
        </DropdownMenuItem>
      ))}
    </DropdownMenuContent>
  </DropdownMenu>
)

// ─── Transaction Details Modal ──────────────────────────────────────────

const TransactionDetailsModal = ({
  transaction,
  open,
  onClose,
}: {
  transaction: Transaction | null
  open: boolean
  onClose: () => void
}) => {
  if (!transaction) return null

  return (
    <Dialog open={open} onOpenChange={(val) => !val && onClose()}>
      <DialogContent className="max-w-[540px]">
        {/* Header */}
        <DialogHeader className="flex-row gap-x-2">
          <DialogTitle className="flex-grow text-dark-blue-400">
            Transaction Details
          </DialogTitle>
          <DialogClose asChild>
            <IconButton
              className="h-7 w-7 text-gray-500"
              visual="gray"
              variant="ghost"
            >
              <X className="size-[18px]" />
            </IconButton>
          </DialogClose>
        </DialogHeader>

        {/* Account & Transaction ID */}
        <div className="mt-6 flex items-center justify-between">
          <div className="flex items-center gap-x-3">
            <div className="flex size-10 items-center justify-center rounded-lg border border-gray-200">
              <Bank className="size-5 text-dark-blue-400" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Account</p>
              <p className="text-sm font-semibold text-dark-blue-400">
                {transaction.method}  {transaction.methodNum}
              </p>
            </div>
          </div>
          <div className="text-right">
            <div className="flex items-center gap-x-2">
              <span className="text-xs text-gray-500">Transaction ID</span>
              <span className="text-sm font-semibold text-dark-blue-400">
                {transaction.transactionId}
              </span>
              <button className="text-gray-400 hover:text-gray-600">
                <Copy className="size-3.5" />
              </button>
            </div>
            <p className="text-xs text-gray-500">
              {transaction.status === "Paid" ? "Paid" : "Processed"} on{" "}
              {transaction.paidDate}
            </p>
          </div>
        </div>

        {/* Amount & Actions */}
        <div className="mt-6 flex items-start justify-between">
          <div>
            <p className="text-3xl font-semibold text-dark-blue-400">
              {transaction.amount}
            </p>
            <p className="mt-1 text-sm text-gray-500">
              {transaction.type === "Daily installment"
                ? "Monthly Installment"
                : transaction.type}
            </p>
          </div>
          <div className="flex items-center gap-x-2">
            <IconButton
              variant="outlined"
              visual="gray"
              size="sm"
              className="rounded-full"
            >
              <Printer className="size-4" />
            </IconButton>
            <IconButton
              variant="outlined"
              visual="gray"
              size="sm"
              className="rounded-full"
            >
              <Download className="size-4" />
            </IconButton>
            <IconButton
              variant="outlined"
              visual="gray"
              size="sm"
              className="rounded-full"
            >
              <Share06 className="size-4" />
            </IconButton>
          </div>
        </div>

        {/* Divider */}
        <div className="my-5 border-t border-gray-200" />

        {/* Details Card */}
        <div className="rounded-lg border border-gray-200 p-5 space-y-4">
          <div>
            <p className="text-sm font-semibold text-dark-blue-400">
              Transaction Type
            </p>
            <p className="text-sm text-gray-500">
              {transaction.type === "Daily installment"
                ? "Installment Payment"
                : transaction.type}
            </p>
          </div>
          <div>
            <p className="text-sm font-semibold text-dark-blue-400">
              Description
            </p>
            <p className="text-sm text-gray-500">{transaction.description}</p>
            <p className="text-sm text-gray-500">{transaction.descriptionSub}</p>
          </div>
          {transaction.invoiceId && (
            <div>
              <span className="text-sm font-semibold text-dark-blue-400 underline cursor-pointer">
                Invoice {transaction.invoiceId}
              </span>
            </div>
          )}
        </div>

        {/* Disclaimer */}
        <p className="mt-5 text-xs text-gray-500">
          Transaction details are provided for reference and may be preliminary
          or incomplete. They may not exactly match the final records shown on
          your official bank or account statements.
        </p>

        {/* Report */}
        <Button
          variant="outlined"
          visual="gray"
          className="mt-4 w-full font-semibold"
        >
          Report a Problem
        </Button>
      </DialogContent>
    </Dialog>
  )
}

// ─── Transactions Tab ───────────────────────────────────────────────────

const TransactionsTab = () => {
  const [currentPage, setCurrentPage] = useState(1)
  const [search, setSearch] = useState("")
  const [typeFilter, setTypeFilter] = useState("All Types")
  const [contractFilter, setContractFilter] = useState("All Contracts")
  const [methodFilter, setMethodFilter] = useState("All Payment Methods")
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null)

  const clearAll = () => {
    setTypeFilter("All Types")
    setContractFilter("All Contracts")
    setMethodFilter("All Payment Methods")
    setSearch("")
  }

  return (
    <div className="space-y-5">
      {/* Filters */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          <DateRangeFilter />
          <FilterDropdown
            label="All Types"
            items={TRANSACTION_TYPES}
            value={typeFilter}
            onSelect={setTypeFilter}
          />
          <ContractsFilter
            value={contractFilter === "All Contracts" ? "" : contractFilter}
            onSelect={setContractFilter}
          />
          <PaymentMethodsFilter
            value={
              methodFilter === "All Payment Methods" ? "" : methodFilter
            }
            onSelect={setMethodFilter}
          />
          <button
            className="text-sm font-medium text-primary-500 hover:text-primary-600 ml-1"
            onClick={clearAll}
          >
            Clear All
          </button>
        </div>

        <InputGroup className="w-[220px]">
          <InputLeftElement>
            <Search className="size-4 text-gray-400" />
          </InputLeftElement>
          <Input
            placeholder="Find transactions"
            className="pl-9 h-9 text-sm"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </InputGroup>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-xs">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[160px]">
                <span className="inline-flex items-center gap-x-1">
                  Date
                  <ArrowDown className="size-3.5" />
                </span>
              </TableHead>
              <TableHead>Description</TableHead>
              <TableHead className="w-[220px]">Amount</TableHead>
              <TableHead className="text-center w-[100px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {TRANSACTIONS_DATA.filter((tx) => {
              if (!search) return true
              const q = search.toLowerCase()
              return (
                tx.description.toLowerCase().includes(q) ||
                tx.descriptionSub.toLowerCase().includes(q) ||
                tx.amount.toLowerCase().includes(q) ||
                tx.method.toLowerCase().includes(q) ||
                tx.date.toLowerCase().includes(q) ||
                (tx.invoiceId && tx.invoiceId.toLowerCase().includes(q))
              )
            }).map((tx, i) => (
              <TableRow
                key={i}
                className="cursor-pointer"
                onClick={() => setSelectedTx(tx)}
              >
                <TableCell className="text-sm text-dark-blue-400">
                  {tx.date}
                </TableCell>
                <TableCell>
                  <div className="flex flex-col">
                    <span className="text-sm text-dark-blue-400">
                      {tx.description}
                    </span>
                    <span className="text-sm text-gray-500">
                      {tx.descriptionSub}
                      {tx.invoiceId && (
                        <>
                          {" - "}
                          <span className="underline cursor-pointer hover:text-primary-500">
                            Invoice {tx.invoiceId}
                          </span>
                        </>
                      )}
                    </span>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex flex-col">
                    <span className="inline-flex items-center gap-x-2">
                      <span className="text-sm font-medium text-dark-blue-400">
                        {tx.amount}
                      </span>
                      {tx.status && <StatusBadge status={tx.status} />}
                    </span>
                    <span className="text-xs text-gray-500">
                      {tx.method} {tx.methodNum}
                    </span>
                  </div>
                </TableCell>
                <TableCell>
                  <div
                    className="flex items-center justify-center gap-x-2"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <IconButton variant="ghost" visual="gray" size="sm">
                      <Copy className="size-4" />
                    </IconButton>
                    <IconButton variant="ghost" visual="gray" size="sm">
                      <Download className="size-4" />
                    </IconButton>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Pagination currentPage={currentPage} onPageChange={setCurrentPage} />

      {/* Transaction Details Modal */}
      <TransactionDetailsModal
        transaction={selectedTx}
        open={!!selectedTx}
        onClose={() => setSelectedTx(null)}
      />
    </div>
  )
}

// ─── Invoices Tab ───────────────────────────────────────────────────────

const InvoicesTab = () => {
  const [currentPage, setCurrentPage] = useState(1)
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("All Statuses")
  const [contractFilter, setContractFilter] = useState("All Contracts")

  const clearAll = () => {
    setStatusFilter("All Statuses")
    setContractFilter("All Contracts")
    setSearch("")
  }

  return (
    <div className="space-y-5">
      {/* Filters */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          <DateRangeFilter />
          <FilterDropdown
            label="All Statuses"
            items={INVOICE_STATUSES}
            value={statusFilter}
            onSelect={setStatusFilter}
          />
          <ContractsFilter
            value={contractFilter === "All Contracts" ? "" : contractFilter}
            onSelect={setContractFilter}
          />
          <button
            className="text-sm font-medium text-primary-500 hover:text-primary-600 ml-1"
            onClick={clearAll}
          >
            Clear All
          </button>
        </div>

        <InputGroup className="w-[220px]">
          <InputLeftElement>
            <Search className="size-4 text-gray-400" />
          </InputLeftElement>
          <Input
            placeholder="Find invoices"
            className="pl-9 h-9 text-sm"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </InputGroup>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-xs">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[140px]">
                <span className="inline-flex items-center gap-x-1">
                  Date Issued
                  <ArrowDown className="size-3.5" />
                </span>
              </TableHead>
              <TableHead className="w-[140px]">Invoice ID</TableHead>
              <TableHead>Description</TableHead>
              <TableHead className="w-[130px]">Due Date</TableHead>
              <TableHead className="w-[140px]">Status</TableHead>
              <TableHead className="text-right w-[100px]">Amount</TableHead>
              <TableHead className="text-center w-[100px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {INVOICES_DATA.filter((inv) => {
              if (!search) return true
              const q = search.toLowerCase()
              return (
                inv.description.toLowerCase().includes(q) ||
                inv.invoiceId.toLowerCase().includes(q) ||
                inv.amount.toLowerCase().includes(q) ||
                inv.dateIssued.toLowerCase().includes(q) ||
                inv.status.toLowerCase().includes(q)
              )
            }).map((inv, i) => (
              <TableRow key={i}>
                <TableCell className="text-sm text-dark-blue-400">
                  {inv.dateIssued}
                </TableCell>
                <TableCell>
                  <span className="text-sm text-primary-500 underline cursor-pointer hover:text-primary-600">
                    {inv.invoiceId}
                  </span>
                </TableCell>
                <TableCell className="text-sm text-dark-blue-400">
                  {inv.description}
                </TableCell>
                <TableCell className="text-sm text-dark-blue-400">
                  {inv.dueDate}
                </TableCell>
                <TableCell>
                  <StatusBadge status={inv.status} />
                </TableCell>
                <TableCell className="text-right text-sm font-medium text-dark-blue-400">
                  {inv.amount}
                </TableCell>
                <TableCell>
                  <div className="flex items-center justify-center gap-x-2">
                    <IconButton variant="ghost" visual="gray" size="sm">
                      <Copy className="size-4" />
                    </IconButton>
                    <IconButton variant="ghost" visual="gray" size="sm">
                      <Download className="size-4" />
                    </IconButton>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Pagination currentPage={currentPage} onPageChange={setCurrentPage} />
    </div>
  )
}

// ─── Page ───────────────────────────────────────────────────────────────

export default function ClientPaymentsPage() {
  const [activeTab, setActiveTab] = useState("transactions")

  return (
    <AuthenticatedRoute>
      <div className="flex bg-gray-50 min-h-screen">
        <LeftSidebar />

        <div className="flex-auto p-3.5 md:p-6 min-[1024px]:py-8 min-[1024px]:pl-[248px] min-[1024px]:pr-6 overflow-hidden">
          <div className="space-y-5 min-w-0">
            {/* Page Title */}
            <h1 className="text-xl font-bold text-dark-blue-400">Payments</h1>

            <Tabs value={activeTab} onValueChange={setActiveTab}>
              {/* Tab Header */}
              <div className="flex items-center justify-between flex-wrap gap-3">
                <TabsList className="border-b-0">
                  <TabsTrigger value="transactions">Transactions</TabsTrigger>
                  <TabsTrigger value="invoices">Invoices</TabsTrigger>
                </TabsList>

                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    visual="gray"
                    size="sm"
                    className="text-sm font-medium text-gray-500"
                  >
                    <HelpCircle className="size-4" />
                    Get Help
                  </Button>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="outlined"
                        visual="gray"
                        size="sm"
                        className="font-semibold"
                      >
                        Export
                        <ChevronDown className="size-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem>Export CSV</DropdownMenuItem>
                      <DropdownMenuItem>Export PDF</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>

                  <IconButton variant="outlined" visual="gray" size="sm">
                    <Share06 className="size-4" />
                  </IconButton>

                  <IconButton variant="outlined" visual="gray" size="sm">
                    <Settings02 className="size-4" />
                  </IconButton>
                </div>
              </div>

              {/* Tab Content */}
              <TabsContent value="transactions" className="mt-5">
                <TransactionsTab />
              </TabsContent>

              <TabsContent value="invoices" className="mt-5">
                <InvoicesTab />
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </AuthenticatedRoute>
  )
}
