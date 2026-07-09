import { IsArray, IsOptional, IsString, ArrayMaxSize, MaxLength } from 'class-validator';

export class UpdateRoleDescriptionDto {
  // All text fields max 100 words. Enforced at the service layer
  // by word-count validation before persisting.
  @IsString()
  @IsOptional()
  overview?: string;

  @IsString()
  @IsOptional()
  benefits?: string;

  @IsString()
  @IsOptional()
  responsibilities?: string;

  // Max 20 skill tags. Each tag max 50 characters.
  @IsArray()
  @ArrayMaxSize(20)
  @IsString({ each: true })
  @MaxLength(50, { each: true })
  @IsOptional()
  skills?: string[];
}
