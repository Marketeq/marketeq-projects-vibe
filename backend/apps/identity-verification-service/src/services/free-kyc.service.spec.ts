import { BadRequestException } from '@nestjs/common';
import { FreeKycService, HOME_COUNTRY_CONFIRMATION_WINDOW_MS, mapDiditStatusToKycStatus } from './free-kyc.service';
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
  InvalidWebhookSignatureException,
  KycNotStartableException,
  RetryLimitExceededException,
  UnknownKycSessionException,
  VendorOutcomeUnknownException,
  VendorStageUnavailableException,
} from '../common/errors/domain-exceptions';

// Offline: every repository, the data source and the Didit provider are mocks.
describe('FreeKycService', () => {
  const HOSTED_URL = 'https://verify.didit.me/session/abc123';
  const SECRET = 'wh-secret';

  const confirmedProfile = (overrides: Record<string, unknown> = {}) => ({
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
    ...overrides,
  });

  function build(opts: {
    profile?: any;
    activeSession?: any;
    // Attempts already used in the CURRENT retry cycle (declined hosted sessions
    // that each have one attempt row, none yet closing the cycle).
    attemptCount?: number;
    // Full hosted-session / attempt history, for cycle tests (overrides attemptCount).
    history?: { sessions: any[]; attempts: any[] };
    providerResult?: any;
    providerError?: Error;
    session?: any;
    existingAttempt?: any;
    insertError?: any;
    decision?: Record<string, unknown>;
    decisionError?: Error;
  } = {}) {
    const profile = opts.profile === undefined ? confirmedProfile() : opts.profile;
    const history = opts.history ?? {
      sessions: Array.from({ length: opts.attemptCount ?? 0 }, (_v, i) => ({
        id: `hist-row-${i + 1}`,
        profileId: 'profile-1',
        diditSessionId: `hist-${i + 1}`,
        status: HostedKycSessionStatus.DECLINED,
        createdAt: new Date(Date.UTC(2020, 0, 1, 0, 0, i)),
      })),
      attempts: Array.from({ length: opts.attemptCount ?? 0 }, (_v, i) => ({ vendorSessionId: `hist-${i + 1}` })),
    };
    const profileRepository = {
      findOne: jest.fn().mockResolvedValue(profile),
      save: jest.fn((p: any) => Promise.resolve(p)),
    };
    const sessionRepository = {
      findOne: jest.fn().mockImplementation(async (q: any) => {
        if (q?.where?.diditSessionId) return opts.session ?? null;
        return opts.activeSession ?? null;
      }),
      find: jest.fn().mockImplementation(async () => history.sessions),
      create: jest.fn((d: any) => ({ id: 'row-1', ...d })),
      save: jest.fn((d: any) => Promise.resolve(d)),
    };
    const attemptRepository = {
      count: jest.fn().mockResolvedValue(opts.attemptCount ?? 0),
      find: jest.fn().mockImplementation(async () => history.attempts),
      findOne: jest.fn().mockResolvedValue(opts.existingAttempt ?? null),
      insert: jest.fn().mockResolvedValue(undefined),
    };
    const pendingSessionRepository = { count: jest.fn().mockResolvedValue(0) };
    const documentRepository = { count: jest.fn().mockResolvedValue(0) };
    const reservationRepository = { count: jest.fn().mockResolvedValue(0) };
    const processedRepository = {
      insert: jest.fn().mockImplementation(async () => {
        if (opts.insertError) throw opts.insertError;
      }),
    };
    const byEntity = new Map<unknown, any>([
      [HostedKycSession, sessionRepository],
      [IdentityVerificationProfile, profileRepository],
      [VerificationAttempt, attemptRepository],
      [PendingVerificationSession, pendingSessionRepository],
      [IdentityDocument, documentRepository],
      [AttemptReservation, reservationRepository],
      [ProcessedWebhookEvent, processedRepository],
    ]);
    const manager = { getRepository: (entity: unknown) => byEntity.get(entity) };
    const queryRunner = {
      connect: jest.fn().mockResolvedValue(undefined),
      startTransaction: jest.fn().mockResolvedValue(undefined),
      query: jest.fn().mockResolvedValue([]),
      commitTransaction: jest.fn().mockResolvedValue(undefined),
      rollbackTransaction: jest.fn().mockResolvedValue(undefined),
      release: jest.fn().mockResolvedValue(undefined),
      isTransactionActive: true,
    };
    const dataSource = {
      createQueryRunner: jest.fn().mockReturnValue(queryRunner),
      transaction: jest.fn((cb: any) => cb(manager)),
    };
    const provider = {
      // Didit's current view of the stored session. Default: it is still
      // in progress and demonstrably the same session (ownership fields match).
      getSessionDecision: jest.fn(async (sessionId: string) => {
        if (opts.decisionError) throw opts.decisionError;
        const row = opts.activeSession ?? opts.session;
        return {
          sessionId: row?.diditSessionId ?? sessionId,
          status: 'In Progress',
          vendorData: row?.vendorReference ?? null,
          workflowId: 'wf-kyc',
          environment: 'sandbox',
          applicationId: null,
          ...(opts.decision ?? {}),
        };
      }),
      createKycSession: jest.fn(async () => {
        if (opts.providerError) throw opts.providerError;
        return opts.providerResult ?? { sessionId: 'didit-1', url: HOSTED_URL, status: 'Not Started' };
      }),
    };
    const service = new FreeKycService(
      profileRepository as any,
      sessionRepository as any,
      attemptRepository as any,
      pendingSessionRepository as any,
      documentRepository as any,
      reservationRepository as any,
      dataSource as any,
      provider as any,
    );
    return { service, profile, profileRepository, sessionRepository, attemptRepository, processedRepository, provider, queryRunner, dataSource };
  }

  beforeEach(() => {
    process.env.DIDIT_FREE_KYC_WORKFLOW_ID = 'wf-kyc';
    process.env.FRONTEND_URL = 'http://localhost:3000/';
    process.env.DIDIT_WEBHOOK_SECRET = SECRET;
    process.env.DIDIT_EXPECTED_ENVIRONMENT = 'sandbox';
    delete process.env.DIDIT_APPLICATION_ID;
  });
  afterEach(() => {
    for (const k of ['DIDIT_FREE_KYC_WORKFLOW_ID', 'FRONTEND_URL', 'DIDIT_WEBHOOK_SECRET', 'DIDIT_EXPECTED_ENVIRONMENT']) delete process.env[k];
  });

  const reasonOf = async (p: Promise<unknown>) => {
    try {
      await p;
    } catch (e) {
      return { type: e as Error, reason: (e as any).getResponse?.()?.details?.reason };
    }
    return null;
  };

  // ------------------------------------------------------------------ start
  describe('startOrResume — new session', () => {
    it('creates one hosted session: workflow from config, opaque vendor reference, callback to /talent-dashboard', async () => {
      const { service, provider, sessionRepository } = build();
      const result = await service.startOrResume('user-1');

      expect(result).toEqual({ url: HOSTED_URL });
      expect(provider.createKycSession).toHaveBeenCalledTimes(1);
      const call = (provider.createKycSession.mock.calls[0] as any[])[0];
      expect(call.workflowId).toBe('wf-kyc');
      expect(call.vendorData).toMatch(/^[0-9a-f-]{36}$/);
      expect(call.callbackUrl).toBe('http://localhost:3000/talent-dashboard');
      // vendor_data carries no user id or profile id.
      expect(call.vendorData).not.toContain('user-1');
      expect(call.vendorData).not.toContain('profile-1');

      const saved = sessionRepository.create.mock.calls[0][0];
      expect(saved).toEqual({
        profileId: 'profile-1',
        diditSessionId: 'didit-1',
        vendorReference: call.vendorData,
        status: HostedKycSessionStatus.CREATED,
      });
      // The hosted URL is never persisted.
      expect(JSON.stringify(saved)).not.toContain('didit.me');
    });

    it('moves the profile to in_progress', async () => {
      const { service, profile } = build();
      await service.startOrResume('user-1');
      expect(profile.identityVerificationStatus).toBe(IdentityVerificationStatus.IN_PROGRESS);
    });

    it('serializes on a per-profile transaction-scoped advisory lock (double-click / concurrent safety)', async () => {
      const { service, queryRunner } = build();
      await service.startOrResume('user-1');
      expect(queryRunner.startTransaction).toHaveBeenCalled();
      expect(queryRunner.query).toHaveBeenCalledWith('SELECT pg_advisory_xact_lock(hashtext($1))', ['identity-kyc-start:profile-1']);
      expect(queryRunner.commitTransaction).toHaveBeenCalled();
      expect(queryRunner.release).toHaveBeenCalled();
    });

    it('two concurrent starts (serialized) create exactly one session and both get the URL', async () => {
      const { service, provider, sessionRepository } = build();
      // Make the shared state behave like the DB: after the first create, the
      // next lookup finds the active session.
      let created: any = null;
      sessionRepository.save.mockImplementation(async (d: any) => {
        created = d;
        return d;
      });
      sessionRepository.findOne.mockImplementation(async (q: any) => (q?.where?.diditSessionId ? null : created));
      provider.getSessionDecision.mockImplementation(async () => ({
        sessionId: created.diditSessionId,
        status: 'Not Started',
        vendorData: created.vendorReference,
        workflowId: 'wf-kyc',
        environment: 'sandbox',
        applicationId: null,
      }));
      let tail: Promise<unknown> = Promise.resolve();
      (service as any).withProfileLock = (_id: string, work: () => Promise<any>) => {
        const next = tail.then(work, work);
        tail = next.catch(() => undefined);
        return next;
      };
      const [a, b] = await Promise.all([service.startOrResume('user-1'), service.startOrResume('user-1')]);
      expect(a).toEqual({ url: HOSTED_URL });
      expect(b).toEqual({ url: HOSTED_URL });
      expect(sessionRepository.create).toHaveBeenCalledTimes(1);
      // Second call resumed with the SAME vendor reference (Didit-side reuse).
      const refs = provider.createKycSession.mock.calls.map((c: any[]) => c[0].vendorData);
      expect(refs[0]).toBe(refs[1]);
    });

    it('requires a fresh confirmation for a NEW session (older than the 15-minute window)', async () => {
      const stale = new Date(Date.now() - HOME_COUNTRY_CONFIRMATION_WINDOW_MS - 1000);
      const { service, provider } = build({ profile: confirmedProfile({ verifiedHomeCountryConfirmedAt: stale }) });
      const r = await reasonOf(service.startOrResume('user-1'));
      expect(r?.type).toBeInstanceOf(HomeCountryConfirmationRequiredException);
      expect(r?.reason).toBe('confirmation_stale');
      expect(provider.createKycSession).not.toHaveBeenCalled();
    });

    it('accepts a confirmation just inside the window', async () => {
      const fresh = new Date(Date.now() - HOME_COUNTRY_CONFIRMATION_WINDOW_MS + 60_000);
      const { service } = build({ profile: confirmedProfile({ verifiedHomeCountryConfirmedAt: fresh }) });
      await expect(service.startOrResume('user-1')).resolves.toEqual({ url: HOSTED_URL });
    });

    it.each([
      ['no profile', null, 'no_profile'],
      ['location never verified', confirmedProfile({ locationVerificationStatus: LocationVerificationStatus.NOT_VERIFIED }), 'not_confirmed'],
      ['no verified country', confirmedProfile({ verifiedHomeCountry: null }), 'not_confirmed'],
      ['no confirmation timestamp', confirmedProfile({ verifiedHomeCountryConfirmedAt: null }), 'not_confirmed'],
    ])('rejects: %s', async (_n, profile, reason) => {
      const { service, provider } = build({ profile });
      const r = await reasonOf(service.startOrResume('user-1'));
      expect(r?.type).toBeInstanceOf(HomeCountryConfirmationRequiredException);
      expect(r?.reason).toBe(reason);
      expect(provider.createKycSession).not.toHaveBeenCalled();
    });

    it('rejects while Travel Mode is active', async () => {
      const { service, provider } = build({ profile: confirmedProfile({ travelModeActive: true, travelClassification: TravelClassification.TEMPORARILY_TRAVELING }) });
      const r = await reasonOf(service.startOrResume('user-1'));
      expect(r?.type).toBeInstanceOf(HomeCountryConfirmationRequiredException);
      expect(r?.reason).toBe('travel_mode');
      expect(provider.createKycSession).not.toHaveBeenCalled();
    });

    it('rejects a temporary-travel classification even if travel mode is not currently active', async () => {
      const { service } = build({ profile: confirmedProfile({ travelClassification: TravelClassification.TEMPORARILY_TRAVELING }) });
      expect((await reasonOf(service.startOrResume('user-1')))?.reason).toBe('travel_mode');
    });

    it('allows a profile whose travel state is cleared (travel ended: not active, no temporary classification)', async () => {
      const { service } = build({ profile: confirmedProfile({ travelModeActive: false, travelClassification: null }) });
      await expect(service.startOrResume('user-1')).resolves.toEqual({ url: HOSTED_URL });
    });

    it.each([
      [IdentityVerificationStatus.VERIFIED],
      [IdentityVerificationStatus.PENDING],
      [IdentityVerificationStatus.BLOCKED_DUPLICATE],
      [IdentityVerificationStatus.BLOCKED_AGE],
    ])('refuses to start when the profile is %s', async (status) => {
      const { service, provider } = build({ profile: confirmedProfile({ identityVerificationStatus: status }) });
      await expect(service.startOrResume('user-1')).rejects.toBeInstanceOf(KycNotStartableException);
      expect(provider.createKycSession).not.toHaveBeenCalled();
    });

    it('refuses to start when failed_final', async () => {
      const { service } = build({ profile: confirmedProfile({ identityVerificationStatus: IdentityVerificationStatus.FAILED_FINAL }) });
      await expect(service.startOrResume('user-1')).rejects.toBeInstanceOf(RetryLimitExceededException);
    });

    it('refuses a new session after the third decline of a cycle (failed_final) BEFORE calling Didit', async () => {
      const { service, provider } = build({
        attemptCount: 3,
        profile: confirmedProfile({ identityVerificationStatus: IdentityVerificationStatus.FAILED_FINAL }),
      });
      await expect(service.startOrResume('user-1')).rejects.toBeInstanceOf(RetryLimitExceededException);
      expect(provider.createKycSession).not.toHaveBeenCalled();
    });

    it('allows a new session when two attempts have been used', async () => {
      const { service } = build({ attemptCount: 2 });
      await expect(service.startOrResume('user-1')).resolves.toEqual({ url: HOSTED_URL });
    });
  });

  describe('startOrResume — active session', () => {
    const active = () => ({ id: 'row-1', profileId: 'profile-1', diditSessionId: 'didit-1', vendorReference: '11111111-1111-1111-1111-111111111111', status: HostedKycSessionStatus.IN_PROGRESS });

    it('resumes via Didit\'s same-vendor_data reuse with the SAME reference, creating no new row', async () => {
      const { service, provider, sessionRepository } = build({ activeSession: active(), profile: confirmedProfile({ identityVerificationStatus: IdentityVerificationStatus.IN_PROGRESS }) });
      await expect(service.startOrResume('user-1')).resolves.toEqual({ url: HOSTED_URL });
      expect((provider.createKycSession.mock.calls[0] as any[])[0].vendorData).toBe('11111111-1111-1111-1111-111111111111');
      expect(sessionRepository.create).not.toHaveBeenCalled();
      expect(sessionRepository.save).not.toHaveBeenCalled();
    });

    it('does NOT create a duplicate merely because the 15-minute window expired', async () => {
      const stale = new Date(Date.now() - 3 * HOME_COUNTRY_CONFIRMATION_WINDOW_MS);
      const { service, provider, sessionRepository } = build({
        activeSession: active(),
        profile: confirmedProfile({ verifiedHomeCountryConfirmedAt: stale, identityVerificationStatus: IdentityVerificationStatus.IN_PROGRESS }),
      });
      await expect(service.startOrResume('user-1')).resolves.toEqual({ url: HOSTED_URL });
      expect(sessionRepository.create).not.toHaveBeenCalled();
      expect(provider.createKycSession).toHaveBeenCalledTimes(1);
    });

    it('still refuses to resume while Travel Mode is active', async () => {
      const { service, provider } = build({ activeSession: active(), profile: confirmedProfile({ travelModeActive: true, identityVerificationStatus: IdentityVerificationStatus.IN_PROGRESS }) });
      await expect(service.startOrResume('user-1')).rejects.toBeInstanceOf(HomeCountryConfirmationRequiredException);
      expect(provider.createKycSession).not.toHaveBeenCalled();
    });

    it('tracks a different Didit session id returned for the same reference', async () => {
      const row = active();
      const { service, sessionRepository } = build({
        activeSession: row,
        providerResult: { sessionId: 'didit-2', url: HOSTED_URL, status: 'Not Started' },
        profile: confirmedProfile({ identityVerificationStatus: IdentityVerificationStatus.IN_PROGRESS }),
      });
      await service.startOrResume('user-1');
      expect(row.diditSessionId).toBe('didit-2');
      expect(sessionRepository.save).toHaveBeenCalledWith(row);
    });
  });

  describe('startOrResume — configuration and vendor failures', () => {
    it('fails without calling Didit when the workflow ID is not configured', async () => {
      delete process.env.DIDIT_FREE_KYC_WORKFLOW_ID;
      const { service, provider } = build();
      const r = await reasonOf(service.startOrResume('user-1'));
      expect(r?.type).toBeInstanceOf(VendorStageUnavailableException);
      expect(r?.reason).toBe('free_kyc_not_configured');
      expect(provider.createKycSession).not.toHaveBeenCalled();
    });

    it.each([
      ['http://verify.didit.me/x'],
      ['https://evil.example.com/x'],
      ['https://verify.didit.me.evil.com/x'],
      ['javascript:alert(1)'],
    ])('rejects a non-Didit / non-https hosted URL (%s) and creates no session row', async (url) => {
      const { service, sessionRepository } = build({ providerResult: { sessionId: 'didit-1', url, status: 'Not Started' } });
      const r = await reasonOf(service.startOrResume('user-1'));
      expect(r?.type).toBeInstanceOf(VendorStageUnavailableException);
      expect(r?.reason).toBe('invalid_hosted_url');
      expect(sessionRepository.save).not.toHaveBeenCalled();
    });

    it('maps a Didit API failure to a generic vendor-unavailable error without leaking secrets or the vendor body', async () => {
      process.env.DIDIT_API_KEY = 'super-secret-api-key';
      try {
        const { service } = build({ providerError: new VendorAuthOrCreditError('invalid_api_key', { detail: 'body-with-token-xyz' }) });
        const warn = jest.spyOn((service as any).logger, 'warn').mockImplementation(() => undefined);
        let thrown: any;
        try {
          await service.startOrResume('user-1');
        } catch (e) {
          thrown = e;
        }
        expect(thrown).toBeInstanceOf(VendorStageUnavailableException);
        const everything = JSON.stringify([thrown.getResponse(), warn.mock.calls]);
        expect(everything).not.toContain('super-secret-api-key');
        expect(everything).not.toContain('body-with-token-xyz');
        expect(everything).not.toContain('wf-kyc');
        expect(everything).toContain('VendorAuthOrCreditError');
      } finally {
        delete process.env.DIDIT_API_KEY;
      }
    });

    it('maps a malformed vendor response to vendor-unavailable', async () => {
      const { service } = build({ providerError: new MalformedVendorResponseError('missing_session_id_or_url') });
      await expect(service.startOrResume('user-1')).rejects.toBeInstanceOf(VendorStageUnavailableException);
    });

    it('maps a lost response to vendor-outcome-unknown and stores nothing', async () => {
      const { service, sessionRepository } = build({ providerError: new AmbiguousVendorOutcomeError(new Error('ECONNRESET')) });
      await expect(service.startOrResume('user-1')).rejects.toBeInstanceOf(VendorOutcomeUnknownException);
      expect(sessionRepository.save).not.toHaveBeenCalled();
    });
  });

  // ------------------------------------------------ fallback reconciliation
  describe('startOrResume — fallback reconciliation with Didit (server-to-server)', () => {
    const REF = '11111111-1111-1111-1111-111111111111';
    const activeRow = (over: Record<string, unknown> = {}) => ({
      id: 'row-1', profileId: 'profile-1', diditSessionId: 'didit-1', vendorReference: REF,
      status: HostedKycSessionStatus.CREATED, ...over,
    });
    const inProgressProfile = (over: Record<string, unknown> = {}) =>
      confirmedProfile({ identityVerificationStatus: IdentityVerificationStatus.IN_PROGRESS, ...over });
    const setup = (decisionStatus: string, extra: Record<string, unknown> = {}) => {
      const row = activeRow();
      const h = build({ activeSession: row, profile: inProgressProfile(), decision: { status: decisionStatus }, ...extra });
      return { h, row };
    };
    const quiet = (h: ReturnType<typeof build>) => jest.spyOn((h.service as any).logger, 'warn').mockImplementation(() => undefined);

    describe('it runs only when an active session exists, and queries the exact stored session id', () => {
      it('no active row: Didit is never queried and a new session is created as before', async () => {
        const h = build();
        await h.service.startOrResume('user-1');
        expect(h.provider.getSessionDecision).not.toHaveBeenCalled();
        expect(h.provider.createKycSession).toHaveBeenCalledTimes(1);
      });

      it('active row: queries Didit with exactly the stored didit_session_id', async () => {
        const { h } = setup('In Progress');
        await h.service.startOrResume('user-1');
        expect(h.provider.getSessionDecision).toHaveBeenCalledTimes(1);
        expect(h.provider.getSessionDecision).toHaveBeenCalledWith('didit-1');
      });

      it('runs inside the per-profile advisory lock (the existing locked start path)', async () => {
        const { h } = setup('In Progress');
        const order: string[] = [];
        h.queryRunner.query.mockImplementation(async () => void order.push('lock'));
        h.provider.getSessionDecision.mockImplementation(async () => {
          order.push('decision');
          return { sessionId: 'didit-1', status: 'In Progress', vendorData: REF, workflowId: 'wf-kyc', environment: 'sandbox', applicationId: null };
        });
        await h.service.startOrResume('user-1');
        expect(order.slice(0, 2)).toEqual(['lock', 'decision']);
      });
    });

    describe('every Didit status', () => {
      it('Approved → profile verified, session approved, NO new session (not startable)', async () => {
        const { h, row } = setup('Approved');
        await expect(h.service.startOrResume('user-1')).rejects.toBeInstanceOf(KycNotStartableException);
        expect(h.profile.identityVerificationStatus).toBe(IdentityVerificationStatus.VERIFIED);
        expect(row.status).toBe(HostedKycSessionStatus.APPROVED);
        expect(h.provider.createKycSession).not.toHaveBeenCalled();
        expect(h.sessionRepository.create).not.toHaveBeenCalled();
      });

      it('Declined → exactly one attempt row, profile failed, then a NEW session (attempts remain)', async () => {
        const { h, row } = setup('Declined', { attemptCount: 0 });
        await expect(h.service.startOrResume('user-1')).resolves.toEqual({ url: HOSTED_URL });
        expect(h.attemptRepository.insert).toHaveBeenCalledTimes(1);
        expect(h.attemptRepository.insert).toHaveBeenCalledWith(expect.objectContaining({ vendorSessionId: 'didit-1', documentId: null, attemptMethod: null, attemptDocumentType: null }));
        expect(row.status).toBe(HostedKycSessionStatus.DECLINED);
        // Replacement session uses a NEW opaque reference.
        expect(h.provider.createKycSession).toHaveBeenCalledTimes(1);
        expect((h.provider.createKycSession.mock.calls[0] as any[])[0].vendorData).not.toBe(REF);
        expect(h.sessionRepository.create).toHaveBeenCalledTimes(1);
      });

      it('Declined that uses the third attempt → failed_final and NO new session', async () => {
        const { h } = setup('Declined', { attemptCount: 2 });
        await expect(h.service.startOrResume('user-1')).rejects.toBeInstanceOf(RetryLimitExceededException);
        expect(h.profile.identityVerificationStatus).toBe(IdentityVerificationStatus.FAILED_FINAL);
        expect(h.provider.createKycSession).not.toHaveBeenCalled();
      });

      it('Declined arriving after the profile is already failed_final → no extra attempt and still no new session', async () => {
        const { h } = setup('Declined', {
          attemptCount: 3,
          profile: inProgressProfile({ identityVerificationStatus: IdentityVerificationStatus.FAILED_FINAL }),
        });
        await expect(h.service.startOrResume('user-1')).rejects.toBeInstanceOf(RetryLimitExceededException);
        expect(h.attemptRepository.insert).not.toHaveBeenCalled();
        expect(h.provider.createKycSession).not.toHaveBeenCalled();
      });

      it('In Review → profile pending, NO new session', async () => {
        const { h, row } = setup('In Review');
        await expect(h.service.startOrResume('user-1')).rejects.toBeInstanceOf(KycNotStartableException);
        expect(h.profile.identityVerificationStatus).toBe(IdentityVerificationStatus.PENDING);
        expect(row.status).toBe(HostedKycSessionStatus.IN_REVIEW);
        expect(h.provider.createKycSession).not.toHaveBeenCalled();
      });

      it.each(['Abandoned', 'Expired'])('%s → consumes no attempt and a new session is allowed under the existing rules', async (status) => {
        const { h, row } = setup(status);
        await expect(h.service.startOrResume('user-1')).resolves.toEqual({ url: HOSTED_URL });
        expect(h.attemptRepository.insert).not.toHaveBeenCalled();
        expect(row.status).toBe(status === 'Abandoned' ? HostedKycSessionStatus.ABANDONED : HostedKycSessionStatus.EXPIRED);
        expect(h.provider.createKycSession).toHaveBeenCalledTimes(1);
        expect((h.provider.createKycSession.mock.calls[0] as any[])[0].vendorData).not.toBe(REF);
      });

      it('Abandoned still needs a fresh confirmation for the replacement (existing rule)', async () => {
        const stale = new Date(Date.now() - 3 * HOME_COUNTRY_CONFIRMATION_WINDOW_MS);
        const row = activeRow();
        const h = build({ activeSession: row, profile: inProgressProfile({ verifiedHomeCountryConfirmedAt: stale }), decision: { status: 'Abandoned' } });
        await expect(h.service.startOrResume('user-1')).rejects.toBeInstanceOf(HomeCountryConfirmationRequiredException);
        expect(h.provider.createKycSession).not.toHaveBeenCalled();
      });

      it.each(['Not Started', 'In Progress', 'Resubmitted', 'Awaiting User'])('%s → the existing session is RESUMED (same reference, no new row, no state change)', async (status) => {
        const { h, row } = setup(status);
        await expect(h.service.startOrResume('user-1')).resolves.toEqual({ url: HOSTED_URL });
        expect((h.provider.createKycSession.mock.calls[0] as any[])[0].vendorData).toBe(REF);
        expect(h.sessionRepository.create).not.toHaveBeenCalled();
        expect(row.status).toBe(HostedKycSessionStatus.CREATED);
        expect(h.attemptRepository.insert).not.toHaveBeenCalled();
        expect(h.profile.identityVerificationStatus).toBe(IdentityVerificationStatus.IN_PROGRESS);
      });

      it.each(['Kyc Expired', 'approved', 'APPROVED', 'Something New', ''])('unusable status %p fails closed: no state change, no new session', async (status) => {
        const { h, row } = setup(status);
        quiet(h);
        const r = await reasonOf(h.service.startOrResume('user-1'));
        expect(r?.type).toBeInstanceOf(VendorStageUnavailableException);
        expect(r?.reason).toBe('decision_unusable_status');
        expect(row.status).toBe(HostedKycSessionStatus.CREATED);
        expect(h.profile.identityVerificationStatus).toBe(IdentityVerificationStatus.IN_PROGRESS);
        expect(h.provider.createKycSession).not.toHaveBeenCalled();
      });
    });

    describe('ownership validation (fail closed, no state change, no new session)', () => {
      const cases: Array<[string, Record<string, unknown>, string]> = [
        ['a different session id', { sessionId: 'someone-elses' }, 'decision_session_mismatch'],
        ['a different vendor_data', { vendorData: '99999999-9999-9999-9999-999999999999' }, 'decision_vendor_data_mismatch'],
        ['vendor_data absent', { vendorData: null }, 'decision_missing_field'],
        ['a different workflow id', { workflowId: 'wf-other' }, 'decision_workflow_mismatch'],
        ['workflow id absent', { workflowId: null }, 'decision_missing_field'],
        ['the wrong environment', { environment: 'live' }, 'decision_environment_mismatch'],
      ];
      it.each(cases)('%s', async (_name, override, reason) => {
        const { h, row } = setup('Approved', { decision: { status: 'Approved', ...override } });
        const warn = quiet(h);
        const r = await reasonOf(h.service.startOrResume('user-1'));
        expect(r?.type).toBeInstanceOf(VendorStageUnavailableException);
        expect(r?.reason).toBe(reason);
        expect(row.status).toBe(HostedKycSessionStatus.CREATED);
        expect(h.profile.identityVerificationStatus).toBe(IdentityVerificationStatus.IN_PROGRESS);
        expect(h.provider.createKycSession).not.toHaveBeenCalled();
        expect(h.attemptRepository.insert).not.toHaveBeenCalled();
        // Logs carry the fixed reason only — never ids, references or workflow ids.
        const logged = JSON.stringify(warn.mock.calls);
        for (const secret of ['didit-1', REF, 'wf-kyc', 'someone-elses', 'wf-other']) expect(logged).not.toContain(secret);
      });

      it('a mismatched application id is rejected when both sides have one', async () => {
        process.env.DIDIT_APPLICATION_ID = 'app-1';
        try {
          const { h } = setup('Approved', { decision: { status: 'Approved', applicationId: 'app-2' } });
          quiet(h);
          expect((await reasonOf(h.service.startOrResume('user-1')))?.reason).toBe('decision_application_mismatch');
          expect(h.provider.createKycSession).not.toHaveBeenCalled();
        } finally {
          delete process.env.DIDIT_APPLICATION_ID;
        }
      });

      it('an absent environment or application id is not a failure (validated only when present)', async () => {
        process.env.DIDIT_APPLICATION_ID = 'app-1';
        try {
          const { h } = setup('In Progress', { decision: { status: 'In Progress', environment: null, applicationId: null } });
          await expect(h.service.startOrResume('user-1')).resolves.toEqual({ url: HOSTED_URL });
        } finally {
          delete process.env.DIDIT_APPLICATION_ID;
        }
      });

      it('a matching application id and environment are accepted', async () => {
        process.env.DIDIT_APPLICATION_ID = 'app-1';
        try {
          const { h } = setup('In Progress', { decision: { status: 'In Progress', environment: 'sandbox', applicationId: 'app-1' } });
          await expect(h.service.startOrResume('user-1')).resolves.toEqual({ url: HOSTED_URL });
        } finally {
          delete process.env.DIDIT_APPLICATION_ID;
        }
      });

      it('"live" is the expected environment only when DIDIT_EXPECTED_ENVIRONMENT=live', async () => {
        process.env.DIDIT_EXPECTED_ENVIRONMENT = 'live';
        const { h } = setup('In Progress', { decision: { status: 'In Progress', environment: 'live' } });
        await expect(h.service.startOrResume('user-1')).resolves.toEqual({ url: HOSTED_URL });
      });
    });

    describe('Didit failures fail closed and never create a replacement session', () => {
      const failures: Array<[string, Error, string]> = [
        ['404 (unknown session)', new HostedSessionNotFoundError(), 'decision_session_not_found'],
        ['timeout / network', new VendorTransportError(new Error('timeout')), 'VendorTransportError'],
        ['Didit 5xx', new VendorTransportError(new Error('Unexpected Didit status 503')), 'VendorTransportError'],
        ['malformed response', new MalformedVendorResponseError('missing_session_id_or_status'), 'MalformedVendorResponseError'],
        ['auth failure', new VendorAuthOrCreditError('invalid_api_key', { detail: 'secret-body' }), 'VendorAuthOrCreditError'],
        ['rate limited', new VendorRateLimitedError(30), 'VendorRateLimitedError'],
        ['ambiguous outcome', new AmbiguousVendorOutcomeError(new Error('ECONNRESET')), 'AmbiguousVendorOutcomeError'],
      ];
      it.each(failures)('%s', async (_name, error, reason) => {
        const { h, row } = setup('Approved', { decisionError: error });
        const warn = quiet(h);
        const r = await reasonOf(h.service.startOrResume('user-1'));
        expect(r?.type).toBeInstanceOf(VendorStageUnavailableException);
        expect(r?.reason).toBe(reason);
        expect(h.provider.createKycSession).not.toHaveBeenCalled();
        expect(h.sessionRepository.create).not.toHaveBeenCalled();
        expect(row.status).toBe(HostedKycSessionStatus.CREATED);
        expect(h.profile.identityVerificationStatus).toBe(IdentityVerificationStatus.IN_PROGRESS);
        expect(JSON.stringify(warn.mock.calls)).not.toContain('secret-body');
      });
    });

    describe('replay safety and attempt idempotency (shared code with the signed webhook)', () => {
      const webhookBody = (status: string, eventId: string, ts: number) => ({
        event_id: eventId, session_id: 'didit-1', webhook_type: 'status.updated', timestamp: ts, created_at: 'x',
        application_id: 'app', environment: 'sandbox', status, workflow_id: 'wf-kyc', vendor_data: REF, metadata: null, decision: null,
      });
      const deliver = (h: ReturnType<typeof build>, body: any) =>
        h.service.handleWebhook(Buffer.from(JSON.stringify(body)), { signatureV2: computeDiditSignatureV2(body, SECRET), timestamp: String(Math.floor(Date.now() / 1000)) });
      const nowTs = () => Math.floor(Date.now() / 1000);

      it('a webhook Approved arriving AFTER an Approved reconciliation changes nothing and errors on nothing', async () => {
        const { h, row } = setup('Approved', { session: undefined });
        h.sessionRepository.findOne.mockImplementation(async (q: any) => (q?.where?.diditSessionId ? row : q?.where?.id ? row : row));
        await expect(h.service.startOrResume('user-1')).rejects.toBeInstanceOf(KycNotStartableException);
        await deliver(h, webhookBody('Approved', 'e-1', nowTs()));
        expect(row.status).toBe(HostedKycSessionStatus.APPROVED);
        expect(h.profile.identityVerificationStatus).toBe(IdentityVerificationStatus.VERIFIED);
      });

      it('a webhook Declined after a Declined reconciliation adds NO second attempt', async () => {
        const { h, row } = setup('Declined', { attemptCount: 0 });
        // Stateful attempt lookup: once inserted, the row exists.
        let inserted = false;
        h.attemptRepository.insert.mockImplementation(async () => void (inserted = true));
        h.attemptRepository.findOne.mockImplementation(async () => (inserted ? { id: 'a-1' } : null));
        h.sessionRepository.findOne.mockImplementation(async (q: any) => (q?.where?.status ? (row.status === HostedKycSessionStatus.CREATED ? row : null) : row));
        await h.service.startOrResume('user-1');
        expect(h.attemptRepository.insert).toHaveBeenCalledTimes(1);
        await deliver(h, webhookBody('Declined', 'e-2', nowTs()));
        expect(h.attemptRepository.insert).toHaveBeenCalledTimes(1);
      });

      it('an attempt row that already exists for the Didit session is never inserted again', async () => {
        const { h } = setup('Declined', { attemptCount: 0, existingAttempt: { id: 'a-1' } });
        await h.service.startOrResume('user-1');
        expect(h.attemptRepository.insert).not.toHaveBeenCalled();
      });

      it('reconciling a session that is already terminal in our store cannot move it backwards', async () => {
        // The finished row is not "active", so it is not reconciled at all.
        const row = activeRow({ status: HostedKycSessionStatus.APPROVED });
        const h = build({ activeSession: null, profile: confirmedProfile() });
        await h.service.startOrResume('user-1');
        expect(h.provider.getSessionDecision).not.toHaveBeenCalled();
        expect(row.status).toBe(HostedKycSessionStatus.APPROVED);
      });
    });

    describe('concurrent start requests', () => {
      it('two concurrent starts when Didit says Declined: ONE attempt and ONE replacement session', async () => {
        const row = activeRow();
        const h = build({
          activeSession: row,
          profile: inProgressProfile(),
          attemptCount: 0,
          decision: { status: 'Declined' },
          providerResult: { sessionId: 'didit-2', url: HOSTED_URL, status: 'Not Started' },
        });
        let created: any = null;
        let inserted = 0;
        h.attemptRepository.insert.mockImplementation(async () => void inserted++);
        h.attemptRepository.count.mockImplementation(async () => inserted);
        h.attemptRepository.findOne.mockImplementation(async () => (inserted ? { id: 'a-1' } : null));
        h.sessionRepository.save.mockImplementation(async (d: any) => {
          if (d !== row) created = d;
          return d;
        });
        h.sessionRepository.findOne.mockImplementation(async (q: any) => {
          if (q?.where?.diditSessionId) return null;
          if (q?.where?.id) return row;
          // active lookup: the old row is no longer active once declined; the new one is.
          if (row.status === HostedKycSessionStatus.CREATED || row.status === HostedKycSessionStatus.IN_PROGRESS) return row;
          return created;
        });
        h.provider.getSessionDecision.mockImplementation(async (sid: string) =>
          sid === 'didit-1'
            ? { sessionId: 'didit-1', status: 'Declined', vendorData: REF, workflowId: 'wf-kyc', environment: 'sandbox', applicationId: null }
            : { sessionId: created.diditSessionId, status: 'Not Started', vendorData: created.vendorReference, workflowId: 'wf-kyc', environment: 'sandbox', applicationId: null },
        );
        let tail: Promise<unknown> = Promise.resolve();
        (h.service as any).withProfileLock = (_id: string, work: () => Promise<any>) => {
          const next = tail.then(work, work);
          tail = next.catch(() => undefined);
          return next;
        };
        const results = await Promise.all([h.service.startOrResume('user-1'), h.service.startOrResume('user-1')]);
        expect(results.every((r: any) => r.url === HOSTED_URL)).toBe(true);
        expect(inserted).toBe(1);
        expect(h.sessionRepository.create).toHaveBeenCalledTimes(1);
      });

      it('two concurrent starts when Didit says Approved: verified once, no session created for either', async () => {
        const { h } = setup('Approved');
        let tail: Promise<unknown> = Promise.resolve();
        (h.service as any).withProfileLock = (_id: string, work: () => Promise<any>) => {
          const next = tail.then(work, work);
          tail = next.catch(() => undefined);
          return next;
        };
        const settled = await Promise.allSettled([h.service.startOrResume('user-1'), h.service.startOrResume('user-1')]);
        expect(settled.every((s) => s.status === 'rejected' && (s as any).reason instanceof KycNotStartableException)).toBe(true);
        expect(h.profile.identityVerificationStatus).toBe(IdentityVerificationStatus.VERIFIED);
        expect(h.provider.createKycSession).not.toHaveBeenCalled();
      });
    });
  });

  // ----------------------------------------------------------------- status map
  describe('mapDiditStatusToKycStatus', () => {
    it.each([
      ['Not Started', HostedKycSessionStatus.CREATED],
      ['In Progress', HostedKycSessionStatus.IN_PROGRESS],
      ['Resubmitted', HostedKycSessionStatus.IN_PROGRESS],
      ['Awaiting User', HostedKycSessionStatus.IN_PROGRESS],
      ['In Review', HostedKycSessionStatus.IN_REVIEW],
      ['Approved', HostedKycSessionStatus.APPROVED],
      ['Declined', HostedKycSessionStatus.DECLINED],
      ['Abandoned', HostedKycSessionStatus.ABANDONED],
      ['Expired', HostedKycSessionStatus.EXPIRED],
      ['Kyc Expired', HostedKycSessionStatus.KYC_EXPIRED],
    ])('maps the documented status %p', (input, expected) => {
      expect(mapDiditStatusToKycStatus(input)).toBe(expected);
    });

    it.each(['approved', 'APPROVED', 'Approved ', 'in_review', 'Verified', 'Success', '', 'something new'])(
      'never maps an unknown/near-miss status %p to anything (in particular not approved)',
      (input) => {
        expect(mapDiditStatusToKycStatus(input)).toBeUndefined();
      },
    );
  });

  // ------------------------------------------------------------------ webhook
  describe('handleWebhook', () => {
    const now = 1_800_000_000;
    const eventBody = (o: Record<string, unknown> = {}) => ({
      event_id: 'evt-1',
      session_id: 'didit-1',
      webhook_type: 'status.updated',
      timestamp: now - 5,
      created_at: '2026-09-30T00:00:00Z',
      application_id: 'app-1',
      environment: 'sandbox',
      status: 'Approved',
      workflow_id: 'wf-kyc',
      vendor_data: 'ref-1',
      metadata: null,
      decision: { some: 'value' },
      ...o,
    });
    const signed = (body: Record<string, unknown>, secret = SECRET, ts = now) => ({
      raw: Buffer.from(JSON.stringify(body), 'utf8'),
      headers: { signatureV2: computeDiditSignatureV2(body, secret), timestamp: String(ts) },
    });
    const session = (o: Record<string, unknown> = {}) => ({
      id: 'row-1', profileId: 'profile-1', diditSessionId: 'didit-1', vendorReference: 'ref-1',
      status: HostedKycSessionStatus.IN_PROGRESS, lastEventTimestamp: null, ...o,
    });
    const profileIn = (status = IdentityVerificationStatus.IN_PROGRESS) => confirmedProfile({ identityVerificationStatus: status });
    const run = (h: ReturnType<typeof build>, body = eventBody(), secret = SECRET, ts = now) => {
      const s = signed(body, secret, ts);
      return h.service.handleWebhook(s.raw, s.headers, now);
    };

    describe('authenticity (fail closed)', () => {
      it('rejects every delivery when DIDIT_WEBHOOK_SECRET is not configured', async () => {
        delete process.env.DIDIT_WEBHOOK_SECRET;
        const h = build({ session: session(), profile: profileIn() });
        const r = await reasonOf(run(h));
        expect(r?.type).toBeInstanceOf(InvalidWebhookSignatureException);
        expect(r?.reason).toBe('secret_not_configured');
        expect(h.dataSource.transaction).not.toHaveBeenCalled();
      });

      it('rejects a missing X-Signature-V2', async () => {
        const h = build({ session: session(), profile: profileIn() });
        const s = signed(eventBody());
        await expect(h.service.handleWebhook(s.raw, { signatureV2: undefined, timestamp: s.headers.timestamp }, now)).rejects.toBeInstanceOf(InvalidWebhookSignatureException);
        expect(h.dataSource.transaction).not.toHaveBeenCalled();
      });

      it('rejects a wrong / malformed signature', async () => {
        const h = build({ session: session(), profile: profileIn() });
        const s = signed(eventBody(), 'not-the-secret');
        await expect(h.service.handleWebhook(s.raw, s.headers, now)).rejects.toBeInstanceOf(InvalidWebhookSignatureException);
        await expect(h.service.handleWebhook(s.raw, { signatureV2: 'zz', timestamp: s.headers.timestamp }, now)).rejects.toBeInstanceOf(InvalidWebhookSignatureException);
      });

      it('does NOT accept the legacy X-Signature (raw-bytes) header in place of V2', async () => {
        const h = build({ session: session(), profile: profileIn() });
        const s = signed(eventBody());
        const { createHmac } = require('crypto');
        const legacy = createHmac('sha256', SECRET).update(s.raw).digest('hex');
        // Pretty-printed bytes make legacy != V2 canonical signature.
        const pretty = Buffer.from(JSON.stringify(eventBody(), null, 2), 'utf8');
        const legacyPretty = createHmac('sha256', SECRET).update(pretty).digest('hex');
        await expect(h.service.handleWebhook(pretty, { signatureV2: legacyPretty, timestamp: String(now) }, now)).rejects.toBeInstanceOf(InvalidWebhookSignatureException);
        expect(legacy).toBeTruthy();
      });

      it('rejects a stale or missing or invalid timestamp', async () => {
        const h = build({ session: session(), profile: profileIn() });
        const stale = signed(eventBody(), SECRET, now - 301);
        await expect(h.service.handleWebhook(stale.raw, stale.headers, now)).rejects.toBeInstanceOf(InvalidWebhookSignatureException);
        const s = signed(eventBody());
        await expect(h.service.handleWebhook(s.raw, { signatureV2: s.headers.signatureV2, timestamp: undefined }, now)).rejects.toBeInstanceOf(InvalidWebhookSignatureException);
        await expect(h.service.handleWebhook(s.raw, { signatureV2: s.headers.signatureV2, timestamp: 'abc' }, now)).rejects.toBeInstanceOf(InvalidWebhookSignatureException);
        expect(h.dataSource.transaction).not.toHaveBeenCalled();
      });

      it('accepts a timestamp exactly at the 300-second edge', async () => {
        const h = build({ session: session(), profile: profileIn() });
        await expect(run(h, eventBody(), SECRET, now - 300)).resolves.toBeUndefined();
      });

      it('a validly signed but malformed event is a 400, not a state change', async () => {
        const h = build({ session: session(), profile: profileIn() });
        const body: any = eventBody();
        delete body.event_id;
        await expect(run(h, body)).rejects.toBeInstanceOf(BadRequestException);
        expect(h.dataSource.transaction).not.toHaveBeenCalled();
      });

      it('never puts the secret, the body or the signature in a thrown error', async () => {
        const h = build({ session: session(), profile: profileIn() });
        let thrown: any;
        try {
          await run(h, eventBody(), 'wrong');
        } catch (e) {
          thrown = e;
        }
        const text = JSON.stringify(thrown.getResponse());
        expect(text).not.toContain(SECRET);
        expect(text).not.toContain('didit-1');
      });
    });

    describe('outcomes', () => {
      it('Approved → session approved and profile verified (only via webhook)', async () => {
        const h = build({ session: session(), profile: profileIn() });
        await run(h);
        expect(h.sessionRepository.save).toHaveBeenCalledWith(expect.objectContaining({ status: HostedKycSessionStatus.APPROVED, lastEventTimestamp: String(now - 5) }));
        expect(h.profile.identityVerificationStatus).toBe(IdentityVerificationStatus.VERIFIED);
      });

      it('an unknown status changes nothing and is never approved', async () => {
        const h = build({ session: session(), profile: profileIn() });
        await run(h, eventBody({ status: 'Totally New Status' }));
        expect(h.profile.identityVerificationStatus).toBe(IdentityVerificationStatus.IN_PROGRESS);
        expect(h.sessionRepository.save).not.toHaveBeenCalled();
      });

      it('a lowercase "approved" is treated as unknown, not approved', async () => {
        const h = build({ session: session(), profile: profileIn() });
        await run(h, eventBody({ status: 'approved' }));
        expect(h.profile.identityVerificationStatus).not.toBe(IdentityVerificationStatus.VERIFIED);
      });

      it('In Review → pending (no attempt consumed)', async () => {
        const h = build({ session: session(), profile: profileIn() });
        await run(h, eventBody({ status: 'In Review' }));
        expect(h.profile.identityVerificationStatus).toBe(IdentityVerificationStatus.PENDING);
        expect(h.attemptRepository.insert).not.toHaveBeenCalled();
      });

      it.each(['In Progress', 'Resubmitted', 'Awaiting User', 'Not Started'])('%s → in_progress', async (status) => {
        const h = build({ session: session(), profile: profileIn(IdentityVerificationStatus.UNSTARTED) });
        await run(h, eventBody({ status }));
        expect(h.profile.identityVerificationStatus).toBe(IdentityVerificationStatus.IN_PROGRESS);
      });

      it.each(['Abandoned', 'Expired'])('%s → session ends, profile back to unstarted, no attempt consumed', async (status) => {
        const h = build({ session: session(), profile: profileIn() });
        await run(h, eventBody({ status }));
        expect(h.profile.identityVerificationStatus).toBe(IdentityVerificationStatus.UNSTARTED);
        expect(h.attemptRepository.insert).not.toHaveBeenCalled();
      });

      it('Kyc Expired → a verified profile becomes expired', async () => {
        const h = build({ session: session({ status: HostedKycSessionStatus.APPROVED }), profile: profileIn(IdentityVerificationStatus.VERIFIED) });
        await run(h, eventBody({ status: 'Kyc Expired' }));
        expect(h.profile.identityVerificationStatus).toBe(IdentityVerificationStatus.EXPIRED);
        expect(h.profile.expiredAt).toBeInstanceOf(Date);
      });

      it('a later non-approval event for another session never downgrades a verified profile', async () => {
        const h = build({ session: session(), profile: profileIn(IdentityVerificationStatus.VERIFIED) });
        await run(h, eventBody({ status: 'Declined' }));
        expect(h.profile.identityVerificationStatus).toBe(IdentityVerificationStatus.VERIFIED);
        expect(h.attemptRepository.insert).not.toHaveBeenCalled();
      });
    });

    describe('attempt accounting (one counter, replay-safe)', () => {
      it('Declined records exactly one attempt row for the Didit session and marks the profile failed', async () => {
        const h = build({ session: session(), profile: profileIn(), attemptCount: 0 });
        await run(h, eventBody({ status: 'Declined' }));
        expect(h.attemptRepository.insert).toHaveBeenCalledTimes(1);
        expect(h.attemptRepository.insert).toHaveBeenCalledWith(
          expect.objectContaining({ profileId: 'profile-1', vendorSessionId: 'didit-1', documentId: null, attemptMethod: null, attemptDocumentType: null, attemptNumber: 1 }),
        );
        expect(h.profile.identityVerificationStatus).toBe(IdentityVerificationStatus.FAILED);
      });

      it('a second Declined event (different event_id) for the SAME Didit session adds no second attempt', async () => {
        const h = build({ session: session(), profile: profileIn(IdentityVerificationStatus.FAILED), existingAttempt: { id: 'a-1' } });
        await run(h, eventBody({ status: 'Declined', event_id: 'evt-2' }));
        expect(h.attemptRepository.insert).not.toHaveBeenCalled();
      });

      it('the third decline makes the profile failed_final using the existing limit', async () => {
        const h = build({ session: session(), profile: profileIn(), attemptCount: 2 });
        await run(h, eventBody({ status: 'Declined' }));
        expect(h.attemptRepository.insert).toHaveBeenCalledWith(expect.objectContaining({ attemptNumber: 3 }));
        expect(h.profile.identityVerificationStatus).toBe(IdentityVerificationStatus.FAILED_FINAL);
        expect(h.profile.failedFinalAt).toBeInstanceOf(Date);
      });

      it('Didit\'s own workflow retry setting is not consulted: only our attempt rows count', async () => {
        const h = build({ session: session(), profile: profileIn(), attemptCount: 0 });
        await run(h, eventBody({ status: 'Declined', decision: { retries_remaining: 99, max_retries: 99 } }));
        expect(h.profile.identityVerificationStatus).toBe(IdentityVerificationStatus.FAILED);
      });
    });

    describe('idempotency, ordering, ownership', () => {
      it('a replayed event_id is a no-op', async () => {
        const h = build({ session: session(), profile: profileIn(), insertError: { code: '23505' } });
        await expect(run(h)).resolves.toBeUndefined();
        expect(h.sessionRepository.save).not.toHaveBeenCalled();
        expect(h.profile.identityVerificationStatus).toBe(IdentityVerificationStatus.IN_PROGRESS);
      });

      it('a non-duplicate database error is not swallowed (so Didit retries)', async () => {
        const h = build({ session: session(), profile: profileIn(), insertError: new Error('db down') });
        await expect(run(h)).rejects.toThrow('db down');
      });

      it('a STRICTLY older event is ignored; an event at the same second is not', async () => {
        const h = build({ session: session({ lastEventTimestamp: String(now - 5) }), profile: profileIn() });
        await run(h, eventBody({ timestamp: now - 50, event_id: 'evt-old' }));
        expect(h.sessionRepository.save).not.toHaveBeenCalled();
        await run(h, eventBody({ timestamp: now - 5, event_id: 'evt-same-second' }));
        expect(h.sessionRepository.save).toHaveBeenCalledTimes(1);
      });

      describe('same-second events and terminal-state protection', () => {
        // Stateful: the same session/profile objects are mutated across deliveries
        // and each event_id can only be processed once (like the real primary key).
        const stateful = (profile = profileIn(), sess = session()) => {
          const h = build({ session: sess, profile });
          const seen = new Set<string>();
          h.processedRepository.insert.mockImplementation(async (r: any) => {
            if (seen.has(r.eventId)) throw { code: '23505' };
            seen.add(r.eventId);
          });
          return { h, sess, profile: h.profile };
        };
        const T = now - 10;

        it('In Progress then Approved at the SAME timestamp (different event ids) ends Approved and verified', async () => {
          const { h, sess } = stateful();
          await run(h, eventBody({ event_id: 'e-1', status: 'In Progress', timestamp: T }));
          expect(sess.status).toBe(HostedKycSessionStatus.IN_PROGRESS);
          await run(h, eventBody({ event_id: 'e-2', status: 'Approved', timestamp: T }));
          expect(sess.status).toBe(HostedKycSessionStatus.APPROVED);
          expect(h.profile.identityVerificationStatus).toBe(IdentityVerificationStatus.VERIFIED);
          expect(sess.lastEventTimestamp).toBe(String(T));
        });

        it('Approved then a SAME-second In Progress does not regress the session or the verified profile', async () => {
          const { h, sess } = stateful();
          await run(h, eventBody({ event_id: 'e-1', status: 'Approved', timestamp: T }));
          await run(h, eventBody({ event_id: 'e-2', status: 'In Progress', timestamp: T }));
          expect(sess.status).toBe(HostedKycSessionStatus.APPROVED);
          expect(h.profile.identityVerificationStatus).toBe(IdentityVerificationStatus.VERIFIED);
        });

        it('Approved then an OLDER In Progress does not regress the session or the verified profile', async () => {
          const { h, sess } = stateful();
          await run(h, eventBody({ event_id: 'e-1', status: 'Approved', timestamp: T }));
          await run(h, eventBody({ event_id: 'e-2', status: 'In Progress', timestamp: T - 30 }));
          expect(sess.status).toBe(HostedKycSessionStatus.APPROVED);
          expect(h.profile.identityVerificationStatus).toBe(IdentityVerificationStatus.VERIFIED);
        });

        it('Approved then a LATER In Progress (no ordering protection needed) is still blocked from regressing', async () => {
          const { h, sess } = stateful();
          await run(h, eventBody({ event_id: 'e-1', status: 'Approved', timestamp: T }));
          await run(h, eventBody({ event_id: 'e-2', status: 'In Progress', timestamp: T + 5 }));
          expect(sess.status).toBe(HostedKycSessionStatus.APPROVED);
          expect(h.profile.identityVerificationStatus).toBe(IdentityVerificationStatus.VERIFIED);
        });

        it('a replay of the same event_id at the same timestamp remains a no-op', async () => {
          const { h, sess } = stateful();
          await run(h, eventBody({ event_id: 'e-1', status: 'Approved', timestamp: T }));
          h.sessionRepository.save.mockClear();
          await run(h, eventBody({ event_id: 'e-1', status: 'Approved', timestamp: T }));
          expect(h.sessionRepository.save).not.toHaveBeenCalled();
          expect(sess.status).toBe(HostedKycSessionStatus.APPROVED);
        });

        it('a replay of an earlier event cannot reopen a finished session either', async () => {
          const { h, sess } = stateful();
          const inProgress = eventBody({ event_id: 'e-1', status: 'In Progress', timestamp: T });
          await run(h, inProgress);
          await run(h, eventBody({ event_id: 'e-2', status: 'Approved', timestamp: T }));
          await run(h, inProgress); // replay
          expect(sess.status).toBe(HostedKycSessionStatus.APPROVED);
          expect(h.profile.identityVerificationStatus).toBe(IdentityVerificationStatus.VERIFIED);
        });

        it('same-second In Review then Approved ends Approved', async () => {
          const { h, sess } = stateful();
          await run(h, eventBody({ event_id: 'e-1', status: 'In Review', timestamp: T }));
          await run(h, eventBody({ event_id: 'e-2', status: 'Approved', timestamp: T }));
          expect(sess.status).toBe(HostedKycSessionStatus.APPROVED);
          expect(h.profile.identityVerificationStatus).toBe(IdentityVerificationStatus.VERIFIED);
        });

        it('a later Resubmitted after In Review is still allowed (In Review is not terminal)', async () => {
          const { h, sess } = stateful();
          await run(h, eventBody({ event_id: 'e-1', status: 'In Review', timestamp: T }));
          await run(h, eventBody({ event_id: 'e-2', status: 'Resubmitted', timestamp: T + 1 }));
          expect(sess.status).toBe(HostedKycSessionStatus.IN_PROGRESS);
        });

        it('Declined is terminal: a same-second or later Approved cannot flip it', async () => {
          const { h, sess } = stateful();
          await run(h, eventBody({ event_id: 'e-1', status: 'Declined', timestamp: T }));
          expect(sess.status).toBe(HostedKycSessionStatus.DECLINED);
          await run(h, eventBody({ event_id: 'e-2', status: 'Approved', timestamp: T }));
          await run(h, eventBody({ event_id: 'e-3', status: 'Approved', timestamp: T + 9 }));
          expect(sess.status).toBe(HostedKycSessionStatus.DECLINED);
          expect(h.profile.identityVerificationStatus).toBe(IdentityVerificationStatus.FAILED);
          expect(h.attemptRepository.insert).toHaveBeenCalledTimes(1);
        });

        it('an approved session may still move to Kyc Expired (the one documented later change)', async () => {
          const { h, sess } = stateful();
          await run(h, eventBody({ event_id: 'e-1', status: 'Approved', timestamp: T }));
          await run(h, eventBody({ event_id: 'e-2', status: 'Kyc Expired', timestamp: T + 3 }));
          expect(sess.status).toBe(HostedKycSessionStatus.KYC_EXPIRED);
          expect(h.profile.identityVerificationStatus).toBe(IdentityVerificationStatus.EXPIRED);
        });

        it('Kyc Expired is terminal: nothing after it changes the session or profile', async () => {
          const { h, sess } = stateful();
          await run(h, eventBody({ event_id: 'e-1', status: 'Approved', timestamp: T }));
          await run(h, eventBody({ event_id: 'e-2', status: 'Kyc Expired', timestamp: T + 3 }));
          await run(h, eventBody({ event_id: 'e-3', status: 'Approved', timestamp: T + 4 }));
          expect(sess.status).toBe(HostedKycSessionStatus.KYC_EXPIRED);
          expect(h.profile.identityVerificationStatus).toBe(IdentityVerificationStatus.EXPIRED);
        });

        it('the same status arriving again at a later time is harmless (still approved, timestamp advances)', async () => {
          const { h, sess } = stateful();
          await run(h, eventBody({ event_id: 'e-1', status: 'Approved', timestamp: T }));
          await run(h, eventBody({ event_id: 'e-2', status: 'Approved', timestamp: T + 2 }));
          expect(sess.status).toBe(HostedKycSessionStatus.APPROVED);
          expect(sess.lastEventTimestamp).toBe(String(T + 2));
          expect(h.profile.identityVerificationStatus).toBe(IdentityVerificationStatus.VERIFIED);
        });
      });

      it('applies inside one transaction with the session row locked for update', async () => {
        const h = build({ session: session(), profile: profileIn() });
        await run(h);
        expect(h.dataSource.transaction).toHaveBeenCalledTimes(1);
        expect(h.sessionRepository.findOne).toHaveBeenCalledWith(expect.objectContaining({ lock: { mode: 'pessimistic_write' } }));
      });

      it('an unknown session is a retryable 404, with no state change', async () => {
        const h = build({ session: null, profile: profileIn() });
        await expect(run(h)).rejects.toBeInstanceOf(UnknownKycSessionException);
        expect(h.processedRepository.insert).not.toHaveBeenCalled();
      });

      it('a vendor_data that does not match our reference is ignored', async () => {
        const h = build({ session: session(), profile: profileIn() });
        await run(h, eventBody({ vendor_data: 'someone-elses-ref' }));
        expect(h.sessionRepository.save).not.toHaveBeenCalled();
      });

      it('ignores non-status webhook types', async () => {
        const h = build({ session: session(), profile: profileIn() });
        await run(h, eventBody({ webhook_type: 'data.updated' }));
        expect(h.dataSource.transaction).not.toHaveBeenCalled();
      });

      it('ignores an event from the wrong environment or application', async () => {
        const h = build({ session: session(), profile: profileIn() });
        await run(h, eventBody({ environment: 'live' }));
        expect(h.dataSource.transaction).not.toHaveBeenCalled();
        process.env.DIDIT_APPLICATION_ID = 'app-1';
        await run(h, eventBody({ application_id: 'other-app' }));
        expect(h.dataSource.transaction).not.toHaveBeenCalled();
        delete process.env.DIDIT_APPLICATION_ID;
      });
    });
  });
});
