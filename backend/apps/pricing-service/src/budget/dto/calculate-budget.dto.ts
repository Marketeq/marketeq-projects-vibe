import {
  IsArray,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  ArrayMinSize,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

// Represents one role in the budget calculation.
// Maps to either a JobListingTask (scope table) or a TeamMemberRow (team table).
export class BudgetRoleInputDto {
  @IsString()
  @MaxLength(100)
  roleTitle!: string;

  @IsString()
  @MaxLength(100)
  @IsOptional()
  location?: string;

  @IsIn(['junior', 'mid', 'senior'])
  @IsOptional()
  experienceLevel?: string;

  @IsIn(['full_time', 'part_time', 'custom'])
  @IsOptional()
  workSchedule?: string;

  // Estimated hours for this role (from JobListingTask.estimatedHours
  // or derived from TeamMemberRow.workSchedule and contractLengthMonths).
  // Must be a positive integer. Decimal hours are rounded to the nearest integer.
  @IsInt()
  @Min(1)
  estimatedHours!: number;

  // Optional FX multiplier for currency conversion.
  // Defaults to 1 (no conversion — result stays in USD cents).
  // Supply a rate (e.g. 0.9231 for USD→EUR) to get the budget in target currency cents.
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  fxMultiplier?: number;
}

export class CalculateBudgetDto {
  // At least one role must be provided.
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => BudgetRoleInputDto)
  roles!: BudgetRoleInputDto[];
}
