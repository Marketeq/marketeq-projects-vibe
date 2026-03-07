import { Controller, Get } from '@nestjs/common';
import { UautocompleteUserviceService } from './autocomplete-service.service';

@Controller()
export class UautocompleteUserviceController {
  constructor(private readonly service: UautocompleteUserviceService) {}

  @Get('health')
  health() {
    return { status: 'ok', service: 'autocomplete-service' };
  }
}
