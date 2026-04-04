import { Controller, Get } from '@nestjs/common';

@Controller('admin')
export class AdminController {
  @Get('dashboard')
  getDashboard() {
    return { message: 'Admin Dashboard v2' };
  }
}
