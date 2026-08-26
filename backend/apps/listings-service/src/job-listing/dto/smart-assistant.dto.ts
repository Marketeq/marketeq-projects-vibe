import {
  IsIn,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  ValidateIf,
} from 'class-validator';

export class SmartAssistantDto {
  @IsIn(['scope', 'field'])
  @IsOptional()
  mode?: 'scope' | 'field';

  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  command: string;

  @ValidateIf((dto) => (dto.mode ?? (dto.field === 'scope' ? 'scope' : 'field')) === 'scope' && dto.currentScope !== undefined)
  @IsObject()
  currentScope?: Record<string, unknown>;

  @ValidateIf((dto) => (dto.mode ?? (dto.field === 'scope' ? 'scope' : 'field')) === 'scope' && dto.workType !== undefined)
  @IsIn(['project', 'service'])
  workType?: 'project' | 'service';

  @ValidateIf((dto) => (dto.mode ?? (dto.field === 'scope' ? 'scope' : 'field')) === 'field')
  @IsString()
  @IsIn(['title', 'overview', 'benefits', 'responsibilities'])
  field?: string;

  @ValidateIf((dto) => (dto.mode ?? (dto.field === 'scope' ? 'scope' : 'field')) === 'field')
  @IsString()
  @MaxLength(10000)
  currentValue?: string;

  @ValidateIf((dto) => (dto.mode ?? (dto.field === 'scope' ? 'scope' : 'field')) === 'field' && dto.roleTitle !== undefined)
  @IsString()
  @MaxLength(100)
  roleTitle?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  context?: string;
}

export class ShortenSelectedTextDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(10000)
  selectedText: string;

  @IsString()
  @MaxLength(10000)
  fieldContext: string;
}
