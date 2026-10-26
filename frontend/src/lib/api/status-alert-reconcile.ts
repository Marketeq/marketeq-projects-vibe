// frontend/src/lib/api/status-alert-reconcile.ts
//
// Keeps the dashboard's status alerts in step with a Travel Mode activation made in this
// page visit (PMCM-651). The identity summary (GET /me) is read right after the verification
// flow closes, but the persistent "Travel Mode is on" alert is created asynchronously: the
// identity service publishes the event after its write and notification-service stores it
// when its consumer gets to it, so the first alert-list read can run before the row exists.
//
// reconcileStatusAlerts therefore re-reads the list a bounded number of times, with growing
// waits, and stops as soon as the expected alert is there. It is not polling: it runs only
// after a detected activation, makes at most ALERT_RECONCILE_DELAYS_MS.length reads (about
// 3 seconds in total) and then gives up, leaving whatever the last read returned. A newer
// reconciliation, or the page going away, ends an older one.
import type { StatusAlert, StatusAlertType } from "./status-alerts"
import { isTravelModeInForce } from "./travel-popup"

/** The wait before each re-read: 0.4s, then 0.9s later, then 1.8s later (3.1s in all). */
export const ALERT_RECONCILE_DELAYS_MS = [400, 900, 1800] as const

interface TravelState {
  travelModeEndsAt: string | null
  travelModeExpired: boolean | null
}

/**
 * True when `next` shows a Travel Mode activation that `previous` did not: Travel Mode is in
 * force now and either was not before or is a different period (a new activation always has
 * a new end time). Without a previous summary (the first read of the page) there is nothing
 * new: the alert list that loads with the page already includes it.
 */
export function isNewTravelActivation(
  previous: TravelState | null,
  next: TravelState | null
): boolean {
  if (!previous || !next || !isTravelModeInForce(next)) return false
  return (
    !isTravelModeInForce(previous) ||
    previous.travelModeEndsAt !== next.travelModeEndsAt
  )
}

/** Whether `alerts` holds a `type` alert that was not in the list known before. */
export function hasNewAlertOfType(
  alerts: StatusAlert[],
  type: StatusAlertType,
  knownIds: ReadonlySet<string>
): boolean {
  return alerts.some((a) => a.type === type && !knownIds.has(a.id))
}

export type ReconcileOutcome = "settled" | "gave_up" | "superseded"

export async function reconcileStatusAlerts(args: {
  list: () => Promise<StatusAlert[]>
  // True once the awaited alert is in the list.
  isSettled: (alerts: StatusAlert[]) => boolean
  // Receives every list that was read while this reconciliation is still current.
  apply: (alerts: StatusAlert[]) => void
  // False once a newer reconciliation started or the page went away.
  isCurrent: () => boolean
  sleep: (ms: number) => Promise<void>
  delaysMs?: readonly number[]
}): Promise<ReconcileOutcome> {
  const delays = args.delaysMs ?? ALERT_RECONCILE_DELAYS_MS
  for (const delay of delays) {
    await args.sleep(delay)
    if (!args.isCurrent()) return "superseded"
    let alerts: StatusAlert[]
    try {
      alerts = await args.list()
    } catch {
      continue // a failed read costs one of the bounded attempts, nothing more
    }
    if (!args.isCurrent()) return "superseded"
    args.apply(alerts)
    if (args.isSettled(alerts)) return "settled"
  }
  return "gave_up"
}
