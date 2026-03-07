"use client"

import * as React from "react"
import { cn } from "@/utils/functions"
import { useControllableState } from "@/utils/hooks"
import { createStrictContext } from "@/utils/react-utils"
import { X1 } from "@blend-metrics/icons"
import { type VariantProps, cva } from "class-variance-authority"

const alertVariants = cva(
  "relative w-full flex items-start gap-x-3 rounded-lg border p-4",
  {
    variants: {
      variant: {
        default: "bg-gray-25 border-gray-300 text-gray-500",
        primary: "bg-primary-50 border-primary-300 text-primary-500",
        error: "bg-error-25 border-error-300 text-error-500",
        warning: "bg-warning-25 border-warning-300 text-warning-500",
        success: "bg-success-25 border-success-300 text-success-500",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

const [AlertProvider, useAlertContext] = createStrictContext<{
  variant?: "default" | "primary" | "error" | "warning" | "success" | null
  onValueChange: (value: boolean) => void
  value: boolean
}>({
  displayName: "AlertProvider",
  errorMessage: `useAlertContext returned is 'undefined'. Seems you forgot to wrap the components in "<Alert />"`,
  strict: false,
})

const Alert = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> &
    VariantProps<typeof alertVariants> & {
      value?: boolean
      onValueChange?: (value: boolean) => void
    }
>(({ className, variant, ...props }, ref) => {
  const [value, onValueChange] = useControllableState({
    value: props.value,
    onChange: props.onValueChange,
    defaultValue: true,
  })

  return (
    <AlertProvider
      value={{
        variant,
        onValueChange,
        value,
      }}
    >
      {value && (
        <div
          ref={ref}
          role="alert"
          className={cn(alertVariants({ variant, className }))}
          {...props}
        />
      )}
    </AlertProvider>
  )
})
Alert.displayName = "Alert"

const AlertContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div className={cn("flex-auto", className)} ref={ref} {...props} />
))

AlertContent.displayName = "AlertContent"

const AlertIcon = React.forwardRef<
  HTMLSpanElement,
  React.HTMLAttributes<HTMLSpanElement>
>(({ className, ...props }, ref) => (
  <span className={cn("inline-block", className)} ref={ref} {...props} />
))

AlertIcon.displayName = "AlertIcon"

const AlertTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h5 ref={ref} className={cn("text-sm font-semibold", className)} {...props} />
))
AlertTitle.displayName = "AlertTitle"

const AlertDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("mt-1 text-sm", className)} {...props} />
))
AlertDescription.displayName = "AlertDescription"

const closeButtonVariants = cva(
  "inline-flex h-5 w-5 items-center justify-center focus-visible:outline-none",
  {
    variants: {
      variant: {
        default: "text-gray-500 hover:text-gray-600",
        primary: "text-primary-500 hover:text-primary-600",
        success: "text-success-500 hover:text-success-600",
        warning: "text-warning-500 hover:text-warning-600",
        error: "text-error-500 hover:text-error-600",
      },
    },
  }
)

const CloseButton = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> &
    VariantProps<typeof closeButtonVariants>
>(({ className, ...props }, ref) => {
  const context = useAlertContext()

  const closeAlert = () => context?.onValueChange(false)

  return (
    <button
      className={cn(
        closeButtonVariants({ variant: props.variant ?? context?.variant })
      )}
      onClick={closeAlert}
      {...props}
      ref={ref}
    >
      <X1 className="h-5 w-5" />
    </button>
  )
})

CloseButton.displayName = "CloseButton"

export {
  Alert,
  AlertContent,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  CloseButton,
}
