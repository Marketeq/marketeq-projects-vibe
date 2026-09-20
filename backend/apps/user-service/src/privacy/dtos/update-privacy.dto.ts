import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsIn,
  IsObject,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class TalentPrivacyDto {
  @ApiPropertyOptional() @IsOptional() @IsBoolean() showInSearch?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() showInBrowse?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsString() @IsIn(['public', 'registered', 'hidden']) profileVisibility?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() hideRate?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsString() @IsIn(['anyone', 'clients', 'past_clients']) whoCanMessage?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() showOnlineStatus?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() showLastActive?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() showAvailability?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() showCompletedProjects?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() showReviews?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsString() @IsIn(['city_state', 'state', 'country', 'hidden']) locationDisplay?: string;
}

export class ClientPrivacyDto {
  @ApiPropertyOptional() @IsOptional() @IsBoolean() showCompanyInSearch?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() anonymousPostings?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsString() @IsIn(['public', 'registered']) profileVisibility?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() hideActivePostings?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() showHireCount?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() showResponseTime?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsString() @IsIn(['anyone', 'hired', 'nobody']) whoCanMessage?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() showOnlineStatus?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() showLastActive?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() hideTotalSpend?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() hideAvgBudget?: boolean;
}

export class UpdatePrivacyDto {
  @ApiPropertyOptional({ description: 'Talent privacy preferences (partial merge)' })
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => TalentPrivacyDto)
  talent?: TalentPrivacyDto;

  @ApiPropertyOptional({ description: 'Client privacy preferences (partial merge)' })
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => ClientPrivacyDto)
  client?: ClientPrivacyDto;
}
