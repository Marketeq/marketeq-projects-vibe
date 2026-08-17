// apps/offer-service/src/offers/offer-list-query.builder.spec.ts
// GET /v1/offers — unit tests in the style of offer-state-machine.spec.ts:
// pure functions, plain fixture objects, no mocking/DB.
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { OfferListQueryBuilder } from './offer-list-query.builder';
import { ListOffersQueryDto } from './dto/list-offers-query.dto';
import { UserRole } from '../common/types/user-role.enum';
import { OfferStatus } from './enums/offer-status.enum';
import { LIST_MAX_PAGE_SIZE, LIST_DEFAULT_PAGE_SIZE } from '../common/constants/offer.constants';

describe('OfferListQueryBuilder', () => {
  // ===========================================================
  // resolvePartyFilter — the actual authorization boundary
  // ===========================================================
  describe('resolvePartyFilter', () => {
    it('scopes CLIENT to client_id', () => {
      expect(OfferListQueryBuilder.resolvePartyFilter(UserRole.CLIENT, 'C1'))
        .toEqual({ column: 'client_id', value: 'C1' });
    });

    it('scopes TALENT to talent_id', () => {
      expect(OfferListQueryBuilder.resolvePartyFilter(UserRole.TALENT, 'T1'))
        .toEqual({ column: 'talent_id', value: 'T1' });
    });
  });

  // ===========================================================
  // applyPartyFilter — "one user cannot see another user's offers",
  // proven directly against data rather than by inspecting a column name.
  // ===========================================================
  describe('applyPartyFilter (role scoping / IDOR)', () => {
    const offers = [
      { id: 'O1', clientId: 'C1', talentId: 'T1' },
      { id: 'O2', clientId: 'C1', talentId: 'T2' },
      { id: 'O3', clientId: 'C2', talentId: 'T1' },
      { id: 'O4', clientId: 'C2', talentId: 'T2' },
    ];

    it('a client only sees offers where they are the client', () => {
      const filter = OfferListQueryBuilder.resolvePartyFilter(UserRole.CLIENT, 'C1');
      const result = OfferListQueryBuilder.applyPartyFilter(offers, filter);
      expect(result.map((o) => o.id)).toEqual(['O1', 'O2']);
    });

    it('a talent only sees offers where they are the talent', () => {
      const filter = OfferListQueryBuilder.resolvePartyFilter(UserRole.TALENT, 'T2');
      const result = OfferListQueryBuilder.applyPartyFilter(offers, filter);
      expect(result.map((o) => o.id)).toEqual(['O2', 'O4']);
    });

    it('cannot see another client\'s offers by being a talent on none of them', () => {
      // C1 and C2 both exist, but a request scoped to C1 must never surface
      // any row whose clientId is C2, regardless of who the talent is.
      const filter = OfferListQueryBuilder.resolvePartyFilter(UserRole.CLIENT, 'C1');
      const result = OfferListQueryBuilder.applyPartyFilter(offers, filter);
      expect(result.every((o) => o.clientId === 'C1')).toBe(true);
      expect(result.some((o) => o.clientId === 'C2')).toBe(false);
    });

    it('an id that matches no party returns nothing', () => {
      const filter = OfferListQueryBuilder.resolvePartyFilter(UserRole.TALENT, 'T9');
      expect(OfferListQueryBuilder.applyPartyFilter(offers, filter)).toEqual([]);
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
});
