import { IsEnum, IsInt, Min, Max, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';
import { DocumentType } from '../../nda/enums/document-type.enum';

export class ListLegalDocumentsQueryDto {
  @IsOptional()
  @IsEnum(DocumentType)
  type?: DocumentType;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}
