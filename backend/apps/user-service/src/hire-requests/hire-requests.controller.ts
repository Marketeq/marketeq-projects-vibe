import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { HireRequestsService } from './hire-requests.service';
import {
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
} from '@nestjs/swagger';
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
  findOne(@Param('id') id: string) {
    return this.hireRequestsService.findOne(id);
  }

  @ApiOperation({ summary: 'Create a hire request' })
  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() dto: CreateHireRequestDto) {
    return this.hireRequestsService.create(dto);
  }

  @ApiOperation({ summary: 'Update hire request' })
  @Put(':id')
  @HttpCode(HttpStatus.OK)
  update(@Param('id') id: string, @Body() dto: UpdateHireRequestDto) {
    return this.hireRequestsService.update(id, dto);
  }

  @ApiOperation({ summary: 'Update hire request status' })
  @Put(':id/status')
  @HttpCode(HttpStatus.OK)
  updateStatus(@Param('id') id: string, @Body() dto: UpdateHireStatusDto) {
    return this.hireRequestsService.updateStatus(id, dto);
  }
}
