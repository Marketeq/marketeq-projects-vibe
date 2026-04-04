import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  HttpCode,
  HttpStatus,
  Req,
} from '@nestjs/common';
import { ExperienceService } from './experience.service';
import { CreateExperienceDto } from './dto/create-experience.dto';
import { UpdateExperienceDto } from './dto/update-experience.dto';
import { Request } from 'express';
import { CurrentUser } from '../decorators/current-user.decorator';
import { JwtUser } from '../auth/types/jwt-user.type';
import { ApiOperation } from '@nestjs/swagger';

@Controller('experiences')
export class ExperienceController {
  constructor(private readonly experienceService: ExperienceService) {}

  @ApiOperation({ summary: 'Create an experience for the current user' })
  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@CurrentUser() user: JwtUser, @Body() dto: CreateExperienceDto) {
    return this.experienceService.create(user.sub, dto);
  }

  @ApiOperation({ summary: 'Find all experiences for the current user' })
  @Get()
  @HttpCode(HttpStatus.OK)
  findAll(@Req() req: Request) {
    const user = req.user as JwtUser;
    return this.experienceService.findAll(user.sub);
  }

  @ApiOperation({ summary: 'Find experience by ID for the current user' })
  @Get(':id')
  @HttpCode(HttpStatus.OK)
  findOne(@Req() req: Request, @Param('id') id: string) {
    const user = req.user as JwtUser;
    return this.experienceService.findOne(user.sub, id);
  }

  @ApiOperation({ summary: 'Update experience by ID for the current user' })
  @Put(':id')
  @HttpCode(HttpStatus.OK)
  update(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() dto: UpdateExperienceDto,
  ) {
    const user = req.user as JwtUser;
    return this.experienceService.update(user.sub, id, dto);
  }

  @ApiOperation({ summary: 'Delete experience by ID for the current user' })
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Req() req: Request, @Param('id') id: string) {
    const user = req.user as JwtUser;
    return this.experienceService.remove(user.sub, id);
  }
}
