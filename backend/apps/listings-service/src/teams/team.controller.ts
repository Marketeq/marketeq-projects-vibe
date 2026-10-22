import { Controller, Get, Post, Put, Delete, Param, Body, Req, HttpCode, HttpStatus, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { TeamsService } from './team.service';
import { Team } from './entities/team.entity';
import { ViewerDependent, ViewerId } from '../identity-gate/viewer.decorator';

@Controller('v1/teams')
export class TeamsController {
  constructor(private readonly service: TeamsService) {}

  @Get()
  findAll() { return this.service.findAll(); }

  @ViewerDependent()
  @Get(':id')
  findOne(@Param('id') id: string, @ViewerId() viewerId: string | null) { return this.service.findOneForViewer(id, viewerId); }

  @Post()
  @UseGuards(JwtAuthGuard)
  create(@Body() dto: Partial<Team>, @Req() req: any) {
    return this.service.create(dto, req.user?.id || dto.createdBy);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard)
  update(@Param('id') id: string, @Body() dto: Partial<Team>) {
    return this.service.update(id, dto);
  }

  @Put(':id/publish')
  @UseGuards(JwtAuthGuard)
  publish(@Param('id') id: string) { return this.service.publish(id); }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string) { return this.service.remove(id); }

  @MessagePattern('team.findById')
  handleFindById(@Payload() data: { id: string }) { return this.service.findOne(data.id); }
}
