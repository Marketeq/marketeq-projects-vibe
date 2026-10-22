import { Injectable } from '@nestjs/common';
import { AccountGateStateService } from './account-gate-state.service';

/**
 * G5 - the one rule behind every client-facing roster: a member, assignee,
 * owner or listing is shown only when its linked platform account has a KNOWN
 * OPEN gate (verified, or inside the 30-day grace window).
 *
 *   known open                      -> shown
 *   known closed                    -> omitted
 *   state never received            -> omitted (and queued to be learned)
 *   no platform account (email-only) -> omitted (the caller passes no id)
 *
 * This only decides DISPLAY. It never removes anyone from a team or project,
 * edits a membership, unpublishes or deletes a listing: visibility returns by
 * itself when the gate opens and the new state arrives.
 *
 * The answer comes from the local last-known state (AccountGateStateService),
 * never from a live identity lookup, so it costs one local query per response
 * however many members it covers, and keeps working when identity or RabbitMQ
 * is unavailable. Owner / internal (management) views must not call this - they
 * list every member.
 */
@Injectable()
export class RosterGateService {
  constructor(private readonly state: AccountGateStateService) {}

  visibleUserIds(ids: Iterable<string | null | undefined>): Promise<Set<string>> {
    return this.state.knownOpen(ids);
  }
}
