// apps/payout-service/src/schedule/schedule.module.ts
// PS-03 + PS-17 + PS-18: Schedule config + execution engine + split auto-balance
import { Module }                    from '@nestjs/common';
import { TypeOrmModule }             from '@nestjs/typeorm';
import { BullModule }                from '@nestjs/bull';
import { ScheduleController }        from './schedule.controller';
import { ScheduleService }           from './schedule.service';
import { SplitService }              from './split.service';
import { SplitCalculatorService }    from './split-calculator.service';
import { ScheduleExecutionCron }     from './schedule-execution.cron';
import { ThresholdCheckService }     from './threshold-check.service';
import { NextExecutionService }      from './next-execution.service';
import { AchInitiationCalculatorService } from './ach-initiation-calculator.service';
import { PayoutSchedule }            from '../entities/payout-schedule.entity';
import { PayoutRequest }             from '../entities/payout-request.entity';
import { DepositMethod }             from '../entities/deposit-method.entity';
import { CommonModule }              from '../common/common.module';
import { PublishersModule }          from '../publishers/publishers.module';
import { PauseModule }               from '../pause/pause.module';
import { PayoutModule }              from '../payout/payout.module';
import { KycModule }                 from '../kyc/kyc.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([PayoutSchedule, PayoutRequest, DepositMethod]),
    // PS-17 v2.0 §9: the master execution cron holds the earnings balance
    // and enqueues onto the same 'payout-processing' queue manual
    // withdrawals use (via PayoutService.enqueueForProcessing) — previously
    // nothing pushed scheduled payouts onto that queue at all, so they were
    // created but never executed. See schedule-execution.cron.ts.
    BullModule.registerQueue({ name: 'schedule-secondary-retry' }),
    CommonModule,       // EarningsClient, KycClient
    PublishersModule,   // PayoutPublisher
    PauseModule,        // PauseStatusService (PS-16 assertNotPaused)
    PayoutModule,       // PayoutService.enqueueForProcessing
    KycModule,          // KycGateService — same PS-15 gate the manual withdrawal path uses
  ],
  controllers: [ScheduleController],
  providers: [
    ScheduleService,
    SplitService,
    SplitCalculatorService,
    ScheduleExecutionCron,
    ThresholdCheckService,
    NextExecutionService,
    AchInitiationCalculatorService,
  ],
  exports: [
    ScheduleService,
    SplitService,
    SplitCalculatorService,
    ThresholdCheckService,
    NextExecutionService,
    AchInitiationCalculatorService,
  ],
})
export class ScheduleConfigModule {}
