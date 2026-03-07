import { Controller, Get, Post, Put, Delete, Param, Body, Req, HttpCode, HttpStatus } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { uservicesService } from './service.service';
import { uservice } from './entities/service.entity';

@Controller('v1/services')
export class uservicesController {
  constructor(private readonly service: uservicesService) {}

  @Get()
  findAll() { return this.service.findAll(); }

  @Get(':id')
  findOne(@Param('id') id: string) { return this.service.findOne(id); }

  @Post()
  create(@Body() dto: Partial<uservice>, @Req() req: any) {
    return this.service.create(dto, req.user?.id || dto.createdBy);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() dto: Partial<uservice>) {
    return this.service.update(id, dto);
  }

  @Put(':id/publish')
  publish(@Param('id') id: string) { return this.service.publish(id); }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string) { return this.service.remove(id); }

  @MessagePattern('service.findById')
  handleFindById(@Payload() data: { id: string }) { return this.service.findOne(data.id); }
}
