import { Dispatch, SetStateAction, useMemo, useRef } from "react"
import { useControllableState, useFirstMountState } from "@/utils/hooks"
import { createContext, getValidChildren } from "@/utils/react-utils"
import useMeasure from "react-use-measure"

interface ShowMoreLessRootContextState {
  isShowing: boolean
  setIsShowing: Dispatch<SetStateAction<boolean>>
  height: number
  ref: (element: HTMLElement | SVGElement | null) => void
  scrollHeight: number
}

export const [ShowMoreLessRootProvider, useShowMoreLessRootContext] =
  createContext<ShowMoreLessRootContextState>({
    displayName: "ShowMoreLessContext",
    errorMessage:
      "useShowMoreLessRootContext return undefined. Seems you forgot to wrap your component in `<ShowMoreLessRoot />`",
  })

export const ShowMoreLessRoot = ({
  children,
  ...props
}: {
  value?: boolean
  onValueChange?: (value: boolean) => void
  children?:
    | ((options: ShowMoreLessRootContextState) => React.ReactNode)
    | React.ReactNode
}) => {
  const [ref, { height }] = useMeasure()
  const [state, setState] = useControllableState({
    value: props.value,
    onChange: props.onValueChange,
    defaultValue: false,
  })
  const scrollHeightRef = useRef(0)
  const isFirst = useFirstMountState({
    shouldUpdate: () => state,
  })

  if (isFirst) {
    scrollHeightRef.current = height
  }

  const value = useMemo(
    () => ({
      isShowing: state,
      setIsShowing: setState,
      height,
      ref,
      scrollHeight: scrollHeightRef.current,
    }),
    [state, setState, height, ref, scrollHeightRef]
  )

  return (
    <ShowMoreLessRootProvider value={value}>
      {typeof children === "function" ? children?.(value) : children}
    </ShowMoreLessRootProvider>
  )
}

export const ShowMoreLess = ({
  children,
  max = 3,
  trigger,
}: {
  children?: React.ReactNode
  max?: number
  trigger?: (extraChildrenCount?: number) => React.ReactNode
}) => {
  const validChildren = getValidChildren(children)
  const extra = validChildren.length > max
  const { isShowing } = useShowMoreLessRootContext()

  return (
    <>
      {extra
        ? isShowing
          ? validChildren
          : validChildren.slice(0, max)
        : validChildren}
      {!isShowing && extra ? trigger?.(validChildren.length - max) : null}
    </>
  )
}

export const ShowMoreLessComp = ({
  children,
  max = 3,
}: {
  children?: React.ReactNode
  max?: number
}) => {
  const validChildren = getValidChildren(children)
  const extra = validChildren.length > max
  const { isShowing } = useShowMoreLessRootContext()
  const isFirst = useFirstMountState({
    shouldUpdate: () => isShowing,
  })

  return (
    <>
      {extra
        ? isFirst
          ? validChildren.slice(0, max)
          : validChildren
        : validChildren}
    </>
  )
}
