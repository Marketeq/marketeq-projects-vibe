import {
  IsArray,
  IsEmail,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsNumber,
  Min,
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

  // `password` intentionally omitted — the user-service never stores or
  // echoes passwords. Credentials live in auth-service; including a
  // password on this DTO would both leak into DB writes and expose the
  // field in Swagger docs.

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

  @ApiPropertyOptional({ example: '+15551234567' })
  @IsOptional()
  @IsString()
  @Matches(/^\+?[1-9]\d{6,14}$/, {
    message: 'phone must be a valid E.164-style phone number',
  })
  phone?: string;

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

  @ApiPropertyOptional({ example : 65 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  rate?: number;

  @ApiPropertyOptional({ example: 50 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  rateMin?: number;

  @ApiPropertyOptional({ example: 120 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  rateMax?: number;

  @ApiPropertyOptional({ example: [{ jobTitle: 'Senior Frontend Engineer', clientRate: 120, earning: 96, fee: 24, saveAsDefault: true }] })
  @IsOptional()
  @IsArray()
  jobTitles?: any[];

  @ApiPropertyOptional({ example: 'talent' })
  @IsOptional()
  @IsString()
  userType?: string;

  @ApiPropertyOptional({ example: 'Finance' })
  @IsOptional()
  @IsString()
  industry?: string;

  @ApiPropertyOptional({ example: 'Hire talent' })
  @IsOptional()
  @IsString()
  businessGoals?: string;

  @ApiPropertyOptional({ example: 2 })
  @IsOptional()
  @IsInt()
  @Min(0)
  gettingStartedStep?: number;

  // `client_success_rating`, `repeat_hire_rate`, and `response_time` are
  // derived metrics that are never set by user input. They are excluded
  // from the input DTO to avoid client spoofing and to keep Swagger clean.

  @ApiPropertyOptional({ example : UserRole.TALENT})
  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;

  @ApiPropertyOptional({ example : 'true'})
  @IsOptional()
  @IsBoolean()
  onboardingDismissed?: boolean;

  @ApiPropertyOptional({ example: 'client' })
  @IsOptional()
  @IsString()
  userType?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  clientOnboardedAt?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  talentOnboardedAt?: string;
}
