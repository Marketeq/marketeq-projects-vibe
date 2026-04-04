import { ApiProperty } from '@nestjs/swagger';
import {
  IsBoolean,
  IsNumber,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Transform, Type, plainToInstance } from 'class-transformer';
import { Project } from '../interface/project';

export class FilterProjectDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  provider?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  email?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  internal?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  searchText?: string;
}

export class SortProjectDto {
  @ApiProperty()
  @IsString()
  orderBy: keyof Project;

  @ApiProperty()
  @IsString()
  order: string;
}

export class QueryProjectDto {
  @ApiProperty({
    required: false,
  })
  @Transform(({ value }) => (value ? Number(value) : 1))
  @IsNumber()
  @IsOptional()
  page: number;

  @ApiProperty({
    required: false,
  })
  @Transform(({ value }) => (value ? Number(value) : 10))
  @IsNumber()
  @IsOptional()
  limit: number;

  @ApiProperty({ type: String, required: false })
  @IsOptional()
  @Transform(({ value }) =>
    value ? plainToInstance(FilterProjectDto, JSON.parse(value)) : undefined,
  )
  @ValidateNested()
  @Type(() => FilterProjectDto)
  filters?: FilterProjectDto | null;

  @ApiProperty({ type: String, required: false })
  @IsOptional()
  @Transform(({ value }) => {
    return value
      ? plainToInstance(SortProjectDto, JSON.parse(value))
      : undefined;
  })
  @ValidateNested({ each: true })
  @Type(() => SortProjectDto)
  sort?: SortProjectDto[] | null;
}
