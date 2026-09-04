import { IsEnum, IsNotEmpty, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';
import { Type } from 'class-transformer';
import { IsInt, Max, Min } from 'class-validator';
import { BrowsingHistoryItemType } from '../entities/browsing-history.entity';

export class RecordViewDto {
  @IsEnum(BrowsingHistoryItemType)
  itemType: BrowsingHistoryItemType;

  @IsNotEmpty()
  @IsString()
  @MaxLength(100)
  itemId: string;
}

export class ListBrowsingHistoryQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number = 20;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  offset?: number = 0;

  @IsOptional()
  @IsEnum(BrowsingHistoryItemType)
  itemType?: BrowsingHistoryItemType;
}

export class RemoveBrowsingHistoryParamDto {
  @IsUUID()
  id: string;
}
