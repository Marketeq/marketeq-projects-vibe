"use client"

import React, { useEffect, useState } from "react"
import { Reorder } from "framer-motion"
import { cn, getId } from "@/utils/functions"
import type { ProcessData, ProcessStep } from "@/lib/case-study-mapper"
import { BlockToolbar } from "@/components/case-study/toolbars"
import { AddBlockDivider } from "@/components/case-study/add-block-divider"
import { ArticleRoot, ControlledDraggable, Html, RichTextEditor, swap } from "./_shared"

const defaultProcessSteps: ProcessStep[] = [
  {
    titleHtml: "Step Name",
    bodyHtml: "This is sample description for process",
  },
  {
    titleHtml: "Step Name",
    bodyHtml: "This is sample description for process",
  },
  {
    titleHtml: "Step Name",
    bodyHtml: "This is sample description for process",
  },
]

function ProcessEdit({
  initialData,
  onDataChange,
}: {
  initialData?: Record<string, unknown>
  onDataChange?: (data: ProcessData) => void
}) {
  const [title, setTitle] = useState(
    (initialData?.titleHtml as string) ?? "This is your process"
  )
  const [body, setBody] = useState(
    (initialData?.bodyHtml as string) ??
      "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat."
  )
  const initialSteps = (initialData?.steps as ProcessStep[] | undefined)
    ?.length
    ? (initialData!.steps as ProcessStep[])
    : defaultProcessSteps
  const [ids] = useState(() => initialSteps.map(() => getId()))
  const [items, setItems] = useState(ids)
  const [stepData, setStepData] = useState<Record<number, ProcessStep>>(() =>
    Object.fromEntries(ids.map((id, i) => [id, initialSteps[i]]))
  )
  const len = items.length

  // Inserts a fresh step at `at`, seeding stepData too — items and
  // stepData must stay in lockstep, otherwise steps.map((id) => stepData[id])
  // below (and ProcessView's render) hits an undefined entry for the new id.
  const addStepAt = (at: number) => {
    const uniqueId = getId() + 2
    setItems((prev) => prev.toSpliced(at, 0, uniqueId))
    setStepData((prev) => ({
      ...prev,
      [uniqueId]: {
        titleHtml: "Step Name",
        bodyHtml: "This is sample description for process",
      },
    }))
  }

  useEffect(() => {
    onDataChange?.({
      titleHtml: title,
      bodyHtml: body,
      steps: items.map((id) => stepData[id]),
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title, body, items, stepData])

  return (
    <div className=" relative group">
      <div className="relative">
        <RichTextEditor
          defaultValue={title}
          onUpdate={setTitle}
          editorClassName="text-[40px] leading-[48px] font-semibold text-dark-blue-400"
        />
      </div>

      <div className="relative mt-3">
        <RichTextEditor
          defaultValue={body}
          onUpdate={setBody}
          editorClassName="text-2xl leading-[29px] font-light text-dark-blue-400"
        />
      </div>

      <Reorder.Group
        as="div"
        className="relative grid gap-x-[--gap] [--gap:12px] mt-8 grid-cols-[repeat(var(--cols),minmax(0,1fr))]"
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
                  outlinedContainerClassName="-inset-1"
                >
                  <BlockToolbar
                    className="group-hover/article:opacity-100 group-hover/article:inline-flex hidden opacity-0 transition duration-300 -top-[38px] -right-[37px] absolute z-10 group-focus-within/article:hidden group-hover/article:group-focus-within/article:hidden"
                    onDrag={(event) => dragControls.start(event)}
                    canMoveLeft={Boolean(index)}
                    moveLeft={() => setItems(swap(items, index, index - 1))}
                    canMoveRight={index < len - 1}
                    moveRight={() => setItems(swap(items, index, index + 1))}
                    canRemove={len > 3}
                    onRemove={() =>
                      setItems(items.filter((itm) => itm !== item))
                    }
                    canDuplicate={len < 4}
                    onDuplicate={() => addStepAt(index)}
                  />

                  <div className="relative">
                    <div className="flex items-center gap-x-3">
                      <div className="size-[91px] rounded-full text-[39px] leading-none font-medium text-primary-500 border-[4.33px] border-primary-500 shrink-0 inline-flex items-center justify-center">
                        {index + 1}
                      </div>

                      <div className="group-data-[last=true]/article:hidden border-2 flex-auto border-primary-500 border-dashed opacity-20" />
                    </div>

                    <div className="pr-[38px] mt-5">
                      <div className="relative mt-3">
                        <RichTextEditor
                          defaultValue={stepData[item]?.titleHtml ?? "Step Name"}
                          onUpdate={(val) =>
                            setStepData((prev) => ({
                              ...prev,
                              [item]: { ...prev[item], titleHtml: val },
                            }))
                          }
                          editorClassName="text-2xl leading-[1.5] font-medium text-dark-blue-400"
                        />
                      </div>

                      <div className="relative mt-3">
                        <RichTextEditor
                          defaultValue={
                            stepData[item]?.bodyHtml ??
                            "This is sample description for process"
                          }
                          onUpdate={(val) =>
                            setStepData((prev) => ({
                              ...prev,
                              [item]: { ...prev[item], bodyHtml: val },
                            }))
                          }
                          editorClassName="text-base leading-normal font-light text-dark-blue-400"
                        />
                      </div>
                    </div>
                  </div>
                </ArticleRoot>
              )}
            </ControlledDraggable>

            {len < 4 && (
              <div
                style={{
                  ...({ "--pos": index + 1 } as Record<string, number>),
                }}
                className="peer-data-[last=true]:hidden absolute w-[--gap] group/gap flex justify-center inset-y-0 left-[calc(calc(calc(calc(theme(size.full)-calc(var(--gap)*calc(var(--cols)-1)))/var(--cols))*var(--pos))+calc(var(--gap)*calc(var(--pos)-1)))]"
              >
                <AddBlockDivider.Vertical
                  className="h-full group-hover/gap:visible invisible transition-[visibility] duration-300"
                  onAdd={() => addStepAt(index)}
                />
              </div>
            )}
          </React.Fragment>
        ))}
      </Reorder.Group>
    </div>
  )
}

function ProcessView({ data }: { data?: Record<string, unknown> }) {
  const d = data ?? {}
  // Entries can be null/undefined in case studies saved before the
  // editor seeded new items — drop the holes rather than crash.
  const steps = (
    Array.isArray(d.steps) ? (d.steps as (ProcessStep | null | undefined)[]) : []
  ).filter((item): item is ProcessStep => Boolean(item))
  return (
    <section>
      <Html
        html={d.titleHtml}
        className="text-[40px] leading-[48px] font-semibold text-dark-blue-400"
      />
      <Html
        html={d.bodyHtml}
        className="mt-3 text-2xl leading-[29px] font-light text-dark-blue-400"
      />
      {steps.length ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-x-3 mt-8">
          {steps.map((step, i) => (
            <article key={i}>
              <div className="size-[91px] rounded-full text-[39px] leading-[150%] font-medium text-primary-500 border-[4.33px] border-primary-500 shrink-0 inline-flex items-center justify-center">
                {i + 1}
              </div>
              <div className="mt-5">
                <Html
                  html={step.titleHtml}
                  className="text-2xl leading-[1.5] font-medium text-dark-blue-400"
                />
                <Html
                  html={step.bodyHtml}
                  className="text-base leading-normal font-light text-dark-blue-400 mt-3"
                />
              </div>
            </article>
          ))}
        </div>
      ) : null}
    </section>
  )
}

export function ProcessSection({
  isEditing,
  data,
  onDataChange,
}: {
  isEditing: boolean
  data?: Record<string, unknown>
  onDataChange?: (data: ProcessData) => void
}) {
  if (isEditing) {
    return <ProcessEdit initialData={data} onDataChange={onDataChange} />
  }
  return <ProcessView data={data} />
}
