"use client"

import { useEffect, useState } from "react"
import { PlaySquare, X } from "@blend-metrics/icons"
import { cn } from "@/utils/functions"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogOverlay,
  DialogTitle,
  EditableArea,
  EditableInput,
  EditableLabel,
  EditablePreview,
  EditableRoot,
  PictureEditor,
} from "@/components/ui"
import { uploadCaseStudyImage } from "@/lib/case-study-upload"
import type { VideoData } from "@/lib/case-study-mapper"
import { BlockImageToolbar } from "@/components/case-study/toolbars"

/**
 * Ported as-is from the old case-study-builder.tsx, which renders video with
 * a plain HTML5 <video> element (edit and view mode both), not react-player
 * — react-player is a package dependency but isn't actually used anywhere in
 * the existing case study code. Kept faithful to what's live rather than
 * introducing a new library mid-extraction.
 */
function VideoEdit({
  className,
  initialData,
  onDataChange,
}: {
  className?: string
  initialData?: Record<string, unknown>
  onDataChange?: (data: VideoData) => void
}) {
  const [posterUrl, setPosterUrl] = useState<string | undefined>(
    initialData?.posterUrl as string | undefined
  )
  const [videoUrl, setVideoUrl] = useState(
    (initialData?.videoUrl as string) ?? ""
  )
  const [caption, setCaption] = useState((initialData?.caption as string) ?? "")
  const [open, setOpen] = useState(false)

  useEffect(() => {
    onDataChange?.({ posterUrl: posterUrl ?? "", videoUrl, caption })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [posterUrl, videoUrl, caption])

  return (
    <div className={cn("relative bg-gray-50 rounded-lg group", className)}>
      <div className="relative h-[498.2px] flex flex-col justify-end overflow-hidden">
        <PictureEditor
          onValueChange={(files) => {
            const file = (files as File[] | undefined)?.[0]
            if (file instanceof File) {
              uploadCaseStudyImage(file).then(setPosterUrl)
            }
          }}
          startingPoint={({ dataUrl, open: openPicker, style, onRemove, onEdit }) => (
            <div className="group-data-[state=dragged]/article:pointer-events-none overflow-hidden absolute inset-0 group/image size-full grid rounded-lg place-items-center group-hover:bg-primary-50 transition duration-300">
              {dataUrl || posterUrl ? (
                <div className="size-full rounded-lg transform" style={style}>
                  <img
                    src={dataUrl || posterUrl}
                    aria-label="Picture"
                    className="object-cover size-full rounded-lg"
                  />
                </div>
              ) : (
                <PlaySquare className="w-[84px] shrink-0 h-[76px] text-gray-300 group-hover:text-white" />
              )}
              <BlockImageToolbar
                className="top-5 left-5 absolute opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition duration-300"
                onAddImage={openPicker}
                onRemove={() => {
                  onRemove()
                  setPosterUrl(undefined)
                }}
                onEdit={onEdit}
                enableEdit={!!dataUrl || !!posterUrl}
                enableRemove={!!dataUrl || !!posterUrl}
              />
            </div>
          )}
        />

        {(posterUrl || videoUrl) && (
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="absolute z-[1] left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-black/40 hover:bg-black/60 transition duration-300 size-16 inline-flex items-center justify-center text-white"
          >
            <PlaySquare className="size-8" />
          </button>
        )}

        <div className="p-8 rounded-b-lg relative z-[1] bg-[linear-gradient(180deg,rgba(48,108,254,0)_0%,rgba(48,108,254,.296)_100%)]">
          <EditableRoot
            value={caption}
            onValueChange={(details) => setCaption(details.value)}
            placeholder="Video Title"
          >
            <EditableLabel>Video Title</EditableLabel>
            <EditableArea>
              <EditableInput className="bg-transparent" />
              <EditablePreview className="group-hover:text-primary-500 text-white group-data-[placeholder-shown]/area:text-gray-500" />
            </EditableArea>
          </EditableRoot>

          <div className="relative mt-1" onClick={(e) => e.stopPropagation()}>
            <EditableRoot
              value={videoUrl}
              onValueChange={(details) => setVideoUrl(details.value)}
              placeholder="Paste video URL (mp4)"
            >
              <EditableLabel>Video URL</EditableLabel>
              <EditableArea>
                <EditableInput className="bg-transparent text-xs" />
                <EditablePreview className="text-xs group-hover:text-primary-500 text-white/80 group-data-[placeholder-shown]/area:text-gray-500" />
              </EditableArea>
            </EditableRoot>
          </div>
        </div>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          dialogOverlay={<DialogOverlay className="z-[110]" />}
          className="max-w-[885.66px] rounded-none p-0 shadow-none bg-transparent z-[110]"
        >
          <DialogTitle className="sr-only">{caption || "Video"}</DialogTitle>
          <div className="group relative">
            <DialogClose className="group-hover:opacity-100 opacity-0 absolute z-10 transition duration-300 hover:border-black hover:text-white hover:bg-black inline-flex items-center justify-center text-gray-500 -right-[22px] -top-[22px] size-11 border shrink-0 border-gray-200 bg-white rounded-full">
              <X className="size-6" />
            </DialogClose>
            <div className="relative h-[498.2px] rounded-[9.23px] overflow-hidden bg-black">
              {videoUrl ? (
                <video
                  src={videoUrl}
                  poster={posterUrl}
                  controls
                  autoPlay
                  className="size-full object-contain"
                />
              ) : (
                <img
                  src={posterUrl}
                  alt={caption || "Video poster"}
                  className="size-full object-contain"
                />
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function VideoView({
  data,
  className,
}: {
  data?: Record<string, unknown>
  className?: string
}) {
  const d = data ?? {}
  const videoUrl = d.videoUrl
  const posterUrl = d.posterUrl
  if (typeof videoUrl !== "string" || !videoUrl) return null
  return (
    <section className={cn("relative rounded-lg overflow-hidden", className)}>
      <video
        src={videoUrl}
        poster={typeof posterUrl === "string" ? posterUrl : undefined}
        controls
        className="w-full h-auto"
      />
      {typeof d.caption === "string" && d.caption ? (
        <p className="text-dark-blue-400 text-lg mt-3">{d.caption}</p>
      ) : null}
    </section>
  )
}

export function VideoSection({
  isEditing,
  data,
  onDataChange,
  className,
}: {
  isEditing: boolean
  data?: Record<string, unknown>
  onDataChange?: (data: VideoData) => void
  className?: string
}) {
  if (isEditing) {
    return (
      <VideoEdit
        className={className}
        initialData={data}
        onDataChange={onDataChange}
      />
    )
  }
  return <VideoView data={data} className={className} />
}
