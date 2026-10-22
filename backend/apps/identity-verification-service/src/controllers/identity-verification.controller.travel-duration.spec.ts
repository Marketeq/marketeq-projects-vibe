import 'reflect-metadata';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';
import { IdentityVerificationController } from './identity-verification.controller';
import { IdentityVerificationService } from '../services/identity-verification.service';
import { TwoStageVerificationService } from '../services/two-stage-verification.service';
import { FreeKycService } from '../services/free-kyc.service';
import { VerificationSummaryService } from '../services/verification-summary.service';
import { BearerAuthGuard } from '../common/guards/bearer-auth.guard';
import { VpnProxyCheckGuard } from '../common/guards/vpn-proxy-check.guard';
import { AllExceptionsFilter } from '../common/filters/all-exceptions.filter';
import {
  DeclaredDuration,
  IdentityVerificationStatus,
  LocationVerificationStatus,
  TravelClassification,
} from '../entities/enums/identity-verification.enums';

// POST /v1/identity-verification/travel-duration over HTTP: the real controller,
// DTO validation, exception filter and service over a stateful fake repository.
describe('POST /v1/identity-verification/travel-duration (no extending or shortening)', () => {
  const DAY = 24 * 60 * 60 * 1000;
  const URL = '/v1/identity-verification/travel-duration';
  type Row = Record<string, any>;
  let row: Row;
  let app: INestApplication;
  let update: jest.Mock;
  let publish: jest.Mock;

  const pending = (over: Row = {}): Row => ({
    id: 'profile-1',
    userId: 'user-1',
    verifiedHomeCountry: 'US',
    verifiedHomeCountryConfirmedAt: new Date(Date.now() - 60_000),
    detectedCountry: 'US',
    detectedRegionState: null,
    detectedCity: null,
    timeZone: null,
    identityVerificationStatus: IdentityVerificationStatus.UNSTARTED,
    identityRejectionReason: null,
    locationVerificationStatus: LocationVerificationStatus.VERIFIED,
    failedFinalAt: null,
    expiredAt: null,
    travelClassification: TravelClassification.TEMPORARILY_TRAVELING,
    travelModeActive: false,
    travelModeActivatedAt: null,
    declaredDuration: null,
    lastTravelReminderSentAt: null,
    nextTravelReminderAt: null,
    ...over,
  });
  const inForce = (startedMsAgo = DAY, over: Row = {}): Row =>
    pending({
      travelModeActive: true,
      travelModeActivatedAt: new Date(Date.now() - startedMsAgo),
      declaredDuration: DeclaredDuration.ONE_TO_TWO_WEEKS,
      lastTravelReminderSentAt: null,
      nextTravelReminderAt: new Date(Date.now() - startedMsAgo + 3 * DAY),
      ...over,
    });

  const matches = (criteria: Row) =>
    Object.entries(criteria).every(([key, expected]) => {
      const actual = row[key];
      if (expected && typeof expected === 'object' && (expected as any).type === 'isNull') return actual === null || actual === undefined;
      if (expected instanceof Date) return actual instanceof Date && actual.getTime() === expected.getTime();
      return actual === expected;
    });

  const build = async (initial: Row) => {
    row = initial;
    update = jest.fn(async (criteria: Row, data: Row) => {
      if (!matches(criteria)) return { affected: 0 };
      Object.assign(row, data);
      return { affected: 1 };
    });
    publish = jest.fn();
    const profileRepository = {
      findOne: jest.fn(async () => ({ ...row })),
      create: jest.fn((d: Row) => ({ ...d })),
      save: jest.fn(async (p: Row) => p),
      update,
    };
    const summary = new VerificationSummaryService(
      { find: jest.fn(async () => []), findOne: jest.fn(async () => null) } as any,
      { find: jest.fn(async () => []) } as any,
    );
    const service = new IdentityVerificationService(
      profileRepository as any, {} as any, {} as any, {} as any, {} as any, {} as any, {} as any, {} as any, {} as any,
      { resolve: jest.fn() } as any, {} as any, { publish } as any, summary,
    );
    jest.spyOn((service as any).logger, 'warn').mockImplementation(() => undefined);
    const moduleRef = await Test.createTestingModule({
      controllers: [IdentityVerificationController],
      providers: [
        { provide: IdentityVerificationService, useValue: service },
        { provide: TwoStageVerificationService, useValue: {} },
        { provide: FreeKycService, useValue: {} },
      ],
    })
      .overrideGuard(BearerAuthGuard)
      .useValue({ canActivate: (ctx: any) => ((ctx.switchToHttp().getRequest().userId = 'user-1'), true) })
      .overrideGuard(VpnProxyCheckGuard)
      .useValue({ canActivate: () => true })
      .compile();
    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    app.useGlobalFilters(new AllExceptionsFilter());
    await app.init();
  };
  afterEach(async () => {
    await app?.close();
    jest.restoreAllMocks();
  });

  const post = (duration: unknown) => request(app.getHttpServer()).post(URL).send({ duration });
  const EXACT_409 = { code: 'TRAVEL_MODE_ALREADY_ACTIVE', message: 'Travel Mode is already active.' };

  it('the first duration selection from the pending state succeeds', async () => {
    await build(pending());

    const res = await post('a_few_days').expect(200);

    expect(res.body).toMatchObject({
      travelModeActive: true,
      declaredDuration: 'a_few_days',
      travelClassification: 'temporarily_traveling',
    });
    expect(publish).toHaveBeenCalledTimes(1);
    expect(row.nextTravelReminderAt.getTime() - row.travelModeActivatedAt.getTime()).toBe(3 * DAY);
  });

  it.each(['one_to_two_weeks', 'more_than_two_weeks', 'a_few_days', 'not_sure'])(
    'while active, submitting %s returns exactly the documented 409 and leaves the stored state unchanged',
    async (duration) => {
      await build(inForce());
      const before = JSON.parse(JSON.stringify(row));

      const res = await post(duration).expect(409);

      expect(res.body).toEqual(EXACT_409); // exact: no details, no extra fields
      expect(JSON.parse(JSON.stringify(row))).toEqual(before); // duration, activation time and reminder cursor intact
      expect(update).not.toHaveBeenCalled();
      expect(publish).not.toHaveBeenCalled();
    },
  );

  it('after the period has ended a new activation succeeds', async () => {
    await build(inForce(20 * DAY, { travelModeActive: false, nextTravelReminderAt: null }));

    const res = await post('not_sure').expect(200);

    expect(res.body).toMatchObject({ travelModeActive: true, declaredDuration: 'not_sure' });
    expect(row.travelModeActivatedAt.getTime()).toBeGreaterThan(Date.now() - 60_000);
    expect(publish).toHaveBeenCalledTimes(1);
  });

  it('an ended period whose flag is still raw-active is expired first, then the new activation succeeds', async () => {
    await build(inForce(14 * DAY)); // 13 days long, started 14 days ago

    await post('a_few_days').expect(200);

    expect(update).toHaveBeenCalledTimes(2);
    expect(row).toMatchObject({ travelModeActive: true, declaredDuration: DeclaredDuration.A_FEW_DAYS });
  });

  it('invalid raw-active data is deactivated safely but this request still gets the 409; a retry then succeeds', async () => {
    await build(inForce(DAY, { declaredDuration: null }));

    const res = await post('a_few_days').expect(409);

    expect(res.body).toEqual(EXACT_409);
    expect(row.travelModeActive).toBe(false);
    expect(row.nextTravelReminderAt).toBeNull();
    expect(row.travelClassification).toBe(TravelClassification.TEMPORARILY_TRAVELING);
    expect(publish).not.toHaveBeenCalled();

    await post('a_few_days').expect(200);
    expect(row).toMatchObject({ travelModeActive: true, declaredDuration: DeclaredDuration.A_FEW_DAYS });
    expect(publish).toHaveBeenCalledTimes(1);
  });

  it('concurrent requests: one 200, one 409, one activation event', async () => {
    await build(pending());

    const [a, b] = await Promise.all([post('a_few_days'), post('more_than_two_weeks')]);

    expect([a.status, b.status].sort()).toEqual([200, 409]);
    const loser = a.status === 409 ? a : b;
    expect(loser.body).toEqual(EXACT_409);
    expect(publish).toHaveBeenCalledTimes(1);
    const winnerDuration = (a.status === 200 ? a : b).body.declaredDuration;
    expect(row.declaredDuration).toBe(winnerDuration);
  });

  it('saves the classification with the duration (no separate classification call) and keeps VALIDATION_ERROR (400)', async () => {
    await build(pending({ travelClassification: null }));

    const invalid = await post('forever').expect(400);
    expect(invalid.body.code).toBe('VALIDATION_ERROR');
    expect(update).not.toHaveBeenCalled();

    const ok = await post('a_few_days').expect(200);
    expect(ok.body.declaredDuration).toBe('a_few_days');
    expect(row.travelClassification).toBe('temporarily_traveling');
    expect(update).toHaveBeenCalledTimes(1);
  });
});
