import { Controller, Get } from '@nestjs/common';
import { UinvitationsUserviceService } from './invitations-service.service';

@Controller()
export class UinvitationsUserviceController {
  constructor(private readonly service: UinvitationsUserviceService) {}

  @Get('health')
  health() {
    return { status: 'ok', service: 'invitations-service' };
  }
}
