import { IsString, IsNotEmpty, Length, IsOptional } from 'class-validator';

export class ConfirmHomeCountryDto {
  @IsString()
  @IsNotEmpty()
  @Length(2, 2)
  country: string;

  @IsOptional()
  @IsString()
  region?: string;

  @IsOptional()
  @IsString()
  city?: string;
}

export class LocationStatusResponseDto {
  userId: string;
  verifiedHomeCountry: string | null;
  verifiedHomeCountryConfirmedAt: Date | null;
  detectedCountry: string | null;
  detectedRegionState: string | null;
  detectedCity: string | null;
  locationVerificationStatus: string;
}
