import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Res,
} from '@nestjs/common';
import type { Response } from 'express';
import { Throttle } from '@nestjs/throttler';
import { CreateGroupDto } from '../dtos/create-group.dto';
import { UpdateGroupDto } from '../dtos/update-group.dto';
import { User, AuthUser } from '../decorators/user.decorator';
import { GroupsService } from '../services/groups.service';
import { GroupResponseDto } from '../dtos/group-response.dto';

@Controller('groups')
export class GroupsController {
  constructor(private readonly groupsService: GroupsService) {}

  @Get()
  findAll(
    @User() user: AuthUser,
    @Query('order') order?: 'ASC' | 'DESC',
    @Query('search') search?: string,
  ): Promise<GroupResponseDto[]> {
    const userId = user.sub || user.id;
    return this.groupsService.findAllByUser(
      userId as string,
      order ?? 'ASC',
      search,
    );
  }

  @Get(':id')
  findOne(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @User() user: AuthUser,
  ): Promise<GroupResponseDto> {
    const userId = user.sub || user.id;
    return this.groupsService.findOne(id, userId as string);
  }

  @Post()
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  create(
    @Body() dto: CreateGroupDto,
    @User() user: AuthUser,
  ): Promise<GroupResponseDto> {
    const userId = user.sub || user.id;
    return this.groupsService.create(userId as string, dto);
  }

  @Patch(':id')
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  update(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() dto: UpdateGroupDto,
    @User() user: AuthUser,
  ): Promise<GroupResponseDto> {
    const userId = user.sub || user.id;
    return this.groupsService.update(id, userId as string, dto);
  }

  @Delete(':id')
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  async remove(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @User() user: AuthUser,
    @Res({ passthrough: true }) res: Response,
  ): Promise<void> {
    const userId = user.sub || user.id;
    await this.groupsService.remove(id, userId as string);
    res.status(204);
  }
}
