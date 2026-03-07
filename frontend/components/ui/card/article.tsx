"use client"

import { cn } from "@/utils/functions"
import { createContext } from "@/utils/react-utils"
import { Slot } from "@radix-ui/react-slot"
import { VariantProps, cva } from "class-variance-authority"

const articleVariants = cva(
  "rounded-lg border border-gray-200 flex bg-white items-center gap-x-3",
  {
    variants: {
      variant: {
        default: "p-3 pr-[18px]",
        outlined:
          "hover:ring-1 h-[68px] hover:border-gray-300 cursor-grab p-3 shadow-[0px_1px_4px_0px_rgba(0,0,0,0.03)] hover:ring-gray-300",
        destructive:
          "hover:ring-1 hover:border-gray-300 p-3 hover:ring-gray-300 active:ring-1 active:border-primary-500 active:ring-primary-500",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

interface ArticleProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof articleVariants> {
  isDragging?: boolean
  isError?: boolean
  isSelected?: boolean
  asChild?: boolean
  isGrabbed?: boolean
  isOnCanvas?: boolean
  destructive?: boolean
}

const [ArticleProvider, useArticleContext] = createContext<{
  variant?: "default" | "outlined" | "destructive" | null
}>({
  displayName: "ArticleContext",
})

const Article = ({
  className,
  isDragging,
  variant,
  isError,
  isSelected,
  isGrabbed,
  isOnCanvas,
  asChild,
  destructive,
  ...props
}: ArticleProps) => {
  const Comp = asChild ? Slot : "div"
  return (
    <ArticleProvider value={{ variant }}>
      <Comp
        className={cn(
          articleVariants({ variant }),
          {
            "border-gray-300 ring-1 ring-gray-300 min-w-[200px] max-w-[300px] shadow-[7px_14px_23px_5px_rgba(0,0,0,0.08)]":
              isDragging,
            "border-red-500 ring-1 ring-red-500 active:border-red-500 active:ring-red-500 hover:border-red-500 hover:ring-red-500":
              isError,
            "ring-1 border-primary-200 hover:border-primary-200 hover:ring-primary-200 min-w-[200px] max-w-[300px] ring-primary-200 shadow-[7px_14px_23px_5px_rgba(0,0,0,0.08)]":
              isGrabbed,
            "border-primary-500 ring-1 ring-primary-500 hover:border-primary-500 hover:ring-primary-500 min-w-[200px] max-w-[300px] shadow-[0px_1px_4px_0px_rgba(48,108,254,0.13)]":
              isSelected,
            "min-w-[200px] max-w-[300px]": isOnCanvas,
            "border-error-500 hover:border-error-500 min-w-[200px] max-w-[300px] shadow-[0px_1px_4px_0px_rgba(48,108,254,0.13)]":
              destructive,
          },
          className
        )}
        {...props}
      />
    </ArticleProvider>
  )
}

const ArticleIconVariants = cva(
  "border-[1.5px] border-gray-200 flex items-center flex-none justify-center bg-white rounded-lg h-11 w-11",
  {
    variants: {
      rounded: {
        sm: "rounded-lg",
        md: "rounded-[9px]",
      },
      visual: {
        default: "text-primary-500",
        flushed: "",
      },
      variant: {
        destructive: "border border-error-200 text-error-500",
      },
    },
    defaultVariants: {
      rounded: "sm",
      visual: "default",
    },
  }
)

interface ArticleIconProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof ArticleIconVariants> {}

const ArticleIcon = ({
  className,
  rounded,
  visual,
  variant,
  ...props
}: ArticleIconProps) => {
  return (
    <div
      className={cn(
        ArticleIconVariants({ className, rounded, visual, variant }),
        className
      )}
      {...props}
    />
  )
}

const ArticleTitleVariants = cva("font-medium text-gray-900", {
  variants: {
    size: {
      sm: "text-[13px] leading-4",
      md: "text-sm leading-6",
    },
  },
  defaultVariants: {
    size: "md",
  },
})

interface ArticleTitleProps
  extends React.HTMLAttributes<HTMLHeadingElement>,
    VariantProps<typeof ArticleTitleVariants> {}

const ArticleTitle = ({ className, size, ...props }: ArticleTitleProps) => {
  const { variant } = useArticleContext()
  return (
    <h1
      className={cn(
        ArticleTitleVariants({ size }),
        {
          truncate: variant === "outlined",
        },
        className
      )}
      {...props}
    />
  )
}

interface ArticleDescription
  extends React.HTMLAttributes<HTMLParagraphElement> {}

const ArticleDescription = ({ className, ...props }: ArticleDescription) => {
  const { variant } = useArticleContext()
  return (
    <p
      className={cn(
        "text-xs text-gray-500 leading-[14.52px]",
        {
          truncate: variant === "outlined",
        },
        className
      )}
      {...props}
    />
  )
}

interface ArticleContent extends React.HTMLAttributes<HTMLDivElement> {}

const ArticleContent = (props: ArticleContent) => {
  return <div {...props} />
}

export {
  Article,
  ArticleIcon,
  ArticleDescription,
  ArticleTitle,
  ArticleContent,
}
