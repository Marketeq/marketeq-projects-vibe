// apps/offer-service/src/messaging/messaging.module.ts
// OS-19: Provides amqplib connection + RabbitMQPublisher. @Global().
import { Module, Global, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as amqp from 'amqplib';
import { RABBITMQ_CLIENT } from './constants/rabbitmq.constants';
import { OfferConfig } from '../config/offer.config';
import { RabbitMQPublisher } from './rabbitmq.publisher';

@Global()
@Module({
  providers: [
    {
      provide: RABBITMQ_CLIENT,
      inject: [ConfigService],
      useFactory: async (config: ConfigService) => {
        const logger = new Logger('MessagingModule');
        const cfg = config.get<OfferConfig>('offer')!.rabbitmq;
        const url = cfg.url;

        try {
          const connection = await amqp.connect(url, { heartbeat: 60 } as any);

          (connection as any).on?.('error', (err: Error) => {
            logger.error(`RabbitMQ connection error: ${err.message}`);
          });

          (connection as any).on?.('close', () => {
            logger.warn('RabbitMQ connection closed.');
          });

          logger.log('Connected to RabbitMQ broker.');
          return connection;
        } catch (err) {
          logger.error(`Failed to connect to RabbitMQ: ${(err as Error).message}`);
          throw err;
        }
      },
    },
    RabbitMQPublisher,
  ],
  exports: [RABBITMQ_CLIENT, RabbitMQPublisher],
})
export class MessagingModule {}