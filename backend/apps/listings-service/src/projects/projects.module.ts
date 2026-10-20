import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { ProjectsController } from './projects.controller';
import { ProjectsInternalController } from './projects-internal.controller';
import { ProjectsService } from './projects.service';
import { RelatedTermsService } from './related-terms.service';
import { Project } from './entities/project.entity';
import { DELIVERABLES_ADAPTER } from '../project-sync/deliverables/deliverables.adapter';
import { DeliverablesAdapterHeuristic } from '../project-sync/deliverables/deliverables.adapter.heuristic';
import { DeliverablesAdapterHuggingFace } from '../project-sync/deliverables/deliverables.adapter.huggingface';
import { FAQ_ADAPTER } from '../publish/faq/faq.adapter';
import { FaqAdapterHeuristic } from '../publish/faq/faq.adapter.heuristic';
import { FaqAdapterHuggingFace } from '../publish/faq/faq.adapter.huggingface';
import { IdentityGateModule } from '../identity-gate/identity-gate.module';
import { RoleRateModule } from '../shared/pricing/role-rate.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Project]),
    ConfigModule,
    // G5: public rosters omit members whose gate is closed.
    IdentityGateModule,
    RoleRateModule,
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
  controllers: [ProjectsController, ProjectsInternalController],
  providers: [
    ProjectsService,
    RelatedTermsService,
    DeliverablesAdapterHeuristic,
    DeliverablesAdapterHuggingFace,
    { provide: DELIVERABLES_ADAPTER, useExisting: DeliverablesAdapterHuggingFace },
    FaqAdapterHeuristic,
    FaqAdapterHuggingFace,
    { provide: FAQ_ADAPTER, useExisting: FaqAdapterHuggingFace },
  ],
  exports: [ProjectsService],
})
export class ProjectsModule {}
