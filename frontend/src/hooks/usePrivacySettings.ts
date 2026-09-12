import { useCallback, useEffect, useRef } from "react"
import {
  ClientPrivacyPrefs,
  DEFAULT_CLIENT_PRIVACY,
  DEFAULT_TALENT_PRIVACY,
  PrivacyAPI,
  PrivacySettingsResponse,
  TalentPrivacyPrefs,
  UpdatePrivacyPayload,
} from "@/service/http/privacy"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

const KEYS = {
  privacy: ["privacy", "settings"] as const,
}

const DEBOUNCE_MS = 400

function mergePayload(
  current: PrivacySettingsResponse,
  patch: UpdatePrivacyPayload
): PrivacySettingsResponse {
  return {
    ...current,
    talent: patch.talent
      ? { ...(current.talent ?? DEFAULT_TALENT_PRIVACY), ...patch.talent }
      : current.talent,
    client: patch.client
      ? { ...(current.client ?? DEFAULT_CLIENT_PRIVACY), ...patch.client }
      : current.client,
  }
}

function mergeUpdatePayloads(
  a: UpdatePrivacyPayload,
  b: UpdatePrivacyPayload
): UpdatePrivacyPayload {
  return {
    talent:
      a.talent || b.talent
        ? { ...(a.talent ?? {}), ...(b.talent ?? {}) }
        : undefined,
    client:
      a.client || b.client
        ? { ...(a.client ?? {}), ...(b.client ?? {}) }
        : undefined,
  }
}

export function usePrivacySettings() {
  const queryClient = useQueryClient()

  const prefsQuery = useQuery<PrivacySettingsResponse>({
    queryKey: KEYS.privacy,
    queryFn: async () => {
      const res = await PrivacyAPI.get()
      return res.data
    },
  })

  const pendingRef = useRef<UpdatePrivacyPayload>({})
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const inflightRef = useRef<Promise<void> | null>(null)

  const saveMutation = useMutation({
    mutationFn: async (payload: UpdatePrivacyPayload) => {
      const res = await PrivacyAPI.update(payload)
      return res.data as PrivacySettingsResponse
    },
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: KEYS.privacy })
      const snapshot = queryClient.getQueryData<PrivacySettingsResponse>(
        KEYS.privacy
      )
      return { snapshot }
    },
    onSuccess: (data) => {
      queryClient.setQueryData(KEYS.privacy, data)
    },
    onError: (_err, _vars, ctx) => {
      const snapshot = (ctx as { snapshot?: PrivacySettingsResponse } | undefined)
        ?.snapshot
      if (snapshot) {
        queryClient.setQueryData(KEYS.privacy, snapshot)
      }
    },
  })

  const flush = useCallback(async () => {
    const pending = pendingRef.current
    if (!pending.talent && !pending.client) return
    pendingRef.current = {}
    await saveMutation.mutateAsync(pending)
  }, [saveMutation])

  const update = useCallback(
    (patch: UpdatePrivacyPayload) => {
      const current = queryClient.getQueryData<PrivacySettingsResponse>(
        KEYS.privacy
      )
      if (current) {
        queryClient.setQueryData<PrivacySettingsResponse>(
          KEYS.privacy,
          mergePayload(current, patch)
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
    [flush, queryClient]
  )

  const resetMutation = useMutation({
    mutationFn: async () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current)
        timerRef.current = null
        pendingRef.current = {}
      }
      const res = await PrivacyAPI.reset()
      return res.data as PrivacySettingsResponse
    },
    onSuccess: (data) => {
      queryClient.setQueryData(KEYS.privacy, data)
    },
  })

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current)
        timerRef.current = null
      }
      const pending = pendingRef.current
      if (pending.talent || pending.client) {
        pendingRef.current = {}
        PrivacyAPI.update(pending).catch(() => {})
      }
    }
  }, [])

  const talentPrefs: TalentPrivacyPrefs = {
    ...DEFAULT_TALENT_PRIVACY,
    ...(prefsQuery.data?.talent ?? {}),
  }

  const clientPrefs: ClientPrivacyPrefs = {
    ...DEFAULT_CLIENT_PRIVACY,
    ...(prefsQuery.data?.client ?? {}),
  }

  return {
    talentPrefs,
    clientPrefs,
    isLoading: prefsQuery.isLoading,
    isError: prefsQuery.isError,
    isSaving: saveMutation.isPending || resetMutation.isPending,
    update,
    flush,
    reset: () => resetMutation.mutateAsync(),
  }
}
