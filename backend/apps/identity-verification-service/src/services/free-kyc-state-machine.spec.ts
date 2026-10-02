import { FreeKycService } from './free-kyc.service';
import { IdentityVerificationService } from './identity-verification.service';
import {
  computeHostedKycCycleAttemptCount,
  FAILED_FINAL_COOLDOWN_MS,
  getHostedKycCycleAttemptCount,
  hasFailedFinalCooldownElapsed,
} from '../common/attempt-limit/hosted-kyc-attempt-cycle';
import { computeDiditSignatureV2 } from '../providers/webhooks/didit-webhook-signature-v2';
import { HostedKycSession } from '../entities/hosted-kyc-session.entity';
import { IdentityVerificationProfile } from '../entities/identity-verification-profile.entity';
import { VerificationAttempt } from '../entities/verification-attempt.entity';
import { PendingVerificationSession } from '../entities/pending-verification-session.entity';
import { IdentityDocument } from '../entities/identity-document.entity';
import { AttemptReservation } from '../entities/attempt-reservation.entity';
import { ProcessedWebhookEvent } from '../entities/processed-webhook-event.entity';
import {
  HostedKycSessionStatus,
  IdentityVerificationStatus,
  LocationVerificationStatus,
} from '../entities/enums/identity-verification.enums';
import { RetryLimitExceededException } from '../common/errors/domain-exceptions';

// Part 1: state-transition and attempt-cycle correctness for hosted Free KYC.
//
// Everything runs against a small in-memory database. Transactions are
// serialized through a FIFO mutex, which is what the real pessimistic row locks
// (session row + profile row) guarantee, so the concurrency tests exercise the
// service's own idempotency and cycle logic under that ordering. The clock is
// faked and nothing ever sleeps for real.
describe('Free KYC state machine and attempt cycle (Part 1)', () => {
  const SECRET = 'wh-secret';
  const T0 = new Date('2026-10-01T12:00:00.000Z');
  const HOSTED_URL = 'https://verify.didit.me/session/x';

  // The service's own clock is Date.now(); webhook timestamps are whole seconds
  // and are validated against the `nowSeconds` argument, so event time is
  // controlled explicitly and independent of the fake clock.
  let eventSeq = 0;
  const NOW_S = 1_800_000_000;

  beforeEach(() => {
    jest.useFakeTimers({ now: T0, doNotFake: ['nextTick', 'setImmediate', 'queueMicrotask'] });
    eventSeq = 0;
    process.env.DIDIT_FREE_KYC_WORKFLOW_ID = 'wf-kyc';
    process.env.FRONTEND_URL = 'http://localhost:3000/';
    process.env.DIDIT_WEBHOOK_SECRET = SECRET;
    process.env.DIDIT_EXPECTED_ENVIRONMENT = 'sandbox';
    delete process.env.DIDIT_APPLICATION_ID;
  });
  afterEach(() => {
    jest.useRealTimers();
    for (const k of ['DIDIT_FREE_KYC_WORKFLOW_ID', 'FRONTEND_URL', 'DIDIT_WEBHOOK_SECRET', 'DIDIT_EXPECTED_ENVIRONMENT']) delete process.env[k];
  });

  type Row = Record<string, any>;

  function world(init: { profile?: Row; sessions?: Row[]; attempts?: Row[] } = {}) {
    const profile: Row = {
      id: 'profile-1',
      userId: 'user-1',
      identityVerificationStatus: IdentityVerificationStatus.UNSTARTED,
      locationVerificationStatus: LocationVerificationStatus.VERIFIED,
      verifiedHomeCountry: 'US',
      verifiedHomeCountryConfirmedAt: new Date(),
      travelModeActive: false,
      travelClassification: null,
      failedFinalAt: null,
      expiredAt: null,
      ...(init.profile ?? {}),
    };
    const sessions: Row[] = (init.sessions ?? []).map((s) => ({ lastEventTimestamp: null, ...s }));
    const attempts: Row[] = [...(init.attempts ?? [])];
    const events = new Set<string>();
    let rowSeq = sessions.length;
    let didditSeq = 0;

    const inValues = (op: any): any[] | null => (op && Array.isArray(op.value) ? op.value : null);

    const profileRepository = {
      findOne: jest.fn(async () => profile),
      save: jest.fn(async (p: Row) => p),
    };
    const sessionRepository = {
      findOne: jest.fn(async (q: any) => {
        const w = q?.where ?? {};
        if (w.diditSessionId) return sessions.find((s) => s.diditSessionId === w.diditSessionId) ?? null;
        if (w.id) return sessions.find((s) => s.id === w.id) ?? null;
        const statuses = inValues(w.status);
        const matching = sessions
          .filter((s) => s.profileId === w.profileId && (!statuses || statuses.includes(s.status)))
          .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime() || (b.id > a.id ? 1 : -1));
        return matching[0] ?? null;
      }),
      find: jest.fn(async (q: any) => sessions.filter((s) => s.profileId === q?.where?.profileId)),
      create: jest.fn((d: Row) => ({ id: `row-${++rowSeq}`, createdAt: new Date(), lastEventTimestamp: null, ...d })),
      save: jest.fn(async (d: Row) => {
        if (!sessions.includes(d)) sessions.push(d);
        return d;
      }),
    };
    const attemptRepository = {
      find: jest.fn(async (q: any) => {
        const ids = inValues(q?.where?.vendorSessionId);
        return ids ? attempts.filter((a) => ids.includes(a.vendorSessionId)) : [...attempts];
      }),
      findOne: jest.fn(async (q: any) => attempts.find((a) => a.vendorSessionId === q?.where?.vendorSessionId) ?? null),
      insert: jest.fn(async (row: Row) => {
        if (attempts.some((a) => a.vendorSessionId === row.vendorSessionId)) throw Object.assign(new Error('duplicate'), { code: '23505' });
        attempts.push({ id: `attempt-${attempts.length + 1}`, ...row });
      }),
      count: jest.fn(async () => attempts.length),
    };
    const processedRepository = {
      insert: jest.fn(async (row: Row) => {
        if (events.has(row.eventId)) throw Object.assign(new Error('duplicate'), { code: '23505' });
        events.add(row.eventId);
      }),
    };
    const empty = { count: jest.fn(async () => 0), find: jest.fn(async () => []) };
    const byEntity = new Map<unknown, any>([
      [HostedKycSession, sessionRepository],
      [IdentityVerificationProfile, profileRepository],
      [VerificationAttempt, attemptRepository],
      [PendingVerificationSession, empty],
      [IdentityDocument, empty],
      [AttemptReservation, empty],
      [ProcessedWebhookEvent, processedRepository],
    ]);
    const manager = { getRepository: (e: unknown) => byEntity.get(e) };

    // FIFO mutex: stands in for the pessimistic row locks.
    let tail: Promise<unknown> = Promise.resolve();
    const dataSource = {
      transaction: jest.fn((cb: any) => {
        const run = tail.then(() => cb(manager));
        tail = run.catch(() => undefined);
        return run;
      }),
      createQueryRunner: jest.fn(() => ({
        connect: jest.fn(async () => undefined),
        startTransaction: jest.fn(async () => undefined),
        query: jest.fn(async () => []),
        commitTransaction: jest.fn(async () => undefined),
        rollbackTransaction: jest.fn(async () => undefined),
        release: jest.fn(async () => undefined),
        isTransactionActive: true,
      })),
    };
    const provider = {
      // Didit returns the SAME unfinished session for the same vendor_data (the
      // resume path relies on it); a new vendor_data creates a new session.
      createKycSession: jest.fn(async (input: { vendorData: string }) => {
        const existing = sessions.find((s) => s.vendorReference === input.vendorData);
        if (existing) return { sessionId: existing.diditSessionId, url: HOSTED_URL, status: 'In Progress' };
        return { sessionId: `didit-${++didditSeq}`, url: HOSTED_URL, status: 'Not Started' };
      }),
      // Didit's current view of a stored session: still in progress, same owner.
      getSessionDecision: jest.fn(async (sessionId: string) => {
        const row = sessions.find((s) => s.diditSessionId === sessionId);
        return {
          sessionId,
          status: 'In Progress',
          vendorData: row?.vendorReference ?? null,
          workflowId: 'wf-kyc',
          environment: 'sandbox',
          applicationId: null,
        };
      }),
    };
    const service = new FreeKycService(
      profileRepository as any,
      sessionRepository as any,
      attemptRepository as any,
      empty as any,
      empty as any,
      empty as any,
      dataSource as any,
      provider as any,
    );
    // Quiet the expected warn/debug lines.
    jest.spyOn((service as any).logger, 'warn').mockImplementation(() => undefined);
    jest.spyOn((service as any).logger, 'debug').mockImplementation(() => undefined);

    const advance = (ms: number) => jest.setSystemTime(new Date(Date.now() + ms));
    const reconfirmHomeCountry = () => {
      profile.verifiedHomeCountryConfirmedAt = new Date();
    };

    const send = (
      sessionId: string,
      status: string,
      o: { eventId?: string; timestamp?: number; vendorData?: string | null } = {},
    ) => {
      const row = sessions.find((s) => s.diditSessionId === sessionId);
      const body = {
        event_id: o.eventId ?? `evt-${++eventSeq}`,
        session_id: sessionId,
        webhook_type: 'status.updated',
        timestamp: o.timestamp ?? NOW_S - 5,
        created_at: '2026-10-01T12:00:00Z',
        application_id: 'app-1',
        environment: 'sandbox',
        status,
        workflow_id: 'wf-kyc',
        vendor_data: o.vendorData === undefined ? (row?.vendorReference ?? null) : o.vendorData,
        metadata: null,
        decision: null,
      };
      return service.handleWebhook(
        Buffer.from(JSON.stringify(body), 'utf8'),
        { signatureV2: computeDiditSignatureV2(body, SECRET), timestamp: String(NOW_S) },
        NOW_S,
      );
    };

    // Starts a hosted session through the real start path and returns its Didit id.
    const start = async () => {
      await service.startOrResume('user-1');
      return sessions[sessions.length - 1].diditSessionId as string;
    };

    // Stands in for the per-profile advisory lock (pg_advisory_xact_lock) that
    // startOrResume holds: concurrent starts run one at a time, in arrival order.
    const serializeStarts = () => {
      let lockTail: Promise<unknown> = Promise.resolve();
      (service as any).withProfileLock = (_id: string, work: () => Promise<any>) => {
        const next = lockTail.then(work, work);
        lockTail = next.catch(() => undefined);
        return next;
      };
    };

    return { service, profile, sessions, attempts, events, provider, sessionRepository, attemptRepository, advance, reconfirmHomeCountry, send, start, serializeStarts };
  }

  const status = (w: ReturnType<typeof world>) => w.profile.identityVerificationStatus;
  const sessionStatus = (w: ReturnType<typeof world>, id: string) => w.sessions.find((s) => s.diditSessionId === id)?.status;

  // ------------------------------------------------------------------
  describe('every Didit status maps to the right session and profile state', () => {
    const inProgress = IdentityVerificationStatus.IN_PROGRESS;
    it.each([
      ['Not Started', HostedKycSessionStatus.CREATED, inProgress],
      ['In Progress', HostedKycSessionStatus.IN_PROGRESS, inProgress],
      ['Awaiting User', HostedKycSessionStatus.IN_PROGRESS, inProgress],
      ['Resubmitted', HostedKycSessionStatus.IN_PROGRESS, inProgress],
      ['In Review', HostedKycSessionStatus.IN_REVIEW, IdentityVerificationStatus.PENDING],
      ['Approved', HostedKycSessionStatus.APPROVED, IdentityVerificationStatus.VERIFIED],
    ])('%s → session %s, profile %s', async (didit, expectedSession, expectedProfile) => {
      const w = world();
      const id = await w.start();
      await w.send(id, didit);
      expect(sessionStatus(w, id)).toBe(expectedSession);
      expect(status(w)).toBe(expectedProfile);
      expect(w.attempts).toHaveLength(0);
    });

    it.each(['Abandoned', 'Expired'])('%s from in progress → a startable profile, no attempt consumed', async (didit) => {
      const w = world();
      const id = await w.start();
      await w.send(id, didit);
      expect(status(w)).toBe(IdentityVerificationStatus.UNSTARTED);
      expect(w.attempts).toHaveLength(0);
    });

    it('Declined (first) → failed with one attempt', async () => {
      const w = world();
      const id = await w.start();
      await w.send(id, 'Declined');
      expect(sessionStatus(w, id)).toBe(HostedKycSessionStatus.DECLINED);
      expect(status(w)).toBe(IdentityVerificationStatus.FAILED);
      expect(w.attempts).toHaveLength(1);
    });

    it('Kyc Expired on an approved session of a verified profile → expired, with the expiry time recorded', async () => {
      const w = world();
      const id = await w.start();
      await w.send(id, 'Approved', { timestamp: NOW_S - 10 });
      await w.send(id, 'Kyc Expired', { timestamp: NOW_S - 5 });
      expect(sessionStatus(w, id)).toBe(HostedKycSessionStatus.KYC_EXPIRED);
      expect(status(w)).toBe(IdentityVerificationStatus.EXPIRED);
      expect(w.profile.expiredAt).toEqual(T0);
    });

    it('Kyc Expired for a session that was never approved changes nothing', async () => {
      const w = world();
      const id = await w.start();
      await w.send(id, 'Kyc Expired');
      expect(sessionStatus(w, id)).toBe(HostedKycSessionStatus.CREATED);
      expect(status(w)).toBe(IdentityVerificationStatus.IN_PROGRESS);
      expect(w.profile.expiredAt).toBeNull();
    });

    it('Kyc Expired for a profile that is not verified never marks it expired', async () => {
      // An approved session whose profile never became verified (e.g. it was blocked) stays as it was.
      const w = world({
        profile: { identityVerificationStatus: IdentityVerificationStatus.PENDING },
        sessions: [{ id: 'r1', profileId: 'profile-1', diditSessionId: 'didit-x', vendorReference: 'ref-x', status: HostedKycSessionStatus.APPROVED, createdAt: T0 }],
      });
      await w.send('didit-x', 'Kyc Expired');
      expect(status(w)).toBe(IdentityVerificationStatus.PENDING);
      expect(w.profile.expiredAt).toBeNull();
    });

    it('an unrecognized status never changes anything (and never approves)', async () => {
      const w = world();
      const id = await w.start();
      await w.send(id, 'Totally New Status');
      expect(sessionStatus(w, id)).toBe(HostedKycSessionStatus.CREATED);
      expect(status(w)).toBe(IdentityVerificationStatus.IN_PROGRESS);
    });
  });

  // ------------------------------------------------------------------
  describe('in review followed by abandoned or expired', () => {
    it.each(['Abandoned', 'Expired'])('a pending profile whose session becomes %s returns to a startable state without consuming an attempt', async (didit) => {
      const w = world();
      const id = await w.start();
      await w.send(id, 'In Review', { timestamp: NOW_S - 20 });
      expect(status(w)).toBe(IdentityVerificationStatus.PENDING);

      await w.send(id, didit, { timestamp: NOW_S - 10 });
      expect(status(w)).toBe(IdentityVerificationStatus.UNSTARTED);
      expect(w.attempts).toHaveLength(0);

      // …and the account can really start again (it was stranded before).
      await expect(w.service.startOrResume('user-1')).resolves.toEqual({ url: HOSTED_URL });
      expect(w.provider.createKycSession).toHaveBeenCalledTimes(2);
      expect(status(w)).toBe(IdentityVerificationStatus.IN_PROGRESS);
    });
  });

  // ------------------------------------------------------------------
  describe('declines: first, second and third', () => {
    it('decline 1 and 2 → failed; decline 3 → failed_final; exactly one attempt per declined session', async () => {
      const w = world();

      const s1 = await w.start();
      await w.send(s1, 'Declined');
      expect(status(w)).toBe(IdentityVerificationStatus.FAILED);
      expect(w.attempts.map((a) => a.attemptNumber)).toEqual([1]);

      w.reconfirmHomeCountry();
      const s2 = await w.start();
      await w.send(s2, 'Declined');
      expect(status(w)).toBe(IdentityVerificationStatus.FAILED);
      expect(w.attempts.map((a) => a.attemptNumber)).toEqual([1, 2]);

      w.reconfirmHomeCountry();
      const s3 = await w.start();
      await w.send(s3, 'Declined');
      expect(status(w)).toBe(IdentityVerificationStatus.FAILED_FINAL);
      expect(w.profile.failedFinalAt).toEqual(T0);
      expect(w.attempts.map((a) => a.attemptNumber)).toEqual([1, 2, 3]);
      expect(new Set(w.attempts.map((a) => a.vendorSessionId)).size).toBe(3);

      // no fourth session while failed_final
      w.reconfirmHomeCountry();
      await expect(w.service.startOrResume('user-1')).rejects.toBeInstanceOf(RetryLimitExceededException);
      expect(w.provider.createKycSession).toHaveBeenCalledTimes(3);
    });

    it('an in-review session that is then declined counts as a normal attempt', async () => {
      const w = world();
      const id = await w.start();
      await w.send(id, 'In Review', { timestamp: NOW_S - 20 });
      await w.send(id, 'Declined', { timestamp: NOW_S - 10 });
      expect(status(w)).toBe(IdentityVerificationStatus.FAILED);
      expect(w.attempts).toHaveLength(1);
    });
  });

  // ------------------------------------------------------------------
  describe('duplicate deliveries', () => {
    it('the same decline event delivered twice records one attempt', async () => {
      const w = world();
      const id = await w.start();
      await w.send(id, 'Declined', { eventId: 'evt-dup' });
      await w.send(id, 'Declined', { eventId: 'evt-dup' });
      expect(w.attempts).toHaveLength(1);
      expect(status(w)).toBe(IdentityVerificationStatus.FAILED);
    });

    it('two different Declined events for the SAME session record one attempt and do not escalate the profile', async () => {
      const w = world();
      const id = await w.start();
      await w.send(id, 'Declined', { eventId: 'evt-a', timestamp: NOW_S - 10 });
      await w.send(id, 'Declined', { eventId: 'evt-b', timestamp: NOW_S - 5 });
      await w.send(id, 'Declined', { eventId: 'evt-c', timestamp: NOW_S - 1 });
      expect(w.attempts).toHaveLength(1);
      expect(status(w)).toBe(IdentityVerificationStatus.FAILED);
      expect(w.profile.failedFinalAt).toBeNull();
    });
  });

  // ------------------------------------------------------------------
  describe('out-of-order events and terminal-state protection', () => {
    it('an older In Progress after Approved changes nothing', async () => {
      const w = world();
      const id = await w.start();
      await w.send(id, 'Approved', { timestamp: NOW_S - 5 });
      await w.send(id, 'In Progress', { timestamp: NOW_S - 50 });
      expect(sessionStatus(w, id)).toBe(HostedKycSessionStatus.APPROVED);
      expect(status(w)).toBe(IdentityVerificationStatus.VERIFIED);
    });

    it('an older In Review after Declined changes nothing and consumes no second attempt', async () => {
      const w = world();
      const id = await w.start();
      await w.send(id, 'Declined', { timestamp: NOW_S - 5 });
      await w.send(id, 'In Review', { timestamp: NOW_S - 50 });
      expect(sessionStatus(w, id)).toBe(HostedKycSessionStatus.DECLINED);
      expect(status(w)).toBe(IdentityVerificationStatus.FAILED);
      expect(w.attempts).toHaveLength(1);
    });

    it('a NEWER event cannot reopen a declined session, nor can Approved flip it', async () => {
      const w = world();
      const id = await w.start();
      await w.send(id, 'Declined', { timestamp: NOW_S - 30 });
      await w.send(id, 'In Progress', { timestamp: NOW_S - 20 });
      await w.send(id, 'Approved', { timestamp: NOW_S - 10 });
      expect(sessionStatus(w, id)).toBe(HostedKycSessionStatus.DECLINED);
      expect(status(w)).toBe(IdentityVerificationStatus.FAILED);
    });

    it('an approved session only ever moves to Kyc Expired', async () => {
      const w = world();
      const id = await w.start();
      await w.send(id, 'Approved', { timestamp: NOW_S - 30 });
      await w.send(id, 'Declined', { timestamp: NOW_S - 20 });
      await w.send(id, 'Abandoned', { timestamp: NOW_S - 10 });
      expect(sessionStatus(w, id)).toBe(HostedKycSessionStatus.APPROVED);
      expect(status(w)).toBe(IdentityVerificationStatus.VERIFIED);
      expect(w.attempts).toHaveLength(0);
    });

    it('a verified profile is not downgraded by a decline from another session', async () => {
      const w = world({
        profile: { identityVerificationStatus: IdentityVerificationStatus.VERIFIED },
        sessions: [{ id: 'r1', profileId: 'profile-1', diditSessionId: 'didit-old', vendorReference: 'ref-old', status: HostedKycSessionStatus.IN_PROGRESS, createdAt: T0 }],
      });
      await w.send('didit-old', 'Declined');
      expect(status(w)).toBe(IdentityVerificationStatus.VERIFIED);
      expect(w.attempts).toHaveLength(0);
    });
  });

  // ------------------------------------------------------------------
  describe('approval', () => {
    it.each([
      ['in progress', undefined],
      ['in review', 'In Review'],
    ])('approval after %s verifies the profile', async (_label, prior) => {
      const w = world();
      const id = await w.start();
      if (prior) await w.send(id, prior, { timestamp: NOW_S - 20 });
      await w.send(id, 'Approved', { timestamp: NOW_S - 10 });
      expect(status(w)).toBe(IdentityVerificationStatus.VERIFIED);
    });

    it('approval closes the active cycle without deleting history', async () => {
      const w = world();
      const s1 = await w.start();
      await w.send(s1, 'Declined');
      w.reconfirmHomeCountry();
      const s2 = await w.start();
      await w.send(s2, 'Declined');
      expect(w.attempts).toHaveLength(2);

      w.reconfirmHomeCountry();
      const s3 = await w.start();
      await w.send(s3, 'Approved');

      expect(status(w)).toBe(IdentityVerificationStatus.VERIFIED);
      expect(w.attempts).toHaveLength(2); // history stays stored
      expect(await getHostedKycCycleAttemptCount(w as any, 'profile-1')).toBe(0); // …but no longer counts
    });

    it('after approval and a later Kyc Expired, re-verification starts a fresh cycle with three attempts', async () => {
      const w = world();
      const s1 = await w.start();
      await w.send(s1, 'Declined');
      w.reconfirmHomeCountry();
      const s2 = await w.start();
      await w.send(s2, 'Approved', { timestamp: NOW_S - 30 });
      await w.send(s2, 'Kyc Expired', { timestamp: NOW_S - 20 });
      expect(status(w)).toBe(IdentityVerificationStatus.EXPIRED);

      // three fresh attempts: declines 1 and 2 → failed, the third → failed_final
      for (const expected of [IdentityVerificationStatus.FAILED, IdentityVerificationStatus.FAILED, IdentityVerificationStatus.FAILED_FINAL]) {
        w.reconfirmHomeCountry();
        const id = await w.start();
        await w.send(id, 'Declined');
        expect(status(w)).toBe(expected);
      }
      expect(w.attempts.map((a) => a.attemptNumber)).toEqual([1, 1, 2, 3]);
    });
  });

  // ------------------------------------------------------------------
  describe('cooldown expiry starts a new attempt cycle (the permanent-lockout fix)', () => {
    const FAILED_FINAL_COOLDOWN_MS = 24 * 60 * 60 * 1000;

    // Runs the REAL daily-sweep method against the same in-memory profile.
    const sweep = async (w: ReturnType<typeof world>) => {
      const profileRepo = {
        find: jest.fn(async (q: any) => {
          const cutoff: Date = q.where.failedFinalAt.value;
          return w.profile.identityVerificationStatus === q.where.identityVerificationStatus &&
            w.profile.failedFinalAt && w.profile.failedFinalAt <= cutoff
            ? [w.profile]
            : [];
        }),
        update: jest.fn(async (_id: string, patch: Record<string, unknown>) => void Object.assign(w.profile, patch)),
      };
      const ivs = new IdentityVerificationService(
        profileRepo as any, {} as any, {} as any, {} as any, {} as any, {} as any, {} as any, {} as any, {} as any, {} as any, {} as any, {} as any,
      );
      return ivs.clearExpiredFailedFinal();
    };

    async function failThreeTimes(w: ReturnType<typeof world>) {
      for (let i = 0; i < 3; i++) {
        w.reconfirmHomeCountry();
        const id = await w.start();
        await w.send(id, 'Declined');
        w.advance(1000);
      }
    }

    it('before the cooldown the account stays blocked; after it, the old attempts no longer lock the account out', async () => {
      const w = world();
      await failThreeTimes(w);
      expect(status(w)).toBe(IdentityVerificationStatus.FAILED_FINAL);

      w.advance(FAILED_FINAL_COOLDOWN_MS / 2);
      expect(await sweep(w)).toBe(0);
      w.reconfirmHomeCountry();
      await expect(w.service.startOrResume('user-1')).rejects.toBeInstanceOf(RetryLimitExceededException);

      w.advance(FAILED_FINAL_COOLDOWN_MS); // cooldown elapsed
      expect(await sweep(w)).toBe(1);
      expect(status(w)).toBe(IdentityVerificationStatus.UNSTARTED);
      expect(w.attempts).toHaveLength(3); // history kept

      w.reconfirmHomeCountry();
      await expect(w.service.startOrResume('user-1')).resolves.toEqual({ url: HOSTED_URL }); // was a permanent 429 before
    });

    it('the new cycle has three available attempts: failed, failed, then failed_final again', async () => {
      const w = world();
      await failThreeTimes(w);
      w.advance(FAILED_FINAL_COOLDOWN_MS + 1000);
      await sweep(w);

      const expected = [IdentityVerificationStatus.FAILED, IdentityVerificationStatus.FAILED, IdentityVerificationStatus.FAILED_FINAL];
      for (const exp of expected) {
        w.reconfirmHomeCountry();
        const id = await w.start();
        await w.send(id, 'Declined');
        expect(status(w)).toBe(exp);
        w.advance(1000);
      }
      expect(w.attempts.map((a) => a.attemptNumber)).toEqual([1, 2, 3, 1, 2, 3]);
      expect(w.attempts).toHaveLength(6);
    });

    it('historical attempts stay stored and are not counted in the new cycle', async () => {
      const w = world();
      await failThreeTimes(w);
      expect(await getHostedKycCycleAttemptCount(w as any, 'profile-1')).toBe(0);
      w.advance(FAILED_FINAL_COOLDOWN_MS + 1000);
      await sweep(w);
      w.reconfirmHomeCountry();
      const id = await w.start();
      await w.send(id, 'Declined');
      expect(w.attempts).toHaveLength(4);
      expect(await getHostedKycCycleAttemptCount(w as any, 'profile-1')).toBe(1);
    });
  });

  // ------------------------------------------------------------------
  describe('legacy attempt rows do not affect the hosted Free KYC limit', () => {
    const legacy = (n: number) =>
      Array.from({ length: n }, (_v, i) => ({ id: `legacy-${i + 1}`, profileId: 'profile-1', vendorSessionId: `legacy-vendor-${i + 1}`, documentId: `doc-${i + 1}`, attemptOutcome: 'rejected' }));

    it('five legacy document attempts do not block a hosted start and do not advance the hosted counter', async () => {
      const w = world({ attempts: legacy(5) });
      const id = await w.start();
      await w.send(id, 'Declined');
      expect(status(w)).toBe(IdentityVerificationStatus.FAILED); // not failed_final
      const hosted = w.attempts.find((a) => a.vendorSessionId === id);
      expect(hosted?.attemptNumber).toBe(1);
      expect(w.attempts).toHaveLength(6);
    });

    it('the cycle counter ignores rows that do not belong to a hosted session', async () => {
      const w = world({ attempts: legacy(3) });
      expect(await getHostedKycCycleAttemptCount(w as any, 'profile-1')).toBe(0);
    });
  });

  // ------------------------------------------------------------------
  describe('concurrent webhook processing', () => {
    it('the same decline delivered concurrently (same event id) records one attempt', async () => {
      const w = world();
      const id = await w.start();
      await Promise.all([
        w.send(id, 'Declined', { eventId: 'evt-race', timestamp: NOW_S - 5 }),
        w.send(id, 'Declined', { eventId: 'evt-race', timestamp: NOW_S - 5 }),
        w.send(id, 'Declined', { eventId: 'evt-race', timestamp: NOW_S - 5 }),
      ]);
      expect(w.attempts).toHaveLength(1);
      expect(status(w)).toBe(IdentityVerificationStatus.FAILED);
    });

    it('different event ids declining the same session concurrently still record one attempt', async () => {
      const w = world();
      const id = await w.start();
      await Promise.all([
        w.send(id, 'Declined', { eventId: 'evt-1', timestamp: NOW_S - 5 }),
        w.send(id, 'Declined', { eventId: 'evt-2', timestamp: NOW_S - 5 }),
        w.send(id, 'Declined', { eventId: 'evt-3', timestamp: NOW_S - 4 }),
      ]);
      expect(w.attempts).toHaveLength(1);
      expect(status(w)).toBe(IdentityVerificationStatus.FAILED);
      expect(w.profile.failedFinalAt).toBeNull();
    });

    it('a decline racing an approval ends in exactly one terminal outcome (whichever is serialized first)', async () => {
      const declinedFirst = world();
      const a = await declinedFirst.start();
      await Promise.all([
        declinedFirst.send(a, 'Declined', { eventId: 'e1', timestamp: NOW_S - 5 }),
        declinedFirst.send(a, 'Approved', { eventId: 'e2', timestamp: NOW_S - 5 }),
      ]);
      expect(status(declinedFirst)).toBe(IdentityVerificationStatus.FAILED);
      expect(sessionStatus(declinedFirst, a)).toBe(HostedKycSessionStatus.DECLINED);
      expect(declinedFirst.attempts).toHaveLength(1);

      const approvedFirst = world();
      const b = await approvedFirst.start();
      await Promise.all([
        approvedFirst.send(b, 'Approved', { eventId: 'e3', timestamp: NOW_S - 5 }),
        approvedFirst.send(b, 'Declined', { eventId: 'e4', timestamp: NOW_S - 5 }),
      ]);
      expect(status(approvedFirst)).toBe(IdentityVerificationStatus.VERIFIED);
      expect(approvedFirst.attempts).toHaveLength(0);
    });
  });

  // ------------------------------------------------------------------
  describe('lazy cooldown: failed_final becomes eligible exactly when the 24-hour cooldown ends', () => {
    // A profile that reached failed_final at T0 after three hosted declines.
    const failedFinalWorld = () => {
      const sessions = [1, 2, 3].map((n) => ({
        id: `h${n}`,
        profileId: 'profile-1',
        diditSessionId: `hist-${n}`,
        vendorReference: `ref-hist-${n}`,
        status: HostedKycSessionStatus.DECLINED,
        createdAt: new Date(T0.getTime() - (4 - n) * 60_000),
      }));
      const attempts = [1, 2, 3].map((n) => ({
        id: `ha${n}`,
        profileId: 'profile-1',
        vendorSessionId: `hist-${n}`,
        attemptNumber: n,
        attemptOutcome: 'rejected',
      }));
      return world({
        profile: { identityVerificationStatus: IdentityVerificationStatus.FAILED_FINAL, failedFinalAt: new Date(T0) },
        sessions,
        attempts,
      });
    };
    // The user re-confirms the home country when they retry (the Yes click).
    const startAt = async (w: ReturnType<typeof world>, afterMs: number) => {
      w.advance(afterMs);
      w.reconfirmHomeCountry();
      return w.service.startOrResume('user-1');
    };

    it('the service cooldown equals the 24 hours the daily sweep uses', () => {
      expect(FAILED_FINAL_COOLDOWN_MS).toBe(24 * 60 * 60 * 1000);
    });

    it('one second before expiry: still blocked with the retry-limit response, nothing changes', async () => {
      const w = failedFinalWorld();
      await expect(startAt(w, FAILED_FINAL_COOLDOWN_MS - 1000)).rejects.toBeInstanceOf(RetryLimitExceededException);
      expect(w.provider.createKycSession).not.toHaveBeenCalled();
      expect(status(w)).toBe(IdentityVerificationStatus.FAILED_FINAL);
      expect(w.profile.failedFinalAt).toEqual(T0);
      expect(w.attempts).toHaveLength(3);
    });

    it('one millisecond before expiry: still blocked', async () => {
      const w = failedFinalWorld();
      await expect(startAt(w, FAILED_FINAL_COOLDOWN_MS - 1)).rejects.toBeInstanceOf(RetryLimitExceededException);
      expect(status(w)).toBe(IdentityVerificationStatus.FAILED_FINAL);
    });

    it('exactly at expiry: eligible — a new hosted session starts', async () => {
      const w = failedFinalWorld();
      await expect(startAt(w, FAILED_FINAL_COOLDOWN_MS)).resolves.toEqual({ url: HOSTED_URL });
      expect(w.provider.createKycSession).toHaveBeenCalledTimes(1);
      expect(status(w)).toBe(IdentityVerificationStatus.IN_PROGRESS);
      expect(w.profile.failedFinalAt).toBeNull();
      expect(w.sessions).toHaveLength(4);
    });

    it('long after expiry: eligible', async () => {
      const w = failedFinalWorld();
      await expect(startAt(w, 10 * FAILED_FINAL_COOLDOWN_MS)).resolves.toEqual({ url: HOSTED_URL });
      expect(status(w)).toBe(IdentityVerificationStatus.IN_PROGRESS);
    });

    it('does not need the daily sweep: the profile is still failed_final when the start arrives and the start succeeds', async () => {
      const w = failedFinalWorld();
      w.advance(FAILED_FINAL_COOLDOWN_MS + 1000);
      expect(status(w)).toBe(IdentityVerificationStatus.FAILED_FINAL); // no sweep has run
      w.reconfirmHomeCountry();
      await expect(w.service.startOrResume('user-1')).resolves.toEqual({ url: HOSTED_URL });
    });

    it('old attempts stay stored untouched and the new cycle starts at zero with three attempts available', async () => {
      const w = failedFinalWorld();
      const before = JSON.stringify(w.attempts);
      await startAt(w, FAILED_FINAL_COOLDOWN_MS);
      expect(JSON.stringify(w.attempts)).toBe(before); // not deleted, not rewritten
      expect(await getHostedKycCycleAttemptCount(w as any, 'profile-1')).toBe(0);

      const expected = [IdentityVerificationStatus.FAILED, IdentityVerificationStatus.FAILED, IdentityVerificationStatus.FAILED_FINAL];
      let id = w.sessions[w.sessions.length - 1].diditSessionId as string;
      for (const exp of expected) {
        await w.send(id, 'Declined');
        expect(status(w)).toBe(exp);
        if (exp !== IdentityVerificationStatus.FAILED_FINAL) {
          w.advance(1000);
          w.reconfirmHomeCountry();
          id = await w.start();
        }
      }
      expect(w.attempts.map((a) => a.attemptNumber)).toEqual([1, 2, 3, 1, 2, 3]);
      expect(w.attempts).toHaveLength(6);
    });

    it('concurrent starts after expiry produce exactly one hosted session', async () => {
      const w = failedFinalWorld();
      w.serializeStarts();
      w.advance(FAILED_FINAL_COOLDOWN_MS + 1000);
      w.reconfirmHomeCountry();
      const results = await Promise.all([
        w.service.startOrResume('user-1'),
        w.service.startOrResume('user-1'),
        w.service.startOrResume('user-1'),
      ]);
      expect(results.every((r) => r.url === HOSTED_URL)).toBe(true);
      expect(w.sessionRepository.create).toHaveBeenCalledTimes(1);
      expect(w.sessions).toHaveLength(4); // three historical + exactly one new
      expect(status(w)).toBe(IdentityVerificationStatus.IN_PROGRESS);
      expect(w.attempts).toHaveLength(3);
    });

    it('while blocked, concurrent starts are all refused and create nothing', async () => {
      const w = failedFinalWorld();
      w.serializeStarts();
      w.advance(FAILED_FINAL_COOLDOWN_MS - 1000);
      w.reconfirmHomeCountry();
      const settled = await Promise.allSettled([w.service.startOrResume('user-1'), w.service.startOrResume('user-1')]);
      expect(settled.every((r) => r.status === 'rejected' && (r as any).reason instanceof RetryLimitExceededException)).toBe(true);
      expect(w.provider.createKycSession).not.toHaveBeenCalled();
    });

    it.each([
      ['a missing timestamp', null],
      ['an unparsable timestamp', new Date('not-a-date')],
      ['a non-date value', '2026-09-30T12:00:00.000Z'],
      ['a timestamp in the future (still ahead of the clock after it advances)', new Date(T0.getTime() + 100 * FAILED_FINAL_COOLDOWN_MS)],
    ])('fails closed with %s: stays blocked even long after the cooldown would have ended', async (_label, bad) => {
      const w = failedFinalWorld();
      w.profile.failedFinalAt = bad;
      await expect(startAt(w, 10 * FAILED_FINAL_COOLDOWN_MS)).rejects.toBeInstanceOf(RetryLimitExceededException);
      expect(w.provider.createKycSession).not.toHaveBeenCalled();
      expect(status(w)).toBe(IdentityVerificationStatus.FAILED_FINAL);
    });

    it('only failed_final is affected: other statuses keep their existing start rules', async () => {
      const w = world({ profile: { identityVerificationStatus: IdentityVerificationStatus.FAILED, failedFinalAt: new Date(T0.getTime() - 99 * FAILED_FINAL_COOLDOWN_MS) } });
      await expect(w.service.startOrResume('user-1')).resolves.toEqual({ url: HOSTED_URL });
      expect(w.profile.failedFinalAt).not.toBeNull(); // untouched: no cooldown transition for a non-final profile
    });

    describe('hasFailedFinalCooldownElapsed (pure)', () => {
      const now = T0.getTime() + FAILED_FINAL_COOLDOWN_MS;
      it('is false just before, true at, and true after the boundary', () => {
        expect(hasFailedFinalCooldownElapsed(T0, now - 1)).toBe(false);
        expect(hasFailedFinalCooldownElapsed(T0, now)).toBe(true);
        expect(hasFailedFinalCooldownElapsed(T0, now + 1)).toBe(true);
      });
      it('fails closed on anything that is not a valid past timestamp', () => {
        expect(hasFailedFinalCooldownElapsed(null, now)).toBe(false);
        expect(hasFailedFinalCooldownElapsed(undefined, now)).toBe(false);
        expect(hasFailedFinalCooldownElapsed(new Date(Number.NaN), now)).toBe(false);
        expect(hasFailedFinalCooldownElapsed(T0.toISOString(), now)).toBe(false);
        expect(hasFailedFinalCooldownElapsed(new Date(now + 1000), now)).toBe(false);
        expect(hasFailedFinalCooldownElapsed(T0, Number.NaN)).toBe(false);
      });
    });
  });

  // ------------------------------------------------------------------
  describe('computeHostedKycCycleAttemptCount (pure derivation)', () => {
    const at = (n: number) => new Date(Date.UTC(2026, 9, 1, 0, 0, n));
    const sess = (n: number, status: HostedKycSessionStatus) => ({ id: `r${n}`, diditSessionId: `d${n}`, status, createdAt: at(n) });
    const D = HostedKycSessionStatus.DECLINED;

    it('counts only declined sessions that have an attempt row', () => {
      const sessions = [sess(1, D), sess(2, D), sess(3, HostedKycSessionStatus.IN_PROGRESS), sess(4, HostedKycSessionStatus.ABANDONED), sess(5, HostedKycSessionStatus.IN_REVIEW)];
      expect(computeHostedKycCycleAttemptCount(sessions, new Set(['d1']))).toBe(1);
      expect(computeHostedKycCycleAttemptCount(sessions, new Set(['d1', 'd2']))).toBe(2);
    });

    it('a third decline closes the cycle (count returns to zero), and a fourth starts the next', () => {
      const all = new Set(['d1', 'd2', 'd3', 'd4']);
      expect(computeHostedKycCycleAttemptCount([sess(1, D), sess(2, D), sess(3, D)], all)).toBe(0);
      expect(computeHostedKycCycleAttemptCount([sess(1, D), sess(2, D), sess(3, D), sess(4, D)], all)).toBe(1);
    });

    it('an approval closes the cycle; orders by creation time regardless of input order', () => {
      const all = new Set(['d1', 'd2', 'd4']);
      const sessions = [sess(4, D), sess(3, HostedKycSessionStatus.APPROVED), sess(2, D), sess(1, D)];
      expect(computeHostedKycCycleAttemptCount(sessions, all)).toBe(1);
    });

    it('no sessions → zero', () => {
      expect(computeHostedKycCycleAttemptCount([], new Set())).toBe(0);
    });
  });
});
