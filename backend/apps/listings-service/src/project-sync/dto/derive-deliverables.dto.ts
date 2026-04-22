import {
  IsArray,
  IsEmail,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from "class-validator";
import { Type } from "class-transformer";

class DeriveDeliverablesTaskDto {
  @IsString()
  title!: string;

  @IsString()
  roleName!: string;

  @IsOptional()
  @IsString()
  location?: string;

  @IsOptional()
  @IsString()
  experienceLevel?: string;

  @IsNumber()
  @Min(0)
  estimatedHours!: number;

  @IsOptional()
  @IsEmail()
  assigneeEmail?: string;
}

class DeriveDeliverablesPhaseDto {
  @IsString()
  phaseName!: string;

  @IsInt()
  @Min(1)
  order!: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DeriveDeliverablesTaskDto)
  tasks!: DeriveDeliverablesTaskDto[];
}

export class DeriveDeliverablesDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DeriveDeliverablesPhaseDto)
  scope!: DeriveDeliverablesPhaseDto[];
}

