import { Controller, Logger } from '@nestjs/common';
import { EventPattern, Payload, Ctx, RmqContext } from '@nestjs/microservices';
import { ProjectStaticContentService } from './project-static-content.service';

@Controller()
export class ProjectCmsConsumer {
  private readonly logger = new Logger(ProjectCmsConsumer.name);

  constructor(private readonly staticContentService: ProjectStaticContentService) {}

  @EventPattern('project-static-content.saved')
  async onStaticContentSaved(
    @Payload() data: any,
    @Ctx() context: RmqContext,
  ): Promise<void> {
    const channel = context.getChannelRef();
    const message = context.getMessage();

    try {
      this.logger.log(`Received project-static-content.saved for slug: ${data.slug}`);
      await this.staticContentService.upsert({
        slug: data.slug,
        heading: data.heading,
        guaranteeItems: data.guaranteeItems,
        highlightedNotice: data.highlightedNotice,
        policy: data.policy,
        howItWorks: data.howItWorks,
      });
      channel.ack(message);
    } catch (err) {
      this.logger.error(`Failed to handle project-static-content.saved: ${err.message}`);
      channel.nack(message, false, true);
    }
  }
}
