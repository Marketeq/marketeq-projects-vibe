// src/main/db/repos/__tests__/session.repo.stats.test.ts
import Database from 'better-sqlite3';
import { beforeEach, describe, expect, it } from 'vitest';
import { runMigrations } from '../../migrate';
import { createSessionRepo, type SessionRepo } from '../session.repo';
import { createContractRepo } from '../contract.repo';
import { createTaskRepo } from '../task.repo';
import { createUserRepo } from '../user.repo';
import { createDeviceRepo } from '../device.repo';
import type { SessionRow } from '../../schema';

const USER_ID = 'user-1';
const DEVICE_ID = 'device-1';

function seedFixtures(db: Database.Database) {
  createUserRepo(db).upsert({
    id: USER_ID,
    email: 'talent@example.com',
    display_name: 'Talent',
    avatar_url: null,
    timezone: 'UTC',
    currency: 'USD',
    pending_erasure: 0,
    mirrored_at: Date.now(),
  });
  createDeviceRepo(db).insert({
    id: DEVICE_ID,
    installation_uuid: 'install-1',
    os_name: 'win',
    os_version: '1.0',
    app_version: '1.0.0',
    arch: 'x64',
    created_at: Date.now(),
  });
  const contractRepo = createContractRepo(db);
  const taskRepo = createTaskRepo(db);
  for (const id of ['contract-a', 'contract-b']) {
    contractRepo.upsert({
      id,
      name: id,
      client_name: 'client',
      status: 'active',
      currency: 'USD',
      rate_minor: 5000,
      daily_cap_seconds: null,
      weekly_cap_seconds: null,
      paid_break_allowance_seconds: 0,
      screenshot_interval_seconds: 60,
      mirrored_at: Date.now(),
    });
    taskRepo.upsert({
      id: `task-${id}`,
      contract_id: id,
      name: 'General work',
      archived: 0,
      mirrored_at: Date.now(),
    });
  }
}

function makeSession(overrides: Partial<SessionRow> & { id: string; contract_id: string }): SessionRow {
  const now = Date.now();
  return {
    user_id: USER_ID,
    device_id: DEVICE_ID,
    task_id: `task-${overrides.contract_id}`,
    started_at: now,
    ended_at: now,
    end_reason: 'user_stop',
    billable_seconds: 0,
    paid_break_seconds: 0,
    unpaid_break_seconds: 0,
    idle_seconds: 0,
    disputed: 0,
    synced_at: null,
    created_at: now,
    updated_at: now,
    ...overrides,
  };
}

describe('sessionRepo.sumBillableSecondsByContract', () => {
  let db: Database.Database;
  let sessionRepo: SessionRepo;

  beforeEach(() => {
    db = new Database(':memory:');
    db.pragma('foreign_keys = ON');
    runMigrations(db);
    seedFixtures(db);
    sessionRepo = createSessionRepo(db);
  });

  it('sums billable_seconds for closed sessions within the day window, grouped by contract', () => {
    const startAt = new Date('2026-09-18T00:00:00Z').getTime();
    const endAt = new Date('2026-09-19T00:00:00Z').getTime();
    const mid = new Date('2026-09-18T12:00:00Z').getTime();

    sessionRepo.insert(
      makeSession({ id: 's1', contract_id: 'contract-a', started_at: mid, ended_at: mid + 1000, billable_seconds: 3600 }),
    );
    sessionRepo.insert(
      makeSession({ id: 's2', contract_id: 'contract-b', started_at: mid, ended_at: mid + 1000, billable_seconds: 1800 }),
    );

    const result = sessionRepo.sumBillableSecondsByContract({ userId: USER_ID, startAt, endAt });
    const byContract = Object.fromEntries(result.map((r) => [r.contract_id, r.total_billable_seconds]));
    expect(byContract['contract-a']).toBe(3600);
    expect(byContract['contract-b']).toBe(1800);
  });

  it('excludes sessions with ended_at IS NULL (the currently open session)', () => {
    const startAt = new Date('2026-09-18T00:00:00Z').getTime();
    const endAt = new Date('2026-09-19T00:00:00Z').getTime();
    const mid = new Date('2026-09-18T12:00:00Z').getTime();

    sessionRepo.insert(
      makeSession({ id: 's-open', contract_id: 'contract-a', started_at: mid, ended_at: null, billable_seconds: 0 }),
    );

    const result = sessionRepo.sumBillableSecondsByContract({ userId: USER_ID, startAt, endAt });
    expect(result).toEqual([]);
  });

  it('excludes sessions started before startAt or on/after endAt', () => {
    const startAt = new Date('2026-09-18T00:00:00Z').getTime();
    const endAt = new Date('2026-09-19T00:00:00Z').getTime();

    sessionRepo.insert(
      makeSession({
        id: 's-yesterday',
        contract_id: 'contract-a',
        started_at: new Date('2026-09-17T23:59:59Z').getTime(),
        ended_at: new Date('2026-09-18T00:00:30Z').getTime(),
        billable_seconds: 1000,
      }),
    );
    sessionRepo.insert(
      makeSession({
        id: 's-tomorrow',
        contract_id: 'contract-a',
        started_at: new Date('2026-09-19T00:00:00Z').getTime(),
        ended_at: new Date('2026-09-19T00:10:00Z').getTime(),
        billable_seconds: 2000,
      }),
    );

    const result = sessionRepo.sumBillableSecondsByContract({ userId: USER_ID, startAt, endAt });
    expect(result).toEqual([]);
  });

  it('sums across multiple closed sessions for the same contract in one day', () => {
    const startAt = new Date('2026-09-18T00:00:00Z').getTime();
    const endAt = new Date('2026-09-19T00:00:00Z').getTime();

    sessionRepo.insert(
      makeSession({
        id: 's1',
        contract_id: 'contract-a',
        started_at: new Date('2026-09-18T09:00:00Z').getTime(),
        ended_at: new Date('2026-09-18T10:00:00Z').getTime(),
        billable_seconds: 3600,
      }),
    );
    sessionRepo.insert(
      makeSession({
        id: 's2',
        contract_id: 'contract-a',
        started_at: new Date('2026-09-18T14:00:00Z').getTime(),
        ended_at: new Date('2026-09-18T14:30:00Z').getTime(),
        billable_seconds: 1800,
      }),
    );

    const result = sessionRepo.sumBillableSecondsByContract({ userId: USER_ID, startAt, endAt });
    expect(result).toHaveLength(1);
    expect(result[0]?.total_billable_seconds).toBe(5400);
  });

  it('returns [] when the user has no sessions today', () => {
    const startAt = new Date('2026-09-18T00:00:00Z').getTime();
    const endAt = new Date('2026-09-19T00:00:00Z').getTime();
    const result = sessionRepo.sumBillableSecondsByContract({ userId: USER_ID, startAt, endAt });
    expect(result).toEqual([]);
  });
});
