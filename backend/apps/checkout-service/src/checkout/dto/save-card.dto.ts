import {
  IsBoolean,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
} from 'class-validator';

export class SaveCardDto {
  @IsString()
  @Matches(/^pm_[A-Za-z0-9_]+$/, {
    message: 'paymentMethodId must be a Stripe payment method id',
  })
  paymentMethodId: string;

  @IsOptional()
  @IsUUID()
  billingAddressId?: string;

  @IsOptional()
  @IsBoolean()
  setAsDefault?: boolean;
}
