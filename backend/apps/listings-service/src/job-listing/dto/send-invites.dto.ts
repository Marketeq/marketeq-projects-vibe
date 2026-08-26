import {
  ArrayMaxSize,
  ArrayNotEmpty,
  IsArray,
  IsOptional,
  IsString,
  IsUUID,
} from "class-validator";

export class SendInvitesDto {
  // Array of talent user IDs to invite. Max 30 per send action
  // (10 free invites per role, max 3 roles per batch = 30 max).
  @IsArray()
  @ArrayNotEmpty()
  @ArrayMaxSize(30)
  @IsUUID(undefined, { each: true })
  talentUserIds: string[];

  // Optional role title filter. When provided, invites are sent only
  // to talent matching the specified role. When null, invites are sent
  // across all open roles according to the Apply to All Roles setting.
  @IsOptional()
  @IsUUID()
  roleRowId?: string;

  @IsOptional()
  @IsString()
  roleTitle?: string;
}
