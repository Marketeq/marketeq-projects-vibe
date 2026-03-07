"use client"

import * as React from "react"
import { cn, isFn } from "@/utils/functions"
import { DragControls, Reorder, useDragControls } from "framer-motion"

interface ReorderGroup<T = any> {
  className?: string
  onReorder: (newOrder: any[]) => void
  values: T[]
  axis?: "y" | "x"
  children?: React.ReactNode
}

const ReorderGroup = Reorder.Group

const ReorderItem = <T,>({
  children,
  className,
  ...props
}: {
  children:
    | (({
        dragControls,
      }: {
        dragControls: DragControls
        onDrag: (event: React.PointerEvent<Element>) => void
      }) => React.ReactNode)
    | React.ReactNode
  className?: string
  value: T
  as?: keyof React.ReactHTML
}) => {
  const dragControls = useDragControls()
  const shouldUseRenderProps = isFn(children)

  return (
    <Reorder.Item
      className={cn("relative", className)}
      dragListener={shouldUseRenderProps ? false : undefined}
      dragControls={shouldUseRenderProps ? dragControls : undefined}
      {...props}
    >
      {shouldUseRenderProps
        ? children({
            dragControls,
            onDrag: (event) => dragControls.start(event),
          })
        : children}
    </Reorder.Item>
  )
}

export { ReorderGroup, ReorderItem }
