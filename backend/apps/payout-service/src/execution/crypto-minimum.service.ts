// apps/payout-service/src/execution/crypto-minimum.service.ts
// PS-12 §6: Minimum payout amounts by token and network.
// Effective minimum = max(Marketeq minimum, bridge minimum, gas × 10 safety factor)

import { Injectable, HttpStatus } from '@nestjs/common';
import { PayoutError } from '../common/errors/payout.error';

// PS-12 §6 table: effective minimums in USD
const CRYPTO_MINIMUMS: Record<string, number> = {
  'ETH:ethereum':   50,
  'BTC:bitcoin':    20,
  'USDC:ethereum':  20,
  'USDC:polygon':   5,
  'USDT:bsc':       5,
  'BNB:bsc':        5,
  'MATIC:polygon':  5,
  'SOL:solana':     5,
  'LTC:litecoin':   10,
};

const DEFAULT_MINIMUM = 20; // USD for unlisted token:network pairs

// PS-12 §7: Tokens actually supported for payout execution
const PAYOUT_SUPPORTED_TOKENS = new Set([
  'ETH:ethereum',
  'BTC:bitcoin',
  'USDC:ethereum',
  'USDC:polygon',
  'USDT:bsc',
  'BNB:bsc',
  'MATIC:polygon',
  'SOL:solana',
  'LTC:litecoin',
]);

// PS-12 §7: Display-only tokens that cannot be used for actual payouts
const DISPLAY_ONLY_TOKENS = new Set([
  'DAI:ethereum',
  'BUSD:bsc',
  'TRX:tron',
]);

@Injectable()
export class CryptoMinimumService {

  /**
   * PS-12 §6: Validate that payout amount meets the minimum for this token/network.
   * Throws ERR_CRYPTO_BELOW_MINIMUM if below minimum.
   */
  validateMinimum(amountUSD: number, token: string, network: string): void {
    const key = `${token}:${network}`;
    const min = CRYPTO_MINIMUMS[key] ?? DEFAULT_MINIMUM;

    if (amountUSD < min) {
      throw new PayoutError(
        `Minimum payout for ${token} on ${network} is $${min} USD.`,
        HttpStatus.UNPROCESSABLE_ENTITY,
        'ERR_CRYPTO_BELOW_MINIMUM',
        { token, network, minimumUSD: min, requestedUSD: amountUSD },
      );
    }
  }

  /**
   * PS-12 §7: Validate that the token is supported for actual payout execution.
   * Throws ERR_CRYPTO_TOKEN_NOT_SUPPORTED for display-only tokens.
   */
  validateTokenSupported(token: string, network: string): void {
    const key = `${token}:${network}`;

    if (DISPLAY_ONLY_TOKENS.has(key)) {
      throw new PayoutError(
        `${token} on ${network} is not supported for payouts. Please update your deposit method to a supported token.`,
        HttpStatus.UNPROCESSABLE_ENTITY,
        'ERR_CRYPTO_TOKEN_NOT_SUPPORTED',
        { token, network, displayOnly: true },
      );
    }

    if (!PAYOUT_SUPPORTED_TOKENS.has(key)) {
      throw new PayoutError(
        `${token} on ${network} is not supported for payouts in the current version.`,
        HttpStatus.UNPROCESSABLE_ENTITY,
        'ERR_CRYPTO_TOKEN_NOT_SUPPORTED',
        { token, network },
      );
    }
  }

  /**
   * Returns the minimum for frontend display.
   */
  getMinimum(token: string, network: string): number {
    const key = `${token}:${network}`;
    return CRYPTO_MINIMUMS[key] ?? DEFAULT_MINIMUM;
  }

  /**
   * Returns all supported tokens with their minimums.
   */
  getAllMinimums(): Array<{ token: string; network: string; minimumUSD: number; payoutSupported: boolean }> {
    const all = new Set([...Object.keys(CRYPTO_MINIMUMS), ...DISPLAY_ONLY_TOKENS]);
    return [...all].map(key => {
      const [token, network] = key.split(':');
      return {
        token, network,
        minimumUSD: CRYPTO_MINIMUMS[key] ?? DEFAULT_MINIMUM,
        payoutSupported: PAYOUT_SUPPORTED_TOKENS.has(key),
      };
    });
  }
}