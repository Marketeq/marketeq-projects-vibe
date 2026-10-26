// frontend/src/lib/api/status-alert-state.ts
//
// Pure state logic for the dashboard's status alerts (PMCM-651). No React, DOM, storage or
// network: callers pass in what they know and persist what the helpers tell them to.
//
// Product rules:
//   - alerts stack newest first and at most MAX_VISIBLE_ALERTS (3) are visible; dismissing
//     one promotes the next hidden alert into the stack;
//   - a persistent alert (notification-service) stays dismissed for good: its dismissal is
//     stored server-side by id, and a new occurrence is a new alert with a new id;
//   - "You are in Travel Mode / Update" is a LIVE card: derived from the profile while
//     Travel Mode is active, dismissed for the current login session only;
//   - there is NO unverified-account alert here: the orange inline banner and the
//     AccountVerificationGate are not part of this stack (Christopher's PMCM-651 decisions,
//     pinned by unverified-account-decisions.test.ts);
//   - Verified replaces Submitted for Review, and an approved home-country update replaces
//     the Travel Mode alert. notification-service already dismisses the replaced alert
//     when the new one is stored; the same rule is applied here so a list that is read
//     between the two writes, or a late retry, cannot show both.
//
// The live card's dismissal key embeds the loginSessionKey (GET /me), which is new on every
// login and stable across refreshes, so a new login un-dismisses it without any cleanup.
import { LIVE_ALERT_COPY, type LiveAlertAction } from "./status-alert-copy"
import type { StatusAlert, StatusAlertType } from "./status-alerts"

export const MAX_VISIBLE_ALERTS = 3

export type LiveAlertKind = "travel_mode_ongoing"

export type DisplayAlert =
  | {
      source: "persistent"
      key: string
      type: StatusAlertType
      // The notification-service id to dismiss.
      id: string
      title: string
      body: string
      link: string | null
      createdAtMs: number
    }
  | {
      source: "live"
      key: string
      type: LiveAlertKind
      title: string
      body: string
      actionLabel: string
      action: LiveAlertAction
      createdAtMs: number
    }

export interface StatusAlertInputs {
  // Active alerts from GET /v1/notifications/status-alerts.
  persistent: StatusAlert[]
  // Persistent ids dismissed locally but not yet gone from the server list.
  dismissedPersistentIds?: ReadonlySet<string>
  // Live keys dismissed in this login session (see liveAlertKey).
  dismissedLiveKeys?: ReadonlySet<string>
  // GET /me: stable for a login, new for every login.
  loginSessionKey: string | null | undefined
  nowMs: number
  // undefined while the profile is loading: nothing live is shown until it is known.
  travelModeActive: boolean | undefined
  // Tells one Travel Mode activation from the next (the period's end time from /me is
  // different for every activation). It is part of the live card's dismissal key, so a card
  // dismissed in this login returns for a LATER activation, but not for the same one.
  travelModeOccurrence?: string | null
  travelModeActivatedAt?: string | null
}

export const liveAlertKey = (
  kind: LiveAlertKind,
  loginSessionKey: string
): string => `live:${kind}:${loginSessionKey}`

const toMs = (iso: string | null | undefined): number | null => {
  if (!iso) return null
  const ms = Date.parse(iso)
  return Number.isFinite(ms) ? ms : null
}

/** Persistent alerts with the replaced ones removed. Pure; the input is not changed. */
export function applySupersession(alerts: StatusAlert[]): StatusAlert[] {
  const newest = (type: StatusAlertType): number | null => {
    let best: number | null = null
    for (const a of alerts) {
      if (a.type !== type) continue
      const ms = toMs(a.createdAt)
      if (ms !== null && (best === null || ms > best)) best = ms
    }
    return best
  }
  const verifiedAt = newest("verified")
  const homeCountryAt = newest("home_country_updated")
  return alerts.filter((a) => {
    const ms = toMs(a.createdAt)
    if (ms === null) return true
    if (a.type === "submitted_for_review")
      return verifiedAt === null || verifiedAt < ms
    if (a.type === "travel_mode")
      return homeCountryAt === null || homeCountryAt < ms
    return true
  })
}

function endedByHomeCountryUpdate(input: StatusAlertInputs): boolean {
  // Without the activation time nothing can be compared, so the profile (which an approved
  // change clears) is the only authority: a card is never hidden for an unknown activation.
  const activatedAt = toMs(input.travelModeActivatedAt)
  if (activatedAt === null) return false
  return input.persistent.some((a) => {
    if (a.type !== "home_country_updated") return false
    const ms = toMs(a.createdAt)
    return ms !== null && ms >= activatedAt
  })
}

/** Every alert that should currently exist, newest first, before the visible cap. */
export function buildAlertStack(input: StatusAlertInputs): DisplayAlert[] {
  const dismissedIds = input.dismissedPersistentIds ?? new Set<string>()
  const dismissedLive = input.dismissedLiveKeys ?? new Set<string>()
  const out: DisplayAlert[] = []

  for (const a of applySupersession(input.persistent)) {
    const createdAtMs = toMs(a.createdAt)
    if (createdAtMs === null || dismissedIds.has(a.id)) continue
    out.push({
      source: "persistent",
      key: `persistent:${a.id}`,
      type: a.type,
      id: a.id,
      title: a.title,
      body: a.body,
      link: a.link,
      createdAtMs,
    })
  }

  const session = input.loginSessionKey
  if (session) {
    // An approved home-country change ends Travel Mode. Even if the profile this page read
    // still says active (it was read before the change), the ongoing card does not qualify
    // once a Home Country Updated alert is newer than the activation.
    const travelEnded = endedByHomeCountryUpdate(input)
    if (input.travelModeActive === true && !travelEnded) {
      const key = liveAlertKey(
        "travel_mode_ongoing",
        input.travelModeOccurrence
          ? `${session}:${input.travelModeOccurrence}`
          : session
      )
      if (!dismissedLive.has(key)) {
        out.push({
          source: "live",
          key,
          type: "travel_mode_ongoing",
          ...LIVE_ALERT_COPY.travel_mode_ongoing,
          createdAtMs: toMs(input.travelModeActivatedAt) ?? input.nowMs,
        })
      }
    }
  }

  // Newest first; equal times keep a stable order by key so the stack never reshuffles.
  return out.sort(
    (a, b) => b.createdAtMs - a.createdAtMs || a.key.localeCompare(b.key)
  )
}

export interface VisibleAlerts {
  visible: DisplayAlert[]
  // Alerts waiting behind the cap; each moves up as a visible one is dismissed.
  hiddenCount: number
}

export function selectVisibleAlerts(
  stack: DisplayAlert[],
  max: number = MAX_VISIBLE_ALERTS
): VisibleAlerts {
  const visible = stack.slice(0, Math.max(0, max))
  return { visible, hiddenCount: stack.length - visible.length }
}

export interface DismissalState {
  dismissedPersistentIds: ReadonlySet<string>
  dismissedLiveKeys: ReadonlySet<string>
}

export type DismissalEffect =
  // POST /v1/notifications/status-alerts/:id/dismiss
  | { kind: "dismiss_on_server"; id: string }
  // Remember for this login session only.
  | { kind: "remember_for_session"; key: string }

/**
 * Dismisses one alert. The returned state hides it at once (so the next alert moves up
 * before the request finishes); the effect says what the caller must persist.
 */
export function dismissAlert(
  state: DismissalState,
  alert: DisplayAlert
): { state: DismissalState; effect: DismissalEffect } {
  if (alert.source === "persistent") {
    return {
      state: {
        ...state,
        dismissedPersistentIds: new Set([
          ...state.dismissedPersistentIds,
          alert.id,
        ]),
      },
      effect: { kind: "dismiss_on_server", id: alert.id },
    }
  }
  return {
    state: {
      ...state,
      dismissedLiveKeys: new Set([...state.dismissedLiveKeys, alert.key]),
    },
    effect: { kind: "remember_for_session", key: alert.key },
  }
}

/** A failed server dismissal puts the alert back. */
export function undoPersistentDismissal(
  state: DismissalState,
  id: string
): DismissalState {
  const next = new Set(state.dismissedPersistentIds)
  next.delete(id)
  return { ...state, dismissedPersistentIds: next }
}
