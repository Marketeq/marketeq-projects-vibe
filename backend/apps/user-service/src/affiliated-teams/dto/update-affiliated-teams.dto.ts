import { PartialType } from '@nestjs/swagger';
import { CreateAffiliatedTeamDto } from './create-affiliated-teams.dto';

export class UpdateAffiliatedTeamDto extends PartialType(
  CreateAffiliatedTeamDto,
) {}
