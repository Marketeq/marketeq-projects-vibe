"use client"

import { useCallback, useRef, useState } from "react"
import { resolveDashboardRole, useAuth } from "@/contexts/auth"
import { ROLE } from "@/types/user"
import { AlertTriangle } from "@blend-metrics/icons"
import { Button, Dialog, DialogClose, DialogContent } from "@/components/ui"
import { AccountVerificationGate } from "@/components/account-verification-gate"
import { checkTimeTrackerDownload } from "@/service/http/time-tracker-download"
import {
  startTimeBlockFrom,
  startTimeTitleFor,
  type StartTimeBlock,
} from "@/src/lib/api/start-time-gate"
import { useIdentityVerification } from "@/contexts/identity-verification-host"

// G8: gates the Log Time buttons, the web's "start logging time" action (they launch the
// desktop tracker, or offer its installer). For a talent, the backend's G8 gate is read
// fresh on every click through its read-only check route: an open gate runs the button's
// existing behavior, a refusal opens the "To start logging time, you must verify ..."
// modal for what is missing (Cancel / Start Verification), and any other outcome fails
// closed into the existing status-unavailable popup. Nothing is launched, downloaded or
// created while blocked. Anyone who is not a talent keeps the button's existing behavior.
// Cancel only closes the modal; the next click asks again. Start Verification closes the modal
// and starts the existing Identity Verification flow in place, through the shared host: the
// talent stays on this page (no navigation, no reload), and nothing is launched, downloaded or
// retried afterwards; they click Log Time again.
export function useStartTimeGate() {
  const { user } = useAuth()
  const { startVerification } = useIdentityVerification()
  const [block, setBlock] = useState<StartTimeBlock | null>(null)
  const checking = useRef(false)
  const isTalent = resolveDashboardRole(user) === ROLE.TALENT

  const runStart = useCallback(
    async (proceed: () => unknown) => {
      if (!isTalent) {
        await proceed()
        return
      }
      if (checking.current) return
      checking.current = true
      try {
        await checkTimeTrackerDownload()
      } catch (error) {
        setBlock(startTimeBlockFrom(error))
        return
      } finally {
        checking.current = false
      }
      await proceed()
    },
    [isTalent]
  )

  const goVerify = () => {
    setBlock(null)
    void startVerification()
  }

  const startTimeGateDialog = (
    <>
      <Dialog
        open={block?.kind === "verification"}
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
            {block?.kind === "verification"
              ? startTimeTitleFor(block.missing)
              : null}
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
        open={block?.kind === "unavailable"}
        reason="status_unavailable"
        connectionCheckState="idle"
        onVerify={goVerify}
        onRetryConnectionCheck={goVerify}
        onDismissConnectionError={() => setBlock(null)}
      />
    </>
  )

  return { runStart, startTimeGateDialog }
}
