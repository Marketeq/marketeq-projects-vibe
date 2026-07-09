// apps/payout-service/src/schedule/schedule.module.ts
// PS-03 + PS-17 + PS-18: Schedule config + execution engine + split auto-balance
import { Module }                    from '@nestjs/common';
import { TypeOrmModule }             from '@nestjs/typeorm';
import { ScheduleController }        from './schedule.controller';
import { ScheduleService }           from './schedule.service';
import { SplitService }              from './split.service';
import { SplitCalculatorService }    from './split-calculator.service';
import { ScheduleExecutionCron }     from './schedule-execution.cron';
import { ThresholdCheckService }     from './threshold-check.service';
import { NextExecutionService }      from './next-execution.service';
import { PayoutSchedule }            from '../entities/payout-schedule.entity';
import { PayoutRequest }             from '../entities/payout-request.entity';
import { DepositMethod }             from '../entities/deposit-method.entity';
import { CommonModule }              from '../common/common.module';
import { PublishersModule }          from '../publishers/publishers.module';
import { PauseModule }               from '../pause/pause.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([PayoutSchedule, PayoutRequest, DepositMethod]),
    CommonModule,       // EarningsClient, KycClient
    PublishersModule,   // PayoutPublisher
    PauseModule,        // PauseStatusService (PS-16 assertNotPaused)
  ],
  controllers: [ScheduleController],
  providers: [
    ScheduleService,
    SplitService,
    SplitCalculatorService,
    ScheduleExecutionCron,
    ThresholdCheckService,
    NextExecutionService,
  ],
  exports: [
    ScheduleService,
    SplitService,
    SplitCalculatorService,
    ThresholdCheckService,
    NextExecutionService,
  ],
})
export class ScheduleConfigModule {}
