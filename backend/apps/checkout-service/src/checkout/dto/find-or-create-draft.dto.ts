import { Type } from 'class-transformer';
import {
  IsArray,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';

class ScopeSeedTaskDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  roleName?: string;

  @IsOptional()
  @IsArray()
  location?: string[];

  @IsOptional()
  @IsString()
  experienceLevel?: string;

  @IsOptional()
  @IsNumber()
  estimatedHours?: number;
}

class ScopeSeedPhaseDto {
  @IsOptional()
  @IsString()
  phaseName?: string;

  @IsOptional()
  @IsNumber()
  order?: number;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ScopeSeedTaskDto)
  tasks?: ScopeSeedTaskDto[];
}

export class FindOrCreateDraftDto {
  // Supplied by the gateway (already resolved from the caller's own JWT
  // validation) rather than derived from a forwarded user token here — see
  // InternalTokenGuard.
  @IsString()
  @IsNotEmpty()
  clientId: string;

  @IsString()
  @IsNotEmpty()
  listingId: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ScopeSeedPhaseDto)
  phases?: ScopeSeedPhaseDto[];

  @IsOptional()
  @IsNumber()
  projectCost?: number;
}
