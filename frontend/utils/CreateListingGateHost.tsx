"use client"

import { useEffect, useState } from "react"
import { AlertTriangle } from "@blend-metrics/icons"
import { Button, Dialog, DialogClose, DialogContent } from "@/components/ui"
import { AccountVerificationGate } from "@/components/account-verification-gate"
import {
  CREATE_LISTING_BLOCKED_EVENT,
  createListingTitleFor,
  type CreateListingBlock,
} from "@/src/lib/api/create-listing-gate"
import { useIdentityVerification } from "@/contexts/identity-verification-host"

// G2: the one modal for every way of starting a listing. ProjectAPI.CreateProjectDraft asks
// the backend's read-only creation check before it POSTs, and announces a refusal here, so
// the dashboard buttons, /my-listings (Project and Service), the legacy publish-project,
// job-listing and edit-listing pages and the my-listings/[slug] fallback all land on this
// same modal. A refusal shows "To publish this job, you must verify ..." for what is missing
// (identity and location / identity / location) with Cancel and Start Verification; an
// unreadable gate shows the existing status-unavailable popup. Nothing is created while
// blocked. Cancel, Esc and an outside click only close the modal. Start Verification closes the
// modal and starts the existing Identity Verification flow in place, over whatever page the
// modal is on, through the shared host (so this component is mounted inside its provider, in
// the root layout): no navigation, no reload, and no draft is created or retried afterwards;
// the talent clicks the original create action again.
export function CreateListingGateHost() {
  const { startVerification } = useIdentityVerification()
  const [block, setBlock] = useState<CreateListingBlock | null>(null)

  useEffect(() => {
    const onBlocked = (event: Event) => {
      setBlock((event as CustomEvent<CreateListingBlock>).detail)
    }
    window.addEventListener(CREATE_LISTING_BLOCKED_EVENT, onBlocked)
    return () => window.removeEventListener(CREATE_LISTING_BLOCKED_EVENT, onBlocked)
  }, [])

  const goVerify = () => {
    setBlock(null)
    void startVerification()
  }

  return (
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
}
