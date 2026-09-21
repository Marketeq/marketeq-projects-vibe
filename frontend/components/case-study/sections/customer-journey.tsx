"use client"

import React, { useEffect, useState } from "react"
import { Reorder } from "framer-motion"
import { getId } from "@/utils/functions"
import type {
  CustomerJourneyData,
  CustomerJourneyStage,
} from "@/lib/case-study-mapper"
import { BlockToolbar } from "@/components/case-study/toolbars"
import { AddBlockDivider } from "@/components/case-study/add-block-divider"
import { ArticleRoot, ControlledDraggable, Html, RichTextEditor, swap } from "./_shared"

const defaultCustomerJourneyStages: CustomerJourneyStage[] = [
  {
    titleHtml: "Stage Name",
    bodyHtml: "This is sample description for this stage",
  },
  {
    titleHtml: "Stage Name",
    bodyHtml: "This is sample description for this stage",
  },
  {
    titleHtml: "Stage Name",
    bodyHtml: "This is sample description for this stage",
  },
]

function CustomerJourneyEdit({
  initialData,
  onDataChange,
}: {
  initialData?: Record<string, unknown>
  onDataChange?: (data: CustomerJourneyData) => void
}) {
  const [title, setTitle] = useState(
    (initialData?.titleHtml as string) ?? "This is your customer journey"
  )
  const [body, setBody] = useState(
    (initialData?.bodyHtml as string) ??
      "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat."
  )
  const initialStages = (
    initialData?.stages as CustomerJourneyStage[] | undefined
  )?.length
    ? (initialData!.stages as CustomerJourneyStage[])
    : defaultCustomerJourneyStages
  const [ids] = useState(() => initialStages.map(() => getId()))
  const [items, setItems] = useState(ids)
  const [stageData, setStageData] = useState<
    Record<number, CustomerJourneyStage>
  >(() => Object.fromEntries(ids.map((id, i) => [id, initialStages[i]])))
  const len = items.length

  // Inserts a fresh stage at `at`, seeding stageData too — items and
  // stageData must stay in lockstep, otherwise stages.map((id) => stageData[id])
  // below (and CustomerJourneyView's render) hits an undefined entry for the new id.
  const addStageAt = (at: number) => {
    const uniqueId = getId() + 2
    setItems((prev) => prev.toSpliced(at, 0, uniqueId))
    setStageData((prev) => ({
      ...prev,
      [uniqueId]: {
        titleHtml: "Stage Name",
        bodyHtml: "This is sample description for this stage",
      },
    }))
  }

  useEffect(() => {
    onDataChange?.({
      titleHtml: title,
      bodyHtml: body,
      stages: items.map((id) => stageData[id]),
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title, body, items, stageData])

  return (
    <div className=" relative group">
      <div className="relative">
        <RichTextEditor
          defaultValue={title}
          onUpdate={setTitle}
          editorClassName="text-[40px] leading-none font-semibold text-dark-blue-400"
        />
      </div>

      <div className="relative mt-3">
        <RichTextEditor
          defaultValue={body}
          onUpdate={setBody}
          editorClassName="text-2xl leading-none font-light text-dark-blue-400"
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
                    onDuplicate={() => addStageAt(index)}
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
                          defaultValue={stageData[item]?.titleHtml ?? "Stage Name"}
                          onUpdate={(val) =>
                            setStageData((prev) => ({
                              ...prev,
                              [item]: { ...prev[item], titleHtml: val },
                            }))
                          }
                          editorClassName="text-2xl leading-none font-medium text-dark-blue-400"
                        />
                      </div>

                      <div className="relative mt-3">
                        <RichTextEditor
                          defaultValue={
                            stageData[item]?.bodyHtml ??
                            "This is sample description for this stage"
                          }
                          onUpdate={(val) =>
                            setStageData((prev) => ({
                              ...prev,
                              [item]: { ...prev[item], bodyHtml: val },
                            }))
                          }
                          editorClassName="text-base leading-none font-light text-dark-blue-400"
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
                  onAdd={() => addStageAt(index)}
                />
              </div>
            )}
          </React.Fragment>
        ))}
      </Reorder.Group>
    </div>
  )
}

function CustomerJourneyView({ data }: { data?: Record<string, unknown> }) {
  const d = data ?? {}
  // Entries can be null/undefined in case studies saved before the
  // editor seeded new items — drop the holes rather than crash.
  const stages = (
    Array.isArray(d.stages) ? (d.stages as (CustomerJourneyStage | null | undefined)[]) : []
  ).filter((item): item is CustomerJourneyStage => Boolean(item))
  return (
    <section>
      <Html
        html={d.titleHtml}
        className="text-[40px] leading-none font-semibold text-dark-blue-400"
      />
      <Html
        html={d.bodyHtml}
        className="mt-3 text-2xl leading-normal font-light text-dark-blue-400"
      />
      {stages.length ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-x-3 mt-8">
          {stages.map((stage, i) => (
            <article key={i}>
              <div className="size-[91px] rounded-full text-[39px] leading-none font-medium text-primary-500 border-[4.33px] border-primary-500 shrink-0 inline-flex items-center justify-center">
                {i + 1}
              </div>
              <div className="mt-5">
                <Html
                  html={stage.titleHtml}
                  className="text-2xl leading-[1.5] font-medium text-dark-blue-400"
                />
                <Html
                  html={stage.bodyHtml}
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

export function CustomerJourneySection({
  isEditing,
  data,
  onDataChange,
}: {
  isEditing: boolean
  data?: Record<string, unknown>
  onDataChange?: (data: CustomerJourneyData) => void
}) {
  if (isEditing) {
    return (
      <CustomerJourneyEdit initialData={data} onDataChange={onDataChange} />
    )
  }
  return <CustomerJourneyView data={data} />
}
