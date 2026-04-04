// apps/payout-service/src/methods/methods.service.ts
// PS-04 + PS-18 §7: Deposit method CRUD with split-aware deletion
import { Injectable, Logger, HttpStatus, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository }    from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { ConfigService }       from '@nestjs/config';
import { randomUUID, createHash } from 'crypto';

import { DepositMethod, MethodType, VerificationStatus, CryptoProvider } from '../entities/deposit-method.entity';
import { DepositMethodVerification } from '../entities/deposit-method-verification.entity';
import { PayoutSchedule }      from '../entities/payout-schedule.entity';
import { AuditService }        from '../audit/audit.service';
import { PayoutPublisher }     from '../publishers/payout.publisher';
import { PayoutError }         from '../common/errors/payout.error';
import { AddMethodDto }        from './dto/add-method.dto';
import { BankValidationService } from './bank-validation.service';
import { BankEncryptionService } from './bank-encryption.service';
import { UpdateMethodDto }     from './dto/update-method.dto';
import { CryptoConnectionService } from '../crypto/crypto-connection.service';

const MAX_METHODS = 5;

@Injectable()
export class MethodsService {
  private readonly logger = new Logger(MethodsService.name);

  constructor(
    @InjectRepository(DepositMethod)
    private readonly methodRepo: Repository<DepositMethod>,
    @InjectRepository(DepositMethodVerification)
    private readonly verifyRepo: Repository<DepositMethodVerification>,
    @InjectRepository(PayoutSchedule)
    private readonly scheduleRepo: Repository<PayoutSchedule>,
    private readonly dataSource: DataSource,
    private readonly config: ConfigService,
    private readonly auditService: AuditService,
    private readonly publisher: PayoutPublisher,
    private readonly bankValidator: BankValidationService,
    private readonly bankEncryption: BankEncryptionService,
    private readonly cryptoConnectionService: CryptoConnectionService,
  ) {}

  // ─── GET /v1/deposit-methods ──────────────────────────────────
  async listMethods(contractorId: string) {
    const methods = await this.methodRepo.find({
      where: { contractorId, isActive: true },
      order: { isDefault: 'DESC', createdAt: 'ASC' },
    });

    return {
      methods: methods.map(m => this.toListItem(m)),
      totalCount: methods.length,
      maxAllowed: MAX_METHODS,
      canAddMore: methods.length < MAX_METHODS,
    };
  }

  // ─── POST /v1/deposit-methods ─────────────────────────────────
  async addMethod(contractorId: string, dto: AddMethodDto) {
    const count = await this.methodRepo.count({ where: { contractorId, isActive: true } });
    if (count >= MAX_METHODS) {
      throw new PayoutError(`You can have a maximum of ${MAX_METHODS} deposit methods.`,
        HttpStatus.BAD_REQUEST, 'ERR_DEPOSIT_METHOD_LIMIT_REACHED');
    }

    if (dto.methodType === 'TEQ_COIN' && this.config.get('FEATURE_TEQ_COIN_ENABLED') !== 'true') {
      throw new PayoutError('This deposit method is not currently available.',
        HttpStatus.BAD_REQUEST, 'ERR_DEPOSIT_METHOD_UNAVAILABLE');
    }
    if (dto.methodType === 'MARKETEQ_DEBIT_CARD' && this.config.get('FEATURE_DEBIT_CARD_ENABLED') !== 'true') {
      throw new PayoutError('This deposit method is not currently available.',
        HttpStatus.BAD_REQUEST, 'ERR_DEPOSIT_METHOD_UNAVAILABLE');
    }

    if (dto.methodType === 'CRYPTO') {
      if (!dto.cryptoProvider || !Object.values(CryptoProvider).includes(dto.cryptoProvider as CryptoProvider)) {
        throw new PayoutError('Unsupported crypto provider.',
          HttpStatus.UNPROCESSABLE_ENTITY, 'ERR_CRYPTO_PROVIDER_UNSUPPORTED');
      }
      if (!dto.cryptoAddress) {
        throw new PayoutError('Wallet address is required for crypto methods.',
          HttpStatus.BAD_REQUEST, 'ERR_CRYPTO_ADDRESS_REQUIRED');
      }
      if (!dto.cryptoNetwork) {
        throw new PayoutError('Network is required for crypto methods.',
          HttpStatus.BAD_REQUEST, 'ERR_CRYPTO_NETWORK_REQUIRED');
      }

      const cryptoMethod = await this.cryptoConnectionService.connectManual(contractorId, {
        cryptoProvider: dto.cryptoProvider,
        walletAddress: dto.cryptoAddress,
        network: dto.cryptoNetwork,
        token: dto.cryptoCurrency ?? 'ETH',
      });

      return {
        depositMethodId: cryptoMethod.id,
        verificationStatus: 'verified',
        walletAddressLast6: cryptoMethod.walletAddressLast6,
        network: cryptoMethod.cryptoNetwork,
        token: cryptoMethod.cryptoCurrency,
        conversionDisplay: cryptoMethod.conversionDisplay ?? `1 ${dto.cryptoCurrency ?? 'ETH'} (rate unavailable)`,
      };
    }

    const method = this.methodRepo.create({
      contractorId,
      methodType: dto.methodType as MethodType,
      isDefault: false,
      isActive: true,
      verificationStatus: VerificationStatus.PENDING,
    });

    switch (dto.methodType) {
      case 'BANK_MANUAL':
        this.bankValidator.validate(dto);
        // PS-19 §3.1: Duplicate method dedup via account number hash
        const rawAccount = dto.bankAccountNumber ?? dto.bankIban ?? '';
        if (rawAccount) {
          const accountHash = createHash('sha256').update(rawAccount.replace(/\s/g, '').toLowerCase()).digest('hex');
          const existingMethod = await this.methodRepo.findOne({
            where: { contractorId, accountNumberHash: accountHash, isActive: true },
          });
          if (existingMethod) {
            return {
              depositMethodId: existingMethod.id,
              verificationStatus: existingMethod.verificationStatus,
              message: 'This account is already linked.',
              duplicate: true,
            };
          }
          method.accountNumberHash = accountHash;
        }
        method.bankAccountName = dto.bankAccountName ?? null;
        method.bankAccountLast4 = this.bankEncryption.last4(dto.bankAccountNumber ?? dto.bankIban ?? '');
        method.bankCountry = dto.bankCountry ?? null;
        method.bankCurrency = dto.bankCurrency ?? null;
        method.bankIbanLast4 = dto.bankIban ? dto.bankIban.slice(-4) : null;
        method.displayLabel = this.bankValidator.generateDisplayLabel(dto);
        break;
      case 'BANK_STRIPE':
        method.displayLabel = 'Stripe Bank (pending verification)';
        break;
      case 'PAYPAL':
        method.displayLabel = 'PayPal (pending authorization)';
        break;
      case 'WISE':
        method.displayLabel = 'Wise (pending authorization)';
        break;
      case 'PAYONEER':
        method.displayLabel = 'Payoneer (pending authorization)';
        break;
    }

    await this.methodRepo.save(method);

    const verification = await this.createVerification(method, dto);

    await this.auditService.log({
      contractorId, actorType: 'contractor', actorId: contractorId,
      action: 'method.added',
      metadata: { methodId: method.id, methodType: method.methodType },
    });

    return {
      depositMethodId: method.id,
      verificationStatus: 'pending',
      verification,
    };
  }

  // ─── GET /v1/deposit-methods/:id ──────────────────────────────
  async getMethod(contractorId: string, methodId: string) {
    const method = await this.findOwnedMethod(contractorId, methodId);
    return this.toDetailItem(method);
  }

  // ─── PATCH /v1/deposit-methods/:id ────────────────────────────
  async updateMethod(contractorId: string, methodId: string, dto: UpdateMethodDto) {
    const method = await this.findOwnedMethod(contractorId, methodId);

    if (dto.nickname !== undefined) {
      if (dto.nickname.length > 64) {
        throw new PayoutError('Nickname must be 64 characters or less.',
          HttpStatus.BAD_REQUEST, 'ERR_DEPOSIT_NICKNAME_TOO_LONG');
      }
      method.nickname = dto.nickname;
    }

    if (dto.isDefault === true) {
      await this.setDefault(contractorId, methodId);
      method.isDefault = true;
    }

    await this.methodRepo.save(method);
    return this.toDetailItem(method);
  }

  // ─── POST /v1/deposit-methods/:id/set-default ─────────────────
  async setDefault(contractorId: string, methodId: string): Promise<{ success: boolean }> {
    const method = await this.findOwnedMethod(contractorId, methodId);

    if (method.verificationStatus !== VerificationStatus.VERIFIED) {
      throw new PayoutError('Only verified methods can be set as default.',
        HttpStatus.UNPROCESSABLE_ENTITY, 'ERR_DEPOSIT_METHOD_UNVERIFIED');
    }

    await this.dataSource.transaction(async (em) => {
      await em.update(DepositMethod,
        { contractorId, isDefault: true },
        { isDefault: false },
      );
      await em.update(DepositMethod, methodId, { isDefault: true });

      const schedule = await em.findOne(PayoutSchedule, { where: { contractorId } });
      if (schedule && schedule.primaryMethodId !== methodId) {
        await em.update(PayoutSchedule, schedule.id, { primaryMethodId: methodId });
      }

      await this.auditService.log({
        contractorId, actorType: 'contractor', actorId: contractorId,
        action: 'method.set_default',
        metadata: { methodId, methodType: method.methodType },
      });
    });

    return { success: true };
  }

  // ─── DELETE /v1/deposit-methods/:id (PS-04 + PS-18 §7) ───────
  async deactivate(contractorId: string, methodId: string) {
    const method = await this.findOwnedMethod(contractorId, methodId);

    // PS-18 §7.3: Cannot remove only active method
    const activeCount = await this.methodRepo.count({ where: { contractorId, isActive: true } });
    if (activeCount === 1) {
      throw new PayoutError(
        'You cannot remove your only payout method. Add another method before removing this one.',
        HttpStatus.CONFLICT,
        'ERR_CANNOT_REMOVE_ONLY_METHOD',
      );
    }

    const wasDefault = method.isDefault;
    const schedule = await this.scheduleRepo.findOne({ where: { contractorId } });
    const wasPrimary = schedule?.primaryMethodId === methodId;
    const wasSecondary = schedule?.secondaryMethodId === methodId;

    // PS-18 §7.2: Cannot remove default/primary when split active and no other verified method
    if (wasPrimary && schedule?.splitEnabled) {
      const otherVerified = await this.methodRepo.count({
        where: { contractorId, isActive: true, verificationStatus: VerificationStatus.VERIFIED },
      });
      // Count includes the method being removed, so check > 1
      if (otherVerified <= 1) {
        throw new PayoutError(
          'Cannot remove your default method while split is active and no other verified method exists.',
          HttpStatus.CONFLICT,
          'ERR_CANNOT_REMOVE_DEFAULT_WITH_SPLIT',
        );
      }
    }

    await this.dataSource.transaction(async (em) => {
      await em.update(DepositMethod, methodId, {
        isActive: false, isDefault: false, deactivatedAt: new Date(),
      });

      if (schedule) {
        const updates: any = {};

        if (wasSecondary) {
          // PS-18 §7.1: Secondary removed → split disabled, primary gets 100%
          updates.secondaryMethodId = null;
          updates.splitEnabled = false;
          updates.splitDisabledAt = new Date();
          updates.primarySplitPercent = 100.00;
        } else if (wasPrimary) {
          if (schedule.splitEnabled && schedule.secondaryMethodId) {
            // PS-18 §7.2: Primary removed, promote secondary
            updates.primaryMethodId = schedule.secondaryMethodId;
            updates.secondaryMethodId = null;
            updates.splitEnabled = false;
            updates.splitDisabledAt = new Date();
            updates.primarySplitPercent = 100.00;
          } else {
            // Not split — just clear primary
            updates.primaryMethodId = null;
            updates.secondaryMethodId = null;
            updates.splitEnabled = false;
            updates.primarySplitPercent = 100.00;
          }
        }

        if (Object.keys(updates).length) {
          await em.update(PayoutSchedule, schedule.id, updates);
        }
      }

      await this.auditService.log({
        contractorId, actorType: 'contractor', actorId: contractorId,
        action: 'method.removed',
        metadata: { methodId, wasDefault, wasPrimary, wasSecondary },
      });
    });

    // Determine notification message (PS-18 §7.1/§7.2)
    let message = 'Deposit method removed.';
    let splitDisabled = false;

    if (wasSecondary && schedule?.splitEnabled) {
      message = `Your split payout has been turned off because you removed ${method.displayLabel ?? 'a deposit method'}. All payouts will now go to your primary account.`;
      splitDisabled = true;
    } else if (wasPrimary && schedule?.splitEnabled && schedule?.secondaryMethodId) {
      message = 'Your payout method has been updated. Split has been turned off.';
      splitDisabled = true;
    }

    if (wasDefault || wasPrimary) {
      await this.publisher.publishPayoutsPaused(contractorId, {
        reason: 'default_method_removed', methodId, methodType: method.methodType,
      });
    }

    return {
      deactivated: true,
      splitDisabled,
      splitReset: wasPrimary,
      payoutsPaused: wasDefault || wasPrimary,
      message,
    };
  }

  // ─── GET /v1/deposit-methods/:id/verification-status ──────────
  async getVerificationStatus(contractorId: string, methodId: string) {
    const method = await this.findOwnedMethod(contractorId, methodId);
    const verification = await this.verifyRepo.findOne({
      where: { depositMethodId: methodId },
      order: { createdAt: 'DESC' },
    });

    return {
      depositMethodId: method.id,
      verificationStatus: method.verificationStatus,
      reauthRequired: false,
      attemptsRemaining: verification?.maxAttempts
        ? verification.maxAttempts - (verification.attemptCount ?? 0) : null,
      lockedUntil: verification?.lockedUntil?.toISOString() ?? null,
      expiresAt: verification?.expiresAt?.toISOString() ?? null,
      message: this.verificationMessage(method.verificationStatus),
    };
  }

  // ─── Private Helpers ──────────────────────────────────────────
  private async findOwnedMethod(contractorId: string, methodId: string): Promise<DepositMethod> {
    const method = await this.methodRepo.findOne({
      where: { id: methodId, contractorId, isActive: true },
    });
    if (!method) throw new PayoutError('Deposit method not found.',
      HttpStatus.NOT_FOUND, 'ERR_DEPOSIT_METHOD_NOT_FOUND');
    return method;
  }

  private async createVerification(method: DepositMethod, dto: AddMethodDto) {
    switch (method.methodType) {
      case MethodType.BANK_STRIPE:
        const stripeVerify = this.verifyRepo.create({
          depositMethodId: method.id, contractorId: method.contractorId,
          verificationType: 'stripe_fc', status: VerificationStatus.PENDING,
          expiresAt: new Date(Date.now() + 15 * 60 * 1000),
        });
        await this.verifyRepo.save(stripeVerify);
        return { type: 'stripe_fc', oauthUrl: `https://connect.stripe.com/oauth/authorize?state=${randomUUID()}`, expiresAt: stripeVerify.expiresAt!.toISOString() };

      case MethodType.BANK_MANUAL:
        const amount1 = Math.floor(Math.random() * 99) + 1;
        const amount2 = Math.floor(Math.random() * 99) + 1;
        const manualVerify = this.verifyRepo.create({
          depositMethodId: method.id, contractorId: method.contractorId,
          verificationType: 'micro_deposit', status: VerificationStatus.PENDING,
          amount1Cents: amount1, amount2Cents: amount2,
          maxAttempts: 3, expiresAt: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
        });
        await this.verifyRepo.save(manualVerify);
        return { type: 'micro_deposit', message: 'Two small deposits will arrive in your account within 2 business days.', expiresAt: manualVerify.expiresAt!.toISOString(), maxAttempts: 3 };

      case MethodType.PAYPAL:
      case MethodType.WISE:
      case MethodType.PAYONEER:
        const oauthVerify = this.verifyRepo.create({
          depositMethodId: method.id, contractorId: method.contractorId,
          verificationType: 'oauth', status: VerificationStatus.PENDING,
          oauthState: randomUUID(),
          expiresAt: new Date(Date.now() + 15 * 60 * 1000),
        });
        await this.verifyRepo.save(oauthVerify);
        const providerUrls: Record<string, string> = {
          PAYPAL: 'https://www.paypal.com/connect',
          WISE: 'https://wise.com/oauth/authorize',
          PAYONEER: 'https://payouts.sandbox.payoneer.com/partners/api/v4/auth',
        };
        return { type: 'oauth', oauthUrl: `${providerUrls[method.methodType]}?state=${oauthVerify.oauthState}`, expiresAt: oauthVerify.expiresAt!.toISOString() };

      default:
        return { type: 'none', message: 'No verification required.' };
    }
  }

  private verificationMessage(status: VerificationStatus): string {
    switch (status) {
      case VerificationStatus.PENDING: return 'Verification in progress.';
      case VerificationStatus.VERIFIED: return 'Method verified and ready for payouts.';
      case VerificationStatus.FAILED: return 'Verification failed. Please try again or add a new method.';
      case VerificationStatus.EXPIRED: return 'Verification expired. Please re-initiate.';
      case VerificationStatus.LOCKED: return 'Too many failed attempts. Locked for 24 hours.';
      default: return '';
    }
  }

  private toListItem(m: DepositMethod) {
    return {
      id: m.id, methodType: m.methodType, displayLabel: m.displayLabel,
      nickname: m.nickname, isDefault: m.isDefault,
      verificationStatus: m.verificationStatus, reauthRequired: false,
      bankCountry: m.bankCountry, bankCurrency: m.bankCurrency,
      createdAt: m.createdAt.toISOString(),
    };
  }

  private toDetailItem(m: DepositMethod) {
    return {
      ...this.toListItem(m),
      cryptoProvider: m.cryptoProvider, cryptoNetwork: m.cryptoNetwork,
      cryptoCurrency: m.cryptoCurrency,
      walletAddressLast6: m.walletAddressLast6,
      conversionDisplay: m.conversionDisplay,
      paypalEmail: m.paypalEmail, wiseAccountId: m.wiseAccountId,
      payoneerPayeeId: m.payoneerPayeeId,
    };
  }
}
