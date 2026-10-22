import { VerificationSummaryService } from './verification-summary.service';
import { DeclaredDuration, HostedKycSessionStatus, IdentityVerificationStatus, LocationVerificationStatus, TravelClassification } from '../entities/enums/identity-verification.enums';
import { IdentityVerificationProfile } from '../entities/identity-verification-profile.entity';

describe('VerificationSummaryService (hosted Free KYC data only, read-only)', () => {
  const NOW = Date.UTC(2026, 9, 1, 12, 0, 0);
  type Row = Record<string, any>;
  const profile = (over: Row = {}) =>
    ({
      id: 'profile-1',
      identityVerificationStatus: IdentityVerificationStatus.UNSTARTED,
      locationVerificationStatus: LocationVerificationStatus.VERIFIED,
      failedFinalAt: null,
      verifiedHomeCountry: 'US',
      verifiedHomeCountryConfirmedAt: new Date(NOW - 60_000), // fresh
      travelModeActive: false,
      travelClassification: null,
      ...over,
    }) as unknown as IdentityVerificationProfile;
  const hosted = (n: number, status = HostedKycSessionStatus.DECLINED): Row => ({
    id: `r${n}`, profileId: 'profile-1', diditSessionId: `d${n}`, status, createdAt: new Date(Date.UTC(2026, 0, 1, 0, 0, n)),
  });

  function build(sessions: Row[] = [], attempts: Row[] = []) {
    const sessionRepository = {
      find: jest.fn(async () => sessions),
      findOne: jest.fn(async (q: any) => {
        const statuses: string[] = q.where.status.value;
        return sessions.find((s) => statuses.includes(s.status)) ?? null;
      }),
      save: jest.fn(),
      insert: jest.fn(),
    };
    const attemptRepository = {
      find: jest.fn(async (q: any) => {
        const ids: string[] = q.where.vendorSessionId.value;
        return attempts.filter((a) => ids.includes(a.vendorSessionId));
      }),
      save: jest.fn(),
      insert: jest.fn(),
    };
    return { service: new VerificationSummaryService(sessionRepository as any, attemptRepository as any), sessionRepository, attemptRepository };
  }

  it('counts only hosted declined sessions that have an attempt row', async () => {
    const { service } = build(
      [hosted(1), hosted(2), hosted(3, HostedKycSessionStatus.ABANDONED)],
      [{ vendorSessionId: 'd1' }, { vendorSessionId: 'd2' }, { vendorSessionId: 'legacy-9' }],
    );
    const s = await service.summarize(profile({ identityVerificationStatus: IdentityVerificationStatus.FAILED }), NOW);
    expect(s).toMatchObject({ attemptsUsed: 2, attemptsRemaining: 1, nextAction: 'retry_identity' });
  });

  describe('passes the Travel Mode activation fields through to the rule', () => {
    const DAY = 24 * 60 * 60 * 1000;
    const travelling = (activatedAtMs: number, over: Row = {}) =>
      profile({
        travelClassification: TravelClassification.TEMPORARILY_TRAVELING,
        travelModeActive: true,
        travelModeActivatedAt: new Date(activatedAtMs),
        declaredDuration: DeclaredDuration.A_FEW_DAYS,
        ...over,
      });

    it('active Travel Mode asks for confirm_location, then is startable exactly at the end', async () => {
      const { service } = build();
      const activated = NOW - DAY;
      const endsAt = activated + 7 * DAY;
      expect((await service.summarize(travelling(activated), endsAt - 1)).nextAction).toBe('confirm_location');
      expect((await service.summarize(travelling(activated, { verifiedHomeCountryConfirmedAt: new Date(endsAt - 60_000) }), endsAt)).nextAction).toBe('start_identity');
    });

    it('an expired period is startable whether the raw flag is true or false', async () => {
      const { service } = build();
      for (const travelModeActive of [true, false]) {
        const s = await service.summarize(travelling(NOW - 7 * DAY, { travelModeActive }), NOW);
        expect(s.nextAction).toBe('start_identity');
      }
    });

    it('a pending duration still asks for confirm_location', async () => {
      const { service } = build();
      const s = await service.summarize(profile({ travelClassification: TravelClassification.TEMPORARILY_TRAVELING }), NOW);
      expect(s.nextAction).toBe('confirm_location');
    });
  });

  it('legacy attempt rows (no hosted session) never count', async () => {
    const { service } = build([], [{ vendorSessionId: 'legacy-1' }, { vendorSessionId: 'legacy-2' }, { vendorSessionId: 'legacy-3' }]);
    const s = await service.summarize(profile(), NOW);
    expect(s).toMatchObject({ attemptsUsed: 0, attemptsRemaining: 3 });
  });

  it('an unfinished hosted session means continue_identity', async () => {
    const { service } = build([hosted(1, HostedKycSessionStatus.IN_PROGRESS)]);
    const s = await service.summarize(profile({ identityVerificationStatus: IdentityVerificationStatus.IN_PROGRESS }), NOW);
    expect(s.nextAction).toBe('continue_identity');
  });

  it('a created (not yet started) hosted session also resumes', async () => {
    const { service } = build([hosted(1, HostedKycSessionStatus.CREATED)]);
    const s = await service.summarize(profile({ identityVerificationStatus: IdentityVerificationStatus.IN_PROGRESS }), NOW);
    expect(s.nextAction).toBe('continue_identity');
  });

  it('a finished session is not resumable: in_progress profile without an unfinished session starts anew', async () => {
    const { service } = build([hosted(1, HostedKycSessionStatus.ABANDONED)]);
    const s = await service.summarize(profile({ identityVerificationStatus: IdentityVerificationStatus.IN_PROGRESS }), NOW);
    expect(s.nextAction).toBe('start_identity');
  });

  it('after three declines the cycle is closed: cooldown reads 3 of 3, then fresh attempts', async () => {
    const sessions = [hosted(1), hosted(2), hosted(3)];
    const attempts = [{ vendorSessionId: 'd1' }, { vendorSessionId: 'd2' }, { vendorSessionId: 'd3' }];
    const failedFinalAt = new Date(NOW);
    const during = await build(sessions, attempts).service.summarize(
      profile({ identityVerificationStatus: IdentityVerificationStatus.FAILED_FINAL, failedFinalAt }),
      NOW + 1000,
    );
    expect(during).toMatchObject({ nextAction: 'wait_for_retry', attemptsUsed: 3, attemptsRemaining: 0 });
    const after = await build(sessions, attempts).service.summarize(
      profile({ identityVerificationStatus: IdentityVerificationStatus.FAILED_FINAL, failedFinalAt }),
      NOW + 24 * 60 * 60 * 1000,
    );
    expect(after).toMatchObject({ nextAction: 'confirm_location', attemptsUsed: 0, attemptsRemaining: 3, canRetry: true });
  });

  it('never writes: no save or insert on either repository', async () => {
    const { service, sessionRepository, attemptRepository } = build([hosted(1)], [{ vendorSessionId: 'd1' }]);
    await service.summarize(profile(), NOW);
    expect(sessionRepository.save).not.toHaveBeenCalled();
    expect(sessionRepository.insert).not.toHaveBeenCalled();
    expect(attemptRepository.save).not.toHaveBeenCalled();
    expect(attemptRepository.insert).not.toHaveBeenCalled();
  });

  it('carries no identifier in its result', async () => {
    const { service } = build([hosted(1)], [{ vendorSessionId: 'd1' }]);
    const text = JSON.stringify(await service.summarize(profile(), NOW));
    for (const id of ['profile-1', 'd1', 'r1']) expect(text).not.toContain(id);
  });

  // ------------------------------------------------------------------
  // Part 3 final review: the seven invariants, end to end through the real service.
  // ------------------------------------------------------------------
  describe('Part 3 final invariants (real service over fake repositories)', () => {
    const DAY = 24 * 60 * 60 * 1000;
    const threeDeclines = () => ({
      sessions: [1, 2, 3].map((n) => hosted(n)),
      attempts: [1, 2, 3].map((n) => ({ vendorSessionId: `d${n}` })),
    });
    const fresh = (nowMs: number) => new Date(nowMs - 60_000);
    const stale = (nowMs: number) => new Date(nowMs - 15 * 60_000 - 1);

    it('1. an in_review hosted session → nextAction await_review and hasActiveSession true', async () => {
      const { service } = build([hosted(1, HostedKycSessionStatus.IN_REVIEW)]);
      const s = await service.summarize(profile({ identityVerificationStatus: IdentityVerificationStatus.PENDING }), NOW);
      expect(s.nextAction).toBe('await_review');
      expect(s.hasActiveSession).toBe(true);
    });

    it('1b. hasActiveSession is true for every unfinished session and false once finished', async () => {
      for (const [status, expected] of [
        [HostedKycSessionStatus.CREATED, true],
        [HostedKycSessionStatus.IN_PROGRESS, true],
        [HostedKycSessionStatus.IN_REVIEW, true],
        [HostedKycSessionStatus.APPROVED, false],
        [HostedKycSessionStatus.DECLINED, false],
        [HostedKycSessionStatus.ABANDONED, false],
        [HostedKycSessionStatus.EXPIRED, false],
        [HostedKycSessionStatus.KYC_EXPIRED, false],
      ] as const) {
        const { service } = build([hosted(1, status)]);
        expect((await service.summarize(profile(), NOW)).hasActiveSession).toBe(expected);
      }
    });

    it('1c. an in_review session is not resumable: it never produces continue_identity', async () => {
      const { service } = build([hosted(1, HostedKycSessionStatus.IN_REVIEW)]);
      const s = await service.summarize(profile({ identityVerificationStatus: IdentityVerificationStatus.IN_PROGRESS }), NOW);
      expect(s.nextAction).not.toBe('continue_identity');
      expect(s.hasActiveSession).toBe(true);
    });

    it('2. identity verified + location unverified → fullyVerified false, nextAction confirm_location', async () => {
      const { service } = build();
      const s = await service.summarize(
        profile({ identityVerificationStatus: IdentityVerificationStatus.VERIFIED, locationVerificationStatus: LocationVerificationStatus.NOT_VERIFIED }),
        NOW,
      );
      expect(s.fullyVerified).toBe(false);
      expect(s.nextAction).toBe('confirm_location');
    });

    it('3. both verified → fullyVerified true, nextAction complete', async () => {
      const { service } = build();
      const s = await service.summarize(profile({ identityVerificationStatus: IdentityVerificationStatus.VERIFIED }), NOW);
      expect(s.fullyVerified).toBe(true);
      expect(s.nextAction).toBe('complete');
    });

    it('4. the third failure during the cooldown → 3 used, 0 remaining, canRetry false, a retry time, wait_for_retry', async () => {
      const failedFinalAt = new Date(NOW - 60 * 60 * 1000); // one hour into the cooldown
      const { sessions, attempts } = threeDeclines();
      const { service } = build(sessions, attempts);
      const s = await service.summarize(
        profile({ identityVerificationStatus: IdentityVerificationStatus.FAILED_FINAL, failedFinalAt, verifiedHomeCountryConfirmedAt: fresh(NOW) }),
        NOW,
      );
      expect(s).toMatchObject({ attemptsUsed: 3, attemptsRemaining: 0, canRetry: false, nextAction: 'wait_for_retry' });
      expect(s.retryAvailableAt).toBe(new Date(failedFinalAt.getTime() + DAY).toISOString());
    });

    it('5. an elapsed cooldown → a fresh current-cycle count and retry_identity (history stays stored)', async () => {
      const failedFinalAt = new Date(NOW);
      const { sessions, attempts } = threeDeclines();
      for (const later of [DAY, DAY + 1, 5 * DAY]) {
        const nowMs = NOW + later;
        const { service, attemptRepository } = build(sessions, attempts);
        const s = await service.summarize(
          profile({ identityVerificationStatus: IdentityVerificationStatus.FAILED_FINAL, failedFinalAt, verifiedHomeCountryConfirmedAt: fresh(nowMs) }),
          nowMs,
        );
        expect(s).toMatchObject({ attemptsUsed: 0, attemptsRemaining: 3, canRetry: true, nextAction: 'retry_identity', retryAvailableAt: null });
        expect(attemptRepository.insert).not.toHaveBeenCalled();
        expect(attempts).toHaveLength(3); // nothing deleted or rewritten
      }
      // one millisecond earlier is still inside the cooldown
      const { service } = build(sessions, attempts);
      const early = await service.summarize(
        profile({ identityVerificationStatus: IdentityVerificationStatus.FAILED_FINAL, failedFinalAt, verifiedHomeCountryConfirmedAt: fresh(NOW + DAY - 1) }),
        NOW + DAY - 1,
      );
      expect(early).toMatchObject({ attemptsUsed: 3, nextAction: 'wait_for_retry' });
    });

    it('6. a stale confirmation on a startable profile → confirm_location (and fresh → the start action)', async () => {
      const startable: Array<[IdentityVerificationStatus, string]> = [
        [IdentityVerificationStatus.UNSTARTED, 'start_identity'],
        [IdentityVerificationStatus.FAILED, 'retry_identity'],
        [IdentityVerificationStatus.EXPIRED, 'reverify_identity'],
      ];
      for (const [identityVerificationStatus, startAction] of startable) {
        const { service } = build();
        expect((await service.summarize(profile({ identityVerificationStatus, verifiedHomeCountryConfirmedAt: stale(NOW) }), NOW)).nextAction).toBe('confirm_location');
        expect((await service.summarize(profile({ identityVerificationStatus, verifiedHomeCountryConfirmedAt: fresh(NOW) }), NOW)).nextAction).toBe(startAction);
      }
    });
  });
});
