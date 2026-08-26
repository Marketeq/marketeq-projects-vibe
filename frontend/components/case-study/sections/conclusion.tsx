"use client"

import { useEffect } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { Controller, useForm, useWatch } from "react-hook-form"
import { z } from "zod"
import type { ConclusionData } from "@/lib/case-study-mapper"
import { Html, RichTextEditor } from "./_shared"

const conclusionSchema = z.object({
  title: z.string().min(1, "Please enter at least 1 character(s)"),
  subTitle: z.string().min(1, "Please enter at least 1 character(s)"),
})

type ConclusionFormValues = z.infer<typeof conclusionSchema>

function ConclusionEdit({
  initialData,
  onDataChange,
}: {
  initialData?: Record<string, unknown>
  onDataChange?: (data: ConclusionData) => void
}) {
  const { control } = useForm<ConclusionFormValues>({
    resolver: zodResolver(conclusionSchema),
    defaultValues: {
      title: (initialData?.titleHtml as string) ?? "This is your Conclusion",
      subTitle:
        (initialData?.bodyHtml as string) ??
        "Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry's standard dummy text ever since the 1500s, when an unknown printer took a galley of type and scrambled it to make a type specimen book.",
    },
  })
  const title = useWatch({ control, name: "title" })
  const subTitle = useWatch({ control, name: "subTitle" })

  useEffect(() => {
    onDataChange?.({ titleHtml: title, bodyHtml: subTitle })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title, subTitle])

  return (
    <form className=" group relative" onSubmit={(e) => e.preventDefault()}>
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
      <div className="relative mt-6">
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
    </form>
  )
}

function ConclusionView({ data }: { data?: Record<string, unknown> }) {
  const d = data ?? {}
  return (
    <section>
      <Html
        html={d.titleHtml}
        className="text-[40px] leading-[48px] font-semibold text-dark-blue-400"
      />
      <Html
        html={d.bodyHtml}
        className="mt-6 text-2xl leading-[29px] font-light text-dark-blue-400"
      />
    </section>
  )
}

export function ConclusionSection({
  isEditing,
  data,
  onDataChange,
}: {
  isEditing: boolean
  data?: Record<string, unknown>
  onDataChange?: (data: ConclusionData) => void
}) {
  if (isEditing) {
    return <ConclusionEdit initialData={data} onDataChange={onDataChange} />
  }
  return <ConclusionView data={data} />
}
