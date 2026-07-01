// apps/offer-service/src/realtime/realtime.module.ts
// OS-23: @Global() — AblyService injectable everywhere without re-importing.
import { Module, Global } from '@nestjs/common';
import { AblyService } from './ably.service';
 
@Global()
@Module({
  providers: [AblyService],
  exports: [AblyService],
})
export class RealtimeModule {}