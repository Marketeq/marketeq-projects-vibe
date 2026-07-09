import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TeamsInternalController } from './teams-internal.controller';
import { TeamsController } from './team.controller';
import { TeamsService } from './team.service';
import { Team } from './entities/team.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Team]),
    ConfigModule,
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
  controllers: [TeamsController, TeamsInternalController],
  providers: [TeamsService],
  exports: [TeamsService],
})
export class TeamsModule {}
