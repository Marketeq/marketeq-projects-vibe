import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { AffiliatedTeamService } from './affiliated-teams.service';
import { ApiOkResponse, ApiOperation } from '@nestjs/swagger';
import { CurrentUser } from '../decorators/current-user.decorator';
import { JwtUser } from '../auth/types/jwt-user.type';
import { CreateAffiliatedTeamDto } from './dto/create-affiliated-teams.dto';
import { UpdateAffiliatedTeamDto } from './dto/update-affiliated-teams.dto';
import { GetAffiliatedTeamsDto } from './dto/get-affiliated-teams.dto';

@Controller('affiliated-teams')
export class AffiliatedTeamController {
  constructor(private readonly affiliatedTeamService: AffiliatedTeamService) {}

  @ApiOperation({ summary: 'Create an affiliated team for the current user' })
  @ApiOkResponse({ type: GetAffiliatedTeamsDto })
  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@CurrentUser() user: JwtUser, @Body() dto: CreateAffiliatedTeamDto) {
    return this.affiliatedTeamService.create(user.sub, dto);
  }

  @ApiOperation({ summary: 'Find all affiliated teams for the current user' })
  @ApiOkResponse({ type: [GetAffiliatedTeamsDto] })
  @Get()
  @HttpCode(HttpStatus.OK)
  findAll(@CurrentUser() user: JwtUser) {
    return this.affiliatedTeamService.findAll(user.sub);
  }

  @ApiOperation({ summary: 'Find one affiliated team for the current user' })
  @ApiOkResponse({ type: GetAffiliatedTeamsDto })
  @Get(':id')
  @HttpCode(HttpStatus.OK)
  findOne(@CurrentUser() user: JwtUser, @Param('id') id: string) {
    return this.affiliatedTeamService.findOne(user.sub, id);
  }

  @ApiOperation({ summary: 'Update an affiliated team for the current user' })
  @ApiOkResponse({ type: GetAffiliatedTeamsDto })
  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  update(
    @CurrentUser() user: JwtUser,
    @Body() dto: UpdateAffiliatedTeamDto,
    @Param('id') id: string,
  ) {
    return this.affiliatedTeamService.update(user.sub, id, dto);
  }

  @ApiOperation({ summary: 'Remove an affiliated team for the current user' })
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  remove(@CurrentUser() user: JwtUser, @Param('id') id: string) {
    return this.affiliatedTeamService.remove(user.sub, id);
  }
}
