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

  // ─── PS-11 §2: Ramp Network payout ──────────────────────────
  // Ramp Network has no self-serve, publicly documented server-to-server
  // "send crypto to this address" API (confirmed against their real docs:
  // docs.rampnetwork.com's REST API v3 reference only covers quotes/asset
  // listings, never transaction execution — a real payout endpoint would
  // require a partner agreement via partner@ramp.network). The only real,
  // documented mechanism for directing crypto to a specific address is
  // their hosted on-ramp widget with a pre-filled `userAddress` — which
  // requires a human to complete a checkout (enter a payment method,
  // confirm) in a browser. That's fundamentally incompatible with this
  // executor's automated, webhook-driven completion model — there is no
  // way to "call an API and get money moving" the way the other bridge
  // providers work.
  //
  // Rather than fabricate a fake providerTxId that implies an automated
  // transfer is in flight (the previous behavior), this builds the real,
  // verified widget URL a human (ops, or eventually the contractor) must
  // open and complete, and reports the payout as awaiting that manual
  // step — an honest reflection of what Ramp actually requires, not a
  // false "pending" that looks identical to a real in-flight transfer.
  private async initiateRampPayout(
    address: string, network: string, currency: string, amountUsd: number,
  ): Promise<{ providerTxId: string; status: string }> {
    const hostApiKey = this.config.get('RAMP_API_KEY');
    const widgetBase = this.config.get('RAMP_WIDGET_BASE', 'https://app.demo.ramp.network');
    if (!hostApiKey) {
      this.logger.warn('RAMP_API_KEY not configured — cannot build a Ramp widget URL');
      throw new PayoutError('Ramp Network is not configured for payouts.',
        HttpStatus.SERVICE_UNAVAILABLE, 'ERR_RAMP_NOT_CONFIGURED');
    }

    const params = new URLSearchParams({
      hostApiKey,
      hostAppName: 'Marketeq',
      hostLogoUrl: 'https://marketeqdigital.com/logo.png',
      userAddress: address,
      fiatCurrency: 'USD',
      fiatValue: amountUsd.toFixed(2),
      defaultFlow: 'ONRAMP',
    });
    const widgetUrl = `${widgetBase}/?${params.toString()}`;

    this.logger.log(`Ramp payout requires manual completion — widget URL: ${widgetUrl}`);
    // providerTxId doubles as the actionable reference here (stored as
    // providerReference on the payout request) since there is no real
    // transaction ID until a human completes the widget and Ramp's own
    // webhook (RELEASE_CREATED) fires with one.
    return { providerTxId: widgetUrl, status: 'awaiting_manual_completion' };
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