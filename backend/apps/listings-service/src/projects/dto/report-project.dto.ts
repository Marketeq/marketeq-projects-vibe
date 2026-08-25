import { Type } from 'class-transformer';
import {
  IsArray,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';

class ReportAttachmentDto {
  @IsString()
  name: string;

  @IsNumber()
  size: number;

  @IsString()
  @IsOptional()
  type?: string;
}

export class ReportProjectDto {
  @IsString()
  reason: string;

  @IsString()
  @IsOptional()
  @MaxLength(5000)
  description?: string;

  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => ReportAttachmentDto)
  attachments?: ReportAttachmentDto[];
}
