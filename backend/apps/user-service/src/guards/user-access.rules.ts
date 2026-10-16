/**
 * Access rules for the /users routes.
 *
 * These routes carry a global JwtAuthGuard, so a caller must be signed in,
 * but nothing checks *which* user they are. `updateUser` is
 * `Object.assign(user, dto)` and `UpdateUserDto` is a PartialType of
 * `CreateUserDto`, which includes `role?: UserRole` where UserRole has ADMIN.
 * So today any signed-in user can edit, delete or re-role any other account,
 * and list every user.
 *
 * The rules live here as a pure function so they can be unit tested and so
 * the guard stays a thin wrapper. Nothing is rejected until
 * USER_ACCESS_MODE=enforce; see user-access.guard.ts.
 */

export type UserAccessViolation = 'cross-user' | 'role-escalation' | 'list-all'

export interface UserAccessInput {
  /** `sub` from the verified token. */
  callerId?: string
  /** The :id route parameter, when the route has one. */
  targetId?: string
  /** Parsed request body, when there is one. */
  body?: Record<string, unknown>
  method: string
  /** Normalised path, used only for reporting. */
  path: string
}

export interface UserAccessResult {
  violation: UserAccessViolation | null
  /** One line, safe to log: no body contents, no email addresses. */
  reason?: string
}

const ADMIN = 'admin'

/**
 * True when the body tries to grant itself privilege: either `role=ADMIN`
 * (the profile label, which UpdateUserDto exposes) or any `platformRole` at
 * all (the security column, which no DTO exposes — ValidationPipe should
 * reject it with a 400 long before this runs, so seeing one means either a
 * DTO gained the field or the pipe changed).
 */
export function requestsAdminRole(body: Record<string, unknown> | undefined): boolean {
  const role = body?.role
  if (typeof role === 'string' && role.trim().toLowerCase() === ADMIN) return true
  return body?.platformRole !== undefined || body?.platform_role !== undefined
}

export function evaluateUserAccess(input: UserAccessInput): UserAccessResult {
  const { callerId, targetId, body, method, path } = input

  // No verified caller means the global JwtAuthGuard did not run, or the route
  // is @Public. Either way these rules have nothing to compare against.
  if (!callerId) {
    return { violation: null }
  }

  // Granting oneself (or anyone) platform admin through a self-service
  // profile route is never legitimate, whoever the target is. Checked before
  // ownership so it is still reported when a user edits their own record.
  if (requestsAdminRole(body)) {
    return {
      violation: 'role-escalation',
      reason: `${method} ${path} tried to set role=ADMIN (caller=${callerId} target=${targetId ?? 'self'})`,
    }
  }

  if (targetId && targetId !== callerId) {
    return {
      violation: 'cross-user',
      reason: `${method} ${path} touched another user's record (caller=${callerId} target=${targetId})`,
    }
  }

  // GET /users with no id returns every user, paginated. Legitimate for an
  // admin tool, not for an ordinary signed-in caller.
  if (!targetId && method.toUpperCase() === 'GET' && /\/users\/?$/.test(path)) {
    return {
      violation: 'list-all',
      reason: `${method} ${path} listed all users (caller=${callerId})`,
    }
  }

  return { violation: null }
}
