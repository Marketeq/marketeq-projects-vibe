import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TalentProfile } from './entities/talent-profile.entity';
import { TalentProfileSyncService } from './talent-profile-sync.service';
import { TalentProfileSyncConsumer } from './talent-profile-sync.consumer';
import { TalentProfileController } from './talent-profile.controller';
import { User } from '../user/entities/user.entity';

@Module({
  imports: [
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
            queue: 'algolia_queue',
            queueOptions: { durable: true },
            socketOptions: { heartbeatIntervalInSeconds: 60 },
          },
        }),
      },
    ]),
  ],
  controllers: [TalentProfileController, TalentProfileSyncConsumer],
  providers: [TalentProfileSyncService],
  exports: [TalentProfileSyncService],
})
export class TalentProfileModule {}
