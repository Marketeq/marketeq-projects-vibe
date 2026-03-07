"use client"

import * as React from "react"
import { cn } from "@/utils/functions"
import { Check } from "@blend-metrics/icons"
import { Combobox as AutocompletePrimitives } from "@headlessui/react"
import { VariantProps } from "class-variance-authority"
import { WithoutChildren } from "@/types/react"
import { labelVariants } from "../label"

interface AutocompleteRootProps<TValue> {
  value?: TValue
  onChange?: (value: TValue) => void
  multiple?: boolean
  nullable?: boolean
  defaultValue?: TValue
  children?:
    | React.ReactNode
    | ((bag: {
        value: any
        open: boolean
        disabled: boolean
        activeIndex: number | null
        activeOption: any
      }) => React.ReactElement<any, string | React.JSXElementConstructor<any>>)
}

const AutocompleteRoot = <TValue,>({
  multiple,
  nullable,
  ...props
}: AutocompleteRootProps<TValue>) => {
  const otherProps = { multiple, nullable } as {
    multiple?: false
    nullable?: false
  }
  return <AutocompletePrimitives {...otherProps} {...props} />
}

const Autocomplete = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div className={cn("relative w-[320px]", className)} ref={ref} {...props} />
))

Autocomplete.displayName = "Autocomplete"

interface AutocompleteLabelProps
  extends WithoutChildren<React.LabelHTMLAttributes<HTMLLabelElement>>,
    VariantProps<typeof labelVariants> {
  children?:
    | React.ReactNode
    | ((bag: {
        open: boolean
        disabled: boolean
      }) => React.ReactElement<any, string | React.JSXElementConstructor<any>>)
}

const AutocompleteLabel = React.forwardRef<
  HTMLLabelElement,
  AutocompleteLabelProps
>(({ className, size, ...props }, ref) => (
  <AutocompletePrimitives.Label
    className={cn(labelVariants({ className, size }))}
    ref={ref}
    {...props}
  />
))

AutocompleteLabel.displayName = "AutocompleteLabel"

const AutocompleteTrigger = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div className={cn("relative z-10", className)} ref={ref} {...props} />
))

AutocompleteTrigger.displayName = "AutocompleteTrigger"

interface AutocompleteInputProps<T = any>
  extends Omit<
    React.InputHTMLAttributes<HTMLInputElement>,
    "children" | "defaultValue"
  > {
  as?: React.ElementType
  defaultValue?: T
  displayValue?: (item: T) => string
  children?:
    | React.ReactNode
    | ((bag: {
        open: boolean
        disabled: boolean
      }) => React.ReactElement<any, string | React.JSXElementConstructor<any>>)
}

const AutocompleteInput = React.forwardRef<
  HTMLInputElement,
  AutocompleteInputProps
>(({ className, ...props }, ref) => (
  <AutocompletePrimitives.Input
    className={cn(
      "h-11 w-full rounded-[5px] border-gray-300 bg-white px-3 py-2.5 text-base leading-6 text-gray-black shadow-xs ui-open:rounded-b-none ui-open:rounded-t-lg ui-open:border-0 ui-open:pl-[42px] ui-open:text-sm ui-open:shadow-[0px_-14px_25px_0px_rgba(0,0,0,0.10)] ui-open:ring-0 ui-not-open:pr-[42px] focus:border-primary-500 focus:ui-not-open:ring-4 focus:ui-not-open:ring-primary-50",
      className
    )}
    {...props}
    ref={ref}
  />
))

AutocompleteInput.displayName = "AutocompleteInput"

interface AutocompleteButtonProps
  extends WithoutChildren<React.ButtonHTMLAttributes<HTMLButtonElement>> {
  children?:
    | React.ReactNode
    | ((bag: {
        open: boolean
        disabled: boolean
        value: any
      }) => React.ReactElement<any, string | React.JSXElementConstructor<any>>)
}

const AutocompleteButton = React.forwardRef<
  HTMLButtonElement,
  AutocompleteButtonProps
>(({ className, ...props }, ref) => (
  <AutocompletePrimitives.Button
    className={cn(
      "absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 ui-open:left-3.5 ui-open:right-auto ui-open:text-gray-400",
      className
    )}
    ref={ref}
    {...props}
  />
))

AutocompleteButton.displayName = "AutocompleteButton"

interface AutocompleteOptionsProps
  extends WithoutChildren<React.HTMLAttributes<HTMLUListElement>> {
  children?:
    | React.ReactNode
    | ((bag: {
        open: boolean
      }) => React.ReactElement<any, string | React.JSXElementConstructor<any>>)
}

const AutocompleteOptions = React.forwardRef<
  HTMLUListElement,
  AutocompleteOptionsProps
>(({ className, ...props }, ref) => (
  <AutocompletePrimitives.Options
    className={cn(
      "absolute top-full z-10 h-[320px] w-full overflow-y-auto rounded-b-lg bg-white shadow-xs scrollbar-thin scrollbar-thumb-gray-200 scrollbar-thumb-rounded-[13px] ui-open:shadow-[0px_22px_25px_0px_rgba(0,0,0,0.10)]",
      className
    )}
    {...props}
    ref={ref}
  />
))

AutocompleteOptions.displayName = "AutocompleteOptions"

interface AutocompleteOptionProps<TValue = any>
  extends Omit<React.LiHTMLAttributes<HTMLLIElement>, "value" | "children"> {
  value: TValue
  children?:
    | React.ReactNode
    | ((bag: {
        active: boolean
        selected: boolean
        disabled: boolean
      }) => React.ReactElement<any, string | React.JSXElementConstructor<any>>)
}

const AutocompleteOption = React.forwardRef<
  HTMLLIElement,
  AutocompleteOptionProps
>(({ className, children, ...props }, ref) => (
  <AutocompletePrimitives.Option
    className={cn(
      "flex h-10 cursor-pointer items-center gap-x-3 px-3.5 py-2 text-sm text-gray-500",
      className
    )}
    {...props}
    ref={ref}
  >
    {({ selected, active }) => (
      <>
        <div
          className={cn(
            "inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-[5px] border-[1.5px] border-gray-300 bg-white",
            {
              "border-primary-400 ring-4 ring-primary-50": active,
              "border-primary-500 bg-primary-500": selected,
            }
          )}
        >
          <Check
            className={cn("hidden h-3 w-3 shrink-0 stroke-[2.5px] text-white", {
              block: selected,
            })}
          />
        </div>
        {children as React.ReactNode}
      </>
    )}
  </AutocompletePrimitives.Option>
))

AutocompleteOption.displayName = "AutocompleteOption"

export {
  AutocompleteRoot,
  AutocompleteLabel,
  Autocomplete,
  AutocompleteTrigger,
  AutocompleteInput,
  AutocompleteButton,
  AutocompleteOptions,
  AutocompleteOption,
}
