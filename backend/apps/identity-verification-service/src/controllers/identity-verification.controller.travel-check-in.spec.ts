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

// POST /v1/identity-verification/travel-duration/update over HTTP: the answer to a
// "Still traveling?" check-in. The real controller, DTO validation, exception filter and
// service over a stateful fake repository.
describe('POST /v1/identity-verification/travel-duration/update (the check-in answer)', () => {
  const DAY = 24 * 60 * 60 * 1000;
  const URL = '/v1/identity-verification/travel-duration/update';
  type Row = Record<string, any>;
  let row: Row;
  let app: INestApplication;
  let update: jest.Mock;
  let publish: jest.Mock;

  const inForce = (over: Row = {}): Row => ({
    id: 'profile-1',
    userId: 'user-1',
    verifiedHomeCountry: 'US',
    verifiedHomeCountryConfirmedAt: new Date(Date.now() - 60_000),
    detectedCountry: 'US',
    detectedRegionState: null,
    detectedCity: null,
    timeZone: null,
    identityVerificationStatus: IdentityVerificationStatus.VERIFIED,
    identityRejectionReason: null,
    locationVerificationStatus: LocationVerificationStatus.VERIFIED,
    failedFinalAt: null,
    expiredAt: null,
    travelClassification: TravelClassification.TEMPORARILY_TRAVELING,
    travelModeActive: true,
    travelModeActivatedAt: new Date(Date.now() - DAY),
    declaredDuration: DeclaredDuration.ONE_TO_TWO_WEEKS,
    lastTravelReminderSentAt: null,
    nextTravelReminderAt: new Date(Date.now() + 2 * DAY),
    travelCheckInCount: 0,
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

  it.each(['a_few_days', 'one_to_two_weeks', 'more_than_two_weeks', 'not_sure'])(
    'an active traveler answers with %s: 200, the new period starts now, the count goes to 1',
    async (duration) => {
      await build(inForce());
      const before = Date.now();

      const res = await post(duration).expect(200);

      expect(res.body).toMatchObject({
        travelModeActive: true,
        travelClassification: 'temporarily_traveling',
        declaredDuration: duration,
        travelCheckInCount: 1,
        verifiedHomeCountry: 'US',
        fullyVerified: true,
      });
      expect(new Date(res.body.travelModeEndsAt).getTime()).toBeGreaterThan(before);
      expect(row.travelModeActivatedAt.getTime()).toBeGreaterThanOrEqual(before);
      expect(row.lastTravelReminderSentAt).toBeNull();
      expect(row.nextTravelReminderAt.getTime() - row.travelModeActivatedAt.getTime()).toBe(3 * DAY);
      expect(publish).not.toHaveBeenCalled();
    },
  );

  it('the count appears in the response only once an answer was saved (absent means 0)', async () => {
    await build(inForce());
    const first = await post('not_sure').expect(200);
    expect(first.body.travelCheckInCount).toBe(1);
    const second = await post('one_to_two_weeks').expect(200);
    expect(second.body.travelCheckInCount).toBe(2);
  });

  it('"skipped" is not an answer: there is no such duration, and nothing is written', async () => {
    await build(inForce());
    for (const value of ['skipped', 'skip', '', null, undefined]) {
      await post(value).expect(400);
    }
    expect(update).not.toHaveBeenCalled();
    expect(row.travelCheckInCount).toBe(0);
  });

  it('with no Travel Mode in force: exactly the documented 409, nothing written', async () => {
    await build(inForce({ travelModeActive: false, travelModeActivatedAt: null, declaredDuration: null, nextTravelReminderAt: null }));

    const res = await post('not_sure').expect(409);

    expect(res.body).toEqual({ code: 'TRAVEL_MODE_NOT_ACTIVE', message: 'Travel Mode is not active.' });
    expect(update).not.toHaveBeenCalled();
  });

  it('while a home-country change is running: 409 HOME_COUNTRY_CHANGE_IN_PROGRESS, nothing written', async () => {
    await build(
      inForce({
        identityVerificationStatus: IdentityVerificationStatus.IN_PROGRESS,
        pendingHomeCountry: 'CA',
        pendingHomeCountryConfirmedAt: new Date(),
        pendingRelocationSessionId: 's1',
      }),
    );

    const res = await post('not_sure').expect(409);

    expect(res.body).toMatchObject({ code: 'HOME_COUNTRY_CHANGE_IN_PROGRESS' });
    expect(update).not.toHaveBeenCalled();
    expect(row.travelCheckInCount).toBe(0);
  });

  it('the ordinary activation route is unchanged: it still refuses an active period', async () => {
    await build(inForce());
    const res = await request(app.getHttpServer())
      .post('/v1/identity-verification/travel-duration')
      .send({ duration: 'not_sure' })
      .expect(409);
    expect(res.body).toEqual({ code: 'TRAVEL_MODE_ALREADY_ACTIVE', message: 'Travel Mode is already active.' });
    expect(row.travelCheckInCount).toBe(0);
  });
});
