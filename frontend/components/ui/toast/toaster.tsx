"use client"

import { CheckCircle, HelpCircle } from "@blend-metrics/icons"
import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from "./toast"
import { useToast } from "./use-toast"

export function Toaster() {
  const { toasts } = useToast()

  return (
    <ToastProvider>
      {toasts.map(function ({
        id,
        title,
        description,
        action,
        variant,
        ...props
      }) {
        return (
          <Toast key={id} variant={variant} {...props}>
            <div className="flex items-center w-full whitespace-nowrap">
              {/* Icon */}
              {variant === "success" ? (
                <CheckCircle className="size-5 shrink-0 text-success-500" />
              ) : (
                <HelpCircle className="size-5 shrink-0 text-success-500" />
              )}

              {/* Icon → Text = 12px */}
              {title && (
                <span className="ml-3 font-semibold  text-[14px] leading-[20px] font-inter">
                  {title}
                </span>
              )}

              {/* Text → Undo = 16px */}
              {action && <div className="ml-4">{action}</div>}
            </div>
          </Toast>
        )
      })}
      <ToastViewport />
    </ToastProvider>
  )
}
