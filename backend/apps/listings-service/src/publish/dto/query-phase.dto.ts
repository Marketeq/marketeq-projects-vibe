import { ApiProperty } from '@nestjs/swagger';
import {
  IsOptional,
  IsString,
  IsUUID,
  IsNumber,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { Transform, Type, plainToInstance } from 'class-transformer';

export class FilterPhaseDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsUUID()
  projectId?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  phaseName?: string;
}

export class SortPhaseDto {
  @ApiProperty()
  @IsString()
  orderBy: keyof FilterPhaseDto;

  @ApiProperty()
  @IsString()
  order: 'ASC' | 'DESC';
}

export class QueryPhaseDto {
  @ApiProperty({ required: false })
  @Transform(({ value }) => (value ? Number(value) : 1))
  @IsNumber()
  @IsOptional()
  page: number;

  @ApiProperty({ required: false })
  @Transform(({ value }) => (value ? Number(value) : 10))
  @IsNumber()
  @IsOptional()
  limit: number;

  @ApiProperty({ type: String, required: false })
  @IsOptional()
  @Transform(({ value }) =>
    value ? plainToInstance(FilterPhaseDto, JSON.parse(value)) : undefined,
  )
  @ValidateNested()
  @Type(() => FilterPhaseDto)
  filters?: FilterPhaseDto | null;

  @ApiProperty({ type: String, required: false })
  @IsOptional()
  @Transform(({ value }) =>
    value ? plainToInstance(SortPhaseDto, JSON.parse(value)) : undefined,
  )
  @ValidateNested({ each: true })
  @Type(() => SortPhaseDto)
  sort?: SortPhaseDto[] | null;
}
