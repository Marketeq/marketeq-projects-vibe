"use client"

import React, { useMemo } from "react"
import { cn } from "@/utils/functions"
import { useControllableState } from "@/utils/hooks"
import { createStrictContext } from "@/utils/react-utils"
import { Star } from "@blend-metrics/icons"
import { Toggle } from "@/components/ui"

const [FavoriteProvider, useFavoriteContext] = createStrictContext<{
  value: boolean
  onValueChange: (value: boolean) => void
}>({
  displayName: "FavoriteContext",
  errorMessage: `useFavoriteContext returned is 'undefined'. Seems you forgot to wrap the component in '<FavoriteProvider />'`,
})

const FavoriteRoot = ({
  children,
  ...props
}: {
  value?: boolean
  onValueChange?: (value: boolean) => void
  children?: (options: { pressed: boolean }) => React.ReactNode
}) => {
  const [pressed, setPressed] = useControllableState({
    value: props.value,
    onChange: props.onValueChange,
    defaultValue: false,
  })
  const value = useMemo(
    () => ({ value: pressed, onValueChange: setPressed }),
    [pressed, setPressed]
  )

  return (
    <FavoriteProvider value={value}>{children?.({ pressed })}</FavoriteProvider>
  )
}

const Favorite = React.forwardRef<
  React.ElementRef<typeof Toggle>,
  React.ComponentPropsWithoutRef<typeof Toggle> & { starClassName?: string }
>(({ className, starClassName, ...props }, ref) => {
  const ctx = useFavoriteContext()
  return (
    <Toggle
      pressed={ctx?.value}
      onPressedChange={ctx?.onValueChange}
      ref={ref}
      className={cn(
        "group text-gray-300 transition duration-300 flex-none hover:text-gray-500 hover:fill-gray-100 h-6 w-6 inline-flex items-center justify-center fill-white focus-visible:outline-none data-[state=on]:text-primary-500 data-[state=on]:hover:text-primary-500 data-[state=on]:fill-primary-500 data-[state=on]:hover:fill-primary-500",
        className
      )}
      {...props}
    >
      <Star className={cn("h-6 w-6 fill-inherit", starClassName)} />
    </Toggle>
  )
})

Favorite.displayName = "Favorite"

export { Favorite, FavoriteRoot }
