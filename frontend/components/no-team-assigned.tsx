"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { resolveDashboardRole } from "@/contexts/auth"
import { ROLE } from "@/types/user"
import { ClaimConflictError } from "@/src/lib/api/claim"
import { CheckCircle, User01 } from "@blend-metrics/icons"
import { NextLink } from "@/components/next-link"
import {
  Button,
  Dialog,
  DialogContent,
  DialogTitle,
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui"

/**
 * Who may see the unclaimed-team state.
 *
 * `resolveDashboardRole` returns undefined when an account carries none of
 * `role` / `accountType` / `userType` in a form it recognises. Requiring an
 * explicit TALENT match meant those accounts were silently treated as clients
 * and never saw the state at all. This asks the inverse question instead:
 * everyone signed in may see it EXCEPT accounts we can positively identify as
 * clients. Signed out stays hidden, since it is treated as a client.
 */
export const isTalentAccount = (user?: Parameters<typeof resolveDashboardRole>[0]) =>
  !!user && resolveDashboardRole(user) !== ROLE.CLIENT

/**
 * Shown wherever a project or service has no owner and no team yet.
 * Talent-facing only: the caller decides who sees it. Clients and signed-out
 * visitors should render nothing at all rather than this component.
 *
 * Hovering reveals a white tooltip with the claim call to action.
 */
export const NoTeamAssigned = ({
  kind,
  onClaim,
  editHref,
  learnMoreHref,
}: {
  kind: "project" | "service"
  /** Persists the claim. Resolve to move the dialog to its success step. */
  onClaim?: () => void | Promise<void>
  /** Where "Edit Project" goes once the claim succeeds. */
  editHref?: string
  /** Optional guide linked from the success step. Omit and the link is hidden. */
  learnMoreHref?: string
}) => {
  const label = kind === "service" ? "Service" : "Project"
  const lower = label.toLowerCase()
  // A project ships once; a service runs on a recurring cycle. Keep the
  // wording honest for each rather than talking about "delivery" for both.
  const runIt =
    kind === "service" ? "keep clients happy" : "lead it to delivery"
  const runningIt =
    kind === "service" ? "keeping clients happy" : "leading it to delivery"
  const router = useRouter()
  const [step, setStep] = useState<
    "closed" | "confirm" | "done" | "taken"
  >("closed")
  const [claiming, setClaiming] = useState(false)

  // Radix dismisses both Tooltip and HoverCard on the trigger's pointerdown,
  // and will not reopen until the pointer leaves and returns. Passing `open`
  // with no `onOpenChange` makes it fully controlled, so only the pointer
  // handlers below can change it and a click cannot close it.
  const [hoverOpen, setHoverOpen] = useState(false)
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const cancelClose = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current)
    closeTimer.current = null
  }
  const openHover = () => {
    cancelClose()
    setHoverOpen(true)
  }
  // Small delay so the pointer can travel from the trigger onto the panel.
  const scheduleClose = () => {
    cancelClose()
    closeTimer.current = setTimeout(() => setHoverOpen(false), 120)
  }
  useEffect(() => cancelClose, [])
  const [error, setError] = useState<string | null>(null)

  const confirmClaim = async () => {
    setClaiming(true)
    setError(null)
    try {
      await onClaim?.()
      setStep("done")
    } catch (e) {
      if (e instanceof ClaimConflictError) {
        // Somebody committed first. Refresh so the card stops offering it.
        setStep("taken")
        router.refresh()
      } else {
        setError(
          e instanceof Error ? e.message : "Something went wrong. Try again."
        )
      }
    } finally {
      setClaiming(false)
    }
  }

  const closeDialog = () => {
    setStep("closed")
    setError(null)
  }
  return (
    <>
    <HoverCard open={hoverOpen}>
      <HoverCardTrigger asChild>
          {/* HoverCard, not Tooltip: a tooltip closes on trigger pointerdown and
              will not reopen until the pointer leaves and returns, and Radix's
              Slot merges handlers without honouring preventDefault so it cannot
              be suppressed. HoverCard is also the correct primitive for content
              that contains a control. */}
          <div
            className="group/noteam flex items-center gap-x-2 cursor-pointer"
            onMouseEnter={openHover}
            onMouseLeave={scheduleClose}
          >
            <div className="flex items-center -space-x-2">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="size-8 rounded-full border border-dashed border-gray-300 bg-gray-100 flex items-center justify-center ring-2 ring-white transition-colors duration-300 group-hover/noteam:border-gray-400 group-hover/noteam:bg-gray-200"
                >
                  <User01 className="size-3.5 text-gray-400" />
                </div>
              ))}
            </div>
            <span className="text-xs text-gray-400 font-extralight leading-none">
              No team assigned yet
            </span>
          </div>
      </HoverCardTrigger>
      <HoverCardContent
        side="top"
        align="start"
        sideOffset={8}
        onMouseEnter={openHover}
        onMouseLeave={scheduleClose}
        className="w-[268px] bg-white p-3.5 text-left shadow-[0px_12px_16px_-4px_rgba(16,24,40,0.08)]"
      >
          <p className="text-sm font-semibold leading-none text-dark-blue-400">
            Claim this {label}
          </p>
          <p className="mt-1.5 text-xs font-light leading-[1.5] text-gray-500">
            No one owns this {lower} yet. Claim it to become the owner, build
            your team, and {runIt}.
          </p>
          <button
            type="button"
            className="mt-2.5 text-xs font-semibold leading-none text-primary-500 hover:underline focus-visible:outline-none"
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              setHoverOpen(false)
              setStep("confirm")
            }}
          >
            Claim this {label}
          </button>
      </HoverCardContent>
    </HoverCard>

    <Dialog
      open={step !== "closed"}
      onOpenChange={(next) => !next && closeDialog()}
    >
      <DialogContent className="w-[440px] max-w-[440px] p-6">
        {step === "confirm" ? (
          <>
            <DialogTitle className="text-lg font-semibold leading-7 text-dark-blue-400">
              Claim this {label}?
            </DialogTitle>
            <p className="mt-2 text-sm font-light leading-[1.5] text-gray-500">
              You will become the owner of this {lower}. That means building it
              out properly, assembling the team and {runningIt}, so it looks
              credible to the client. Only claim what you intend to run.
            </p>
            {error && (
              <p className="mt-3 text-sm font-medium leading-[1.5] text-error-500">
                {error}
              </p>
            )}
            <div className="mt-6 flex items-center justify-end gap-x-3">
              <Button variant="outlined" visual="gray" onClick={closeDialog}>
                Cancel
              </Button>
              <Button
                visual="primary"
                disabled={claiming}
                onClick={confirmClaim}
              >
                {claiming ? "Claiming…" : "Yes, Claim It"}
              </Button>
            </div>
          </>
        ) : step === "taken" ? (
          <>
            <DialogTitle className="text-lg font-semibold leading-7 text-dark-blue-400">
              Someone claimed it first
            </DialogTitle>
            <p className="mt-2 text-sm font-light leading-[1.5] text-gray-500">
              This {lower} was claimed moments ago, so it is no longer
              available. Plenty of others still need an owner.
            </p>
            <div className="mt-6 flex items-center justify-end">
              <Button visual="primary" onClick={closeDialog}>
                Close
              </Button>
            </div>
          </>
        ) : (
          <>
            <div className="flex size-12 items-center justify-center rounded-full bg-success-50">
              <CheckCircle className="size-6 text-success-500" />
            </div>
            <DialogTitle className="mt-4 text-lg font-semibold leading-7 text-dark-blue-400">
              This {lower} is yours
            </DialogTitle>
            <p className="mt-2 text-sm font-light leading-[1.5] text-gray-500">
              Make it yours. Swap the stock images for your own, then shape the
              description and scope around your expertise. Invite your team once
              it is ready.
            </p>
            <div className="mt-6 flex items-center justify-between gap-x-3">
              {learnMoreHref ? (
                <NextLink
                  href={learnMoreHref}
                  className="text-xs font-semibold text-primary-500 hover:underline"
                >
                  Show me how to maximize my {lower}
                </NextLink>
              ) : (
                <span />
              )}
              <div className="flex items-center gap-x-3">
              <Button variant="outlined" visual="gray" onClick={closeDialog}>
                Close
              </Button>
              {editHref ? (
                <Button visual="primary" asChild>
                  <NextLink href={editHref}>Edit My {label}</NextLink>
                </Button>
              ) : (
                <Button visual="primary" onClick={closeDialog}>
                  Edit My {label}
                </Button>
              )}
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
    </>
  )
}
