"use client"

import * as React from "react"
import { callAll } from "@/utils/functions"
import { createContext } from "@/utils/react-utils"
import { Slot } from "@radix-ui/react-slot"
import { Navigation } from "swiper/modules"
import { Swiper } from "swiper/react"
import { Swiper as SwiperInstance } from "swiper/types"

const [SwiperRootProvider, useSwiperRootContext] = createContext<{
  swiper: SwiperInstance | null
  onSwiperChange: (swiper: SwiperInstance) => void
}>({
  displayName: "SwiperRootContext",
  errorMessage: `useSwiperRootContext returned is 'undefined'. Seems you forgot to wrap the components in "<SwiperRoot />"`,
})

export const SwiperRoot = ({ children }: { children?: React.ReactNode }) => {
  const [state, setState] = React.useState<SwiperInstance | null>(null)
  const onSwiperChange = React.useCallback((swiper: SwiperInstance) => {
    setState(swiper)
  }, [])
  return (
    <SwiperRootProvider
      value={{ swiper: state, onSwiperChange: onSwiperChange }}
    >
      {children}
    </SwiperRootProvider>
  )
}

export const SwiperContent = (props: React.ComponentProps<typeof Swiper>) => {
  const { onSwiperChange } = useSwiperRootContext()

  return (
    <Swiper
      modules={[Navigation]}
      {...props}
      onSwiper={callAll(props.onSwiper, onSwiperChange)}
    />
  )
}

export function SwiperNextTrigger({
  asChild = false,
  ...props
}: React.ComponentPropsWithRef<"button"> & { asChild?: boolean }) {
  const { swiper } = useSwiperRootContext()
  const Comp = asChild ? Slot : "button"

  return (
    <Comp
      data-state={swiper?.allowSlideNext ? "active" : "inactive"}
      {...props}
      onClick={() => swiper?.slideNext()}
    />
  )
}

export function SwiperPrevTrigger({
  asChild = false,
  ...props
}: React.ComponentPropsWithRef<"button"> & { asChild?: boolean }) {
  const { swiper } = useSwiperRootContext()
  const Comp = asChild ? Slot : "button"

  return (
    <Comp
      data-state={swiper?.allowSlidePrev ? "active" : "inactive"}
      {...props}
      onClick={() => swiper?.slidePrev()}
    />
  )
}
