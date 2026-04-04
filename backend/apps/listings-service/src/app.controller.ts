import { Controller, Get, Post, Body } from '@nestjs/common';
import { ProjectService } from './listings/project.service';

@Controller()
export class AppController {
  constructor(
    private readonly projectService: ProjectService, 
  ) {}

  @Get('health')
  health() {
    return { ok: true };
  }

  // Create a project
  @Post('projects')
  async createProject(@Body() body: { title: string; userId: string; status?: string }) {
    return this.projectService.create(body);
  }
}
