import { FreeKycService, HOME_COUNTRY_CONFIRMATION_WINDOW_MS } from './free-kyc.service';
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
  TravelClassification,
} from '../entities/enums/identity-verification.enums';
import {
  AmbiguousVendorOutcomeError,
  HostedSessionNotFoundError,
  MalformedVendorResponseError,
  VendorAuthOrCreditError,
  VendorRateLimitedError,
  VendorTransportError,
} from '../providers/biometric-session/hosted-biometric-session.errors';
import {
  HomeCountryConfirmationRequiredException,
  VendorStageUnavailableException,
} from '../common/errors/domain-exceptions';

// Part 2: session resume and missing-webhook reconciliation.
//
// In-memory database; transactions are serialized through a FIFO mutex standing
// in for the pessimistic row locks, and the per-profile advisory lock is
// serialized on demand. Didit is fully mocked (no live calls). The clock is
// faked and nothing sleeps for real.
describe('Free KYC resume and reconciliation (Part 2)', () => {
  const SECRET = 'wh-secret';
  const T0 = new Date('2026-10-01T12:00:00.000Z');
  const NOW_S = 1_800_000_000;
  const HOSTED_URL = 'https://verify.didit.me/session/x';
  const REF = '11111111-1111-1111-1111-111111111111';

  let eventSeq = 0;
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

  const unfinished = (status = HostedKycSessionStatus.IN_PROGRESS, over: Row = {}): Row => ({
    id: 'row-1',
    profileId: 'profile-1',
    diditSessionId: 'didit-1',
    vendorReference: REF,
    status,
    createdAt: new Date(T0.getTime() - 60_000),
    lastEventTimestamp: null,
    ...over,
  });

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
    const sessions: Row[] = [...(init.sessions ?? [])];
    const attempts: Row[] = [...(init.attempts ?? [])];
    const events = new Set<string>();
    let rowSeq = sessions.length;
    let didditSeq = 0;
    const inValues = (op: any): any[] | null => (op && Array.isArray(op.value) ? op.value : null);

    const profileRepository = { findOne: jest.fn(async () => profile), save: jest.fn(async (p: Row) => p) };
    const sessionRepository = {
      findOne: jest.fn(async (q: any) => {
        const w = q?.where ?? {};
        if (w.diditSessionId) return sessions.find((s) => s.diditSessionId === w.diditSessionId) ?? null;
        if (w.id) return sessions.find((s) => s.id === w.id) ?? null;
        const statuses = inValues(w.status);
        return (
          sessions
            .filter((s) => s.profileId === w.profileId && (!statuses || statuses.includes(s.status)))
            .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime() || (b.id > a.id ? 1 : -1))[0] ?? null
        );
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
        if (attempts.some((a) => a.vendorSessionId === row.vendorSessionId)) throw Object.assign(new Error('dup'), { code: '23505' });
        attempts.push({ id: `attempt-${attempts.length + 1}`, ...row });
      }),
    };
    const processedRepository = {
      insert: jest.fn(async (row: Row) => {
        if (events.has(row.eventId)) throw Object.assign(new Error('dup'), { code: '23505' });
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

    let txTail: Promise<unknown> = Promise.resolve();
    const dataSource = {
      transaction: jest.fn((cb: any) => {
        const run = txTail.then(() => cb(manager));
        txTail = run.catch(() => undefined);
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

    // Didit's view of each stored session. Tests override per case.
    const decisions = new Map<string, Row | Error>();
    const provider = {
      createKycSession: jest.fn(async (input: { vendorData: string }) => {
        const existing = sessions.find((s) => s.vendorReference === input.vendorData);
        if (existing) return { sessionId: existing.diditSessionId, url: HOSTED_URL, status: 'In Progress' };
        return { sessionId: `didit-new-${++didditSeq}`, url: HOSTED_URL, status: 'Not Started' };
      }),
      getSessionDecision: jest.fn(async (sessionId: string) => {
        const configured = decisions.get(sessionId);
        if (configured instanceof Error) throw configured;
        const row = sessions.find((s) => s.diditSessionId === sessionId);
        return {
          sessionId,
          status: 'In Progress',
          vendorData: row?.vendorReference ?? null,
          workflowId: 'wf-kyc',
          environment: 'sandbox',
          applicationId: null,
          ...(configured ?? {}),
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
    // Everything the service logs is captured so tests can prove no identifier leaks.
    const logged: string[] = [];
    for (const level of ['warn', 'debug', 'log', 'error'] as const) {
      jest.spyOn((service as any).logger, level).mockImplementation((m: unknown) => void logged.push(String(m)));
    }

    // FIFO stand-in for the per-profile advisory lock.
    let lockTail: Promise<unknown> = Promise.resolve();
    (service as any).withProfileLock = (_id: string, work: () => Promise<any>) => {
      const next = lockTail.then(work, work);
      lockTail = next.catch(() => undefined);
      return next;
    };

    const decide = (sessionId: string, decision: Row | Error) => void decisions.set(sessionId, decision);
    const webhook = (sessionId: string, status: string, o: { eventId?: string; timestamp?: number } = {}) => {
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
        vendor_data: row?.vendorReference ?? null,
        metadata: null,
        decision: null,
      };
      return service.handleWebhook(
        Buffer.from(JSON.stringify(body), 'utf8'),
        { signatureV2: computeDiditSignatureV2(body, SECRET), timestamp: String(NOW_S) },
        NOW_S,
      );
    };
    return { service, profile, sessions, attempts, provider, sessionRepository, attemptRepository, dataSource, decide, webhook, logged };
  }

  const identity = (w: ReturnType<typeof world>) => w.profile.identityVerificationStatus;
  const sessionStatus = (w: ReturnType<typeof world>, id = 'didit-1') => w.sessions.find((s) => s.diditSessionId === id)?.status;
  const inProgressProfile = (over: Row = {}) => ({ identityVerificationStatus: IdentityVerificationStatus.IN_PROGRESS, ...over });
  const reasonOf = async (p: Promise<unknown>) => {
    try {
      await p;
    } catch (e) {
      return { type: e as Error, reason: (e as any).getResponse?.()?.details?.reason };
    }
    return null;
  };

  // ------------------------------------------------------------------
  describe('resuming an existing active session needs no new home-country confirmation', () => {
    const cases: Array<[string, Row]> = [
      ['a fresh confirmation', {}],
      ['a stale confirmation (older than 15 minutes)', { verifiedHomeCountryConfirmedAt: new Date(T0.getTime() - 3 * HOME_COUNTRY_CONFIRMATION_WINDOW_MS) }],
      ['no confirmation at all (absent, location not verified)', { verifiedHomeCountryConfirmedAt: null, verifiedHomeCountry: null, locationVerificationStatus: LocationVerificationStatus.NOT_VERIFIED }],
      ['travel mode active', { travelModeActive: true, travelClassification: TravelClassification.TEMPORARILY_TRAVELING }],
    ];

    it.each(cases)('resumes the same session with %s, creating nothing', async (_label, over) => {
      const w = world({ profile: inProgressProfile(over), sessions: [unfinished()] });
      await expect(w.service.startOrResume('user-1')).resolves.toEqual({ url: HOSTED_URL });
      expect((w.provider.createKycSession.mock.calls[0] as any[])[0].vendorData).toBe(REF);
      expect(w.sessionRepository.create).not.toHaveBeenCalled();
      expect(w.sessions).toHaveLength(1);
      expect(w.attempts).toHaveLength(0);
    });
  });

  describe('a NEW session still requires verified location, travel off and a fresh confirmation', () => {
    it('creates one with a fresh confirmation', async () => {
      const w = world();
      await expect(w.service.startOrResume('user-1')).resolves.toEqual({ url: HOSTED_URL });
      expect(w.sessions).toHaveLength(1);
    });

    it.each([
      ['stale confirmation', { verifiedHomeCountryConfirmedAt: new Date(T0.getTime() - HOME_COUNTRY_CONFIRMATION_WINDOW_MS - 1) }, 'confirmation_stale'],
      ['missing confirmation', { verifiedHomeCountryConfirmedAt: null }, 'not_confirmed'],
      ['location not verified', { locationVerificationStatus: LocationVerificationStatus.NOT_VERIFIED }, 'not_confirmed'],
      ['no home country', { verifiedHomeCountry: null }, 'not_confirmed'],
      ['travel mode active', { travelModeActive: true }, 'travel_mode'],
      ['temporary-travel classification', { travelClassification: TravelClassification.TEMPORARILY_TRAVELING }, 'travel_mode'],
    ])('is blocked by %s and Didit is never called', async (_label, over, reason) => {
      const w = world({ profile: over });
      const r = await reasonOf(w.service.startOrResume('user-1'));
      expect(r?.type).toBeInstanceOf(HomeCountryConfirmationRequiredException);
      expect(r?.reason).toBe(reason);
      expect(w.provider.createKycSession).not.toHaveBeenCalled();
      expect(w.sessions).toHaveLength(0);
    });

    it('accepts a confirmation exactly at the 15-minute edge', async () => {
      const w = world({ profile: { verifiedHomeCountryConfirmedAt: new Date(T0.getTime() - HOME_COUNTRY_CONFIRMATION_WINDOW_MS) } });
      await expect(w.service.startOrResume('user-1')).resolves.toEqual({ url: HOSTED_URL });
    });
  });

  // ------------------------------------------------------------------
  describe('at most one active session per profile', () => {
    const activeCount = (w: ReturnType<typeof world>) =>
      w.sessions.filter((s) => s.status === HostedKycSessionStatus.CREATED || s.status === HostedKycSessionStatus.IN_PROGRESS).length;

    it('five concurrent starts create exactly one session and all return its URL', async () => {
      const w = world();
      const results = await Promise.all(Array.from({ length: 5 }, () => w.service.startOrResume('user-1')));
      expect(results.every((r) => r.url === HOSTED_URL)).toBe(true);
      expect(w.sessionRepository.create).toHaveBeenCalledTimes(1);
      expect(w.sessions).toHaveLength(1);
      expect(activeCount(w)).toBe(1);
    });

    it('concurrent starts and retries after the session already exists all resume the same one', async () => {
      const w = world({ profile: inProgressProfile(), sessions: [unfinished()] });
      const results = await Promise.all([w.service.startOrResume('user-1'), w.service.startOrResume('user-1'), w.service.startOrResume('user-1')]);
      expect(results.every((r) => r.url === HOSTED_URL)).toBe(true);
      expect(w.sessions).toHaveLength(1);
      expect(w.sessionRepository.create).not.toHaveBeenCalled();
    });

    it('concurrent start and reconcile never produce a second session', async () => {
      const w = world({ profile: inProgressProfile(), sessions: [unfinished()] });
      await Promise.all([w.service.startOrResume('user-1'), w.service.reconcileForUser('user-1'), w.service.startOrResume('user-1')]);
      expect(w.sessions).toHaveLength(1);
      expect(activeCount(w)).toBe(1);
    });
  });

  // ------------------------------------------------------------------
  describe('reconcileForUser: applying Didit\'s decision for the caller\'s own session', () => {
    it('Approved → session approved, profile verified, outcome updated, no attempt', async () => {
      const w = world({ profile: inProgressProfile(), sessions: [unfinished()] });
      w.decide('didit-1', { status: 'Approved' });
      await expect(w.service.reconcileForUser('user-1')).resolves.toEqual({ outcome: 'updated' });
      expect(sessionStatus(w)).toBe(HostedKycSessionStatus.APPROVED);
      expect(identity(w)).toBe(IdentityVerificationStatus.VERIFIED);
      expect(w.attempts).toHaveLength(0);
    });

    it('Declined → session declined, profile failed, exactly one attempt', async () => {
      const w = world({ profile: inProgressProfile(), sessions: [unfinished()] });
      w.decide('didit-1', { status: 'Declined' });
      await expect(w.service.reconcileForUser('user-1')).resolves.toEqual({ outcome: 'updated' });
      expect(sessionStatus(w)).toBe(HostedKycSessionStatus.DECLINED);
      expect(identity(w)).toBe(IdentityVerificationStatus.FAILED);
      expect(w.attempts).toHaveLength(1);
      expect(w.attempts[0]).toEqual(expect.objectContaining({ vendorSessionId: 'didit-1', attemptNumber: 1 }));
    });

    it('a third decline found by reconciliation → failed_final with attempt number 3', async () => {
      const prior = [1, 2].map((n) => unfinished(HostedKycSessionStatus.DECLINED, { id: `p${n}`, diditSessionId: `old-${n}`, vendorReference: `ref-old-${n}`, createdAt: new Date(T0.getTime() - (10 - n) * 60_000) }));
      const w = world({
        profile: inProgressProfile(),
        sessions: [...prior, unfinished()],
        attempts: [1, 2].map((n) => ({ vendorSessionId: `old-${n}`, attemptNumber: n })),
      });
      w.decide('didit-1', { status: 'Declined' });
      await w.service.reconcileForUser('user-1');
      expect(identity(w)).toBe(IdentityVerificationStatus.FAILED_FINAL);
      expect(w.profile.failedFinalAt).toEqual(T0);
      expect(w.attempts.map((a) => a.attemptNumber)).toEqual([1, 2, 3]);
    });

    it('In Review → session in_review, profile pending', async () => {
      const w = world({ profile: inProgressProfile(), sessions: [unfinished()] });
      w.decide('didit-1', { status: 'In Review' });
      await expect(w.service.reconcileForUser('user-1')).resolves.toEqual({ outcome: 'updated' });
      expect(sessionStatus(w)).toBe(HostedKycSessionStatus.IN_REVIEW);
      expect(identity(w)).toBe(IdentityVerificationStatus.PENDING);
    });

    it.each(['In Progress', 'Awaiting User', 'Resubmitted', 'Not Started'])('Didit still reports %s → unchanged, nothing written', async (status) => {
      const w = world({ profile: inProgressProfile(), sessions: [unfinished()] });
      w.decide('didit-1', { status });
      await expect(w.service.reconcileForUser('user-1')).resolves.toEqual({ outcome: 'unchanged' });
      expect(sessionStatus(w)).toBe(HostedKycSessionStatus.IN_PROGRESS);
      expect(identity(w)).toBe(IdentityVerificationStatus.IN_PROGRESS);
      expect(w.sessionRepository.save).not.toHaveBeenCalled();
      expect(w.attempts).toHaveLength(0);
    });

    it.each(['Abandoned', 'Expired'])('%s → a startable profile, no attempt consumed', async (status) => {
      const w = world({ profile: inProgressProfile(), sessions: [unfinished()] });
      w.decide('didit-1', { status });
      await expect(w.service.reconcileForUser('user-1')).resolves.toEqual({ outcome: 'updated' });
      expect(identity(w)).toBe(IdentityVerificationStatus.UNSTARTED);
      expect(w.attempts).toHaveLength(0);
    });

    it('a session waiting in review is reconciled too (a lost decision webhook must not strand the account)', async () => {
      const approved = world({ profile: { identityVerificationStatus: IdentityVerificationStatus.PENDING }, sessions: [unfinished(HostedKycSessionStatus.IN_REVIEW)] });
      approved.decide('didit-1', { status: 'Approved' });
      await expect(approved.service.reconcileForUser('user-1')).resolves.toEqual({ outcome: 'updated' });
      expect(identity(approved)).toBe(IdentityVerificationStatus.VERIFIED);

      const declined = world({ profile: { identityVerificationStatus: IdentityVerificationStatus.PENDING }, sessions: [unfinished(HostedKycSessionStatus.IN_REVIEW)] });
      declined.decide('didit-1', { status: 'Declined' });
      await declined.service.reconcileForUser('user-1');
      expect(identity(declined)).toBe(IdentityVerificationStatus.FAILED);
      expect(declined.attempts).toHaveLength(1);

      const stillReview = world({ profile: { identityVerificationStatus: IdentityVerificationStatus.PENDING }, sessions: [unfinished(HostedKycSessionStatus.IN_REVIEW)] });
      stillReview.decide('didit-1', { status: 'In Review' });
      await expect(stillReview.service.reconcileForUser('user-1')).resolves.toEqual({ outcome: 'unchanged' });
    });

    it('queries Didit for exactly the stored session — the method accepts nothing from the caller but the user', async () => {
      expect(FreeKycService.prototype.reconcileForUser.length).toBe(1);
      const w = world({ profile: inProgressProfile(), sessions: [unfinished(HostedKycSessionStatus.IN_PROGRESS, { diditSessionId: 'didit-stored' })] });
      await w.service.reconcileForUser('user-1');
      expect(w.provider.getSessionDecision).toHaveBeenCalledTimes(1);
      expect(w.provider.getSessionDecision).toHaveBeenCalledWith('didit-stored');
    });
  });

  // ------------------------------------------------------------------
  describe('reconcileForUser is a no-op when there is nothing unfinished', () => {
    it.each([
      HostedKycSessionStatus.APPROVED,
      HostedKycSessionStatus.DECLINED,
      HostedKycSessionStatus.ABANDONED,
      HostedKycSessionStatus.EXPIRED,
      HostedKycSessionStatus.KYC_EXPIRED,
    ])('a local %s session is terminal: Didit is not called and nothing changes', async (status) => {
      const w = world({ profile: { identityVerificationStatus: IdentityVerificationStatus.FAILED }, sessions: [unfinished(status)] });
      await expect(w.service.reconcileForUser('user-1')).resolves.toEqual({ outcome: 'no_active_session' });
      expect(w.provider.getSessionDecision).not.toHaveBeenCalled();
      expect(identity(w)).toBe(IdentityVerificationStatus.FAILED);
      expect(w.sessionRepository.save).not.toHaveBeenCalled();
    });

    it('no session at all, or no profile, is a no-op that never calls Didit', async () => {
      const none = world();
      await expect(none.service.reconcileForUser('user-1')).resolves.toEqual({ outcome: 'no_active_session' });
      expect(none.provider.getSessionDecision).not.toHaveBeenCalled();

      const noProfile = world();
      (noProfile.service as any).profileRepository.findOne = jest.fn(async () => null);
      await expect(noProfile.service.reconcileForUser('user-1')).resolves.toEqual({ outcome: 'no_active_session' });
      expect(noProfile.provider.getSessionDecision).not.toHaveBeenCalled();
    });

    it('reconciling twice: the second call finds the session terminal and changes nothing', async () => {
      const w = world({ profile: inProgressProfile(), sessions: [unfinished()] });
      w.decide('didit-1', { status: 'Declined' });
      await w.service.reconcileForUser('user-1');
      await expect(w.service.reconcileForUser('user-1')).resolves.toEqual({ outcome: 'no_active_session' });
      expect(w.attempts).toHaveLength(1);
      expect(w.provider.getSessionDecision).toHaveBeenCalledTimes(1);
    });
  });

  // ------------------------------------------------------------------
  describe('every vendor failure fails closed: no state change, no replacement session, no attempt', () => {
    const failures: Array<[string, Error, string]> = [
      ['404 not found', new HostedSessionNotFoundError(), 'decision_session_not_found'],
      ['401/403 auth', new VendorAuthOrCreditError('invalid_api_key', undefined), 'VendorAuthOrCreditError'],
      ['429 rate limited', new VendorRateLimitedError(3), 'VendorRateLimitedError'],
      ['5xx or timeout', new VendorTransportError(new Error('x')), 'VendorTransportError'],
      ['malformed body', new MalformedVendorResponseError('missing_session_id_or_status'), 'MalformedVendorResponseError'],
      ['ambiguous (no reply)', new AmbiguousVendorOutcomeError(new Error('x')), 'AmbiguousVendorOutcomeError'],
    ];

    it.each(failures)('%s', async (_label, error, reason) => {
      const w = world({ profile: inProgressProfile(), sessions: [unfinished()] });
      w.decide('didit-1', error);
      const r = await reasonOf(w.service.reconcileForUser('user-1'));
      expect(r?.type).toBeInstanceOf(VendorStageUnavailableException);
      expect(r?.reason).toBe(reason);
      expect(sessionStatus(w)).toBe(HostedKycSessionStatus.IN_PROGRESS);
      expect(identity(w)).toBe(IdentityVerificationStatus.IN_PROGRESS);
      expect(w.provider.createKycSession).not.toHaveBeenCalled();
      expect(w.sessionRepository.create).not.toHaveBeenCalled();
      expect(w.attempts).toHaveLength(0);
      expect(w.dataSource.transaction).not.toHaveBeenCalled();
    });

    it('never puts a session id, vendor body or secret in the thrown error', async () => {
      const w = world({ profile: inProgressProfile(), sessions: [unfinished()] });
      w.decide('didit-1', new VendorAuthOrCreditError('invalid_api_key', { api_key: 'sk-secret-value', detail: 'private' }));
      const r = await reasonOf(w.service.reconcileForUser('user-1'));
      const text = JSON.stringify((r?.type as any).getResponse?.() ?? {}) + String(r?.type?.message);
      for (const secret of ['didit-1', 'sk-secret-value', 'private', REF, SECRET]) expect(text).not.toContain(secret);
    });

    it('a failed reconcile followed by a good one still works once, with one attempt at most', async () => {
      const w = world({ profile: inProgressProfile(), sessions: [unfinished()] });
      w.decide('didit-1', new VendorTransportError(new Error('x')));
      await expect(w.service.reconcileForUser('user-1')).rejects.toBeInstanceOf(VendorStageUnavailableException);
      w.decide('didit-1', { status: 'Declined' });
      await expect(w.service.reconcileForUser('user-1')).resolves.toEqual({ outcome: 'updated' });
      expect(w.attempts).toHaveLength(1);
    });
  });

  // ------------------------------------------------------------------
  describe('ownership, workflow, environment and status validation (fail closed)', () => {
    const mismatches: Array<[string, Row, string]> = [
      ['a different session id', { sessionId: 'didit-someone-else' }, 'decision_session_mismatch'],
      ['a different vendor reference', { vendorData: 'ref-of-another-user' }, 'decision_vendor_data_mismatch'],
      ['a missing vendor reference', { vendorData: null }, 'decision_missing_field'],
      ['a different workflow', { workflowId: 'wf-other' }, 'decision_workflow_mismatch'],
      ['a missing workflow', { workflowId: null }, 'decision_missing_field'],
      ['the wrong environment (live vs sandbox)', { environment: 'live' }, 'decision_environment_mismatch'],
    ];

    it.each(mismatches)('%s is rejected with no change', async (_label, decision, reason) => {
      const w = world({ profile: inProgressProfile(), sessions: [unfinished()] });
      w.decide('didit-1', { status: 'Approved', ...decision });
      const r = await reasonOf(w.service.reconcileForUser('user-1'));
      expect(r?.type).toBeInstanceOf(VendorStageUnavailableException);
      expect(r?.reason).toBe(reason);
      expect(sessionStatus(w)).toBe(HostedKycSessionStatus.IN_PROGRESS);
      expect(identity(w)).toBe(IdentityVerificationStatus.IN_PROGRESS); // never approved on a mismatched decision
      expect(w.attempts).toHaveLength(0);
      expect(w.provider.createKycSession).not.toHaveBeenCalled();
    });

    it('a mismatched application id is rejected when both sides have one', async () => {
      process.env.DIDIT_APPLICATION_ID = 'app-1';
      const w = world({ profile: inProgressProfile(), sessions: [unfinished()] });
      w.decide('didit-1', { status: 'Approved', applicationId: 'app-other' });
      const r = await reasonOf(w.service.reconcileForUser('user-1'));
      expect(r?.reason).toBe('decision_application_mismatch');
      expect(identity(w)).toBe(IdentityVerificationStatus.IN_PROGRESS);
      delete process.env.DIDIT_APPLICATION_ID;
    });

    it.each(['Some Future Status', 'approved', ''])('an unsupported status %p is rejected and never approves', async (status) => {
      const w = world({ profile: inProgressProfile(), sessions: [unfinished()] });
      w.decide('didit-1', { status });
      const r = await reasonOf(w.service.reconcileForUser('user-1'));
      expect(r?.type).toBeInstanceOf(VendorStageUnavailableException);
      expect(r?.reason).toBe('decision_unusable_status');
      expect(identity(w)).toBe(IdentityVerificationStatus.IN_PROGRESS);
    });

    it('"Kyc Expired" for a session we never saw approved is rejected', async () => {
      const w = world({ profile: inProgressProfile(), sessions: [unfinished()] });
      w.decide('didit-1', { status: 'Kyc Expired' });
      const r = await reasonOf(w.service.reconcileForUser('user-1'));
      expect(r?.reason).toBe('decision_unusable_status');
      expect(identity(w)).toBe(IdentityVerificationStatus.IN_PROGRESS);
    });
  });

  // ------------------------------------------------------------------
  describe('webhook and reconciliation racing each other', () => {
    it('the same decline arriving by webhook and by reconciliation concurrently records ONE attempt', async () => {
      const w = world({ profile: inProgressProfile(), sessions: [unfinished()] });
      w.decide('didit-1', { status: 'Declined' });
      await Promise.all([w.webhook('didit-1', 'Declined'), w.service.reconcileForUser('user-1'), w.webhook('didit-1', 'Declined', { eventId: 'evt-other' })]);
      expect(w.attempts).toHaveLength(1);
      expect(identity(w)).toBe(IdentityVerificationStatus.FAILED);
      expect(sessionStatus(w)).toBe(HostedKycSessionStatus.DECLINED);
      expect(w.sessions).toHaveLength(1);
      expect(w.provider.createKycSession).not.toHaveBeenCalled();
    });

    it('the same approval by webhook and reconciliation verifies once', async () => {
      const w = world({ profile: inProgressProfile(), sessions: [unfinished()] });
      w.decide('didit-1', { status: 'Approved' });
      await Promise.all([w.service.reconcileForUser('user-1'), w.webhook('didit-1', 'Approved')]);
      expect(identity(w)).toBe(IdentityVerificationStatus.VERIFIED);
      expect(sessionStatus(w)).toBe(HostedKycSessionStatus.APPROVED);
      expect(w.attempts).toHaveLength(0);
    });

    it('a stale decision fetched before the webhook cannot undo a finished session', async () => {
      const w = world({ profile: inProgressProfile(), sessions: [unfinished()] });
      // Hold reconciliation's Didit lookup open while the real webhook finishes.
      let release!: () => void;
      const gate = new Promise<void>((resolve) => (release = resolve));
      w.provider.getSessionDecision.mockImplementation(async (sessionId: string) => {
        await gate;
        return { sessionId, status: 'Declined', vendorData: REF, workflowId: 'wf-kyc', environment: 'sandbox', applicationId: null };
      });
      const reconciling = w.service.reconcileForUser('user-1');
      await w.webhook('didit-1', 'Approved');
      expect(identity(w)).toBe(IdentityVerificationStatus.VERIFIED);
      release();
      await reconciling;
      expect(sessionStatus(w)).toBe(HostedKycSessionStatus.APPROVED); // the late "Declined" was blocked
      expect(identity(w)).toBe(IdentityVerificationStatus.VERIFIED);
      expect(w.attempts).toHaveLength(0);
    });
  });

  // ------------------------------------------------------------------
  describe('logging', () => {
    it('reconciliation, failures and racing webhooks never log a session id, event id, vendor reference or secret', async () => {
      const w = world({ profile: inProgressProfile(), sessions: [unfinished()] });
      // vendor failure, ownership mismatch, success, duplicate and out-of-order webhooks
      w.decide('didit-1', new VendorTransportError(new Error('boom didit-1')));
      await w.service.reconcileForUser('user-1').catch(() => undefined);
      w.decide('didit-1', { status: 'Approved', workflowId: 'wf-other' });
      await w.service.reconcileForUser('user-1').catch(() => undefined);
      w.decide('didit-1', { status: 'Declined' });
      await Promise.all([
        w.service.reconcileForUser('user-1'),
        w.webhook('didit-1', 'Declined', { eventId: 'evt-secret-id-1', timestamp: NOW_S - 5 }),
        w.webhook('didit-1', 'Declined', { eventId: 'evt-secret-id-1', timestamp: NOW_S - 5 }),
        w.webhook('didit-1', 'In Progress', { eventId: 'evt-secret-id-2', timestamp: NOW_S - 100 }),
      ]);
      expect(w.logged.length).toBeGreaterThan(0); // something was logged, and it is all fixed text
      const all = w.logged.join('\n');
      for (const identifier of ['didit-1', 'evt-secret-id-1', 'evt-secret-id-2', REF, SECRET, 'user-1', 'profile-1']) {
        expect(all).not.toContain(identifier);
      }
    });
  });

  // ------------------------------------------------------------------
  describe('no duplicate attempt and no replacement session, ever', () => {
    it('reconciling, replaying the webhook and starting again leave one attempt and one session row for the declined session', async () => {
      const w = world({ profile: inProgressProfile(), sessions: [unfinished()] });
      w.decide('didit-1', { status: 'Declined' });
      await w.service.reconcileForUser('user-1');
      await w.webhook('didit-1', 'Declined', { eventId: 'evt-replay-1' });
      await w.webhook('didit-1', 'Declined', { eventId: 'evt-replay-1' });
      await w.service.reconcileForUser('user-1');
      expect(w.attempts).toHaveLength(1);
      expect(w.sessions).toHaveLength(1);
      expect(w.provider.createKycSession).not.toHaveBeenCalled();
    });

    it('reconciliation never creates a session, even when Didit says the old one ended', async () => {
      for (const status of ['Abandoned', 'Expired', 'Declined', 'Approved']) {
        const w = world({ profile: inProgressProfile(), sessions: [unfinished()] });
        w.decide('didit-1', { status });
        await w.service.reconcileForUser('user-1');
        expect(w.provider.createKycSession).not.toHaveBeenCalled();
        expect(w.sessionRepository.create).not.toHaveBeenCalled();
      }
    });
  });
});
