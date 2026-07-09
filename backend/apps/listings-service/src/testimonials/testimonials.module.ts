import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Testimonial } from './entities/testimonial.entity';
import { TestimonialsService } from './testimonials.service';
import { TestimonialsCmsConsumer } from './testimonials-cms.consumer';
import { TestimonialsEventPublisher } from './testimonials-event.publisher';

@Module({
  imports: [
    TypeOrmModule.forFeature([Testimonial]),
    ClientsModule.registerAsync([
      {
        name: 'RABBITMQ_CLIENT',
        imports: [ConfigModule],
        useFactory: (config: ConfigService) => ({
          transport: Transport.RMQ,
          options: {
            urls: [config.get<string>('RABBITMQ_URL') || 'amqp://localhost:5672'],
            queue: 'cms_events_queue',
            queueOptions: { durable: true },
          },
        }),
        inject: [ConfigService],
      },
    ]),
  ],
  controllers: [TestimonialsCmsConsumer],
  providers: [TestimonialsService, TestimonialsEventPublisher],
  exports: [TestimonialsService],
})
export class TestimonialsModule {}
