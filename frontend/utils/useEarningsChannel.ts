import { useEffect, useRef, useState } from "react"
import { useAuth } from "@/contexts/auth"
import { ApiError, apiFetch } from "@/src/lib/api"
import * as Ably from "ably"

export interface EarningsRealtimeEvent {
  contractorId: string
  availableBalance: string
  previousBalance: string
  delta: string
  mutationType: "credit" | "debit" | "reversal" | "payout_completed" | "payout_failed"
  sourceEventId: string
  sourceRoutingKey: string
  displayCurrency: string
  localCurrency: string
  mutationAt: string
}

export interface EarningsChannelHandlers {
  onBalanceUpdated?: (evt: EarningsRealtimeEvent) => void
  onTransactionReversed?: (evt: EarningsRealtimeEvent) => void
  onPayoutFailed?: (evt: EarningsRealtimeEvent) => void
  // US-94.05: fires once, right after the channel transitions back to
  // connected from a dropped state — the immediate re-fetch that replaces
  // the polling fallback.
  onReconnected?: () => void
}

const DEBOUNCE_MS = 200

/**
 * US-91–94: subscribes to private:{contractorId}:earnings for live
 * balance/earnings pushes. Returns isLive so callers can gate their 60s
 * polling fallback on it (poll only while disconnected — US-94) and show
 * a Live badge (US-91.03).
 */
export function useEarningsChannel(handlers: EarningsChannelHandlers) {
  const { user } = useAuth()
  const [isLive, setIsLive] = useState(false)
  const handlersRef = useRef(handlers)
  useEffect(() => {
    handlersRef.current = handlers
  }, [handlers])

  useEffect(() => {
    if (!user?.id) return

    const client = new Ably.Realtime({
      authCallback: async (_params, cb) => {
        try {
          const details = await apiFetch<any>(`/v1/earnings/ably-token`, {
            method: "GET",
          })
          if (!details) {
            cb("Realtime token unavailable", null)
            return
          }
          cb(null, details)
        } catch (err) {
          // apiFetch already refreshed once and that refresh failed, so the
          // session is over. Handing Ably a retryable error makes it reconnect
          // and re-auth every ~15s forever against a dead session; close instead.
          if (err instanceof ApiError && err.status === 401) {
            cb("Session expired", null)
            client.close()
            return
          }
          cb(err instanceof Error ? err.message : String(err), null)
        }
      },
      clientId: user.id,
    })

    let wasDropped = false
    const onConnected = () => {
      setIsLive(true)
      if (wasDropped) {
        wasDropped = false
        handlersRef.current.onReconnected?.()
      }
    }
    const onDropped = () => {
      wasDropped = true
      setIsLive(false)
    }
    client.connection.on("connected", onConnected)
    client.connection.on("disconnected", onDropped)
    client.connection.on("suspended", onDropped)
    client.connection.on("failed", onDropped)
    client.connection.on("closed", onDropped)

    const channel = client.channels.get(`private:${user.id}:earnings`)

    // CAT-01: rapid successive events of the SAME type are debounced 200ms —
    // only the most recent one in a burst fires the handler. Timers are keyed
    // per event name so a reversal/failure event is never dropped just
    // because a plain balance.updated happened to land in the same window.
    const debounceTimers = new Map<string, ReturnType<typeof setTimeout>>()
    channel.subscribe((msg) => {
      const name = msg.name
      if (!name) return
      const existing = debounceTimers.get(name)
      if (existing) clearTimeout(existing)
      const timer = setTimeout(() => {
        debounceTimers.delete(name)
        const data = msg.data as EarningsRealtimeEvent
        switch (name) {
          case "balance.updated":
            handlersRef.current.onBalanceUpdated?.(data)
            break
          case "transaction.reversed":
            handlersRef.current.onTransactionReversed?.(data)
            break
          case "earnings.payout.failed":
            handlersRef.current.onPayoutFailed?.(data)
            break
        }
      }, DEBOUNCE_MS)
      debounceTimers.set(name, timer)
    })

    return () => {
      debounceTimers.forEach((t) => clearTimeout(t))
      debounceTimers.clear()
      channel.unsubscribe()
      client.connection.off("connected", onConnected)
      client.connection.off("disconnected", onDropped)
      client.connection.off("suspended", onDropped)
      client.connection.off("failed", onDropped)
      client.connection.off("closed", onDropped)
      if (client.connection.state === "connected") {
        client.close()
      }
      setIsLive(false)
    }
  }, [user?.id])

  return { isLive }
}
