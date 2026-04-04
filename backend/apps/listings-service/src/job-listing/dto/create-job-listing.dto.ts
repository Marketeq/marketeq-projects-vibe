import { IsEnum, IsOptional, IsUUID } from 'class-validator';
import { ContractType } from '../enums/contract-type.enum';
import { HiringType } from '../enums/hiring-type.enum';
import { ScopeKnowledge } from '../enums/scope-knowledge.enum';
import { WorkType } from '../enums/work-type.enum';

// Called on Step 1 Continue to initialise the draft record.
// Minimal fields required. All other fields are updated via PATCH.
export class CreateJobListingDto {
  @IsEnum(ContractType)
  contractType: ContractType;

  @IsEnum(ScopeKnowledge)
  @IsOptional()
  scopeKnowledge?: ScopeKnowledge;

  @IsEnum(WorkType)
  @IsOptional()
  workType?: WorkType;

  @IsEnum(HiringType)
  @IsOptional()
  hiringType?: HiringType;

  // Required when contractType is EXISTING.
  @IsUUID()
  @IsOptional()
  contractId?: string;
}
