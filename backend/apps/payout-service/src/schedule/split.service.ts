// apps/payout-service/src/schedule/split.service.ts
// PS-18: Auto-Balance Logic for Split Payouts
// Handles split enable/disable toggle, percentage updates,
// method removal cascades, and all PS-18 §5-§9 validations.

import { Injectable, Logger, HttpStatus } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { PayoutSchedule } from '../entities/payout-schedule.entity';
import { DepositMethod, VerificationStatus } from '../entities/deposit-method.entity';
import { SplitCalculatorService } from './split-calculator.service';
import { AuditService } from '../audit/audit.service';
import { PayoutError } from '../common/errors/payout.error';
import { UpdateSplitDto } from './dto/update-split.dto';

@Injectable()
export class SplitService {
  private readonly logger = new Logger(SplitService.name);

  constructor(
    @InjectRepository(PayoutSchedule)
    private readonly scheduleRepo: Repository<PayoutSchedule>,
    @InjectRepository(DepositMethod)
    private readonly methodRepo: Repository<DepositMethod>,
    private readonly calculator: SplitCalculatorService,
    private readonly auditService: AuditService,
  ) {}

  // ─── PATCH /v1/payouts/schedule/split (PS-18 §5/§8) ──────────
  async updateSplit(
    contractorId: string,
    dto: UpdateSplitDto,
  ): Promise<any> {
    const schedule = await this.scheduleRepo.findOne({ where: { contractorId } });
    if (!schedule) {
      throw new PayoutError(
        'No schedule found. Create a schedule first.',
        HttpStatus.NOT_FOUND,
        'ERR_SCHEDULE_NOT_FOUND',
      );
    }

    // ── Case 1: Enabling split (off → on) — always reset to 50/50 ──
    if (dto.splitEnabled === true && !schedule.splitEnabled) {
      // §9: Must provide secondaryMethodId when enabling
      if (!dto.secondaryMethodId) {
        throw new PayoutError(
          'A secondary deposit method is required to enable split payouts.',
          HttpStatus.BAD_REQUEST,
          'ERR_SPLIT_NO_SECONDARY_METHOD',
        );
      }

      // Validate secondary method
      await this.validateSecondaryMethod(contractorId, dto.secondaryMethodId, schedule.primaryMethodId);

      await this.scheduleRepo.update(schedule.id, {
        splitEnabled: true,
        splitEnabledAt: new Date(),
        primarySplitPercent: 50.00,
        secondaryMethodId: dto.secondaryMethodId,
      });

      await this.auditService.log({
        contractorId,
        actorType: 'contractor',
        actorId: contractorId,
        action: 'split.enabled',
        metadata: {
          scheduleId: schedule.id,
          secondaryMethodId: dto.secondaryMethodId,
          primarySplitPercent: 50.00,
        },
      });

      this.logger.log(`Split enabled for ${contractorId}: 50/50`);
      return this.formatSplitResponse(schedule.id, contractorId);
    }

    // ── Case 2: Disabling split (on → off) — primary gets 100% ──
    if (dto.splitEnabled === false && schedule.splitEnabled) {
      await this.scheduleRepo.update(schedule.id, {
        splitEnabled: false,
        splitDisabledAt: new Date(),
        primarySplitPercent: 100.00,
        secondaryMethodId: null,
      });

      await this.auditService.log({
        contractorId,
        actorType: 'contractor',
        actorId: contractorId,
        action: 'split.disabled',
        metadata: { scheduleId: schedule.id },
      });

      this.logger.log(`Split disabled for ${contractorId}`);
      return this.formatSplitResponse(schedule.id, contractorId);
    }

    // ── Case 3: Updating percentage while split is active ──
    if (dto.primarySplitPercent !== undefined) {
      if (!schedule.splitEnabled) {
        throw new PayoutError(
          'Cannot set split percentage while split is off. Enable split first.',
          HttpStatus.BAD_REQUEST,
          'ERR_SPLIT_NOT_ENABLED',
        );
      }

      // PS-18 §4.1: Truncate to 2dp, then validate range
      this.calculator.validateSplitPercent(dto.primarySplitPercent);
      const truncated = this.calculator.truncateTo2dp(dto.primarySplitPercent);

      await this.scheduleRepo.update(schedule.id, {
        primarySplitPercent: truncated,
      });

      await this.auditService.log({
        contractorId,
        actorType: 'contractor',
        actorId: contractorId,
        action: 'split.percent_updated',
        metadata: {
          scheduleId: schedule.id,
          primarySplitPercent: truncated,
          secondarySplitPercent: Math.round((100 - truncated) * 100) / 100,
        },
      });

      this.logger.log(`Split updated for ${contractorId}: ${truncated}/${Math.round((100 - truncated) * 100) / 100}`);
      return this.formatSplitResponse(schedule.id, contractorId);
    }

    // ── Case 4: Changing secondary method while split is active ──
    if (dto.secondaryMethodId !== undefined && schedule.splitEnabled) {
      await this.validateSecondaryMethod(contractorId, dto.secondaryMethodId, schedule.primaryMethodId);

      await this.scheduleRepo.update(schedule.id, {
        secondaryMethodId: dto.secondaryMethodId,
      });

      await this.auditService.log({
        contractorId,
        actorType: 'contractor',
        actorId: contractorId,
        action: 'split.secondary_method_changed',
        metadata: { scheduleId: schedule.id, secondaryMethodId: dto.secondaryMethodId },
      });

      this.logger.log(`Split secondary method changed for ${contractorId}`);
      return this.formatSplitResponse(schedule.id, contractorId);
    }

    // No-op — nothing changed
    return this.formatSplitResponse(schedule.id, contractorId);
  }

  // ─── PS-18 §7.1: Called when secondary method is removed/deactivated ──
  async onSecondaryMethodRemoved(contractorId: string, methodId: string): Promise<void> {
    const schedule = await this.scheduleRepo.findOne({ where: { contractorId } });
    if (!schedule || !schedule.splitEnabled) return;
    if (schedule.secondaryMethodId !== methodId) return;

    await this.scheduleRepo.update(schedule.id, {
      splitEnabled: false,
      splitDisabledAt: new Date(),
      primarySplitPercent: 100.00,
      secondaryMethodId: null,
    });

    await this.auditService.log({
      contractorId,
      actorType: 'service',
      actorId: 'split-service',
      action: 'split.auto_disabled_secondary_removed',
      metadata: { scheduleId: schedule.id, removedMethodId: methodId },
    });

    this.logger.log(`Split auto-disabled for ${contractorId}: secondary method ${methodId} removed`);
  }

  // ─── PS-18 §7.2: Called when primary method is removed ──
  async onPrimaryMethodRemoved(
    contractorId: string,
    methodId: string,
    promoteSecondary: boolean,
  ): Promise<void> {
    const schedule = await this.scheduleRepo.findOne({ where: { contractorId } });
    if (!schedule) return;

    if (promoteSecondary && schedule.splitEnabled && schedule.secondaryMethodId) {
      // Promote secondary → new primary, disable split
      await this.scheduleRepo.update(schedule.id, {
        primaryMethodId: schedule.secondaryMethodId,
        secondaryMethodId: null,
        splitEnabled: false,
        splitDisabledAt: new Date(),
        primarySplitPercent: 100.00,
      });

      await this.auditService.log({
        contractorId,
        actorType: 'service',
        actorId: 'split-service',
        action: 'split.primary_removed_secondary_promoted',
        metadata: {
          scheduleId: schedule.id,
          removedMethodId: methodId,
          promotedMethodId: schedule.secondaryMethodId,
        },
      });

      this.logger.log(`Split: secondary promoted to primary for ${contractorId}`);
    } else {
      // Clear split entirely
      await this.scheduleRepo.update(schedule.id, {
        primaryMethodId: null,
        secondaryMethodId: null,
        splitEnabled: false,
        splitDisabledAt: new Date(),
        primarySplitPercent: 100.00,
      });

      this.logger.log(`Split cleared for ${contractorId}: primary removed, no promotion`);
    }
  }

  // ─── Validate secondary method (PS-18 §9) ────────────────────
  private async validateSecondaryMethod(
    contractorId: string,
    secondaryMethodId: string,
    primaryMethodId: string | null,
  ): Promise<void> {
    // Same method check
    if (secondaryMethodId === primaryMethodId) {
      throw new PayoutError(
        'Secondary method must be different from primary method.',
        HttpStatus.BAD_REQUEST,
        'ERR_SPLIT_SAME_METHOD',
      );
    }

    // Active + verified check
    const method = await this.methodRepo.findOne({
      where: { id: secondaryMethodId, contractorId, isActive: true },
    });
    if (!method) {
      throw new PayoutError(
        'Secondary deposit method not found or inactive.',
        HttpStatus.BAD_REQUEST,
        'ERR_SPLIT_METHOD_NOT_VERIFIED',
      );
    }
    if (method.verificationStatus !== VerificationStatus.VERIFIED) {
      throw new PayoutError(
        'Secondary deposit method must be verified.',
        HttpStatus.BAD_REQUEST,
        'ERR_SPLIT_METHOD_NOT_VERIFIED',
      );
    }
  }

  // ─── Format response ─────────────────────────────────────────
  private async formatSplitResponse(scheduleId: string, contractorId: string) {
    const schedule = await this.scheduleRepo.findOneOrFail({ where: { id: scheduleId } });

    const primaryMethod = schedule.primaryMethodId
      ? await this.methodRepo.findOne({ where: { id: schedule.primaryMethodId } })
      : null;
    const secondaryMethod = schedule.secondaryMethodId
      ? await this.methodRepo.findOne({ where: { id: schedule.secondaryMethodId } })
      : null;

    return {
      scheduleId: schedule.id,
      splitEnabled: schedule.splitEnabled,
      primarySplitPercent: parseFloat(String(schedule.primarySplitPercent)),
      secondarySplitPercent: schedule.splitEnabled
        ? Math.round((100.00 - parseFloat(String(schedule.primarySplitPercent))) * 100) / 100
        : 0,
      primaryMethod: primaryMethod
        ? { id: primaryMethod.id, displayLabel: primaryMethod.displayLabel, methodType: primaryMethod.methodType }
        : null,
      secondaryMethod: secondaryMethod
        ? { id: secondaryMethod.id, displayLabel: secondaryMethod.displayLabel, methodType: secondaryMethod.methodType }
        : null,
      splitEnabledAt: schedule.splitEnabledAt?.toISOString() ?? null,
      splitDisabledAt: schedule.splitDisabledAt?.toISOString() ?? null,
    };
  }
}
