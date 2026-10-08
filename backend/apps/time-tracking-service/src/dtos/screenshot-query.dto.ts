import { Transform, Type } from 'class-transformer';
import {
  IsArray,
  IsDateString,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Min,
  Max,
} from 'class-validator';

// Multi-value query params arrive as "a,b,c" (one param through the gateway
// proxy) or as a repeated param; both become a clean string array.
const toList = ({ value }: { value: unknown }): string[] | undefined => {
  if (value === undefined || value === null || value === '') return undefined;
  const raw = Array.isArray(value) ? value : [value];
  const list = raw
    .flatMap((v) => String(v).split(','))
    .map((v) => v.trim())
    .filter(Boolean);
  return list.length ? list : undefined;
};

export const ACTIVITY_BANDS = ['none', 'low', 'medium', 'high'] as const;
export type ActivityBand = (typeof ACTIVITY_BANDS)[number];

export const TIME_ENTRY_TYPES = ['automatic', 'manual', 'edited'] as const;
export type TimeEntryTypeFilter = (typeof TIME_ENTRY_TYPES)[number];

export class ScreenshotQueryDto {
  @IsOptional()
  @IsString()
  contractId?: string;

  @IsOptional()
  @IsString()
  taskId?: string;

  /** Any of these contracts (US-TT-023). Combined with contractId if both are sent. */
  @IsOptional()
  @Transform(toList)
  @IsArray()
  @IsString({ each: true })
  contractIds?: string[];

  /** Any of these tasks (US-TT-024). */
  @IsOptional()
  @Transform(toList)
  @IsArray()
  @IsString({ each: true })
  taskIds?: string[];

  /**
   * Activity bands on (keyboard% + mouse%) / 2 (US-TT-025): none = 0,
   * low = 1–33, medium = 34–66, high = 67–100. Several bands are OR'd.
   */
  @IsOptional()
  @Transform(toList)
  @IsArray()
  @IsIn(ACTIVITY_BANDS, { each: true })
  activityBands?: ActivityBand[];

  /**
   * Entry types (US-TT-026): automatic = never reassigned, edited = contract
   * or task changed after capture, manual = manual entries, which are not
   * screenshots — alone it returns no cards.
   */
  @IsOptional()
  @Transform(toList)
  @IsArray()
  @IsIn(TIME_ENTRY_TYPES, { each: true })
  timeEntryTypes?: TimeEntryTypeFilter[];

  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;

  /** Any of these app names (Filter → Apps), matched case-insensitively against the apps JSONB column. */
  @IsOptional()
  @Transform(toList)
  @IsArray()
  @IsString({ each: true })
  apps?: string[];

  /** Any of these visited URLs (Filter → URLs), matched against apps[].url. */
  @IsOptional()
  @Transform(toList)
  @IsArray()
  @IsString({ each: true })
  urls?: string[];

  /** Filter screenshots where url ILIKE %urlContains% */
  @IsOptional()
  @IsString()
  urlContains?: string;

  /** Minimum activity level (0–100), computed as (keyboard + mouse) / 2 */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(100)
  activityLevel?: number;

  /** Filter by time entry type; 'manual' returns empty from screenshots endpoint */
  @IsOptional()
  @IsIn(['automatic', 'manual', 'all'])
  timeEntryType?: 'automatic' | 'manual' | 'all';

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  minKeyboard?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  maxKeyboard?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  minMouse?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  maxMouse?: number;

  @IsOptional()
  @IsIn(['timestamp', 'keyboard', 'mouse', 'project', 'activity'])
  sortBy?: 'timestamp' | 'keyboard' | 'mouse' | 'project' | 'activity';

  @IsOptional()
  @IsIn(['ASC', 'DESC'])
  sortOrder?: 'ASC' | 'DESC';

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number;

  /**
   * talent (default): the caller's own screenshots.
   * client: screenshots on contracts where the caller is the client.
   */
  @IsOptional()
  @IsIn(['talent', 'client'])
  view?: 'talent' | 'client';
}
