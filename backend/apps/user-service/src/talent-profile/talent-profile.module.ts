import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TalentProfile } from './entities/talent-profile.entity';
import { TalentProfileSyncService } from './talent-profile-sync.service';
import { TalentProfileSyncConsumer } from './talent-profile-sync.consumer';
import { TalentProfileController } from './talent-profile.controller';
import { TalentProfileRecommendationService } from './talent-profile-recommendation.service';
import { User } from '../user/entities/user.entity';

@Module({
  imports: [
    HttpModule,
    TypeOrmModule.forFeature([TalentProfile, User]),
    ConfigModule,
    ClientsModule.registerAsync([
      {
        name: 'ALGOLIA_CLIENT',
        imports: [ConfigModule],
        inject: [ConfigService],
        useFactory: (config: ConfigService) => ({
          transport: Transport.RMQ,
          options: {
            urls: [config.get<string>('RABBITMQ_URL', 'amqp://localhost:5672')],
            queue: 'algolia_service_queue',
            queueOptions: { durable: true },
            socketOptions: { heartbeatIntervalInSeconds: 60 },
          },
        }),
      },
      {
        name: 'RABBITMQ_CLIENT',
        imports: [ConfigModule],
        useFactory: (config: ConfigService) => ({
          transport: Transport.RMQ,
          options: {
            urls: [config.get<string>('RABBITMQ_URL') || 'amqp://localhost:5672'],
            queue: 'algolia_service_queue',
            queueOptions: { durable: true },
          },
        }),
        inject: [ConfigService],
      },
      {
        // Semantic category matching lives in category-service, which owns the
        // taxonomy. Queue name must match the RPC microservice connection in
        // category-service's main.ts (not its CMS event queue, which uses a
        // deserializer incompatible with request/response).
        name: 'CATEGORY_CLIENT',
        imports: [ConfigModule],
        useFactory: (config: ConfigService) => ({
          transport: Transport.RMQ,
          options: {
            urls: [config.get<string>('RABBITMQ_URL') || 'amqp://localhost:5672'],
            queue: 'category_rpc_queue',
            queueOptions: { durable: true },
          },
        }),
        inject: [ConfigService],
      },
    ]),
  ],
  controllers: [TalentProfileController, TalentProfileSyncConsumer],
  providers: [TalentProfileSyncService, TalentProfileRecommendationService],
  exports: [TalentProfileSyncService, TalentProfileRecommendationService],
})
export class TalentProfileModule {}
