import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsObject, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { SimilarProfilesDto } from './similar-profiles.dto';


export class GetSimilarProfilesResponseDto {
  @ApiProperty({ type: [SimilarProfilesDto] })
  @ValidateNested({ each: true })
  @Type(() => SimilarProfilesDto)
  similarProfiles: SimilarProfilesDto[];
}