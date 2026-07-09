import { ApiProperty } from '@nestjs/swagger';
import {
  IsOptional,
  IsString,
  IsUUID,
  IsNumber,
  ValidateNested,
  IsArray,
} from 'class-validator';
import { Transform, Type, plainToInstance } from 'class-transformer';

export class FilterMediaDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsUUID()
  projectId?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  featuredImage?: string;

  @ApiProperty({ required: false, type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  additionalImages?: string[];

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  featuredVideo?: string;
}

export class SortMediaDto {
  @ApiProperty()
  @IsString()
  orderBy: keyof FilterMediaDto;

  @ApiProperty()
  @IsString()
  order: 'ASC' | 'DESC';
}

export class QueryMediaDto {
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
    value ? plainToInstance(FilterMediaDto, JSON.parse(value)) : undefined,
  )
  @ValidateNested()
  @Type(() => FilterMediaDto)
  filters?: FilterMediaDto | null;

  @ApiProperty({ type: String, required: false })
  @IsOptional()
  @Transform(({ value }) =>
    value ? plainToInstance(SortMediaDto, JSON.parse(value)) : undefined,
  )
  @ValidateNested({ each: true })
  @Type(() => SortMediaDto)
  sort?: SortMediaDto[] | null;
}
