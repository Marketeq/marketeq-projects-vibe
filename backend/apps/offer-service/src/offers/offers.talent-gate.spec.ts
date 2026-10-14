import 'reflect-metadata';
import { CallHandler, ExecutionContext, INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import * as request from 'supertest';
import { JwtAuthGuard } from '@libs/auth';
import { OffersController } from './offers.controller';
import { OffersService } from './offers.service';
import { CounterOffersController } from '../counter-offers/counter-offers.controller';
import { CounterOffersService } from '../counter-offers/counter-offers.service';
import { Offer } from './entities/offer.entity';
import { AblyService } from '../realtime/ably.service';
import { OfferPartyGuard } from '../guards/offer-party.guard';
import { RolesGuard } from '../guards/roles.guard';
import { ListingOwnerGuard } from '../guards/listing-owner.guard';
import { TalentGateGuard } from '../guards/talent-gate.guard';
import { IdempotencyInterceptor } from '../interceptors/idempotency.interceptor';
import { IdentityVerificationGateClient } from '../identity-gate/identity-verification-gate.client';
import { IdentityVerificationUnavailableException } from '../common/exceptions/offer.exceptions';
import { OfferExceptionFilter } from '../filters/offer-exception.filter';

// Account-verification gate G4, end to end over HTTP with the REAL guards,
// controllers and exception filter. Services, repository, listing ownership,
// JWT and the idempotency interceptor are fakes that record whether they were
// ever reached - the whole point is that a blocked or unanswered gate reaches
// none of them (no lock, no write, no outbox, no contract).
const CLIENT = '11111111-1111-4111-8111-111111111111';
const TALENT = '22222222-2222-4222-8222-222222222222';
const OTHER = '33333333-3333-4333-8333-333333333333';
const OFFER = '44444444-4444-4444-8444-444444444444';
const COUNTER = '55555555-5555-4555-8555-555555555555';
const LISTING = '66666666-6666-4666-8666-666666666666';

const OPEN = { gateOpen: true, missingRequirements: 'none' };
const closed = (missingRequirements: 'identity' | 'location' | 'both') => ({ gateOpen: false, missingRequirements });

describe('offer-service account-verification gate (G4)', () => {
  let app: INestApplication;
  let gate: { checkGate: jest.Mock };
  let offersService: Record<string, jest.Mock>;
  let counterService: Record<string, jest.Mock>;
  let interceptorEntered: jest.Mock;
  let offerRepo: { findOne: jest.Mock; save: jest.Mock; update: jest.Mock; insert: jest.Mock };

  const mk = (names: string[]) => Object.fromEntries(names.map((n) => [n, jest.fn().mockResolvedValue({ ok: true })]));
  const sideEffects = () => [
    ...Object.values(offersService),
    ...Object.values(counterService),
    interceptorEntered,
    offerRepo.save,
    offerRepo.update,
    offerRepo.insert,
  ];
  const as = (userId: string) => ({ 'x-test-user': userId });

  beforeEach(async () => {
    gate = { checkGate: jest.fn().mockResolvedValue(OPEN) };
    offersService = mk(['create', 'edit', 'accept', 'decline', 'withdraw', 'resend', 'list', 'findById', 'getHistory']);
    counterService = mk(['create', 'edit', 'accept', 'decline', 'withdraw', 'findById']);
    interceptorEntered = jest.fn();
    offerRepo = {
      findOne: jest.fn(async ({ where }: any) => (where.id === OFFER ? { id: OFFER, clientId: CLIENT, talentId: TALENT } : null)),
      save: jest.fn(),
      update: jest.fn(),
      insert: jest.fn(),
    };

    const moduleRef = await Test.createTestingModule({
      controllers: [OffersController, CounterOffersController],
      providers: [
        { provide: OffersService, useValue: offersService },
        { provide: CounterOffersService, useValue: counterService },
        { provide: AblyService, useValue: { createTokenRequest: jest.fn().mockResolvedValue({}) } },
        { provide: getRepositoryToken(Offer), useValue: offerRepo },
        { provide: IdentityVerificationGateClient, useValue: gate },
        OfferPartyGuard,
        RolesGuard,
        TalentGateGuard,
        { provide: IdempotencyInterceptor, useValue: {} },
        { provide: ListingOwnerGuard, useValue: {} },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({
        canActivate: (ctx: ExecutionContext) => {
          const req = ctx.switchToHttp().getRequest();
          const id = req.headers['x-test-user'];
          if (!id) return false;
          req.user = { id, sub: id };
          return true;
        },
      })
      .overrideGuard(ListingOwnerGuard)
      .useValue({ canActivate: () => true })
      .overrideInterceptor(IdempotencyInterceptor)
      .useValue({
        intercept: (_c: ExecutionContext, next: CallHandler) => {
          interceptorEntered();
          return next.handle();
        },
      })
      .compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('v1');
    app.useGlobalFilters(new OfferExceptionFilter());
    await app.init();
  });

  afterEach(async () => app?.close());

  type Route = {
    name: string;
    method: 'post' | 'patch';
    url: string;
    body: Record<string, unknown>;
    clientActs: boolean; // false => the talent is the only valid actor
    talentActs: boolean;
    service: () => jest.Mock;
  };
  const counters = `/v1/offers/${OFFER}/counter-offers`;
  const GATED: Route[] = [
    { name: 'POST /offers (create)', method: 'post', url: '/v1/offers', body: { talentId: TALENT, jobListingId: LISTING }, clientActs: true, talentActs: false, service: () => offersService.create },
    { name: 'PATCH /offers/:id (edit)', method: 'patch', url: `/v1/offers/${OFFER}`, body: {}, clientActs: true, talentActs: false, service: () => offersService.edit },
    { name: 'POST /offers/:id/accept', method: 'post', url: `/v1/offers/${OFFER}/accept`, body: {}, clientActs: false, talentActs: true, service: () => offersService.accept },
    { name: 'POST /offers/:id/resend', method: 'post', url: `/v1/offers/${OFFER}/resend`, body: {}, clientActs: true, talentActs: false, service: () => offersService.resend },
    { name: 'POST counter-offers (create)', method: 'post', url: counters, body: {}, clientActs: true, talentActs: true, service: () => counterService.create },
    { name: 'PATCH counter-offers/:id (edit)', method: 'patch', url: `${counters}/${COUNTER}`, body: {}, clientActs: true, talentActs: true, service: () => counterService.edit },
    { name: 'POST counter-offers/:id/accept', method: 'post', url: `${counters}/${COUNTER}/accept`, body: {}, clientActs: true, talentActs: true, service: () => counterService.accept },
  ];
  const actors = (r: Route) => [
    ...(r.clientActs ? [{ who: 'client', id: CLIENT }] : []),
    ...(r.talentActs ? [{ who: 'talent', id: TALENT }] : []),
  ];
  const cases = GATED.flatMap((r) => actors(r).map((a) => [`${r.name} as ${a.who}`, r, a] as const));

  describe.each(cases)('%s', (_label, route, actor) => {
    const send = () => request(app.getHttpServer())[route.method](route.url).set(as(actor.id)).send(route.body);

    it('goes through to the service when the talent gate is open, after asking about the offer talent', async () => {
      const res = await send();
      expect([200, 201]).toContain(res.status);
      expect(gate.checkGate).toHaveBeenCalledTimes(1);
      expect(gate.checkGate).toHaveBeenCalledWith(TALENT);
      expect(route.service()).toHaveBeenCalledTimes(1);
    });

    it.each(['identity', 'location', 'both'] as const)('is blocked with zero side effects when the gate is closed (%s missing)', async (missing) => {
      gate.checkGate.mockResolvedValue(closed(missing));
      const res = await send();

      expect(res.status).toBe(403);
      if (actor.who === 'client') {
        expect(res.body.error).toBe('TALENT_NOT_HIREABLE');
        // Neutral wording (Chris, G1): says nothing about why the talent is unavailable.
        expect(res.body.message).toBe('This freelancer isn’t available to hire right now');
        // Privacy: nothing about the talent's verification, reason or requirement.
        expect(Object.keys(res.body).sort()).toEqual(['error', 'message', 'path', 'requestId', 'statusCode', 'timestamp']);
        expect(JSON.stringify(res.body)).not.toMatch(/missingRequirements|identity|location|verif|expired|grace|travel/i);
      } else {
        expect(res.body.error).toBe('VERIFICATION_REQUIRED');
        expect(res.body.missingRequirements).toBe(missing); // the talent's own requirement, nothing else
        expect(Object.keys(res.body).sort()).toEqual(['error', 'message', 'missingRequirements', 'path', 'requestId', 'statusCode', 'timestamp']);
      }
      for (const fn of sideEffects()) expect(fn).not.toHaveBeenCalled();
    });

    it('fails closed with 503 and zero side effects when identity-verification-service is unavailable', async () => {
      gate.checkGate.mockRejectedValue(new IdentityVerificationUnavailableException());
      const res = await send();

      expect(res.status).toBe(503);
      expect(res.body.error).toBe('IDENTITY_VERIFICATION_UNAVAILABLE');
      expect(JSON.stringify(res.body)).not.toMatch(/missingRequirements|talent|identity_verification\./i);
      for (const fn of sideEffects()) expect(fn).not.toHaveBeenCalled();
    });

    it('a retry of a blocked request is blocked the same way, still with no side effects', async () => {
      gate.checkGate.mockResolvedValue(closed('identity'));
      const first = await send();
      const second = await send();
      expect(second.status).toBe(first.status);
      expect(second.body.error).toBe(first.body.error);
      for (const fn of sideEffects()) expect(fn).not.toHaveBeenCalled();
    });
  });

  describe('order of checks: authorization first, so the gate leaks nothing to non-parties', () => {
    it('a user who is not a party gets OFFER_ACCESS_DENIED and the gate is never asked', async () => {
      gate.checkGate.mockResolvedValue(closed('both'));
      for (const r of GATED.filter((g) => g.url.includes(OFFER))) {
        const res = await request(app.getHttpServer())[r.method](r.url).set(as(OTHER)).send(r.body);
        expect(res.status).toBe(403);
        expect(res.body.error).toBe('OFFER_ACCESS_DENIED');
      }
      expect(gate.checkGate).not.toHaveBeenCalled();
    });

    it('the wrong party for a role-restricted route gets FORBIDDEN_FOR_ROLE and the gate is never asked', async () => {
      gate.checkGate.mockResolvedValue(closed('both'));
      const asTalentEdit = await request(app.getHttpServer()).patch(`/v1/offers/${OFFER}`).set(as(TALENT)).send({});
      const asClientAccept = await request(app.getHttpServer()).post(`/v1/offers/${OFFER}/accept`).set(as(CLIENT)).send({});
      expect(asTalentEdit.body.error).toBe('FORBIDDEN_FOR_ROLE');
      expect(asClientAccept.body.error).toBe('FORBIDDEN_FOR_ROLE');
      expect(gate.checkGate).not.toHaveBeenCalled();
    });
  });

  describe('POST /offers recipient handling', () => {
    it('gates the talent named in the body, not the caller', async () => {
      await request(app.getHttpServer()).post('/v1/offers').set(as(CLIENT)).send({ talentId: TALENT, jobListingId: LISTING }).expect(201);
      expect(gate.checkGate).toHaveBeenCalledWith(TALENT);
    });

    it.each([
      ['missing talentId', { jobListingId: LISTING }],
      ['malformed talentId', { talentId: 'not-a-uuid', jobListingId: LISTING }],
      ['self-hire (left to CANNOT_HIRE_SELF)', { talentId: CLIENT, jobListingId: LISTING }],
    ])('does not ask the gate for %s - existing validation handles it', async (_l, body) => {
      await request(app.getHttpServer()).post('/v1/offers').set(as(CLIENT)).send(body);
      expect(gate.checkGate).not.toHaveBeenCalled();
    });
  });

  describe('everything else stays ungated, even with the gate closed', () => {
    const UNGATED: Array<[string, 'get' | 'post', string, string, () => jest.Mock | undefined]> = [
      ['talent declines an offer', 'post', `/v1/offers/${OFFER}/decline`, TALENT, () => offersService.decline],
      ['client withdraws an offer', 'post', `/v1/offers/${OFFER}/withdraw`, CLIENT, () => offersService.withdraw],
      ['party declines a counter-offer', 'post', `${counters}/${COUNTER}/decline`, TALENT, () => counterService.decline],
      ['party withdraws a counter-offer', 'post', `${counters}/${COUNTER}/withdraw`, CLIENT, () => counterService.withdraw],
      ['party reads an offer', 'get', `/v1/offers/${OFFER}`, TALENT, () => offersService.findById],
      ['party reads a counter-offer', 'get', `${counters}/${COUNTER}`, CLIENT, () => counterService.findById],
      ['party reads the history', 'get', `/v1/offers/${OFFER}/history`, CLIENT, () => offersService.getHistory],
      ['party lists their offers', 'get', '/v1/offers', TALENT, () => offersService.list],
    ];

    it.each(UNGATED)('%s', async (_l, method, url, userId, svc) => {
      gate.checkGate.mockResolvedValue(closed('both'));
      const res = await request(app.getHttpServer())[method](url).set(as(userId)).send({});
      expect(res.status).toBeLessThan(300);
      expect(gate.checkGate).not.toHaveBeenCalled();
      expect(svc()).toHaveBeenCalledTimes(1);
    });

    it('the Ably token route is ungated', async () => {
      gate.checkGate.mockResolvedValue(closed('both'));
      await request(app.getHttpServer()).get(`/v1/offers/${OFFER}/ably-token`).set(as(TALENT));
      expect(gate.checkGate).not.toHaveBeenCalled();
    });
  });

  it('the gate guard is applied to exactly the seven protected handlers and nothing else', () => {
    const guarded: string[] = [];
    for (const controller of [OffersController, CounterOffersController]) {
      for (const name of Object.getOwnPropertyNames(controller.prototype)) {
        if (name === 'constructor') continue;
        const guards: unknown[] = Reflect.getMetadata('__guards__', (controller.prototype as any)[name]) ?? [];
        if (guards.includes(TalentGateGuard)) guarded.push(`${controller.name}.${name}`);
      }
    }
    expect(guarded.sort()).toEqual(
      [
        'CounterOffersController.acceptCounterOffer',
        'CounterOffersController.createCounterOffer',
        'CounterOffersController.editCounterOffer',
        'OffersController.acceptOffer',
        'OffersController.createOffer',
        'OffersController.editOffer',
        'OffersController.resendOffer',
      ].sort(),
    );
  });

  it('on POST /offers the gate runs after listing-ownership and on the others after party and role guards', () => {
    const order = (controller: any, name: string) => Reflect.getMetadata('__guards__', controller.prototype[name]) as unknown[];
    expect(order(OffersController, 'createOffer')).toEqual([ListingOwnerGuard, TalentGateGuard]);
    for (const n of ['editOffer', 'acceptOffer', 'resendOffer']) {
      expect(order(OffersController, n)).toEqual([OfferPartyGuard, RolesGuard, TalentGateGuard]);
    }
    expect(Reflect.getMetadata('__guards__', CounterOffersController)).toEqual([JwtAuthGuard, OfferPartyGuard]);
  });
});
