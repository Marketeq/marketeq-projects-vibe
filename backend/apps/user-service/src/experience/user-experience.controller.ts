import {
  Body,
  Controller,
  Param,
  Post,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../decorators/current-user.decorator';
import { JwtUser } from '../auth/types/jwt-user.type';
import { CreateExperienceDto } from './dto/create-experience.dto';
import { ExperienceService } from './experience.service';

@ApiTags('Experience')
@Controller('users/:userId/experience')
export class UserExperienceController {
  constructor(private readonly experienceService: ExperienceService) {}

  @ApiOperation({ summary: 'Create experience for a specific user' })
  @Post()
  async createForUser(
    @CurrentUser() user: JwtUser,
    @Param('userId') userId: string,
    @Body() dto: CreateExperienceDto,
  ) {
    const actorUserId = user?.sub ?? user?.id;
    if (!actorUserId) {
      throw new UnauthorizedException('Invalid user');
    }
    await this.experienceService.assertCanManageExperience(actorUserId, userId);
    return this.experienceService.create(userId, dto);
  }
}
