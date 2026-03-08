import { IsString, IsEnum, IsOptional, MaxLength, MinLength } from 'class-validator';
import { EntryType } from '../entities/autocomplete-entry.entity';

export class SubmitAutocompleteDto {
  @IsString()
  @MinLength(3)
  @MaxLength(100)
  value: string;

  @IsEnum(EntryType)
  type: EntryType;

  @IsString()
  @IsOptional()
  source?: string;
}
