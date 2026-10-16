import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  Logger,
} from '@nestjs/common'
import { timingSafeEqual } from 'crypto'
import { evaluateUserAccess } from './user-access.rules'
import { auditFromRequest } from './security-audit'

/**
 * Ownership and privilege checks for the /users routes.
 *
 * ── Two modes, on purpose ──
 * The three violations this guard detects do not carry the same risk of
 * breaking a legitimate caller, so they are not governed by the same switch.
 *
 *  role-escalation  ENFORCED by default (USER_ACCESS_ESCALATION_MODE).
 *      Setting a privileged role through a self-service profile route is
 *      never legitimate, from any caller, so there is nothing to observe
 *      first. Rejecting it immediately is what makes it safe to put a
 *      `platformRole` claim on access tokens.
 *
 *  cross-user       MONITOR by default (USER_ACCESS_MODE).
 *  list-all         MONITOR by default (USER_ACCESS_MODE).
 *      These two may well have legitimate callers — an internal tool, a CMS
 *      sync path that does not use the service token. They stay log-only
 *      until those callers are known. This is the hole that is still open.
 *
 * USER_ACCESS_MODE=off is the kill switch and disables all three.
 *
 * Service-to-service callers are exempt throughout: auth-service and the CMS
 * sync profiles for other users through this service using the shared
 * internal token, which is a legitimate cross-user write.
 */
@Injectable()
export class UserAccessGuard implements CanActivate {
  private readonly logger = new Logger('UserAccess')

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest()

    if (this.isInternalServiceCall(req)) return true

    // A caller holding a platform role is doing privileged work on the user
    // records, whether or not it trips a violation. That is exactly what the
    // audit log is for, so it is recorded before any decision is taken.
    if (req.user?.platformRole) {
      auditFromRequest(req, { outcome: 'allowed' })
    }

    const baseMode = (process.env.USER_ACCESS_MODE || 'monitor').trim().toLowerCase()
    if (baseMode === 'off') return true

    const { violation, reason } = evaluateUserAccess({
      callerId: req.user?.sub ?? req.user?.userId,
      targetId: req.params?.id,
      body: req.body,
      method: req.method,
      path: (req.originalUrl || req.url || '').split('?')[0],
    })

    if (!violation) return true

    const mode = this.modeFor(violation, baseMode)
    if (mode === 'off') return true

    this.logger.warn(
      `${mode === 'enforce' ? 'BLOCKED' : 'WOULD BLOCK'} [${violation}] ${reason}`,
    )

    if (mode !== 'enforce') return true

    // Only enforced refusals are audited as denials. A monitor-mode line is
    // an observation, not a decision, and recording it as 'denied' would
    // make the audit log disagree with what actually happened.
    auditFromRequest(req, { outcome: 'denied', reason: violation })

    throw new ForbiddenException({
      code: 'FORBIDDEN',
      message:
        violation === 'role-escalation'
          ? 'You cannot set that role.'
          : 'You can only access your own account.',
    })
  }

  /**
   * Privilege escalation has its own switch and defaults to enforce; the two
   * ownership checks follow USER_ACCESS_MODE and default to monitor.
   */
  private modeFor(violation: string, baseMode: string): string {
    if (violation !== 'role-escalation') return baseMode
    return (process.env.USER_ACCESS_ESCALATION_MODE || 'enforce').trim().toLowerCase()
  }

  /** auth-service / CMS profile sync, authenticated by the shared internal token. */
  private isInternalServiceCall(req: any): boolean {
    const expected = process.env.INTERNAL_SERVICE_TOKEN
    if (!expected) return false

    const header =
      (req.headers?.['x-internal-token'] as string | undefined) ??
      (req.headers?.['x-service-token'] as string | undefined)

    if (!header || header.length !== expected.length) return false
    try {
      return timingSafeEqual(Buffer.from(header), Buffer.from(expected))
    } catch {
      return false
    }
  }
}
