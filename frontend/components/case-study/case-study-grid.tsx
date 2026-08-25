"use client"

import { useState } from "react"
import { Image01, Upload } from "@blend-metrics/icons"
import { useCaseStudyStore } from "@/lib/hooks/use-case-study-store"
import { Button } from "@/components/ui"
import { CaseStudyCard } from "./case-study-card"
import { CreateCaseStudyModal } from "./create-case-study-modal"

const COLUMNS = 3

/**
 * Empty-state placeholder tile — no title, no badge. Hover reveals a
 * centered "Add Case Study" CTA over a dark overlay, per the Figma
 * "Property 1=Empty / Hover" variant's full layer CSS (the icon, overlay,
 * and button are all `position: absolute`, independent of the frame's own
 * flex/padding): `Rectangle 133` is `rgba(0,0,0,0.6)` covering the card,
 * and the button is a solid-white `border-radius:100px` pill (Gray/500
 * text+icon, 15px icon, 8px/14px padding — matches Button size="sm").
 */
const BlankCaseStudyCard = ({ onClick }: { onClick: () => void }) => (
  <div className="group relative h-[200px] w-full overflow-hidden rounded-lg border border-gray-200 bg-gray-100">
    <div className="absolute inset-0 flex items-center justify-center">
      <Image01 className="size-10 text-gray-300" />
    </div>

    <div className="absolute inset-0 flex items-center justify-center bg-black/60 opacity-0 pointer-events-none transition duration-300 group-hover:opacity-100 group-hover:pointer-events-auto">
      <Button
        type="button"
        size="sm"
        variant="filled"
        visual="gray"
        className="rounded-full bg-white text-gray-500 text-xs leading-5 shadow-xs"
        onClick={onClick}
      >
        <Upload className="size-[15px]" />
        Add Case Study
      </Button>
    </div>
  </div>
)

/**
 * Portfolio-tab case study grid. Reads straight from the localStorage store
 * shared with the case study editor/dashboard (lib/hooks/use-case-study-store.ts)
 * — replaces the old hardcoded PortfolioCards section.
 *
 * `canCreate` gates the "Create a Case Study" tile and draft visibility:
 * pass true only when the viewer owns this profile and is in edit mode.
 * When false (a client viewing someone else's profile), only published
 * case studies show, and the grid renders nothing at all if there aren't
 * any — same convention the old `!isClientView || hasPortfolio` gate used.
 */
export function CaseStudyGrid({
  canCreate = true,
  onOpenEditor,
}: {
  canCreate?: boolean
  onOpenEditor: (caseStudyId: string) => void
}) {
  const { caseStudies, deleteCaseStudy, toggleCaseStudyVisibility } =
    useCaseStudyStore()
  const [modalOpen, setModalOpen] = useState(false)
  const [isShowing, setIsShowing] = useState(false)

  const visible = canCreate
    ? caseStudies
    : caseStudies.filter((cs) => cs.status === "published")

  if (!canCreate && visible.length === 0) return null

  // Pad the current (partial) row out to COLUMNS so it never ends mid-row,
  // and — once a row is exactly full, including the 0-case-study state —
  // add a whole extra row of blanks so there's always somewhere to add the
  // next case study.
  const remainder = visible.length % COLUMNS
  const partialRowBlanks =
    canCreate && remainder !== 0 ? COLUMNS - remainder : 0
  const newRowBlanks = canCreate && remainder === 0 ? COLUMNS : 0
  const blankCount = partialRowBlanks + newRowBlanks

  // Real cards first, then blanks — same left-to-right, row-major order the
  // grid renders in, so slicing the first COLUMNS entries below always
  // means "row 1" regardless of how the real/blank split falls.
  const tiles = [
    ...visible.map((cs) => ({ kind: "card" as const, cs })),
    ...Array.from({ length: blankCount }, (_, i) => ({
      kind: "blank" as const,
      key: i,
    })),
  ]

  // Row 1 always shows. View More/Less only appears — and only then hides
  // row 2+ — once there's more than one row's worth of tiles, whether that
  // second row holds real case studies or just the "add more" blanks.
  const hasMoreThanOneRow = tiles.length > COLUMNS
  const shownTiles = hasMoreThanOneRow && !isShowing
    ? tiles.slice(0, COLUMNS)
    : tiles

  return (
    <>
      <div className="grid grid-cols-3 gap-6">
        {shownTiles.map((tile) =>
          tile.kind === "card" ? (
            <CaseStudyCard
              key={tile.cs.id}
              caseStudy={tile.cs}
              onClick={() => onOpenEditor(tile.cs.id)}
              onDelete={deleteCaseStudy}
              onToggleVisibility={toggleCaseStudyVisibility}
            />
          ) : (
            <BlankCaseStudyCard
              key={`blank-${tile.key}`}
              onClick={() => setModalOpen(true)}
            />
          )
        )}
      </div>

      {hasMoreThanOneRow && (
        <div className="mt-6 flex items-center gap-4">
          <div className="h-px flex-1 bg-gray-200" />
          <Button
            variant="link"
            visual="gray"
            onClick={() => setIsShowing((prev) => !prev)}
          >
            {isShowing ? "View Less" : "View More"}
          </Button>
          <div className="h-px flex-1 bg-gray-200" />
        </div>
      )}

      {canCreate && (
        <CreateCaseStudyModal
          open={modalOpen}
          onOpenChange={setModalOpen}
          onCreated={(id) => {
            setModalOpen(false)
            onOpenEditor(id)
          }}
        />
      )}
    </>
  )
}
