// apps/time-tracking-service/src/identity-gate/time-tracker-gate.guard.ts
// Account-verification gate G8: an unverified talent (gate_open = false) cannot
// download the desktop installer, start a session, add or edit time inside a
// running session (entries, breaks, idle events), close a session, or submit
// manual time. Verified talents and talents inside the 30-day grace period
// (gate_open = true) are unaffected.
//
// Runs as a route guard, AFTER the class-level auth guard (Bearer/JWT, so an
// unauthenticated caller learns nothing) and BEFORE the global ValidationPipe,
// the service and every repository call. A closed or unanswered gate therefore
// leaves no session, entry, break, idle, manual-time, event, earnings or
// notification side effect.
//
// Whose gate: the acting user (JWT subject, or the gateway-forwarded
// x-user-id) AND the owner of the record being changed (the session's userId).
// They are normally the same person; when they differ both must be open.
// Read-only routes carry no gate.
import { applyDecorators, CanActivate, ExecutionContext, ForbiddenException, Injectable, NotFoundException, SetMetadata, UnauthorizedException, UseGuards } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Session } from '../sessions/session.entity';
import { TimeEntry } from '../entities/time-entry.entity';
import { BreakEvent } from '../entities/break-event.entity';
import { IdentityVerificationGateClient } from './identity-verification-gate.client';
import { VerificationRequiredException } from './identity-gate.exceptions';

/** Where the record owner comes from, besides the acting user. */
export interface TimeTrackerGateOptions {
  /** Route param holding a session id; the session's userId is also gated. */
  session?: string;
  /** Route param holding a time-entry id (owner = its session's user). */
  entry?: string;
  /** Route param holding a break id (owner = its session's user). */
  breakEvent?: string;
}

const TIME_TRACKER_GATE = 'time-tracker-gate:options';

/** Gate a route behind G8. Adds the guard and its metadata in one decorator. */
export const TimeTrackerGate = (options: TimeTrackerGateOptions = {}) =>
  applyDecorators(SetMetadata(TIME_TRACKER_GATE, options), UseGuards(TimeTrackerGateGuard));

function nonEmpty(v: unknown): string | null {
  return typeof v === 'string' && v.trim().length > 0 ? v.trim() : null;
}

@Injectable()
export class TimeTrackerGateGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly gateClient: IdentityVerificationGateClient,
    @InjectRepository(Session) private readonly sessions: Repository<Session>,
    @InjectRepository(TimeEntry) private readonly entries: Repository<TimeEntry>,
    @InjectRepository(BreakEvent) private readonly breaks: Repository<BreakEvent>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const options = this.reflector.get<TimeTrackerGateOptions>(TIME_TRACKER_GATE, context.getHandler()) ?? {};
    const req = context.switchToHttp().getRequest();

    const actorId = nonEmpty(req.user?.sub) ?? nonEmpty(req.headers?.['x-user-id']);
    const ownerId = await this.resolveOwner(req, options);

    const subjects: string[] = [];
    for (const id of [actorId, ownerId]) if (id && !subjects.includes(id)) subjects.push(id);
    if (subjects.length === 0) {
      // Nobody to gate: refuse without writing rather than let an ownerless
      // write through.
      if (options.session || options.entry || options.breakEvent) {
        throw new NotFoundException('Not found');
      }
      throw new UnauthorizedException('Missing user identity');
    }

    for (const subjectId of subjects) {
      const decision = await this.gateClient.checkGate(subjectId);
      if (decision.gateOpen) continue;
      // The acting talent (or a machine acting for the owner) may be told what
      // is outstanding; a different account's state is never revealed.
      if (subjectId === actorId || !actorId) {
        throw new VerificationRequiredException(
          decision.missingRequirements as 'identity' | 'location' | 'both',
        );
      }
      throw new ForbiddenException('Access denied');
    }
    return true;
  }

  private async resolveOwner(req: any, options: TimeTrackerGateOptions): Promise<string | null> {
    let sessionId: string | null = null;
    if (options.session) sessionId = nonEmpty(req.params?.[options.session]);
    else if (options.entry) {
      const id = nonEmpty(req.params?.[options.entry]);
      sessionId = id ? ((await this.entries.findOneBy({ id }))?.sessionId ?? null) : null;
    } else if (options.breakEvent) {
      const id = nonEmpty(req.params?.[options.breakEvent]);
      sessionId = id ? ((await this.breaks.findOneBy({ id }))?.sessionId ?? null) : null;
    }
    if (!sessionId) return null;
    return (await this.sessions.findOneBy({ id: sessionId }))?.userId ?? null;
  }
}
