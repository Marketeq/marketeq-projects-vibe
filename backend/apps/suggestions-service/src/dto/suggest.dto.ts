import { IsString, IsOptional, IsInt, Min, Max, IsNotEmpty, MinLength } from 'class-validator';
import { Type } from 'class-transformer';

export class SuggestDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  q: string;

  @IsString()
  @IsOptional()
  industry?: string;

  @IsString()
  @IsOptional()
  goal?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number = 10;
}

export class AddJobTitleDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  title: string;

  @IsString()
  @IsOptional()
  industry?: string;

  @IsString()
  @IsOptional()
  goal?: string;

  @IsString()
  @IsOptional()
  category?: string;
}
