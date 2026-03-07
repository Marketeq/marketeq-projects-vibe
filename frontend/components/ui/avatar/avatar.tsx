"use client"

import * as React from "react"
import { cn } from "@/utils/functions"
import { createContext } from "@/utils/react-utils"
import { User01 } from "@blend-metrics/icons"
import * as AvatarPrimitive from "@radix-ui/react-avatar"
import { VariantProps, cva } from "class-variance-authority"

const avatarVariants = cva(
  "relative flex shrink-0 overflow-hidden rounded-full hover:ring-4 active:ring-4 hover:ring-gray-100 active:ring-primary-50",
  {
    variants: {
      size: {
        xs: "h-6 w-6",
        sm: "h-8 w-8",
        md: "h-10 w-10",
        lg: "h-12 w-12",
        xl: "h-14 w-14",
        "2xl": "h-16 w-16",
      },
    },
    defaultVariants: {
      size: "xs",
    },
  }
)

const badgeVariants = cva(
  "absolute inline-block rounded-full -bottom-[1.5px] -right-[1.5px] border-[1.5px] border-white bg-success-500",
  {
    variants: {
      size: {
        xs: "h-[9px] w-[9px]",
        sm: "h-[11px] w-[11px]",
        md: "h-[13px] w-[13px]",
        lg: "h-[15px] w-[15px]",
        xl: "h-[17px] w-[17px]",
        "2xl": "h-[19px] w-[19px]",
      },
    },
    defaultVariants: {
      size: "xs",
    },
  }
)

const avatarFallbackIconVariants = cva("text-primary-500", {
  variants: {
    size: {
      xs: "h-4 w-4",
      sm: "h-5 w-5",
      md: "h-6 w-6",
      lg: "h-7 w-7",
      xl: "h-8 w-8",
      "2xl": "h-8 w-8",
    },
  },
  defaultVariants: {
    size: "xs",
  },
})

const avatarFallbackVariants = cva(
  "flex h-full w-full items-center justify-center rounded-full bg-primary-25 text-primary-500 font-medium hover:bg-primary-50",
  {
    variants: {
      size: {
        xs: "text-xs leading-[18px]",
        sm: "text-sm",
        md: "text-base",
        lg: "text-lg",
        xl: "text-xl leading-[30px]",
        "2xl": "text-2xl",
      },
    },
  }
)

const [AvatarProvider, useAvatarContext] = createContext<{
  size?: "xs" | "sm" | "md" | "lg" | "xl" | "2xl" | null
}>({
  displayName: "AvatarProvider",
  errorMessage: `useAvatarContext returned is 'undefined'. Seems you forgot to wrap the components in "<Avatar />"`,
})

interface AvatarProps
  extends React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Root>,
    VariantProps<typeof avatarVariants> {
  isOnline?: boolean
  badgeClassName?: string
  containerClassName?: string
}

const Avatar = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Root>,
  AvatarProps
>(
  (
    {
      className,
      size = "xs",
      isOnline,
      badgeClassName,
      containerClassName,
      ...props
    },
    ref
  ) => (
    <AvatarProvider value={{ size }}>
      <div className={cn("relative inline-block", containerClassName)}>
        <AvatarPrimitive.Root
          ref={ref}
          className={cn(avatarVariants({ size, className }))}
          {...props}
        />
        {isOnline && (
          <span
            className={badgeVariants({ size, className: badgeClassName })}
          />
        )}
      </div>
    </AvatarProvider>
  )
)
Avatar.displayName = AvatarPrimitive.Root.displayName

const AvatarImage = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Image>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Image>
>(({ className, ...props }, ref) => (
  <AvatarPrimitive.Image
    ref={ref}
    className={cn("aspect-square h-full w-full object-cover", className)}
    {...props}
  />
))
AvatarImage.displayName = AvatarPrimitive.Image.displayName

const AvatarFallbackIcon = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Fallback>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Fallback> & {
    iconClass?: string
  }
>(({ className, iconClass, ...props }, ref) => {
  const { size } = useAvatarContext()

  return (
    <AvatarPrimitive.Fallback
      ref={ref}
      className={cn(
        "flex h-full w-full items-center justify-center rounded-full bg-primary-25 text-primary-500 hover:bg-primary-50",
        className
      )}
      {...props}
    >
      <User01
        className={cn(
          avatarFallbackIconVariants({ size, className: iconClass })
        )}
      />
    </AvatarPrimitive.Fallback>
  )
})
AvatarFallbackIcon.displayName = "AvatarFallbackIcon"

const AvatarFallback = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Fallback>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Fallback>
>(({ className, ...props }, ref) => {
  const { size } = useAvatarContext()

  return (
    <AvatarPrimitive.Fallback
      ref={ref}
      className={cn(avatarFallbackVariants({ size }))}
      {...props}
    />
  )
})
AvatarFallback.displayName = AvatarPrimitive.Fallback.displayName

export { Avatar, AvatarImage, AvatarFallback, AvatarFallbackIcon }
