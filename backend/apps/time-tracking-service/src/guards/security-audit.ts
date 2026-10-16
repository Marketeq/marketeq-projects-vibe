/**
 * Security audit log — who did what, to whom, and whether it was allowed.
 *
 * ── Why this file is duplicated ──
 * Same reason as platform-role.core.ts: there is no working cross-service
 * import in this monorepo. Copied verbatim into user-service, payout-service,
 * checkout-service, time-tracking-service and content-moderation-service.
 * Change one, change all of them.
 *
 * ── What it is not ──
 * Several services already keep business audit trails (payout_audit_log,
 * transaction audit_logs, contracts audit). Those record what happened to an
 * object. This records what a PRIVILEGED ACTOR did, which is a different
 * question and needs a single consistent shape across services so one query
 * answers "what has the admin account done".
 *
 * ── Two layers, on purpose ──
 *  1. A structured line on stdout, always. Needs no database, no migration
 *     and no configuration, so it works in every service the moment the file
 *     is copied in, and it still works if the database is unreachable.
 *  2. An optional durable sink. A service that wants rows in a table calls
 *     setAuditSink() at bootstrap. Only user-service does so far; everything
 *     else is stdout-only. Platform log retention is finite, so anything that
 *     has to survive an incident review belongs in the table.
 *
 * ── Rules ──
 * An audit write must never break the request it is describing. Every call
 * here is wrapped, and a failing sink is reported once per minute rather than
 * thrown. Losing an audit line is bad; failing a payout because the audit
 * table was busy is worse.
 *
 * Nothing secret goes in a line: no tokens, no password material, no request
 * bodies. Identifiers and the route only.
 */
import { Logger } from '@nestjs/common';

export type AuditOutcome = 'allowed' | 'denied';

export interface AuditEvent {
  /** Caller's user id, or `service:<name>` for an internal token, or `anonymous`. */
  actor: string;
  /** The caller's platformRole claim, or `none`. */
  actorRole: string;
  /** `METHOD /path`. */
  action: string;
  /** The object acted on, when the route names one. */
  target?: string;
  outcome: AuditOutcome;
  /** Short, safe explanation. No bodies, no secrets. */
  reason?: string;
  ip?: string;
  /** `x-request-id` when the caller or gateway supplied one. */
  requestId?: string;
  at: string;
}

export type AuditSink = (event: AuditEvent) => void | Promise<void>;

const logger = new Logger('SecurityAudit');
let sink: AuditSink | null = null;
let lastSinkErrorAt = 0;

/** Registered at bootstrap by a service that has somewhere durable to put these. */
export function setAuditSink(next: AuditSink | null): void {
  sink = next;
}

const clean = (value: unknown): string => {
  if (value === undefined || value === null) return '-';
  const text = String(value).replace(/[\s"]+/g, '_');
  return text.length > 200 ? `${text.slice(0, 200)}…` : text || '-';
};

/** One line, stable field order, greppable by the `AUDIT` prefix. */
export function formatAuditLine(event: AuditEvent): string {
  return [
    'AUDIT',
    `outcome=${event.outcome}`,
    `actor=${clean(event.actor)}`,
    `role=${clean(event.actorRole)}`,
    `action=${clean(event.action)}`,
    `target=${clean(event.target)}`,
    `ip=${clean(event.ip)}`,
    `requestId=${clean(event.requestId)}`,
    `at=${event.at}`,
    event.reason ? `reason=${clean(event.reason)}` : '',
  ]
    .filter(Boolean)
    .join(' ');
}

export function recordAudit(event: Omit<AuditEvent, 'at'> & { at?: string }): void {
  const full: AuditEvent = { ...event, at: event.at ?? new Date().toISOString() };

  try {
    if (full.outcome === 'denied') logger.warn(formatAuditLine(full));
    else logger.log(formatAuditLine(full));
  } catch {
    /* logging must never throw into the request path */
  }

  if (!sink) return;
  try {
    const result = sink(full);
    if (result && typeof (result as Promise<void>).catch === 'function') {
      (result as Promise<void>).catch(reportSinkFailure);
    }
  } catch (err) {
    reportSinkFailure(err);
  }
}

function reportSinkFailure(err: unknown): void {
  const now = Date.now();
  if (now - lastSinkErrorAt < 60_000) return;
  lastSinkErrorAt = now;
  logger.error(
    `durable audit sink failed; the stdout line above is the only record. reason=${
      (err as Error)?.message ?? 'unknown'
    }`,
  );
}

/** The caller's identity as the audit log should name them. */
export function auditActor(req: any): { actor: string; actorRole: string } {
  const user = req?.user;
  const id = user?.sub ?? user?.userId ?? user?.id;
  if (id) {
    return { actor: String(id), actorRole: String(user?.platformRole ?? 'none') };
  }
  const internal = req?.headers?.['x-internal-token'] ?? req?.headers?.['x-service-token'];
  return { actor: internal ? 'service:internal-token' : 'anonymous', actorRole: 'none' };
}

/** Fills in the fields every call site would otherwise repeat. */
export function auditFromRequest(
  req: any,
  over: { outcome: AuditOutcome; target?: string; reason?: string },
): void {
  const { actor, actorRole } = auditActor(req);
  recordAudit({
    actor,
    actorRole,
    action: `${req?.method ?? '?'} ${(req?.originalUrl || req?.url || '').split('?')[0]}`,
    target: over.target ?? req?.params?.id,
    outcome: over.outcome,
    reason: over.reason,
    ip: req?.ip ?? req?.headers?.['x-forwarded-for'],
    requestId: req?.headers?.['x-request-id'],
  });
}

/** Test seam. */
export function resetAuditSink(): void {
  sink = null;
  lastSinkErrorAt = 0;
}
