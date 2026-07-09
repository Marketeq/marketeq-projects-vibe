// apps/payout-service/src/schedule/dto/update-split.dto.ts
// PS-18 §5/§8: DTO for split enable/disable and percentage updates
import { IsOptional, IsBoolean, IsNumber, IsUUID, Min, Max } from 'class-validator';

export class UpdateSplitDto {
  @IsOptional()
  @IsBoolean()
  splitEnabled?: boolean;

  @IsOptional()
  @IsNumber()
  @Min(0.01)
  @Max(99.99)
  primarySplitPercent?: number;

  @IsOptional()
  @IsUUID()
  secondaryMethodId?: string;
}
