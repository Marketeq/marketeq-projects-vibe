import { IsString, IsEnum, IsOptional, IsInt, Min, Max, IsNotEmpty } from 'class-validator';
import { Type } from 'class-transformer';
import { EntryType } from '../entities/autocomplete-entry.entity';

export class QueryAutocompleteDto {
  @IsString()
  @IsNotEmpty()
  q: string;

  @IsEnum(EntryType)
  type: EntryType;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number = 10;
}
