import { useState } from "react"
import { useUncontrolledState } from "@/utils/hooks"
import { useToggle } from "react-use"
import { ThumbsDownToggle } from "./thumbs-down"
import { ThumbsUpToggle } from "./thumbs-up"

export const LikeDislike = ({
  defaultLikes = 0,
  defaultState = null,
}: {
  defaultLikes?: number
  defaultState?: boolean | null
}) => {
  const [state, setState] = useState(defaultState)
  const likes = Math.max(defaultLikes + (state ? 1 : -1), 0)

  return (
    <div className="inline-flex items-center gap-x-2.5">
      <div className="inline-flex items-center gap-x-0.5">
        <ThumbsUpToggle
          pressed={typeof state === "boolean" && state}
          onPressedChange={(pressed) => setState(pressed ? pressed : null)}
        />
        <span className="text-[13px] font-light text-dark-blue-400">
          ({likes})
        </span>
      </div>
      <ThumbsDownToggle
        pressed={typeof state === "boolean" && !state}
        onPressedChange={(pressed) => setState(pressed ? !pressed : null)}
      />
    </div>
  )
}
