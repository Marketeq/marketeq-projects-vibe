import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsNumber,
  Min,
  Max,
  MinLength,
  IsBoolean,
  IsEnum,
  Matches,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { UserRole } from '../enums/user-role.enum';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  USERNAME_PATTERN,
  USERNAME_RULE_MESSAGE,
} from '../../user-mangement/dtos/username-validation';
export class CreateUserDto {
  @ApiProperty({ example : 'user123'})
  @IsNotEmpty()
  @IsString()
  @MinLength(3)
  @Matches(USERNAME_PATTERN, {
    message: USERNAME_RULE_MESSAGE,
  })
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  username: string;

  @ApiProperty({ example : 'example@email.com'})
  @IsEmail()
  email: string;

  @ApiProperty()
  @IsString()
  @MinLength(6)
  password: string;

  @ApiPropertyOptional({ example : 'Data Analyst with a background in data modeling and visualization'})
  @IsOptional()
  @IsString()
  bio?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  overview?: string;

  @ApiPropertyOptional({ example : 'John'})
  @IsOptional()
  @IsString()
  firstName?: string;

  @ApiPropertyOptional({ example : 'Doe'})
  @IsOptional()
  @IsString()
  lastName?: string;

  @ApiPropertyOptional({ example : 'http://avatar-url-example.com'})
  @IsOptional()
  @IsString()
  avatarUrl?: string;

  @ApiPropertyOptional({ example : 'Miami'})
  @IsOptional()
  @IsString()
  location?: string;

  @ApiPropertyOptional({ example : 'English'})
  @IsOptional()
  @IsString()
  language?: string;

  @ApiPropertyOptional({ example : 'Data Analyst'})
  @IsOptional()
  @IsString()
  recentJobTitle?: string;

  @ApiPropertyOptional({ example : 'Finance'})
  @IsOptional()
  @IsString()
  industriesWorkedIn?: string;

  @ApiPropertyOptional({ example : 'Eastern Standard Time'})
  @IsOptional()
  @IsString()
  timezone?: string;

  @ApiPropertyOptional({ example : 'Full-time'})
  @IsOptional()
  @IsString()
  availability?: string;

  @ApiPropertyOptional({ example : ['React', 'TypeScript', 'JavaScript']})
  @IsOptional()
  lookingToWorkWith?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  projectTypes?: string[];

  @ApiPropertyOptional({ example : 'false'})
  @IsOptional()
  isStudent?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  customAvailability?: unknown;

  @ApiPropertyOptional({ example : '65'})
  @IsOptional()
  @IsNumber()
  @Min(0)
  rate_min?: number;

  @ApiPropertyOptional({ example : '85'})
  @IsOptional()
  @IsNumber()
  @Min(0)
  rate_max?: number;

  @ApiPropertyOptional({ example : '4'})
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(5)
  client_success_rating?: number;

  @ApiPropertyOptional({ example : '70'})
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  repeat_hire_rate?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  response_time?: string;

  @ApiPropertyOptional({ example : UserRole.TALENT})
  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;

  @ApiPropertyOptional({ example : 'true'})
  @IsOptional()
  @IsBoolean()
  onboardingDismissed?: boolean;
}
