"use client"

// frontend/components/account-verification-gate.tsx
//
// Blocking gate shown on every login while identity verification hasn't
// been started yet (Figma node 13101-47588 — trigger: "Every log in to
// account when account is not verified"). Rendered before
// IdentityVerificationFlow: only clicking "Verify My Account" proceeds
// into that flow. Escape and clicking outside are both disabled — unlike
// the location/document screens, this one has no close affordance at all.

import { AlertTriangle } from "@blend-metrics/icons"
import { Button, Dialog, DialogContent } from "@/components/ui"

export function AccountVerificationGate({
  open,
  onVerify,
}: {
  open: boolean
  onVerify: () => void
}) {
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

        <h1 className="mt-5 text-lg text-center leading-7 text-dark-blue-400 font-semibold">
          Your profile is not public
        </h1>

        <p className="mt-2 text-sm text-center leading-5 text-dark-blue-400">
          To access full platform features, please verify your account
        </p>

        <div className="mt-6 flex justify-center">
          <Button onClick={onVerify}>Verify My Account</Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
