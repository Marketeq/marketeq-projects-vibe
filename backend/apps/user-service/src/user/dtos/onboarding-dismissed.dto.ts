import { IsEnum, IsOptional } from 'class-validator';
import { UserRole } from '../enums/user-role.enum';
import { ApiProperty } from '@nestjs/swagger';

export class OnboardingDismissedDto {
  @ApiProperty()
  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;
}
