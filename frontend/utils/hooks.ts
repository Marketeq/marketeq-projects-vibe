"use client"

import * as React from "react"
import { useRef } from "react"
import { NavigateOptions } from "next/dist/shared/lib/app-router-context.shared-runtime"
import { usePathname, useSearchParams } from "next/navigation"
import { useRouter as useRouterNavigation } from "next/navigation"
import { Time, parseTime } from "@internationalized/date"
import { Steps, useStepper as useHeadlessStepper } from "headless-stepper"
import nProgress from "nprogress"
import { useMedia, useMount } from "react-use"
import { addEvent, getSize, isElement } from "./dom-utils"
import { debounce, getId } from "./functions"

export function useDebounce<TValue>(value: TValue, wait?: number) {
  const [state, setState] = React.useState(value)

  React.useEffect(() => {
    const { cancel } = debounce(() => setState(value), wait)

    return () => cancel()
  }, [value, wait])

  return state
}

export function useCallbackRef<T extends (...args: any[]) => any>(
  callback: T | undefined,
  deps: React.DependencyList = []
) {
  const callbackRef = React.useRef(callback)

  React.useEffect(() => {
    callbackRef.current = callback
  })

  // eslint-disable-next-line react-hooks/exhaustive-deps
  return React.useCallback(
    ((...args) => callbackRef.current?.(...args)) as T,
    deps
  )
}

export function useControllableProp<T>(prop: T | undefined, state: T) {
  const controlled = typeof prop !== "undefined"
  const value = controlled ? prop : state
  return React.useMemo<[boolean, T]>(
    () => [controlled, value],
    [controlled, value]
  )
}

export interface UseControllableStateProps<T> {
  value?: T
  defaultValue?: T | (() => T)
  onChange?: (value: T) => void
  shouldUpdate?: (prev: T, next: T) => boolean
}

export function useControllableState<T>(props: UseControllableStateProps<T>) {
  const {
    value: valueProp,
    defaultValue,
    onChange,
    shouldUpdate = (prev, next) => prev !== next,
  } = props

  const onChangeProp = useCallbackRef(onChange)
  const shouldUpdateProp = useCallbackRef(shouldUpdate)

  const [uncontrolledState, setUncontrolledState] = React.useState(
    defaultValue as T
  )
  const controlled = valueProp !== undefined
  const value = controlled ? valueProp : uncontrolledState

  const setValue = useCallbackRef(
    (next: React.SetStateAction<T>) => {
      const setter = next as (prevState?: T) => T
      const nextValue = typeof next === "function" ? setter(value) : next

      if (!shouldUpdateProp(value, nextValue)) {
        return
      }

      if (!controlled) {
        setUncontrolledState(nextValue)
      }

      onChangeProp(nextValue)
    },
    [controlled, onChangeProp, value, shouldUpdateProp]
  )

  return [value, setValue] as [T, React.Dispatch<React.SetStateAction<T>>]
}

export const usePrevious = <T>(state: T) => {
  const previous = React.useRef(state)

  React.useEffect(() => {
    previous.current = state
  })

  return previous
}

export const useWindowScroll = () => {
  const [dimensions, setDimensions] = React.useState({ x: 0, y: 0 })

  useIsomorphicLayoutEffect(() => {
    const handleScroll = () => {
      setDimensions({
        x: window.scrollX,
        y: window.scrollY,
      })
    }
    handleScroll()

    window.addEventListener("scroll", handleScroll)

    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  return dimensions
}

export const useShrinkThanMdLg = (query = "(max-width:1144px)") => {
  return useMedia(query, false)
}

export const useShrinkThanLg = (query = "(max-width:1440px)") => {
  return useMedia(query, false)
}

export const useWiderThanMd = (query = "(min-width:768px)") => {
  return useMedia(query, false)
}

export const useShrinkThanMd = (query = "(max-width:768px)") => {
  return useMedia(query, false)
}

export const useWiderThanMdLg = (query = "(min-width:1144px)") => {
  return useMedia(query, false)
}

export const usePreviousValue = <T>(value: T) => {
  const prevValueRef = React.useRef<{ previous: T; current: T }>({
    current: value,
    previous: value,
  })

  React.useEffect(() => {
    if (value !== prevValueRef.current.current) {
      prevValueRef.current.previous = prevValueRef.current.current
      prevValueRef.current.current = value
    }
  }, [prevValueRef, value])

  return prevValueRef
}

export const useScrollDirection = () => {
  const [direction, setDirection] = React.useState<"top" | "bottom">("bottom")
  const coordinates = React.useRef<{ previous?: number; current?: number }>({})

  React.useEffect(() => {
    coordinates.current.current = window.scrollY
    coordinates.current.previous = window.scrollY

    const handleScroll = () => {
      if (coordinates.current.current !== window.scrollY) {
        coordinates.current.previous = coordinates.current.current
        coordinates.current.current = window.scrollY
      }

      if (
        coordinates.current.current !== undefined &&
        coordinates.current.previous !== undefined
      ) {
        const hasScrolledToBottom =
          coordinates.current.current > coordinates.current.previous
        const hasScrolledToTop =
          coordinates.current.current < coordinates.current.previous

        if (hasScrolledToBottom) setDirection("bottom")
        if (hasScrolledToTop) setDirection("top")
      }
    }

    window.addEventListener("scroll", handleScroll)

    return () => {
      window.removeEventListener("scroll", handleScroll)
    }
  }, [setDirection])

  return direction
}

interface Position {
  top: number
  left: number
  bottom: number
  right: number
}

export const usePosition = <T extends HTMLElement>() => {
  const [position, setPosition] = React.useState<Position>({
    bottom: 0,
    left: 0,
    right: 0,
    top: 0,
  })
  const ref = React.useRef<T>(null)

  useIsomorphicLayoutEffect(() => {
    const element = ref.current
    if (!element) return

    const onReposition = () => {
      const { bottom, left, right, top } = element.getBoundingClientRect()

      setPosition({
        left,
        right,
        top: top + window.scrollY || document.documentElement.scrollTop,
        bottom: bottom + window.scrollY || document.documentElement.scrollTop,
      })
    }

    onReposition()

    window.addEventListener("scroll", onReposition)
    window.addEventListener("resize", onReposition)

    return () => {
      window.removeEventListener("scroll", onReposition)
      window.removeEventListener("resize", onReposition)
    }
  }, [setPosition, ref])

  return [ref, position] as const
}

export function useUncontrolledState<T>({
  defaultValue,
  onChange: onChangeProp,
}: {
  defaultValue: T
  onChange?: (value: T) => void
}) {
  const uncontrolledState = React.useState<T>(defaultValue)
  const onChange = useCallbackRef(onChangeProp)
  const [uncontrolledValue] = uncontrolledState
  const prevValue = useRef(uncontrolledValue)

  React.useEffect(() => {
    if (prevValue.current !== uncontrolledValue) {
      prevValue.current = uncontrolledValue
      onChange(uncontrolledValue)
    }
  }, [uncontrolledValue, onChange, prevValue])

  return uncontrolledState
}

export const useRouterChangeComplete = ({
  onComplete: onCompleteOption,
}: {
  onComplete?: () => void
}) => {
  const onComplete = useCallbackRef(onCompleteOption)
  const pathname = usePathname()
  const searchParams = useSearchParams()

  React.useEffect(() => {
    onComplete()
  }, [onComplete, pathname, searchParams])
}

export function useFirstMountState({
  shouldUpdate,
}: {
  shouldUpdate?: (value: boolean) => boolean
}): boolean {
  const isFirst = useRef(true)

  if (isFirst.current && shouldUpdate?.(isFirst.current)) {
    isFirst.current = false
  }

  return isFirst.current
}

type Machine<S> = { [k: string]: { [k: string]: S } }
type MachineState<T> = keyof T
type MachineEvent<T> = keyof UnionToIntersection<T[keyof T]>

type UnionToIntersection<T> = (T extends any ? (x: T) => any : never) extends (
  x: infer R
) => any
  ? R
  : never

export function useStateMachine<M>(
  initialState: MachineState<M>,
  machine: M & Machine<MachineState<M>>
) {
  return React.useReducer(
    (state: MachineState<M>, event: MachineEvent<M>): MachineState<M> => {
      const nextState = (machine[state] as any)[event]
      return nextState ?? state
    },
    initialState
  )
}

export function useClickOutside<T extends HTMLElement>(
  refs: React.RefObject<T | null>[],
  onClickOutside?: () => void
) {
  const onClickOutsideOption = useCallbackRef(onClickOutside)

  React.useEffect(
    () => {
      const handler = (event: MouseEvent | TouchEvent) => {
        const { target } = event
        target &&
          !refs.some((ref) => ref.current?.contains(target as Node)) &&
          onClickOutsideOption()
      }
      document.addEventListener("mousedown", handler)
      document.addEventListener("touchstart", handler)

      return () => {
        document.removeEventListener("mousedown", handler)
        document.removeEventListener("touchstart", handler)
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [...refs, onClickOutsideOption]
  )
}

export function useLocalStorage<T>({
  defaultValue,
  keyName,
  onChange,
  deserializer,
  serializer,
}: {
  keyName: string
  defaultValue?: T
  onChange?: (value?: T) => void
  serializer?: (value?: T) => string
  deserializer?: (value: string) => T | undefined
}) {
  const [uncontrollableState, setUncontrollableState] = useUncontrolledState({
    defaultValue,
    onChange: (value) => {
      onChange?.(value)

      try {
        const serializedValue = serializer
          ? serializer(value)
          : JSON.stringify(value)
        localStorage.setItem(keyName, serializedValue)
      } catch {}
    },
  })

  useMount(() => {
    try {
      const value = localStorage.getItem(keyName)
      if (value !== null) {
        const deserializerValue = deserializer
          ? deserializer(value)
          : (JSON.parse(value) as T | undefined)
        setUncontrollableState(deserializerValue)
      }
    } catch {}
  })

  return [uncontrollableState, setUncontrollableState] as const
}

type View = "list" | "grid"

type UseViewOptions = {
  defaultView?: View
}

export type UseViewAction = "GRID_VIEW" | "LIST_VIEW"

export const useView = (options: UseViewOptions = {}) => {
  const { defaultView = "grid" } = options
  const [state, send] = useStateMachine(defaultView, {
    grid: {
      LIST_VIEW: "list",
    },
    list: {
      GRID_VIEW: "grid",
    },
  })

  return [state, send] as const
}

export const useNumberOfForms = (values?: (number | string)[]) => {
  const id = React.useId()
  const [numberOfForms, setNumberOfForms] = React.useState(values ?? [id])

  const insert = React.useCallback(
    (index: number) => {
      setNumberOfForms((prev) => {
        const newNumberOfForms = [...prev]
        newNumberOfForms.splice(index, 0, getId())

        return newNumberOfForms
      })
    },
    [setNumberOfForms]
  )

  const remove = React.useCallback(
    (id: number | string) => {
      setNumberOfForms((prev) => {
        return prev.filter((value) => value !== id)
      })
    },
    [setNumberOfForms]
  )

  return { numberOfForms, insert, remove }
}

const startProgress = (value = 0) => {
  nProgress.configure({ showSpinner: false })
  nProgress.start()
  nProgress.set(value)
}

export const useRouter = () => {
  const { push, replace, ...methods } = useRouterNavigation()

  return {
    ...methods,
    push: React.useCallback(
      (href: string, options?: NavigateOptions) => {
        startProgress()
        push(href, options)
      },
      [push]
    ),
    replace: React.useCallback(
      (href: string, options?: NavigateOptions) => {
        startProgress()
        replace(href, options)
      },
      [replace]
    ),
  }
}

export function useHeadingObserver(slugs: string[]) {
  const observer = useRef<IntersectionObserver>()
  const [activeHeading, setActiveHeading] = React.useState<string>()
  const [visibleHeadings, setVisibleHeadings] = React.useState<string[]>([])

  const selectors = slugs.join(", ")

  React.useEffect(() => {
    const handleObserver = (entries: IntersectionObserverEntry[]) => {
      entries.forEach((entry) => {
        if (entry?.isIntersecting) {
          // Add entry.target.id to the state array
          setVisibleHeadings((prevState) => [...prevState, entry.target.id])
        } else {
          // Remove entry.target.id from the state array
          setVisibleHeadings((prevState) =>
            prevState.filter((id) => id !== entry.target.id)
          )
        }
      })
    }

    if (!selectors) return

    const elements = document.querySelectorAll(selectors)

    observer.current = new IntersectionObserver(handleObserver, {
      rootMargin: "-100px 0px -25% 0px",
      threshold: 1,
    })

    elements.forEach((element) => {
      observer.current?.observe(element)
    })

    return () => {
      observer.current?.disconnect()
    }
  }, [selectors])

  /**
   * Rearrange visible headings based on incoming slugs' order,
   * and return the first one as the activeHeading.
   */
  React.useEffect(() => {
    const sortedVisibleHeadings = visibleHeadings.sort((a, b) => {
      const aIndex = slugs.findIndex((slug) => slug === `#${a}`)
      const bIndex = slugs.findIndex((slug) => slug === `#${b}`)

      if (aIndex === -1) {
        return bIndex === -1 ? 0 : 1 // Keep b if a not found
      } else if (bIndex === -1) {
        return -1 // Move a before b if b not found
      }

      return aIndex - bIndex // Sort based on index difference
    })

    if (sortedVisibleHeadings[0]) {
      // Set the first ordered visible heading as the active one
      setActiveHeading(sortedVisibleHeadings[0])
    }
  }, [slugs, visibleHeadings])

  return { activeHeading }
}

export const useBoolean = (defaultValue = false) => {
  const [isOn, setIsOn] = React.useState(defaultValue)
  const off = React.useCallback(() => setIsOn(false), [])
  const on = React.useCallback(() => setIsOn(true), [])
  const toggle = React.useCallback(
    (on?: boolean) => setIsOn((prev) => (on !== undefined ? on : !prev)),
    []
  )

  return [isOn, { off, on, toggle }] as const
}

export const useToggle = (defaultValue = false) => {
  const [state, setState] = React.useState(defaultValue)

  const off = React.useCallback(() => setState(false), [])
  const on = React.useCallback(() => setState(true), [])
  const toggle = React.useCallback(
    () => setState((prevState) => !prevState),
    []
  )

  return [state, { on, off, toggle }] as const
}

export const useIsomorphicLayoutEffect =
  typeof window === "undefined" ? React.useEffect : React.useLayoutEffect

export function useUpdateEffect(
  callback: React.EffectCallback,
  deps: React.DependencyList
) {
  const renderCycleRef = React.useRef(false)
  const effectCycleRef = React.useRef(false)

  React.useEffect(() => {
    const mounted = renderCycleRef.current
    const run = mounted && effectCycleRef.current
    if (run) {
      return callback()
    }
    effectCycleRef.current = true
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)

  React.useEffect(() => {
    renderCycleRef.current = true
    return () => {
      renderCycleRef.current = false
    }
  }, [])
}

export function useAddEvent<
  TTarget extends EventTarget,
  TListener extends (...args: any[]) => any,
  TEvent extends string = string,
>({
  event,
  listener,
  target,
  options,
}: {
  target: TTarget
  event: TEvent
  listener?: TListener
  options?: boolean | AddEventListenerOptions
}) {
  const listenerCallbackRef = useCallbackRef(listener)
  const optionsRef = React.useRef(options)

  React.useEffect(() => {
    optionsRef.current = options
  })

  React.useEffect(() => {
    const cleanup = addEvent({
      target,
      event,
      listener: listenerCallbackRef,
      options: optionsRef.current,
    })

    return () => cleanup()
  }, [target, event, optionsRef, listenerCallbackRef])
}

export function useDocument<TEvent extends keyof DocumentEventMap>(
  event: TEvent,
  listener?: (event: DocumentEventMap[TEvent]) => void
) {
  useAddEvent({
    target: document,
    event,
    listener,
  })
}

export function useWindow<TEvent extends keyof WindowEventMap>(
  event: TEvent,
  listener?: (event: WindowEventMap[TEvent]) => void
) {
  useAddEvent({
    target: window,
    event,
    listener,
  })
}

export function useKeyboard({
  onKeyDown,
  onKeyUp,
}: {
  onKeyDown?: (event: KeyboardEvent) => void
  onKeyUp?: (event: KeyboardEvent) => void
} = {}) {
  useDocument("keydown", onKeyDown)
  useDocument("keyup", onKeyUp)
}

export function useUnmountEffect(cleanup: () => void) {
  const cleanupCallbackRef = useCallbackRef(cleanup)

  React.useEffect(() => cleanupCallbackRef, [cleanupCallbackRef])
}

export const useArray = <T>(defaultState?: T[]) => {
  const [state, setState] = React.useState(defaultState)

  const remove = React.useCallback(
    (index: number) => setState((prev) => prev?.filter((_, i) => i !== index)),
    []
  )

  const prepend = React.useCallback(
    (value: T) => setState((prev) => (prev ? [...prev, value] : [value])),
    []
  )

  const append = React.useCallback(
    (value: T) => setState((prev) => (prev ? [value, ...prev] : [value])),
    []
  )

  const clear = React.useCallback(() => setState(undefined), [])

  return [state, { remove, prepend, append, patch: setState, clear }] as const
}

export const useSize = <T extends Element>() => {
  const ref = React.useRef<T>(null)
  const [size, setSize] = React.useState({ width: 0, height: 0 })

  useIsomorphicLayoutEffect(() => {
    const element = ref.current

    if (!element) return

    const size = getSize(element)
    setSize(size)

    const observer = new MutationObserver((mutations) =>
      mutations.forEach((mutation) => {
        const element = mutation.target

        if (!isElement(element)) return

        const size = getSize(element)
        setSize(size)
      })
    )

    observer.observe(element, { attributes: true })

    return () => observer.disconnect()
  }, [])

  return [ref, size] as const
}

export const useStepper = ({
  steps,
  currentStep,
  orientation,
}: {
  steps: Steps[]
  currentStep?: number
  orientation?: "horizontal" | "vertical"
}) => {
  const [stepsState, setStepsState] = React.useState(steps)
  const {
    stepperProps: stepTriggerControlProps,
    stepsProps: stepTriggersProps,
    ...rest
  } = useHeadlessStepper({
    steps: stepsState,
    currentStep,
    orientation,
  })

  const toggleStepValidation = React.useCallback(
    (index: number) => (isValid: boolean) => {
      setStepsState((steps) => {
        const nextStep = index + 1
        const isNotValid = !isValid

        return steps.map((step, stepIndex) => {
          if (stepIndex === index) {
            return { ...step, isValid }
          } else if (stepIndex === nextStep && isValid) {
            return { ...step, disabled: false }
          } else if (stepIndex > index && isNotValid) {
            return { ...step, disabled: true }
          }

          return step
        })
      })
    },
    [setStepsState]
  )

  return {
    ...rest,
    stepTriggerControlProps,
    stepTriggersProps,
    toggleStepValidation,
    stepsState,
  }
}

export const useTimeSelector = ({
  defaultValue,
  onValueChange,
}: {
  defaultValue?: string
  onValueChange?: (time: Time) => void
} = {}) => {
  const uncontrolledState = useUncontrolledState({
    defaultValue,
    onChange: (value) => {
      if (value) onValueChange?.(parseTime(value))
    },
  })

  return uncontrolledState
}

export const useDeferredValue = <TValue>(value: TValue, delay = 1_000) => {
  const [state, setState] = React.useState(value)
  React.useEffect(() => {
    const timeout = setTimeout(() => {
      setState(value)
    }, delay)

    return () => {
      clearTimeout(timeout)
    }
  }, [delay, value])

  return state
}

export const useMakeFixedBehaveSticky = <
  T extends HTMLElement | SVGElement = HTMLElement | SVGAElement,
>(
  top = 0
) => {
  const ref = React.useRef<T>(null)
  const [isSticky, setIsSticky] = React.useState(false)

  React.useEffect(() => {
    const element = ref.current
    if (element) {
      const handleScroll = () => {
        const scrollPosition =
          window.scrollY || document.documentElement.scrollTop
        const rect = element.getBoundingClientRect()
        const originalTop = rect.top + window.scrollY

        if (scrollPosition > originalTop - top) setIsSticky(true)
        else setIsSticky(false)
      }

      window.addEventListener("scroll", handleScroll)

      return () => {
        window.removeEventListener("scroll", handleScroll)
      }
    }
  }, [top])

  return [ref, isSticky] as const
}
