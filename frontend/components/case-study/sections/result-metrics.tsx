"use client"

import React, { useEffect, useState } from "react"
import { Reorder } from "framer-motion"
import { getId } from "@/utils/functions"
import type {
  ResultMetricItem,
  ResultMetricsData,
} from "@/lib/case-study-mapper"
import { BlockToolbar } from "@/components/case-study/toolbars"
import { ArticleRoot, ControlledDraggable, Html, RichTextEditor, swap } from "./_shared"

const defaultMetrics: ResultMetricItem[] = [
  { value: "50%", label: "Less Time Spent" },
  { value: "9X", label: "Production Increase" },
  { value: "98%", label: "User Engagement" },
  { value: "83%", label: "On Time Delivery" },
]

function ResultMetricsEdit({
  initialData,
  onDataChange,
}: {
  initialData?: Record<string, unknown>
  onDataChange?: (data: ResultMetricsData) => void
}) {
  const initialMetrics = (
    initialData?.metrics as ResultMetricItem[] | undefined
  )?.length
    ? (initialData!.metrics as ResultMetricItem[])
    : defaultMetrics
  const [ids] = useState(() => initialMetrics.map(() => getId()))
  const [items, setItems] = useState(ids)
  const [metricData, setMetricData] = useState<
    Record<number, ResultMetricItem>
  >(() => Object.fromEntries(ids.map((id, i) => [id, initialMetrics[i]])))
  const len = items.length

  useEffect(() => {
    onDataChange?.({ metrics: items.map((id) => metricData[id]) })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, metricData])

  return (
    <div className=" border rounded-lg bg-border-200 gap-x-[53.33px] p-[50px] group relative">
      <Reorder.Group
        as="div"
        className="isolate relative grid grid-cols-[repeat(var(--cols),minmax(0,1fr))] gap-x-[--gap] [--gap:53.33px]"
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
                    canHide={false}
                    onDuplicate={() => {
                      const uniqueId = getId() + 2
                      setItems(items.toSpliced(index, 0, uniqueId))
                    }}
                  />

                  <div className="relative space-y-2" key={index}>
                    <div className="relative">
                      <RichTextEditor
                        defaultValue={metricData[item]?.value ?? "50%"}
                        onUpdate={(val) =>
                          setMetricData((prev) => ({
                            ...prev,
                            [item]: { ...prev[item], value: val },
                          }))
                        }
                        editorClassName="text-[40px] leading-[48px] font-bold text-dark-blue-400"
                      />
                    </div>

                    <div className="relative">
                      <RichTextEditor
                        defaultValue={
                          metricData[item]?.label ?? "Less Time Spent"
                        }
                        onUpdate={(val) =>
                          setMetricData((prev) => ({
                            ...prev,
                            [item]: { ...prev[item], label: val },
                          }))
                        }
                        editorClassName="text-xl leading-[24px] text-dark-blue-400"
                      />
                    </div>
                  </div>
                </ArticleRoot>
              )}
            </ControlledDraggable>
          </React.Fragment>
        ))}
      </Reorder.Group>
    </div>
  )
}

function ResultMetricsView({ data }: { data?: Record<string, unknown> }) {
  const d = data ?? {}
  const metrics = Array.isArray(d.metrics)
    ? (d.metrics as ResultMetricItem[])
    : []
  if (!metrics.length) return null
  return (
    <section className="border rounded-lg bg-border-200 gap-x-[53.33px] flex items-center justify-between flex-wrap p-[50px]">
      {metrics.map((metric, i) => (
        <div className="space-y-2" key={i}>
          <Html
            html={metric.value}
            className="font-bold text-[40px] leading-[48px] text-dark-blue-400"
          />
          <Html
            html={metric.label}
            className="text-xl leading-[24px] text-dark-blue-400"
          />
        </div>
      ))}
    </section>
  )
}

export function ResultMetricsSection({
  isEditing,
  data,
  onDataChange,
}: {
  isEditing: boolean
  data?: Record<string, unknown>
  onDataChange?: (data: ResultMetricsData) => void
}) {
  if (isEditing) {
    return (
      <ResultMetricsEdit initialData={data} onDataChange={onDataChange} />
    )
  }
  return <ResultMetricsView data={data} />
}
