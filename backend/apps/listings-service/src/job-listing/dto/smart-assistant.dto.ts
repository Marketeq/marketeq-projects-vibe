import {
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  Min,
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

  // Accepted for wire-contract compatibility but ignored by the scope-edit
  // path — the controller always rebuilds currentScope server-side from the
  // listing's persisted phases so its index-addressed operations resolve
  // against the exact same ordering the LLM was shown.
  @ValidateIf((dto) => (dto.mode ?? (dto.field === 'scope' ? 'scope' : 'field')) === 'scope' && dto.currentScope !== undefined)
  @IsObject()
  currentScope?: Record<string, unknown>;

  @ValidateIf((dto) => (dto.mode ?? (dto.field === 'scope' ? 'scope' : 'field')) === 'scope' && dto.workType !== undefined)
  @IsIn(['project', 'service'])
  workType?: 'project' | 'service';

  // The UI already computes the scope's current total budget (it calls the
  // same pricing-service rate lookups to render the budget figure on
  // screen), so the client passes it here instead of the server repeating
  // those lookups itself just to give the Smart Assistant a reduction
  // target. Advisory context for the AI's prompt only — never persisted,
  // never trusted for anything financial.
  @ValidateIf((dto) => (dto.mode ?? (dto.field === 'scope' ? 'scope' : 'field')) === 'scope' && dto.currentTotalBudgetUsdCents !== undefined)
  @IsNumber()
  @Min(0)
  currentTotalBudgetUsdCents?: number;

  // Same rationale as currentTotalBudgetUsdCents, for "shorten the
  // timeline" commands — the UI already computes this to render the
  // on-screen timeline figure.
  @ValidateIf((dto) => (dto.mode ?? (dto.field === 'scope' ? 'scope' : 'field')) === 'scope' && dto.currentTotalTimelineDays !== undefined)
  @IsNumber()
  @Min(0)
  currentTotalTimelineDays?: number;

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

  // Accepted for wire-contract compatibility but ignored — see
  // SmartAssistantDto's field of the same name for the rationale.
  @IsOptional()
  @IsObject()
  currentScope?: Record<string, unknown>;

  @IsOptional()
  @IsIn(['project', 'service'])
  workType?: 'project' | 'service';

  // See SmartAssistantDto's field of the same name for the rationale — the
  // UI already has this figure, so it's passed rather than recomputed.
  @IsOptional()
  @IsNumber()
  @Min(0)
  currentTotalBudgetUsdCents?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  currentTotalTimelineDays?: number;

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
