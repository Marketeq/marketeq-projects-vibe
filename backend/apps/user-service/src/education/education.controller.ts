import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Req,
} from '@nestjs/common';
import { EducationService } from './education.service';
import { CreateEducationDto } from './dto/create-education.dto';
import { UpdateEducationDto } from './dto/update-education.dto';
import { Request } from 'express';
import { JwtUser } from '../auth/types/jwt-user.type';
import { CurrentUser } from '../decorators/current-user.decorator';
import { ApiOperation } from '@nestjs/swagger';
@Controller('education')
export class EducationController {
  constructor(private readonly educationService: EducationService) {}

  @ApiOperation({ summary: 'Create education for the current user' })
  @Post()
  create(@CurrentUser() user: JwtUser, @Body() dto: CreateEducationDto) {
    return this.educationService.create(user.sub, dto);
  }

  @ApiOperation({ summary: 'Find all education for the current user' })
  @Get()
  findAll(@Req() req: Request) {
    const user = req.user as JwtUser;
    return this.educationService.findAll(user.sub);
  }

  @ApiOperation({ summary: 'Update education for the current user' })
  @Put(':id')
  update(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() dto: UpdateEducationDto,
  ) {
    const user = req.user as JwtUser;
    return this.educationService.update(user.sub, id, dto);
  }

  @ApiOperation({ summary: 'Delete education for the current user' })
  @Delete(':id')
  remove(@Req() req: Request, @Param('id') id: string) {
    const user = req.user as JwtUser;
    return this.educationService.remove(user.sub, id);
  }
}
