import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsArray, IsIn } from 'class-validator';
import { COMPANY_ROLES } from '../entities/company-user.entity';

export class UpdateCompanyMemberDto {
  @ApiProperty({ enum: COMPANY_ROLES, required: false })
  @IsIn(COMPANY_ROLES)
  @IsOptional()
  role?: string;

  @ApiProperty({ required: false, type: [String] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  permissions?: string[];
}
