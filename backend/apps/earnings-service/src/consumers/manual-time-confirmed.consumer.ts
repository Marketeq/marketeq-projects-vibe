import { Injectable, Logger } from '@nestjs/common';
import { Ctx, MessagePattern, Payload, RmqContext } from '@nestjs/microservices';
import { InternalSyncService } from '../internal/internal-sync.service';

@Injectable()
export class ManualTimeConfirmedConsumer {
  private readonly logger = new Logger(ManualTimeConfirmedConsumer.name);

  constructor(private readonly syncService: InternalSyncService) {}

  @MessagePattern('earnings.manual_time_confirmed')
  async handle(@Payload() payload: any, @Ctx() ctx: RmqContext): Promise<void> {
    const ch = ctx.getChannelRef();
    const msg = ctx.getMessage();
    try {
      const data = payload?.data ?? payload;
      await this.syncService.syncManualTimeFromTTS({
        userId: data.userId,
        contractId: data.contractId,
        taskId: data.taskId ?? null,
        taskName: data.taskName ?? null,
        manualTimeId: data.manualTimeId,
        startTime: data.startTime,
        endTime: data.endTime,
        durationMinutes: data.durationMinutes,
      });
      ch.ack(msg);
      this.logger.log(`Processed earnings.manual_time_confirmed for ${data.contractId} ${data.manualTimeId}`);
    } catch (err: any) {
      this.logger.error(`Failed: ${err.message}`, err.stack);
      ch.nack(msg, false, false);
    }
  }
}
