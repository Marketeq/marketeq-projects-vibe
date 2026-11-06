"use client"

import { useCallback, useRef, useState } from "react"
import { resolveDashboardRole, useAuth } from "@/contexts/auth"
import { ROLE } from "@/types/user"
import { AlertTriangle } from "@blend-metrics/icons"
import { Button, Dialog, DialogClose, DialogContent } from "@/components/ui"
import { AccountVerificationGate } from "@/components/account-verification-gate"
import { applyGateFor } from "@/src/lib/api/apply-gate"
import { useIdentityVerification } from "@/contexts/identity-verification-host"
import { fetchIdentityVerificationSummary } from "@/src/lib/api/identity-verification-state"

// G3: gates the job Apply entry points. For a talent, the backend's gate_open
// answer is read fresh on every click (never cached): open runs the button's
// existing behavior, closed opens the existing "Verify My Account" popup, and an
// unreadable answer opens that popup's existing status-unavailable state. Anyone
// who is not a talent (clients, signed-out visitors) keeps the button's existing
// behavior untouched. Cancel only closes the modal and aborts that Apply attempt.
// "Start Verification" closes the modal and starts the existing Identity Verification flow in
// place, through the shared host mounted in the root layout: the talent stays on this page (no
// navigation, no reload) and the application is never retried or submitted afterwards; they
// click Apply again.
export function useApplyGate() {
  const { user } = useAuth()
  const { startVerification } = useIdentityVerification()
  const [block, setBlock] = useState<"closed" | "unavailable" | null>(null)
  const checking = useRef(false)
  const isTalent = resolveDashboardRole(user) === ROLE.TALENT

  const runApply = useCallback(
    async (proceed?: () => void) => {
      if (!isTalent) {
        proceed?.()
        return
      }
      if (checking.current) return
      checking.current = true
      try {
        const decision = applyGateFor(await fetchIdentityVerificationSummary())
        if (decision === "open") {
          proceed?.()
          return
        }
        setBlock(decision === "closed" ? "closed" : "unavailable")
      } finally {
        checking.current = false
      }
    },
    [isTalent]
  )

  const goVerify = () => {
    setBlock(null)
    void startVerification()
  }

  const applyGateDialog = (
    <>
      <Dialog
        open={block === "closed"}
        onOpenChange={(open) => {
          if (!open) setBlock(null)
        }}
      >
        <DialogContent className="max-w-[506px] pt-[50px]">
          <div className="flex items-center justify-center">
            <div className="size-[48px] rounded-full text-warning-600 bg-warning-100 border-[8px] border-warning-50 inline-flex items-center justify-center shrink-0">
              <AlertTriangle className="size-6" />
            </div>
          </div>

          <h1 className="mt-5 mx-auto max-w-[317px] text-lg text-center leading-7 text-dark-blue-400 font-semibold">
            To apply to this job, you will need to verify your account
          </h1>

          <div className="mt-6 flex justify-center items-center gap-x-3">
            <DialogClose asChild>
              <Button variant="outlined" size="md">
                Cancel
              </Button>
            </DialogClose>
            <Button size="md" onClick={goVerify}>
              Start Verification
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <AccountVerificationGate
        open={block === "unavailable"}
        reason="status_unavailable"
        connectionCheckState="idle"
        onVerify={goVerify}
        onRetryConnectionCheck={goVerify}
        onDismissConnectionError={() => setBlock(null)}
      />
    </>
  )

  return { runApply, applyGateDialog }
}
