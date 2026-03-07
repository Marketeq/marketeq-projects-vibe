"use client"

import * as React from "react"
import { cn, isFn, isString } from "@/utils/functions"
import { useControllableState } from "@/utils/hooks"
import { Check, ChevronDown } from "@blend-metrics/icons"
import { Listbox as ListboxPrimitive, Transition } from "@headlessui/react"
import { VariantProps } from "class-variance-authority"
import { WithoutChildren } from "@/types/react"
import { ScrollArea, ScrollBar } from ".."
import { labelVariants } from "../label"

interface ListboxProps<T>
  extends Omit<
    React.HTMLAttributes<HTMLDivElement>,
    "defaultValue" | "children" | "onChange"
  > {
  value?: T
  defaultValue?: T
  onChange?: (value: T) => void
  className?: string
  multiple?: boolean
  disabled?: boolean
  children?:
    | React.ReactNode
    | ((bag: {
        value: T
        open: boolean
        disabled: boolean
      }) => React.ReactElement<any, string | React.JSXElementConstructor<any>>)
}

export const Listbox = <T,>({
  className,
  value,
  onChange,
  ...props
}: ListboxProps<T>) => {
  const [selected, setSelected] = useControllableState<T>({
    value,
    onChange,
  })

  return (
    <ListboxPrimitive
      className={cn("relative w-full", className)}
      as="div"
      value={selected}
      onChange={setSelected}
      {...props}
    />
  )
}

interface ListboxLabel
  extends WithoutChildren<React.LabelHTMLAttributes<HTMLLabelElement>>,
    VariantProps<typeof labelVariants> {
  children?:
    | React.ReactNode
    | ((bag: {
        open: boolean
        disabled: boolean
      }) => React.ReactElement<any, string | React.JSXElementConstructor<any>>)
}

export const ListboxLabel = React.forwardRef<HTMLLabelElement, ListboxLabel>(
  ({ className, size, ...props }, ref) => {
    return (
      <ListboxPrimitive.Label
        className={cn(labelVariants({ className, size }))}
        ref={ref}
        {...props}
      />
    )
  }
)

ListboxLabel.displayName = "ListboxLabel"

export const ListboxContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("relative", className)} {...props} />
))

ListboxContent.displayName = "ListboxContent"

interface ListboxButtonProps<T = any>
  extends WithoutChildren<React.ButtonHTMLAttributes<HTMLButtonElement>> {
  className?: string
  children?: ({
    value,
    disabled,
    open,
  }: {
    value: T
    disabled: boolean
    open: boolean
  }) => React.ReactNode
  iconClassName?: string
  placeholder?: string
  isInvalid?: boolean
  placeholderClassName?: string
  displayValue?: (value: T) => React.ReactNode
}

export const ListboxButton = ({
  className,
  placeholder,
  iconClassName,
  children,
  isInvalid,
  placeholderClassName,
  displayValue,
  ...props
}: ListboxButtonProps) => {
  return (
    <ListboxPrimitive.Button
      className={cn(
        "flex h-11 w-full items-center gap-x-2 rounded-[5px] border border-gray-300 bg-white px-3.5 py-2.5 text-base text-gray-black shadow-xs focus:border-primary-500 focus:ring-4 focus:ring-primary-50 focus-visible:outline-none",
        {
          "border-error-300 focus:border-error-300 focus:ring-error-100":
            isInvalid,
        },
        className
      )}
      {...props}
    >
      {({ value, disabled, open }) => (
        <>
          {value
            ? children
              ? children?.({ disabled, open, value })
              : isString(value)
                ? value
                : displayValue?.(value)
            : placeholder && (
                <span className={cn("text-gray-500", placeholderClassName)}>
                  {placeholder}
                </span>
              )}
          <ChevronDown
            className={cn(
              "ml-auto h-5 w-5 shrink-0 flex-none text-gray-500",
              iconClassName
            )}
          />
        </>
      )}
    </ListboxPrimitive.Button>
  )
}

interface ListboxOptions
  extends WithoutChildren<React.HTMLAttributes<HTMLUListElement>> {
  children?:
    | React.ReactNode
    | ((bag: {
        open: boolean
      }) => React.ReactElement<any, string | React.JSXElementConstructor<any>>)

  viewportClassName?: string
  wrapperClassName?: string
}

export const ListboxOptions = React.forwardRef<
  HTMLUListElement,
  ListboxOptions
>(
  (
    { className, viewportClassName, children, wrapperClassName, ...props },
    ref
  ) => (
    <Transition
      as={React.Fragment}
      leave="transition ease-in duration-100"
      leaveFrom="opacity-100"
      leaveTo="opacity-0"
    >
      <ListboxPrimitive.Options
        ref={ref}
        className={cn(
          "absolute z-10 mt-1 w-full rounded-md bg-white text-base shadow-lg focus:outline-none sm:text-sm",
          className
        )}
        {...props}
      >
        {({ open }) => (
          <ScrollArea
            scrollBar={<ScrollBar className="p-1 w-4" />}
            viewportClassName={cn("py-1 max-h-[206px]", viewportClassName)}
          >
            <div className={cn("space-y-1", wrapperClassName)}>
              {isFn(children) ? children({ open }) : children}
            </div>
          </ScrollArea>
        )}
      </ListboxPrimitive.Options>
    </Transition>
  )
)

ListboxOptions.displayName = "ListboxOptions"

interface ListboxOption<T = any>
  extends Omit<React.LiHTMLAttributes<HTMLLIElement>, "value" | "children"> {
  value: T
  children?: React.ReactNode
  iconClassName?: string
  indicator?: boolean
}

export const ListboxOption = React.forwardRef(
  ({
    className,
    value,
    children,
    iconClassName,
    indicator = true,
    ...props
  }: ListboxOption) => (
    <ListboxPrimitive.Option
      className={cn(
        "flex cursor-pointer items-center gap-x-2 p-3 text-[13px] truncate leading-[13.25px] text-gray-500 ui-active:bg-gray-50 ui-active:text-gray-black",
        className
      )}
      value={value}
      {...props}
    >
      {({ selected }) => (
        <>
          {children}
          {indicator && selected && (
            <Check
              className={cn("ml-auto h-4 w-4 text-primary-500", iconClassName)}
            />
          )}
        </>
      )}
    </ListboxPrimitive.Option>
  )
)

ListboxOption.displayName = "ListboxOption"
