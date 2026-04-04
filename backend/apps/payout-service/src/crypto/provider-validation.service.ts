// apps/payout-service/src/crypto/provider-validation.service.ts
// PS-11: Validates provider + network + token combinations before connection or WalletConnect session creation.

import { Injectable, HttpStatus } from '@nestjs/common';
import { PayoutError } from '../common/errors/payout.error';
import { CryptoProvider } from '../entities/deposit-method.entity';
import {
  PROVIDER_REGISTRY,
  getProviderConfig,
  isNetworkSupportedByProvider,
  isTokenSupportedByProvider,
  supportsWalletConnect,
} from './provider-registry';

@Injectable()
export class ProviderValidationService {

  /**
   * Validates that the provider supports the requested network.
   * Throws ERR_PROVIDER_UNSUPPORTED_NETWORK if not.
   */
  validateProviderNetwork(provider: CryptoProvider, network: string): void {
    if (!isNetworkSupportedByProvider(provider, network)) {
      const config = getProviderConfig(provider);
      const supported = config.supportedNetworks.map(n => n.network).join(', ');
      throw new PayoutError(
        `${config.displayName} does not support the ${network} network. Supported: ${supported}.`,
        HttpStatus.UNPROCESSABLE_ENTITY,
        'ERR_PROVIDER_UNSUPPORTED_NETWORK',
        { provider, network, supportedNetworks: supported },
      );
    }
  }

  /**
   * Validates that the provider supports the requested token on the given network.
   * Throws ERR_PROVIDER_UNSUPPORTED_NETWORK if not (token is tied to network).
   */
  validateProviderToken(provider: CryptoProvider, network: string, token: string): void {
    this.validateProviderNetwork(provider, network);
    if (!isTokenSupportedByProvider(provider, network, token)) {
      const config = getProviderConfig(provider);
      const net = config.supportedNetworks.find(n => n.network === network);
      const supported = net?.tokens.join(', ') ?? 'none';
      throw new PayoutError(
        `${config.displayName} does not support ${token} on ${network}. Supported tokens: ${supported}.`,
        HttpStatus.UNPROCESSABLE_ENTITY,
        'ERR_PROVIDER_UNSUPPORTED_NETWORK',
        { provider, network, token, supportedTokens: supported },
      );
    }
  }

  /**
   * Validates that the provider supports WalletConnect before creating a session.
   * Throws ERR_PROVIDER_UNSUPPORTED_NETWORK with clear message if not.
   */
  validateWalletConnectSupport(provider: CryptoProvider): void {
    if (!supportsWalletConnect(provider)) {
      const config = getProviderConfig(provider);
      throw new PayoutError(
        `${config.displayName} does not support WalletConnect. Use manual address entry instead.`,
        HttpStatus.UNPROCESSABLE_ENTITY,
        'ERR_PROVIDER_UNSUPPORTED_NETWORK',
        { provider, reason: 'walletconnect_not_supported' },
      );
    }
  }

  /**
   * Validates that WalletConnect is supported for this provider + network combo.
   * Some providers support WalletConnect on EVM but not on Bitcoin (e.g., Binance, Coinbase).
   */
  validateWalletConnectForNetwork(provider: CryptoProvider, network: string): void {
    this.validateWalletConnectSupport(provider);
    this.validateProviderNetwork(provider, network);

    const config = getProviderConfig(provider);
    const net = config.supportedNetworks.find(n => n.network === network);
    if (!net?.walletConnectChainId) {
      throw new PayoutError(
        `${config.displayName} does not support WalletConnect on ${network}. Use manual address entry for this network.`,
        HttpStatus.UNPROCESSABLE_ENTITY,
        'ERR_PROVIDER_UNSUPPORTED_NETWORK',
        { provider, network, reason: 'walletconnect_not_supported_for_network' },
      );
    }
  }

  /**
   * Returns the full provider configuration for frontend display.
   */
  getProviderInfo(provider: CryptoProvider) {
    const config = getProviderConfig(provider);
    return {
      provider: config.provider,
      displayName: config.displayName,
      supportsWalletConnect: config.supportsWalletConnect,
      supportsManualEntry: config.supportsManualEntry,
      defaultNetwork: config.defaultNetwork,
      defaultToken: config.defaultToken,
      networks: config.supportedNetworks.map(n => ({
        network: n.network,
        tokens: n.tokens,
        walletConnectSupported: !!n.walletConnectChainId,
      })),
    };
  }

  /**
   * Returns all providers with their capabilities — for GET /providers endpoint.
   */
  getAllProviders() {
    return Object.values(PROVIDER_REGISTRY).map(config => ({
      provider: config.provider,
      displayName: config.displayName,
      supportsWalletConnect: config.supportsWalletConnect,
      supportsManualEntry: config.supportsManualEntry,
      defaultNetwork: config.defaultNetwork,
      defaultToken: config.defaultToken,
      networks: config.supportedNetworks.map(n => ({
        network: n.network,
        tokens: n.tokens,
        walletConnectSupported: !!n.walletConnectChainId,
      })),
    }));
  }
}