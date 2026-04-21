"use client"

import * as React from "react"
import { Button, type ButtonProps } from "@/components/ui"

const CAL_NAMESPACE = "deep-dive-discovery-call"
const CAL_LINK = "marketeq/deep-dive-discovery-call"
const CAL_BUTTON_CONFIG = JSON.stringify({
  layout: "month_view",
  useSlotsViewOnSmallScreen: true,
})

declare global {
  type CalQueueFn = ((...args: unknown[]) => void) & { q?: unknown[] }

  interface Window {
    Cal?: CalQueueFn & {
      (...args: unknown[]): void
      loaded?: boolean
      ns?: Record<string, CalQueueFn>
      q?: unknown[]
    }
  }
}

type CalBookingButtonProps = ButtonProps

export function CalBookingButton({
  children,
  ...props
}: CalBookingButtonProps) {
  React.useEffect(() => {
    const C = window
    const A = "https://app.cal.com/embed/embed.js"
    const L = "init"

    ;(function (C, A, L) {
      const p = function (a: { q?: unknown[] }, ar: IArguments | unknown[]) {
        a.q = a.q || []
        a.q.push(ar)
      }
      const d = C.document
      C.Cal =
        C.Cal ||
        function () {
          const cal = C.Cal!
          const ar = arguments
          if (!cal.loaded) {
            cal.ns = {}
            cal.q = cal.q || []
            d.head.appendChild(d.createElement("script")).src = A
            cal.loaded = true
          }
          if (ar[0] === L) {
            const api: CalQueueFn = function () {
              p(api, arguments)
            }
            const namespace = ar[1]
            api.q = api.q || []
            if (typeof namespace === "string") {
              cal.ns![namespace] = cal.ns![namespace] || api
              p(cal.ns![namespace], ar)
              p(cal, ["initNamespace", namespace])
            } else {
              p(cal, ar)
            }
            return
          }
          p(cal, ar)
        }
    })(C, A, L)

    window.Cal?.("init", CAL_NAMESPACE, { origin: "https://app.cal.com" })
    window.Cal?.ns?.[CAL_NAMESPACE]?.("ui", {
      cssVarsPerTheme: {
        light: { "cal-brand": "#306CFE" },
        dark: { "cal-brand": "#fafafa" },
      },
      hideEventTypeDetails: false,
      layout: "month_view",
    })
  }, [])

  return (
    <Button
      data-cal-config={CAL_BUTTON_CONFIG}
      data-cal-link={CAL_LINK}
      data-cal-namespace={CAL_NAMESPACE}
      type="button"
      {...props}
    >
      {children}
    </Button>
  )
}
