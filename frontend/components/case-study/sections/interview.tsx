"use client"

import React, { useEffect } from "react"
import { Controller, useFieldArray, useForm, useWatch } from "react-hook-form"
import type { InterviewData } from "@/lib/case-study-mapper"
import { Html, RichTextEditor } from "./_shared"

interface InterviewPointsFormValues {
  title: string
  subTitle: string
  points: { title: string; subTitle: string }[]
}

function InterviewEdit({
  initialData,
  onDataChange,
}: {
  initialData?: Record<string, unknown>
  onDataChange?: (data: InterviewData) => void
}) {
  const initialItems = initialData?.items as
    | { questionHtml: string; answerHtml: string }[]
    | undefined
  const { control } = useForm<InterviewPointsFormValues>({
    defaultValues: {
      title:
        (initialData?.titleHtml as string) ?? "This is your introduction",
      subTitle:
        (initialData?.bodyHtml as string) ??
        "Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry's standard dummy text ever since the 1500s, when an unknown printer took a galley of type and scrambled it to make a type specimen book.",
      points: initialItems?.length
        ? initialItems.map((item) => ({
            title: item.questionHtml,
            subTitle: item.answerHtml,
          }))
        : [
            { title: "Bullet Point 1", subTitle: "Lorem ipsum donar solar" },
            { title: "Bullet Point 2", subTitle: "Lorem ipsum donar solar" },
            { title: "Bullet Point 3", subTitle: "Lorem ipsum donar solar" },
          ],
    },
  })

  const { fields } = useFieldArray({
    control,
    name: "points",
  })
  const title = useWatch({ control, name: "title" })
  const subTitle = useWatch({ control, name: "subTitle" })
  const points = useWatch({ control, name: "points" })

  useEffect(() => {
    onDataChange?.({
      titleHtml: title,
      bodyHtml: subTitle,
      items: (points ?? []).map((p) => ({
        questionHtml: p.title,
        answerHtml: p.subTitle,
      })),
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title, subTitle, points])

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

      <div className="mt-6">
        <div className="relative">
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

        <ul className="mt-4 list-disc pl-5">
          {fields.map((field, index) => (
            <React.Fragment key={field.id}>
              <li className="relative first:mt-0 mt-5">
                <Controller
                  control={control}
                  name={`points.${index}.title`}
                  render={({ field: { value, onChange } }) => (
                    <RichTextEditor
                      defaultValue={value}
                      onUpdate={onChange}
                      editorClassName="text-[24px] leading-none font-bold text-dark-blue-400"
                    />
                  )}
                />
              </li>

              <span className="relative block mt-2">
                <Controller
                  control={control}
                  name={`points.${index}.subTitle`}
                  render={({ field: { value, onChange } }) => (
                    <RichTextEditor
                      defaultValue={value}
                      onUpdate={onChange}
                      editorClassName="text-[24px] leading-none font-light text-dark-blue-400"
                    />
                  )}
                />
              </span>
            </React.Fragment>
          ))}
        </ul>
      </div>
    </form>
  )
}

function InterviewView({ data }: { data?: Record<string, unknown> }) {
  const d = data ?? {}
  const items = Array.isArray(d.items)
    ? (d.items as { questionHtml: string; answerHtml: string }[])
    : []
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
      {items.length ? (
        <ul className="mt-4 space-y-5 list-disc pl-5">
          {items.map((item, i) => (
            <li key={i} className="text-2xl text-dark-blue-400 font-light">
              <Html html={item.questionHtml} className="font-bold inline" />{" "}
              <Html html={item.answerHtml} className="inline" />
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  )
}

export function InterviewSection({
  isEditing,
  data,
  onDataChange,
}: {
  isEditing: boolean
  data?: Record<string, unknown>
  onDataChange?: (data: InterviewData) => void
}) {
  if (isEditing) {
    return <InterviewEdit initialData={data} onDataChange={onDataChange} />
  }
  return <InterviewView data={data} />
}
