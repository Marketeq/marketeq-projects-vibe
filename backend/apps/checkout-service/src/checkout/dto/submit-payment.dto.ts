import { IsBoolean, IsNumber, IsOptional, Max, Min } from 'class-validator';

export class SubmitPaymentDto {
  @IsOptional()
  @IsBoolean()
  authorized?: boolean;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(1_000_000)
  expectedTotal?: number;
}
