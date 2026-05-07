import {
  IsString,
  MinLength,
  MaxLength,
  IsEnum,
  IsBoolean,
  IsUUID,
  IsOptional,
  Equals,
} from 'class-validator';
import { SigningMethod } from '../enums/signing-method.enum';

export class SignNdaDto {
  /** Full legal name typed by the signer — compared via Jaro-Winkler */
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  typedName: string;

  @IsEnum(SigningMethod)
  signingMethod: SigningMethod;

  /**
   * ESIGN Act §6.1 compliance — must be true.
   * Returns 422 if false or absent.
   */
  @IsBoolean()
  @Equals(true)
  consentCheckboxChecked: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  initials?: string;

  @IsUUID()
  jobListingId: string;

  // NOTE: ndaDocumentId comes from the :id URL param, not the body.
  // IP address and user-agent are extracted server-side — never sent by client.
}
