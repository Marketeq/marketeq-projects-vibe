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

// Body shape for the dedicated POST :id/smart-assistant/scope route. The
// route path itself fixes the mode — the controller injects mode: 'scope'
// after validation — so, unlike SmartAssistantDto, this never needs to guess
// mode from the body and never validates the field-mode-only properties.
export class SmartAssistantScopeDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  command: string;

  @IsOptional()
  @IsObject()
  currentScope?: Record<string, unknown>;

  @IsOptional()
  @IsIn(['project', 'service'])
  workType?: 'project' | 'service';

  @IsOptional()
  @IsString()
  @MaxLength(100)
  context?: string;
}

// Body shape for the dedicated POST :id/smart-assistant/field route. Same
// rationale as SmartAssistantScopeDto above, for the field-mode-only fields.
export class SmartAssistantFieldDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  command: string;

  @IsString()
  @IsIn(['title', 'overview', 'benefits', 'responsibilities'])
  field: string;

  @IsString()
  @MaxLength(10000)
  currentValue: string;

  @IsOptional()
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
