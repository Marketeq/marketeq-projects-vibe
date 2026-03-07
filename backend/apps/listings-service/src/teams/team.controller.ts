import { Controller, Get, Post, Put, Delete, Param, Body, Req, HttpCode, HttpStatus } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { uteamsService } from './team.service';
import { uteam } from './entities/team.entity';

@Controller('v1/teams')
export class uteamsController {
  constructor(private readonly service: uteamsService) {}

  @Get()
  findAll() { return this.service.findAll(); }

  @Get(':id')
  findOne(@Param('id') id: string) { return this.service.findOne(id); }

  @Post()
  create(@Body() dto: Partial<uteam>, @Req() req: any) {
    return this.service.create(dto, req.user?.id || dto.createdBy);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() dto: Partial<uteam>) {
    return this.service.update(id, dto);
  }

  @Put(':id/publish')
  publish(@Param('id') id: string) { return this.service.publish(id); }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string) { return this.service.remove(id); }

  @MessagePattern('team.findById')
  handleFindById(@Payload() data: { id: string }) { return this.service.findOne(data.id); }
}
