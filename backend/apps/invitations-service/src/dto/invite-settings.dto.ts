import {
  IsBoolean,
  IsEnum,
  IsISO8601,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';
import {
  InviteAccessLevel,
  LinkExpirationPreset,
} from '../entities/invite-settings.entity';

/**
 * Every field optional: R3-14 settles that each control saves the moment it is
 * changed, with no Save button, so a request carries the one switch that moved
 * rather than the whole panel. Anything absent is left as it was.
 */
export class UpdateInviteSettingsDto {
  /**
   * The account whose settings these are. Defaults to the caller's own
   * account; only an administrator acting for a company the account owns can
   * pass someone else's, and `companyId` has to come with it.
   */
  @IsUUID()
  @IsOptional()
  accountId?: string;

  /** Company the caller is acting through, for the administrator check. */
  @IsUUID()
  @IsOptional()
  companyId?: string;

  @IsBoolean()
  @IsOptional()
  userTracking?: boolean;

  @IsBoolean()
  @IsOptional()
  guestSharing?: boolean;

  @IsBoolean()
  @IsOptional()
  accessRestricted?: boolean;

  @IsEnum(InviteAccessLevel)
  @IsOptional()
  accessLevel?: InviteAccessLevel;

  @IsBoolean()
  @IsOptional()
  linkExpirationEnabled?: boolean;

  @IsEnum(LinkExpirationPreset)
  @IsOptional()
  linkExpirationPreset?: LinkExpirationPreset;

  /** Absolute cut-off for the CUSTOM preset. */
  @IsISO8601()
  @IsOptional()
  linkExpiresAt?: string;

  @IsBoolean()
  @IsOptional()
  passwordEnabled?: boolean;

  /**
   * Write-only. Stored as a bcrypt hash and never read back; the response
   * reports `passwordSet` instead.
   */
  @IsString()
  @MinLength(4)
  @MaxLength(128)
  @IsOptional()
  password?: string;

  @IsBoolean()
  @IsOptional()
  notificationAlerts?: boolean;

  @IsBoolean()
  @IsOptional()
  embedCode?: boolean;
}

export class GetInviteSettingsDto {
  @IsUUID()
  @IsOptional()
  accountId?: string;
}

/** What the API returns. The password hash has no representation here. */
export type PublicInviteSettings = {
  accountId: string;
  userTracking: boolean;
  guestSharing: boolean;
  accessRestricted: boolean;
  accessLevel: InviteAccessLevel;
  linkExpirationEnabled: boolean;
  linkExpirationPreset: LinkExpirationPreset;
  linkExpiresAt: string | null;
  passwordEnabled: boolean;
  /** Whether a password has actually been set, as opposed to merely enabled. */
  passwordSet: boolean;
  notificationAlerts: boolean;
  embedCode: boolean;
};
