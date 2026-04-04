import { IsString, MinLength } from 'class-validator';

export class DeleteScreenshotDto {
  @IsString()
  @MinLength(3)
  reason: string; // stored later; for now we just require it
}
