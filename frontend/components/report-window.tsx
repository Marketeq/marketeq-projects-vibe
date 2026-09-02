"use client"

import * as React from "react"
import {
  Attachment01,
  Check,
  CheckCircleBroken,
  File02,
  Image01,
  UploadCloud01,
  X,
  X2,
} from "@blend-metrics/icons"
import { create } from "zustand"
import { combine } from "zustand/middleware"
import { ReportsAPI } from "@/service/http/reports"
import { cn } from "@/utils/functions"
import {
  Button,
  Dialog,
  DialogClose,
  DialogContent,
  Listbox,
  ListboxButton,
  ListboxOption,
  ListboxOptions,
  Textarea,
  useToast,
} from "./ui"

const REPORT_REASONS = [
  "Spam or Repetitive Content",
  "False or Misleading Information",
  "Off-Platform Payment Request",
  "Phishing or Fraudulent Activity",
  "Stolen or Copied Content",
  "Impersonation or Fake Team",
  "Fake or Misleading Reviews",
  "Private Information Exposed",
  "Illegal or Prohibited Service",
  "Inappropriate or Restricted Content",
  "Other",
]

const MAX_DESCRIPTION = 5000
const ACCEPTED_EXTENSIONS = [
  ".pdf",
  ".doc",
  ".docx",
  ".jpg",
  ".jpeg",
  ".png",
  ".mp4",
]

export const useReportWindowStore = create(
  combine(
    { open: false, projectId: "", projectTitle: "" },
    (set) => ({
      toggle: (open?: boolean, projectId?: string, projectTitle?: string) =>
        set((state) => ({
          open: typeof open === "boolean" ? open : !state.open,
          projectId: projectId ?? state.projectId,
          projectTitle: projectTitle ?? state.projectTitle,
        })),
    })
  )
)

const formatBytes = (bytes: number): string => {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  return `${(bytes / 1024).toFixed(0)} KB`
}

const fileIcon = (name: string) => {
  const ext = name.split(".").pop()?.toLowerCase() ?? ""
  if (["jpg", "jpeg", "png", "gif", "webp"].includes(ext))
    return <Image01 className="size-4 text-primary-500" />
  return <File02 className="size-4 text-primary-500" />
}

const UploadFiles = ({
  initial,
  onClose,
  onSubmit,
}: {
  initial: File[]
  onClose: () => void
  onSubmit: (files: File[]) => void
}) => {
  const [pending, setPending] = React.useState<File[]>(initial)
  const [dragging, setDragging] = React.useState(false)
  const inputRef = React.useRef<HTMLInputElement>(null)

  const addFiles = (list: FileList | null) => {
    if (!list) return
    setPending((prev) => {
      const seen = new Set(prev.map((p) => `${p.name}:${p.size}`))
      return [
        ...prev,
        ...Array.from(list).filter((f) => !seen.has(`${f.name}:${f.size}`)),
      ]
    })
  }

  const removeFile = (target: File) =>
    setPending((prev) => prev.filter((f) => f !== target))

  return (
    <DialogContent className="max-w-[520px] p-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold leading-7 text-gray-800">
          Upload Files
        </h2>
        <DialogClose
          onClick={onClose}
          className="text-gray-400 hover:text-gray-900 focus-visible:outline-none"
        >
          <X className="size-5" />
        </DialogClose>
      </div>

      <div
        role="button"
        tabIndex={0}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") inputRef.current?.click()
        }}
        onDragOver={(e) => {
          e.preventDefault()
          setDragging(true)
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault()
          setDragging(false)
          addFiles(e.dataTransfer.files)
        }}
        className={cn(
          "mt-4 flex flex-col items-center justify-center gap-y-2 rounded-lg border-2 border-dashed bg-gray-50 py-10 cursor-pointer transition-colors focus-visible:outline-none",
          dragging
            ? "border-primary-400 bg-primary-50"
            : "border-gray-200 hover:border-gray-300"
        )}
      >
        <div className="flex size-11 items-center justify-center rounded-full border border-gray-200 bg-white">
          <UploadCloud01 className="size-5 text-gray-400" />
        </div>
        <p className="text-sm text-gray-500">
          Drag and drop or{" "}
          <span className="font-semibold text-primary-600 underline">
            Choose a File
          </span>
        </p>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept={ACCEPTED_EXTENSIONS.join(",")}
          className="hidden"
          onChange={(e) => addFiles(e.target.files)}
        />
      </div>

      <div className="mt-2 flex items-center justify-between text-xs text-gray-400">
        <span>Supported formats: PDF, DOC, JPG, PNG, MP4</span>
        <span>Maximum file size: 500mb</span>
      </div>

      {pending.length > 0 && (
        <div className="mt-4 max-h-[240px] space-y-3 overflow-y-auto">
          {pending.map((file) => (
            <div
              key={`${file.name}:${file.size}`}
              className="flex items-center gap-x-3 rounded-lg border border-gray-200 bg-white px-3.5 py-2.5"
            >
              <div className="flex size-9 flex-none items-center justify-center rounded-md bg-primary-50">
                {fileIcon(file.name)}
              </div>
              <div className="min-w-0 flex-auto">
                <p className="truncate text-sm font-medium text-gray-800">
                  {file.name}
                </p>
                <p className="text-xs text-gray-500">{formatBytes(file.size)}</p>
              </div>
              <span className="inline-flex size-4 flex-none items-center justify-center rounded-full bg-primary-500">
                <Check className="size-2.5 text-white" />
              </span>
              <button
                type="button"
                onClick={() => removeFile(file)}
                aria-label={`Remove ${file.name}`}
                className="text-gray-400 hover:text-gray-700 focus-visible:outline-none"
              >
                <X2 className="size-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="mt-6 flex items-center justify-end gap-x-3">
        <Button variant="outlined" visual="gray" onClick={onClose}>
          Cancel
        </Button>
        <Button disabled={pending.length === 0} onClick={() => onSubmit(pending)}>
          Submit
        </Button>
      </div>
    </DialogContent>
  )
}

export const ReportWindow = () => {
  const { open, projectId, projectTitle, toggle } = useReportWindowStore()
  const { toast } = useToast()
  const [view, setView] = React.useState<"form" | "success">("form")
  const [reason, setReason] = React.useState("")
  const [description, setDescription] = React.useState("")
  const [attachments, setAttachments] = React.useState<File[]>([])
  const [showUpload, setShowUpload] = React.useState(false)
  const [submitting, setSubmitting] = React.useState(false)

  React.useEffect(() => {
    if (open) {
      setView("form")
      setReason("")
      setDescription("")
      setAttachments([])
      setShowUpload(false)
    }
  }, [open])

  const handleSubmit = async () => {
    if (!reason) return
    setSubmitting(true)
    try {
      await ReportsAPI.reportProject(projectId, {
        reason,
        description: description.trim() || undefined,
        attachments: attachments.map((f) => ({
          name: f.name,
          size: f.size,
          type: f.type,
        })),
      })
      setView("success")
    } catch {
      toast({
        title: "Couldn't submit report",
        description: "Please try again.",
        variant: "destructive",
      })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={toggle}>
      {showUpload ? (
        <UploadFiles
          initial={attachments}
          onClose={() => setShowUpload(false)}
          onSubmit={(files) => {
            setAttachments(files)
            setShowUpload(false)
          }}
        />
      ) : view === "success" ? (
        <DialogContent className="max-w-[440px] p-6">
          <div className="flex flex-col items-center py-4 text-center">
            <div className="flex size-16 items-center justify-center rounded-full bg-[radial-gradient(circle_closest-side,#DCFAE6,transparent)]">
              <CheckCircleBroken className="size-7 text-success-500" />
            </div>
            <h2 className="mt-4 text-lg font-semibold text-gray-800">
              Thank you for contacting us
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              We received your message and we&apos;ll be looking into this
              listing very soon.
            </p>
            <Button className="mt-6 w-full" onClick={() => toggle(false)}>
              Done
            </Button>
          </div>
        </DialogContent>
      ) : (
        <DialogContent className="max-w-[480px] p-6">
          <div className="flex items-start justify-between">
            <h2 className="text-lg font-semibold leading-7 text-gray-800">
              Report this project
            </h2>
            <DialogClose className="text-gray-400 hover:text-gray-900 focus-visible:outline-none">
              <X className="size-5" />
            </DialogClose>
          </div>

          <div className="mt-5 space-y-2">
            <p className="text-sm font-medium text-gray-700">
              Why are you reporting this?
            </p>
            <Listbox value={reason} onChange={setReason}>
              <ListboxButton
                placeholder="Select reason"
                className="w-full justify-between text-base"
                placeholderClassName="text-base"
              />
              <ListboxOptions>
                {REPORT_REASONS.map((r) => (
                  <ListboxOption key={r} value={r}>
                    {r}
                  </ListboxOption>
                ))}
              </ListboxOptions>
            </Listbox>
          </div>

          <div className="mt-5 space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-gray-700">
                Description{" "}
                <span className="font-normal text-gray-500">(optional)</span>
              </p>
              <span className="text-xs text-gray-400">
                {description.length} / {MAX_DESCRIPTION}
              </span>
            </div>
            <Textarea
              className="h-[150px]"
              maxLength={MAX_DESCRIPTION}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Please describe in detail why you are reporting this project"
            />
            <div className="flex items-center gap-x-4 pt-1">
              <button
                type="button"
                aria-label="Attach image"
                onClick={() => setShowUpload(true)}
                className="text-gray-400 hover:text-gray-700 focus-visible:outline-none"
              >
                <Image01 className="size-5" />
              </button>
              <button
                type="button"
                aria-label="Attach file"
                onClick={() => setShowUpload(true)}
                className="inline-flex items-center gap-x-1 text-gray-400 hover:text-gray-700 focus-visible:outline-none"
              >
                <Attachment01 className="size-5" />
                {attachments.length > 0 && (
                  <span className="text-xs font-medium text-gray-500">
                    {attachments.length}
                  </span>
                )}
              </button>
            </div>
          </div>

          <div className="mt-6 flex items-center justify-end gap-x-3">
            <DialogClose asChild>
              <Button variant="outlined" visual="gray">
                Cancel
              </Button>
            </DialogClose>
            <Button disabled={!reason || submitting} onClick={handleSubmit}>
              {submitting ? "Submitting…" : "Submit Report"}
            </Button>
          </div>
        </DialogContent>
      )}
    </Dialog>
  )
}
