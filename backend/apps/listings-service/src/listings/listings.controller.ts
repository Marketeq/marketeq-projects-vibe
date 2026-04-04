import { Controller, Get, Post, Body } from '@nestjs/common';
import { ProjectService } from './project.service';

@Controller('listings')
export class ListingsController {
  constructor(private readonly projects: ProjectService) {}

  // health/dashboard
  @Get('/dashboard')
  getProfile() {
    return { name: 'Ali', email: 'ali@example.com' };
  }

  // List projects
  @Get()
  async findAll() {
    return this.projects.findAll();
  }

  // Create a project
  @Post()
  async create(
    @Body() body: { title: string; userId: string; status?: string }
  ) {
    return this.projects.create(body);
  }
}