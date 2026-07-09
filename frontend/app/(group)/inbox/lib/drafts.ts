// Per Doc 05 EC-3.3: composer drafts must persist per-thread per-user
// across navigation, refresh, and accidental tab close.
// Storage is IndexedDB (not localStorage) per Doc 06 §14.
import { publishMessagingEvent } from "@/utils/messagingBroadcast"
import { type IDBPDatabase, openDB } from "idb"

const DB_NAME = "messaging-drafts"
const STORE = "drafts"

let dbPromise: Promise<IDBPDatabase> | null = null

function db() {
  if (typeof window === "undefined") {
    return null
  }
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, 1, {
      upgrade(d) {
        if (!d.objectStoreNames.contains(STORE)) {
          d.createObjectStore(STORE)
        }
      },
    })
  }
  return dbPromise
}

function key(threadId: string, userId: string): string {
  return `${userId}:${threadId}`
}

export async function loadDraft(
  threadId: string,
  userId: string
): Promise<string> {
  const d = db()
  if (!d || !threadId || !userId) return ""
  try {
    const value = await (await d).get(STORE, key(threadId, userId))
    return typeof value === "string" ? value : ""
  } catch {
    return ""
  }
}

export async function saveDraft(
  threadId: string,
  userId: string,
  text: string
): Promise<void> {
  const d = db()
  if (!d || !threadId || !userId) return
  try {
    if (text && text.trim()) {
      await (await d).put(STORE, text, key(threadId, userId))
    } else {
      await (await d).delete(STORE, key(threadId, userId))
    }
    publishMessagingEvent({ type: "draft", threadId, userId, text })
  } catch {
    // best-effort; don't break the composer
  }
}

export async function clearDraft(
  threadId: string,
  userId: string
): Promise<void> {
  const d = db()
  if (!d || !threadId || !userId) return
  try {
    await (await d).delete(STORE, key(threadId, userId))
    publishMessagingEvent({ type: "draft", threadId, userId, text: "" })
  } catch {
    // ignore
  }
}
