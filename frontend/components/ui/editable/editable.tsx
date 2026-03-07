"use client"

import React from "react"
import { cn } from "@/utils/functions"
import {
  EditableAreaProps,
  EditableInputProps,
  EditableLabelProps,
  EditablePreviewProps,
  Editable as EditablePrimitives,
} from "@ark-ui/react/editable"

const EditableRootProvider = EditablePrimitives.RootProvider

const EditableRoot = EditablePrimitives.Root

const EditableLabel = React.forwardRef<
  React.ElementRef<typeof EditablePrimitives.Label>,
  EditableLabelProps
>(({ className, ...props }, ref) => (
  <EditablePrimitives.Label
    ref={ref}
    className={cn("sr-only", className)}
    {...props}
  />
))

EditableLabel.displayName = "EditableLabel"

const EditableArea = React.forwardRef<
  React.ElementRef<typeof EditablePrimitives.Area>,
  EditableAreaProps
>(({ className, ...props }, ref) => (
  <EditablePrimitives.Area
    className={cn("group/area", className)}
    ref={ref}
    {...props}
  />
))

EditableArea.displayName = "EditableArea"

const EditableInput = React.forwardRef<
  React.ElementRef<typeof EditablePrimitives.Input>,
  EditableInputProps
>(({ className, ...props }, ref) => (
  <EditablePrimitives.Input
    className={cn(
      "focus-visible:outline-none focus:ring-0 p-0 border-0 text-dark-blue-400 group-data-[placeholder-shown]/area:text-gray-500 font-medium text-sm leading-5",
      className
    )}
    ref={ref}
    {...props}
  />
))

EditableInput.displayName = "EditableInput"

const EditablePreview = React.forwardRef<
  React.ElementRef<typeof EditablePrimitives.Preview>,
  EditablePreviewProps
>(({ className, ...props }, ref) => (
  <EditablePrimitives.Preview
    className={cn(
      "focus-visible:outline-none focus:ring-0 p-0 border-0 text-dark-blue-400 group-data-[placeholder-shown]/area:text-gray-500 font-medium text-sm leading-5",
      className
    )}
    ref={ref}
    {...props}
  />
))

EditablePreview.displayName = "EditablePreview"

const EditableControl = EditablePrimitives.Control

const EditableCancelTrigger = EditablePrimitives.CancelTrigger

const EditableSubmitTrigger = EditablePrimitives.SubmitTrigger

const EditableEditTrigger = EditablePrimitives.EditTrigger

export {
  EditableRootProvider,
  EditableRoot,
  EditableLabel,
  EditableArea,
  EditableInput,
  EditablePreview,
  EditableControl,
  EditableCancelTrigger,
  EditableSubmitTrigger,
  EditableEditTrigger,
}
