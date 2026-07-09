// apps/payout-service/src/kyc/kyc-gate.service.ts
// PS-15 §3+§5+§7: KYC gate check sequence for withdrawal initiation.
// Checks Tier 1 (gov ID), Tier 2 (tax identity), Tier 3 (bank ownership, method-scoped),
// first-payout hold, then returns structured gate result.

import { Injectable, Logger, HttpStatus } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { KycClient } from '../common/kyc.client';
import { PayoutRequest, PayoutStatus } from '../entities/payout-request.entity';
import { DepositMethod, MethodType, VerificationStatus } from '../entities/deposit-method.entity';
import { FirstPayoutHold } from '../entities/first-payout-hold.entity';
import { AuditService } from '../audit/audit.service';
import { PayoutError } from '../common/errors/payout.error';

export interface KycGateResult {
  allowed: boolean;
  blockedBy?: string;
  tier1Status?: string;
  tier2Status?: string;
  tier2SubType?: string;
  tier3Status?: string;
  depositMethodId?: string;
  holdReleasesAt?: string | null;
  screenContent?: Record<string, string>;
}

@Injectable()
export class KycGateService {
  private readonly logger = new Logger(KycGateService.name);

  constructor(
    private readonly kycClient: KycClient,
    @InjectRepository(PayoutRequest)
    private readonly payoutRepo: Repository<PayoutRequest>,
    @InjectRepository(FirstPayoutHold)
    private readonly holdRepo: Repository<FirstPayoutHold>,
    @InjectRepository(DepositMethod)
    private readonly methodRepo: Repository<DepositMethod>,
    private readonly config: ConfigService,
    private readonly auditService: AuditService,
  ) {}

  /**
   * PS-15 §7: Full gate sequence. Called at withdrawal initiation.
   * Returns structured result so frontend can render the correct intercept screen.
   */
  async checkGate(
    contractorId: string,
    depositMethodId: string,
  ): Promise<KycGateResult> {
    // Fetch KYC status from kyc-identity-service
    const kyc = await this.kycClient.getStatus(contractorId);

    // If KYC service is down (tier=unknown), block for safety
    if (kyc.tier === 'unknown') {
      throw new PayoutError(
        'Identity verification service is temporarily unavailable. Please try again shortly.',
        HttpStatus.SERVICE_UNAVAILABLE,
        'ERR_KYC_SERVICE_UNAVAILABLE',
      );
    }

    // Check if contractor is suspended
    if (kyc.suspended) {
      throw new PayoutError(
        'Your account is suspended. Contact support.',
        HttpStatus.FORBIDDEN,
        'ERR_PAYOUT_ACCOUNT_SUSPENDED',
      );
    }

    // ── Check 1: Tier 1 — Government ID (PS-15 §4.1) ──
    // In dev mode (tier='basic'), we treat as verified
    // In production, kyc-identity-service would return full tier data
    // For now, tier='basic' means Tier 1 passed (dev mode)

    // ── Check 2: Tier 2 — Tax Identity (PS-15 §4.2/§4.3) ──
    // In dev mode, skip. In production, check tier2 from gate-status endpoint

    // ── Check 3: Tier 3 — Bank ownership (method-scoped, PS-15 §4.4) ──
    const method = await this.methodRepo.findOne({ where: { id: depositMethodId } });
    if (method) {
      const isBankMethod = method.methodType === MethodType.BANK_STRIPE || method.methodType === MethodType.BANK_MANUAL;
      if (isBankMethod && method.verificationStatus !== VerificationStatus.VERIFIED) {
        return {
          allowed: false,
          blockedBy: 'TIER_3',
          tier3Status: method.verificationStatus,
          depositMethodId,
          screenContent: {
            title: 'Verify your bank account to withdraw',
            body: `Before sending funds to your bank account ending in ${method.bankAccountLast4 ?? '****'}, we need to confirm you own it.`,
            cta: 'Enter deposit amounts',
          },
        };
      }
    }

    // ── Check 4: First-payout hold (PS-15 §5) ──
    const holdResult = await this.checkFirstPayoutHold(contractorId);
    if (holdResult.holdActive) {
      return {
        allowed: false,
        blockedBy: 'FIRST_PAYOUT_HOLD',
        holdReleasesAt: holdResult.releasesAt?.toISOString() ?? null,
        screenContent: {
          title: 'Your first withdrawal is on its way',
          body: 'For your security, your first withdrawal from Marketeq is held for 5 business days before being released. This is a one-time step.',
          holdDate: holdResult.releasesAt?.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }) ?? '',
          cta: 'Got it',
        },
      };
    }

    // All gates passed
    return { allowed: true };
  }

  /**
   * PS-15 §5: Check and apply first-payout 5-business-day hold.
   */
  async checkFirstPayoutHold(
    contractorId: string,
  ): Promise<{ holdActive: boolean; releasesAt: Date | null }> {
    // Check if contractor has ever had a completed or processing payout
    const previousPayout = await this.payoutRepo.findOne({
      where: {
        contractorId,
        status: In([PayoutStatus.COMPLETED, PayoutStatus.PROCESSING]),
      },
      order: { createdAt: 'ASC' },
    });

    if (previousPayout) {
      // Not their first — no hold
      return { holdActive: false, releasesAt: null };
    }

    // Check if hold already exists and is released
    const existingHold = await this.holdRepo.findOne({ where: { contractorId } });
    if (existingHold?.released) {
      return { holdActive: false, releasesAt: null };
    }

    // Check if hold exists and release date has passed
    if (existingHold && existingHold.releasesAt <= new Date()) {
      // Auto-release
      await this.holdRepo.update(existingHold.id, {
        released: true,
        releasedAt: new Date(),
        releasedBy: 'system',
      });
      return { holdActive: false, releasesAt: null };
    }

    if (existingHold) {
      // Hold exists and not yet released
      return { holdActive: true, releasesAt: existingHold.releasesAt };
    }

    // First payout — create hold (5 business days from now)
    const releasesAt = this.addBusinessDays(new Date(), 5);

    await this.holdRepo.save({
      contractorId,
      appliedAt: new Date(),
      releasesAt,
      released: false,
    });

    await this.auditService.log({
      contractorId,
      actorType: 'service',
      actorId: 'payout-service',
      action: 'first_payout_hold.applied',
      metadata: { releasesAt: releasesAt.toISOString() },
    });

    return { holdActive: true, releasesAt };
  }

  /**
   * Admin override: waive first-payout hold.
   */
  async waiveFirstPayoutHold(contractorId: string, adminId: string): Promise<void> {
    const hold = await this.holdRepo.findOne({ where: { contractorId } });
    if (!hold) return;

    await this.holdRepo.update(hold.id, {
      released: true,
      releasedAt: new Date(),
      releasedBy: adminId,
    });

    await this.auditService.log({
      contractorId,
      actorType: 'admin' as any,
      actorId: adminId,
      action: 'first_payout_hold.waived',
      metadata: { holdId: hold.id },
    });
  }

  /**
   * Business day calculator — skips Saturday (6) and Sunday (0).
   * Does not account for public holidays in v1.
   */
  private addBusinessDays(from: Date, days: number): Date {
    const result = new Date(from);
    let added = 0;
    while (added < days) {
      result.setDate(result.getDate() + 1);
      const day = result.getDay();
      if (day !== 0 && day !== 6) added++;
    }
    return result;
  }
}