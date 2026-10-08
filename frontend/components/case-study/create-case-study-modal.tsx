"use client"

import { useState } from "react"
import { CaseStudyAPI } from "@/service/http/case-study"
import {
  addSection,
  regionsToSchemaJson,
  DEFAULT_CASE_STUDY_TITLE,
  type EditorRegion,
} from "@/lib/case-study-mapper"
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogOverlay,
  DialogTitle,
} from "@/components/ui"
import { useToast } from "@/components/ui/toast/use-toast"
import { SECTION_TILES } from "./template-dialog"

/**
 * "Start Creating Your Case Study" modal — the entry point from the
 * profile Portfolio grid's "Create a Case Study" tile. Both paths create a
 * new case study via CaseStudyAPI and hand the new id back to the caller
 * via onCreated, which opens the existing CaseStudyEditor (which hydrates
 * by fetching that id).
 *
 * "Use a Template" seeds the new case study with one of every section in
 * SECTION_TILES (the same catalog the in-editor "+ Add New Block" picker
 * offers), in that order, so the editor opens already populated with the
 * full template instead of a single empty section — persisted via an
 * immediate Update call before the editor ever mounts.
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
  const [isCreating, setIsCreating] = useState(false)
  const { toast } = useToast()

  const startFromScratch = async () => {
    if (isCreating) return
    setIsCreating(true)
    try {
      const { data } = await CaseStudyAPI.Create({ title: DEFAULT_CASE_STUDY_TITLE })
      onOpenChange(false)
      onCreated(data.id)
    } catch {
      toast({ title: "Couldn't create case study", description: "Please try again." })
    } finally {
      setIsCreating(false)
    }
  }

  const useTemplate = async () => {
    if (isCreating) return
    setIsCreating(true)
    try {
      const { data } = await CaseStudyAPI.Create({ title: DEFAULT_CASE_STUDY_TITLE })
      const sections = SECTION_TILES.reduce<EditorRegion[]>(
        (regions, { type }) => addSection(regions, type),
        []
      )
      await CaseStudyAPI.Update(data.id, {
        schemaJson: regionsToSchemaJson(sections),
      })
      onOpenChange(false)
      onCreated(data.id)
    } catch {
      toast({ title: "Couldn't create case study", description: "Please try again." })
    } finally {
      setIsCreating(false)
    }
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
            disabled={isCreating}
            onClick={startFromScratch}
          >
            Start from Scratch
          </Button>
          <Button className="flex-1" disabled={isCreating} onClick={useTemplate}>
            Use a Template
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
