"use client"

import * as React from "react"
import { cn } from "@/utils/functions"
import { useControllableState } from "@/utils/hooks"
import { createContext } from "@/utils/react-utils"
import * as TabsPrimitive from "@radix-ui/react-tabs"
import { VariantProps, cva } from "class-variance-authority"
import { AnimatePresence, Transition, motion } from "framer-motion"

export const contentVariants = {
  enter: {
    opacity: 0,
    y: "5%",
  },
  ideal: {
    opacity: 1,
    y: "0%",
  },
}

export const contentTransition: Transition = {
  duration: 0.3,
  ease: "linear",
  type: "tween",
}

const [TabsProvider, useTabsContext] = createContext<{
  value: string
  onValueChange: (value: string) => void
  id: string
  unanimated: boolean
}>({
  displayName: "TabsContext",
  errorMessage:
    "useTabsContext returns `undefined`. Seems you forgot to wrap your component tree with <Tabs />",
})

const Tabs = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Root> & {
    unanimated?: boolean
  }
>(
  (
    {
      value: valueProp,
      onValueChange: onValueChangeProp,
      defaultValue,
      unanimated = false,

      ...props
    },
    ref
  ) => {
    const [value, onValueChange] = useControllableState({
      value: valueProp,
      onChange: onValueChangeProp,
      defaultValue,
    })
    const id = React.useId()
    const ctxValue = React.useMemo(
      () => ({ value, onValueChange, id, unanimated }),
      [value, onValueChange, id, unanimated]
    )

    return (
      <TabsProvider value={ctxValue}>
        <TabsPrimitive.Root ref={ref} {...props} />
      </TabsProvider>
    )
  }
)

Tabs.displayName = "Tabs"

export const tabsListVariants = cva(
  "inline-flex items-end overflow-x-auto scrollbar-none justify-center gap-4 border-b border-b-gray-200 px-5 pt-3"
)

const TabsList = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.List
    ref={ref}
    className={cn(
      tabsListVariants({
        className,
      })
    )}
    {...props}
  />
))
TabsList.displayName = TabsPrimitive.List.displayName

const tabsTriggerVariants = cva("group relative", {
  variants: {
    variant: {
      default:
        "inline-flex items-center justify-center gap-2 whitespace-nowrap px-1 pb-2 pt-px text-sm font-semibold text-gray-500 transition-colors  data-[state=active]:text-primary-500 focus-visible:outline-none disabled:opacity-50 disabled:data-[state=active]:text-gray-500",
      unstyled: "",
    },
  },
  defaultVariants: {
    variant: "default",
  },
})

const DisclosureTrigger = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>
>(({ className, value, onClick, ...props }, ref) => {
  const ctx = useTabsContext()
  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    onClick?.(event)
    ctx.onValueChange(value)
  }
  const active = ctx.value === value

  return (
    <TabsPrimitive.TabsTrigger
      data-state={active ? "active" : "inactive"}
      value={value}
      onClick={handleClick}
      className={className}
      ref={ref}
      {...props}
    />
  )
})
DisclosureTrigger.displayName = TabsPrimitive.Trigger.displayName

const TabsTrigger = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger> &
    VariantProps<typeof tabsTriggerVariants> & {
      underlineClassName?: string
      containerClassName?: string
      showUnderline?: boolean
    }
>(
  (
    {
      className,
      value,
      onClick,
      children,
      underlineClassName,
      containerClassName,
      variant,
      showUnderline = true,
      ...props
    },
    ref
  ) => {
    const ctx = useTabsContext()
    const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
      onClick?.(event)
      ctx.onValueChange(value)
    }
    const active = ctx.value === value

    return (
      <div className={cn("relative flex", containerClassName)}>
        <TabsPrimitive.Trigger
          value={value}
          data-state={active ? "active" : "inactive"}
          ref={ref}
          className={cn(
            tabsTriggerVariants({
              className,
              variant,
            })
          )}
          onClick={handleClick}
          {...props}
        >
          {children}
        </TabsPrimitive.Trigger>

        {showUnderline && active ? (
          <motion.span
            className={cn(
              "inline-block absolute bottom-0 inset-x-0 bg-primary-500 h-0.5",

              underlineClassName
            )}
            layoutId={ctx.id}
          />
        ) : null}
      </div>
    )
  }
)
TabsTrigger.displayName = TabsPrimitive.Trigger.displayName

const TabsContent = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(
  (
    { className, value, forceMount = true, asChild = true, children, ...props },
    ref
  ) => {
    const ctx = useTabsContext()
    const [mounted, setMounted] = React.useState(false)

    React.useEffect(() => {
      setMounted(true)
    }, [])

    return (
      <AnimatePresence>
        {ctx.value === value && (
          <TabsPrimitive.Content
            asChild={asChild}
            forceMount={forceMount}
            value={value}
            ref={ref}
            className={cn("focus-visible:outline-none", className)}
            {...props}
          >
            <motion.div
              initial={
                ctx.unanimated ? false : mounted ? "enter" : false
              }
              animate={ctx.unanimated ? false : "ideal"}
              variants={contentVariants}
              transition={contentTransition}
            >
              {children}
            </motion.div>
          </TabsPrimitive.Content>
        )}
      </AnimatePresence>
    )
  }
)
TabsContent.displayName = TabsPrimitive.Content.displayName

export { Tabs, TabsList, TabsTrigger, TabsContent, DisclosureTrigger }
