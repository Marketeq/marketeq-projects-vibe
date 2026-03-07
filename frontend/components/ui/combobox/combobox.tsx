"use client"

import * as React from "react"
import { cn } from "@/utils/functions"
import { Combobox as ComboboxPrimitive } from "@headlessui/react"
import { VariantProps, cva } from "class-variance-authority"
import { WithoutChildren } from "@/types/react"
import { labelVariants } from "../label"

interface ComboboxLabelProps
  extends WithoutChildren<React.LabelHTMLAttributes<HTMLLabelElement>>,
    VariantProps<typeof labelVariants> {
  children?:
    | React.ReactNode
    | ((bag: {
        open: boolean
        disabled: boolean
      }) => React.ReactElement<any, string | React.JSXElementConstructor<any>>)
}

const ComboboxLabel = React.forwardRef<HTMLLabelElement, ComboboxLabelProps>(
  ({ className, size, ...props }, ref) => {
    return (
      <ComboboxPrimitive.Label
        className={cn(labelVariants({ className, size }))}
        {...props}
        ref={ref}
      />
    )
  }
)

ComboboxLabel.displayName = "ComboboxLabel"

interface ComboboxProps<TValue>
  extends Omit<
    React.HTMLAttributes<HTMLDivElement>,
    "children" | "onChange" | "defaultValue"
  > {
  value?: TValue
  onChange?: (value: TValue) => void
  multiple?: boolean
  nullable?: boolean
  defaultValue?: TValue
  className?: string
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

const Combobox = <TValue,>({
  className,
  nullable,
  multiple,
  ...props
}: ComboboxProps<TValue>) => {
  const otherProps = { multiple, nullable } as {
    multiple?: false
    nullable?: false
  }
  return (
    <ComboboxPrimitive
      className={cn("relative w-[224px]", className)}
      as="div"
      {...props}
      {...otherProps}
    />
  )
}

Combobox.displayName = "Combobox"

const ComboboxTrigger = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div className={cn("relative", className)} {...props} ref={ref} />
))

ComboboxTrigger.displayName = "ComboboxTrigger"

export const comboboxInputVariants = cva("peer w-full rounded-[5px]", {
  variants: {
    visual: {
      default:
        "border border-gray-300 bg-white text-gray-900 placeholder:text-gray-500 hover:border-primary-200 hover:ring-4 hover:ring-primary-50 focus:border-primary-500 focus:ring-4 focus:ring-primary-50 disabled:opacity-50 disabled:cursor-not-allowed disabled:border-gray-300 disabled:bg-gray-50 hover:disabled:border-gray-300 hover:disabled:ring-0",
      error:
        "border border-error-300 bg-white text-gray-900 placeholder:text-gray-500 hover:border-error-300 hover:ring-4 hover:ring-error-100 focus:border-error-300 focus:ring-4 focus:ring-error-100 disabled:opacity-50 disabled:cursor-not-allowed disabled:border-error-300 disabled:bg-gray-50 hover:disabled:border-error-300 hover:disabled:ring-0",
      gray: "border-0 bg-gray-100 hover:bg-gray-200 text-gray-900 placeholder:text-gray-500 focus:bg-white focus:border focus:ring-4 focus:ring-primary-50 disabled:opacity-50 disabled:cursor-not-allowed disabled:border-gray-300 disabled:bg-gray-50 hover:disabled:border-gray-300 hover:disabled:ring-0",
    },
    size: {
      sm: "h-9 py-2.5 pr-3 pl-[34px] text-sm",
      lg: "h-11 py-2.5 pr-3.5 pl-[42px] text-base",
    },
  },
  defaultVariants: {
    visual: "default",
    size: "sm",
  },
})

interface ComboboxInputProps<T = any>
  extends Omit<
      React.InputHTMLAttributes<HTMLInputElement>,
      "children" | "defaultValue" | "size"
    >,
    VariantProps<typeof comboboxInputVariants> {
  as?: React.ElementType
  defaultValue?: T
  displayValue?: (item: T) => string
  children?:
    | React.ReactNode
    | ((bag: {
        open: boolean
        disabled: boolean
      }) => React.ReactElement<any, string | React.JSXElementConstructor<any>>)
  invalid?: boolean
}

const ComboboxInput = React.forwardRef<HTMLInputElement, ComboboxInputProps>(
  ({ className, visual, size, invalid, ...props }, ref) => (
    <ComboboxPrimitive.Input
      className={cn(
        comboboxInputVariants({
          visual: invalid ? "error" : visual,
          size,
          className,
        })
      )}
      {...props}
      ref={ref}
    />
  )
)

ComboboxInput.displayName = "ComboboxInput"

export const comboboxButtonVariants = cva(
  "inline-flex justify-center items-center absolute inset-y-0 my-auto text-gray-400 peer-hover:text-gray-500 peer-focus:text-primary-500 peer-disabled:cursor-not-allowed peer-disabled:opacity-50 focus-visible:outline-none",
  {
    variants: {
      align: {
        left: "",
        right: "",
      },
      size: {
        sm: "",
        lg: "",
      },
    },
    compoundVariants: [
      {
        align: "left",
        size: "sm",
        className: "left-2.5",
      },
      {
        align: "left",
        size: "lg",
        className: "left-3",
      },
      {
        align: "right",
        size: "sm",
        className: "right-2.5",
      },
      {
        align: "right",
        size: "lg",
        className: "right-3",
      },
    ],
    defaultVariants: {
      size: "sm",
      align: "left",
    },
  }
)

interface ComboboxButtonProps
  extends WithoutChildren<React.ButtonHTMLAttributes<HTMLButtonElement>> {
  children?:
    | React.ReactNode
    | ((bag: {
        open: boolean
        disabled: boolean
        value: any
      }) => React.ReactElement<any, string | React.JSXElementConstructor<any>>)
}

const ComboboxButton = React.forwardRef<
  HTMLButtonElement,
  ComboboxButtonProps & VariantProps<typeof comboboxButtonVariants>
>(({ className, size, align, ...props }, ref) => (
  <ComboboxPrimitive.Button
    className={cn(comboboxButtonVariants({ size, align, className }))}
    {...props}
    ref={ref}
  />
))

ComboboxButton.displayName = "ComboboxButton"

interface ComboboxOptionsProps
  extends WithoutChildren<React.HTMLAttributes<HTMLUListElement>> {
  children?:
    | React.ReactNode
    | ((bag: {
        open: boolean
      }) => React.ReactElement<any, string | React.JSXElementConstructor<any>>)
}

const ComboboxOptions = React.forwardRef<
  HTMLUListElement,
  ComboboxOptionsProps
>(({ className, ...props }, ref) => (
  <ComboboxPrimitive.Options
    className={cn(
      "absolute mt-1 w-full z-50 space-y-1 rounded-[5px] bg-white px-1 shadow-2xl",
      className
    )}
    {...props}
    ref={ref}
  />
))

ComboboxOptions.displayName = "ComboboxOptions"

interface ComboboxOptionProps<TValue = any>
  extends Omit<React.LiHTMLAttributes<HTMLLIElement>, "children" | "value"> {
  value: TValue
  children?:
    | React.ReactNode
    | ((bag: {
        active: boolean
        selected: boolean
        disabled: boolean
      }) => React.ReactElement<any, string | React.JSXElementConstructor<any>>)
}

const ComboboxOption = React.forwardRef<HTMLLIElement, ComboboxOptionProps>(
  ({ className, ...props }: ComboboxOptionProps, ref) => (
    <ComboboxPrimitive.Option
      className={cn(
        "cursor-pointer bg-white px-3 py-2.5 text-[13px] font-medium leading-none text-gray-500 ui-active:bg-gray-50 ui-active:text-gray-900",
        className
      )}
      ref={ref}
      {...props}
    />
  )
)

ComboboxOption.displayName = "ComboboxOption"

export {
  Combobox,
  ComboboxTrigger,
  ComboboxInput,
  ComboboxLabel,
  ComboboxButton,
  ComboboxOptions,
  ComboboxOption,
  ComboboxPrimitive,
}
