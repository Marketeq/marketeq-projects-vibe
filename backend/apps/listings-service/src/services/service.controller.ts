import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
  ParseUUIDPipe,
  Req,
} from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { ServicesService } from './service.service';
import { CreateServiceDto } from './dto/create-service.dto';
import { UpdateServiceDto } from './dto/update-service.dto';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { CurrentUser } from '../shared/decorators/current-user.decorator';
import { ViewerDependent, ViewerId } from '../identity-gate/viewer.decorator';

@Controller('v1/services')
export class ServicesController {
  constructor(private readonly service: ServicesService) {}

  @Get()
  findAll() {
    return this.service.findAll();
  }

  @ViewerDependent()
  @Get('slug/:slug')
  findBySlug(@Param('slug') slug: string, @ViewerId() viewerId: string | null) {
    return this.service.findBySlug(slug, viewerId);
  }

  @ViewerDependent()
  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string, @ViewerId() viewerId: string | null) {
    return this.service.findOneForViewer(id, viewerId);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  create(@Body() dto: CreateServiceDto, @CurrentUser('id') userId: string) {
    return this.service.create(dto, userId);
  }

  @Post(':id/claim')
  @UseGuards(JwtAuthGuard)
  claim(@Param('id', ParseUUIDPipe) id: string, @Req() req: any) {
    return this.service.claim(id, req.user?.sub ?? req.user?.id ?? req.user?.userId);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard)
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateServiceDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.service.update(id, dto, userId);
  }

  @Put(':id/publish')
  @UseGuards(JwtAuthGuard)
  publish(@Param('id', ParseUUIDPipe) id: string, @CurrentUser('id') userId: string) {
    return this.service.publish(id, userId);
  }

  @Put(':id/archive')
  @UseGuards(JwtAuthGuard)
  archive(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.archive(id);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.remove(id);
  }

  @MessagePattern('service.findById')
  handleFindById(@Payload() data: { id: string }) {
    return this.service.findOne(data.id);
  }
}
