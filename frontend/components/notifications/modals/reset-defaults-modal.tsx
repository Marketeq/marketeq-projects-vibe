"use client"

import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
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
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Reset all notifications to default?</DialogTitle>
          <DialogDescription>
            All notifications will be reverted to default
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="mt-4 flex gap-2 sm:gap-2">
          <Button
            variant="outlined"
            visual="gray"
            size="sm"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={async () => {
              await onConfirm()
              onOpenChange(false)
            }}
            disabled={isLoading}
          >
            {isLoading ? "Resetting..." : "Reset To Default"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
