import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsArray, IsIn } from 'class-validator';
import { COMPANY_ROLES } from '../entities/company-user.entity';

export class AddCompanyMemberDto {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  @IsString()
  userId!: string;

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
