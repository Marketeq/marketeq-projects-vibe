"use client"

import { useCallback, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { resolveDashboardRole, useAuth } from "@/contexts/auth"
import { ROLE } from "@/types/user"
import { AlertTriangle } from "@blend-metrics/icons"
import { Button, Dialog, DialogClose, DialogContent } from "@/components/ui"
import { AccountVerificationGate } from "@/components/account-verification-gate"
import { ProjectAPI } from "@/service/http/project"
import {
  createListingTitleFor,
  runCreateListingGate,
  type CreateListingBlock,
} from "@/src/lib/api/create-listing-gate"
import { START_VERIFICATION_HREF } from "@/src/lib/api/start-verification-handoff"

// G2: gates the start of a talent listing (Project or Service on /my-listings). For a
// talent, the backend's read-only creation check runs fresh on every click: an open gate
// (verified or inside the grace period) runs the caller's existing draft creation, a refusal
// opens the "To publish this job, you must verify ..." modal for what is missing (Cancel /
// Start Verification), and any other outcome fails closed into the existing
// status-unavailable popup. Nothing is created or saved while blocked. Anyone who is not a
// talent keeps the existing behavior (the backend still refuses a closed gate). Cancel, Esc
// and an outside click only close the modal. Start Verification uses the same one-shot
// dashboard hand-off as the Apply gate (G3), which opens the existing verification flow.
export function useCreateListingGate() {
  const { user } = useAuth()
  const router = useRouter()
  const [block, setBlock] = useState<CreateListingBlock | null>(null)
  const checking = useRef(false)
  const isTalent = resolveDashboardRole(user) === ROLE.TALENT

  const runCreate = useCallback(
    async (proceed: () => unknown) => {
      if (checking.current) return { proceeded: false }
      checking.current = true
      let result
      try {
        result = await runCreateListingGate({
          isTalent,
          check: () => ProjectAPI.CheckCreateListingGate(),
          // The check is over once it resolves; the draft creation runs outside the guard
          // exactly as it did before the gate existed.
          proceed: () => {
            checking.current = false
            return proceed()
          },
        })
      } finally {
        checking.current = false
      }
      setBlock(result.block)
      return { proceeded: result.proceeded }
    },
    [isTalent]
  )

  const goVerify = () => {
    setBlock(null)
    router.push(START_VERIFICATION_HREF)
  }

  const createListingGateDialog = (
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
              ? createListingTitleFor(block.missing)
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

  return { runCreate, createListingGateDialog }
}
