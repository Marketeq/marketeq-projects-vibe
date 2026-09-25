// apps/payout-service/src/crypto/walletconnect-client.service.ts
// PS-10 §5/§11, PS-11 §1: real WalletConnect v2 pairing via @walletconnect/sign-client.
// Replaces the previous mock (crypto.randomUUID()-based fake pairing URI with
// no relay connection behind it, which could never reach "connected").
//
// Architecture note (known limitation, not fixed here): this holds one
// SignClient instance per process, with its own relay WebSocket and local
// on-disk session/pairing storage (@walletconnect/sign-client's default
// storage adapter). If payout-service ever runs multiple replicas, the
// approval() promise for a pairing only resolves on the instance that
// created it — a wallet approving a QR code routed to a different instance
// than the one polling GET .../walletconnect-session/:id would never see it
// complete. Fine for a single-instance deployment; a real multi-instance
// fix needs either sticky routing to the creating instance or moving
// SignClient into its own long-running worker process that publishes
// approval/rejection into Redis (the session store here) for any instance
// to read — deliberately not built speculatively without knowing the real
// deployment topology.
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

// Minimal per-namespace method set. Marketeq only ever needs the contractor's
// wallet ADDRESS — per PS-12, crypto payouts go out via a bridge provider or
// treasury wallet, never a signed transaction request back to the
// contractor's own wallet. `methods`/`events` are required by the WalletConnect
// protocol to form a valid session proposal even though nothing here will
// ever actually invoke them.
const NAMESPACE_METHODS: Record<string, string[]> = {
  eip155: ['personal_sign'],
  solana: ['solana_signMessage'],
};
const NAMESPACE_EVENTS: Record<string, string[]> = {
  eip155: ['accountsChanged', 'chainChanged'],
  solana: [],
};

@Injectable()
export class WalletConnectClientService implements OnModuleInit {
  private readonly logger = new Logger(WalletConnectClientService.name);
  private client: any = null;

  constructor(private readonly config: ConfigService) {}

  async onModuleInit(): Promise<void> {
    const projectId = this.config.get<string>('WALLETCONNECT_PROJECT_ID', '');
    if (!projectId) {
      this.logger.warn('WALLETCONNECT_PROJECT_ID not configured — WalletConnect wallet connections are disabled (manual address entry still works).');
      return;
    }

    try {
      // Dynamic import: @walletconnect/sign-client pulls in a real relay
      // WebSocket connection at init — keeping this out of the top-level
      // import graph means a missing/invalid projectId degrades gracefully
      // (logged warning, isConfigured() false) instead of failing module
      // bootstrap for the whole service.
      const { SignClient } = await import('@walletconnect/sign-client');
      this.client = await SignClient.init({
        projectId,
        metadata: {
          name: 'Marketeq',
          description: 'Connect your wallet to receive Marketeq payouts',
          url: this.config.get('FRONTEND_URL', 'https://marketeqdigital.com'),
          icons: ['https://marketeqdigital.com/logo.png'],
        },
      });
      this.logger.log('WalletConnect SignClient initialized.');
    } catch (err: any) {
      this.logger.error(`WalletConnect SignClient init failed: ${err.message}`);
      this.client = null;
    }
  }

  isConfigured(): boolean {
    return !!this.client;
  }

  // PS-10 §5.1/§5.2: builds a real pairing URI (wc:...@2?...) and returns
  // the approval() promise from the SDK. CALLER MUST NOT AWAIT approval()
  // INLINE — it only resolves once the contractor scans/approves in their
  // wallet app, which can take minutes, and this is called from the same
  // request that has to return the QR/URI to the contractor immediately.
  async createPairing(chainId: string): Promise<{ uri: string; approval: () => Promise<any> }> {
    if (!this.client) {
      throw new Error('WalletConnect is not configured.');
    }
    const namespace = chainId.split(':')[0];
    const { uri, approval } = await this.client.connect({
      requiredNamespaces: {
        [namespace]: {
          chains: [chainId],
          methods: NAMESPACE_METHODS[namespace] ?? ['personal_sign'],
          events: NAMESPACE_EVENTS[namespace] ?? [],
        },
      },
    });
    if (!uri) {
      throw new Error('WalletConnect did not return a pairing URI.');
    }
    return { uri, approval };
  }

  // Extracts the wallet address from an approved session's CAIP-10 account
  // string ("eip155:1:0xABC..." / "solana:<ref>:<base58>") for the specific
  // chain this pairing was created for.
  extractAccountAddress(session: any, chainId: string): string | null {
    const namespace = chainId.split(':')[0];
    const accounts: string[] | undefined = session?.namespaces?.[namespace]?.accounts;
    if (!accounts?.length) return null;
    const match = accounts.find((a) => a.startsWith(`${chainId}:`)) ?? accounts[0];
    return match.split(':')[2] ?? null;
  }
}
