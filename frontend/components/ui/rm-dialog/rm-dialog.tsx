import React from "react"
import {
  Button,
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui"
import { useControllableState } from "@/utils/hooks"

export default function RmDialog({
  trigger,
  open,
  onOpenChange,
  title,
  description,
  onRemove,
}: {
  trigger?: (options: {
    isOpen: boolean
    setIsOpen: (isOpen: boolean) => void
  }) => React.ReactNode
  open?: boolean
  onOpenChange?: (open: boolean) => void
  title?: string
  description?: string
  onRemove?: () => void
}) {
  const [state, setState] = useControllableState({
    value: open,
    onChange: onOpenChange,
    defaultValue: false,
  })
  return (
    <Dialog open={state} onOpenChange={setState}>
      {trigger?.({ isOpen: state, setIsOpen: setState })}

      <DialogContent onInteractOutside={() => setState(false)}>
        <DialogHeader>
          <div className="flex flex-col gap-y-2">
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>{description}</DialogDescription>
          </div>
        </DialogHeader>

        <DialogFooter className="mt-8">
          <DialogClose asChild>
            <Button variant="outlined" visual="gray">
              Cancel
            </Button>
          </DialogClose>
          <Button
            visual="error"
            onClick={() => {
              onRemove?.()
              setState(false)
            }}
          >
            Yes, Remove
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
