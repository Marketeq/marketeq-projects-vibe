"use client"

import * as React from "react"
import { cn } from "@/utils/functions"
import * as SliderPrimitive from "@radix-ui/react-slider"

const SliderRoot = React.forwardRef<
  React.ElementRef<typeof SliderPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof SliderPrimitive.Root>
>(({ className, ...props }, ref) => (
  <SliderPrimitive.Root
    ref={ref}
    className={cn(
      "relative flex w-full touch-none select-none items-center",
      className
    )}
    {...props}
  />
))
SliderRoot.displayName = SliderPrimitive.Root.displayName

const SliderTrack = React.forwardRef<
  React.ElementRef<typeof SliderPrimitive.Track>,
  React.ComponentPropsWithoutRef<typeof SliderPrimitive.Track>
>(({ className, ...props }, ref) => (
  <SliderPrimitive.Track
    ref={ref}
    className={cn(
      "relative h-2 w-full grow overflow-hidden rounded-full bg-gray-200",
      className
    )}
    {...props}
  />
))

SliderTrack.displayName = "SliderTrack"

const SliderRange = React.forwardRef<
  React.ElementRef<typeof SliderPrimitive.Range>,
  React.ComponentPropsWithoutRef<typeof SliderPrimitive.Range>
>(({ className, ...props }, ref) => (
  <SliderPrimitive.Range
    ref={ref}
    className={cn("absolute h-full bg-primary-500", className)}
    {...props}
  />
))

SliderRange.displayName = "SliderRange"

const SliderThumb = React.forwardRef<
  React.ElementRef<typeof SliderPrimitive.Thumb>,
  React.ComponentPropsWithoutRef<typeof SliderPrimitive.Thumb>
>(({ className, ...props }, ref) => (
  <SliderPrimitive.Thumb
    className={cn(
      "block h-6 w-6 rounded-full shadow-sm border border-primary-500 bg-white focus-visible:outline-none disabled:pointer-events-none",
      className
    )}
  />
))

SliderThumb.displayName = "SliderThumb"

const Slider = React.forwardRef<
  React.ElementRef<typeof SliderPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof SliderPrimitive.Root>
>(({ className, ...props }, ref) => (
  <SliderPrimitive.Root
    ref={ref}
    className={cn(
      "relative flex w-full flex-auto touch-none select-none items-center",
      className
    )}
    {...props}
  >
    <SliderPrimitive.Track className="relative h-2 w-full grow overflow-hidden rounded-full bg-gray-200">
      <SliderPrimitive.Range className="absolute h-full" />
    </SliderPrimitive.Track>
    <SliderPrimitive.Thumb className="block h-6 w-6 rounded-full border border-gray-400 shadow-[0px_2px_4px_-2px_rgba(16,24,40,.06),0px_4px_8px_-2px_rgba(16,24,40,.1)] bg-white focus-visible:outline-none shrink-0" />
  </SliderPrimitive.Root>
))
Slider.displayName = SliderPrimitive.Root.displayName

export { SliderRoot, SliderTrack, SliderThumb, SliderRange, Slider }
