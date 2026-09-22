import { IsString, IsOptional, IsIn, IsNotEmpty, IsDateString } from 'class-validator';

export class AddMethodDto {
  @IsIn(['BANK_STRIPE', 'BANK_MANUAL', 'WISE', 'PAYONEER', 'CRYPTO', 'MARKETEQ_DEBIT_CARD', 'TEQ_COIN'])
  methodType: string;

  // Common bank fields
  @IsOptional() @IsString() bankAccountName?: string;
  @IsOptional() @IsString() bankCountry?: string;
  @IsOptional() @IsString() bankCurrency?: string;
  @IsOptional() @IsString() bankAccountNumber?: string;

  // US
  @IsOptional() @IsString() bankRoutingNumber?: string;

  // SEPA / SWIFT / GCC
  @IsOptional() @IsString() bankIban?: string;
  @IsOptional() @IsString() bankSwiftBic?: string;

  // India
  @IsOptional() @IsString() bankIfscCode?: string;

  // Australia
  @IsOptional() @IsString() bankBsbNumber?: string;

  // UK
  @IsOptional() @IsString() bankSortCode?: string;

  // Japan
  @IsOptional() @IsString() bankCode?: string;
  @IsOptional() @IsString() bankBranchCode?: string;

  // Canada (SG-07)
  @IsOptional() @IsString() bankInstitutionNumber?: string;
  @IsOptional() @IsString() bankTransitNumber?: string;

  // Mexico (SG-08)
  @IsOptional() @IsString() bankClabe?: string;

  // China (SG-10)
  @IsOptional() @IsString() bankCnapsCode?: string;

  // Russia (SG-11)
  @IsOptional() @IsString() bankBik?: string;
  @IsOptional() @IsString() bankKorrespondentAccount?: string;

  // Brazil (SG-08)
  @IsOptional() @IsString() bankCpfCnpj?: string;
  @IsOptional() @IsString() bankAgencia?: string;
  @IsOptional() @IsString() bankConta?: string;

  // PS-34 §4.1/§4.2: DOB + legal name, required for UK/SEPA/AU/CA
  // (Stripe cross-border) BANK_MANUAL methods — added to the bank entry
  // form (PS-06) to unlock the transfers capability via
  // StripeProvider.submitDob(). ISO 8601 date string (YYYY-MM-DD).
  @IsOptional() @IsDateString() dateOfBirth?: string;
  @IsOptional() @IsString() legalFirstName?: string;
  @IsOptional() @IsString() legalLastName?: string;

  // OAuth fields
  @IsOptional() @IsString() wiseEmail?: string;

  // Display
  @IsOptional() @IsString() nickname?: string;

  // CRYPTO fields
  @IsOptional() @IsString() cryptoProvider?: string;
  @IsOptional() @IsString() cryptoNetwork?: string;
  @IsOptional() @IsString() cryptoCurrency?: string;
  @IsOptional() @IsString() cryptoAddress?: string;
}
