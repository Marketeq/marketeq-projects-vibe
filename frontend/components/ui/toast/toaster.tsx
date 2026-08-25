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
    <ToastProvider duration={3000}>
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
            <div className="flex max-w-full items-start">
              {/* Icon */}
              {variant === "success" ? (
                <CheckCircle className="size-5 shrink-0 text-success-500" />
              ) : (
                <HelpCircle className="size-5 shrink-0 text-white" />
              )}

              {/* Icon → Text = 12px */}
              <div className="ml-3 max-w-full min-w-0">
                {title && (
                  <ToastTitle className="text-[14px] font-semibold leading-[20px] text-white">
                    {title}
                  </ToastTitle>
                )}
                {description && (
                  <ToastDescription className="text-white/90">
                    {description}
                  </ToastDescription>
                )}
              </div>

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
