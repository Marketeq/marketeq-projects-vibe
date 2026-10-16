/**
 * The platform role catalogue — the one place roles and their powers are defined.
 *
 * ── Why this file exists ──
 * Role names used to be hardcoded in the guards: `RolesGuard('admin')`,
 * `isRoleAllowed(role, ['admin'])`. That works while there is one role. It
 * stops working the moment there are five, because adding a role then means
 * editing every guard in every service and hoping none were missed.
 *
 * Here, roles are DATA. Adding a role, renaming one, or changing what one can
 * do is an edit to the table below and nothing else. No guard changes, no
 * controller changes, no new files.
 *
 * ── This is a template, and it is deliberately incomplete ──
 * The role specifications are loose and expected to change. Everything marked
 * `provisional` is a starting point, not agreed policy. When the real
 * definition arrives, change the `capabilities` list here; the rest of the
 * platform follows automatically.
 *
 * ── The rule for provisional roles: start under-powered ──
 * A role that turns out to be missing a capability produces a support ticket.
 * A role that turns out to have one too many produces an incident. So a
 * provisional role gets the smallest set that plausibly matches the job, and
 * is widened on request. Do not pre-grant "they'll probably need it".
 *
 * ── Duplicated verbatim ──
 * Same reason as platform-role.core.ts and security-audit.ts: there is no
 * working cross-service import in this monorepo. Copies live in
 * payout-service, checkout-service, time-tracking-service,
 * content-moderation-service and user-service. Change one, change all.
 */

/**
 * Every capability the platform recognises, with what it means.
 *
 * A capability is a thing somebody can DO, named `domain:action`. Guards ask
 * for capabilities; roles hold them. That indirection is the whole point —
 * a new role is a new combination of existing capabilities, and a new feature
 * is a new capability added to the roles that should have it, with no guard
 * rewritten either way.
 *
 * Adding one: add the entry here, then list it on the roles that should hold
 * it. A capability no role holds is simply unreachable, which is a safe
 * default, not a bug.
 */
export const CAPABILITIES: Record<string, string> = {
  // Platform administration — the keys to the platform itself.
  'platform:role:grant': 'Grant or revoke platform roles on other accounts',
  'platform:config:write': 'Change platform-wide configuration',

  // User records.
  'users:read': "Read any account's record",
  'users:write': "Modify any account's record",
  'users:delete': 'Delete an account',

  // Money. Deliberately split three ways: seeing it, approving it, and
  // moving it are different levels of trust and should not travel together.
  'finance:read': 'View transactions, invoices and balances',
  'finance:approve': 'Approve a payout or invoice already in flight',
  'finance:move': 'Move funds — transfers, refunds, manual adjustments',
  'wire:review': 'Review and confirm wire transfers',

  // Content.
  'content:queue:read': 'View the moderation queue',
  'content:moderate': 'Action reported content — remove, restore, suspend',
  'content:appeal:resolve': 'Decide a moderation appeal',

  // Engineering and operations.
  'observability:read': 'Read logs, metrics, traces and health endpoints',
  'release:flag:write': 'Change feature flags and rollout settings',
  'qa:fixture:write': 'Create or reset test data (non-production only)',

  // Reporting.
  'analytics:read': 'View platform analytics and reports',

  // Service-specific administration, kept distinct so a role can hold one
  // without the other.
  'timetracking:admin': 'Administer time-tracking settings, manual time and screenshots',
  'checkout:admin': 'Administer checkout',
}

export type CapabilityId = keyof typeof CAPABILITIES

/** Wildcard. Held only by the top role; matches every capability, including ones added later. */
export const ALL_CAPABILITIES = '*'

export interface PlatformRoleDefinition {
  /** Stored in the token claim and in PLATFORM_ROLE_ASSIGNMENTS. Lower-case, stable — renaming one is a migration. */
  id: string
  /** For humans and log lines. */
  label: string
  /**
   * Relative authority, for display and ordering only.
   *
   * Rank does NOT grant anything. A higher-ranked role does not inherit a
   * lower one's capabilities, because "developer outranks QA" should not
   * silently hand developers the power to rewrite test data in production.
   * Every capability a role holds is listed explicitly or composed through
   * `inherits`. Implicit inheritance is how privilege creeps.
   */
  rank: number
  /**
   * `confirmed` — the definition is agreed.
   * `provisional` — a working guess. Expect it to change; keep it minimal.
   */
  status: 'confirmed' | 'provisional'
  /** One line: whose job this is. */
  summary: string
  /** Capabilities held directly. `[ALL_CAPABILITIES]` for the top role. */
  capabilities: string[]
  /** Optional composition — role ids whose capabilities are also held. Explicit, not rank-based. */
  inherits?: string[]
}

/**
 * The roles.
 *
 * Confirmed: admin is the platform owner and holds everything.
 * Provisional: everything else. The job titles are known; the exact powers
 * are not, so each starts with the least that plausibly fits.
 */
export const PLATFORM_ROLE_CATALOGUE: PlatformRoleDefinition[] = [
  {
    id: 'admin',
    label: 'Administrator / Owner',
    rank: 100,
    status: 'confirmed',
    summary: 'The platform owner. Everything, including granting roles to others.',
    // The wildcard is deliberate: a capability added next year is held by the
    // owner the moment it exists, with no edit here. If owner and admin ever
    // need separating, add a higher-ranked `owner` role holding the wildcard
    // and narrow this one — no guard anywhere changes.
    capabilities: [ALL_CAPABILITIES],
  },
  {
    id: 'developer',
    label: 'Developer',
    rank: 60,
    status: 'provisional',
    summary: 'Builds and operates the platform. Diagnosis and release control, not money or user data.',
    // Note what is absent: no users:write, no finance:*. Production access to
    // customer records is a separate decision from shipping code, and the two
    // are routinely conflated. If developers do need user data to debug, add
    // users:read deliberately rather than by default.
    capabilities: ['observability:read', 'release:flag:write', 'analytics:read'],
  },
  {
    id: 'qa',
    label: 'Quality Assurance',
    rank: 40,
    status: 'provisional',
    summary: 'Tests the platform. Reads diagnostics, manages test data outside production.',
    // qa:fixture:write is environment-scoped by the code that honours it, not
    // by this catalogue. See the note in the enforcement section of the docs.
    capabilities: ['observability:read', 'qa:fixture:write', 'analytics:read'],
  },
  {
    id: 'product-manager',
    label: 'Product Manager',
    rank: 40,
    status: 'provisional',
    summary: 'Owns what gets built. Reads reporting and the moderation queue; changes nothing operational.',
    // Starts read-only on purpose. Moderation *action* is a plausible
    // addition, but acting on user content is a meaningful power and should
    // be granted on request rather than assumed from the job title.
    capabilities: ['analytics:read', 'content:queue:read'],
  },
  {
    id: 'finance',
    label: 'Finance',
    rank: 60,
    status: 'provisional',
    summary: 'Reviews and approves money movement. Cannot move funds directly.',
    // Carried over from the first version of this model. Note the split:
    // approve yes, move no. Whoever authorises a payment should not also be
    // able to execute an arbitrary one.
    capabilities: ['finance:read', 'finance:approve', 'wire:review'],
  },
  {
    id: 'support',
    label: 'Support',
    rank: 40,
    status: 'provisional',
    summary: 'Answers tickets. Reads user records; changes nothing.',
    // Carried over. Read-only deliberately: a support role that can edit
    // accounts is the classic social-engineering target.
    capabilities: ['users:read', 'analytics:read'],
  },
]

const BY_ID = new Map(PLATFORM_ROLE_CATALOGUE.map((r) => [r.id, r]))

/** Role ids, for validating an assignment before it is honoured. */
export const PLATFORM_ROLES: readonly string[] = PLATFORM_ROLE_CATALOGUE.map((r) => r.id)

export const isPlatformRole = (value: unknown): boolean =>
  typeof value === 'string' && BY_ID.has(value.trim().toLowerCase())

export const getRoleDefinition = (roleId: string | undefined): PlatformRoleDefinition | undefined =>
  roleId ? BY_ID.get(roleId.trim().toLowerCase()) : undefined

export const isKnownCapability = (capability: string): boolean =>
  Object.prototype.hasOwnProperty.call(CAPABILITIES, capability)

/**
 * Everything a role can do, with `inherits` resolved.
 *
 * Returns `['*']` for the wildcard holder rather than expanding it, so the
 * wildcard keeps covering capabilities that do not exist yet.
 * Cycles in `inherits` are survived rather than hung on.
 */
export function capabilitiesOf(roleId: string | undefined, seen = new Set<string>()): string[] {
  const def = getRoleDefinition(roleId)
  if (!def) return []
  if (seen.has(def.id)) return []
  seen.add(def.id)

  if (def.capabilities.includes(ALL_CAPABILITIES)) return [ALL_CAPABILITIES]

  const out = new Set(def.capabilities)
  for (const parent of def.inherits ?? []) {
    for (const cap of capabilitiesOf(parent, seen)) {
      if (cap === ALL_CAPABILITIES) return [ALL_CAPABILITIES]
      out.add(cap)
    }
  }
  return [...out]
}
