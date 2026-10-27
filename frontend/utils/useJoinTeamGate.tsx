"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { AlertTriangle } from "@blend-metrics/icons"
import { Button, Dialog, DialogClose, DialogContent } from "@/components/ui"
import { AccountVerificationGate } from "@/components/account-verification-gate"
import {
  joinTeamBlockFrom,
  joinTeamTitleFor,
  type JoinTeamBlock,
} from "@/src/lib/api/join-team-gate"
import { START_VERIFICATION_HREF } from "@/src/lib/api/start-verification-handoff"

// G7: the invitee's "Go to Dashboard" click is what accepts the invitation, and the
// invitations service runs the verification gate before it writes anything. When that
// accept is refused, handleAcceptError() opens the matching modal (identity and location /
// identity / location) with Cancel and Start Verification, or the existing
// status-unavailable popup when the gate could not be evaluated. It returns false for any
// other failure so the caller keeps its existing toast. Cancel only closes the modal: the
// next click on the button sends a fresh accept and gets a fresh answer. "Start
// Verification" uses the same one-shot dashboard hand-off as the Apply gate (G3).
export function useJoinTeamGate() {
  const router = useRouter()
  const [block, setBlock] = useState<JoinTeamBlock | null>(null)

  const handleAcceptError = (error: unknown): boolean => {
    const next = joinTeamBlockFrom(error)
    if (!next) return false
    setBlock(next)
    return true
  }

  const goVerify = () => {
    setBlock(null)
    router.push(START_VERIFICATION_HREF)
  }

  const joinGateDialog = (
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
              ? joinTeamTitleFor(block.missing)
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

  return { handleAcceptError, joinGateDialog }
}
