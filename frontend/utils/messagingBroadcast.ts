// Per Doc 05 EC-14.2: when a user has multiple tabs open in the same
// browser, state changes (drafts, reads, presence ownership) need to
// stay in sync across tabs without round-tripping through Ably or the
// backend. We use a single BroadcastChannel for the messaging surface.

export type MessagingBroadcastEvent =
  | {
      type: "draft"
      threadId: string
      userId: string
      text: string
      origin: string
    }
  | {
      type: "thread-read"
      threadId: string
      userId: string
      lastReadAt: string | null
      origin: string
    }

const CHANNEL_NAME = "messaging-sync"

let channel: BroadcastChannel | null = null
const tabId =
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random()}`

function getChannel(): BroadcastChannel | null {
  if (typeof window === "undefined") return null
  if (typeof BroadcastChannel === "undefined") return null
  if (!channel) {
    try {
      channel = new BroadcastChannel(CHANNEL_NAME)
    } catch {
      channel = null
    }
  }
  return channel
}

type DistributiveOmit<T, K extends keyof any> = T extends any
  ? Omit<T, K>
  : never

export function publishMessagingEvent(
  evt: DistributiveOmit<MessagingBroadcastEvent, "origin">,
): void {
  const c = getChannel()
  if (!c) return
  try {
    c.postMessage({ ...evt, origin: tabId } as MessagingBroadcastEvent)
  } catch {
    // ignore
  }
}

export function subscribeMessagingEvents(
  listener: (evt: MessagingBroadcastEvent) => void,
): () => void {
  const c = getChannel()
  if (!c) return () => {}
  const handler = (e: MessageEvent<MessagingBroadcastEvent>) => {
    if (!e.data || e.data.origin === tabId) return
    listener(e.data)
  }
  c.addEventListener("message", handler)
  return () => c.removeEventListener("message", handler)
}

export function getBroadcastTabId(): string {
  return tabId
}
