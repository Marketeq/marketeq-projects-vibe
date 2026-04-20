import {
  ArrayMinSize,
  IsArray,
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MinLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  USERNAME_PATTERN,
  USERNAME_RULE_MESSAGE,
} from '../../user-mangement/dtos/username-validation';

export class CreateClientDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  avatarUrl?: string;

  @ApiProperty()
  @IsString({ message: 'First name is required' })
  @IsNotEmpty({ message: 'First name is required' })
  firstName: string;

  @ApiProperty()
  @IsString({ message: 'Last name is required' })
  @IsNotEmpty({ message: 'Last name is required' })
  lastName: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString({ message: 'Username must be a string' })
  @MinLength(3, { message: 'Username must be at least 3 characters long' })
  @Matches(USERNAME_PATTERN, {
    message: USERNAME_RULE_MESSAGE,
  })
  @Transform(({ value }) =>
    typeof value === 'string' ? value.toLowerCase().trim() : value,
  )
  username?: string;

  @ApiProperty()
  @IsString({ message: 'Team name is required' })
  @IsNotEmpty({ message: 'Team name is required' })
  teamName: string;

  @ApiProperty()
  @IsString({ message: 'Role is required' })
  @IsNotEmpty({ message: 'Role is required' })
  role: string;

  @ApiProperty()
  @IsString({ message: 'Industry is required' })
  @IsNotEmpty({ message: 'Industry is required' })
  industry: string;

  @ApiProperty({ type: [String] })
  @IsArray({ message: 'Business types are required' })
  @ArrayMinSize(1, { message: 'Business types are required' })
  businessTypes: string[];

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray({ message: 'Teammates emails must be an array' })
  @IsEmail(
    {},
    {
      each: true,
      message: 'Invalid teammates email',
    },
  )
  teammateEmails?: string[];

  @ApiProperty({ type: [String] })
  @IsArray({ message: 'Industries are required' })
  @ArrayMinSize(1, { message: 'Industries are required' })
  industries: string[];

  @ApiProperty({ type: [String] })
  @IsArray({ message: 'Looking to work with are required' })
  @ArrayMinSize(1, { message: 'Looking to work with are required' })
  lookingToWorkWith: string[];

  @ApiProperty({ type: [String] })
  @IsArray({ message: 'Skills are required' })
  @ArrayMinSize(1, { message: 'Skills are required' })
  skills: string[];

  @ApiProperty({ type: [String] })
  @IsArray({ message: 'Types of projects are required' })
  @ArrayMinSize(1, { message: 'Types of projects are required' })
  projectTypes: string[];

  @ApiProperty()
  @IsString({ message: 'Budget is required' })
  @IsNotEmpty({ message: 'Budget is required' })
  budget: string;
}
