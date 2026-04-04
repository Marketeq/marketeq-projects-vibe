import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Put,
  Req,
} from '@nestjs/common';
import { Request } from 'express';
import { CurrentUser } from '../decorators/current-user.decorator';
import { JwtUser } from '../auth/types/jwt-user.type';
import { IndustriesService } from './industries.service';
import { CreateIndustryDto } from './dto/create-industry.dto';
import { UpdateIndustryDto } from './dto/update-industry.dto';
import { ApiOperation } from '@nestjs/swagger';

@Controller('industries')
export class IndustriesController {
  constructor(private readonly industriesService: IndustriesService) {}

  @ApiOperation({ summary: 'Add industries for the current user' })
  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@CurrentUser() user: JwtUser, @Body() dto: CreateIndustryDto) {
    return this.industriesService.create(user.sub, dto);
  }

  @ApiOperation({ summary: 'Find all industries for the current user' })
  @Get()
  @HttpCode(HttpStatus.OK)
  findAll(@Req() req: Request) {
    const user = req.user as JwtUser;
    return this.industriesService.findAll(user.sub);
  }

  @ApiOperation({ summary: 'Update an industry for the current user' })
  @Put(':industryId')
  @HttpCode(HttpStatus.OK)
  update(
    @Req() req: Request,
    @Param('industryId') industryId: string,
    @Body() dto: UpdateIndustryDto,
  ) {
    const user = req.user as JwtUser;
    return this.industriesService.update(user.sub, industryId, dto);
  }

  @ApiOperation({ summary: 'Delete an industry for the current user' })
  @Delete(':industryId')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Req() req: Request, @Param('industryId') industryId: string) {
    const user = req.user as JwtUser;
    return this.industriesService.remove(user.sub, industryId);
  }
}
