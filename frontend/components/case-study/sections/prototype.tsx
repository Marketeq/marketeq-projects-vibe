"use client"

import { useEffect, useState } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { Controller, useForm, useWatch } from "react-hook-form"
import { Monitor02 } from "@blend-metrics/icons"
import { z } from "zod"
import { cn } from "@/utils/functions"
import {
  EditableArea,
  EditableInput,
  EditableLabel,
  EditablePreview,
  EditableRoot,
  PictureEditor,
} from "@/components/ui"
import { uploadCaseStudyImage } from "@/lib/case-study-upload"
import type { PrototypeData } from "@/lib/case-study-mapper"
import { BlockImageToolbar } from "@/components/case-study/toolbars"

const prototypeSchema = z.object({
  caption: z.string().min(1, "Please enter at least 1 character(s)"),
  files: z.array(z.instanceof(File)),
})

type PrototypeFormValues = z.infer<typeof prototypeSchema>

function PrototypeEdit({
  className,
  initialData,
  onDataChange,
}: {
  className?: string
  initialData?: Record<string, unknown>
  onDataChange?: (data: PrototypeData) => void
}) {
  const { control } = useForm<PrototypeFormValues>({
    resolver: zodResolver(prototypeSchema),
    defaultValues: {
      caption: (initialData?.caption as string) ?? "",
    },
  })
  const [imageUrl, setImageUrl] = useState<string | undefined>(
    initialData?.url as string | undefined
  )
  const caption = useWatch({ control, name: "caption" })

  useEffect(() => {
    onDataChange?.({ url: imageUrl ?? "", caption })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [imageUrl, caption])

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
              onValueChange={(files) => {
                onChange(files)
                const file = (files as File[] | undefined)?.[0]
                if (file instanceof File) {
                  uploadCaseStudyImage(file).then(setImageUrl)
                }
              }}
              startingPoint={({ dataUrl, open, style, onRemove, onEdit }) => (
                <div className="group-data-[state=dragged]/article:pointer-events-none overflow-hidden absolute inset-0 group/image size-full grid rounded-lg place-items-center group-hover:bg-primary-50 transition duration-300">
                  {dataUrl || imageUrl ? (
                    <div
                      className="size-full rounded-lg transform"
                      style={style}
                    >
                      <img
                        src={dataUrl || imageUrl}
                        aria-label="Picture"
                        className="object-cover size-full rounded-lg"
                      />
                    </div>
                  ) : (
                    <>
                      <Monitor02 className="w-[84px] shrink-0 h-[76px] text-gray-300 group-hover:text-white" />
                    </>
                  )}
                  <BlockImageToolbar
                    className="top-5 left-5 absolute opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition duration-300"
                    onAddImage={open}
                    onRemove={() => {
                      onRemove()
                      setImageUrl(undefined)
                    }}
                    onEdit={onEdit}
                    enableEdit={!!dataUrl || !!imageUrl}
                    enableRemove={!!dataUrl || !!imageUrl}
                  />
                </div>
              )}
            />
          )}
        />

        <div className="p-8 rounded-b-lg relative bg-[linear-gradient(180deg,rgba(48,108,254,0)_0%,rgba(48,108,254,.296)_100%)]">
          <Controller
            control={control}
            name="caption"
            render={({ field: { value, onChange } }) => (
              <EditableRoot
                value={value}
                onValueChange={(details) => onChange(details.value)}
                placeholder="Prototype Title"
              >
                <EditableLabel>Prototype Title</EditableLabel>
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

function PrototypeView({
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
    <section className={cn("relative rounded-lg overflow-hidden", className)}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={url} alt="" className="w-full h-auto object-cover" />
      {typeof d.caption === "string" && d.caption ? (
        <div className="p-8 bg-[linear-gradient(180deg,rgba(48,108,254,0)_0%,rgba(48,108,254,.296)_100%)] absolute inset-x-0 bottom-0">
          <p className="text-white text-lg">{d.caption}</p>
        </div>
      ) : null}
    </section>
  )
}

export function PrototypeSection({
  isEditing,
  data,
  onDataChange,
  className,
}: {
  isEditing: boolean
  data?: Record<string, unknown>
  onDataChange?: (data: PrototypeData) => void
  className?: string
}) {
  if (isEditing) {
    return (
      <PrototypeEdit
        className={className}
        initialData={data}
        onDataChange={onDataChange}
      />
    )
  }
  return <PrototypeView data={data} className={className} />
}
