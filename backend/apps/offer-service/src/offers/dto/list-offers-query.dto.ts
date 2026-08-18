// apps/offer-service/src/offers/dto/list-offers-query.dto.ts
// GET /v1/offers — query params for the offers inbox list.
import { IsOptional, IsInt, Min, Max, IsIn, IsArray, IsEnum } from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { OfferStatus } from '../enums/offer-status.enum';
import { LIST_DEFAULT_PAGE_SIZE, LIST_MAX_PAGE_SIZE } from '../../common/constants/offer.constants';

export type OfferListSortField = 'createdAt' | 'expiresAt';
export type SortOrder = 'asc' | 'desc';
export type ViewerRoleFilter = 'client' | 'talent';

export class ListOffersQueryDto {
  // Repeatable: ?status=PENDING&status=COUNTERED. A single value arrives
  // as a bare string (not a 1-element array) from the qs parser, so it's
  // normalized to an array before validation — @IsEnum({ each: true })
  // below otherwise silently no-ops on a non-array value.
  @IsOptional()
  @Transform(({ value }) => (value === undefined ? undefined : Array.isArray(value) ? value : [value]))
  @IsArray()
  @IsEnum(OfferStatus, {
    each: true,
    message: 'status must be one or more of: PENDING, ACCEPTED, DECLINED, WITHDRAWN, EXPIRED, COUNTERED.',
  })
  status?: OfferStatus[];

  @IsOptional()
  @IsInt({ message: 'page must be a whole number.' })
  @Min(1, { message: 'page must be at least 1.' })
  @Type(() => Number)
  page: number = 1;

  @IsOptional()
  @IsInt({ message: 'limit must be a whole number.' })
  @Min(1, { message: 'limit must be at least 1.' })
  @Max(LIST_MAX_PAGE_SIZE, { message: `limit cannot exceed ${LIST_MAX_PAGE_SIZE}.` })
  @Type(() => Number)
  limit: number = LIST_DEFAULT_PAGE_SIZE;

  @IsOptional()
  @IsIn(['createdAt', 'expiresAt'], { message: 'sort must be either createdAt or expiresAt.' })
  sort: OfferListSortField = 'createdAt';

  @IsOptional()
  @IsIn(['asc', 'desc'], { message: 'order must be either asc or desc.' })
  order: SortOrder = 'desc';

  // Default scope (when omitted) is "offers where the caller is either
  // party" — see OfferListQueryBuilder.resolvePartyFilter's comment for
  // why. This narrows to one side of that same set; it can never widen it,
  // since the userId behind the filter always comes from the JWT, never
  // from this param.
  @IsOptional()
  @IsIn(['client', 'talent'], { message: 'as must be either client or talent.' })
  as?: ViewerRoleFilter;
}
