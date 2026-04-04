import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsArray,
  ValidateNested,
  IsString,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import { GroupType } from '../entities/enums';
import { CreateContractDto } from './create-contract.dto';
export class CreateGroupDto {
  @IsEnum(GroupType) type: GroupType;
  @IsNotEmpty() ownerClientId: string;

  @IsOptional() projectId?: string;
  @IsOptional() serviceId?: string;
  @IsOptional() teamId?: string;
  @IsOptional() jobId?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateContractDto)
  contracts: CreateContractDto[];
}
