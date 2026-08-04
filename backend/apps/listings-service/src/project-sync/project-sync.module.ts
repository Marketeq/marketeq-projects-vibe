import {
  MiddlewareConsumer,
  Module,
  NestModule,
  RequestMethod,
} from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { HttpModule } from "@nestjs/axios";
import { ClientsModule, Transport } from "@nestjs/microservices";
import { ProjectSyncController } from "./project-sync.controller";
import { ProjectDeliverablesController } from "./project-deliverables.controller";
import { ProjectSyncService } from "./project-sync.service";
import { ProjectSyncContractMiddleware } from "./project-sync.contract.middleware";
import { DELIVERABLES_ADAPTER } from "./deliverables/deliverables.adapter";
import { DeliverablesAdapterHeuristic } from "./deliverables/deliverables.adapter.heuristic";
import { DeliverablesAdapterHuggingFace } from "./deliverables/deliverables.adapter.huggingface";
import { SKILLS_ADAPTER } from "./skills/skills.adapter";
import { SkillsAdapterHeuristic } from "./skills/skills.adapter.heuristic";
import { SkillsAdapterHuggingFace } from "./skills/skills.adapter.huggingface";
import { PublishModule } from "../publish/publish.module";

@Module({
  imports: [
    ConfigModule,
    HttpModule,
    PublishModule,
    ClientsModule.registerAsync([
      {
        name: "ALGOLIA_CLIENT",
        imports: [ConfigModule],
        inject: [ConfigService],
        useFactory: (config: ConfigService) => ({
          transport: Transport.RMQ,
          options: {
            urls: [config.get<string>("RABBITMQ_URL", "amqp://localhost:5672")],
            queue: "algolia_queue",
            queueOptions: { durable: true },
            socketOptions: { heartbeatIntervalInSeconds: 60 },
          },
        }),
      },
    ]),
  ],
  controllers: [ProjectSyncController, ProjectDeliverablesController],
  providers: [
    ProjectSyncService,
    DeliverablesAdapterHeuristic,
    DeliverablesAdapterHuggingFace,
    SkillsAdapterHeuristic,
    SkillsAdapterHuggingFace,
    // §01 Deliverables — spec calls for "LLM-derived" deliverables.
    // Bind the token to the HuggingFace adapter, which internally
    // falls back to the heuristic when `HUGGINGFACE_API_KEY` is
    // absent or any inference call fails. Callers see one adapter
    // with a resilient backing strategy.
    {
      provide: DELIVERABLES_ADAPTER,
      useExisting: DeliverablesAdapterHuggingFace,
    },
    // §14.11 SuggestedSkills + §03 AI Skill Mapping — same pattern.
    {
      provide: SKILLS_ADAPTER,
      useExisting: SkillsAdapterHuggingFace,
    },
  ],
  exports: [ProjectSyncService],
})
export class ProjectSyncModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer
      .apply(ProjectSyncContractMiddleware)
      .forRoutes({ path: "internal/project-sync", method: RequestMethod.POST });
  }
}
