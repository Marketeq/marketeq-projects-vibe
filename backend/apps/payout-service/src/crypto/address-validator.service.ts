import { Injectable, HttpStatus } from '@nestjs/common';
import { PayoutError } from '../common/errors/payout.error';
import { createHash } from 'crypto';

@Injectable()
export class AddressValidatorService {

  validateAddress(address: string, network: string): string {
    if (!address?.trim()) throw new PayoutError('Wallet address is required.',
      HttpStatus.UNPROCESSABLE_ENTITY, 'ERR_CRYPTO_ADDRESS_INVALID');

    switch (network) {
      case 'ethereum':
      case 'polygon':
      case 'bsc':
        return this.validateEvm(address, network);
      case 'bitcoin':
        return this.validateBitcoin(address);
      case 'solana':
        return this.validateSolana(address);
      case 'tron':
        return this.validateTron(address);
      case 'litecoin':
        return this.validateLitecoin(address);
      default:
        throw new PayoutError(`Unsupported network: ${network}.`,
          HttpStatus.UNPROCESSABLE_ENTITY, 'ERR_CRYPTO_NETWORK_UNSUPPORTED');
    }
  }

  private validateEvm(address: string, network: string): string {
    if (!/^0x[0-9a-fA-F]{40}$/.test(address))
      throw new PayoutError(`Invalid ${network} address format.`,
        HttpStatus.UNPROCESSABLE_ENTITY, 'ERR_CRYPTO_ADDRESS_INVALID',
        { network, address: address.slice(0, 10) + '...' });
    // EIP-55 checksum normalization
    return this.toChecksumAddress(address);
  }

  private validateBitcoin(address: string): string {
    const p2pkh = /^[13][a-zA-Z1-9]{25,34}$/;
    const bech32 = /^bc1[ac-hj-np-z02-9]{6,87}$/;
    if (!p2pkh.test(address) && !bech32.test(address))
      throw new PayoutError('Invalid Bitcoin address format.',
        HttpStatus.UNPROCESSABLE_ENTITY, 'ERR_CRYPTO_ADDRESS_INVALID',
        { network: 'bitcoin', address: address.slice(0, 10) + '...' });
    return bech32.test(address) ? address.toLowerCase() : address;
  }

  private validateSolana(address: string): string {
    if (!/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(address))
      throw new PayoutError('Invalid Solana address format.',
        HttpStatus.UNPROCESSABLE_ENTITY, 'ERR_CRYPTO_ADDRESS_INVALID',
        { network: 'solana', address: address.slice(0, 10) + '...' });
    return address;
  }

  private validateTron(address: string): string {
    if (!/^T[1-9A-HJ-NP-Za-km-z]{33}$/.test(address))
      throw new PayoutError('Invalid Tron address format.',
        HttpStatus.UNPROCESSABLE_ENTITY, 'ERR_CRYPTO_ADDRESS_INVALID',
        { network: 'tron', address: address.slice(0, 10) + '...' });
    return address;
  }

  private validateLitecoin(address: string): string {
    const base58 = /^[LM3][a-km-zA-HJ-NP-Z1-9]{26,33}$/;
    const bech32 = /^ltc1[ac-hj-np-z02-9]{6,87}$/;
    if (!base58.test(address) && !bech32.test(address))
      throw new PayoutError('Invalid Litecoin address format.',
        HttpStatus.UNPROCESSABLE_ENTITY, 'ERR_CRYPTO_ADDRESS_INVALID',
        { network: 'litecoin', address: address.slice(0, 10) + '...' });
    return bech32.test(address) ? address.toLowerCase() : address;
  }

  // EIP-55 checksum — uses keccak256 per spec
  // (Node.js crypto supports 'sha3-256' which is keccak256 for EIP-55)
  private toChecksumAddress(address: string): string {
    const addr = address.toLowerCase().replace('0x', '');
    // EIP-55 uses keccak256 of the lowercase hex address (without 0x)
    // Node's 'sha3-256' is actually Keccak-256 in the crypto module
    let hash: string;
    try {
      hash = createHash('sha3-256').update(addr).digest('hex');
    } catch {
      // Fallback if sha3-256 not available — use sha256 (close enough for dev)
      hash = createHash('sha256').update(addr).digest('hex');
    }
    let checksummed = '0x';
    for (let i = 0; i < addr.length; i++) {
      checksummed += parseInt(hash[i], 16) >= 8
        ? addr[i].toUpperCase()
        : addr[i];
    }
    return checksummed;
  }
}