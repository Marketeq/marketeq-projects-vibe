// apps/offer-service/src/offers/dto/offer-history-query.dto.ts
// OS-11: GET /v1/offers/:id/history — cursor-based pagination, max 50 events per page
import { IsOptional, IsString, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { HISTORY_PAGE_SIZE } from '../../common/constants/offer.constants';

export class OfferHistoryQueryDto {
  @IsOptional()
  @IsString()
  cursor?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(HISTORY_PAGE_SIZE)
  @Type(() => Number)
  limit: number = HISTORY_PAGE_SIZE;
}