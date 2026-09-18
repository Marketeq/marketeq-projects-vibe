// apps/payout-service/src/consumers/identity-events.consumer.ts
// PS-35 §5.3 + §7: consumes the three biometric-gate events identity-service
// publishes. Binds to marketeq.identity (declared in app.module.ts) —
// identity-service does not publish onto it yet (confirmed: no biometric
// capability exists there today, PS-35 is net-new work on that side), so
// these bindings sit idle until it ships. That's a normal, harmless AMQP
// state, not a broken consumer — @RabbitSubscribe works the same way
// regardless of which module registers it (golevelup's DiscoveryService
// scans every provider in the app for the decorator, independent of
// standard NestJS module/DI boundaries — confirmed against
// apps/transaction-service's own consumers, which are likewise never
// explicitly imported anywhere besides their own provider registration).
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { RabbitSubscribe } from '@golevelup/nestjs-rabbitmq';
import Redis from 'ioredis';
import { DepositMethod, VerificationStatus } from '../entities/deposit-method.entity';
import { AuditService } from '../audit/audit.service';
import { PayoutPublisher } from '../publishers/payout.publisher';
import { ScheduleService } from '../schedule/schedule.service';
import { UpdateScheduleDto } from '../schedule/dto/update-schedule.dto';

const pendingScheduleKey = (contractorId: string) => `pending_schedule:${contractorId}`;

@Injectable()
export class IdentityEventsConsumer {
  private readonly logger = new Logger(IdentityEventsConsumer.name);
  private readonly redis: Redis;

  constructor(
    @InjectRepository(DepositMethod)
    private readonly methodRepo: Repository<DepositMethod>,
    private readonly config: ConfigService,
    private readonly auditService: AuditService,
    private readonly publisher: PayoutPublisher,
    private readonly scheduleService: ScheduleService,
  ) {
    this.redis = new Redis(this.config.get<string>('REDIS_URL', 'redis://localhost:6379'));
  }

  // PS-35 §5.3: schedule gate cleared — resume the pending schedule
  // creation stored in Redis by ScheduleService.updateSchedule().
  @RabbitSubscribe({
    exchange: 'marketeq.identity',
    routingKey: 'payout.biometric.verified',
    queue: 'payout-svc.identity.biometric.verified',
  })
  async onScheduleBiometricVerified(msg: { contractorId: string; occurredAt: string }): Promise<void> {
    const raw = await this.redis.get(pendingScheduleKey(msg.contractorId));
    if (!raw) {
      this.logger.warn(`No pending schedule for ${msg.contractorId} — TTL expired or already processed`);
      return;
    }
    const dto = JSON.parse(raw) as UpdateScheduleDto;
    await this.redis.del(pendingScheduleKey(msg.contractorId));

    // skipBiometricGate=true — this call IS the resumption of a gate that
    // already cleared; re-checking it would just call identity-service
    // again for no reason (and race the gate having already been consumed).
    const result = await this.scheduleService.updateSchedule(msg.contractorId, dto, true);

    await this.publisher.publishScheduleActivated({
      contractorId: msg.contractorId,
      scheduleId: (result as any).scheduleId ?? '',
      frequency: (result as any).frequency ?? dto.frequency ?? '',
      methodType: (result as any).primaryMethod?.methodType ?? '',
    });
  }

  // PS-35 §5.3: method gate cleared — promote PENDING_BIOMETRIC to VERIFIED.
  @RabbitSubscribe({
    exchange: 'marketeq.identity',
    routingKey: 'payout.method.biometric.verified',
    queue: 'payout-svc.identity.method.biometric.verified',
  })
  async onMethodBiometricVerified(msg: {
    contractorId: string;
    depositMethodId: string;
    occurredAt: string;
  }): Promise<void> {
    const result = await this.methodRepo.update(
      { id: msg.depositMethodId, contractorId: msg.contractorId, verificationStatus: VerificationStatus.PENDING_BIOMETRIC } as any,
      { verificationStatus: VerificationStatus.VERIFIED },
    );
    if (!result.affected) {
      this.logger.warn(`payout.method.biometric.verified for ${msg.depositMethodId} — no matching PENDING_BIOMETRIC row`);
      return;
    }
    await this.auditService.log({
      contractorId: msg.contractorId,
      actorType: 'service',
      actorId: 'identity-service',
      action: 'method.biometric_verified',
      metadata: { depositMethodId: msg.depositMethodId },
    });
  }

  // PS-35 §5.3/§8: all 3 Didit attempts exhausted — deactivate the method
  // or clear the pending schedule, then notify.
  @RabbitSubscribe({
    exchange: 'marketeq.identity',
    routingKey: 'payout.biometric.failed',
    queue: 'payout-svc.identity.biometric.failed',
  })
  async onBiometricFailed(msg: {
    contractorId: string;
    depositMethodId: string | null;
    occurredAt: string;
  }): Promise<void> {
    if (msg.depositMethodId) {
      await this.methodRepo.update(
        { id: msg.depositMethodId, contractorId: msg.contractorId } as any,
        { isActive: false, verificationStatus: VerificationStatus.VERIFICATION_FAILED },
      );
      await this.auditService.log({
        contractorId: msg.contractorId,
        actorType: 'service',
        actorId: 'identity-service',
        action: 'method.biometric_failed',
        metadata: { depositMethodId: msg.depositMethodId },
      });
    } else {
      await this.redis.del(pendingScheduleKey(msg.contractorId));
      await this.auditService.log({
        contractorId: msg.contractorId,
        actorType: 'service',
        actorId: 'identity-service',
        action: 'schedule.biometric_failed',
      });
    }

    await this.publisher.publishBiometricVerificationExhausted({
      contractorId: msg.contractorId,
      depositMethodId: msg.depositMethodId,
    });
  }
}
