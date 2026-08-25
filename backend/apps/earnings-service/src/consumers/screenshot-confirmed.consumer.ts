import { Injectable, Logger } from '@nestjs/common';
import { Ctx, MessagePattern, Payload, RmqContext } from '@nestjs/microservices';
import { InternalSyncService } from '../internal/internal-sync.service';

@Injectable()
export class ScreenshotConfirmedConsumer {
  private readonly logger = new Logger(ScreenshotConfirmedConsumer.name);

  constructor(private readonly syncService: InternalSyncService) {}

  @MessagePattern('earnings.screenshot_confirmed')
  async handle(@Payload() payload: any, @Ctx() ctx: RmqContext): Promise<void> {
    const ch = ctx.getChannelRef();
    const msg = ctx.getMessage();
    try {
      const data = payload?.data ?? payload;
      await this.syncService.syncFromTTS({
        userId: data.userId,
        contractId: data.contractId,
        taskId: data.taskId ?? null,
        taskName: data.taskName ?? null,
        day: data.day,
        screenshotCount: data.screenshotCount,
        firstAt: data.firstAt,
        lastAt: data.lastAt,
        avgKbd: data.avgKbd ?? 0,
        avgMouse: data.avgMouse ?? 0,
      });
      ch.ack(msg);
      this.logger.log(`Processed earnings.screenshot_confirmed for ${data.contractId} ${data.day}`);
    } catch (err: any) {
      this.logger.error(`Failed: ${err.message}`, err.stack);
      ch.nack(msg, false, false);
    }
  }
}