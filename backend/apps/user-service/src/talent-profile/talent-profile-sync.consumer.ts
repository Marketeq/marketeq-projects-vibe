import { Controller, Logger } from '@nestjs/common';
import { EventPattern, Payload, Ctx, RmqContext } from '@nestjs/microservices';
import { TalentProfileSyncService } from './talent-profile-sync.service';
import {
  TalentProfileSavedEvent,
  TalentProfileDeletedEvent,
} from './interfaces/talent-profile-events';

@Controller()
export class TalentProfileSyncConsumer {
  private readonly logger = new Logger(TalentProfileSyncConsumer.name);

  constructor(private readonly syncService: TalentProfileSyncService) {}

  @EventPattern('talent-profile.saved')
  async onTalentProfileSaved(
    @Payload() event: TalentProfileSavedEvent,
    @Ctx() context: RmqContext,
  ): Promise<void> {
    const channel = context.getChannelRef();
    const message = context.getMessage();

    try {
      this.logger.log(
        `Received talent-profile.saved for "${event.username}"`,
      );
      await this.syncService.upsert(event);
      channel.ack(message);
    } catch (err) {
      this.logger.error(
        `Failed to process talent-profile.saved for "${event.username}"`,
        err,
      );
      channel.nack(message, false, true);
    }
  }

  @EventPattern('talent-profile.deleted')
  async onTalentProfileDeleted(
    @Payload() event: TalentProfileDeletedEvent,
    @Ctx() context: RmqContext,
  ): Promise<void> {
    const channel = context.getChannelRef();
    const message = context.getMessage();

    try {
      this.logger.log(
        `Received talent-profile.deleted for "${event.username}"`,
      );
      await this.syncService.delete(event.id);
      // delete() is idempotent — always ack (logs warning if not found)
      channel.ack(message);
    } catch (err) {
      this.logger.error(
        `Failed to process talent-profile.deleted for "${event.username}"`,
        err,
      );
      channel.nack(message, false, true);
    }
  }
}
