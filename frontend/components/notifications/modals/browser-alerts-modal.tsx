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
  mode: "enable" | "disable"
  onOpenChange: (open: boolean) => void
  onConfirm: () => Promise<void> | void
  isLoading?: boolean
}

export default function BrowserAlertsModal({
  open,
  mode,
  onOpenChange,
  onConfirm,
  isLoading,
}: Props) {
  const isEnable = mode === "enable"
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>
            {isEnable ? "Enable browser alerts?" : "Disable browser alerts?"}
          </DialogTitle>
          <DialogDescription>
            {isEnable
              ? "You'll receive push notifications from this browser when new alerts come in."
              : "You'll stop receiving browser push notifications. You can re-enable them anytime."}
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
            }}
            disabled={isLoading}
          >
            {isLoading
              ? "Please wait..."
              : isEnable
                ? "Enable Alerts"
                : "Disable Alerts"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
