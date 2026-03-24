"use client"

import * as React from "react"
import { callAll } from "@/utils/functions"
import { createContext } from "@/utils/react-utils"
import { Slot } from "@radix-ui/react-slot"
import { Navigation, FreeMode } from "swiper/modules"
import { Swiper } from "swiper/react"
import { Swiper as SwiperInstance } from "swiper/types"

const [SwiperRootProvider, useSwiperRootContext] = createContext<{
  swiper: SwiperInstance | null
  onSwiperChange: (swiper: SwiperInstance) => void
  isBeginning: boolean
  isEnd: boolean
}>({
  displayName: "SwiperRootContext",
  errorMessage: `useSwiperRootContext returned is 'undefined'. Seems you forgot to wrap the components in "<SwiperRoot />"`,
})

export const SwiperRoot = ({ children, className }: { children?: React.ReactNode; className?: string }) => {
  const [state, setState] = React.useState<SwiperInstance | null>(null)
  const [isBeginning, setIsBeginning] = React.useState(true)
  const [isEnd, setIsEnd] = React.useState(false)
  const onSwiperChange = React.useCallback((swiper: SwiperInstance) => {
    setState(swiper)
    setIsBeginning(swiper.isBeginning)
    setIsEnd(swiper.isEnd)
  }, [])
  return (
    <SwiperRootProvider
      value={{ swiper: state, onSwiperChange, isBeginning, isEnd }}
    >
      <div className={`group/carousel ${className || ""}`}>
        {children}
      </div>
    </SwiperRootProvider>
  )
}

export const SwiperContent = (props: React.ComponentProps<typeof Swiper>) => {
  const { onSwiperChange, ...ctx } = useSwiperRootContext()

  const updateEdgeState = React.useCallback((swiper: SwiperInstance) => {
    // Parent context tracks edge state for fade masks
    onSwiperChange(swiper)
  }, [onSwiperChange])

  return (
    <Swiper
      modules={[Navigation, FreeMode]}
      freeMode={{ enabled: true, momentum: true, momentumRatio: 0.6 }}
      grabCursor
      {...props}
      onSwiper={callAll(props.onSwiper, updateEdgeState)}
      onSlideChange={callAll(props.onSlideChange as any, updateEdgeState)}
      onProgress={callAll(props.onProgress as any, updateEdgeState)}
      onReachBeginning={callAll(props.onReachBeginning as any, updateEdgeState)}
      onReachEnd={callAll(props.onReachEnd as any, updateEdgeState)}
    />
  )
}

/** Wrapper that adds fade masks on left/right edges to hint at more content */
export const SwiperFadeContainer = ({ children }: { children: React.ReactNode }) => {
  const { isBeginning, isEnd } = useSwiperRootContext()
  return (
    <div className="relative">
      {/* Right fade — hidden when scrolled to end */}
      {!isEnd && (
        <div className="absolute right-0 top-0 bottom-0 w-16 z-10 pointer-events-none bg-gradient-to-l from-white to-transparent" />
      )}
      {/* Left fade — hidden when at beginning */}
      {!isBeginning && (
        <div className="absolute left-0 top-0 bottom-0 w-16 z-10 pointer-events-none bg-gradient-to-r from-white to-transparent" />
      )}
      {children}
    </div>
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
