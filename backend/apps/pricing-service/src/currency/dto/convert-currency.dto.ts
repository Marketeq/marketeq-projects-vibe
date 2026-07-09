import { IsNumber, IsString, Length, Matches, Max, Min } from 'class-validator';
import { Transform, Type } from 'class-transformer';

export class ConvertCurrencyQueryDto {
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(1_000_000_000)
  amount!: number;

  // Source currency code. Only USD is supported in this sprint.
  @IsString()
  @Transform(({ value }) => typeof value === 'string' ? value.toUpperCase() : value)
  @Matches(/^USD$/, { message: 'Only USD is supported as a source currency.' })
  from!: string;

  // Target currency ISO 4217 code (exactly 3 uppercase letters).
  @IsString()
  @Transform(({ value }) => typeof value === 'string' ? value.toUpperCase() : value)
  @Length(3, 3, { message: 'Currency code must be exactly 3 characters.' })
  to!: string;
}
