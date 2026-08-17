// apps/offer-service/src/offers/offer-list-query.builder.ts
// Pure decision logic for GET /v1/offers — deliberately dependency-free
// (no repo, no DataSource) so it's unit-testable the same way as
// OfferStateMachine: plain inputs, plain outputs, no mocking.
//
// This is the actual authorization boundary for the list endpoint — the
// party is derived from the JWT-carried role+userId here, never from a
// query param, and OffersService.list() uses resolvePartyFilter's output
// verbatim to build its WHERE clause. Testing this function IS testing
// "can user A see user B's offers."
import { UserRole } from '../common/types/user-role.enum';
import type { OfferListSortField, SortOrder } from './dto/list-offers-query.dto';

export interface PartyFilter {
  column: 'client_id' | 'talent_id';
  value: string;
}

export interface SortSpec {
  column: 'created_at' | 'expires_at';
  direction: 'ASC' | 'DESC';
}

export class OfferListQueryBuilder {
  static resolvePartyFilter(role: UserRole, userId: string): PartyFilter {
    return role === UserRole.CLIENT
      ? { column: 'client_id', value: userId }
      : { column: 'talent_id', value: userId };
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
  // user's offers" is provable directly against data in a unit test, not
  // just by inspecting which column name got returned.
  static applyPartyFilter<T extends { clientId: string; talentId: string }>(
    offers: T[],
    filter: PartyFilter,
  ): T[] {
    return offers.filter((offer) =>
      filter.column === 'client_id'
        ? offer.clientId === filter.value
        : offer.talentId === filter.value,
    );
  }
}
