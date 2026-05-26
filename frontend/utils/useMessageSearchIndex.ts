"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import {
  type SearchDoc,
  buildSearchIndex,
  loadCachedDocs,
  makeSearcher,
  saveCachedDocs,
} from "@/src/search/message-search"

interface UseMessageSearchIndexOptions {
  userId: string | null | undefined
  token: string | null | undefined
  privateKey: CryptoKey | null
}

export interface MessageSearchIndexState {
  search: (query: string) => SearchDoc[]
  isIndexing: boolean
  /** 0..1, based on threads indexed so far. */
  progress: number
  /** True once the cached index has been loaded from IndexedDB. */
  ready: boolean
  docCount: number
  /** Full doc set; exposed so consumers can run their own non-fuzzy filters
   * (e.g. filenames, URL substrings) that fuse's content-keyed match misses. */
  allDocs: SearchDoc[]
  /** Append a single doc into the live index without a full rebuild. Used
   * after sending or receiving a message so search picks it up immediately
   * instead of waiting for the next session-bootstrap rebuild. */
  addDoc: (doc: SearchDoc) => void
}

/**
 * Loads any previously-persisted search index from IndexedDB, then kicks
 * off a background rebuild over all threads so new or edited messages get
 * picked up. The hook is safe to remount — an in-flight build is cancelled
 * cleanly.
 */
export function useMessageSearchIndex({
  userId,
  token,
  privateKey,
}: UseMessageSearchIndexOptions): MessageSearchIndexState {
  const [docs, setDocs] = useState<SearchDoc[]>([])
  const [ready, setReady] = useState(false)
  const [isIndexing, setIsIndexing] = useState(false)
  const [progress, setProgress] = useState(0)

  const searcherRef = useRef<(q: string) => SearchDoc[]>(() => [])
  const indexingRef = useRef(false)

  useEffect(() => {
    searcherRef.current = makeSearcher(docs)
  }, [docs])

  // Phase 1: load cached docs from IndexedDB immediately so search works
  // with whatever was indexed last session.
  useEffect(() => {
    if (!userId) return
    let cancelled = false
    ;(async () => {
      const cached = await loadCachedDocs(userId)
      if (cancelled) return
      setDocs(cached)
      setReady(true)
    })()
    return () => {
      cancelled = true
    }
  }, [userId])

  // Phase 2: once we have a token + private key, rebuild/refresh the index
  // in the background. Merges new messages into whatever was cached.
  useEffect(() => {
    if (!userId || !token || !privateKey || !ready) return
    if (indexingRef.current) return

    indexingRef.current = true
    setIsIndexing(true)
    setProgress(0)

    const controller = new AbortController()

    ;(async () => {
      try {
        const result = await buildSearchIndex({
          userId,
          token,
          privateKey,
          existing: docs,
          signal: controller.signal,
          onProgress: (done, total) => {
            setProgress(total > 0 ? done / total : 1)
          },
        })
        if (controller.signal.aborted) return
        setDocs(result.docs)
        await saveCachedDocs(userId, result.docs, result.threadsIndexed)
      } catch (err) {
        if ((err as any)?.name !== "AbortError") {
          console.error("[useMessageSearchIndex] build failed", err)
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsIndexing(false)
          setProgress(1)
        }
        indexingRef.current = false
      }
    })()

    return () => {
      controller.abort()
      indexingRef.current = false
    }
    // `docs` intentionally omitted — we want one build per auth session,
    // not a rebuild every time the docs ref changes. Incremental updates
    // on new message arrival should be handled at a higher level.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, token, privateKey, ready])

  const search = useCallback((query: string) => {
    return searcherRef.current(query)
  }, [])

  const addDoc = useCallback(
    (doc: SearchDoc) => {
      setDocs((prev) => {
        // Replace if same id already present (handles edits), otherwise append.
        const idx = prev.findIndex((d) => d.id === doc.id)
        const next = idx >= 0 ? prev.slice() : [...prev, doc]
        if (idx >= 0) next[idx] = doc
        // Persist asynchronously; fire-and-forget — the in-memory state is
        // what drives the searcher above, IDB is just the cache for next load.
        if (userId) {
          void saveCachedDocs(
            userId,
            next,
            // We don't track threadsIndexed here; saveCachedDocs handles it.
            []
          ).catch(() => {})
        }
        return next
      })
    },
    [userId]
  )

  // Stable object identity — consumers put this in effect deps.
  return useMemo(
    () => ({
      search,
      isIndexing,
      progress,
      ready,
      docCount: docs.length,
      allDocs: docs,
      addDoc,
    }),
    [search, isIndexing, progress, ready, docs, addDoc]
  )
}
