// G7: the listing/project team roster is saved through endpoints that add people
// one by one against a verification gate and answer with ONE RESULT PER ENTRY SENT,
// in the order sent (see backend docs/decisions/G7-member-add-gate-decision.md):
//
//   PUT /publish/project/:id/members  ->  { members, results }
//   PUT /publish/project/:id          ->  project + (when teamMemberIds was sent) memberResults
//
// A person who is not added never fails the request and never rolls back the others,
// so the caller has to read the results to tell the owner who was left out. This is
// pure logic (no UI): the pages show the messages with their existing toast.

export type MemberAddStatus =
  | "added"
  | "already_member"
  | "blocked_verification"
  | "invalid"
  | "duplicate"

export interface MemberAddResult {
  /** Position of the entry that was sent (results and entries are 1:1, in order). */
  index: number
  userId: string | null
  added: boolean
  status: MemberAddStatus
  error?: string
  message?: string
}

const STATUSES: readonly string[] = [
  "added",
  "already_member",
  "blocked_verification",
  "invalid",
  "duplicate",
]

/** Accepts anything the server (or an older server) may send and returns only well-formed results. */
export function readResults(raw: unknown): MemberAddResult[] {
  if (!Array.isArray(raw)) return []
  return raw.filter(
    (r): r is MemberAddResult =>
      !!r &&
      typeof r === "object" &&
      typeof (r as any).index === "number" &&
      STATUSES.includes((r as any).status)
  )
}

/**
 * Reads a `PUT /publish/project/:id/members` response. Handles the axios wrapper
 * (`{ data }`), the new `{ members, results }` body, and the previous bare array
 * (an older server): `members` is always an array, `results` is empty when the server
 * sent none.
 */
export function readSaveMembersResponse(response: unknown): {
  members: any[]
  results: MemberAddResult[]
} {
  const body = (response as any)?.data ?? response
  if (Array.isArray(body)) return { members: body, results: [] }
  return {
    members: Array.isArray(body?.members) ? body.members : [],
    results: readResults(body?.results),
  }
}

/** Reads the `memberResults` a draft/project update returns when `teamMemberIds` was sent. */
export function readDraftMemberResults(response: unknown): MemberAddResult[] {
  const body = (response as any)?.data ?? response
  return readResults(body?.memberResults ?? body?.data?.memberResults)
}

export type NotAddedKind =
  | "verification"
  | "invalid"
  | "duplicate"
  | "already_member"

export interface NotAdded {
  kind: NotAddedKind
  index: number
  userId: string | null
  /** Neutral, owner-facing sentence. Never says why a person is not eligible. */
  message: string
}

/**
 * The people the owner needs to hear about, one entry per result that was not added,
 * with the four outcomes kept distinct. The autosave sends the WHOLE roster every
 * time, so `already_member` is only announced for people the owner just chose to add
 * (`announceAlreadyMember`); otherwise it is routine and is not reported.
 *
 * Copy is neutral by design: it never repeats `missingRequirements` or anything else
 * about another person's verification (and the server does not send it).
 */
export function notAdded(
  results: MemberAddResult[],
  labelFor: (userId: string | null, index: number) => string,
  announceAlreadyMember: ReadonlySet<string> = new Set()
): NotAdded[] {
  const out: NotAdded[] = []
  for (const r of results) {
    const who = labelFor(r.userId, r.index)
    if (r.status === "blocked_verification") {
      out.push({
        kind: "verification",
        index: r.index,
        userId: r.userId,
        message: `Couldn’t add ${who}. Their account is not currently eligible to join the team.`,
      })
    } else if (r.status === "invalid") {
      out.push({
        kind: "invalid",
        index: r.index,
        userId: r.userId,
        message: `Couldn’t add ${who}. This isn’t a valid team member.`,
      })
    } else if (r.status === "duplicate") {
      out.push({
        kind: "duplicate",
        index: r.index,
        userId: r.userId,
        message: `${who} was listed more than once, so they were only added once.`,
      })
    } else if (
      r.status === "already_member" &&
      r.userId &&
      announceAlreadyMember.has(r.userId)
    ) {
      out.push({
        kind: "already_member",
        index: r.index,
        userId: r.userId,
        message: `${who} is already on the team.`,
      })
    }
  }
  return out
}

/** User ids that were NOT added and so must not stay in the optimistic roster the page is showing. */
export function idsToDrop(problems: NotAdded[]): Set<string> {
  return new Set(
    problems
      .filter((p) => p.kind === "verification" || p.kind === "invalid")
      .flatMap((p) => (p.userId ? [p.userId] : []))
  )
}

/** True when the server refused the whole request because the gate could not be evaluated. */
export function isGateUnavailable(err: unknown): boolean {
  const e = err as any
  return (
    e?.response?.status === 503 &&
    e?.response?.data?.error === "IDENTITY_VERIFICATION_UNAVAILABLE"
  )
}

/** Shown when the gate service is unavailable: nothing was added, and the page must not say it was. */
export const TEAM_SAVE_UNAVAILABLE_MESSAGE =
  "We couldn’t update the team right now. Please try again shortly."
