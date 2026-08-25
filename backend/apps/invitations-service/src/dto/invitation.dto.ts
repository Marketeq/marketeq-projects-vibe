import { IsUUID, IsEnum, IsArray, IsEmail, ArrayMinSize, IsOptional, IsString, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { InvitationRole, InvitationStatus } from '../entities/invitation.entity';

export class CreateInvitationsDto {
  @IsUUID()
  teamId: string;

  @IsEnum(InvitationRole)
  role: InvitationRole;

  @IsArray()
  @ArrayMinSize(1)
  @IsEmail({}, { each: true })
  emails: string[];

  @IsString()
  @IsOptional()
  note?: string;
}

export class CreateInviteLinkDto {
  @IsUUID()
  teamId: string;

  @IsString()
  @IsOptional()
  teamName?: string;

  @IsEnum(InvitationRole)
  role: InvitationRole;
}

export class ListInvitationsDto {
  @IsUUID()
  @IsOptional()
  teamId?: string;

  @IsEmail()
  @IsOptional()
  invitedEmail?: string;

  @IsEnum(InvitationStatus)
  @IsOptional()
  status?: InvitationStatus;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @IsString()
  @IsOptional()
  cursor?: string;
}

export class AcceptInvitationDto {
  @IsString()
  token: string;
}

export class ShareProjectLinkDto {
  @IsArray()
  @ArrayMinSize(1)
  @IsEmail({}, { each: true })
  emails: string[];

  @IsString()
  projectUrl: string;

  @IsString()
  @IsOptional()
  projectTitle?: string;

  @IsString()
  @IsOptional()
  message?: string;
}
