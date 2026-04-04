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
import { CertificationsService } from './certifications.service';
import { CreateCertificationDto } from './dto/create-certification.dto';
import { UpdateCertificationDto } from './dto/update-certification.dto';
import { ApiOperation, ApiProperty } from '@nestjs/swagger';

@Controller('certifications')
export class CertificationsController {
  constructor(private readonly certificationsService: CertificationsService) {}

  @ApiOperation({ summary: 'Create a certification for the current user' })
  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@CurrentUser() user: JwtUser, @Body() dto: CreateCertificationDto) {
    return this.certificationsService.create(user.sub, dto);
  }

  @ApiOperation({ summary: 'Find all certification for the current user' })
  @Get()
  @HttpCode(HttpStatus.OK)
  findAll(@Req() req: Request) {
    const user = req.user as JwtUser;
    return this.certificationsService.findAll(user.sub);
  }

  @ApiOperation({ summary: 'Update a certification for the current user' })
  @Put(':id')
  @HttpCode(HttpStatus.OK)
  update(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() dto: UpdateCertificationDto,
  ) {
    const user = req.user as JwtUser;
    return this.certificationsService.update(user.sub, id, dto);
  }

  @ApiOperation({ summary: 'Delete a certification for the current user' })
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Req() req: Request, @Param('id') id: string) {
    const user = req.user as JwtUser;
    return this.certificationsService.remove(user.sub, id);
  }
}
