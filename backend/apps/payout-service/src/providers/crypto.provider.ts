// apps/payout-service/src/providers/crypto.provider.ts
// PS-00 §4.1 + PS-11: Routes to 9 sub-providers by providerName
// PS-11 §2–§10: Per-provider API keys and webhook secrets
// Payout execution stubs — full implementation in later PS docs
// NOTE: Class named CryptoPayoutProvider (not CryptoProvider) to avoid clash
//       with CryptoProvider enum in deposit-method.entity.ts

import { Injectable, Logger, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { CryptoProvider } from '../entities/deposit-method.entity';
import { PayoutError } from '../common/errors/payout.error';

@Injectable()
export class CryptoPayoutProvider {
  private readonly logger = new Logger(CryptoPayoutProvider.name);

  constructor(private readonly config: ConfigService) {}

  /**
   * Initiates a crypto payout to a contractor's wallet address.
   * Routes to the correct provider API based on providerName.
   * Full implementation in future PS docs — stubs for now.
   */
  async initiateWithdrawal(
    providerName: CryptoProvider,
    address: string,
    network: string,
    currency: string,
    amountUsd: number,
  ): Promise<{ providerTxId: string; status: string }> {
    this.logger.log(`Initiating ${currency} payout via ${providerName} to ${address.slice(0, 10)}... on ${network} ($${amountUsd})`);

    switch (providerName) {
      case CryptoProvider.RAMP:
        return this.initiateRampPayout(address, network, currency, amountUsd);
      case CryptoProvider.TRANSAK:
        return this.initiateTransakPayout(address, network, currency, amountUsd);
      case CryptoProvider.CRYPTO_COM:
        return this.initiateCryptoComPayout(address, network, currency, amountUsd);
      case CryptoProvider.COINBASE:
        return this.initiateCoinbasePayout(address, network, currency, amountUsd);

      // Wallet-only providers (MetaMask, Ledger, Trezor, Kraken, Binance)
      // use treasury wallet direct transfer — no provider API
      case CryptoProvider.METAMASK:
      case CryptoProvider.LEDGER:
      case CryptoProvider.TREZOR:
      case CryptoProvider.KRAKEN:
      case CryptoProvider.BINANCE:
        return this.initiateDirectTransfer(providerName, address, network, currency, amountUsd);

      default:
        throw new PayoutError(`Unsupported crypto provider: ${providerName}`,
          HttpStatus.UNPROCESSABLE_ENTITY, 'ERR_CRYPTO_PROVIDER_UNSUPPORTED');
    }
  }

  // ─── PS-11 §2: Ramp Network Payouts API ─────────────────────
  private async initiateRampPayout(
    address: string, network: string, currency: string, amountUsd: number,
  ): Promise<{ providerTxId: string; status: string }> {
    const apiKey = this.config.get('RAMP_API_KEY');
    const apiBase = this.config.get('RAMP_API_BASE', 'https://api.demo.ramp.network');
    if (!apiKey) {
      this.logger.warn('RAMP_API_KEY not configured — using stub');
    }
    // Stub — production calls Ramp Payouts API
    const providerTxId = `ramp_${crypto.randomUUID().slice(0, 8)}`;
    this.logger.log(`[STUB] Ramp payout initiated: ${providerTxId}`);
    return { providerTxId, status: 'pending' };
  }

  // ─── PS-11 §3: Transak API ─────────────────────────────────
  private async initiateTransakPayout(
    address: string, network: string, currency: string, amountUsd: number,
  ): Promise<{ providerTxId: string; status: string }> {
    const apiKey = this.config.get('TRANSAK_API_KEY');
    const apiBase = this.config.get('TRANSAK_API_BASE', 'https://staging-global.transak.com');
    if (!apiKey) {
      this.logger.warn('TRANSAK_API_KEY not configured — using stub');
    }
    const providerTxId = `transak_${crypto.randomUUID().slice(0, 8)}`;
    this.logger.log(`[STUB] Transak payout initiated: ${providerTxId}`);
    return { providerTxId, status: 'pending' };
  }

  // ─── PS-11 §4: Crypto.com Pay Checkout API ─────────────────
  private async initiateCryptoComPayout(
    address: string, network: string, currency: string, amountUsd: number,
  ): Promise<{ providerTxId: string; status: string }> {
    const apiKey = this.config.get('CRYPTO_COM_API_KEY');
    if (!apiKey) {
      this.logger.warn('CRYPTO_COM_API_KEY not configured — using stub');
    }
    const providerTxId = `cdc_${crypto.randomUUID().slice(0, 8)}`;
    this.logger.log(`[STUB] Crypto.com payout initiated: ${providerTxId}`);
    return { providerTxId, status: 'pending' };
  }

  // ─── PS-11 §5: Coinbase Commerce API ───────────────────────
  private async initiateCoinbasePayout(
    address: string, network: string, currency: string, amountUsd: number,
  ): Promise<{ providerTxId: string; status: string }> {
    const apiKey = this.config.get('COINBASE_COMMERCE_API_KEY');
    if (!apiKey) {
      this.logger.warn('COINBASE_COMMERCE_API_KEY not configured — using stub');
    }
    const providerTxId = `cb_${crypto.randomUUID().slice(0, 8)}`;
    this.logger.log(`[STUB] Coinbase payout initiated: ${providerTxId}`);
    return { providerTxId, status: 'pending' };
  }

  // ─── PS-11 §6–§10: Direct transfer for wallet-only providers ──
  private async initiateDirectTransfer(
    providerName: CryptoProvider,
    address: string, network: string, currency: string, amountUsd: number,
  ): Promise<{ providerTxId: string; status: string }> {
    // MetaMask, Ledger, Trezor, Kraken, Binance — no provider API
    // Payout goes directly from Marketeq treasury wallet to contractor address
    const providerTxId = `direct_${crypto.randomUUID().slice(0, 8)}`;
    this.logger.log(`[STUB] Direct transfer for ${providerName}: ${providerTxId}`);
    return { providerTxId, status: 'pending' };
  }

  // ─── PS-11 §2.5: Validate Ramp webhook signature ───────────
  validateRampWebhook(rawBody: Buffer, signature: string): boolean {
    const secret = this.config.get('RAMP_WEBHOOK_SECRET');
    if (!secret || !signature) return false;
    try {
      const expected = crypto
        .createHmac('sha256', secret)
        .update(rawBody)
        .digest('hex');
      return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
    } catch {
      return false;
    }
  }
}