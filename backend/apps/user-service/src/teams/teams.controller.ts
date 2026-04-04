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

@ApiTags('teams')
@Controller('teams')
export class TeamsController {
  constructor(private readonly teamsService: TeamsService) {}

  @ApiOperation({ summary: 'Add a member to a team' })
  @Post(':teamId/members')
  @HttpCode(HttpStatus.CREATED)
  async addMember(
    @Param('teamId') teamId: string,
    @Body() dto: AddTeamMemberDto,
  ) {
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
  async getTeamMembers(@Param('teamId') teamId: string) {
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
    @Param('teamId') teamId: string,
    @Param('userId') userId: string,
  ) {
    const result = await this.teamsService.removeMember(teamId, userId);
    return {
      success: true,
      message: result.message,
    };
  }
}
