import { HttpService } from '@nestjs/axios';
import { Controller, Get, Param } from '@nestjs/common';
import { firstValueFrom } from 'rxjs';

@Controller('users')
export class GatewayController {
  constructor(private readonly httpService: HttpService) {}

  // Example endpoint: Get user details
  @Get(':id')
  async getUser(@Param('id') id: string) {
    // Assume the User Service is running on port 3001 (in Docker or via network)
    const userServiceUrl = `http://user-service:3002/users/${id}`;
    const response = await firstValueFrom(this.httpService.get(userServiceUrl));
    return response.data;
  }
}
