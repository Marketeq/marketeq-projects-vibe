import { Controller, Logger } from '@nestjs/common';
import { EventPattern, Payload, Ctx, RmqContext } from '@nestjs/microservices';
import { HomepageService } from './homepage.service';

interface ProjectEvent {
  event: 'project.saved' | 'project.deleted';
  id: string;
  slug?: string;
  payloadId?: number | string;
}

/**
 * Sibling consumer to HomepageConsumer. Project edits in CMS land in the
 * `api-gateway.projects` queue (bound to `cms.events` exchange with routing
 * key `project.*`). The /homepage feed embeds project cards via
 * fetchProjects(), so any project save/delete should bust the homepage
 * Redis cache the same way a homepage save does — otherwise project edits
 * stay invisible on `/` for up to HOMEPAGE_CACHE_TTL (300 s default).
 *
 * Queue: api-gateway.projects (declared by cms-event.publisher.ts)
 * Routing keys: project.saved, project.deleted
 */
@Controller()
export class ProjectsConsumer {
  private readonly logger = new Logger(ProjectsConsumer.name);

  constructor(private readonly homepageService: HomepageService) {}

  @EventPattern('project.saved')
  async onProjectSaved(
    @Payload() event: ProjectEvent,
    @Ctx() context: RmqContext,
  ): Promise<void> {
    const channel = context.getChannelRef();
    const message = context.getMessage();
    try {
      this.logger.log(`Received project.saved for ${event?.slug ?? event?.id ?? '<unknown>'}`);
      // invalidateCache wipes all hp:home:* variants regardless of slug —
      // pass any string. The homepage service treats this as a fan-out flush.
      await this.homepageService.invalidateCache('project-event');
      channel.ack(message);
    } catch (err) {
      this.logger.error(
        `Failed to invalidate homepage cache after project.saved (${event?.slug ?? event?.id})`,
        err,
      );
      channel.nack(message, false, true);
    }
  }

  @EventPattern('project.deleted')
  async onProjectDeleted(
    @Payload() event: ProjectEvent,
    @Ctx() context: RmqContext,
  ): Promise<void> {
    const channel = context.getChannelRef();
    const message = context.getMessage();
    try {
      this.logger.log(`Received project.deleted for ${event?.slug ?? event?.id ?? '<unknown>'}`);
      await this.homepageService.invalidateCache('project-event');
      channel.ack(message);
    } catch (err) {
      this.logger.error(
        `Failed to invalidate homepage cache after project.deleted (${event?.slug ?? event?.id})`,
        err,
      );
      channel.nack(message, false, true);
    }
  }
}
