import { FreeKycService } from './free-kyc.service';
import { IdentityVerificationService } from './identity-verification.service';
import { FAILED_FINAL_COOLDOWN_MS } from '../common/attempt-limit/hosted-kyc-attempt-cycle';
import { computeDiditSignatureV2 } from '../providers/webhooks/didit-webhook-signature-v2';
import { HostedKycSession } from '../entities/hosted-kyc-session.entity';
import { IdentityVerificationProfile } from '../entities/identity-verification-profile.entity';
import { VerificationAttempt } from '../entities/verification-attempt.entity';
import { PendingVerificationSession } from '../entities/pending-verification-session.entity';
import { IdentityDocument } from '../entities/identity-document.entity';
import { AttemptReservation } from '../entities/attempt-reservation.entity';
import { ProcessedWebhookEvent } from '../entities/processed-webhook-event.entity';
import {
  DeclaredDuration,
  HostedKycSessionPurpose,
  HostedKycSessionStatus,
  IdentityVerificationStatus,
  LocationVerificationStatus,
  TravelClassification,
} from '../entities/enums/identity-verification.enums';
import {
  HomeCountryConfirmationRequiredException,
  KycNotStartableException,
  RetryLimitExceededException,
  VendorStageUnavailableException,
} from '../common/errors/domain-exceptions';
import { VendorTransportError } from '../providers/biometric-session/hosted-biometric-session.errors';
import { IdentityVerificationEventType } from '../events/identity-verification-event.types';

// PMCM-650, Didit side. An account with a verified home country that confirmed a
// DIFFERENT detected country (stored as PENDING) re-verifies with a
// home-country-change session. The session runs through the ordinary identity
// states and attempt cycle: in progress when it starts, failed after a decline
// (failed_final plus the 24-hour cooldown after the third), verified on approval.
// The pending country replaces verifiedHomeCountry only when Didit approves THAT
// session; every other outcome leaves the verified home country and the pending
// claim alone. Same in-memory database and FIFO transaction mutex as the
// state-machine spec.
describe('Home-country change sessions (PMCM-650)', () => {
  const SECRET = 'wh-secret';
  const T0 = new Date('2026-10-20T12:00:00.000Z');
  const HOSTED_URL = 'https://verify.didit.me/session/x';
  const NOW_S = 1_800_000_000;
  const WINDOW_MS = 15 * 60 * 1000;
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

  function world(init: { profile?: Row; sessions?: Row[]; noEvents?: boolean } = {}) {
    const profile: Row = {
      id: 'profile-1',
      userId: 'user-1',
      identityVerificationStatus: IdentityVerificationStatus.VERIFIED,
      locationVerificationStatus: LocationVerificationStatus.VERIFIED,
      verifiedHomeCountry: 'US',
      verifiedHomeCountryConfirmedAt: new Date('2026-09-01T00:00:00.000Z'),
      travelModeActive: false,
      travelClassification: TravelClassification.PERMANENTLY_RELOCATED,
      failedFinalAt: null,
      expiredAt: null,
      pendingHomeCountry: 'CA',
      pendingHomeCountryConfirmedAt: new Date(),
      pendingRelocationSessionId: null,
      ...(init.profile ?? {}),
    };
    const sessions: Row[] = (init.sessions ?? []).map((s) => ({ lastEventTimestamp: null, ...s }));
    const attempts: Row[] = [];
    const processed = new Set<string>();
    let rowSeq = sessions.length;
    let didditSeq = 0;
    const decisions = new Map<string, string>(); // Didit's own view per session (reconcile)

    const inValues = (op: any): any[] | null => (op && Array.isArray(op.value) ? op.value : null);
    // A row written before the purpose column existed reads as an ordinary session.
    const purposeOf = (s: Row) => s.purpose ?? HostedKycSessionPurpose.IDENTITY_VERIFICATION;

    const profileRepository = {
      findOne: jest.fn(async () => profile),
      save: jest.fn(async (p: Row) => p),
      update: jest.fn(async () => ({ affected: 1 })),
    };
    const sessionRepository = {
      findOne: jest.fn(async (q: any) => {
        const w = q?.where ?? {};
        if (w.diditSessionId) return sessions.find((s) => s.diditSessionId === w.diditSessionId) ?? null;
        if (w.id) return sessions.find((s) => s.id === w.id) ?? null;
        const statuses = inValues(w.status);
        return (
          sessions
            .filter(
              (s) =>
                s.profileId === w.profileId &&
                (!statuses || statuses.includes(s.status)) &&
                (w.purpose === undefined || purposeOf(s) === w.purpose),
            )
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
        if (attempts.some((a) => a.vendorSessionId === row.vendorSessionId)) throw Object.assign(new Error('duplicate'), { code: '23505' });
        attempts.push({ id: `attempt-${attempts.length + 1}`, ...row });
      }),
      count: jest.fn(async () => attempts.length),
    };
    const processedRepository = {
      insert: jest.fn(async (row: Row) => {
        if (processed.has(row.eventId)) throw Object.assign(new Error('duplicate'), { code: '23505' });
        processed.add(row.eventId);
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
      createKycSession: jest.fn(async (input: { vendorData: string }) => {
        const existing = sessions.find((s) => s.vendorReference === input.vendorData);
        if (existing) return { sessionId: existing.diditSessionId, url: HOSTED_URL, status: 'In Progress' };
        return { sessionId: `didit-${++didditSeq}`, url: HOSTED_URL, status: 'Not Started' };
      }),
      getSessionDecision: jest.fn(async (sessionId: string) => {
        const row = sessions.find((s) => s.diditSessionId === sessionId);
        return {
          sessionId,
          status: decisions.get(sessionId) ?? 'In Progress',
          vendorData: row?.vendorReference ?? null,
          workflowId: 'wf-kyc',
          environment: 'sandbox',
          applicationId: null,
        };
      }),
    };
    const events = { publish: jest.fn(async () => undefined) };
    // The in-app notification hand-off (notification-service's notification.send).
    const notifications = { homeCountryUpdated: jest.fn(async (_n: { userId: string; hostedKycSessionId: string }) => true) };
    const service = new FreeKycService(
      profileRepository as any,
      sessionRepository as any,
      attemptRepository as any,
      empty as any,
      empty as any,
      empty as any,
      dataSource as any,
      provider as any,
      (init.noEvents ? undefined : events) as any,
      notifications as any,
    );
    jest.spyOn((service as any).logger, 'warn').mockImplementation(() => undefined);
    jest.spyOn((service as any).logger, 'debug').mockImplementation(() => undefined);
    jest.spyOn((service as any).logger, 'log').mockImplementation(() => undefined);

    const advance = (ms: number) => jest.setSystemTime(new Date(Date.now() + ms));
    // What POST home-country/confirm does for the same pending country.
    const reconfirmPending = () => {
      profile.pendingHomeCountryConfirmedAt = new Date();
    };

    const send = (sessionId: string, status: string, o: { eventId?: string; timestamp?: number } = {}) => {
      const row = sessions.find((s) => s.diditSessionId === sessionId);
      const body = {
        event_id: o.eventId ?? `evt-${++eventSeq}`,
        session_id: sessionId,
        webhook_type: 'status.updated',
        timestamp: o.timestamp ?? NOW_S - 5,
        created_at: '2026-10-20T12:00:00Z',
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

    // Starts a home-country-change session and returns its Didit id.
    const startChange = async () => {
      await service.startHomeCountryChange('user-1');
      return sessions[sessions.length - 1].diditSessionId as string;
    };

    return { service, profile, sessions, attempts, provider, events, notifications, dataSource, decisions, advance, reconfirmPending, send, startChange };
  }

  type World = ReturnType<typeof world>;
  const published = (w: World, type: IdentityVerificationEventType) =>
    w.events.publish.mock.calls.filter((c: any[]) => c[0].eventType === type).length;
  // The verified home country and its location status are never touched by a
  // claim that has not been approved; the identity status moves by the ordinary rules.
  const expectCountryKept = (w: World) => {
    expect(w.profile.verifiedHomeCountry).toBe('US');
    expect(w.profile.locationVerificationStatus).toBe(LocationVerificationStatus.VERIFIED);
    expect(w.profile.pendingHomeCountry).toBe('CA');
  };
  const identity = (w: World) => w.profile.identityVerificationStatus;

  // ------------------------------------------------------------------
  describe('starting a home-country-change session', () => {
    it('an already verified account gets a Didit session with the relocation purpose and the pending country, and moves into the ordinary in-progress state', async () => {
      const w = world();
      const out = await w.service.startHomeCountryChange('user-1');

      expect(out).toEqual({ url: HOSTED_URL });
      expect(w.provider.createKycSession).toHaveBeenCalledTimes(1);
      expect(w.sessions).toHaveLength(1);
      expect(w.sessions[0].purpose).toBe(HostedKycSessionPurpose.HOME_COUNTRY_CHANGE);
      expect(w.sessions[0].pendingHomeCountry).toBe('CA');
      expect(w.profile.pendingRelocationSessionId).toBe(w.sessions[0].id);
      expect(identity(w)).toBe(IdentityVerificationStatus.IN_PROGRESS);
      expectCountryKept(w);
    });

    it('the ordinary start hands a pending claim to the same relocation start (so the existing "Verify My Account" retry works)', async () => {
      const w = world();
      await w.service.startOrResume('user-1');

      expect(w.sessions).toHaveLength(1);
      expect(w.sessions[0].purpose).toBe(HostedKycSessionPurpose.HOME_COUNTRY_CHANGE);
      expect(identity(w)).toBe(IdentityVerificationStatus.IN_PROGRESS);
    });

    it('a failed account with a pending claim retries through the ordinary start: a new relocation session, not an ordinary one', async () => {
      const w = world({ profile: { identityVerificationStatus: IdentityVerificationStatus.FAILED } });
      await w.service.startOrResume('user-1');

      expect(w.sessions[0].purpose).toBe(HostedKycSessionPurpose.HOME_COUNTRY_CHANGE);
      expect(w.sessions[0].pendingHomeCountry).toBe('CA');
      expect(identity(w)).toBe(IdentityVerificationStatus.IN_PROGRESS);
    });

    it('a second click resumes the same session: one row, one Didit session', async () => {
      const w = world();
      await w.startChange();
      await w.service.startHomeCountryChange('user-1');
      await w.service.startOrResume('user-1');

      expect(w.sessions).toHaveLength(1);
      expect(w.sessions.map((s) => s.diditSessionId)).toEqual(['didit-1']);
    });

    it('a verified account with NO pending claim still cannot start any identity session', async () => {
      const w = world({ profile: { pendingHomeCountry: null, pendingHomeCountryConfirmedAt: null, travelClassification: null } });

      await expect(w.service.startOrResume('user-1')).rejects.toBeInstanceOf(KycNotStartableException);
      await expect(w.service.startHomeCountryChange('user-1')).rejects.toBeInstanceOf(KycNotStartableException);

      expect(w.provider.createKycSession).not.toHaveBeenCalled();
      expect(w.sessions).toHaveLength(0);
      expect(identity(w)).toBe(IdentityVerificationStatus.VERIFIED);
    });

    it.each([
      ['location is not verified', { locationVerificationStatus: LocationVerificationStatus.NOT_VERIFIED }],
      ['there is no verified home country to change', { verifiedHomeCountry: null }],
      ['the previous session is still in review', { identityVerificationStatus: IdentityVerificationStatus.PENDING }],
      ['the account is blocked', { identityVerificationStatus: IdentityVerificationStatus.BLOCKED_AGE }],
    ])('refuses (not startable, no Didit call) when %s', async (_why, patch) => {
      const w = world({ profile: patch });
      await expect(w.service.startHomeCountryChange('user-1')).rejects.toBeInstanceOf(KycNotStartableException);
      expect(w.provider.createKycSession).not.toHaveBeenCalled();
      expect(w.sessions).toHaveLength(0);
    });

    it('the failed_final cooldown blocks a start before Didit is contacted', async () => {
      const w = world({ profile: { identityVerificationStatus: IdentityVerificationStatus.FAILED_FINAL, failedFinalAt: new Date() } });
      await expect(w.service.startHomeCountryChange('user-1')).rejects.toBeInstanceOf(RetryLimitExceededException);
      expect(w.provider.createKycSession).not.toHaveBeenCalled();
    });

    it('an ordinary start never resumes a home-country-change session', async () => {
      const w = world({
        profile: {
          identityVerificationStatus: IdentityVerificationStatus.UNSTARTED,
          travelClassification: null,
          pendingHomeCountry: null,
          pendingHomeCountryConfirmedAt: null,
          verifiedHomeCountryConfirmedAt: new Date(),
        },
        sessions: [
          {
            id: 'row-1',
            profileId: 'profile-1',
            diditSessionId: 'didit-old-relocation',
            vendorReference: 'aaaaaaaa-0000-4000-8000-000000000001',
            status: HostedKycSessionStatus.CREATED,
            purpose: HostedKycSessionPurpose.HOME_COUNTRY_CHANGE,
            pendingHomeCountry: 'CA',
            createdAt: new Date(),
          },
        ],
      });

      await w.service.startOrResume('user-1');

      const created = w.sessions[w.sessions.length - 1];
      expect(created.diditSessionId).not.toBe('didit-old-relocation');
      expect(created.purpose ?? HostedKycSessionPurpose.IDENTITY_VERIFICATION).toBe(HostedKycSessionPurpose.IDENTITY_VERIFICATION);
    });
  });

  // ------------------------------------------------------------------
  describe('the 15-minute location-confirmation rule is unchanged', () => {
    it('a fresh confirmation proceeds to Didit', async () => {
      const w = world();
      await expect(w.service.startHomeCountryChange('user-1')).resolves.toEqual({ url: HOSTED_URL });
    });

    it('exactly at the window is fine; one millisecond past needs the location confirmed again', async () => {
      const edge = world();
      edge.advance(WINDOW_MS);
      await expect(edge.service.startHomeCountryChange('user-1')).resolves.toBeDefined();

      const stale = world();
      stale.advance(WINDOW_MS + 1);
      const err = await stale.service.startHomeCountryChange('user-1').catch((e) => e);
      expect(err).toBeInstanceOf(HomeCountryConfirmationRequiredException);
      expect(err.getResponse().details).toEqual({ reason: 'confirmation_stale' });
      expect(stale.provider.createKycSession).not.toHaveBeenCalled();
      expect(stale.sessions).toHaveLength(0);
      expect(identity(stale)).toBe(IdentityVerificationStatus.VERIFIED);
    });

    it('a retry after a decline uses the pending confirmation: the verified country\'s older confirmation does not matter', async () => {
      const w = world({ profile: { identityVerificationStatus: IdentityVerificationStatus.FAILED } });
      expect(w.profile.verifiedHomeCountryConfirmedAt.getTime()).toBeLessThan(Date.now() - WINDOW_MS);
      await expect(w.service.startOrResume('user-1')).resolves.toBeDefined();
    });

    it('the same stale rule sends a retry back to location confirmation, through the ordinary start too', async () => {
      const w = world({ profile: { identityVerificationStatus: IdentityVerificationStatus.FAILED } });
      w.advance(WINDOW_MS + 1);
      const err = await w.service.startOrResume('user-1').catch((e) => e);
      expect(err).toBeInstanceOf(HomeCountryConfirmationRequiredException);
      expect(err.getResponse().details).toEqual({ reason: 'confirmation_stale' });
    });

    it('a missing confirmation time is refused as missing', async () => {
      const w = world({ profile: { pendingHomeCountryConfirmedAt: null } });
      const err = await w.service.startHomeCountryChange('user-1').catch((e) => e);
      expect(err).toBeInstanceOf(HomeCountryConfirmationRequiredException);
      expect(err.getResponse().details).toEqual({ reason: 'confirmation_missing' });
    });

    it('resuming a session already created needs no new confirmation (as with ordinary sessions)', async () => {
      const w = world();
      await w.startChange();
      w.advance(60 * 60 * 1000);
      await expect(w.service.startHomeCountryChange('user-1')).resolves.toEqual({ url: HOSTED_URL });
      expect(w.sessions).toHaveLength(1);
    });
  });

  // ------------------------------------------------------------------
  describe('declines use the existing retry states, attempt cycle and cooldown', () => {
    it('first decline: failed, one attempt used (two left), the claim and home country kept, and a retry is a NEW session', async () => {
      const w = world();
      const s1 = await w.startChange();
      expect(identity(w)).toBe(IdentityVerificationStatus.IN_PROGRESS);
      await w.send(s1, 'Declined');

      expect(identity(w)).toBe(IdentityVerificationStatus.FAILED);
      expect(w.attempts).toHaveLength(1);
      expect(w.attempts[0]).toMatchObject({ vendorSessionId: s1, failureCode: 'kyc_declined', attemptNumber: 1 });
      expect(w.profile.failedFinalAt).toBeNull();
      expectCountryKept(w);
      expect(w.profile.pendingRelocationSessionId).toBe(w.sessions[0].id);

      await w.startChange();
      expect(w.sessions).toHaveLength(2);
      expect(w.sessions[1].pendingHomeCountry).toBe('CA');
      expect(w.profile.pendingRelocationSessionId).toBe(w.sessions[1].id);
      expect(identity(w)).toBe(IdentityVerificationStatus.IN_PROGRESS);
    });

    it('second decline: failed again, two attempts used (one left), still retryable', async () => {
      const w = world();
      await w.send(await w.startChange(), 'Declined');
      await w.send(await w.startChange(), 'Declined');

      expect(identity(w)).toBe(IdentityVerificationStatus.FAILED);
      expect(w.attempts.map((a) => a.attemptNumber)).toEqual([1, 2]);
      expect(w.profile.failedFinalAt).toBeNull();
      expectCountryKept(w);
      await expect(w.service.startOrResume('user-1')).resolves.toBeDefined();
      expect(w.sessions).toHaveLength(3);
    });

    it('third decline: failed_final with the 24-hour cooldown, blocked before Didit, claim and home country kept', async () => {
      const w = world();
      await w.send(await w.startChange(), 'Declined');
      await w.send(await w.startChange(), 'Declined');
      await w.send(await w.startChange(), 'Declined');

      expect(identity(w)).toBe(IdentityVerificationStatus.FAILED_FINAL);
      expect(w.profile.failedFinalAt).toEqual(new Date());
      expect(w.attempts.map((a) => a.attemptNumber)).toEqual([1, 2, 3]);
      expectCountryKept(w);

      const calls = w.provider.createKycSession.mock.calls.length;
      await expect(w.service.startHomeCountryChange('user-1')).rejects.toBeInstanceOf(RetryLimitExceededException);
      await expect(w.service.startOrResume('user-1')).rejects.toBeInstanceOf(RetryLimitExceededException);
      expect(w.provider.createKycSession.mock.calls.length).toBe(calls);
    });

    it('one millisecond before 24 hours is still blocked; after it a fresh cycle begins once the location is confirmed again, with the claim retained', async () => {
      const w = world();
      await w.send(await w.startChange(), 'Declined');
      await w.send(await w.startChange(), 'Declined');
      await w.send(await w.startChange(), 'Declined');

      w.advance(FAILED_FINAL_COOLDOWN_MS - 1);
      await expect(w.service.startHomeCountryChange('user-1')).rejects.toBeInstanceOf(RetryLimitExceededException);

      w.advance(1);
      // The cooldown is over, but the pending confirmation is now a day old.
      const stale = await w.service.startHomeCountryChange('user-1').catch((e) => e);
      expect(stale).toBeInstanceOf(HomeCountryConfirmationRequiredException);
      expect(identity(w)).toBe(IdentityVerificationStatus.UNSTARTED);
      expect(w.profile.failedFinalAt).toBeNull();
      expect(w.profile.pendingHomeCountry).toBe('CA');

      w.reconfirmPending();
      await expect(w.service.startHomeCountryChange('user-1')).resolves.toBeDefined();
      expect(w.sessions).toHaveLength(4);
      expect(identity(w)).toBe(IdentityVerificationStatus.IN_PROGRESS);

      // The old attempts stay as history; the new cycle starts at zero.
      expect(w.attempts).toHaveLength(3);
      await w.send(w.sessions[3].diditSessionId, 'Declined');
      expect(w.attempts[3].attemptNumber).toBe(1);
      expect(identity(w)).toBe(IdentityVerificationStatus.FAILED);
    });

    it('a corrupt or future failed_final timestamp fails closed', async () => {
      const w = world({
        profile: { identityVerificationStatus: IdentityVerificationStatus.FAILED_FINAL, failedFinalAt: new Date(Date.now() + 60_000) },
      });
      await expect(w.service.startHomeCountryChange('user-1')).rejects.toBeInstanceOf(RetryLimitExceededException);
    });

    it.each(['Abandoned', 'Expired'])('%s consumes no attempt: back to unstarted, the claim and home country stay, and a new session can start', async (didit) => {
      const w = world();
      const s1 = await w.startChange();
      await w.send(s1, didit);

      expect(w.attempts).toHaveLength(0);
      expect(identity(w)).toBe(IdentityVerificationStatus.UNSTARTED);
      expectCountryKept(w);
      expect(w.profile.failedFinalAt).toBeNull();

      await w.startChange();
      expect(w.sessions).toHaveLength(2);
    });

    it('a vendor outage while starting creates nothing, consumes no attempt and changes no status', async () => {
      const w = world();
      w.provider.createKycSession.mockRejectedValueOnce(new VendorTransportError(new Error('down')));

      await expect(w.service.startHomeCountryChange('user-1')).rejects.toBeInstanceOf(VendorStageUnavailableException);

      expect(w.sessions).toHaveLength(0);
      expect(w.attempts).toHaveLength(0);
      expect(identity(w)).toBe(IdentityVerificationStatus.VERIFIED);
      expectCountryKept(w);
      expect(w.profile.pendingRelocationSessionId).toBeNull();
      await expect(w.service.startHomeCountryChange('user-1')).resolves.toBeDefined();
    });

    it('a vendor outage while checking the stored session fails closed: no state change, no attempt, no replacement session', async () => {
      const w = world();
      await w.startChange();
      w.provider.getSessionDecision.mockRejectedValueOnce(new VendorTransportError(new Error('down')));

      await expect(w.service.startHomeCountryChange('user-1')).rejects.toBeInstanceOf(VendorStageUnavailableException);

      expect(w.sessions).toHaveLength(1);
      expect(w.attempts).toHaveLength(0);
      expect(identity(w)).toBe(IdentityVerificationStatus.IN_PROGRESS);
      expectCountryKept(w);
    });

    it('a session waiting in review is the ordinary pending state and blocks a second session', async () => {
      const w = world();
      const s1 = await w.startChange();
      await w.send(s1, 'In Review');

      expect(identity(w)).toBe(IdentityVerificationStatus.PENDING);
      await expect(w.service.startHomeCountryChange('user-1')).rejects.toBeInstanceOf(KycNotStartableException);
      expect(w.sessions).toHaveLength(1);
    });

    it('the same decline delivered twice, or twice with different event ids, is one attempt', async () => {
      const w = world();
      const s1 = await w.startChange();
      await w.send(s1, 'Declined', { eventId: 'evt-same' });
      await w.send(s1, 'Declined', { eventId: 'evt-same' });
      await w.send(s1, 'Declined', { eventId: 'evt-other' });

      expect(w.attempts).toHaveLength(1);
      expect(identity(w)).toBe(IdentityVerificationStatus.FAILED);
    });

    it('a declined session can never be flipped to approved by a later event', async () => {
      const w = world();
      const s1 = await w.startChange();
      await w.send(s1, 'Declined');
      await w.send(s1, 'Approved', { timestamp: NOW_S - 1 });

      expect(w.sessions[0].status).toBe(HostedKycSessionStatus.DECLINED);
      expect(identity(w)).toBe(IdentityVerificationStatus.FAILED);
      expect(w.profile.verifiedHomeCountry).toBe('US');
    });
  });

  // ------------------------------------------------------------------
  describe('approval restores verified and promotes only the country linked to that session', () => {
    it('approved: back to verified, the pending country becomes the verified home country and the claim is cleared', async () => {
      const w = world();
      const s1 = await w.startChange();
      expect(identity(w)).toBe(IdentityVerificationStatus.IN_PROGRESS);
      await w.send(s1, 'Approved');

      expect(identity(w)).toBe(IdentityVerificationStatus.VERIFIED);
      expect(w.profile.verifiedHomeCountry).toBe('CA');
      expect(w.profile.verifiedHomeCountryConfirmedAt).toEqual(new Date());
      expect(w.profile.locationVerificationStatus).toBe(LocationVerificationStatus.VERIFIED);
      expect(w.profile.travelClassification).toBeNull();
      expect(w.profile.pendingHomeCountry).toBeNull();
      expect(w.profile.pendingHomeCountryConfirmedAt).toBeNull();
      expect(w.profile.pendingRelocationSessionId).toBeNull();
      expect(w.profile.failedFinalAt).toBeNull();
      expect(w.sessions[0].status).toBe(HostedKycSessionStatus.APPROVED);
      expect(published(w, IdentityVerificationEventType.HOME_COUNTRY_UPDATED)).toBe(1);
      expect(published(w, IdentityVerificationEventType.IDENTITY_VERIFIED)).toBe(1);
    });

    it('approval after earlier declines restores verified and promotes the retained claim; the attempt history stays', async () => {
      const w = world();
      await w.send(await w.startChange(), 'Declined');
      await w.send(await w.startChange(), 'Approved');

      expect(identity(w)).toBe(IdentityVerificationStatus.VERIFIED);
      expect(w.profile.verifiedHomeCountry).toBe('CA');
      expect(w.profile.pendingHomeCountry).toBeNull();
      expect(w.attempts).toHaveLength(1);
    });

    it('a duplicate delivery of the approval promotes once and announces once', async () => {
      const w = world();
      const s1 = await w.startChange();
      await w.send(s1, 'Approved', { eventId: 'evt-approved' });
      await w.send(s1, 'Approved', { eventId: 'evt-approved' });

      expect(w.profile.verifiedHomeCountry).toBe('CA');
      expect(published(w, IdentityVerificationEventType.HOME_COUNTRY_UPDATED)).toBe(1);
    });

    it('a later replay with a different event id cannot promote or change anything, even after a newer claim is made', async () => {
      const w = world();
      const s1 = await w.startChange();
      await w.send(s1, 'Approved', { eventId: 'evt-1' });

      // The account later claims a move to MX (a new claim, not yet started).
      w.profile.travelClassification = TravelClassification.PERMANENTLY_RELOCATED;
      w.profile.pendingHomeCountry = 'MX';
      w.profile.pendingHomeCountryConfirmedAt = new Date();
      w.profile.pendingRelocationSessionId = null;

      await w.send(s1, 'Approved', { eventId: 'evt-2' });

      expect(w.profile.verifiedHomeCountry).toBe('CA');
      expect(w.profile.pendingHomeCountry).toBe('MX');
      expect(published(w, IdentityVerificationEventType.HOME_COUNTRY_UPDATED)).toBe(1);
    });

    it('a stale session cannot restore verified or promote: an older session approved after a newer one was started', async () => {
      const w = world();
      const s1 = await w.startChange();
      await w.send(s1, 'Abandoned');
      const s2 = await w.startChange();
      expect(s2).not.toBe(s1);
      expect(identity(w)).toBe(IdentityVerificationStatus.IN_PROGRESS);

      await w.send(s1, 'Approved', { timestamp: NOW_S - 1 });

      expect(identity(w)).toBe(IdentityVerificationStatus.IN_PROGRESS);
      expect(w.profile.verifiedHomeCountry).toBe('US');
      expect(w.profile.pendingHomeCountry).toBe('CA');
      expect(w.profile.pendingRelocationSessionId).toBe(w.sessions[1].id);
      expect(published(w, IdentityVerificationEventType.HOME_COUNTRY_UPDATED)).toBe(0);
      expect(published(w, IdentityVerificationEventType.IDENTITY_VERIFIED)).toBe(0);

      // The current session still can.
      await w.send(s2, 'Approved');
      expect(identity(w)).toBe(IdentityVerificationStatus.VERIFIED);
      expect(w.profile.verifiedHomeCountry).toBe('CA');
    });

    it('a session started for a country that is no longer the pending one cannot restore verified or promote the new claim', async () => {
      const w = world();
      const s1 = await w.startChange(); // started for CA
      w.profile.pendingHomeCountry = 'MX'; // the account confirmed a different country since
      w.profile.pendingRelocationSessionId = null;

      await w.send(s1, 'Approved');

      expect(identity(w)).toBe(IdentityVerificationStatus.IN_PROGRESS);
      expect(w.profile.verifiedHomeCountry).toBe('US');
      expect(w.profile.pendingHomeCountry).toBe('MX');
    });

    it('a withdrawn claim (the account chose "traveling") cannot be finalized by a late approval', async () => {
      const w = world();
      const s1 = await w.startChange();
      w.profile.travelClassification = TravelClassification.TEMPORARILY_TRAVELING;
      w.profile.pendingHomeCountry = null;
      w.profile.pendingHomeCountryConfirmedAt = null;
      w.profile.pendingRelocationSessionId = null;

      await w.send(s1, 'Approved');

      expect(w.profile.verifiedHomeCountry).toBe('US');
      expect(identity(w)).toBe(IdentityVerificationStatus.IN_PROGRESS);
      expect(published(w, IdentityVerificationEventType.HOME_COUNTRY_UPDATED)).toBe(0);
    });

    it('an unrelated ordinary session approved while a claim is pending cannot restore verified or promote anything', async () => {
      const w = world({
        sessions: [
          {
            id: 'row-ordinary',
            profileId: 'profile-1',
            diditSessionId: 'didit-ordinary',
            vendorReference: 'bbbbbbbb-0000-4000-8000-000000000002',
            status: HostedKycSessionStatus.CREATED,
            createdAt: new Date(T0.getTime() - 86_400_000),
          },
        ],
      });
      await w.startChange();

      await w.send('didit-ordinary', 'Approved');

      expect(identity(w)).toBe(IdentityVerificationStatus.IN_PROGRESS);
      expect(w.profile.verifiedHomeCountry).toBe('US');
      expect(w.profile.pendingHomeCountry).toBe('CA');
      expect(published(w, IdentityVerificationEventType.HOME_COUNTRY_UPDATED)).toBe(0);
    });

    it('an approval for an unknown session changes nothing', async () => {
      const w = world();
      await w.startChange();
      await expect(w.send('didit-unknown', 'Approved')).rejects.toThrow();
      expect(w.profile.verifiedHomeCountry).toBe('US');
      expect(identity(w)).toBe(IdentityVerificationStatus.IN_PROGRESS);
    });

    it('reconciliation finding the session Approved at Didit promotes it once and refuses a second start', async () => {
      const w = world();
      const s1 = await w.startChange();
      w.decisions.set(s1, 'Approved');

      await expect(w.service.startHomeCountryChange('user-1')).rejects.toBeInstanceOf(KycNotStartableException);

      expect(identity(w)).toBe(IdentityVerificationStatus.VERIFIED);
      expect(w.profile.verifiedHomeCountry).toBe('CA');
      expect(w.sessions).toHaveLength(1);
      expect(published(w, IdentityVerificationEventType.HOME_COUNTRY_UPDATED)).toBe(1);
    });

    it('a later "Kyc Expired" on the approved session follows the ordinary expiry rules', async () => {
      const w = world();
      const s1 = await w.startChange();
      await w.send(s1, 'Approved');
      await w.send(s1, 'Kyc Expired');

      expect(identity(w)).toBe(IdentityVerificationStatus.EXPIRED);
      expect(w.profile.verifiedHomeCountry).toBe('CA');
    });
  });

  // ------------------------------------------------------------------
  describe('every non-approval outcome preserves the existing home country and the claim', () => {
    it.each([
      ['Declined', IdentityVerificationStatus.FAILED, 1],
      ['Abandoned', IdentityVerificationStatus.UNSTARTED, 0],
      ['Expired', IdentityVerificationStatus.UNSTARTED, 0],
      ['In Review', IdentityVerificationStatus.PENDING, 0],
      ['In Progress', IdentityVerificationStatus.IN_PROGRESS, 0],
    ])('%s → identity %s (%i attempt), verifiedHomeCountry and the pending claim unchanged', async (didit, expected, attemptCount) => {
      const w = world();
      const s1 = await w.startChange();
      await w.send(s1, didit);

      expect(identity(w)).toBe(expected);
      expectCountryKept(w);
      expect(w.attempts).toHaveLength(attemptCount);
      expect(published(w, IdentityVerificationEventType.HOME_COUNTRY_UPDATED)).toBe(0);
    });
  });

  // ------------------------------------------------------------------
  describe('a rejected confirmation leaves the live claim intact for the linked approval', () => {
    // The REAL account-side service over the same profile row the session service uses.
    const accountService = (w: World) =>
      new IdentityVerificationService(
        { findOne: jest.fn(async () => w.profile), save: jest.fn(async (p: Row) => p), create: jest.fn((d: Row) => ({ ...d })), update: jest.fn() } as any,
        {} as any, {} as any, {} as any, {} as any,
        { getRepository: () => ({ exist: jest.fn().mockResolvedValue(false) }) } as any,
        {} as any, {} as any, {} as any,
        { resolve: jest.fn().mockResolvedValue({ countryCode: 'US', regionState: null, city: null }) } as any,
        {} as any,
        { publish: jest.fn() } as any,
      );
    const snapshot = (w: World) =>
      JSON.stringify({
        verifiedHomeCountry: w.profile.verifiedHomeCountry,
        pendingHomeCountry: w.profile.pendingHomeCountry,
        pendingRelocationSessionId: w.profile.pendingRelocationSessionId,
        identity: w.profile.identityVerificationStatus,
        travelModeActive: w.profile.travelModeActive,
      });

    it.each([
      ['In Progress', undefined],
      ['In Review', 'In Review'],
    ])('same-country confirmation while the session is %s is rejected, then the linked approval promotes normally', async (_label, moveTo) => {
      const w = world({ profile: { travelClassification: TravelClassification.TEMPORARILY_TRAVELING, travelModeActive: true, declaredDuration: DeclaredDuration.A_FEW_DAYS, travelModeActivatedAt: new Date(T0.getTime() - 86_400_000) } });
      const s1 = await w.startChange();
      if (moveTo) await w.send(s1, moveTo);
      const before = snapshot(w);

      await expect(accountService(w).confirmHomeCountry('user-1', '198.51.100.9')).rejects.toMatchObject({
        code: 'HOME_COUNTRY_CHANGE_IN_PROGRESS',
      });

      expect(snapshot(w)).toBe(before);
      expect(w.profile.pendingHomeCountry).toBe('CA');
      expect(w.profile.verifiedHomeCountry).toBe('US');

      await w.send(s1, 'Approved');

      expect(w.profile.verifiedHomeCountry).toBe('CA');
      expect(w.profile.pendingHomeCountry).toBeNull();
      expect(identity(w)).toBe(IdentityVerificationStatus.VERIFIED);
      expect(w.profile.travelModeActive).toBe(false); // ended by the approval, as designed
      expect(published(w, IdentityVerificationEventType.HOME_COUNTRY_UPDATED)).toBe(1);
    });

    it('an abandoned session no longer protects the claim: the existing restart behaviour applies', async () => {
      const w = world();
      const s1 = await w.startChange();
      await w.send(s1, 'Abandoned');
      expect(identity(w)).toBe(IdentityVerificationStatus.UNSTARTED);

      const saved: any = await accountService(w).confirmHomeCountry('user-1', '198.51.100.9');

      expect(saved.pendingHomeCountry).toBeNull(); // returned to the verified country: claim dropped, as before
      expect(saved.verifiedHomeCountry).toBe('US');
    });
  });

  // ------------------------------------------------------------------
  describe('Travel Mode is kept through the whole change and ended only by the linked approval', () => {
    const DAY = 24 * 60 * 60 * 1000;
    const traveler = () => ({
      travelClassification: TravelClassification.TEMPORARILY_TRAVELING,
      travelModeActive: true,
      declaredDuration: DeclaredDuration.ONE_TO_TWO_WEEKS,
      travelModeActivatedAt: new Date(T0.getTime() - DAY),
      nextTravelReminderAt: new Date(T0.getTime() + 2 * DAY),
      lastTravelReminderSentAt: null,
    });
    const expectTravelKept = (w: World) => {
      expect(w.profile.travelModeActive).toBe(true);
      expect(w.profile.travelClassification).toBe(TravelClassification.TEMPORARILY_TRAVELING);
      expect(w.profile.declaredDuration).toBe(DeclaredDuration.ONE_TO_TWO_WEEKS);
      expect(w.profile.travelModeActivatedAt).toEqual(new Date(T0.getTime() - DAY));
      expect(w.profile.nextTravelReminderAt).toEqual(new Date(T0.getTime() + 2 * DAY));
    };

    it('an active traveler can start the change session (Travel Mode does not block the claim)', async () => {
      const w = world({ profile: traveler() });

      const s1 = await w.startChange();

      expect(w.sessions).toHaveLength(1);
      expect(w.profile.pendingRelocationSessionId).toBe(w.sessions[0].id);
      expect(s1).toBeTruthy();
      expectTravelKept(w);
    });

    it.each([
      ['In Progress', IdentityVerificationStatus.IN_PROGRESS],
      ['In Review', IdentityVerificationStatus.PENDING],
      ['Declined', IdentityVerificationStatus.FAILED],
      ['Abandoned', IdentityVerificationStatus.UNSTARTED],
      ['Expired', IdentityVerificationStatus.UNSTARTED],
    ])('%s: Travel Mode and the verified country are untouched', async (didit, expected) => {
      const w = world({ profile: traveler() });
      const s1 = await w.startChange();
      await w.send(s1, didit);

      expect(identity(w)).toBe(expected);
      expectCountryKept(w);
      expectTravelKept(w);
    });

    it('the third decline (cooldown) keeps Travel Mode too', async () => {
      const w = world({ profile: traveler() });
      for (let i = 0; i < 3; i += 1) {
        const id = await w.startChange();
        await w.send(id, 'Declined');
        if (i < 2) w.reconfirmPending();
      }

      expect(identity(w)).toBe(IdentityVerificationStatus.FAILED_FINAL);
      expectCountryKept(w);
      expectTravelKept(w);
    });

    it('an abandoned session can be restarted and the traveler still has Travel Mode', async () => {
      const w = world({ profile: traveler() });
      const s1 = await w.startChange();
      await w.send(s1, 'Abandoned');
      w.reconfirmPending();

      await w.startChange();

      expect(w.sessions).toHaveLength(2);
      expect(identity(w)).toBe(IdentityVerificationStatus.IN_PROGRESS);
      expectTravelKept(w);
    });

    it('an unrelated approval of an ordinary session ends nothing', async () => {
      const w = world({
        profile: traveler(),
        sessions: [
          {
            id: 'row-ordinary',
            profileId: 'profile-1',
            diditSessionId: 'didit-ordinary',
            vendorReference: 'bbbbbbbb-0000-4000-8000-000000000003',
            status: HostedKycSessionStatus.CREATED,
            createdAt: new Date(T0.getTime() - DAY),
          },
        ],
      });
      await w.startChange();

      await w.send('didit-ordinary', 'Approved');

      expectCountryKept(w);
      expectTravelKept(w);
    });

    it('only the approval of the linked session promotes the country AND ends Travel Mode', async () => {
      const w = world({ profile: traveler() });
      const s1 = await w.startChange();

      await w.send(s1, 'Approved');

      expect(w.profile.verifiedHomeCountry).toBe('CA');
      expect(w.profile.pendingHomeCountry).toBeNull();
      expect(identity(w)).toBe(IdentityVerificationStatus.VERIFIED);
      expect(w.profile.travelModeActive).toBe(false);
      expect(w.profile.travelClassification).toBeNull();
      expect(w.profile.declaredDuration).toBeNull();
      expect(w.profile.travelModeActivatedAt).toBeNull();
      expect(w.profile.nextTravelReminderAt).toBeNull();
    });
  });

  // ------------------------------------------------------------------
  describe('initial identity verification behaves exactly as before', () => {
    // A function: the confirmation time must be read from the fake clock of each test.
    const firstTime = () => ({
      identityVerificationStatus: IdentityVerificationStatus.UNSTARTED,
      travelClassification: null,
      pendingHomeCountry: null,
      pendingHomeCountryConfirmedAt: null,
      verifiedHomeCountryConfirmedAt: new Date(),
    });

    it('an ordinary start creates an ordinary session, moves the account to in progress and approval verifies it', async () => {
      const w = world({ profile: firstTime() });
      await w.service.startOrResume('user-1');

      const created = w.sessions[0];
      expect(created.purpose).toBeUndefined(); // the column default (identity_verification) applies
      expect(created.pendingHomeCountry).toBeUndefined();
      expect(identity(w)).toBe(IdentityVerificationStatus.IN_PROGRESS);
      expect(w.profile.pendingRelocationSessionId).toBeNull();

      await w.send(created.diditSessionId, 'Approved');
      expect(identity(w)).toBe(IdentityVerificationStatus.VERIFIED);
      expect(w.profile.verifiedHomeCountry).toBe('US');
      expect(published(w, IdentityVerificationEventType.IDENTITY_VERIFIED)).toBe(1);
      expect(published(w, IdentityVerificationEventType.HOME_COUNTRY_UPDATED)).toBe(0);
    });

    it('ordinary declines still fail the account and the third still enters the identity cooldown', async () => {
      const w = world({ profile: firstTime() });
      for (let i = 0; i < 3; i++) {
        await w.service.startOrResume('user-1');
        await w.send(w.sessions[w.sessions.length - 1].diditSessionId, 'Declined');
        w.profile.verifiedHomeCountryConfirmedAt = new Date();
      }

      expect(identity(w)).toBe(IdentityVerificationStatus.FAILED_FINAL);
      expect(w.profile.failedFinalAt).toEqual(new Date());
      expect(w.sessions.every((s) => (s.purpose ?? HostedKycSessionPurpose.IDENTITY_VERIFICATION) === HostedKycSessionPurpose.IDENTITY_VERIFICATION)).toBe(true);
      await expect(w.service.startOrResume('user-1')).rejects.toBeInstanceOf(RetryLimitExceededException);
    });

    it('an ordinary approval is untouched when no home-country claim exists', async () => {
      const w = world({ profile: { ...firstTime(), identityVerificationStatus: IdentityVerificationStatus.FAILED } });
      await w.service.startOrResume('user-1');
      await w.send(w.sessions[0].diditSessionId, 'Approved');
      expect(identity(w)).toBe(IdentityVerificationStatus.VERIFIED);
    });
  });
  // ------------------------------------------------------------------
  describe('the in-app notification: sent once, only for a promoted home-country change', () => {
    const notified = (w: World) => w.notifications.homeCountryUpdated.mock.calls.map((c) => c[0]);

    it('an approved linked session notifies the account holder once, keyed by the session row, with the change already applied', async () => {
      const w = world();
      const s1 = await w.startChange();
      const row = w.sessions[0].id;
      // What was true when the hand-off ran: the change was already applied and saved.
      let seen: { country: string; status: string } | undefined;
      w.notifications.homeCountryUpdated.mockImplementationOnce(async () => {
        seen = { country: w.profile.verifiedHomeCountry, status: w.sessions[0].status };
        return true;
      });
      await w.send(s1, 'Approved');

      expect(notified(w)).toEqual([{ userId: 'user-1', hostedKycSessionId: row }]);
      expect(seen).toEqual({ country: 'CA', status: HostedKycSessionStatus.APPROVED });
    });

    it('is handed over only AFTER the transaction that applied the change has completed', async () => {
      const w = world();
      const s1 = await w.startChange();
      const order: string[] = [];
      const realTransaction = w.dataSource.transaction;
      w.dataSource.transaction = jest.fn(async (cb: any) => {
        const result = await realTransaction(cb);
        order.push('transaction completed');
        return result;
      });
      w.notifications.homeCountryUpdated.mockImplementationOnce(async () => {
        order.push('notified');
        return true;
      });

      await w.send(s1, 'Approved');

      expect(order).toEqual(['transaction completed', 'notified']);
    });

    it('approval after an in-review result notifies exactly once, on the approval and not on the review', async () => {
      const w = world();
      const s1 = await w.startChange();
      await w.send(s1, 'In Review');
      expect(notified(w)).toHaveLength(0);

      await w.send(s1, 'Approved', { timestamp: NOW_S - 1 });
      expect(notified(w)).toHaveLength(1);
      expect(w.profile.verifiedHomeCountry).toBe('CA');
    });

    it('a duplicate delivery, and a later replay with a new event id, never notify again', async () => {
      const w = world();
      const s1 = await w.startChange();
      await w.send(s1, 'Approved', { eventId: 'evt-approved' });
      await w.send(s1, 'Approved', { eventId: 'evt-approved' });
      await w.send(s1, 'Approved', { eventId: 'evt-replay' });

      expect(notified(w)).toHaveLength(1);
    });

    it('a reconciliation-driven approval at start notifies once, and a webhook that arrives afterwards does not repeat it', async () => {
      const w = world();
      const s1 = await w.startChange();
      w.decisions.set(s1, 'Approved');

      await expect(w.service.startHomeCountryChange('user-1')).rejects.toBeInstanceOf(KycNotStartableException);
      expect(notified(w)).toHaveLength(1);

      await w.send(s1, 'Approved');
      expect(notified(w)).toHaveLength(1);
    });

    it('the explicit reconcile action notifies once as well', async () => {
      const w = world();
      const s1 = await w.startChange();
      w.decisions.set(s1, 'Approved');

      await expect(w.service.reconcileForUser('user-1')).resolves.toEqual({ outcome: 'updated' });
      await w.service.reconcileForUser('user-1');
      await w.send(s1, 'Approved');

      expect(notified(w)).toEqual([{ userId: 'user-1', hostedKycSessionId: w.sessions[0].id }]);
    });

    it('is never sent for an ordinary identity approval', async () => {
      const w = world({
        profile: {
          identityVerificationStatus: IdentityVerificationStatus.UNSTARTED,
          travelClassification: null,
          pendingHomeCountry: null,
          pendingHomeCountryConfirmedAt: null,
          verifiedHomeCountryConfirmedAt: new Date(),
        },
      });
      await w.service.startOrResume('user-1');
      await w.send(w.sessions[0].diditSessionId, 'Approved');

      expect(identity(w)).toBe(IdentityVerificationStatus.VERIFIED);
      expect(notified(w)).toHaveLength(0);
    });

    it('is never sent for an unrelated ordinary session approved while a claim is pending', async () => {
      const w = world({
        sessions: [
          {
            id: 'row-ordinary',
            profileId: 'profile-1',
            diditSessionId: 'didit-ordinary',
            vendorReference: 'bbbbbbbb-0000-4000-8000-000000000002',
            status: HostedKycSessionStatus.CREATED,
            createdAt: new Date(T0.getTime() - 86_400_000),
          },
        ],
      });
      await w.startChange();
      await w.send('didit-ordinary', 'Approved');

      expect(notified(w)).toHaveLength(0);
      expect(w.profile.verifiedHomeCountry).toBe('US');
    });

    it('is never sent for a stale session approved after a newer one was started; the current one still notifies, once', async () => {
      const w = world();
      const s1 = await w.startChange();
      await w.send(s1, 'Abandoned');
      const s2 = await w.startChange();

      await w.send(s1, 'Approved', { timestamp: NOW_S - 1 });
      expect(notified(w)).toHaveLength(0);

      await w.send(s2, 'Approved');
      expect(notified(w)).toEqual([{ userId: 'user-1', hostedKycSessionId: w.sessions[1].id }]);
    });

    it('is never sent for a session started for a country that is no longer the pending one', async () => {
      const w = world();
      const s1 = await w.startChange();
      w.profile.pendingHomeCountry = 'MX';
      w.profile.pendingRelocationSessionId = null;

      await w.send(s1, 'Approved');
      expect(notified(w)).toHaveLength(0);
    });

    it('is never sent for a withdrawn claim', async () => {
      const w = world();
      const s1 = await w.startChange();
      w.profile.travelClassification = TravelClassification.TEMPORARILY_TRAVELING;
      w.profile.pendingHomeCountry = null;
      w.profile.pendingHomeCountryConfirmedAt = null;
      w.profile.pendingRelocationSessionId = null;

      await w.send(s1, 'Approved');
      expect(notified(w)).toHaveLength(0);
    });

    it.each([
      ['Declined'],
      ['Abandoned'],
      ['Expired'],
      ['In Review'],
      ['In Progress'],
    ])('is never sent for %s', async (didit) => {
      const w = world();
      const s1 = await w.startChange();
      await w.send(s1, didit);
      expect(notified(w)).toHaveLength(0);
    });

    it('a later "Kyc Expired" on the approved session does not notify again', async () => {
      const w = world();
      const s1 = await w.startChange();
      await w.send(s1, 'Approved');
      await w.send(s1, 'Kyc Expired');
      expect(notified(w)).toHaveLength(1);
    });

    describe('a notification problem never undoes or fails the approved change', () => {
      it('the broker refusing the hand-off (it resolves false): the change stays applied, nothing is raised', async () => {
        const w = world();
        const s1 = await w.startChange();
        w.notifications.homeCountryUpdated.mockResolvedValue(false);

        await expect(w.send(s1, 'Approved')).resolves.toBeUndefined();

        expect(w.profile.verifiedHomeCountry).toBe('CA');
        expect(identity(w)).toBe(IdentityVerificationStatus.VERIFIED);
        expect(w.profile.pendingHomeCountry).toBeNull();
        expect(w.sessions[0].status).toBe(HostedKycSessionStatus.APPROVED);
      });

      it('even a publisher that throws cannot fail the webhook or undo the change', async () => {
        const w = world();
        const s1 = await w.startChange();
        w.notifications.homeCountryUpdated.mockRejectedValue(new Error('amqp down'));

        await expect(w.send(s1, 'Approved')).resolves.toBeUndefined();

        expect(w.profile.verifiedHomeCountry).toBe('CA');
        expect(identity(w)).toBe(IdentityVerificationStatus.VERIFIED);
        // The identity and country events still went out.
        expect(published(w, IdentityVerificationEventType.HOME_COUNTRY_UPDATED)).toBe(1);
      });

      it('a throwing publisher during reconciliation does not fail it either', async () => {
        const w = world();
        const s1 = await w.startChange();
        w.decisions.set(s1, 'Approved');
        w.notifications.homeCountryUpdated.mockRejectedValue(new Error('amqp down'));

        await expect(w.service.reconcileForUser('user-1')).resolves.toEqual({ outcome: 'updated' });
        expect(w.profile.verifiedHomeCountry).toBe('CA');
      });

      it('the event publisher failing does not stop the notification, and vice versa', async () => {
        const w = world();
        const s1 = await w.startChange();
        w.events.publish.mockRejectedValue(new Error('exchange down'));

        await expect(w.send(s1, 'Approved')).resolves.toBeUndefined();
        expect(notified(w)).toHaveLength(1);
        expect(w.profile.verifiedHomeCountry).toBe('CA');
      });

      it('without an event publisher configured the notification is still sent', async () => {
        const w = world({ noEvents: true });
        const s1 = await w.startChange();
        await w.send(s1, 'Approved');
        expect(notified(w)).toHaveLength(1);
      });
    });
  });
});
