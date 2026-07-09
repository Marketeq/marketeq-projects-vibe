// apps/payout-service/src/pause/pause.module.ts
// PS-16: Paused Payouts & Alert System module
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PauseStatusService } from './pause-status.service';
import { PauseController } from './pause.controller';
import { DepositMethod } from '../entities/deposit-method.entity';
import { CommonModule } from '../common/common.module';
import { PublishersModule } from '../publishers/publishers.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([DepositMethod]),
    CommonModule,       // KycClient
    PublishersModule,   // PayoutPublisher
  ],
  controllers: [PauseController],
  providers: [PauseStatusService],
  exports: [PauseStatusService],
})
export class PauseModule {}