import { HttpService } from '@nestjs/axios';
import { Controller, Get } from '@nestjs/common';
import { servicesConfig } from '../services-config';

@Controller('admin')
export class AdminController {
  constructor(private readonly httpService: HttpService) {}

  @Get('/dashboard')
  async getAdminDashboard() {
    // const response = await this.httpService.get('http://admin-service:3002/admin/dashboard').toPromise();
    const response = await this.httpService
      .get(`${servicesConfig.ADMIN_SERVICE_URL}/admin/dashboard`)
      .toPromise();
    return response.data;
  }
}
