"use client"

import { useRouterChangeComplete } from "@/utils/hooks"
import nProgress from "nprogress"

export const NProgressBar = () => {
  useRouterChangeComplete({
    onComplete: () => nProgress.done(),
  })

  return null
}
