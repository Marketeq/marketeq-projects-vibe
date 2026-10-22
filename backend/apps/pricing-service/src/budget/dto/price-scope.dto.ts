import {
  IsArray,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class ScopePriceTaskDto {
  @IsString()
  @MaxLength(100)
  @IsOptional()
  roleName?: string | null;

  @IsString()
  @MaxLength(50)
  @IsOptional()
  experienceLevel?: string | null;

  @IsString()
  @MaxLength(100)
  @IsOptional()
  location?: string | null;

  @IsNumber()
  @Min(0)
  estimatedHours!: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  hourlyRate?: number | null;
}

export class ScopePricePhaseDto {
  @IsArray()
  @IsObject({ each: true })
  @ValidateNested({ each: true })
  @Type(() => ScopePriceTaskDto)
  tasks!: ScopePriceTaskDto[];
}

export class PriceScopeDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ScopePricePhaseDto)
  phases!: ScopePricePhaseDto[];
}
