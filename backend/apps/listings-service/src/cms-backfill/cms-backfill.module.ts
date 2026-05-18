import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { Project } from '../projects/entities/project.entity';
import { Testimonial } from '../testimonials/entities/testimonial.entity';
import { Team } from '../teams/entities/team.entity';
import { Service } from '../services/entities/service.entity';
import { Job } from '../jobs/entities/job.entity';
import { ProjectEventPublisher } from '../projects/project-event.publisher';
import { TestimonialsEventPublisher } from '../testimonials/testimonials-event.publisher';
import { CmsBackfillService } from './cms-backfill.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Project, Testimonial, Team, Service, Job]),
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
  providers: [CmsBackfillService, ProjectEventPublisher, TestimonialsEventPublisher],
})
export class CmsBackfillModule {}
