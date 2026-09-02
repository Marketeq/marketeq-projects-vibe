"use client"

import { useEffect, useState } from "react"
import { cn } from "@/utils/functions"
import {
  EditableArea,
  EditableInput,
  EditableLabel,
  EditablePreview,
  EditableRoot,
  PictureEditor,
} from "@/components/ui"
import { Plus } from "@blend-metrics/icons"
import { uploadCaseStudyImage } from "@/lib/case-study-upload"
import {
  normalizeGalleryImages,
  type GalleryData,
  type GalleryImage,
} from "@/lib/case-study-mapper"
import { BlockImageToolbar } from "@/components/case-study/toolbars"
import { ImageEditModal } from "@/components/case-study/image-edit-modal"
import { BlockImage, Picture, imageTransformStyle } from "./_shared"

const MAX_GALLERY_IMAGES = 8

function GalleryEdit({
  initialData,
  onDataChange,
}: {
  initialData?: Record<string, unknown>
  onDataChange?: (data: GalleryData) => void
}) {
  const [images, setImages] = useState<GalleryImage[]>(() => {
    const normalized = normalizeGalleryImages(initialData?.images)
    return normalized.length ? normalized : [{ url: "" }]
  })
  const [active, setActive] = useState(0)
  const [caption, setCaption] = useState((initialData?.caption as string) ?? "")
  const [isImageEditOpen, setIsImageEditOpen] = useState(false)

  useEffect(() => {
    onDataChange?.({
      images: images.filter((image) => image.url),
      caption,
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [images, caption])

  const activeImage = images[active] ?? { url: "" }
  const activeUrl = activeImage.url

  const handleRemoveActive = () => {
    const len = images.length
    if (len <= 1) {
      setImages([{ url: "" }])
      setActive(0)
      return
    }
    setActive(Math.min(active, len - 2))
    setImages((prev) => prev.filter((_, index) => index !== active))
  }

  return (
    <div className="p-[50px]  rounded-[10px] bg-gray-100 group relative">
      <form
        className={cn("relative bg-gray-50 rounded-lg group mt-0 static")}
        onSubmit={(e) => e.preventDefault()}
      >
        <div className="relative h-[498.2px] flex flex-col justify-end overflow-hidden">
          <PictureEditor
            // Remounts per gallery slot so a picked file never leaks into
            // the wrong image when the active thumbnail changes — without
            // this, PictureEditor's own internal `dataUrl` (set the first
            // time any slot gets an image) makes its exposed `open()`
            // permanently branch to "remove" instead of opening the file
            // picker for every later slot.
            key={active}
            skipEditStep
            onValueChange={(files) => {
              const file = (files as File[] | undefined)?.[0]
              if (file instanceof File) {
                uploadCaseStudyImage(file).then((url) => {
                  setImages((prev) => {
                    const next = [...prev]
                    next[active] = { url }
                    return next
                  })
                })
              }
            }}
            startingPoint={({ dataUrl, open, onRemove }) => (
              <div className="group-data-[state=dragged]/article:pointer-events-none overflow-hidden absolute inset-0 group/image size-full grid rounded-lg place-items-center group-hover:bg-primary-50 transition duration-300">
                {dataUrl || activeUrl ? (
                  <div className="size-full rounded-lg overflow-hidden">
                    <img
                      src={dataUrl || activeUrl}
                      aria-label="Picture"
                      className="object-cover size-full rounded-lg"
                      style={imageTransformStyle(
                        activeImage.imageZoom,
                        activeImage.imageRotation,
                        activeImage.imageOffsetX,
                        activeImage.imageOffsetY
                      )}
                    />
                  </div>
                ) : (
                  <Picture className="w-[84px] shrink-0 h-[76px] text-gray-300 group-hover:text-white" />
                )}
                <BlockImageToolbar
                  className="top-5 left-5 absolute opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition duration-300"
                  onAddImage={open}
                  onRemove={() => {
                    onRemove()
                    handleRemoveActive()
                  }}
                  onEdit={() => setIsImageEditOpen(true)}
                  enableEdit={!!dataUrl || !!activeUrl}
                  enableRemove={!!dataUrl || !!activeUrl}
                />
              </div>
            )}
          />

          <ImageEditModal
            open={isImageEditOpen}
            onClose={() => setIsImageEditOpen(false)}
            imageUrl={activeUrl}
            title="Edit Image"
            initialZoom={activeImage.imageZoom ?? 1}
            initialRotation={activeImage.imageRotation ?? 0}
            initialOffsetX={activeImage.imageOffsetX ?? 50}
            initialOffsetY={activeImage.imageOffsetY ?? 50}
            aspectRatio={1140 / 498.2}
            objectFit="cover"
            onSave={({ zoom, rotation, offsetX, offsetY }) => {
              setImages((prev) => {
                const next = [...prev]
                next[active] = {
                  ...next[active],
                  imageZoom: zoom,
                  imageRotation: rotation,
                  imageOffsetX: offsetX,
                  imageOffsetY: offsetY,
                }
                return next
              })
            }}
          />

          <div className="p-8 rounded-b-lg relative z-[1] bg-[linear-gradient(180deg,rgba(48,108,254,0)_0%,rgba(48,108,254,.296)_100%)]">
            <EditableRoot
              value={caption}
              onValueChange={(details) => setCaption(details.value)}
              placeholder="Image Title"
            >
              <EditableLabel>Image Title</EditableLabel>
              <EditableArea>
                <EditableInput className="bg-transparent" />
                <EditablePreview className="group-hover:text-primary-500 text-white group-data-[placeholder-shown]/area:text-gray-500" />
              </EditableArea>
            </EditableRoot>
          </div>
        </div>
      </form>

      <div className="flex mt-6 gap-x-6 items-center flex-wrap">
        {images.map((image, index) => (
          <button
            key={index}
            type="button"
            onClick={() => setActive(index)}
            data-state={active === index ? "active" : undefined}
            className="h-[55px] w-[82px] overflow-hidden hover:border-primary-500 hover:ring hover:ring-primary-500 data-[state=active]:border-primary-500 border border-gray-200 data-[state=active]:ring-primary-500 data-[state=active]:ring bg-white inline-flex items-center shrink-0 rounded-[5px] justify-center"
          >
            {image.url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={image.url}
                alt=""
                className="size-full object-cover"
                style={imageTransformStyle(image.imageZoom, image.imageRotation, image.imageOffsetX, image.imageOffsetY)}
              />
            ) : null}
          </button>
        ))}
        <button
          type="button"
          disabled={images.length >= MAX_GALLERY_IMAGES}
          onClick={() => {
            if (images.length >= MAX_GALLERY_IMAGES) return
            setImages((prev) => [...prev, { url: "" }])
            setActive(images.length)
          }}
          className="h-[55px] w-[82px] border border-gray-200 bg-white shrink-0 rounded-[5px] inline-flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed enabled:hover:border-primary-500 enabled:hover:ring enabled:hover:ring-primary-500"
        >
          <Plus className="size-6 text-gray-500" />
        </button>
      </div>

      {images.length >= MAX_GALLERY_IMAGES ? (
        <p className="mt-2 text-sm font-medium text-error-500">
          Max images of 8 reached
        </p>
      ) : null}
    </div>
  )
}

function GalleryView({ data }: { data?: Record<string, unknown> }) {
  const d = data ?? {}
  const images = normalizeGalleryImages(d.images)
  const [active, setActive] = useState(0)

  if (!images.length) return null

  const caption = typeof d.caption === "string" ? d.caption : ""
  const activeImage = images[active] ?? images[0]

  return (
    <section className="p-[50px] rounded-[10px] bg-gray-100">
      <div className="relative h-[498px] max-h-[70vh] rounded-lg overflow-hidden">
        <BlockImage
          url={activeImage.url}
          zoom={activeImage.imageZoom}
          rotation={activeImage.imageRotation}
          offsetX={activeImage.imageOffsetX}
          offsetY={activeImage.imageOffsetY}
          className="w-full h-full object-cover rounded-lg"
        />
        {caption ? (
          <div className="absolute inset-x-0 bottom-0 p-8 rounded-b-lg bg-[linear-gradient(180deg,rgba(0,0,0,0)_0%,rgba(0,0,0,0.64)_100%)]">
            <p className="text-lg font-bold text-white">{caption}</p>
          </div>
        ) : null}
      </div>

      {images.length > 1 ? (
        <div className="flex mt-6 gap-x-6 items-center overflow-x-auto pb-1">
          {images.map((image, index) => (
            <button
              key={index}
              type="button"
              onClick={() => setActive(index)}
              data-state={active === index ? "active" : undefined}
              className="h-[55px] w-[82px] overflow-hidden hover:border-primary-500 hover:ring hover:ring-primary-500 data-[state=active]:border-primary-500 border border-gray-200 data-[state=active]:ring-primary-500 data-[state=active]:ring bg-white inline-flex items-center shrink-0 rounded-[5px] justify-center"
            >
              {image.url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={image.url}
                  alt=""
                  className="size-full object-cover"
                  style={imageTransformStyle(image.imageZoom, image.imageRotation, image.imageOffsetX, image.imageOffsetY)}
                />
              ) : null}
            </button>
          ))}
        </div>
      ) : null}
    </section>
  )
}

export function GallerySection({
  isEditing,
  data,
  onDataChange,
}: {
  isEditing: boolean
  data?: Record<string, unknown>
  onDataChange?: (data: GalleryData) => void
}) {
  if (isEditing) {
    return <GalleryEdit initialData={data} onDataChange={onDataChange} />
  }
  return <GalleryView data={data} />
}
