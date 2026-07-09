import { IsArray, IsOptional, IsString, MaxLength, ArrayMaxSize } from 'class-validator';

export class UpdateBasicInformationDto {
  // Max 100 characters. Applies to both Project Title and Service Title.
  @IsString()
  @MaxLength(100)
  @IsOptional()
  title?: string;

  @IsString()
  @MaxLength(100)
  @IsOptional()
  jobType?: string;

  // Max 10 industry tags. Each tag max 50 characters.
  @IsArray()
  @ArrayMaxSize(10)
  @IsString({ each: true })
  @MaxLength(50, { each: true })
  @IsOptional()
  industries?: string[];

  // Max 10 language tags. Each tag max 50 characters.
  @IsArray()
  @ArrayMaxSize(10)
  @IsString({ each: true })
  @MaxLength(50, { each: true })
  @IsOptional()
  languages?: string[];
}
