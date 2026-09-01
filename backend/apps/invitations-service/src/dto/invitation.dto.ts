import { IsUUID, IsEnum, IsArray, IsEmail, ArrayMinSize, IsOptional, IsString, IsInt, Min, Max } from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { InvitationRole, InvitationStatus } from '../entities/invitation.entity';

/**
 * The invite dialog no longer has a role picker. `permissions` (the granular
 * role ids from select-permissions-panel.tsx) is the only access control the
 * inviter chooses, so the UI sends no role at all. `role` stays on the wire
 * for the older callers that still set it, and anything empty/absent lands on
 * VIEWER instead of failing validation with "role must be one of the
 * following values: admin, editor, viewer".
 */
const toRoleOrDefault = ({ value }: { value: unknown }) =>
  typeof value === 'string' && value.trim() ? value.trim() : InvitationRole.VIEWER;

export class CreateInvitationsDto {
  @IsUUID()
  teamId: string;

  @IsUUID()
  @IsOptional()
  companyId?: string;

  @Transform(toRoleOrDefault)
  @IsEnum(InvitationRole)
  @IsOptional()
  role: InvitationRole = InvitationRole.VIEWER;

  @IsArray()
  @ArrayMinSize(1)
  @IsEmail({}, { each: true })
  emails: string[];

  @IsString()
  @IsOptional()
  note?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  permissions?: string[];
}

export class CreateInviteLinkDto {
  @IsUUID()
  teamId: string;

  @IsUUID()
  @IsOptional()
  companyId?: string;

  @IsString()
  @IsOptional()
  teamName?: string;

  @Transform(toRoleOrDefault)
  @IsEnum(InvitationRole)
  @IsOptional()
  role: InvitationRole = InvitationRole.VIEWER;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  permissions?: string[];
}

export class ListInvitationsDto {
  @IsUUID()
  @IsOptional()
  teamId?: string;

  @IsUUID()
  @IsOptional()
  companyId?: string;

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
