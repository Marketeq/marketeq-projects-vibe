import { Controller, Get } from '@nestjs/common';
import { UsuggestionsUserviceService } from './suggestions-service.service';

@Controller()
export class UsuggestionsUserviceController {
  constructor(private readonly service: UsuggestionsUserviceService) {}

  @Get('health')
  health() {
    return { status: 'ok', service: 'suggestions-service' };
  }
}
