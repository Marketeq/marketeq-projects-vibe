"use client"

import React, { useState } from "react"
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
      "min-h-11 bg-white border border-gray-300 focus-visible:outline-none py-2.5 px-3.5 flex flex-wrap gap-x-3 gap-y-1 items-center rounded-[5px]",
      {
        "border-error-500 focus:border-error-500": invalid,
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

export const TagsInputItemInput = TagsInput.ItemInput

export const TagsInputInput = React.forwardRef<
  React.ElementRef<typeof TagsInput.Input>,
  React.ComponentPropsWithoutRef<typeof TagsInput.Input> & {
    options?: string[]
    onInputValueChange?: (value: string) => void
    allowCreateOption?: boolean
  }
>(
  (
    { className, options, onInputValueChange, allowCreateOption, ...props },
    ref
  ) => {
    const { inputValue, setInputValue, addValue, clearInputValue, focus } =
      useTagsInputContext()
    const [open, { off, on }] = useToggle(false)
    const isInputValueValid = inputValue !== ""
    const normalizedInputValue = inputValue.trim()
    const filteredOptions = options?.filter((option) =>
      option.toLowerCase().includes(inputValue.toLowerCase())
    )
    const canCreateOption =
      allowCreateOption &&
      normalizedInputValue.length > 0 &&
      !filteredOptions?.length &&
      !options?.some(
        (option) => option.toLowerCase() === normalizedInputValue.toLowerCase()
      )

    useUpdateEffect(() => {
      isInputValueValid ? on() : off()
    }, [isInputValueValid])

    return (
      <>
        <div className="relative inline-block">
          <TagsInput.Input
            className={cn(
              "text-base leading-6 grow text-gray-900 placeholder:text-gray-500 font-normal focus-visible:outline-none border-0 focus:ring-0 p-0 h-max",
              className
            )}
            {...props}
            ref={ref}
          />

          <ScaleOutIn show={open}>
            <div className="absolute left-0 mt-2 w-[202px] px-0 pt-0 z-50 bg-white rounded-lg shadow-[0px_12px_16px_-4px_rgba(16,24,40,.08)]">
              <Command>
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
                <CommandList>
                  {canCreateOption ? null : (
                    <CommandEmpty>No results found.</CommandEmpty>
                  )}
                  <CommandGroup className="pt-0">
                    {filteredOptions?.map((option) => (
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
                        {option}
                      </CommandItem>
                    ))}
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
              </Command>
            </div>
          </ScaleOutIn>
        </div>
      </>
    )
  }
)

TagsInputInput.displayName = TagsInput.Input.displayName

export const TagsInputClearTrigger = TagsInput.ClearTrigger

export const TagsInputContext = TagsInput.Context
