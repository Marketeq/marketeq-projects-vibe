import { IsEnum, IsNotEmpty, IsOptional, IsArray, IsString, IsNumber, ValidateNested, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { GroupType } from '../entities/enums';

export class ContractInput {
  @IsString()
  @IsNotEmpty()
  talentId: string;

  @IsString()
  @IsNotEmpty()
  title: string;

  @IsNumber()
  @Min(0)
  rate: number;

  @IsString()
  @IsNotEmpty()
  schedule: string;

  @IsString()
  @IsNotEmpty()
  duration: string;
}

export class CreateGroupDto {
  @IsEnum(GroupType)
  type: GroupType;

  @IsString()
  @IsNotEmpty()
  ownerClientId: string;

  @IsString()
  @IsOptional()
  projectId?: string;

  @IsString()
  @IsOptional()
  serviceId?: string;

  @IsString()
  @IsOptional()
  teamId?: string;

  @IsString()
  @IsOptional()
  jobId?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ContractInput)
  contracts: ContractInput[];
}
