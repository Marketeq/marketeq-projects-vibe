// apps/payout-service/src/execution/bridge-selector.service.ts
// PS-12 §3: Bridge provider selection logic
// Routes payout to correct settlement bridge based on wallet provider, network, and token.

import { Injectable, Logger } from '@nestjs/common';
import { CryptoProvider } from '../entities/deposit-method.entity';

export enum BridgeType {
  RAMP             = 'RAMP',
  TRANSAK          = 'TRANSAK',
  TREASURY_DIRECT  = 'TREASURY_DIRECT',
}

// PS-12 §5: Settlement timing estimates (upper bound shown to contractor)
export const SETTLEMENT_ESTIMATES: Record<string, string> = {
  'TREASURY_DIRECT:ethereum': '2–15 minutes',
  'TREASURY_DIRECT:polygon':  '30 seconds–2 minutes',
  'TREASURY_DIRECT:bsc':      '1–3 minutes',
  'RAMP:bitcoin':             'Up to 3 business days',
  'RAMP:ethereum':            '15 minutes–1 business day',
  'RAMP:litecoin':            '15 minutes–1 business day',
  'TRANSAK:solana':           '5–30 minutes',
  'TRANSAK:tron':             '5–30 minutes',
  'TRANSAK:ethereum':         '15 minutes–1 business day',
  'TRANSAK:polygon':          '15 minutes–1 business day',
  'TRANSAK:bsc':              '15 minutes–1 business day',
};

@Injectable()
export class BridgeSelectorService {
  private readonly logger = new Logger(BridgeSelectorService.name);

  /**
   * PS-12 §3: Select the settlement bridge for a crypto payout.
   *
   * Rules:
   *  - Ramp and Transak are self-bridges (they are both wallet provider and bridge)
   *  - BTC always goes through Ramp regardless of wallet provider
   *  - EVM networks (ethereum, polygon, bsc) use direct treasury wallet transfer
   *  - Solana, Tron, Litecoin use Transak or Ramp as bridge
   */
  selectBridge(walletProvider: CryptoProvider, network: string, token: string): BridgeType {
    // Ramp and Transak are self-bridges
    if (walletProvider === CryptoProvider.RAMP) return BridgeType.RAMP;
    if (walletProvider === CryptoProvider.TRANSAK) return BridgeType.TRANSAK;

    // BTC always goes through Ramp regardless of wallet provider
    if (token === 'BTC' || network === 'bitcoin') return BridgeType.RAMP;

    // LTC goes through Ramp
    if (token === 'LTC' || network === 'litecoin') return BridgeType.RAMP;

    // EVM networks — use direct treasury wallet transfer
    const evmNetworks = ['ethereum', 'polygon', 'bsc'];
    if (evmNetworks.includes(network)) return BridgeType.TREASURY_DIRECT;

    // Solana, Tron — use Transak
    return BridgeType.TRANSAK;
  }

  /**
   * Returns the estimated settlement time string for contractor display.
   */
  getSettlementEstimate(bridge: BridgeType, network: string): string {
    const key = `${bridge}:${network}`;
    return SETTLEMENT_ESTIMATES[key] ?? '15 minutes–1 business day';
  }
}