// frontend/src/lib/api/status-alert-copy.ts
//
// Copy for the live (non-persisted) "You are in Travel Mode" alert. Persistent alerts carry their
// own title and body from notification-service. The state logic reads this copy only
// through this module.

export type LiveAlertAction = "update_travel"

export interface LiveAlertCopy {
  title: string
  body: string
  actionLabel: string
  action: LiveAlertAction
}

export const LIVE_ALERT_COPY = {
  // Figma node 13101-47532; the same text as the dashboard's existing Travel Mode popup.
  travel_mode_ongoing: {
    title: "You are in Travel Mode",
    body: "Update your status if your location changes",
    actionLabel: "Update",
    action: "update_travel",
  },
} as const satisfies Record<string, LiveAlertCopy>

// Accessible name of the close button on a persistent alert card, and the line shown when
// a dismissal could not be saved (the card is put back).
export const STATUS_ALERT_CLOSE_LABEL = "Dismiss alert"
export const STATUS_ALERT_DISMISS_ERROR =
  "We couldn't dismiss that alert. Please try again."
