import { Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { AuditEvent, setAuditSink } from './security-audit';

/**
 * Writes security audit events into `security_audit.privileged_actions`.
 *
 * ── Raw SQL, not an entity ──
 * The table lives outside this service's schema on purpose (it is shared),
 * and registering an entity for it would pull it into user-service's
 * synchronize/metadata surface and imply ownership. One INSERT is clearer
 * than that, and it means another service adopts this by copying the file
 * and passing its own DataSource — no entity registration, no migration.
 *
 * ── Never blocks, never throws ──
 * The insert is fired without being awaited by the request path, and every
 * failure is swallowed by security-audit.ts, which reports at most once a
 * minute. The stdout line is written first and unconditionally, so a
 * database problem downgrades the audit trail rather than losing it, and
 * never fails the action being audited.
 *
 * ── Truncation ──
 * Values are cut to the column widths here rather than letting Postgres
 * reject the row. A slightly truncated audit line beats no audit line.
 */
const SERVICE_NAME = 'user-service';

const cut = (value: string | undefined | null, max: number): string | null => {
  if (value === undefined || value === null) return null;
  const text = String(value);
  return text.length > max ? text.slice(0, max) : text;
};

export function registerDatabaseAuditSink(dataSource: DataSource): void {
  const logger = new Logger('SecurityAudit');

  if (!dataSource?.isInitialized) {
    logger.warn(
      'data source not initialised; security audit stays stdout-only for this process',
    );
    return;
  }

  setAuditSink(async (event: AuditEvent) => {
    await dataSource.query(
      `INSERT INTO security_audit.privileged_actions
         ("actor","actor_role","action","target","outcome","reason","ip","request_id","at","service")
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
      [
        cut(event.actor, 128) ?? 'anonymous',
        cut(event.actorRole, 32) ?? 'none',
        cut(event.action, 256) ?? '-',
        cut(event.target, 128),
        cut(event.outcome, 16),
        cut(event.reason, 256),
        cut(event.ip, 64),
        cut(event.requestId, 128),
        event.at,
        SERVICE_NAME,
      ],
    );
  });

  logger.log('security audit sink registered (security_audit.privileged_actions)');
}
