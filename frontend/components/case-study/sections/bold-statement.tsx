"use client"

import { useEffect } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { Controller, useForm, useWatch } from "react-hook-form"
import { z } from "zod"
import type { BoldStatementData } from "@/lib/case-study-mapper"
import { Html, RichTextEditor } from "./_shared"

const boldStatementSchema = z.object({
  statement: z.string().min(1, "Must contain at least 1 character(s)"),
})

type BoldStatementFormValues = z.infer<typeof boldStatementSchema>

function BoldStatementEdit({
  initialData,
  onDataChange,
}: {
  initialData?: Record<string, unknown>
  onDataChange?: (data: BoldStatementData) => void
}) {
  const { control } = useForm<BoldStatementFormValues>({
    resolver: zodResolver(boldStatementSchema),
    defaultValues: {
      statement:
        (initialData?.html as string) ??
        "This is your sample bold statement, you can use this as your heading too.",
    },
  })
  const statement = useWatch({ control, name: "statement" })

  useEffect(() => {
    onDataChange?.({ html: statement })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statement])

  return (
    <form className=" relative group" onSubmit={(e) => e.preventDefault()}>
      <h1 className="relative">
        <Controller
          control={control}
          name="statement"
          render={({ field: { value, onChange } }) => (
            <RichTextEditor
              defaultValue={value}
              onUpdate={onChange}
              editorClassName="text-[64px] leading-[1.2] font-bold text-dark-blue-400"
            />
          )}
        />
      </h1>
    </form>
  )
}

function BoldStatementView({ data }: { data?: Record<string, unknown> }) {
  const d = data ?? {}
  return (
    <section className="text-center">
      <Html
        html={d.html}
        className="text-[40px] md:text-[64px] leading-[1.2] font-bold text-dark-blue-400"
      />
    </section>
  )
}

export function BoldStatementSection({
  isEditing,
  data,
  onDataChange,
}: {
  isEditing: boolean
  data?: Record<string, unknown>
  onDataChange?: (data: BoldStatementData) => void
}) {
  if (isEditing) {
    return (
      <BoldStatementEdit initialData={data} onDataChange={onDataChange} />
    )
  }
  return <BoldStatementView data={data} />
}
