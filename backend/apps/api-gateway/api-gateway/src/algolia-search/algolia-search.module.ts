import { Module } from '@nestjs/common';
import { GatewayHttpModule } from '../http/gateway-http.module';
import { AlgoliaSearchController } from './algolia-search.controller';

@Module({
  imports: [GatewayHttpModule], // Using GatewayHttpModule to make HTTP requests to the User Service
  controllers: [AlgoliaSearchController],
})
export class AlgoliaSearchModule {}
