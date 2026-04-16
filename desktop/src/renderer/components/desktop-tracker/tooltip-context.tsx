"use client"

import * as React from "react"

/** Global tooltip ID — only the tooltip matching the current ID renders */
let globalTooltipId = 0
const listeners = new Set<() => void>()

function nextTooltipId() {
  globalTooltipId++
  listeners.forEach((fn) => fn())
  return globalTooltipId
}

function clearTooltipId(id: number) {
  if (globalTooltipId === id) {
    globalTooltipId = 0
    listeners.forEach((fn) => fn())
  }
}

/** Hook: returns [myId, isActive, claim, release] */
export function useExclusiveTooltip() {
  const idRef = React.useRef(0)
  const [active, setActive] = React.useState(false)

  React.useEffect(() => {
    const sync = () => setActive(globalTooltipId === idRef.current && idRef.current !== 0)
    listeners.add(sync)
    return () => { listeners.delete(sync) }
  }, [])

  const claim = React.useCallback(() => {
    idRef.current = nextTooltipId()
    setActive(true)
  }, [])

  const release = React.useCallback(() => {
    clearTooltipId(idRef.current)
    idRef.current = 0
    setActive(false)
  }, [])

  return { active, claim, release }
}
