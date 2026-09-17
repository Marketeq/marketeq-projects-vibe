import { useEffect, useRef, useState } from "react"
import { useAuth } from "@/contexts/auth"
import { ApiError, apiFetch } from "@/src/lib/api"
import * as Ably from "ably"

export interface AblyOfferUpdatedPayload {
  offer: Record<string, unknown>
  counterOffer: Record<string, unknown> | null
  rateWarning: boolean
  updatedAt: string
}

export function useOfferChannel(
  offerId: string | null | undefined,
  onUpdate: (payload: AblyOfferUpdatedPayload) => void,
  onReconnect?: () => void
) {
  const { user } = useAuth()
  const [isLive, setIsLive] = useState(false)
  const onUpdateRef = useRef(onUpdate)
  const onReconnectRef = useRef(onReconnect)
  useEffect(() => {
    onUpdateRef.current = onUpdate
  }, [onUpdate])
  useEffect(() => {
    onReconnectRef.current = onReconnect
  }, [onReconnect])

  useEffect(() => {
    if (!offerId) return
    if (!user?.id) {
      console.error("No logged-in user; cannot subscribe to Ably")
      return
    }

    const client = new Ably.Realtime({
      authCallback: async (_tokenParams, callback) => {
        try {
          const tokenDetails = await apiFetch<any>(
            `/v1/offers/${offerId}/ably-token`,
            { method: "GET" }
          )
          if (!tokenDetails) {
            callback("Realtime token unavailable", null)
            return
          }
          callback(null, tokenDetails)
        } catch (err) {
          if (err instanceof ApiError && err.status === 401) {
            callback("Session expired", null)
            client.close()
            return
          }
          const msg = err instanceof Error ? err.message : String(err)
          callback(msg, null)
        }
      },
      clientId: user.id,
    })

    let wasDropped = false
    const onConnected = () => {
      setIsLive(true)
      if (wasDropped) {
        wasDropped = false
        onReconnectRef.current?.()
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

    const channel = client.channels.get(`offer:${offerId}`)
    channel.subscribe((msg) => {
      if (msg.name === "offer.updated") {
        onUpdateRef.current(msg.data as AblyOfferUpdatedPayload)
      }
    })

    return () => {
      channel.unsubscribe()
      client.connection.off("connected", onConnected)
      client.connection.off("disconnected", onDropped)
      client.connection.off("suspended", onDropped)
      client.connection.off("failed", onDropped)
      client.connection.off("closed", onDropped)
      client.close()
      setIsLive(false)
    }
  }, [offerId, user?.id])

  return { isLive }
}
