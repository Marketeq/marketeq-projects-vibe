"use client"

import * as React from "react"
import { callAll, cn, isArray, noop } from "@/utils/functions"
import { useControllableState } from "@/utils/hooks"
import { createContext } from "@/utils/react-utils"
import * as PopoverPrimitives from "@radix-ui/react-popover"
import { cva } from "class-variance-authority"
import * as CommandPrimitives from "cmdk"

const [DropdownPopoverProvider, useDropdownPopoverContext] = createContext<{
  isOpen: boolean
  close: () => void
  selected: string | number | Record<string, any> | any[]
  onSelectedChange: (...args: any[]) => void
  multiple: boolean
}>({
  displayName: "DropdownPopoverProvider",
  errorMessage: `useDropdownPopoverContext returned is 'undefined'. Seems you forgot to wrap the components in "<DropdownPopover />"`,
})

interface DropdownPopoverProps
  extends React.ComponentPropsWithoutRef<typeof PopoverPrimitives.Popover> {
  selected?: string | number | Record<string, any> | any[]
  onSelectedChange?: (...args: any[]) => void
  multiple?: boolean
}

export const DropdownPopover = ({
  open,
  onOpenChange,
  onSelectedChange,
  selected,
  multiple = false,
  ...props
}: DropdownPopoverProps) => {
  const [isOpen, setIsOpen] = useControllableState({
    defaultValue: false,
    value: open,
    onChange: onOpenChange,
  })
  const [state, setState] = useControllableState({
    value: selected,
    onChange: onSelectedChange,
  })

  const close = React.useCallback(() => setIsOpen(false), [setIsOpen])

  return (
    <DropdownPopoverProvider
      value={{
        close,
        multiple,
        isOpen,
        onSelectedChange: setState,
        selected: state,
      }}
    >
      <PopoverPrimitives.Popover
        open={isOpen}
        onOpenChange={setIsOpen}
        {...props}
      />
    </DropdownPopoverProvider>
  )
}

DropdownPopover.displayName = "DropdownPopover"

export const DropdownPopoverTrigger = React.forwardRef<
  React.ElementRef<typeof PopoverPrimitives.PopoverTrigger>,
  React.ComponentPropsWithoutRef<typeof PopoverPrimitives.PopoverTrigger>
>(({ className, ...props }, ref) => (
  <PopoverPrimitives.Trigger
    className={cn(
      "flex h-11 w-full items-center rounded-[5px] border border-gray-300 bg-white p-2.5 pl-3 text-base text-gray-800 data-[state=open]:border-primary-400 data-[state=open]:ring-4 data-[state=open]:ring-primary-50 focus-visible:outline-none",
      className
    )}
    {...props}
    ref={ref}
  />
))

DropdownPopoverTrigger.displayName = "DropdownPopoverTrigger"

export const DropdownPopoverContent = React.forwardRef<
  React.ElementRef<typeof PopoverPrimitives.PopoverContent>,
  React.ComponentPropsWithoutRef<typeof PopoverPrimitives.PopoverContent>
>(
  (
    { className, side = "bottom", align = "start", sideOffset = 8, ...props },
    ref
  ) => (
    <PopoverPrimitives.PopoverContent
      className={cn(
        "relative z-50 rounded-lg bg-white shadow-[0px_4px_25px_0px_rgba(0,0,0,0.1)] outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
        className
      )}
      side={side}
      align={align}
      sideOffset={sideOffset}
      {...props}
      ref={ref}
    />
  )
)

DropdownPopoverContent.displayName = "DropdownPopoverContent"

export const DropdownCommand = React.forwardRef<
  React.ElementRef<typeof CommandPrimitives.Command>,
  React.ComponentPropsWithoutRef<typeof CommandPrimitives.Command>
>(({ className, ...props }, ref) => {
  return (
    <CommandPrimitives.Command
      className={cn("overflow-hidden", className)}
      {...props}
      ref={ref}
    />
  )
})

DropdownCommand.displayName = "DropdownCommand"

export const DropdownCommandInput = React.forwardRef<
  React.ElementRef<typeof CommandPrimitives.CommandInput>,
  React.ComponentPropsWithoutRef<typeof CommandPrimitives.CommandInput>
>(({ className, ...props }, ref) => (
  <CommandPrimitives.CommandInput
    ref={ref}
    className={cn(
      "h-11 rounded-t-lg border-0 border-b-[0.71px] border-gray-100 bg-white text-sm font-medium text-gray-black placeholder:text-gray-400 focus:border-gray-100 focus:ring-0",
      className
    )}
    {...props}
  />
))

DropdownCommandInput.displayName = "DropdownCommandInput"

export const DropdownCommandEmpty = React.forwardRef<
  React.ElementRef<typeof CommandPrimitives.CommandEmpty>,
  React.ComponentPropsWithoutRef<typeof CommandPrimitives.CommandEmpty>
>(({ className, ...props }, ref) => (
  <CommandPrimitives.CommandEmpty
    ref={ref}
    className={cn("py-3 text-center text-sm text-gray-700", className)}
    {...props}
  />
))

DropdownCommandEmpty.displayName = "DropdownCommandEmpty"

export const DropdownCommandGroup = React.forwardRef<
  React.ElementRef<typeof CommandPrimitives.CommandGroup>,
  React.ComponentPropsWithoutRef<typeof CommandPrimitives.CommandGroup>
>(({ className, ...props }, ref) => (
  <CommandPrimitives.CommandGroup
    ref={ref}
    className={cn("overflow-hidden py-1", className)}
    {...props}
  />
))

DropdownCommandGroup.displayName = "DropdownCommandGroup"

const dropdownCommandItemVariants = cva(
  "group flex cursor-pointer text-sm font-medium text-gray-700 items-start px-2.5 py-3.5",
  {
    variants: {
      variant: {
        selected: "bg-gray-50",
      },
    },
  }
)

export const DropdownCommandItem = React.forwardRef<
  React.ElementRef<typeof CommandPrimitives.CommandItem>,
  React.ComponentPropsWithoutRef<typeof CommandPrimitives.CommandItem> & {
    itemValue: string | number | Record<string, any> | any[]
  }
>(({ className, itemValue, ...props }, ref) => {
  const { close, selected, multiple, onSelectedChange } =
    useDropdownPopoverContext()

  const isSelected = multiple
    ? isArray(selected)
      ? selected.includes(itemValue)
      : false
    : selected === itemValue

  const handleSelect = () => {
    if (isSelected) {
      multiple
        ? isArray(selected)
          ? onSelectedChange(selected.filter((item) => item !== itemValue))
          : noop
        : onSelectedChange(null)
    } else {
      multiple
        ? isArray(selected)
          ? onSelectedChange([...selected, itemValue])
          : onSelectedChange([itemValue])
        : onSelectedChange(itemValue)
    }
  }

  return (
    <CommandPrimitives.CommandItem
      ref={ref}
      onSelect={callAll(handleSelect, close)}
      data-state={isSelected ? "selected" : ""}
      className={cn(
        dropdownCommandItemVariants({
          variant: isSelected ? "selected" : undefined,
          className,
        })
      )}
      {...props}
    />
  )
})

DropdownCommandItem.displayName = "DropdownCommandItem"
