// frontend/src/lib/api/active-role.ts
import { getPublicApiUrl } from "@/lib/runtime-urls"

/**
 * Which role the account is acting as, persisted server-side.
 *
 * An account can hold both roles, and `role` / `userType` are single-valued
 * profile labels that routinely disagree (most accounts here are stored as
 * role CLIENT with userType talent). Neither can express the active session,
 * and the switcher previously kept its choice in memory only, so it was lost
 * on every reload. This is deliberately separate from `role` and `userType`
 * so nothing that authorises or routes on those changes behaviour.
 */
export async function persistActiveRole(activeRole: string): Promise<void> {
  const base = (getPublicApiUrl() || "http://localhost:4000").replace(/\/$/, "")
  await fetch(`${base}/user/active-role`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ activeRole }),
  })
}
