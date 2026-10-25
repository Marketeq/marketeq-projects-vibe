// frontend/src/lib/api/status-alert-dismissal.ts
//
// Controller for dismissing a persistent status alert (PMCM-651). Optimistic: the card
// leaves the stack at once, so the next alert moves up before the request finishes; if the
// request fails the card is restored and the caller is told, so it can show the error.
// Pure apart from the injected `dismiss` call and `update` setter.
import {
  type DismissalState,
  type DisplayAlert,
  dismissAlert,
  undoPersistentDismissal,
} from "./status-alert-state"

export type PersistentDisplayAlert = Extract<
  DisplayAlert,
  { source: "persistent" }
>

export type DismissalOutcome = { ok: true } | { ok: false; error: unknown }

export async function dismissPersistentAlertOptimistically(args: {
  alert: PersistentDisplayAlert
  // StatusAlertsAPI.dismiss
  dismiss: (id: string) => Promise<void>
  // A functional state setter, like React's: it must apply the updates in order.
  update: (change: (state: DismissalState) => DismissalState) => void
}): Promise<DismissalOutcome> {
  const { alert, dismiss, update } = args
  update((state) => dismissAlert(state, alert).state)
  try {
    await dismiss(alert.id)
    // Kept in the dismissed set: a list read that was already in flight cannot bring the
    // card back, and a later list no longer contains it.
    return { ok: true }
  } catch (error) {
    update((state) => undoPersistentDismissal(state, alert.id))
    return { ok: false, error }
  }
}

/** The persistent alert types the dashboard renders so far (PMCM-651, one type per phase). */
export const RENDERED_STATUS_ALERT_TYPES = [
  "travel_mode",
  "submitted_for_review",
  "verified",
] as const

export type RenderedStatusAlertType =
  (typeof RENDERED_STATUS_ALERT_TYPES)[number]

export const isRenderedStatusAlert = (
  alert: DisplayAlert
): alert is PersistentDisplayAlert & { type: RenderedStatusAlertType } =>
  alert.source === "persistent" &&
  (RENDERED_STATUS_ALERT_TYPES as readonly string[]).includes(alert.type)
