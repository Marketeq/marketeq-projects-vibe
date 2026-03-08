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

export class ListInvitationsDto {
  @IsUUID()
  @IsOptional()
  teamId?: string;

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
