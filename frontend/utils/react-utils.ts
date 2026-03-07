"use client"

import * as React from "react"
import { addBasePath } from "next/dist/client/add-base-path"

export const createContext = <TValue>({
  displayName,
  value,
  errorMessage,
}: {
  value?: TValue
  displayName?: string
  errorMessage?: string
} = {}) => {
  const Context = React.createContext(value)
  Context.displayName = displayName

  const useContext = () => {
    const context = React.useContext(Context)
    if (context === undefined) {
      throw new Error(errorMessage)
    }
    return context
  }

  return [Context.Provider, useContext, Context.Consumer] as const
}

export const createStrictContext = <TValue>({
  value,
  displayName,
  errorMessage,
  strict = false,
}: {
  value?: TValue
  displayName?: string
  errorMessage?: string
  strict?: boolean
}) => {
  const Context = React.createContext(value)
  Context.displayName = displayName

  const useContext = () => {
    const context = React.useContext(Context)
    if (context === undefined && strict) {
      throw new Error(errorMessage)
    }
    return context
  }

  return [Context.Provider, useContext] as const
}

export function getValidChildren(children: React.ReactNode) {
  return React.Children.toArray(children).filter((child) =>
    React.isValidElement(child)
  ) as React.ReactElement[]
}

export function mergeRefs<T = any>(
  refs: Array<React.MutableRefObject<T> | React.LegacyRef<T> | undefined | null>
): React.RefCallback<T> {
  return (value) => {
    refs.forEach((ref) => {
      if (typeof ref === "function") {
        ref(value)
      } else if (ref != null) {
        ;(ref as React.MutableRefObject<T | null>).current = value
      }
    })
  }
}

function getURL(href: string): URL {
  return new URL(addBasePath(href), location.href)
}

function isModifiedEvent(event: React.MouseEvent): boolean {
  const eventTarget = event.currentTarget as HTMLAnchorElement | SVGAElement
  const target = eventTarget.getAttribute("target")
  return (
    (target && target !== "_self") ||
    event.metaKey ||
    event.ctrlKey ||
    event.shiftKey ||
    event.altKey || // triggers resource download
    (event.nativeEvent && event.nativeEvent.button === 1)
  )
}

export function shouldTriggerStartEvent(
  href: string,
  clickEvent?: React.MouseEvent
) {
  const current = window.location
  const target = getURL(href)

  if (clickEvent && isModifiedEvent(clickEvent)) return false // modified events: fallback to browser behaviour
  if (current.origin !== target.origin) return false // external URL
  if (current.pathname === target.pathname && current.search === target.search)
    return false // same URL

  return true
}
