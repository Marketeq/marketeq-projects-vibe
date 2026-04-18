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
      const slug = event?.slug;
      if (!slug) {
        this.logger.warn('Received homepage.saved with missing slug — acking');
        channel.ack(message);
        return;
      }
      this.logger.log(`Received homepage.saved for slug: ${slug}`);
      await this.homepageService.invalidateCache(slug);
      channel.ack(message);
    } catch (err) {
      this.logger.error(`Failed to invalidate cache for homepage "${event?.slug}"`, err);
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
      const slug = event?.slug;
      if (!slug) {
        this.logger.warn('Received homepage.deleted with missing slug — acking');
        channel.ack(message);
        return;
      }
      this.logger.log(`Received homepage.deleted for slug: ${slug}`);
      await this.homepageService.invalidateCache(slug);
      channel.ack(message);
    } catch (err) {
      this.logger.error(`Failed to invalidate cache for homepage "${event?.slug}"`, err);
      channel.nack(message, false, true);
    }
  }

  /**
   * The HomepageBanner global is embedded in /homepage's `banner` field
   * (homepage.service.ts assemble step). Edit a banner in the CMS admin
   * and it should land on `/` in sub-second instead of waiting for the
   * 300 s Redis TTL — this handler bridges that gap.
   */
  @EventPattern('homepage-banner.saved')
  async onHomepageBannerSaved(
    @Ctx() context: RmqContext,
  ): Promise<void> {
    const channel = context.getChannelRef();
    const message = context.getMessage();
    try {
      this.logger.log('Received homepage-banner.saved — invalidating homepage cache');
      // invalidateCache wipes all hp:home:* variants regardless of slug
      await this.homepageService.invalidateCache('homepage-banner-event');
      channel.ack(message);
    } catch (err) {
      this.logger.error('Failed to invalidate cache after homepage-banner.saved', err);
      channel.nack(message, false, true);
    }
  }
}
