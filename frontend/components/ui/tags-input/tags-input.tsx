"use client"

import React, { useState } from "react"
import { createPortal } from "react-dom"
import { cn, noop } from "@/utils/functions"
import { useControllableState, useToggle, useUpdateEffect } from "@/utils/hooks"
import { TagsInput, useTagsInputContext } from "@ark-ui/react"
import { VariantProps } from "class-variance-authority"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "../../own-combobox"
import { ScrollArea, ScrollAreaScrollbar, ScrollAreaThumb } from ".."
import { badgeVariants } from "../badge"
import { labelVariants } from "../label"
import { Popover, PopoverContent, PopoverTrigger } from "../popover"
import { ScaleOutIn } from "../transitions"

export const TagsInputRoot = React.forwardRef<
  React.ElementRef<typeof TagsInput.Root>,
  React.ComponentPropsWithoutRef<typeof TagsInput.Root>
>(({ editable = false, ...props }, ref) => (
  <TagsInput.Root editable={editable} {...props} ref={ref} />
))

TagsInputRoot.displayName = TagsInput.Root.displayName

export const TagsInputLabel = React.forwardRef<
  React.ElementRef<typeof TagsInput.Label>,
  React.ComponentPropsWithoutRef<typeof TagsInput.Label> &
    VariantProps<typeof labelVariants>
>(({ className, size, ...props }, ref) => (
  <TagsInput.Label
    className={cn(labelVariants({ className, size }))}
    {...props}
    ref={ref}
  />
))

TagsInputLabel.displayName = TagsInput.Label.displayName

export const TagsInputControl = React.forwardRef<
  React.ElementRef<typeof TagsInput.Control>,
  React.ComponentPropsWithoutRef<typeof TagsInput.Control> & {
    invalid?: boolean
  }
>(({ className, invalid, ...props }, ref) => (
  <TagsInput.Control
    className={cn(
      "min-h-11 bg-white border border-gray-300 shadow-xs focus-within:border-primary-500 focus-within:ring-2 focus-within:ring-primary-50 focus-visible:outline-none py-2.5 px-3.5 flex flex-wrap gap-x-3 gap-y-1 items-center rounded-[5px]",
      {
        "border-error-300 focus-within:border-error-300 focus-within:ring-error-100": invalid,
      },
      className
    )}
    {...props}
    ref={ref}
  />
))

TagsInputControl.displayName = TagsInput.Control.displayName

export const TagsInputItem = React.forwardRef<
  React.ElementRef<typeof TagsInput.Item>,
  React.ComponentPropsWithoutRef<typeof TagsInput.Item>
>(({ className, value, ...props }, ref) => {
  return (
    <TagsInput.Item
      className={cn("group inline-flex", className)}
      {...props}
      value={value}
      ref={ref}
    />
  )
})

TagsInputItem.displayName = TagsInput.Item.displayName

export const TagsInputItemPreview = React.forwardRef<
  React.ElementRef<typeof TagsInput.ItemPreview>,
  React.ComponentPropsWithoutRef<typeof TagsInput.ItemPreview> &
    VariantProps<typeof badgeVariants>
>(({ className, size, visual, variant, ...props }, ref) => (
  <TagsInput.ItemPreview
    className={cn(
      badgeVariants({
        size,
        visual,
        variant,
      }),
      className
    )}
    {...props}
    ref={ref}
  />
))

TagsInputItemPreview.displayName = TagsInput.ItemPreview.displayName

export const TagsInputItemText = TagsInput.ItemText

export const TagsInputItemDeleteTrigger = React.forwardRef<
  React.ElementRef<typeof TagsInput.ItemDeleteTrigger>,
  React.ComponentPropsWithoutRef<typeof TagsInput.ItemDeleteTrigger>
>(({ className, ...props }, ref) => (
  <TagsInput.ItemDeleteTrigger
    className={cn("focus-visible:outline-none", className)}
    {...props}
    ref={ref}
  />
))

TagsInputItemDeleteTrigger.displayName = TagsInput.ItemDeleteTrigger.displayName

const WORD_DELIMITER_RE = /[\s./-]/

/** Extends a search match to the end of its token (next space/period/dash/
 * slash) so a query like "rea" highlights the full "React" in "React.js" /
 * "React Native", not just the three typed characters. */
function matchBoldEnd(option: string, matchStart: number, matchLen: number): number {
  const minEnd = matchStart + matchLen
  const rest = option.slice(minEnd)
  const delimiterIndex = rest.search(WORD_DELIMITER_RE)
  return delimiterIndex === -1 ? option.length : minEnd + delimiterIndex
}

export const TagsInputItemInput = TagsInput.ItemInput

export const TagsInputInput = React.forwardRef<
  React.ElementRef<typeof TagsInput.Input>,
  React.ComponentPropsWithoutRef<typeof TagsInput.Input> & {
    options?: string[]
    onInputValueChange?: (value: string) => void
    allowCreateOption?: boolean
    portalDropdown?: boolean
    dropdownWidth?: number
    preferBelow?: boolean
    alignToControl?: boolean
    alwaysShowScrollbar?: boolean
    preserveOptionOrder?: boolean
  }
>(
  (
    {
      className,
      options,
      onInputValueChange,
      allowCreateOption,
      portalDropdown,
      dropdownWidth = 202,
      preferBelow = false,
      alignToControl = false,
      alwaysShowScrollbar = false,
      preserveOptionOrder = false,
      onKeyDown,
      ...props
    },
    ref
  ) => {
    const {
      inputValue,
      setInputValue,
      addValue,
      clearInputValue,
      focus,
      value: currentTags,
    } = useTagsInputContext()
    const onInputValueChangeRef = React.useRef(onInputValueChange)
    const [open, { off, on }] = useToggle(false)
    const isInputValueValid = inputValue !== ""
    const normalizedInputValue = inputValue.trim()
    const currentTagsLower = new Set(currentTags.map((t) => t.toLowerCase()))
    const filteredOptions = options?.filter(
      (option) =>
        option.toLowerCase().includes(inputValue.toLowerCase()) &&
        !currentTagsLower.has(option.toLowerCase())
    )
    const canCreateOption =
      allowCreateOption &&
      normalizedInputValue.length > 0 &&
      !filteredOptions?.length &&
      !options?.some(
        (option) => option.toLowerCase() === normalizedInputValue.toLowerCase()
      )
    const exactMatchedOption = options?.find(
      (option) => option.toLowerCase() === normalizedInputValue.toLowerCase()
    )
    const enterOptionValue =
      exactMatchedOption ?? (canCreateOption ? normalizedInputValue : null)

    useUpdateEffect(() => {
      isInputValueValid ? on() : off()
    }, [isInputValueValid])

    useUpdateEffect(() => {
      onInputValueChangeRef.current = onInputValueChange
    }, [onInputValueChange])

    useUpdateEffect(() => {
      onInputValueChangeRef.current?.(inputValue)
    }, [inputValue])

    const anchorRef = React.useRef<HTMLDivElement>(null)
    const [dropdownPos, setDropdownPos] = React.useState<{
      top?: number
      bottom?: number
      left: number
      maxHeight: number
    } | null>(null)

    const updateDropdownPos = React.useCallback(() => {
      const el = anchorRef.current
      if (!el) return
      // With alignToControl, anchor to the bordered control box (the
      // anchor div's immediate parent) instead of the inner div that only
      // wraps the text input — otherwise a wide dropdownWidth (matched to
      // the control's own width) overhangs past the control's edges by
      // whatever left padding the control applies.
      const positionEl = alignToControl ? (el.parentElement ?? el) : el
      const r = positionEl.getBoundingClientRect()
      // Hide the portaled dropdown when the input is scrolled out of the
      // viewport or clipped by any scrollable ancestor (e.g. a dialog body),
      // otherwise the fixed-positioned dropdown floats detached from its input.
      let visible = r.bottom > 0 && r.top < window.innerHeight
      let p: HTMLElement | null = el.parentElement
      while (p && visible) {
        const oy = window.getComputedStyle(p).overflowY
        if (oy === "auto" || oy === "scroll") {
          const pr = p.getBoundingClientRect()
          if (r.bottom < pr.top || r.top > pr.bottom) visible = false
        }
        p = p.parentElement
      }
      if (!visible) {
        setDropdownPos(null)
        return
      }
      const estimatedHeight = 250
      const spaceBelow = window.innerHeight - r.bottom
      const flipUp =
        !preferBelow && spaceBelow < estimatedHeight && r.top > spaceBelow
      // Cap the dropdown's own height to whatever room is actually left in
      // the viewport on whichever side it renders — otherwise, especially
      // with preferBelow forcing it down regardless of space, it can run
      // off the bottom of the page instead of staying fully in view.
      const gap = 8
      const edgeMargin = 16
      const available = flipUp
        ? r.top - gap - edgeMargin
        : window.innerHeight - r.bottom - gap - edgeMargin
      const maxHeight = Math.max(100, Math.min(232, available))
      setDropdownPos(
        flipUp
          ? { bottom: window.innerHeight - r.top + gap, left: r.left, maxHeight }
          : { top: r.bottom + gap, left: r.left, maxHeight }
      )
    }, [preferBelow, alignToControl])

    // A dropdown portaled to document.body sits OUTSIDE the scroll lock
    // Radix Dialog puts around its content (react-remove-scroll), whose
    // document-level `wheel` handler preventDefault()s any wheel event it
    // can't attribute to the locked subtree — which silently made this
    // list unscrollable by wheel, leaving only the scrollbar thumb to drag.
    // That handler is on `document` in the bubble phase, so stopping
    // propagation at the dropdown itself is enough to let the wheel through.
    // Must be a native non-passive listener: React's own handler is
    // registered on the portal container (document.body), too late to stop it.
    const dropdownRef = React.useRef<HTMLDivElement>(null)
    React.useEffect(() => {
      const el = dropdownRef.current
      if (!portalDropdown || !open || !el) return
      const stop = (event: WheelEvent) => event.stopPropagation()
      el.addEventListener("wheel", stop, { passive: false })
      return () => el.removeEventListener("wheel", stop)
      // dropdownPos gates whether the portal is mounted at all, so it has to
      // re-run once the position resolves — on the render that first opens
      // the dropdown it is still null and there is no node to attach to.
    }, [portalDropdown, open, dropdownPos])

    React.useEffect(() => {
      if (!portalDropdown || !open) return
      updateDropdownPos()
      window.addEventListener("scroll", updateDropdownPos, true)
      window.addEventListener("resize", updateDropdownPos)
      return () => {
        window.removeEventListener("scroll", updateDropdownPos, true)
        window.removeEventListener("resize", updateDropdownPos)
      }
    }, [portalDropdown, open, updateDropdownPos])

    return (
      <>
        <div
          ref={anchorRef}
          className="relative inline-block flex-1 min-w-[120px]"
        >
          <TagsInput.Input
            className={cn(
              "text-base leading-6 grow text-gray-900 placeholder:text-gray-500 font-normal focus-visible:outline-none border-0 focus:ring-0 p-0 h-max",
              className
            )}
            onKeyDown={(event) => {
              onKeyDown?.(event)
              if (event.defaultPrevented) return
              if (event.key !== "Enter" || event.nativeEvent.isComposing) return
              if (!enterOptionValue) return

              event.preventDefault()
              addValue(enterOptionValue)
              clearInputValue()
              focus()
              off()
            }}
            onBlur={() => {
              setTimeout(() => off(), 150)
            }}
            {...props}
            ref={ref}
          />

          {(() => {
            const dropdown = (
              <ScaleOutIn show={open}>
                <div
                  ref={dropdownRef}
                  style={{
                    ...(portalDropdown && dropdownPos
                      ? {
                          position: "fixed" as const,
                          ...(dropdownPos.top != null
                            ? { top: dropdownPos.top }
                            : { bottom: dropdownPos.bottom }),
                          left: dropdownPos.left,
                          pointerEvents: "auto" as const,
                        }
                      : undefined),
                    width: dropdownWidth,
                  }}
                  className={cn(
                    "px-0 pt-0 bg-white rounded-lg shadow-[0px_12px_16px_-4px_rgba(16,24,40,.08)]",
                    portalDropdown ? "z-[115]" : "absolute left-0 mt-2 z-50"
                  )}
                >
                  <Command shouldFilter={!preserveOptionOrder}>
                <CommandInput
                  placeholder="Search"
                  containerClassName="sr-only"
                  className="h-9"
                  value={inputValue}
                  onValueChange={(value) => {
                    setInputValue(value)
                    onInputValueChange?.(value)
                  }}
                />
                <ScrollArea
                  // "auto" keeps the bar on screen the whole time the list
                  // actually overflows (unlike "scroll", which fades it out
                  // between scroll events) while still hiding it entirely for
                  // a short list — "always" drew a dead, undraggable thumb
                  // over lists that fit.
                  type={alwaysShowScrollbar ? "auto" : "scroll"}
                  // Vertical only: the shared ScrollBar also renders a
                  // horizontal bar, which the dropdown never needs and which
                  // showed up as a stub in the bottom-left corner.
                  scrollBar={
                    <ScrollAreaScrollbar
                      orientation="vertical"
                      className="w-4 p-1"
                    >
                      <ScrollAreaThumb />
                    </ScrollAreaScrollbar>
                  }
                  viewportClassName="max-h-[232px] overflow-x-hidden"
                  viewportStyle={
                    portalDropdown && dropdownPos
                      ? { maxHeight: dropdownPos.maxHeight }
                      : undefined
                  }
                >
                <CommandList className="max-h-none">
                  {canCreateOption ? null : (
                    <CommandEmpty>No results found.</CommandEmpty>
                  )}
                  <CommandGroup className="pt-0">
                    {filteredOptions?.map((option) => {
                      const matchIndex = option
                        .toLowerCase()
                        .indexOf(inputValue.toLowerCase())
                      const boldEnd =
                        matchIndex >= 0
                          ? matchBoldEnd(option, matchIndex, inputValue.length)
                          : 0
                      return (
                        <CommandItem
                          key={option}
                          value={option}
                          onSelect={(currentValue) => {
                            addValue(currentValue)
                            clearInputValue()
                            focus()
                            off()
                          }}
                        >
                          <span>
                            {matchIndex >= 0 ? (
                              <>
                                {option.slice(0, matchIndex)}
                                <span className="font-semibold text-gray-900">
                                  {option.slice(matchIndex, boldEnd)}
                                </span>
                                {option.slice(boldEnd)}
                              </>
                            ) : (
                              option
                            )}
                          </span>
                        </CommandItem>
                      )
                    })}
                    {canCreateOption ? (
                      <CommandItem
                        className="text-primary-500 font-semibold data-[selected=true]:text-primary-500 data-[selected=true]:bg-primary-50"
                        value={normalizedInputValue}
                        onSelect={(currentValue) => {
                          addValue(currentValue)
                          clearInputValue()
                          focus()
                          off()
                        }}
                      >
                        {`Add "${normalizedInputValue}"`}
                      </CommandItem>
                    ) : null}
                  </CommandGroup>
                </CommandList>
                </ScrollArea>
                  </Command>
                </div>
              </ScaleOutIn>
            )
            if (portalDropdown) {
              return open && dropdownPos && typeof document !== "undefined"
                ? createPortal(dropdown, document.body)
                : null
            }
            return dropdown
          })()}
        </div>
      </>
    )
  }
)

TagsInputInput.displayName = TagsInput.Input.displayName

export const TagsInputClearTrigger = TagsInput.ClearTrigger

export const TagsInputContext = TagsInput.Context
