import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  Min,
  ValidateBy,
  ValidationOptions,
} from "class-validator";
import { Frequency } from "../enums/frequency.enum";
import { HiringType } from "../enums/hiring-type.enum";
import { JobListingType } from "../enums/job-listing-type.enum";
import { ScopeKnowledge } from "../enums/scope-knowledge.enum";
import { WorkType } from "../enums/work-type.enum";

function MaxWords(maxWords: number, validationOptions?: ValidationOptions) {
  return ValidateBy(
    {
      name: "maxWords",
      constraints: [maxWords],
      validator: {
        validate(value: unknown): boolean {
          if (typeof value !== "string") return false;
          const wordCount = value.trim().split(/\s+/).filter(Boolean).length;
          return wordCount <= maxWords;
        },
      },
    },
    validationOptions,
  );
}

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

  @IsEnum(JobListingType)
  @IsOptional()
  listingType?: JobListingType;

  // ── Step 2 ─────────────────────────────────────────────────────
  @IsString()
  @MaxWords(100, { message: "Description must not exceed 100 words" })
  @IsOptional()
  description?: string;

  @IsString()
  @MaxWords(100, { message: "Deliverables must not exceed 100 words" })
  @IsOptional()
  deliverables?: string;

  @IsString()
  @MaxWords(100, { message: "Success criteria must not exceed 100 words" })
  @IsOptional()
  successCriteria?: string;

  @IsInt()
  @Min(1)
  @IsOptional()
  headcount?: number;

  @IsArray()
  @IsOptional()
  categorySelections?: Array<{
    category?: string;
    subCategories?: string[];
  }>;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  tags?: string[];

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  skills?: string[];

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  tools?: string[];

  @IsObject()
  @IsOptional()
  media?: Record<string, unknown>;

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

  @IsString()
  @IsOptional()
  briefR2Key?: string;

  @IsString()
  @IsOptional()
  briefFilename?: string;

  @IsInt()
  @Min(0)
  @IsOptional()
  briefSizeBytes?: number;

  // ── NDA ────────────────────────────────────────────────────────
  @IsBoolean()
  @IsOptional()
  ndaEnabled?: boolean;

  @IsString()
  @IsOptional()
  ndaScopeVisibility?: string;

  @IsInt()
  @Min(0)
  @IsOptional()
  lastCompletedStep?: number;
}
