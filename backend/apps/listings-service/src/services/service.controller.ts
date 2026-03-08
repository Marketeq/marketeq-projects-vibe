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
} from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { ServicesService } from './service.service';
import { CreateServiceDto } from './dto/create-service.dto';
import { UpdateServiceDto } from './dto/update-service.dto';
import { JwtAuthGuard } from '../shared/guards/jwt-auth.guard';
import { CurrentUser } from '../shared/decorators/current-user.decorator';

@Controller('v1/services')
export class ServicesController {
  constructor(private readonly service: ServicesService) {}

  @Get()
  findAll() {
    return this.service.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.findOne(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  create(@Body() dto: CreateServiceDto, @CurrentUser('id') userId: string) {
    return this.service.create(dto, userId);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard)
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateServiceDto) {
    return this.service.update(id, dto);
  }

  @Put(':id/publish')
  @UseGuards(JwtAuthGuard)
  publish(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.publish(id);
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
