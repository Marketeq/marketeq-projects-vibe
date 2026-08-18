// apps/offer-service/src/offers/offer-list-query.builder.spec.ts
// GET /v1/offers — unit tests in the style of offer-state-machine.spec.ts:
// pure functions, plain fixture objects, no mocking/DB.
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { OfferListQueryBuilder } from './offer-list-query.builder';
import { ListOffersQueryDto } from './dto/list-offers-query.dto';
import { derivePartyRole } from '../guards/party-role.util';
import { OfferStatus } from './enums/offer-status.enum';
import { LIST_MAX_PAGE_SIZE, LIST_DEFAULT_PAGE_SIZE } from '../common/constants/offer.constants';

describe('OfferListQueryBuilder', () => {
  // ===========================================================
  // resolvePartyFilter — the actual authorization boundary. No role
  // param: default scope is "either party"; `as` only narrows it.
  // ===========================================================
  describe('resolvePartyFilter', () => {
    it('defaults to "either" when as is omitted', () => {
      expect(OfferListQueryBuilder.resolvePartyFilter('U1'))
        .toEqual({ mode: 'either', userId: 'U1' });
    });

    it('narrows to client_id when as=client', () => {
      expect(OfferListQueryBuilder.resolvePartyFilter('U1', 'client'))
        .toEqual({ mode: 'client', userId: 'U1' });
    });

    it('narrows to talent_id when as=talent', () => {
      expect(OfferListQueryBuilder.resolvePartyFilter('U1', 'talent'))
        .toEqual({ mode: 'talent', userId: 'U1' });
    });
  });

  // ===========================================================
  // applyPartyFilter — "one user cannot see another user's offers", and
  // "either" doesn't secretly mean "everyone's" — proven directly against
  // data rather than by inspecting a column name.
  // ===========================================================
  describe('applyPartyFilter (role scoping / IDOR)', () => {
    const offers = [
      { id: 'O1', clientId: 'C1', talentId: 'T1' },
      { id: 'O2', clientId: 'C1', talentId: 'T2' },
      { id: 'O3', clientId: 'C2', talentId: 'T1' },
      { id: 'O4', clientId: 'C2', talentId: 'T2' },
      // U1 is talent on O5 and client on O6 — the "sees both sides" case.
      { id: 'O5', clientId: 'C3', talentId: 'U1' },
      { id: 'O6', clientId: 'U1', talentId: 'T3' },
    ];

    it('as=client only returns offers where they are the client', () => {
      const filter = OfferListQueryBuilder.resolvePartyFilter('C1', 'client');
      const result = OfferListQueryBuilder.applyPartyFilter(offers, filter);
      expect(result.map((o) => o.id)).toEqual(['O1', 'O2']);
    });

    it('as=talent only returns offers where they are the talent', () => {
      const filter = OfferListQueryBuilder.resolvePartyFilter('T2', 'talent');
      const result = OfferListQueryBuilder.applyPartyFilter(offers, filter);
      expect(result.map((o) => o.id)).toEqual(['O2', 'O4']);
    });

    it('cannot see another client\'s offers by being a talent on none of them', () => {
      // C1 and C2 both exist, but a request scoped to C1 must never surface
      // any row whose clientId is C2, regardless of who the talent is.
      const filter = OfferListQueryBuilder.resolvePartyFilter('C1', 'client');
      const result = OfferListQueryBuilder.applyPartyFilter(offers, filter);
      expect(result.every((o) => o.clientId === 'C1')).toBe(true);
      expect(result.some((o) => o.clientId === 'C2')).toBe(false);
    });

    it('default ("either") scope: a user who is talent on some offers and client on others sees both', () => {
      const filter = OfferListQueryBuilder.resolvePartyFilter('U1');
      const result = OfferListQueryBuilder.applyPartyFilter(offers, filter);
      expect(result.map((o) => o.id).sort()).toEqual(['O5', 'O6']);
    });

    it('a user who is party to nothing gets an empty list, not everything', () => {
      const filter = OfferListQueryBuilder.resolvePartyFilter('NOBODY');
      expect(OfferListQueryBuilder.applyPartyFilter(offers, filter)).toEqual([]);
    });

    it('an id that matches no party returns nothing (as=talent)', () => {
      const filter = OfferListQueryBuilder.resolvePartyFilter('T9', 'talent');
      expect(OfferListQueryBuilder.applyPartyFilter(offers, filter)).toEqual([]);
    });
  });

  // ===========================================================
  // viewerRole — GET /v1/offers derives this per row from
  // party-role.util.ts's derivePartyRole (clientId/talentId vs userId),
  // never from the `as` query param used to build the filter above.
  // ===========================================================
  describe('viewerRole (derivePartyRole reused for GET /v1/offers rows)', () => {
    const offers = [
      { id: 'O5', clientId: 'C3', talentId: 'U1' },
      { id: 'O6', clientId: 'U1', talentId: 'T3' },
    ];

    it('is correct per row for a user who is talent on one and client on another', () => {
      const filter = OfferListQueryBuilder.resolvePartyFilter('U1');
      const rows = OfferListQueryBuilder.applyPartyFilter(offers, filter);
      const viewerRoles = rows.map((o) => ({ id: o.id, viewerRole: derivePartyRole(o, 'U1') }));
      expect(viewerRoles).toEqual([
        { id: 'O5', viewerRole: 'TALENT' },
        { id: 'O6', viewerRole: 'CLIENT' },
      ]);
    });
  });

  // ===========================================================
  // resolveSort
  // ===========================================================
  describe('resolveSort', () => {
    it.each([
      ['createdAt', 'desc', { column: 'created_at', direction: 'DESC' }],
      ['createdAt', 'asc', { column: 'created_at', direction: 'ASC' }],
      ['expiresAt', 'desc', { column: 'expires_at', direction: 'DESC' }],
      ['expiresAt', 'asc', { column: 'expires_at', direction: 'ASC' }],
    ] as const)('sort=%s order=%s -> %o', (sort, order, expected) => {
      expect(OfferListQueryBuilder.resolveSort(sort, order)).toEqual(expected);
    });
  });

  // ===========================================================
  // resolveOffset
  // ===========================================================
  describe('resolveOffset', () => {
    it.each([
      [1, 20, 0],
      [2, 20, 20],
      [3, 20, 40],
      [1, 100, 0],
      [5, 1, 4],
    ])('page=%i limit=%i -> offset=%i', (page, limit, expected) => {
      expect(OfferListQueryBuilder.resolveOffset(page, limit)).toBe(expected);
    });
  });
});

// ===========================================================
// ListOffersQueryDto — pagination bounds + status enum validation
// ===========================================================
describe('ListOffersQueryDto validation', () => {
  const validateDto = async (plain: Record<string, unknown>) => {
    const dto = plainToInstance(ListOffersQueryDto, plain);
    return validate(dto);
  };

  it('defaults page to 1 and limit to LIST_DEFAULT_PAGE_SIZE when omitted', async () => {
    const dto = plainToInstance(ListOffersQueryDto, {});
    expect(dto.page).toBe(1);
    expect(dto.limit).toBe(LIST_DEFAULT_PAGE_SIZE);
    expect(dto.sort).toBe('createdAt');
    expect(dto.order).toBe('desc');
    expect(await validate(dto)).toHaveLength(0);
  });

  it('accepts limit at the max boundary', async () => {
    expect(await validateDto({ limit: LIST_MAX_PAGE_SIZE })).toHaveLength(0);
  });

  it('rejects limit above the max boundary', async () => {
    const errors = await validateDto({ limit: LIST_MAX_PAGE_SIZE + 1 });
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].property).toBe('limit');
  });

  it('rejects limit below 1', async () => {
    const errors = await validateDto({ limit: 0 });
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].property).toBe('limit');
  });

  it('rejects page below 1', async () => {
    const errors = await validateDto({ page: 0 });
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].property).toBe('page');
  });

  it('accepts a single repeated status value normalized to an array', async () => {
    const dto = plainToInstance(ListOffersQueryDto, { status: OfferStatus.PENDING });
    expect(dto.status).toEqual([OfferStatus.PENDING]);
    expect(await validate(dto)).toHaveLength(0);
  });

  it('accepts multiple status values', async () => {
    const errors = await validateDto({ status: [OfferStatus.PENDING, OfferStatus.COUNTERED] });
    expect(errors).toHaveLength(0);
  });

  it('rejects a status value outside the enum', async () => {
    const errors = await validateDto({ status: ['NOT_A_REAL_STATUS'] });
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].property).toBe('status');
  });

  it('rejects an invalid sort field', async () => {
    const errors = await validateDto({ sort: 'talentId' });
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].property).toBe('sort');
  });

  it('rejects an invalid order value', async () => {
    const errors = await validateDto({ order: 'sideways' });
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].property).toBe('order');
  });

  it('leaves as undefined when omitted', async () => {
    const dto = plainToInstance(ListOffersQueryDto, {});
    expect(dto.as).toBeUndefined();
    expect(await validate(dto)).toHaveLength(0);
  });

  it('accepts as=client', async () => {
    expect(await validateDto({ as: 'client' })).toHaveLength(0);
  });

  it('accepts as=talent', async () => {
    expect(await validateDto({ as: 'talent' })).toHaveLength(0);
  });

  it('rejects an invalid as value', async () => {
    const errors = await validateDto({ as: 'admin' });
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].property).toBe('as');
  });
});
