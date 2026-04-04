import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { Frequency } from '../enums/frequency.enum';
import { HiringType } from '../enums/hiring-type.enum';
import { ScopeKnowledge } from '../enums/scope-knowledge.enum';
import { WorkType } from '../enums/work-type.enum';

export class UpdateJobListingDto {
  // ── Step 1 ─────────────────────────────────────────────────────
  @IsEnum(ScopeKnowledge)
  @IsOptional()
  scopeKnowledge?: ScopeKnowledge;

  @IsEnum(WorkType)
  @IsOptional()
  workType?: WorkType;

  @IsEnum(HiringType)
  @IsOptional()
  hiringType?: HiringType;

  // ── Step 2 ─────────────────────────────────────────────────────
  @IsString()
  @MaxLength(100, { message: 'Description must not exceed 100 words' })
  @IsOptional()
  description?: string;

  @IsString()
  @MaxLength(100, { message: 'Deliverables must not exceed 100 words' })
  @IsOptional()
  deliverables?: string;

  @IsString()
  @MaxLength(100, { message: 'Success criteria must not exceed 100 words' })
  @IsOptional()
  successCriteria?: string;

  @IsInt()
  @Min(1)
  @IsOptional()
  headcount?: number;

  // ── Budget ─────────────────────────────────────────────────────
  // Client submits amount in their display currency.
  // Service converts to USD cents before persisting.
  @IsNumber()
  @Min(0)
  @IsOptional()
  budgetAmount?: number;

  @IsString()
  @IsOptional()
  budgetDisplayCurrency?: string;

  @IsEnum(Frequency)
  @IsOptional()
  budgetFrequency?: Frequency;

  // ── Duration ───────────────────────────────────────────────────
  @IsInt()
  @Min(1)
  @IsOptional()
  durationMonths?: number;

  @IsBoolean()
  @IsOptional()
  isOngoing?: boolean;

  // ── NDA ────────────────────────────────────────────────────────
  @IsBoolean()
  @IsOptional()
  ndaEnabled?: boolean;

  @IsString()
  @IsOptional()
  ndaScopeVisibility?: string;
}
