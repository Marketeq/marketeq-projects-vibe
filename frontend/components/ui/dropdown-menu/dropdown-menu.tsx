"use client"

import * as React from "react"
import { cn } from "@/utils/functions"
import { Check, ChevronRight, Circle } from "@blend-metrics/icons"
import * as DropdownMenuPrimitive from "@radix-ui/react-dropdown-menu"
import { VariantProps, cva } from "class-variance-authority"

const DropdownMenu = DropdownMenuPrimitive.Root

const DropdownMenuGroup = DropdownMenuPrimitive.Group

const DropdownMenuPortal = DropdownMenuPrimitive.Portal

const DropdownMenuSub = DropdownMenuPrimitive.Sub

const DropdownMenuRadioGroup = DropdownMenuPrimitive.RadioGroup

const DropdownMenuTrigger = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Trigger>
>(({ className, ...props }, ref) => (
  <DropdownMenuPrimitive.Trigger
    className={cn("focus-visible:outline-none", className)}
    {...props}
    ref={ref}
  />
))

DropdownMenuTrigger.displayName = DropdownMenuPrimitive.Trigger.displayName

const DropdownMenuSubTrigger = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.SubTrigger>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.SubTrigger> & {
    inset?: boolean
  }
>(({ className, inset, children, ...props }, ref) => (
  <DropdownMenuPrimitive.SubTrigger
    ref={ref}
    className={cn(
      "flex cursor-default select-none items-center px-3 py-2.5 text-[13px] leading-[13.25px] text-gray-500 outline-none data-[state=open]:bg-gray-100 hover:bg-gray-50 hover:text-gray-black focus:bg-gray-100 focus:text-gray-black disabled:pointer-events-none disabled:opacity-50",
      inset && "pl-8",
      className
    )}
    {...props}
  >
    {children}
    <ChevronRight className="ml-auto h-4 w-4" />
  </DropdownMenuPrimitive.SubTrigger>
))
DropdownMenuSubTrigger.displayName =
  DropdownMenuPrimitive.SubTrigger.displayName

const DropdownMenuSubContent = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.SubContent>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.SubContent>
>(({ className, ...props }, ref) => (
  <DropdownMenuPrimitive.SubContent
    ref={ref}
    className={cn(
      "z-50 min-w-[8rem] overflow-hidden rounded-lg border border-gray-100 bg-white py-1 shadow-lg data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 dark:border-gray-800 dark:bg-gray-950 dark:text-gray-50",
      className
    )}
    {...props}
  />
))
DropdownMenuSubContent.displayName =
  DropdownMenuPrimitive.SubContent.displayName

const DropdownMenuContent = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Content>
>(({ className, sideOffset = 4, ...props }, ref) => (
  <DropdownMenuPrimitive.Portal>
    <DropdownMenuPrimitive.Content
      ref={ref}
      sideOffset={sideOffset}
      className={cn(
        "z-50 min-w-[8rem] overflow-hidden rounded-lg border border-gray-100 bg-white py-1 shadow-lg data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
        className
      )}
      {...props}
    />
  </DropdownMenuPrimitive.Portal>
))
DropdownMenuContent.displayName = DropdownMenuPrimitive.Content.displayName

const dropdownMenuItemVariants = cva(
  "relative flex cursor-pointer select-none items-center gap-x-2 px-3 py-2.5 text-[13px] font-medium leading-[13.25px] outline-none transition-colors data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
  {
    variants: {
      visual: {
        default:
          "text-gray-500 hover:bg-gray-50 hover:text-gray-black hover:text-gray-900 focus:bg-gray-100 focus:text-gray-black",
        destructive: "text-error-500 hover:bg-error-50 focus:bg-error-100",
      },
    },
    defaultVariants: {
      visual: "default",
    },
  }
)

interface DropdownMenuItemProps
  extends React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Item>,
    VariantProps<typeof dropdownMenuItemVariants> {
  inset?: boolean
  icon?: React.ReactNode
}

const DropdownMenuItem = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.Item>,
  DropdownMenuItemProps
>(({ className, inset, icon, children, visual, ...props }, ref) => (
  <DropdownMenuPrimitive.Item
    ref={ref}
    className={cn(
      dropdownMenuItemVariants({ visual }),
      inset && "pl-8",
      className
    )}
    {...props}
  >
    {icon}
    {children}
  </DropdownMenuPrimitive.Item>
))
DropdownMenuItem.displayName = DropdownMenuPrimitive.Item.displayName

export const DropdownMenuCheckItem = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.CheckboxItem>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.CheckboxItem> & {
    iconOrAvatar?: React.ReactNode
  }
>(({ className, checked, children, iconOrAvatar, ...props }, ref) => (
  <DropdownMenuPrimitive.CheckboxItem
    ref={ref}
    className={cn(
      "relative flex cursor-pointer select-none items-center gap-x-2 py-2.5 pl-3 pr-10 text-[13px] font-medium leading-[13.25px] text-gray-500 outline-none transition-colors data-[disabled]:pointer-events-none data-[disabled]:opacity-50 hover:bg-gray-50 hover:text-gray-900 focus:bg-gray-100 focus:text-gray-black",
      className
    )}
    checked={checked}
    {...props}
  >
    {iconOrAvatar}
    {children}
    <span className="absolute right-3 flex h-3.5 w-3.5 items-center justify-center">
      <DropdownMenuPrimitive.ItemIndicator>
        <Check className="h-4 w-4 text-primary-500" />
      </DropdownMenuPrimitive.ItemIndicator>
    </span>
  </DropdownMenuPrimitive.CheckboxItem>
))

DropdownMenuCheckItem.displayName = "DropdownMenuCheckItem"

const DropdownMenuCheckboxItem = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.CheckboxItem>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.CheckboxItem> & {
    circular?: boolean
  }
>(({ className, children, checked, circular, ...props }, ref) => (
  <DropdownMenuPrimitive.CheckboxItem
    ref={ref}
    className={cn(
      "group relative flex cursor-pointer select-none items-center py-2.5 pl-9 pr-3 text-[13px] font-medium leading-[13.25px] text-gray-500 outline-none transition-colors data-[disabled]:pointer-events-none data-[disabled]:opacity-50 hover:bg-gray-50 hover:text-gray-900 focus:bg-gray-100 focus:text-gray-900",
      className
    )}
    checked={checked}
    {...props}
  >
    <span className="absolute left-3 flex h-4 w-4 items-center justify-center">
      <span
        className={cn(
          "inline-flex h-4 w-4 shrink-0 cursor-pointer items-center justify-center rounded-[5px] border-[1.5px] border-gray-300 text-white group-hover:border-primary-400 group-hover:ring group-hover:ring-primary-100 group-focus:border-primary-400 group-focus:ring group-focus:ring-primary-100 group-disabled:border-gray-200 group-disabled:bg-gray-50 group-disabled:text-gray-200 group-data-[state=checked]:border-primary-500 group-data-[state=checked]:bg-primary-500",
          circular && "rounded-full"
        )}
      >
        <DropdownMenuPrimitive.ItemIndicator>
          <Check className="h-3 w-3" />
        </DropdownMenuPrimitive.ItemIndicator>
      </span>
    </span>
    {children}
  </DropdownMenuPrimitive.CheckboxItem>
))
DropdownMenuCheckboxItem.displayName =
  DropdownMenuPrimitive.CheckboxItem.displayName

const DropdownMenuRadioItem = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.RadioItem>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.RadioItem> & {
    hideIndicator?: boolean
  }
>(({ className, children, hideIndicator = true, ...props }, ref) => (
  <DropdownMenuPrimitive.RadioItem
    ref={ref}
    className={cn(
      "group relative flex cursor-pointer select-none items-center py-2.5 pl-3 pr-3 text-[13px] font-medium leading-[13.25px] text-gray-500 outline-none transition-colors data-[disabled]:pointer-events-none data-[disabled]:opacity-50 hover:bg-gray-50 hover:text-gray-900 focus:bg-gray-100 focus:text-gray-black",
      {
        "pl-9": hideIndicator,
      },
      className
    )}
    {...props}
  >
    {hideIndicator && (
      <span className="absolute left-3 flex h-4 w-4 items-center justify-center rounded-full border-[1.5px] border-gray-300 text-white group-hover:ring group-hover:ring-primary-100 group-focus:border-primary-400 group-focus:ring group-focus:ring-primary-100 group-disabled:border-gray-200 group-disabled:bg-gray-50 group-disabled:text-gray-200 group-data-[state=checked]:border-primary-500 group-data-[state=checked]:text-primary-500 hover:border-primary-400">
        <DropdownMenuPrimitive.ItemIndicator>
          <Circle className="h-1.5 w-1.5 fill-current" />
        </DropdownMenuPrimitive.ItemIndicator>
      </span>
    )}
    {children}
  </DropdownMenuPrimitive.RadioItem>
))
DropdownMenuRadioItem.displayName = DropdownMenuPrimitive.RadioItem.displayName

export const DropdownMenuRadioTrigger = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.RadioItem>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.RadioItem> & {
    iconOrAvatar?: React.ReactNode
  }
>(({ className, children, iconOrAvatar, ...props }, ref) => (
  <DropdownMenuPrimitive.RadioItem
    ref={ref}
    className={cn(
      "relative flex cursor-pointer select-none items-center gap-x-2 py-2.5 pl-3 pr-10 text-[13px] font-medium leading-[13.25px] text-gray-500 outline-none transition-colors data-[disabled]:pointer-events-none data-[disabled]:opacity-50 hover:bg-gray-50 hover:text-gray-900 focus:bg-gray-100 focus:text-gray-black",
      className
    )}
    {...props}
  >
    {iconOrAvatar}
    {children}
    <span className="absolute right-3 flex h-3.5 w-3.5 items-center justify-center">
      <DropdownMenuPrimitive.ItemIndicator>
        <Check className="h-4 w-4 text-primary-500" />
      </DropdownMenuPrimitive.ItemIndicator>
    </span>
  </DropdownMenuPrimitive.RadioItem>
))

DropdownMenuRadioTrigger.displayName = "DropdownMenuRadioTrigger"

const DropdownMenuRadioCheckItem = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.RadioItem>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.RadioItem>
>(({ children, className, ...props }, ref) => (
  <DropdownMenuPrimitive.RadioItem
    ref={ref}
    className={cn(
      "group relative flex cursor-pointer select-none items-center py-3 pl-3 pr-7 text-[13px] font-medium leading-[13.3px] text-gray-500 outline-none transition-colors data-[disabled]:pointer-events-none data-[disabled]:opacity-50 hover:bg-gray-50 hover:text-gray-900 focus:bg-gray-100 focus:text-gray-black",
      className
    )}
    {...props}
  >
    {children}
    <DropdownMenuPrimitive.ItemIndicator>
      <Check className="h-4 w-4 flex-none absolute top-1/2 text-primary-500 -translate-y-1/2 right-3" />
    </DropdownMenuPrimitive.ItemIndicator>
  </DropdownMenuPrimitive.RadioItem>
))

DropdownMenuRadioCheckItem.displayName = "DropdownMenuRadioCheckItem"

const dropdownMenuLabelVariants = cva("text-sm font-semibold", {
  variants: {
    size: {
      sm: "px-3 py-2.5",
      md: "px-4 py-3",
    },
  },
  defaultVariants: {
    size: "sm",
  },
})

const DropdownMenuLabel = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.Label>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Label> & {
    inset?: boolean
  } & VariantProps<typeof dropdownMenuLabelVariants>
>(({ className, inset, size, ...props }, ref) => (
  <DropdownMenuPrimitive.Label
    ref={ref}
    className={cn(
      dropdownMenuLabelVariants({ size }),
      inset && "pl-8",
      className
    )}
    {...props}
  />
))
DropdownMenuLabel.displayName = DropdownMenuPrimitive.Label.displayName

const DropdownMenuSeparator = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.Separator>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Separator>
>(({ className, ...props }, ref) => (
  <DropdownMenuPrimitive.Separator
    ref={ref}
    className={cn("my-1 h-px bg-gray-100", className)}
    {...props}
  />
))
DropdownMenuSeparator.displayName = DropdownMenuPrimitive.Separator.displayName

const DropdownMenuShortcut = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLSpanElement>) => {
  return (
    <span
      className={cn(
        "ml-auto text-xs leading-[18px] tracking-widest",
        className
      )}
      {...props}
    />
  )
}
DropdownMenuShortcut.displayName = "DropdownMenuShortcut"

export {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuCheckboxItem,
  DropdownMenuRadioItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuGroup,
  DropdownMenuPortal,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuRadioGroup,
  DropdownMenuRadioCheckItem,
}
