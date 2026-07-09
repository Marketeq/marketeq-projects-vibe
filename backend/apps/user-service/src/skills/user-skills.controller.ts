import {
  Body,
  Controller,
  Param,
  Post,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../decorators/current-user.decorator';
import { SkillsService } from './skills.service';
import { CreateSkillDto } from './dto/create-skill.dto';
import { JwtUser } from '../auth/types/jwt-user.type';

@ApiTags('Skills')
@Controller('users/:userId/skills')
export class UserSkillsController {
  constructor(private readonly skillsService: SkillsService) {}

  @ApiOperation({ summary: 'Create a skill for a specific user' })
  @Post()
  async createForUser(
    @CurrentUser() user: JwtUser,
    @Param('userId') userId: string,
    @Body() dto: CreateSkillDto,
  ) {
    const actorUserId = user?.sub ?? user?.id;
    if (!actorUserId) {
      throw new UnauthorizedException('Invalid user');
    }
    await this.skillsService.assertCanManageSkills(actorUserId, userId);
    return this.skillsService.create(userId, dto);
  }
}
