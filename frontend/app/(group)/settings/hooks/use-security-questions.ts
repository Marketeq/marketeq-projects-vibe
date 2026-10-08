import { useCallback, useEffect, useState } from "react"
import { AuthAPI } from "@/service/http/auth"

/**
 * Loads and saves the answers behind Settings > Account Recovery > Security
 * Questions.
 *
 * Backed by `security_question_answers` in auth-service, which is also what
 * /forgot-password checks against. Before this hook the Save button set a
 * boolean in component state: the modal reported success, the Enabled badge
 * appeared, and nothing was stored — so the recovery flow that asks for these
 * answers had nothing to compare them to.
 *
 * Answers are hashed on the way in and never come back. The only thing the
 * server will return is which questions an account answered, which is why the
 * modal reopens with the questions preselected and the answer fields blank: it
 * cannot show what was said, only that something was.
 */
export type SecurityQuestion = { id: string; prompt: string }

export type SecurityQuestionDraft = {
  questionId: string
  answer: string
}

export function useSecurityQuestions(enabled: boolean) {
  const [catalog, setCatalog] = useState<SecurityQuestion[]>([])
  // Both limits come from the catalogue endpoint so the form never restates a
  // number the server validator owns. The fallbacks only matter if that call
  // fails, and match the backend defaults.
  const [requiredAnswers, setRequiredAnswers] = useState(2)
  const [maxAnswers, setMaxAnswers] = useState(5)
  const [configuredIds, setConfiguredIds] = useState<string[]>([])
  const [isConfigured, setIsConfigured] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [hasLoaded, setHasLoaded] = useState(false)

  useEffect(() => {
    if (!enabled || hasLoaded) return

    let cancelled = false
    setIsLoading(true)

    // The catalogue is public and the account's own questions are not, so they
    // are settled independently: a signed-out-in-the-background user still gets
    // a populated dropdown rather than an empty one.
    Promise.allSettled([
      AuthAPI.GetSecurityQuestionCatalog(),
      AuthAPI.GetSecurityQuestions(),
    ])
      .then(([catalogResult, mineResult]) => {
        if (cancelled) return

        if (catalogResult.status === "fulfilled") {
          const questions = catalogResult.value?.data?.questions
          if (Array.isArray(questions)) setCatalog(questions)

          const required = catalogResult.value?.data?.requiredAnswers
          if (typeof required === "number") setRequiredAnswers(required)
          const max = catalogResult.value?.data?.maxAnswers
          if (typeof max === "number") setMaxAnswers(max)
        } else {
          console.warn(
            "[settings] could not load the security question catalogue",
            catalogResult.reason
          )
        }

        if (mineResult.status === "fulfilled") {
          const ids = mineResult.value?.data?.questionIds
          if (Array.isArray(ids)) setConfiguredIds(ids)
          setIsConfigured(Boolean(mineResult.value?.data?.configured))
        } else {
          // Treated as "none set". An account whose answers cannot be read is
          // indistinguishable from one that has none, and saving replaces the
          // set either way.
          console.warn(
            "[settings] could not load the saved security questions",
            mineResult.reason
          )
        }
      })
      .finally(() => {
        if (cancelled) return
        setIsLoading(false)
        setHasLoaded(true)
      })

    return () => {
      cancelled = true
    }
  }, [enabled, hasLoaded])

  /**
   * Replaces the stored set with what the form holds. Throws on failure so the
   * caller can surface it — a silent failure here is exactly what let the old
   * button claim a save that never happened.
   */
  const save = useCallback(async (answers: SecurityQuestionDraft[]) => {
    const response = await AuthAPI.SetSecurityQuestions({ answers })

    const ids = response?.data?.questionIds
    if (Array.isArray(ids)) setConfiguredIds(ids)
    setIsConfigured(Boolean(response?.data?.configured))

    return response?.data
  }, [])

  const promptFor = useCallback(
    (questionId: string) =>
      catalog.find((question) => question.id === questionId)?.prompt ?? "",
    [catalog]
  )

  return {
    catalog,
    requiredAnswers,
    maxAnswers,
    configuredIds,
    isConfigured,
    isLoading,
    hasLoaded,
    promptFor,
    save,
  }
}
