"use client"

import * as React from "react"
import { X } from "@blend-metrics/icons"
import {
  Button,
  Dialog,
  DialogClose,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui"

export type PublishListingType = "project" | "service"

// PMCM-403: single shared copy source for every publish entry point
// (dashboard, wizard, inline editor) so the three can't drift — per
// Figma's "Publishing the Offer" section (ju1jerELmf8Xq9oJepX5rn,
// 13404:55266).
export const getPublishedToastTitle = (listingType: PublishListingType): string =>
  listingType === "service" ? "Your service is live" : "Your project is live"

// PMCM-403: publish can also succeed with status "pending_review" when image
// or video moderation holds the listing (applyModerationDecision in
// listings-service) — it is not live yet, so callers show this instead.
export const getPendingReviewToastTitle = (
  listingType: PublishListingType
): string =>
  listingType === "service"
    ? "Your service is pending review"
    : "Your project is pending review"

export const isPublishedResponse = (response: unknown): boolean =>
  (response as { data?: { status?: unknown } } | undefined)?.data?.status ===
  "published"

/**
 * PMCM-403: the one reusable "Publish this project/service?" confirmation
 * dialog, built from existing DS Dialog parts only. Generalizes the ad-hoc
 * dialog that already existed in my-listings/[slug]/page.tsx (handlePublish,
 * ~L2404-2443) so the wizard and the dashboard can use the identical modal
 * instead of each hand-rolling their own. The caller owns all state
 * (open/loading) and the actual publish API call — this component only
 * renders the confirmation and reports the user's choice.
 */
export function PublishConfirmDialog({
  open,
  onOpenChange,
  onConfirm,
  listingType,
  loading = false,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => void
  listingType: PublishListingType
  loading?: boolean
}) {
  const noun = listingType === "service" ? "service" : "project"

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* PMCM-403/F1: the fixed 416px max-width is copied verbatim from the
          original inline-editor dialog it replaces — no catalogued DS
          Dialog size/className already covers this width, so it's kept
          as-is rather than approximated with a different value. */}
      <DialogContent className="p-0" style={{ maxWidth: 416 }}>
        <div className="p-6">
          <DialogTitle>Publish this {noun}?</DialogTitle>
          <DialogDescription className="mt-2">
            Your {noun} will be visible live in the marketplace.
          </DialogDescription>
        </div>

        <div className="border-t border-gray-200 py-4 px-6 flex items-center justify-between">
          <DialogClose asChild>
            <Button variant="link" visual="gray" disabled={loading}>
              <X className="size-[15px]" />
              Cancel
            </Button>
          </DialogClose>
          <Button
            variant="outlined"
            visual="gray"
            onClick={onConfirm}
            disabled={loading}
          >
            {loading ? "Publishing…" : "Yes, Publish"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
