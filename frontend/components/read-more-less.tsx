import React from "react"
import { cn } from "@/utils/functions"
import { mergeRefs } from "@/utils/react-utils"
import { motion } from "framer-motion"
import { useToggle } from "react-use"
import { ShowMoreLessRoot, useShowMoreLessRootContext } from "./show-more-less"

const rmWordsFromEndWithFullStop = (words: string[]) => {
  const lastWord = words[words.length - 1]
  if (lastWord.endsWith(".") || lastWord.endsWith("?")) {
    return rmWordsFromEndWithFullStop(words.slice(0, -1))
  }
  return words
}

export const ReadMoreLessRoot = ShowMoreLessRoot

export const ReadMoreLess = ({
  text,
  max = 36,
  children,
}: {
  text: string
  max?: number
  children?: (options: {
    readMore: boolean
    toggle: (...args: any[]) => any
    text: string
  }) => React.ReactNode
}) => {
  const words = text.split(" ")
  const truncatedTextWithEllipses = rmWordsFromEndWithFullStop(
    words.splice(0, max)
  ).join(" ")
  const [readMore, toggle] = useToggle(false)
  return (
    <motion.div layout transition={{ ease: "easeInOut", duration: 0.3 }}>
      {children?.({
        readMore,
        toggle,
        text: readMore ? text : truncatedTextWithEllipses,
      })}
    </motion.div>
  )
}

export const ReadMoreLessComp = ({
  style,
  ref: originalRef,
  text,
  max = 36,
  trigger,
  children,
  className,
  ...props
}: Omit<React.ComponentProps<"div">, "children"> & {
  text: string
  max?: number
  trigger?: (
    set: React.Dispatch<React.SetStateAction<boolean>>
  ) => React.ReactNode
  children?: (props: {
    readMore: boolean
    toggle: () => void
    on: () => void
    off: () => void
    text: string
    shouldShow: boolean
  }) => React.ReactNode
}) => {
  const { isShowing, scrollHeight, ref, setIsShowing } =
    useShowMoreLessRootContext()
  const words = text.split(" ")
  const truncatedTextWithEllipses = rmWordsFromEndWithFullStop(
    words.splice(0, max)
  ).join(" ")

  return (
    <div
      ref={mergeRefs([ref, originalRef])}
      className={cn(
        "[interpolate-size:allow-keywords] overflow-hidden transition-[height] duration-300",
        className
      )}
      style={{
        height: "auto",
        ...style,
      }}
      {...props}
    >
      {children?.({
        toggle: () => setIsShowing((prev) => !prev),
        readMore: isShowing,
        on: () => setIsShowing(true),
        off: () => setIsShowing(false),
        text: isShowing ? text : truncatedTextWithEllipses,
        shouldShow: text.length > max,
      })}
    </div>
  )
}
