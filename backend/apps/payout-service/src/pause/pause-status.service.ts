// apps/payout-service/src/pause/pause-status.service.ts
// PS-16: Paused Payouts & Alert System
// Evaluates 5 pause conditions, returns structured banner response.

import { Injectable, Logger, HttpStatus } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DepositMethod, MethodType } from '../entities/deposit-method.entity';
import { KycClient } from '../common/kyc.client';
import { AuditService } from '../audit/audit.service';
import { PayoutPublisher } from '../publishers/payout.publisher';
import { PayoutError } from '../common/errors/payout.error';

// PS-16 §2: All pause conditions
export type PauseCondition =
  | 'NO_DEFAULT_METHOD'
  | 'DEFAULT_METHOD_DEACTIVATED'
  | 'DEFAULT_METHOD_REAUTH_REQUIRED'
  | 'OFAC_FLAG'
  | 'ACCOUNT_SUSPENDED';

// PS-16 §4: Priority order (highest first)
const PRIORITY_ORDER: PauseCondition[] = [
  'OFAC_FLAG',
  'ACCOUNT_SUSPENDED',
  'DEFAULT_METHOD_REAUTH_REQUIRED',
  'DEFAULT_METHOD_DEACTIVATED',
  'NO_DEFAULT_METHOD',
];

export interface BannerCopy {
  headline: string;
  body: string;
  ctaLabel: string;
  ctaUrl: string;
  style: 'warning' | 'critical';
}

export interface PauseStatusResult {
  paused: boolean;
  activeCondition: PauseCondition | null;
  priority: number | null;
  bannerCopy: BannerCopy | null;
  allConditions: Array<{ condition: PauseCondition; active: boolean }>;
}

@Injectable()
export class PauseStatusService {
  private readonly logger = new Logger(PauseStatusService.name);

  constructor(
    @InjectRepository(DepositMethod)
    private readonly methodRepo: Repository<DepositMethod>,
    private readonly kycClient: KycClient,
    private readonly auditService: AuditService,
    private readonly publisher: PayoutPublisher,
  ) {}

  // ─── PS-16 §5: Get current pause status ─────────────────────
  async getPauseStatus(contractorId: string): Promise<PauseStatusResult> {
    const activeConditions: PauseCondition[] = [];

    // Run condition checks
    const [defaultMethod, inactiveDefault, kycStatus] = await Promise.all([
      this.methodRepo.findOne({
        where: { contractorId, isDefault: true, isActive: true },
      }),
      this.methodRepo.findOne({
        where: { contractorId, isDefault: true, isActive: false },
      }),
      this.kycClient.getStatus(contractorId),
    ]);

    // PS-16 §2: NO_DEFAULT_METHOD
    if (!defaultMethod) {
      activeConditions.push('NO_DEFAULT_METHOD');
    }

    // PS-16 §2: DEFAULT_METHOD_DEACTIVATED
    if (inactiveDefault) {
      activeConditions.push('DEFAULT_METHOD_DEACTIVATED');
    }

    // PS-16 §2: DEFAULT_METHOD_REAUTH_REQUIRED
    if (defaultMethod?.reauthRequired) {
      activeConditions.push('DEFAULT_METHOD_REAUTH_REQUIRED');
    }

    // PS-16 §2: ACCOUNT_SUSPENDED (from KYC client)
    if (kycStatus.suspended) {
      activeConditions.push('ACCOUNT_SUSPENDED');
    }

    // PS-16 §2: OFAC_FLAG. kyc-identity-service's gate-status response does
    // not carry ofacFlagged yet (confirmed — no such field in its contract
    // today), so kycStatus.ofacFlagged reads undefined/falsy and this never
    // fires until that service adds it. Wired for real the moment it does —
    // payout-service has no sanctions data of its own to check against.
    if (kycStatus.ofacFlagged) {
      activeConditions.push('OFAC_FLAG');
    }

    // Build response with all conditions
    const allConditions = PRIORITY_ORDER.map(c => ({
      condition: c,
      active: activeConditions.includes(c),
    }));

    if (activeConditions.length === 0) {
      return {
        paused: false,
        activeCondition: null,
        priority: null,
        bannerCopy: null,
        allConditions,
      };
    }

    // PS-16 §4: Apply priority — show highest priority condition
    const activeCondition = PRIORITY_ORDER.find(c => activeConditions.includes(c))!;
    const priority = PRIORITY_ORDER.indexOf(activeCondition) + 1;
    const bannerCopy = this.buildBannerCopy(activeCondition, defaultMethod);

    return {
      paused: true,
      activeCondition,
      priority,
      bannerCopy,
      allConditions,
    };
  }

  // ─── PS-16 §6: Assert not paused (gate for initiation + execution) ──
  async assertNotPaused(contractorId: string): Promise<void> {
    const status = await this.getPauseStatus(contractorId);
    if (!status.paused) return;

    const errorMap: Record<PauseCondition, string> = {
      NO_DEFAULT_METHOD: 'ERR_PAYOUT_NO_DEFAULT_METHOD',
      DEFAULT_METHOD_DEACTIVATED: 'ERR_PAYOUT_METHOD_DEACTIVATED',
      DEFAULT_METHOD_REAUTH_REQUIRED: 'ERR_PAYOUT_METHOD_REAUTH_REQUIRED',
      OFAC_FLAG: 'ERR_PAYOUT_OFAC_BLOCKED',
      ACCOUNT_SUSPENDED: 'ERR_PAYOUT_ACCOUNT_SUSPENDED',
    };

    throw new PayoutError(
      'Payouts are currently paused on your account.',
      HttpStatus.FORBIDDEN,
      errorMap[status.activeCondition!],
      { condition: status.activeCondition, bannerCopy: status.bannerCopy },
    );
  }

  // ─── PS-16 §7.3: Evaluate and publish pause state change ───
  async evaluateAndPublishPauseChange(
    contractorId: string,
    previouslyPaused: boolean,
  ): Promise<void> {
    const current = await this.getPauseStatus(contractorId);

    if (!previouslyPaused && current.paused) {
      // Transition: not paused → paused
      this.logger.log(`Pause triggered for ${contractorId}: ${current.activeCondition}`);
      await this.publisher.publishPayoutsPaused(contractorId, {
        condition: current.activeCondition,
        occurredAt: new Date().toISOString(),
      });

      await this.auditService.log({
        contractorId,
        actorType: 'service',
        actorId: 'pause-status-service',
        action: 'payouts.paused',
        metadata: { condition: current.activeCondition },
      });
    }

    if (previouslyPaused && !current.paused) {
      // Transition: paused → resumed
      this.logger.log(`Payouts resumed for ${contractorId}`);
      await this.publisher.publishPayoutsResumed(contractorId, {
        occurredAt: new Date().toISOString(),
      });

      await this.auditService.log({
        contractorId,
        actorType: 'service',
        actorId: 'pause-status-service',
        action: 'payouts.resumed',
      });
    }
  }

  // ─── PS-16 §3: Build banner copy per condition ──────────────
  private buildBannerCopy(
    condition: PauseCondition,
    defaultMethod: DepositMethod | null,
  ): BannerCopy {
    switch (condition) {
      case 'NO_DEFAULT_METHOD':
        return {
          headline: 'Your payouts are paused.',
          body: "You don't have a default payout method set.",
          ctaLabel: 'Set default payout method',
          ctaUrl: '/settings/payouts',
          style: 'warning',
        };

      case 'DEFAULT_METHOD_DEACTIVATED':
        return {
          headline: 'Your payouts are paused.',
          body: 'Your default payout method has been deactivated and can no longer receive payouts.',
          ctaLabel: 'Update payout method',
          ctaUrl: '/settings/payouts',
          style: 'warning',
        };

      case 'DEFAULT_METHOD_REAUTH_REQUIRED': {
        const providerName = this.providerLabel(defaultMethod?.methodType);
        return {
          headline: 'Your payouts are paused.',
          body: `Your ${providerName} connection has expired. Reconnect your account to resume payouts.`,
          ctaLabel: `Reconnect ${providerName}`,
          ctaUrl: `/settings/payouts?reauth=${defaultMethod?.id ?? ''}`,
          style: 'warning',
        };
      }

      case 'OFAC_FLAG':
        return {
          headline: 'Your payouts are paused.',
          body: 'Your account has been flagged for a compliance review. Payouts are unavailable while this review is in progress.',
          ctaLabel: 'Contact support',
          ctaUrl: 'https://support.marketeq.com',
          style: 'critical',
        };

      case 'ACCOUNT_SUSPENDED':
        return {
          headline: 'Your payouts are paused.',
          body: 'Your account has been suspended. Please contact support for more information.',
          ctaLabel: 'Contact support',
          ctaUrl: 'https://support.marketeq.com',
          style: 'critical',
        };
    }
  }

  private providerLabel(methodType?: MethodType | null): string {
    const map: Record<string, string> = {
      WISE: 'Wise',
      PAYONEER: 'Payoneer',
    };
    return map[methodType ?? ''] ?? 'payment provider';
  }
}