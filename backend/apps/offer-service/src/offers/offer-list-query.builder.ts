// apps/offer-service/src/offers/offer-list-query.builder.ts
// Pure decision logic for GET /v1/offers — deliberately dependency-free
// (no repo, no DataSource) so it's unit-testable the same way as
// OfferStateMachine: plain inputs, plain outputs, no mocking.
//
// This is the actual authorization boundary for the list endpoint. There
// is no JWT role claim to scope by (libs/auth's JwtStrategy.validate()
// never sets one — see roles.guard.ts's comment for the full story), so
// the default scope is "offers where userId is EITHER party" — every
// offer this user is actually part of, and nothing else. The optional
// `as` query param (validated in ListOffersQueryDto) only NARROWS that
// same set to one side of it; userId always comes from the JWT, never
// from a query param, so `as` can never widen what a caller sees.
import type { OfferListSortField, SortOrder, ViewerRoleFilter } from './dto/list-offers-query.dto';

export type PartyFilterMode = 'either' | 'client' | 'talent';

export interface PartyFilter {
  mode: PartyFilterMode;
  userId: string;
}

export interface SortSpec {
  column: 'created_at' | 'expires_at';
  direction: 'ASC' | 'DESC';
}

export class OfferListQueryBuilder {
  static resolvePartyFilter(userId: string, as?: ViewerRoleFilter): PartyFilter {
    if (as === 'client') return { mode: 'client', userId };
    if (as === 'talent') return { mode: 'talent', userId };
    return { mode: 'either', userId };
  }

  static resolveSort(sort: OfferListSortField, order: SortOrder): SortSpec {
    return {
      column: sort === 'expiresAt' ? 'expires_at' : 'created_at',
      direction: order === 'asc' ? 'ASC' : 'DESC',
    };
  }

  // page/limit are already validated and defaulted by ListOffersQueryDto
  // (page >= 1, 1 <= limit <= LIST_MAX_PAGE_SIZE) — this is pure arithmetic
  // on already-trusted values, not a second bounds check.
  static resolveOffset(page: number, limit: number): number {
    return (page - 1) * limit;
  }

  // Not called by OffersService.list() (which pushes the filter into SQL
  // via resolvePartyFilter) — this exists so "a user can't see another
  // user's offers" (and "either" doesn't secretly mean "everyone's") is
  // provable directly against data in a unit test, not just by inspecting
  // which column name got returned.
  static applyPartyFilter<T extends { clientId: string; talentId: string }>(
    offers: T[],
    filter: PartyFilter,
  ): T[] {
    return offers.filter((offer) => {
      if (filter.mode === 'client') return offer.clientId === filter.userId;
      if (filter.mode === 'talent') return offer.talentId === filter.userId;
      return offer.clientId === filter.userId || offer.talentId === filter.userId;
    });
  }
}
