// frontend/src/lib/api/didit-launch-lifecycle.ts
//
// Which verification dialogs were open when Didit was launched, closed before it is shown and
// brought back if it is dismissed. The dialogs themselves stay mounted (only their open prop
// changes), so a reopened flow is on the same step it was on; nothing is reset, re-confirmed
// or re-created, and no backend call is made here.
export interface DiditLifecycleDeps {
  getFlowOpen: () => boolean
  getGateOpen: () => boolean
  setFlowOpen: (open: boolean) => void
  setGateOpen: (open: boolean) => void
  // Resolves true once the dialogs just closed are no longer rendered, false if one remains.
  waitForExit: () => Promise<boolean>
}

export function createDiditLifecycle(deps: DiditLifecycleDeps) {
  let closed: { flow: boolean; gate: boolean } | null = null
  return {
    /** Runs before Didit is presented (or before a redirect fallback). */
    async beforePresent(): Promise<boolean> {
      if (closed) return true
      const flow = deps.getFlowOpen()
      const gate = deps.getGateOpen()
      closed = { flow, gate }
      if (!flow && !gate) return true
      deps.setFlowOpen(false)
      deps.setGateOpen(false)
      const left = await deps.waitForExit()
      // One would not leave: Didit is not shown and the page redirects, so nothing is
      // reopened (that would flash a dialog right before the browser leaves).
      if (!left) closed = null
      return left
    },
    /** Didit was dismissed (cancelled, or failed after it was shown): put the dialogs back, once. */
    reopen(): void {
      const was = closed
      closed = null
      if (!was) return
      if (was.flow) deps.setFlowOpen(true)
      else if (was.gate) deps.setGateOpen(true)
    },
    /** A result or a reset: whatever was closed stays closed. */
    discard(): void {
      closed = null
    },
  }
}
