"use client"

// frontend/components/account-verification-gate.tsx
//
// Blocking gate shown on every login while identity verification hasn't
// been started yet (Figma node 13101-47588 — trigger: "Every log in to
// account when account is not verified"). Rendered before
// IdentityVerificationFlow: only clicking "Verify My Account" proceeds
// into that flow. Escape and clicking outside are both disabled — unlike
// the location/document screens, this one has no close affordance at all.
//
// Also covers two related, honest states so nothing about verification is
// ever faked or silently hidden:
//   - reason "status_unavailable": the real identity-verification status
//     itself couldn't be retrieved. Neutral copy only — never claims the
//     profile is public or not public, since that isn't actually known.
//   - connectionCheckState "unavailable": the real VPN/proxy connection
//     check (run when the user clicks "Verify My Account") failed. Shown
//     in place, inside this same dialog, with its own Retry — never a
//     separate popup, never treated as a clean pass.

import { AlertTriangle, RefreshCw } from "@blend-metrics/icons"
import { Button, Dialog, DialogContent } from "@/components/ui"

export type AccountVerificationGateReason = "unstarted" | "status_unavailable"
export type ConnectionCheckState = "idle" | "checking" | "unavailable"

export function AccountVerificationGate({
  open,
  reason,
  connectionCheckState,
  onVerify,
  onRetryConnectionCheck,
  onDismissConnectionError,
}: {
  open: boolean
  reason: AccountVerificationGateReason
  connectionCheckState: ConnectionCheckState
  onVerify: () => void
  onRetryConnectionCheck: () => void
  onDismissConnectionError: () => void
}) {
  const connectionUnavailable = connectionCheckState === "unavailable"

  return (
    <Dialog open={open}>
      <DialogContent
        className="w-[469px] pt-[50px]"
        onEscapeKeyDown={(e) => e.preventDefault()}
        onPointerDownOutside={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
      >
        <div className="flex items-center justify-center">
          <div className="size-[48px] rounded-full text-warning-600 bg-warning-100 border-[8px] border-warning-50 inline-flex items-center justify-center shrink-0">
            <AlertTriangle className="size-6" />
          </div>
        </div>

        {connectionUnavailable ? (
          <>
            <h1 className="mt-5 text-lg text-center leading-7 text-dark-blue-400 font-semibold">
              Connection Check Unavailable
            </h1>

            <p className="mt-2 text-sm text-center leading-5 text-dark-blue-400">
              We couldn&rsquo;t check your connection. Please try again
              later.
            </p>

            <div className="mt-6 flex justify-center items-center gap-x-3">
              <Button
                variant="outlined"
                size="md"
                onClick={onDismissConnectionError}
              >
                Dismiss
              </Button>
              <Button
                className="text-primary-500 bg-primary-50 hover:text-white hover:bg-primary-500"
                size="md"
                onClick={onRetryConnectionCheck}
              >
                <RefreshCw className="size-[15px]" />
                Retry
              </Button>
            </div>
          </>
        ) : (
          <>
            <h1 className="mt-5 text-lg text-center leading-7 text-dark-blue-400 font-semibold">
              {reason === "unstarted"
                ? "Your profile is not public"
                : "We couldn't check your verification status"}
            </h1>

            <p className="mt-2 text-sm text-center leading-5 text-dark-blue-400">
              {reason === "unstarted"
                ? "To access full platform features, please verify your account"
                : "You can try again to continue"}
            </p>

            <div className="mt-6 flex justify-center">
              <Button
                onClick={onVerify}
                disabled={connectionCheckState === "checking"}
              >
                {connectionCheckState === "checking"
                  ? "Checking..."
                  : "Verify My Account"}
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
