"use client"

import { useState } from "react"
import { HelpCircle } from "@blend-metrics/icons"
import {
  Button,
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
  useToast,
} from "@/components/ui"
import { createManualTime } from "@/service/http/manual-time"

// F-10 Log Time Modal (US-75–81). Shared between the Time Tracking screen and
// the Earnings tabs (US-75: reachable from within the Earnings area, not just
// by navigating away to /time-tracking).
export function AddManualTimeDialog({
  open,
  onOpenChange,
  onSaved,
  contracts,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSaved?: () => void
  contracts?: Array<{ id: string; title: string }>
}) {
  const { toast } = useToast()
  const [date, setDate] = useState("")
  const [startTime, setStartTime] = useState("")
  const [endTime, setEndTime] = useState("")
  const [contract, setContract] = useState("")
  const [task, setTask] = useState("")
  const [notes, setNotes] = useState("")
  // US-81: submission failure must surface inline in the modal, not just as
  // an external toast that can be missed while the modal stays open.
  const [submitError, setSubmitError] = useState("")

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Manual Time</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-dark-blue-400">
              Date
            </label>
            <Input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              placeholder="Select Date"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-dark-blue-400">
                Start Time
              </label>
              <Input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                placeholder="Enter start time"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-dark-blue-400">
                End Time
              </label>
              <Input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                placeholder="Enter end time"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-dark-blue-400">
              Contract
            </label>
            {/* US-77: explain why the picker is empty rather than showing a
                Select with no options and no explanation. */}
            {(contracts || []).length === 0 ? (
              <p className="text-sm text-gray-400">
                You don&apos;t have any active contracts to log time against.
              </p>
            ) : (
              <Select value={contract} onValueChange={setContract}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select Contract" />
                </SelectTrigger>
                <SelectContent>
                  {(contracts || []).map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-dark-blue-400">
              Task
            </label>
            <Select value={task} onValueChange={setTask}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select Task" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="editing">Editing Layouts</SelectItem>
                <SelectItem value="logo">Creating logo</SelectItem>
                <SelectItem value="wireframes">Wireframing</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-dark-blue-400">
              Notes
            </label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Tell us what you worked on"
              rows={3}
            />
          </div>

          <p className="text-xs text-gray-400 flex items-center gap-1.5">
            <HelpCircle className="size-3.5 flex-none" />
            Manual time will appear in your timeline without screenshots and may
            be subject to review or approval.
          </p>
        </div>

        {submitError && (
          <p className="text-sm text-red-600 px-1">{submitError}</p>
        )}

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outlined" visual="gray">
              Cancel
            </Button>
          </DialogClose>
          <Button
            disabled={!date || !startTime || !endTime || !contract}
            onClick={async () => {
              setSubmitError("")
              try {
                const startISO = new Date(`${date}T${startTime}:00`).toISOString()
                const endISO = new Date(`${date}T${endTime}:00`).toISOString()
                if (new Date(endISO) <= new Date(startISO)) {
                  setSubmitError("End time must be after start time.")
                  return
                }
                await createManualTime({
                  startTime: startISO,
                  endTime: endISO,
                  projectId: contract,
                  taskId: task || undefined,
                  notes: notes || undefined,
                })
                onOpenChange(false)
                // US-80: manual time is submitted for confirmation, not
                // immediately reflected in earnings — say so explicitly.
                toast({ title: "Manual time added", description: `${startTime} – ${endTime}. Your earnings will appear once this session is confirmed.` })
                onSaved?.()
              } catch {
                setSubmitError("Failed to add manual time. Please try again.")
              }
            }}
          >
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
