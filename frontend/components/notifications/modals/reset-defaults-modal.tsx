"use client"

import { X } from "@blend-metrics/icons"
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogOverlay,
  DialogTitle,
} from "@/components/ui"

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => Promise<void> | void
  isLoading?: boolean
}

export default function ResetDefaultsModal({
  open,
  onOpenChange,
  onConfirm,
  isLoading,
}: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* Same shell as the browser-alerts prompt: white body over a gray-25
          action bar, so the padding lives on the sections rather than on
          DialogContent. */}
      <DialogContent
        className="w-[409px] max-w-[calc(100vw-2rem)] gap-0 overflow-hidden p-0 shadow-[0px_20px_24px_-4px_rgba(16,24,40,0.08),0px_8px_8px_-4px_rgba(16,24,40,0.03)]"
        dialogOverlay={
          <DialogOverlay className="bg-gray-700/50 backdrop-blur-[8px]" />
        }
      >
        <div className="flex w-full flex-col items-start gap-2 border-b border-gray-200 p-6">
          <DialogTitle className="w-full text-lg leading-7 font-semibold text-dark-blue-400">
            Reset all notifications to default?
          </DialogTitle>
          <DialogDescription className="text-sm font-light text-dark-blue-400">
            All notifications will be reverted to default
          </DialogDescription>
        </div>

        <div className="flex w-full items-center justify-between gap-8 rounded-b-xl bg-gray-25 px-6 py-4">
          <Button
            variant="link"
            visual="gray"
            size="sm"
            className="h-5 p-0 opacity-50"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
            leftIcon={<X className="size-[15px] text-dark-blue-400" />}
          >
            Cancel
          </Button>
          <Button
            variant="outlined"
            visual="gray"
            size="sm"
            className="bg-white shadow-xs"
            onClick={async () => {
              await onConfirm()
              onOpenChange(false)
            }}
            disabled={isLoading}
          >
            {isLoading ? "Please wait..." : "Yes, Reset to Default"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
