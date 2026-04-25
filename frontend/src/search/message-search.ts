// Client-side message search index.
//
// Background: messages are E2EE — the server only has ciphertext, so the
// backend's /v1/messages/search can't match anything under normal operation.
// We build an index on the client from decrypted messages and persist it in
// IndexedDB so a refresh doesn't cost re-indexing. A brand-new device pays
// the one-time cost of fetching + decrypting all history.

import Fuse, { type IFuseOptions } from "fuse.js"
import { openDB, type IDBPDatabase } from "idb"
import { decryptAES } from "@/src/crypto/e2ee"
import { loadKey, saveKey } from "@/src/crypto/storage"
import { apiFetch } from "@/src/lib/api"
import type { Conversation } from "@/types/conversation"
import type { Message } from "@/types/message"

const DB_NAME = "marketeq-search"
const DB_VERSION = 1
const DOCS_STORE = "docs"
const META_STORE = "meta"

export interface SearchDoc {
  id: string
  threadId: string
  senderId: string
  content: string
  createdAt: string
}

let dbPromise: Promise<IDBPDatabase> | null = null

function getDb(): Promise<IDBPDatabase> {
  if (typeof indexedDB === "undefined") {
    return Promise.reject(new Error("IndexedDB unavailable"))
  }
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(DOCS_STORE)) {
          db.createObjectStore(DOCS_STORE)
        }
        if (!db.objectStoreNames.contains(META_STORE)) {
          db.createObjectStore(META_STORE)
        }
      },
    })
  }
  return dbPromise
}

const docsKey = (userId: string) => `docs:${userId}`
const metaKey = (userId: string) => `meta:${userId}`

interface IndexMeta {
  lastIndexedAt: string
  threadsIndexed: string[]
}

export async function loadCachedDocs(userId: string): Promise<SearchDoc[]> {
  try {
    const db = await getDb()
    const docs = await db.get(DOCS_STORE, docsKey(userId))
    return Array.isArray(docs) ? docs : []
  } catch {
    return []
  }
}

export async function saveCachedDocs(
  userId: string,
  docs: SearchDoc[],
  threadsIndexed: string[]
): Promise<void> {
  try {
    const db = await getDb()
    const tx = db.transaction([DOCS_STORE, META_STORE], "readwrite")
    await tx.objectStore(DOCS_STORE).put(docs, docsKey(userId))
    await tx.objectStore(META_STORE).put(
      {
        lastIndexedAt: new Date().toISOString(),
        threadsIndexed,
      } satisfies IndexMeta,
      metaKey(userId)
    )
    await tx.done
  } catch (err) {
    console.warn("[message-search] failed to persist index", err)
  }
}

export async function clearCachedIndex(userId: string): Promise<void> {
  try {
    const db = await getDb()
    const tx = db.transaction([DOCS_STORE, META_STORE], "readwrite")
    await tx.objectStore(DOCS_STORE).delete(docsKey(userId))
    await tx.objectStore(META_STORE).delete(metaKey(userId))
    await tx.done
  } catch {}
}

/**
 * Unwrap a thread's AES key using the user's RSA private key. Uses the
 * localStorage cache when available to avoid repeated network + RSA work.
 */
async function unwrapAesKey(
  conv: Conversation,
  token: string,
  privateKey: CryptoKey
): Promise<Uint8Array | null> {
  try {
    return loadKey(conv.id)
  } catch {
    /* not cached; unwrap below */
  }
  try {
    const { encryptedKey } = await apiFetch<{ encryptedKey: string }>(
      `/api/messaging/conversations/${conv.id}/key?isGroup=${conv.isGroup}`,
      { headers: { Authorization: `Bearer ${token}` } }
    )
    const wrapped = Uint8Array.from(atob(encryptedKey), (c) => c.charCodeAt(0))
    const rawBuffer = await window.crypto.subtle.decrypt(
      { name: "RSA-OAEP" },
      privateKey,
      wrapped
    )
    const key = new Uint8Array(rawBuffer)
    saveKey(conv.id, btoa(String.fromCharCode(...key)))
    return key
  } catch (err) {
    console.warn(
      `[message-search] failed to unwrap key for thread ${conv.id}`,
      err
    )
    return null
  }
}

interface BuildOptions {
  userId: string
  token: string
  privateKey: CryptoKey | null
  /**
   * Existing docs to merge into. When provided, we only index threads with
   * new / updated messages, saving work on subsequent loads.
   */
  existing?: SearchDoc[]
  /** Optional progress callback: (indexedThreadCount, totalThreadCount). */
  onProgress?: (done: number, total: number) => void
  /** AbortSignal for cancellation. */
  signal?: AbortSignal
}

/**
 * Rebuilds (or incrementally extends) the search index for this user.
 * Returns the full docs list. Does not touch IndexedDB — persist with
 * `saveCachedDocs`.
 */
export async function buildSearchIndex(opts: BuildOptions): Promise<{
  docs: SearchDoc[]
  threadsIndexed: string[]
}> {
  const { token, privateKey, existing = [], onProgress, signal } = opts

  const threads = await apiFetch<Conversation[]>("/v1/threads", {
    method: "GET",
    headers: { Authorization: `Bearer ${token}` },
    signal,
  })
  if (signal?.aborted) throw new DOMException("aborted", "AbortError")

  // Merge by message id; we re-index every thread. Since messages are
  // append-mostly (edits excepted), this refreshes content on edits too.
  const byId = new Map<string, SearchDoc>(existing.map((d) => [d.id, d]))
  const threadsIndexed: string[] = []

  let done = 0
  const total = threads.length
  onProgress?.(done, total)

  // Sequential to avoid RSA-OAEP bursts + 20 concurrent GETs on a fresh device.
  for (const thread of threads) {
    if (signal?.aborted) throw new DOMException("aborted", "AbortError")

    try {
      let aesKey: Uint8Array | null = null
      if (privateKey) aesKey = await unwrapAesKey(thread, token, privateKey)

      const messages = await apiFetch<Message[]>(
        `/v1/messages/thread/${thread.id}`,
        {
          method: "GET",
          headers: { Authorization: `Bearer ${token}` },
          signal,
        }
      )
      if (signal?.aborted) throw new DOMException("aborted", "AbortError")

      for (const m of messages) {
        if ((m as any).deleted || (m as any).isDeleted) continue

        let content = m.content || ""
        if (!content && m.ciphertext && aesKey) {
          try {
            content = await decryptAES(m.ciphertext, aesKey)
          } catch {
            continue
          }
        }
        if (!content) continue

        byId.set(m.id, {
          id: m.id,
          threadId: thread.id,
          senderId: m.senderId,
          content,
          createdAt: m.createdAt,
        })
      }
      threadsIndexed.push(thread.id)
    } catch (err) {
      if ((err as any)?.name === "AbortError") throw err
      console.warn(
        `[message-search] failed to index thread ${thread.id}`,
        err
      )
    }

    done += 1
    onProgress?.(done, total)
  }

  return {
    docs: Array.from(byId.values()),
    threadsIndexed,
  }
}

const FUSE_OPTIONS: IFuseOptions<SearchDoc> = {
  keys: ["content"],
  threshold: 0.3,
  ignoreLocation: true,
  includeMatches: false,
  minMatchCharLength: 2,
}

export function makeSearcher(docs: SearchDoc[]) {
  const fuse = new Fuse(docs, FUSE_OPTIONS)
  return (query: string): SearchDoc[] => {
    const q = query.trim()
    if (!q) return []
    return fuse.search(q, { limit: 50 }).map((r) => r.item)
  }
}
