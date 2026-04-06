import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { HireRequestsService } from './hire-requests.service';
import { ApiOperation } from '@nestjs/swagger';
import { CurrentUser } from '../decorators/current-user.decorator';
import { JwtUser } from '../auth/types/jwt-user.type';
import { FindHireRequestsQueryDto } from './dtos/find-hire-requests-query.dto';
import { CreateHireRequestDto } from './dtos/create-hire-request.dto';
import { UpdateHireRequestDto } from './dtos/update-hire-request.dto';
import { UpdateHireStatusDto } from './dtos/update-hire-status.dto';

@Controller('hire-requests')
export class HireRequestsController {
  constructor(private readonly hireRequestsService: HireRequestsService) {}

  @ApiOperation({ summary: 'Get hire requests for the current user' })
  @Get()
  findAll(
    @CurrentUser() user: JwtUser,
    @Query() query: FindHireRequestsQueryDto,
  ) {
    return this.hireRequestsService.findAll(user.sub, query);
  }

  @ApiOperation({ summary: 'Get hire request by id for the current user' })
  @Get(':id')
  @HttpCode(HttpStatus.OK)
  async findOne(@CurrentUser() user: JwtUser, @Param('id') id: string) {
    const hireRequest = await this.hireRequestsService.findOne(id);
    if (
      hireRequest.clientUserId !== user.sub &&
      hireRequest.talentUserId !== user.sub
    ) {
      throw new ForbiddenException(
        'You are not a participant in this hire request',
      );
    }
    return hireRequest;
  }

  @ApiOperation({ summary: 'Create a hire request' })
  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@CurrentUser() user: JwtUser, @Body() dto: CreateHireRequestDto) {
    // Force clientUserId to the authenticated caller — clients must not be
    // able to spoof hire requests on behalf of other users.
    return this.hireRequestsService.create({
      ...dto,
      clientUserId: user.sub,
    });
  }

  @ApiOperation({ summary: 'Update hire request' })
  @Put(':id')
  @HttpCode(HttpStatus.OK)
  async update(
    @CurrentUser() user: JwtUser,
    @Param('id') id: string,
    @Body() dto: UpdateHireRequestDto,
  ) {
    const existing = await this.hireRequestsService.findOne(id);
    if (existing.clientUserId !== user.sub) {
      throw new ForbiddenException(
        'Only the requesting client may edit this hire request',
      );
    }
    return this.hireRequestsService.update(id, dto);
  }

  @ApiOperation({ summary: 'Update hire request status' })
  @Put(':id/status')
  @HttpCode(HttpStatus.OK)
  async updateStatus(
    @CurrentUser() user: JwtUser,
    @Param('id') id: string,
    @Body() dto: UpdateHireStatusDto,
  ) {
    const existing = await this.hireRequestsService.findOne(id);
    if (
      existing.clientUserId !== user.sub &&
      existing.talentUserId !== user.sub
    ) {
      throw new ForbiddenException(
        'You are not a participant in this hire request',
      );
    }
    return this.hireRequestsService.updateStatus(id, dto);
  }
}
