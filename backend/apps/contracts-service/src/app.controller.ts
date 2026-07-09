import { Controller, Get } from '@nestjs/common';
import { Public } from './decorators/public.decorator';

@Controller()
export class AppController {
  @Public()
  @Get()
  getRoot() {
    return {
      service: 'contracts-service',
      version: '1.0.0',
      status: 'running',
      endpoints: {
        health: '/health',
        contracts: '/contracts',
        groups: '/contract-groups',
        webhooks: '/webhooks'
      }
    };
  }
}
