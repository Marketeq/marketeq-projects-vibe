import {
  IsBoolean,
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';
import { UserRole } from '../enums/user-role.enum';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SyncUserDto {
  @ApiProperty()
  @IsUUID()
  @IsNotEmpty()
  id: string;

  @ApiProperty()
  @IsEmail()
  email: string;

  @ApiProperty()
  @IsString()
  @IsOptional()
  username?: string;

  @ApiProperty()
  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;

  @IsOptional()
  @IsString()
  provider?: string;

  @IsOptional()
  @IsBoolean()
  hasPassword?: boolean;

  @IsOptional()
  @IsString()
  firstName?: string;

  @IsOptional()
  @IsString()
  lastName?: string;

  @ApiPropertyOptional({ description: "Profile photo from the OAuth provider" })
  @IsOptional()
  @IsString()
  avatarUrl?: string;
}
