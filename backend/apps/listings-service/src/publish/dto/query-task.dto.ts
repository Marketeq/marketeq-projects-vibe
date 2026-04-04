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

export class FilterTaskDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsUUID()
  phaseId?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  taskName?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  role?: string;

  @ApiProperty({ required: false, type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  location?: string[];

  @ApiProperty({ required: false, type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  experience?: string[];

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  duration?: string;
}

export class SortTaskDto {
  @ApiProperty()
  @IsString()
  orderBy: keyof FilterTaskDto;

  @ApiProperty()
  @IsString()
  order: 'ASC' | 'DESC';
}

export class QueryTaskDto {
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
    value ? plainToInstance(FilterTaskDto, JSON.parse(value)) : undefined,
  )
  @ValidateNested()
  @Type(() => FilterTaskDto)
  filters?: FilterTaskDto | null;

  @ApiProperty({ type: String, required: false })
  @IsOptional()
  @Transform(({ value }) =>
    value ? plainToInstance(SortTaskDto, JSON.parse(value)) : undefined,
  )
  @ValidateNested({ each: true })
  @Type(() => SortTaskDto)
  sort?: SortTaskDto[] | null;
}
