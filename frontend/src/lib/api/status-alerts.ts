// frontend/src/lib/api/status-alerts.ts
//
// Client contract for the persistent status alerts kept by notification-service
// (PMCM-651): GET /v1/notifications/status-alerts and
// POST /v1/notifications/status-alerts/:id/dismiss. Types, strict parsing and the two
// calls only; the transport is injected (service/http/status-alerts.ts passes the
// shared Axios client), so nothing here touches the network or the DOM.
//
// Parsing rules:
//   - a body that is not an array is an error (the caller can tell "unavailable" from
//     "no alerts");
//   - an item that is malformed, has a type this build does not know, or carries a
//     link that is not an in-app path or http(s) URL is dropped, so one bad row (or a
//     type added by a newer server) never blanks the valid alerts next to it.

export const STATUS_ALERT_TYPES = [
  "travel_mode",
  "submitted_for_review",
  "verified",
  "home_country_updated",
] as const

export type StatusAlertType = (typeof STATUS_ALERT_TYPES)[number]

export interface StatusAlert {
  id: string
  type: StatusAlertType
  title: string
  body: string
  link: string | null
  metadata: Record<string, unknown> | null
  // ISO timestamp the alert was created at.
  createdAt: string
}

export class StatusAlertResponseError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "StatusAlertResponseError"
  }
}

export const STATUS_ALERTS_PATH = "/v1/notifications/status-alerts"

export const statusAlertDismissPath = (id: string): string =>
  `${STATUS_ALERTS_PATH}/${encodeURIComponent(id)}/dismiss`

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
// Same rule as the backend: it becomes an href, so no other scheme and no "//host".
const SAFE_LINK = /^(\/(?!\/)|https?:\/\/)\S*$/i

const isRecord = (v: unknown): v is Record<string, unknown> =>
  !!v && typeof v === "object" && !Array.isArray(v)

const text = (v: unknown): string | null =>
  typeof v === "string" && v.trim() ? v : null

export const isStatusAlertType = (v: unknown): v is StatusAlertType =>
  typeof v === "string" && (STATUS_ALERT_TYPES as readonly string[]).includes(v)

/** One alert, or null when the item is not a valid alert of a known type. */
export function parseStatusAlert(raw: unknown): StatusAlert | null {
  if (!isRecord(raw)) return null
  const id = text(raw.id)
  const title = text(raw.title)
  const body = text(raw.body)
  const createdAt =
    typeof raw.createdAt === "string" &&
    Number.isFinite(Date.parse(raw.createdAt))
      ? raw.createdAt
      : null
  if (!id || !title || !body || !createdAt || !isStatusAlertType(raw.type)) {
    return null
  }

  let link: string | null = null
  if (raw.link != null) {
    if (typeof raw.link !== "string" || !SAFE_LINK.test(raw.link)) return null
    link = raw.link
  }
  if (raw.metadata != null && !isRecord(raw.metadata)) return null

  return {
    id,
    type: raw.type,
    title,
    body,
    link,
    metadata:
      raw.metadata == null ? null : (raw.metadata as Record<string, unknown>),
    createdAt,
  }
}

/** The list response. Throws when the body is not an array; drops invalid items. */
export function parseStatusAlerts(raw: unknown): StatusAlert[] {
  if (!Array.isArray(raw)) {
    throw new StatusAlertResponseError("Status alerts response is not a list")
  }
  const alerts: StatusAlert[] = []
  for (const item of raw) {
    const alert = parseStatusAlert(item)
    if (alert) alerts.push(alert)
  }
  return alerts
}

/** The dismiss response must say it was dismissed. */
export function assertDismissed(raw: unknown): void {
  if (!isRecord(raw) || raw.dismissed !== true) {
    throw new StatusAlertResponseError(
      "Status alert dismissal was not confirmed"
    )
  }
}

// The slice of the Axios client used here: the body is under `data`.
export interface StatusAlertTransport {
  get: (path: string) => Promise<{ data: unknown }>
  post: (path: string, body?: unknown) => Promise<{ data: unknown }>
}

/** Active (undismissed) alerts of the signed-in user, newest first. Transport errors propagate. */
export async function listStatusAlerts(
  transport: StatusAlertTransport
): Promise<StatusAlert[]> {
  const response = await transport.get(STATUS_ALERTS_PATH)
  return parseStatusAlerts(response?.data)
}

/** Dismisses one alert for good. Rejects (without a request) for an id that is not a UUID. */
export async function dismissStatusAlert(
  transport: StatusAlertTransport,
  id: string
): Promise<void> {
  if (!UUID.test(id)) {
    throw new StatusAlertResponseError("Status alert id is invalid")
  }
  const response = await transport.post(statusAlertDismissPath(id))
  assertDismissed(response?.data)
}
