import { CheckoutAPI } from "@/service/http/checkout"
import { getDraftDateRangeLabel } from "./draft-summary"
import type { CheckoutDraftTeamRow } from "./draft-team"
import type { CheckoutSession } from "./session"

export type OrderPaymentPhase = "initial" | "recurring"

export type OrderPaymentAddress = {
  fullName: string
  addressLine1: string
  addressLine2: string | null
  city: string
  state: string
  postalCode: string
  country: string
  phoneNumber: string
}

export type OrderPaymentEntry = {
  paymentId: string
  phase: OrderPaymentPhase
  method: string
  amount?: number
  card: {
    brand: string
    funding: string
    last4: string
    expMonth: number
    expYear: number
  } | null
  billingAddress: OrderPaymentAddress | null
  capturedAt: string
}

export type OrderPaymentDetails = {
  projectCost: number
  tax: number
  promo: {
    code: string
    type: "percent" | "fixed"
    value: number
    amount: number
  } | null
  giftCards: { code: string; amount: number }[]
  balanceApplied: number
  total: number
  firstRecurringPaymentOn?: string
  capturedAt: string
}

export type CheckoutOrder = {
  orderId: string
  sessionId: string
  status: "processing" | "paid" | "failed"
  orderCost: number
  createdAt: string
  paidAt: string | null
  confirmationEmail: string | null
  paymentSnapshot: OrderPaymentEntry[]
  paymentDetailsSnapshot: OrderPaymentDetails | null
}

export type OrderProjectDetails = {
  title: string
  imageUrl: string
  teamLabel: string
  dateRange: string
}

export type OrderTeamMember = {
  id: string
  name: string
  role: string | null
  avatarUrl: string | null
  initial: string
}

export type OrderPriceBreakdown = {
  projectCost: number | null
  tax: number
  promo: OrderPaymentDetails["promo"]
  giftCards: OrderPaymentDetails["giftCards"]
  giftCardTotal: number
  balanceApplied: number
  total: number
  firstRecurringPaymentOn: string | null
}

export type OrderPaymentRow = {
  id: string
  phase: OrderPaymentPhase
  method: string
  amount: number | null
  brand: string | null
  funding: string | null
  last4: string | null
  expiryLabel: string | null
  billingAddressLabel: string | null
}

export const getCheckoutOrder = async (
  orderId: string
): Promise<CheckoutOrder | null> => {
  try {
    const response = await CheckoutAPI.GetOrder(orderId)
    return response.data as CheckoutOrder
  } catch (error) {
    const status = (error as { response?: { status?: number } })?.response
      ?.status
    if (status === 400 || status === 404) return null
    throw error
  }
}

const ordinalSuffix = (day: number) => {
  const lastTwo = day % 100
  if (lastTwo >= 11 && lastTwo <= 13) return "th"
  switch (day % 10) {
    case 1:
      return "st"
    case 2:
      return "nd"
    case 3:
      return "rd"
    default:
      return "th"
  }
}

const orderDateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "long",
  day: "numeric",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
  hour12: true,
  timeZoneName: "short",
})

export const formatOrderDate = (value: string) => {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ""
  const parts = orderDateFormatter.formatToParts(date)
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((entry) => entry.type === type)?.value ?? ""
  const day = Number(part("day"))
  return `${part("month")} ${day}${ordinalSuffix(day)}, ${part("year")} at ${part("hour")}:${part("minute")} ${part("dayPeriod")} ${part("timeZoneName")}`
}

const wholeDollarFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
})

const centsFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

export const formatPaymentAmount = (amount: number) =>
  Number.isInteger(amount)
    ? wholeDollarFormatter.format(amount)
    : centsFormatter.format(amount)

export const formatCardExpiry = (month: number, year: number) =>
  `${String(month).padStart(2, "0")}/${year}`

export const formatBillingAddress = (address: OrderPaymentAddress) =>
  [
    address.addressLine1,
    address.addressLine2,
    address.city,
    [address.state, address.postalCode].filter(Boolean).join(" "),
  ]
    .filter((line) => line && line.trim())
    .join(", ")

export const getOrderPaymentRows = (order: CheckoutOrder): OrderPaymentRow[] => {
  const entries = Array.isArray(order.paymentSnapshot)
    ? order.paymentSnapshot
    : []
  return entries.map((entry) => ({
    id: entry.paymentId,
    phase: entry.phase === "recurring" ? "recurring" : "initial",
    method: entry.method,
    amount:
      typeof entry.amount === "number"
        ? entry.amount
        : entries.length === 1
          ? order.orderCost
          : null,
    brand: entry.card?.brand ?? null,
    funding: entry.card?.funding ?? null,
    last4: entry.card?.last4 ?? null,
    expiryLabel: entry.card
      ? formatCardExpiry(entry.card.expMonth, entry.card.expYear)
      : null,
    billingAddressLabel: entry.billingAddress
      ? formatBillingAddress(entry.billingAddress) || null
      : null,
  }))
}

export const groupOrderPaymentRows = (rows: OrderPaymentRow[]) => ({
  initial: rows.filter((row) => row.phase !== "recurring"),
  recurring: rows.filter((row) => row.phase === "recurring"),
})

export const formatPaymentDate = (value: string) => {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ""
  const parts = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).formatToParts(date)
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((entry) => entry.type === type)?.value ?? ""
  const day = Number(part("day"))
  return `${part("month")} ${day}${ordinalSuffix(day)}, ${part("year")}`
}

export const getProjectDetails = (
  session: CheckoutSession | null,
  order: CheckoutOrder | null
): OrderProjectDetails => {
  const teamCount = session?.teamMemberCount ?? null
  const orderDate = order
    ? new Date(order.paidAt ?? order.createdAt)
    : new Date()
  const dateRange = Number.isNaN(orderDate.getTime())
    ? null
    : getDraftDateRangeLabel(session?.durationDays ?? null, false, orderDate)
  return {
    title: session?.title || "Project Title Unavailable",
    imageUrl: session?.mediaUrl || "/dashboard.png",
    teamLabel:
      teamCount !== null
        ? `${teamCount} team member${teamCount === 1 ? "" : "s"}`
        : "Team Details Unavailable",
    dateRange: (dateRange || "Timeline Unavailable").replace(" - ", "  -  "),
  }
}

export const getOrderPriceBreakdown = (
  order: CheckoutOrder
): OrderPriceBreakdown => {
  const details = order.paymentDetailsSnapshot
  if (!details) {
    return {
      projectCost: null,
      tax: 0,
      promo: null,
      giftCards: [],
      giftCardTotal: 0,
      balanceApplied: 0,
      total: order.orderCost,
      firstRecurringPaymentOn: null,
    }
  }
  const giftCards = Array.isArray(details.giftCards) ? details.giftCards : []
  return {
    projectCost: details.projectCost,
    tax: details.tax,
    promo: details.promo ?? null,
    giftCards,
    giftCardTotal: giftCards.reduce((sum, card) => sum + card.amount, 0),
    balanceApplied: details.balanceApplied,
    total: details.total,
    firstRecurringPaymentOn: details.firstRecurringPaymentOn ?? null,
  }
}

export const getTeamMembers = (
  rows: CheckoutDraftTeamRow[] | null | undefined
): OrderTeamMember[] =>
  (rows ?? [])
    .filter((row) => Boolean(row.userId))
    .map((row) => {
      const name = (row.name || "").trim() || "Team Member"
      return {
        id: row.userId as string,
        name,
        role: row.role ? row.role.replace(/\s+/g, " ").trim() || null : null,
        avatarUrl: row.avatarUrl || null,
        initial: name.charAt(0).toUpperCase(),
      }
    })
