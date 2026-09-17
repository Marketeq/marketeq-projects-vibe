"use client"

import { useEffect, useState } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { Controller, useForm, useWatch } from "react-hook-form"
import { z } from "zod"
import { cn } from "@/utils/functions"
import { EditableArea, EditableInput, EditableLabel, EditablePreview, EditableRoot, PictureEditor, useToast } from "@/components/ui"
import { uploadCaseStudyImage } from "@/lib/case-study-upload"
import type { BigImageData } from "@/lib/case-study-mapper"
import { BlockImageToolbar } from "@/components/case-study/toolbars"
import { ImageEditModal } from "@/components/case-study/image-edit-modal"
import { Picture, imageTransformStyle } from "./_shared"

const bigImageSchema = z.object({
  caption: z.string().min(1, "Please enter at least 1 character(s)"),
  files: z.array(z.instanceof(File)),
})

type BigImageFormValues = z.infer<typeof bigImageSchema>

function BigImageEdit({
  className,
  initialData,
  onDataChange,
}: {
  className?: string
  initialData?: Record<string, unknown>
  onDataChange?: (data: BigImageData) => void
}) {
  const { control } = useForm<BigImageFormValues>({
    resolver: zodResolver(bigImageSchema),
    defaultValues: {
      caption: (initialData?.caption as string) ?? "",
    },
  })
  const [imageUrl, setImageUrl] = useState<string | undefined>(
    initialData?.url as string | undefined
  )
  const [imageZoom, setImageZoom] = useState<number>(
    (initialData?.imageZoom as number) ?? 1
  )
  const [imageRotation, setImageRotation] = useState<number>(
    (initialData?.imageRotation as number) ?? 0
  )
  const [imageOffsetX, setImageOffsetX] = useState<number>(
    (initialData?.imageOffsetX as number) ?? 50
  )
  const [imageOffsetY, setImageOffsetY] = useState<number>(
    (initialData?.imageOffsetY as number) ?? 50
  )
  const [isImageEditOpen, setIsImageEditOpen] = useState(false)
  const caption = useWatch({ control, name: "caption" })
  const { toast } = useToast()

  useEffect(() => {
    onDataChange?.({
      url: imageUrl ?? "",
      caption,
      imageZoom,
      imageRotation,
      imageOffsetX,
      imageOffsetY,
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [imageUrl, caption, imageZoom, imageRotation, imageOffsetX, imageOffsetY])

  return (
    <form
      className={cn("relative  bg-gray-50 rounded-lg group", className)}
      onSubmit={(e) => e.preventDefault()}
    >
      <div className="relative h-[498.2px] flex flex-col justify-end overflow-hidden">
        <Controller
          control={control}
          name="files"
          render={({ field: { onChange } }) => (
            <PictureEditor
              skipEditStep
              onValueChange={(files) => {
                onChange(files)
                const file = (files as File[] | undefined)?.[0]
                if (file instanceof File) {
                  uploadCaseStudyImage(file)
                    .then((url) => {
                      setImageUrl(url)
                      setImageZoom(1)
                      setImageRotation(0)
                      setImageOffsetX(50)
                      setImageOffsetY(50)
                    })
                    .catch(() => {
                      toast({
                        title: "Couldn't upload image",
                        description: "Please try again.",
                      })
                    })
                }
              }}
              startingPoint={({ dataUrl, open, onRemove }) => (
                <div className="group-data-[state=dragged]/article:pointer-events-none overflow-hidden absolute inset-0 group/image size-full grid rounded-lg place-items-center group-hover:bg-primary-50 transition duration-300">
                  {dataUrl || imageUrl ? (
                    <div className="size-full overflow-hidden rounded-lg">
                      <img
                        src={dataUrl || imageUrl}
                        aria-label="Picture"
                        className="object-cover size-full rounded-lg"
                        style={imageTransformStyle(imageZoom, imageRotation, imageOffsetX, imageOffsetY)}
                      />
                    </div>
                  ) : (
                    <>
                      <Picture className="w-[84px] shrink-0 h-[76px] text-gray-300 group-hover:text-white" />
                    </>
                  )}
                  <BlockImageToolbar
                    className="top-5 left-5 absolute opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition duration-300"
                    onAddImage={open}
                    onRemove={() => {
                      onRemove()
                      setImageUrl(undefined)
                      setImageZoom(1)
                      setImageRotation(0)
                      setImageOffsetX(50)
                      setImageOffsetY(50)
                    }}
                    onEdit={() => setIsImageEditOpen(true)}
                    enableEdit={!!dataUrl || !!imageUrl}
                    enableRemove={!!dataUrl || !!imageUrl}
                  />
                </div>
              )}
            />
          )}
        />
        <ImageEditModal
          open={isImageEditOpen}
          onClose={() => setIsImageEditOpen(false)}
          imageUrl={imageUrl ?? ""}
          title="Edit Image"
          initialZoom={imageZoom}
          initialRotation={imageRotation}
          initialOffsetX={imageOffsetX}
          initialOffsetY={imageOffsetY}
          aspectRatio={1140 / 498.2}
          objectFit="cover"
          onSave={({ zoom, rotation, offsetX, offsetY }) => {
            setImageZoom(zoom)
            setImageRotation(rotation)
            setImageOffsetX(offsetX)
            setImageOffsetY(offsetY)
          }}
        />

        <div className="p-8 rounded-b-lg relative bg-[linear-gradient(180deg,rgba(48,108,254,0)_0%,rgba(48,108,254,.296)_100%)]">
          <Controller
            control={control}
            name="caption"
            render={({ field: { value, onChange } }) => (
              <EditableRoot
                value={value}
                onValueChange={(details) => onChange(details.value)}
                placeholder="Image Title"
              >
                <EditableLabel>Image Title</EditableLabel>
                <EditableArea>
                  <EditableInput className="bg-transparent" />
                  <EditablePreview className="group-hover:text-primary-500 text-white group-data-[placeholder-shown]/area:text-gray-500" />
                </EditableArea>
              </EditableRoot>
            )}
          />
        </div>
      </div>
    </form>
  )
}

function BigImageView({
  data,
  className,
}: {
  data?: Record<string, unknown>
  className?: string
}) {
  const d = data ?? {}
  const url = d.url
  if (typeof url !== "string" || !url) return null
  return (
    <section className={cn("relative rounded-lg overflow-hidden h-[498.2px]", className)}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={url}
        alt=""
        className="absolute inset-0 h-full w-full object-cover"
        style={imageTransformStyle(d.imageZoom, d.imageRotation, d.imageOffsetX, d.imageOffsetY)}
      />
      {typeof d.caption === "string" && d.caption ? (
        <div className="p-8 bg-[linear-gradient(180deg,rgba(48,108,254,0)_0%,rgba(48,108,254,.296)_100%)] absolute inset-x-0 bottom-0">
          <p className="text-white text-lg">{d.caption}</p>
        </div>
      ) : null}
    </section>
  )
}

export function BigImageSection({
  isEditing,
  data,
  onDataChange,
  className,
}: {
  isEditing: boolean
  data?: Record<string, unknown>
  onDataChange?: (data: BigImageData) => void
  className?: string
}) {
  if (isEditing) {
    return (
      <BigImageEdit
        className={className}
        initialData={data}
        onDataChange={onDataChange}
      />
    )
  }
  return <BigImageView data={data} className={className} />
}
