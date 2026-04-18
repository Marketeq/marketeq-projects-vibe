import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule } from '@nestjs/axios';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { Invitation } from './entities/invitation.entity';
import { InvitationsService } from './invitations/invitations.service';
import { InvitationsController } from './invitations/invitations.controller';
import { UserServiceClient } from './invitations/user-service.client';
import { BrevoModule } from '../../notification-service/src/brevo/brevo.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['apps/invitations-service/.env', '.env'],
    }),
    HttpModule,
    ClientsModule.registerAsync([
      {
        name: 'RABBITMQ_CLIENT',
        imports: [ConfigModule],
        inject: [ConfigService],
        useFactory: (config: ConfigService) => ({
          transport: Transport.RMQ,
          options: {
            urls: [config.get<string>('RABBITMQ_URI') || 'amqp://localhost:5672'],
            queue: 'notification_service_queue',
            queueOptions: { durable: true },
          },
        }),
      },
    ]),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const useSSL = String(config.get('DATABASE_SSL_ENABLED') ?? 'false').toLowerCase() === 'true'
        return {
          type: 'postgres',
          url: config.get<string>('DATABASE_URL'),
          entities: [Invitation],
          synchronize: false,
          migrationsRun: true,
          migrations: [__dirname + '/migrations/*{.ts,.js}'],
          ssl: useSSL ? { rejectUnauthorized: false } : false,
        }
      },
    }),
    TypeOrmModule.forFeature([Invitation]),
    BrevoModule,
  ],
  controllers: [InvitationsController],
  providers: [InvitationsService, UserServiceClient],
})
export class InvitationsServiceModule {}
