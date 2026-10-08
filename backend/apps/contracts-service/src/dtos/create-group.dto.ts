import {
  IsEnum,
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

  @IsOptional() @IsString() @MaxLength(255) name?: string;
  @IsOptional() @IsString() @MaxLength(100) phase?: string;

  @IsOptional() projectId?: string;
  @IsOptional() serviceId?: string;
  @IsOptional() teamId?: string;
  @IsOptional() jobId?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateContractDto)
  contracts: CreateContractDto[];
}
