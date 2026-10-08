import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserPreferences } from '../entities/user-preferences.entity';
import { TalentNotificationsService } from './talent-notifications.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([UserPreferences]),
    // A user-facing notification goes to notification-service's own queue,
    // not to time_tracking_events where the domain events go.
    ClientsModule.registerAsync([
      {
        name: 'NOTIFICATIONS_CLIENT',
        imports: [ConfigModule],
        inject: [ConfigService],
        useFactory: (config: ConfigService) => ({
          transport: Transport.RMQ,
          options: {
            urls: [
              config.get<string>('RABBITMQ_URI') ??
                config.get<string>('RABBITMQ_URL') ??
                'amqp://localhost:5672',
            ],
            queue: 'notification_service_queue',
            queueOptions: { durable: true },
          },
        }),
      },
    ]),
  ],
  providers: [TalentNotificationsService],
  exports: [TalentNotificationsService],
})
export class TalentNotificationsModule {}
