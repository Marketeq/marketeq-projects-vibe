// apps/offer-service/src/common/alert/alert.module.ts
// OS-22: Global alert module.
import { Module, Global } from '@nestjs/common';
import { AlertService } from './alert.service';

@Global()
@Module({
  providers: [AlertService],
  exports: [AlertService],
})
export class AlertModule {}