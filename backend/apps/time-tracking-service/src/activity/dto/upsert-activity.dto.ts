import { IsArray, IsBoolean, IsISO8601, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
 
export class ActivityMinuteInput {
  @IsString() id!: string;
  @IsISO8601() minuteStartAt!: string;
  @IsBoolean() active!: boolean;
  @IsOptional() @IsString() idempotencyKey?: string;
}
 
export class UpsertActivityDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ActivityMinuteInput)
  minutes!: ActivityMinuteInput[];
}