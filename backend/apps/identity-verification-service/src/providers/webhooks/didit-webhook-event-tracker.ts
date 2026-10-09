// Pure, DB-agnostic checks for duplicate / unknown-session / out-of-order
// webhook events. Deliberately take their lookup data as plain arguments
// rather than querying a real store — the real backing store (a table of
// processed event ids, a table of session ids we issued, per-session last-
// seen timestamps) is an orchestration/schema decision not yet agreed,
// exactly the dependency this pass is reporting rather than inventing.
// These functions are the logic a real implementation would call once
// that store exists; they are fully testable offline today without it.

export interface DuplicateEventCheckResult {
  isDuplicate: boolean;
}

/** `processedEventIds` stands in for a real "have we already handled this
 * event_id" lookup (e.g. a unique column, exactly like the existing
 * webhook handler's `vendor_session_id` idempotency check — but keyed on
 * `event_id` here, since Didit can redeliver the same event_id verbatim,
 * confirmed by docs: "webhooks may be redelivered.../ idempotent on
 * vendor_session_id" for the OLD placeholder scheme; the real envelope's
 * natural idempotency key is `event_id`). */
export function checkDuplicateEvent(
  eventId: string,
  processedEventIds: ReadonlySet<string>,
): DuplicateEventCheckResult {
  return { isDuplicate: processedEventIds.has(eventId) };
}

export interface UnknownSessionCheckResult {
  isUnknown: boolean;
}

/** `knownSessionIds` stands in for a real lookup of "did we create or
 * otherwise expect this session_id" (e.g. our own pending-session /
 * document-check-session records). A webhook for a session_id we never
 * issued must never be trusted enough to change any status. */
export function checkUnknownSession(
  sessionId: string,
  knownSessionIds: ReadonlySet<string>,
): UnknownSessionCheckResult {
  return { isUnknown: !knownSessionIds.has(sessionId) };
}

export interface OutOfOrderCheckResult {
  isOutOfOrder: boolean;
}

/** `lastSeenTimestampForSession` stands in for a real per-session
 * high-water-mark lookup. An event with a `timestamp` at or before the
 * last one already processed for that session is out of order — e.g. a
 * "Not Started" or "In Review" delivery arriving after an "Approved" one
 * already landed, which must never be allowed to regress a decision. */
export function checkOutOfOrder(
  sessionId: string,
  eventTimestamp: number,
  lastSeenTimestampForSession: ReadonlyMap<string, number>,
): OutOfOrderCheckResult {
  const lastSeen = lastSeenTimestampForSession.get(sessionId);
  if (lastSeen === undefined) return { isOutOfOrder: false };
  return { isOutOfOrder: eventTimestamp <= lastSeen };
}
