import { Module } from '@nestjs/common';
import { HttpModule, HttpModuleOptions } from '@nestjs/axios';
import { HttpForwarderService } from './http-forwarder.service';

@Module({
  imports: [HttpModule],
  providers: [HttpForwarderService],
  exports: [HttpModule],
})
export class GatewayHttpModule {
  static register(options: HttpModuleOptions) {
    return {
      module: GatewayHttpModule,
      imports: [HttpModule.register(options)],
      providers: [HttpForwarderService],
      exports: [HttpModule],
    };
  }
}
