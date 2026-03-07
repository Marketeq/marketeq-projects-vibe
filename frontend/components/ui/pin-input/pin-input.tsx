"use client"

import * as React from "react"
import { cn } from "@/utils/functions"
import * as pinInput from "@zag-js/pin-input"
import { normalizeProps, useMachine } from "@zag-js/react"
import { VariantProps, cva } from "class-variance-authority"

const pinInputVariants = cva(
  "rounded-lg border border-gray-300 p-2 text-center font-medium text-gray-300 shadow-xs placeholder:text-gray-300 focus:border-primary-500 focus:ring-primary-500 disabled:opacity-50",
  {
    variants: {
      size: {
        sm: "h-16 w-16 text-5xl",
        md: "h-20 w-20 text-5xl",
        lg: "h-24 w-24 text-[60px] leading-none",
      },
    },
    defaultVariants: {
      size: "sm",
    },
  }
)

interface FourDigitPinInputProps
  extends
    React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof pinInputVariants> {
  placeholder?: string
  pinInputClassName?: string
}

const FourDigitPinInput = React.forwardRef<
  HTMLDivElement,
  FourDigitPinInputProps
>(
  (
    { className, placeholder = "0", size, pinInputClassName, ...props },
    ref
  ) => {
    const id = React.useId()
    const service = useMachine(pinInput.machine, { id, placeholder })
    const api = pinInput.connect(service, normalizeProps)
    const _pinInputClassName = cn(
      pinInputVariants({ size, className: pinInputClassName })
    )

    return (
      <div
        className={cn("flex items-center gap-x-2", className)}
        {...props}
        {...api.getRootProps()}
        ref={ref}
      >
        <input
          className={_pinInputClassName}
          {...api.getInputProps({ index: 0 })}
        />
        <input
          className={_pinInputClassName}
          {...api.getInputProps({ index: 1 })}
        />
        <input
          className={_pinInputClassName}
          {...api.getInputProps({ index: 2 })}
        />
        <input
          className={_pinInputClassName}
          {...api.getInputProps({ index: 3 })}
        />
      </div>
    )
  }
)

FourDigitPinInput.displayName = "FourDigitPinInput"

interface SixDigitPinInputProps
  extends
    React.HTMLAttributes<HTMLElement>,
    VariantProps<typeof pinInputVariants> {
  placeholder?: string
  pinInputClassName?: string
}

const SixDigitPinInput = React.forwardRef<
  HTMLDivElement,
  SixDigitPinInputProps
>(
  (
    { className, placeholder = "0", size, pinInputClassName, ...props },
    ref
  ) => {
    const id = React.useId()
    const service = useMachine(pinInput.machine, { id, placeholder })
    const api = pinInput.connect(service, normalizeProps)
    const _pinInputClassName = pinInputVariants({
      size,
      className: pinInputClassName,
    })

    return (
      <div
        className={cn("flex items-center gap-x-2", className)}
        {...props}
        {...api.getRootProps()}
        ref={ref}
      >
        <input
          className={_pinInputClassName}
          {...api.getInputProps({ index: 0 })}
        />
        <input
          className={_pinInputClassName}
          {...api.getInputProps({ index: 1 })}
        />
        <input
          className={_pinInputClassName}
          {...api.getInputProps({ index: 2 })}
        />
        <span className="text-6xl font-medium text-gray-300">-</span>
        <input
          className={_pinInputClassName}
          {...api.getInputProps({ index: 3 })}
        />
        <input
          className={_pinInputClassName}
          {...api.getInputProps({ index: 4 })}
        />
        <input
          className={_pinInputClassName}
          {...api.getInputProps({ index: 5 })}
        />
      </div>
    )
  }
)

SixDigitPinInput.displayName = "SixDigitPinInput"

export { FourDigitPinInput, SixDigitPinInput }
