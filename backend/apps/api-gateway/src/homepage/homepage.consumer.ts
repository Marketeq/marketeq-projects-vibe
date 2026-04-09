import { Controller, Logger } from '@nestjs/common';
import { EventPattern, Payload, Ctx, RmqContext } from '@nestjs/microservices';
import { HomepageService } from './homepage.service';

interface HomepageEvent {
  event: 'homepage.saved' | 'homepage.deleted';
  slug: string;
  id: string;
}

/**
 * RabbitMQ consumer that invalidates the homepage Redis cache
 * when a CMS admin saves or deletes a homepage document.
 *
 * Queue: api-gateway.homepage
 * Binding: cms.events exchange, routing key homepage.*
 */
@Controller()
export class HomepageConsumer {
  private readonly logger = new Logger(HomepageConsumer.name);

  constructor(private readonly homepageService: HomepageService) {}

  @EventPattern('homepage.saved')
  async onHomepageSaved(
    @Payload() event: HomepageEvent,
    @Ctx() context: RmqContext,
  ): Promise<void> {
    const channel = context.getChannelRef();
    const message = context.getMessage();

    try {
      this.logger.log(`Received homepage.saved for slug: ${event.slug}`);
      await this.homepageService.invalidateCache(event.slug);
      channel.ack(message);
    } catch (err) {
      this.logger.error(`Failed to invalidate cache for homepage "${event.slug}"`, err);
      channel.nack(message, false, true);
    }
  }

  @EventPattern('homepage.deleted')
  async onHomepageDeleted(
    @Payload() event: HomepageEvent,
    @Ctx() context: RmqContext,
  ): Promise<void> {
    const channel = context.getChannelRef();
    const message = context.getMessage();

    try {
      this.logger.log(`Received homepage.deleted for slug: ${event.slug}`);
      await this.homepageService.invalidateCache(event.slug);
      channel.ack(message);
    } catch (err) {
      this.logger.error(`Failed to invalidate cache for homepage "${event.slug}"`, err);
      channel.nack(message, false, true);
    }
  }
}
