import { Module } from '@nestjs/common'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { HttpModule } from '@nestjs/axios'
import { ClientsModule, Transport } from '@nestjs/microservices'
import { AlgoliaClient } from './search/algolia.client'
import { SearchService } from './search/search.service'
import { SearchController } from './search/search.controller'
import { DbFallbackService } from './search/db-fallback.service'
import { IdentityGateModule } from './identity-gate/identity-gate.module'

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    HttpModule,
    IdentityGateModule,
    ClientsModule.registerAsync([
      {
        // Talent categories are derived by category-service, which owns the
        // taxonomy and the matcher. Queue name must match the RPC
        // microservice connection in category-service's main.ts (not
        // its CMS event queue, which uses a deserializer incompatible with
        // request/response).
        name: 'CATEGORY_CLIENT',
        imports: [ConfigModule],
        inject: [ConfigService],
        useFactory: (config: ConfigService) => ({
          transport: Transport.RMQ,
          options: {
            urls: [config.get<string>('RABBITMQ_URL') || 'amqp://localhost:5672'],
            queue: 'category_rpc_queue',
            queueOptions: { durable: true },
          },
        }),
      },
    ]),
  ],
  controllers: [SearchController],
  providers: [AlgoliaClient, SearchService, DbFallbackService],
})
export class SearchServiceModule {}
