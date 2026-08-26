"use client"

import {
  addSection,
  createCaseStudy,
  saveCaseStudy,
} from "@/lib/hooks/use-case-study-store"
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogOverlay,
  DialogTitle,
} from "@/components/ui"
import { SECTION_TILES } from "./template-dialog"

const DEFAULT_TITLE = "Your case study's title"

/**
 * "Start Creating Your Case Study" modal — the entry point from the
 * profile Portfolio grid's "Create a Case Study" tile. Both paths create a
 * new case study in the same localStorage store the rest of the builder
 * uses (see lib/hooks/use-case-study-store.ts) and hand the new id back to
 * the caller via onCreated, which opens the existing CaseStudyEditor.
 *
 * "Use a Template" seeds the new case study with one of every section in
 * SECTION_TILES (the same catalog the in-editor "+ Add New Block" picker
 * offers), in that order, so the editor opens already populated with the
 * full template instead of a single empty section.
 */
export function CreateCaseStudyModal({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated: (caseStudyId: string) => void
}) {
  const startFromScratch = () => {
    const cs = createCaseStudy(DEFAULT_TITLE)
    onOpenChange(false)
    onCreated(cs.id)
  }

  const useTemplate = () => {
    const cs = createCaseStudy(DEFAULT_TITLE)
    const sections = SECTION_TILES.reduce(
      (regions, { type }) => addSection(regions, type),
      cs.sections
    )
    saveCaseStudy({ id: cs.id, sections })
    onOpenChange(false)
    onCreated(cs.id)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        dialogOverlay={<DialogOverlay className="backdrop-blur-md z-[110]" />}
        className="max-w-[400px] p-6 z-[110]"
      >
        <DialogTitle className="text-lg leading-7 font-semibold text-gray-900">
          Start Creating Your Case Study
        </DialogTitle>
        <DialogDescription className="mt-2 text-sm text-gray-500">
          Showcase Your Work with Impact.
        </DialogDescription>

        <div className="mt-8 flex items-center gap-x-3">
          <Button
            className="flex-1"
            variant="outlined"
            visual="gray"
            onClick={startFromScratch}
          >
            Start from Scratch
          </Button>
          <Button className="flex-1" onClick={useTemplate}>
            Use a Template
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
