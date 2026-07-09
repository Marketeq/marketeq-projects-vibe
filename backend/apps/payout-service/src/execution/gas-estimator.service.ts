// apps/payout-service/src/execution/gas-estimator.service.ts
// PS-12 §4: Gas fee estimation for direct EVM transfers.
// Estimates gas before broadcast, enforces 10% spike protection.

import { Injectable, Logger, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ConversionService } from '../crypto/conversion.service';
import { PayoutError } from '../common/errors/payout.error';

// PS-12 §4.3: Gas spike protection threshold
const GAS_SPIKE_THRESHOLD = 0.10; // 10% of payout amount
const GAS_CAP_MULTIPLIER = 1.25;  // maxFeePerGas cap = estimate × 1.25

// RPC endpoints per network (from env or defaults)
const DEFAULT_RPC: Record<string, string> = {
  ethereum: 'https://eth-mainnet.g.alchemy.com/v2/demo',
  polygon:  'https://polygon-rpc.com',
  bsc:      'https://bsc-dataseed.binance.org',
};

// Native token per network (for gas cost → USD conversion)
const NATIVE_TOKEN: Record<string, string> = {
  ethereum: 'ETH',
  polygon:  'MATIC',
  bsc:      'BNB',
};

@Injectable()
export class GasEstimatorService {
  private readonly logger = new Logger(GasEstimatorService.name);

  constructor(
    private readonly config: ConfigService,
    private readonly conversionSvc: ConversionService,
  ) {}

  /**
   * PS-12 §4.2: Estimate gas cost in USD for a direct EVM transfer.
   * Returns gasUSD (rounded to 2 decimals) and gasWei.
   * In dev/sandbox mode, returns mock estimates.
   */
  async estimateGasUSD(
    network: string,
    toAddress: string,
    token: string,
    amountUsd: number,
  ): Promise<{ gasUSD: number; gasWei: string; nativeToken: string }> {
    const nativeToken = NATIVE_TOKEN[network];
    if (!nativeToken) {
      // Non-EVM networks (bitcoin, solana, etc.) — gas handled by bridge
      return { gasUSD: 0, gasWei: '0', nativeToken: 'N/A' };
    }

    // Dev/sandbox mode — return realistic mock estimates
    const rpcUrl = this.config.get(`RPC_URL_${network.toUpperCase()}`) ?? DEFAULT_RPC[network];
    if (!rpcUrl || rpcUrl.includes('demo') || rpcUrl.includes('localhost')) {
      return this.mockEstimate(network, token);
    }

    // Production: call eth_estimateGas + eth_gasPrice via JSON-RPC
    try {
      const gasEstimate = await this.rpcEstimateGas(rpcUrl, toAddress, token);
      const feeData = await this.rpcGetFeeData(rpcUrl);

      const gasCostWei = BigInt(gasEstimate) * BigInt(feeData.maxFeePerGas);
      const nativeRate = await this.conversionSvc.getDisplayRate(nativeToken, 'USD');

      const gasUSD = Number(gasCostWei) / 1e18 * nativeRate.rate;
      return {
        gasUSD: Math.ceil(gasUSD * 100) / 100,
        gasWei: gasCostWei.toString(),
        nativeToken,
      };
    } catch (err: any) {
      this.logger.error(`Gas estimation failed for ${network}: ${err.message}`);
      throw new PayoutError(
        'Gas estimation failed. Payout will be retried.',
        HttpStatus.SERVICE_UNAVAILABLE,
        'ERR_GAS_ESTIMATION_FAILED',
        { network, error: err.message },
      );
    }
  }

  /**
   * PS-12 §4.3: Check if gas exceeds spike threshold.
   */
  checkGasSpike(gasUSD: number, payoutAmountUSD: number): void {
    if (payoutAmountUSD <= 0) return;
    const ratio = gasUSD / payoutAmountUSD;
    if (ratio > GAS_SPIKE_THRESHOLD) {
      throw new PayoutError(
        `Network fees (~$${gasUSD.toFixed(2)}) exceed 10% of payout amount ($${payoutAmountUSD.toFixed(2)}). Payout queued for retry when fees are lower.`,
        HttpStatus.UNPROCESSABLE_ENTITY,
        'ERR_GAS_TOO_HIGH',
        { gasUSD, payoutAmountUSD, ratio: Math.round(ratio * 100) },
      );
    }
  }

  /**
   * PS-12 §4.3: Cap maxFeePerGas at estimate × 1.25
   */
  getGasCap(estimatedGasWei: string): string {
    const cap = BigInt(estimatedGasWei) * BigInt(125) / BigInt(100);
    return cap.toString();
  }

  // ─── Dev mock estimates ─────────────────────────────────────
  private mockEstimate(network: string, token: string): { gasUSD: number; gasWei: string; nativeToken: string } {
    const mocks: Record<string, number> = {
      ethereum: 5.50,    // $2–$15 range, use mid
      polygon: 0.005,    // < $0.01
      bsc: 0.10,         // ~$0.05–$0.20
    };
    const gasUSD = mocks[network] ?? 1.00;
    const nativeToken = NATIVE_TOKEN[network] ?? 'ETH';
    this.logger.log(`[DEV] Mock gas estimate for ${network}/${token}: $${gasUSD}`);
    return { gasUSD, gasWei: '21000000000000', nativeToken };
  }

  // ─── JSON-RPC helpers (production) ──────────────────────────
  private async rpcEstimateGas(rpcUrl: string, to: string, token: string): Promise<string> {
    const body = JSON.stringify({
      jsonrpc: '2.0', id: 1, method: 'eth_estimateGas',
      params: [{ to, value: token === 'ETH' ? '0x1' : '0x0', data: '0x' }],
    });
    const res = await this.jsonRpcCall(rpcUrl, body);
    return parseInt(res.result, 16).toString();
  }

  private async rpcGetFeeData(rpcUrl: string): Promise<{ maxFeePerGas: string }> {
    const body = JSON.stringify({
      jsonrpc: '2.0', id: 1, method: 'eth_gasPrice', params: [],
    });
    const res = await this.jsonRpcCall(rpcUrl, body);
    return { maxFeePerGas: parseInt(res.result, 16).toString() };
  }

  private async jsonRpcCall(url: string, body: string): Promise<any> {
    const http = url.startsWith('https') ? require('https') : require('http');
    return new Promise((resolve, reject) => {
      const req = http.request(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, timeout: 5000 }, (res: any) => {
        let data = '';
        res.on('data', (c: string) => data += c);
        res.on('end', () => { try { resolve(JSON.parse(data)); } catch { reject(new Error('Invalid JSON')); } });
      });
      req.on('error', reject);
      req.on('timeout', () => { req.destroy(); reject(new Error('RPC timeout')); });
      req.write(body);
      req.end();
    });
  }
}