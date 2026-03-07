import { Controller, Get } from '@nestjs/common';
import { UfavoritesUserviceService } from './favorites-service.service';

@Controller()
export class UfavoritesUserviceController {
  constructor(private readonly service: UfavoritesUserviceService) {}

  @Get('health')
  health() {
    return { status: 'ok', service: 'favorites-service' };
  }
}
