import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsUrl, MaxLength } from 'class-validator';
import { IsCompanyName } from './company-name.constraint';

export class UpdateCompanyDto {
  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  @MaxLength(255)
  @IsCompanyName()
  name?: string;

  /**
   * The company website. `CreateCompanyDto` already accepts this, but update
   * did not, so a website could be set at registration and never corrected
   * afterwards — Settings > Company Info had no way to save the field.
   *
   * Validated as a plain string rather than `@IsUrl()` to match create, which
   * stores whatever the register step collected; the Settings form supplies
   * the `https://` prefix itself.
   */
  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  @MaxLength(255)
  domain?: string;

  @ApiProperty({ required: false })
  @IsUrl()
  @IsOptional()
  logoUrl?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  @MaxLength(255)
  industry?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  @MaxLength(255)
  businessType?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  @MaxLength(255)
  companySize?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  @MaxLength(255)
  annualRevenue?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  @MaxLength(50)
  phone?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  timeZone?: string;
}
