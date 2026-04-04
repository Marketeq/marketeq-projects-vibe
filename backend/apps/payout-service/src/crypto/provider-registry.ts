// apps/payout-service/src/crypto/provider-registry.ts
// PS-11: Per-provider technical integration spec
// Defines supported tokens, networks, connection methods, and chainIds for all 9 providers.

import { CryptoProvider } from '../entities/deposit-method.entity';

export interface ProviderConfig {
  provider: CryptoProvider;
  displayName: string;
  supportsWalletConnect: boolean;
  supportsManualEntry: boolean;
  defaultNetwork: string;
  defaultToken: string;
  supportedNetworks: ProviderNetwork[];
  walletConnectChainId: string | null;  // default chainId for WalletConnect session
  requiresApiKey: boolean;              // true = Ramp, Transak, Crypto.com, Coinbase
  envPrefix: string | null;             // e.g. 'RAMP', 'TRANSAK' — null for wallet-only providers
}

export interface ProviderNetwork {
  network: string;
  tokens: string[];
  walletConnectChainId: string | null;  // null = manual-only for this network
}

// ────────────────────────────────────────────────────────────
// PS-11 §2–§10: Per-provider configuration
// ────────────────────────────────────────────────────────────

export const PROVIDER_REGISTRY: Record<CryptoProvider, ProviderConfig> = {

  // §2 — Ramp Network: Widget + webhook. No WalletConnect.
  [CryptoProvider.RAMP]: {
    provider: CryptoProvider.RAMP,
    displayName: 'Ramp Network',
    supportsWalletConnect: false,
    supportsManualEntry: true,
    defaultNetwork: 'ethereum',
    defaultToken: 'ETH',
    supportedNetworks: [
      { network: 'ethereum', tokens: ['ETH', 'USDC'], walletConnectChainId: null },
      { network: 'bitcoin',  tokens: ['BTC'],          walletConnectChainId: null },
    ],
    walletConnectChainId: null,
    requiresApiKey: true,
    envPrefix: 'RAMP',
  },

  // §3 — Transak: Widget + WalletConnect v2. 100+ tokens.
  [CryptoProvider.TRANSAK]: {
    provider: CryptoProvider.TRANSAK,
    displayName: 'Transak',
    supportsWalletConnect: true,
    supportsManualEntry: true,
    defaultNetwork: 'ethereum',
    defaultToken: 'ETH',
    supportedNetworks: [
      { network: 'ethereum', tokens: ['ETH', 'USDC', 'DAI'], walletConnectChainId: 'eip155:1' },
      { network: 'polygon',  tokens: ['ETH', 'USDC'],        walletConnectChainId: 'eip155:137' },
      { network: 'bsc',      tokens: ['BNB', 'USDT', 'BUSD'],walletConnectChainId: 'eip155:56' },
      { network: 'solana',   tokens: ['SOL', 'USDC'],        walletConnectChainId: 'solana:4sGjMW1sUnHzSxGspuhpqLDx6wiyjNtZ' },
      { network: 'tron',     tokens: ['USDT'],               walletConnectChainId: null },
    ],
    walletConnectChainId: 'eip155:1',
    requiresApiKey: true,
    envPrefix: 'TRANSAK',
  },

  // §4 — Crypto.com: WalletConnect v2 + Crypto.com Pay API.
  [CryptoProvider.CRYPTO_COM]: {
    provider: CryptoProvider.CRYPTO_COM,
    displayName: 'Crypto.com',
    supportsWalletConnect: true,
    supportsManualEntry: true,
    defaultNetwork: 'ethereum',
    defaultToken: 'ETH',
    supportedNetworks: [
      { network: 'ethereum', tokens: ['ETH', 'USDC'], walletConnectChainId: 'eip155:1' },
      { network: 'bsc',      tokens: ['BNB'],         walletConnectChainId: 'eip155:56' },
      { network: 'solana',   tokens: ['SOL'],         walletConnectChainId: null },
    ],
    walletConnectChainId: 'eip155:1',
    requiresApiKey: true,
    envPrefix: 'CRYPTO_COM',
  },

  // §5 — Coinbase: Coinbase Wallet SDK + WalletConnect v2.
  [CryptoProvider.COINBASE]: {
    provider: CryptoProvider.COINBASE,
    displayName: 'Coinbase',
    supportsWalletConnect: true,
    supportsManualEntry: true,
    defaultNetwork: 'ethereum',
    defaultToken: 'ETH',
    supportedNetworks: [
      { network: 'ethereum', tokens: ['ETH', 'USDC'], walletConnectChainId: 'eip155:1' },
      { network: 'polygon',  tokens: ['USDC'],        walletConnectChainId: 'eip155:137' },
      { network: 'bitcoin',  tokens: ['BTC'],         walletConnectChainId: null },
      { network: 'solana',   tokens: ['SOL'],         walletConnectChainId: null },
    ],
    walletConnectChainId: 'eip155:1',
    requiresApiKey: true,
    envPrefix: 'COINBASE',
  },

  // §6 — MetaMask: EVM-only. WalletConnect v2. No server-side API.
  [CryptoProvider.METAMASK]: {
    provider: CryptoProvider.METAMASK,
    displayName: 'MetaMask',
    supportsWalletConnect: true,
    supportsManualEntry: true,
    defaultNetwork: 'ethereum',
    defaultToken: 'ETH',
    supportedNetworks: [
      { network: 'ethereum', tokens: ['ETH', 'USDC', 'DAI'], walletConnectChainId: 'eip155:1' },
      { network: 'polygon',  tokens: ['ETH', 'USDC'],        walletConnectChainId: 'eip155:137' },
      { network: 'bsc',      tokens: ['BNB', 'USDT'],        walletConnectChainId: 'eip155:56' },
    ],
    walletConnectChainId: 'eip155:1',
    requiresApiKey: false,
    envPrefix: null,
  },

  // §7 — Ledger: Hardware wallet. WalletConnect v2 via Ledger Live.
  [CryptoProvider.LEDGER]: {
    provider: CryptoProvider.LEDGER,
    displayName: 'Ledger',
    supportsWalletConnect: true,
    supportsManualEntry: true,
    defaultNetwork: 'ethereum',
    defaultToken: 'ETH',
    supportedNetworks: [
      { network: 'ethereum', tokens: ['ETH', 'USDC'], walletConnectChainId: 'eip155:1' },
      { network: 'bitcoin',  tokens: ['BTC'],         walletConnectChainId: null },
      { network: 'polygon',  tokens: ['ETH', 'USDC'], walletConnectChainId: 'eip155:137' },
    ],
    walletConnectChainId: 'eip155:1',
    requiresApiKey: false,
    envPrefix: null,
  },

  // §8 — Trezor: Hardware wallet. No WalletConnect. Manual address only.
  [CryptoProvider.TREZOR]: {
    provider: CryptoProvider.TREZOR,
    displayName: 'Trezor',
    supportsWalletConnect: false,
    supportsManualEntry: true,
    defaultNetwork: 'bitcoin',
    defaultToken: 'BTC',
    supportedNetworks: [
      { network: 'bitcoin',  tokens: ['BTC'], walletConnectChainId: null },
      { network: 'ethereum', tokens: ['ETH'], walletConnectChainId: null },
      { network: 'litecoin', tokens: ['LTC'], walletConnectChainId: null },
    ],
    walletConnectChainId: null,
    requiresApiKey: false,
    envPrefix: null,
  },

  // §9 — Kraken: Centralized exchange. No WalletConnect. Manual address only.
  [CryptoProvider.KRAKEN]: {
    provider: CryptoProvider.KRAKEN,
    displayName: 'Kraken',
    supportsWalletConnect: false,
    supportsManualEntry: true,
    defaultNetwork: 'bitcoin',
    defaultToken: 'BTC',
    supportedNetworks: [
      { network: 'bitcoin',  tokens: ['BTC'], walletConnectChainId: null },
      { network: 'ethereum', tokens: ['ETH'], walletConnectChainId: null },
    ],
    walletConnectChainId: null,
    requiresApiKey: false,
    envPrefix: null,
  },

  // §10 — Binance: Binance Web3 Wallet. WalletConnect v2.
  [CryptoProvider.BINANCE]: {
    provider: CryptoProvider.BINANCE,
    displayName: 'Binance',
    supportsWalletConnect: true,
    supportsManualEntry: true,
    defaultNetwork: 'ethereum',
    defaultToken: 'ETH',
    supportedNetworks: [
      { network: 'ethereum', tokens: ['ETH'],  walletConnectChainId: 'eip155:1' },
      { network: 'bsc',      tokens: ['USDT'], walletConnectChainId: 'eip155:56' },
      { network: 'bitcoin',  tokens: ['BTC'],  walletConnectChainId: null },
    ],
    walletConnectChainId: 'eip155:1',
    requiresApiKey: false,
    envPrefix: null,
  },
};

// ────────────────────────────────────────────────────────────
// Helper functions
// ────────────────────────────────────────────────────────────

export function getProviderConfig(provider: CryptoProvider): ProviderConfig {
  return PROVIDER_REGISTRY[provider];
}

export function isNetworkSupportedByProvider(provider: CryptoProvider, network: string): boolean {
  const config = PROVIDER_REGISTRY[provider];
  return config.supportedNetworks.some(n => n.network === network);
}

export function isTokenSupportedByProvider(provider: CryptoProvider, network: string, token: string): boolean {
  const config = PROVIDER_REGISTRY[provider];
  const net = config.supportedNetworks.find(n => n.network === network);
  return net ? net.tokens.includes(token) : false;
}

export function getWalletConnectChainId(provider: CryptoProvider, network: string): string | null {
  const config = PROVIDER_REGISTRY[provider];
  const net = config.supportedNetworks.find(n => n.network === network);
  return net?.walletConnectChainId ?? null;
}

export function supportsWalletConnect(provider: CryptoProvider): boolean {
  return PROVIDER_REGISTRY[provider].supportsWalletConnect;
}