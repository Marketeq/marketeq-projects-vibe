"use client"

import * as React from "react"
import { Button, type ButtonProps } from "@/components/ui"

const CAL_ORIGIN = "https://app.cal.com"
const CAL_NAMESPACE = "deep-dive-discovery-call"
const CAL_LINK = "marketeq/deep-dive-discovery-call"
const CAL_SCRIPT_URL = `${CAL_ORIGIN}/embed/embed.js`
const CAL_MODAL_CONFIG = {
  layout: "month_view",
  useSlotsViewOnSmallScreen: true,
}

type CalBookingButtonProps = ButtonProps

type CalApi = {
  (...args: unknown[]): void
  loaded?: boolean
  q?: unknown[]
  ns?: Record<string, unknown>
}

declare global {
  interface Window {
    Cal?: CalApi
  }
}

function ensureCalStub() {
  if (typeof window === "undefined") {
    return
  }

  if (window.Cal) {
    return
  }

  const cal = function (...args: unknown[]) {
    cal.q = cal.q || []
    cal.q.push(args)
  } as CalApi

  cal.q = cal.q || []
  window.Cal = cal
}

function loadCalScript() {
  if (typeof window === "undefined") {
    return Promise.resolve()
  }

  ensureCalStub()

  const existingScript = document.querySelector<HTMLScriptElement>(
    `script[data-cal-embed-src="${CAL_SCRIPT_URL}"]`,
  )

  if (existingScript) {
    if (existingScript.dataset.loaded === "true") {
      return Promise.resolve()
    }

    return new Promise<void>((resolve, reject) => {
      existingScript.addEventListener(
        "load",
        () => {
          existingScript.dataset.loaded = "true"
          resolve()
        },
        { once: true },
      )
      existingScript.addEventListener(
        "error",
        () => reject(new Error(`Failed to load Cal embed from ${CAL_SCRIPT_URL}`)),
        { once: true },
      )
    })
  }

  return new Promise<void>((resolve, reject) => {
    const script = document.createElement("script")
    script.src = CAL_SCRIPT_URL
    script.async = true
    script.dataset.calEmbedSrc = CAL_SCRIPT_URL
    script.addEventListener(
      "load",
      () => {
        script.dataset.loaded = "true"
        resolve()
      },
      { once: true },
    )
    script.addEventListener(
      "error",
      () => reject(new Error(`Failed to load Cal embed from ${CAL_SCRIPT_URL}`)),
      { once: true },
    )
    document.head.appendChild(script)
  })
}

function initializeCal() {
  ensureCalStub()

  window.Cal?.("init", CAL_NAMESPACE, { origin: CAL_ORIGIN })
  window.Cal?.ns?.[CAL_NAMESPACE]?.("ui", {
    hideEventTypeDetails: false,
    layout: "month_view",
  })
  window.Cal?.ns?.[CAL_NAMESPACE]?.("preload", { calLink: CAL_LINK })
}

export function CalBookingButton({
  children,
  onClick,
  ...props
}: CalBookingButtonProps) {
  const isInitializedRef = React.useRef(false)

  React.useEffect(() => {
    let isActive = true

    loadCalScript()
      .then(() => {
        if (!isActive) return
        initializeCal()
        isInitializedRef.current = true
      })
      .catch((error) => {
        console.error("Failed to initialize Cal embed", error)
      })

    return () => {
      isActive = false
    }
  }, [])

  const handleClick = React.useCallback<React.MouseEventHandler<HTMLButtonElement>>(
    async (event) => {
      onClick?.(event)

      if (event.defaultPrevented) {
        return
      }

      try {
        if (!isInitializedRef.current) {
          await loadCalScript()
          initializeCal()
          isInitializedRef.current = true
        }

        window.Cal?.ns?.[CAL_NAMESPACE]?.("modal", {
          calLink: CAL_LINK,
          config: CAL_MODAL_CONFIG,
        })
      } catch (error) {
        console.error("Failed to open Cal modal", error)
      }
    },
    [onClick],
  )

  return (
    <Button type="button" {...props} onClick={handleClick}>
      {children}
    </Button>
  )
}
