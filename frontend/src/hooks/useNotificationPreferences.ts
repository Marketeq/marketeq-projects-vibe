import { useCallback, useEffect, useMemo, useRef } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  CatalogCategory,
  NotificationsAPI,
  PreferencesResponse,
  UpdatePreferencesPayload,
} from "@/service/http/notifications"

const KEYS = {
  catalog: ["notifications", "catalog"] as const,
  preferences: ["notifications", "preferences"] as const,
}

const DEBOUNCE_MS = 400

function mergePayload(
  current: PreferencesResponse,
  patch: UpdatePreferencesPayload,
): PreferencesResponse {
  const channels = current.channels
    ? {
        inApp: { ...current.channels.inApp, ...(patch.channels?.inApp ?? {}) },
        email: { ...current.channels.email, ...(patch.channels?.email ?? {}) },
        sms: { ...current.channels.sms, ...(patch.channels?.sms ?? {}) },
      }
    : current.channels

  const categories = patch.categories
    ? {
        ...(current.categories ?? {}),
        ...Object.fromEntries(
          Object.entries(patch.categories).map(([id, value]) => {
            const existing = current.categories?.[id]
            return [
              id,
              {
                enabled: value.enabled ?? existing?.enabled ?? false,
                channels: {
                  ...(existing?.channels ?? { inApp: false, email: false, sms: false }),
                  ...(value.channels ?? {}),
                },
              },
            ]
          }),
        ),
      }
    : current.categories

  const notifications = patch.notifications
    ? {
        ...(current.notifications ?? {}),
        ...Object.fromEntries(
          Object.entries(patch.notifications).map(([id, value]) => {
            const existing = current.notifications?.[id]
            return [
              id,
              {
                enabled: value.enabled ?? existing?.enabled ?? false,
                channels: {
                  ...(existing?.channels ?? { inApp: false, email: false, sms: false }),
                  ...(value.channels ?? {}),
                },
              },
            ]
          }),
        ),
      }
    : current.notifications

  return {
    ...current,
    channels,
    categories,
    notifications,
  }
}

function mergeUpdatePayloads(
  a: UpdatePreferencesPayload,
  b: UpdatePreferencesPayload,
): UpdatePreferencesPayload {
  return {
    channels: a.channels || b.channels
      ? {
          inApp: { ...(a.channels?.inApp ?? {}), ...(b.channels?.inApp ?? {}) },
          email: { ...(a.channels?.email ?? {}), ...(b.channels?.email ?? {}) },
          sms: { ...(a.channels?.sms ?? {}), ...(b.channels?.sms ?? {}) },
        }
      : undefined,
    categories: a.categories || b.categories
      ? { ...(a.categories ?? {}), ...(b.categories ?? {}) }
      : undefined,
    notifications: a.notifications || b.notifications
      ? { ...(a.notifications ?? {}), ...(b.notifications ?? {}) }
      : undefined,
  }
}

export function useNotificationPreferences() {
  const queryClient = useQueryClient()

  const catalogQuery = useQuery<CatalogCategory[]>({
    queryKey: KEYS.catalog,
    queryFn: async () => {
      const res = await NotificationsAPI.getCatalog()
      return res.data
    },
    staleTime: 5 * 60_000,
  })

  const prefsQuery = useQuery<PreferencesResponse>({
    queryKey: KEYS.preferences,
    queryFn: async () => {
      const res = await NotificationsAPI.getPreferences()
      return res.data
    },
  })

  const pendingRef = useRef<UpdatePreferencesPayload>({})
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const inflightRef = useRef<Promise<void> | null>(null)

  const saveMutation = useMutation({
    mutationFn: async (payload: UpdatePreferencesPayload) => {
      const res = await NotificationsAPI.updatePreferences(payload)
      return res.data as PreferencesResponse
    },
    onSuccess: (data) => {
      queryClient.setQueryData(KEYS.preferences, data)
    },
    onError: (_err, _vars, ctx) => {
      const snapshot = (ctx as { snapshot?: PreferencesResponse } | undefined)?.snapshot
      if (snapshot) {
        queryClient.setQueryData(KEYS.preferences, snapshot)
      }
    },
  })

  const flush = useCallback(async () => {
    if (Object.keys(pendingRef.current).length === 0) return
    const payload = pendingRef.current
    pendingRef.current = {}
    await saveMutation.mutateAsync(payload)
  }, [saveMutation])

  const update = useCallback(
    (patch: UpdatePreferencesPayload) => {
      const current = queryClient.getQueryData<PreferencesResponse>(
        KEYS.preferences,
      )
      if (current) {
        queryClient.setQueryData<PreferencesResponse>(
          KEYS.preferences,
          mergePayload(current, patch),
        )
      }
      pendingRef.current = mergeUpdatePayloads(pendingRef.current, patch)

      if (timerRef.current) clearTimeout(timerRef.current)
      timerRef.current = setTimeout(() => {
        timerRef.current = null
        const run = flush()
        inflightRef.current = run
        run.finally(() => {
          if (inflightRef.current === run) inflightRef.current = null
        })
      }, DEBOUNCE_MS)
    },
    [flush, queryClient],
  )

  const resetMutation = useMutation({
    mutationFn: async () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current)
        timerRef.current = null
        pendingRef.current = {}
      }
      const res = await NotificationsAPI.resetPreferences()
      return res.data as PreferencesResponse
    },
    onSuccess: (data) => {
      queryClient.setQueryData(KEYS.preferences, data)
    },
  })

  const phoneMutation = useMutation({
    mutationFn: async (phone: string | null) => {
      const res = await NotificationsAPI.updatePhone(phone)
      return res.data
    },
  })

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [])

  const resolved = useMemo(() => {
    const catalog = catalogQuery.data ?? []
    const prefs = prefsQuery.data ?? null
    return { catalog, prefs }
  }, [catalogQuery.data, prefsQuery.data])

  return {
    catalog: resolved.catalog,
    preferences: resolved.prefs,
    isLoading: catalogQuery.isLoading || prefsQuery.isLoading,
    isError: catalogQuery.isError || prefsQuery.isError,
    isSaving: saveMutation.isPending || resetMutation.isPending,
    update,
    flush,
    reset: () => resetMutation.mutateAsync(),
    updatePhone: (phone: string | null) => phoneMutation.mutateAsync(phone),
  }
}
