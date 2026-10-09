import { Module } from '@nestjs/common';
import { IdentityGateModule } from '../identity-gate/identity-gate.module';
import { DownloadsController } from './downloads.controller';

@Module({
  imports: [IdentityGateModule],
  controllers: [DownloadsController],
})
export class DownloadsModule {}
