import { useCallback } from "react"
import { useAuth } from "@/contexts/auth"
import { UserAPI } from "@/service/http/user"

/**
 * Re-reads the signed-in user from the server and replaces the cached object.
 *
 * Settings saves currently hand-patch the cached user with the handful of
 * fields the form knows about, so anything the server derives or normalises —
 * and anything the form does not name — silently drifts out of date. The
 * avatar URL returned by an upload is never written back at all. Re-fetching
 * makes the server the single source of truth instead.
 *
 * `AuthProvider` already does exactly this on mount, but its copy is private to
 * the provider and `contexts/auth.tsx` is login-frozen under SOP §1.4. This
 * hook reaches the same result through the public `setUser`, so the frozen file
 * stays untouched.
 *
 * The response-shape fallback chain mirrors the provider's on purpose: the API
 * has returned all three shapes, and a mismatch here would reintroduce the
 * drift this exists to remove.
 *
 * Returns true when the cached user was replaced. Never throws — a failed
 * refresh leaves the previous user in place rather than blanking the screen
 * mid-session, so callers can ignore the result unless they want to react to it.
 */
export function useRefreshUser() {
  const { setUser } = useAuth()

  return useCallback(async (): Promise<boolean> => {
    try {
      const response = await UserAPI.me()
      if (response?.status !== 200) return false

      const nextUser =
        response?.data?.user ?? response?.data?.data?.user ?? response?.data

      if (!nextUser || typeof nextUser !== "object") return false

      setUser(nextUser)
      return true
    } catch (error) {
      // A refresh that fails is not a session problem — the save it followed
      // already succeeded. Clearing the user here would sign the person out on
      // a transient network blip. Auth failures are handled by the provider and
      // by the axios 401 interceptor.
      console.warn("[settings] could not refresh the cached user", error)
      return false
    }
  }, [setUser])
}
