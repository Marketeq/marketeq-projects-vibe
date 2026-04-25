"use client"

import { useCallback, useEffect, useState } from "react"
import { ChevronRight, File, Folder, X } from "@blend-metrics/icons"
import {
  Button,
  Dialog,
  DialogClose,
  DialogContent,
  IconButton,
} from "@/components/ui"
import { Spinner } from "@/components/ui/spinner/spinner"
import {
  downloadOneDriveItems,
  getOneDriveToken,
  listOneDriveFolder,
  OneDriveItem,
} from "../hooks/use-cloud-picker"

type Crumb = { id: string | null; name: string }

interface OneDrivePickerDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onPicked?: (count: number) => void
  onConfirm: (files: File[]) => void
}

export function OneDrivePickerDialog({
  open,
  onOpenChange,
  onPicked,
  onConfirm,
}: OneDrivePickerDialogProps) {
  const [token, setToken] = useState<string | null>(null)
  const [authError, setAuthError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [items, setItems] = useState<OneDriveItem[]>([])
  const [path, setPath] = useState<Crumb[]>([{ id: null, name: "My files" }])
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [downloading, setDownloading] = useState(false)

  const currentFolderId = path[path.length - 1]?.id ?? null

  const authenticate = useCallback(async () => {
    setAuthError(null)
    try {
      const { token: t } = await getOneDriveToken()
      setToken(t)
    } catch (err: any) {
      console.error("OneDrive auth failed:", err)
      setAuthError(err?.message || "Failed to sign in to OneDrive")
    }
  }, [])

  const loadFolder = useCallback(
    async (folderId: string | null, authToken: string) => {
      setLoading(true)
      try {
        const data = await listOneDriveFolder(authToken, folderId)
        setItems(data)
      } catch (err: any) {
        console.error("OneDrive list failed:", err)
        setAuthError(err?.message || "Failed to list OneDrive items")
      } finally {
        setLoading(false)
      }
    },
    []
  )

  // Reset state when the dialog closes.
  useEffect(() => {
    if (!open) {
      setSelected(new Set())
      setItems([])
      setPath([{ id: null, name: "My files" }])
      setAuthError(null)
      setDownloading(false)
    }
  }, [open])

  // Authenticate on first open if we don't have a token yet.
  useEffect(() => {
    if (!open) return
    if (!token && !authError) authenticate()
  }, [open, token, authError, authenticate])

  // Load the current folder when token becomes available or folder changes.
  useEffect(() => {
    if (!open || !token) return
    loadFolder(currentFolderId, token)
  }, [open, token, currentFolderId, loadFolder])

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const enterFolder = (item: OneDriveItem) => {
    setPath((prev) => [...prev, { id: item.id, name: item.name }])
    setSelected(new Set())
  }

  const goTo = (index: number) => {
    setPath((prev) => prev.slice(0, index + 1))
    setSelected(new Set())
  }

  const handleConfirm = async () => {
    if (!token || selected.size === 0) return
    const picked = items.filter((i) => selected.has(i.id) && !i.folder)
    if (picked.length === 0) return
    onPicked?.(picked.length)
    onOpenChange(false)
    setDownloading(true)
    try {
      const files = await downloadOneDriveItems(picked, token)
      onConfirm(files)
    } catch (err) {
      console.error("OneDrive download failed:", err)
      onConfirm([])
    } finally {
      setDownloading(false)
    }
  }

  const fileItems = items.filter((i) => !i.folder)
  const folderItems = items.filter((i) => i.folder)
  const pickableSelectedCount = fileItems.filter((f) => selected.has(f.id)).length

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[640px] p-0" accessibilityTitle="OneDrive file picker">
        <div className="flex items-center justify-between border-b border-gray-200 px-5 py-3">
          <h3 className="text-sm font-semibold text-gray-900">Upload from OneDrive</h3>
          <DialogClose asChild>
            <IconButton visual="gray" variant="ghost" size="sm" className="rounded-full">
              <X className="size-4" />
            </IconButton>
          </DialogClose>
        </div>

        {/* Breadcrumb */}
        <div className="flex items-center gap-x-1 px-5 py-2 text-xs text-gray-500">
          {path.map((crumb, i) => (
            <div key={`${crumb.id ?? "root"}-${i}`} className="inline-flex items-center gap-x-1">
              {i > 0 && <ChevronRight className="size-3 text-gray-400" />}
              <button
                type="button"
                className={`hover:text-gray-800 ${i === path.length - 1 ? "font-semibold text-gray-900" : ""}`}
                onClick={() => goTo(i)}
                disabled={i === path.length - 1}
              >
                {crumb.name}
              </button>
            </div>
          ))}
        </div>

        {/* Body */}
        <div className="min-h-[320px] max-h-[420px] overflow-y-auto px-2 py-1">
          {authError && (
            <div className="m-3 rounded-md border border-error-200 bg-error-50 p-3 text-xs text-error-600">
              {authError}
              <button
                type="button"
                className="ml-2 font-semibold underline"
                onClick={authenticate}
              >
                Retry
              </button>
            </div>
          )}

          {loading && (
            <div className="flex items-center justify-center py-12 text-gray-400 gap-x-2">
              <Spinner size={16} strokeWidth={3} />
              <span className="text-xs">Loading…</span>
            </div>
          )}

          {!loading && !authError && items.length === 0 && (
            <div className="flex items-center justify-center py-12 text-gray-400 text-xs">
              This folder is empty.
            </div>
          )}

          {!loading && !authError && folderItems.length > 0 && (
            <div className="flex flex-col">
              {folderItems.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  className="flex items-center gap-x-3 rounded-md px-3 py-2 text-left hover:bg-gray-50"
                  onClick={() => enterFolder(f)}
                >
                  <Folder className="size-5 text-primary-500 shrink-0" />
                  <span className="flex-1 truncate text-sm text-gray-900">{f.name}</span>
                  <ChevronRight className="size-4 text-gray-400 shrink-0" />
                </button>
              ))}
            </div>
          )}

          {!loading && !authError && fileItems.length > 0 && (
            <div className="flex flex-col">
              {fileItems.map((f) => {
                const isSelected = selected.has(f.id)
                const sizeLabel = formatSize(f.size)
                return (
                  <label
                    key={f.id}
                    className={`flex items-center gap-x-3 rounded-md px-3 py-2 cursor-pointer ${isSelected ? "bg-primary-50" : "hover:bg-gray-50"}`}
                  >
                    <input
                      type="checkbox"
                      className="size-4 shrink-0 accent-primary-500"
                      checked={isSelected}
                      onChange={() => toggleSelect(f.id)}
                    />
                    <File className="size-5 text-gray-500 shrink-0" />
                    <span className="flex-1 truncate text-sm text-gray-900">{f.name}</span>
                    {sizeLabel && (
                      <span className="shrink-0 text-[11px] text-gray-500">{sizeLabel}</span>
                    )}
                  </label>
                )
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-gray-200 px-5 py-3">
          <span className="text-xs text-gray-500">
            {pickableSelectedCount > 0
              ? `${pickableSelectedCount} file${pickableSelectedCount === 1 ? "" : "s"} selected`
              : "Select one or more files"}
          </span>
          <div className="flex gap-x-2">
            <DialogClose asChild>
              <Button visual="gray" variant="outlined" size="sm">
                Cancel
              </Button>
            </DialogClose>
            <Button
              size="sm"
              disabled={pickableSelectedCount === 0 || downloading}
              onClick={handleConfirm}
            >
              {downloading ? <Spinner size={14} strokeWidth={3} /> : "Select"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function formatSize(bytes?: number): string {
  if (!bytes && bytes !== 0) return ""
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
