// apps/payout-service/src/crypto/crypto-connection.service.ts
// PS-10 + PS-11: Crypto wallet connection service
// PS-10: Shared infrastructure (address validation, WalletConnect session, conversion)
// PS-11: Per-provider validation, rejected state, provider-aware chainIds

import { Injectable, Logger, HttpStatus } from '@nestjs/common';
import { InjectRepository }    from '@nestjs/typeorm';
import { Repository }          from 'typeorm';
import { ConfigService }       from '@nestjs/config';
import * as crypto             from 'crypto';
import Redis                   from 'ioredis';
import { DepositMethod, MethodType, VerificationStatus, CryptoProvider } from '../entities/deposit-method.entity';
import { AddressValidatorService } from './address-validator.service';
import { ConversionService }   from './conversion.service';
import { ProviderValidationService } from './provider-validation.service';
import { AuditService }        from '../audit/audit.service';
import { PayoutError }         from '../common/errors/payout.error';
import { getProviderConfig, getWalletConnectChainId } from './provider-registry';
import { WalletConnectClientService } from './walletconnect-client.service';
import { FieldEncryption, RINGS } from '../crypto/field-encryption';

@Injectable()
export class CryptoConnectionService {
  private readonly logger = new Logger(CryptoConnectionService.name);
  private readonly redis: Redis;
  private readonly addressRing: FieldEncryption;
  private readonly wcSessionTtl: number;

  constructor(
    @InjectRepository(DepositMethod)
    private readonly methodRepo: Repository<DepositMethod>,
    private readonly config: ConfigService,
    private readonly addressValidator: AddressValidatorService,
    private readonly conversionSvc: ConversionService,
    private readonly providerValidator: ProviderValidationService,
    private readonly auditService: AuditService,
    private readonly walletConnectClient: WalletConnectClientService,
  ) {
    // Same options as earnings-service CacheService. Without them a bare
    // `new Redis(url)` retries forever and, with no 'error' listener attached,
    // ioredis logs an unhandled error event per attempt — which is what floods
    // the logs when REDIS_URL is unset and this falls back to localhost.
    // enableOfflineQueue:false also makes wcsession reads/writes reject fast
    // instead of queueing against a connection that will never come up.
    this.redis = new Redis(this.config.get<string>('REDIS_URL', 'redis://localhost:6379'), {
      connectTimeout:     parseInt(this.config.get('REDIS_CONNECT_TIMEOUT_MS', '2000'), 10),
      commandTimeout:     parseInt(this.config.get('REDIS_COMMAND_TIMEOUT_MS', '500'), 10),
      lazyConnect:        true,
      enableOfflineQueue: false,
      retryStrategy(times) {
        if (times > 10) return null;
        return Math.min(times * 200, 30_000);
      },
    });

    this.redis.on('error', (err) => {
      this.logger.warn(`Redis unavailable — WalletConnect sessions cannot be stored: ${err.message}`);
    });

    // Same failure mode already fixed for OAUTH_TOKEN_ENCRYPTION_KEY and
    // BANK_ENCRYPTION_KEY: a silent random-key fallback invisibly invalidates
    // every already-encrypted wallet address on restart. Fail fast instead.
    // AC-1.3.3: a key ring rather than a single key, so a rotation no longer
    // makes every stored wallet address unreadable. Still refuses to start on
    // a missing or malformed key, and CRYPTO_ADDRESS_ENCRYPTION_KEY keeps
    // working exactly as set today, registered as k1.
    this.addressRing = new FieldEncryption(RINGS.CRYPTO_ADDRESS, (k) => this.config.get<string>(k));
    this.wcSessionTtl = parseInt(this.config.get('WALLETCONNECT_SESSION_TTL_SECONDS', '300'), 10);
  }

  // ─── Manual Address Entry (PS-10 §4) ────────────────────────
  async connectManual(contractorId: string, dto: {
    cryptoProvider: string; walletAddress: string; network: string; token: string;
  }) {
    // PS-11: Validate provider exists
    if (!Object.values(CryptoProvider).includes(dto.cryptoProvider as CryptoProvider)) {
      throw new PayoutError('Unsupported crypto provider.',
        HttpStatus.UNPROCESSABLE_ENTITY, 'ERR_CRYPTO_PROVIDER_UNSUPPORTED');
    }

    const provider = dto.cryptoProvider as CryptoProvider;

    // PS-11: Validate network + token supported by this provider
    this.providerValidator.validateProviderToken(provider, dto.network, dto.token);

    return this.createCryptoMethod(contractorId, {
      cryptoProvider: provider,
      walletAddress: dto.walletAddress,
      network: dto.network,
      token: dto.token,
    });
  }

  // ─── WalletConnect Session Creation (PS-10 §5 + PS-11 §11) ─
  async createWalletConnectSession(contractorId: string, dto: {
    cryptoProvider: string; network: string;
  }) {
    // PS-11: Validate provider supports WalletConnect
    if (!Object.values(CryptoProvider).includes(dto.cryptoProvider as CryptoProvider)) {
      throw new PayoutError('Unsupported crypto provider.',
        HttpStatus.UNPROCESSABLE_ENTITY, 'ERR_CRYPTO_PROVIDER_UNSUPPORTED');
    }

    const provider = dto.cryptoProvider as CryptoProvider;
    this.providerValidator.validateWalletConnectForNetwork(provider, dto.network);

    // PS-11: Use provider-specific chainId for WalletConnect session
    const chainId = getWalletConnectChainId(provider, dto.network);
    if (!chainId) {
      throw new PayoutError('WalletConnect is not supported for this network.',
        HttpStatus.UNPROCESSABLE_ENTITY, 'ERR_CRYPTO_ADDRESS_NETWORK_MISMATCH');
    }
    if (!this.walletConnectClient.isConfigured()) {
      throw new PayoutError('Wallet connection is not currently available. Try manual address entry instead.',
        HttpStatus.SERVICE_UNAVAILABLE, 'ERR_WALLETCONNECT_NOT_CONFIGURED');
    }

    const providerConfig = getProviderConfig(provider);
    const sessionId = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + this.wcSessionTtl * 1000);

    // PS-10 §5.1: real relay pairing — uri is what the QR code/paste-URI flow
    // shows the contractor; approval() resolves once they approve in their
    // wallet app (or rejects on decline/expiry). Never awaited inline here —
    // this request has to return the URI to the contractor immediately.
    const { uri, approval } = await this.walletConnectClient.createPairing(chainId);

    await this.redis.set(`wcsession:${sessionId}`,
      JSON.stringify({
        contractorId,
        cryptoProvider: dto.cryptoProvider,
        network: dto.network,
        chainId,
        status: 'pending',
      }),
      'EX', this.wcSessionTtl);

    this.logger.log(`WalletConnect session created: ${sessionId} for ${providerConfig.displayName} on ${dto.network} (chainId: ${chainId}, TTL: ${this.wcSessionTtl}s)`);

    // PS-10 §5.3/§11: fire-and-forget — resolves/rejects well after this
    // method has already returned. On approval, extracts the address and
    // reuses the exact same handleWalletConnectApproval() this session
    // state machine already had, just never had a real caller before.
    approval()
      .then(async (session: any) => {
        const address = this.walletConnectClient.extractAccountAddress(session, chainId);
        if (!address) {
          this.logger.warn(`WalletConnect session ${sessionId} approved but returned no account for ${chainId}`);
          await this.handleWalletConnectRejection(sessionId).catch(() => {});
          return;
        }
        await this.handleWalletConnectApproval(sessionId, address);
      })
      .catch(async (err: any) => {
        this.logger.warn(`WalletConnect pairing ${sessionId} not completed: ${err?.message}`);
        await this.handleWalletConnectRejection(sessionId).catch(() => {});
      });

    return { sessionId, wcUri: uri, expiresAt: expiresAt.toISOString() };
  }

  // ─── WalletConnect Session Poll (PS-10 §11 + PS-11 §11) ────
  async getWalletConnectSession(sessionId: string) {
    const raw = await this.redis.get(`wcsession:${sessionId}`);

    // PS-11 §11: Key deleted by Redis TTL → expired
    if (!raw) return { status: 'expired' };

    const session = JSON.parse(raw);

    switch (session.status) {
      case 'connected':
        return {
          status: 'connected',
          depositMethodId: session.depositMethodId,
          walletAddressLast6: session.walletAddressLast6,
          conversionDisplay: session.conversionDisplay,
        };

      case 'rejected':
        // PS-11 §11: Contractor denied the connection in wallet app
        return { status: 'rejected' };

      case 'pending':
      default:
        return { status: 'pending', expiresAt: null };
    }
  }

  // ─── WalletConnect Rejection Handler (PS-11 §11 + §12) ─────
  async handleWalletConnectRejection(sessionId: string) {
    const raw = await this.redis.get(`wcsession:${sessionId}`);
    if (!raw) throw new PayoutError('Session not found or expired.',
      HttpStatus.NOT_FOUND, 'ERR_WALLETCONNECT_SESSION_NOT_FOUND');

    const session = JSON.parse(raw);

    // Update session so poll detects rejection
    await this.redis.set(`wcsession:${sessionId}`,
      JSON.stringify({ ...session, status: 'rejected' }),
      'EX', 60); // keep for 60s so in-flight polls can read it

    this.logger.warn(`WalletConnect session rejected: ${sessionId}`);
  }

  // ─── WalletConnect Approval Handler (PS-10 §5.3) ──────────
  async handleWalletConnectApproval(sessionId: string, address: string) {
    const raw = await this.redis.get(`wcsession:${sessionId}`);
    if (!raw) throw new PayoutError('Session not found or expired.',
      HttpStatus.NOT_FOUND, 'ERR_WALLETCONNECT_SESSION_NOT_FOUND');

    const session = JSON.parse(raw);

    // PS-11: Validate the approved address matches the requested network
    const method = await this.createCryptoMethod(session.contractorId, {
      cryptoProvider: session.cryptoProvider as CryptoProvider,
      walletAddress: address,
      network: session.network,
      token: this.primaryTokenForNetwork(session.network),
    });

    // Update session so poll detects completion
    await this.redis.set(`wcsession:${sessionId}`,
      JSON.stringify({
        ...session,
        status: 'connected',
        depositMethodId: method.id,
        walletAddressLast6: method.walletAddressLast6,
        conversionDisplay: method.conversionDisplay,
      }),
      'EX', 60);

    return method;
  }

  // ─── Get Provider Info (PS-11) ──────────────────────────────
  getProviderInfo(provider: CryptoProvider) {
    return this.providerValidator.getProviderInfo(provider);
  }

  getAllProviders() {
    return this.providerValidator.getAllProviders();
  }

  // ─── Core: Create Crypto Method (PS-10 §8) ─────────────────
  private async createCryptoMethod(contractorId: string, dto: {
    cryptoProvider: CryptoProvider; walletAddress: string; network: string; token: string;
  }): Promise<DepositMethod> {
    // 1. Validate and normalize address (PS-10 §7)
    const normalized = this.addressValidator.validateAddress(dto.walletAddress, dto.network);
    const last6 = normalized.slice(-6);

    // 2. Check 5-method limit (PS-10 §8 / PS-04)
    const count = await this.methodRepo.count({ where: { contractorId, isActive: true } });
    if (count >= 5) throw new PayoutError('Maximum 5 active deposit methods allowed.',
      HttpStatus.UNPROCESSABLE_ENTITY, 'ERR_DEPOSIT_METHOD_LIMIT_REACHED');

    // 3. Encrypt address (PS-10 §8 — AES-256-GCM)
    const encrypted = this.encrypt(normalized);

    // 4. Get conversion display (PS-10 §9). Transak connections get the
    // real, fee-inclusive quote from Transak's own Get Price API rather
    // than the generic provider-agnostic market rate every other provider
    // uses — falls back to the generic rate if Transak's API is
    // unavailable so a wallet connection never fails just because a
    // display-only quote call did.
    const conversion = dto.cryptoProvider === CryptoProvider.TRANSAK
      ? (await this.conversionSvc.getTransakDisplayRate(dto.token, dto.network))
          ?? await this.conversionSvc.getDisplayRate(dto.token, 'USD')
      : await this.conversionSvc.getDisplayRate(dto.token, 'USD');

    // 5. Save — VERIFIED immediately (no micro-deposits for crypto)
    const method = await this.methodRepo.save({
      contractorId,
      methodType: MethodType.CRYPTO,
      cryptoProvider: dto.cryptoProvider,
      cryptoAddress: encrypted,
      cryptoNetwork: dto.network,
      cryptoCurrency: dto.token,
      walletAddressLast6: last6,
      conversionDisplay: conversion.display,
      verificationStatus: VerificationStatus.VERIFIED,
      isActive: true,
      isDefault: false,
      displayLabel: `${dto.cryptoProvider} ${dto.token} ••••${last6}`,
    });

    await this.auditService.log({
      contractorId, actorType: 'contractor', actorId: contractorId,
      action: 'method.added',
      metadata: { methodId: method.id, methodType: 'CRYPTO', provider: dto.cryptoProvider, network: dto.network },
    });

    return method;
  }

  private primaryTokenForNetwork(network: string): string {
    const map: Record<string, string> = {
      ethereum: 'ETH', bitcoin: 'BTC', polygon: 'ETH', bsc: 'BNB',
      solana: 'SOL', tron: 'USDT', litecoin: 'LTC',
    };
    return map[network] ?? 'ETH';
  }

  private encrypt(plaintext: string): string {
    return this.addressRing.encrypt(plaintext);
  }

  private decrypt(stored: string): string {
    return this.addressRing.decrypt(stored);
  }
}