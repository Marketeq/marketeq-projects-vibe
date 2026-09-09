// apps/payout-service/src/methods/methods.service.ts
// PS-04 + PS-18 §7: Deposit method CRUD with split-aware deletion
import { Injectable, Logger, HttpStatus, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository }    from '@nestjs/typeorm';
import { Repository, DataSource, In } from 'typeorm';
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
import { OAuthService } from '../oauth/oauth.service';
import { StripeProvider } from '../providers/stripe.provider';

@Injectable()
export class MethodsService {
  private readonly logger = new Logger(MethodsService.name);
  // Doc07 Domain 10: method-count caps must come from server configuration,
  // not a hardcoded constant — MAX_DEPOSIT_METHODS lets ops raise/lower the
  // cap without a code deploy. 5 remains the default if unset.
  private readonly maxMethods: number;

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
    private readonly oauthService: OAuthService,
    private readonly stripeProvider: StripeProvider,
  ) {
    this.maxMethods = parseInt(this.config.get('MAX_DEPOSIT_METHODS', '5'), 10) || 5;
  }

  // ─── GET /v1/deposit-methods/config — SCR-20 ────────────────────
  // Feature-flag state must come from server config, never a frontend build-time
  // env var (a stale frontend build could otherwise show an option the backend
  // will reject, or hide one the backend has since enabled).
  getMethodTypeConfig() {
    return {
      featureFlags: {
        debitCardEnabled: this.config.get('FEATURE_DEBIT_CARD_ENABLED', 'false') === 'true',
        teqCoinEnabled: this.config.get('FEATURE_TEQ_COIN_ENABLED', 'false') === 'true',
      },
      maxMethods: this.maxMethods,
    };
  }

  // ─── GET /v1/deposit-methods ──────────────────────────────────
  async listMethods(contractorId: string) {
    const methods = await this.methodRepo.find({
      where: { contractorId, isActive: true },
      order: { isDefault: 'DESC', createdAt: 'ASC' },
    });

    // AC-01.06: locked methods must surface their lock expiry in the list.
    const lockedIds = methods
      .filter(m => m.verificationStatus === VerificationStatus.LOCKED)
      .map(m => m.id);
    const lockedUntilByMethodId = new Map<string, Date>();
    if (lockedIds.length) {
      const verifications = await this.verifyRepo.find({
        where: { depositMethodId: In(lockedIds) },
        order: { createdAt: 'DESC' },
      });
      for (const v of verifications) {
        if (v.depositMethodId && !lockedUntilByMethodId.has(v.depositMethodId) && v.lockedUntil) {
          lockedUntilByMethodId.set(v.depositMethodId, v.lockedUntil);
        }
      }
    }

    return {
      methods: methods.map(m => this.toListItem(m, lockedUntilByMethodId.get(m.id) ?? null)),
      totalCount: methods.length,
      maxAllowed: this.maxMethods,
      canAddMore: methods.length < this.maxMethods,
    };
  }

  // ─── POST /v1/deposit-methods ─────────────────────────────────
  async addMethod(contractorId: string, dto: AddMethodDto) {
    const count = await this.methodRepo.count({ where: { contractorId, isActive: true } });
    if (count >= this.maxMethods) {
      throw new PayoutError(`You can have a maximum of ${this.maxMethods} deposit methods.`,
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

    // WISE/PAYONEER: real OAuth — delegate entirely to OAuthService,
    // which creates the pending DepositMethod itself, stores OAuth state in
    // Redis, and builds a real provider authorize URL from the configured
    // client_id/redirect_uri/scopes. The block below (which used to build a
    // fabricated, non-functional "authorize" URL with no client_id or
    // redirect_uri — connecting an account was never actually possible)
    // must never run for these method types.
    if (dto.methodType === 'WISE' || dto.methodType === 'PAYONEER') {
      const result = await this.oauthService.initiateOAuth(contractorId, dto.methodType as MethodType);
      return {
        depositMethodId: result.depositMethodId,
        verificationStatus: 'pending',
        verification: { type: 'oauth', oauthUrl: result.redirectUrl, expiresAt: result.expiresAt },
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
        // Needed to actually send real Stripe ACH micro-deposits (PS-08) —
        // accountNumberHash above is one-way and can never be reversed back
        // into the account number. Only bankAccountNumber (not IBAN) maps to
        // Stripe's us_bank_account type, so IBAN-only regions store nothing here.
        if (dto.bankAccountNumber) {
          method.bankAccountNumberEncrypted = this.bankEncryption.encrypt(dto.bankAccountNumber);
        }
        method.bankAccountName = dto.bankAccountName ?? null;
        method.bankAccountLast4 = this.bankEncryption.last4(dto.bankAccountNumber ?? dto.bankIban ?? '');
        method.bankRoutingNumber = dto.bankRoutingNumber ?? null;
        method.bankCountry = dto.bankCountry ?? null;
        method.bankCurrency = dto.bankCurrency ?? null;
        method.bankIbanLast4 = dto.bankIban ? dto.bankIban.slice(-4) : null;
        method.displayLabel = this.bankValidator.generateDisplayLabel(dto);
        break;
      case 'BANK_STRIPE':
        method.displayLabel = 'Stripe Bank (pending verification)';
        break;
    }

    if (dto.nickname) method.nickname = dto.nickname;
    await this.methodRepo.save(method);
    let verification: Awaited<ReturnType<typeof this.createVerification>>;
    try {
      verification = await this.createVerification(method, dto);
    } catch (err) {
      // createVerification (e.g. the real Stripe ACH send for BANK_MANUAL/US)
      // can fail after the method row above is already saved — an invalid
      // account/routing number Stripe itself rejects, network error, etc.
      // Without this cleanup the failed method sits forever as an orphaned
      // "pending" row that still counts against the 5-method cap and blocks
      // a legitimate retry with corrected details.
      await this.methodRepo.delete(method.id);
      throw err;
    }
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

    // US-59: full bank-detail edit. Only for BANK_MANUAL methods that
    // haven't completed verification — once VERIFIED, silently changing the
    // underlying account number without re-verifying it would let a
    // compromised session redirect future payouts, so those must be
    // removed and re-added instead (US-62's "up to 3 days" copy only
    // applies to this path, since it always restarts micro-deposit
    // verification below).
    const bankFields: (keyof UpdateMethodDto)[] = [
      'bankAccountName', 'bankAccountNumber', 'bankCountry', 'bankCurrency',
      'bankRoutingNumber', 'bankIban', 'bankSwiftBic', 'bankIfscCode',
      'bankBsbNumber', 'bankSortCode', 'bankCode', 'bankBranchCode',
      'bankInstitutionNumber', 'bankTransitNumber', 'bankClabe',
      'bankCnapsCode', 'bankBik', 'bankKorrespondentAccount', 'bankCpfCnpj',
      'bankAgencia', 'bankConta',
    ];
    const isBankDetailEdit = bankFields.some((f) => dto[f] !== undefined);

    if (isBankDetailEdit) {
      if (method.methodType !== MethodType.BANK_MANUAL) {
        throw new PayoutError('Bank details can only be edited for manually-added bank accounts.',
          HttpStatus.BAD_REQUEST, 'ERR_DEPOSIT_METHOD_NOT_EDITABLE');
      }
      if (method.verificationStatus === VerificationStatus.VERIFIED) {
        throw new PayoutError('A verified account cannot be edited — remove it and add a new one instead.',
          HttpStatus.CONFLICT, 'ERR_DEPOSIT_METHOD_VERIFIED_LOCKED');
      }

      // US-63: BankValidationService throws PayoutError with the exact
      // ERR_BANK_* code as its message — the frontend maps these to a
      // friendly checklist rather than showing the raw code.
      this.bankValidator.validate(dto);

      const rawAccount = dto.bankAccountNumber ?? dto.bankIban ?? '';
      if (rawAccount) {
        const accountHash = createHash('sha256').update(rawAccount.replace(/\s/g, '').toLowerCase()).digest('hex');
        const existingMethod = await this.methodRepo.findOne({
          where: { contractorId, accountNumberHash: accountHash, isActive: true },
        });
        if (existingMethod && existingMethod.id !== method.id) {
          throw new PayoutError('This account is already linked.',
            HttpStatus.CONFLICT, 'ERR_DEPOSIT_METHOD_DUPLICATE');
        }
        method.accountNumberHash = accountHash;
      }
      if (dto.bankAccountNumber) {
        method.bankAccountNumberEncrypted = this.bankEncryption.encrypt(dto.bankAccountNumber);
      }
      method.bankAccountName = dto.bankAccountName ?? null;
      method.bankAccountLast4 = this.bankEncryption.last4(dto.bankAccountNumber ?? dto.bankIban ?? '');
      method.bankRoutingNumber = dto.bankRoutingNumber ?? null;
      method.bankCountry = dto.bankCountry ?? null;
      method.bankCurrency = dto.bankCurrency ?? null;
      method.bankIbanLast4 = dto.bankIban ? dto.bankIban.slice(-4) : null;
      method.displayLabel = this.bankValidator.generateDisplayLabel(dto);
      method.verificationStatus = VerificationStatus.PENDING;

      // Any changed account number must never inherit a verification that
      // was issued for the old one — expire it and start fresh.
      await this.verifyRepo.update(
        { depositMethodId: method.id, status: VerificationStatus.PENDING },
        { status: VerificationStatus.EXPIRED },
      );
      await this.methodRepo.save(method);
      const verification = await this.createVerification(method, dto as unknown as AddMethodDto);
      await this.auditService.log({
        contractorId, actorType: 'contractor', actorId: contractorId,
        action: 'method.bank_details_updated',
        metadata: { methodId: method.id },
      });
      return { ...this.toDetailItem(method), verification };
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

      case MethodType.BANK_MANUAL: {
        const expiresAt = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000);

        // PS-08: real Stripe ACH micro-deposits only exist for US accounts
        // (Stripe's us_bank_account payment method type is US-only) — every
        // other BANK_MANUAL region falls back to the format-validation-only
        // local flow below, since there is no ACH-equivalent mechanism for them.
        if (method.bankCountry === 'US' && dto.bankAccountNumber && dto.bankRoutingNumber) {
          const result = await this.stripeProvider.initiateManualMicroDeposits(
            method, dto.bankAccountNumber, dto.bankRoutingNumber,
            dto.bankAccountName || method.nickname || 'Account Holder',
          );
          return {
            type: 'micro_deposit',
            message: result.mode === 'stripe'
              ? 'Two small deposits will arrive in your account within 1-2 business days.'
              : 'Two small deposits will arrive in your account within 2 business days.',
            expiresAt: expiresAt.toISOString(), maxAttempts: 3,
          };
        }

        // Real Stripe external_account for the 4 non-US regions verified
        // (live, against Stripe's test API) to actually accept a recipient
        // Connect account: SEPA/IBAN, GB, IN, AU. Without this, the local
        // micro-deposit check below could mark the method "verified" while
        // stripeConnectAccountId/stripeExternalAccountId stayed null forever
        // — bank-payout-executor.service.ts requires both and fails closed
        // with ERR_CONNECT_ACCOUNT_NOT_ATTACHED, so the method would never
        // actually be payable despite showing as verified.
        //
        // Deliberately NOT extended to JP or the generic SWIFT-catchall
        // region here — JP was tested live and rejected by Stripe
        // ("not supported for accounts using the recipient service
        // agreement"), and SWIFT-catchall has no country-specific Stripe
        // format to map onto. Both keep today's existing local-only
        // behavior unchanged pending a separate decision.
        const region = this.bankValidator.detectRegion(method.bankCountry ?? '');
        if (region === 'SEPA' || region === 'GB' || region === 'IN' || region === 'AU') {
          const attached = await this.stripeProvider.attachInternationalBankAsExternalAccount(method, region, dto);
          await this.methodRepo.update(method.id, {
            stripeConnectAccountId: attached.connectAccountId,
            stripeExternalAccountId: attached.externalAccountId,
          } as any);
        }

        const amount1 = Math.floor(Math.random() * 99) + 1;
        const amount2 = Math.floor(Math.random() * 99) + 1;
        const manualVerify = this.verifyRepo.create({
          depositMethodId: method.id, contractorId: method.contractorId,
          verificationType: 'micro_deposit', status: VerificationStatus.PENDING,
          amount1Cents: amount1, amount2Cents: amount2,
          maxAttempts: 3, expiresAt,
        });
        await this.verifyRepo.save(manualVerify);
        return { type: 'micro_deposit', message: 'Two small deposits will arrive in your account within 2 business days.', expiresAt: manualVerify.expiresAt!.toISOString(), maxAttempts: 3 };
      }

      // WISE/PAYONEER no longer reach this method — addMethod()
      // routes them to OAuthService.initiateOAuth() before createVerification()
      // is ever called, since that's the real, credential-backed OAuth flow.

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

  private toListItem(m: DepositMethod, lockedUntil: Date | null = null) {
    return {
      id: m.id, methodType: m.methodType, displayLabel: m.displayLabel,
      nickname: m.nickname, isDefault: m.isDefault,
      verificationStatus: m.verificationStatus, reauthRequired: false,
      bankCountry: m.bankCountry, bankCurrency: m.bankCurrency,
      createdAt: m.createdAt.toISOString(),
      lockedUntil: lockedUntil ? lockedUntil.toISOString() : null,
    };
  }

  private toDetailItem(m: DepositMethod) {
    return {
      ...this.toListItem(m),
      cryptoProvider: m.cryptoProvider, cryptoNetwork: m.cryptoNetwork,
      cryptoCurrency: m.cryptoCurrency,
      walletAddressLast6: m.walletAddressLast6,
      conversionDisplay: m.conversionDisplay,
      // wiseAccountId/payoneerPayeeId predate the real OAuth wiring and are
      // only ever set by the old fake dev-mode manual-entry path (since
      // removed from the frontend) — the real OAuth callback
      // (oauth.service.ts's handleCallback) only ever populates the generic
      // accountEmail/accountIdentifier, uniformly across both providers,
      // so fall back to those.
      wiseAccountId: m.wiseAccountId ?? (m.methodType === MethodType.WISE ? (m.accountEmail ?? m.accountIdentifier) : null),
      payoneerPayeeId: m.payoneerPayeeId ?? (m.methodType === MethodType.PAYONEER ? (m.accountEmail ?? m.accountIdentifier) : null),
    };
  }
}
