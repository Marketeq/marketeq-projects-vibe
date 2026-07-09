import {
  Controller,
  Post,
  Get,
  Put,
  Delete,
  Param,
  Body,
  HttpCode,
  HttpStatus,
  Query,
  UnauthorizedException,
} from '@nestjs/common';
import { SkillsService } from './skills.service';
import { CreateSkillDto } from './dto/create-skill.dto';
import { UpdateSkillDto } from './dto/update-skill.dto';
import { CurrentUser } from '../decorators/current-user.decorator';
import { ApiOperation } from '@nestjs/swagger';
import { SearchSkillsDto } from './dto/search-skills.dto';
import { JwtUser } from '../auth/types/jwt-user.type';

@Controller('skills')
export class SkillsController {
  constructor(private readonly skillsService: SkillsService) {}

  @ApiOperation({ summary: 'Create skills for the current user' })
  @Post()
  create(@CurrentUser() user: JwtUser, @Body() dto: CreateSkillDto) {
    const userId = user?.sub ?? user?.id;
    if (!userId) {
      throw new UnauthorizedException('Invalid user');
    }
    return this.skillsService.create(userId, dto);
  }

  @ApiOperation({ summary: 'Get skills for the current user' })
  @Get()
  findMySkills(
    @CurrentUser() user: JwtUser,
    @Query() query: SearchSkillsDto,
  ) {
    if (query.search !== undefined) {
      return this.skillsService.searchNames(query.search, query.limit ?? 10);
    }

    const userId = user?.sub ?? user?.id;
    if (!userId) {
      throw new UnauthorizedException('Invalid user');
    }

    return this.skillsService.findByUser(userId);
  }

  @ApiOperation({ summary: 'Update skills for the current user' })
  @Put(':id')
  update(
    @CurrentUser() user: JwtUser,
    @Param('id') id: string,
    @Body() dto: UpdateSkillDto,
  ) {
    const userId = user?.sub ?? user?.id;
    if (!userId) {
      throw new UnauthorizedException('Invalid user');
    }
    return this.skillsService.update(userId, id, dto);
  }

  @ApiOperation({ summary: 'Delete skills for the current user' })
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@CurrentUser() user: JwtUser, @Param('id') id: string) {
    const userId = user?.sub ?? user?.id;
    if (!userId) {
      throw new UnauthorizedException('Invalid user');
    }
    return this.skillsService.remove(userId, id);
  }
}
