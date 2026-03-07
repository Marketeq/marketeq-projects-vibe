"use client"

import * as React from "react"
import { cn } from "@/utils/functions"
import { VariantProps } from "class-variance-authority"
import {
  DateInput as TimeFieldInputPrimitive,
  Label as TimeFieldLabelPrimitive,
  TimeField as TimeFieldPrimitive,
  DateSegment as TimeFieldSegmentPrimitive,
} from "react-aria-components"
import { labelVariants } from "../label"

export const TimeField = React.forwardRef<
  React.ElementRef<typeof TimeFieldPrimitive>,
  React.ComponentPropsWithoutRef<typeof TimeFieldPrimitive>
>(({ className, ...props }, ref) => (
  <TimeFieldPrimitive
    className={cn("relative space-y-1.5", className)}
    ref={ref}
    {...props}
  />
))

TimeField.displayName = "TimeField"

export const TimeFieldLabel = React.forwardRef<
  React.ElementRef<typeof TimeFieldLabelPrimitive>,
  React.ComponentPropsWithoutRef<typeof TimeFieldLabelPrimitive> &
    VariantProps<typeof labelVariants>
>(({ className, size, ...props }, ref) => (
  <TimeFieldLabelPrimitive
    className={cn(labelVariants({ className, size }))}
    ref={ref}
    {...props}
  />
))

TimeFieldLabel.displayName = "TimeFieldLabel"

export const TimeFieldInput = React.forwardRef<
  React.ElementRef<typeof TimeFieldInputPrimitive>,
  React.ComponentPropsWithoutRef<typeof TimeFieldInputPrimitive> &
    VariantProps<typeof labelVariants>
>(({ className, size, ...props }, ref) => (
  <TimeFieldInputPrimitive
    className={cn("border-gray-300 flex border rounded-[5px] h-10", className)}
    ref={ref}
    {...props}
  />
))
TimeFieldInput.displayName = "TimeFieldInput"

export const TimeFieldSegment = React.forwardRef<
  React.ElementRef<typeof TimeFieldSegmentPrimitive>,
  React.ComponentPropsWithoutRef<typeof TimeFieldSegmentPrimitive> &
    VariantProps<typeof labelVariants>
>(({ className, size, ...props }, ref) => (
  <TimeFieldSegmentPrimitive
    className={cn(
      "data-[type=hour]:pl-3 [&:not([data-type='literal'])]:outline-none data-[type=hour]:pr-px data-[type=minute]:pl-px data-[type=minute]:pr-3 text-xs text-gray-900 leading-6 data-[type=hour]:text-gray-900 data-[type=hour]:data-[placeholder]:text-gray-500 data-[type=minute]:text-gray-900 data-[type=minute]:data-[placeholder]:text-gray-500 data-[type=dayPeriod]:px-3 py-2 data-[type=dayPeriod]:border-l data-[type=dayPeriod]:ml-auto data-[type=dayPeriod]:rounded-r-[5px] data-[type=dayPeriod]:bg-white data-[type=dayPeriod]:border-gray-300",
      className
    )}
    ref={ref}
    {...props}
  />
))

TimeFieldSegment.displayName = "TimeFieldSegment"
