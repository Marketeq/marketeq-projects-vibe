import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TalentProfile } from './entities/talent-profile.entity';
import { TalentProfileSyncService } from './talent-profile-sync.service';
import { TalentProfileSyncConsumer } from './talent-profile-sync.consumer';
import { TalentProfileController } from './talent-profile.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([TalentProfile]),
    ClientsModule.registerAsync([
      {
        name: 'ALGOLIA_CLIENT',
        imports: [ConfigModule],
        useFactory: (cfg: ConfigService) => ({
          transport: Transport.RMQ,
          options: {
            urls: [
              cfg.get<string>('RABBITMQ_URI') ??
              cfg.get<string>('RABBITMQ_URL') ??
              'amqp://localhost:5672',
            ],
            queue: 'algolia_service_queue',
            queueOptions: { durable: true },
          },
        }),
        inject: [ConfigService],
      },
    ]),
  ],
  controllers: [TalentProfileController, TalentProfileSyncConsumer],
  providers: [TalentProfileSyncService],
  exports: [TalentProfileSyncService],
})
export class TalentProfileModule {}
