import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { HttpModule } from '@nestjs/axios';
import { Project } from '../projects/entities/project.entity';
import { Testimonial } from '../testimonials/entities/testimonial.entity';
import { Team } from '../teams/entities/team.entity';
import { Service } from '../services/entities/service.entity';
import { Job } from '../jobs/entities/job.entity';
import { JobListing } from '../job-listing/entities/job-listing.entity';
import { BasicInformation } from '../job-listing/entities/job-listing-basic-info.entity';
import { TeamMemberRow } from '../job-listing/entities/job-listing-role-row.entity';
import { RoleDescription } from '../job-listing/entities/job-listing-role-description.entity';
import { ProjectEventPublisher } from '../projects/project-event.publisher';
import { TestimonialsEventPublisher } from '../testimonials/testimonials-event.publisher';
import { CmsBackfillService } from './cms-backfill.service';
import { PublishModule } from '../publish/publish.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Project, Testimonial, Team, Service, Job, JobListing, BasicInformation, TeamMemberRow, RoleDescription]),
    HttpModule,
    PublishModule,
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
