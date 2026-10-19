"use client"

import { useCallback, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { resolveDashboardRole, useAuth } from "@/contexts/auth"
import { ROLE } from "@/types/user"
import { AccountVerificationGate } from "@/components/account-verification-gate"
import { applyGateFor } from "@/src/lib/api/apply-gate"
import { fetchIdentityVerificationSummary } from "@/src/lib/api/identity-verification-state"

// G3: gates the job Apply entry points. For a talent, the backend's gate_open
// answer is read fresh on every click (never cached): open runs the button's
// existing behavior, closed opens the existing "Verify My Account" popup, and an
// unreadable answer opens that popup's existing status-unavailable state. Anyone
// who is not a talent (clients, signed-out visitors) keeps the button's existing
// behavior untouched. "Verify My Account" continues on the talent dashboard, where
// the existing verification banner starts verification.
export function useApplyGate() {
  const { user } = useAuth()
  const router = useRouter()
  const [block, setBlock] = useState<"closed" | "unavailable" | null>(null)
  const checking = useRef(false)
  const isTalent = resolveDashboardRole(user) === ROLE.TALENT

  const runApply = useCallback(
    async (proceed?: () => void) => {
      if (!isTalent) {
        proceed?.()
        return
      }
      if (checking.current) return
      checking.current = true
      try {
        const decision = applyGateFor(await fetchIdentityVerificationSummary())
        if (decision === "open") {
          proceed?.()
          return
        }
        setBlock(decision === "closed" ? "closed" : "unavailable")
      } finally {
        checking.current = false
      }
    },
    [isTalent]
  )

  const goVerify = () => {
    setBlock(null)
    router.push("/talent-dashboard")
  }

  const applyGateDialog = (
    <AccountVerificationGate
      open={block !== null}
      reason={block === "unavailable" ? "status_unavailable" : "unstarted"}
      connectionCheckState="idle"
      onVerify={goVerify}
      onRetryConnectionCheck={goVerify}
      onDismissConnectionError={() => setBlock(null)}
    />
  )

  return { runApply, applyGateDialog }
}
