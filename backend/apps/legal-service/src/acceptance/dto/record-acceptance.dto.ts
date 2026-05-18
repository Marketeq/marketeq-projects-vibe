import { IsString, MaxLength } from 'class-validator';

export class RecordAcceptanceDto {
  @IsString()
  @MaxLength(20)
  documentVersion: string;
}
