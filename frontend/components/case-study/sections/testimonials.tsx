"use client"

import React, { useEffect, useRef, useState } from "react"
import { Reorder } from "framer-motion"
import { Image01, Plus } from "@blend-metrics/icons"
import { cn, getId } from "@/utils/functions"
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  CircularProgress,
  IconButton,
  PictureEditor,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
  useToast,
} from "@/components/ui"
import { uploadCaseStudyImage } from "@/lib/case-study-upload"
import type { TestimonialData, TestimonialItem } from "@/lib/case-study-mapper"
import { BlockToolbar } from "@/components/case-study/toolbars"
import { AddBlockDivider } from "@/components/case-study/add-block-divider"
import { ArticleRoot, ControlledDraggable, Html, RichTextEditor, swap } from "./_shared"

/**
 * Figma's Shadow/lg, which Tailwind's own `shadow-lg` does not match — the DS
 * Tooltip hardcodes `shadow-lg`, so the exact value is overridden per-usage.
 */
const TOOLTIP_SHADOW =
  "shadow-[0px_12px_16px_-4px_rgba(16,24,40,0.08),0px_4px_6px_-2px_rgba(16,24,40,0.03)]"

/**
 * The DS TooltipContent is hardcoded `z-50`, but the builder mounts the editor
 * in a DialogContent raised to `z-[100]` (talent-profile/page.tsx). The tooltip
 * portals to the body, so at z-50 it paints *behind* that opaque dialog and the
 * card is invisible inside the builder while looking fine anywhere else.
 */
const TOOLTIP_Z = "z-[110]"

/**
 * The avatar control's 40px box. Figma renders the icons at 20px/2px and
 * 18px/1.2px; these icons carry a 19-unit viewBox, so the stroke has to be
 * scaled by viewBox/rendered-size to land on those widths in real pixels.
 */
const PLUS_STROKE_WIDTH = (2 * 19) / 20
const IMAGE_STROKE_WIDTH = (1.2 * 19) / 18

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
  // Which testimonials have an avatar upload in flight, and how far along each
  // one is — drives the Figma "Uploading" state (progress ring, inert control)
  // on that card only. A number means in flight at that percent; absent means
  // idle, so 0% is still distinguishable from "not uploading".
  const [uploadProgress, setUploadProgress] = useState<
    Record<number, number | undefined>
  >({})
  // Each PictureEditor only hands its preview-reset out through startingPoint,
  // but the upload that needs to undo it lives in onValueChange — so each
  // testimonial parks its own reset here, keyed by item id.
  const clearPreviewRefs = useRef<Record<number, () => void>>({})
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
                          setUploadProgress((prev) => ({ ...prev, [item]: 0 }))
                          uploadCaseStudyImage(file, (percent) =>
                            setUploadProgress((prev) =>
                              // A late event from a replaced upload must not
                              // resurrect the ring on a card that already
                              // finished, so only track an in-flight item.
                              prev[item] === undefined
                                ? prev
                                : { ...prev, [item]: percent }
                            )
                          )
                            .then((url) =>
                              setTestimonialData((prev) => ({
                                ...prev,
                                [item]: { ...prev[item], avatarUrl: url },
                              }))
                            )
                            .catch(() => {
                              // Drop PictureEditor's local preview, otherwise a
                              // failed upload still shows the picked photo and
                              // reads as success until the page is reloaded and
                              // the never-stored image is gone.
                              clearPreviewRefs.current[item]?.()
                              toast({
                                title: "Couldn't upload image",
                                description: "Please try again.",
                              })
                            })
                            .finally(() =>
                              setUploadProgress((prev) => {
                                const next = { ...prev }
                                delete next[item]
                                return next
                              })
                            )
                        }}
                        startingPoint={({ dataUrl, open, onRemove }) => {
                          clearPreviewRefs.current[item] = onRemove
                          const src =
                            dataUrl || testimonialData[item]?.avatarUrl
                          const progress = uploadProgress[item]
                          const isUploading = progress !== undefined
                          // Complete: the photo carries the control, and the
                          // gray circle only surfaces on hover/focus.
                          const hasPhoto = Boolean(src) && !isUploading

                          const control = (
                            <IconButton
                              type="button"
                              variant="outlined"
                              visual="gray"
                              size="md"
                              disabled={isUploading}
                              aria-label={
                                hasPhoto ? "Replace image" : "Add image"
                              }
                              onClick={open}
                              className={cn(
                                "absolute inset-0 rounded-full border-gray-300 bg-gray-50 text-gray-500 shadow-none hover:border-gray-400 hover:bg-gray-200 hover:text-gray-800 focus-visible:border-gray-400 focus-visible:bg-gray-200 focus-visible:text-gray-800 disabled:opacity-100",
                                hasPhoto &&
                                  "border-transparent bg-transparent opacity-0 hover:opacity-100 focus-visible:opacity-100"
                              )}
                            >
                              {hasPhoto || isUploading ? (
                                <Image01
                                  className={cn(
                                    "size-[18px]",
                                    isUploading && "text-primary-300"
                                  )}
                                  strokeWidth={IMAGE_STROKE_WIDTH}
                                />
                              ) : (
                                <Plus
                                  className="size-5"
                                  strokeWidth={PLUS_STROKE_WIDTH}
                                />
                              )}
                            </IconButton>
                          )

                          return (
                            <div className="relative size-10 shrink-0">
                              {hasPhoto && (
                                <Avatar
                                  size="md"
                                  className="border border-gray-200 hover:ring-0 active:ring-0"
                                >
                                  <AvatarImage src={src} alt="" />
                                  <AvatarFallback>M</AvatarFallback>
                                </Avatar>
                              )}

                              {isUploading ? (
                                control
                              ) : (
                                <TooltipProvider delayDuration={75}>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      {control}
                                    </TooltipTrigger>
                                    <TooltipContent
                                      side="top"
                                      visual="white"
                                      className={cn(
                                        "text-center font-semibold",
                                        TOOLTIP_SHADOW,
                                        TOOLTIP_Z
                                      )}
                                    >
                                      {hasPhoto
                                        ? "Replace Image"
                                        : "Add Image"}
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              )}

                              {isUploading && (
                                <span className="pointer-events-none absolute -left-px -top-px">
                                  <CircularProgress
                                    size={42}
                                    strokeWidth={2}
                                    value={progress}
                                    trackClassName="stroke-transparent"
                                  />
                                </span>
                              )}
                            </div>
                          )
                        }}
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
              {/* No stock-photo fallback: the editor's empty state is an
                  "Add Image" affordance, so an unset avatar has no photo to
                  stand in for it here. */}
              {item.avatarUrl && (
                <Avatar
                  size="md"
                  className="border border-gray-200 hover:ring-0 active:ring-0"
                >
                  <AvatarImage src={item.avatarUrl} alt="" />
                  <AvatarFallback>M</AvatarFallback>
                </Avatar>
              )}

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
