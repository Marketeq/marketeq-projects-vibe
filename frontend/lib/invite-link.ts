/**
 * Invite context carried on the invite URL.
 *
 * The invitations backend stores only `team_id` / `team_name`, so the company
 * an invitee is being assigned to, and who invited them, travel on the link
 * itself. The invite dialog writes them with `appendInviteContext`, and the
 * accept page forwards them to `/invite/setup`, which reads them back with
 * `readInviteContext`.
 */

export interface InviteContext {
  company?: string
  companyId?: string
  inviter?: string
  inviterHandle?: string
  role?: string
}

export const INVITE_CONTEXT_KEYS: (keyof InviteContext)[] = [
  "company",
  "companyId",
  "inviter",
  "inviterHandle",
  "role",
]

export const appendInviteContext = (
  url: string,
  context: InviteContext
): string => {
  const entries = INVITE_CONTEXT_KEYS.map(
    (key) => [key, context[key]?.trim()] as const
  ).filter((entry): entry is readonly [keyof InviteContext, string] =>
    Boolean(entry[1])
  )

  if (!entries.length) return url

  const query = new URLSearchParams()
  entries.forEach(([key, value]) => query.set(key, value))

  return `${url}${url.includes("?") ? "&" : "?"}${query.toString()}`
}

export const readInviteContext = (
  params: Pick<URLSearchParams, "get">
): InviteContext => {
  const context: InviteContext = {}
  INVITE_CONTEXT_KEYS.forEach((key) => {
    const value = params.get(key)
    if (value) context[key] = value
  })
  return context
}

export const hasInviteContext = (context: InviteContext): boolean =>
  INVITE_CONTEXT_KEYS.some((key) => Boolean(context[key]))

/**
 * Reads the context an auth page can see.
 *
 * `/sign-in` and `/sign-up` are reached with the invite URL folded into their
 * `redirect` parameter, so the context has to be recovered from inside it,
 * with a direct `?company=…` on the auth URL itself taking precedence.
 */
export const readInviteContextForAuthPage = (
  params: Pick<URLSearchParams, "get">
): InviteContext => {
  const direct = readInviteContext(params)

  const redirect = params.get("redirect")
  if (!redirect) return direct

  const queryStart = redirect.indexOf("?")
  if (queryStart === -1) return direct

  const nested = readInviteContext(
    new URLSearchParams(redirect.slice(queryStart + 1))
  )

  // Merge per key, not all-or-nothing: the auth URL often carries only part of
  // the context (say `inviter`) while the rest still rides inside `redirect`.
  return { ...nested, ...direct }
}

/**
 * Reads the invite token an auth page can see.
 *
 * The token may appear as a direct `token` query param on the auth URL, or,
 * more commonly, nested inside its `redirect` param (e.g.
 * `redirect=/invite/accept?token=…`). This is what lets `/sign-in` and
 * `/sign-up` resolve the invite details (inviter, company) dynamically via
 * `GET /invitations/preview` instead of relying on URL context params that a
 * link may or may not carry.
 */
export const readInviteTokenForAuthPage = (
  params: Pick<URLSearchParams, "get">
): string | undefined => {
  const direct = params.get("token")
  if (direct) return direct

  const redirect = params.get("redirect")
  if (!redirect) return undefined

  const queryStart = redirect.indexOf("?")
  if (queryStart === -1) return undefined

  return new URLSearchParams(redirect.slice(queryStart + 1)).get("token") || undefined
}
