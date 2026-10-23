// frontend/src/lib/api/status-alert-copy.ts
//
// PROVISIONAL copy for the two live (non-persisted) alerts. Persistent alerts carry their
// own title and body from notification-service. Everything here is a placeholder to be
// replaced once the Figma Alerts frame (PMCM-651, node 11105-18845) is provided; the
// state logic reads it only through this module.

export type LiveAlertAction = "update_travel" | "verify_account"

export interface LiveAlertCopy {
  title: string
  body: string
  actionLabel: string
  action: LiveAlertAction
}

export const LIVE_ALERT_COPY = {
  travel_mode_ongoing: {
    title: "You are in Travel Mode",
    body: "Update your travel plans if they have changed.",
    actionLabel: "Update",
    action: "update_travel",
  },
  unverified_account: {
    title: "Verify your account",
    body: "Verify your identity and location to make your profile public.",
    actionLabel: "Verify My Account",
    action: "verify_account",
  },
} as const satisfies Record<string, LiveAlertCopy>
