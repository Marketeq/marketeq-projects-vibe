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

import { useEffect, useRef } from "react"
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
  onCancel,
  retrying = false,
}: {
  open: boolean
  reason: AccountVerificationGateReason
  connectionCheckState: ConnectionCheckState
  onVerify: () => void
  onRetryConnectionCheck: () => void
  onDismissConnectionError: () => void
  // Optional. Absent (every existing caller): no Cancel button, and Escape and clicking
  // outside stay disabled exactly as before. Present: a Cancel button is shown before
  // "Verify My Account", and Escape and clicking outside do the same as Cancel. It is called at
  // most once per time the gate is opened, however many events one dismissal produces.
  onCancel?: () => void
  // Optional. True only while a Retry pressed on the connection-error presentation is running:
  // that presentation stays on screen until the answer, so Retry shows its spinner (the shared
  // Button's, replacing its icon) and is disabled. Absent or false (every other caller): nothing
  // changes. Dismiss stays available, since dismissing cancels the check.
  retrying?: boolean
}) {
  const connectionUnavailable = connectionCheckState === "unavailable"

  const cancelFired = useRef(false)
  useEffect(() => {
    if (open) cancelFired.current = false
  }, [open])
  const cancel = onCancel
    ? () => {
        if (cancelFired.current) return
        cancelFired.current = true
        onCancel()
      }
    : undefined

  return (
    <Dialog
      open={open}
      onOpenChange={
        cancel
          ? (next) => {
              if (!next) cancel()
            }
          : undefined
      }
    >
      <DialogContent
        className="w-[469px] pt-[50px]"
        onEscapeKeyDown={cancel ? undefined : (e) => e.preventDefault()}
        onPointerDownOutside={cancel ? undefined : (e) => e.preventDefault()}
        onInteractOutside={cancel ? undefined : (e) => e.preventDefault()}
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
                className="min-w-[93px] text-primary-500 bg-primary-50 hover:text-white hover:bg-primary-500"
                size="md"
                leftIcon={<RefreshCw className="size-[15px]" />}
                loading={retrying}
                aria-busy={retrying}
                onClick={onRetryConnectionCheck}
              >
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

            <div
              className={
                cancel
                  ? "mt-6 flex justify-center items-center gap-x-3"
                  : "mt-6 flex justify-center"
              }
            >
              {cancel && (
                <Button variant="outlined" onClick={cancel}>
                  Cancel
                </Button>
              )}
              <Button
                className="min-w-[178px]"
                onClick={onVerify}
                disabled={connectionCheckState === "checking"}
                loading={connectionCheckState === "checking"}
                aria-busy={connectionCheckState === "checking"}
              >
                Verify My Account
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
