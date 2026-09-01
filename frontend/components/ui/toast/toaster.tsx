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
    // 5s is the common default and clears the 4-6s reading floor; a toast
    // carrying an action gets 8s, since it has to be read, decided on and
    // clicked. Material uses the same shape: ~4s plain, up to 10s actionable.
    <ToastProvider duration={5000}>
      {toasts.map(function ({
        id,
        title,
        description,
        action,
        variant,
        ...props
      }) {
        return (
          <Toast key={id} variant={variant} duration={action ? 8000 : undefined} {...props}>
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
