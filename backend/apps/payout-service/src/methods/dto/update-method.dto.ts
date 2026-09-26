import { IsOptional, IsString, IsBoolean, IsIn, MaxLength } from 'class-validator';

export class UpdateMethodDto {
  @IsOptional() @IsString() @MaxLength(64)
  nickname?: string;

  @IsOptional() @IsBoolean()
  isDefault?: boolean;

  // US-59: full bank-detail replacement — only accepted for BANK_MANUAL
  // methods that haven't completed verification yet (see updateMethod() in
  // methods.service.ts for why). Same field set as AddMethodDto so
  // BankValidationService.validate() can run the identical per-country rules.
  @IsOptional() @IsString() bankAccountName?: string;
  @IsOptional() @IsString() bankCountry?: string;
  @IsOptional() @IsString() bankCurrency?: string;
  @IsOptional() @IsString() bankAccountNumber?: string;
  @IsOptional() @IsString() bankRoutingNumber?: string;
  @IsOptional() @IsString() bankIban?: string;
  @IsOptional() @IsString() bankSwiftBic?: string;
  @IsOptional() @IsString() bankIfscCode?: string;
  @IsOptional() @IsString() bankBsbNumber?: string;
  @IsOptional() @IsString() bankSortCode?: string;
  @IsOptional() @IsString() bankCode?: string;
  @IsOptional() @IsString() bankBranchCode?: string;
  // Zengin accountType — PS-36 §7 requires FUTSU (ordinary) or TOUZA (current).
  // Same requirement as AddMethodDto's field: the edit path re-runs
  // createVerification() -> verifyViaWisePlatform(), which needs this for a
  // JP recipient exactly as much as the initial add does.
  @IsOptional() @IsIn(['FUTSU', 'TOUZA']) bankAccountType?: string;
  @IsOptional() @IsString() bankInstitutionNumber?: string;
  @IsOptional() @IsString() bankTransitNumber?: string;
  @IsOptional() @IsString() bankClabe?: string;
  @IsOptional() @IsString() bankCnapsCode?: string;
  @IsOptional() @IsString() bankBik?: string;
  @IsOptional() @IsString() bankKorrespondentAccount?: string;
  @IsOptional() @IsString() bankCpfCnpj?: string;
  @IsOptional() @IsString() bankAgencia?: string;
  @IsOptional() @IsString() bankConta?: string;
}
