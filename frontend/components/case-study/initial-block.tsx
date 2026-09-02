"use client"

import { Plus } from "@blend-metrics/icons"
import { Button } from "@/components/ui"

/**
 * Empty-state drop zone shown before any sections have been added. The case
 * study title header lives in CaseStudyEditor itself (rendered above this),
 * not here — it needs to stay visible once blocks exist too, not just in
 * this empty state.
 */
export const InitialBlock = ({ onAddBlock }: { onAddBlock?: () => void }) => {
  return (
    <div className="border-2 border-dashed text-gray-200 cursor-pointer data-[state=active]:bg-gray-100 bg-gray-50 p-6 rounded-[8px]">
      <div className="p-6">
        <div className="max-w-[206px] mx-auto">
          <h3 className="text-base text-center leading-6 font-medium text-gray-900">
            Drag Your Fields Here
          </h3>
          <p className="text-xs text-center leading-none mt-0.5 text-gray-500">
            No fields have been added yet. Let's add some fields now.
          </p>
        </div>

        <div className="flex items-center justify-center mt-5">
          <Button
            onClick={onAddBlock}
            className="bg-white"
            variant="outlined"
            visual="gray"
          >
            <Plus className="size-[15px]" /> Add New Block
          </Button>
        </div>
      </div>
    </div>
  )
}
