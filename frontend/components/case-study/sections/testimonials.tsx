"use client"

import React, { useEffect, useState } from "react"
import { Reorder } from "framer-motion"
import { Camera01 } from "@blend-metrics/icons"
import { getId } from "@/utils/functions"
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  IconButton,
  PictureEditor,
  useToast,
} from "@/components/ui"
import { uploadCaseStudyImage } from "@/lib/case-study-upload"
import type { TestimonialData, TestimonialItem } from "@/lib/case-study-mapper"
import { BlockToolbar } from "@/components/case-study/toolbars"
import { AddBlockDivider } from "@/components/case-study/add-block-divider"
import { ArticleRoot, ControlledDraggable, Html, RichTextEditor, swap } from "./_shared"

/** Shown until the user uploads a photo of the person quoted. */
const DEFAULT_AVATAR_SRC = "/man.jpg"

const defaultTestimonials: TestimonialItem[] = [
  {
    quoteHtml:
      "Lorem Ipsum is simply dummy text of the printing and typesetting industry.",
    authorHtml: "John Doe",
    roleHtml: "Acme Inc., President & CEO",
  },
  {
    quoteHtml:
      "Lorem Ipsum is simply dummy text of the printing and typesetting industry.",
    authorHtml: "John Doe",
    roleHtml: "Acme Inc., President & CEO",
  },
]

function TestimonialsEdit({
  initialData,
  onDataChange,
}: {
  initialData?: Record<string, unknown>
  onDataChange?: (data: TestimonialData) => void
}) {
  const initialItems = (initialData?.items as TestimonialItem[] | undefined)
    ?.length
    ? (initialData!.items as TestimonialItem[])
    : defaultTestimonials
  const [ids] = useState(() => initialItems.map(() => getId()))
  const [items, setItems] = useState(ids)
  const [testimonialData, setTestimonialData] = useState<
    Record<number, TestimonialItem>
  >(() => Object.fromEntries(ids.map((id, i) => [id, initialItems[i]])))
  const len = items.length
  const { toast } = useToast()

  // Inserts a fresh testimonial at `at`, seeding testimonialData too — items and
  // testimonialData must stay in lockstep, otherwise items.map((id) => testimonialData[id])
  // below (and TestimonialsView's render) hits an undefined entry for the new id.
  const addTestimonialAt = (at: number) => {
    const uniqueId = getId() + 2
    setItems((prev) => prev.toSpliced(at, 0, uniqueId))
    setTestimonialData((prev) => ({
      ...prev,
      [uniqueId]: {
        quoteHtml:
          "Lorem Ipsum is simply dummy text of the printing and typesetting industry.",
        authorHtml: "John Doe",
        roleHtml: "Acme Inc., President & CEO",
      },
    }))
  }

  // Inserts a fresh testimonial at `at`, seeding testimonialData too — items and
  // testimonialData must stay in lockstep, otherwise items.map((id) => testimonialData[id])
  // below (and TestimonialsView's render) hits an undefined entry for the new id.
  const addTestimonialAt = (at: number) => {
    const uniqueId = getId() + 2
    setItems((prev) => prev.toSpliced(at, 0, uniqueId))
    setTestimonialData((prev) => ({
      ...prev,
      [uniqueId]: {
        quoteHtml:
          "Lorem Ipsum is simply dummy text of the printing and typesetting industry.",
        authorHtml: "John Doe",
        roleHtml: "Acme Inc., President & CEO",
      },
    }))
  }

  useEffect(() => {
    onDataChange?.({ items: items.map((id) => testimonialData[id]) })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, testimonialData])

  return (
    <div className=" group relative">
      <div className="relative">
        <RichTextEditor
          defaultValue="Testimonials"
          editorClassName="text-[40px] leading-[48px] font-semibold text-dark-blue-400"
        />
      </div>

      <Reorder.Group
        as="div"
        className="isolate relative mt-[80px] grid grid-cols-[repeat(var(--cols),minmax(0,1fr))] gap-x-[--gap] [--gap:50px]"
        axis="x"
        style={{ ...({ "--cols": len } as Record<string, number>) }}
        values={items}
        onReorder={setItems}
      >
        {items.map((item, index) => (
          <React.Fragment key={item}>
            <ControlledDraggable withFragments>
              {(dragControls) => (
                <ArticleRoot
                  value={item}
                  isLast={index === len - 1}
                  dragControls={dragControls}
                  className="border-0"
                  outlinedContainer
                >
                  <BlockToolbar
                    className="group-hover/article:opacity-100 group-hover/article:inline-flex hidden opacity-0 transition duration-300 -top-[38px] -right-[37px] absolute z-10 group-focus-within/article:hidden group-hover/article:group-focus-within/article:hidden"
                    onDrag={(event) => dragControls.start(event)}
                    canMoveLeft={Boolean(index)}
                    moveLeft={() => setItems(swap(items, index, index - 1))}
                    canMoveRight={index < len - 1}
                    moveRight={() => setItems(swap(items, index, index + 1))}
                    canRemove={len > 1}
                    onRemove={() =>
                      setItems(items.filter((itm) => itm !== item))
                    }
                    canDuplicate
                    duplicateDisabled={len >= 3}
                    canHide
                    onDuplicate={() => addTestimonialAt(index)}
                  />

                  <article className="min-h-[249px] p-6 rounded-[20px] bg-gray-100 rounded-bl-none relative">
                    <div className="flex items-start gap-x-3">
                      <h1 className="pt-[11px] leading-none text-dark-blue-400 font-bold text-[114.33px]">
                        "
                      </h1>

                      <h3 className="relative pt-6">
                        <RichTextEditor
                          defaultValue={
                            testimonialData[item]?.quoteHtml ??
                            "Lorem Ipsum is simply dummy text of the printing and typesetting industry."
                          }
                          onUpdate={(val) =>
                            setTestimonialData((prev) => ({
                              ...prev,
                              [item]: { ...prev[item], quoteHtml: val },
                            }))
                          }
                          editorClassName="text-2xl leading-[29px] text-dark-blue-400"
                        />
                      </h3>
                    </div>

                    <div className="mt-[50px] flex items-center gap-x-2">
                      <PictureEditor
                        skipEditStep
                        onValueChange={(files) => {
                          const file = (files as File[] | undefined)?.[0]
                          if (!(file instanceof File)) return
                          uploadCaseStudyImage(file)
                            .then((url) =>
                              setTestimonialData((prev) => ({
                                ...prev,
                                [item]: { ...prev[item], avatarUrl: url },
                              }))
                            )
                            .catch(() => {
                              toast({
                                title: "Couldn't upload image",
                                description: "Please try again.",
                              })
                            })
                        }}
                        startingPoint={({ dataUrl, open }) => (
                          <div className="group/avatar relative shrink-0">
                            <Avatar size="md">
                              <AvatarImage
                                src={
                                  dataUrl ||
                                  testimonialData[item]?.avatarUrl ||
                                  DEFAULT_AVATAR_SRC
                                }
                                alt=""
                              />
                              <AvatarFallback>M</AvatarFallback>
                            </Avatar>

                            <IconButton
                              type="button"
                              variant="ghost"
                              visual="gray"
                              size="sm"
                              aria-label="Change photo"
                              onClick={open}
                              className="absolute inset-0 size-10 rounded-full bg-dark-blue-400/60 text-white opacity-0 hover:bg-dark-blue-400/60 hover:text-white group-hover/avatar:opacity-100 focus-visible:opacity-100"
                            >
                              <Camera01 className="size-4" />
                            </IconButton>
                          </div>
                        )}
                      />

                      <div className="space-y-0.5">
                        <h3 className="relative">
                          <RichTextEditor
                            defaultValue={
                              testimonialData[item]?.authorHtml ?? "John Doe"
                            }
                            onUpdate={(val) =>
                              setTestimonialData((prev) => ({
                                ...prev,
                                [item]: { ...prev[item], authorHtml: val },
                              }))
                            }
                            editorClassName="text-sm font-bold leading-none text-dark-blue-400"
                          />
                        </h3>

                        <div className="relative">
                          <RichTextEditor
                            defaultValue={
                              testimonialData[item]?.roleHtml ??
                              "Acme Inc., President & CEO"
                            }
                            onUpdate={(val) =>
                              setTestimonialData((prev) => ({
                                ...prev,
                                [item]: { ...prev[item], roleHtml: val },
                              }))
                            }
                            editorClassName="text-xs leading-none font-light text-dark-blue-400"
                          />
                        </div>
                      </div>
                    </div>
                  </article>
                </ArticleRoot>
              )}
            </ControlledDraggable>

            {len < 3 && (
              <div
                style={{
                  ...({ "--pos": index + 1 } as Record<string, number>),
                }}
                className="peer-data-[last=true]:hidden absolute w-[--gap] group/gap flex justify-center inset-y-0 left-[calc(calc(calc(calc(theme(size.full)-calc(var(--gap)*calc(var(--cols)-1)))/var(--cols))*var(--pos))+calc(var(--gap)*calc(var(--pos)-1)))]"
              >
                <AddBlockDivider.Vertical
                  className="h-full group-hover/gap:visible invisible transition-[visibility] duration-300"
                  onAdd={() => addTestimonialAt(index)}
                />
              </div>
            )}
          </React.Fragment>
        ))}
      </Reorder.Group>
    </div>
  )
}

function TestimonialsView({ data }: { data?: Record<string, unknown> }) {
  const d = data ?? {}
  // Entries can be null/undefined in case studies saved before the
  // editor seeded new items — drop the holes rather than crash.
  const items = (
    Array.isArray(d.items) ? (d.items as (TestimonialItem | null | undefined)[]) : []
  ).filter((item): item is TestimonialItem => Boolean(item))
  if (!items.length) return null
  return (
    <section>
      <h1 className="text-[40px] leading-[48px] font-semibold text-dark-blue-400">
        Testimonials
      </h1>
      <div
        className="grid gap-x-[50px] mt-[80px] md:grid-cols-[repeat(var(--cols),minmax(0,1fr))]"
        style={{ ...({ "--cols": items.length } as Record<string, number>) }}
      >
        {items.map((item, i) => (
          <article
            key={i}
            className="min-h-[249px] p-6 rounded-[20px] bg-gray-100 rounded-bl-none relative"
          >
            <div className="flex items-start gap-x-3">
              <h1 className="pt-[11px] leading-none text-dark-blue-400 font-bold text-[114.33px]">
                "
              </h1>
              <div className="pt-6">
                <Html
                  html={item.quoteHtml}
                  className="text-2xl leading-[29px] text-dark-blue-400"
                />
              </div>
            </div>

            <div className="mt-[50px] flex items-center gap-x-2">
              <Avatar size="md">
                <AvatarImage src={item.avatarUrl || DEFAULT_AVATAR_SRC} alt="" />
                <AvatarFallback>M</AvatarFallback>
              </Avatar>

              <div className="space-y-0.5">
                <Html
                  html={item.authorHtml}
                  className="text-sm font-bold leading-none text-dark-blue-400"
                />
                <Html
                  html={item.roleHtml}
                  className="text-xs leading-none font-light text-dark-blue-400"
                />
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}

export function TestimonialsSection({
  isEditing,
  data,
  onDataChange,
}: {
  isEditing: boolean
  data?: Record<string, unknown>
  onDataChange?: (data: TestimonialData) => void
}) {
  if (isEditing) {
    return (
      <TestimonialsEdit initialData={data} onDataChange={onDataChange} />
    )
  }
  return <TestimonialsView data={data} />
}
