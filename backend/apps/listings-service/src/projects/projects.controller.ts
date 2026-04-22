import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  Req,
  HttpCode,
  HttpStatus,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { ProjectsService } from './projects.service';
import { Project } from './entities/project.entity';
import { JwtAuthGuard } from '../shared/guards/jwt-auth.guard';

@Controller('v1/projects')
export class ProjectsController {
  constructor(private readonly service: ProjectsService) {}

  @Get()
  findAll() {
    return this.service.findAll();
  }

  @Get('slug/:slug')
  findBySlug(@Param('slug') slug: string) {
    return this.service.findBySlug(slug);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.findOnePublished(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  create(@Body() dto: Partial<Project>, @Req() req: any) {
    return this.service.create(dto, req.user?.sub ?? req.user?.id ?? req.user?.userId);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard)
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: Partial<Project>, @Req() req: any) {
    return this.service.update(id, dto, req.user?.sub ?? req.user?.id ?? req.user?.userId);
  }

  @Put(':id/publish')
  @UseGuards(JwtAuthGuard)
  publish(@Param('id', ParseUUIDPipe) id: string, @Req() req: any) {
    return this.service.publish(id, req.user?.sub ?? req.user?.id ?? req.user?.userId);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id', ParseUUIDPipe) id: string, @Req() req: any) {
    return this.service.remove(id, req.user?.sub ?? req.user?.id ?? req.user?.userId);
  }

  @MessagePattern('project.findById')
  handleFindById(@Payload() data: { id: string }) {
    return this.service.findOne(data.id);
  }
}
