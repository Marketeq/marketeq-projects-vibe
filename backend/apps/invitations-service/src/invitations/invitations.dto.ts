import { IsArray, IsEmail, IsEnum, IsNotEmpty, IsOptional, IsString, IsUUID, ArrayNotEmpty, ArrayUnique, MinLength } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateInvitationsDto {
  @ApiProperty({ 
    description: 'Team ID to invite members to',
    example: '123e4567-e89b-12d3-a456-426614174000'
  })
  @IsUUID()
  teamId!: string;

  @IsOptional()
  @IsString()
  teamName?: string;
  
  @IsEnum(['admin','editor','viewer'])
  role!: 'admin' | 'editor' | 'viewer';

  @ApiProperty({ 
    description: 'Email addresses to send invitations to',
    type: [String],
    example: ['user1@example.com', 'user2@example.com']
  })
  @IsArray()
  @ArrayNotEmpty()
  @ArrayUnique()
  @Type(() => String)
  @IsEmail({}, { each: true })
  emails!: string[];

  @ApiPropertyOptional({
    description: 'Optional note to include in invitation',
    example: 'Welcome to our team!'
  })
  @IsOptional()
  @IsString()
  @MinLength(0)
  note?: string;

  @ApiPropertyOptional({
    description: 'User ID (for header/body auth)',
    example: '123e4567-e89b-12d3-a456-426614174000'
  })
  @IsOptional()
  @IsUUID()
  userId?: string;

  @ApiPropertyOptional({ 
    description: 'User email (for header/body auth)',
    example: 'admin@example.com'
  })
  @IsOptional()
  @IsEmail()
  email?: string;
}

export class CreateInviteLinkDto {
  @ApiProperty({
    description: 'Team ID to generate a shareable invite link for',
    example: '123e4567-e89b-12d3-a456-426614174000'
  })
  @IsUUID()
  teamId!: string;

  @IsOptional()
  @IsString()
  teamName?: string;

  @ApiProperty({
    description: 'Role granted when someone accepts this link',
    example: 'viewer'
  })
  @IsEnum(['admin','editor','viewer'])
  role!: 'admin' | 'editor' | 'viewer';
}

export class ResendInvitationDto {
  @IsUUID()
  id!: string;
}

export class CancelInvitationDto {
  @IsUUID()
  id!: string;
}

export class AcceptInvitationDto {
  @ApiProperty({ 
    description: 'Invitation token from email',
    example: 'abc123def456ghi789jkl012'
  })
  @IsString()
  @IsNotEmpty()
  token!: string;
}

export class ListInvitationsQuery {
  @IsOptional()
  @IsUUID()
  teamId?: string;

  @IsOptional()
  @IsEmail()
  invitedEmail?: string;

  @IsOptional()
  @IsEnum(['pending','accepted','canceled','expired'])
  status?: 'pending'|'accepted'|'canceled'|'expired';

  @IsOptional()
  @IsString()
  cursor?: string;

  @IsOptional()
  limit?: number;
}
