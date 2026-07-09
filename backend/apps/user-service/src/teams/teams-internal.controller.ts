import {
  Body,
  Controller,
  ForbiddenException,
  Headers,
  HttpCode,
  HttpStatus,
  Param,
  Post,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../decorators/public.decorator';
import { TeamsService } from './teams.service';
import { AddTeamMemberDto } from './dto/add-team-member.dto';

@ApiTags('teams-internal')
@Public()
@Controller('internal/teams')
export class TeamsInternalController {
  constructor(
    private readonly teamsService: TeamsService,
    private readonly configService: ConfigService,
  ) {}

  @ApiOperation({ summary: 'Add a member to a team (internal services)' })
  @Post(':teamId/members')
  @HttpCode(HttpStatus.CREATED)
  async addMember(
    @Headers('x-internal-token') token: string | undefined,
    @Param('teamId') teamId: string,
    @Body() dto: AddTeamMemberDto,
  ) {
    const expected = this.configService.get<string>('INTERNAL_SERVICE_TOKEN');
    if (!expected || token !== expected) {
      throw new ForbiddenException('Invalid internal token');
    }

    const member = await this.teamsService.addMember(teamId, dto);
    return {
      success: true,
      data: member,
      message: 'Team member added successfully',
    };
  }
}
