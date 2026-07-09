import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Param,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { TeamsService } from './teams.service';
import { AddTeamMemberDto } from './dto/add-team-member.dto';
import { CurrentUser } from '../decorators/current-user.decorator';
import { JwtUser } from '../auth/types/jwt-user.type';

@ApiTags('teams')
@Controller('teams')
export class TeamsController {
  constructor(private readonly teamsService: TeamsService) {}

  @ApiOperation({ summary: 'Add a member to a team' })
  @Post(':teamId/members')
  @HttpCode(HttpStatus.CREATED)
  async addMember(
    @CurrentUser() user: JwtUser,
    @Param('teamId') teamId: string,
    @Body() dto: AddTeamMemberDto,
  ) {
    // Caller must already be a member of this team before inviting others.
    await this.teamsService.assertIsMember(teamId, user.sub);
    const member = await this.teamsService.addMember(teamId, dto);
    return {
      success: true,
      data: member,
      message: 'Team member added successfully',
    };
  }

  @ApiOperation({ summary: 'Get all members of a team' })
  @Get(':teamId/members')
  @HttpCode(HttpStatus.OK)
  async getTeamMembers(
    @CurrentUser() user: JwtUser,
    @Param('teamId') teamId: string,
  ) {
    await this.teamsService.assertIsMember(teamId, user.sub);
    const members = await this.teamsService.getTeamMembers(teamId);
    return {
      success: true,
      data: members,
      message: 'Team members retrieved successfully',
    };
  }

  @ApiOperation({ summary: 'Remove a member from a team' })
  @Delete(':teamId/members/:userId')
  @HttpCode(HttpStatus.OK)
  async removeMember(
    @CurrentUser() user: JwtUser,
    @Param('teamId') teamId: string,
    @Param('userId') userId: string,
  ) {
    // Allow self-removal without a prior membership check; otherwise caller
    // must already belong to the team.
    if (user.sub !== userId) {
      await this.teamsService.assertIsMember(teamId, user.sub);
    }
    const result = await this.teamsService.removeMember(teamId, userId);
    return {
      success: true,
      message: result.message,
    };
  }
}
