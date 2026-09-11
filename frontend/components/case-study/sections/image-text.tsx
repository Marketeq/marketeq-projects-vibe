"use client"

import { useEffect, useState } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { Controller, useForm, useWatch } from "react-hook-form"
import { z } from "zod"
import { PictureEditor, useToast } from "@/components/ui"
import { uploadCaseStudyImage } from "@/lib/case-study-upload"
import type { ImageTextData } from "@/lib/case-study-mapper"
import { BlockImageToolbar } from "@/components/case-study/toolbars"
import { ImageEditModal } from "@/components/case-study/image-edit-modal"
import { BlockImage, Html, Picture, RichTextEditor, imageTransformStyle } from "./_shared"

const imageTextSchema = z.object({
  title: z.string().min(1, "Please enter at least 1 character(s)"),
  subTitle: z.string().min(1, "Please enter at least 1 character(s)"),
  files: z.array(z.instanceof(File)),
})

type ImageTextFormValues = z.infer<typeof imageTextSchema>

function ImageTextEdit({
  initialData,
  onDataChange,
}: {
  initialData?: Record<string, unknown>
  onDataChange?: (data: ImageTextData) => void
}) {
  const { control } = useForm<ImageTextFormValues>({
    resolver: zodResolver(imageTextSchema),
    defaultValues: {
      title:
        (initialData?.titleHtml as string) ?? "This is your introduction",
      subTitle:
        (initialData?.bodyHtml as string) ??
        "Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry's standard dummy text ever since the 1500s, when an unknown printer took a galley of type and scrambled it to make a type specimen book.",
    },
  })
  const [imageUrl, setImageUrl] = useState<string | undefined>(
    initialData?.imageUrl as string | undefined
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
  const title = useWatch({ control, name: "title" })
  const subTitle = useWatch({ control, name: "subTitle" })
  const { toast } = useToast()

  useEffect(() => {
    onDataChange?.({
      titleHtml: title,
      bodyHtml: subTitle,
      imageUrl,
      imageZoom,
      imageRotation,
      imageOffsetX,
      imageOffsetY,
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title, subTitle, imageUrl, imageZoom, imageRotation, imageOffsetX, imageOffsetY])

  return (
    <form
      className=" grid grid-cols-2 gap-x-[50px] relative group"
      onSubmit={(e) => e.preventDefault()}
    >
      <div className="py-[66.5px]">
        <h1 className="relative">
          <Controller
            control={control}
            name="title"
            render={({ field: { value, onChange } }) => (
              <RichTextEditor
                defaultValue={value}
                onUpdate={onChange}
                editorClassName="text-[40px] leading-[48px] font-semibold text-dark-blue-400"
              />
            )}
          />
        </h1>
        <div className="relative mt-5">
          <Controller
            control={control}
            name="subTitle"
            render={({ field: { value, onChange } }) => (
              <RichTextEditor
                defaultValue={value}
                onUpdate={onChange}
                editorClassName="text-2xl leading-[29px] font-light text-dark-blue-400"
              />
            )}
          />
        </div>
      </div>
      <div className="relative aspect-[494/375]">
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
                    .then(setImageUrl)
                    .catch(() => {
                      toast({
                        title: "Couldn't upload image",
                        description: "Please try again.",
                      })
                    })
                }
              }}
              startingPoint={({ dataUrl, open, onRemove }) => (
                <div className="group-data-[state=dragged]/article:pointer-events-none overflow-hidden relative group/image size-full bg-gray-100 grid rounded-lg place-items-center hover:bg-primary-50 group-hover:bg-primary-50 group-hover:group-focus-within:bg-gray-100 hover:ring-2 hover:ring-primary-500 transition duration-300">
                  {dataUrl || imageUrl ? (
                    <div className="size-full overflow-hidden rounded-lg">
                      <img
                        src={dataUrl || imageUrl}
                        aria-label="Picture"
                        className="size-full object-cover rounded-lg"
                        style={imageTransformStyle(imageZoom, imageRotation, imageOffsetX, imageOffsetY)}
                      />
                    </div>
                  ) : (
                    <>
                      <Picture className="w-[84px] shrink-0 h-[76px] text-gray-300 group-hover/image:text-primary-300 group-hover:text-primary-300 group-hover:group-focus-within:text-gray-300" />
                    </>
                  )}
                  <BlockImageToolbar
                    className="top-5 left-5 absolute opacity-0 pointer-events-none group-hover/image:opacity-100 group-hover/image:pointer-events-auto transition duration-300"
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
          aspectRatio={494 / 375}
          objectFit="cover"
          onSave={({ zoom, rotation, offsetX, offsetY }) => {
            setImageZoom(zoom)
            setImageRotation(rotation)
            setImageOffsetX(offsetX)
            setImageOffsetY(offsetY)
          }}
        />
      </div>
    </form>
  )
}

function ImageTextView({ data }: { data?: Record<string, unknown> }) {
  const d = data ?? {}
  return (
    <section className="grid md:grid-cols-2 gap-x-[50px]">
      <div className="py-[66.5px]">
        <Html
          html={d.titleHtml}
          className="text-[40px] leading-[48px] font-semibold text-dark-blue-400"
        />
        <Html
          html={d.bodyHtml}
          className="mt-5 text-2xl leading-[29px] font-light text-dark-blue-400"
        />
      </div>
      <div className="relative overflow-hidden rounded-lg aspect-[494/375]">
        <BlockImage
          url={d.imageUrl}
          zoom={d.imageZoom}
          rotation={d.imageRotation}
          offsetX={d.imageOffsetX}
          offsetY={d.imageOffsetY}
          className="absolute inset-0 h-full w-full object-cover"
        />
      </div>
    </section>
  )
}

export function ImageTextSection({
  isEditing,
  data,
  onDataChange,
}: {
  isEditing: boolean
  data?: Record<string, unknown>
  onDataChange?: (data: ImageTextData) => void
}) {
  if (isEditing) {
    return <ImageTextEdit initialData={data} onDataChange={onDataChange} />
  }
  return <ImageTextView data={data} />
}
