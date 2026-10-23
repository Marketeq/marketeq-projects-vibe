import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

export class UpdateCardAddressDto {
  @Transform(trim)
  @IsString()
  @MaxLength(160)
  line1: string;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(160)
  line2?: string;

  @Transform(trim)
  @IsString()
  @MaxLength(80)
  city: string;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(80)
  state?: string;

  @Transform(trim)
  @IsString()
  @MaxLength(20)
  postalCode: string;

  @Transform(trim)
  @IsString()
  @Length(2, 2)
  country: string;
}

export class UpdateCardBillingDetailsDto {
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(160)
  phone?: string;

  @ValidateNested()
  @Type(() => UpdateCardAddressDto)
  address: UpdateCardAddressDto;
}

export class UpdateCardDto {
  @IsOptional()
  @Transform(trim)
  @IsString()
  @Length(2, 160)
  cardholderName?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(12)
  expMonth?: number;

  @IsOptional()
  @IsInt()
  @Min(2000)
  @Max(2100)
  expYear?: number;

  @IsOptional()
  @IsUUID()
  billingAddressId?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => UpdateCardBillingDetailsDto)
  billingDetails?: UpdateCardBillingDetailsDto;

  @IsOptional()
  @IsBoolean()
  setAsDefault?: boolean;
}
